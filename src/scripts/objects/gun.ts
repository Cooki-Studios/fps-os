import * as THREE from "three";
import { DecalGeometry } from "three/addons/geometries/DecalGeometry.js";
import {
  addVelocityToObject,
  pausePhysicsOfObject,
  resumePhysicsOfObject,
} from "../system/physics";
import { getGrabVel, type Intersect } from "../system/interact";
import { clamp } from "./player";
import { addAudioToObject, playAudio } from "../system/audio";
import { getMainCam, getMainScene } from "../util/scene";

let gun: THREE.Object3D,
  pickedUp = false,
  bullets = 5,
  cooldown = false;

const ammoEl = document.getElementById("ammo") as HTMLDivElement;

function reloadBulletEl() {
  for (let i = 0; i < bullets; i++) {
    const bulletEl = document.createElement("div");
    bulletEl.className = "bullet";

    ammoEl.appendChild(bulletEl);
  }
}
reloadBulletEl();

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

  ammoEl.style.visibility = "visible";
}

export function dropGun() {
  ammoEl.style.visibility = "hidden";

  const vel = new THREE.Vector3(0, 0.25, -0.5)
    .transformDirection(getMainCam().matrixWorld)
    .multiplyScalar(5);

  const mesh = gun.children[0] as THREE.Mesh;
  resumePhysicsOfObject(mesh, mesh.userData.body, vel.add(getGrabVel()));

  getMainScene().attach(gun);

  pickedUp = false;
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

export function shootGun(intersect: Intersect) {
  if (cooldown) return false;

  if (bullets > 0) bullets--;
  else return false;

  playAudio(gun.name, "gun-shoot");

  cooldown = true;
  setTimeout(() => (cooldown = false), 100);

  recoilX += (Math.random() - 0.5) * RECOIL;
  recoilY += RECOIL;

  if (!intersect?.i.normal) return false;

  const obj = intersect?.obj;
  if (!obj) return false;

  const mesh = obj.children[0] as THREE.Mesh;
  if (!mesh) return false;

  if (ammoEl.lastChild) ammoEl.removeChild(ammoEl.lastChild);

  if (bullets == 0) {
    bullets = -1;
    setTimeout(() => {
      playAudio(gun.name, "gun-reload");
      setTimeout(() => {
        bullets = 5;
        reloadBulletEl();
      }, 500);
    }, 500);
  }

  if (!mesh.userData.body) {
    addBulletHole(intersect);
    return true;
  } else if (!intersect.i.object.userData.body) {
    addBulletHole(intersect);
    knockObject(mesh, intersect.ray.direction.clone().multiplyScalar(POWER));
    return true;
  }

  addBulletHole(intersect);
  knockObject(mesh, intersect.ray.direction.clone().multiplyScalar(POWER));
  return true;
}

function knockObject(mesh: THREE.Mesh, vel: THREE.Vector3) {
  if (mesh.userData.startPaused) {
    mesh.userData.startPaused = false;
    resumePhysicsOfObject(mesh, mesh.userData.body, vel);
  } else addVelocityToObject(mesh, vel);
}

function addBulletHole(intersect: Intersect) {
  if (!intersect || !intersect.i.normal) return;

  const n = intersect.ray.direction.clone().normalize().negate();

  const helper = new THREE.Object3D();
  helper.position.copy(intersect.i.point);
  helper.lookAt(intersect.i.point.clone().add(n));
  const orientation = helper.rotation;

  const size = new THREE.Vector3(0.25, 0.25, 0.25);
  const box = new THREE.Box3().setFromCenterAndSize(
    intersect.i.point,
    size.clone().multiplyScalar(2),
  );

  const targets: THREE.Mesh[] = [];
  getMainScene().traverse((mesh) => {
    if (
      !(mesh instanceof THREE.Mesh) ||
      mesh.userData.isDecal ||
      mesh.parent === gun
    )
      return;

    if (new THREE.Box3().setFromObject(mesh).intersectsBox(box))
      targets.push(mesh);
  });

  for (const mesh of targets) {
    const hole = new THREE.Mesh(
      new DecalGeometry(mesh, intersect.i.point, orientation, size),
      holeMat,
    );
    hole.userData.isDecal = true;
    mesh.attach(hole);
  }
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
