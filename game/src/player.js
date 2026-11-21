// NIGHTVAULT — player.js: the thief. Keyboard (WASD / arrows) steers
// directly; a mouse click sets a destination the thief walks to on their
// own. Stepping on the gem pockets it; stepping on the exit with the gem
// in hand finishes the level.
import { PLAYER_SPEED, PLAYER_RADIUS, TILE } from './config.js';
import { moveCircle } from './world.js';

export function createPlayer(start) {
  return {
    x: start.x,
    y: start.y,
    radius: PLAYER_RADIUS,
    moveTarget: null, // {x, y} set by mouse click, cleared by keys
    hasGem: false,
    moving: false,
  };
}

export function updatePlayer(world, player, input, dt) {
  let dx = 0;
  let dy = 0;
  if (input.left) dx -= 1;
  if (input.right) dx += 1;
  if (input.up) dy -= 1;
  if (input.down) dy += 1;

  if (dx !== 0 || dy !== 0) {
    // Keyboard takes over: forget any mouse destination.
    player.moveTarget = null;
    const len = Math.hypot(dx, dy);
    const next = moveCircle(world, player.x, player.y, player.radius,
      (dx / len) * PLAYER_SPEED * dt, (dy / len) * PLAYER_SPEED * dt);
    player.x = next.x;
    player.y = next.y;
    player.moving = true;
    return;
  }

  if (player.moveTarget) {
    const tx = player.moveTarget.x - player.x;
    const ty = player.moveTarget.y - player.y;
    const dist = Math.hypot(tx, ty);
    if (dist < 6) {
      player.moveTarget = null;
      player.moving = false;
      return;
    }
    const step = Math.min(dist, PLAYER_SPEED * dt);
    const next = moveCircle(world, player.x, player.y, player.radius,
      (tx / dist) * step, (ty / dist) * step);
    // If a wall blocks the straight line, give up instead of grinding.
    if (next.x === player.x && next.y === player.y) player.moveTarget = null;
    player.x = next.x;
    player.y = next.y;
    player.moving = true;
    return;
  }

  player.moving = false;
}

// True when the player stands on the tile under (x, y).
function standsOnTile(world, player, kind) {
  const col = Math.floor(player.x / TILE);
  const row = Math.floor(player.y / TILE);
  return world.tiles[row] && world.tiles[row][col] === kind;
}

// Pick up the gem when walked over. Returns true on the pickup frame.
export function tryTakeGem(world, player) {
  if (player.hasGem || world.gem.taken) return false;
  if (Math.hypot(player.x - world.gem.x, player.y - world.gem.y) < TILE * 0.7) {
    world.gem.taken = true;
    player.hasGem = true;
    return true;
  }
  return false;
}

// True when the player stands on the exit with the gem pocketed.
export function reachedExit(world, player) {
  if (!player.hasGem) return false;
  return Math.hypot(player.x - world.exit.x, player.y - world.exit.y) < TILE * 0.7;
}
