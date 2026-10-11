import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';
import { getHeight } from './noise.js';

const dinos = [];
let dinoTemplate = null;
let dinoAnimations = [];
let loaded = false;

const SPAWN_CONFIG = {
  minDistance: 25,
  maxDistance: 60,
  despawnDistance: 150,
  maxDinos: 4,
  spawnInterval: 5,
  minLandHeight: 3,
  maxLandHeight: 30,
  targetHeight: 8
};

// ===== LOAD MODEL =====
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

      let meshCount = 0, skinnedCount = 0;
      dinoTemplate.traverse((child) => {
        if (child.isMesh) {
          meshCount++;
          if (child.isSkinnedMesh) skinnedCount++;
        }
      });
      console.log('[DINO] Total mesh:', meshCount, '| SkinnedMesh:', skinnedCount);

      loaded = true;
      if (onLoaded) onLoaded();
    },
    undefined,
    (err) => console.error('Gagal load apatosaurus.glb:', err)
  );
}

export function isDinoLoaded() { return loaded; }

// ===== SPAWN DINO =====
export function spawnDino(x, z, scene) {
  if (!dinoTemplate) return null;
  const h = getHeight(x, z);
  if (h < SPAWN_CONFIG.minLandHeight || h > SPAWN_CONFIG.maxLandHeight) return null;

  const model = SkeletonUtils.clone(dinoTemplate);

  // Auto-scale
  const box = new THREE.Box3().setFromObject(model);
  const size = box.getSize(new THREE.Vector3());
  const maxDim = Math.max(size.x, size.y, size.z);
  const autoScale = SPAWN_CONFIG.targetHeight / maxDim;
  model.scale.set(autoScale, autoScale, autoScale);

  console.log('[DINO] Auto-scale:', autoScale.toFixed(3));

  model.traverse((child) => {
    if (child.isMesh) {
      child.visible = true;
      child.frustumCulled = false;
    }
  });

  const boxFinal = new THREE.Box3().setFromObject(model);
  const modelHeight = boxFinal.max.y - boxFinal.min.y;
  const yPos = h + modelHeight / 2;

  model.position.set(x, yPos, z);
  model.rotation.y = Math.random() * Math.PI * 2;
  scene.add(model);

  console.log('[DINO] Model height:', modelHeight.toFixed(2), '| Y:', yPos.toFixed(2));

  // === ANIMASI ===
  const mixer = new THREE.AnimationMixer(model);
  const actions = [];

  dinoAnimations.forEach((clip) => {
    const action = mixer.clipAction(clip);
    actions.push(action);
  });

  // Mapping berdasarkan test:
  // 1 = diam (idle)
  // 4 = jalan (walk)
  // Gak ada attack & death
  const animIdle = actions[0] || null;   // 1
  const animWalk = actions[3] || null;   // 4
  const animAttack = actions[0] || null; // pakai idle (gak ada attack)
  const animDeath = actions[0] || null;  // pakai idle (gak ada death)

  if (animIdle) {
    animIdle.play();
    animIdle.setLoop(THREE.LoopRepeat);
  }

  const dino = {
    model, mixer,
    actions: {
      idle: animIdle,
      walk: animWalk,
      attack: animAttack,
      death: animDeath
    },
    currentAction: 'idle',
    x, z, y: h,
    state: 'idle',
    speed: 1.5,
    hp: 50,
    maxHp: 50,
    lastAttackTime: 0,
    attackCooldown: 2000,
    patrolAngle: Math.random() * Math.PI * 2,
    patrolTimer: 0
  };

  dinos.push(dino);
  console.log('[DINO] Spawn at:', x.toFixed(1), yPos.toFixed(1), z.toFixed(1));
  return dino;
}

// ===== AUTO SPAWN =====
let spawnTimer = 0;

export function autoSpawnDinos(player, scene, delta) {
  if (!loaded) return;
  spawnTimer -= delta;
  if (spawnTimer > 0) return;
  spawnTimer = SPAWN_CONFIG.spawnInterval;

  const aliveDinos = dinos.filter(d => d.state !== 'dead');
  if (aliveDinos.length >= SPAWN_CONFIG.maxDinos) return;

  for (let attempt = 0; attempt < 20; attempt++) {
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

// ===== DESPAWN =====
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

// ===== GANTI ANIMASI =====
function setAction(dino, actionName) {
  if (dino.currentAction === actionName) return;
  const action = dino.actions[actionName];
  if (!action) return;

  const oldAction = dino.actions[dino.currentAction];
  if (oldAction) oldAction.fadeOut(0.3);

  action.reset().fadeIn(0.3).play();
  dino.currentAction = actionName;
}

// ===== AI =====
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
        setAction(dino, 'attack');
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
        dino.model.rotation.y = angle;
      }
    } else {
      dino.patrolTimer -= delta;
      if (dino.patrolTimer <= 0) {
        dino.patrolTimer = 3 + Math.random() * 3;
        dino.patrolAngle = Math.random() * Math.PI * 2;
      }
      dino.state = 'walk';
      setAction(dino, 'walk');
      dino.x += Math.sin(dino.patrolAngle) * dino.speed * delta;
      dino.z += Math.cos(dino.patrolAngle) * dino.speed * delta;
      dino.model.rotation.y = dino.patrolAngle;
    }

    dino.y = getHeight(dino.x, dino.z);
    const boxNow = new THREE.Box3().setFromObject(dino.model);
    const modelH = boxNow.max.y - boxNow.min.y;
    dino.model.position.set(dino.x, dino.y + modelH / 2, dino.z);
  }
}

// ===== DAMAGE =====
export function damageDino(dino, amount) {
  if (dino.state === 'dead') return;
  dino.hp -= amount;
  if (dino.hp <= 0) {
    dino.state = 'dead';
    // Gak ada animasi death — langsung ilang aja
    setTimeout(() => { dino.model.visible = false; }, 1000);
  }
}

export function getDinos() { return dinos; }
