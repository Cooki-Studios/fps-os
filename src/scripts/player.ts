import * as THREE from "three";
import { disableInput, enableInput, isInputEnabled } from "./input";
// import { PointerLockControls } from "three/examples/jsm/controls/PointerLockControls.js";

export type PlayerData = {
  deltaRotY: number;
};
export const playerData: PlayerData = {
  deltaRotY: 0,
};

export function getPlayerData() {
  return playerData;
}
export function resetPlayerRotDelta() {
  playerData.deltaRotY = 0;
}

const playerGeo = new THREE.CapsuleGeometry(1, 2, 16, 32);
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
        camera.rotation.x - e.movementY * deg,
        -90 * deg,
        90 * deg,
      );
      playerData.deltaRotY -= e.movementX * deg;
    }
  };
}
