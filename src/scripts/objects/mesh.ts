import * as THREE from "three";
import { setupShadowMaterial } from "../system/lighting";
import { addAudioToObject, playAudio } from "../system/audio";
import { setBed } from "./bed";
import { setClock } from "./clock";
import { setKeyLight, setDoor, setKeypad } from "./keypad";
import { setMonitor } from "./pc";

export function setupMesh(
  mesh: THREE.Mesh<any, any, any>,
  meshes: THREE.Mesh[],
) {
  mesh.material.dithering = true;
  mesh.receiveShadow = true;
  mesh.castShadow = true;
  setupShadowMaterial(mesh.material);

  if (mesh.name.startsWith("N_Blind")) {
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
      case "Clock_002":
        setClock(mesh.parent, "hour");
        break;
      case "Clock_003":
        setClock(mesh.parent, "min");
        break;
      case "Clock_004":
        setClock(mesh.parent, "sec");
        break;
      case "Blind2":
        addAudioToObject(mesh.parent, "windows-wind", 5, true);
        playAudio(mesh.parent.name, "windows-wind");
        break;
      case "Blind3":
        addAudioToObject(mesh.parent, "windows-wind", 5, true);
        playAudio(mesh.parent.name, "windows-wind");
        break;
      case "Blind4":
        addAudioToObject(mesh.parent, "windows-wind", 5, true);
        playAudio(mesh.parent.name, "windows-wind");
        break;
      case "Blind5":
        addAudioToObject(mesh.parent, "windows-wind", 5, true);
        playAudio(mesh.parent.name, "windows-wind");
        break;
      case "KeyLight":
        setKeyLight(mesh);
        break;
    }

    if (mesh.parent.parent && mesh.parent.name == "Door")
      setDoor(mesh.parent.parent);
    else if (mesh.parent.name.startsWith("key_")) setKeypad(mesh.parent);
    else if (mesh.parent.name.startsWith("Bed_")) setBed(mesh.parent);
  }

  if (!mesh.name.startsWith("N_")) meshes.push(mesh);
}
