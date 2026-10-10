// Fungsi noise & heightmap — bioma + benua + pulau + lautan dinamis

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

// ===== BIOMA =====
export function getBiome(x, z) {
  const temp = fractalNoise(x * 0.0003 + 500, z * 0.0003 + 500, 3, 0.5, 1);
  const humid = fractalNoise(x * 0.0003 + 1500, z * 0.0003 + 1500, 3, 0.5, 1);

  if (temp < 0.35) return 2;
  if (temp > 0.7 && humid < 0.4) return 1;
  if (temp > 0.6 && humid > 0.6) return 3;
  return 0;
}

// ===== KONTINEN (dengan lautan dinamis) =====
function getLandValue(x, z) {
  // Layer 1: Benua raksasa — skala sangat besar
  // Bikin lautan SANGAT LUAS di antara benua
  const mega = fractalNoise(x, z, 3, 0.5, 0.00025);

  // Layer 2: Benua sedang — skala besar
  const medium = fractalNoise(x + 10000, z + 10000, 3, 0.5, 0.0008);

  // Layer 3: Pulau besar — skala sedang
  const bigIsland = fractalNoise(x + 20000, z + 20000, 3, 0.5, 0.002);

  // Layer 4: Pulau kecil — skala kecil
  const smallIsland = fractalNoise(x + 30000, z + 30000, 3, 0.5, 0.005);

  // Bobot:
  // - Mega 40% (benua raksasa, pemisah lautan luas)
  // - Medium 25% (benua sedang)
  // - Big Island 20% (pulau besar)
  // - Small Island 15% (pulau kecil)
  const combined = mega * 0.4 + medium * 0.25 + bigIsland * 0.2 + smallIsland * 0.15;

  // Map ke -1 sampai +1
  // Geser threshold biar lautan lebih dominan (Minecraft-like)
  // Threshold 0.52 → 52% laut, 48% darat
  return (combined - 0.52) * 2;
}

// ===== HEIGHT UTAMA =====
export function getHeight(x, z) {
  const cont = getLandValue(x, z);

  let baseHeight;

  if (cont < 0) {
    // === LAUT ===
    // Pakai 4 zona dengan jarak yang beda-beda
    // Zona 1 (dangkal): -0.05 → ~50 unit
    // Zona 2 (sedang): -0.15 → ~100 unit
    // Zona 3 (drop-off): -0.2 → ~50 unit
    // Zona 4 (dalam): -0.2 → -1 → ~800 unit (LAUT LUAS!)
    if (cont > -0.05) {
      const t = smoothstep(0, -0.05, cont);
      baseHeight = -t * 0.5;
    } else if (cont > -0.15) {
      const t = smoothstep(-0.05, -0.15, cont);
      baseHeight = -0.5 - t * 2.5;
    } else if (cont > -0.2) {
      const t = smoothstep(-0.15, -0.2, cont);
      baseHeight = -3 - t * 22;
    } else {
      const t = smoothstep(-0.2, -1, cont);
      baseHeight = -25 - t * 15;
    }
  } else {
    // === DARATAN ===
    if (cont < 0.3) {
      const t = smoothstep(0, 0.3, cont);
      baseHeight = t * 10;
    } else if (cont < 0.6) {
      const t = smoothstep(0.3, 0.6, cont);
      baseHeight = 10 + t * 10;
    } else {
      const t = smoothstep(0.6, 1, cont);
      baseHeight = 20 + t * 10;
    }
  }

  // === BUKIT & GUNUNG ===
  if (baseHeight > 8) {
    const landFactor = smoothstep(8, 20, baseHeight);
    baseHeight += (smoothNoise(x * 0.02, z * 0.02) - 0.5) * 5 * landFactor;
    baseHeight += (smoothNoise(x * 0.05, z * 0.05) - 0.5) * 2 * landFactor;

    const biome = getBiome(x, z);
    const mountainMult = biome === 2 ? 25 : 15;

    if (baseHeight > 20) {
      const mountainNoise = smoothNoise(x * 0.003, z * 0.003);
      if (mountainNoise > 0.72) {
        const mountainFactor = (mountainNoise - 0.72) / 0.28;
        const mountainLandFactor = smoothstep(20, 28, baseHeight);
        baseHeight += Math.pow(mountainFactor, 1.5) * mountainMult * mountainLandFactor;
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
