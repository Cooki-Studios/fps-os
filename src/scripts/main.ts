import { bootLog } from "./boot";

import * as THREE from "three";
import { USDLoader } from "three/examples/jsm/loaders/USDLoader.js";
import { initLighting } from "./system/lighting";
import { compileRenderer, initRenderer, setupSky } from "./system/renderer";
import {
  addPhysicsToObject,
  initPhysics,
  pausePhysicsOfObject,
  togglePhysicsDebug,
} from "./system/physics";
import { initInput, isInputEnabled, onActionPressed } from "./system/input";
import { getPlayerMesh, initPlayer } from "./objects/player";
import { setMainCam, setMainScene } from "./util/scene";
import { setupAnimation } from "./system/animation";
import { initWallpaper } from "./objects/wallpaper";
import { setupMainLight } from "./objects/mainLight";
import "./system/audio";
import { addAudioToObject, initAudio } from "./system/audio";
import { ATTACHED_OBJS, PAUSED_OBJS, setupMesh } from "./objects/mesh";
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
initLighting(scene);
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

const attachedNames = new Set(Object.values(ATTACHED_OBJS).flat());

async function addPhysicsToObjects() {
  bootLog("Adding physics to objects...");
  for (const mesh of meshes) {
    if (mesh.parent) scene.attach(mesh.parent);

    if (attachedNames.has(mesh.name)) continue;

    const attachments = (ATTACHED_OBJS[mesh.name] ?? [])
      .map((name) => meshes.find((mesh) => mesh.name === name))
      .filter((mesh): mesh is THREE.Mesh => !!mesh);

    if (mesh.name.startsWith("D_"))
      addPhysicsToObject(mesh, true, true, false, attachments);
    else addPhysicsToObject(mesh, false, true, false, attachments);

    setTimeout(() => {
      if (PAUSED_OBJS.includes(mesh.name)) {
        mesh.userData.startPaused = true;
        pausePhysicsOfObject(mesh, mesh.userData.body);
      }
    });
  }

  bootLog("Initialising player...");
  initPlayer(scene, camera, canvas);
  addPhysicsToObject(getPlayerMesh(), true, true, true);
}

bootLog("Loading scene...");
const manager = new THREE.LoadingManager();

const loader = new USDLoader(manager),
  meshes: THREE.Mesh[] = [];

loader.loadAsync("room.usdc").then(async (room) => {
  bootLog(`Preparing meshes...`);
  scene.attach(room);

  bootLog("Initialising wallpaper...");
  initWallpaper(room.getObjectByName("Walls")!);

  room.traverse(async (mesh) => {
    if (mesh instanceof THREE.Mesh) {
      setupMesh(mesh, meshes, scene, canvas, camera);
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

  addPhysicsToObjects().then(async () => {
    const clip = room.animations[0];
    setupAnimation(room, clip, "DoorGroup");
    setupAnimation(room, clip, "Switch", 1 / 6);
    setupAnimation(room, clip, "Blind2", 0.5);
    setupAnimation(room, clip, "Blind3", 0.5);
    setupAnimation(room, clip, "Blind4", 0.5);
    setupAnimation(room, clip, "Blind5", 0.5);
    setupAnimation(scene, clip, "Bed_003", 0.25);

    bootLog("Compiling renderer...");
    compileRenderer(scene, camera);
    bootLog("Scene loaded");
  });
});

onActionPressed("debug", () => {
  togglePhysicsDebug();
});
onActionPressed("debugPlayer", () => {
  togglePhysicsDebug(true);
});
