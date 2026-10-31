import * as THREE from "three";
import { ROOM_ROT_FIX } from "../system/animation";
import { switchToFiles, updateFileMap } from "../files/main";
import { disablePlayerControl } from "./player";

let files: THREE.Object3D,
  cabinet: THREE.Object3D,
  cabinetY = 0,
  open = false;

export async function setFiles(obj: THREE.Object3D) {
  files = obj;
}

export function getFilesBase() {
  return files;
}

const fade = document.getElementById("fade-overlay") as HTMLDivElement;

export function updateCabinetPos(canvas: HTMLCanvasElement) {
  open = !open;

  if (open) {
    cabinetY = -1;
    disablePlayerControl(canvas);
    setTimeout(() => {
      fade.style.opacity = "1";
    }, 200);

    setTimeout(() => {
      switchToFiles();
      setTimeout(() => {
        fade.style.opacity = "0";
        updateFileMap();
      }, 200);
    }, 500);
  } else cabinetY = 0;
}

export function updateFileCabinet(scene: THREE.Scene, delta: number) {
  const pos = new THREE.Vector3();
  files.getWorldPosition(pos);
  const rot = new THREE.Quaternion();
  files.getWorldQuaternion(rot);

  if (!cabinet) cabinet = scene.getObjectByName("N_Cube_004")!.parent!;

  cabinet.parent!.position.set(pos.x, -pos.z, pos.y);

  cabinet.position.y = THREE.MathUtils.damp(
    cabinet.position.y,
    cabinetY,
    16,
    delta,
  );

  const newRot = rot.clone().premultiply(ROOM_ROT_FIX);
  cabinet.parent!.quaternion.copy(newRot);
}
