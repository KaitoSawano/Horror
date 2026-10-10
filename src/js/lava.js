import * as THREE from 'three';
import { COLORS } from './config.js';
import { getHeight } from './noise.js';

let lavaMat = null;

export function createLavaMaterial() {
  lavaMat = new THREE.MeshStandardMaterial({
    color: COLORS.lava,
    emissive: COLORS.lavaEmissive,
    emissiveIntensity: 1.5,
    roughness: 0.6
  });
  return lavaMat;
}

export function spawnLavaPool(scene, x, z, size) {
  const geo = new THREE.CircleGeometry(size, 16);
  geo.rotateX(-Math.PI / 2);
  const lava = new THREE.Mesh(geo, lavaMat);
  lava.position.set(x, -8, z);
  scene.add(lava);
  return lava;
}

export function spawnRandomLava(scene, count, range) {
  const pools = [];
  for (let i = 0; i < count; i++) {
    const x = (Math.random() - 0.5) * range;
    const z = (Math.random() - 0.5) * range;
    const size = 4 + Math.random() * 4;
    pools.push(spawnLavaPool(scene, x, z, size));
  }
  return pools;
}
