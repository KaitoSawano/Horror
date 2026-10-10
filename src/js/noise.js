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

// ===== SUPER KONTINEN (dengan transisi halus) =====
function getSuperContinent(x, z) {
  const n = fractalNoise(x, z, 4, 0.6, 0.0003);
  return (n - 0.5) * 2; // -1 sampai +1
}

// ===== PULAU SEDANG =====
function getMediumIslandNoise(x, z) {
  const n = fractalNoise(x + 20000, z + 20000, 3, 0.55, 0.0015);
  if (n > 0.6) return (n - 0.6) / 0.4;
  return 0;
}

// ===== PULAU KECIL =====
function getIslandNoise(x, z) {
  const n = fractalNoise(x + 10000, z + 10000, 3, 0.5, 0.004);
  if (n > 0.65) return (n - 0.65) / 0.35;
  return 0;
}

// ===== HEIGHT UTAMA =====
export function getHeight(x, z) {
  // === LAYER 1: SUPER KONTINEN ===
  const superCont = getSuperContinent(x, z);

  // Transisi HALUS: pakai smoothstep
  // -1 = laut dalam, 0 = pantai, +1 = daratan tinggi
  let baseHeight;
  if (superCont < 0) {
    // Laut: -1 → -40 unit
    baseHeight = superCont * 40;
  } else {
    // Darat: 0 → +30 unit (tapi pake kurva biar gak tajam di tepi)
    // Pakai pow biar tepi daratan landai, tengah tinggi
    baseHeight = Math.pow(superCont, 0.7) * 30;
  }

  // === LAYER 2: PULAU SEDANG ===
  // Cuma di laut (baseHeight < 5)
  if (baseHeight < 5) {
    const mediumIsland = getMediumIslandNoise(x, z);
    if (mediumIsland > 0) {
      // Kurva biar tepi pulau landai
      baseHeight += Math.pow(mediumIsland, 0.8) * 12;
    }
  }

  // === LAYER 3: PULAU KECIL ===
  if (baseHeight < 3) {
    const smallIsland = getIslandNoise(x, z);
    if (smallIsland > 0) {
      baseHeight += Math.pow(smallIsland, 0.8) * 6;
    }
  }

  // === LAYER 4: BUKIT & GUNUNG ===
  // Cuma di daratan yang udah "matang" (baseHeight > 5)
  // Ini kunci: jangan bikin gunung di tepi pantai!
  if (baseHeight > 5) {
    // Fade-in efek gunung: makin jauh dari pantai, makin kuat
    // Di baseHeight = 5 → 0, di baseHeight = 15 → 1
    const landFactor = Math.min(1, (baseHeight - 5) / 10);

    // Bukit sedang
    const hillNoise = (smoothNoise(x * 0.02, z * 0.02) - 0.5) * 8;
    baseHeight += hillNoise * landFactor;

    // Bukit kecil
    const smallHill = (smoothNoise(x * 0.05, z * 0.05) - 0.5) * 3;
    baseHeight += smallHill * landFactor;

    // Gunung tinggi — cuma di daratan tinggi
    if (baseHeight > 15) {
      const mountainNoise = smoothNoise(x * 0.003, z * 0.003);
      if (mountainNoise > 0.65) {
        const mountainFactor = (mountainNoise - 0.65) / 0.35;
        // Fade-in juga: gunung cuma di tengah benua
        const mountainLandFactor = Math.min(1, (baseHeight - 15) / 10);
        baseHeight += Math.pow(mountainFactor, 1.5) * 40 * mountainLandFactor;
      }
    }

    // Tebing — cuma di daratan tinggi (bukan tepi pantai)
    if (baseHeight > 20) {
      const cliffNoise = smoothNoise(x * 0.008 + 500, z * 0.008 + 500);
      if (cliffNoise > 0.75) {
        const cliffFactor = (cliffNoise - 0.75) / 0.25;
        const cliffLandFactor = Math.min(1, (baseHeight - 20) / 10);
        baseHeight += cliffFactor * 15 * cliffLandFactor;
      }
    }
  }

  // === LAYER 5: SUNGAI ===
  if (baseHeight > 5) {
    const n1 = smoothNoise(x * 0.004, z * 0.004);
    const n2 = smoothNoise(x * 0.008 + 100, z * 0.008 + 100);
    const d1 = Math.abs(n1 - 0.5);
    const d2 = Math.abs(n2 - 0.5);
    const dist = Math.min(d1, d2);
    if (dist < 0.035) {
      const t = dist / 0.035;
      baseHeight -= (1 - t) * (1 - t) * 5;
    }
  }

  // === LAYER 6: DANAU ===
  if (baseHeight > 5) {
    const lakeN = fractalNoise(x + 500, z + 500, 2, 0.5, 0.004);
    if (lakeN > 0.72) {
      const t = (lakeN - 0.72) / 0.28;
      baseHeight -= t * t * 6;
    }
  }

  // === LAYER 7: PALUNG ===
  if (baseHeight < -30) {
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
        baseHeight -= depth * zoneFade;
      }
    }
  }

  // === LAYER 8: DETAIL KECIL ===
  baseHeight += (smoothNoise(x * 0.1, z * 0.1) - 0.5) * 1;

  return baseHeight;
}

export function seededRandom(seed) {
  let s = Math.sin(seed) * 10000;
  return s - Math.floor(s);
}
