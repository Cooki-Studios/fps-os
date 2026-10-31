import * as THREE from "three";
import { introDialogue } from "./dialogue";
import { playAudio } from "../system/audio";
import { getFileAmbLight, updateFileMap } from "./main";

export const SIDES = {
  down: new THREE.Vector3(0, -1, 0),
  right: new THREE.Vector3(1, 0, 0),
  left: new THREE.Vector3(-1, 0, 0),
  forward: new THREE.Vector3(0, 0, -1),
  back: new THREE.Vector3(0, 0, 1),
} as const;

export type Tile = {
  sides: (keyof typeof SIDES)[];
  x: number;
  y: number;
  intro?: number;
  faded?: boolean;
};

const FORWARD = new THREE.Vector3(0, 0, 1);
const tiles: Record<number, Tile> = {};
const tileIndex = new Map<string, Tile>(); // coordinate lookup

const key = (x: number, y: number) => `${x},${y}`;

export function getTiles() {
  return tiles;
}

let id = 0;

const WIDTH = 8,
  DEPTH = 8;

export function getTileWidth() {
  return WIDTH;
}
export function getTileHeight() {
  return DEPTH;
}

const geometry = new THREE.PlaneGeometry(WIDTH, DEPTH);
const material = new THREE.MeshStandardMaterial({ color: 0x1c0333 });

const title = document.getElementById("files-title") as HTMLHeadingElement;

export function createTile(data: Tile, scene: THREE.Scene, visited = true) {
  const tile = new THREE.Group();

  tiles[id] = data;
  id++;
  tileIndex.set(key(data.x, data.y), data);

  for (const side of ["down", ...data["sides"]]) {
    const dir = SIDES[side as keyof typeof SIDES];

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
    data.faded = true;
    light.visible = false;

    setTimeout(
      () => {
        if (!visited && data.intro == 1) {
          title.classList.add("mini");
          title.style.opacity = "0.5";
          title.style.translate = "0 -13em";

          playAudio(
            "global",
            "music/NIVIRO - The Riot [NCS Release]",
            0,
            0,
            0.25,
          );

          introDialogue();
        }

        const ambientLight = getFileAmbLight();
        switch (data.intro) {
          case 0:
            ambientLight.intensity = 0.2;
            break;
          case 1:
            ambientLight.intensity = 0.4;
            break;
          case 2:
            ambientLight.intensity = 0.6;
            break;
          case 3:
            ambientLight.intensity = 0.8;
            break;
          case 4:
            ambientLight.intensity = 1;
            break;
        }

        if (data.intro != 4) {
          data.faded = false;
          data.intro = undefined;
        }
        light.visible = true;

        updateFileMap();
      },
      1000 + 500 * data.intro,
    );
  }

  tile.add(light);
  tile.add(light.target);

  tile.position.z = -data.y * DEPTH;
  tile.position.x = data.x * WIDTH;
  scene.add(tile);
}

export function getFadedTiles(playerX: number, playerY: number, distance = 2) {
  return Object.values(tiles).filter(
    (tile) =>
      tile.faded &&
      Math.abs(tile.x - playerX) + Math.abs(tile.y - playerY) <= distance,
  );
}

export function tileExistsAt(x: number, y: number) {
  return tileIndex.has(key(x, y));
}

export function getTile(x: number, y: number) {
  return tileIndex.get(key(x, y));
}

const SIDE_KEYS = Object.keys(SIDES) as (keyof typeof SIDES)[],
  OPPOSITE = {
    left: "right",
    right: "left",
    forward: "back",
    back: "forward",
  } as const;

export function generateTile(
  playerX: number,
  playerY: number,
  scene: THREE.Scene,
) {
  const tiles = getFadedTiles(playerX, playerY);

  for (const tile of tiles) {
    tile.intro = undefined;
    tile.faded = false;
    for (const side of SIDE_KEYS) {
      if (side == "down" || tile.sides.includes(side)) continue;

      const dir = SIDES[side];
      const x = tile.x + dir.x;
      const y = tile.y - dir.z;
      if (tileExistsAt(x, y)) continue;

      createTile(
        {
          sides: (["left", "forward", "right", "back"] as const).filter(
            (s) => s != OPPOSITE[side as keyof typeof OPPOSITE],
          ),
          x,
          y,
          faded: true,
        },
        scene,
      );
    }
  }

  updateFileMap();
}
