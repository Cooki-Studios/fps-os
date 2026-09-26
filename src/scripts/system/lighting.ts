import * as THREE from "three";
import { CSM } from "three/addons/csm/CSM.js";
import { CSMHelper } from "three/addons/csm/CSMHelper.js";
import { bootLog } from "../boot";
import { isMobile } from "../util/mobile";
import { setSkyLightLevel, setSkyOffset } from "./renderer";

let csm: CSM | undefined,
  csmHelper: CSMHelper | undefined,
  ambientLight: THREE.AmbientLight,
  hemisphereLight: THREE.HemisphereLight;

export function initLighting(
  scene: THREE.Scene,
  camera: THREE.PerspectiveCamera,
  debug = false,
) {
  ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
  scene.add(ambientLight);

  hemisphereLight = new THREE.HemisphereLight(0x87ceeb, 0xffa500, 0.5);
  scene.add(hemisphereLight);

  csm = new CSM({
    maxFar: 50,
    mode: "practical",
    parent: scene,
    shadowMapSize: isMobile ? 512 : 2048,
    lightDirection: new THREE.Vector3(-1, -1, -1).normalize(),
    lightIntensity: 2,
    camera: camera,
  });
  csm.fade = true;
  csm.lights.forEach((light) => {
    light.shadow.radius = 2.5;
    light.shadow.intensity = 0.8;
  });

  if (debug) {
    csmHelper = new CSMHelper(csm);
    csmHelper.visible = true;
    scene.add(csmHelper);
  }

  bootLog("Lighting initialised");
}

export function setLightLevel(intensity = 1) {
  ambientLight.intensity = 0.5 * intensity;
  hemisphereLight.intensity = 0.5 * intensity;
  setSkyLightLevel(intensity);
}

let angle = 0;
const phaseOffset = -Math.PI / 1.5;

export function updateCSM(delta: number) {
  if (csm) {
    angle += delta * 0.001;

    csm.lightDirection
      .set(Math.cos(-angle + phaseOffset), -1, Math.sin(-angle + phaseOffset))
      .normalize();
    setSkyOffset(angle - 0.7);
    csm.update();
  }
  if (csmHelper) csmHelper.update();
}

export function setupShadowMaterial(mat: THREE.MeshPhysicalMaterial) {
  if (csm) csm.setupMaterial(mat);
}
