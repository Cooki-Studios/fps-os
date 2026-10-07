import * as THREE from "three";
import { createUI } from "../system/3dui";

let stack: THREE.Object3D;
const noteMeshes: THREE.Mesh[] = [];

export function getNoteMeshes() {
  return noteMeshes;
}

export async function setNotepad(obj: THREE.Object3D, scene: THREE.Scene) {
  stack = obj;
  enableNote(scene);
}

const rot = new THREE.Euler(-Math.PI / 2, -Math.PI / 2, -Math.PI / 2, "YXZ"),
  offset = new THREE.Vector3(0, 0.221, 0);

function initNote(scene: THREE.Scene) {
  const el = document.createElement("div");
  el.classList.add("note");
  el.textContent = "testing...";

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
  id = noteMeshes.length - 1,
  note = false,
) {
  if (!note)
    if (!noteMeshes[id] || noteMeshes[id].userData.grabbed) initNote(scene);
}
