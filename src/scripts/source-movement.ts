// https://raw.githubusercontent.com/AceSpectre/Quakelike-Controller/refs/heads/main/QuakelikeController/playerMovement.gd

import * as THREE from "three";
import {
  getInputAxis,
  // getInputVector,
  // getJoystickVector,
  // isActionPressed,
} from "./input";
// import type JoltTypes from "jolt-physics/wasm";
import {
  // isMobile,
  type PlayerData,
} from "./player";
import {
  getGravityY,
  // isPlayerGrounded
} from "./physics";
import { lerp } from "three/src/math/MathUtils.js";

const SPEED = 15;

let direction: THREE.Vector3;

// Ground State
// const FLOOR_SNAP_LENGTH = 0.4;
const FLOOR_ACCEL = 7;
const FLOOR_DRAG = 8;

export function sourcePhysicsProcess(
  delta: number,
  playerData: PlayerData,
  playerMesh: THREE.Mesh,
) {
  move(delta, playerData, playerMesh, FLOOR_ACCEL, FLOOR_DRAG);
}

function move(
  delta: number,
  playerData: PlayerData,
  playerMesh: THREE.Mesh,
  accel: number,
  drag: number,
  speed: number = SPEED,
) {
  if (!playerMesh.parent) return;

  direction = new THREE.Vector3();

  const hRot = playerMesh.parent.rotation.y * (Math.PI / 180);
  const fInput = getInputAxis("forward", "back");
  const hInput = getInputAxis("left", "right");

  direction = new THREE.Vector3(hInput, 0, fInput)
    .applyAxisAngle(new THREE.Vector3(0, 1, 0), hRot)
    .applyQuaternion(playerMesh.parent.quaternion)
    .normalize();

  const wishVel = direction.multiplyScalar(speed);

  if (direction.length() > 0) {
    playerData.velPosX = lerp(playerData.velPosX, wishVel.x, accel * delta);
    playerData.velPosY = lerp(playerData.velPosY, wishVel.y, accel * delta);
    playerData.velPosZ = lerp(playerData.velPosZ, wishVel.z, accel * delta);
  } else {
    playerData.velPosX = lerp(playerData.velPosX, wishVel.x, drag * delta);
    playerData.velPosY = lerp(playerData.velPosY, wishVel.y, drag * delta);
    playerData.velPosZ = lerp(playerData.velPosZ, wishVel.z, drag * delta);
  }

  playerData.velPosY += getGravityY() * delta;
}
