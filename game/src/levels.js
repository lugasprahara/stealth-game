// NIGHTVAULT — the three heist levels.
// Map legend (one character per tile, 24 columns x 16 rows):
//   '#' wall   ' ' floor   'c' crate (cover)   'p' pillar (cover)
//   'd' display case (cover)   'g' the gem   'e' exit   's' player start
// Walls and cover block both movement and guard line of sight.
// Guard waypoints are tile coordinates [col, row]; guards walk them in order.
export const LEVELS = [
  {
    name: 'Level 1 — The Lobby',
    briefing: 'Slip past the patrols, steal the gem, reach the exit unseen.',
    coneLength: 165,
    patrolSpeed: 48,
    map: [
      '########################',
      '#s...#....c.......g....#',
      '#....#....c............#',
      '#.c..#....p............#',
      '#....#.................#',
      '#....#..c.......c......#',
      '#....#..........c......#',
      '#....#..p..............#',
      '#......................#',
      '#..p.#....c......c.....#',
      '#....#.................#',
      '#....#....p............#',
      '#....c.................#',
      '#....c....c......p.....#',
      '#....c................e#',
      '########################',
    ],
    guards: [
      { waypoints: [[11, 2], [11, 12], [19, 12], [19, 2]], pause: 0.9 },
      { waypoints: [[2, 6], [4, 6], [4, 12], [2, 12]], pause: 0.7 },
    ],
  },
  {
    name: 'Level 2 — The Gallery',
    briefing: 'More guards, longer sight lines. The cases are your friends.',
    coneLength: 195,
    patrolSpeed: 56,
    map: [
      '########################',
      '#s.....c....#....d....g#',
      '#......c....#....d.....#',
      '#..p........#..........#',
      '#......d....#....c.....#',
      '#...........#....c..p..#',
      '###.#####.###.#####.####',
      '#...........#..........#',
      '#..c....p...#....d.....#',
      '#......d....#....d..c..#',
      '#...........#..........#',
      '#..p....c...#....p.....#',
      '###.#####.###.#####.####',
      '#......d........c......#',
      '#..c........p.......e..#',
      '########################',
    ],
    guards: [
      { waypoints: [[8, 1], [8, 5], [10, 5], [10, 1]], pause: 0.8 },
      { waypoints: [[18, 8], [18, 11], [21, 11], [21, 8]], pause: 0.6 },
      { waypoints: [[2, 9], [5, 9], [5, 10], [2, 10]], pause: 0.8 },
    ],
  },
  {
    name: 'Level 3 — The Vault',
    briefing: 'Four guards, long cones, one gem. Stay in the shadows.',
    coneLength: 220,
    patrolSpeed: 64,
    map: [
      '########################',
      '#s..#.....d....#...g...#',
      '#...#..........#.......#',
      '#.c....p.......#.......#',
      '#...#..........#.......#',
      '#...#..c....p..#...p...#',
      '#...#..........#.......#',
      '#####.######.#####.#####',
      '#......c...............#',
      '#..p.......p...........#',
      '#......c..d....c...p...#',
      '#...........d..........#',
      '#..c....p.......c......#',
      '#......d....p.....d....#',
      '#..p.........c.......e.#',
      '########################',
    ],
    guards: [
      { waypoints: [[9, 2], [9, 4], [14, 4], [14, 2]], pause: 0.7 },
      { waypoints: [[19, 2], [19, 4], [21, 4], [21, 2]], pause: 0.5 },
      { waypoints: [[2, 9], [2, 13]], pause: 0.7 },
      { waypoints: [[20, 9], [20, 13]], pause: 0.6 },
    ],
  },
];

// Sanity check at load time: every map row must be exactly 24 tiles and
// every level must contain exactly one gem, one exit and one player start.
for (const level of LEVELS) {
  if (level.map.length !== 16) throw new Error(level.name + ': map must be 16 rows');
  for (const row of level.map) {
    if (row.length !== 24) throw new Error(level.name + ': bad row length ' + row.length + ' in "' + row + '"');
  }
  const flat = level.map.join('');
  const count = (ch) => [...flat].filter((c) => c === ch).length;
  if (count('g') !== 1 || count('e') !== 1 || count('s') !== 1) {
    throw new Error(level.name + ': map needs exactly one gem, one exit and one start');
  }
}
