import { bootLog, bootFinished, createTitleScene, hideBootLog } from "./boot";

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
import { initWallpaper } from "./objects/wallpaper";
import { initMonitor, setMonitor } from "./objects/pc";
import { setupMainLight } from "./objects/mainLight";
import "./system/audio";
import { addAudioToObject, initAudio } from "./system/audio";
import { pause } from "./system/pause";
import { setBed } from "./objects/bed";
import { setClock } from "./objects/clock";

document.addEventListener(
  "wheel",
  (e) => {
    e.preventDefault();
  },
  { passive: false },
);
document.oncontextmenu = (e) => e.preventDefault();

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

loader.loadAsync("room.usdc").then((room) => {
  bootLog(`Preparing meshes...`);
  scene.attach(room);

  bootLog("Initialising wallpaper...");
  initWallpaper(room.getObjectByName("Walls"));

  room.traverse((mesh) => {
    if (mesh instanceof THREE.Mesh) {
      mesh.material.dithering = true;
      mesh.receiveShadow = true;
      mesh.castShadow = true;
      setupShadowMaterial(mesh.material);

      if (mesh.name.startsWith("N_Blind")) {
        (mesh.material as THREE.MeshPhysicalMaterial).opacity = 0.9;
        (mesh.material as THREE.MeshPhysicalMaterial).transparent = true;
      }

      if (mesh.parent) {
        if (mesh.parent.name == "PC") setMonitor(mesh.parent);
        else if (mesh.parent.name == "Bed_001") setBed(mesh.parent, true);
        else if (mesh.parent.name == "Clock_002") setClock(mesh.parent, "hour");
        else if (mesh.parent.name == "Clock_003") setClock(mesh.parent, "min");
        else if (mesh.parent.name == "Clock_004") setClock(mesh.parent, "sec");
        else if (mesh.parent.parent && mesh.parent.name == "Door")
          setDoor(mesh.parent.parent);
        else if (mesh.parent.name.startsWith("key_")) setKeypad(mesh.parent);
        else if (mesh.parent.name.startsWith("Bed_")) setBed(mesh.parent);
      }

      if (!mesh.name.startsWith("N_")) meshes.push(mesh);
    } else if (mesh instanceof THREE.PointLight) {
      if (mesh.name == "MainLight") setupMainLight(mesh, scene);
    } else
      switch (mesh.name) {
        case "Switch_003":
          addAudioToObject(mesh, "light-on");
          addAudioToObject(mesh, "light-off");
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
