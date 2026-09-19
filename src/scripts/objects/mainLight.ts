import * as THREE from "three";
import { isMobile } from "../util/mobile";
import { onActionPressed } from "../system/input";

export function setupMainLight(light: THREE.PointLight, scene: THREE.Scene) {
  const intensity = light.intensity;

  const spotLight = new THREE.SpotLight(light.color, 0);
  spotLight.position.copy(light.position);
  spotLight.rotation.copy(light.rotation);

  const target = new THREE.Object3D();
  target.position.set(0, 0, -8.5);
  spotLight.target = target;

  spotLight.angle = Math.PI / 3;
  spotLight.penumbra = 0.5;

  const parent = light.parent;
  if (!parent) return;
  parent.add(spotLight);
  parent.remove(light);

  spotLight.shadow.mapSize.setScalar(isMobile ? 512 : 2048);
  spotLight.shadow.radius = 2.5;
  spotLight.castShadow = true;

  const mesh = parent.parent!.getObjectByName("N_Light") as THREE.Mesh;
  const mat = mesh.material as THREE.MeshPhysicalMaterial;
  mat.emissiveIntensity = 0;

  const lightHelper = new THREE.SpotLightHelper(spotLight, 0.5);
  lightHelper.visible = false;
  scene.add(lightHelper);

  onActionPressed("debug", () => {
    spotLight.intensity = spotLight.intensity == 0 ? intensity : 0;
    mat.emissiveIntensity = mat.emissiveIntensity == 0 ? 1 : 0;

    lightHelper.visible = !lightHelper.visible;
  });
}
