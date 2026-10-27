// Autumn collection.

import { paintSprite, paintGarland, paintWreath, recolor, linePoints, pointSet } from '../sprite-tools.js';
import { ITEM_SPRITES } from '../item-sprites.js';

const O = '#3b2d4a';
const ORANGE = '#e8803a';
const ORANGE_DARK = '#b85a2a';
const RED = '#c9473a';
const YELLOW = '#f2c14e';
const BROWN = '#7a5236';
const TAN = '#a5754f';

// ---- Sprites ------------------------------------------------------------------

const HEDGEHOG_ROWS = [
  '...k.k.k....',
  '..kKkKkKk...',
  '.kKkKkKkKk..',
  'kKkKkKkKkoFo',
  'kKkKkKkKoFeF',
  'kKkKkKkKoFFp',
  '.kKkKkKkoFFo',
  '..ooFoooFo..',
];
const HEDGEHOG_PALETTE = { k: '#5a3b28', K: '#8a5a38', F: '#f2d4a8', e: '#2b2138', p: '#2b2138', o: O };
const hedgehog = { name: 'hedgehog', palette: HEDGEHOG_PALETTE, rows: HEDGEHOG_ROWS };
const hedgehogAsleep = {
  name: 'hedgehogAsleep',
  palette: HEDGEHOG_PALETTE,
  rows: HEDGEHOG_ROWS.map((row) => row.replaceAll('e', 'F')), // eyes closed
};

const pumpkin = paintSprite(
  'pumpkin',
  16,
  12,
  { O: ORANGE, L: '#f2a65a', D: ORANGE_DARK, b: BROWN, g: '#3f7d58' },
  (x, y) => {
    if (y <= 1) return x === 7 || x === 8 ? 'b' : y === 1 && (x === 9 || x === 10) ? 'g' : null;
    const d = Math.hypot((x - 7.5) / 7.6, (y - 6.8) / 5.2);
    if (d > 1) return null;
    if (d > 0.86) return 'D';
    if (Math.abs(Math.abs(x - 7.5) - 3.5) < 0.6) return 'D'; // ribs
    return x < 6 && y < 6 ? 'L' : 'O';
  },
);

// A palette swap of the everyday bonsai: same tree, autumn leaves.
const mapleBonsai = recolor(ITEM_SPRITES.bonsai, 'mapleBonsai', { g: ORANGE, l: YELLOW, d: RED, C: TAN });

const GOURDS = [
  { cx: 2.5, rx: 2.6, ry: 2.6, key: 'O' },
  { cx: 7.5, rx: 3.1, ry: 3.3, key: 'Y' },
  { cx: 12.8, rx: 2.6, ry: 2.6, key: 'G' },
];
const gourdTrio = paintSprite(
  'gourdTrio',
  16,
  8,
  { O: ORANGE, Y: YELLOW, G: '#8fb86a', D: ORANGE_DARK, b: BROWN },
  (x, y) => {
    for (const gourd of GOURDS) {
      const cy = 7.4 - gourd.ry;
      const d = Math.hypot((x - gourd.cx) / gourd.rx, (y - cy) / gourd.ry);
      if (d <= 1) return d > 0.78 ? 'D' : gourd.key;
      if (y === Math.round(cy - gourd.ry - 0.6) && Math.abs(x - gourd.cx) < 0.6) return 'b'; // stalk
    }
    return null;
  },
);

const acornJar = {
  name: 'acornJar',
  palette: { o: O, B: BROWN, a: '#cfe6f5', A: TAN, c: '#5a3b28' },
  rows: ['.oooooo.', '.oBBBBo.', 'oaaaaaao', 'oaAaaAao', 'oAacAAao', 'oaAAacAo', 'oAAcAAAo', 'oAAAAcAo', 'oaaaaaao', '.oooooo.'],
};

const leaf = (key) => ['..k..', 'k.k.k', 'kkkkk', '.kkk.', '..b..'].map((row) => row.replaceAll('k', key));
const leafGarland = paintGarland({
  name: 'leafGarland',
  w: 56,
  h: 10,
  spacing: 7,
  palette: { s: BROWN, b: BROWN, O: ORANGE, R: RED, Y: YELLOW },
  stamps: [leaf('O'), leaf('R'), leaf('Y')],
});

const leafWreath = paintWreath({
  name: 'leafWreath',
  palette: { d: ORANGE_DARK, g: ORANGE, l: YELLOW, r: RED, R: TAN, k: BROWN },
});

const APPLES = [
  [3, 2.5],
  [7, 2.5],
  [11, 2.5],
  [15, 2.5],
  [5, 1.2],
  [9, 1.2],
  [13, 1.2],
];
const appleCrate = paintSprite(
  'appleCrate',
  20,
  12,
  { A: '#d9473a', h: '#f0806a', o: O, w: '#c4936a', W: TAN },
  (x, y) => {
    if (y >= 4) {
      if (x === 0 || x === 19 || y === 4 || y === 11) return 'o';
      return y === 7 || y === 8 ? 'W' : 'w'; // slats
    }
    for (const [cx, cy] of APPLES) {
      if (Math.hypot(x - cx, y - cy) <= 1.9) return x < cx && y < cy ? 'h' : 'A';
    }
    return null;
  },
);

const spicedLatte = {
  name: 'spicedLatte',
  palette: { o: O, W: '#f1ecf7', C: '#f6f0e4', S: TAN, l: ORANGE },
  rows: ['.ooooo.', 'oWWWWWo', '.oCCCo.', '.oCCCo.', '.oSSSo.', '.oSlSo.', '.oSSSo.', '.oCCCo.', '..ooo..'],
};

const mushroomLamp = {
  name: 'mushroomLamp',
  palette: { o: O, R: '#d9473a', W: '#fbf7ff', L: '#fff1c9' },
  rows: ['..ooooo..', '.oRRWRRo.', 'oRWRRRWRo', 'oRRRRRRRo', 'ooooooooo', '...oLo...', '...oLo...', '..oLLLo..', '.ooooooo.'],
};

const sweaterPoster = paintSprite(
  'sweaterPoster',
  26,
  18,
  { o: O, Y: '#e0a83a', S: ORANGE, s: ORANGE_DARK, W: '#f6f0e4', t: RED },
  (x, y) => {
    if (x === 0 || y === 0 || x === 25 || y === 17) return 'o';
    if (y >= 14 && y <= 16) return y === 15 && x >= 5 && x <= 20 && x % 3 !== 1 ? 't' : 'W'; // caption
    const body = x >= 9 && x <= 16 && y >= 4 && y <= 12;
    const sleeves = ((x >= 6 && x <= 8) || (x >= 17 && x <= 19)) && y >= 5 && y <= 11;
    if (y === 3 && x >= 11 && x <= 14) return 's'; // neckline
    if (body || sleeves) return (y === 7 && (x + y) % 2 === 0) || y === 12 || (sleeves && y === 11) ? 'W' : 'S';
    return 'Y';
  },
);

const WHEAT_STALKS = pointSet(
  [1, 3, 5, 7, 9].flatMap((topX) => linePoints(5, 23, topX, 8)),
);
const wheatBundle = paintSprite(
  'wheatBundle',
  11,
  24,
  { g: '#d9b860', G: '#b8923a', R: RED },
  (x, y) => {
    if ((y === 15 || y === 16) && x >= 3 && x <= 7) return 'R'; // ribbon
    for (const topX of [1, 3, 5, 7, 9]) {
      // a grain head: a short column of alternating grains above each stalk
      if (Math.abs(x - topX) <= 0.5 && y >= 1 && y <= 8) return y % 2 ? 'g' : 'G';
    }
    return WHEAT_STALKS.has(`${x},${y}`) ? 'G' : null;
  },
);

// ---- Items --------------------------------------------------------------------

export const AUTUMN = [
  {
    id: 'hedgehog',
    name: 'Hedgehog',
    category: 'pet',
    price: 60,
    description: 'Curls up on the rug and snuffles softly.',
    slot: 'rug',
    sprite: hedgehog,
    pet: { awake: hedgehog, asleep: hedgehogAsleep, playLabel: 'Pet', playReaction: 'Wiggles its little nose.' },
  },
  {
    id: 'pumpkin',
    name: 'Pumpkin',
    category: 'decor',
    price: 25,
    description: 'Round, orange and very autumn.',
    slot: 'floor',
    sprite: pumpkin,
  },
  {
    id: 'maple-bonsai',
    name: 'Maple Bonsai',
    category: 'plant',
    price: 30,
    description: 'The desk bonsai in its autumn colours.',
    slot: 'desk',
    sprite: mapleBonsai,
  },
  {
    id: 'gourd-trio',
    name: 'Gourd Trio',
    category: 'decor',
    price: 20,
    description: 'Three funny-shaped gourds in a row.',
    slot: 'shelf',
    sprite: gourdTrio,
  },
  {
    id: 'acorn-jar',
    name: 'Acorn Jar',
    category: 'decor',
    price: 15,
    description: 'Collected on the walk home.',
    slot: 'sill',
    sprite: acornJar,
  },
  {
    id: 'leaf-garland',
    name: 'Maple Leaf Garland',
    category: 'wall',
    price: 30,
    description: 'Orange, red and yellow leaves on a string.',
    slot: 'banner',
    sprite: leafGarland,
  },
  {
    id: 'leaf-wreath',
    name: 'Autumn Wreath',
    category: 'wall',
    price: 30,
    description: 'A ring of falling-leaf colours for the window.',
    slot: 'window',
    sprite: leafWreath,
  },
  {
    id: 'apple-crate',
    name: 'Apple Crate',
    category: 'decor',
    price: 30,
    description: 'Fresh from the orchard.',
    slot: 'floor',
    sprite: appleCrate,
  },
  {
    id: 'spiced-latte',
    name: 'Spiced Latte',
    category: 'decor',
    price: 15,
    description: 'Cinnamon, nutmeg and a little leaf on the sleeve.',
    slot: 'desk',
    sprite: spicedLatte,
  },
  {
    id: 'mushroom-lamp',
    name: 'Toadstool Lamp',
    category: 'lamp',
    price: 35,
    description: 'A glowing red toadstool for the shelf.',
    slot: 'shelf',
    sprite: mushroomLamp,
    glow: { x: 4, y: 3, radius: 9, color: '#ffd27a' },
  },
  {
    id: 'sweater-poster',
    name: 'Sweater Weather Poster',
    category: 'wall',
    price: 30,
    description: 'Knitwear season has officially begun.',
    slot: 'wallWide',
    sprite: sweaterPoster,
  },
  {
    id: 'wheat-bundle',
    name: 'Wheat Bundle',
    category: 'wall',
    price: 20,
    description: 'Dried wheat tied with a red ribbon.',
    slot: 'wallTall',
    sprite: wheatBundle,
  },
  {
    id: 'lights-maple',
    name: 'Maple Leaf Lights',
    category: 'lighting',
    kind: 'lights',
    price: 35,
    description: 'Little glowing leaves along the wire.',
    lights: { colors: [ORANGE, RED, YELLOW], bulb: 'leaf' },
  },
  {
    id: 'glow-ember',
    name: 'Ember Glow',
    category: 'lighting',
    kind: 'glow',
    price: 25,
    description: 'Lamp light like a crackling fire.',
    glowColor: '#ff9a4a',
  },
  {
    id: 'rug-woven',
    name: 'Woven Rug',
    category: 'room',
    kind: 'rug',
    price: 35,
    description: 'Rust, mustard and walnut brown.',
    rug: { edge: BROWN, main: ORANGE_DARK, inner: YELLOW, center: ORANGE_DARK },
  },
  {
    id: 'wallpaper-maple',
    name: 'Maple Stripe Wallpaper',
    category: 'room',
    kind: 'wallpaper',
    price: 40,
    description: 'Warm caramel stripes.',
    wallpaper: {
      wallStyle: 'wallpaper',
      pattern: 'stripes',
      wallpaper: '#c98a4e',
      wallStripe: '#b5743a',
      wainscot: BROWN,
      wainscotLine: '#5a3b28',
      trim: '#e6c08a',
      trimDark: '#5a3b28',
    },
  },
  {
    id: 'view-maple-forest',
    name: 'Maple Forest View',
    category: 'view',
    kind: 'view',
    price: 80,
    description: 'Golden afternoon light and falling leaves.',
    themeId: 'maple-forest',
  },
];
