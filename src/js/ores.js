import * as THREE from 'three';
import { getHeight, seededRandom } from './noise.js';

const CELL_SIZE = 8;

export function buildOres(cx, cz, scene) {
  const objects = [];
  const worldX0 = cx * 64;
  const worldZ0 = cz * 64;
  const cellsPerSide = Math.floor(64 / CELL_SIZE);

  for (let i = 0; i < cellsPerSide; i++) {
    for (let j = 0; j < cellsPerSide; j++) {
      const cellX = worldX0 + i * CELL_SIZE;
      const cellZ = worldZ0 + j * CELL_SIZE;
      const seed = cellX * 12.9898 + cellZ * 78.233;
      const r1 = seededRandom(seed);
      const r2 = seededRandom(seed + 1);
      const r3 = seededRandom(seed + 2);
      const r4 = seededRandom(seed + 3);

      const px = cellX + r1 * CELL_SIZE;
      const pz = cellZ + r2 * CELL_SIZE;
      const h = getHeight(px, pz);

      // Ore: 7% cell
      if (r3 < 0.55 || r3 >= 0.62) continue;

      // Skip kalau di bawah air atau di air
      if (h <= 1) continue;

      const size = 0.5 + r4 * 0.5;
      const mat = new THREE.MeshStandardMaterial({
        color: 0xffcc00,
        emissive: 0xffaa00,
        emissiveIntensity: 0.8,
        roughness: 0.3,
        metalness: 0.6,
        flatShading: true
      });

      const ore = new THREE.Mesh(
        new THREE.IcosahedronGeometry(size, 0),
        mat
      );
      ore.position.set(px, h + size * 0.3, pz);
      ore.rotation.set(r4 * Math.PI, r4 * Math.PI, r4 * Math.PI);
      ore.castShadow = true;
      scene.add(ore);
      objects.push(ore);
    }
  }

  return { objects };
}
