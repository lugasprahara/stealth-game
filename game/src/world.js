// NIGHTVAULT — world.js: turn a level's text map into tiles, and answer
// the two questions the rest of the game keeps asking:
//   "can I stand here?" (movement collision)
//   "can this guard see that spot?" (line of sight)
import { TILE, COLS, ROWS } from './config.js';

export const TILE_KIND = {
  FLOOR: 'floor',
  WALL: 'wall',
  CRATE: 'crate',
  PILLAR: 'pillar',
  CASE: 'case',
  GEM: 'gem',
  EXIT: 'exit',
};

// Tiles that block movement AND sight: walls and every kind of cover.
export function blocksSight(kind) {
  return kind === TILE_KIND.WALL || kind === TILE_KIND.CRATE ||
    kind === TILE_KIND.PILLAR || kind === TILE_KIND.CASE;
}
export function blocksMove(kind) {
  return blocksSight(kind);
}

// Parse one level definition into a playable world object.
export function buildWorld(level) {
  const tiles = [];
  let playerStart = { x: TILE * 1.5, y: TILE * 1.5 };
  let gem = { x: TILE * 1.5, y: TILE * 1.5, taken: false };
  let exit = { x: TILE * 1.5, y: TILE * 1.5 };

  for (let row = 0; row < ROWS; row++) {
    tiles[row] = [];
    for (let col = 0; col < COLS; col++) {
      const ch = level.map[row][col];
      let kind = TILE_KIND.FLOOR;
      if (ch === '#') kind = TILE_KIND.WALL;
      else if (ch === 'c') kind = TILE_KIND.CRATE;
      else if (ch === 'p') kind = TILE_KIND.PILLAR;
      else if (ch === 'd') kind = TILE_KIND.CASE;
      else if (ch === 'g') { kind = TILE_KIND.GEM; gem = tileCenter(col, row); gem.taken = false; }
      else if (ch === 'e') { kind = TILE_KIND.EXIT; exit = tileCenter(col, row); }
      else if (ch === 's') { playerStart = tileCenter(col, row); }
      tiles[row][col] = kind;
    }
  }
  return { tiles, playerStart, gem, exit, level };
}

export function tileCenter(col, row) {
  return { x: col * TILE + TILE / 2, y: row * TILE + TILE / 2 };
}

export function tileAt(world, col, row) {
  if (col < 0 || row < 0 || col >= COLS || row >= ROWS) return TILE_KIND.WALL;
  return world.tiles[row][col];
}

// True when a circle of the given radius fits at (x, y) without touching
// any movement-blocking tile. Checks the four tiles the circle overlaps.
export function circleFits(world, x, y, radius) {
  const minCol = Math.floor((x - radius) / TILE);
  const maxCol = Math.floor((x + radius) / TILE);
  const minRow = Math.floor((y - radius) / TILE);
  const maxRow = Math.floor((y + radius) / TILE);
  for (let row = minRow; row <= maxRow; row++) {
    for (let col = minCol; col <= maxCol; col++) {
      if (blocksMove(tileAt(world, col, row))) {
        const rect = { x: col * TILE, y: row * TILE, w: TILE, h: TILE };
        if (circleRectOverlap(x, y, radius, rect)) return false;
      }
    }
  }
  return true;
}

export function circleRectOverlap(cx, cy, r, rect) {
  const nearestX = Math.max(rect.x, Math.min(cx, rect.x + rect.w));
  const nearestY = Math.max(rect.y, Math.min(cy, rect.y + rect.h));
  const dx = cx - nearestX;
  const dy = cy - nearestY;
  return dx * dx + dy * dy < r * r;
}

// Move a circle by (dx, dy), sliding along walls: try the full step, then
// each axis alone, so the player glides around corners instead of sticking.
export function moveCircle(world, x, y, radius, dx, dy) {
  if (circleFits(world, x + dx, y + dy, radius)) return { x: x + dx, y: y + dy };
  if (circleFits(world, x + dx, y, radius)) return { x: x + dx, y };
  if (circleFits(world, x, y + dy, radius)) return { x, y: y + dy };
  return { x, y };
}

// Line of sight: true when the segment from (x1,y1) to (x2,y2) crosses no
// sight-blocking tile. Steps along the segment in small increments and
// checks the tile under each sample point.
export function hasLineOfSight(world, x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const dist = Math.hypot(dx, dy);
  const steps = Math.max(1, Math.ceil(dist / 6));
  for (let i = 1; i < steps; i++) {
    const t = i / steps;
    const col = Math.floor((x1 + dx * t) / TILE);
    const row = Math.floor((y1 + dy * t) / TILE);
    if (blocksSight(tileAt(world, col, row))) return false;
  }
  return true;
}

// Distance from a point to the nearest sight-blocking tile edge, used to
// clip a vision cone so it stops at walls instead of shining through them.
export function sightDistance(world, x, y, angle, maxDist) {
  const step = 6;
  for (let d = step; d <= maxDist; d += step) {
    const px = x + Math.cos(angle) * d;
    const py = y + Math.sin(angle) * d;
    const col = Math.floor(px / TILE);
    const row = Math.floor(py / TILE);
    if (blocksSight(tileAt(world, col, row))) return d;
  }
  return maxDist;
}
