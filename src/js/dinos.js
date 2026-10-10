import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { getHeight, seededRandom } from './noise.js';

// ===== STATE =====
const dinos = [];
let dinoTemplate = null;
let dinoAnimations = {};
let loaded = false;

// Konfigurasi spawn — jarak jauh biar player bisa kabur
const SPAWN_CONFIG = {
  minDistance: 60,      // spawn minimal 60 unit dari player
  maxDistance: 150,     // spawn maksimal 150 unit
  despawnDistance: 250, // despawn kalau > 250 unit
  maxDinos: 4,          // max dino aktif
  spawnInterval: 8,     // cek spawn tiap 8 detik
  minLandHeight: 3,     // cuma spawn di daratan
  maxLandHeight: 30
};

// ===== LOAD MODEL =====
export function loadDinoModel(onLoaded) {
  const loader = new GLTFLoader();
  loader.load(
    'assets/models/brontosaurus.glb',
    (gltf) => {
      dinoTemplate = gltf.scene;

      // Auto-detect animasi
      gltf.animations.forEach((clip) => {
        const name = clip.name.toLowerCase();
        if (name.includes('walk') || name.includes('jalan')) dinoAnimations.walk = clip;
        else if (name.includes('idle') || name.includes('diam')) dinoAnimations.idle = clip;
        else if (name.includes('attack') || name.includes('serang')) dinoAnimations.attack = clip;
        else if (name.includes('death') || name.includes('mati') || name.includes('die')) dinoAnimations.death = clip;
        else {
          if (!dinoAnimations.walk) dinoAnimations.walk = clip;
          else if (!dinoAnimations.idle) dinoAnimations.idle = clip;
          else if (!dinoAnimations.attack) dinoAnimations.attack = clip;
          else if (!dinoAnimations.death) dinoAnimations.death = clip;
        }
      });

      // Hitung ukuran model — buat auto-scale
      const box = new THREE.Box3().setFromObject(dinoTemplate);
      const size = box.getSize(new THREE.Vector3());
      console.log('Dino size:', size.x.toFixed(2), size.y.toFixed(2), size.z.toFixed(2));
      console.log('Animations:', Object.keys(dinoAnimations));

      loaded = true;
      if (onLoaded) onLoaded();
    },
    undefined,
    (err) => console.error('Gagal load brontosaurus.glb:', err)
  );
}

export function isDinoLoaded() {
  return loaded;
}

// ===== SPAWN DINO =====
export function spawnDino(x, z, scene) {
  if (!dinoTemplate) return null;

  const h = getHeight(x, z);
  if (h < SPAWN_CONFIG.minLandHeight || h > SPAWN_CONFIG.maxLandHeight) return null;

  // Clone model
  const model = THREE.SkeletonUtils
    ? THREE.SkeletonUtils.clone(dinoTemplate)
    : dinoTemplate.clone(true);

  const mixer = new THREE.AnimationMixer(model);
  const actions = {};

  for (const key in dinoAnimations) {
    actions[key] = mixer.clipAction(dinoAnimations[key]);
  }

  // Play idle default
  if (actions.idle) {
    actions.idle.play();
    actions.idle.setLoop(THREE.LoopRepeat);
  } else if (actions.walk) {
    actions.walk.play();
  }

  // Scale — 1.5× biar keliatan
  model.scale.set(1.5, 1.5, 1.5);
  model.position.set(x, h, z);
  model.rotation.y = Math.random() * Math.PI * 2;
  scene.add(model);

  const dino = {
    model,
    mixer,
    actions,
    currentAction: 'idle',
    x, z, y: h,
    state: 'idle',
    speed: 1.5,
    hp: 50,
    maxHp: 50,
    lastAttackTime: 0,
    attackCooldown: 2000,
    patrolAngle: Math.random() * Math.PI * 2,
    patrolTimer: 0,
    deathTimer: 0
  };

  dinos.push(dino);
  console.log('[DINO] Spawned at', x.toFixed(0), z.toFixed(0), 'h=', h.toFixed(1));
  return dino;
}

// ===== AUTO SPAWN DI SEKITAR PLAYER =====
let spawnTimer = 0;

export function autoSpawnDinos(player, scene, delta) {
  if (!loaded) return;

  spawnTimer -= delta;
  if (spawnTimer > 0) return;
  spawnTimer = SPAWN_CONFIG.spawnInterval;

  // Hitung dino aktif
  const aliveDinos = dinos.filter(d => d.state !== 'dead');

  // Kalau udah cukup, skip
  if (aliveDinos.length >= SPAWN_CONFIG.maxDinos) return;

  // Coba spawn 1 dino
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

// ===== DESPAWN DINO YANG JAUH =====
export function despawnFarDinos(player, scene) {
  for (let i = dinos.length - 1; i >= 0; i--) {
    const dino = dinos[i];
    const dist = Math.hypot(dino.x - player.x, dino.z - player.z);

    if (dist > SPAWN_CONFIG.despawnDistance) {
      scene.remove(dino.model);
      dino.model.traverse((child) => {
        if (child.geometry) child.geometry.dispose();
        if (child.material) {
          if (Array.isArray(child.material)) child.material.forEach(m => m.dispose());
          else child.material.dispose();
        }
      });
      dinos.splice(i, 1);
    }
  }
}

// ===== GANTI ANIMASI =====
function setAction(dino, actionName) {
  if (dino.currentAction === actionName) return;
  if (!dino.actions[actionName]) return;

  const oldAction = dino.actions[dino.currentAction];
  const newAction = dino.actions[actionName];

  if (oldAction) oldAction.fadeOut(0.3);
  newAction.reset().fadeIn(0.3).play();
  dino.currentAction = actionName;
}

// ===== AI UPDATE =====
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
    dino.model.position.set(dino.x, dino.y, dino.z);
  }
}

// ===== DAMAGE DINO =====
export function damageDino(dino, amount) {
  if (dino.state === 'dead') return;
  dino.hp -= amount;

  if (dino.hp <= 0) {
    dino.state = 'dead';
    setAction(dino, 'death');

    setTimeout(() => {
      dino.model.visible = false;
    }, 5000);
  }
}

export function getDinos() {
  return dinos;
}
