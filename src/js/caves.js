import * as THREE from 'three';
import { getHeight, seededRandom } from './noise.js';

const CELL_SIZE = 20;

export function buildCaves(cx, cz, scene) {
  const objects = [];
  const worldX0 = cx * 64;
  const worldZ0 = cz * 64;
  const cellsPerSide = Math.floor(64 / CELL_SIZE);

  for (let i = 0; i < cellsPerSide; i++) {
    for (let j = 0; j < cellsPerSide; j++) {
      const cellX = worldX0 + i * CELL_SIZE;
      const cellZ = worldZ0 + j * CELL_SIZE;
      const seed = cellX * 7.919 + cellZ * 3.233;
      const r1 = seededRandom(seed);
      const r2 = seededRandom(seed + 1);
      const r3 = seededRandom(seed + 2);

      // 20% cell punya goa
      if (r3 >= 0.20) continue;

      const px = cellX + r1 * CELL_SIZE;
      const pz = cellZ + r2 * CELL_SIZE;
      const terrainH = getHeight(px, pz);

      // Goa cuma di ketinggian menengah (bukit/tebing)
      if (terrainH < 5 || terrainH > 35) continue;

      // Ukuran goa kecil & konsisten
      const caveRadius = 2.0 + r1 * 1.0;
      const caveHeight = caveRadius * 1.2;

      // Bikin "lubang" gelap — circle hitam yang ditaruh di permukaan tanah
      const holeMat = new THREE.MeshBasicMaterial({
        color: 0x000000,
        side: THREE.DoubleSide
      });
      const hole = new THREE.Mesh(
        new THREE.CircleGeometry(caveRadius, 12),
        holeMat
      );
      // Rotasi biar tegak (menghadap kamera horizontal)
      hole.rotation.x = -Math.PI / 2;
      hole.position.set(px, terrainH + 0.05, pz);
      scene.add(hole);
      objects.push(hole);

      // Cincin batu di sekeliling lubang (kecil & tegak)
      const ringMat = new THREE.MeshStandardMaterial({
        color: new THREE.Color().setHSL(0.1, 0.05, 0.2),
        roughness: 0.95,
        flatShading: true
      });
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(caveRadius, 0.4, 6, 16),
        ringMat
      );
      ring.rotation.x = -Math.PI / 2;
      ring.position.set(px, terrainH + 0.1, pz);
      ring.castShadow = true;
      ring.receiveShadow = true;
      scene.add(ring);
      objects.push(ring);

      // Beberapa batu kecil di sekeliling goa
      const rockCount = 4 + Math.floor(r1 * 3);
      for (let k = 0; k < rockCount; k++) {
        const angle = (k / rockCount) * Math.PI * 2 + r2 * Math.PI;
        const dist = caveRadius + 0.8 + r1 * 0.5;
        const rx = px + Math.cos(angle) * dist;
        const rz = pz + Math.sin(angle) * dist;
        const rh = getHeight(rx, rz);

        const rockSize = 0.3 + r2 * 0.4;
        const rock = new THREE.Mesh(
          new THREE.IcosahedronGeometry(rockSize, 0),
          ringMat
        );
        rock.position.set(rx, rh + rockSize * 0.3, rz);
        rock.rotation.set(r1 * Math.PI, r2 * Math.PI, r3 * Math.PI);
        rock.castShadow = true;
        scene.add(rock);
        objects.push(rock);
      }
    }
  }

  return { objects };
}
