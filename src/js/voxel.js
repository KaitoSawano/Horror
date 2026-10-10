import * as THREE from 'three';
import { VOXEL_SIZE } from './config.js';
import { ITEMS } from './config.js';

const voxelBlocks = [];
const voxelGrid = new Map();

function voxelKey(x, y, z) {
  return Math.round(x) + ',' + Math.round(y) + ',' + Math.round(z);
}

function snapToGrid(val) {
  return Math.round(val / VOXEL_SIZE) * VOXEL_SIZE;
}

function getBlockColor(id) {
  const item = ITEMS[id];
  return item ? new THREE.Color(item.color) : new THREE.Color(0xffffff);
}

export function placeVoxel(x, y, z, id, scene) {
  const sx = snapToGrid(x);
  const sy = snapToGrid(y);
  const sz = snapToGrid(z);
  const key = voxelKey(sx, sy, sz);
  if (voxelGrid.has(key)) return false;

  const geo = new THREE.BoxGeometry(VOXEL_SIZE, VOXEL_SIZE, VOXEL_SIZE);
  const mat = new THREE.MeshStandardMaterial({
    color: getBlockColor(id),
    roughness: 0.9
  });

  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(sx, sy, sz);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.userData.voxelKey = key;
  mesh.userData.voxelId = id;

  scene.add(mesh);
  voxelGrid.set(key, mesh);
  voxelBlocks.push(mesh);

  return true;
}

export function removeVoxelAt(x, y, z, scene) {
  const key = voxelKey(x, y, z);
  const mesh = voxelGrid.get(key);
  if (!mesh) return null;

  scene.remove(mesh);
  mesh.geometry.dispose();
  mesh.material.dispose();
  voxelGrid.delete(key);

  const idx = voxelBlocks.indexOf(mesh);
  if (idx >= 0) voxelBlocks.splice(idx, 1);

  return mesh.userData.voxelId;
}

export function getVoxelBlocks() {
  return voxelBlocks;
}

export function getVoxelCount() {
  return voxelBlocks.length;
}
