import * as THREE from "three";
import {
  disableInput,
  enableInput,
  getInputVector,
  getJoystickVector,
  isActionPressed,
  isInputEnabled,
  onActionPressed,
} from "./input";
import {
  applyWallDrag,
  crouchPlayer,
  getGravityY,
  isPlayerGrounded,
} from "./physics";

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
  CROUCH_RATIO = 0.65,
  CROUCH_SPEED = 0.25,
  CAM_Y = 1.8;

const MOUSE_SENS = isMobile() ? 0.5 : 0.25;

const GROUND_ACCEL = 5,
  AIR_ACCEL = 10,
  GROUND_MAX_SPEED = 10,
  AIR_MAX_SPEED = 2.5,
  GROUND_FRICTION = 6,
  AIR_FRICTION = 0,
  JUMP_VELOCITY = 6;

let velocity = new THREE.Vector3(),
  sens = MOUSE_SENS,
  lastPointerX = 0,
  lastPointerY = 0,
  dragging = false,
  activePointerId: number | null = null;

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
  return /Mobi/i.test(window.navigator.userAgent);
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
  camera.position.set(0, CAM_Y, 0);

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

  let crouched = false;
  let prevSpeed = 0;

  const velEl = document.getElementById("vel") as HTMLHeadingElement;
  onActionPressed("speedo", () => {
    velEl.style.visibility =
      velEl.style.visibility === "visible" ? "hidden" : "visible";
  });

  document.addEventListener("physics", (e) => {
    if (!playerMesh.parent) return;
    const delta = (e as CustomEvent<number>).detail;
    const grounded = isPlayerGrounded();

    // https://github.com/godotengine/godot/blob/master/modules/gdscript/editor/script_templates/CharacterBody3D/basic_movement.gd
    if (isActionPressed("jump") && isPlayerGrounded()) {
      playerData.velPosY = JUMP_VELOCITY;
    } else if (!isPlayerGrounded()) {
      playerData.velPosY += getGravityY() * delta;
    } else {
      playerData.velPosY = 0;
    }

    if (isActionPressed("crouch") && !crouched) {
      crouched = true;
      crouchPlayer(true, playerMesh, camera);
    }
    if (!isActionPressed("crouch") && crouched) {
      if (crouchPlayer(false, playerMesh, camera)) crouched = false;
    }

    // https://github.com/AceSpectre/Quakelike-Controller/blob/main/QuakelikeController/playerMovement.gd
    const inputDir = isMobile()
      ? getJoystickVector()
      : getInputVector("left", "right", "forward", "back");

    const wishDir = new THREE.Vector3(inputDir.x, 0, inputDir.y)
      .applyQuaternion(playerMesh.parent.quaternion)
      .normalize();

    const accel = grounded ? GROUND_ACCEL : AIR_ACCEL,
      maxSpeed = grounded ? GROUND_MAX_SPEED : AIR_MAX_SPEED,
      friction = grounded ? GROUND_FRICTION : AIR_FRICTION;

    const speed = Math.hypot(velocity.x, velocity.z);
    if (speed > 0 && friction > 0) {
      const scale = Math.max(0, speed - speed * friction * delta) / speed;
      velocity.x *= scale;
      velocity.z *= scale;
    }

    if (wishDir.lengthSq() > 0) {
      const proj = velocity.x * wishDir.x + velocity.z * wishDir.z;
      const addSpeed = Math.min(
        Math.max(maxSpeed - proj, 0),
        accel * delta * maxSpeed,
      );
      velocity.x += wishDir.x * addSpeed;
      velocity.z += wishDir.z * addSpeed;
    }

    const speedFixed = speed.toFixed(1);
    const deltaSpeedFixed = (speed - prevSpeed).toFixed(1);

    velEl.textContent = speedFixed;
    if (Number(deltaSpeedFixed) > 0) {
      velEl.className = "blu";
    } else if (Number(deltaSpeedFixed) < 0) {
      velEl.className = "red";
    } else {
      velEl.className = "";
    }

    applyWallDrag(velocity);
    playerData.velPosX = velocity.x;
    playerData.velPosZ = velocity.z;

    prevSpeed = speed;
  });
}
