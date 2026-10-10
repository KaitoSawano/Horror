import { getTimeOfDay } from './sky.js';
import { getVoxelCount } from './voxel.js';
import { health } from './player.js';
import { getDinos } from './dinos.js';

const posEl = document.getElementById('pos');

let healthBar = document.getElementById('health-bar');
if (!healthBar) {
  healthBar = document.createElement('div');
  healthBar.id = 'health-bar';
  healthBar.innerHTML = '<div id="health-fill"></div>';
  document.body.appendChild(healthBar);
}

export function updateUI(player) {
  if (!posEl) return;

  const t = getTimeOfDay();
  const hour = Math.floor(t * 24);
  const minute = Math.floor((t * 24 - hour) * 60);
  const timeStr = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;

  const dinos = getDinos();
  const totalDinos = dinos.length;
  const aliveDinos = dinos.filter(d => d.state !== 'dead').length;

  let nearestDist = 9999;
  let nearestState = '-';
  for (const d of dinos) {
    if (d.state === 'dead') continue;
    const dist = Math.hypot(d.x - player.x, d.z - player.z);
    if (dist < nearestDist) {
      nearestDist = dist;
      nearestState = d.state;
    }
  }

  const dinoStr = nearestDist < 9999
    ? ` | Dino: ${aliveDinos}/${totalDinos} | Deket: ${nearestDist.toFixed(0)}m (${nearestState})`
    : ` | Dino: ${aliveDinos}/${totalDinos}`;

  let waterStatus = '';
  if (player.inWater) waterStatus = ' | 🌊 ' + player.waterDepth.toFixed(1) + 'm';

  const hpStr = Math.ceil(health.current) + '/' + health.max;

  posEl.textContent = `X: ${player.x.toFixed(0)} Z: ${player.z.toFixed(0)} Y: ${player.y.toFixed(1)} | ${timeStr} | HP: ${hpStr} | Blok: ${getVoxelCount()}${dinoStr}${waterStatus}`;

  const fill = document.getElementById('health-fill');
  if (fill) {
    const pct = (health.current / health.max) * 100;
    fill.style.width = pct + '%';
    if (pct > 50) fill.style.background = '#4ade80';
    else if (pct > 25) fill.style.background = '#fbbf24';
    else fill.style.background = '#ef4444';
  }
}
