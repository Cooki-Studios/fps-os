import * as THREE from "three";
import { DecalGeometry } from "three/addons/geometries/DecalGeometry.js";
import { addVelocityToObject, pausePhysicsOfObject } from "../system/physics";
import { type Intersect } from "../system/interact";
import { clamp } from "./player";
import { addAudioToObject, playAudio } from "../system/audio";

let gun: THREE.Object3D,
  pickedUp = false;

export async function setGun(obj: THREE.Object3D) {
  gun = obj;

  await addAudioToObject(gun, "gun-shoot", 0.25);
  await addAudioToObject(gun, "gun-reload", 0.5);
}

const image = new Image();
const texture = new THREE.Texture(image);
image.addEventListener("load", () => {
  texture.needsUpdate = true;
});
image.src = "textures/T_MetalImpact_H.webp";

const gunRot = new THREE.Euler(
  Math.PI * 1.05,
  -Math.PI / 1.75,
  -Math.PI * 0.05,
);

export function pickupGun(camera: THREE.PerspectiveCamera) {
  const mesh = gun.children[0] as THREE.Mesh;
  pausePhysicsOfObject(mesh, mesh.userData.body);

  camera.attach(gun);
  gun.position.set(0.75, -0.75, -1);
  gun.rotation.copy(gunRot);

  pickedUp = true;
}

const RECOIL = 0.025,
  POWER = 20;

let recoilX = 0,
  recoilY = 0;

const holeMat = new THREE.MeshStandardMaterial({
  color: new THREE.Color(0, 0, 0),
  alphaMap: texture,
  transparent: true,
  depthTest: true,
  depthWrite: false,
  polygonOffset: true,
  polygonOffsetFactor: -1,
  polygonOffsetUnits: -1,
});

let bullets = 5,
  cooldown = false;

export function shootGun(intersect: Intersect) {
  if (cooldown) return;

  if (bullets == 0) {
    bullets = -1;
    setTimeout(() => {
      playAudio(gun.name, "gun-reload");
      setTimeout(() => (bullets = 5), 500);
    }, 500);
    return;
  } else if (bullets > 0) bullets--;
  else return;

  playAudio(gun.name, "gun-shoot");

  cooldown = true;
  setTimeout(() => (cooldown = false), 100);

  recoilX += (Math.random() - 0.5) * RECOIL;
  recoilY += RECOIL;

  if (!intersect?.i.normal) return;

  const obj = intersect?.obj;
  if (!obj) return;

  const mesh = obj.children[0] as THREE.Mesh;
  if (!mesh) return;

  if (!mesh.userData.body) {
    addBulletHole(mesh, intersect);
    return;
  } else if (!intersect.i.object.userData.body) {
    addBulletHole(intersect.i.object as THREE.Mesh, intersect);

    const vel = intersect.ray.direction.clone().multiplyScalar(POWER);
    addVelocityToObject(mesh, vel);

    return;
  }

  const vel = intersect.ray.direction.clone().multiplyScalar(POWER);
  addVelocityToObject(mesh, vel);

  addBulletHole(mesh, intersect);
}

function addBulletHole(obj: THREE.Mesh, intersect: Intersect) {
  if (!intersect || !intersect.i.normal) return;

  const n = intersect.i.normal
    .clone()
    .transformDirection(intersect.i.object.matrixWorld);

  const helper = new THREE.Object3D();
  helper.position.copy(intersect.i.point);
  helper.lookAt(intersect.i.point.clone().add(n));
  const orientation = helper.rotation;

  const holeGeo = new DecalGeometry(
    obj,
    intersect.i.point,
    orientation,
    new THREE.Vector3(0.25, 0.25, 0.25),
  );

  const hole = new THREE.Mesh(holeGeo, holeMat);
  obj.attach(hole);
}

export function updateRecoil(camera: THREE.PerspectiveCamera) {
  if (!pickedUp) return;

  camera.rotation.y += recoilX * 0.5;
  camera.rotation.x = clamp(
    camera.rotation.x + recoilY * 0.5,
    -Math.PI / 2,
    Math.PI / 2,
  );

  gun.rotation.y = gunRot.y + recoilX * 10;
  gun.rotation.x = gunRot.x + recoilY * 10;

  recoilX *= 0.5;
  recoilY *= 0.5;
}
