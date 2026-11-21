// NIGHTVAULT — shared constants for the stealth heist.
// Bright, high-contrast palette: the scene must read at a glance even shrunk
// to a contact-sheet thumbnail, so floors are light, cones are vivid yellow,
// cover is amber, the gem is cyan and the exit is bright green.
export const TILE = 40;
export const COLS = 24;
export const ROWS = 16;
export const VIEW_W = COLS * TILE; // 960
export const VIEW_H = ROWS * TILE; // 640

export const PLAYER_SPEED = 150; // px per second
export const PLAYER_RADIUS = 13;

export const GUARD_PATROL_SPEED = 52;
export const GUARD_CHASE_SPEED = 118;
export const GUARD_RADIUS = 13;
export const CONE_HALF_ANGLE = Math.PI / 5.4; // ~33 degrees each side

// Detection: fills while the player is seen, drains while hidden.
// Closer = faster fill, so brushing a cone edge is survivable but
// standing in front of a guard is not.
export const DETECT_BASE_RATE = 0.55;
export const DETECT_CLOSE_RATE = 1.9;
export const DETECT_DECAY_RATE = 0.85;
export const ALERT_THRESHOLD = 0.55; // above this the guard chases
export const CHASE_SECONDS = 2.6;

export const COLORS = {
  floorA: '#e8e4d8',
  floorB: '#ddd8c8',
  floorEdge: '#c9c3ae',
  wall: '#232a3d',
  wallTop: '#3b4763',
  wallEdge: '#141824',
  crate: '#d98a1f',
  crateEdge: '#8a5410',
  pillar: '#7a6a4f',
  pillarEdge: '#4a3f2c',
  displayCase: '#2fa8a0',
  displayEdge: '#14655f',
  gem: '#19e3ff',
  gemGlow: '#a5f3ff',
  exit: '#1fd65a',
  exitEdge: '#0a7a2e',
  player: '#1b2a4a',
  playerRing: '#ffffff',
  guard: '#c22730',
  guardRing: '#ffd23f',
  coneCalm: 'rgba(255, 214, 64, 0.42)',
  coneSuspicious: 'rgba(255, 159, 28, 0.55)',
  coneAlert: 'rgba(255, 59, 48, 0.55)',
  hudBar: '#101828',
  hudText: '#ffffff',
  textDark: '#141824',
  panel: 'rgba(16, 24, 40, 0.92)',
  accent: '#ffd23f',
};
