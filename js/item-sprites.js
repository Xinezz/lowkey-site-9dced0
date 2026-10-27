// Pixel art for the collectibles. Same text format as sprites.js:
// one character = one pixel, '.' = transparent.
//
// Animated sprites use `frames` (a list of row-lists) plus `fps` instead of
// `rows`. Animations are deliberately slow and small so they never pull your
// attention away from studying.

const OUTLINE = '#3b2d4a';
const LEAF = { d: '#3f7d58', g: '#62a877', l: '#9fd49a' };

// ---- Plants -----------------------------------------------------------------

const pothos = {
  name: 'pothos',
  palette: { ...LEAF, o: OUTLINE, W: '#f1ecf7', s: '#c9bedb' },
  rows: [
    '...l.g.l.....',
    '.lgg.ggglg...',
    'lggdggdggggl.',
    'g.dgggggd.ggl',
    'l.ooooooooo.g',
    'g.oWWWWWWWo.l',
    '..oWWWWWWso.g',
    'l..oWWWWso..l',
    'g..oWWWWso...',
    'l..ooooooo...',
  ],
};

const bonsai = {
  name: 'bonsai',
  palette: { ...LEAF, b: '#7a5236', o: OUTLINE, C: '#6f8fc4' },
  rows: [
    '...gglg....',
    '.gglllgg...',
    'ggllggggg..',
    '.ggdgg.gglg',
    '...bdb.ggdg',
    '....bb..b..',
    '.....bbb...',
    '.....b.....',
    'ooooooooooo',
    'oCCCCCCCCCo',
    '.ooooooooo.',
  ],
};

const monstera = {
  name: 'monstera',
  palette: { ...LEAF, o: OUTLINE, r: '#e0b27e', w: '#c99a68', W: '#a97b4f' },
  rows: [
    '........ggg.........',
    '......gglllg........',
    '.....gllllggg.......',
    '.....glldlg.gg......',
    '....gglgdggggg......',
    '....glgg.dgggg......',
    '.....ggggdggg.......',
    '......ggg.dgg.......',
    '.ggg......d..ggg....',
    'gllggg....d.gglllg..',
    'glgdggg...d.ggllggg.',
    'gg.dgggg..d.glg.dggg',
    '.gggdggg..d.ggdggg..',
    '..gggdgd..d.gdggg...',
    '....gg..d.dd........',
    '.........ddd........',
    '.........ddd........',
    '....oooooooooooo....',
    '....orrrrrrrrrro....',
    '....owWwWwWwWwWo....',
    '....oWwWwWwWwWwo....',
    '.....owWwWwWwWo.....',
    '.....oWwWwWwWwo.....',
    '......oooooooo......',
  ],
};

// ---- Lamps ------------------------------------------------------------------

const CANDLE_JAR = ['.ooooo.', '.oCCCo.', '.occco.', '.oCCCo.', '.ooooo.'];
const candle = {
  name: 'candle',
  palette: { o: OUTLINE, C: '#f6e7c8', c: '#e89fb4', f: '#ffb347', F: '#fff1b0' },
  fps: 3,
  frames: [
    ['...f...', '..fF...', '..fFf..', '...o...', ...CANDLE_JAR],
    ['....f..', '...Ff..', '..fFf..', '...o...', ...CANDLE_JAR],
  ],
};

const LAVA_TOP = ['...oo...', '..oMMo..'];
const LAVA_BASE = ['.oMMMMo.', '.oMMMMo.', 'oMMmmMMo', 'oooooooo'];
const lavaLamp = {
  name: 'lavaLamp',
  palette: { o: OUTLINE, M: '#9a8fb0', m: '#7d7296', L: '#d96aa0', B: '#ffd27a' },
  fps: 0.4, // a new frame every 2.5 seconds
  frames: [
    [
      ...LAVA_TOP,
      '..oLLo..',
      '..oLLo..',
      '.oLLLLo.',
      '.oLBLLo.',
      '.oLBBLo.',
      '.oLLLLo.',
      '.oLLLLo.',
      'oLLLLLLo',
      'oLLLBBLo',
      'oLLBBBLo',
      'oLLLLLLo',
      'oBBLLLLo',
      ...LAVA_BASE,
    ],
    [
      ...LAVA_TOP,
      '..oLLo..',
      '..oBLo..',
      '.oLBBLo.',
      '.oLLLLo.',
      '.oLLLLo.',
      '.oLLBLo.',
      '.oLLLLo.',
      'oLLLBBLo',
      'oLLLLLLo',
      'oLLLLLLo',
      'oBBLLLLo',
      'oBBBLLLo',
      ...LAVA_BASE,
    ],
  ],
};

const floorLamp = {
  name: 'floorLamp',
  // The pole is a light metal colour so it stays visible against dark walls.
  palette: { o: OUTLINE, h: '#f3ecff', S: '#d9c6f2', L: '#fff6dc', s: '#a597c0', b: '#6f5d85', B: '#4b3d5e' },
  rows: [
    '..ooooo..',
    '.ohSSSSo.',
    '.ohSSSSo.',
    'ohSSSSSSo',
    'ohSSSSSSo',
    'oLLLLLLLo',
    '.ooooooo.',
    ...Array(32).fill('....s....'), // the long pole: 32 identical rows
    '...oso...',
    '..obbbo..',
    '.oBBBBBo.',
  ],
};

// ---- Books ------------------------------------------------------------------

const BOOK_COLORS = {
  R: '#c46f73', r: '#e3a0a2',
  B: '#6f8fc4', b: '#a2bde6',
  Y: '#e6c27a', y: '#f5dda8',
  G: '#7fb39a', g: '#b0d8c2',
  U: '#9a7ac0', u: '#c2aae0',
  O: '#d08a5c', q: '#ecb48c',
  p: '#f4ead6', // page edges
};

const windowReads = {
  name: 'windowReads',
  palette: BOOK_COLORS,
  rows: [
    '..RRRRRRRRRRRp..',
    '..rrrrrrrrrrrp..',
    '..RRRRRRRRRRRp..',
    '.BBBBBBBBBBBBBp.',
    '.bbbbbbbbbbbbbp.',
    '.BBBBBBBBBBBBBp.',
    'YYYYYYYYYYYYYYYp',
    'yyyyyyyyyyyyyyyp',
    'YYYYYYYYYYYYYYYp',
  ],
};

const bookTower = {
  name: 'bookTower',
  palette: BOOK_COLORS,
  rows: [
    '...OOOOOOOOOOp....',
    '...qqqqqqqqqqp....',
    '...OOOOOOOOOOp....',
    '.UUUUUUUUUUUUUp...',
    '.uuuuuuuuuuuuup...',
    '.UUUUUUUUUUUUUp...',
    '..GGGGGGGGGGGGGp..',
    '..gggggggggggggp..',
    '..GGGGGGGGGGGGGp..',
    'YYYYYYYYYYYYYYYYp.',
    'yyyyyyyyyyyyyyyyp.',
    'YYYYYYYYYYYYYYYYp.',
    '.BBBBBBBBBBBBBBp..',
    '.bbbbbbbbbbbbbbp..',
    '.BBBBBBBBBBBBBBp..',
    'RRRRRRRRRRRRRRRRRp',
    'rrrrrrrrrrrrrrrrrp',
    'RRRRRRRRRRRRRRRRRp',
  ],
};

// ---- Posters ----------------------------------------------------------------

const moonPoster = {
  name: 'moonPoster',
  palette: { o: OUTLINE, N: '#2a3366', M: '#f2efd6', s: '#ffe9a8', h: '#3d4a80', H: '#323d6e' },
  rows: [
    'oooooooooooooooo',
    'oNNNNNNNNNNNNNNo',
    'oNNNNNNNNNNsNNNo',
    'oNsNNNNNNNNNNNNo',
    'oNNNNNNNNNNNNNNo',
    'oNNNNNMMMNNNNNNo',
    'oNNNNMMNNNNNNNNo',
    'oNNNNMMNNNNNsNNo',
    'oNNNMMMNNNNNNNNo',
    'oNNNMMMNNNNNNNNo',
    'oNNNMMMNNNNNNNNo',
    'oNNNNMMNNNNNNNNo',
    'oNNNNMMNNNNNNNNo',
    'oNNNNNMMMNNNNNNo',
    'oNNNNNNNNNNNNNNo',
    'oNNsNNNNNNNNNNNo',
    'oNNNNNNNNNNNNsNo',
    'oNNNNNNNNNNNNNNo',
    'oNNNNNNNNhhNNNNo',
    'oNNhhNNNhhhhNNNo',
    'ohhhhhhhhhhhhhho',
    'oHHHHHHHHHHHHHHo',
    'oHHHHHHHHHHHHHHo',
    'oooooooooooooooo',
  ],
};

const mountainPoster = {
  name: 'mountainPoster',
  palette: {
    o: OUTLINE,
    P: '#f3a9bf',
    Y: '#ffe4a3',
    O: '#f6a184',
    M: '#8d65a6',
    D: '#5e3f6e',
    W: '#f6f0e4',
    t: '#8a74bd',
  },
  rows: [
    'oooooooooooooooooooooooooooo',
    'oPPPPPPPPPPPPPPPPPPPPPPPPPPo',
    'oPPPPPPPPPPPPPPPPPPPPPPPPPPo',
    'oPPPPPPPPPPPPPPPYYYYPPPPPPPo',
    'oOOOOOOOOOOOOOOYYYYYYOOOOOOo',
    'oOOOOOOOOOOOOOOYYYYYYOOOOOOo',
    'oOOOOOOMOOOOOOOOYYYYOOOOOOOo',
    'oOOOOOMMMOOOOOOOOOOOOMOOOOOo',
    'oOOOOMMMMMOOOOOOOOOOMMMOOOOo',
    'oOOOMMMMMMMOOOOOOOOMMMMMOOOo',
    'oOOMMMMMMMMMOOOOOOMMMMMMMOOo',
    'oOMMMMMMMMMMMOOOOMMMMMMMMMOo',
    'oMMMMMMMMMMMMMMMMMMMMMMMMMMo',
    'oDDDDDDDDDDDDDDDDDDDDDDDDDDo',
    'oDDDDDDDDDDDDDDDDDDDDDDDDDDo',
    'oWWWWWWWWWWWWWWWWWWWWWWWWWWo',
    'oWWttWtttWWttWtWWWWWWWWWWWWo',
    'oooooooooooooooooooooooooooo',
  ],
};

// ---- Pets -------------------------------------------------------------------

const BOWL_TOP = ['...rrrrrr...', '..e......e..', '.ewwwwwwwwe.'];
const BOWL_BOTTOM = ['ewwwwwwwwwwe', 'eWwwwwwwwwWe', '.eWpqpWpqpe.', '..eeeeeeee..'];
const goldfish = {
  name: 'goldfish',
  palette: {
    r: '#e8f2fa',
    e: '#8fb7d9',
    w: '#9fd3e6',
    W: '#7cbcd6',
    f: '#ff9a5a',
    F: '#ffcf8a',
    b: '#f2fbff',
    p: '#c9bedb',
    q: '#e6c27a',
  },
  fps: 0.5,
  frames: [
    [...BOWL_TOP, 'ewwwwbwwwwwe', 'ewwffFwwwwwe', ...BOWL_BOTTOM], // swimming left
    [...BOWL_TOP, 'ewbwwwwwwwwe', 'ewwwwwFffwwe', ...BOWL_BOTTOM], // turned around
  ],
};

// Asleep: resting near the bottom of the bowl, perfectly still.
const goldfishAsleep = {
  name: 'goldfishAsleep',
  palette: goldfish.palette,
  rows: [
    ...BOWL_TOP,
    'ewwwwwwwwwwe',
    'ewwwwwwwwwwe',
    'ewwwffFwwwwe',
    'eWwwwwwwwwWe',
    '.eWpqpWpqpe.',
    '..eeeeeeee..',
  ],
};

const BIRD_EYES_OPEN = ['..bbb..', '.bkbbb.', 'ybbbbbb', '.wwbBBb', '.wwwBBB', '..wwbb.', '..f.f..'];
const BIRD_BLINK = ['..bbb..', '.bBbbb.', 'ybbbbbb', '.wwbBBb', '.wwwBBB', '..wwbb.', '..f.f..'];
const songbird = {
  name: 'songbird',
  palette: { b: '#7fa8c9', B: '#5f86a8', w: '#f1ecf7', k: '#2b2138', y: '#f2c14e', f: '#c98b6a' },
  fps: 2,
  // Repeating a frame makes it last longer: eyes open for 3 s, then a 0.5 s blink.
  frames: [BIRD_EYES_OPEN, BIRD_EYES_OPEN, BIRD_EYES_OPEN, BIRD_EYES_OPEN, BIRD_EYES_OPEN, BIRD_EYES_OPEN, BIRD_BLINK],
};

const songbirdAsleep = { name: 'songbirdAsleep', palette: songbird.palette, rows: BIRD_BLINK };

// The cat's body below its face, shared by every cat frame.
const CAT_LOWER = [
  'kcccccccCccCccck',
  'kwwwccccccccccck',
  '.kwwkcccccccccck',
  '..kkCCCCCCCCCck.',
  '....kkkkkkkkkk..',
];
const CAT_EARS = '.k..k...........';
const CAT_EARS_BREATH = '.k..k...kkkkkk..';
const CAT_BACK = 'kpkkpkkkkkkkkk..';
const CAT_BACK_BREATH = 'kpkkpkkkcccccck.';
const CAT_HEAD = 'kcccccccCccCcck.';
const CAT_EYES_CLOSED = 'kckckccCccCcccck';
const CAT_EYES_OPEN = 'kcececcCccCcccck';
const CAT_PALETTE = { k: OUTLINE, c: '#f2b56b', C: '#d9904a', w: '#fbe3c4', p: '#f3a9bf', e: '#b7e07a' };

const cat = {
  name: 'cat',
  palette: CAT_PALETTE,
  fps: 0.4,
  // The back rises by one pixel: a slow, sleepy breath.
  frames: [
    [CAT_EARS, CAT_BACK, CAT_HEAD, CAT_EYES_CLOSED, ...CAT_LOWER],
    [CAT_EARS_BREATH, CAT_BACK_BREATH, CAT_HEAD, CAT_EYES_CLOSED, ...CAT_LOWER],
  ],
};

// Awake: same pose, green eyes open, with a slow blink every few seconds.
const CAT_AWAKE_OPEN = [CAT_EARS, CAT_BACK, CAT_HEAD, CAT_EYES_OPEN, ...CAT_LOWER];
const catAwake = {
  name: 'catAwake',
  palette: CAT_PALETTE,
  fps: 1,
  frames: [CAT_AWAKE_OPEN, CAT_AWAKE_OPEN, CAT_AWAKE_OPEN, cat.frames[0]],
};

export const ITEM_SPRITES = {
  pothos,
  bonsai,
  monstera,
  candle,
  lavaLamp,
  floorLamp,
  windowReads,
  bookTower,
  moonPoster,
  mountainPoster,
  goldfish,
  goldfishAsleep,
  songbird,
  songbirdAsleep,
  cat,
  catAwake,
};
