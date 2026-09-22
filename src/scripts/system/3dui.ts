import * as THREE from "three";
import {
  CSS3DObject,
  CSS3DRenderer,
} from "three/examples/jsm/renderers/CSS3DRenderer.js";

const SCALE = 0.001625;

const cssRenderer = new CSS3DRenderer();
cssRenderer.setSize(window.innerWidth, window.innerHeight);

const div = cssRenderer.domElement;
div.style.position = "absolute";
div.style.top = "0";
document.body.appendChild(div);

const overlayCssRenderer = new CSS3DRenderer();
overlayCssRenderer.setSize(window.innerWidth, window.innerHeight);

const overlayDiv = overlayCssRenderer.domElement;
overlayDiv.style.position = "absolute";
overlayDiv.style.top = "0";
overlayDiv.style.pointerEvents = "none";
overlayDiv.style.zIndex = "2";
document.body.appendChild(overlayDiv);

const overlayScene = new THREE.Scene();

export function createUI(
  parent: THREE.Object3D,
  el: HTMLElement,
  scale: number = 1,
  overlay = false,
) {
  el.style.backfaceVisibility = "hidden";

  const obj = new CSS3DObject(el);
  obj.scale.setScalar(SCALE * scale);

  el.style.visibility = "hidden";
  document.body.appendChild(el);
  const rect = el.getBoundingClientRect();
  document.body.removeChild(el);
  el.style.visibility = "visible";

  if (overlay) {
    obj.visible = false;
    overlayScene.add(obj);
    return { obj: obj, rect: rect };
  }

  const geometry = new THREE.PlaneGeometry(
    rect.width * SCALE * scale,
    rect.height * SCALE * scale,
  );
  const material = new THREE.MeshBasicMaterial({
    color: 0xff0000,
    blending: THREE.NoBlending,
    opacity: 0,
    premultipliedAlpha: true,
  });
  const mesh = new THREE.Mesh(geometry, material);

  parent.add(mesh);
  parent.add(obj);

  return { mesh: mesh, obj: obj };
}

export function update3DUI(
  scene: THREE.Scene,
  camera: THREE.PerspectiveCamera,
) {
  cssRenderer.render(scene, camera);
  overlayCssRenderer.render(overlayScene, camera);
}

export function resize3DUI() {
  cssRenderer.setSize(window.innerWidth, window.innerHeight);
  overlayCssRenderer.setSize(window.innerWidth, window.innerHeight);
}
