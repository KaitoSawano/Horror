import { PLAYER } from './config.js';
import { getHeight } from './noise.js';
import { resolveCollisions } from './collision.js';

// ===== CEK TIPE DARATAN =====
function isLand(x, z) {
  return getHeight(x, z) > 3;
}

// Cek apakah titik ini di BENUA (area luas, tinggi tinggi)
function isContinent(x, z) {
  const h = getHeight(x, z);
  if (h < 8) return false;

  // Cek 8 titik radius 50 — harus daratan semua
  const radius = 50;
  let landCount = 0;
  for (let i = 0; i < 8; i++) {
    const angle = (i / 8) * Math.PI * 2;
    const px = x + Math.cos(angle) * radius;
    const pz = z + Math.sin(angle) * radius;
    if (isLand(px, pz)) landCount++;
  }
  return landCount >= 7;
}

// Cek apakah titik ini di PULAU SEDANG (area sedang, tinggi sedang)
function isMediumIsland(x, z) {
  const h = getHeight(x, z);
  if (h < 5 || h > 15) return false;

  // Cek 8 titik radius 25 — minimal 5 daratan (bukan benua, tapi cukup luas)
  const radius = 25;
  let landCount = 0;
  for (let i = 0; i < 8; i++) {
    const angle = (i / 8) * Math.PI * 2;
    const px = x + Math.cos(angle) * radius;
    const pz = z + Math.sin(angle) * radius;
    if (isLand(px, pz)) landCount++;
  }
  return landCount >= 5 && landCount <= 7;
}

// Cek apakah titik ini di PULAU KECIL (area kecil)
function isSmallIsland(x, z) {
  const h = getHeight(x, z);
  if (h < 2 || h > 10) return false;

  // Cek radius 15 — minimal 3 daratan (pulau kecil)
  const radius = 15;
  let landCount = 0;
  for (let i = 0; i < 8; i++) {
    const angle = (i / 8) * Math.PI * 2;
    const px = x + Math.cos(angle) * radius;
    const pz = z + Math.sin(angle) * radius;
    if (isLand(px, pz)) landCount++;
  }
  return landCount >= 3 && landCount <= 5;
}

// ===== SPAWN RANDOM =====
function findSpawnPosition() {
  // Pilih tipe spawn acak
  const type = ['continent', 'medium', 'small'][Math.floor(Math.random() * 3)];
  console.log('Spawn type:', type);

  const candidates = [];
  const attempts = 300;

  for (let i = 0; i < attempts; i++) {
    const x = (Math.random() - 0.5) * 15000;
    const z = (Math.random() - 0.5) * 15000;

    let ok = false;
    if (type === 'continent') ok = isContinent(x, z);
    else if (type === 'medium') ok = isMediumIsland(x, z);
    else if (type === 'small') ok = isSmallIsland(x, z);

    if (ok) {
      candidates.push({ x, z, h: getHeight(x, z) });

      // Cukup 10 kandidat
      if (candidates.length >= 10) break;
    }
  }

  // Kalau nemu kandidat, pilih acak
  if (candidates.length > 0) {
    const pick = candidates[Math.floor(Math.random() * candidates.length)];
    console.log('Spawn at', pick.x.toFixed(0), pick.z.toFixed(0), 'h', pick.h.toFixed(1));
    return pick;
  }

  // Fallback: cari daratan apa aja
  for (let i = 0; i < 500; i++) {
    const x = (Math.random() - 0.5) * 5000;
    const z = (Math.random() - 0.5) * 5000;
    const h = getHeight(x, z);
    if (h > 3 && h < 25) {
      return { x, z, h };
    }
  }

  // Fallback terakhir
  return { x: 0, z: 0, h: getHeight(0, 0) };
}

const spawn = findSpawnPosition();

export const player = {
  x: spawn.x,
  y: spawn.h,
  z: spawn.z,
  vy: 0,
  onGround: true
};

export function updatePlayer(input, delta) {
  const forwardX = -Math.sin(input.yaw);
  const forwardZ = -Math.cos(input.yaw);
  const rightX = Math.cos(input.yaw);
  const rightZ = -Math.sin(input.yaw);

  let nx = player.x + (-input.joyY * forwardX + input.joyX * rightX) * PLAYER.speed * delta;
  let nz = player.z + (-input.joyY * forwardZ + input.joyX * rightZ) * PLAYER.speed * delta;

  const resolved = resolveCollisions(nx, nz);
  player.x = resolved.x;
  player.z = resolved.z;

  if (input.jumpRequested && player.onGround) {
    player.vy = PLAYER.jumpSpeed;
    player.onGround = false;
  }
  input.jumpRequested = false;

  player.vy -= PLAYER.gravity * delta;
  player.y += player.vy * delta;

  const groundY = getHeight(player.x, player.z);
  if (player.y <= groundY) {
    player.y = groundY;
    player.vy = 0;
    player.onGround = true;
  } else {
    player.onGround = false;
  }

  return player;
}
