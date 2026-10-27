import * as THREE from "three";
import { createUI } from "../system/3dui";

let clipboard: THREE.Mesh, root: THREE.Object3D;

const START_Y = -4.5,
  END_Y = -2;
let targetY = START_Y;

export function updateClipboard(delta: number) {
  if (!root) return;
  root.position.y = THREE.MathUtils.damp(root.position.y, targetY, 16, delta);
  if (targetY === START_Y && root.position.y < START_Y + 0.01)
    clipboard.visible = false;
}

export async function setClipboard(
  obj: THREE.Object3D,
  camera: THREE.PerspectiveCamera,
) {
  root = obj;
  clipboard = obj.children[0] as THREE.Mesh;
  clipboard.visible = false;

  obj.position.set(-1.5, START_Y, -2);
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
    targetY = END_Y;
    const el = document.createElement("span");
    el.textContent = "\n\n" + text + "\n";

    const first = div.firstChild;
    if (first) first.textContent = first.textContent?.trim() + "\n";

    div.prepend(el);
  } else if (clipboard.visible && targetY === END_Y) targetY = START_Y;
  else {
    clipboard.visible = true;
    targetY = END_Y;
  }
}
