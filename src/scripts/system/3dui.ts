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
div.style.pointerEvents = "none";
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
  isScreen = false,
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
    blending: THREE.NoBlending,
    opacity: 0,
    premultipliedAlpha: true,
    side: THREE.DoubleSide,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.castShadow = true;

  const shadowMaterial = new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    transparent: true,
    depthWrite: false,
  });
  if (isScreen) {
    shadowMaterial.metalness = 0.65;
    shadowMaterial.roughness = 0.65;
    shadowMaterial.emissive = new THREE.Color(1, 1, 1);
    shadowMaterial.emissiveIntensity = 0.8;
  }

  shadowMaterial.onBeforeCompile = (shader) => {
    shadowMaterial.userData.shader = shader;
    shader.fragmentShader = shader.fragmentShader.replace(
      "#include <opaque_fragment>",
      isScreen
        ? `
        float lum = dot(outgoingLight, vec3(0.2126, 0.7152, 0.0722));
        float dark = clamp(1.0 - lum, 0.0, 1.0);
        gl_FragColor = vec4(outgoingLight, dark);
      `
        : `
        float lum = dot(outgoingLight, vec3(0.2126, 0.7152, 0.0722));
        float dark = clamp(1.0 - lum, 0.0, 1.0);
        gl_FragColor = vec4(0.0, 0.0, 0.0, dark);
      `,
    );
  };

  const shadowMesh = new THREE.Mesh(geometry, shadowMaterial);
  shadowMesh.receiveShadow = true;
  shadowMesh.renderOrder = 1;
  shadowMesh.name = "shadow";
  mesh.add(shadowMesh);

  parent.add(mesh);
  parent.add(obj);

  mesh.userData.ui = obj;

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

const uiPos = new THREE.Vector3(),
  uiRot = new THREE.Quaternion(),
  updateUIs: THREE.Object3D[] = [];

export function addUpdateUI(obj: THREE.Object3D) {
  if (!updateUIs.includes(obj)) updateUIs.push(obj);
}

export function updateUIPosRot() {
  for (const updateUI of updateUIs) {
    updateUI.getWorldPosition(uiPos);
    updateUI.getWorldQuaternion(uiRot);

    updateUI.userData.ui.position.copy(uiPos);
    updateUI.userData.ui.quaternion.copy(uiRot);
  }
}
