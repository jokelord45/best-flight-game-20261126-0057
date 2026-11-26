// Keyboard and mouse: arrows/WASD fly the plane, Space drops a parcel, P pauses, M mutes,
// 1/2/3 pick a mission on the title screen, Enter confirms. A mouse drag steers too, so the
// game is playable without a keyboard once it has started.
export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;
export const ACTION_MUTE = 4;
export const ACTION_DROP = 8;
export const ACTION_MISSION_1 = 16;
export const ACTION_MISSION_2 = 32;
export const ACTION_MISSION_3 = 64;

const KEY_ACTIONS = {
  Enter: ACTION_CONFIRM,
  Space: ACTION_CONFIRM,
  KeyP: ACTION_PAUSE,
  Escape: ACTION_PAUSE,
  KeyM: ACTION_MUTE,
  Digit1: ACTION_MISSION_1,
  Digit2: ACTION_MISSION_2,
  Digit3: ACTION_MISSION_3,
};

export function createInput(canvas) {
  const keys = new Set();
  let actions = 0;
  let dragX = 0;
  let dragY = 0;
  let dragging = false;

  function onKeyDown(event) {
    if (event.repeat) return;
    keys.add(event.code);
    const action = KEY_ACTIONS[event.code];
    if (action !== undefined) {
      actions |= action;
      event.preventDefault();
    }
    if (event.code === 'Space') {
      // Space is both confirm and drop: the game decides by screen.
      actions |= ACTION_DROP;
      event.preventDefault();
    }
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.code)) event.preventDefault();
  }

  function onKeyUp(event) {
    keys.delete(event.code);
  }

  function onPointerDown(event) {
    dragging = true;
    dragX = 0;
    dragY = 0;
    canvas.setPointerCapture(event.pointerId);
  }

  function onPointerMove(event) {
    if (!dragging) return;
    dragX += event.movementX || 0;
    dragY += event.movementY || 0;
  }

  function onPointerUp() {
    dragging = false;
  }

  function onClick() {
    actions |= ACTION_CONFIRM;
  }

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  canvas.addEventListener('pointerdown', onPointerDown);
  canvas.addEventListener('pointermove', onPointerMove);
  canvas.addEventListener('pointerup', onPointerUp);
  canvas.addEventListener('click', onClick);

  return {
    /** Pitch and turn input for this frame: { pitch: -1..1, turn: -1..1, throttle: -1..1 }. */
    flight() {
      let pitch = 0;
      let turn = 0;
      let throttle = 0;
      if (keys.has('ArrowUp') || keys.has('KeyI')) pitch += 1;
      if (keys.has('ArrowDown') || keys.has('KeyK')) pitch -= 1;
      if (keys.has('KeyW')) throttle += 1;
      if (keys.has('KeyS')) throttle -= 1;
      if (keys.has('ArrowLeft') || keys.has('KeyA')) turn -= 1;
      if (keys.has('ArrowRight') || keys.has('KeyD')) turn += 1;
      // Pitch is the vertical stick: drag up climbs, drag down descends.
      if (keys.has('KeyI')) pitch += 1;
      if (keys.has('KeyK')) pitch -= 1;
      if (dragging) {
        pitch += Math.max(-1, Math.min(1, -dragY / 120));
        turn += Math.max(-1, Math.min(1, dragX / 160));
        dragX *= 0.8;
        dragY *= 0.8;
      }
      return {
        pitch: Math.max(-1, Math.min(1, pitch)),
        turn: Math.max(-1, Math.min(1, turn)),
        throttle,
      };
    },
    /** One-shot actions since the last call; each is reported once. */
    takeActions() {
      const taken = actions;
      actions = 0;
      return taken;
    },
  };
}
