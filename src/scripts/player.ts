import * as THREE from "three";
import {
  disableInput,
  enableInput,
  getInputVector,
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
  MOUSE_SENS = 0.5;

let speed = SPEED,
  sourceMovement = false;

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

const deg = Math.PI / 180;
const clamp = (num: number, min: number, max: number) =>
  Math.max(min, Math.min(max, num));

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

  canvas.onclick = async () => {
    await canvas.requestPointerLock();
  };
  document.onpointerlockchange = () => {
    if (document.pointerLockElement == canvas) enableInput();
    else {
      disableInput();
    }
  };

  canvas.onpointermove = (e) => {
    if (isInputEnabled()) {
      camera.rotation.x = clamp(
        camera.rotation.x - e.movementY * MOUSE_SENS * deg,
        -90 * deg,
        90 * deg,
      );
      playerData.velRotY -= e.movementX * MOUSE_SENS * deg;
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

      var input_dir = getInputVector("left", "right", "forward", "back");
      const direction = new THREE.Vector3(input_dir.x, 0, input_dir.y)
        .applyQuaternion(playerMesh.parent.quaternion)
        .normalize();

      if (direction) {
        playerData.velPosX = direction.x * speed;
        playerData.velPosZ = direction.z * speed;
      } else {
        playerData.velPosX = lerp(playerData.velPosX, 0, speed);
        playerData.velPosZ = lerp(playerData.velPosZ, 0, speed);
      }
    }
  });
}
