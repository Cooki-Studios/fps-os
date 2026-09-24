// Sound Effects by freesound_community from Pixabay
import * as THREE from "three";
import { pause } from "./pause";

const listener = new THREE.AudioListener();
const audioEl = document.getElementById("audio") as HTMLDivElement;
let enabled = false;

if (localStorage.getItem("audio")) {
  audioEl.classList.add("unmuted");
  enabled = true;
}

audioEl.onclick = () => {
  audioEl.classList.toggle("unmuted");
  enabled = audioEl.classList.contains("unmuted");
  if (localStorage.getItem("audio")) localStorage.removeItem("audio");
  else localStorage.setItem("audio", "true");
};

export function enableAudioEl(enable = true) {
  audioEl.style.display = enable ? "block" : "none";
}

export function initAudio(camera: THREE.Camera) {
  camera.add(listener);
}

const sounds: Record<string, Record<string, THREE.PositionalAudio>> = {};

export function addAudioToObject(
  obj: THREE.Object3D,
  soundName: string,
  distance = 0.5,
  looping = false,
) {
  const sound = new THREE.PositionalAudio(listener);
  const audioLoader = new THREE.AudioLoader();
  audioLoader.load(`src/assets/audio/${soundName}.mp3`, function (buffer) {
    sound.setBuffer(buffer);
    sound.setRefDistance(distance);
    sound.setLoop(looping);

    if (!sounds[obj.name]) sounds[obj.name] = {};
    sounds[obj.name][soundName] = sound;
  });
  obj.add(sound);
}

export async function stopAudio(objName: string, soundName: string) {
  const sound = sounds[objName]?.[soundName];
  sound.stop();
}

export async function playAudio(
  objName: string,
  soundName: string,
  delay = 0,
  offset = 0,
) {
  if (!enabled) return;
  await pause(delay);

  const sound = sounds[objName]?.[soundName];
  if (sound.isPlaying) sound.stop();

  sound.offset = offset;
  sound.setDetune(Math.random() * 100);
  sound.play();
}
