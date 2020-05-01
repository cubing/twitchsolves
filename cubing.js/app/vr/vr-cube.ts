import { DoubleSide, Euler, Group, Intersection, Material, Mesh, MeshBasicMaterial, PlaneGeometry, Quaternion, Raycaster, Vector3 } from "three";
// Import index files from source.
// This allows Parcel to be faster while only using values exported in the final distribution.import { BareBlockMove, Sequence } from "../../src/alg";
import { BareBlockMove, Sequence } from "../../src/alg/index";
import { Cube3D, TAU, Twisty } from "../../src/twisty/index";
import { daydream, initialHeight, initialScale, showControlPlanes } from "./config";
import { ProxyEvent, ProxyReceiver } from "./proxy/websocket-proxy";
import { ButtonGrouping, controllerDirection, OculusButton, Status, VRInput } from "./vr-input";

// From `cube3D.ts`
class AxisInfo {
  public stickerMaterial: THREE.MeshBasicMaterial;
  constructor(public side: string, public vector: Vector3, public fromZ: THREE.Euler, public color: number) {
    // TODO: Make sticker material single-sided when cubie base is rendered?
    color = 0xffffff; // override
    this.stickerMaterial = new MeshBasicMaterial({ color, side: DoubleSide });
    this.stickerMaterial.transparent = true;
    this.stickerMaterial.opacity = showControlPlanes ? 0.4 : 0;
  }
}
const axesInfo: AxisInfo[] = [
  new AxisInfo("U", new Vector3(0, 1, 0), new Euler(-TAU / 4, 0, 0), 0xffffff),
  new AxisInfo("L", new Vector3(-1, 0, 0), new Euler(0, -TAU / 4, 0), 0xff8800),
  new AxisInfo("F", new Vector3(0, 0, 1), new Euler(0, 0, 0), 0x00ff00),
  new AxisInfo("R", new Vector3(1, 0, 0), new Euler(0, TAU / 4, 0), 0xff0000),
  new AxisInfo("B", new Vector3(0, 0, -1), new Euler(0, TAU / 2, 0), 0x0000ff),
  new AxisInfo("D", new Vector3(0, -1, 0), new Euler(TAU / 4, 0, 0), 0xffff00),
];

export class VRCube {
  public group: Group = new Group();
  private twisty: Twisty;
  private cachedCube3D: Cube3D;
  private controlPlanes: Mesh[] = [];

  private lastAngle: number;

  // TODO: Separate tracker abstraction for this?
  private resizeInitialDistance: number;
  private resizeInitialScale: number;

  private moveInitialPuzzleQuaternion: Quaternion = new Quaternion();
  private moveInitialControllerQuaternion: Quaternion = new Quaternion();

  private moveLastControllerPosition: Vector3 = new Vector3();
  private moveVelocity: Vector3 = new Vector3(); // TODO: Track elapsed time since last update?

  // Wait for both move buttons to be released before allowing moves.
  // This "locks" the input into resizing.
  private waitForMoveButtonClear = false;

  constructor(private vrInput: VRInput) {
    this.twisty = new Twisty(document.createElement("twisty"), { alg: new Sequence([]) });
    this.twisty.experimentalGetCursor().experimentalSetDurationScale(0.25);

    this.cachedCube3D = this.twisty.experimentalGetPlayer().cube3DView.experimentalGetCube3D();
    this.cachedCube3D.experimentalUpdateOptions({ showFoundation: false, showHintStickers: false });
    this.group.add(this.cachedCube3D.experimentalGetCube());

    for (const axis of axesInfo) {
      const controlPlane = new Mesh(new PlaneGeometry(1, 1), axis.stickerMaterial);
      controlPlane.userData.axis = axis;
      controlPlane.position.copy(controlPlane.userData.axis.vector);
      controlPlane.position.multiplyScalar(0.501);
      controlPlane.setRotationFromEuler(controlPlane.userData.axis.fromZ);

      controlPlane.userData.side = axis.side;
      controlPlane.userData.status = [Status.Untargeted, Status.Untargeted];

      this.controlPlanes.push(controlPlane);
      this.group.add(controlPlane);
    }

    this.group.position.copy(new Vector3(0, initialHeight, 0));
    this.setScale(initialScale);

    // TODO: Better abstraction over controllers.
    this.vrInput.addSingleButtonListener({ controllerIdx: 1, buttonIdx: OculusButton.Grip }, this.gripStart.bind(this, 1), this.gripContinued.bind(this, 1));

    this.vrInput.addSingleButtonListener({ controllerIdx: 0, buttonIdx: daydream ? 0 : OculusButton.Trigger }, this.onPress.bind(this, 0));
    this.vrInput.addSingleButtonListener({ controllerIdx: 1, buttonIdx: daydream ? 0 : OculusButton.Trigger }, this.onPress.bind(this, 1));
    // TODO: Generalize this to multiple platforms.
    this.vrInput.addButtonListener(ButtonGrouping.All, [{ controllerIdx: 0, buttonIdx: OculusButton.XorA }, { controllerIdx: 1, buttonIdx: OculusButton.XorA, invert: true }], this.onMoveStart.bind(this, 0), this.onMoveContinued.bind(this, 0));
    this.vrInput.addButtonListener(ButtonGrouping.All, [{ controllerIdx: 0, buttonIdx: OculusButton.XorA, invert: true }, { controllerIdx: 1, buttonIdx: OculusButton.XorA }], this.onMoveStart.bind(this, 1), this.onMoveContinued.bind(this, 1));
    this.vrInput.addButtonListener(ButtonGrouping.All, [{ controllerIdx: 0, buttonIdx: OculusButton.XorA }, { controllerIdx: 1, buttonIdx: OculusButton.XorA }], this.onResizeStart.bind(this), this.onResizeContinued.bind(this), this.onResizeEnd.bind(this));
    this.vrInput.addButtonListener(ButtonGrouping.None, [{ controllerIdx: 0, buttonIdx: OculusButton.XorA }, { controllerIdx: 1, buttonIdx: OculusButton.XorA }], this.moveButtonClear.bind(this));

    try {
      // tslint:disable-next-line: no-unused-expression
      new ProxyReceiver(this.onProxyEvent.bind(this));
    } catch (e) {
      console.error("Unable to register proxy receiver", e);
    }
  }

  public update(): void {
    this.group.position.add(this.moveVelocity);
    this.moveVelocity.multiplyScalar(0.99);
    if (this.moveVelocity.length() < 0.001) {
      this.moveVelocity.setScalar(0);
      // TODO: Set a flag to indicate that the puzzle is not moving?
    }
  }

  private yAngle(point: Vector3): number {
    return point.projectOnPlane(new Vector3(0, 1, 0)).angleTo(new Vector3(0, 0, -1));
  }

  private gripStart(controllerIdx: number): void {
    this.hapticPulse(controllerIdx, 0.1, 400);
    this.lastAngle = this.yAngle(this.vrInput.controllers[controllerIdx].position);
  }

  private gripContinued(controllerIdx: number): void {
    const angle = this.yAngle(this.vrInput.controllers[controllerIdx].position);
    const deltaAngleQuat = new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), angle - this.lastAngle);
    this.group.quaternion.multiply(deltaAngleQuat);
    this.lastAngle = angle;
  }

  private setScale(scale: number): void {
    this.group.scale.setScalar(scale);
  }

  private controllerDistance(): number {
    return this.vrInput.controllers[0].position.distanceTo(this.vrInput.controllers[1].position);
  }

  private hapticPulse(gamepadId: number, value: number, duration: number): void {
    const gamepad = navigator.getGamepads()[gamepadId];
    if (gamepad && gamepad.hapticActuators) {
      gamepad.hapticActuators[0].pulse(value, duration);
    }
  }

  private onResizeStart(): void {
    this.waitForMoveButtonClear = true;
    this.moveVelocity.setScalar(0);
    this.hapticPulse(0, 0.2, 75);
    this.hapticPulse(1, 0.2, 75);
    this.resizeInitialDistance = this.controllerDistance();
    this.resizeInitialScale = this.group.scale.x;
  }
  private onResizeContinued(): void {
    const newDistance = this.controllerDistance();
    this.setScale(this.resizeInitialScale * newDistance / this.resizeInitialDistance);
  }

  private onResizeEnd(): void {
    this.hapticPulse(0, 0.1, 75);
    this.hapticPulse(1, 0.1, 75);
  }

  private moveButtonClear(): void {
    this.waitForMoveButtonClear = false;
  }

  private onMoveStart(controllerIdx: number): void {
    if (this.waitForMoveButtonClear) {
      return;
    }
    this.hapticPulse(controllerIdx, 0.2, 50);
    this.moveInitialPuzzleQuaternion.copy(this.group.quaternion);

    const controller = this.vrInput.controllers[controllerIdx];
    this.moveLastControllerPosition.copy(controller.position);
    this.moveInitialControllerQuaternion.copy(controller.quaternion);
  }

  private onMoveContinued(controllerIdx: number): void {
    if (this.waitForMoveButtonClear) {
      return;
    }
    const controller = this.vrInput.controllers[controllerIdx];

    this.moveVelocity.copy(controller.position).sub(this.moveLastControllerPosition);
    this.moveLastControllerPosition.copy(controller.position);

    this.group.quaternion.
      copy(this.moveInitialControllerQuaternion).
      inverse().
      premultiply(controller.quaternion).
      multiply(this.moveInitialPuzzleQuaternion);
  }

  private onPress(controllerIdx: number): void {
    const controller = this.vrInput.controllers[controllerIdx];

    const direction = new Vector3().copy(controllerDirection);
    direction.applyQuaternion(controller.quaternion);
    const raycaster = new Raycaster(controller.position, direction);
    const closestIntersection: Intersection | null = ((l) => l.length > 0 ? l[0] : null)(raycaster.intersectObjects(this.controlPlanes));

    if (closestIntersection && showControlPlanes) {
      ((closestIntersection.object as Mesh).material as Material).opacity = 0.2;
    }

    for (const controlPlane of this.controlPlanes) {
      if (!closestIntersection || controlPlane !== closestIntersection.object) {
        ((controlPlane as Mesh).material as Material).opacity = 0;
      }
    }

    if (closestIntersection) {
      (closestIntersection.object as Mesh).userData.status[controller.userData.controllerNumber] = controller.userData.isSelecting ? Status.Pressed : Status.Targeted;
      const side = closestIntersection.object.userData.side;
      this.twisty.experimentalAddMove(BareBlockMove(side, controllerIdx === 0 ? -1 : 1));
      this.hapticPulse(controllerIdx, 0.1, 75);
    }
  }

  private onProxyEvent(e: ProxyEvent): void {
    switch (e.event) {
      case "reset":
        this.twisty.experimentalSetAlg(new Sequence([]));
        break;
      case "move":
        this.twisty.experimentalAddMove(e.data.latestMove);
        break;
      case "orientation":
        const { x, y, z, w } = e.data.quaternion;
        const quat = new Quaternion(x, y, z, w);
        this.twisty.experimentalGetPlayer().cube3DView.experimentalGetCube3D().experimentalGetCube().quaternion.copy(quat);
        break;
      default:
        // The "as any" appeases the type checker, which (correctly) deduces
        // that the `event` field can't have a valid value.
        console.error("Unknown event:", (e as any).event);
    }
  }
}
