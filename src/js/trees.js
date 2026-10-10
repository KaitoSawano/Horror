import * as THREE from 'three';
import { getHeight, seededRandom } from './noise.js';

const CELL_SIZE = 8;

export function buildTrees(cx, cz, scene) {
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

      // Cuma 35% cell yang punya pohon
      if (r3 >= 0.35) continue;

      // Pohon cuma di daratan (height > 1, height < 22)
      if (h <= 1 || h >= 22) continue;

      const g = new THREE.Group();
      const scale = 0.8 + r4 * 0.7;
      const trunkH = (3 + r4 * 3) * scale;
      const trunkR = 0.2 * scale;

      const barkMat = new THREE.MeshStandardMaterial({
        color: new THREE.Color().setHSL(0.08, 0.4, 0.18 + r4 * 0.08),
        roughness: 0.95
      });

      const trunk = new THREE.Mesh(
        new THREE.CylinderGeometry(trunkR * 0.6, trunkR, trunkH, 6),
        barkMat
      );
      trunk.position.y = trunkH / 2;
      trunk.castShadow = true;
      g.add(trunk);

      const leafMat = new THREE.MeshStandardMaterial({
        color: new THREE.Color().setHSL(0.25 + r4 * 0.08, 0.5, 0.2 + r4 * 0.1),
        roughness: 1.0,
        flatShading: true
      });

      for (let k = 0; k < 3; k++) {
        const cone = new THREE.Mesh(
          new THREE.ConeGeometry((1.2 - k * 0.3) * scale, 1.5 * scale, 6),
          leafMat
        );
        cone.position.y = trunkH + k * 1.5 * scale * 0.6;
        cone.castShadow = true;
        g.add(cone);
      }

      g.position.set(px, h, pz);
      g.rotation.y = r4 * Math.PI * 2;
      scene.add(g);
      objects.push(g);
      colliders.push({ x: px, z: pz, r: trunkR + 0.4 });
    }
  }

  return { objects, colliders };
}
