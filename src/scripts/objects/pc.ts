import * as THREE from "three";
import { createUI } from "../system/3dui";
import { disablePlayerControl, enablePlayerControl } from "./player";
import { onActionPressed } from "../system/input";

let monitor: THREE.Object3D;

export function setMonitor(obj: THREE.Object3D) {
  monitor = obj;
}

const rotation = new THREE.Euler(-Math.PI / 36, -Math.PI, 0, "YXZ"),
  offset = new THREE.Vector3(0, 1.34, -0.02);

let screenMesh: THREE.Mesh;

const WIDTH = 1028,
  HEIGHT = 740;

const screen = document.getElementById("screen") as HTMLDivElement;
const spinner = screen.querySelector(".spinner") as HTMLDivElement;
const url = document.getElementById("url") as HTMLInputElement;

const osButtons: NodeListOf<HTMLButtonElement> =
  screen.querySelectorAll("button.os");
console.log(window.location.href);
const oses: Record<string, string> = {
  fps: ".",
  tundra: "https://annaxiomm.github.io/tundra/",
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
  spinner.style.animation =
    "spin 1s linear infinite, resize 2s ease-in infinite";
  spinner.style.opacity = "1";

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
  spinner.style.opacity = "0";
  spinner.style.animation = "";
};

iframe.onerror = () => iframeError();

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

export function enablePC(canvas: HTMLCanvasElement, scene: THREE.Scene) {
  screenMesh.visible = true;
  screen.style.opacity = "1";
  disablePlayerControl(canvas);
  canvas.style.pointerEvents = "none";

  onActionPressed("exitPC", () => {
    screen.style.opacity = "0";
    enablePlayerControl(canvas, scene);
    canvas.style.pointerEvents = "auto";
    setTimeout(() => (screenMesh.visible = false), 1000);
  });
}

export function deletePC() {
  screenMesh.parent!.remove(screenMesh);
}
