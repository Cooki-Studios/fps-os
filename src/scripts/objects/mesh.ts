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
import { setSettingsPanel, setSettingsSwitch } from "./settings";
import { setHorn } from "./horn";
import { setFiles } from "./files";

const wind = await loadBuffer("windows-wind");

export const INTERACTIBLES = [
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
  "Debug",
  "DebugPlayer",
  "Speedo",
  "ChoudharyBillaHorn",
  "Files",
] as const;

export const GRABBABLES = [
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
  "ControlPanel",
  "ChoudharyBillaHorn",
  "Files",
] as const;

export const EQUIPABBLES = ["Gun"] as const;
export const SCREENS = ["Note", "Screen", "Settings"] as const;

export const ATTACHED_OBJS: Record<string, string[]> = {
  D_Cube_007: ["Cube_013"], // Bed
  D_Cube_005: ["Cube_007", "Cube_006", "Cube_008"], // Armchair
  D_Cube_003: ["Cube_002", "Cube_003", "Cube_004", "Cube_005"], // Desk
  D_Cube_002: ["Cube_009"], // Papers
  D_Light: ["Sphere", "Cylinder_0038"], // MainLight
  D_Cylinder: ["Cylinder_001"], // Bin
  D_Plane_005: [
    "Cylinder_034",
    "Cylinder_002",
    "Cylinder_035",
    "Cylinder_036",
    "Cylinder_037",
    "BezierCurve_002",
    "BezierCurve_003",
    "BezierCurve_004",
    "BezierCurve_005",
  ], // Choudhary Billa Horn
};
for (let i = 3; i < 34; i++) {
  ATTACHED_OBJS["D_Cylinder"].push(
    "Cylinder_0" + i.toString().padStart(2, "0"),
  );
}

export const PAUSED_OBJS = [
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
  ControlPanel: 2,
  Files: 3,
} as const;

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

  mesh.material.needsUpdate = true;

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
      case "ControlPanel":
        setSettingsPanel(mesh.parent, scene);
        break;
      case "Debug_004":
        setSettingsSwitch("debug", mesh.parent.parent!, undefined, true);
        break;
      case "DebugPlayer_003":
        setSettingsSwitch("debugPlayer", mesh.parent.parent!, undefined, true);
        break;
      case "Speedo_001":
        setSettingsSwitch("speedo", mesh.parent.parent!, undefined, true);
        break;
      case "ChoudharyBillaHorn":
        setHorn(mesh.parent);
        break;
      case "Files_001":
        setFiles(mesh.parent);
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
