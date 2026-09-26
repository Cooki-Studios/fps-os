import * as THREE from "three";
import { createUI } from "../system/3dui";
import { disablePlayerControl, enablePlayerControl } from "./player";
import { onActionPressed } from "../system/input";
import {
  addAudioToObject,
  enableAudioEl,
  isAudioPlaying,
  playAudio,
} from "../system/audio";

let monitor: THREE.Object3D;

export async function setMonitor(obj: THREE.Object3D) {
  monitor = obj;
  await addAudioToObject(monitor, "pc-hum", 0.35, true);
  await addAudioToObject(monitor, "pc-click-down", 0.5);
  await addAudioToObject(monitor, "pc-click-up", 0.5);
  await addAudioToObject(monitor, "pc-type", 0.5);
}

const rotation = new THREE.Euler(-Math.PI / 36, -Math.PI, 0, "YXZ"),
  offset = new THREE.Vector3(0, 1.34, -0.02);

const WIDTH = 1028,
  HEIGHT = 740;

const screen = document.getElementById("screen") as HTMLDivElement;
const spinnerBox = document.getElementById("spinner-box") as HTMLDivElement;
const spinner = screen.querySelector(".spinner") as HTMLDivElement;

const screens: HTMLDivElement[] = [],
  screenMeshes: THREE.Mesh[] = [],
  iframes: HTMLIFrameElement[] = [];

async function loadPage(domain: string, parent: HTMLElement) {
  spinnerBox.style.display = "block";
  spinner.style.animation =
    "spin 1s linear infinite, resize 2s ease-in infinite";

  if (domain != ".")
    if (domain.includes(".")) {
      if (domain.includes("google.com")) domain += "?igu=1";
      if (!domain.startsWith("http")) domain = "https://" + domain;
    } else {
      domain = `https://google.com/search?q=${domain}&igu=1`;
    }

  const iframeDiv = parent.querySelector(".iframeDiv");
  if (!iframeDiv) return;

  if (iframeDiv.children.length == 0) {
    const iframe = document.createElement("iframe");
    iframe.src = domain;
    iframes.push(iframe);
    iframeDiv.appendChild(iframe);

    iframe.onload = () => {
      spinnerBox.style.display = "none";
      spinner.style.animation = "";
    };

    iframe.onerror = () => iframeError();
  } else {
    const iframe = iframeDiv.querySelector("iframe");
    if (iframe) iframe.src = domain;
  }
}

const iframeDiv = document.createElement("div");
iframeDiv.classList.add("iframeDiv");
iframeDiv.style.width = `${WIDTH}px`;
iframeDiv.style.height = `${HEIGHT}px`;
screen.appendChild(iframeDiv);

const error = document.getElementById("iframe-error") as HTMLDivElement;

function iframeError() {
  error.style.display = "grid";
}

screen.onpointerdown = () => playAudio(monitor.name, "pc-click-down");
screen.onpointerup = () => playAudio(monitor.name, "pc-click-up");
screen.onkeydown = (e) => {
  if (e.key == "Escape") {
    if (e.target) (e.target as HTMLElement).blur();
    document.dispatchEvent(new CustomEvent("exitPC:pressed"));
  }
  playAudio(monitor.name, "pc-type");
};

function initMonitor(scene: THREE.Scene) {
  const pos = new THREE.Vector3();
  monitor.getWorldPosition(pos);

  const monitorScreen = screen.cloneNode(true) as HTMLDivElement;

  const osButtons: NodeListOf<HTMLButtonElement> =
    monitorScreen.querySelectorAll("button.os");
  const oses: Record<string, string> = {
    fps: ".",
    tundra: "annaxiomm.github.io/tundra",
    google: "google.com",
    threejs: "threejs.org",
  };
  for (const button of osButtons) {
    button.onclick = () => {
      loadPage(oses[button.id], monitorScreen);
    };
  }

  screens.push(monitorScreen);

  const { mesh, obj } = createUI(scene, monitorScreen, 1.5);

  if (!mesh) return;
  mesh.name = "Screen";

  const screenMesh = mesh;
  screenMesh.userData.ui = obj;
  screenMeshes.push(screenMesh);

  mesh.position.copy(pos.add(offset));
  mesh.rotation.copy(rotation);
  mesh.visible = false;

  obj.position.copy(pos);
  obj.rotation.copy(rotation);
}

export function getPCScreens() {
  return screenMeshes;
}

let inPC = false;
export function isInPC() {
  return inPC;
}

const warnEl = document.getElementById("literal-pc-info") as HTMLHeadingElement;

export function enablePC(
  canvas: HTMLCanvasElement,
  scene: THREE.Scene,
  id = screenMeshes.length - 1,
  screen = false,
) {
  let url: HTMLInputElement | undefined;

  if (!screen) {
    if (!screenMeshes[id] || screenMeshes[id].userData.grabbed)
      initMonitor(scene);

    inPC = true;

    url = screens[id + 1]?.querySelector(".url") as HTMLInputElement;
    if (url)
      url.onkeydown = async (e) => {
        if (e.key != "Enter") return;
        if (url) {
          loadPage(url.value, screens[id + 1]);
          url.value = "";
        }
      };

    screenMeshes[id + 1].visible = true;
    screens[id + 1].style.display = "grid";
    screens[id + 1].style.opacity = "1";
  }

  warnEl.style.opacity = "1";
  disablePlayerControl(canvas);
  canvas.style.pointerEvents = "none";
  enableAudioEl(false);
  if (!isAudioPlaying(monitor.name, "pc-hum"))
    playAudio(monitor.name, "pc-hum");

  if (!url && screens[id])
    url = screens[id].querySelector(".url") as HTMLInputElement;
  setTimeout(() => url?.focus());

  onActionPressed("exitPC", () => {
    inPC = false;
    enableAudioEl();
    enablePlayerControl(canvas, scene);
    canvas.style.pointerEvents = "auto";
    warnEl.textContent = "Click to play";
  });
}
