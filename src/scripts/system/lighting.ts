import * as THREE from "three";
import { CSM } from "three/addons/csm/CSM.js";
import { CSMHelper } from "three/addons/csm/CSMHelper.js";
import { bootLog } from "../boot";
import { isMobile } from "../util/mobile";

let csm: CSM | undefined, csmHelper: CSMHelper | undefined;

export function initLighting(
  scene: THREE.Scene,
  camera: THREE.PerspectiveCamera,
  debug = false,
) {
  const ambientLight = new THREE.AmbientLight(0xffffff, 3);
  scene.add(ambientLight);

  csm = new CSM({
    maxFar: 50,
    mode: "practical",
    parent: scene,
    shadowMapSize: isMobile ? 512 : 2048,
    lightDirection: new THREE.Vector3(-1, -2, -1).normalize(),
    lightIntensity: 2,
    camera: camera,
  });
  csm.fade = true;
  csm.lights.forEach((light) => {
    light.shadow.radius = 2.5;
    light.shadow.intensity = 0.55;
    light.shadow.normalBias = isMobile ? -0.08 : -0.04;
  });

  if (debug) {
    csmHelper = new CSMHelper(csm);
    csmHelper.visible = true;
    scene.add(csmHelper);
  }

  bootLog("Lighting initialised");
}

export function updateCSM() {
  if (csm) csm.update();
  if (csmHelper) csmHelper.update();
}

export function setupShadowMaterial(mat: THREE.MeshPhysicalMaterial) {
  if (csm) csm.setupMaterial(mat);
}
