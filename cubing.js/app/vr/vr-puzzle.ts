import { Group } from "three";

export interface VRPuzzle {
  group: Group;
  update(): void;
}
