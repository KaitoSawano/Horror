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

// Heightmap dengan gunung tinggi
export function getHeight(x, z) {
  let h = 0;

  // Kontinen besar (bukit & lembah)
  h += smoothNoise(x * 0.005, z * 0.005) * 30;

  // Perbukitan sedang
  h += smoothNoise(x * 0.02, z * 0.02) * 10;

  // Detail kecil
  h += smoothNoise(x * 0.08, z * 0.08) * 2;

  // === GUNUNG TINGGI ===
  // Noise terpisah yang bikin puncak curam di beberapa titik
  const mountainNoise = smoothNoise(x * 0.003, z * 0.003);
  if (mountainNoise > 0.65) {
    // Makin tinggi dari 0.65, makin curam
    const mountainFactor = (mountainNoise - 0.65) / 0.35; // 0 → 1
    const mountainHeight = Math.pow(mountainFactor, 1.5) * 60; // max 60
    h += mountainHeight;
  }

  // === TEBING CUAM ===
  const cliffNoise = smoothNoise(x * 0.008 + 500, z * 0.008 + 500);
  if (cliffNoise > 0.7) {
    const cliffFactor = (cliffNoise - 0.7) / 0.3;
    h += cliffFactor * 25;
  }

  // Offset global: sebagian besar di bawah 0 (laut)
  h -= 8;

  return h;
}

export function seededRandom(seed) {
  let s = Math.sin(seed) * 10000;
  return s - Math.floor(s);
}
