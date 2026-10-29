import * as THREE from "three";
import { CSM } from "three/addons/csm/CSM.js";
import { CSMHelper } from "three/addons/csm/CSMHelper.js";
import { bootLog } from "../boot";
import { isMobile } from "../util/mobile";
import { setSkyLightLevel, setSkyOffset } from "./renderer";
import { setMainLightMap } from "../objects/mainLight";

let csm: CSM | undefined,
  csmHelper: CSMHelper | undefined,
  ambientLight: THREE.AmbientLight,
  hemisphereLight: THREE.HemisphereLight;

const baseMapSize = isMobile ? 512 : 2048;

export function initLighting(scene: THREE.Scene) {
  ambientLight = new THREE.AmbientLight(0xffffff, 0.25);
  scene.add(ambientLight);

  hemisphereLight = new THREE.HemisphereLight(0x87ceeb, 0xffa500, 0.25);
  scene.add(hemisphereLight);

  bootLog("Lighting initialised");
}

function createCSM(
  scene: THREE.Scene,
  camera: THREE.PerspectiveCamera,
  debug = false,
  dir?: THREE.Vector3,
  quality?: number,
) {
  if (quality == 0 || quality == 1) {
    setMainLightMap(0);
    return;
  }

  const mapSize = quality ? baseMapSize * (quality / 2) : baseMapSize;

  csm = new CSM({
    maxFar: 50,
    mode: "practical",
    parent: scene,
    shadowMapSize: mapSize,
    lightDirection: dir || new THREE.Vector3(-1, -1, -1).normalize(),
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

  setMainLightMap(mapSize);
}

let lightQuality = 0.25;

export function changeCSMQuality(
  scene: THREE.Scene,
  camera: THREE.PerspectiveCamera,
  quality: number,
) {
  const dir = csm?.lightDirection.clone();
  if (csm) {
    csm.lights.forEach((l) => l.shadow.map?.dispose());
    csm.remove();
    csm.dispose();
    csm = undefined;
  }
  if (csmHelper) {
    csmHelper.dispose();
    csmHelper = undefined;
  }

  if (quality == 0) lightQuality = 1;
  else if (quality == 1) lightQuality = 0.5;
  else lightQuality = 0.25;
  ambientLight.intensity = lightQuality;

  createCSM(scene, camera, undefined, dir, quality);
}

export function setLightLevel(intensity = 1) {
  ambientLight.intensity = lightQuality * intensity;
  hemisphereLight.intensity = lightQuality * intensity;
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
    csm.camera.updateMatrixWorld();
    csm.update();
  }
  if (csmHelper) csmHelper.update();
}

export function resizeCSM() {
  csm?.updateFrustums();
}

export function setupShadowMaterial(mat: THREE.MeshPhysicalMaterial) {
  if (csm) csm.setupMaterial(mat);
  mat.needsUpdate = true;
}
