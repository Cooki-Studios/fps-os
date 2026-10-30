import * as THREE from "three";
import { addAudioToObject, playAudio, stopAudio } from "../system/audio";

let horn: THREE.Object3D;

export async function setHorn(obj: THREE.Object3D) {
  horn = obj;

  await addAudioToObject(horn, "horn", 2);
}

let playing = false;
export function playHorn() {
  playing = !playing;

  if (playing) playAudio("ChoudharyBillaHorn", "horn");
  else stopAudio("ChoudharyBillaHorn", "horn");
}
