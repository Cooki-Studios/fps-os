import * as THREE from "three";
import { createUI } from "../system/3dui";
import { actions } from "../system/input";
import { ROOM_ROT_FIX } from "../system/animation";

let panel: THREE.Object3D;

const posOffset = new THREE.Vector3(0, 0, 3.35),
  rotOffset = new THREE.Quaternion().setFromEuler(
    new THREE.Euler(Math.PI / 2, 0, 0),
  );

const br = document.createElement("br");

let debug: THREE.Object3D, debugParent: THREE.Object3D;

export function setDebug(obj: THREE.Object3D) {
  debug = obj;
}
export function setDebugParent(obj: THREE.Object3D) {
  debugParent = obj;
}

const startRot = 32 * (Math.PI / 180);
let rotX = startRot;

export function updateSwitch(which: "debug" | "playerDebug" | "speedo") {
  switch (which) {
    case "debug":
      if (rotX == startRot) rotX -= startRot;
      else rotX += startRot;
      document.dispatchEvent(new CustomEvent("debug:pressed"));
      break;
  }
}

export function updateSettingsPanel() {
  if (!debug || !debugParent) return;

  const pos = new THREE.Vector3();
  debugParent.getWorldPosition(pos);

  const rot = new THREE.Quaternion();
  debugParent.getWorldQuaternion(rot);

  debug.position.set(pos.x, -pos.z - 0.1, pos.y);
  debug.quaternion
    .copy(ROOM_ROT_FIX)
    .multiply(rot)
    .multiply(ROOM_ROT_FIX.clone().invert());
  debug.rotateX(Math.PI / 2);
  debug.rotateX(rotX);
}

export async function setSettingsPanel(
  obj: THREE.Object3D,
  scene: THREE.Scene,
) {
  panel = obj;

  const cont = document.createElement("div");
  cont.id = "settings-container";

  const div = document.createElement("div");
  div.id = "settings";
  cont.appendChild(div);

  const version = document.createElement("h1");
  version.textContent = `FPS OS v${import.meta.env.VERSION}`;
  div.appendChild(version);

  const actionTitle = document.createElement("h2");
  actionTitle.textContent = "Controls";
  div.appendChild(actionTitle);

  for (const action of Object.keys(actions)) {
    const actionFmt = action
      .replace(/([a-z])([A-Z])/g, "$1 $2")
      .replace(/^./, (str) => str.toUpperCase());

    let keyFmt = actions[action].replace(/^./, (str) => str.toUpperCase());
    if (keyFmt == " ") keyFmt = "Space";

    const actionEl = document.createElement("b");
    actionEl.textContent = `${actionFmt}: ${keyFmt}\n`;
    div.appendChild(actionEl);

    if (["fullscreen", "drop", "exitUI", "debugPlayer"].includes(action))
      div.appendChild(br.cloneNode());
  }

  const { mesh } = createUI(
    scene,
    cont,
    1.2,
    undefined,
    panel,
    posOffset,
    rotOffset,
    true,
  );
  if (!mesh) return;

  mesh.name = "Settings";
}
