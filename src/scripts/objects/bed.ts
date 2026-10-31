import * as THREE from "three";
import {
  playAnimation,
  playAnimationReversed,
  ROOM_ROT_FIX,
} from "../system/animation";
import { disablePlayerControl, enablePlayerControl } from "./player";
import { pause } from "../system/pause";
import { removePhysicsFromObject } from "../system/physics";
import { addAudioToObject, playAudio } from "../system/audio";
import { pauseRenderer, resumeRenderer } from "../system/renderer";

const html = document.querySelector("html")!,
  fadeOverlay = document.getElementById("fade-overlay") as HTMLDivElement;

const zTimeouts: number[] = [];

let cover: THREE.Object3D;

export function updateBedCover(scene: THREE.Scene) {
  const pos = new THREE.Vector3();
  bed.getWorldPosition(pos);
  const rot = new THREE.Quaternion();
  bed.getWorldQuaternion(rot);

  if (!cover) cover = scene.getObjectByName("N_Cube_014")!.parent!;

  cover.position.set(-2.485, 0, 0);
  cover.parent!.position.set(pos.x, -pos.z, pos.y);

  const newRot = rot.clone().premultiply(ROOM_ROT_FIX);
  cover.parent!.quaternion.copy(newRot);
}

export async function sleep(canvas: HTMLCanvasElement, scene: THREE.Scene) {
  disablePlayerControl(canvas);
  playAnimation(6);
  playAudio(bed.name, "bed");
  await pause(250);

  fadeOverlay.style.opacity = "1";
  await pause(250);
  playAudio(bed.name, "bed");

  playAnimationReversed(6);
  await pause(250);

  pauseRenderer();

  for (let i = 0; i < 3; i++) {
    zTimeouts.push(
      setTimeout(() => {
        const z = document.createElement("p");
        z.textContent = "Z";
        fadeOverlay.appendChild(z);
      }, i * 750),
    );
  }

  canvas.style.cursor = "pointer";
  document.onclick = async () => {
    document.onclick = null;
    html.style.cursor = "";

    resumeRenderer();
    await canvas.requestPointerLock();

    for (const zTimeout of zTimeouts) {
      clearTimeout(zTimeout);
    }
    fadeOverlay.style.opacity = "0";

    playAudio(bed.name, "bed");
    playAnimation(6);
    await pause(250);

    while (fadeOverlay.lastElementChild) {
      fadeOverlay.removeChild(fadeOverlay.lastElementChild);
    }
    enablePlayerControl(canvas, scene);

    await pause(250);
    playAudio(bed.name, "bed");
    playAnimationReversed(6);
  };
}

let bed: THREE.Object3D;
const bedParts: THREE.Object3D[] = [];

export async function setBed(obj: THREE.Object3D, main = false) {
  if (main) {
    bed = obj;
    await addAudioToObject(obj, "bed", 2);
  } else bedParts.push(obj);
}

export function getBedBase() {
  return bed;
}

export function deleteBed() {
  for (let i = bedParts.length - 1; i >= 0; i--) {
    const bedPart = bedParts[i];
    bedPart.parent!.remove(bedPart);
  }

  const debugMesh: THREE.Mesh = bed.children[0].userData.debugMesh;
  if (debugMesh) debugMesh.parent!.remove(debugMesh);

  if (bed.children[0].userData.body)
    removePhysicsFromObject(
      bed.children[0] as THREE.Mesh,
      bed.children[0].userData.body,
    );

  bed.parent!.remove(bed);
}
