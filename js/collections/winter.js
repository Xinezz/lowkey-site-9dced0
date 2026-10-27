// Winter collection.

import { paintSprite, paintGarland, recolor, stampLookup, snowflakeStamp, linePoints, pointSet } from '../sprite-tools.js';
import { ITEM_SPRITES } from '../item-sprites.js';
import { TREE_SPRITE } from './christmas.js';

const O = '#3b2d4a';
const SNOW = '#f6fbff';
const ICE = '#bfe3ff';
const BLUE = '#6f8fc4';
const NAVY = '#2a3366';
const RED = '#d9525e';

// ---- Sprites ------------------------------------------------------------------

const FOX_ROWS = [
  '.o.o............',
  '.oWoWo..........',
  'oWWWWWo.........',
  'oWeWWWWooooooo..',
  'kWWWWWWWWWWWWWo.',
  '.oWWWWWWWWWWWWWo',
  '..oWWWWWWWWWWWTo',
  '..oWWoWWWWWWWTTo',
  '...oo.ooooooooo.',
];
const FOX_PALETTE = { o: O, W: SNOW, T: ICE, k: '#2b2138', e: '#2b2138' };
const snowFox = { name: 'snowFox', palette: FOX_PALETTE, rows: FOX_ROWS };
const snowFoxAsleep = { name: 'snowFoxAsleep', palette: FOX_PALETTE, rows: FOX_ROWS.map((row) => row.replaceAll('e', 'W')) };

const SNOWMAN_ARMS = pointSet([...linePoints(2, 12, 0, 10), ...linePoints(11, 12, 13, 10)]);
const SNOWBALLS = [
  { cx: 6.5, cy: 6.5, r: 3.1 },
  { cx: 6.5, cy: 12, r: 4.1 },
  { cx: 6.5, cy: 16.8, r: 4.8 },
];
const snowman = paintSprite(
  'snowman',
  14,
  22,
  { K: '#2b2138', k: '#2b2138', N: '#f29a3a', R: RED, W: SNOW, B: '#bfd3ea', b: '#7a5236' },
  (x, y) => {
    if (y <= 2) return x >= 4 && x <= 9 ? 'K' : null; // hat
    if (y === 3) return x >= 2 && x <= 11 ? 'K' : null; // brim
    if (y === 6 && (x === 5 || x === 8)) return 'k'; // eyes
    if (y === 7 && (x === 7 || x === 8)) return 'N'; // carrot nose
    if (y === 9 && x >= 3 && x <= 10) return 'R'; // scarf
    if ((y === 10 || y === 11) && x === 9) return 'R'; // scarf tail
    if ((y === 12 || y === 14) && x === 6) return 'k'; // buttons
    if (SNOWMAN_ARMS.has(`${x},${y}`)) return 'b';
    for (const ball of SNOWBALLS) {
      const d = Math.hypot(x - ball.cx, y - ball.cy);
      if (d <= ball.r) return d > ball.r - 0.8 ? 'B' : 'W';
    }
    return null;
  },
);

const cocoaMug = {
  name: 'cocoaMug',
  palette: { o: O, c: '#7a4e3a', h: '#f6f0e4', m: RED, W: '#ffffff' },
  rows: ['.W.W.W..', 'oooooo..', 'occcco..', 'ohmmmooo', 'ohmmmo.o', 'ohmmmo.o', 'ohmmmooo', '.oooo...'],
};

const BIG_FLAKE = ['...w...', '.w.w.w.', '..www..', 'wwwwwww', '..www..', '.w.w.w.', '...w...'];
const flakeAt = stampLookup([
  { rows: BIG_FLAKE, x: 1, y: 1 },
  { rows: BIG_FLAKE, x: 15, y: 13 },
  { rows: snowflakeStamp('b'), x: 16, y: 2 },
  { rows: snowflakeStamp('b'), x: 4, y: 14 },
  { rows: snowflakeStamp('w'), x: 10, y: 7 },
]);
const snowflakeStickers = paintSprite('snowflakeStickers', 24, 22, { w: SNOW, b: ICE }, (x, y) => flakeAt(x, y));

const mittens = {
  name: 'mittens',
  palette: { o: O, W: '#f6f0e4', R: RED, w: '#f6f0e4' },
  rows: [
    '...o.....o..',
    '...o.....o..',
    '..ooo...ooo.',
    '.oWWWo.oWWWo',
    '.oRRRo.oRRRo',
    '.oRwRo.oRwRo',
    '.oRRRo.oRRRo',
    '.oRRRo.oRRRo',
    '..ooo...ooo.',
  ],
};

const pineconeBowl = {
  name: 'pineconeBowl',
  palette: { o: O, B: '#7a5236', b: '#a5754f', W: '#cfe6f5', P: BLUE },
  rows: ['..BbB.BbB.BbB.', '.BbBbBbBbBbBb.', 'oooooooooooooo', 'oWWWWWWWWWWWWo', '.oWWPWWWWPWWo.', '..oWWWWWWWWo..', '...oooooooo...'],
};

const iceSkates = {
  name: 'iceSkates',
  palette: { o: O, W: SNOW, s: '#9aa6b8' },
  rows: [
    '....o..o....',
    '...o....o...',
    '..o......o..',
    '.oWWo..oWWo.',
    '.oWWo..oWWo.',
    '.oWWo..oWWo.',
    '.oWWWo.oWWWo',
    '.oWWWo.oWWWo',
    '.ooooo.ooooo',
    '.s...s.s...s',
    '.sssss.sssss',
  ],
};

// The Christmas tree without its star, ornaments swapped for snow, in a plain pot.
const FROSTED_ROWS = TREE_SPRITE.frames[0]
  .slice(3)
  .map((row) => row.replace(/[ry]/g, 'w'))
  .map((row) => (/^\.*d+\.*$/.test(row) ? row.replace(/d/g, (d, i) => (i % 2 ? 'w' : 'd')) : row));
const frostedPine = {
  name: 'frostedPine',
  palette: { ...TREE_SPRITE.palette, w: SNOW, R: '#a5754f' },
  rows: FROSTED_ROWS,
};

const LANTERN_TOP = ['....oo....', '...o..o...', '..oooooo..', '.oooooooo.', '.oaaaaaao.'];
const LANTERN_BOTTOM = ['.oaaCCaao.', '.oaaCCaao.', '.oaaCCaao.', '.oaaaaaao.', '.oooooooo.', '..oooooo..'];
const candleLantern = {
  name: 'candleLantern',
  palette: { o: '#2b2138', a: '#3a3550', F: '#ffd27a', C: '#f6f0e4' },
  fps: 3,
  frames: [
    [...LANTERN_TOP, '.oaaFaaao.', ...LANTERN_BOTTOM],
    [...LANTERN_TOP, '.oaaaFaao.', ...LANTERN_BOTTOM],
  ],
};

const snowPoster = paintSprite(
  'snowPoster',
  26,
  18,
  { o: O, N: NAVY, w: SNOW, H: '#a5754f', R: RED, Y: '#ffd27a', W: '#e8eef8' },
  (x, y) => {
    if (x === 0 || y === 0 || x === 25 || y === 17) return 'o';
    const hill = 12 + Math.round(Math.sin(x * 0.35) * 1.5);
    if (y >= hill) return 'W'; // snowy ground
    if (x >= 15 && x <= 20 && y >= 9 && y < hill) return x === 17 && y === 10 ? 'Y' : 'H'; // cottage
    if (y >= 6 && y <= 8 && Math.abs(x - 17.5) <= y - 5) return 'R'; // roof
    if ((x * 5 + y * 7) % 11 === 0) return 'w'; // snowflakes
    return 'N';
  },
);

const snowflakeBunting = paintGarland({
  name: 'snowflakeBunting',
  w: 56,
  h: 10,
  spacing: 7,
  palette: { s: '#9aa6b8', w: SNOW, b: ICE },
  stamps: [snowflakeStamp('w'), snowflakeStamp('b')],
});

// A palette swap of the everyday book stack, in wintry blues.
const winterReads = recolor(ITEM_SPRITES.windowReads, 'winterReads', {
  R: BLUE,
  r: '#a2bde6',
  B: '#e8eef8',
  b: '#cfdcef',
  Y: NAVY,
  y: '#4a5a8a',
});

// ---- Items --------------------------------------------------------------------

export const WINTER = [
  {
    id: 'snow-fox',
    name: 'Snow Fox',
    category: 'pet',
    price: 70,
    description: 'A fluffy white fox who loves a warm rug.',
    slot: 'rug',
    sprite: snowFox,
    pet: { awake: snowFox, asleep: snowFoxAsleep, playLabel: 'Pet', playReaction: 'Flicks its fluffy tail.' },
  },
  {
    id: 'snowman',
    name: 'Little Snowman',
    category: 'decor',
    price: 35,
    description: 'Somehow, it never melts indoors.',
    slot: 'floor',
    sprite: snowman,
  },
  {
    id: 'cocoa-mug',
    name: 'Hot Cocoa',
    category: 'decor',
    price: 15,
    description: 'Topped with tiny marshmallows.',
    slot: 'desk',
    sprite: cocoaMug,
  },
  {
    id: 'snowflake-stickers',
    name: 'Snowflake Stickers',
    category: 'wall',
    price: 25,
    description: 'Paper snowflakes stuck to the window.',
    slot: 'window',
    sprite: snowflakeStickers,
  },
  {
    id: 'mittens',
    name: 'Mittens on a String',
    category: 'decor',
    price: 20,
    description: 'Drying on the curtain rod after a snowball fight.',
    slot: 'hanging',
    sprite: mittens,
  },
  {
    id: 'pinecone-bowl',
    name: 'Pinecone Bowl',
    category: 'decor',
    price: 20,
    description: 'Gathered from under the frosty pines.',
    slot: 'shelf',
    sprite: pineconeBowl,
  },
  {
    id: 'ice-skates',
    name: 'Ice Skates',
    category: 'decor',
    price: 30,
    description: 'Hung up by their laces, ready for the lake.',
    slot: 'hanging',
    sprite: iceSkates,
  },
  {
    id: 'frosted-pine',
    name: 'Frosted Pine',
    category: 'plant',
    price: 50,
    description: 'A potted pine with snow on every branch.',
    slot: 'floor',
    sprite: frostedPine,
  },
  {
    id: 'candle-lantern',
    name: 'Candle Lantern',
    category: 'lamp',
    price: 35,
    description: 'A flickering candle in a black iron lantern.',
    slot: 'floor',
    sprite: candleLantern,
    glow: { x: 5, y: 5, radius: 10, color: '#ffcf8a' },
  },
  {
    id: 'snow-poster',
    name: 'Let It Snow Poster',
    category: 'wall',
    price: 30,
    description: 'A little cottage on a snowy night.',
    slot: 'wallWide',
    sprite: snowPoster,
  },
  {
    id: 'snowflake-bunting',
    name: 'Snowflake Bunting',
    category: 'wall',
    price: 30,
    description: 'White and icy-blue snowflakes on a string.',
    slot: 'banner',
    sprite: snowflakeBunting,
  },
  {
    id: 'winter-reads',
    name: 'Winter Tales',
    category: 'book',
    price: 15,
    description: 'Stories best read under a blanket.',
    slot: 'sill',
    sprite: winterReads,
  },
  {
    id: 'lights-icicle',
    name: 'Icicle Lights',
    category: 'lighting',
    kind: 'lights',
    price: 35,
    description: 'Cool white drips of light.',
    lights: { colors: [SNOW, ICE], bulb: 'icicle' },
  },
  {
    id: 'glow-frost',
    name: 'Frost Glow',
    category: 'lighting',
    kind: 'glow',
    price: 25,
    description: 'A cool, moonlit lamp.',
    glowColor: '#bfe3ff',
  },
  {
    id: 'rug-sheepskin',
    name: 'Sheepskin Rug',
    category: 'room',
    kind: 'rug',
    price: 35,
    description: 'Soft, fluffy and snow white.',
    rug: { edge: '#d6d0c4', main: '#f1ecf7', inner: '#fbf7ff', center: '#f1ecf7' },
  },
  {
    id: 'wallpaper-frost',
    name: 'Frost Wallpaper',
    category: 'room',
    kind: 'wallpaper',
    price: 40,
    description: 'Icy blue with tiny snowflake dots.',
    wallpaper: {
      wallStyle: 'wallpaper',
      pattern: 'dots',
      wallpaper: '#a9c7e0',
      wallStripe: '#e8f2fa',
      wainscot: BLUE,
      wainscotLine: '#4a5a8a',
      trim: SNOW,
      trimDark: '#4a5a8a',
    },
  },
  {
    id: 'view-snowfall',
    name: 'Snowfall View',
    category: 'view',
    kind: 'view',
    price: 80,
    description: 'Snow drifting down over a pine forest.',
    themeId: 'snowfall',
  },
];
