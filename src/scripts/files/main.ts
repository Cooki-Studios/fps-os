import * as THREE from "three";
import { setFilesRenderer } from "../system/renderer";

const scene = new THREE.Scene();
const bg = 0x151515;
scene.background = new THREE.Color(bg);

const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  1000,
);
camera.rotation.order = "YXZ";
scene.add(camera);

const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
directionalLight.position.set(5, 5, 5);
scene.add(directionalLight);

const WIDTH = 8,
  HEIGHT = 8;

camera.position.z = HEIGHT / 2;
scene.fog = new THREE.Fog(bg, HEIGHT / 1.2, HEIGHT * 1.2);

const geometry = new THREE.PlaneGeometry(WIDTH, HEIGHT);
const material = new THREE.MeshStandardMaterial({ color: 0x1c0333 });

const SIDES = {
  // up: new THREE.Vector3(0, 1, 0),
  down: new THREE.Vector3(0, -1, 0),
  right: new THREE.Vector3(1, 0, 0),
  left: new THREE.Vector3(-1, 0, 0),
} as const;

const FORWARD = new THREE.Vector3(0, 0, 1);

for (const [name, dir] of Object.entries(SIDES)) {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = name;
  mesh.position.copy(dir).multiplyScalar(WIDTH / 2);
  mesh.quaternion.setFromUnitVectors(FORWARD, dir.negate());

  if (name === "left" || name === "right") {
    mesh.rotateZ(Math.PI / 2);
    mesh.scale.x = 2;
    mesh.position.y += WIDTH / 2;
  }

  scene.add(mesh);
}

const qualityEl = document.getElementById("quality-label") as HTMLDivElement;

export function switchToFiles() {
  setFilesRenderer(scene, camera);
  qualityEl.style.visibility = "hidden";
}
