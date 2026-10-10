import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { getHeight, seededRandom } from './noise.js';

// ===== STATE =====
const dinos = [];          // semua dino yang ada
let dinoTemplate = null;    // model GLB (shared)
let dinoAnimations = {};    // map nama animasi → AnimationClip
let loaded = false;

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
          // Kalau gak ada nama yang cocok, simpan berdasarkan index
          if (!dinoAnimations.walk) dinoAnimations.walk = clip;
          else if (!dinoAnimations.idle) dinoAnimations.idle = clip;
          else if (!dinoAnimations.attack) dinoAnimations.attack = clip;
          else if (!dinoAnimations.death) dinoAnimations.death = clip;
        }
      });

      console.log('Dino loaded. Animations:', Object.keys(dinoAnimations));
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
  if (h < 2 || h > 30) return null; // cuma di daratan

  // Clone model (deep clone biar animasi terpisah)
  const model = THREE.SkeletonUtils
    ? THREE.SkeletonUtils.clone(dinoTemplate)
    : dinoTemplate.clone(true);

  // Bikin mixer buat animasi
  const mixer = new THREE.AnimationMixer(model);
  const actions = {};

  // Setup action buat tiap animasi
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

  model.position.set(x, h, z);
  model.scale.set(1, 1, 1);  // atur kalau kegedean/kekecilan
  model.rotation.y = Math.random() * Math.PI * 2;
  scene.add(model);

  const dino = {
    model,
    mixer,
    actions,
    currentAction: 'idle',
    x, z,
    y: h,
    // AI state
    state: 'idle',       // idle, walk, chase, attack, dead
    speed: 1.5,
    hp: 50,
    maxHp: 50,
    lastAttackTime: 0,
    attackCooldown: 2000,
    patrolAngle: Math.random() * Math.PI * 2,
    patrolTimer: 0,
    walkTime: 0,
    deathTimer: 0
  };

  dinos.push(dino);
  return dino;
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

    // Jarak ke player
    const dx = player.x - dino.x;
    const dz = player.z - dino.z;
    const dist = Math.hypot(dx, dz);

    // === AI ===
    if (dist < 12) {
      // Player deket → chase atau attack
      if (dist < 2) {
        // Attack
        dino.state = 'attack';
        setAction(dino, 'attack');

        const now = performance.now();
        if (now - dino.lastAttackTime > dino.attackCooldown) {
          dino.lastAttackTime = now;
          if (onAttackPlayer) onAttackPlayer(15); // 15 damage
        }
      } else {
        // Chase
        dino.state = 'chase';
        setAction(dino, 'walk');

        const angle = Math.atan2(dx, dz);
        dino.x += Math.sin(angle) * dino.speed * 1.5 * delta;
        dino.z += Math.cos(angle) * dino.speed * 1.5 * delta;
        dino.model.rotation.y = angle;
      }
    } else {
      // Jauh → patroli random
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

    // Update posisi Y (ikutin terrain)
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

    // Matiin animasi setelah 5 detik
    setTimeout(() => {
      dino.model.visible = false;
    }, 5000);
  }
}

export function getDinos() {
  return dinos;
}
