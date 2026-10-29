import * as THREE from "three";
import { setupShadowMaterial } from "../system/lighting";
import { setBed } from "./bed";
import { setClock } from "./clock";
import { setKeyLight, setDoor, setKeypad } from "./keypad";
import { setMonitor } from "./pc";
import { addAudioToObject, loadBuffer } from "../system/audio";
import { setNotepad } from "./notepad";
import { setClipboard } from "./clipboard";
import { setGun } from "./gun";

const wind = await loadBuffer("windows-wind");

export const INTERACTIBLES: string[] = [
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
  "Gun",
] as const;
export const GRABBABLES: string[] = [
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
  "Rug",
  "PapersPlease",
] as const;

export const EQUIPABBLES = ["Gun"] as const;

export const ATTACHED_OBJS: Record<string, string[]> = {
  D_Cube_007: ["Cube_013"], // Bed
  D_Cube_005: ["Cube_007", "Cube_006", "Cube_008"], // Armchair
  D_Cube_003: ["Cube_002", "Cube_003", "Cube_004", "Cube_005"], // Desk
  D_Cube_002: ["Cube_009"], // Papers
  D_Light: ["Sphere", "N_Cylinder_001"], // MainLight
  D_Cylinder: ["Cylinder_001"], // Bin
  D_Cube_008: ["Cube_010", "Cube_011", "Cube_012", "Cube_014"], // Desk 2
};
for (let i = 3; i < 34; i++) {
  ATTACHED_OBJS["D_Cylinder"].push(
    "Cylinder_0" + i.toString().padStart(2, "0"),
  );
}

export const PAUSED_OBJS: string[] = [
  "D_Cylinder_002",
  "D_Plane_001",
  "D_Plane_003",
  "D_Plane_004",
  "D_Light",
] as const;

export const MASSES: Record<string, number> = {
  default: 1,
  Shelf: 2,
  Bed: 4,
  Armchair: 2,
  Desktop: 2,
  PC: 2,
  Keyboard: 0.5,
  Poster: 1.5,
  Light: 0.25,
  Rug: 0.1,
};

export async function setupMesh(
  mesh: THREE.Mesh<any, THREE.MeshPhysicalMaterial, any>,
  meshes: THREE.Mesh[],
  scene: THREE.Scene,
  canvas: HTMLCanvasElement,
  camera: THREE.PerspectiveCamera,
) {
  mesh.material.dithering = true;
  mesh.receiveShadow = true;

  if (mesh.name != "D_Plane_002") {
    mesh.castShadow = true;

    mesh.material.needsUpdate = true;

    setupShadowMaterial(mesh.material);

    if (mesh.name.startsWith("N_foliage") || mesh.name.startsWith("N_hedge")) {
      mesh.material.depthWrite = false;
    } else if (mesh.name.startsWith("N_Blind")) {
      mesh.material.opacity = 0.9;
      mesh.material.transparent = true;
    }
  } else {
    mesh.material.polygonOffset = true;
    mesh.material.polygonOffsetFactor = -1;
    mesh.material.polygonOffsetUnits = -1;
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
        break;
      case "Clipboard":
        setClipboard(mesh.parent.clone(), camera);
        mesh.parent.remove(mesh);
        break;
      case "Gun":
        setGun(mesh.parent);
        break;
    }

    if (mesh.parent)
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
