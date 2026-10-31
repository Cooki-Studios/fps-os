import * as THREE from "three";
import { setFilesRenderer } from "../system/renderer";

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

const WIDTH = 8,
  HEIGHT = 8,
  FOG_NEAR = HEIGHT * 1.5,
  FOG_FAR = HEIGHT * 2.5;

camera.position.z = HEIGHT / 2;
scene.fog = new THREE.Fog(bg, FOG_NEAR, FOG_FAR);

const geometry = new THREE.PlaneGeometry(WIDTH, HEIGHT);
const material = new THREE.MeshStandardMaterial({ color: 0x1c0333 });

const SIDES = {
  down: new THREE.Vector3(0, -1, 0),
  right: new THREE.Vector3(1, 0, 0),
  left: new THREE.Vector3(-1, 0, 0),
  forward: new THREE.Vector3(0, 0, -1),
} as const;

type Tile = {
  sides: (keyof typeof SIDES)[];
  x: number;
  y: number;
  intro?: number;
};

const FORWARD = new THREE.Vector3(0, 0, 1);
const tiles: Record<number, Tile> = {};

let id = 0,
  playerX = 0,
  playerY = 0;

function createTile(data: Tile) {
  const tile = new THREE.Group();

  tiles[id] = data;
  id++;

  for (const side of data["sides"]) {
    const dir = SIDES[side];

    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = side;
    mesh.position.copy(dir).multiplyScalar(WIDTH / 2);
    mesh.quaternion.setFromUnitVectors(FORWARD, dir.clone().negate());

    if (side == "left" || side == "right") {
      mesh.rotateZ(Math.PI / 2);
      mesh.scale.x = 2;
      mesh.position.y += WIDTH / 2;
    } else if (side == "forward") {
      mesh.scale.y = 2;
      mesh.position.y += WIDTH / 2;
    }

    tile.add(mesh);
  }

  const light = new THREE.SpotLight(0xffffff, 100, 100, Math.PI / 4);
  light.position.set(0, 10, 0);

  if (data.intro) {
    light.visible = false;
    setTimeout(
      () => {
        data.intro = undefined;
        light.visible = true;
        updateFileMap();
      },
      1000 + 500 * data.intro,
    );
  }

  tile.add(light);
  tile.add(light.target);

  tile.position.z = -data.y * HEIGHT;
  scene.add(tile);
}

const qualityEl = document.getElementById("quality-label") as HTMLDivElement;

const map = document.getElementById("map") as HTMLCanvasElement;
const ctx = map.getContext("2d") as CanvasRenderingContext2D;
ctx.lineWidth = 2;

export function switchToFiles() {
  createTile({ sides: ["down", "right", "left"], x: 0, y: 0, intro: 1 });
  createTile({
    sides: ["down", "right", "left"],
    x: 0,
    y: 1,
    intro: 2,
  });
  createTile({
    sides: ["down", "right", "left", "forward"],
    x: 0,
    y: 2,
    intro: 3,
  });

  setFilesRenderer(scene, camera);
  qualityEl.style.visibility = "hidden";
}

const TILE_SIZE = 32;

ctx.fillStyle = "#1c0333";
ctx.strokeStyle = "white";

export function updateFileMap() {
  for (const tile in tiles) {
    const data = tiles[tile];
    if (data.intro) continue;

    if (map.style.visibility != "visible") map.style.visibility = "visible";

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
