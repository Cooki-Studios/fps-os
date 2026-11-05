import * as THREE from "three";
import { initNote } from "../objects/notepad";
import { enablePlayerControl } from "../objects/player";
import { stopAudio } from "../system/audio";
import { onActionPressed, toggleAction, toggleActions } from "../system/input";
import { interactPlayer } from "../system/interact";
import { getMainCanvas, unsetFilesRenderer } from "../system/renderer";
import { getMainCam, getMainScene } from "../util/scene";
import { moveFilesPlayer } from "./main";
import { updateFileMap } from "./map";
import { getDocObj, getTile, SIDES_ARR, type Tile } from "./tiles";

const controls = document.getElementById("files-ctrl") as HTMLDivElement,
  qualityEl = document.getElementById("quality-label") as HTMLDivElement,
  fade = document.getElementById("fade-overlay") as HTMLDivElement,
  title = document.getElementById("files-title") as HTMLHeadingElement,
  map = document.getElementById("map") as HTMLCanvasElement,
  obj = document.getElementById("files-obj") as HTMLHeadingElement;

let allowMap = false;

export function getAllowMap() {
  return allowMap;
}

onActionPressed("file_forward", () => moveFilesPlayer(0, 1));
onActionPressed("file_back", () => moveFilesPlayer(0, -1));
onActionPressed("file_left", () => moveFilesPlayer(-1));
onActionPressed("file_right", () => moveFilesPlayer(1));

function deleteFile(tile: Tile) {
  const obj = getDocObj(tile.id);
  if (!obj) return;

  const content = obj.userData.ui.element.textContent;
  obj.userData.ui?.parent.remove(obj.userData.ui);
  obj.parent?.remove(obj);

  return content;
}

export function updateFileControls(tile: Tile) {
  controls.textContent = "";
  toggleActions(
    ["file_forward", "file_back", "file_left", "file_right"],
    false,
  );

  if (tile.type != "Folder") obj.textContent = tile.type || "";
  else obj.textContent = "";

  for (const side of SIDES_ARR) {
    if (side == "down" || tile.sides.includes(side)) continue;

    const button = document.createElement("button");

    switch (side) {
      case "forward":
        if (getTile(tile.x, tile.y + 1)?.sides.includes("back")) continue;
        button.textContent = "↑";
        button.onclick = () => moveFilesPlayer(0, 1);
        toggleAction("file_forward", true);
        break;
      case "back":
        if (getTile(tile.x, tile.y - 1)?.sides.includes("forward")) continue;
        button.textContent = "↓";
        button.onclick = () => moveFilesPlayer(0, -1);
        toggleAction("file_back", true);
        break;
      case "left":
        if (getTile(tile.x - 1, tile.y)?.sides.includes("right")) continue;
        button.textContent = "←";
        button.onclick = () => moveFilesPlayer(-1);
        toggleAction("file_left", true);
        break;
      case "right":
        if (getTile(tile.x + 1, tile.y)?.sides.includes("left")) continue;
        button.textContent = "→";
        button.onclick = () => moveFilesPlayer(1);
        toggleAction("file_right", true);
        break;
    }

    button.className = side;
    controls.appendChild(button);
  }

  if (tile.type == "Document") {
    const bin = document.createElement("button");
    bin.textContent = "Send to Bin";
    bin.className = "send";
    controls.appendChild(bin);

    bin.onclick = () => {
      tile.type = undefined;

      const content = deleteFile(tile);

      initNote(
        getMainScene(),
        getMainCanvas(),
        true,
        content,
        new THREE.Vector3(0, 0, 0.75),
        new THREE.Quaternion().setFromEuler(
          new THREE.Euler(Math.PI / 2.5, 0, 0),
        ),
        getMainScene().getObjectByName("D_Cylinder")?.parent as THREE.Object3D,
      );

      updateFileMap();
    };

    const deleteBtn = document.createElement("button");
    deleteBtn.textContent = "Delete";
    deleteBtn.className = "delete";
    controls.appendChild(deleteBtn);

    deleteBtn.onclick = () => {
      tile.type = undefined;

      deleteFile(tile);
      updateFileMap();
    };
  }

  if (!tile.start && tile.type != "Exit") return;

  const button = document.createElement("button");
  button.textContent = "Exit";
  button.className = "exit";
  controls.appendChild(button);

  button.onclick = () => {
    button.style.pointerEvents = "none";
    fade.style.opacity = "1";
    toggleActions(
      ["file_forward", "file_back", "file_left", "file_right"],
      false,
    );

    setTimeout(() => {
      unsetFilesRenderer();
      qualityEl.style.visibility = "visible";
      title.style.opacity = "0";
      controls.style.visibility = "";
      allowMap = false;
      map.style.visibility = "";

      stopAudio("global", "music/NIVIRO - The Riot [NCS Release]");

      setTimeout(() => {
        fade.style.opacity = "0";
        interactPlayer(
          getMainCam(),
          getMainScene(),
          getMainCanvas(),
          true,
          true,
        );
        enablePlayerControl(getMainCanvas(), getMainScene());
      }, 200);
    }, 500);
  };
}

export function showFileCtrl() {
  controls.style.visibility = "visible";
  allowMap = true;
}
