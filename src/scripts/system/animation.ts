import * as THREE from "three";

const mixers: THREE.AnimationMixer[] = [],
  actions: THREE.AnimationAction[] = [];

export function setupAnimation(
  mesh: THREE.Object3D,
  clip: THREE.AnimationClip,
) {
  const mixer = new THREE.AnimationMixer(mesh);
  const action = mixer.clipAction(clip);
  action.loop = THREE.LoopOnce;
  action.clampWhenFinished = false;

  mixers.push(mixer);
  actions.push(action);
}

export function playAnimation(id = 0) {
  actions[id].play();
}

export function updateAnimation(delta: number) {
  for (const mixer of mixers) mixer.update(delta);
}
