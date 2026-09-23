import * as THREE from "three";
import { playAnimation, playAnimationReversed } from "../system/animation";
import { disablePlayerControl, enablePlayerControl } from "./player";
import { pause } from "../system/pause";
import { removePhysicsFromObject } from "../system/physics";

const html = document.querySelector("html")!;

export async function sleep(canvas: HTMLCanvasElement, scene: THREE.Scene) {
  disablePlayerControl(canvas);
  playAnimation(6);
  await pause(250);

  document.body.style.opacity = "0";
  await pause(250);

  playAnimationReversed(6);
  await pause(250);

  document.body.style.display = "none";

  html.style.cursor = "pointer";
  document.onclick = async () => {
    document.onclick = null;
    html.style.cursor = "";
    document.body.style.display = "";
    await canvas.requestPointerLock();

    document.body.style.opacity = "1";
    playAnimation(6);
    await pause(250);

    enablePlayerControl(canvas, scene);
    await pause(250);

    playAnimationReversed(6);
  };
}

let bed: THREE.Object3D;
const bedParts: THREE.Object3D[] = [];

export function setBed(obj: THREE.Object3D, main = false) {
  if (main) bed = obj;
  else bedParts.push(obj);
}

export function deleteBed() {
  for (let i = bedParts.length - 1; i >= 0; i--) {
    const bedPart = bedParts[i];
    bedPart.parent!.remove(bedPart);
  }

  const debugMesh: THREE.Mesh = bed.children[0].userData.debugMesh;
  if (debugMesh) debugMesh.parent!.remove(debugMesh);

  if (bed.children[0].userData.body)
    removePhysicsFromObject(bed.children[0].userData.body);

  bed.parent!.remove(bed);
}
