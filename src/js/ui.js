import { getTimeOfDay } from './sky.js';
import { getVoxelCount } from './voxel.js';

const posEl = document.getElementById('pos');

export function updateUI(player) {
  if (!posEl) return;
  const t = getTimeOfDay();
  const hour = Math.floor(t * 24);
  const minute = Math.floor((t * 24 - hour) * 60);
  const timeStr = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
  posEl.textContent = `X: ${player.x.toFixed(0)} Z: ${player.z.toFixed(0)} Y: ${player.y.toFixed(1)} | ${timeStr} | Blok: ${getVoxelCount()}`;
}
