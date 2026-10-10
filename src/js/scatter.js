import { buildTrees } from './trees.js';
import { buildRocks } from './rocks.js';
import { buildOres } from './ores.js';
import { buildCaves } from './caves.js';

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

  return { objects, colliders };
}
