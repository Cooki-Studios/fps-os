import * as THREE from "three";
import { createUI } from "../system/3dui";
import { enablePlayerControl } from "./player";
import { marked } from "marked";
import DOMPurify from "dompurify";

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

const rot = new THREE.Quaternion().setFromEuler(
    new THREE.Euler(0, 0, -Math.PI / 2),
  ),
  offset = new THREE.Vector3(0, 0, 0.2201);

async function updateMD(el: HTMLTextAreaElement, mdEl: HTMLParagraphElement) {
  mdEl.innerHTML = DOMPurify.sanitize(
    await marked.parse(el.value, { breaks: true, gfm: true }),
  );
  el.style.display = "none";
  mdEl.style.display = "block";
}

export function enableNoteEl(
  el: HTMLTextAreaElement,
  mdEl: HTMLParagraphElement,
) {
  el.style.display = "block";
  mdEl.style.display = "none";
}

export function initNote(scene: THREE.Scene, canvas: HTMLCanvasElement) {
  const div = document.createElement("div");
  div.classList.add("note");

  const el = document.createElement("textarea");
  el.name = "note";
  el.autocorrect = false;
  el.spellcheck = false;

  const mdEl = document.createElement("p");

  div.appendChild(el);
  div.appendChild(mdEl);

  el.value = "";

  el.onblur = () => {
    updateMD(el, mdEl);
    enablePlayerControl(canvas, scene);
    canvas.style.pointerEvents = "auto";
  };

  el.onkeydown = (e) => {
    if (e.key == "Escape") el.blur();
  };

  const { mesh } = createUI(
    scene,
    div,
    undefined,
    undefined,
    stack,
    offset,
    rot,
  );
  if (!mesh) return;
  mesh.name = "Note";

  noteMeshes.push(mesh);
}

export function enableNote(
  scene: THREE.Scene,
  canvas: HTMLCanvasElement,
  id = noteMeshes.length - 1,
) {
  if (!noteMeshes[id] || noteMeshes[id].userData.grabbed)
    initNote(scene, canvas);
}
