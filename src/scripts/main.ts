import * as THREE from "three";
import { USDLoader } from "three/examples/jsm/loaders/USDLoader.js";
import { initLighting, setupShadowMaterial } from "./lighting";
import { compileRenderer, enableRenderer, initRenderer } from "./renderer";
import { addPhysicsToObject, initPhysics, togglePhysicsDebug } from "./physics";
import { initInput, onActionPressed } from "./input";
import { getPlayerMesh, initPlayer } from "./player";

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  1000,
);
camera.rotation.order = "YXZ";

initLighting(scene, camera);
const canvas = initRenderer(camera);
initPhysics(scene);
initInput();

const manager = new THREE.LoadingManager();
manager.onLoad = () => {
  for (const mesh of meshes) {
    if (mesh.name.startsWith("D_")) {
      addPhysicsToObject(mesh, true, true, false, scene);
    } else addPhysicsToObject(mesh, false, true, false, scene);
  }

  initPlayer(scene, camera, canvas);
  addPhysicsToObject(getPlayerMesh(), true, true, true, scene);

  compileRenderer(scene, camera);
  enableRenderer(scene, camera);

  console.log("Loading complete!");
};

onActionPressed("debug", () => {
  togglePhysicsDebug();
});
onActionPressed("debugPlayer", () => {
  togglePhysicsDebug(true);
});

const loader = new USDLoader(manager);
const room = await loader.loadAsync("room.usdc");

const meshes: THREE.Mesh[] = [];
room.traverse((child) => {
  if (child instanceof THREE.Mesh) {
    setupShadowMaterial(child.material);
    meshes.push(child);
  }
});

for (const mesh of meshes) {
  if (!mesh.parent) continue;

  if (mesh.name === "D_Cube_001") {
    mesh.parent.rotation.x = Math.random() * Math.PI * 2;
    mesh.parent.rotation.y = Math.random() * Math.PI * 2;
    mesh.parent.rotation.z = Math.random() * Math.PI * 2;
  }

  scene.attach(mesh.parent);

  mesh.receiveShadow = true;
  mesh.castShadow = true;
}
