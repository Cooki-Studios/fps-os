import * as THREE from "three";
import { isMobile } from "../util/mobile";
import {
  playAnimation,
  playAnimationReversed,
  stopAnimation,
} from "../system/animation";
import { onActionPressed } from "../system/input";
import { addAudioToObject, playAudio, stopAudio } from "../system/audio";

let intensity: number,
  spotLight: THREE.SpotLight,
  mat: THREE.MeshPhysicalMaterial,
  lightHelper: THREE.SpotLightHelper;

export function setupMainLight(light: THREE.PointLight, scene: THREE.Scene) {
  intensity = light.intensity;

  spotLight = new THREE.SpotLight(light.color, 0, 0, Math.PI / 2.5, 0.25);
  spotLight.position.copy(light.position);
  spotLight.rotation.copy(light.rotation);

  const target = new THREE.Object3D();
  target.position.set(0, 0, -8.5);
  spotLight.target = target;

  const parent = light.parent;
  if (!parent) return;
  parent.add(spotLight);
  parent.remove(light);

  spotLight.shadow.mapSize.setScalar(isMobile ? 512 : 2048);
  spotLight.shadow.radius = 2.5;
  spotLight.castShadow = true;

  const mesh = parent.parent!.getObjectByName("N_Light") as THREE.Mesh;
  mat = mesh.material as THREE.MeshPhysicalMaterial;
  mat.emissiveIntensity = 0;

  spotLight.name = "MainLight";
  addAudioToObject(spotLight, "light-buzz", 1, true);

  lightHelper = new THREE.SpotLightHelper(spotLight, 0.5);
  lightHelper.visible = false;
  scene.add(lightHelper);

  onActionPressed("debug", () => {
    lightHelper.visible = !lightHelper.visible;
  });
}

let lighting = false;
export function toggleLight() {
  if (lighting) {
    playAnimationReversed(1);
    playAudio("Switch_003", "light-off", 200);
    stopAudio(spotLight.name, "light-buzz");
  } else {
    stopAnimation(1);
    playAnimation(1);
    playAudio("Switch_003", "light-on");
    playAudio(spotLight.name, "light-buzz", 200, 0, 1, false);
  }

  setTimeout(() => {
    spotLight.intensity = spotLight.intensity == 0 ? intensity : 0;
    mat.emissiveIntensity = mat.emissiveIntensity == 0 ? 1 : 0;

    lighting = !lighting;
  }, 100);
}

export function disableLight() {
  spotLight.parent?.remove(spotLight);
  lightHelper.parent?.remove(lightHelper);
}
