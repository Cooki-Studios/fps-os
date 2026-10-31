import * as THREE from "three";
import { setFilesRenderer } from "../system/renderer";
import { addGlobalAudio } from "../system/audio";
import { createTile, getTileHeight, getTiles } from "./tiles";

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

const ambientLight = new THREE.AmbientLight(0xffffff, 1);
scene.add(ambientLight);

const DEPTH = getTileHeight(),
  FOG_NEAR = DEPTH * 2,
  FOG_FAR = DEPTH * 3;

let playerX = 0,
  playerY = 0;

camera.position.z = DEPTH / 2;
scene.fog = new THREE.Fog(bg, FOG_NEAR, FOG_FAR);

export async function setupFilesAudio() {
  await addGlobalAudio("music/NIVIRO - The Riot [NCS Release]", true);
  await addGlobalAudio("files/intro");
}

const qualityEl = document.getElementById("quality-label") as HTMLDivElement;

const map = document.getElementById("map") as HTMLCanvasElement;
const ctx = map.getContext("2d") as CanvasRenderingContext2D;
ctx.lineWidth = 2;

export function switchToFiles() {
  createTile({ sides: ["right", "left"], x: 0, y: 0, intro: 1 }, scene);
  createTile(
    {
      sides: ["right", "left"],
      x: 0,
      y: 1,
      intro: 2,
    },
    scene,
  );
  createTile(
    {
      sides: ["right", "left"],
      x: 0,
      y: 2,
      intro: 3,
    },
    scene,
  );
  createTile(
    {
      sides: [],
      x: 0,
      y: 3,
      intro: 4,
    },
    scene,
  );

  setFilesRenderer(scene, camera);
  qualityEl.style.visibility = "hidden";
}

const TILE_SIZE = 32;

ctx.fillStyle = "#1c0333";
ctx.strokeStyle = "white";

const title = document.getElementById("files-title") as HTMLHeadingElement;

export function updateFileMap() {
  if (!title.style.opacity) {
    title.style.opacity = "1";
    title.style.translate = "0";
  }

  const tiles = getTiles();
  for (const tile in tiles) {
    const data = tiles[tile];
    if (data.intro) continue;

    if (!map.style.visibility) map.style.visibility = "visible";

    const x = map.width / 2 + data.x * TILE_SIZE - TILE_SIZE / 2,
      y = map.height - TILE_SIZE * (data.y + 1);

    ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);

    if (data.x == playerX && data.y == playerY) {
      ctx.beginPath();
      ctx.ellipse(
        x + TILE_SIZE / 2,
        y + TILE_SIZE / 2,
        TILE_SIZE / 4,
        TILE_SIZE / 4,
        0,
        0,
        2 * Math.PI,
      );
      ctx.stroke();
      ctx.closePath();
    }

    ctx.beginPath();
    for (const side of data["sides"]) {
      switch (side) {
        case "left":
          ctx.moveTo(x, y);
          ctx.lineTo(x, y + TILE_SIZE);
          break;
        case "right":
          ctx.moveTo(x + TILE_SIZE, y);
          ctx.lineTo(x + TILE_SIZE, y + TILE_SIZE);
          break;
        case "forward":
          ctx.moveTo(x, y);
          ctx.lineTo(x + TILE_SIZE, y);
          break;
      }

      ctx.closePath();
      ctx.stroke();
    }
  }
}
