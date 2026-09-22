const start = performance.now(),
  log = document.getElementById("bootlog") as HTMLSpanElement,
  logContent = document.getElementById("bootlog-content") as HTMLSpanElement,
  blinkEl = document.getElementById("blink") as HTMLSpanElement;
let blink: number | undefined;

let queue: Promise<void> = Promise.resolve();
export function bootFinished(): Promise<void> {
  return queue;
}

export function hideBootLog() {
  log.style.display = "none";
}

export function bootLog(msg: string, showTime = true, error = false) {
  queue = queue.then(async () => {
    if (blink) clearTimeout(blink);

    const span = document.createElement("span");
    if (error) {
      msg = msg
        .replace(/http?:\/\/[^/]+\/(?:[^/]+\/)*?/g, "")
        .replace(/\?[^:\s)]+/g, "");
      span.classList.add("red");
    }

    if (showTime)
      msg = `[${(performance.now() - start).toFixed(1).padStart(7)}] ${msg}`;

    span.textContent += `${msg}\n`;
    logContent.appendChild(span);

    log.scrollTo({
      top: log.scrollHeight,
    });
    restartBlink();

    // https://stackoverflow.com/a/37764963
    await new Promise((f) => setTimeout(f, 0));
  });
  return queue;
}

function restartBlink() {
  blink = setTimeout(() => {
    blinkEl.style.visibility =
      blinkEl.style.visibility == "hidden" ? "visible" : "hidden";
    restartBlink();
  }, 500);
}

window.onerror = (_msg, _src, _ln, _col, e) => {
  if (!e || !e.stack) return;
  log.style.display = "flex";
  bootLog(e.stack, true, true);
};
window.onunhandledrejection = (e) => {
  if (e.reason.name == "SecurityError" && e.reason.code == 18) return;
  log.style.display = "flex";
  bootLog(`Unhandled (in promise) ${e.reason.stack}`, true, true);
};

bootLog("Boot process started");

// Loading scene
import * as THREE from "three";
import { TextGeometry } from "three/addons/geometries/TextGeometry.js";
import { lerp } from "three/src/math/MathUtils.js";
import { isMobile, isPortrait, onMobileRotate } from "./util/mobile";
import { font } from "./util/fonts";

const TITLE_DEPTH = 5,
  MOBILE_TITLE_SCALE_PORTRAIT = 0.75;
let MOBILE_TITLE_SCALE = 2,
  mobileTitleScale = MOBILE_TITLE_SCALE;

if (isMobile && isPortrait()) {
  mobileTitleScale = MOBILE_TITLE_SCALE_PORTRAIT;
}

let title = new THREE.Group(),
  light: THREE.DirectionalLight,
  highlight: THREE.PointLight;

const titleEl = document.getElementById("title") as HTMLHeadingElement;

export async function createTitleScene(): Promise<{
  titleScene: THREE.Scene<THREE.Object3DEventMap>;
  titleCamera: THREE.PerspectiveCamera;
  titleTitle: THREE.Group;
}> {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(
    120,
    window.innerWidth / window.innerHeight,
    0.1,
    1000,
  );
  camera.rotation.order = "YXZ";
  camera.position.set(0, -0.5, 10);

  const ambientLight = new THREE.AmbientLight(0xffa500, 0.75);
  scene.add(ambientLight);

  light = new THREE.DirectionalLight(0xffffff, 3);
  light.position.set(0, -1.5, TITLE_DEPTH);
  scene.add(light);

  highlight = new THREE.PointLight(0xffffff, 0);
  highlight.position.set(-10, -1.5, TITLE_DEPTH);
  scene.add(highlight);

  scene.fog = new THREE.Fog(0x00000000, 0, 8);

  const titleStr = "FPS OS";
  let charPos = 0;

  for (let i = 0; i < titleStr.length; i++) {
    const char = titleStr[i];
    const span = document.createElement("span");
    span.textContent = char;
    titleEl.appendChild(span);
  }

  for (let i = 0; i < titleStr.length; i++) {
    const char = titleStr[i];

    if (char == " ") {
      charPos += isMobile ? 0.25 * mobileTitleScale : 0.25;
      continue;
    }

    const charWidth = titleEl.children[i].getBoundingClientRect().width;
    const geometry = new TextGeometry(char, {
      font: font,
      size: isMobile ? mobileTitleScale : 1,
      depth: TITLE_DEPTH,
      curveSegments: 12,
    });

    const material = new THREE.MeshPhysicalMaterial({
      color: 0xffa500,
      metalness: 0.65,
      roughness: 0.6,
    });

    const letter = new THREE.Mesh(geometry, material);
    letter.scale.z = 0;
    letter.position.x = charPos;
    letter.castShadow = true;
    letter.receiveShadow = true;
    charPos += (isMobile ? charWidth * mobileTitleScale : charWidth) / 12;

    title.add(letter);
  }

  function recenter() {
    const box = new THREE.Box3().setFromObject(title);
    const center = new THREE.Vector3();
    box.getCenter(center);
    title.position.x -= center.x;
    title.position.y -= center.y;
  }
  recenter();

  onMobileRotate((portrait) => {
    if (!isMobile) return;
    const targetScale = portrait
      ? MOBILE_TITLE_SCALE_PORTRAIT
      : MOBILE_TITLE_SCALE;
    const scale = targetScale / mobileTitleScale;

    title.scale.x = scale;
    title.scale.y = scale;
    recenter();
  });

  scene.add(title);

  return {
    titleScene: scene,
    titleCamera: camera,
    titleTitle: title,
  };
}

const logo = document.getElementById("logo") as HTMLHeadingElement;
const logoText = "Cooki Studios";
const swish = ["^", " `", " `", " '", " )", "."];
let animStage = 1;

for (let i = 0; i < logoText.length; i++) {
  const char = logoText[i];
  const span = document.createElement("span");
  span.textContent = char;
  span.style.visibility = "hidden";
  logo.appendChild(span);
}

export function animateTitle(delta: number) {
  if (animStage >= 1) {
    title.children.forEach((char, i) => {
      setTimeout(() => {
        char.scale.z = lerp(char.scale.z, 1, delta * 10);
        char.position.z = lerp(char.position.z, TITLE_DEPTH / 2, delta * 10);

        if (i == title.children.length - 1 && char.scale.z > 0.9) {
          setTimeout(() => {
            highlight.intensity = Math.max(
              0,
              2 - Math.abs(highlight.position.x) * 0.2,
            );
            highlight.position.x += 10 * delta;
          }, 500);
        }

        if (animStage < 2)
          if (i == title.children.length - 1 && char.scale.z > 0.9) {
            for (let i = 0; i < logoText.length; i++) {
              setTimeout(
                () => {
                  (logo.children[i] as HTMLSpanElement).style.visibility =
                    "visible";

                  if (i == logo.children.length - 1) {
                    for (let i = 0; i < swish.length; i++) {
                      setTimeout(
                        () => {
                          logo.style.setProperty("--swish", `"${swish[i]}"`);
                        },
                        (i + 1) * 100,
                      );
                    }

                    setTimeout(() => {
                      title.userData.animDone = true;
                      document.body.style.opacity = "0";
                      const spinner = document.getElementById("spinner");
                      if (spinner) {
                        spinner.style.transition = "opacity 500ms ease-in";
                        spinner.style.opacity = "0";
                      }
                    }, 2000);
                  }
                },
                (i + 2) * 25,
              );
            }
            animStage = 2;
          }
      }, i * 50);
    });
  }
}
