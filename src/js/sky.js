import * as THREE from 'three';

// ===== KONFIGURASI =====
const DAY_DURATION = 600; // 10 menit

// ===== STATE =====
let timeOfDay = 0.25;
let sunMesh = null;
let moonMesh = null;
let stars = null;
let starsGeo = null;
let starsMat = null;
let starsCount = 0;
let starsPhase = null;
let starsSpeed = null;
let starsBaseBright = null;
let twinkleTime = 0;

// ===== WARNA LANGIT =====
export function getSkyColor(t) {
  const night = new THREE.Color(0x0a0a2a);
  const preDawn = new THREE.Color(0x2a1a3a);
  const dawn = new THREE.Color(0xff9966);
  const noon = new THREE.Color(0x87ceeb);
  const afternoon = new THREE.Color(0x9ab8d8);
  const preSunset = new THREE.Color(0xd88a5a);
  const sunset = new THREE.Color(0xcc5533);
  const dusk = new THREE.Color(0x3a2a4a);
  const lateDusk = new THREE.Color(0x15152a);

  let c = new THREE.Color();
  if (t < 0.1) c.copy(night);
  else if (t < 0.22) c.copy(night).lerp(preDawn, (t - 0.1) / 0.12);
  else if (t < 0.28) c.copy(preDawn).lerp(dawn, (t - 0.22) / 0.06);
  else if (t < 0.33) c.copy(dawn).lerp(noon, (t - 0.28) / 0.05);
  else if (t < 0.55) c.copy(noon);
  else if (t < 0.65) c.copy(noon).lerp(afternoon, (t - 0.55) / 0.10);
  else if (t < 0.70) c.copy(afternoon).lerp(preSunset, (t - 0.65) / 0.05);
  else if (t < 0.74) c.copy(preSunset).lerp(sunset, (t - 0.70) / 0.04);
  else if (t < 0.78) c.copy(sunset).lerp(dusk, (t - 0.74) / 0.04);
  else if (t < 0.85) c.copy(dusk).lerp(lateDusk, (t - 0.78) / 0.07);
  else c.copy(lateDusk).lerp(night, (t - 0.85) / 0.15);
  return c;
}

export function getStarOpacity(t) {
  if (t >= 0.22 && t < 0.72) return 0;
  if (t >= 0.72 && t < 0.88) return (t - 0.72) / 0.16;
  if (t >= 0.88) return 1.0;
  if (t < 0.10) return 1.0;
  if (t < 0.22) return 1.0 - (t - 0.10) / 0.12;
  return 0;
}

// ===== SETUP =====
export function createSky(scene) {
  // Matahari
  sunMesh = new THREE.Mesh(
    new THREE.SphereGeometry(8, 16, 12),
    new THREE.MeshBasicMaterial({ color: 0xffff88, fog: false })
  );
  scene.add(sunMesh);

  // Bulan
  moonMesh = new THREE.Mesh(
    new THREE.SphereGeometry(5, 16, 12),
    new THREE.MeshBasicMaterial({ color: 0xeeeeff, fog: false })
  );
  scene.add(moonMesh);

  // Bintang
  starsCount = 500;
  starsGeo = new THREE.BufferGeometry();
  const starsPos = new Float32Array(starsCount * 3);
  starsPhase = new Float32Array(starsCount);
  starsSpeed = new Float32Array(starsCount);
  starsBaseBright = new Float32Array(starsCount);

  for (let i = 0; i < starsCount; i++) {
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.random() * Math.PI / 2;
    const r = 300;
    starsPos[i * 3] = Math.cos(theta) * Math.cos(phi) * r;
    starsPos[i * 3 + 1] = Math.sin(phi) * r + 50;
    starsPos[i * 3 + 2] = Math.sin(theta) * Math.cos(phi) * r;
    starsPhase[i] = Math.random() * Math.PI * 2;
    starsSpeed[i] = 0.5 + Math.random() * 1.5;
    starsBaseBright[i] = 0.5 + Math.random() * 0.5;
  }
  starsGeo.setAttribute('position', new THREE.BufferAttribute(starsPos, 3));

  const starsColors = new Float32Array(starsCount * 3);
  starsGeo.setAttribute('color', new THREE.BufferAttribute(starsColors, 3));

  starsMat = new THREE.PointsMaterial({
    size: 2.0,
    sizeAttenuation: false,
    transparent: true,
    opacity: 1.0,
    vertexColors: true,
    fog: false
  });
  stars = new THREE.Points(starsGeo, starsMat);
  stars.visible = false;
  scene.add(stars);

  return { sunMesh, moonMesh, stars };
}

// ===== UPDATE =====
export function updateSky(scene, lights, player, delta) {
  timeOfDay += delta / DAY_DURATION;
  if (timeOfDay >= 1) timeOfDay -= 1;

  const skyColor = getSkyColor(timeOfDay);
  scene.background = skyColor;
  scene.fog.color = skyColor;

  // === MATAHARI ===
  // Posisi: muter di sekitar player, tapi baseline Y selalu di atas player
  const sunAngle = (timeOfDay - 0.25) * Math.PI * 2;
  const sunRadius = 150;
  const baselineY = player.y + 30; // cakrawala = 30 unit di atas player

  const sunX = Math.cos(sunAngle) * sunRadius;
  const sunY = Math.sin(sunAngle) * sunRadius + baselineY;
  sunMesh.position.set(player.x + sunX, sunY, player.z);

  // Update directional light (posisi matahari)
  lights.sun.position.set(
    player.x + sunX,
    sunY + 20,
    player.z
  );

  // === BULAN ===
  const moonAngle = sunAngle + Math.PI;
  const moonX = Math.cos(moonAngle) * sunRadius;
  const moonY = Math.sin(moonAngle) * sunRadius + baselineY;
  moonMesh.position.set(player.x + moonX, moonY, player.z);

  // === BINTANG ===
  const starOpacity = getStarOpacity(timeOfDay);
  stars.visible = starOpacity > 0.05;
  if (stars.visible) {
    twinkleTime += delta;
    const colorAttr = starsGeo.attributes.color;
    const arr = colorAttr.array;
    for (let i = 0; i < starsCount; i++) {
      const twinkle = 0.6 + 0.4 * Math.sin(twinkleTime * starsSpeed[i] + starsPhase[i]);
      const brightness = starsBaseBright[i] * twinkle * starOpacity;
      arr[i * 3] = brightness;
      arr[i * 3 + 1] = brightness;
      arr[i * 3 + 2] = brightness;
    }
    colorAttr.needsUpdate = true;
    stars.position.set(player.x, player.y, player.z);
  }

  // === INTENSITAS CAHAYA ===
  const sunHeight = Math.max(0, Math.sin(sunAngle));
  lights.sun.intensity = 0.2 + sunHeight * 1.0;
  lights.ambient.intensity = 0.15 + sunHeight * 0.35;
  lights.hemi.intensity = 0.2 + sunHeight * 0.4;
}

// ===== GETTER =====
export function getTimeOfDay() {
  return timeOfDay;
}
