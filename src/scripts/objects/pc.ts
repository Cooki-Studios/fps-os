import * as THREE from "three";
import { createUI, resetWarnEl, showWarnEl } from "../system/3dui";
import { disablePlayerControl, enablePlayerControl } from "./player";
import { onActionPressed } from "../system/input";
import {
  addAudioToObject,
  enableAudioEl,
  isAudioPlaying,
  playAudio,
} from "../system/audio";
import { marked } from "marked";
import DOMPurify from "dompurify";

import readmeContent from "../../../README.md?raw";
const readmeImages = import.meta.glob("../../screenshots/*", {
  eager: true,
  query: "?url",
  import: "default",
}) as Record<string, string>;

let monitor: THREE.Object3D;

export async function setMonitor(obj: THREE.Object3D) {
  monitor = obj;
  await addAudioToObject(monitor, "pc-hum", 0.35, true);
  await addAudioToObject(monitor, "pc-click-down", 0.5);
  await addAudioToObject(monitor, "pc-click-up", 0.5);
  await addAudioToObject(monitor, "pc-type", 0.5);
}

const rot = new THREE.Quaternion().setFromEuler(
    new THREE.Euler(Math.PI / 2 - Math.PI / 36, 0, 0),
  ),
  offset = new THREE.Vector3(0, -0.02, 1.34);

const WIDTH = 1028,
  HEIGHT = 740;

const screen = document.getElementById("screen") as HTMLDivElement;
const spinnerBox = document.getElementById("spinner-box") as HTMLDivElement;
const spinner = screen.querySelector(".spinner") as HTMLDivElement;

const screens: HTMLDivElement[] = [],
  screenMeshes: THREE.Mesh[] = [],
  readme = document.createElement("p");

readme.innerHTML = DOMPurify.sanitize(
  await marked.parse(readmeContent, { breaks: true, gfm: true }),
).replace(/src="(?:\.\/)?src\/(screenshots\/[^"]+)"/g, (match, path) => {
  const url = readmeImages[`../../${decodeURI(path)}`];
  return url ? `src="${url}"` : match;
});

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

  if (iframeDiv.contains(readme))
    iframeDiv.childNodes.forEach((child) => iframeDiv.removeChild(child));

  if (iframeDiv.children.length == 0) {
    const iframe = document.createElement("iframe");
    iframe.src = domain;
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

async function loadReadMe(parent: HTMLElement) {
  spinnerBox.style.display = "block";
  spinner.style.animation =
    "spin 1s linear infinite, resize 2s ease-in infinite";

  const iframeDiv = parent.querySelector(".iframeDiv") as HTMLDivElement;
  if (!iframeDiv) return;

  if (!iframeDiv.contains(readme)) {
    iframeDiv.childNodes.forEach((child) => iframeDiv.removeChild(child));
    iframeDiv.appendChild(readme);
  }

  readme.onload = () => {
    spinnerBox.style.display = "none";
    spinner.style.animation = "";
  };

  readme.onerror = () => iframeError();
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

function initMonitor(scene: THREE.Scene) {
  const monitorScreen = screen.cloneNode(true) as HTMLDivElement;
  monitorScreen.classList.add("instance");

  const { mesh } = createUI(
    scene,
    monitorScreen,
    1.5,
    undefined,
    monitor,
    offset,
    rot,
    true,
  );
  if (!mesh) return;
  mesh.name = "Screen";

  monitorScreen.onpointerdown = () => playAudio(monitor.name, "pc-click-down");
  monitorScreen.onpointerup = () => playAudio(monitor.name, "pc-click-up");
  monitorScreen.onkeydown = (e) => {
    if (e.key == "Escape") {
      if (e.target) (e.target as HTMLElement).blur();
      document.dispatchEvent(new CustomEvent("exitPC:pressed"));
    }
    playAudio(monitor.name, "pc-type");
  };

  const osButtons: NodeListOf<HTMLButtonElement> =
    monitorScreen.querySelectorAll("button.os");
  const oses: Record<string, string> = {
    fps: ".",
    tundra: "annaxiomm.github.io/tundra",
    google: "google.com",
    threejs: "threejs.org",
    readme: "",
  };
  for (const button of osButtons) {
    button.onclick = () => {
      if (button.id == "readme") loadReadMe(monitorScreen);
      else loadPage(oses[button.id], monitorScreen);
    };
  }

  screens.push(monitorScreen);
  screenMeshes.push(mesh);

  mesh.visible = false;

  const iframeDiv = monitorScreen.querySelector(".iframeDiv") as HTMLDivElement;
  iframeDiv.onwheel = (e) => {
    iframeDiv.scrollTop += e.deltaY;
  };
  iframeDiv.onpointermove = (e) => {
    const mult =
      iframeDiv.clientHeight / iframeDiv.getBoundingClientRect().height;

    if (e.buttons == 1) iframeDiv.scrollTop -= e.movementY * mult;
  };

  iframeDiv.onpointerdown = (e) => {
    const p = iframeDiv.querySelector("p");
    if (p) {
      document.body.style.cursor = "grabbing";
      iframeDiv.style.cursor = "grabbing";
      iframeDiv.setPointerCapture(e.pointerId);
    }
  };
  iframeDiv.onpointerup = (e) => {
    const p = iframeDiv.querySelector("p");
    if (p) {
      document.body.style.cursor = "";
      iframeDiv.style.cursor = "";
      iframeDiv.releasePointerCapture(e.pointerId);
    }
  };
}

export function getPCScreens() {
  return screenMeshes;
}

let inPC = false;
export function isInPC() {
  return inPC;
}

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

  showWarnEl("PC");
  disablePlayerControl(canvas);
  canvas.style.pointerEvents = "none";
  enableAudioEl(false);
  if (!isAudioPlaying(monitor.name, "pc-hum"))
    playAudio(monitor.name, "pc-hum");

  if (!url && screens[id])
    url = screens[id].querySelector(".url") as HTMLInputElement;
  setTimeout(() => url?.focus());

  onActionPressed(
    "exitPC",
    () => {
      inPC = false;
      enableAudioEl();
      enablePlayerControl(canvas, scene);
      canvas.style.pointerEvents = "auto";
      resetWarnEl();
    },
    true,
  );
}
