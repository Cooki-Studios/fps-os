import { bootLog, bootFinished, createTitleScene } from "./boot";

import * as THREE from "three";
import { USDLoader } from "three/examples/jsm/loaders/USDLoader.js";
import { initLighting, setupShadowMaterial } from "./system/lighting";
import {
  compileRenderer,
  enableRenderer,
  initRenderer,
  setupSky,
} from "./system/renderer";
import {
  addPhysicsToObject,
  initPhysics,
  togglePhysicsDebug,
} from "./system/physics";
import { initInput, onActionPressed } from "./system/input";
import { getPlayerMesh, initPlayer } from "./objects/player";
import { setMainCam, setMainScene } from "./util/scene";
import { createKeypad, setDoor, setKeypad } from "./objects/keypad";
import { setupAnimation } from "./system/animation";

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
bootLog("Initialising Renderer...");
const { canvas, renderer } = initRenderer();
bootLog("Initialising sky...");
setupSky(scene, renderer);
bootLog("Initialising physics...");
initPhysics(scene);
bootLog("Initialising input...");
initInput();

async function addPhysicsToObjects() {
  for (const mesh of meshes) {
    if (mesh.parent) scene.attach(mesh.parent);

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
  bootLog(`Preparing meshes...`);
  scene.attach(room);

  room.traverse((mesh) => {
    if (mesh instanceof THREE.Mesh) {
      mesh.material.dithering = true;
      mesh.receiveShadow = true;
      mesh.castShadow = true;
      setupShadowMaterial(mesh.material);

      if (mesh.parent) {
        if (mesh.parent.name.startsWith("key_")) setKeypad(mesh.parent);

        if (mesh.parent.parent && mesh.parent.name == "Base") {
          setDoor(mesh.parent.parent);
        }
      }

      if (!mesh.name.startsWith("N_")) {
        meshes.push(mesh);
      }
    }
  });
  bootLog(`Meshes loaded`);

  setupAnimation(room, room.animations[0]);

  addPhysicsToObjects().then(async () => {
    bootLog("Compiling renderer...");
    compileRenderer(scene, camera);

    bootLog("Scene loaded");

    await bootFinished();

    // DEVMODE
    if (import.meta.env.DEV) {
      createKeypad(camera, canvas);
      enableRenderer(scene, camera);
      (
        document.querySelector("canvas[data-engine]") as HTMLCanvasElement
      ).style.pointerEvents = "auto";
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
