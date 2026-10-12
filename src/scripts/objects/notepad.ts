import * as THREE from "three";
import { createUI } from "../system/3dui";
import { enablePlayerControl } from "./player";

let stack: THREE.Object3D;
const noteMeshes: THREE.Mesh[] = [];

export function getNoteMeshes() {
  return noteMeshes;
}

export async function setNotepad(
  obj: THREE.Object3D,
  scene: THREE.Scene,
  canvas: HTMLCanvasElement,
) {
  stack = obj;
  enableNote(scene, canvas);
}

const rot = new THREE.Euler(-Math.PI / 2, -Math.PI / 2, -Math.PI / 2, "YXZ"),
  offset = new THREE.Vector3(0, 0.221, 0);

export function initNote(scene: THREE.Scene, canvas: HTMLCanvasElement) {
  const el = document.createElement("textarea");
  el.name = "note";
  el.autocorrect = false;
  el.spellcheck = false;

  el.classList.add("note");
  el.value = "testing...";

  el.onblur = () => {
    enablePlayerControl(canvas, scene);
    canvas.style.pointerEvents = "auto";
  };

  el.onkeydown = (e) => {
    if (e.key == "Escape") el.blur();
  };

  const { mesh, obj } = createUI(scene, el);
  if (!mesh) return;
  mesh.name = "Note";

  noteMeshes.push(mesh);

  const pos = new THREE.Vector3();
  stack.getWorldPosition(pos);

  mesh.position.copy(pos.add(offset));
  mesh.rotation.copy(rot);

  obj.position.copy(pos);
  obj.rotation.copy(rot);
}

export function enableNote(
  scene: THREE.Scene,
  canvas: HTMLCanvasElement,
  id = noteMeshes.length - 1,
) {
  if (!noteMeshes[id] || noteMeshes[id].userData.grabbed)
    initNote(scene, canvas);
}
