// Sound Effects by freesound_community from Pixabay
import * as THREE from "three";
import { pause } from "./pause";
import { bootLog } from "../boot";

const listener = new THREE.AudioListener();
const audioEl = document.getElementById("audio") as HTMLDivElement;
let enabled = false;

const loopedSounds = new Set<THREE.PositionalAudio>();

if (localStorage.getItem("audio")) {
  audioEl.classList.add("unmuted");
  enabled = true;
}

audioEl.onclick = () => {
  audioEl.classList.toggle("unmuted");
  enabled = audioEl.classList.contains("unmuted");
  if (localStorage.getItem("audio")) localStorage.removeItem("audio");
  else localStorage.setItem("audio", "true");

  loopedSounds.forEach((sound) => {
    if (enabled) sound.play();
    else sound.pause();
  });
};

export function enableAudioEl(enable = true) {
  audioEl.style.display = enable ? "block" : "none";
}

export function initAudio(camera: THREE.Camera) {
  camera.add(listener);
}

const sounds: Record<string, Record<string, THREE.PositionalAudio>> = {};

export async function addAudioToObject(
  obj: THREE.Object3D,
  soundName: string,
  distance = 0.5,
  looping = false,
  speed = 1,
  buffer?: AudioBuffer,
) {
  const sound = new THREE.PositionalAudio(listener);

  if (buffer) sound.setBuffer(buffer);
  else {
    sound.setBuffer(await loadBuffer(soundName));
  }

  sound.setRefDistance(distance);
  sound.setLoop(looping);
  sound.setPlaybackRate(speed);

  if (!sounds[obj.name]) sounds[obj.name] = {};
  sounds[obj.name][soundName] = sound;

  obj.add(sound);
}

export async function loadBuffer(soundName: string) {
  bootLog("Loading sound: " + soundName);
  const audioLoader = new THREE.AudioLoader();
  return audioLoader.loadAsync(`audio/${soundName}.mp3`);
}

export function isAudioPlaying(objName: string, soundName: string) {
  const sound = sounds[objName]?.[soundName];
  return sound.isPlaying;
}

export function setAudioVolume(objName: string, soundName: string, volume = 1) {
  const sound = sounds[objName]?.[soundName];
  return sound.setVolume(volume);
}

export async function stopAudio(objName: string, soundName: string) {
  const sound = sounds[objName]?.[soundName];
  if (sound) sound.stop();
}

export async function playAudio(
  objName: string,
  soundName: string,
  delay = 0,
  offset = 0,
  volume: number | null = 1,
  randomise = true,
) {
  if (!enabled) return;
  await pause(delay);

  const sound = sounds[objName]?.[soundName];
  if (!sound) return;

  if (sound.loop) loopedSounds.add(sound);
  if (sound.isPlaying) sound.stop();

  sound.offset = offset;
  if (volume != null) sound.setVolume(volume);
  if (randomise) sound.setDetune(Math.random() * 100);
  sound.play();
}
