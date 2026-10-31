import { enablePlayerControl } from "../objects/player";
import { stopAudio } from "../system/audio";
import { interactPlayer } from "../system/interact";
import { getMainCanvas, unsetFilesRenderer } from "../system/renderer";
import { getMainCam, getMainScene } from "../util/scene";
import { moveFilesPlayer } from "./main";
import { SIDES, type Tile } from "./tiles";

const controls = document.getElementById("files-ctrl") as HTMLDivElement,
  qualityEl = document.getElementById("quality-label") as HTMLDivElement,
  fade = document.getElementById("fade-overlay") as HTMLDivElement,
  title = document.getElementById("files-title") as HTMLHeadingElement,
  map = document.getElementById("map") as HTMLCanvasElement;

let allowMap = false;

export function getAllowMap() {
  return allowMap;
}

export function updateFileControls(tile: Tile) {
  controls.textContent = "";

  for (const side of Object.keys(SIDES)) {
    if (side == "down" || tile.sides.includes(side as keyof typeof SIDES))
      continue;

    const button = document.createElement("button");

    switch (side as keyof typeof SIDES) {
      case "forward":
        button.textContent = "↑";
        button.onclick = () => moveFilesPlayer(0, 1);
        break;
      case "back":
        button.textContent = "↓";
        button.onclick = () => moveFilesPlayer(0, -1);
        break;
      case "left":
        button.textContent = "←";
        button.onclick = () => moveFilesPlayer(-1);
        break;
      case "right":
        button.textContent = "→";
        button.onclick = () => moveFilesPlayer(1);
        break;
    }

    button.className = side;
    controls.appendChild(button);
  }

  const button = document.createElement("button");
  button.textContent = "Exit";
  button.className = "exit";
  controls.appendChild(button);

  button.onclick = () => {
    button.style.pointerEvents = "none";
    fade.style.opacity = "1";

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
