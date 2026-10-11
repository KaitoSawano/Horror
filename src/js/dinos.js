import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';
import { getHeight } from './noise.js';

const dinos = [];
let dinoTemplate = null;
let dinoAnimations = [];
let loaded = false;

const SPAWN_CONFIG = {
  minDistance: 150,
  maxDistance: 400,
  despawnDistance: 800,
  maxDinos: 2,
  spawnInterval: 20,
  minLandHeight: 3,
  maxLandHeight: 30,
  targetHeight: 5,        // ← dikecilin dari 8 ke 5
  rotateSpeed: 1.0,
  footOffset: 0,
  walkSpeed: 1.0,         // ← lambat biar sinkron sama animasi
  walkAnimSpeed: 0.6      // ← animasi jalan diperlambat
};

export function loadDinoModel(onLoaded) {
  const loader = new GLTFLoader();
  loader.load(
    'assets/models/apatosaur.glb',
    (gltf) => {
      dinoTemplate = gltf.scene;
      dinoAnimations = gltf.animations;

      console.log('[DINO] Loaded! Animations:', dinoAnimations.length);
      dinoAnimations.forEach((clip, i) => {
        console.log(`[DINO] Anim ${i}: ${clip.name} (${clip.duration.toFixed(2)}s)`);
      });

      const box = new THREE.Box3().setFromObject(dinoTemplate);
      const size = box.getSize(new THREE.Vector3());
      console.log('[DINO] Original size:', size.x.toFixed(2), size.y.toFixed(2), size.z.toFixed(2));

      loaded = true;
      if (onLoaded) onLoaded();
    },
    undefined,
    (err) => console.error('Gagal load apatosaur.glb:', err)
  );
}

export function isDinoLoaded() { return loaded; }

export function spawnDino(x, z, scene) {
  if (!dinoTemplate) return null;
  const h = getHeight(x, z);
  if (h < SPAWN_CONFIG.minLandHeight || h > SPAWN_CONFIG.maxLandHeight) return null;

  const model = SkeletonUtils.clone(dinoTemplate);

  const box = new THREE.Box3().setFromObject(model);
  const size = box.getSize(new THREE.Vector3());
  const maxDim = Math.max(size.x, size.y, size.z);
  const autoScale = SPAWN_CONFIG.targetHeight / maxDim;
  model.scale.set(autoScale, autoScale, autoScale);

  model.traverse((child) => {
    if (child.isMesh) {
      child.visible = true;
      child.frustumCulled = false;
    }
  });

  // === SETUP ANIMASI ===
  const mixer = new THREE.AnimationMixer(model);
  const actions = [];
  dinoAnimations.forEach((clip) => {
    actions.push(mixer.clipAction(clip));
  });

  const animIdle = actions[0] || null;   // anim 1: diam
  const animWalk = actions[3] || null;   // anim 4: jalan

  // Perlambat animasi walk
  if (animWalk) {
    animWalk.timeScale = SPAWN_CONFIG.walkAnimSpeed;
  }

  // Play walk dulu biar animasi "masuk", baru hitung offset
  if (animWalk) {
    animWalk.play();
    animWalk.setLoop(THREE.LoopRepeat);
  }
  mixer.update(0.1);  // update dikit biar animasi masuk
  mixer.update(0.1);

  // Hitung offset SETELAH animasi walk
  const boxAfterAnim = new THREE.Box3().setFromObject(model);
  const minYAfterAnim = boxAfterAnim.min.y;
  const yOffset = -minYAfterAnim + SPAWN_CONFIG.footOffset;

  // Balikin ke idle
  if (animWalk) animWalk.stop();
  if (animIdle) {
    animIdle.play();
    animIdle.setLoop(THREE.LoopRepeat);
  }

  const initialRot = Math.random() * Math.PI * 2;
  model.position.set(x, h + yOffset, z);
  model.rotation.y = initialRot;
  scene.add(model);

  console.log('[DINO] MinY after anim:', minYAfterAnim.toFixed(2), '| Y offset:', yOffset.toFixed(2));

  const dino = {
    model, mixer,
    actions: { idle: animIdle, walk: animWalk },
    currentAction: 'walk',
    x, z, y: h,
    yOffset: yOffset,
    targetRotation: initialRot,
    state: 'walk',
    speed: SPAWN_CONFIG.walkSpeed,
    hp: 50,
    maxHp: 50,
    lastAttackTime: 0,
    attackCooldown: 2000,
    patrolAngle: initialRot,
    patrolTimer: 0
  };

  dinos.push(dino);
  return dino;
}

let spawnTimer = 0;

export function autoSpawnDinos(player, scene, delta) {
  if (!loaded) return;
  spawnTimer -= delta;
  if (spawnTimer > 0) return;
  spawnTimer = SPAWN_CONFIG.spawnInterval;

  const aliveDinos = dinos.filter(d => d.state !== 'dead');
  if (aliveDinos.length >= SPAWN_CONFIG.maxDinos) return;

  for (let attempt = 0; attempt < 30; attempt++) {
    const angle = Math.random() * Math.PI * 2;
    const dist = SPAWN_CONFIG.minDistance + Math.random() * (SPAWN_CONFIG.maxDistance - SPAWN_CONFIG.minDistance);
    const x = player.x + Math.cos(angle) * dist;
    const z = player.z + Math.sin(angle) * dist;

    const h = getHeight(x, z);
    if (h < SPAWN_CONFIG.minLandHeight || h > SPAWN_CONFIG.maxLandHeight) continue;

    const dino = spawnDino(x, z, scene);
    if (dino) break;
  }
}

export function despawnFarDinos(player, scene) {
  for (let i = dinos.length - 1; i >= 0; i--) {
    const dino = dinos[i];
    const dist = Math.hypot(dino.x - player.x, dino.z - player.z);
    if (dist > SPAWN_CONFIG.despawnDistance) {
      scene.remove(dino.model);
      dinos.splice(i, 1);
    }
  }
}

function setAction(dino, actionName) {
  if (dino.currentAction === actionName) return;
  const action = dino.actions[actionName];
  if (!action) return;
  const oldAction = dino.actions[dino.currentAction];
  if (oldAction) oldAction.fadeOut(0.3);
  action.reset().fadeIn(0.3).play();
  dino.currentAction = actionName;
}

function lerpAngle(current, target, t) {
  let diff = target - current;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  return current + diff * t;
}

export function updateDinos(player, delta, onAttackPlayer) {
  for (const dino of dinos) {
    if (dino.state === 'dead') {
      dino.mixer.update(delta);
      continue;
    }

    dino.mixer.update(delta);

    const dx = player.x - dino.x;
    const dz = player.z - dino.z;
    const dist = Math.hypot(dx, dz);

    if (dist < 12) {
      if (dist < 2.5) {
        dino.state = 'attack';
        setAction(dino, 'idle');
        const now = performance.now();
        if (now - dino.lastAttackTime > dino.attackCooldown) {
          dino.lastAttackTime = now;
          if (onAttackPlayer) onAttackPlayer(15);
        }
      } else {
        dino.state = 'chase';
        setAction(dino, 'walk');
        const angle = Math.atan2(dx, dz);
        dino.x += Math.sin(angle) * dino.speed * 1.5 * delta;
        dino.z += Math.cos(angle) * dino.speed * 1.5 * delta;
        dino.targetRotation = angle;
      }
    } else {
      dino.patrolTimer -= delta;
      if (dino.patrolTimer <= 0) {
        dino.patrolTimer = 15 + Math.random() * 15;
        dino.patrolAngle = Math.random() * Math.PI * 2;
      }
      dino.state = 'walk';
      setAction(dino, 'walk');
      dino.x += Math.sin(dino.patrolAngle) * dino.speed * delta;
      dino.z += Math.cos(dino.patrolAngle) * dino.speed * delta;
      dino.targetRotation = dino.patrolAngle;
    }

    dino.model.rotation.y = lerpAngle(
      dino.model.rotation.y,
      dino.targetRotation,
      Math.min(1, SPAWN_CONFIG.rotateSpeed * delta)
    );

    // Kaki napak tanah — pakai offset tetap
    dino.y = getHeight(dino.x, dino.z);
    dino.model.position.set(dino.x, dino.y + dino.yOffset, dino.z);
  }
}

export function damageDino(dino, amount) {
  if (dino.state === 'dead') return;
  dino.hp -= amount;
  if (dino.hp <= 0) {
    dino.state = 'dead';
    setTimeout(() => { dino.model.visible = false; }, 1000);
  }
}

export function getDinos() { return dinos; }
