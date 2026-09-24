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

export function setMonitor(obj: THREE.Object3D) {
  monitor = obj;
  addAudioToObject(monitor, "pc-hum", 0.5, true);
  addAudioToObject(monitor, "pc-click-down", 1);
  addAudioToObject(monitor, "pc-click-up", 1);
  addAudioToObject(monitor, "pc-type", 1);
}

const rotation = new THREE.Euler(-Math.PI / 36, -Math.PI, 0, "YXZ"),
  offset = new THREE.Vector3(0, 1.34, -0.02);

let screenMesh: THREE.Mesh;

const WIDTH = 1028,
  HEIGHT = 740;

const screen = document.getElementById("screen") as HTMLDivElement;
const spinnerBox = document.getElementById("spinner-box") as HTMLDivElement;
const spinner = screen.querySelector(".spinner") as HTMLDivElement;
const url = document.getElementById("url") as HTMLInputElement;

const osButtons: NodeListOf<HTMLButtonElement> =
  screen.querySelectorAll("button.os");
const oses: Record<string, string> = {
  fps: ".",
  tundra: "annaxiomm.github.io/tundra",
  google: "google.com",
  threejs: "threejs.org",
};
for (const button of osButtons) {
  button.onclick = () => {
    loadPage(oses[button.id]);
  };
}

url.onkeydown = async (e) => {
  if (e.key != "Enter") return;
  loadPage(url.value);
  url.value = "";
};

async function loadPage(domain: string) {
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

  iframe.src = domain;
  if (!iframeDiv.contains(iframe)) iframeDiv.appendChild(iframe);
}

const iframe = document.createElement("iframe");
const iframeDiv = document.createElement("div");
iframeDiv.style.width = `${WIDTH}px`;
iframeDiv.style.height = `${HEIGHT}px`;
screen.appendChild(iframeDiv);

const error = document.getElementById("iframe-error") as HTMLDivElement;

function iframeError() {
  error.style.display = "grid";
}

iframe.onload = () => {
  spinnerBox.style.display = "none";
  spinner.style.animation = "";
};

iframe.onerror = () => iframeError();

screen.onpointerdown = () => playAudio(monitor.name, "pc-click-down");
screen.onpointerup = () => playAudio(monitor.name, "pc-click-up");
screen.onkeydown = () => playAudio(monitor.name, "pc-type");

export function initMonitor(scene: THREE.Scene) {
  const pos = new THREE.Vector3();
  monitor.getWorldPosition(pos);

  const { mesh, obj } = createUI(scene, screen, 1.5);
  if (!mesh) return;
  screenMesh = mesh;

  mesh.position.copy(pos.add(offset));
  mesh.rotation.copy(rotation);
  mesh.visible = false;

  obj.position.copy(pos);
  obj.rotation.copy(rotation);
}

let inPC = false;
export function isInPC() {
  return inPC;
}

const warnEl = document.getElementById("literal-pc-info") as HTMLHeadingElement;

export function enablePC(canvas: HTMLCanvasElement, scene: THREE.Scene) {
  inPC = true;
  screenMesh.visible = true;
  screen.style.opacity = "1";
  warnEl.style.opacity = "1";
  disablePlayerControl(canvas);
  canvas.style.pointerEvents = "none";
  enableAudioEl(false);
  if (!isAudioPlaying(monitor.name, "pc-hum"))
    playAudio(monitor.name, "pc-hum");

  onActionPressed("exitPC", () => {
    inPC = false;
    enableAudioEl();
    enablePlayerControl(canvas, scene);
    canvas.style.pointerEvents = "auto";
    warnEl.textContent = "Click to play";
    // screen.style.opacity = "0";
    // setTimeout(() => (screenMesh.visible = false), 1000);
  });
}

export function deletePC() {
  screenMesh.parent!.remove(screenMesh);
}
