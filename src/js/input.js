export const input = {
  yaw: 0,
  pitch: 0,
  joyX: 0,
  joyY: 0,
  jumpRequested: false
};

let lookTouchId = null;
let lastLookX = 0;
let lastLookY = 0;

let activeTouchId = null;
let touchStartX = 0;
let touchStartY = 0;
let touchStartTime = 0;
let movedTooFar = false;
let breakMode = false;
let longPressTimer = null;
let breakInterval = null;

const LONG_PRESS_DELAY = 500;
const BREAK_REPEAT = 300;

let started = false;
let invOpen = false;

// Callback
let onPlaceCallback = null;
let onBreakCallback = null;

function isInControlArea(x, y) {
  const jx = 30, jy = innerHeight - 140;
  if (x > jx && x < jx + 140 && y > jy && y < jy + 140) return true;
  const bx = innerWidth - 110, by = innerHeight - 110;
  if (x > bx && y > by) return true;
  if (y > innerHeight - 70) return true;
  if (y < 80 && x > innerWidth - 90) return true;
  return false;
}

export function initInput(renderer, callbacks) {
  onPlaceCallback = callbacks.onPlace;
  onBreakCallback = callbacks.onBreak;

  // === TOUCH ===
  function onLookStart(e) {
    if (invOpen) return;
    for (const t of e.changedTouches) {
      if (isInControlArea(t.clientX, t.clientY)) continue;
      if (lookTouchId !== null) continue;

      lookTouchId = t.identifier;
      lastLookX = t.clientX;
      lastLookY = t.clientY;

      activeTouchId = t.identifier;
      touchStartX = t.clientX;
      touchStartY = t.clientY;
      touchStartTime = performance.now();
      movedTooFar = false;
      breakMode = false;

      clearTimeout(longPressTimer);
      longPressTimer = setTimeout(() => {
        if (!movedTooFar && started && !invOpen && activeTouchId !== null) {
          breakMode = true;
          if (onBreakCallback) onBreakCallback();
          clearInterval(breakInterval);
          breakInterval = setInterval(() => {
            if (breakMode && activeTouchId !== null && !invOpen) {
              if (onBreakCallback) onBreakCallback();
            } else {
              clearInterval(breakInterval);
              breakInterval = null;
            }
          }, BREAK_REPEAT);
        }
      }, LONG_PRESS_DELAY);
    }
  }

  function onLookMove(e) {
    if (invOpen) return;
    for (const t of e.changedTouches) {
      if (t.identifier !== lookTouchId) continue;

      const dx = t.clientX - lastLookX;
      const dy = t.clientY - lastLookY;
      lastLookX = t.clientX;
      lastLookY = t.clientY;
      input.yaw -= dx * 0.005;
      input.pitch -= dy * 0.005;
      input.pitch = Math.max(-Math.PI / 2 + 0.05, Math.min(Math.PI / 2 - 0.05, input.pitch));

      const distFromStart = Math.hypot(t.clientX - touchStartX, t.clientY - touchStartY);
      if (distFromStart > 20) {
        movedTooFar = true;
        clearTimeout(longPressTimer);
        clearInterval(breakInterval);
        breakInterval = null;
        breakMode = false;
      }
    }
  }

  function onLookEnd(e) {
    for (const t of e.changedTouches) {
      if (t.identifier !== lookTouchId) continue;
      lookTouchId = null;
      clearTimeout(longPressTimer);
      clearInterval(breakInterval);
      breakInterval = null;

      if (!breakMode && !movedTooFar && started && !invOpen) {
        const dist = Math.hypot(t.clientX - touchStartX, t.clientY - touchStartY);
        const dt = performance.now() - touchStartTime;
        if (dist < 20 && dt < LONG_PRESS_DELAY) {
          if (onPlaceCallback) onPlaceCallback();
        }
      }

      activeTouchId = null;
      breakMode = false;
    }
  }

  renderer.domElement.addEventListener('touchstart', onLookStart, { passive: false });
  renderer.domElement.addEventListener('touchmove', onLookMove, { passive: false });
  renderer.domElement.addEventListener('touchend', onLookEnd);
  renderer.domElement.addEventListener('touchcancel', onLookEnd);

  // === KEYBOARD ===
  addEventListener('keydown', (e) => {
    if (e.code === 'Digit1') callbacks.onSelectHotbar(0);
    if (e.code === 'Digit2') callbacks.onSelectHotbar(1);
    if (e.code === 'Digit3') callbacks.onSelectHotbar(2);
    if (e.code === 'Digit4') callbacks.onSelectHotbar(3);
    if (e.code === 'Digit5') callbacks.onSelectHotbar(4);
  });

  // === JOYSTICK ===
  const joyBase = document.getElementById('joystick-base');
  const joyKnob = document.getElementById('joystick-knob');
  let joyTouchId = null;

  if (joyBase) {
    joyBase.addEventListener('touchstart', (e) => {
      e.stopPropagation();
      for (const t of e.changedTouches) {
        if (joyTouchId === null) joyTouchId = t.identifier;
      }
    }, { passive: false });

    joyBase.addEventListener('touchmove', (e) => {
      e.stopPropagation();
      const rect = joyBase.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      for (const t of e.changedTouches) {
        if (t.identifier === joyTouchId) {
          let dx = t.clientX - cx, dy = t.clientY - cy;
          const max = rect.width / 2;
          const dist = Math.hypot(dx, dy);
          if (dist > max) { dx = dx / dist * max; dy = dy / dist * max; }
          input.joyX = dx / max;
          input.joyY = dy / max;
          joyKnob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
        }
      }
    }, { passive: false });

    function resetJoy(e) {
      e.stopPropagation();
      for (const t of e.changedTouches) {
        if (t.identifier === joyTouchId) {
          joyTouchId = null;
          input.joyX = 0;
          input.joyY = 0;
          joyKnob.style.transform = 'translate(-50%, -50%)';
        }
      }
    }
    joyBase.addEventListener('touchend', resetJoy);
    joyBase.addEventListener('touchcancel', resetJoy);
  }

  // === JUMP ===
  const jumpBtn = document.getElementById('jump-btn');
  if (jumpBtn) {
    jumpBtn.addEventListener('touchstart', (e) => {
      e.stopPropagation();
      e.preventDefault();
      if (!invOpen) input.jumpRequested = true;
    }, { passive: false });
  }
}

export function setStarted(val) {
  started = val;
}

export function setInvOpen(val) {
  invOpen = val;
}
