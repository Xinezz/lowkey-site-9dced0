// Little effects shared by the room and the close-up: weather on the window
// glass, dust floating in sunbeams, raindrop shadows, fireworks lighting up
// the room, and glowing LED bulbs.

import { FIREWORK_BURSTS, burstProgress } from './themes.js';
import { hexToRgb, makeRng } from './pixel.js';
import { ledBrightness, ledColor } from './leds.js';

/**
 * Raindrops sliding down the glass. Each drop has its own speed, and some
 * barely move: on a real window, drops stop and start. Drawn over the view.
 */
export function drawRainOnGlass(ctx, glass, t, { count = 26, seed = 5 } = {}) {
  const rng = makeRng(seed);
  // Tiny beads of water that stay put.
  ctx.fillStyle = 'rgba(200, 215, 255, 0.35)';
  for (let i = 0; i < count * 1.5; i++) {
    ctx.fillRect(Math.floor(glass.x + rng() * glass.w), Math.floor(glass.y + rng() * glass.h), 1, 1);
  }
  for (let i = 0; i < count; i++) {
    const x = Math.floor(glass.x + rng() * glass.w);
    const speed = rng() < 0.3 ? 0.6 : 3 + rng() * 9;
    const travel = glass.h + 16;
    const y = glass.y - 8 + ((rng() * travel + t * speed) % travel);
    ctx.fillStyle = 'rgba(170, 190, 240, 0.22)'; // the wet trail it leaves
    ctx.fillRect(x, Math.round(y) - 6, 1, 5);
    ctx.fillStyle = 'rgba(225, 235, 255, 0.75)'; // the drop catches the light
    ctx.fillRect(x, Math.round(y), 1, 1);
    ctx.fillStyle = 'rgba(20, 26, 60, 0.5)'; // and bends it: darker underneath
    ctx.fillRect(x, Math.round(y) + 1, 1, 1);
  }
}

/**
 * Where each raindrop from drawRainOnGlass() is at time t, as 0 → 1 across
 * and down the glass, so their shadows can move with them. It draws the same
 * "random" numbers in the same order, so the two always agree.
 */
export function rainShadowSpots(glass, t, { count = 26, seed = 5 } = {}) {
  const rng = makeRng(seed);
  for (let i = 0; i < count * 1.5; i++) rng(), rng(); // the beads
  const travel = glass.h + 16;
  const spots = [];
  for (let i = 0; i < count; i++) {
    const u = rng();
    const speed = rng() < 0.3 ? 0.6 : 3 + rng() * 9;
    const y = -8 + ((rng() * travel + t * speed) % travel);
    spots.push({ u, v: y / glass.h });
  }
  return spots;
}

/**
 * Frost creeping in from the corners and the bottom of each pane, as a
 * dithered pattern of white. Cheap enough to draw every frame.
 */
export function drawFrost(ctx, panes) {
  ctx.fillStyle = 'rgba(235, 245, 255, 0.55)';
  for (const p of panes) {
    for (let y = p.y; y < p.y + p.h; y++) {
      for (let x = p.x; x < p.x + p.w; x++) {
        const corner = Math.min(
          Math.hypot(x - p.x, y - p.y),
          Math.hypot(x - (p.x + p.w), y - p.y),
          Math.hypot(x - p.x, y - (p.y + p.h)),
          Math.hypot(x - (p.x + p.w), y - (p.y + p.h)),
        );
        const amount = Math.max(1 - corner / 16, ((y - (p.y + p.h - 7)) / 7) * 0.7);
        // Irregular "noise" rather than a tidy pattern: real frost grows in crystals.
        if (amount > 0 && pixelNoise(x, y) < amount * 0.85) ctx.fillRect(x, y, 1, 1);
      }
    }
  }
}

/** A repeatable "random" number from 0 to 1 for each pixel. */
function pixelNoise(x, y) {
  let n = (x * 374761393 + y * 668265263) | 0;
  n = Math.imul(n ^ (n >>> 13), 1274126177);
  return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
}

/** How much the fireworks outside light up the room right now: { strength, color }. */
export function fireworkFlash(t) {
  let strength = 0;
  const color = [0, 0, 0];
  for (const burst of FIREWORK_BURSTS) {
    const q = burstProgress(burst, t);
    if (q === null) continue;
    const s = (1 - q) ** 2;
    const rgb = hexToRgb(burst.color);
    strength += s;
    for (let i = 0; i < 3; i++) color[i] += rgb[i] * s;
  }
  return strength > 0 ? { strength, color: color.map((c) => c / strength) } : { strength: 0, color };
}

/**
 * Specks of dust drifting slowly through the light. They only show where
 * `mask` (the sunbeams) is bright enough, like dust you only see in a beam.
 */
export function addDust(lighting, mask, w, h, color, t, { count = 60, seed = 21, amount = 0.5 } = {}) {
  const rng = makeRng(seed);
  for (let i = 0; i < count; i++) {
    const baseX = rng() * w;
    const baseY = rng() * h;
    const drift = 0.5 + rng() * 1.5;
    const x = (baseX + Math.sin(t * 0.3 * drift + i) * 6 + t * drift * 0.8) % w;
    const y = (baseY + Math.cos(t * 0.25 * drift + i * 2) * 4 + t * drift * 0.5) % h;
    const m = mask[Math.floor(y) * w + Math.floor(x)];
    if (m > 0.02) lighting.addAirPixel(x, y, color, amount * Math.min(1, m * 8) * (0.5 + 0.5 * Math.sin(t * 2 + i)));
  }
}

/**
 * The string-light bulbs (and LED strip) colours right now: each bulb's
 * current colour and brightness, from leds.js.
 */
export function bulbStates(lights, count, t, steady) {
  return Array.from({ length: count }, (_, i) => ({
    color: ledColor(lights.colors, i, steady ? 0 : t),
    brightness: ledBrightness(i, t, steady),
  }));
}

// String-light bulb shapes, as [x, y, part] from the socket down:
// b = glass, c = bright core, g = gold cap.
const BULB_SHAPES = {
  round: [[0, 0, 'b'], [-1, 1, 'b'], [0, 1, 'c'], [1, 1, 'b'], [-1, 2, 'b'], [0, 2, 'b'], [1, 2, 'b'], [0, 3, 'b']],
  lantern: [[-1, 0, 'g'], [0, 0, 'g'], [1, 0, 'g'], [-2, 1, 'b'], [-1, 1, 'b'], [0, 1, 'c'], [1, 1, 'b'], [2, 1, 'b'], [-2, 2, 'b'], [-1, 2, 'c'], [0, 2, 'c'], [1, 2, 'b'], [2, 2, 'b'], [-1, 3, 'g'], [0, 3, 'g'], [1, 3, 'g']],
  leaf: [[0, 0, 'b'], [-2, 1, 'b'], [-1, 1, 'b'], [0, 1, 'c'], [1, 1, 'b'], [2, 1, 'b'], [-1, 2, 'b'], [0, 2, 'c'], [1, 2, 'b'], [0, 3, 'b']],
  icicle: [[-1, 0, 'b'], [0, 0, 'b'], [-1, 1, 'c'], [0, 1, 'b'], [-1, 2, 'c'], [0, 2, 'b'], [0, 3, 'c'], [0, 4, 'b'], [0, 5, 'b']],
};

/** One glowing bulb hanging below (x, y), in the chosen lights' shape. */
export function drawBulbShape(ctx, x, y, style, color, brightness) {
  const body = rgbToHex(color, brightness);
  const core = rgbToHex(color, brightness, 0.6);
  for (const [px, py, part] of BULB_SHAPES[style] ?? BULB_SHAPES.round) {
    ctx.fillStyle = part === 'c' ? core : part === 'g' ? '#f2c14e' : body;
    ctx.fillRect(x + px, y + py, 1, 1);
  }
}

/** '#rrggbb' for an [r, g, b] colour (0 → 1) scaled by brightness, mixed a little towards white in the middle. */
export function rgbToHex([r, g, b], brightness = 1, whiten = 0) {
  const c = (v) => Math.round(Math.min(1, (v + (1 - v) * whiten) * brightness) * 255).toString(16).padStart(2, '0');
  return `#${c(r)}${c(g)}${c(b)}`;
}
