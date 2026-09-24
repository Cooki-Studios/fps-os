import { bootLog } from "../boot";
import * as THREE from "three";
import { playAudio } from "../system/audio";

const mats: THREE.MeshBasicMaterial[] = [];
let texture: THREE.Texture;

export async function initWallpaper(walls?: THREE.Object3D) {
  if (!walls) return;

  const wallObjs = [...walls.children];

  const loader = new THREE.TextureLoader();
  texture = await loader.loadAsync("textures/wallpaper.jpg");

  for (const wall of wallObjs) {
    const mesh = wall.children[0] as THREE.Mesh;
    const mat = mesh.material as THREE.MeshBasicMaterial;
    mats.push(mat);
  }

  bootLog("Wallpaper initialised");
}

export function toggleWallpaper() {
  playAudio("Player", "wallpaper-change");
  for (const mat of mats) {
    if (mat.map) mat.map = null;
    else mat.map = texture;
    mat.needsUpdate = true;
  }
}
