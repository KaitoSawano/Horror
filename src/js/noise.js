// Fungsi noise & heightmap

function hash(x, z) {
  let n = Math.sin(x * 127.1 + z * 311.7) * 43758.5453;
  return n - Math.floor(n);
}

function smoothNoise(x, z) {
  const xi = Math.floor(x), zi = Math.floor(z);
  const xf = x - xi, zf = z - zi;
  const u = xf * xf * (3 - 2 * xf);
  const v = zf * zf * (3 - 2 * zf);
  const a = hash(xi, zi);
  const b = hash(xi + 1, zi);
  const c = hash(xi, zi + 1);
  const d = hash(xi + 1, zi + 1);
  return a * (1 - u) * (1 - v) + b * u * (1 - v) + c * (1 - u) * v + d * u * v;
}

function fractalNoise(x, z, octaves, persistence, scale) {
  let total = 0;
  let amplitude = 1;
  let frequency = scale;
  let maxValue = 0;

  for (let i = 0; i < octaves; i++) {
    total += smoothNoise(x * frequency, z * frequency) * amplitude;
    maxValue += amplitude;
    amplitude *= persistence;
    frequency *= 2;
  }

  return total / maxValue;
}

// ===== KONTINEN =====
function getContinentHeight(x, z) {
  const n = fractalNoise(x, z, 3, 0.5, 0.0006);

  if (n < 0.45) {
    return -30 + (n / 0.45) * 30;
  } else if (n < 0.5) {
    return 0 + ((n - 0.45) / 0.05) * 3;
  } else {
    return 3 + ((n - 0.5) / 0.5) * 30;
  }
}

// ===== SUNGAI =====
function getRiverCarve(x, z) {
  const n1 = smoothNoise(x * 0.004, z * 0.004);
  const n2 = smoothNoise(x * 0.008 + 100, z * 0.008 + 100);
  const d1 = Math.abs(n1 - 0.5);
  const d2 = Math.abs(n2 - 0.5);
  const dist = Math.min(d1, d2);

  if (dist < 0.035) {
    const t = dist / 0.035;
    return (1 - t) * (1 - t) * 5;
  }
  return 0;
}

// ===== DANAU =====
function getLakeCarve(x, z) {
  const n = fractalNoise(x + 500, z + 500, 2, 0.5, 0.004);
  if (n > 0.72) {
    const t = (n - 0.72) / 0.28;
    return t * t * 6;
  }
  return 0;
}

// ===== PALUNG LAUT (LANGKA) =====
// Cek apakah titik ini di jalur palung
function getTrenchCarve(x, z, baseHeight) {
  // Palung cuma di area laut dalam
  if (baseHeight > -10) return 0;

  // === ZONA PALUNG ===
  // Noise skala SANGAT besar — bikin "zona" tempat palung boleh muncul
  // Cuma ~15% area laut yang punya palung
  const zoneNoise = fractalNoise(x * 0.0004 + 3000, z * 0.0004 + 3000, 2, 0.5, 1);
  if (zoneNoise < 0.72) return 0; // 72% area: gak ada palung

  // === JALUR PALUNG ===
  // Cuma di zona yang lolos, cek jalur palung
  const n1 = smoothNoise(x * 0.0015 + 1000, z * 0.0015 + 1000);
  const n2 = smoothNoise(x * 0.003 + 2000, z * 0.003 + 2000);

  const d1 = Math.abs(n1 - 0.5);
  const d2 = Math.abs(n2 - 0.5);
  const dist = Math.min(d1, d2);

  // Palung: 0.015 lebar (lebih sempit & tajam)
  if (dist < 0.015) {
    const t = dist / 0.015;

    // Makin ke tengah, makin dalam
    // Max kedalaman: 120 unit
    const depth = (1 - t * t) * 120;

    // Fade-in palung di tepi zona biar transisi halus
    const zoneFade = Math.min(1, (zoneNoise - 0.72) / 0.08);
    return depth * zoneFade;
  }
  return 0;
}

// ===== HEIGHT UTAMA =====
export function getHeight(x, z) {
  // Layer 1: Kontinen
  let h = getContinentHeight(x, z);

  // Layer 2: Palung (cuma di laut dalam + zona langka)
  if (h < -10) {
    h -= getTrenchCarve(x, z, h);
  }

  // Layer 3: Sungai (cuma di daratan)
  if (h > 0) {
    h -= getRiverCarve(x, z);
  }

  // Layer 4: Danau (cuma di daratan)
  if (h > 0) {
    h -= getLakeCarve(x, z);
  }

  // Layer 5: Bukit & gunung (cuma di daratan)
  if (h > 2) {
    h += (smoothNoise(x * 0.02, z * 0.02) - 0.5) * 10;
    h += (smoothNoise(x * 0.05, z * 0.05) - 0.5) * 4;

    const mountainNoise = smoothNoise(x * 0.003, z * 0.003);
    if (mountainNoise > 0.65) {
      const mountainFactor = (mountainNoise - 0.65) / 0.35;
      h += Math.pow(mountainFactor, 1.5) * 50;
    }

    const cliffNoise = smoothNoise(x * 0.008 + 500, z * 0.008 + 500);
    if (cliffNoise > 0.7) {
      const cliffFactor = (cliffNoise - 0.7) / 0.3;
      h += cliffFactor * 20;
    }
  }

  // Layer 6: Detail kecil
  h += (smoothNoise(x * 0.1, z * 0.1) - 0.5) * 1;

  return h;
}

export function seededRandom(seed) {
  let s = Math.sin(seed) * 10000;
  return s - Math.floor(s);
}
