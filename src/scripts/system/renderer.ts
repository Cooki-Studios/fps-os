import * as THREE from "three";
import { updatePhysics } from "./physics";
import {
  changeCSMQuality,
  resizeCSM,
  setupShadowMaterial,
  updateCSM,
} from "./lighting";
import { animateTitle, bootLog } from "../boot";
import { getMainCam, getMainScene } from "../util/scene";
import { createKeypad, updateKeypad } from "../objects/keypad";
import { isMobile, onMobileRotate } from "../util/mobile";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import Stats from "stats.js";
import { onActionPressed } from "./input";
import { EXRLoader } from "three/examples/jsm/loaders/EXRLoader.js";
import { updateAnimation } from "./animation";
import { resize3DUI, update3DUI, updateUIPosRot } from "../system/3dui";
import { updateGrabInertia, updateMenu } from "./interact";
import { updateClock } from "../objects/clock";
import { initShaders, renderWithShaders, resizeShaders } from "./shaders";
import { enableAudioEl } from "./audio";
import { updateLight } from "../objects/mainLight";
import { updateBedCover } from "../objects/bed";
import { updateClipboard } from "../objects/clipboard";

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

let texture: THREE.DataTexture;

export async function setupSky(
  scene: THREE.Scene,
  renderer: THREE.WebGLRenderer,
) {
  const pmremGenerator = new THREE.PMREMGenerator(renderer);
  scene.environment = pmremGenerator.fromScene(new RoomEnvironment()).texture;
  scene.environmentIntensity = 0.2;

  const textureLoader = new EXRLoader();
  texture = await textureLoader.loadAsync("textures/DaySkyHDRI069B_1K_HDR.exr");
  texture.mapping = THREE.EquirectangularReflectionMapping;

  scene.background = texture;
  scene.backgroundIntensity = 2;

  bootLog("Sky initialised");
}

export function getSkyTexture() {
  return texture;
}

export function setSkyLightLevel(intensity = 1) {
  scene.environmentIntensity = 0.2 * intensity;
  scene.backgroundIntensity = 2 * intensity;
}

let disabled = false;

export function pauseRenderer() {
  disabled = true;
}
export function resumeRenderer() {
  disabled = false;
}

const qualityEl = document.getElementById("quality") as HTMLInputElement;

if (isMobile) qualityEl.value = "0";

if (localStorage.getItem("quality"))
  qualityEl.value = localStorage.getItem("quality") as string;

let quality = Number(qualityEl.value);
export function getQuality() {
  return quality;
}

qualityEl.oninput = () => {
  quality = Number(qualityEl.value);
  localStorage.setItem("quality", qualityEl.value);

  updateQuality();
};

export function updateQuality() {
  if (quality > 2) initShaders(renderer, scene, camera);

  switch (quality) {
    case 3:
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1));
      renderer.toneMapping = THREE.NoToneMapping;
      renderer.shadowMap.enabled = true;
      break;
    case 2:
      renderer.setPixelRatio(Math.min(window.devicePixelRatio * 0.9, 1));
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.shadowMap.enabled = true;
      break;
    case 1:
      renderer.setPixelRatio(Math.min(window.devicePixelRatio * 0.8, 1));
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.shadowMap.enabled = false;
      break;
    default:
      renderer.setPixelRatio(Math.min(window.devicePixelRatio * 0.8, 1));
      renderer.toneMapping = THREE.NoToneMapping;
      renderer.shadowMap.enabled = false;
      break;
  }

  changeCSMQuality(scene, camera, quality);

  scene.traverse((mesh) => {
    if (mesh instanceof THREE.Mesh && mesh.material) {
      if (mesh.name == "shadow") {
        if (mesh.parent?.name == "Screen") return;
        if (quality == 1) mesh.material.emissiveIntensity = 0.2;
        else mesh.material.emissiveIntensity = 0;
        return;
      }
      if (mesh.name != "D_Plane_002") setupShadowMaterial(mesh.material);
      mesh.material.needsUpdate = true;
    }
  });
}

export async function enableRenderer(
  renderScene: THREE.Scene,
  renderCam: THREE.PerspectiveCamera,
  title?: THREE.Group,
) {
  scene = renderScene;
  camera = renderCam;

  if (quality > 2) initShaders(renderer, scene, camera);

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

            if (quality > 2) initShaders(renderer, scene, camera);
            updateQuality();

            resizeRenderer();
            resize3DUI();

            const logo = document.getElementById("logo");
            if (logo) logo.style.display = "none";

            canvas.style.pointerEvents = "auto";
            document.body.style.opacity = "1";

            enableAudioEl();

            sessionStorage.setItem("booted", "true");
          }, 500);
        }

      if (quality > 2) renderWithShaders();
      else renderer.render(scene, camera);
    } else {
      if (disabled) return;

      stats.begin();

      updateAnimation(delta);
      updateClock();
      updatePhysics(delta);
      updateBedCover(scene);
      updateClipboard(delta);
      updateKeypad(delta, canvas, scene);
      updateGrabInertia();
      updateUIPosRot();
      update3DUI(scene, camera);
      updateMenu(camera);
      updateCSM(delta);
      updateLight();

      if (quality > 2) renderWithShaders();
      else renderer.render(scene, camera);

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
    resizeCSM();
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
  renderer.setSize(window.innerWidth, window.innerHeight);

  const canvas = renderer.domElement;
  document.body.appendChild(canvas);

  canvas.oncontextmenu = (e) => e.preventDefault();

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
