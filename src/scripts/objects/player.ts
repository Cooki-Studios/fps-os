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
  onActionReleased,
  toggleAction,
} from "../system/input";
import {
  applyWallDrag,
  crouchPlayer,
  getGravityY,
  isPlayerCrouched,
  isPlayerGrounded,
  isPlayerHittingCeiling,
  removePhysicsFromObject,
  setPlayerCollision,
} from "../system/physics";
import { bootLog } from "../boot";
import { isMobile } from "../util/mobile";
import {
  closeContextMenu,
  contextPlayer,
  interactPlayer,
} from "../system/interact";
import {
  addAudioToObject,
  enableAudioEl,
  isAudioPlaying,
  playAudio,
  setAudioSpeed,
  setAudioVolume,
  stopAudio,
} from "../system/audio";
import { isInPC } from "./pc";
import { addUpdateUI } from "../system/3dui";

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
  AIR_FRICTION = 0.1,
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

const pcInfo = document.getElementById("pc-info") as HTMLHeadingElement,
  warnEl = document.getElementById("literal-pc-info") as HTMLHeadingElement;

export function enablePlayerControl(
  canvas: HTMLCanvasElement,
  scene: THREE.Scene,
) {
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

      interactPlayer(camera, scene, canvas, false);
    }
  };

  onActionPressed("interact", () =>
    interactPlayer(camera, scene, canvas, true, false),
  );
  onActionReleased("interact", () =>
    interactPlayer(camera, scene, canvas, true, true),
  );

  if (!isMobile) {
    canvas.style.cursor = "pointer";
    // canvas.oncontextmenu = () => contextPlayer(camera, scene);
    canvas.onclick = async (e) => {
      if (document.pointerLockElement == canvas) {
        switch (e.button) {
          case 0:
            interactPlayer(camera, scene, canvas);
            break;
          case 2:
            contextPlayer(camera, scene);
            break;
        }
      } else {
        await canvas.requestPointerLock();
        if (pcInfo) {
          pcInfo.style.transition = "none";
          pcInfo.style.opacity = "0";
        }
        if (warnEl) {
          warnEl.style.opacity = "0";
          warnEl.textContent = "Press ESC to exit PC";
        }
      }
    };
    canvas.onpointerdown = (e) => {
      if (document.pointerLockElement == canvas && e.button == 0)
        interactPlayer(camera, scene, canvas, true, false);
    };
    document.onpointerlockchange = () => {
      if (document.pointerLockElement == canvas) enableInput();
      else {
        if (!isInPC()) enableAudioEl();
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

    const mobile = document.getElementById("mobile") as HTMLDivElement;
    mobile.style.display = "block";
    mobile.style.opacity = "1";
  }
}

export function disablePlayerControl(canvas: HTMLCanvasElement) {
  document.exitPointerLock();
  canvas.onclick = null;
  canvas.onpointermove = null;
  canvas.onpointerdown = null;
  canvas.onpointerup = null;
  canvas.onpointercancel = null;
}

const player = new THREE.Group();
player.name = "Player";
let camera: THREE.PerspectiveCamera;

export function getPlayerPosition() {
  return player.position;
}

export function resetPlayer() {
  velocity.set(0, 0, 0);
  playerData.velPosX = 0;
  playerData.velPosY = 0;
  playerData.velPosZ = 0;
  player.rotation.set(0, 0, 0);
  camera.rotation.set(0, 0, 0);
}

export async function initPlayer(
  scene: THREE.Scene,
  sceneCam: THREE.PerspectiveCamera,
) {
  camera = sceneCam;

  scene.add(player);
  player.position.set(0, 2, 0.3);
  player.add(playerMesh);
  player.add(camera);
  camera.position.set(0, CAM_Y, 0);

  await addAudioToObject(player, "player-steps", 5, false, 2).then(() =>
    setAudioVolume(player.name, "player-steps", 5),
  );
  await addAudioToObject(player, "player-jump", 1).then(() =>
    setAudioVolume(player.name, "player-jump", 0.0),
  );
  await addAudioToObject(player, "player-wind", 1);
  await addAudioToObject(player, "wallpaper-change", 1);

  let crouched = false;
  let prevSpeed = 0;

  const velEl = document.getElementById("vel") as HTMLHeadingElement;
  onActionPressed("speedo", () => {
    velEl.style.visibility =
      velEl.style.visibility === "visible" ? "hidden" : "visible";
  });

  onActionPressed("noclip", () => {
    toggleAction("interact", noclip);
    setPlayerCollision(noclip);
    playerMesh.castShadow = noclip;
    noclip = !noclip;
    velocity.y = 0;
  });

  const camWorldQuat = new THREE.Quaternion();

  document.addEventListener("physics", (e) => {
    if (!playerMesh.parent) return;
    const delta = (e as CustomEvent<number>).detail;
    const grounded = isPlayerGrounded(),
      ceiling = isPlayerHittingCeiling();

    // https://github.com/godotengine/godot/blob/master/modules/gdscript/editor/script_templates/CharacterBody3D/basic_movement.gd
    if (!noclip)
      if (ceiling && playerData.velPosY > 0) playerData.velPosY = 0;
      else if (isActionPressed("jump") && grounded) {
        playerData.velPosY = isPlayerCrouched()
          ? JUMP_VELOCITY * CROUCH_RATIO
          : JUMP_VELOCITY;

        if (!isAudioPlaying(player.name, "player-jump"))
          playAudio(player.name, "player-jump");
      } else if (!grounded && !cutscene)
        playerData.velPosY += getGravityY() * delta;
      else playerData.velPosY = 0;
    else {
      playerData.velPosY = 0;
    }

    if (isActionPressed("crouch") && !crouched && !noclip) {
      crouched = true;
      crouchPlayer(true, playerMesh, camera);
      setAudioSpeed(player.name, "player-steps", 1);
    }
    if (crouched && !isActionPressed("crouch"))
      if (crouchPlayer(false, playerMesh, camera)) {
        crouched = false;
        setAudioSpeed(player.name, "player-steps", 2);
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

      closeContextMenu();

      if (grounded && !isAudioPlaying(player.name, "player-steps"))
        playAudio(player.name, "player-steps");
    }

    if (!noclip) applyWallDrag(velocity);
    playerData.velPosX = velocity.x;
    playerData.velPosZ = velocity.z;
    if (noclip) playerData.velPosY = velocity.y;

    const playerDataVel = new THREE.Vector3(
      playerData.velPosX,
      playerData.velPosY,
      playerData.velPosZ,
    ).lengthSq();

    const speedFixed = (playerDataVel / 10).toFixed(1);
    const deltaSpeedFixed = (Number(speedFixed) - prevSpeed).toFixed(1);

    if (playerDataVel > 0.01) {
      setAudioVolume(
        player.name,
        "player-wind",
        Math.min(playerDataVel / 1000, 0.1),
      );
      if (!isAudioPlaying(player.name, "player-wind"))
        playAudio(player.name, "player-wind", 0, 0, null);
    } else if (isAudioPlaying(player.name, "player-wind"))
      stopAudio(player.name, "player-wind");

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

    prevSpeed = Number(speedFixed);
  });

  bootLog("Player initialised");
}

export function pickupObject(obj: THREE.Object3D) {
  const physObj = obj.children[0] as THREE.Mesh;
  if (physObj) removePhysicsFromObject(physObj, physObj.userData.body);

  const mesh = (physObj || obj) as THREE.Mesh,
    mat = mesh.material as THREE.Material;

  mesh.renderOrder = 2;
  mat.depthWrite = false;
  mat.transparent = true;
  mat.depthFunc = THREE.AlwaysDepth;

  camera.attach(obj);
  obj.position.set(2, -1, -3);
  obj.rotation.set(0, -Math.PI / 8, 0);

  if (obj.userData.ui) {
    obj.userData.pickup = true;
    addUpdateUI(obj);
  }
}
