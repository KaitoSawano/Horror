import { INVENTORY_SIZE, HOTBAR_SIZE, ITEMS } from './config.js';

export const inventory = new Array(INVENTORY_SIZE).fill(null);
export const hotbar = new Array(HOTBAR_SIZE).fill(null);
export let hotbarIndex = 0;

// Isi inventory awal
inventory[0] = { id: 'grass', count: 64 };
inventory[1] = { id: 'dirt', count: 64 };
inventory[2] = { id: 'stone', count: 32 };
inventory[3] = { id: 'wood', count: 16 };
inventory[4] = { id: 'ore', count: 8 };

// Hotbar = 5 slot pertama inventory
for (let i = 0; i < HOTBAR_SIZE; i++) {
  hotbar[i] = inventory[i];
}

export function renderHotbar() {
  document.querySelectorAll('#hotbar .slot').forEach((slot, i) => {
    const icon = slot.querySelector('.slot-icon');
    const item = hotbar[i];
    if (item) {
      icon.style.background = ITEMS[item.id].color;
    } else {
      icon.style.background = 'transparent';
    }
    slot.classList.toggle('active', i === hotbarIndex);
  });
}

export function renderInventory() {
  const grid = document.getElementById('inv-grid');
  if (!grid) return;
  grid.innerHTML = '';
  for (let i = 0; i < INVENTORY_SIZE; i++) {
    const slot = document.createElement('div');
    slot.className = 'inv-slot';
    const item = inventory[i];
    if (item) {
      const icon = document.createElement('div');
      icon.className = 'inv-slot-icon';
      icon.style.background = ITEMS[item.id].color;
      slot.appendChild(icon);

      const count = document.createElement('div');
      count.className = 'inv-slot-count';
      count.textContent = item.count;
      slot.appendChild(count);
    }
    grid.appendChild(slot);
  }
}

export function selectHotbar(index) {
  if (index >= 0 && index < HOTBAR_SIZE) {
    hotbarIndex = index;
    renderHotbar();
  }
}

export function getActiveItem() {
  return hotbar[hotbarIndex];
}

export function consumeActiveItem() {
  const item = hotbar[hotbarIndex];
  if (!item) return;
  item.count--;
  if (item.count <= 0) {
    hotbar[hotbarIndex] = null;
  }
  // Sync ke inventory
  for (let i = 0; i < HOTBAR_SIZE; i++) {
    inventory[i] = hotbar[i];
  }
  renderHotbar();
  renderInventory();
}

export function addItemToInventory(id) {
  // Cari slot yang sama dulu
  for (let i = 0; i < INVENTORY_SIZE; i++) {
    if (inventory[i] && inventory[i].id === id) {
      inventory[i].count++;
      syncHotbar();
      renderHotbar();
      renderInventory();
      return;
    }
  }
  // Kalau gak ada, cari slot kosong
  for (let i = 0; i < INVENTORY_SIZE; i++) {
    if (!inventory[i]) {
      inventory[i] = { id, count: 1 };
      syncHotbar();
      renderHotbar();
      renderInventory();
      return;
    }
  }
}

function syncHotbar() {
  for (let i = 0; i < HOTBAR_SIZE; i++) {
    hotbar[i] = inventory[i];
  }
}

// Setup UI inventory
export function initInventoryUI() {
  const invEl = document.getElementById('inventory');
  const invBtn = document.getElementById('inv-btn');
  const invClose = document.getElementById('inv-close');

  if (!invEl) return null;

  function openInventory() {
    invEl.classList.add('open');
    document.body.classList.add('inv-open');
    renderInventory();
  }

  function closeInventory() {
    invEl.classList.remove('open');
    document.body.classList.remove('inv-open');
  }

  if (invBtn) {
    invBtn.addEventListener('touchstart', (e) => {
      e.stopPropagation();
      e.preventDefault();
      openInventory();
    }, { passive: false });
    invBtn.addEventListener('click', openInventory);
  }

  if (invClose) {
    invClose.addEventListener('touchstart', (e) => {
      e.stopPropagation();
      e.preventDefault();
      closeInventory();
    }, { passive: false });
    invClose.addEventListener('click', closeInventory);
  }

  // Setup hotbar slot
  document.querySelectorAll('#hotbar .slot').forEach((slot) => {
    slot.addEventListener('touchstart', (e) => {
      e.stopPropagation();
      e.preventDefault();
      selectHotbar(parseInt(slot.dataset.slot));
    }, { passive: false });
    slot.addEventListener('click', () => {
      selectHotbar(parseInt(slot.dataset.slot));
    });
  });

  renderHotbar();
  renderInventory();

  return { openInventory, closeInventory };
}
