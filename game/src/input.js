// NIGHTVAULT — input.js: keyboard + mouse, in one small state object.
// Keys are tracked by their physical code so WASD and arrows both work and
// the page never scrolls while playing. Clicks are reported in canvas
// coordinates (the canvas is scaled to fit the window, so client pixels
// are converted back to game pixels).
export function createInput(canvas) {
  const input = {
    up: false, down: false, left: false, right: false,
    click: null, // {x, y} in game coordinates, consumed by the game loop
    pressedKeys: new Set(),
  };

  const KEY_MAP = {
    KeyW: 'up', ArrowUp: 'up',
    KeyS: 'down', ArrowDown: 'down',
    KeyA: 'left', ArrowLeft: 'left',
    KeyD: 'right', ArrowRight: 'right',
  };

  window.addEventListener('keydown', (event) => {
    const dir = KEY_MAP[event.code];
    if (dir) {
      input[dir] = true;
      event.preventDefault();
    }
    input.pressedKeys.add(event.code);
  });
  window.addEventListener('keyup', (event) => {
    const dir = KEY_MAP[event.code];
    if (dir) input[dir] = false;
    input.pressedKeys.delete(event.code);
  });
  window.addEventListener('blur', () => {
    input.up = input.down = input.left = input.right = false;
    input.pressedKeys.clear();
  });

  canvas.addEventListener('pointerdown', (event) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    input.click = {
      x: (event.clientX - rect.left) * scaleX,
      y: (event.clientY - rect.top) * scaleY,
    };
  });

  return input;
}

// True once for the frame the key went down (for menus / retry / advance).
export function wasPressed(input, code) {
  return input.pressedKeys.has(code);
}
export function consumePress(input, code) {
  input.pressedKeys.delete(code);
}
