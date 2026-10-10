// Konstanta global game

export const CHUNK_SIZE = 64;
export const CHUNK_SEG = 24;
export const RENDER_DISTANCE = 3;
export const MAX_CHUNKS_PER_FRAME = 1;

export const VOXEL_SIZE = 1.0;

export const INVENTORY_SIZE = 20;
export const HOTBAR_SIZE = 5;

export const DAY_DURATION = 600; // 10 menit

export const PLAYER = {
  speed: 8,
  jumpSpeed: 9,
  gravity: 22,
  eyeHeight: 1.7,
  radius: 0.4
};

export const COLORS = {
  water: 0x1a5a8a,
  sand: 0xd4c48a,
  grass: 0x4a7c3a,
  grassDark: 0x2d5a1f,
  rock: 0x6a6a6a,
  rockDark: 0x4a4a4a,
  snow: 0xe8e8f0
};

export const ITEMS = {
  grass: { color: '#4a7c3a', name: 'Grass Block' },
  dirt: { color: '#6b4423', name: 'Dirt' },
  stone: { color: '#6a6a6a', name: 'Stone' },
  wood: { color: '#8b5a2b', name: 'Wood Log' },
  ore: { color: '#ffcc00', name: 'Gold Ore' }
};
