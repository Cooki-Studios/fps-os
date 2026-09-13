import * as THREE from "three";
import { updatePhysics } from "./physics";
import { updateCSM } from "./lighting";
import { animateTitle, bootLog } from "../boot";
import { getMainCam, getMainScene } from "../util/scene";
import { createKeypad, updateKeypad } from "../objects/keypad";
import { onMobileRotate } from "../util/mobile";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";

let renderer: THREE.WebGLRenderer,
  scene: THREE.Scene,
  camera: THREE.PerspectiveCamera,
  canEndAnim = true;

const MAX_ANIM_DELTA = 1 / 15;

export function enableRenderer(
  renderScene: THREE.Scene,
  renderCam: THREE.PerspectiveCamera,
  title?: THREE.Group,
) {
  scene = renderScene;
  camera = renderCam;
  const canvas = document.querySelector("canvas") as HTMLCanvasElement;
  resizeRenderer();

  if (title) createKeypad(getMainCam(), canvas);

  const pmremGenerator = new THREE.PMREMGenerator(renderer);
  scene.environment = pmremGenerator.fromScene(new RoomEnvironment()).texture;
  scene.environmentIntensity = 0.2;
  bootLog("Environment loaded");

  function animate(time: number) {
    timer.update(time);
    const delta = timer.getDelta();

    if (title) {
      animateTitle(Math.min(delta, MAX_ANIM_DELTA));

      if (canEndAnim)
        if (title.userData.animDone) {
          canEndAnim = false;
          setTimeout(() => {
            scene = getMainScene();
            camera = getMainCam();
            title = undefined;
            resizeRenderer();

            const logo = document.getElementById("logo");
            if (logo) logo.style.display = "none";

            canvas.style.pointerEvents = "auto";

            document.body.style.opacity = "1";
          }, 500);
        }
    } else {
      updatePhysics(delta);
      updateKeypad(delta, canvas);
      updateCSM();
    }

    renderer.render(scene, camera);
  }

  const timer = new THREE.Timer();

  document.onvisibilitychange = () => {
    if (!document.hidden) timer.reset();
  };
  document.onpointerenter = () => {
    timer.reset();
  };

  renderer.setAnimationLoop(animate);
}

export function resizeRenderer() {
  if (!renderer) return;

  const width = document.documentElement.clientWidth || window.innerWidth;
  const height = document.documentElement.clientHeight || window.innerHeight;

  renderer.setSize(width, height);

  if (camera) {
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  }
}

export function initRenderer(): HTMLCanvasElement {
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
  window.onresize = resizeRenderer;
  onMobileRotate(resizeRenderer);

  return canvas;
}

export function compileRenderer(
  renderScene: THREE.Scene,
  renderCam: THREE.PerspectiveCamera,
) {
  renderer.compile(renderScene, renderCam);
  bootLog("Renderer compiled");
}
