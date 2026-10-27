// Low-level drawing helpers. Every helper draws on whole pixels only, so
// nothing is ever anti-aliased: that is what keeps pixel art crisp.

export function rect(ctx, x, y, w, h, color) {
  ctx.fillStyle = color;
  ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
}

/**
 * Filled circle built from one horizontal strip per row. Canvas's own arc()
 * would blur the edges; strips keep them hard.
 */
export function circle(ctx, cx, cy, r, color) {
  ctx.fillStyle = color;
  for (let dy = -r; dy <= r; dy++) {
    const half = Math.floor(Math.sqrt(r * r - dy * dy));
    ctx.fillRect(cx - half, cy + dy, half * 2 + 1, 1);
  }
}

/** Filled ellipse, same strip technique as circle(). */
export function ellipse(ctx, cx, cy, rx, ry, color) {
  ctx.fillStyle = color;
  for (let dy = -ry; dy <= ry; dy++) {
    const half = Math.round(rx * Math.sqrt(1 - (dy / (ry + 0.5)) ** 2));
    ctx.fillRect(cx - half, cy + dy, half * 2 + 1, 1);
  }
}

/**
 * Horizontal colour bands from top to bottom, with a checkerboard dither
 * where two bands meet. This is the classic pixel-art way to fake a gradient.
 */
export function ditheredBands(ctx, x, y, w, h, colors) {
  const edges = colors.map((_, i) => y + Math.round((i * h) / colors.length));
  edges.push(y + h);
  colors.forEach((color, i) => rect(ctx, x, edges[i], w, edges[i + 1] - edges[i], color));

  for (let i = 1; i < colors.length; i++) {
    const seam = edges[i];
    ctx.fillStyle = colors[i]; // lower colour pokes up into the band above
    for (let px = 0; px < w; px += 2) ctx.fillRect(x + px, seam - 1, 1, 1);
    ctx.fillStyle = colors[i - 1]; // upper colour pokes down into the band below
    for (let px = 1; px < w; px += 2) ctx.fillRect(x + px, seam, 1, 1);
  }
}

// A 4×4 "Bayer" pattern: the classic ordered dither. Comparing a value
// against it turns a smooth blend into a tidy checkerboard-like mix of two
// colours, which is how pixel artists blend without blurry in-between colours.
const BAYER4 = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];

/** The dither threshold for a pixel: a number between 0 and 1. */
export function bayer(x, y) {
  return (BAYER4[(y & 3) * 4 + (x & 3)] + 0.5) / 16;
}

/** '#ff8800' → [1, 0.53, 0]: a colour as three numbers from 0 to 1. */
export function hexToRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

/** Mixes two '#rrggbb' colours: t = 0 gives a, t = 1 gives b. */
export function mixHex(a, b, t) {
  const [ar, ag, ab] = hexToRgb(a);
  const [br, bg, bb] = hexToRgb(b);
  const channel = (x, y) => Math.round((x + (y - x) * t) * 255).toString(16).padStart(2, '0');
  return `#${channel(ar, br)}${channel(ag, bg)}${channel(ab, bb)}`;
}

/**
 * Turns a value like 2.7 into a whole step (here 3). Mostly it simply
 * rounds; only values close to halfway between two steps are dithered. So
 * two colours meet in a thin checkerboard seam rather than a hard line, the
 * way pixel artists use dithering: sparingly, at the edges.
 */
export function ditherStep(v, x, y, width = 0.3) {
  const i = Math.floor(v);
  const frac = v - i;
  const lo = 0.5 - width / 2;
  if (frac < lo) return i;
  if (frac > lo + width) return i + 1;
  return (frac - lo) / width > bayer(x, y) ? i + 1 : i;
}

/** The colour from `ramp` (dark → light) for a level from 0 to 1, at pixel (x, y). */
export function rampColor(ramp, level, x, y) {
  return ramp[Math.max(0, Math.min(ramp.length - 1, ditherStep(level * (ramp.length - 1), x, y)))];
}

/**
 * Fills a rectangle pixel by pixel, picking from `ramp` (dark → light) by
 * `level(x, y)` (0 → 1), with thin dithered seams between the colours.
 */
export function shadeRect(ctx, x, y, w, h, ramp, level) {
  for (let py = y; py < y + h; py++) {
    for (let px = x; px < x + w; px++) {
      ctx.fillStyle = rampColor(ramp, level(px, py), px, py);
      ctx.fillRect(px, py, 1, 1);
    }
  }
}

/**
 * Seeded pseudo-random numbers (the "mulberry32" algorithm). The same seed
 * always gives the same sequence, so procedural scenery such as buildings
 * and trees stays identical from frame to frame instead of flickering.
 */
export function makeRng(seed) {
  return function next() {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---------------------------------------------------------------------------
// Sprites
//
// A sprite is a list of text rows plus a palette, e.g.
//   { name: 'mug', palette: { o: '#2b2138', m: '#e8a0b4' }, rows: ['oooo', 'ommo'] }
// Each character is one pixel; '.' means transparent. Text sprites are easy
// to read, edit and diff, and need no image files or licences.
//
// Animated sprites have `frames` (several row-lists) and `fps` instead of `rows`.
// ---------------------------------------------------------------------------

// Turning text into pixels is slow-ish, so each frame is rendered once to a
// small off-screen canvas and reused. A Map can use the row array itself as
// the key, so a frame that appears twice in an animation is only built once.
const frameCache = new Map();

export function spriteSize(sprite) {
  const rows = sprite.frames ? sprite.frames[0] : sprite.rows;
  return { w: Math.max(...rows.map((row) => row.length)), h: rows.length };
}

/** `t` is the time in seconds; it picks the animation frame. */
export function drawSprite(ctx, sprite, x, y, t = 0) {
  ctx.drawImage(getFrameCanvas(sprite, rowsAt(sprite, t)), Math.round(x), Math.round(y));
}

/**
 * Draws a sprite enlarged by a whole number, e.g. 2 for the close-up view.
 * Each pixel becomes a scale × scale block, so it stays crisp.
 */
export function drawSpriteScaled(ctx, sprite, x, y, scale, t = 0) {
  const { w, h } = spriteSize(sprite);
  ctx.drawImage(getFrameCanvas(sprite, rowsAt(sprite, t)), Math.round(x), Math.round(y), w * scale, h * scale);
}

/** Draws a sprite so its bottom row rests on `surfaceY`, e.g. a desk top or the floor. */
export function drawSpriteOn(ctx, sprite, x, surfaceY, t = 0) {
  drawSprite(ctx, sprite, x, surfaceY - spriteSize(sprite).h, t);
}

/**
 * A small canvas showing a sprite's first frame, enlarged by the biggest
 * whole number that fits in maxW × maxH CSS pixels (or shrunk if it's too big).
 */
export function createSpriteThumbnail(sprite, maxW, maxH) {
  const { w, h } = spriteSize(sprite);
  return createPixelCanvas(w, h, maxW, maxH, (ctx) => drawSprite(ctx, sprite, 0, 0));
}

/**
 * A small w × h canvas, painted by `paint(ctx)`, then displayed at the
 * biggest whole-number scale that fits in maxW × maxH CSS pixels.
 */
export function createPixelCanvas(w, h, maxW, maxH, paint) {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  paint(ctx);
  const fit = Math.min(maxW / w, maxH / h);
  const scale = fit >= 1 ? Math.floor(fit) : fit;
  canvas.style.width = `${w * scale}px`;
  canvas.style.height = `${h * scale}px`;
  return canvas;
}

function rowsAt(sprite, t) {
  if (!sprite.frames) return sprite.rows;
  return sprite.frames[Math.floor(t * sprite.fps) % sprite.frames.length];
}

function getFrameCanvas(sprite, rows) {
  const cached = frameCache.get(rows);
  if (cached) return cached;

  const { w, h } = spriteSize(sprite);
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const c = canvas.getContext('2d');

  rows.forEach((row, py) => {
    [...row].forEach((key, px) => {
      if (key === '.') return;
      const color = sprite.palette[key];
      if (!color) {
        console.warn(`Sprite "${sprite.name}": no colour for "${key}" (row ${py}, column ${px})`);
        return;
      }
      c.fillStyle = color;
      c.fillRect(px, py, 1, 1);
    });
  });

  frameCache.set(rows, canvas);
  return canvas;
}
