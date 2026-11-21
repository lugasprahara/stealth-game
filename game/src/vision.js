// NIGHTVAULT — vision.js: what a guard can see, and how fast suspicion grows.
// A guard sees the player only when ALL three hold:
//   1. the player is inside the cone's range,
//   2. the player is inside the cone's angle,
//   3. no wall or cover sits between them (line of sight).
import { CONE_HALF_ANGLE, DETECT_BASE_RATE, DETECT_CLOSE_RATE, DETECT_DECAY_RATE } from './config.js';
import { hasLineOfSight } from './world.js';

export function angleDifference(a, b) {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}

// Returns { seen, distance, closeness } — closeness is 1 at the guard's
// nose and 0 at the edge of the cone, so detection fills faster up close.
export function guardSeesPlayer(world, guard, player) {
  const dx = player.x - guard.x;
  const dy = player.y - guard.y;
  const distance = Math.hypot(dx, dy);
  if (distance > guard.coneLength) return { seen: false, distance, closeness: 0 };
  const angleToPlayer = Math.atan2(dy, dx);
  if (Math.abs(angleDifference(angleToPlayer, guard.facing)) > CONE_HALF_ANGLE) {
    return { seen: false, distance, closeness: 0 };
  }
  if (!hasLineOfSight(world, guard.x, guard.y, player.x, player.y)) {
    return { seen: false, distance, closeness: 0 };
  }
  return { seen: true, distance, closeness: 1 - distance / guard.coneLength };
}

// Advance one guard's detection meter for a frame (dt in seconds).
// Returns true the moment the meter hits 1 — the player is caught.
export function updateDetection(guard, sight, dt) {
  if (sight.seen) {
    const rate = DETECT_BASE_RATE + DETECT_CLOSE_RATE * sight.closeness;
    guard.detection = Math.min(1, guard.detection + rate * dt);
  } else {
    guard.detection = Math.max(0, guard.detection - DETECT_DECAY_RATE * dt);
  }
  return guard.detection >= 1;
}

// The single number the HUD shows: the most suspicious guard right now.
export function highestDetection(guards) {
  let top = 0;
  for (const guard of guards) top = Math.max(top, guard.detection);
  return top;
}
