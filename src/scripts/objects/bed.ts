import * as THREE from "three";
import { playAnimation, playAnimationReversed } from "../system/animation";
import { disablePlayerControl, enablePlayerControl } from "./player";
import { pause } from "../system/pause";

const html = document.querySelector("html")!;

export async function sleep(canvas: HTMLCanvasElement, scene: THREE.Scene) {
  disablePlayerControl(canvas);
  playAnimation(6);
  await pause(250);

  document.body.style.opacity = "0";
  await pause(250);

  playAnimationReversed(6);
  await pause(250);

  document.body.style.display = "none";

  html.style.cursor = "pointer";
  document.onclick = async () => {
    document.onclick = null;
    html.style.cursor = "";
    document.body.style.display = "";
    await canvas.requestPointerLock();

    document.body.style.opacity = "1";
    playAnimation(6);
    await pause(250);

    enablePlayerControl(canvas, scene);
    await pause(250);

    playAnimationReversed(6);
  };
}
