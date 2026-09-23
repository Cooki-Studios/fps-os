import * as THREE from "three";

let hourParts: Record<string, THREE.Object3D> = {};

export function setClock(obj: THREE.Object3D, part: "hour" | "min" | "sec") {
  hourParts[part] = obj;
}

export function updateClock() {
  const date = new Date();

  const hours = (date.getHours() % 12) + date.getMinutes() / 60,
    mins = date.getMinutes() + date.getSeconds() / 60,
    secs = date.getSeconds();

  hourParts["hour"].rotation.x = -hours * (Math.PI / 6);
  hourParts["min"].rotation.x = -mins * (Math.PI / 30);
  hourParts["sec"].rotation.x = -secs * (Math.PI / 30);
}
