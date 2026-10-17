import { bootLog, createTitleScene } from "./boot";

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
  pausePhysicsOfObject,
  togglePhysicsDebug,
} from "./system/physics";
import { initInput, isInputEnabled, onActionPressed } from "./system/input";
import { getPlayerMesh, initPlayer } from "./objects/player";
import { setMainCam, setMainScene } from "./util/scene";
import { createKeypad } from "./objects/keypad";
import { setupAnimation } from "./system/animation";
import { initWallpaper } from "./objects/wallpaper";
import { setupMainLight } from "./objects/mainLight";
import "./system/audio";
import { addAudioToObject, enableAudioEl, initAudio } from "./system/audio";
import { pause } from "./system/pause";
import { setupMesh } from "./objects/mesh";
import { initShaders } from "./system/shaders";
import { setupClock } from "./objects/clock";
import { scrollPlayer } from "./system/interact";

document.addEventListener(
  "wheel",
  (e) => {
    if (
      e.ctrlKey ||
      document.activeElement == document.body ||
      isInputEnabled()
    ) {
      e.preventDefault();
      if (isInputEnabled()) scrollPlayer(e, camera, scene);
    }
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
await initPhysics(scene);
bootLog("Initialising input...");
initInput();
bootLog("Initialising audio...");
initAudio(camera);

const ATTACHED_OBJS: Record<string, string[]> = {
  D_Cube_007: ["Cube_013", "Cube_014"], // Bed
  D_Cube_005: ["Cube_007", "Cube_006", "Cube_008"], // Armchair
  D_Cube_003: ["Cube_002", "Cube_003", "Cube_004", "Cube_005"], // Desk
  D_Cube_002: ["Cube_009"], // Papers
};
const attachedNames = new Set(Object.values(ATTACHED_OBJS).flat());

async function addPhysicsToObjects() {
  bootLog("Adding physics to objects...");
  for (const mesh of meshes) {
    if (mesh.parent) scene.attach(mesh.parent);

    if (attachedNames.has(mesh.name)) continue;

    const attachments = (ATTACHED_OBJS[mesh.name] ?? [])
      .map((name) => meshes.find((mesh) => mesh.name === name))
      .filter((mesh): mesh is THREE.Mesh => !!mesh);

    if (mesh.name.startsWith("D_")) {
      addPhysicsToObject(mesh, true, true, false, attachments);
    } else addPhysicsToObject(mesh, false, true, false, attachments);

    setTimeout(() => {
      if (
        [
          "D_Cylinder_002",
          "D_Plane_001",
          "D_Plane_003",
          "D_Plane_004",
        ].includes(mesh.name)
      )
        pausePhysicsOfObject(mesh, mesh.userData.body);
    });
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
  initWallpaper(room.getObjectByName("Walls")!);

  room.traverse(async (mesh) => {
    if (mesh instanceof THREE.Mesh) {
      setupMesh(mesh, meshes, scene, canvas);
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
  setupClock();
  bootLog(`Meshes loaded`);

  setupAnimation(room, room.animations[0], "DoorGroup");
  setupAnimation(room, room.animations[0], "Switch", 1 / 6);
  setupAnimation(room, room.animations[0], "Blind2", 0.5);
  setupAnimation(room, room.animations[0], "Blind3", 0.5);
  setupAnimation(room, room.animations[0], "Blind4", 0.5);
  setupAnimation(room, room.animations[0], "Blind5", 0.5);
  setupAnimation(room, room.animations[0], "Bed_003", 0.25);

  addPhysicsToObjects().then(async () => {
    bootLog("Compiling renderer...");
    compileRenderer(scene, camera);

    bootLog("Scene loaded");

    if (sessionStorage.getItem("booted")) {
      createKeypad(camera, canvas);
      initShaders(renderer, scene, camera);
      enableRenderer(scene, camera);
      enableAudioEl();
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
