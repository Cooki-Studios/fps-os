// Sound Effects by freesound_community from Pixabay
import * as THREE from "three";
import { pause } from "./pause";

const listener = new THREE.AudioListener();
const audioEl = document.getElementById("audio") as HTMLDivElement,
  qualityEl = document.getElementById("quality-label") as HTMLDivElement;
let enabled = false;

const loopedSounds = new Set<THREE.Audio<AudioNode>>();
const ctx = listener.context;

const worldPosition = new THREE.Vector3();

function updateMute() {
  listener.setMasterVolume(enabled ? 1 : 0);
}

function playSynced(sound: THREE.Audio<AudioNode>) {
  if (!(sound instanceof THREE.PositionalAudio)) return sound.play();

  sound.updateWorldMatrix(true, false);
  worldPosition.setFromMatrixPosition(sound.matrixWorld);

  const panner = sound.panner;
  const currentTime = ctx.currentTime;
  panner.positionX
    .cancelScheduledValues(currentTime)
    .setValueAtTime(worldPosition.x, currentTime);
  panner.positionY
    .cancelScheduledValues(currentTime)
    .setValueAtTime(worldPosition.y, currentTime);
  panner.positionZ
    .cancelScheduledValues(currentTime)
    .setValueAtTime(worldPosition.z, currentTime);

  sound.play();
}

if (sessionStorage.getItem("audio")) audioEl.classList.add("unmuted");

document.addEventListener(
  "click",
  async () => {
    if (!sessionStorage.getItem("audio")) return;

    enabled = true;
    updateMute();

    if (ctx.state === "suspended") await ctx.resume();

    loopedSounds.forEach((sound) => {
      if (!sound.isPlaying) playSynced(sound);
    });
  },
  { once: true },
);
audioEl.onclick = (e) => {
  e.stopPropagation();

  audioEl.classList.toggle("unmuted");
  enabled = audioEl.classList.contains("unmuted");
  updateMute();

  if (sessionStorage.getItem("audio")) sessionStorage.removeItem("audio");
  else sessionStorage.setItem("audio", "true");

  loopedSounds.forEach((sound) => {
    if (enabled) playSynced(sound);
    else sound.pause();
  });
};

export function enableAudioEl(enable = true) {
  audioEl.style.visibility = enable ? "visible" : "hidden";
  qualityEl.style.visibility = enable ? "visible" : "hidden";
}

export function initAudio(camera: THREE.Camera) {
  camera.add(listener);
}

const sounds: Record<string, Record<string, THREE.Audio<AudioNode>>> = {};

export async function addGlobalAudio(
  soundName: string,
  looping = false,
  speed = 1,
) {
  const sound = new THREE.Audio(listener);
  sound.setBuffer(await loadBuffer(soundName));
  sound.setLoop(looping);
  sound.setPlaybackRate(speed);
  (sounds.global ??= {})[soundName] = sound;
}

export async function addAudioToObject(
  obj: THREE.Object3D,
  soundName: string,
  distance = 0.5,
  looping = false,
  speed = 1,
  pos?: THREE.Vector3,
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

  if (pos) sound.position.copy(pos);

  if (!sounds[obj.name]) sounds[obj.name] = {};
  sounds[obj.name][soundName] = sound;

  obj.add(sound);
}

export async function loadBuffer(soundName: string) {
  // bootLog("Loading sound: " + soundName);
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

export function setAudioSpeed(objName: string, soundName: string, speed = 1) {
  const sound = sounds[objName]?.[soundName];
  return sound.setPlaybackRate(speed);
}

export async function stopAudio(objName: string, soundName: string) {
  const sound = sounds[objName]?.[soundName];
  if (!sound) return;
  loopedSounds.delete(sound);
  sound.stop();
}

export async function playAudio(
  objName: string,
  soundName: string,
  delay = 0,
  offset = 0,
  volume: number | null = 1,
  randomise = true,
) {
  await pause(delay);

  const sound = sounds[objName]?.[soundName];
  if (!sound) return;

  if (sound.loop) loopedSounds.add(sound);
  if (sound.isPlaying) sound.stop();

  sound.offset = offset;
  if (volume != null) sound.setVolume(volume);
  if (randomise) sound.setDetune(Math.random() * 10);

  if (!enabled) return;
  playSynced(sound);
}

const hitSounds: THREE.PositionalAudio[] = [],
  hitBuffers: AudioBuffer[] = [];
let nextHitSound = 0;

export async function initHitSounds(
  scene: THREE.Object3D,
  soundNames: string[],
  count = 8,
) {
  for (const soundName of soundNames)
    hitBuffers.push(await loadBuffer(soundName));

  for (let i = 0; i < count; i++) {
    const sound = new THREE.PositionalAudio(listener);
    sound.setRefDistance(1);
    scene.add(sound);
    hitSounds.push(sound);
  }
}

export function playHitSound(
  x: number,
  y: number,
  z: number,
  volume: number,
  i: number,
) {
  if (!enabled || !hitSounds.length) return;
  const sound = hitSounds[nextHitSound++ % hitSounds.length];
  if (sound.isPlaying) sound.stop();
  sound.setBuffer(hitBuffers[i]);
  sound.position.set(x, y, z);
  sound.setVolume(volume);
  sound.setDetune(Math.random() * 10);
  playSynced(sound);
}
