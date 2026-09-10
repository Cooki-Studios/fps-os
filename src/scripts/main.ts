import { bootLog, bootFinished, createTitleScene } from "./boot";

import * as THREE from "three";
import { USDLoader } from "three/examples/jsm/loaders/USDLoader.js";
import { initLighting, setupShadowMaterial } from "./system/lighting";
import {
  compileRenderer,
  enableRenderer,
  initRenderer,
} from "./system/renderer";
import {
  addPhysicsToObject,
  initPhysics,
  togglePhysicsDebug,
} from "./system/physics";
import { initInput, onActionPressed } from "./system/input";
import { getPlayerMesh, initPlayer } from "./objects/player";
import { setMainCam, setMainScene } from "./util/scene";
import { createKeypad, keypadButtons, setDoor } from "./objects/keypad";

document.addEventListener(
  "wheel",
  (e) => {
    e.preventDefault();
  },
  { passive: false },
);

const scene = new THREE.Scene();
setMainScene(scene);

bootLog("Scene created");

const textureLoader = new THREE.TextureLoader();
const envMap = await textureLoader.loadAsync(
  "textures/IndoorEnvironmentHDRI001_1K_TONEMAPPED.jpg",
);
envMap.mapping = THREE.EquirectangularReflectionMapping;
envMap.colorSpace = THREE.SRGBColorSpace;
scene.environment = envMap;

bootLog("HDRI loaded");

const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  1000,
);
camera.rotation.order = "YXZ";
setMainCam(camera);

bootLog("Camera created");

bootLog("Initialising lighting...");
initLighting(scene, camera);
const canvas = initRenderer();
bootLog("Initialising physics...");
initPhysics(scene);
bootLog("Initialising input...");
initInput();

async function addPhysicsToObjects() {
  for (const mesh of meshes) {
    if (mesh.name.startsWith("N_")) continue;
    if (mesh.name.startsWith("D_")) {
      addPhysicsToObject(mesh, true, true, false);
    } else addPhysicsToObject(mesh, false, true, false);
  }

  bootLog("Initialising player...");
  initPlayer(scene, camera);
  addPhysicsToObject(getPlayerMesh(), true, true, true);
}

bootLog("Loading scene...");
const manager = new THREE.LoadingManager();

const loader = new USDLoader(manager),
  meshes: THREE.Mesh[] = [];

const spinner = document.getElementById("spinner") as HTMLDivElement;

loader.loadAsync("room.usdc").then((room) => {
  bootLog(`Preparing material for meshs`);
  room.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      child.material.dithering = true;
      setupShadowMaterial(child.material);
      meshes.push(child);
    }
  });
  bootLog(`Prepared material for meshes`);

  for (const mesh of meshes) {
    if (!mesh.parent) continue;

    if (mesh.name == "N_button") {
      keypadButtons[Number(mesh.parent.name.split("_")[2])] = mesh;
    }
    if (mesh.name == "Base") setDoor(mesh);

    scene.attach(mesh.parent);

    mesh.receiveShadow = true;
    mesh.castShadow = true;
  }
  bootLog(`Meshes loaded`);

  addPhysicsToObjects().then(async () => {
    bootLog("Compiling renderer...");
    compileRenderer(scene, camera);

    bootLog("Scene loaded");

    await bootFinished();

    if (import.meta.env.DEV) {
      createKeypad(scene, camera, canvas);
      enableRenderer(scene, camera);
      document.getElementsByTagName("canvas")[0].style.pointerEvents = "auto";
      return;
    }

    // https://stackoverflow.com/a/37764963
    await new Promise((f) => setTimeout(f, 250));

    const { titleScene, titleCamera, titleTitle } = await createTitleScene();

    setTimeout(() => {
      spinner.style.animation =
        "spin 1s linear infinite, resize 2s ease-in infinite";
      spinner.style.opacity = "1";
    }, 200);

    enableRenderer(titleScene, titleCamera, titleTitle);
  });
});

onActionPressed("debug", () => {
  togglePhysicsDebug();
  document.dispatchEvent(new CustomEvent("toggleDebug"));
});
onActionPressed("debugPlayer", () => {
  togglePhysicsDebug(true);
});
