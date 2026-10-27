// Lunar New Year collection.
//
// The gold "characters" on the couplet and Fu diamond are abstract shapes
// rather than real writing, so nothing reads as a wrongly written word.

import { paintSprite, paintGarland, paintLantern, linePoints, pointSet } from '../sprite-tools.js';

const O = '#3b2d4a';
const RED = '#d9363e';
const RED_DARK = '#9e2430';
const GOLD = '#f2c14e';
const GOLD_DARK = '#c98a2e';
const WHITE = '#f1ecf7';
const BLUE = '#6f8fc4';

// ---- Sprites ------------------------------------------------------------------

const redLantern = paintLantern({
  name: 'redLantern',
  w: 12,
  bodyH: 10,
  palette: { s: O, c: GOLD, b: RED, r: RED_DARK, h: '#f07a72', d: RED_DARK, t: RED },
});

const goldLantern = paintLantern({
  name: 'goldLantern',
  w: 10,
  bodyH: 8,
  palette: { s: O, c: RED, b: GOLD, r: GOLD_DARK, h: '#ffe9a8', d: '#a8742a', t: RED },
});

const COUPLET_GLYPHS = [
  ['y.yy', 'yyy.', '.y.y', 'yy.y'],
  ['yyyy', '.y..', 'yyy.', '.y.y'],
  ['y..y', 'yyyy', '.yy.', 'y.yy'],
  ['.yy.', 'yyyy', 'y..y', 'yy.y'],
];
const springCouplet = paintSprite(
  'springCouplet',
  10,
  26,
  { w: '#7a5236', y: GOLD, R: RED },
  (x, y) => {
    if (y === 0) return x >= 1 && x <= 8 ? 'w' : null; // hanging rod
    if (x === 0 || x === 9) return null;
    if (x === 1 || x === 8 || y === 1 || y === 25) return 'y'; // gold border
    const block = Math.floor((y - 3) / 6);
    const row = (y - 3) % 6;
    if (y >= 3 && block < 4 && row < 4 && x >= 3 && x <= 6 && COUPLET_GLYPHS[block][row][x - 3] === 'y') return 'y';
    return 'R';
  },
);

const FU_GLYPH = ['yyy.yy', '..y.y.', 'yyyyyy', '.y..y.', 'yyy.yy', '.y.yy.'];
const fuDiamond = paintSprite('fuDiamond', 18, 18, { y: GOLD, R: RED }, (x, y) => {
  const d = Math.abs(x - 8.5) + Math.abs(y - 8.5);
  if (d > 8.6) return null;
  if (d > 7.4) return 'y';
  const gx = x - 6;
  const gy = y - 6;
  if (gx >= 0 && gx < 6 && gy >= 0 && gy < 6 && FU_GLYPH[gy][gx] === 'y') return 'y';
  return 'R';
});

const mandarinBowl = {
  name: 'mandarinBowl',
  palette: { g: '#3f7d58', O: '#f29a3a', h: '#ffc36b', o: O, W: WHITE, B: BLUE },
  rows: [
    '.g...g...g.',
    'OhO.OhO.OhO',
    'OOO.OOO.OOO',
    'ooooooooooo',
    'oWWBWWBWWWo',
    '.oWWWBWWWo.',
    '..ooooooo..',
    '...ooooo...',
  ],
};

const BRANCHES = pointSet(
  [
    [7, 18, 6, 12],
    [6, 12, 4, 6],
    [4, 6, 2, 2],
    [7, 15, 10, 9],
    [10, 9, 13, 4],
    [6, 12, 9, 7],
  ].flatMap(([x0, y0, x1, y1]) => linePoints(x0, y0, x1, y1)),
);
const BLOSSOMS = [
  [2, 1],
  [4, 5],
  [13, 3],
  [10, 8],
  [9, 6],
  [5, 9],
  [12, 6],
  [3, 3],
  [8, 11],
];
const VASE_HALF = [2, 2, 4, 5.5, 6, 6, 6, 6, 6, 5, 4.5, 3.5]; // half-width per row, rows 18–29
const plumBlossom = paintSprite(
  'plumBlossom',
  16,
  30,
  { p: '#f3a9bf', P: '#e8708c', b: '#5a3b28', o: O, W: WHITE, B: BLUE },
  (x, y) => {
    for (const [bx, by] of BLOSSOMS) {
      const dx = Math.abs(x - bx);
      const dy = Math.abs(y - by);
      if (dx + dy === 0) return 'P';
      if (dx + dy === 1) return 'p';
    }
    if (y < 18) return BRANCHES.has(`${x},${y}`) ? 'b' : null;
    const half = VASE_HALF[y - 18];
    const dx = Math.abs(x - 7.5);
    if (dx > half) return null;
    if (dx > half - 1 || y === 29) return 'o';
    return y === 23 || y === 24 ? 'B' : 'W';
  },
);

const CRACKER_LEFT = ['yRRo...', 'rrro...'];
const CRACKER_RIGHT = ['...oRRy', '...orrr'];
const firecrackers = {
  name: 'firecrackers',
  palette: { o: O, R: RED, r: RED_DARK, y: GOLD },
  rows: [
    '...o...',
    '...o...',
    ...CRACKER_LEFT,
    ...CRACKER_RIGHT,
    ...CRACKER_LEFT,
    ...CRACKER_RIGHT,
    ...CRACKER_LEFT,
    ...CRACKER_RIGHT,
    ...CRACKER_LEFT,
    ...CRACKER_RIGHT,
    '..yyy..',
    '..yRy..',
    '...R...',
    '...R...',
  ],
};

const redEnvelopes = {
  name: 'redEnvelopes',
  palette: { o: O, R: RED, y: GOLD },
  rows: ['...ooooooo', '...oRRRRRo', 'ooooooooRo', 'oRRRyRRoRo', 'oRRyyyRooo', 'oooooooo..'],
};

const luckyCat = {
  name: 'luckyCat',
  palette: { o: O, W: '#fbf7ff', k: '#2b2138', p: '#f3a9bf', R: RED, y: GOLD },
  rows: [
    'o..o....oo',
    'oWWo...oWo',
    'oWWWWWWoWo',
    'oWkWWkWoWo',
    'oWWpWWWoWo',
    'oWWWWWWWWo',
    'oRRRyRRRo.',
    'oWWWyWWWo.',
    'oWWWWWWWo.',
    'oWWyyyWWo.',
    'oWWWWWWWo.',
    'ooooooooo.',
  ],
};

const teaSet = {
  name: 'teaSet',
  palette: { o: O, W: WHITE, B: BLUE },
  rows: [
    '.....o..........',
    '....oWo.........',
    '..ooooooo.......',
    'o.oWWBWWo.o.....',
    'ooWWBBBWWoo.....',
    '.oWWWBWWWo.ooooo',
    '..oWWWWWo..oWBWo',
    '...ooooo...oWWWo',
    '............ooo.',
  ],
};

const lionPlush = {
  name: 'lionPlush',
  palette: { o: O, R: RED, y: GOLD, W: '#fbf7ff', k: '#2b2138' },
  rows: [
    '...oooooooooo...',
    '..oRRRRRRRRRRo..',
    '.oRyyRRRRRRyyRo.',
    '.oRWkRRRRRWkRRo.',
    'oRRWWRRRRRWWRRRo',
    'oRRRRRRyyRRRRRRo',
    'oWWRRRyyyyRRRWWo',
    'oWWWRRRRRRRRWWWo',
    '.oWWyyyyyyyyWWo.',
    '.oWWWRRRRRRWWWo.',
    '..oWWWWWWWWWWo..',
    '...oooooooooo...',
  ],
};

const pennant = (main, dot) => [main.repeat(5), `${main}${main}${dot}${main}${main}`, `.${main.repeat(3)}.`, `..${main}..`];
const luckyBanner = paintGarland({
  name: 'luckyBanner',
  w: 56,
  h: 10,
  spacing: 8,
  palette: { s: '#7a5236', R: RED, y: GOLD, Y: GOLD, r: RED },
  stamps: [pennant('R', 'y'), pennant('Y', 'r')],
});

// ---- Items --------------------------------------------------------------------

export const LUNAR = [
  {
    id: 'red-lantern',
    name: 'Red Lantern',
    category: 'lamp',
    price: 30,
    description: 'Glows softly from the curtain rod.',
    slot: 'hanging',
    sprite: redLantern,
    glow: { x: 6, y: 9, radius: 11, color: '#ff6a5a' },
  },
  {
    id: 'gold-lantern',
    name: 'Golden Lantern',
    category: 'lamp',
    price: 30,
    description: 'A smaller lantern in lucky gold.',
    slot: 'hanging',
    sprite: goldLantern,
    glow: { x: 5, y: 8, radius: 10, color: '#ffd27a' },
  },
  {
    id: 'spring-couplet',
    name: 'Spring Couplet',
    category: 'wall',
    price: 25,
    description: 'A red scroll of good wishes for the year.',
    slot: 'wallTall',
    sprite: springCouplet,
  },
  {
    id: 'fu-diamond',
    name: 'Fortune Diamond',
    category: 'wall',
    price: 30,
    description: 'Red and gold, right on the window.',
    slot: 'window',
    sprite: fuDiamond,
  },
  {
    id: 'mandarin-bowl',
    name: 'Mandarin Oranges',
    category: 'decor',
    price: 20,
    description: 'A bowl of sweet, lucky oranges.',
    slot: 'desk',
    sprite: mandarinBowl,
  },
  {
    id: 'plum-blossom',
    name: 'Plum Blossom Vase',
    category: 'plant',
    price: 45,
    description: 'The first flowers of spring, in blue and white.',
    slot: 'floor',
    sprite: plumBlossom,
  },
  {
    id: 'firecrackers',
    name: 'Firecracker String',
    category: 'decor',
    price: 20,
    description: 'All of the cheer, none of the noise.',
    slot: 'hanging',
    sprite: firecrackers,
  },
  {
    id: 'red-envelopes',
    name: 'Red Envelopes',
    category: 'decor',
    price: 20,
    description: 'Two little hongbao, sealed in gold.',
    slot: 'desk',
    sprite: redEnvelopes,
  },
  {
    id: 'lucky-cat',
    name: 'Lucky Cat',
    category: 'decor',
    price: 35,
    description: 'Waves good fortune your way all day.',
    slot: 'shelf',
    sprite: luckyCat,
  },
  {
    id: 'tea-set',
    name: 'Tea Set',
    category: 'decor',
    price: 30,
    description: 'Blue and white, for long study breaks.',
    slot: 'sill',
    sprite: teaSet,
  },
  {
    id: 'lion-plush',
    name: 'Lion Dance Plush',
    category: 'decor',
    price: 40,
    description: 'A fluffy lion head, ready to dance.',
    slot: 'rug',
    sprite: lionPlush,
  },
  {
    id: 'lucky-banner',
    name: 'Lucky Banner',
    category: 'wall',
    price: 30,
    description: 'Red and gold pennants above the shelf.',
    slot: 'banner',
    sprite: luckyBanner,
  },
  {
    id: 'lights-lanterns',
    name: 'Lantern Lights',
    category: 'lighting',
    kind: 'lights',
    price: 35,
    description: 'Tiny red lanterns instead of bulbs.',
    lights: { colors: [RED, '#ff6a5a'], bulb: 'lantern' },
  },
  {
    id: 'glow-firelight',
    name: 'Firelight Glow',
    category: 'lighting',
    kind: 'glow',
    price: 25,
    description: 'A warm red lamp glow.',
    glowColor: '#ff7a6a',
  },
  {
    id: 'rug-red-cloud',
    name: 'Red Cloud Rug',
    category: 'room',
    kind: 'rug',
    price: 35,
    description: 'Lucky red with a golden border.',
    rug: { edge: GOLD_DARK, main: RED, inner: GOLD, center: RED },
  },
  {
    id: 'wallpaper-red-silk',
    name: 'Red Silk Wallpaper',
    category: 'room',
    kind: 'wallpaper',
    price: 40,
    description: 'Deep red, dotted with gold.',
    wallpaper: {
      wallStyle: 'wallpaper',
      pattern: 'dots',
      wallpaper: '#a8323a',
      wallStripe: GOLD,
      wainscot: '#5e1a22',
      wainscotLine: '#46121a',
      trim: GOLD,
      trimDark: '#5e1a22',
    },
  },
  {
    id: 'view-lunar-fireworks',
    name: 'Fireworks Night View',
    category: 'view',
    kind: 'view',
    price: 80,
    description: 'Quiet fireworks bloom over the city.',
    themeId: 'lunar-fireworks',
  },
];
