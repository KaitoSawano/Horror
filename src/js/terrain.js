import * as THREE from 'three';
import { CHUNK_SIZE, CHUNK_SEG, RENDER_DISTANCE, MAX_CHUNKS_PER_FRAME } from './config.js';
import { getHeight } from './noise.js';
import { getVertexColor } from './colors.js';

const chunks = new Map();
const pendingChunks = [];

export function chunkKey(cx, cz) {
  return cx + ',' + cz;
}

function buildChunkTerrain(cx, cz, scene) {
  const geo = new THREE.PlaneGeometry(CHUNK_SIZE, CHUNK_SIZE, CHUNK_SEG, CHUNK_SEG);
  geo.rotateX(-Math.PI / 2);

  const pos = geo.attributes.position;
  const colors = new Float32Array(pos.count * 3);
  const worldX0 = cx * CHUNK_SIZE;
  const worldZ0 = cz * CHUNK_SIZE;

  for (let i = 0; i < pos.count; i++) {
    const wx = worldX0 + pos.getX(i) + CHUNK_SIZE / 2;
    const wz = worldZ0 + pos.getZ(i) + CHUNK_SIZE / 2;
    const h = getHeight(wx, wz);
    pos.setY(i, h);
    const c = getVertexColor(h, wx, wz);
    colors[i * 3] = c.r;
    colors[i * 3 + 1] = c.g;
    colors[i * 3 + 2] = c.b;
  }

  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geo.computeVertexNormals();

  const mat = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.95
  });

  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(worldX0 + CHUNK_SIZE / 2, 0, worldZ0 + CHUNK_SIZE / 2);
  mesh.receiveShadow = true;
  scene.add(mesh);

  return mesh;
}

export function createChunk(cx, cz, scene) {
  const key = chunkKey(cx, cz);
  if (chunks.has(key)) return;

  const terrainMesh = buildChunkTerrain(cx, cz, scene);
  chunks.set(key, { terrainMesh, objects: [], colliders: [] });
}

export function removeChunk(cx, cz, scene) {
  const key = chunkKey(cx, cz);
  const chunk = chunks.get(key);
  if (!chunk) return;

  scene.remove(chunk.terrainMesh);
  chunk.terrainMesh.geometry.dispose();
  chunk.terrainMesh.material.dispose();

  chunk.objects.forEach((o) => {
    scene.remove(o);
    if (o.geometry) o.geometry.dispose();
    if (o.material) {
      if (Array.isArray(o.material)) o.material.forEach((m) => m.dispose());
      else o.material.dispose();
    }
  });

  chunks.delete(key);
}

export function updateChunks(playerX, playerZ, scene) {
  const pcx = Math.floor(playerX / CHUNK_SIZE);
  const pcz = Math.floor(playerZ / CHUNK_SIZE);
  const needed = new Set();

  for (let dx = -RENDER_DISTANCE; dx <= RENDER_DISTANCE; dx++) {
    for (let dz = -RENDER_DISTANCE; dz <= RENDER_DISTANCE; dz++) {
      const cx = pcx + dx;
      const cz = pcz + dz;
      needed.add(chunkKey(cx, cz));

      if (!chunks.has(chunkKey(cx, cz))) {
        const already = pendingChunks.some((c) => c.cx === cx && c.cz === cz);
        if (!already) pendingChunks.push({ cx, cz });
      }
    }
  }

  for (const key of chunks.keys()) {
    if (!needed.has(key)) {
      const [cx, cz] = key.split(',').map(Number);
      removeChunk(cx, cz, scene);
    }
  }
}

export function processChunkQueue(scene, player, buildChunkObjectsFn) {
  let processed = 0;
  while (pendingChunks.length > 0 && processed < MAX_CHUNKS_PER_FRAME) {
    const { cx, cz } = pendingChunks.shift();
    const dx = cx * CHUNK_SIZE - player.x;
    const dz = cz * CHUNK_SIZE - player.z;
    if (Math.hypot(dx, dz) > (RENDER_DISTANCE + 1) * CHUNK_SIZE) continue;

    createChunk(cx, cz, scene);

    // Callback buat scatter objek
    if (buildChunkObjectsFn) {
      const chunk = chunks.get(chunkKey(cx, cz));
      if (chunk) {
        const result = buildChunkObjectsFn(cx, cz, scene);
        chunk.objects = result.objects;
        chunk.colliders = result.colliders;
      }
    }

    processed++;
  }
}

export function getChunks() {
  return chunks;
}

export function getChunkAt(cx, cz) {
  return chunks.get(chunkKey(cx, cz));
}
