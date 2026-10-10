import * as THREE from 'three';
import { COLORS } from './config.js';
import { getHeight } from './noise.js';

const C_WATER = new THREE.Color(COLORS.water);
const C_SAND = new THREE.Color(COLORS.sand);
const C_GRASS = new THREE.Color(COLORS.grass);
const C_GRASS_DARK = new THREE.Color(COLORS.grassDark);
const C_ROCK = new THREE.Color(COLORS.rock);
const C_ROCK_DARK = new THREE.Color(COLORS.rockDark);
const C_SNOW = new THREE.Color(COLORS.snow);

export function getVertexColor(h, wx, wz) {
  if (h < -1) return C_WATER;
  if (h < 1) return C_SAND;

  const eps = 1.5;
  const hx = getHeight(wx + eps, wz) - getHeight(wx - eps, wz);
  const hz = getHeight(wx, wz + eps) - getHeight(wx, wz - eps);
  const slope = Math.hypot(hx, hz) / (2 * eps);

  // Salju di puncak gunung (>38)
  if (h > 38) return C_SNOW;

  // Batu gelap di ketinggian menengah-tinggi (28-38)
  if (h > 28) {
    const t = (h - 28) / 10;
    return C_ROCK_DARK.clone().lerp(C_SNOW, t);
  }

  // Batu di lereng curam
  if (slope > 0.6) return C_ROCK_DARK;
  if (slope > 0.35) return C_ROCK;

  // Rumput
  const v = (Math.sin(wx * 0.7) + Math.cos(wz * 0.7)) * 0.5;
  return v > 0 ? C_GRASS : C_GRASS_DARK;
}
