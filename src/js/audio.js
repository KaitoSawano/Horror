import * as THREE from 'three';

let listener = null;
let audioLoader = null;
let footstepSound = null;
let audioUnlocked = false;

export function initAudio(camera) {
  listener = new THREE.AudioListener();
  camera.add(listener);
  audioLoader = new THREE.AudioLoader();

  footstepSound = new THREE.Audio(listener);
  audioLoader.load('assets/sounds/footsteps.mp3', (buffer) => {
    footstepSound.setBuffer(buffer);
    footstepSound.setVolume(0.5);
  });
}

export function unlockAudio() {
  if (audioUnlocked || !listener) return;
  const ctx = listener.context;
  if (ctx.state === 'suspended') {
    ctx.resume().then(() => { audioUnlocked = true; });
  } else {
    audioUnlocked = true;
  }
}

export function getFootstepSound() {
  return footstepSound;
}
