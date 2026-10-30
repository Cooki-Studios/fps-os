import * as THREE from "three";
import { createUI } from "../system/3dui";
import { actions } from "../system/input";
import { ROOM_ROT_FIX } from "../system/animation";
import ascii from "../../../ascii.html?raw" with { type: "html" };
import { addAudioToObject, playAudio } from "../system/audio";

let panel: THREE.Object3D;

const posOffset = new THREE.Vector3(0, 0, 3.35),
  rotOffset = new THREE.Quaternion().setFromEuler(
    new THREE.Euler(Math.PI / 2, 0, 0),
  );

const br = document.createElement("br");

const startRot = 32 * (Math.PI / 180);

type SwitchData = {
  mesh?: THREE.Object3D;
  parent?: THREE.Object3D;
  toggle: boolean;
  rotX: number;
  targetRotX: number;
};

const createSwitchData = () =>
  ({
    toggle: false,
    rotX: startRot,
    targetRotX: startRot,
  }) as SwitchData;

const switches = {
  debug: createSwitchData(),
  debugPlayer: createSwitchData(),
  speedo: createSwitchData(),
};

export async function setSettingsSwitch(
  which: keyof typeof switches,
  obj: THREE.Object3D,
  room?: THREE.Object3D,
  parent = false,
) {
  const button = switches[which];

  if (parent) {
    button.parent = obj;
    return;
  }

  if (room) {
    room.attach(obj);
    obj.position.set(0, 0, 0);
    obj.rotation.set(0, 0, 0);
  }

  button.mesh = obj;

  await addAudioToObject(obj, "light-on");
  await addAudioToObject(obj, "light-off");
}

export function updateSwitch(which: keyof typeof switches) {
  const button = switches[which];
  if (!button.mesh) return;

  button.toggle = !button.toggle;
  document.dispatchEvent(new CustomEvent(`${which}:pressed`));

  if (button.toggle) {
    button.targetRotX -= startRot;
    playAudio(button.mesh.name, "light-off", 200);
  } else {
    button.targetRotX += startRot;
    playAudio(button.mesh.name, "light-on");
  }
}

export function updateSettingsPanel(delta: number) {
  for (const which in switches) {
    const button = switches[which as keyof typeof switches];
    if (!button.mesh || !button.parent) return;

    const pos = new THREE.Vector3();
    button.parent.getWorldPosition(pos);

    const rot = new THREE.Quaternion();
    button.parent.getWorldQuaternion(rot);

    button.mesh.position.set(pos.x, -pos.z, pos.y);
    button.mesh.quaternion
      .copy(ROOM_ROT_FIX)
      .multiply(rot)
      .multiply(ROOM_ROT_FIX.clone().invert());
    button.mesh.translateZ(0.1);
    button.mesh.rotateX(Math.PI / 2);
    button.mesh.rotateX(button.rotX);

    button.rotX = THREE.MathUtils.damp(
      button.rotX,
      button.targetRotX,
      16,
      delta,
    );
  }
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

  const asciiEl = document.createElement("p");
  asciiEl.id = "ascii";
  asciiEl.innerHTML = ascii;
  div.appendChild(asciiEl);

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
