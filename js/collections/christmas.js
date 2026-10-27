// Christmas collection.

import { paintSprite, paintGarland, paintWreath } from '../sprite-tools.js';

const O = '#3b2d4a';
const RED = '#d9525e';
const GREEN = '#3f7d58';
const GREEN_LIGHT = '#62a877';
const GREEN_DARK = '#2e5a3c';
const GOLD = '#f2c14e';
const CREAM = '#f6f0e4';

// ---- Sprites ------------------------------------------------------------------

const TREE_ROWS = [
  '..........y..........',
  '.........yYy.........',
  '..........y..........',
  '.........lgd.........',
  '.........ggd.........',
  '........lgrgd........',
  '........lgggd........',
  '.......lgggygd.......',
  '.......lgggggd.......',
  '......lggrgggdd......',
  '......ddddddddd......',
  '........lgggd........',
  '.......lgggggd.......',
  '.......lgygggd.......',
  '......lgggggrgd......',
  '.....lggrggggggd.....',
  '.....lgggggggygd.....',
  '....lggggggrgggdd....',
  '....lgygggggggggd....',
  '...ddddddddddddddd...',
  '......lgggggggd......',
  '.....lgggrgggggd.....',
  '....lggggggggyggd....',
  '....lgrgggggggggd....',
  '...lgggggygggggrgd...',
  '..lggrggggggggggggd..',
  '..lgggggggyggggrggd..',
  '.lgggrggggggggggyggd.',
  'ddddddddddddddddddddd',
  '.........bbb.........',
  '.........bbb.........',
  '.......ooooooo.......',
  '.......oRRRRRo.......',
  '........ooooo........',
];
// Second frame: the ornaments light up (gold turns bright, red turns pink).
const TREE_ROWS_LIT = TREE_ROWS.map((row) => row.replaceAll('y', 'Y').replaceAll('r', 'p'));

export const TREE_SPRITE = {
  name: 'christmasTree',
  palette: {
    l: GREEN_LIGHT,
    g: GREEN,
    d: GREEN_DARK,
    r: RED,
    p: '#ff9cb0',
    y: GOLD,
    Y: '#fff1b0',
    b: '#7a5236',
    o: O,
    R: RED,
  },
  fps: 1,
  frames: [TREE_ROWS, TREE_ROWS_LIT],
};

const gifts = {
  name: 'giftPile',
  palette: { o: O, R: RED, y: GOLD, G: GREEN_LIGHT, B: '#6f8fc4', w: CREAM },
  rows: [
    '..y.y...............',
    '...y................',
    'oooooooo.......w.w..',
    'oRRRyRRo........w...',
    'oRRRyRRo......oooooo',
    'oRRRyRRo......oBBwBo',
    'oyyyyyyooooooooBBwBo',
    'oRRRyRRooGGyGoowwwwo',
    'oRRRyRRooyyyyooBBwBo',
    'oRRRyRRooGGyGooBBwBo',
    'oRRRyRRooGGyGooBBwBo',
    'oooooooooooooooooooo',
  ],
};

const wreath = paintWreath({
  name: 'wreath',
  palette: { d: GREEN_DARK, g: GREEN, l: GREEN_LIGHT, r: RED, R: RED, k: '#a63a48' },
});

const stocking = {
  name: 'stocking',
  palette: { o: O, W: CREAM, R: RED, y: GOLD },
  rows: [
    '...o.....',
    '.ooooooo.',
    '.oWWWWWo.',
    '.oWWWWWo.',
    '.ooooooo.',
    '.oRRRRRo.',
    '.oRRyRRo.',
    '.oRRRRRo.',
    '.oRRyRRo.',
    '.oRRRRRo.',
    '.oRRRRRRo',
    '.oRRRRRRo',
    '.oRRRRRWo',
    '..oooooo.',
  ],
};

const GLOBE_BASE = ['..ooooo..', '.oBBBBBo.', 'oBBBBBBBo', 'ooooooooo'];
const snowGlobe = {
  name: 'snowGlobe',
  palette: { o: O, a: '#cfe6f5', w: '#ffffff', g: GREEN_LIGHT, B: '#a5754f' },
  fps: 1,
  frames: [
    ['..ooooo..', '.oaaaaao.', 'oaaawaaao', 'oawaagaao', 'oaaagggao', '.oaawaao.', ...GLOBE_BASE],
    ['..ooooo..', '.oawaaao.', 'oaaaaaawo', 'owaaagaao', 'oaaagggao', '.oaaaawo.', ...GLOBE_BASE],
  ],
};

const gingerbread = {
  name: 'gingerbreadHouse',
  palette: { o: O, W: '#fbf7ff', B: '#b5794a', y: '#ffd27a', r: RED, D: '#7a4a30' },
  rows: [
    '......oo......',
    '.....oWWo.....',
    '....oWBBWo....',
    '...oWBBBBWo...',
    '..oWBBBBBBWo..',
    '.oWWWWWWWWWWo.',
    '..oBBBBBBBBo..',
    '..oByyBBrrBo..',
    '..oByyBBrrBo..',
    '..oBBBDDBBBo..',
    '..oBBBDDBBBo..',
    '..oooooooooo..',
  ],
};

const poinsettia = {
  name: 'poinsettia',
  palette: { R: RED, y: GOLD, g: GREEN, o: O, P: GOLD },
  rows: [
    '.....RR.....',
    '..R..RR..R..',
    '..RRRRRRRR..',
    'RRRRRyyRRRRR',
    '..RRRyyRRR..',
    '.gRRRRRRRRg.',
    'gg.RR..RR.gg',
    '..oooooooo..',
    '..oPPPPPPo..',
    '...oPPPPo...',
    '...oPPPPo...',
    '....oooo....',
  ],
};

const nutcracker = {
  name: 'nutcracker',
  palette: { o: O, K: '#3a2f52', y: GOLD, S: '#f2c7a5', k: '#2b2138', W: CREAM, R: RED },
  rows: [
    '..oooo..',
    '..oKKo..',
    '..oKKo..',
    '..oKKo..',
    '.ooyyoo.',
    '..oSSo..',
    '..oSko..',
    '..oWWo..',
    '.oRRRRo.',
    'oSRyyRSo',
    '.oRRRRo.',
    '.oyyyyo.',
    '.oWWWWo.',
    '.oWWWWo.',
    '.oWooWo.',
    '.oKooKo.',
    '.oKooKo.',
    '.oooooo.',
  ],
};

const merryPoster = paintSprite(
  'merryPoster',
  26,
  18,
  { o: O, G: GREEN_DARK, W: CREAM, t: RED, s: GOLD, y: GOLD, R: RED, h: '#f3a9bf', w: '#ffffff' },
  (x, y) => {
    if (x === 0 || y === 0 || x === 25 || y === 17) return 'o';
    if (y >= 13 && y <= 15) return y === 14 && x >= 4 && x <= 21 && x % 3 !== 0 ? 't' : 'W'; // caption
    if (x === 13 && y >= 1 && y <= 3) return 's'; // ornament string
    if (y === 4 && x >= 12 && x <= 14) return 'y'; // ornament cap
    if (Math.hypot(x - 13, y - 8) <= 3.6) return x - 13 + (y - 8) < -2 ? 'h' : 'R';
    if ((x * 5 + y * 3) % 13 === 0) return 'w'; // snow
    return 'G';
  },
);

const bauble = (key) => ['.y.', key.repeat(3), `${key}h${key}`, `.${key}.`];
const ornamentBunting = paintGarland({
  name: 'ornamentBunting',
  w: 56,
  h: 10,
  spacing: 7,
  palette: { s: GREEN_DARK, y: '#c9a06a', h: '#ffffff', R: RED, G: GREEN_LIGHT, Y: GOLD, B: '#6f8fc4' },
  stamps: [bauble('R'), bauble('G'), bauble('Y'), bauble('B')],
});

const reindeer = {
  name: 'reindeerPlush',
  palette: { a: '#c9a06a', o: O, B: '#a5754f', b: '#e6c8a0', k: '#2b2138', R: RED },
  rows: [
    'a.a..a.a........',
    '.aa..aa.........',
    '..aooa..........',
    '..oBBBo.........',
    '.oBBkBBo........',
    'oRBBBBBoooooo...',
    '.oBBBBBBBBBBBo..',
    '..oBBBbBBBBBBBo.',
    '..oBBbbbBBBBBBBo',
    '..oBBbbbBBBBBBBo',
    '..oBBoBBoBBoBBo.',
    '..ooo.ooo.ooo...',
  ],
};

const candyCane = {
  name: 'candyCane',
  palette: { o: O, R: RED, W: '#fbf7ff' },
  rows: [
    '.ooooo.',
    'oRWRWRo',
    'oWo.oWo',
    'ooo.oRo',
    '....oWo',
    '....oRo',
    '....oWo',
    '....oRo',
    '....oWo',
    '....oRo',
    '....oWo',
    '....oRo',
    '....ooo',
  ],
};

// ---- Items --------------------------------------------------------------------

export const CHRISTMAS = [
  {
    id: 'christmas-tree',
    name: 'Christmas Tree',
    category: 'plant',
    price: 60,
    description: 'Ornaments that twinkle while you work.',
    slot: 'floor',
    sprite: TREE_SPRITE,
    glow: { x: 10, y: 1, radius: 10, color: '#ffe9a8' },
  },
  {
    id: 'gift-pile',
    name: 'Pile of Presents',
    category: 'decor',
    price: 35,
    description: 'No peeking until you finish the chapter.',
    slot: 'floor',
    sprite: gifts,
  },
  {
    id: 'wreath',
    name: 'Holly Wreath',
    category: 'wall',
    price: 30,
    description: 'Hangs right in the middle of the window.',
    slot: 'window',
    sprite: wreath,
  },
  {
    id: 'stocking',
    name: 'Cosy Stocking',
    category: 'decor',
    price: 20,
    description: 'Hung from the curtain rod with care.',
    slot: 'hanging',
    sprite: stocking,
  },
  {
    id: 'snow-globe',
    name: 'Snow Globe',
    category: 'decor',
    price: 30,
    description: 'A tiny forest where it is always snowing.',
    slot: 'desk',
    sprite: snowGlobe,
  },
  {
    id: 'gingerbread-house',
    name: 'Gingerbread House',
    category: 'decor',
    price: 35,
    description: 'Too pretty to eat. Probably.',
    slot: 'shelf',
    sprite: gingerbread,
    glow: { x: 4, y: 8, radius: 6, color: '#ffd27a' },
  },
  {
    id: 'poinsettia',
    name: 'Poinsettia',
    category: 'plant',
    price: 25,
    description: 'Bright red leaves for grey December days.',
    slot: 'sill',
    sprite: poinsettia,
  },
  {
    id: 'nutcracker',
    name: 'Nutcracker',
    category: 'decor',
    price: 30,
    description: 'Stands guard over your bookshelf.',
    slot: 'shelf',
    sprite: nutcracker,
  },
  {
    id: 'merry-poster',
    name: 'Merry & Bright Poster',
    category: 'wall',
    price: 30,
    description: 'One shiny bauble on a snowy green.',
    slot: 'wallWide',
    sprite: merryPoster,
  },
  {
    id: 'ornament-bunting',
    name: 'Bauble Bunting',
    category: 'wall',
    price: 30,
    description: 'A string of baubles above the shelf.',
    slot: 'banner',
    sprite: ornamentBunting,
  },
  {
    id: 'reindeer-plush',
    name: 'Reindeer Plush',
    category: 'decor',
    price: 40,
    description: 'Red nose, soft antlers, sits on the rug.',
    slot: 'rug',
    sprite: reindeer,
  },
  {
    id: 'candy-cane',
    name: 'Candy Cane',
    category: 'decor',
    price: 15,
    description: 'Peppermint stripes on the curtain rod.',
    slot: 'hanging',
    sprite: candyCane,
  },
  {
    id: 'lights-christmas',
    name: 'Christmas Lights',
    category: 'lighting',
    kind: 'lights',
    price: 35,
    description: 'Red, green and gold string lights.',
    lights: { colors: [RED, GREEN_LIGHT, GOLD], bulb: 'round' },
  },
  {
    id: 'glow-candlelight',
    name: 'Candlelight Glow',
    category: 'lighting',
    kind: 'glow',
    price: 25,
    description: 'A warm orange lamp, like a room full of candles.',
    glowColor: '#ffb36b',
  },
  {
    id: 'rug-plaid',
    name: 'Tartan Rug',
    category: 'room',
    kind: 'rug',
    price: 35,
    description: 'Deep red and pine green.',
    rug: { edge: '#7a2a32', main: '#c9473a', inner: '#3f7d58', center: '#c9473a' },
  },
  {
    id: 'wallpaper-holly',
    name: 'Holly Wallpaper',
    category: 'room',
    kind: 'wallpaper',
    price: 40,
    description: 'Pine green, dotted with red berries.',
    wallpaper: {
      wallStyle: 'wallpaper',
      pattern: 'dots',
      wallpaper: '#3f6e57',
      wallStripe: '#d9525e',
      wainscot: '#7a2a32',
      wainscotLine: '#5e1f27',
      trim: '#f2e6d0',
      trimDark: '#5e1f27',
    },
  },
  {
    id: 'view-snowy-village',
    name: 'Snowy Village View',
    category: 'view',
    kind: 'view',
    price: 80,
    description: 'Snow falling on rooftops and lit windows.',
    themeId: 'snowy-village',
  },
];
