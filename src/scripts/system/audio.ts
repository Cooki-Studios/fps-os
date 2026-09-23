// Sound Effects by freesound_community from Pixabay
import * as THREE from "three";
import { pause } from "./pause";

const listener = new THREE.AudioListener();
const audioEl = document.getElementById("audio") as HTMLDivElement;
let enabled = false;

audioEl.onclick = () => {
  audioEl.classList.toggle("unmuted");
  enabled = audioEl.classList.contains("unmuted");
};

export function enableAudioEl(enable = true) {
  audioEl.style.display = enable ? "block" : "none";
}

export function initAudio(camera: THREE.Camera) {
  camera.add(listener);
}

const sounds: Record<string, THREE.PositionalAudio> = {};

export function addAudioToObject(
  obj: THREE.Object3D,
  name: string,
  distance = 0.5,
) {
  const sound = new THREE.PositionalAudio(listener);
  const audioLoader = new THREE.AudioLoader();
  audioLoader.load(`src/assets/audio/${name}.mp3`, function (buffer) {
    sound.setBuffer(buffer);
    sound.setRefDistance(distance);
    sounds[name] = sound;
  });
  obj.add(sound);
}

export async function playAudio(name: string, delay = 0, offset = 0) {
  if (!enabled) return;
  await pause(delay);
  const sound = sounds[name];
  sound.offset = offset;
  sound.setDetune(Math.random() * 100);
  sound.play();
}
