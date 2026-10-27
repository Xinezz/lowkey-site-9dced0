// Drawing for room styles: string-light bulbs, rugs and wallpaper. Both the
// room (room.js) and the shop previews (previews.js) use these, so a style
// looks exactly the same in both places.

import { rect, circle, ellipse } from './pixel.js';

// The room's built-in styles, used when the player hasn't chosen another.
export const DEFAULT_LIGHTS = Object.freeze({ colors: ['#ffd27a', '#ffb3c7', '#bfe3ff', '#c9f2a8'], bulb: 'round' });
export const DEFAULT_GLOW = '#ffcf8a';
export const DEFAULT_RUG = Object.freeze({ edge: '#7d67a8', main: '#a58fd6', inner: '#c2b0ea', center: '#a58fd6' });

/**
 * One string-light bulb hanging from the wire at (x, y).
 * `index` picks the colour, so neighbouring bulbs differ.
 */
export function drawBulb(ctx, x, y, lights, index, glowAlpha) {
  const color = lights.colors[index % lights.colors.length];
  if (glowAlpha > 0) {
    ctx.globalAlpha = glowAlpha;
    circle(ctx, x + 1, y + 2, 3, color);
    ctx.globalAlpha = 1;
  }
  switch (lights.bulb) {
    case 'lantern': // a tiny lantern with gold caps
      rect(ctx, x, y, 2, 1, '#f2c14e');
      rect(ctx, x - 1, y + 1, 4, 3, color);
      rect(ctx, x, y + 4, 2, 1, '#f2c14e');
      break;
    case 'leaf': // a little maple leaf
      rect(ctx, x, y, 2, 3, color);
      rect(ctx, x - 1, y + 1, 4, 1, color);
      break;
    case 'icicle': // drips of different lengths
      rect(ctx, x, y, 2, 1, color);
      rect(ctx, x, y + 1, 1, 2 + (index % 3), color);
      break;
    default: // a round bulb
      rect(ctx, x, y, 2, 2, color);
  }
}

/** A rug: four nested ovals. `rx`/`ry` are the outer size. */
export function drawRugShape(ctx, cx, cy, rx, ry, rug) {
  ellipse(ctx, cx, cy, rx, ry, rug.edge);
  ellipse(ctx, cx, cy, rx - 4, Math.max(0, ry - 2), rug.main);
  ellipse(ctx, cx, cy, Math.round(rx * 0.76), Math.max(0, ry - 4), rug.inner);
  ellipse(ctx, cx, cy, Math.round(rx * 0.54), Math.max(0, ry - 6), rug.center ?? rug.main);
}

/**
 * The patterned upper part of a wall: plain, stripes (the default) or dots.
 * `scale` enlarges the pattern, e.g. 2 for the close-up view.
 */
export function drawWallpaper(ctx, x, y, w, h, wall, scale = 1) {
  rect(ctx, x, y, w, h, wall.wallpaper);
  if (wall.pattern === 'dots') {
    for (let py = 3 * scale, row = 0; py < h; py += 8 * scale, row++) {
      for (let px = (row % 2 ? 7 : 3) * scale; px < w; px += 8 * scale) rect(ctx, x + px, y + py, scale, scale, wall.wallStripe);
    }
  } else if (wall.pattern !== 'plain') {
    for (let px = 4 * scale; px < w; px += 12 * scale) rect(ctx, x + px, y, 2 * scale, h, wall.wallStripe);
  }
}
