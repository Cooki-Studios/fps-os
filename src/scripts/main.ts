import { bootLog, bootFinished, createTitleScene, hideBootLog } from "./boot";

import * as THREE from "three";
import { USDLoader } from "three/examples/jsm/loaders/USDLoader.js";
import { initLighting } from "./system/lighting";
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
import { createKeypad } from "./objects/keypad";
import { setupAnimation } from "./system/animation";
import { initWallpaper } from "./objects/wallpaper";
import { initMonitor } from "./objects/pc";
import { setupMainLight } from "./objects/mainLight";
import "./system/audio";
import { addAudioToObject, initAudio } from "./system/audio";
import { pause } from "./system/pause";
import { setupMesh } from "./objects/mesh";
import { initShaders } from "./system/shaders";

document.addEventListener(
  "wheel",
  (e) => {
    e.preventDefault();
  },
  { passive: false },
);
document.oncontextmenu = (e) => e.preventDefault();

window.onpagehide = () => (document.body.style.opacity = "0");

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
bootLog("Initialising renderer...");
const { canvas, renderer } = initRenderer();
bootLog("Initialising sky...");
setupSky(scene, renderer);
bootLog("Initialising physics...");
initPhysics(scene);
bootLog("Initialising input...");
initInput();
bootLog("Initialising audio...");
initAudio(camera);

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

loader.loadAsync("room.usdc").then(async (room) => {
  bootLog(`Preparing meshes...`);
  scene.attach(room);

  bootLog("Initialising wallpaper...");
  initWallpaper(room.getObjectByName("Walls"));

  room.traverse(async (mesh) => {
    if (mesh instanceof THREE.Mesh) {
      setupMesh(mesh, meshes);
    } else if (mesh instanceof THREE.PointLight) {
      if (mesh.name == "MainLight") setupMainLight(mesh, scene);
    } else
      switch (mesh.name) {
        case "Switch_003":
          await addAudioToObject(mesh, "light-on");
          await addAudioToObject(mesh, "light-off");
          break;
      }
  });
  bootLog(`Meshes loaded`);

  setupAnimation(room, room.animations[0], "DoorGroup");
  setupAnimation(room, room.animations[0], "Switch", 1 / 6);
  setupAnimation(room, room.animations[0], "Blind2", 0.5);
  setupAnimation(room, room.animations[0], "Blind3", 0.5);
  setupAnimation(room, room.animations[0], "Blind4", 0.5);
  setupAnimation(room, room.animations[0], "Blind5", 0.5);
  setupAnimation(room, room.animations[0], "Bed_003", 0.25);

  initMonitor(scene);

  addPhysicsToObjects().then(async () => {
    bootLog("Compiling renderer...");
    compileRenderer(scene, camera);

    bootLog("Scene loaded");

    await bootFinished();

    if (localStorage.getItem("booted")) {
      createKeypad(camera, canvas);
      initShaders(renderer, scene, camera);
      enableRenderer(scene, camera);
      hideBootLog();
      (
        document.querySelector("canvas[data-engine]") as HTMLCanvasElement
      ).style.pointerEvents = "auto";
      return;
    }

    pause(250);

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
});
onActionPressed("debugPlayer", () => {
  togglePhysicsDebug(true);
});
