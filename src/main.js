import * as THREE from 'three';

// Import semua module
import { getHeight } from './js/noise.js';
import { createLights } from './js/lights.js';
import { createSky, updateSky } from './js/sky.js';
import { createWater, updateWater } from './js/water.js';
import { updateChunks, processChunkQueue, getChunks, chunkKey } from './js/terrain.js';
import { buildChunkObjects } from './js/scatter.js';
import { player, updatePlayer } from './js/player.js';
import { placeVoxel, removeVoxelAt, getVoxelBlocks, getVoxelCount } from './js/voxel.js';
import {
  inventory, hotbar, initInventoryUI,
  getActiveItem, consumeActiveItem, addItemToInventory,
  selectHotbar, renderHotbar, renderInventory
} from './js/inventory.js';
import { initInput, input, setStarted, setInvOpen } from './js/input.js';
import { updateUI } from './js/ui.js';
import { PLAYER } from './js/config.js';

// ===== DEBUG =====
const debugEl = document.getElementById('debug');
function debug(msg, isError = false) {
  if (!debugEl) return;
  debugEl.textContent = msg;
  debugEl.style.color = isError ? '#ff4444' : '#0f0';
}
window.addEventListener('error', (e) => {
  debug('ERR: ' + (e.message || 'unknown'), true);
});
window.addEventListener('unhandledrejection', (e) => {
  debug('REJECT: ' + (e.reason && e.reason.message ? e.reason.message : e.reason), true);
});

// ===== SETUP =====
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87ceeb);
scene.fog = new THREE.Fog(0x87ceeb, 60, 220);

const camera = new THREE.PerspectiveCamera(75, innerWidth / innerHeight, 0.1, 400);
camera.rotation.order = 'YXZ';

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(innerWidth, innerHeight);
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
document.body.appendChild(renderer.domElement);

if (screen.orientation && screen.orientation.lock) {
  screen.orientation.lock('landscape').catch(() => {});
}

// ===== INIT MODULES =====
const lights = createLights(scene);
const sky = createSky(scene);
createWater(scene);
initInventoryUI();

// ===== RAYCAST =====
const raycaster = new THREE.Raycaster();
raycaster.far = 6;

function getLookDirection() {
  const dir = new THREE.Vector3();
  camera.getWorldDirection(dir);
  return dir;
}

function raycastTerrain() {
  const targets = [];
  getChunks().forEach((c) => targets.push(c.terrainMesh));
  raycaster.set(camera.position, getLookDirection());
  const hits = raycaster.intersectObjects(targets, false);
  return hits.length > 0 ? hits[0] : null;
}

function raycastVoxel() {
  raycaster.set(camera.position, getLookDirection());
  const hits = raycaster.intersectObjects(getVoxelBlocks(), false);
  return hits.length > 0 ? hits[0] : null;
}

// ===== AKSI TARUH =====
function onPlace() {
  const item = getActiveItem();
  if (!item || item.count <= 0) return;

  // Prioritas 1: taruh di sisi voxel
  const voxelHit = raycastVoxel();
  if (voxelHit) {
    const normal = voxelHit.face.normal.clone();
    const pos = voxelHit.object.position.clone().add(normal.multiplyScalar(1.0));
    if (placeVoxel(pos.x, pos.y, pos.z, item.id, scene)) {
      consumeActiveItem();
    }
    return;
  }

  // Prioritas 2: taruh di atas terrain
  const terrainHit = raycastTerrain();
  if (terrainHit) {
    const pos = terrainHit.point.clone();
    pos.y = Math.round(pos.y + 0.5);
    pos.x = Math.round(pos.x);
    pos.z = Math.round(pos.z);
    if (placeVoxel(pos.x, pos.y, pos.z, item.id, scene)) {
      consumeActiveItem();
    }
  }
}

// ===== AKSI HANCUR =====
function onBreak() {
  const hit = raycastVoxel();
  if (!hit) return;

  const mesh = hit.object;
  const id = mesh.userData.voxelId;
  removeVoxelAt(mesh.position.x, mesh.position.y, mesh.position.z, scene);

  if (id) {
    addItemToInventory(id);
  }
}

// ===== INIT INPUT =====
initInput(renderer, {
  onPlace: onPlace,
  onBreak: onBreak,
  onSelectHotbar: selectHotbar
});

// ===== START =====
let started = false;
const hintBtn = document.getElementById('hint');

function startGame() {
  if (started) return;
  started = true;
  setStarted(true);
  if (hintBtn) hintBtn.style.display = 'none';
  if (debugEl) debugEl.style.display = 'none';
}

if (hintBtn) {
  hintBtn.addEventListener('click', startGame);
  hintBtn.addEventListener('touchend', (e) => {
    e.preventDefault();
    e.stopPropagation();
    startGame();
  }, { passive: false });
}

// ===== LOOP =====
const clock = new THREE.Clock();
let frameCount = 0;

function animate() {
  requestAnimationFrame(animate);
  const delta = Math.min(clock.getDelta(), 0.1);
  frameCount++;

  // Update sky (matahari, bulan, bintang, warna langit)
  updateSky(scene, lights, player, delta);

  // Update air
  updateWater(player.x, player.z, delta);

  if (started) {
    // Update player
    updatePlayer(input, delta);

    // Kamera
    camera.position.set(player.x, player.y + PLAYER.eyeHeight, player.z);
    camera.rotation.y = input.yaw;
    camera.rotation.x = input.pitch;

    // Update chunks tiap 10 frame
    if (frameCount % 10 === 0) {
      updateChunks(player.x, player.z, scene);
    }

    // Update UI
    updateUI(player);
  }

  // Process chunk queue (generate 1 chunk per frame)
  processChunkQueue(scene, player, buildChunkObjects);

  renderer.render(scene, camera);
}
animate();

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

debug('Ready');
