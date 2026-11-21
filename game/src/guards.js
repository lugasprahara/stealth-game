// NIGHTVAULT — guards.js: patrol routes, alert chases, and the "caught" call.
// A guard has three moods:
//   patrol — walks its waypoints, pausing briefly at each one;
//   chase  — detection crossed the alert threshold: runs at the player;
//   return — lost the player: walks back to its nearest waypoint.
// The guard's facing always follows its movement; while chasing it faces
// the player, so the cone sweeps around as it turns.
import { TILE, GUARD_RADIUS, GUARD_CHASE_SPEED, ALERT_THRESHOLD, CHASE_SECONDS } from './config.js';
import { tileCenter, moveCircle } from './world.js';
import { angleDifference, guardSeesPlayer, updateDetection } from './vision.js';

export function createGuard(def, level) {
  const start = tileCenter(def.waypoints[0][0], def.waypoints[0][1]);
  const waypoints = def.waypoints.map(([col, row]) => tileCenter(col, row));
  return {
    x: start.x,
    y: start.y,
    waypoints,
    waypointIndex: 1 % waypoints.length,
    pauseLeft: 0,
    pauseSeconds: def.pause ?? 0.7,
    facing: Math.PI / 2,
    coneLength: level.coneLength,
    patrolSpeed: level.patrolSpeed,
    detection: 0,
    state: 'patrol',
    chaseLeft: 0,
    lastSeen: null,
    caughtPlayer: false,
  };
}

// Steer toward a point at the given speed; returns true on arrival.
function stepToward(world, guard, tx, ty, speed, dt) {
  const dx = tx - guard.x;
  const dy = ty - guard.y;
  const dist = Math.hypot(dx, dy);
  if (dist < 2) return true;
  const step = Math.min(dist, speed * dt);
  const next = moveCircle(world, guard.x, guard.y, GUARD_RADIUS, (dx / dist) * step, (dy / dist) * step);
  guard.facing = Math.atan2(dy, dx);
  guard.x = next.x;
  guard.y = next.y;
  return dist <= step + 1;
}

function updatePatrol(world, guard, dt) {
  if (guard.pauseLeft > 0) {
    guard.pauseLeft -= dt;
    return;
  }
  const target = guard.waypoints[guard.waypointIndex];
  if (stepToward(world, guard, target.x, target.y, guard.patrolSpeed, dt)) {
    guard.waypointIndex = (guard.waypointIndex + 1) % guard.waypoints.length;
    guard.pauseLeft = guard.pauseSeconds;
  }
}

function updateChase(world, guard, player, dt) {
  guard.chaseLeft -= dt;
  const arrived = stepToward(world, guard, player.x, player.y, GUARD_CHASE_SPEED, dt);
  if (guard.chaseLeft <= 0 || arrived) {
    guard.state = 'return';
    guard.lastSeen = { x: player.x, y: player.y };
  }
}

function updateReturn(world, guard, dt) {
  // Head back to the nearest waypoint, then resume the patrol from there.
  let best = 0;
  let bestDist = Infinity;
  guard.waypoints.forEach((wp, i) => {
    const d = Math.hypot(wp.x - guard.x, wp.y - guard.y);
    if (d < bestDist) { bestDist = d; best = i; }
  });
  const target = guard.waypoints[best];
  if (stepToward(world, guard, target.x, target.y, guard.patrolSpeed, dt)) {
    guard.waypointIndex = (best + 1) % guard.waypoints.length;
    guard.state = 'patrol';
  }
}

// One frame of guard logic. Returns 'caught' when any guard's meter fills.
export function updateGuards(world, guards, player, dt) {
  for (const guard of guards) {
    const sight = guardSeesPlayer(world, guard, player);
    if (sight.seen) guard.lastSeen = { x: player.x, y: player.y };
    if (updateDetection(guard, sight, dt)) {
      guard.caughtPlayer = true;
      return 'caught';
    }
    // Crossing the alert threshold starts a chase even if the player then
    // ducks behind cover — the guard runs to where it last saw them.
    if (guard.detection >= ALERT_THRESHOLD && guard.state !== 'chase') {
      guard.state = 'chase';
      guard.chaseLeft = CHASE_SECONDS;
    }
    if (guard.state === 'chase') {
      updateChase(world, guard, player, dt);
    } else if (guard.state === 'return') {
      updateReturn(world, guard, dt);
    } else {
      updatePatrol(world, guard, dt);
    }
    // A guard that calmed down fully forgets the player.
    if (guard.state !== 'chase' && guard.detection <= 0) guard.lastSeen = null;
  }
  return 'ok';
}

// Turn the facing smoothly toward a target angle (used when a guard pauses
// at a waypoint and scans the room instead of standing still).
export function scanAround(guard, dt, sweepSeconds = 2.4) {
  guard.facing += (Math.PI * 2 / sweepSeconds) * dt * 0.25;
}
