import { Quaternion, Vector3 } from "three";
import { MoveEvent, OrientationEvent } from "./bluetooth-puzzle";

// TODO: Combine orientation and moves into a single event to handle quaternion remapping.
export interface StreamTransformer {
  // Modifies the input.
  transformMove(moveEvent: MoveEvent): void;

  // Modifies the input.
  transformOrientation(orientationEvent: OrientationEvent): void;
}

function maxAxis(v: Vector3): string {
  const maxVal = Math.max(Math.abs(v.x), Math.abs(v.y), Math.abs(v.z));
  switch (maxVal) {
    case v.x:
      return "x";
    case -v.x:
      return "-x";
    case v.y:
      return "y";
    case -v.y:
      return "-y";
    case v.z:
      return "z";
    case -v.z:
      return "-z";
    default:
      throw new Error("Uh-oh.");
  }
}

const s2 = Math.sqrt(0.5);

const m: { [s: string]: Quaternion } = {
  "y z": new Quaternion(0, 0, 0, 1),
  "-z y": new Quaternion(s2, 0, 0, s2),
  "x z": new Quaternion(0, 0, -s2, s2),
  "-x z": new Quaternion(0, 0, s2, s2),
};

export class BasicRotationTransformer implements StreamTransformer {
  // private reorientQuat = new Quaternion();

  public transformMove(moveEvent: MoveEvent): void {
    // Nothing to do.
  }
  public transformOrientation(orientationEvent: OrientationEvent): void {
    const { x, y, z, w } = orientationEvent.quaternion;
    const quat = new Quaternion(x, y, z, w);

    const U = new Vector3(0, 1, 0);
    const F = new Vector3(0, 0, 1);
    const maxU = maxAxis(U.applyQuaternion(quat));
    const maxF = maxAxis(F.applyQuaternion(quat));

    const oriQuat = m[`${maxU} ${maxF}`] || m["y z"];

    console.log(quat);
    console.log(oriQuat);
    const q2 = quat.premultiply(oriQuat);

    // console.log(maxAxis(U.applyQuaternion(quat)), maxAxis(F.applyQuaternion(quat)));
    console.log(q2);

    orientationEvent.quaternion = {
      x: q2.x,
      y: q2.y,
      z: q2.z,
      w: q2.w,
    };

    console.log(orientationEvent.quaternion);
  }
}
