// Small picture of any item, for the shop and the Room window. Decorations
// show their sprite; styles and views have no sprite, so each gets a tiny
// scene of its own: a strand of lights, a lamp glowing, a rug, a wall swatch,
// or the view itself.
//
// The little scenes are 30 art pixels wide, so they double cleanly to fill
// the 60 px pickers in the Room window.

import { createPixelCanvas, createSpriteThumbnail, drawSpriteOn, rect, circle } from './pixel.js';
import { getTheme } from './themes.js';
import { SPRITES } from './sprites.js';
import { DEFAULT_GLOW, DEFAULT_LIGHTS, DEFAULT_RUG, drawBulb, drawRugShape, drawWallpaper } from './style-art.js';

/** A preview canvas for an item, fitted inside maxW × maxH CSS pixels. */
export function createItemPreview(item, maxW, maxH) {
  switch (item.kind) {
    case 'view':
      return createViewPreview(getTheme(item.themeId), maxW, maxH);
    case 'lights':
      return createLightsPreview(item.lights, maxW, maxH);
    case 'glow':
      return createGlowPreview(item.glowColor, maxW, maxH);
    case 'rug':
      return createRugPreview(item.rug, maxW, maxH);
    case 'wallpaper':
      return createWallpaperPreview(item.wallpaper, maxW, maxH);
    default:
      return createSpriteThumbnail(item.sprite, maxW, maxH);
  }
}

/** Previews of the room's built-in styles, for the "default" choice in each picker. */
export function createDefaultStylePreview(kind, room, maxW, maxH) {
  if (kind === 'lights') return createLightsPreview(DEFAULT_LIGHTS, maxW, maxH);
  if (kind === 'glow') return createGlowPreview(DEFAULT_GLOW, maxW, maxH);
  if (kind === 'rug') return createRugPreview(DEFAULT_RUG, maxW, maxH);
  return createWallpaperPreview(room, maxW, maxH);
}

export function createViewPreview(theme, maxW, maxH) {
  return createPixelCanvas(64, 40, maxW, maxH, (ctx) => theme.drawView(ctx, { x: 0, y: 0, w: 64, h: 40 }, 0));
}

function createLightsPreview(lights, maxW, maxH) {
  return createPixelCanvas(30, 12, maxW, maxH, (ctx) => {
    rect(ctx, 0, 0, 30, 12, '#221c30');
    const wireY = (x) => 2 + Math.round(Math.sin((Math.PI * x) / 29) * 2);
    for (let x = 0; x < 30; x++) rect(ctx, x, wireY(x), 1, 1, '#4e4270');
    [3, 10, 17, 24].forEach((x, i) => drawBulb(ctx, x, wireY(x) + 1, lights, i, 0.3));
  });
}

function createGlowPreview(color, maxW, maxH) {
  return createPixelCanvas(30, 24, maxW, maxH, (ctx) => {
    rect(ctx, 0, 0, 30, 24, '#221c30');
    ctx.globalAlpha = 0.25;
    circle(ctx, 15, 10, 11, color);
    circle(ctx, 15, 10, 6, color);
    ctx.globalAlpha = 1;
    drawSpriteOn(ctx, SPRITES.lamp, 8, 24);
  });
}

function createRugPreview(rug, maxW, maxH) {
  return createPixelCanvas(30, 12, maxW, maxH, (ctx) => drawRugShape(ctx, 15, 6, 14, 5, rug));
}

function createWallpaperPreview(wall, maxW, maxH) {
  return createPixelCanvas(30, 24, maxW, maxH, (ctx) => {
    if (wall.wallStyle === 'logs') {
      rect(ctx, 0, 0, 30, 24, wall.log);
      for (let y = 0; y < 24; y += 9) rect(ctx, 0, y + 8, 30, 1, wall.logLine);
      return;
    }
    drawWallpaper(ctx, 0, 0, 30, 16, wall);
    rect(ctx, 0, 16, 30, 2, wall.trim);
    rect(ctx, 0, 18, 30, 6, wall.wainscot);
  });
}
