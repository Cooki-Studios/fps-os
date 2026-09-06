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
import { TextGeometry } from "three/examples/jsm/geometries/TextGeometry.js";
import { font } from "./util/fonts";
import { SUBTRACTION, Brush, Evaluator } from "three-bvh-csg";

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
      addPhysicsToObject(mesh, true, true, false, scene);
    } else addPhysicsToObject(mesh, false, true, false, scene);
  }

  bootLog("Initialising player...");
  initPlayer(scene, camera, canvas);
  addPhysicsToObject(getPlayerMesh(), true, true, true, scene);
}

bootLog("Loading scene...");
const manager = new THREE.LoadingManager();

const loader = new USDLoader(manager),
  meshes: THREE.Mesh[] = [],
  keypadButtons: THREE.Mesh[] = [];

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

    if (mesh.name === "D_Cube_001") {
      mesh.parent.rotation.x = Math.random() * Math.PI * 2;
      mesh.parent.rotation.y = Math.random() * Math.PI * 2;
      mesh.parent.rotation.z = Math.random() * Math.PI * 2;
    }

    if (mesh.name == "N_button") {
      keypadButtons[Number(mesh.parent.name.split("_")[2])] = mesh;
    }

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

    // if (import.meta.env.DEV) {
    //   createKeypad();
    //   enableRenderer(scene, camera);
    //   document.getElementsByTagName("canvas")[0].style.pointerEvents = "auto";
    //   return;
    // }

    // https://stackoverflow.com/a/37764963
    await new Promise((f) => setTimeout(f, 250));

    const { titleScene, titleCamera, titleTitle } = await createTitleScene();
    enableRenderer(titleScene, titleCamera, titleTitle);
  });
});

onActionPressed("debug", () => {
  togglePhysicsDebug();
});
onActionPressed("debugPlayer", () => {
  togglePhysicsDebug(true);
});

document.addEventListener("createKeypad", createKeypad);
function createKeypad() {
  const mesh = scene.getObjectByName("N_Keypad");
  if (!mesh || !mesh.parent) return;
  bootLog("Creating keypad...");

  const symbols = "123456789*0C";

  const buttonGroup = new THREE.Group();
  buttonGroup.rotation.x = Math.PI / 2;
  buttonGroup.position.y -= 1;
  buttonGroup.position.z -= 3.5;

  for (let i = 0; i < symbols.length; i++) {
    const geometry = new TextGeometry(symbols[i], {
      font: font,
      size: 1,
      depth: 0.8,
      curveSegments: ["0", "6", "9", "C"].includes(symbols[i]) ? 2 : 1,
    });

    const num = new THREE.Mesh(geometry);
    const button = keypadButtons[i];
    const material = button.material;

    const box = new THREE.Box3().setFromObject(num);
    const center = new THREE.Vector3();
    box.getCenter(center);

    const brush1 = new Brush(button.geometry);
    brush1.matrix.copy(button.parent!.matrix);
    brush1.matrix.decompose(brush1.position, brush1.quaternion, brush1.scale);
    brush1.updateMatrixWorld(true);

    const brush2 = new Brush(num.geometry);
    brush2.matrix.copy(button.parent!.matrix);
    brush2.matrix.decompose(brush2.position, brush2.quaternion, brush2.scale);

    brush2.position.x -= center.x * 0.065;
    brush2.position.y -= center.y * 0.075;

    brush2.updateMatrixWorld(true);

    brush1.material = material;
    brush2.material = new THREE.MeshStandardMaterial({ color: 0x080808 });

    const evaluator = new Evaluator();
    const result = evaluator.evaluate(brush1, brush2, SUBTRACTION);

    button.removeFromParent();
    buttonGroup.add(result);

    delete keypadButtons[i];
  }

  mesh.parent.add(buttonGroup);
}
