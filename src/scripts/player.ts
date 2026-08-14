import * as THREE from "three";
import {
  disableInput,
  enableInput,
  getInputVector,
  getJoystickVector,
  isActionPressed,
  isInputEnabled,
  onActionPressed,
  onActionReleased,
} from "./input";
import { isPlayerGrounded } from "./physics";
import { lerp } from "three/src/math/MathUtils.js";

export type PlayerData = {
  velRotY: number;
  velPosX: number;
  velPosY: number;
  velPosZ: number;
};
export const playerData: PlayerData = {
  velRotY: 0,
  velPosX: 0,
  velPosY: 0,
  velPosZ: 0,
};

export function getPlayerData() {
  return playerData;
}
export function resetPlayerVelRot() {
  playerData.velRotY = 0;
}

export const PLAYER_RADIUS = 1,
  PLAYER_HEIGHT = 2,
  SPEED = 5,
  SPEED_SPRINT = 7,
  JUMP_VELOCITY = 7,
  MOUSE_SENS = isMobile() ? 1 : 0.5;

let speed = SPEED,
  sourceMovement = false,
  sens = MOUSE_SENS,
  lastPointerX = 0,
  lastPointerY = 0,
  dragging = false,
  activePointerId: number | null = null;

onActionPressed("sprint", () => {
  speed = SPEED_SPRINT;
});
onActionReleased("sprint", () => {
  speed = SPEED;
});
onActionPressed("sourceMovement", () => {
  sourceMovement = !sourceMovement;
});

const playerGeo = new THREE.CapsuleGeometry(
  PLAYER_RADIUS,
  PLAYER_HEIGHT,
  16,
  32,
);
const playerMat = new THREE.MeshPhysicalMaterial({
  colorWrite: false,
});
const playerMesh = new THREE.Mesh(playerGeo, playerMat);
playerMesh.name = "Player";
playerMesh.castShadow = true;

export function getPlayerMesh() {
  return playerMesh;
}

const deg = Math.PI / 180,
  clamp = (num: number, min: number, max: number) =>
    Math.max(min, Math.min(max, num));

export function isMobile() {
  return !document.body.requestPointerLock;
}

export function initPlayer(
  scene: THREE.Scene,
  camera: THREE.Camera,
  canvas: HTMLCanvasElement,
) {
  const player = new THREE.Group();

  scene.add(player);
  player.position.set(0, 2, 0);
  player.add(playerMesh);
  player.add(camera);
  camera.position.set(0, 1.8, 0);

  if (!isMobile()) {
    canvas.onclick = async () => {
      await canvas.requestPointerLock();
    };
    document.onpointerlockchange = () => {
      if (document.pointerLockElement == canvas) enableInput();
      else {
        disableInput();
      }
    };
  } else {
    canvas.onpointerdown = (e) => {
      if (activePointerId !== null) return;
      activePointerId = e.pointerId;
      dragging = true;
      lastPointerX = e.clientX;
      lastPointerY = e.clientY;
    };

    const releasePointer = (e: PointerEvent) => {
      if (e.pointerId !== activePointerId) return;
      if (canvas.hasPointerCapture(e.pointerId)) {
        canvas.releasePointerCapture(e.pointerId);
      }
      activePointerId = null;
      dragging = false;
    };
    canvas.onpointerup = releasePointer;
    canvas.onpointercancel = releasePointer;
  }

  canvas.onpointermove = (e) => {
    if (isMobile() && e.pointerId !== activePointerId) return;
    if (isMobile() || isInputEnabled()) {
      e.preventDefault();
      let deltaX: number, deltaY: number;

      if (isMobile()) {
        if (!dragging) return;
        deltaX = e.clientX - lastPointerX;
        deltaY = e.clientY - lastPointerY;
        lastPointerX = e.clientX;
        lastPointerY = e.clientY;
      } else {
        deltaX = e.movementX;
        deltaY = e.movementY;
      }

      camera.rotation.x = clamp(
        camera.rotation.x - deltaY * sens * deg,
        -90 * deg,
        90 * deg,
      );
      playerData.velRotY -= deltaX * sens * deg;
    }
  };

  // https://github.com/godotengine/godot/blob/master/modules/gdscript/editor/script_templates/CharacterBody3D/basic_movement.gd
  document.addEventListener("physics", () => {
    if (!playerMesh.parent) return;

    if (sourceMovement) {
    } else {
      if (isActionPressed("jump") && isPlayerGrounded()) {
        playerData.velPosY = JUMP_VELOCITY;
      } else playerData.velPosY = 0;

      var inputDir = isMobile()
        ? getJoystickVector()
        : getInputVector("left", "right", "forward", "back");
      const direction = new THREE.Vector3(inputDir.x, 0, inputDir.y)
        .applyQuaternion(playerMesh.parent.quaternion)
        .normalize();

      if (direction) {
        if (inputDir.x !== 0 || inputDir.y !== 0) {
          playerData.velPosX = direction.x * speed;
          playerData.velPosZ = direction.z * speed;
        } else {
          playerData.velPosX = lerp(playerData.velPosX, 0, 0.8);
          playerData.velPosZ = lerp(playerData.velPosZ, 0, 0.8);
        }
      }
    }
  });
}
