import * as THREE from 'three';
import { getHeight, seededRandom } from './noise.js';

const CELL_SIZE = 8;

export function buildRocks(cx, cz, scene) {
  const objects = [];
  const colliders = [];
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

      // Cuma 20% cell yang punya batu
      if (r3 < 0.35 || r3 >= 0.55) continue;

      // Skip kalau di bawah air atau di air
      if (h <= 1) continue;

      const size = 0.4 + r4 * 1.2;
      const mat = new THREE.MeshStandardMaterial({
        color: new THREE.Color().setHSL(0.1, 0.05, 0.25 + r4 * 0.15),
        roughness: 0.95,
        flatShading: true
      });

      const rock = new THREE.Mesh(
        new THREE.IcosahedronGeometry(size, 0),
        mat
      );
      rock.position.set(px, h + size * 0.4, pz);
      rock.rotation.set(r4 * Math.PI, r4 * Math.PI, r4 * Math.PI);
      rock.scale.set(1, 0.6 + r4 * 0.6, 1);
      rock.castShadow = true;
      scene.add(rock);
      objects.push(rock);

      if (size > 0.6) {
        colliders.push({ x: px, z: pz, r: size * 0.7 });
      }
    }
  }

  return { objects, colliders };
}
