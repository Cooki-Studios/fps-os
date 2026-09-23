import { bootLog } from "../boot";
import * as THREE from "three";
import { lerp } from "three/src/math/MathUtils.js";
import {
  disablePlayerControl,
  enablePlayerControl,
  getPlayerPosition,
  PLAYER_WORLD_CONTROL,
  resetPlayer,
  setCutscene,
} from "./player";
import { respawnPlayer, setPlayerCollision } from "../system/physics";
import { playAnimation, stopAnimation } from "../system/animation";
import { isMobile } from "../util/mobile";
import { setupContextMenu } from "../system/interact";

let buttonPressed: THREE.Object3D | null = null,
  codeInput = "",
  doorStage = 0,
  buttons: THREE.Object3D[] = [],
  door: THREE.Object3D;

export function setKeypad(button: THREE.Object3D) {
  buttons.push(button);
}
export function setDoor(obj: THREE.Object3D) {
  door = obj;
}

const pcInfo = document.getElementById("pc-info") as HTMLHeadingElement;
let doorParts: THREE.Object3D[];

export function lock(
  camera: THREE.PerspectiveCamera,
  canvas: HTMLCanvasElement,
) {
  for (const doorPart of doorParts) {
    if (doorPart.name !== "Door") door.add(doorPart);
  }

  document.body.classList.add("lock");
  document.body.style.opacity = "0";

  setTimeout(() => {
    setCutscene(true);
    setPlayerCollision(false);
    disablePlayerControl(canvas);
    respawnPlayer();
    resetPlayer();
    createKeypad(camera, canvas);
    doorStage = 0;
    canvas.style.cursor = "default";
    raycaster = new THREE.Raycaster();
    setTimeout((document.body.style.opacity = "1"));
  }, 250);
}

export function updateKeypad(
  delta: number,
  canvas: HTMLCanvasElement,
  scene: THREE.Scene,
) {
  if (buttons.length == 0) return;
  for (const button of buttons) {
    if (buttonPressed != button)
      button.position.y = lerp(button.position.y, -0.2, delta * 15);
    else {
      button.position.y = lerp(button.position.y, -0.15, delta * 20);
    }
  }

  if (!door || doorStage == 3) return;

  if (door.rotation.z > 0.4) {
    PLAYER_WORLD_CONTROL.y = -1;
  }

  if (getPlayerPosition().z < -5) {
    stopAnimation();
    PLAYER_WORLD_CONTROL.y = 0;

    setupContextMenu(scene);

    setPlayerCollision(true);
    setCutscene(false);

    doorParts = [...door.children];

    for (let i = doorParts.length - 1; i >= 0; i--) {
      const doorPart = doorParts[i];
      if (doorPart.name !== "Door") door.remove(doorPart);
    }

    enablePlayerControl(canvas, scene);
    if (!(isMobile || document.body.classList.contains("lock")))
      pcInfo.style.opacity = "1";
    doorStage = 3;
  }

  switch (doorStage) {
    case 1:
      playAnimation();
      doorStage = 2;
      break;
  }
}

let raycaster: THREE.Raycaster | undefined = new THREE.Raycaster();

const mousePos = new THREE.Vector2();
function getMousePos(e: PointerEvent, canvas: HTMLCanvasElement) {
  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;

  mousePos.set((x / rect.width) * 2 - 1, -(y / rect.height) * 2 + 1);

  return mousePos;
}

export function createKeypad(
  camera: THREE.PerspectiveCamera,
  canvas: HTMLCanvasElement,
) {
  bootLog("Creating keypad...");

  canvas.onpointermove = (e) => {
    if (!raycaster) return;

    const mouse = getMousePos(e, canvas);
    raycaster.far = 2;
    raycaster.setFromCamera(mouse, camera);

    const intersects = raycaster.intersectObjects(buttons);
    if (intersects.length == 0) {
      canvas.style.cursor = "default";
      return;
    }

    const button = intersects[0].object;

    if (button) canvas.style.cursor = "pointer";
    else canvas.style.cursor = "default";
  };

  canvas.onpointerdown = (e) => {
    if (!raycaster) return;

    const mouse = getMousePos(e, canvas);
    raycaster.setFromCamera(mouse, camera);

    const intersects = raycaster.intersectObjects(buttons);
    if (intersects.length == 0) return;

    const button = intersects[0].object.parent;

    if (!button) return;

    const key = button.name.replace("key_", "");
    if (key == "C") codeInput = "";
    else codeInput += key;

    if (button.position.y >= -0.18) return;

    buttonPressed = button;
  };

  canvas.onpointerup = () => {
    buttonPressed = null;

    if (codeInput == "0000") {
      codeInput = "";
      raycaster = undefined;
      canvas.style.cursor = "default";

      setTimeout(() => (doorStage = 1), 150);
    }
  };
}
