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
import { getPlayerMesh, initPlayer } from "./player";
import { setMainCam, setMainScene } from "./util/scene";

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
const canvas = initRenderer();
bootLog("Initialising physics...");
initPhysics(scene);
bootLog("Initialising input...");
initInput();

async function addPhysicsToObjects() {
  for (const mesh of meshes) {
    if (mesh.name.startsWith("D_")) {
      addPhysicsToObject(mesh, true, true, false, scene);
    } else addPhysicsToObject(mesh, false, true, false, scene);
  }

  bootLog("Initialising player...");
  initPlayer(scene, camera, canvas);
  addPhysicsToObject(getPlayerMesh(), true, true, true, scene);
}

bootLog("Loading scene...");
const manager = new THREE.LoadingManager();
manager.onLoad = async () => {
  addPhysicsToObjects().then(async () => {
    bootLog("Compiling renderer...");
    compileRenderer(scene, camera);

    bootLog("Scene loaded");

    await bootFinished();

    // https://stackoverflow.com/a/37764963
    await new Promise((f) => setTimeout(f, 250));
    // enableRenderer(scene, camera);

    const { titleScene, titleCamera, titleTitle } = await createTitleScene();
    enableRenderer(titleScene, titleCamera, titleTitle);
  });
};

onActionPressed("debug", () => {
  togglePhysicsDebug();
});
onActionPressed("debugPlayer", () => {
  togglePhysicsDebug(true);
});

const loader = new USDLoader(manager),
  room = await loader.loadAsync("room.usdc"),
  meshes: THREE.Mesh[] = [];

room.traverse((child) => {
  if (child instanceof THREE.Mesh) {
    bootLog(`Preparing material for mesh: ${child.name}...`);
    child.material.dithering = true;
    setupShadowMaterial(child.material);
    meshes.push(child);
    bootLog(`Prepared material for ${child.name}`);
  }
});

for (const mesh of meshes) {
  if (!mesh.parent) continue;
  bootLog(`Loading mesh: ${mesh.name}...`);

  if (mesh.name === "D_Cube_001") {
    mesh.parent.rotation.x = Math.random() * Math.PI * 2;
    mesh.parent.rotation.y = Math.random() * Math.PI * 2;
    mesh.parent.rotation.z = Math.random() * Math.PI * 2;
  }

  scene.attach(mesh.parent);

  mesh.receiveShadow = true;
  mesh.castShadow = true;

  bootLog(`${mesh.name} loaded`);
}
