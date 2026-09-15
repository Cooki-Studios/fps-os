import { bootLog } from "../boot";
import * as THREE from "three";
import { lerp } from "three/src/math/MathUtils.js";
import {
  enablePlayerControl,
  getPlayerPosition,
  PLAYER_WORLD_CONTROL,
  setCutscene,
} from "./player";
import { setPlayerCollision } from "../system/physics";
import { playAnimation } from "../system/animation";
import { isMobile } from "../util/mobile";

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

export function updateKeypad(delta: number, canvas: HTMLCanvasElement) {
  if (buttons.length == 0) return;
  for (const button of buttons) {
    if (buttonPressed != button)
      button.position.y = lerp(button.position.y, -0.2, delta * 15);
    else {
      button.position.y = lerp(button.position.y, -0.15, delta * 20);
    }
  }

  if (!door || doorStage == 2) return;

  if (door.rotation.z > 0.3) {
    PLAYER_WORLD_CONTROL.y = -1;
  }

  if (getPlayerPosition().z < -5) {
    PLAYER_WORLD_CONTROL.y = 0;
    setCutscene(false);
    setPlayerCollision(true);
    enablePlayerControl(canvas);
    if (!isMobile) pcInfo.style.opacity = "1";
    doorStage = 2;
  }

  switch (doorStage) {
    case 1:
      playAnimation();
      break;
  }
}

export function createKeypad(
  camera: THREE.PerspectiveCamera,
  canvas: HTMLCanvasElement,
) {
  bootLog("Creating keypad...");

  let raycaster: THREE.Raycaster | undefined = new THREE.Raycaster();

  const mousePos = new THREE.Vector2();
  function getMousePos(e: PointerEvent) {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    mousePos.set((x / rect.width) * 2 - 1, -(y / rect.height) * 2 + 1);

    return mousePos;
  }

  canvas.onpointermove = (e) => {
    if (!raycaster) return;

    const mouse = getMousePos(e);
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

    const mouse = getMousePos(e);
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
