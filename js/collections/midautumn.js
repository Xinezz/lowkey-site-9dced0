// Mid-Autumn (Harvest Moon) Festival collection.

import { paintSprite, paintGarland, paintLantern, linePoints, pointSet } from '../sprite-tools.js';

const O = '#3b2d4a';
const RED = '#d9363e';
const GOLD = '#f2c14e';
const MOON = '#f6e7a8';
const MOON_SHADE = '#e6c86e';
const NAVY = '#2a3366';
const PAPER = '#fbf2dc';

// ---- Sprites ------------------------------------------------------------------

const RABBIT_EARS = ['.ooo.ooo......', '.oPo.oPo......', '.oPo.oPo......'];
const RABBIT_BODY = ['..oWWWWo......', '.oWWWWWWoooo..'];
const RABBIT_FACE_OPEN = 'oWkWWWWWWWWWWo';
const RABBIT_FACE_CLOSED = 'oWoWWWWWWWWWWo';
const RABBIT_LOWER = ['opWWWWWWWWWWWo', '.oWWWWWWWWWWWo', '..oWWoWWWWWWWo', '...oo.ooooooo.'];
const RABBIT_PALETTE = { o: O, W: '#f6f2fb', P: '#f3a9bf', p: '#e8708c', k: '#9e2430' };
const rabbitOpen = [...RABBIT_EARS, ...RABBIT_BODY, RABBIT_FACE_OPEN, ...RABBIT_LOWER];
const rabbitClosed = [...RABBIT_EARS, ...RABBIT_BODY, RABBIT_FACE_CLOSED, ...RABBIT_LOWER];
const moonRabbit = {
  name: 'moonRabbit',
  palette: RABBIT_PALETTE,
  fps: 1,
  frames: [rabbitOpen, rabbitOpen, rabbitOpen, rabbitClosed],
};
const moonRabbitAsleep = { name: 'moonRabbitAsleep', palette: RABBIT_PALETTE, rows: rabbitClosed };

const mooncakes = {
  name: 'mooncakes',
  palette: { o: O, M: '#d99a4e', m: '#b5743a', D: '#a8662f', P: '#f1ecf7' },
  rows: ['..ooooooo..', '.oMMmMmMMo.', '.oMmMMMmMo.', '.oMMmMmMMo.', '.oDDDDDDDo.', 'oPPPPPPPPPo', '.ooooooooo.'],
};

const rabbitLantern = {
  name: 'rabbitLantern',
  palette: { o: O, W: PAPER, P: '#f3a9bf', r: RED, R: '#e8708c', K: '#7a5236' },
  rows: [
    '...o.o..........',
    '..oPooPo........',
    '..oWWWWo........',
    '.oWWWWWWoooooo..',
    'oWrWWWWWWWWWWWo.',
    'oWWWWWWWWWWWWWWo',
    'oWWWWWRRWWWWWWWo',
    'oWWWWRRRRWWWWWWo',
    '.oWWWWWWWWWWWWo.',
    '..oooooooooooo..',
    '...oKo....oKo...',
    '....o......o....',
  ],
};

const starLantern = paintSprite(
  'starLantern',
  12,
  14,
  { s: O, o: '#b85a2a', Y: '#ffd27a', O: '#f29a3a', t: RED },
  (x, y) => {
    const centre = x === 5 || x === 6;
    if (y < 2) return centre ? 's' : null;
    if (y >= 12) return centre ? 't' : null;
    const dx = x - 5.5;
    const dy = y - 7;
    const angle = Math.atan2(dy, dx) + Math.PI / 2; // 0 points straight up
    const radius = 3 + 2.3 * ((Math.cos(5 * angle) + 1) / 2); // five points
    const d = Math.hypot(dx, dy);
    if (d > radius) return null;
    if (d > radius - 0.9) return 'o';
    return Math.floor((angle + 2 * Math.PI) / (Math.PI / 5)) % 2 ? 'Y' : 'O';
  },
);

const paperLantern = paintLantern({
  name: 'paperLantern',
  w: 10,
  bodyH: 9,
  palette: { s: O, c: RED, b: PAPER, r: '#e6d3a8', h: '#ffffff', d: '#d9b880', t: RED },
});

const pomelo = paintSprite(
  'pomelo',
  10,
  10,
  { b: '#7a5236', g: '#3f7d58', Y: '#c9d97a', L: '#e6f0a8', D: '#8fa84a' },
  (x, y) => {
    if (y === 0) return x === 5 ? 'b' : x === 6 || x === 7 ? 'g' : null;
    if (y === 1) return x === 5 ? 'b' : x === 6 ? 'g' : null;
    const d = Math.hypot(x - 4.5, y - 5.6);
    if (d > 4.5) return null;
    if (d > 3.7) return 'D';
    return x - 4.5 + (y - 5.6) < -2.5 ? 'L' : 'Y';
  },
);

const OSMANTHUS_BRANCHES = pointSet(
  [
    [4, 10, 2, 3],
    [5, 10, 5, 1],
    [5, 10, 8, 4],
  ].flatMap(([x0, y0, x1, y1]) => linePoints(x0, y0, x1, y1)),
);
const OSMANTHUS_FLOWERS = pointSet([
  [1, 2],
  [3, 4],
  [2, 5],
  [5, 0],
  [6, 2],
  [4, 3],
  [8, 3],
  [7, 5],
  [9, 4],
  [6, 6],
]);
const VASE_HALF = [1.5, 2.5, 3.5, 3.5, 3, 2]; // rows 10–15
const osmanthusVase = paintSprite(
  'osmanthusVase',
  10,
  16,
  { y: GOLD, b: '#5a3b28', V: '#8fc7b2', o: O },
  (x, y) => {
    if (OSMANTHUS_FLOWERS.has(`${x},${y}`)) return 'y';
    if (y < 10) return OSMANTHUS_BRANCHES.has(`${x},${y}`) ? 'b' : null;
    const half = VASE_HALF[y - 10];
    const dx = Math.abs(x - 4.5);
    if (dx > half) return null;
    return dx > half - 1 || y === 15 ? 'o' : 'V';
  },
);

const lotusLamp = {
  name: 'lotusLamp',
  palette: { p: '#e8708c', P: '#f3a9bf', L: '#fff1b0', g: '#3f7d58' },
  rows: [
    '.....p.....',
    '....pPp....',
    '..p.pPp.p..',
    '.pPpLLLpPp.',
    'pPPpLLLpPPp',
    '.pPPpppPPp.',
    '..ppppppp..',
    '..ggggggg..',
    '.ggggggggg.',
  ],
};

const RABBIT_SILHOUETTE = pointSet(
  ['..o.o...', '..ooo...', '.ooooo..', 'oooooo..', '.oooooo.', '..o..o..'].flatMap((row, y) =>
    [...row].flatMap((key, x) => (key === 'o' ? [[x, y]] : [])),
  ),
);
const fullMoonPoster = paintSprite(
  'fullMoonPoster',
  26,
  18,
  { o: O, N: NAVY, M: MOON, m: MOON_SHADE, c: '#6b5b9e', s: '#ffe9a8' },
  (x, y) => {
    if (x === 0 || y === 0 || x === 25 || y === 17) return 'o';
    const d = Math.hypot(x - 13, y - 7.5);
    if (d <= 6.5) return RABBIT_SILHOUETTE.has(`${x - 10},${y - 5}`) ? 'm' : d > 5.7 ? 'm' : 'M';
    if (y >= 14 || (y === 13 && x % 5 !== 0)) return 'c'; // a bank of cloud
    if ((x * 7 + y * 11) % 23 === 0) return 's';
    return 'N';
  },
);

const moonScroll = paintSprite(
  'moonScroll',
  12,
  26,
  { w: '#7a5236', P: '#f4ead6', p: '#d9c8a4', M: MOON, m: MOON_SHADE, n: NAVY, c: '#a2bde6' },
  (x, y) => {
    if (y === 0 || y === 25) return 'w'; // wooden rods
    if (x === 0 || x === 11) return null;
    if (x === 1 || x === 10) return 'p';
    const d = Math.hypot(x - 5.5, y - 5);
    if (d <= 3) return d > 2.3 ? 'm' : 'M';
    if (y >= 10 && y <= 21) {
      // a flowing ribbon, like a robe drifting up towards the moon
      const ribbonX = 5.5 + 2.4 * Math.sin(y * 0.6);
      if (Math.abs(x - ribbonX) < 1) return 'n';
    }
    if ((y === 22 || y === 23) && x >= 2 && x <= 9 && (x + y) % 3 !== 0) return 'c';
    return 'P';
  },
);

const slip = (key) => ['yy', key + key, key + key, key + key, key + key, '.t'];
const riddleBanner = paintGarland({
  name: 'riddleBanner',
  w: 56,
  h: 12,
  spacing: 6,
  sag: 2,
  palette: { s: '#7a5236', y: GOLD, R: RED, P: '#f3a9bf', Y: '#ffd27a', t: RED },
  stamps: [slip('R'), slip('P'), slip('Y')],
});

const floorLantern = {
  name: 'floorLantern',
  palette: { o: O, R: RED, L: '#fff1c9', b: '#7a5236' },
  rows: [
    '..ooooo..',
    '.oRRRRRo.',
    '.oLLLLLo.',
    '.oLLRLLo.',
    '.oLLLLLo.',
    '.oLLRLLo.',
    '.oLLLLLo.',
    '.oRRRRRo.',
    '..ooooo..',
    ...Array(18).fill('....b....'),
    '...bbb...',
    '..obbbo..',
    '.ooooooo.',
  ],
};

// ---- Items --------------------------------------------------------------------

export const MIDAUTUMN = [
  {
    id: 'moon-rabbit',
    name: 'Moon Rabbit',
    category: 'pet',
    price: 70,
    description: 'The jade rabbit, visiting from the moon.',
    slot: 'rug',
    sprite: moonRabbit,
    pet: { awake: moonRabbit, asleep: moonRabbitAsleep, playLabel: 'Pat', playReaction: 'Twitches its nose happily.' },
  },
  {
    id: 'mooncakes',
    name: 'Mooncake Plate',
    category: 'decor',
    price: 25,
    description: 'Golden pastry, lotus paste inside.',
    slot: 'desk',
    sprite: mooncakes,
  },
  {
    id: 'rabbit-lantern',
    name: 'Rabbit Lantern',
    category: 'lamp',
    price: 40,
    description: 'A paper rabbit on wheels, glowing from inside.',
    slot: 'floor',
    sprite: rabbitLantern,
    glow: { x: 8, y: 6, radius: 10, color: '#ffd27a' },
  },
  {
    id: 'star-lantern',
    name: 'Star Lantern',
    category: 'lamp',
    price: 30,
    description: 'Five glowing points of orange and gold.',
    slot: 'hanging',
    sprite: starLantern,
    glow: { x: 6, y: 7, radius: 10, color: '#ffb347' },
  },
  {
    id: 'paper-lantern',
    name: 'Paper Lantern',
    category: 'lamp',
    price: 25,
    description: 'A round lantern of cream paper.',
    slot: 'hanging',
    sprite: paperLantern,
    glow: { x: 5, y: 8, radius: 10, color: '#ffe3a8' },
  },
  {
    id: 'pomelo',
    name: 'Pomelo',
    category: 'decor',
    price: 15,
    description: 'A big festival fruit for the windowsill.',
    slot: 'sill',
    sprite: pomelo,
  },
  {
    id: 'osmanthus-vase',
    name: 'Osmanthus Vase',
    category: 'plant',
    price: 30,
    description: 'Tiny golden flowers that smell of autumn.',
    slot: 'shelf',
    sprite: osmanthusVase,
  },
  {
    id: 'lotus-lamp',
    name: 'Lotus Lamp',
    category: 'lamp',
    price: 35,
    description: 'Soft light from inside a pink lotus.',
    slot: 'desk',
    sprite: lotusLamp,
    glow: { x: 5, y: 4, radius: 9, color: '#ffb3c7' },
  },
  {
    id: 'full-moon-poster',
    name: 'Full Moon Poster',
    category: 'wall',
    price: 30,
    description: 'Look closely: there is a rabbit on the moon.',
    slot: 'wallWide',
    sprite: fullMoonPoster,
  },
  {
    id: 'moon-scroll',
    name: 'Moon Scroll',
    category: 'wall',
    price: 30,
    description: 'A ribbon drifting up towards the moon.',
    slot: 'wallTall',
    sprite: moonScroll,
  },
  {
    id: 'riddle-banner',
    name: 'Lantern Riddles',
    category: 'wall',
    price: 25,
    description: 'Paper slips with riddles to guess.',
    slot: 'banner',
    sprite: riddleBanner,
  },
  {
    id: 'floor-lantern',
    name: 'Floor Lantern',
    category: 'lamp',
    price: 45,
    description: 'A tall paper lantern for the corner.',
    slot: 'floorTall',
    sprite: floorLantern,
    glow: { x: 4, y: 4, radius: 14, color: '#ffd27a' },
  },
  {
    id: 'lights-paper-lanterns',
    name: 'Paper Lantern Lights',
    category: 'lighting',
    kind: 'lights',
    price: 35,
    description: 'Little cream and amber paper lanterns.',
    lights: { colors: ['#ffd27a', '#f29a3a', PAPER], bulb: 'lantern' },
  },
  {
    id: 'glow-harvest',
    name: 'Harvest Gold Glow',
    category: 'lighting',
    kind: 'glow',
    price: 25,
    description: 'Lamp light the colour of a harvest moon.',
    glowColor: '#ffd36b',
  },
  {
    id: 'rug-moon',
    name: 'Moonlit Rug',
    category: 'room',
    kind: 'rug',
    price: 35,
    description: 'Night blue with a golden moon in the middle.',
    rug: { edge: '#1f2650', main: '#3d4a80', inner: '#5a68a0', center: MOON },
  },
  {
    id: 'wallpaper-osmanthus',
    name: 'Osmanthus Wallpaper',
    category: 'room',
    kind: 'wallpaper',
    price: 40,
    description: 'Plum purple, scattered with golden flowers.',
    wallpaper: {
      wallStyle: 'wallpaper',
      pattern: 'dots',
      wallpaper: '#6b5b9e',
      wallStripe: GOLD,
      wainscot: '#4b3d7a',
      wainscotLine: '#3a2f5e',
      trim: MOON,
      trimDark: '#3a2f5e',
    },
  },
  {
    id: 'view-harvest-moon',
    name: 'Harvest Moon View',
    category: 'view',
    kind: 'view',
    price: 80,
    description: 'A huge moon, with sky lanterns drifting up.',
    themeId: 'harvest-moon',
  },
];
