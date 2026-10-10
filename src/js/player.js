import { PLAYER } from './config.js';
import { getHeight } from './noise.js';
import { resolveCollisions } from './collision.js';

// Random spawn: cari posisi yang tingginya 3-15 (bukit/rumput)
function findSpawnPosition() {
  for (let attempt = 0; attempt < 50; attempt++) {
    const x = (Math.random() - 0.5) * 2000;
    const z = (Math.random() - 0.5) * 2000;
    const h = getHeight(x, z);
    if (h > 3 && h < 20) {
      return { x, z, y: h };
    }
  }
  // Fallback
  return { x: 0, z: 0, y: getHeight(0, 0) };
}

const spawn = findSpawnPosition();

export const player = {
  x: spawn.x,
  y: spawn.y,
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
