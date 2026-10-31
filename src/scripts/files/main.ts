import * as THREE from "three";
import { setFilesRenderer } from "../system/renderer";
import { addGlobalAudio, playAudio } from "../system/audio";
import {
  createTile,
  generateTile,
  getTileHeight,
  getTiles,
  getTileWidth,
  SIDES,
  type Tile,
} from "./tiles";
import { getAllowMap, showFileCtrl, updateFileControls } from "./controls";

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
  FOG_NEAR = DEPTH * 2,
  FOG_FAR = DEPTH * 3;

let playerX = 0,
  playerY = 0;

export function moveFilesPlayer(x = 0, y = 0) {
  playerX += x;
  playerY += y;

  updateFileMap();
  generateTile(playerX, playerY, scene);

  camera.position.z -= y * DEPTH;
  camera.position.x += x * WIDTH;
}

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

const TILE_SIZE = 32;

ctx.fillStyle = "#1c0333";
ctx.strokeStyle = "white";

const title = document.getElementById("files-title") as HTMLHeadingElement;

export function updateFileMap() {
  if (getAllowMap() && !title.style.opacity) {
    title.style.opacity = "1";
    title.style.translate = "0";
  }

  const tiles = getTiles();
  let playerTile;

  ctx.clearRect(0, 0, map.width, map.height);

  const nextIntro = Math.min(
    ...Object.values(tiles)
      .filter((t) => t.intro)
      .map((t) => t.intro!),
  );

  const occupied = new Set<string>();
  for (const tile in tiles) occupied.add(`${tiles[tile].x},${tiles[tile].y}`);

  const exposed = (tile: Tile) =>
    (Object.keys(SIDES) as (keyof typeof SIDES)[]).some((side) => {
      if (side === "down" || tile.sides.includes(side)) return false;
      const v = SIDES[side];
      return !occupied.has(`${tile.x + v.x},${tile.y - v.z}`);
    });

  for (const tile in tiles) {
    const data = tiles[tile];
    if (data.intro && data.intro !== nextIntro) continue;

    if (!map.style.visibility) map.style.visibility = "visible";

    const x = map.width / 2 + (data.x - playerX) * TILE_SIZE - TILE_SIZE / 2,
      y = map.height - TILE_SIZE * (data.y - playerY + 2);

    if (data.intro || (data.faded && exposed(data))) ctx.globalAlpha = 0.5;

    ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);

    if (data.x == playerX && data.y == playerY) playerTile = data;

    for (const side of data["sides"]) {
      ctx.beginPath();

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
        case "back":
          ctx.moveTo(x, y + TILE_SIZE);
          ctx.lineTo(x + TILE_SIZE, y + TILE_SIZE);
          break;
      }

      ctx.closePath();
      ctx.stroke();
    }

    ctx.globalAlpha = 1;
  }

  if (playerTile) {
    if (playerTile.intro || (playerTile.faded && exposed(playerTile)))
      ctx.globalAlpha = 0.5;

    ctx.beginPath();
    ctx.ellipse(
      map.width / 2,
      map.height - TILE_SIZE * 1.5,
      TILE_SIZE / 4,
      TILE_SIZE / 4,
      0,
      0,
      2 * Math.PI,
    );
    ctx.stroke();
    updateFileControls(playerTile);

    ctx.globalAlpha = 1;
  }
}
