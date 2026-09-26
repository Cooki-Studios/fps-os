import { bootLog } from "../boot";
import * as THREE from "three";
import { playAudio } from "../system/audio";
import { getWallpaperBlob, saveWallpaperBlob } from "../system/db";

const mats: THREE.MeshBasicMaterial[] = [];
let texture: THREE.Texture;

const loader = new THREE.TextureLoader();

export async function initWallpaper(walls?: THREE.Object3D) {
  if (!walls) return;

  const wallObjs = [...walls.children];

  for (const wall of wallObjs) {
    const mesh = wall.children[0] as THREE.Mesh;
    const mat = mesh.material as THREE.MeshBasicMaterial;
    mats.push(mat);
  }

  for (const mat of mats) {
    mat.map = texture;
    mat.needsUpdate = true;
  }

  const loaded = await restoreSavedWallpaper();
  if (!loaded) {
    await loadWallpaper();
  } else {
    for (const mat of mats) {
      mat.map = texture;
      mat.needsUpdate = true;
    }
  }

  bootLog("Wallpaper initialised");
}

async function loadWallpaper() {
  const saved = localStorage.getItem("wallpaper");
  if (saved) texture = await loader.loadAsync(saved);
  else texture = await loader.loadAsync("textures/wallpaper.jpg");
}

export function toggleWallpaper() {
  playAudio("Player", "wallpaper-change", 0, 0.1);
  for (const mat of mats) {
    if (mat.map) mat.map = null;
    else mat.map = texture;
    mat.needsUpdate = true;
  }
}

export async function setWallpaper(file: File) {
  await saveWallpaperBlob(file);
  const objectUrl = URL.createObjectURL(file);
  texture = await loader.loadAsync(objectUrl);
  URL.revokeObjectURL(objectUrl);

  for (const mat of mats) {
    mat.map = texture;
    mat.needsUpdate = true;
  }
}

async function restoreSavedWallpaper() {
  const blob = await getWallpaperBlob();
  if (!blob) return false;

  const objectUrl = URL.createObjectURL(blob);
  texture = await loader.loadAsync(objectUrl);
  URL.revokeObjectURL(objectUrl);

  return true;
}
