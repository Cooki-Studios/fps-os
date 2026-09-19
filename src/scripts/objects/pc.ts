import * as THREE from "three";
import {
  CSS3DObject,
  CSS3DRenderer,
} from "three/addons/renderers/CSS3DRenderer.js";
import { onActionPressed } from "../system/input";

let monitor: THREE.Object3D;

const cssRenderer = new CSS3DRenderer();
cssRenderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(cssRenderer.domElement);

export function setMonitor(obj: THREE.Object3D) {
  monitor = obj;
}

const SCALE = 0.001625,
  rotation = new THREE.Euler(-Math.PI / 36, -Math.PI / 2, 0, "YXZ"),
  offset = new THREE.Vector3(0.045, 1.03, 0);

export function initMonitor(scene: THREE.Scene) {
  const pos = new THREE.Vector3();
  monitor.getWorldPosition(pos);

  const geometry = new THREE.PlaneGeometry(1024 * SCALE, 768 * SCALE);
  const material = new THREE.MeshBasicMaterial({
    color: 0xff0000,
    blending: THREE.NoBlending,
    opacity: 0,
    premultipliedAlpha: true,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(pos.x + offset.x, pos.y + offset.y, pos.z + offset.z);
  mesh.rotation.set(rotation.x, rotation.y, rotation.z, rotation.order);
  mesh.visible = false;

  const iframe = document.createElement("iframe");
  iframe.style.width = "1024px";
  iframe.style.height = "768px";
  iframe.style.backfaceVisibility = "hidden";
  iframe.src = "https://google.com/search?igu=1";

  const div = cssRenderer.domElement;
  div.style.position = "absolute";
  div.style.top = "0";

  const obj = new CSS3DObject(iframe);
  obj.position.set(pos.x + offset.x, pos.y + offset.y, pos.z + offset.z);
  obj.rotation.set(rotation.x, rotation.y, rotation.z, rotation.order);
  obj.scale.setScalar(SCALE);

  scene.add(mesh);
  scene.add(obj);

  onActionPressed("debug", () => {
    mesh.visible = !mesh.visible;
  });
}

export function updateMonitor(
  scene: THREE.Scene,
  camera: THREE.PerspectiveCamera,
) {
  cssRenderer.render(scene, camera);
}

export function resizeMonitor() {
  cssRenderer.setSize(window.innerWidth, window.innerHeight);
}
