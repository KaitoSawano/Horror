import { buildTrees } from './trees.js';
import { buildRocks } from './rocks.js';
import { buildOres } from './ores.js';
import { buildCaves } from './caves.js';
import { spawnDino, isDinoLoaded } from './dinos.js';
import { getHeight, seededRandom } from './noise.js';

export function buildChunkObjects(cx, cz, scene) {
  const trees = buildTrees(cx, cz, scene);
  const rocks = buildRocks(cx, cz, scene);
  const ores = buildOres(cx, cz, scene);
  const caves = buildCaves(cx, cz, scene);

  const objects = [
    ...trees.objects,
    ...rocks.objects,
    ...ores.objects,
    ...caves.objects
  ];

  const colliders = [
    ...(trees.colliders || []),
    ...(rocks.colliders || [])
  ];

  // Spawn dino (kalau model udah load)
  if (isDinoLoaded()) {
    const worldX0 = cx * 64;
    const worldZ0 = cz * 64;

    // 1 dino per chunk (30% chance)
    const seed = worldX0 * 3.7 + worldZ0 * 1.9;
    const r = seededRandom(seed);
    if (r < 0.3) {
      const px = worldX0 + Math.random() * 64;
      const pz = worldZ0 + Math.random() * 64;
      spawnDino(px, pz, scene);
    }
  }

  return { objects, colliders };
}
