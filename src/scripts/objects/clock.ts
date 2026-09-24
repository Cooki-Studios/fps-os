import * as THREE from "three";
import { addAudioToObject, playAudio } from "../system/audio";

let clockParts: Record<string, THREE.Object3D> | null = {};

export function setClock(
  obj: THREE.Object3D,
  part: "base" | "hour" | "min" | "sec",
) {
  if (clockParts) clockParts[part] = obj;
  addAudioToObject(obj, "clock-tick", 0.5);
}

let prevSecs = 0,
  prevMins = 0,
  prevHours = 0;

export function updateClock() {
  const date = new Date();

  const hours = (date.getHours() % 12) + date.getMinutes() / 60,
    mins = date.getMinutes() + date.getSeconds() / 60,
    secs = date.getSeconds();

  if (secs != prevSecs) playAudio("Clock_004", "clock-tick");
  if (mins != prevMins) playAudio("Clock_003", "clock-tick");
  if (hours != prevHours) playAudio("Clock_002", "clock-tick");
  prevSecs = secs;
  prevMins = mins;
  prevHours = hours;

  if (clockParts) {
    clockParts["hour"].rotation.x = -hours * (Math.PI / 6);
    clockParts["min"].rotation.x = -mins * (Math.PI / 30);
    clockParts["sec"].rotation.x = -secs * (Math.PI / 30);
  }
}

export function deleteClock() {
  if (clockParts)
    for (const key of Object.keys(clockParts)) {
      const clockPart = clockParts[key];
      clockPart.parent?.remove(clockPart);
      delete clockParts[key];
    }
  clockParts = null;
}
