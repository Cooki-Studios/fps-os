import * as THREE from "three";
import { setupShadowMaterial } from "../system/lighting";
import { setBed } from "./bed";
import { setClock } from "./clock";
import { setKeyLight, setDoor, setKeypad } from "./keypad";
import { setMonitor } from "./pc";
import { addAudioToObject, loadBuffer } from "../system/audio";
import { setNotepad } from "./notepad";

const wind = await loadBuffer("windows-wind");

export const interactibles = [
  "Switch",
  "Door",
  "PC",
  "Screen",
  "Note",
  "Bed",
  "Blind2",
  "Blind2_001",
  "Blind3",
  "Blind3_001",
  "Blind4",
  "Blind4_001",
  "Blind5",
  "Blind5_001",
];
export const grabbables = [
  "Pillow",
  "Note",
  "Screen",
  "Clock",
  "Bin",
  "Shelf",
  "Keyboard",
  "PC",
  "Poster",
  "Desktop",
  "Light",
  "Bed",
  "Armchair",
];

export const masses: Record<string, number> = {
  default: 10,
  Shelf: 20,
  Bin: 5,
  Clock: 2,
};

export async function setupMesh(
  mesh: THREE.Mesh<any, THREE.MeshPhysicalMaterial, any>,
  meshes: THREE.Mesh[],
  scene: THREE.Scene,
  canvas: HTMLCanvasElement,
) {
  mesh.material.dithering = true;
  mesh.receiveShadow = true;
  mesh.castShadow = true;
  setupShadowMaterial(mesh.material);

  if (mesh.name == "D_Plane_002") {
    mesh.material.side = THREE.DoubleSide;
  } else if (mesh.name.startsWith("N_Blind")) {
    mesh.material.opacity = 0.9;
    mesh.material.transparent = true;
  }

  if (mesh.parent) {
    switch (mesh.parent.name) {
      case "PC":
        setMonitor(mesh.parent);
        break;
      case "Bed_001":
        setBed(mesh.parent, true);
        break;
      case "Clock_001":
        setClock(mesh.parent, "base");
        break;
      case "Hand":
        setClock(mesh.parent, "hour");
        break;
      case "Hand_001":
        setClock(mesh.parent, "min");
        break;
      case "Hand_002":
        setClock(mesh.parent, "sec");
        break;
      case "KeyLight":
        setKeyLight(mesh);
        break;
      case "Papers":
        setNotepad(mesh, scene, canvas);
    }

    if (mesh.parent.parent && mesh.parent.name == "Door")
      setDoor(mesh.parent.parent);
    else if (mesh.parent.name.startsWith("key_")) setKeypad(mesh.parent);
    else if (mesh.parent.name.startsWith("Bed_")) setBed(mesh.parent);
    else if (mesh.parent.name.startsWith("Blind")) {
      await addAudioToObject(
        mesh.parent,
        "windows-wind",
        1,
        true,
        1,
        undefined,
        wind,
      );
      await addAudioToObject(mesh.parent, "blind-down");
      await addAudioToObject(mesh.parent, "blind-up");
    }
  }

  if (!mesh.name.startsWith("N_")) meshes.push(mesh);
}
