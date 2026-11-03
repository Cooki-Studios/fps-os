import * as THREE from "three";
import { introDialogue } from "./dialogue";
import { playAudio } from "../system/audio";
import { getFileAmbLight } from "./main";
import { updateFileMap } from "./map";
import { initNote } from "../objects/notepad";
import { getMainCanvas } from "../system/renderer";
import zalgo from "@favware/zalgo";

const docs = import.meta.glob("./docs/*.md", {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;

export const SIDES = {
  down: new THREE.Vector3(0, -1, 0),
  right: new THREE.Vector3(1, 0, 0),
  left: new THREE.Vector3(-1, 0, 0),
  forward: new THREE.Vector3(0, 0, -1),
  back: new THREE.Vector3(0, 0, 1),
} as const;

export const OPPOSITE = {
  left: "right",
  right: "left",
  forward: "back",
  back: "forward",
} as const;

export type Side = keyof typeof SIDES;

export const SIDES_ARR = Object.keys(SIDES) as Side[];

export type TileType = "Document" | "Folder";

export type Tile = {
  sides: Side[];
  x: number;
  y: number;
  intro?: number;
  faded?: boolean;
  start?: boolean;
  canMove?: boolean;
  type?: TileType;
  data?: string;
  obj?: THREE.Object3D;
};

export function generateTile(
  playerX: number,
  playerY: number,
  scene: THREE.Scene,
) {
  const tiles = getFadedTiles(playerX, playerY);

  for (const tile of tiles) {
    tile.intro = undefined;
    tile.faded = false;

    for (const side of SIDES_ARR) {
      if (side == "down" || tile.sides.includes(side)) continue;

      const dir = SIDES[side];
      const x = tile.x + dir.x;
      const y = tile.y - dir.z;
      if (tileExistsAt(x, y)) continue;

      const candidates = (
        ["left", "forward", "right", "back"] as Side[]
      ).filter((s) => s != OPPOSITE[side]);
      const open = candidates[Math.floor(Math.random() * candidates.length)];

      const sides = candidates.filter((s) => s != open && Math.random() < 0.35);

      const newTile: Tile = {
        sides,
        x,
        y,
        faded: true,
      };

      if (Math.random() < 0.05) newTile.type = "Document";

      createTile(newTile, scene);
    }
  }

  updateFileMap();
}

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
const material = new THREE.MeshStandardMaterial({
  color: 0x1c0333,
  side: THREE.DoubleSide,
});

const title = document.getElementById("files-title") as HTMLHeadingElement;

export function createTile(data: Tile, scene: THREE.Scene, visited = true) {
  const tile = new THREE.Group();

  tiles[id] = data;
  id++;
  tileIndex.set(key(data.x, data.y), data);

  for (const side of ["down", ...data["sides"]]) {
    const dir = SIDES[side as Side];

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

  if (data.intro) {
    const light = new THREE.SpotLight(0xffffff, 100, 100, Math.PI / 4);
    light.position.set(0, 10, 0);
    tile.add(light);
    tile.add(light.target);

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
            data.type = "Folder";
            break;
          case 2:
            ambientLight.intensity = 0.6;
            break;
          case 3:
            ambientLight.intensity = 0.8;
            break;
          case 4:
            ambientLight.intensity = 2;
            const dirLight = new THREE.DirectionalLight(0xffffff, 2);
            dirLight.position.set(1, 2, 1);
            scene.add(dirLight);
            break;
        }

        if (data.intro != 4) {
          data.faded = false;
          data.intro = undefined;
          data.start = true;
        } else getTile(0, 0)!.canMove = true;
        light.visible = true;

        updateFileMap();
      },
      1000 + 500 * data.intro,
    );
  }

  tile.position.z = -data.y * DEPTH;
  tile.position.x = data.x * WIDTH;
  scene.add(tile);

  let content = docs[`./docs/${Math.floor(Math.random() * 8)}.md`];
  if (Math.random() < 0.3)
    content = content
      .split("\n")
      .map((line) =>
        line.trim() && !/^(\s*[#>\-*]|```)/.test(line) && Math.random() < 0.3
          ? zalgo(line)
          : line,
      )
      .join("\n");

  data.data = content;

  if (data.type == "Document")
    data.obj = initNote(
      scene,
      getMainCanvas(),
      true,
      content,
      tile.position.clone().add(new THREE.Vector3(0, 0.2, 2)),
      new THREE.Quaternion(),
    );
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
