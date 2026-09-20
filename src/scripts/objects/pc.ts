import * as THREE from "three";
import { onActionPressed } from "../system/input";
import { createUI } from "../system/3dui";

let monitor: THREE.Object3D;

export function setMonitor(obj: THREE.Object3D) {
  monitor = obj;
}

const rotation = new THREE.Euler(-Math.PI / 36, -Math.PI / 2, 0, "YXZ"),
  offset = new THREE.Vector3(0.0515, 1.03325, 0);

export function initMonitor(scene: THREE.Scene) {
  const pos = new THREE.Vector3();
  monitor.getWorldPosition(pos);

  const WIDTH = 1028,
    HEIGHT = 769;

  const iframe = document.createElement("iframe");
  iframe.style.width = `${WIDTH}px`;
  iframe.style.height = `${HEIGHT}px`;
  iframe.src = "https://google.com/search?igu=1";

  const { mesh, obj } = createUI(scene, iframe);
  if (!mesh) return;

  mesh.position.copy(pos.add(offset));
  mesh.rotation.copy(rotation);
  mesh.visible = false;

  obj.position.copy(pos);
  obj.rotation.copy(rotation);

  onActionPressed("debug", () => {
    mesh.visible = !mesh.visible;
  });
}
