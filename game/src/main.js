// NIGHTVAULT — main.js: the game loop and the screen state machine.
// Screens: start -> play -> (caught | levelDone) -> play / win.
// The loop clamps dt so a tab switch never teleports the thief, and the
// canvas scales to fit the window while keeping its 960x684 aspect.
import { VIEW_W, VIEW_H } from './config.js';
import { LEVELS } from './levels.js';
import { buildWorld } from './world.js';
import { createGuard, updateGuards } from './guards.js';
import { createPlayer, updatePlayer, tryTakeGem, reachedExit } from './player.js';
import { createInput, wasPressed, consumePress } from './input.js';
import { drawGame, HUD_H } from './render.js';
import { stageShot } from './shots.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
canvas.width = VIEW_W;
canvas.height = VIEW_H + HUD_H;

const game = {
  screen: 'start',
  levelIndex: 0,
  world: null,
  guards: [],
  player: null,
  levelTime: 0,
  totalTime: 0,
  frozen: false, // screenshot mode: render the staged scene, don't simulate
};

export function startLevel(index) {
  const level = LEVELS[index];
  game.levelIndex = index;
  game.world = buildWorld(level);
  game.guards = level.guards.map((def) => createGuard(def, level));
  game.player = createPlayer(game.world.playerStart);
  game.levelTime = 0;
  game.screen = 'play';
}

function restartRun() {
  game.totalTime = 0;
  startLevel(0);
}

function fitCanvas() {
  const scale = Math.min(window.innerWidth / VIEW_W, window.innerHeight / (VIEW_H + HUD_H));
  canvas.style.width = Math.floor(VIEW_W * scale) + 'px';
  canvas.style.height = Math.floor((VIEW_H + HUD_H) * scale) + 'px';
}
window.addEventListener('resize', fitCanvas);
fitCanvas();

const input = createInput(canvas);

// Button rectangles, matching render.js's overlay layout exactly.
function buttonRect(dy) {
  const cy = (VIEW_H + HUD_H) / 2;
  return { x: VIEW_W / 2 - 110, y: cy + dy, w: 220, h: 52 };
}
function clicked(rect, click) {
  return click && click.x >= rect.x && click.x <= rect.x + rect.w &&
    click.y >= rect.y && click.y <= rect.y + rect.h;
}

function handleMenus() {
  if (wasPressed(input, 'Enter')) {
    consumePress(input, 'Enter');
    if (game.screen === 'start') startLevel(0);
    else if (game.screen === 'levelDone') startLevel(game.levelIndex + 1);
  }
  if (wasPressed(input, 'KeyR')) {
    consumePress(input, 'KeyR');
    if (game.screen === 'caught') startLevel(game.levelIndex);
    else if (game.screen === 'win') restartRun();
  }
  const click = input.click;
  if (click) {
    if (game.screen === 'start' && clicked(buttonRect(118), click)) startLevel(0);
    else if (game.screen === 'caught' && clicked(buttonRect(22), click)) startLevel(game.levelIndex);
    else if (game.screen === 'levelDone' && clicked(buttonRect(26), click)) startLevel(game.levelIndex + 1);
    else if (game.screen === 'win' && clicked(buttonRect(44), click)) restartRun();
    else if (game.screen === 'play') {
      // Clicks on the board (below the HUD) set a walk destination.
      if (click.y > HUD_H) game.player.moveTarget = { x: click.x, y: click.y - HUD_H };
    }
    input.click = null;
  }
}

function update(dt) {
  game.levelTime += dt;
  updatePlayer(game.world, game.player, input, dt);
  if (tryTakeGem(game.world, game.player)) {
    // Pocketed the gem: the objective flips to the exit (see HUD).
  }
  const result = updateGuards(game.world, game.guards, game.player, dt);
  if (result === 'caught') {
    game.screen = 'caught';
    return;
  }
  if (reachedExit(game.world, game.player)) {
    game.totalTime += game.levelTime;
    if (game.levelIndex + 1 >= LEVELS.length) {
      game.screen = 'win';
    } else {
      game.screen = 'levelDone';
    }
  }
}

let lastTime = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - lastTime) / 1000);
  lastTime = now;
  handleMenus();
  if (!game.frozen && game.screen === 'play') update(dt);
  drawGame(ctx, game);
  requestAnimationFrame(frame);
}

// Boot: level 1 sits behind the title screen; a ?shot= param stages a
// fixed scene for screenshots instead of playing live.
startLevel(0);
game.screen = 'start';
const params = new URLSearchParams(window.location.search);
if (params.has('shot')) {
  stageShot(game, params.get('shot'), startLevel, restartRun);
}
requestAnimationFrame(frame);
