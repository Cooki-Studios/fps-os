import * as THREE from "three";

const mixers: THREE.AnimationMixer[] = [],
  actions: THREE.AnimationAction[] = [];

export function setupAnimation(
  mesh: THREE.Object3D,
  clip: THREE.AnimationClip,
  name: string,
  durationMul = 1,
) {
  const tracks = clip.tracks.filter((track) => track.name.startsWith(name));
  const splitClip = new THREE.AnimationClip(
    name,
    clip.duration * durationMul,
    tracks,
  );

  const mixer = new THREE.AnimationMixer(mesh);
  const action = mixer.clipAction(splitClip);
  action.loop = THREE.LoopOnce;
  action.clampWhenFinished = true;

  mixers.push(mixer);
  actions.push(action);
}

export function playAnimation(id = 0) {
  actions[id].timeScale = 1;
  actions[id].play();
}

export function playAnimationReversed(id = 0) {
  actions[id].stop();
  actions[id].time = actions[id].getClip().duration;
  actions[id].timeScale = -1;
  actions[id].play();
}

export function stopAnimation(id = 0) {
  actions[id].stop();
}

export function getAnimationTime(id = 0) {
  return actions[id].time;
}

export function updateAnimation(delta: number) {
  for (const mixer of mixers) mixer.update(delta);
}
