// Fungsi noise & heightmap — multi benua + pulau

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

// ===== BENUA SUPER (2-3 benua besar) =====
function getSuperContinent(x, z) {
  // Noise SANGAT besar — 3-4 benua raksasa
  const n = fractalNoise(x, z, 4, 0.6, 0.0003);

  // Map ke skala yang bikin benua & lautan jelas
  // n < 0.5 = laut, n > 0.5 = daratan
  return (n - 0.5) * 2; // -1 sampai +1
}

// ===== PULAU KECIL (banyak pulau tersebar) =====
function getIslandNoise(x, z) {
  // Noise sedang — bikin pulau-pulau kecil
  const n = fractalNoise(x + 10000, z + 10000, 3, 0.5, 0.004);

  // Cuma pulau yang "tinggi" dari noise ini yang muncul
  // Threshold 0.65 — 35% area punya pulau
  if (n > 0.65) {
    return (n - 0.65) / 0.35; // 0 sampai 1
  }
  return 0;
}

// ===== PULAU BESAR (ukuran sedang) =====
function getMediumIslandNoise(x, z) {
  const n = fractalNoise(x + 20000, z + 20000, 3, 0.55, 0.0015);
  if (n > 0.6) {
    return (n - 0.6) / 0.4;
  }
  return 0;
}

// ===== HEIGHT UTAMA =====
export function getHeight(x, z) {
  // Layer 1: Super kontinen
  const superCont = getSuperContinent(x, z);

  let h;
  if (superCont < 0) {
    // LAUT
    h = -30 + superCont * 30; // -60 sampai -30
  } else {
    // DARATAN (benua besar)
    h = superCont * 30; // 0 sampai 30
  }

  // Layer 2: Pulau sedang (cuma di laut)
  if (h < 0) {
    const mediumIsland = getMediumIslandNoise(x, z);
    if (mediumIsland > 0) {
      // Bikin pulau naik dari laut
      // Max tinggi pulau sedang: 15 unit
      h += mediumIsland * 15;
    }
  }

  // Layer 3: Pulau kecil (cuma di laut dangkal)
  if (h < 5) {
    const smallIsland = getIslandNoise(x, z);
    if (smallIsland > 0) {
      // Bikin pulau kecil naik
      // Max tinggi pulau kecil: 8 unit
      h += smallIsland * 8;
    }
  }

  // Layer 4: Detail daratan (bukit, gunung) — cuma di daratan
  if (h > 3) {
    h += (smoothNoise(x * 0.02, z * 0.02) - 0.5) * 10;
    h += (smoothNoise(x * 0.05, z * 0.05) - 0.5) * 4;

    // Gunung tinggi
    const mountainNoise = smoothNoise(x * 0.003, z * 0.003);
    if (mountainNoise > 0.65) {
      const mountainFactor = (mountainNoise - 0.65) / 0.35;
      h += Math.pow(mountainFactor, 1.5) * 50;
    }

    // Tebing
    const cliffNoise = smoothNoise(x * 0.008 + 500, z * 0.008 + 500);
    if (cliffNoise > 0.7) {
      const cliffFactor = (cliffNoise - 0.7) / 0.3;
      h += cliffFactor * 20;
    }
  }

  // Layer 5: Sungai (cuma di daratan)
  if (h > 5) {
    const n1 = smoothNoise(x * 0.004, z * 0.004);
    const n2 = smoothNoise(x * 0.008 + 100, z * 0.008 + 100);
    const d1 = Math.abs(n1 - 0.5);
    const d2 = Math.abs(n2 - 0.5);
    const dist = Math.min(d1, d2);
    if (dist < 0.035) {
      const t = dist / 0.035;
      h -= (1 - t) * (1 - t) * 5;
    }
  }

  // Layer 6: Danau (cuma di daratan)
  if (h > 5) {
    const lakeN = fractalNoise(x + 500, z + 500, 2, 0.5, 0.004);
    if (lakeN > 0.72) {
      const t = (lakeN - 0.72) / 0.28;
      h -= t * t * 6;
    }
  }

  // Layer 7: Palung laut (cuma di laut dalam)
  if (h < -30) {
    const zoneNoise = fractalNoise(x * 0.0004 + 3000, z * 0.0004 + 3000, 2, 0.5, 1);
    if (zoneNoise > 0.72) {
      const n1 = smoothNoise(x * 0.0015 + 1000, z * 0.0015 + 1000);
      const n2 = smoothNoise(x * 0.003 + 2000, z * 0.003 + 2000);
      const d1 = Math.abs(n1 - 0.5);
      const d2 = Math.abs(n2 - 0.5);
      const dist = Math.min(d1, d2);
      if (dist < 0.015) {
        const t = dist / 0.015;
        const depth = (1 - t * t) * 100;
        const zoneFade = Math.min(1, (zoneNoise - 0.72) / 0.08);
        h -= depth * zoneFade;
      }
    }
  }

  // Layer 8: Detail kecil
  h += (smoothNoise(x * 0.1, z * 0.1) - 0.5) * 1;

  return h;
}

export function seededRandom(seed) {
  let s = Math.sin(seed) * 10000;
  return s - Math.floor(s);
}
