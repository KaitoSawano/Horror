import * as THREE from 'three';
import { COLORS } from './config.js';
import { getHeight } from './noise.js';

const C_ABYSS = new THREE.Color(0x020208);
const C_TRENCH = new THREE.Color(0x061428);
const C_DEEP_WATER = new THREE.Color(0x0a2a4a);
const C_WATER = new THREE.Color(COLORS.water);
const C_SHALLOW = new THREE.Color(0x2a7ab0);
const C_SAND = new THREE.Color(COLORS.sand);
const C_GRASS = new THREE.Color(COLORS.grass);
const C_GRASS_DARK = new THREE.Color(COLORS.grassDark);
const C_ROCK = new THREE.Color(COLORS.rock);
const C_ROCK_DARK = new THREE.Color(COLORS.rockDark);
const C_SNOW = new THREE.Color(COLORS.snow);

export function getVertexColor(h, wx, wz) {
  // Palung — hampir hitam
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

  const eps = 1.5;
  const hx = getHeight(wx + eps, wz) - getHeight(wx - eps, wz);
  const hz = getHeight(wx, wz + eps) - getHeight(wx, wz - eps);
  const slope = Math.hypot(hx, hz) / (2 * eps);

  if (h > 38) return C_SNOW;
  if (h > 28) {
    const t = (h - 28) / 10;
    return C_ROCK_DARK.clone().lerp(C_SNOW, t);
  }
  if (slope > 0.6) return C_ROCK_DARK;
  if (slope > 0.35) return C_ROCK;

  const v = (Math.sin(wx * 0.7) + Math.cos(wz * 0.7)) * 0.5;
  return v > 0 ? C_GRASS : C_GRASS_DARK;
}
