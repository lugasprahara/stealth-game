// NIGHTVAULT — shots.js: stage a fixed scene for each screenshot.
// ?shot=start  title screen over level 1
// ?shot=play   mid-stealth: the thief crouched by a crate while a guard's
//              cone sweeps past, detection already part-filled
// ?shot=end    the win screen after all three vaults
// ?shot=alert  level 2 mid-chase: a guard in alert state closing in
// Staged scenes are frozen so the render is identical every capture.
import { TILE } from './config.js';
import { tileCenter } from './world.js';

function placeAt(entity, col, row) {
  const spot = tileCenter(col, row);
  entity.x = spot.x;
  entity.y = spot.y;
}

export function stageShot(game, shot, startLevel, restartRun) {
  game.frozen = true;
  if (shot === 'start') {
    startLevel(0);
    game.screen = 'start';
  } else if (shot === 'play') {
    startLevel(0);
    game.screen = 'play';
    // Thief hugging the crate row, guard sweeping left toward them.
    placeAt(game.player, 8, 6);
    const guard = game.guards[0];
    placeAt(guard, 11, 6);
    guard.facing = Math.PI; // looking left, straight at the thief
    guard.detection = 0.35;
    guard.pauseLeft = 2;
    // Second guard visible patrolling the lower hall.
    placeAt(game.guards[1], 3, 9);
    game.guards[1].facing = Math.PI / 2;
  } else if (shot === 'end') {
    startLevel(2);
    game.screen = 'win';
    game.totalTime = 182.4;
    game.player.hasGem = true;
  } else if (shot === 'alert') {
    startLevel(1);
    game.screen = 'play';
    // Thief caught out in the open gallery; guard 0 has spotted them and
    // is chasing, meter nearly full.
    placeAt(game.player, 13, 2);
    const guard = game.guards[0];
    placeAt(guard, 15, 3);
    guard.facing = Math.atan2(TILE * 2 - TILE * 3, TILE * 13 - TILE * 15);
    guard.detection = 0.82;
    guard.state = 'chase';
    guard.chaseLeft = 2.0;
    placeAt(game.guards[1], 19, 9);
    game.guards[1].facing = -Math.PI / 2;
  }
  // Unknown ?shot values fall through to the live title screen.
}
