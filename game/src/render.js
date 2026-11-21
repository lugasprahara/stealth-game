// NIGHTVAULT — render.js: everything the player sees, drawn on one canvas.
// The palette stays bright on purpose: light floors, navy walls, amber
// cover, vivid yellow cones, a cyan gem and a green exit — so the stealth
// reads at a glance even when the screenshot is shrunk to a thumbnail.
import { TILE, COLS, ROWS, VIEW_W, VIEW_H, CONE_HALF_ANGLE, ALERT_THRESHOLD, COLORS } from './config.js';
import { TILE_KIND, tileAt, sightDistance } from './world.js';
import { highestDetection } from './vision.js';

const HUD_H = 44;

export function drawGame(ctx, game) {
  ctx.clearRect(0, 0, VIEW_W, VIEW_H + HUD_H);
  drawFloor(ctx, game.world);
  drawCoverAndWalls(ctx, game.world);
  drawExit(ctx, game.world);
  drawGem(ctx, game.world);
  for (const guard of game.guards) drawVisionCone(ctx, game.world, guard);
  for (const guard of game.guards) drawGuard(ctx, guard);
  drawPlayer(ctx, game.player);
  drawHud(ctx, game);
  if (game.screen !== 'play') drawOverlay(ctx, game);
}

function drawFloor(ctx, world) {
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      const kind = tileAt(world, col, row);
      const x = col * TILE;
      const y = row * TILE + HUD_H;
      if (kind === TILE_KIND.WALL) continue;
      ctx.fillStyle = (col + row) % 2 === 0 ? COLORS.floorA : COLORS.floorB;
      ctx.fillRect(x, y, TILE, TILE);
      ctx.strokeStyle = COLORS.floorEdge;
      ctx.lineWidth = 1;
      ctx.strokeRect(x + 0.5, y + 0.5, TILE - 1, TILE - 1);
    }
  }
}

function drawCoverAndWalls(ctx, world) {
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      const kind = tileAt(world, col, row);
      if (kind === TILE_KIND.FLOOR || kind === TILE_KIND.GEM || kind === TILE_KIND.EXIT) continue;
      const x = col * TILE;
      const y = row * TILE + HUD_H;
      if (kind === TILE_KIND.WALL) {
        ctx.fillStyle = COLORS.wall;
        ctx.fillRect(x, y, TILE, TILE);
        ctx.fillStyle = COLORS.wallTop;
        ctx.fillRect(x, y, TILE, 7);
        ctx.strokeStyle = COLORS.wallEdge;
        ctx.lineWidth = 2;
        ctx.strokeRect(x + 1, y + 1, TILE - 2, TILE - 2);
      } else if (kind === TILE_KIND.CRATE) {
        ctx.fillStyle = COLORS.crate;
        ctx.fillRect(x + 3, y + 3, TILE - 6, TILE - 6);
        ctx.strokeStyle = COLORS.crateEdge;
        ctx.lineWidth = 3;
        ctx.strokeRect(x + 4, y + 4, TILE - 8, TILE - 8);
        ctx.beginPath();
        ctx.moveTo(x + 4, y + 4);
        ctx.lineTo(x + TILE - 4, y + TILE - 4);
        ctx.moveTo(x + TILE - 4, y + 4);
        ctx.lineTo(x + 4, y + TILE - 4);
        ctx.lineWidth = 2;
        ctx.stroke();
      } else if (kind === TILE_KIND.PILLAR) {
        ctx.fillStyle = COLORS.pillar;
        ctx.beginPath();
        ctx.arc(x + TILE / 2, y + TILE / 2, 15, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = COLORS.pillarEdge;
        ctx.lineWidth = 3;
        ctx.stroke();
        ctx.fillStyle = '#a08c64';
        ctx.beginPath();
        ctx.arc(x + TILE / 2, y + TILE / 2, 7, 0, Math.PI * 2);
        ctx.fill();
      } else if (kind === TILE_KIND.CASE) {
        ctx.fillStyle = COLORS.displayCase;
        ctx.fillRect(x + 4, y + 4, TILE - 8, TILE - 8);
        ctx.strokeStyle = COLORS.displayEdge;
        ctx.lineWidth = 3;
        ctx.strokeRect(x + 5, y + 5, TILE - 10, TILE - 10);
        ctx.fillStyle = 'rgba(255,255,255,0.55)';
        ctx.beginPath();
        ctx.arc(x + TILE / 2, y + TILE / 2, 6, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
}

function drawExit(ctx, world) {
  const ex = world.exit.x;
  const ey = world.exit.y + HUD_H;
  ctx.fillStyle = COLORS.exit;
  ctx.fillRect(ex - 18, ey - 18, 36, 36);
  ctx.strokeStyle = COLORS.exitEdge;
  ctx.lineWidth = 3;
  ctx.strokeRect(ex - 18, ey - 18, 36, 36);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 15px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('EXIT', ex, ey);
}

function drawGem(ctx, world) {
  if (world.gem.taken) return;
  const gx = world.gem.x;
  const gy = world.gem.y + HUD_H;
  const pulse = 1 + 0.12 * Math.sin(performance.now() / 240);
  ctx.fillStyle = COLORS.gemGlow;
  ctx.beginPath();
  ctx.arc(gx, gy, 20 * pulse, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = COLORS.gem;
  ctx.beginPath();
  ctx.moveTo(gx, gy - 13);
  ctx.lineTo(gx + 11, gy);
  ctx.lineTo(gx, gy + 13);
  ctx.lineTo(gx - 11, gy);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(gx - 3, gy - 4, 2.5, 0, Math.PI * 2);
  ctx.fill();
}

// A vision cone drawn as a fan of short rays: each ray stops at the first
// wall or cover it hits, so the cone hugs the room instead of shining
// through walls. The player can read exactly where it is safe to stand.
function drawVisionCone(ctx, world, guard) {
  const gx = guard.x;
  const gy = guard.y + HUD_H;
  const alert = guard.state === 'chase';
  const suspicious = guard.detection > 0.05;
  ctx.fillStyle = alert ? COLORS.coneAlert : suspicious ? COLORS.coneSuspicious : COLORS.coneCalm;
  ctx.beginPath();
  ctx.moveTo(gx, gy);
  const rays = 26;
  for (let i = 0; i <= rays; i++) {
    const angle = guard.facing - CONE_HALF_ANGLE + (2 * CONE_HALF_ANGLE * i) / rays;
    const dist = sightDistance(world, guard.x, guard.y, angle, guard.coneLength);
    ctx.lineTo(gx + Math.cos(angle) * dist, gy + Math.sin(angle) * dist);
  }
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = alert ? 'rgba(255,59,48,0.8)' : 'rgba(255,214,64,0.7)';
  ctx.lineWidth = 1.5;
  ctx.stroke();
}

function drawGuard(ctx, guard) {
  const gx = guard.x;
  const gy = guard.y + HUD_H;
  // Body: red circle with a bright ring, facing wedge shows where it looks.
  ctx.fillStyle = COLORS.guard;
  ctx.beginPath();
  ctx.arc(gx, gy, 13, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = COLORS.guardRing;
  ctx.lineWidth = 2.5;
  ctx.stroke();
  ctx.fillStyle = COLORS.guardRing;
  ctx.beginPath();
  ctx.moveTo(gx + Math.cos(guard.facing) * 15, gy + Math.sin(guard.facing) * 15);
  ctx.arc(gx, gy, 15, guard.facing - 0.5, guard.facing + 0.5);
  ctx.closePath();
  ctx.fill();
  // Eyes: two white dots on the facing side.
  const ex = Math.cos(guard.facing);
  const ey = Math.sin(guard.facing);
  const px = -ey;
  const py = ex;
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(gx + ex * 6 + px * 5, gy + ey * 6 + py * 5, 2.4, 0, Math.PI * 2);
  ctx.arc(gx + ex * 6 - px * 5, gy + ey * 6 - py * 5, 2.4, 0, Math.PI * 2);
  ctx.fill();
  // Detection meter arc above the guard + "!" while suspicious.
  if (guard.detection > 0.02) {
    ctx.strokeStyle = 'rgba(20,24,36,0.35)';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(gx, gy, 20, -Math.PI / 2, Math.PI * 1.5);
    ctx.stroke();
    ctx.strokeStyle = guard.state === 'chase' ? '#ff3b30' : '#ff9f1c';
    ctx.beginPath();
    ctx.arc(gx, gy, 20, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * guard.detection);
    ctx.stroke();
    ctx.fillStyle = guard.state === 'chase' ? '#ff3b30' : '#ff9f1c';
    ctx.font = 'bold 20px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('!', gx, gy - 30);
  }
}

function drawPlayer(ctx, player) {
  const px = player.x;
  const py = player.y + HUD_H;
  // Soft shadow, then the thief: dark hooded circle, white ring, cyan scarf.
  ctx.fillStyle = 'rgba(20,24,36,0.25)';
  ctx.beginPath();
  ctx.ellipse(px, py + 10, 12, 5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = COLORS.player;
  ctx.beginPath();
  ctx.arc(px, py, 13, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = COLORS.playerRing;
  ctx.lineWidth = 2.5;
  ctx.stroke();
  ctx.fillStyle = '#19e3ff';
  ctx.beginPath();
  ctx.arc(px, py + 4, 5, 0, Math.PI);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(px - 4, py - 3, 2.2, 0, Math.PI * 2);
  ctx.arc(px + 4, py - 3, 2.2, 0, Math.PI * 2);
  ctx.fill();
  // Pocketed gem glints on the thief.
  if (player.hasGem) {
    ctx.fillStyle = COLORS.gem;
    ctx.beginPath();
    ctx.moveTo(px, py - 16);
    ctx.lineTo(px + 5, py - 11);
    ctx.lineTo(px, py - 6);
    ctx.lineTo(px - 5, py - 11);
    ctx.closePath();
    ctx.fill();
  }
  // Mouse destination marker.
  if (player.moveTarget) {
    ctx.strokeStyle = 'rgba(255,255,255,0.9)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(player.moveTarget.x, player.moveTarget.y + HUD_H, 7, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(player.moveTarget.x - 10, player.moveTarget.y + HUD_H);
    ctx.lineTo(player.moveTarget.x + 10, player.moveTarget.y + HUD_H);
    ctx.moveTo(player.moveTarget.x, player.moveTarget.y + HUD_H - 10);
    ctx.lineTo(player.moveTarget.x, player.moveTarget.y + HUD_H + 10);
    ctx.stroke();
  }
}

function drawHud(ctx, game) {
  ctx.fillStyle = COLORS.hudBar;
  ctx.fillRect(0, 0, VIEW_W, HUD_H);
  ctx.fillStyle = COLORS.hudText;
  ctx.font = 'bold 17px sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(game.world.level.name, 14, HUD_H / 2);
  // Objective, centre.
  const objective = game.player.hasGem ? 'GEM STOLEN — REACH THE EXIT!' : 'STEAL THE GEM, THEN REACH THE EXIT';
  ctx.textAlign = 'center';
  ctx.font = 'bold 15px sans-serif';
  ctx.fillStyle = game.player.hasGem ? COLORS.exit : COLORS.accent;
  ctx.fillText(objective, VIEW_W / 2, HUD_H / 2);
  // Detection meter, right: label + bar + percentage.
  const detection = highestDetection(game.guards);
  const barX = VIEW_W - 232;
  const barW = 130;
  ctx.textAlign = 'left';
  ctx.fillStyle = COLORS.hudText;
  ctx.font = 'bold 13px sans-serif';
  ctx.fillText('SEEN', barX - 42, HUD_H / 2);
  ctx.fillStyle = 'rgba(255,255,255,0.22)';
  ctx.fillRect(barX, HUD_H / 2 - 8, barW, 16);
  ctx.fillStyle = detection >= ALERT_THRESHOLD ? '#ff3b30' : detection > 0.05 ? '#ff9f1c' : '#1fd65a';
  ctx.fillRect(barX, HUD_H / 2 - 8, barW * detection, 16);
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(barX, HUD_H / 2 - 8, barW, 16);
  ctx.fillStyle = COLORS.hudText;
  ctx.fillText(Math.round(detection * 100) + '%', barX + barW + 8, HUD_H / 2);
  // Level pips, far right.
  ctx.textAlign = 'right';
  ctx.fillStyle = COLORS.accent;
  ctx.font = 'bold 15px sans-serif';
  ctx.fillText('◆'.repeat(game.levelIndex + 1) + '◇'.repeat(3 - game.levelIndex - 1), VIEW_W - 14, HUD_H / 2 + 0);
}

function drawOverlay(ctx, game) {
  const cx = VIEW_W / 2;
  const cy = (VIEW_H + HUD_H) / 2;
  if (game.screen === 'start') {
    ctx.fillStyle = 'rgba(16,24,40,0.78)';
    ctx.fillRect(0, HUD_H, VIEW_W, VIEW_H);
    panel(ctx, cx - 330, cy - 190, 660, 400);
    ctx.textAlign = 'center';
    ctx.fillStyle = COLORS.accent;
    ctx.font = 'bold 58px sans-serif';
    ctx.fillText('NIGHTVAULT', cx, cy - 128);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 20px sans-serif';
    ctx.fillText('A top-down stealth heist — steal the gem, reach the exit unseen.', cx, cy - 88);
    ctx.font = '16px sans-serif';
    ctx.fillStyle = '#d7dce8';
    const lines = [
      'Yellow cones are guard vision. Stay out of them — or hide behind crates,',
      'pillars and display cases: they block sight completely.',
      'A guard who spots you fills your SEEN meter. At full, you are caught!',
      '',
      'Move: WASD / arrow keys, or click anywhere to walk there.',
      'Steal the gem, then reach the green EXIT. Three vaults, one night.',
    ];
    lines.forEach((line, i) => ctx.fillText(line, cx, cy - 52 + i * 24));
    button(ctx, cx - 110, cy + 118, 220, 52, 'START THE HEIST', COLORS.accent, COLORS.textDark);
    ctx.fillStyle = '#9aa3b5';
    ctx.font = '14px sans-serif';
    ctx.fillText('or press ENTER', cx, cy + 196 - 8);
  } else if (game.screen === 'caught') {
    ctx.fillStyle = 'rgba(120,10,10,0.72)';
    ctx.fillRect(0, HUD_H, VIEW_W, VIEW_H);
    panel(ctx, cx - 300, cy - 130, 600, 260);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ff6b61';
    ctx.font = 'bold 52px sans-serif';
    ctx.fillText('CAUGHT!', cx, cy - 62);
    ctx.fillStyle = '#ffffff';
    ctx.font = '18px sans-serif';
    ctx.fillText('A guard spotted you. The vault keeps its gem — this time.', cx, cy - 16);
    button(ctx, cx - 110, cy + 22, 220, 52, 'TRY AGAIN  (R)', COLORS.accent, COLORS.textDark);
    ctx.fillStyle = '#9aa3b5';
    ctx.font = '14px sans-serif';
    ctx.fillText('Tip: watch the cones — crates and pillars block their sight.', cx, cy + 108);
  } else if (game.screen === 'levelDone') {
    ctx.fillStyle = 'rgba(16,24,40,0.72)';
    ctx.fillRect(0, HUD_H, VIEW_W, VIEW_H);
    panel(ctx, cx - 300, cy - 120, 600, 240);
    ctx.textAlign = 'center';
    ctx.fillStyle = COLORS.exit;
    ctx.font = 'bold 46px sans-serif';
    ctx.fillText('CLEAN GETAWAY!', cx, cy - 56);
    ctx.fillStyle = '#ffffff';
    ctx.font = '18px sans-serif';
    ctx.fillText(game.world.level.name + ' cleared in ' + game.levelTime.toFixed(1) + 's.', cx, cy - 8);
    button(ctx, cx - 110, cy + 26, 220, 52, 'NEXT VAULT  (ENTER)', COLORS.accent, COLORS.textDark);
  } else if (game.screen === 'win') {
    ctx.fillStyle = 'rgba(16,24,40,0.8)';
    ctx.fillRect(0, HUD_H, VIEW_W, VIEW_H);
    panel(ctx, cx - 330, cy - 150, 660, 300);
    ctx.textAlign = 'center';
    ctx.fillStyle = COLORS.accent;
    ctx.font = 'bold 52px sans-serif';
    ctx.fillText('THE PERFECT HEIST!', cx, cy - 84);
    ctx.fillStyle = '#ffffff';
    ctx.font = '19px sans-serif';
    ctx.fillText('All three vaults emptied. Three gems, zero alarms raised.', cx, cy - 36);
    ctx.fillStyle = COLORS.gem;
    ctx.font = 'bold 17px sans-serif';
    ctx.fillText('◆  ◆  ◆    Total time: ' + game.totalTime.toFixed(1) + 's', cx, cy + 2);
    button(ctx, cx - 110, cy + 44, 220, 52, 'PLAY AGAIN  (R)', COLORS.accent, COLORS.textDark);
    ctx.fillStyle = '#9aa3b5';
    ctx.font = '14px sans-serif';
    ctx.fillText('NIGHTVAULT — you were never here.', cx, cy + 128);
  }
}

function panel(ctx, x, y, w, h) {
  ctx.fillStyle = COLORS.panel;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 14);
  ctx.fill();
  ctx.strokeStyle = COLORS.accent;
  ctx.lineWidth = 2;
  ctx.stroke();
}

function button(ctx, x, y, w, h, label, bg, fg) {
  ctx.fillStyle = bg;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 10);
  ctx.fill();
  ctx.fillStyle = fg;
  ctx.font = 'bold 18px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, x + w / 2, y + h / 2 + 1);
}

export { HUD_H };
