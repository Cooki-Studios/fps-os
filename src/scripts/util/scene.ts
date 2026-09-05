import * as THREE from "three";

let scene: THREE.Scene;
let camera: THREE.PerspectiveCamera;

export function setMainScene(newScene: THREE.Scene) {
  scene = newScene;
}
export function getMainScene() {
  return scene;
}

export function setMainCam(newCam: THREE.PerspectiveCamera) {
  camera = newCam;
}
export function getMainCam() {
  return camera;
}
