import * as THREE from 'three';

const WATER_SIZE = 2000;
const WATER_SEG = 64;

let waterMesh = null;
let waterGeo = null;
let waterBasePositions = null;
let waterTime = 0;

export function createWater(scene) {
  waterGeo = new THREE.PlaneGeometry(WATER_SIZE, WATER_SIZE, WATER_SEG, WATER_SEG);
  waterGeo.rotateX(-Math.PI / 2);

  const waterMat = new THREE.MeshStandardMaterial({
    color: 0x2a7ab0,
    transparent: true,
    opacity: 0.75,
    roughness: 0.15,
    metalness: 0.4,
    flatShading: false
  });

  waterMesh = new THREE.Mesh(waterGeo, waterMat);
  waterMesh.receiveShadow = false;
  scene.add(waterMesh);

  waterBasePositions = waterGeo.attributes.position.array.slice();

  return waterMesh;
}

export function updateWater(playerX, playerZ, delta) {
  if (!waterMesh || !waterGeo) return;

  waterTime += delta;

  waterMesh.position.set(playerX, 0, playerZ);

  const posAttr = waterGeo.attributes.position;
  const arr = posAttr.array;
  const base = waterBasePositions;

  for (let i = 0; i < arr.length; i += 3) {
    const lx = base[i];
    const lz = base[i + 2];
    const wx = lx + playerX;
    const wz = lz + playerZ;

    const wave1 = Math.sin(wx * 0.15 + waterTime * 1.2) * 0.15;
    const wave2 = Math.sin(wz * 0.2 + waterTime * 0.9) * 0.1;
    const wave3 = Math.sin((wx + wz) * 0.08 + waterTime * 1.5) * 0.08;
    arr[i + 1] = wave1 + wave2 + wave3;
  }

  posAttr.needsUpdate = true;
}
