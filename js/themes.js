// Backgrounds ("themes"). Each theme is plain data plus one function that
// paints the view outside the window. Adding a new background means adding
// one object to THEMES; nothing else in the game needs to change.
//
// drawView(ctx, view, t) receives:
//   view: the rectangle to paint, { x, y, w, h } (the window glass, or a preview canvas)
//   t:    time in seconds, used for gentle animation (rain, clouds, fireflies)

import { rect, circle, ditheredBands, makeRng, mixHex } from './pixel.js';

// Room colours shared by the lavender rooms. The lighting (see below) is what
// makes the same room look like night or sunset.
const LAVENDER_ROOM = {
  wallStyle: 'wallpaper',
  wallpaper: '#8e7cc0',
  wallStripe: '#8573b6',
  wainscot: '#7462a6',
  wainscotLine: '#66569a',
  trim: '#b4a5e0',
  trimDark: '#5a4b8c',
  floor: '#9a7466',
  floorLine: '#83604f',
  floorJoint: '#8a6656',
  frame: '#ece3f5',
  frameShade: '#c3b5da',
  curtain: '#c9a8e0',
  curtainFold: '#b291cf',
  rod: '#5a4b8c',
};

const CABIN_ROOM = {
  wallStyle: 'logs',
  log: '#8a5a38',
  logLine: '#663f24',
  logHighlight: '#9d6b45',
  trim: '#6b4428',
  trimDark: '#4a2d18',
  floor: '#6e4a31',
  floorLine: '#583a25',
  floorJoint: '#603f29',
  frame: '#b48558', // lighter than the logs, so the window stands out
  frameShade: '#86603d',
  curtain: '#c4705f',
  curtainFold: '#a95a4b',
  rod: '#3f2716',
};

// Each theme's `lighting` (used by lighting.js):
//   ambient  light that reaches everything, [r, g, b] from 0 to 1: dim and
//            blue at night, close to 1 and warm in the daytime
//   lamp     how strongly the desk lamp shines (it matters less by day)
//   window   the light coming in through the window:
//              color, strength
//              slant   which way it falls: + to the right, - to the left
//              shafts  how visible the beams are in the air (dust catches them)
//              glass   'rain' (drops running down) or 'frost' (icy corners)
//              flashes true for fireworks lighting up the room now and then
export const THEMES = [
  {
    id: 'rainy-night',
    name: 'Rainy Night',
    description: 'Soft rain over sleepy city lights.',
    room: LAVENDER_ROOM,
    lighting: {
      ambient: [0.36, 0.36, 0.58],
      lamp: 1,
      window: { color: [0.55, 0.66, 1], strength: 0.34, slant: 0.25, shafts: 0.05, glass: 'rain' },
    },
    drawView: drawRainyNight,
  },
  {
    id: 'sunset',
    name: 'Golden Sunset',
    description: 'Warm light spilling across the floor.',
    room: LAVENDER_ROOM,
    lighting: {
      ambient: [0.84, 0.68, 0.68],
      lamp: 0.45,
      window: { color: [1, 0.62, 0.36], strength: 0.95, slant: 0.55, shafts: 0.22 },
    },
    drawView: drawSunset,
  },
  {
    id: 'forest-cabin',
    name: 'Forest Cabin',
    description: 'Pine trees, fireflies and log walls.',
    room: CABIN_ROOM,
    lighting: {
      ambient: [0.4, 0.44, 0.52],
      lamp: 0.95,
      window: { color: [0.55, 0.75, 0.85], strength: 0.26, slant: -0.2, shafts: 0.05 },
    },
    drawView: drawForestDusk,
  },

  // Seasonal views. `unlockItem` is the shop item that unlocks each one.
  {
    id: 'snowy-village',
    name: 'Snowy Village',
    description: 'Snow falling on rooftops and lit windows.',
    unlockItem: 'view-snowy-village',
    room: LAVENDER_ROOM,
    lighting: {
      ambient: [0.38, 0.4, 0.6],
      lamp: 1,
      window: { color: [0.75, 0.82, 1], strength: 0.4, slant: 0.15, shafts: 0.06, glass: 'frost' },
    },
    drawView: drawSnowyVillage,
  },
  {
    id: 'lunar-fireworks',
    name: 'Fireworks Night',
    description: 'Quiet fireworks bloom over the city.',
    unlockItem: 'view-lunar-fireworks',
    room: LAVENDER_ROOM,
    lighting: {
      ambient: [0.4, 0.33, 0.5],
      lamp: 1,
      window: { color: [1, 0.6, 0.55], strength: 0.3, slant: 0.2, shafts: 0.05, flashes: true },
    },
    drawView: drawLunarFireworks,
  },
  {
    id: 'harvest-moon',
    name: 'Harvest Moon',
    description: 'A huge moon, with sky lanterns drifting up.',
    unlockItem: 'view-harvest-moon',
    room: LAVENDER_ROOM,
    lighting: {
      ambient: [0.38, 0.36, 0.56],
      lamp: 0.95,
      window: { color: [1, 0.88, 0.6], strength: 0.6, slant: -0.3, shafts: 0.1 },
    },
    drawView: drawHarvestMoon,
  },
  {
    id: 'maple-forest',
    name: 'Maple Forest',
    description: 'Golden afternoon light and falling leaves.',
    unlockItem: 'view-maple-forest',
    room: LAVENDER_ROOM,
    lighting: {
      ambient: [0.88, 0.76, 0.66],
      lamp: 0.4,
      window: { color: [1, 0.78, 0.42], strength: 0.9, slant: -0.45, shafts: 0.2 },
    },
    drawView: drawMapleForest,
  },
  {
    id: 'snowfall',
    name: 'Snowfall',
    description: 'Snow drifting down over a pine forest.',
    unlockItem: 'view-snowfall',
    room: LAVENDER_ROOM,
    lighting: {
      ambient: [0.44, 0.48, 0.64],
      lamp: 0.9,
      window: { color: [0.8, 0.88, 1], strength: 0.45, slant: 0.1, shafts: 0.07, glass: 'frost' },
    },
    drawView: drawSnowfall,
  },
];

export const DEFAULT_THEME_ID = THEMES[0].id;

/** Looks a theme up by id, falling back to the first one if the id is unknown. */
export function getTheme(id) {
  return THEMES.find((theme) => theme.id === id) ?? THEMES[0];
}

/** Free views are always unlocked; seasonal ones once their shop item is owned. */
export function isThemeUnlocked(theme, ownedItemIds) {
  return !theme.unlockItem || ownedItemIds.includes(theme.unlockItem);
}

// ---------------------------------------------------------------------------
// Window views
//
// The same view is drawn in windows of very different sizes: a small
// preview, the close-up's window, the big room window. Counts (raindrops,
// stars, trees) were chosen for a window about 88 × 70; these helpers scale
// them, so a bigger window gets as many per square pixel, not fewer.
// ---------------------------------------------------------------------------

const BASE_AREA = 88 * 70;

/** How many times the area of the original window this one has (at least 1). */
function density(v) {
  return Math.max(1, (v.w * v.h) / BASE_AREA);
}

/** How many times as wide (at least 1). */
function across(v) {
  return Math.max(1, v.w / 88);
}

/** 2 in a big window, so buildings and lit windows get chunkier detail; 1 otherwise. */
function detail(v) {
  return v.w >= 200 ? 2 : 1;
}

/** How many times as tall: rain and snow fall faster in a taller window, to cross it in the same time. */
function tall(v) {
  return Math.max(1, v.h / 70);
}

function drawRainyNight(ctx, v, t) {
  ditheredBands(ctx, v.x, v.y, v.w, v.h, ['#121732', '#171d3d', '#1d2449', '#252c55', '#2e3460']);
  drawSkyline(ctx, v, { seed: 11, minH: 0.35, maxH: 0.6, color: '#20264a', light: '#8a7f5a', lit: 0.12 });
  drawSkyline(ctx, v, { seed: 23, minH: 0.18, maxH: 0.42, color: '#151a33', light: '#f5d48a', lit: 0.28 });

  // Two layers of rain: far drops are dimmer and slower, which reads as depth.
  drawRain(ctx, v, t, { seed: 3, count: 22, speed: 38, length: 2, color: 'rgba(160, 180, 240, 0.35)' });
  drawRain(ctx, v, t, { seed: 8, count: 14, speed: 58, length: 3, color: 'rgba(190, 205, 255, 0.6)' });
}

function drawSkyline(ctx, v, { seed, minH, maxH, color, light, lit }) {
  const rng = makeRng(seed);
  const d = detail(v);
  let x = v.x - Math.floor(rng() * 6);
  while (x < v.x + v.w) {
    const w = (7 + Math.floor(rng() * 11)) * d;
    const h = Math.round(v.h * (minH + rng() * (maxH - minH)));
    const top = v.y + v.h - h;
    rect(ctx, x, top, w, h, color);
    if (d > 1) {
      // Up close: a lighter edge where the city glow catches the building, and things on the roof.
      rect(ctx, x, top, 1, h, mixHex(color, '#8a90d0', 0.25));
      const roof = rng();
      if (roof < 0.3) rect(ctx, x + Math.floor(w / 2), top - 6, 1, 6, color); // antenna
      else if (roof < 0.5) rect(ctx, x + 3, top - 4, 6, 4, color); // water tank
      if (roof < 0.3 && rng() < 0.6) rect(ctx, x + Math.floor(w / 2), top - 7, 1, 1, '#ff5a5a'); // its red light
    }
    for (let wy = top + 3 * d; wy < v.y + v.h - 2; wy += 4 * d) {
      for (let wx = x + 2 * d; wx < x + w - 2 * d; wx += 3 * d) {
        if (rng() < lit) rect(ctx, wx, wy, d, 2 * d, light);
      }
    }
    x += w + d;
  }
}

function drawRain(ctx, v, t, { seed, count, speed, length, color }) {
  const rng = makeRng(seed);
  count = Math.round(count * density(v));
  speed *= tall(v);
  length = Math.round(length * Math.min(2, tall(v)));
  const span = v.h + 10; // drops travel a little beyond the view so they enter and exit smoothly
  ctx.fillStyle = color;
  for (let i = 0; i < count; i++) {
    const startX = rng() * v.w;
    const startY = rng() * span;
    const y = ((startY + t * speed) % span) - 5;
    const x = wrap(startX - y * 0.2, v.w); // a slight slant, as if there is a breeze
    ctx.fillRect(Math.round(v.x + x), Math.round(v.y + y), 1, length);
  }
}

function drawSunset(ctx, v, t) {
  ditheredBands(ctx, v.x, v.y, v.w, v.h, ['#6b5b9e', '#8d65a6', '#bb6f9f', '#e5849a', '#f6a184', '#ffc387']);

  const sunX = v.x + Math.round(v.w * 0.64);
  const sunY = v.y + Math.round(v.h * 0.7);
  const sunR = Math.max(3, Math.round(v.h * 0.13));
  circle(ctx, sunX, sunY, sunR, '#ffe4a3');
  circle(ctx, sunX, sunY, sunR - 2, '#fff3cc');

  // Clouds drift slowly; `wrap` makes them re-enter from the left.
  const clouds = [
    { x: 0.1, y: 0.16, speed: 1.2 },
    { x: 0.55, y: 0.3, speed: 0.8 },
    { x: 0.3, y: 0.46, speed: 1.6 },
  ];
  for (const cloud of clouds) {
    const x = wrap(cloud.x * v.w + t * cloud.speed, v.w + 20) - 16;
    drawCloud(ctx, v.x + Math.round(x), v.y + Math.round(cloud.y * v.h));
  }

  drawHills(ctx, v, { base: 0.74, waves: [[0.09, 0, 3], [0.23, 1, 2]], color: '#9a5f8e' });
  drawHills(ctx, v, { base: 0.84, waves: [[0.06, 2, 4], [0.17, 0, 2]], color: '#6a4272' });
}

function drawCloud(ctx, x, y) {
  rect(ctx, x + 4, y, 6, 1, '#ffd6c4');
  rect(ctx, x + 2, y + 1, 11, 1, '#f7b8b0');
  rect(ctx, x, y + 2, 16, 1, '#f7b8b0');
  rect(ctx, x + 1, y + 3, 14, 1, '#e59aa2');
}

/** Rolling hills from a sum of sine waves: [frequency, phase, amplitude] per wave. */
function drawHills(ctx, v, { base, waves, color }) {
  ctx.fillStyle = color;
  for (let px = 0; px < v.w; px++) {
    let height = v.h * base;
    for (const [freq, phase, amp] of waves) height += Math.sin(px * freq + phase) * amp;
    const top = v.y + Math.round(height);
    ctx.fillRect(v.x + px, top, 1, v.y + v.h - top);
  }
}

function drawForestDusk(ctx, v, t) {
  ditheredBands(ctx, v.x, v.y, v.w, v.h, ['#1b2238', '#24304a', '#304660', '#466a72', '#6f9384', '#a5c39b']);

  const rng = makeRng(5);
  for (let i = 0; i < 14 * density(v); i++) {
    rect(ctx, v.x + Math.floor(rng() * v.w), v.y + Math.floor(rng() * v.h * 0.45), 1, 1, '#e8eeff');
  }
  circle(ctx, v.x + Math.round(v.w * 0.78), v.y + Math.round(v.h * 0.2), 3, '#f2efd6');

  drawHills(ctx, v, { base: 0.55, waves: [[0.07, 1, 4], [0.19, 0, 2]], color: '#3b5266' });
  drawPineRow(ctx, v, { seed: 9, count: 14, minH: 0.25, maxH: 0.42, color: '#2b4239' });
  drawPineRow(ctx, v, { seed: 17, count: 7, minH: 0.45, maxH: 0.7, color: '#17271f' });

  // Fireflies fade in and out on their own rhythms; sin() gives the smooth pulse.
  const flyRng = makeRng(31);
  ctx.fillStyle = '#f4ee9a';
  for (let i = 0; i < 6 * across(v); i++) {
    const glow = Math.sin(t * 1.2 + i * 1.7);
    const homeX = 0.1 + flyRng() * 0.8;
    const homeY = 0.6 + flyRng() * 0.3;
    if (glow < 0.3) continue;
    ctx.globalAlpha = (glow - 0.3) / 0.7;
    const x = v.x + homeX * v.w + Math.sin(t * 0.5 + i) * 3;
    const y = v.y + homeY * v.h + Math.cos(t * 0.4 + i * 2) * 2;
    ctx.fillRect(Math.round(x), Math.round(y), 1, 1);
  }
  ctx.globalAlpha = 1;
}

function drawPineRow(ctx, v, { seed, count, minH, maxH, color }) {
  const rng = makeRng(seed);
  count = Math.round(count * across(v));
  for (let i = 0; i < count; i++) {
    const cx = v.x + Math.round(((i + rng() * 0.8) / count) * v.w);
    const height = Math.round(v.h * (minH + rng() * (maxH - minH)));
    drawPine(ctx, cx, v.y + v.h, height, color);
  }
}

/** A pine tree made of three stacked triangles, drawn one pixel row at a time. */
function drawPine(ctx, cx, baseY, height, color) {
  const tierH = Math.ceil(height / 3);
  ctx.fillStyle = color;
  for (let row = 0; row < height; row++) {
    const tier = Math.floor(row / tierH);
    const half = Math.floor((row - tier * tierH) * 0.55) + tier;
    ctx.fillRect(cx - half, baseY - height + row, half * 2 + 1, 1);
  }
}

// ---- Seasonal views ----------------------------------------------------------

/** Slowly falling snow that sways a little from side to side. */
function drawSnow(ctx, v, t, { seed, count, speed }) {
  const rng = makeRng(seed);
  count = Math.round(count * density(v));
  speed *= tall(v);
  const size = detail(v);
  const span = v.h + 6;
  ctx.fillStyle = '#f6fbff';
  for (let i = 0; i < count; i++) {
    const startX = rng() * v.w;
    const startY = rng() * span;
    const sway = rng() * Math.PI * 2;
    const y = ((startY + t * speed) % span) - 3;
    const x = wrap(startX + Math.sin(t * 0.8 + sway) * 2, v.w);
    const flake = i % 3 === 0 ? size : 1; // a few bigger, closer flakes
    ctx.fillRect(Math.round(v.x + x), Math.round(v.y + y), flake, flake);
  }
}

function drawStars(ctx, v, seed, count, maxHeight) {
  const rng = makeRng(seed);
  count = Math.round(count * density(v));
  for (let i = 0; i < count; i++) {
    rect(ctx, v.x + Math.floor(rng() * v.w), v.y + Math.floor(rng() * v.h * maxHeight), 1, 1, '#e8eeff');
  }
}

function drawSnowyVillage(ctx, v, t) {
  ditheredBands(ctx, v.x, v.y, v.w, v.h, ['#141a36', '#1a2244', '#222c52', '#2c3660']);
  drawStars(ctx, v, 3, 10, 0.4);
  const rng = makeRng(41);
  const ground = v.y + v.h - 3;
  let x = v.x - 2;
  while (x < v.x + v.w) {
    const w = (10 + Math.floor(rng() * 8)) * detail(v);
    const h = Math.round(v.h * (0.16 + rng() * 0.14));
    const top = ground - h;
    rect(ctx, x, top, w, h, '#1b1f3a');
    // A snowy roof: four rows that widen towards the walls.
    for (let r = 0; r < 4; r++) rect(ctx, x + 3 - r, top - 4 + r, w - 6 + 2 * r, 1, '#e8eef8');
    for (let wy = top + 2; wy < ground - 2; wy += 4) {
      for (let wx = x + 2; wx < x + w - 2; wx += 4) {
        if (rng() < 0.5) rect(ctx, wx, wy, 2, 2, '#ffd27a');
      }
    }
    x += w + 2;
  }
  rect(ctx, v.x, ground, v.w, 3, '#dfe8f5');
  drawSnow(ctx, v, t, { seed: 5, count: 30, speed: 10 });
}

// Three bursts on four-second cycles, each starting at a different moment.
// Exported so the room can flash in the same colours at the same time.
export const FIREWORK_BURSTS = Object.freeze([
  { x: 0.25, y: 0.3, delay: 0, color: '#ff6a5a' },
  { x: 0.7, y: 0.22, delay: 1.4, color: '#f2c14e' },
  { x: 0.5, y: 0.42, delay: 2.7, color: '#ff9ccf' },
]);

/** How far a burst has spread (0 → 1), or null while it's waiting for its next turn. */
export function burstProgress(burst, t) {
  const p = ((t + burst.delay) % 4) / 4;
  return p > 0.6 ? null : p / 0.6;
}

function drawLunarFireworks(ctx, v, t) {
  ditheredBands(ctx, v.x, v.y, v.w, v.h, ['#160f2e', '#1f1438', '#2a1840', '#3a1d46']);
  drawStars(ctx, v, 9, 12, 0.5);
  for (const burst of FIREWORK_BURSTS) {
    const q = burstProgress(burst, t);
    if (q === null) continue; // a quiet pause between bursts
    const radius = 2 + q * v.h * 0.16;
    ctx.globalAlpha = 1 - q;
    ctx.fillStyle = burst.color;
    const sparks = Math.round(10 * across(v));
    for (let k = 0; k < sparks; k++) {
      const angle = (k / sparks) * Math.PI * 2;
      ctx.fillRect(
        Math.round(v.x + burst.x * v.w + Math.cos(angle) * radius),
        Math.round(v.y + burst.y * v.h + Math.sin(angle) * radius),
        1,
        1,
      );
    }
    ctx.globalAlpha = 1;
  }
  drawSkyline(ctx, v, { seed: 13, minH: 0.2, maxH: 0.45, color: '#1a1030', light: '#ff8a5a', lit: 0.3 });
}

function drawHarvestMoon(ctx, v, t) {
  ditheredBands(ctx, v.x, v.y, v.w, v.h, ['#1d1838', '#2a2150', '#3b2c62', '#5a3f74']);
  drawStars(ctx, v, 21, 10, 0.5);
  const r = Math.max(4, Math.round(v.h * 0.26));
  const mx = v.x + Math.round(v.w * 0.62);
  const my = v.y + Math.round(v.h * 0.38);
  circle(ctx, mx, my, r + 2, 'rgba(255, 240, 180, 0.15)');
  circle(ctx, mx, my, r, '#f6e7a8');
  circle(ctx, mx - Math.round(r * 0.35), my - Math.round(r * 0.2), Math.max(1, Math.round(r * 0.2)), '#e6d08a');
  circle(ctx, mx + Math.round(r * 0.3), my + Math.round(r * 0.3), Math.max(1, Math.round(r * 0.14)), '#e6d08a');
  drawHills(ctx, v, { base: 0.78, waves: [[0.08, 1, 3], [0.2, 0, 2]], color: '#2c2346' });
  drawHills(ctx, v, { base: 0.88, waves: [[0.05, 2, 3], [0.15, 1, 1]], color: '#1e1832' });
  // Sky lanterns drifting slowly upwards, fading near the top.
  const lanterns = Math.round(5 * across(v));
  for (let i = 0; i < lanterns; i++) {
    const p = (t * 0.04 + i * 0.21) % 1;
    const x = v.x + (0.1 + (0.8 / lanterns) * (i + 0.5)) * v.w + Math.sin(t * 0.5 + i) * 2;
    const y = v.y + v.h * (0.9 - p * 0.9);
    ctx.globalAlpha = p < 0.8 ? 1 : (1 - p) / 0.2;
    rect(ctx, x, y, 2, 2, '#ffb347');
    rect(ctx, x, y + 1, 2, 1, '#fff1b0');
    ctx.globalAlpha = 1;
  }
}

function drawMapleForest(ctx, v, t) {
  ditheredBands(ctx, v.x, v.y, v.w, v.h, ['#7a8fc0', '#b0a2c8', '#f0b8a0', '#ffd09a']);
  drawHills(ctx, v, { base: 0.6, waves: [[0.07, 0, 3], [0.17, 2, 2]], color: '#c98a6a' });
  const rng = makeRng(17);
  const canopies = ['#e8803a', '#c9473a', '#f2c14e', '#d9663a'];
  const trees = Math.round(8 * across(v));
  for (let i = 0; i < trees; i++) {
    const cx = v.x + Math.round(((i + rng() * 0.8) / trees) * v.w);
    const r = Math.max(2, Math.round(v.h * (0.12 + rng() * 0.08)));
    const base = v.y + v.h - 2;
    rect(ctx, cx, base - r - 4, 1, r + 4, '#5a3b28'); // trunk
    circle(ctx, cx, base - r - 4, r, canopies[i % canopies.length]);
    circle(ctx, cx - 1, base - r - 5, Math.max(1, r - 2), canopies[(i + 2) % canopies.length]);
  }
  rect(ctx, v.x, v.y + v.h - 2, v.w, 2, '#8a5a38');
  // A few leaves drifting down.
  const leafRng = makeRng(29);
  for (let i = 0; i < 8 * density(v); i++) {
    const startX = leafRng() * v.w;
    const startY = leafRng() * (v.h + 4);
    const y = ((startY + t * 6) % (v.h + 4)) - 2;
    const x = wrap(startX + Math.sin(t * 0.9 + i) * 3, v.w);
    rect(ctx, v.x + x, v.y + y, 1, 1, canopies[i % canopies.length]);
  }
}

function drawSnowfall(ctx, v, t) {
  ditheredBands(ctx, v.x, v.y, v.w, v.h, ['#1c2440', '#26325a', '#33456e', '#4a6188']);
  drawStars(ctx, v, 33, 8, 0.35);
  circle(ctx, v.x + Math.round(v.w * 0.2), v.y + Math.round(v.h * 0.18), 3, '#eef3ff');
  drawHills(ctx, v, { base: 0.62, waves: [[0.06, 1, 3], [0.18, 0, 2]], color: '#3b4d70' });
  drawPineRow(ctx, v, { seed: 7, count: 13, minH: 0.22, maxH: 0.38, color: '#2a3a58' });
  drawPineRow(ctx, v, { seed: 19, count: 7, minH: 0.4, maxH: 0.62, color: '#1a2640' });
  rect(ctx, v.x, v.y + v.h - 3, v.w, 3, '#dfe8f5');
  drawSnow(ctx, v, t, { seed: 11, count: 40, speed: 12 });
}

/** Like `value % size`, but always positive (JavaScript's % can return negatives). */
function wrap(value, size) {
  return ((value % size) + size) % size;
}
