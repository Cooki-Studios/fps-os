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
};

const FORWARD = new THREE.Vector3(0, 0, 1);
const tiles: Record<number, Tile> = {};

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
            ambientLight.intensity = 0.25;
            break;
          case 1:
            ambientLight.intensity = 0.5;
            break;
          case 2:
            ambientLight.intensity = 0.75;
            break;
          case 3:
            ambientLight.intensity = 1;
            break;
        }

        data.intro = undefined;
        light.visible = true;

        updateFileMap();
      },
      1000 + 500 * data.intro,
    );
  }

  tile.add(light);
  tile.add(light.target);

  tile.position.z = -data.y * DEPTH;
  scene.add(tile);
}
