import * as THREE from 'three';
import { getHeight, getBiome } from './noise.js';

const C_ABYSS = new THREE.Color(0x020208);
const C_TRENCH = new THREE.Color(0x061428);
const C_DEEP_WATER = new THREE.Color(0x0a2a4a);
const C_WATER = new THREE.Color(0x1a5a8a);
const C_SHALLOW = new THREE.Color(0x2a7ab0);
const C_SAND = new THREE.Color(0xd4c48a);

// Bioma warna
const C_GRASS = new THREE.Color(0x4a7c3a);
const C_GRASS_DARK = new THREE.Color(0x2d5a1f);
const C_DESERT = new THREE.Color(0xd4a86a);
const C_DESERT_DARK = new THREE.Color(0xa87a4a);
const C_SNOW_LAND = new THREE.Color(0xe8e8f0);
const C_ICE = new THREE.Color(0xc8d8e8);
const C_TROPICAL = new THREE.Color(0x2a8a3a);
const C_TROPICAL_DARK = new THREE.Color(0x1a5a2a);
const C_ROCK = new THREE.Color(0x6a6a6a);
const C_ROCK_DARK = new THREE.Color(0x4a4a4a);

export function getVertexColor(h, wx, wz) {
  // PALUNG
  if (h < -70) return C_ABYSS;
  if (h < -30) {
    const t = (h + 70) / 40;
    return C_ABYSS.clone().lerp(C_TRENCH, t);
  }
  if (h < -10) return C_TRENCH;
  if (h < -3) {
    const t = (h + 10) / 7;
    return C_TRENCH.clone().lerp(C_DEEP_WATER, t);
  }
  if (h < -0.5) return C_WATER;
  if (h < 0.5) return C_SHALLOW;
  if (h < 1.5) return C_SAND;

  // === DARATAN ===
  const eps = 1.5;
  const hx = getHeight(wx + eps, wz) - getHeight(wx - eps, wz);
  const hz = getHeight(wx, wz + eps) - getHeight(wx, wz - eps);
  const slope = Math.hypot(hx, hz) / (2 * eps);

  if (slope > 0.6) return C_ROCK_DARK;
  if (slope > 0.35) return C_ROCK;
  if (h > 35) return C_SNOW_LAND;

  const biome = getBiome(wx, wz);
  const v = (Math.sin(wx * 0.7) + Math.cos(wz * 0.7)) * 0.5;

  if (biome === 2) {
    if (h > 25) {
      const t = (h - 25) / 10;
      return C_ROCK_DARK.clone().lerp(C_SNOW_LAND, t);
    }
    return v > 0 ? C_SNOW_LAND : C_ICE;
  }

  if (biome === 1) return v > 0 ? C_DESERT : C_DESERT_DARK;
  if (biome === 3) return v > 0 ? C_TROPICAL : C_TROPICAL_DARK;

  if (h > 28) {
    const t = (h - 28) / 10;
    return C_ROCK_DARK.clone().lerp(C_SNOW_LAND, t);
  }
  return v > 0 ? C_GRASS : C_GRASS_DARK;
}
