import * as THREE from "three";
import { createUI } from "./3dui";
import type { CSS3DObject } from "three/examples/jsm/Addons.js";
import { disableLight, toggleLight } from "../objects/mainLight";
import {
  addPhysicsToObject,
  pausePhysicsOfObject,
  removePhysicsFromObject,
  resumePhysicsOfObject,
  addVelocityToObject,
} from "./physics";
import { enablePC, getPCScreens } from "../objects/pc";
import {
  getAnimationTime,
  playAnimation,
  playAnimationReversed,
  stopAnimation,
} from "./animation";
import { setLightLevel } from "./lighting";
import { deleteDoor, lock } from "../objects/keypad";
import { deleteBed, sleep } from "../objects/bed";
import { setWallpaper, toggleWallpaper } from "../objects/wallpaper";
import { deleteClock } from "../objects/clock";
import { playAudio } from "./audio";
import {
  disablePlayerControl,
  dropObject,
  getPlayerPosition,
  pickupObject,
} from "../objects/player";
import { enableNoteEl, getNoteMeshes, initNote } from "../objects/notepad";
import { grabbables, interactibles } from "../objects/mesh";

const raycaster = new THREE.Raycaster();
raycaster.far = 8;

function getObject(
  camera: THREE.PerspectiveCamera,
  scene: THREE.Scene,
  x = 0,
  y = 0,
) {
  raycaster.setFromCamera(new THREE.Vector2(x, y), camera);

  const intersects = raycaster.intersectObjects([
    scene,
    ...getPCScreens(),
    ...getNoteMeshes(),
  ]);
  const intersect = intersects.find(
    (i) =>
      i.object instanceof THREE.Mesh &&
      i.object.name != "" &&
      !i.object.name.startsWith("N_Hand"),
  );
  if (!intersect || !intersect.object.parent) return;

  return {
    obj:
      intersect.object.name == "Screen" || intersect.object.name == "Note"
        ? intersect.object
        : intersect.object.parent,
    i: intersect,
  };
}

let hoverEl: HTMLElement, clickedEl: HTMLElement | undefined;
const blindsDown: boolean[] = [];

const cross = document.getElementById("cross") as HTMLHeadingElement;
let grabTimeout: number | null = null,
  grabObj: THREE.Object3D | null = null;

let throwObj: THREE.Mesh | null = null,
  throwFrames = 0;

function resetGrab() {
  cross.style.transition = "none";
  cross.style.setProperty("--progress", "0%");
  cross.classList.remove("grabbable");

  if (grabTimeout) clearTimeout(grabTimeout);
  grabTimeout = null;

  if (grabObj) {
    dropObject(grabObj, new THREE.Vector3());
    throwObj = grabObj.children[0] as THREE.Mesh;
    throwFrames = 5;
    grabObj = null;
  }
}

let interactReleased = true;
export function getInteractReleased() {
  return interactReleased;
}

const grabVel = new THREE.Vector3();
export function setGrabVel(
  x: number,
  y: number,
  playerVel: THREE.Vector3,
  camera: THREE.PerspectiveCamera,
) {
  const dir = new THREE.Vector3();
  camera.getWorldDirection(dir);

  const right = new THREE.Vector3().crossVectors(dir, camera.up);
  if (right.lengthSq() < 0.0001) right.set(1, 0, 0);
  else right.normalize();

  const up = new THREE.Vector3().crossVectors(right, dir);
  if (up.lengthSq() < 0.0001) up.set(0, 1, 0);
  else up.normalize();

  grabVel.set(0, 0, 0);
  grabVel
    .addScaledVector(up.clone().divideScalar(2), -y + playerVel.y)
    .addScaledVector(right.clone().divideScalar(2), x + playerVel.x)
    .addScaledVector(dir.clone().divideScalar(2), -playerVel.z);
}

const DAMPING = 0.5;
export function updateGrabInertia() {
  if (throwFrames > 0 && throwObj?.userData.body) {
    addVelocityToObject(throwObj, grabVel);
    throwFrames--;
  }
  if (grabVel.lengthSq() > 0.00001) grabVel.multiplyScalar(DAMPING);
}

export function scrollPlayer(
  e: WheelEvent,
  camera: THREE.PerspectiveCamera,
  scene: THREE.Scene,
) {
  const intersect = getObject(camera, scene);
  if (!intersect) return;

  const obj = intersect?.obj;
  if (!obj) return;

  if (obj.name == "Note") {
    e.stopPropagation();

    const el = obj.userData.ui.element.querySelector(
      "p",
    ) as HTMLParagraphElement;
    el.scrollTop -= e.deltaY;
  }
}

export function interactPlayer(
  camera: THREE.PerspectiveCamera,
  scene: THREE.Scene,
  canvas: HTMLCanvasElement,
  click = true,
  released = true,
  x = 0,
  y = 0,
) {
  interactReleased = released;

  const intersect = getObject(camera, scene, x, y);
  if (!intersect) {
    cross.classList.remove("active");
    clickedEl?.classList.remove("active");
  }

  const obj = intersect?.obj;
  if (!obj) clickedEl?.classList.remove("active");

  const name = obj?.name.split("_")[0];
  if (obj) {
    if (!grabObj && interactibles.includes(name ?? ""))
      cross.classList.add("active");
    else cross.classList.remove("active");

    if (obj.visible && grabbables.includes(name ?? ""))
      cross.classList.add("grabbable");
    else cross.classList.remove("grabbable");
  }

  const domEl = document.elementFromPoint(
    window.innerWidth / 2,
    window.innerHeight / 2,
  ) as HTMLElement | null;

  const overMenu =
    !!domEl &&
    !!contextObj?.visible &&
    !!domEl.closest("#ctx-buttons button, #ctx-buttons label");

  const el: HTMLElement | null = overMenu
    ? domEl
    : obj?.userData.ui?.element || domEl;

  if (click) {
    if (!released && el && (obj?.userData.ui?.element || menu.contains(el))) {
      if (clickedEl && clickedEl !== el) clickedEl.classList.remove("active");
      clickedEl = el;
      el.classList.add("active");
      if (!obj?.userData.ui?.element || overMenu) return;
    } else if (clickedEl) {
      if (released) {
        const held = grabObj;
        resetGrab();
        if (held) {
          clickedEl.classList.remove("active");
          clickedEl = undefined;
          return;
        }
      }

      clickedEl.classList.remove("active");
      if (el == clickedEl) {
        if (el instanceof HTMLButtonElement || el instanceof HTMLInputElement) {
          clickedEl.click();
          canShow = false;
          contextObj.visible = false;
        } else if (!grabObj && el.classList.contains("note")) {
          disablePlayerControl(canvas);
          canvas.style.pointerEvents = "none";
          document.addEventListener(
            "pointerlockchange",
            () => {
              const note = el.querySelector("textarea")!;
              enableNoteEl(note, el.querySelector("p")!);
              note.focus();
            },
            {
              once: true,
            },
          );
        }
        clickedEl = undefined;
        return;
      }
      clickedEl = undefined;
      return;
    } else {
      closeContextMenu();
    }

    if (obj)
      if (obj.visible && grabbables.includes(name ?? ""))
        if (grabTimeout) {
          clearTimeout(grabTimeout);
          grabTimeout = null;
        } else {
          cross.style.transition = "--progress linear 200ms";
          cross.style.setProperty("--progress", "100%");
          grabTimeout = setTimeout(() => {
            if (getObject(camera, scene)?.obj !== obj) return resetGrab();

            if (!obj.userData.grabbed && obj.name == "Note")
              obj.userData.createNote = 1;

            pickupObject(obj);
            grabObj = obj;
          }, 200);
        }

    if (name && click && released) {
      switch (name) {
        case "Switch":
          toggleLight();
          break;
        case "Door":
          lock(camera, canvas);
          break;
        case "PC":
          if (!grabObj) enablePC(canvas, scene);
          break;
        case "Screen":
          if (!grabObj) enablePC(canvas, scene, undefined, true);
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
              playAudio(name, "blind-up", 0, 0.6, 1.5);
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
      resetGrab();
    }
  } else {
    if (grabObj)
      if (
        grabObj.name == "Note" &&
        grabObj.userData.grabbed &&
        grabObj.userData.createNote
      ) {
        switch (grabObj.userData.createNote) {
          case 1:
            grabObj.userData.createNote = 2;
            break;
          case 2:
            grabObj.userData.createNote = 0;
            initNote(scene, canvas);
            break;
        }
      }

    if (el && menu.contains(el)) {
      if (hoverEl && hoverEl !== el) hoverEl.classList.remove("hover");
      hoverEl = el;
      el.classList.add("hover");
    } else if (hoverEl) {
      hoverEl.classList.remove("hover");
    }
  }

  if (!grabObj && (!intersect || !obj)) resetGrab();
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
    button.textContent = "Toggle wallpaper";
    button.onclick = toggleWallpaper;
    menuButtons.appendChild(button);

    const label = document.createElement("label");
    label.textContent = "Import wallpaper: ";

    const file = document.createElement("input");
    file.type = "file";
    file.accept = "image/*";
    file.onclick = () => {
      if (document.exitPointerLock) {
        document.exitPointerLock();
        closeContextMenu();
      }
    };
    file.onchange = () => {
      if (!file.files) return;
      setWallpaper(file.files[0]);
    };

    label.appendChild(file);
    menuButtons.appendChild(label);
  } else if (obj.visible && grabbables.includes(name ?? "")) {
    const mesh = obj.children[0] as THREE.Mesh;
    const button = document.createElement("button");
    let enabled = false;
    if (mesh.userData.body && !mesh.userData.paused) {
      button.textContent = "Disable physics";
      enabled = true;
    } else {
      button.textContent = "Enable physics";

      const button2 = document.createElement("button");
      button2.textContent = "Reset rotation";
      button2.onclick = () => {
        obj.lookAt(getPlayerPosition().add(camera.position));
        if (obj.name != "Note" && obj.name != "Screen") {
          obj.rotateY(-Math.PI / 2);
          obj.rotateX(-Math.PI / 2);
        }
      };
      menuButtons.appendChild(button2);
    }
    button.onclick = () => {
      if (enabled) {
        mesh.userData.paused = true;
        pausePhysicsOfObject(mesh, mesh.userData.body);
      } else {
        mesh.userData.paused = false;
        if (mesh.userData.body) resumePhysicsOfObject(mesh, mesh.userData.body);
        else addPhysicsToObject(mesh, true, false, false);
      }
    };
    menuButtons.appendChild(button);
  }

  const button = document.createElement("button");
  button.textContent = "Delete";
  button.onclick = () => {
    if (obj.children[0] instanceof THREE.Mesh) {
      const mesh = obj.children[0];
      if (mesh.userData.body) removePhysicsFromObject(mesh, mesh.userData.body);
    }

    if (name == "Light") disableLight();
    else if (name == "Bed") deleteBed();
    else if (name == "Clock") deleteClock();
    else if (name == "Door") deleteDoor();

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
