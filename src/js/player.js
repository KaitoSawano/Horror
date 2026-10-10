import { PLAYER } from './config.js';
import { getHeight } from './noise.js';
import { resolveCollisions } from './collision.js';

// ===== HEALTH =====
export const health = {
  current: 100,
  max: 100,
  lastDamageTime: 0,
  regenDelay: 5000,
  regenRate: 2
};

export function takeDamage(amount) {
  health.current = Math.max(0, health.current - amount);
  health.lastDamageTime = performance.now();
  if (typeof window.onPlayerDamage === 'function') {
    window.onPlayerDamage(amount);
  }
  return health.current;
}

export function heal(amount) {
  health.current = Math.min(health.max, health.current + amount);
}

export function isAlive() {
  return health.current > 0;
}

// ===== PICKED ITEMS =====
export const pickedItems = [];

// ===== SPAWN =====
// Cek apakah area di sekitar titik = DARATAN (bukan pantai/air)
function isSolidLand(x, z) {
  const checkRadius = 30;
  const points = [
    [0, 0],
    [-checkRadius, 0], [checkRadius, 0],
    [0, -checkRadius], [0, checkRadius],
    [-checkRadius, -checkRadius], [checkRadius, -checkRadius],
    [-checkRadius, checkRadius], [checkRadius, checkRadius]
  ];

  for (const [dx, dz] of points) {
    const h = getHeight(x + dx, z + dz);
    // Semua titik harus daratan (height > 3)
    if (h < 3) return false;
    // Dan jangan di gunung tinggi
    if (h > 35) return false;
  }
  return true;
}

function findSpawnPosition() {
  // Coba 500 kali di range luas
  for (let attempt = 0; attempt < 500; attempt++) {
    const x = (Math.random() - 0.5) * 20000;
    const z = (Math.random() - 0.5) * 20000;

    if (isSolidLand(x, z)) {
      const h = getHeight(x, z);
      console.log('Spawn found at', x.toFixed(0), z.toFixed(0), 'h=', h.toFixed(1));
      return { x, z, y: h };
    }
  }

  // Fallback: cari daratan lebih luas
  for (let attempt = 0; attempt < 2000; attempt++) {
    const x = (Math.random() - 0.5) * 100000;
    const z = (Math.random() - 0.5) * 100000;

    if (isSolidLand(x, z)) {
      const h = getHeight(x, z);
      return { x, z, y: h };
    }
  }

  // Fallback terakhir: cari daratan mana aja (tanpa cek sekitar)
  for (let attempt = 0; attempt < 5000; attempt++) {
    const x = (Math.random() - 0.5) * 200000;
    const z = (Math.random() - 0.5) * 200000;
    const h = getHeight(x, z);
    if (h > 5 && h < 30) {
      return { x, z, y: h };
    }
  }

  // Gagal total: spawn di (0, 0) — tapi mungkin di air
  return { x: 0, z: 0, y: getHeight(0, 0) };
}

const spawn = findSpawnPosition();

export const player = {
  x: spawn.x,
  y: spawn.y,
  z: spawn.z,
  vy: 0,
  onGround: true,
  inWater: false,
  waterDepth: 0,
  isAttacking: false,
  attackCooldown: 0
};

// ===== UPDATE PLAYER =====
export function updatePlayer(input, delta) {
  const groundHeight = getHeight(player.x, player.z);
  player.inWater = groundHeight < 0 && player.y < 0;
  player.waterDepth = player.inWater ? Math.abs(groundHeight) : 0;

  const forwardX = -Math.sin(input.yaw);
  const forwardZ = -Math.cos(input.yaw);
  const rightX = Math.cos(input.yaw);
  const rightZ = -Math.sin(input.yaw);

  const moveSpeed = player.inWater ? PLAYER.speed * 0.6 : PLAYER.speed;

  let nx = player.x + (-input.joyY * forwardX + input.joyX * rightX) * moveSpeed * delta;
  let nz = player.z + (-input.joyY * forwardZ + input.joyX * rightZ) * moveSpeed * delta;

  const resolved = resolveCollisions(nx, nz);
  player.x = resolved.x;
  player.z = resolved.z;

  // === FISIKA AIR ===
  if (player.inWater) {
    if (player.y < 0) {
      const depth = Math.abs(player.y);
      const buoyancy = Math.min(depth * 0.5, 3);
      player.vy += buoyancy * delta;
      player.vy *= 0.95;
    }
    player.vy -= PLAYER.gravity * 0.3 * delta;
  } else {
    player.vy -= PLAYER.gravity * delta;
  }

  if (input.jumpRequested) {
    if (player.onGround) {
      player.vy = PLAYER.jumpSpeed;
      player.onGround = false;
    } else if (player.inWater) {
      player.vy = 3;
    }
  }
  input.jumpRequested = false;

  player.y += player.vy * delta;

  if (player.y <= groundHeight) {
    player.y = groundHeight;
    player.vy = 0;
    player.onGround = true;
  } else {
    player.onGround = false;
  }

  // === HEALTH REGEN ===
  const timeSinceDamage = performance.now() - health.lastDamageTime;
  if (timeSinceDamage > health.regenDelay && health.current < health.max) {
    heal(health.regenRate * delta);
  }

  // === ATTACK COOLDOWN ===
  if (player.attackCooldown > 0) {
    player.attackCooldown -= delta * 1000;
  }

  return player;
}

// ===== ATTACK =====
export function attack(target) {
  if (player.attackCooldown > 0) return false;
  player.attackCooldown = 500;
  player.isAttacking = true;

  setTimeout(() => {
    player.isAttacking = false;
  }, 200);

  if (target && target.takeDamage) {
    const damage = 20;
    target.takeDamage(damage);
    return true;
  }
  return false;
}

// ===== PICKUP =====
export function pickUpItem(item) {
  if (!item) return false;

  const dx = item.x - player.x;
  const dy = item.y - player.y;
  const dz = item.z - player.z;
  const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

  if (dist > 3) return false;

  pickedItems.push(item);
  return true;
}
