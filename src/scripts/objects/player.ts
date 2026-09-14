import * as THREE from "three";
import {
  disableInput,
  enableInput,
  getInputAxis,
  getInputVector,
  getJoystickVector,
  initJoystick,
  isActionPressed,
  isInputEnabled,
  onActionPressed,
} from "../system/input";
import {
  applyWallDrag,
  crouchPlayer,
  getGravityY,
  isPlayerCrouched,
  isPlayerGrounded,
  setPlayerCollision,
} from "../system/physics";
import { bootLog } from "../boot";
import { isMobile } from "../util/mobile";

export type PlayerData = {
  velPosX: number;
  velPosY: number;
  velPosZ: number;
};
export const playerData: PlayerData = {
  velPosX: 0,
  velPosY: 0,
  velPosZ: 0,
};

export function getPlayerData() {
  return playerData;
}

export const PLAYER_RADIUS = 1,
  PLAYER_HEIGHT = 2,
  CROUCH_RATIO = 0.65,
  CROUCH_SPEED = 0.25,
  CAM_Y = 1.6,
  PLAYER_WORLD_CONTROL = new THREE.Vector2();

const MOUSE_SENS = isMobile ? 0.5 : 0.25;

const GROUND_ACCEL = 5,
  GROUND_MAX_SPEED = 10,
  GROUND_FRICTION = 6,
  NOCLIP_ACCEL = 2.5,
  NOCLIP_MAX_SPEED = 10,
  NOCLIP_FRICTION = 60,
  AIR_ACCEL = 10,
  AIR_MAX_SPEED = 2.5,
  AIR_FRICTION = 0,
  JUMP_VELOCITY = 6;

let velocity = new THREE.Vector3(),
  sens = MOUSE_SENS,
  lastPointerX = 0,
  lastPointerY = 0,
  dragging = false,
  activePointerId: number | null = null,
  noclip = false,
  cutscene = true;

export function setCutscene(enabled = false) {
  cutscene = enabled;
}

const playerGeo = new THREE.CapsuleGeometry(
  PLAYER_RADIUS,
  PLAYER_HEIGHT,
  16,
  32,
);
const playerMat = new THREE.MeshPhysicalMaterial({
  colorWrite: false,
  shadowSide: THREE.DoubleSide,
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

export function enablePlayerControl(canvas: HTMLCanvasElement) {
  canvas.onpointermove = (e) => {
    if (isMobile && e.pointerId !== activePointerId) return;
    if (isMobile || isInputEnabled()) {
      e.preventDefault();
      let deltaX: number, deltaY: number;

      if (isMobile) {
        if (!dragging) return;
        const events = e.getCoalescedEvents?.() ?? [e];
        deltaX = 0;
        deltaY = 0;
        for (const ev of events) {
          deltaX += ev.clientX - lastPointerX;
          deltaY += ev.clientY - lastPointerY;
          lastPointerX = ev.clientX;
          lastPointerY = ev.clientY;
        }
      } else {
        deltaX = e.movementX;
        deltaY = e.movementY;
      }

      player.rotation.y -= deltaX * sens * deg;
      camera.rotation.x = clamp(
        camera.rotation.x - deltaY * sens * deg,
        -90 * deg,
        90 * deg,
      );
    }
  };

  if (!isMobile) {
    canvas.style.cursor = "pointer";
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

    initJoystick();
  }
}

const player = new THREE.Group();
let camera: THREE.PerspectiveCamera;

export function getPlayerPosition() {
  return player.position;
}

export function initPlayer(
  scene: THREE.Scene,
  sceneCam: THREE.PerspectiveCamera,
) {
  camera = sceneCam;

  scene.add(player);
  player.position.set(0, 2, 0.3);
  player.add(playerMesh);
  player.add(camera);
  camera.position.set(0, CAM_Y, 0);

  let crouched = false;
  let prevSpeed = 0;

  const velEl = document.getElementById("vel") as HTMLHeadingElement;
  onActionPressed("speedo", () => {
    velEl.style.visibility =
      velEl.style.visibility === "visible" ? "hidden" : "visible";
  });

  onActionPressed("noclip", () => {
    setPlayerCollision(noclip);
    playerMesh.castShadow = noclip;
    noclip = !noclip;
    velocity.y = 0;
  });

  const camWorldQuat = new THREE.Quaternion();

  document.addEventListener("physics", (e) => {
    if (!playerMesh.parent) return;
    const delta = (e as CustomEvent<number>).detail;
    const grounded = isPlayerGrounded();

    // https://github.com/godotengine/godot/blob/master/modules/gdscript/editor/script_templates/CharacterBody3D/basic_movement.gd
    if (!noclip)
      if (isActionPressed("jump") && isPlayerGrounded()) {
        playerData.velPosY = isPlayerCrouched()
          ? JUMP_VELOCITY * CROUCH_RATIO
          : JUMP_VELOCITY;
      } else if (!isPlayerGrounded() && !cutscene) {
        playerData.velPosY += getGravityY() * delta;
      } else {
        playerData.velPosY = 0;
      }
    else {
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
    const inputDir = isMobile
      ? getJoystickVector()
      : getInputVector("left", "right", "forward", "back");

    const wishDir = new THREE.Vector3(
      inputDir.x + PLAYER_WORLD_CONTROL.x,
      0,
      inputDir.y + PLAYER_WORLD_CONTROL.y,
    );
    if (noclip) {
      wishDir.y = getInputAxis("down", "up");
      camera.getWorldQuaternion(camWorldQuat);
      wishDir.applyQuaternion(camWorldQuat);
    } else wishDir.applyQuaternion(playerMesh.parent.quaternion);
    wishDir.normalize();

    let accel = grounded ? GROUND_ACCEL : AIR_ACCEL,
      maxSpeed = grounded ? GROUND_MAX_SPEED : AIR_MAX_SPEED,
      friction = grounded ? GROUND_FRICTION : AIR_FRICTION;

    if (noclip) {
      const sprint = isActionPressed("sprint");
      accel = sprint ? NOCLIP_ACCEL * 10 : NOCLIP_ACCEL;
      maxSpeed = NOCLIP_MAX_SPEED;
      friction = NOCLIP_FRICTION;
    }

    if (cutscene) {
      accel = GROUND_ACCEL;
      maxSpeed = GROUND_MAX_SPEED;
      friction = GROUND_FRICTION;
    }

    if (isPlayerCrouched()) {
      accel *= CROUCH_RATIO;
      maxSpeed *= CROUCH_RATIO;
    }

    let speed = Math.hypot(velocity.x, velocity.z);
    if (noclip) speed = Math.hypot(velocity.x, velocity.y, velocity.z);

    if (speed > 0 && friction > 0) {
      const scale = Math.max(0, speed - speed * friction * delta) / speed;
      velocity.x *= scale;
      velocity.z *= scale;
      if (noclip) velocity.y *= scale;
    }

    if (wishDir.lengthSq() > 0) {
      let proj = velocity.x * wishDir.x + velocity.z * wishDir.z;
      if (noclip) proj += velocity.y * wishDir.y;

      const addSpeed = Math.min(
        Math.max(maxSpeed - proj, 0),
        accel * delta * maxSpeed,
      );
      velocity.x += wishDir.x * addSpeed;
      velocity.z += wishDir.z * addSpeed;
      if (noclip) velocity.y += wishDir.y * addSpeed;
    }

    const speedFixed = speed.toFixed(1);
    const deltaSpeedFixed = (speed - prevSpeed).toFixed(1);

    if (
      velEl.style.visibility == "visible" &&
      velEl.textContent != speedFixed
    ) {
      velEl.textContent = speedFixed;
      if (Number(deltaSpeedFixed) > 0) {
        velEl.className = "blu";
      } else if (Number(deltaSpeedFixed) < 0) {
        velEl.className = "red";
      } else {
        velEl.className = "";
      }
    }

    if (!noclip) applyWallDrag(velocity);
    playerData.velPosX = velocity.x;
    playerData.velPosZ = velocity.z;
    if (noclip) playerData.velPosY = velocity.y;

    prevSpeed = speed;
  });

  bootLog("Player initialised");
}
