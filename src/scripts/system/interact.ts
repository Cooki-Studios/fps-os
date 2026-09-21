import * as THREE from "three";
import { createUI } from "./3dui";
import type { CSS3DObject } from "three/examples/jsm/Addons.js";
import { toggleLight } from "../objects/mainLight";

const raycaster = new THREE.Raycaster();
raycaster.far = 5;

function getObject(camera: THREE.PerspectiveCamera, scene: THREE.Scene) {
  raycaster.setFromCamera(new THREE.Vector2(), camera);

  const intersects = raycaster.intersectObject(scene);
  const intersect = intersects.find(
    (i) => i.object instanceof THREE.Mesh && i.object.name != "",
  );
  if (!intersect || !intersect.object.parent) return;

  return { obj: intersect.object.parent, i: intersect };
}

let hoverEl: Element, clickedEl: Element | undefined;

export function interactPlayer(
  camera: THREE.PerspectiveCamera,
  scene: THREE.Scene,
  click = true,
  released = true,
) {
  const intersect = getObject(camera, scene);
  if (!intersect) return;

  const obj = intersect.obj;
  if (!obj) return;

  const el = document.elementFromPoint(
    window.innerWidth / 2,
    window.innerHeight / 2,
  );

  if (click) {
    if (released) {
      const name = obj.name.split("_")[0];
      if (name == "Switch") toggleLight();
    }

    if (!released && el && menu.contains(el)) {
      if (clickedEl && clickedEl !== el) clickedEl.classList.remove("active");
      clickedEl = el;
      el.classList.add("active");
    } else if (clickedEl) {
      clickedEl.classList.remove("active");
      if (el == clickedEl) (clickedEl as HTMLElement).click();
      clickedEl = undefined;
    } else {
      contextObj.visible = false;
      point = undefined;
    }
  } else if (el && menu.contains(el)) {
    if (hoverEl && hoverEl !== el) hoverEl.classList.remove("hover");
    hoverEl = el;
    el.classList.add("hover");
  } else if (hoverEl) {
    hoverEl.classList.remove("hover");
  }
}

const menu = document.getElementById("context") as HTMLDivElement,
  menuName = document.getElementById("ctx-name") as HTMLSpanElement,
  menuButtons = document.getElementById("ctx-buttons") as HTMLDivElement;

let contextObj: CSS3DObject, contextRect: DOMRect;
export function setupContextMenu(scene: THREE.Scene) {
  const ui = createUI(scene, menu, 5, true);

  contextObj = ui.obj;
  if (ui.rect) contextRect = ui.rect;
}

const OFFSET_SCALE = 0.004;
let point: THREE.Vector3 | undefined = new THREE.Vector3(),
  canShow = false;

export function contextPlayer(
  camera: THREE.PerspectiveCamera,
  scene: THREE.Scene,
) {
  const intersect = getObject(camera, scene);
  if (!intersect) return;

  const obj = intersect.obj,
    i = intersect.i;
  if (!obj) return;

  menuName.textContent = obj.name.split("_")[0];

  menuButtons.textContent = "";
  for (let i = 0; i < 3; i++) {
    const button = document.createElement("button");
    button.textContent = `Option ${i}`;
    menuButtons.appendChild(button);
  }

  point = i.point;
  canShow = true;
}

export function updateMenu(camera: THREE.PerspectiveCamera) {
  if (!contextObj || !point) return;

  contextObj.position.copy(point);

  const pos = new THREE.Vector3();
  camera.getWorldPosition(pos);
  contextObj.lookAt(pos);

  contextObj.translateY(
    -(contextRect.height + 14 * menuButtons.children.length) * OFFSET_SCALE,
  );
  contextObj.translateX(contextRect.width * OFFSET_SCALE);

  if (!contextObj.visible && canShow) contextObj.visible = true;
}
