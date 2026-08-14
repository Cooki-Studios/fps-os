import * as THREE from "three";
import { updatePhysics } from "./physics";
import { updateCSM } from "./lighting";

let renderer: THREE.WebGLRenderer;
export const timer = new THREE.Timer();

export function enableRenderer(
  scene: THREE.Scene,
  camera: THREE.PerspectiveCamera,
) {
  function animate(time: number) {
    timer.update(time);
    const delta = timer.getDelta();

    updatePhysics(delta);
    updateCSM();

    renderer.render(scene, camera);
  }
  renderer.setAnimationLoop(animate);
}

export function initRenderer(
  camera: THREE.PerspectiveCamera,
): HTMLCanvasElement {
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = true;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1;

  const canvas = renderer.domElement;

  canvas.oncontextmenu = (e) => {
    e.preventDefault();
  };

  document.body.appendChild(canvas);

  window.onresize = () => {
    renderer.setSize(window.innerWidth, window.innerHeight);
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
  };

  return canvas;
}

export function compileRenderer(scene: THREE.Scene, camera: THREE.Camera) {
  renderer.compile(scene, camera);
}
