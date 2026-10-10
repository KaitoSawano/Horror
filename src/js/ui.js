import { getTimeOfDay } from './sky.js';
import { getVoxelCount } from './voxel.js';
import { health } from './player.js';

const posEl = document.getElementById('pos');

// Bikin health bar otomatis kalau belum ada di HTML
let healthBar = document.getElementById('health-bar');
if (!healthBar) {
  healthBar = document.createElement('div');
  healthBar.id = 'health-bar';
  healthBar.innerHTML = '<div id="health-fill"></div>';
  document.body.appendChild(healthBar);
}

// Bikin damage overlay kalau belum ada
let damageOverlay = document.getElementById('damage-overlay');
if (!damageOverlay) {
  damageOverlay = document.createElement('div');
  damageOverlay.id = 'damage-overlay';
  document.body.appendChild(damageOverlay);
}

export function updateUI(player) {
  if (!posEl) return;

  const t = getTimeOfDay();
  const hour = Math.floor(t * 24);
  const minute = Math.floor((t * 24 - hour) * 60);
  const timeStr = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;

  // Status air
  let waterStatus = '';
  if (player.inWater) {
    waterStatus = ' | 🌊 ' + player.waterDepth.toFixed(1) + 'm';
  }

  // Status HP
  const hpStr = Math.ceil(health.current) + '/' + health.max;

  posEl.textContent = `X: ${player.x.toFixed(0)} Z: ${player.z.toFixed(0)} Y: ${player.y.toFixed(1)} | ${timeStr} | HP: ${hpStr} | Blok: ${getVoxelCount()}${waterStatus}`;

  // Update health bar
  const fill = document.getElementById('health-fill');
  if (fill) {
    const pct = (health.current / health.max) * 100;
    fill.style.width = pct + '%';
    if (pct > 50) fill.style.background = '#4ade80';
    else if (pct > 25) fill.style.background = '#fbbf24';
    else fill.style.background = '#ef4444';
  }
}
