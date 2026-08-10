import * as THREE from "three";
import { USDLoader } from "three/examples/jsm/loaders/USDLoader.js";
import { initLighting } from "./lighting";
import { compileRenderer, enableRenderer, initRenderer } from "./renderer";
import { addPhysicsToObject, initPhysics, togglePhysicsDebug } from "./physics";
import { initInput, onActionPressed } from "./input";
import { HDRLoader } from "three/examples/jsm/loaders/HDRLoader.js";
import { getPlayerMesh, initPlayer } from "./player";

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  1000,
);
camera.rotation.order = "YXZ";

initLighting(scene);
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
  addPhysicsToObject(getPlayerMesh(), true, false, true, scene);

  compileRenderer(scene, camera);
  enableRenderer(scene, camera);

  console.log("Loading complete!");
};

onActionPressed("debug", () => {
  togglePhysicsDebug();
});

const loader = new USDLoader(manager);
const room = await loader.loadAsync("room.usdc");
const hdrLoader = new HDRLoader(manager);

const meshes: THREE.Mesh[] = [];
room.traverse((child) => {
  if (child instanceof THREE.Mesh) {
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

  if (mesh.name.startsWith("D_")) {
    mesh.castShadow = true;
  } else {
    hdrLoader
      .loadAsync(`/fps-os/textures/${mesh.name}_Baked.hdr`)
      .then((tex) => {
        const mat = Array.isArray(mesh.material)
          ? (mesh.material[0] as THREE.MeshPhysicalMaterial)
          : (mesh.material as THREE.MeshPhysicalMaterial);

        if (mat && "aoMap" in mat) {
          mat.aoMap = tex;
          mat.needsUpdate = true;
        }
      });
  }
}
