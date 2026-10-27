import * as THREE from "three";
import { createUI } from "../system/3dui";

let clipboard: THREE.Mesh;

export async function setClipboard(
  obj: THREE.Object3D,
  camera: THREE.PerspectiveCamera,
) {
  clipboard = obj.children[0] as THREE.Mesh;
  clipboard.visible = false;

  obj.position.set(-1.5, -2, -2);
  obj.rotateX(Math.PI / 2);
  obj.rotateZ(Math.PI / 8);
  obj.rotateX(Math.PI / 16);

  camera.add(obj);

  const div = document.createElement("div");
  div.classList.add("note");

  const el = document.createElement("div");
  div.appendChild(el);

  const { mesh } = createUI(
    clipboard,
    div,
    1.5,
    undefined,
    undefined,
    new THREE.Vector3(0, 0.05, 1),
    new THREE.Quaternion().setFromEuler(
      new THREE.Euler(Math.PI / 2, Math.PI, 0),
    ),
  );
  if (!mesh) return;

  document.oncut = () => copy(el);
  document.oncopy = () => copy(el);
}

function copy(div: HTMLDivElement) {
  let text: string | undefined;

  text = window.getSelection()?.toString();
  if (text) {
    clipboard.visible = true;
    const el = document.createElement("span");
    el.textContent = "\n\n" + text + "\n";

    const first = div.firstChild;
    if (first) first.textContent = first.textContent?.trim() + "\n";

    div.prepend(el);
  } else clipboard.visible = false;
}
