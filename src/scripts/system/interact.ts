import * as THREE from "three";
import { createUI } from "./3dui";
import type { CSS3DObject } from "three/examples/jsm/Addons.js";
import { disableLight, toggleLight } from "../objects/mainLight";
import { removePhysicsFromObject } from "./physics";
import { deletePC, enablePC } from "../objects/pc";
import {
  getAnimationTime,
  playAnimation,
  playAnimationReversed,
  stopAnimation,
} from "./animation";
import { setLightLevel } from "./lighting";
import { lock } from "../objects/keypad";
import { deleteBed, sleep } from "../objects/bed";
import { toggleWallpaper } from "../objects/wallpaper";
import { deleteClock } from "../objects/clock";
import { playAudio } from "./audio";

const raycaster = new THREE.Raycaster();
raycaster.far = 8;

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
const blindsDown: boolean[] = [];

const cross = document.getElementById("cross") as HTMLHeadingElement;

export function interactPlayer(
  camera: THREE.PerspectiveCamera,
  scene: THREE.Scene,
  canvas: HTMLCanvasElement,
  click = true,
  released = true,
) {
  const intersect = getObject(camera, scene);
  if (!intersect) {
    cross.classList.remove("active");
    clickedEl?.classList.remove("active");
    return;
  }

  const obj = intersect.obj;
  if (!obj) {
    clickedEl?.classList.remove("active");
    return;
  }

  const name = obj.name.split("_")[0];
  if (
    name == "Switch" ||
    name == "Door" ||
    name == "PC" ||
    name == "Bed" ||
    name.startsWith("Blind")
  )
    cross.classList.add("active");
  else cross.classList.remove("active");

  const el = document.elementFromPoint(
    window.innerWidth / 2,
    window.innerHeight / 2,
  );

  if (click) {
    if (!released && el && menu.contains(el)) {
      if (clickedEl && clickedEl !== el) clickedEl.classList.remove("active");
      clickedEl = el;
      el.classList.add("active");
    } else if (clickedEl) {
      clickedEl.classList.remove("active");
      if (el == clickedEl) {
        if (el instanceof HTMLButtonElement) {
          (clickedEl as HTMLElement).click();
          canShow = false;
          contextObj.visible = false;
        }
        return;
      }
      clickedEl = undefined;
    } else {
      closeContextMenu();
    }

    if (released) {
      switch (name) {
        case "Switch":
          toggleLight();
          break;
        case "Door":
          lock(camera, canvas);
          break;
        case "PC":
          enablePC(canvas, scene);
          break;
        case "Bed":
          sleep(canvas, scene);
          break;
        default:
          if (name.startsWith("Blind")) {
            const blindNum = Number(name.replace("Blind", ""));

            const time = getAnimationTime(blindNum);
            if (time > 0 && time < 0.5) return;

            if (blindsDown[blindNum]) {
              playAnimationReversed(blindNum);
              playAudio(name, "blind-up", 0, 0.6);
            } else {
              stopAnimation(blindNum);
              playAnimation(blindNum);
              playAudio(name, "blind-down", 0, 0.2);
            }
            blindsDown[blindNum] = !blindsDown[blindNum];

            setTimeout(() => {
              const count = blindsDown.reduce(
                (sum, val) => sum + (val ? 1 : 0),
                0,
              );
              setLightLevel(1 - (count / 4) * 0.5);
            }, 200);
          }
          break;
      }
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

const OFFSET_SCALE = 0.004,
  MAX_DISTANCE = 2;
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

  const name = obj.name.split("_")[0];
  menuName.textContent = name;

  menuButtons.textContent = "";

  if (name == "Walls") {
    const button = document.createElement("button");
    button.textContent = "Change wallpaper";
    button.onclick = toggleWallpaper;
    menuButtons.appendChild(button);
  }

  const button = document.createElement("button");
  button.textContent = "Delete";
  button.onclick = () => {
    const debugMesh: THREE.Mesh = obj.children[0].userData.debugMesh;
    if (debugMesh) debugMesh.parent!.remove(debugMesh);

    if (obj.children[0].userData.body)
      removePhysicsFromObject(obj.children[0].userData.body);

    if (name == "Light") disableLight();
    else if (name == "PC") deletePC();
    else if (name == "Bed") deleteBed();
    else if (name == "Clock") deleteClock();

    obj.parent?.remove(obj);
  };
  menuButtons.appendChild(button);

  const tempPos = new THREE.Vector3();
  camera.getWorldPosition(tempPos);
  const toPoint = i.point.clone().sub(tempPos);

  point =
    toPoint.length() > MAX_DISTANCE
      ? tempPos.add(toPoint.setLength(MAX_DISTANCE))
      : i.point;
  canShow = true;
}

const pos = new THREE.Vector3();
export function updateMenu(camera: THREE.PerspectiveCamera) {
  if (!contextObj || !point) return;

  contextObj.position.copy(point);

  camera.getWorldPosition(pos);
  contextObj.lookAt(pos);

  contextObj.translateY(
    -(contextRect.height + 14 * menuButtons.children.length) * OFFSET_SCALE,
  );
  contextObj.translateX(contextRect.width * OFFSET_SCALE);

  if (!contextObj.visible && canShow) contextObj.visible = true;
}

export function closeContextMenu() {
  if (contextObj && point) {
    contextObj.visible = false;
    point = undefined;
  }
}
