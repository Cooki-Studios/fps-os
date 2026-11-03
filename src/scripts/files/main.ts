import * as THREE from "three";
import { setFilesRenderer } from "../system/renderer";
import { addGlobalAudio, playAudio } from "../system/audio";
import { createTile, generateTile, getTileHeight, getTileWidth } from "./tiles";
import { showFileCtrl } from "./controls";
import { filesPlayerX, filesPlayerY, updateFilesPlayerVars } from "./map";

const scene = new THREE.Scene();
const bg = 0x000000;
scene.background = new THREE.Color(bg);

const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  1000,
);
camera.rotation.order = "YXZ";
scene.add(camera);

const ambientLight = new THREE.AmbientLight(0xffffff, 0);
scene.add(ambientLight);

export function getFileAmbLight() {
  return ambientLight;
}

const WIDTH = getTileWidth(),
  DEPTH = getTileHeight(),
  FOG_NEAR = DEPTH * 3,
  FOG_FAR = DEPTH * 3.5;

let camZ = DEPTH / 2,
  camX = 0;

export function moveFilesPlayer(x = 0, y = 0) {
  updateFilesPlayerVars(x, y);

  generateTile(filesPlayerX, filesPlayerY, scene);

  camZ -= y * DEPTH;
  camX += x * WIDTH;
}

export function updateFilesPlayerPos(delta: number) {
  camera.position.z = THREE.MathUtils.damp(camera.position.z, camZ, 16, delta);
  camera.position.x = THREE.MathUtils.damp(camera.position.x, camX, 16, delta);
}

camera.position.z = camZ;
scene.fog = new THREE.Fog(bg, FOG_NEAR, FOG_FAR);

export async function setupFilesAudio() {
  await addGlobalAudio("music/NIVIRO - The Riot [NCS Release]", true);
  await addGlobalAudio("files/intro");
}

const qualityEl = document.getElementById("quality-label") as HTMLDivElement,
  title = document.getElementById("files-title") as HTMLHeadingElement;

let visited = localStorage.getItem("files-visited") ? true : false,
  visitedSession = false;

export function switchToFiles() {
  visited = localStorage.getItem("files-visited") ? true : false;

  if (!visitedSession) {
    createTile(
      { sides: ["back", "right", "left"], x: 0, y: 0, intro: 1 },
      scene,
      visited,
    );
    createTile(
      {
        sides: ["right", "left"],
        x: 0,
        y: 1,
        intro: 2,
      },
      scene,

      visited,
    );
    createTile(
      {
        sides: ["right", "left"],
        x: 0,
        y: 2,
        intro: 3,
      },
      scene,

      visited,
    );
    createTile(
      {
        sides: [],
        x: 0,
        y: 3,
        intro: 4,
      },
      scene,

      visited,
    );
  }

  if (visited) {
    title.classList.add("mini");
    title.style.opacity = "0.5";
    title.style.translate = "0 -13em";

    if (visitedSession) {
      playAudio(
        "global",
        "music/NIVIRO - The Riot [NCS Release]",
        200,
        0,
        0.25,
      );
      setTimeout(showFileCtrl, 200);
    } else {
      playAudio(
        "global",
        "music/NIVIRO - The Riot [NCS Release]",
        1500,
        0,
        0.25,
      );
      setTimeout(showFileCtrl, 1500);
    }
  }

  localStorage.setItem("files-visited", "true");
  visitedSession = true;

  setFilesRenderer(scene, camera);
  qualityEl.style.visibility = "hidden";
}
