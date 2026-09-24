import { bootLog } from "../boot";
import * as THREE from "three";
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
import { addAudioToObject, playAudio, stopAudio } from "../system/audio";

let buttonPressed: THREE.Object3D | null = null,
  codeInput = "",
  doorStage = 0,
  buttons: THREE.Object3D[] = [],
  door: THREE.Object3D,
  keyLightMat: THREE.MeshPhysicalMaterial;

export function setKeypad(button: THREE.Object3D) {
  addAudioToObject(button, "keypad-down", 0.25);
  addAudioToObject(button, "keypad-up", 0.25);
  buttons.push(button);
}
export function setDoor(obj: THREE.Object3D) {
  addAudioToObject(obj, "door-open", 0.5);
  door = obj;
}
export function setKeyLight(mesh: THREE.Mesh) {
  keyLightMat = mesh.material as THREE.MeshPhysicalMaterial;
  keyLightMat.emissive = new THREE.Color(1, 0, 0);
  keyLightMat.emissiveIntensity = 0;
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
    const isPressed = buttonPressed === button,
      y = isPressed ? -0.15 : -0.2,
      lambda = isPressed ? 20 : 15;

    button.position.y = THREE.MathUtils.damp(
      button.position.y,
      y,
      lambda,
      delta,
    );
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

    playAudio("Blind2", "windows-wind", 0, 0, 1, false);
    playAudio("Blind3", "windows-wind", 0, 0, 1, false);
    playAudio("Blind4", "windows-wind", 0, 0, 1, false);
    playAudio("Blind5", "windows-wind", 0, 0, 1, false);
  }

  switch (doorStage) {
    case 1:
      setTimeout(() => playAudio(door.name, "door-open"), 500);
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

    if (!button || button.position.y >= -0.18) return;

    const key = button.name.replace("key_", "");
    if (key == "C") {
      codeInput = "";
      keyLightMat.emissiveIntensity = 0;
    } else codeInput += key;

    buttonPressed = button;

    playAudio(buttonPressed.name, "keypad-down", 125);
  };

  canvas.onpointerup = () => {
    if (buttonPressed) {
      stopAudio(buttonPressed.name, "keypad-down");
      if (buttonPressed.position.y <= -0.15)
        playAudio(buttonPressed.name, "keypad-up");
    }
    buttonPressed = null;

    if (codeInput == "0000") {
      keyLightMat.emissive = new THREE.Color(0, 1, 0);
      keyLightMat.emissiveIntensity = 1;
      codeInput = "";
      raycaster = undefined;
      canvas.style.cursor = "default";

      setTimeout(() => (doorStage = 1), 150);
    } else if (codeInput.length > 3) {
      keyLightMat.emissiveIntensity = 1;
    }
  };
}
