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

function smoothstep(edge0, edge1, x) {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

// ===== SUPER KONTINEN =====
function getSuperContinent(x, z) {
  const n = fractalNoise(x, z, 3, 0.5, 0.0004);
  return (n - 0.5) * 2; // -1 sampai +1
}

// ===== PULAU =====
function getMediumIslandNoise(x, z) {
  const n = fractalNoise(x + 20000, z + 20000, 3, 0.5, 0.0015);
  if (n > 0.6) return (n - 0.6) / 0.4;
  return 0;
}

function getIslandNoise(x, z) {
  const n = fractalNoise(x + 10000, z + 10000, 3, 0.5, 0.004);
  if (n > 0.65) return (n - 0.65) / 0.35;
  return 0;
}

// ===== HEIGHT UTAMA =====
export function getHeight(x, z) {
  const superCont = getSuperContinent(x, z);

  let baseHeight;

  if (superCont < 0) {
    // === LAUT — dengan DROP-OFF ===
    // 4 zona:
    // 1. Bibir pantai (superCont 0 sampai -0.05)  → 0 sampai -0.5
    // 2. Paparan dangkal (superCont -0.05 sampai -0.15) → -0.5 sampai -3
    // 3. DROP-OFF (superCont -0.15 sampai -0.2) → -3 sampai -25 (CURAM!)
    // 4. Laut dalam (superCont -0.2 sampai -1) → -25 sampai -40

    if (superCont > -0.05) {
      // ZONA 1: BIBIR PANTAI
      // Landai banget — 0 sampai -0.5 unit
      const t = smoothstep(0, -0.05, superCont);
      baseHeight = -t * 0.5;
    } else if (superCont > -0.15) {
      // ZONA 2: PAPARAN DANGKAL
      // Landai — -0.5 sampai -3 unit
      // Jarak: superCont -0.05 sampai -0.15 (10% siklus)
      const t = smoothstep(-0.05, -0.15, superCont);
      baseHeight = -0.5 - t * 2.5;
    } else if (superCont > -0.2) {
      // ZONA 3: DROP-OFF — CURAM!
      // Dari -3 sampai -25 unit (22 unit drop!)
      // Jarak: superCont -0.15 sampai -0.2 (5% siklus)
      const t = smoothstep(-0.15, -0.2, superCont);
      baseHeight = -3 - t * 22;
    } else {
      // ZONA 4: LAUT DALAM
      // Dari -25 sampai -40 unit
      const t = smoothstep(-0.2, -1, superCont);
      baseHeight = -25 - t * 15;
    }
  } else {
    // === DARATAN ===
    if (superCont < 0.5) {
      const t = smoothstep(0, 0.5, superCont);
      baseHeight = t * 15;
    } else {
      const t = smoothstep(0.5, 1, superCont);
      baseHeight = 15 + t * 15;
    }
  }

  // === PULAU SEDANG ===
  if (baseHeight < 0) {
    const mediumIsland = getMediumIslandNoise(x, z);
    if (mediumIsland > 0) {
      const t = smoothstep(0, 1, mediumIsland);
      baseHeight += t * 15;
    }
  }

  // === PULAU KECIL ===
  if (baseHeight < 2) {
    const smallIsland = getIslandNoise(x, z);
    if (smallIsland > 0) {
      const t = smoothstep(0, 1, smallIsland);
      baseHeight += t * 8;
    }
  }

  // === BUKIT & GUNUNG ===
  if (baseHeight > 8) {
    const landFactor = smoothstep(8, 20, baseHeight);
    baseHeight += (smoothNoise(x * 0.02, z * 0.02) - 0.5) * 5 * landFactor;
    baseHeight += (smoothNoise(x * 0.05, z * 0.05) - 0.5) * 2 * landFactor;

    if (baseHeight > 20) {
      const mountainNoise = smoothNoise(x * 0.003, z * 0.003);
      if (mountainNoise > 0.72) {
        const mountainFactor = (mountainNoise - 0.72) / 0.28;
        const mountainLandFactor = smoothstep(20, 28, baseHeight);
        baseHeight += Math.pow(mountainFactor, 1.5) * 15 * mountainLandFactor;
      }
    }
  }

  // === SUNGAI ===
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

  // === DANAU ===
  if (baseHeight > 5) {
    const lakeN = fractalNoise(x + 500, z + 500, 2, 0.5, 0.004);
    if (lakeN > 0.72) {
      const t = (lakeN - 0.72) / 0.28;
      baseHeight -= t * t * 6;
    }
  }

  // === PALUNG ===
  if (baseHeight < -35) {
    const zoneNoise = fractalNoise(x * 0.0004 + 3000, z * 0.0004 + 3000, 2, 0.5, 1);
    if (zoneNoise > 0.75) {
      const n1 = smoothNoise(x * 0.0015 + 1000, z * 0.0015 + 1000);
      const n2 = smoothNoise(x * 0.003 + 2000, z * 0.003 + 2000);
      const d1 = Math.abs(n1 - 0.5);
      const d2 = Math.abs(n2 - 0.5);
      const dist = Math.min(d1, d2);
      if (dist < 0.015) {
        const t = dist / 0.015;
        const depth = (1 - t * t) * 80;
        const zoneFade = Math.min(1, (zoneNoise - 0.75) / 0.08);
        baseHeight -= depth * zoneFade;
      }
    }
  }

  // === DETAIL KECIL ===
  baseHeight += (smoothNoise(x * 0.1, z * 0.1) - 0.5) * 1;

  return baseHeight;
}

export function seededRandom(seed) {
  let s = Math.sin(seed) * 10000;
  return s - Math.floor(s);
}
