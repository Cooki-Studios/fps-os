import * as THREE from "three";
import { updatePhysics } from "./physics";
import { updateCSM } from "./lighting";
import { animateTitle, bootLog } from "./boot";
import { getMainCam, getMainScene } from "./main";

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

            const logo = document.getElementById("logo");
            if (logo) logo.style.display = "none";
            document.getElementsByTagName("canvas")[0].style.pointerEvents =
              "auto";

            resizeRenderer();
          }, 1000);
        }
    } else {
      updatePhysics(delta);
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
  renderer.setSize(window.innerWidth, window.innerHeight);
  if (camera) {
    camera.aspect = window.innerWidth / window.innerHeight;
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

  return canvas;
}

export function compileRenderer(
  renderScene: THREE.Scene,
  renderCam: THREE.PerspectiveCamera,
) {
  renderer.compile(renderScene, renderCam);
  bootLog("Renderer compiled");
}
