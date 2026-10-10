import { CHUNK_SIZE, PLAYER } from './config.js';
import { getChunks } from './terrain.js';

function chunkKey(cx, cz) {
  return cx + ',' + cz;
}

export function resolveCollisions(nx, nz) {
  const playerR = PLAYER.radius;
  const pcx = Math.floor(nx / CHUNK_SIZE);
  const pcz = Math.floor(nz / CHUNK_SIZE);
  const chunks = getChunks();

  for (let dx = -1; dx <= 1; dx++) {
    for (let dz = -1; dz <= 1; dz++) {
      const chunk = chunks.get(chunkKey(pcx + dx, pcz + dz));
      if (!chunk) continue;

      for (const c of chunk.colliders) {
        const ddx = nx - c.x;
        const ddz = nz - c.z;
        const dist = Math.hypot(ddx, ddz);
        const minDist = c.r + playerR;
        if (dist < minDist && dist > 0.001) {
          const push = minDist - dist;
          nx += (ddx / dist) * push;
          nz += (ddz / dist) * push;
        }
      }
    }
  }

  return { x: nx, z: nz };
}
