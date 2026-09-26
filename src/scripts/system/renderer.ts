import * as THREE from "three";
import { updatePhysics } from "./physics";
import { updateCSM } from "./lighting";
import { animateTitle, bootLog, hideBootLog } from "../boot";
import { getMainCam, getMainScene } from "../util/scene";
import { createKeypad, updateKeypad } from "../objects/keypad";
import { onMobileRotate } from "../util/mobile";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import Stats from "stats.js";
import { onActionPressed } from "./input";
import { EXRLoader } from "three/examples/jsm/loaders/EXRLoader.js";
import { updateAnimation } from "./animation";
import { resize3DUI, update3DUI, updateUIPosRot } from "../system/3dui";
import { updateMenu } from "./interact";
import { updateClock } from "../objects/clock";
import { initShaders, renderWithShaders, resizeShaders } from "./shaders";

let renderer: THREE.WebGLRenderer,
  scene: THREE.Scene,
  camera: THREE.PerspectiveCamera,
  canEndAnim = true;

const MAX_ANIM_DELTA = 1 / 15;

var stats = new Stats();

onActionPressed("debug", () => {
  if (!document.body.contains(stats.dom)) {
    document.body.appendChild(stats.dom);
    stats.showPanel(0); // 0: fps, 1: ms, 2: mb, 3+: custom
  }

  stats.dom.style.visibility =
    stats.dom.style.visibility === "visible" ? "hidden" : "visible";
});

export function setSkyOffset(offset: number) {
  scene.backgroundRotation.y = offset;
}

export async function setupSky(
  scene: THREE.Scene,
  renderer: THREE.WebGLRenderer,
) {
  const pmremGenerator = new THREE.PMREMGenerator(renderer);
  scene.environment = pmremGenerator.fromScene(new RoomEnvironment()).texture;
  scene.environmentIntensity = 0.2;

  const textureLoader = new EXRLoader();
  const texture = await textureLoader.loadAsync(
    "textures/DaySkyHDRI069B_1K_HDR.exr",
  );
  texture.mapping = THREE.EquirectangularReflectionMapping;

  scene.background = texture;
  scene.backgroundIntensity = 2;

  bootLog("Sky initialised");
}

export function setSkyLightLevel(intensity = 1) {
  scene.environmentIntensity = 0.2 * intensity;
  scene.backgroundIntensity = 2 * intensity;
}

export async function enableRenderer(
  renderScene: THREE.Scene,
  renderCam: THREE.PerspectiveCamera,
  title?: THREE.Group,
) {
  scene = renderScene;
  camera = renderCam;
  const canvas = document.querySelector(
    "canvas[data-engine]",
  ) as HTMLCanvasElement;
  resizeRenderer();
  resize3DUI();

  if (title) createKeypad(getMainCam(), canvas);

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
            hideBootLog();
            resizeRenderer();
            resize3DUI();

            initShaders(renderer, scene, camera);

            const logo = document.getElementById("logo");
            if (logo) logo.style.display = "none";

            canvas.style.pointerEvents = "auto";
            document.body.style.opacity = "1";

            localStorage.setItem("booted", "true");
          }, 500);
        }

      renderer.render(scene, camera);
    } else {
      updateAnimation(delta);
      updateClock();
      updatePhysics(delta);
      updateKeypad(delta, canvas, scene);
      updateUIPosRot();
      update3DUI(scene, camera);
      updateMenu(camera);
      updateCSM(delta);

      stats.begin();
      renderWithShaders();
      stats.end();
    }
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
  resizeShaders(width, height);

  if (camera) {
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  }
}

export function initRenderer(): {
  canvas: HTMLCanvasElement;
  renderer: THREE.WebGLRenderer;
} {
  renderer = new THREE.WebGLRenderer({
    powerPreference: "high-performance",
    antialias: true,
    alpha: false,
    stencil: false,
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;

  const canvas = renderer.domElement;

  canvas.oncontextmenu = (e) => {
    e.preventDefault();
  };

  document.body.appendChild(canvas);

  const onresize = () => {
    resizeRenderer();
    resize3DUI();
  };

  window.onresize = onresize;
  onMobileRotate(onresize);

  bootLog("Renderer initialised");

  return { canvas, renderer };
}

export function compileRenderer(
  renderScene: THREE.Scene,
  renderCam: THREE.PerspectiveCamera,
) {
  renderer.compile(renderScene, renderCam);
  bootLog("Renderer compiled");
}
