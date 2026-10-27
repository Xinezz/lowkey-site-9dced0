// Drawing scenes from hand-drawn art (see art.js and ART_BRIEF.md), with the
// game's own light, weather and animation on top.
//
// A hand-drawn scene is a few PNG layers:
//   back      everything behind the buddy (the window's glass left see-through)
//   front     anything in front of the buddy (optional)
//   emissive  the parts that glow by themselves, at full brightness (optional)
//   casters   silhouettes of things that block the desk lamp (optional)
// plus an animation sheet for the buddy, and scene.json saying where the
// window, lights, writing and decoration spots are.
//
// In "dynamic" lighting (the default) the layers are painted evenly lit,
// and the game adds night or daylight, the lamp, the LEDs and the window
// light. In "painted" lighting the artist has painted the light in, and
// the game only adds a little colour from the LEDs, glows and weather.

import { band, castersFrom, castShadows, createLighting } from './lighting.js';
import { ledBrightness, ledColor } from './leds.js';
import { addDust, bulbStates, drawBulbShape, drawFrost, drawRainOnGlass, fireworkFlash, rainShadowSpots, rgbToHex } from './light-fx.js';
import { drawSpriteScaled, hexToRgb, makeRng, rect } from './pixel.js';
import { SPRITES } from './sprites.js';
import { drawFrame, frameAt } from './art.js';

const STRIP_COLORS = ['#b37bff', '#ff7ac8', '#6fa8ff', '#57d6c8']; // when the chosen lights have only one colour
const DEFAULTS = {
  lamps: { radius: 260, strength: 1.15, halo: 0.45, haloRadius: 14 },
  fills: { radius: 200, strength: 0.3, halo: 0, haloRadius: 0 }, // soft lamp-coloured light with no bulb, e.g. bouncing off a page
  screens: { radius: 150, strength: 0.45, color: '#9fd0ff', halo: 0.1, haloRadius: 36 },
  pendants: { radius: 190, strength: 0.5, color: '#ff8fd0', halo: 0.4, haloRadius: 16 },
  candles: { radius: 44, strength: 0.5, color: '#ffb86b', halo: 0.4, haloRadius: 7 },
};

/** The LED colours this frame: each string-light bulb, and the strip. */
export function ledState(look, count, t, steady) {
  const stripColors = new Set(look.lights.colors).size > 1 ? look.lights.colors : STRIP_COLORS;
  return {
    bulbs: bulbStates(look.lights, count, t, steady),
    strip: { color: ledColor(stripColors, 0, steady ? 0 : t), brightness: ledBrightness(99, t, steady) },
  };
}

/**
 * Adds a hand-drawn scene's lights (from scene.json) to `lighting`. The
 * first lamp casts shadows if `lampShadow` is given.
 */
export function addSceneLights(lighting, art, { theme, look, leds, t, steady, lampShadow }) {
  const dim = art.lighting === 'painted' ? 0.3 : 1; // painted art already has its light
  const glow = hexToRgb(look.glowColor);
  const flicker = (i) => (steady ? 1 : 0.85 + 0.15 * Math.sin(t * 9 + i * 2) * Math.sin(t * 5.3 + i));
  art.lights.points.forEach((light, i) => {
    const d = DEFAULTS[light.group];
    const lampColored = light.group === 'lamps' || light.group === 'fills';
    const color = light.color ? hexToRgb(light.color) : lampColored ? glow : hexToRgb(d.color);
    let strength = (light.strength ?? d.strength) * dim;
    if (lampColored) strength *= theme.lighting.lamp;
    if (light.group === 'candles') strength *= flicker(i);
    const cone = Number.isFinite(light.dx) && Number.isFinite(light.dy)
      ? { dx: light.dx, dy: light.dy, inner: light.inner ?? 0.85, outer: light.outer ?? 0.6, spill: light.spill ?? 0.2 }
      : undefined;
    lighting.addPoint({
      x: light.x,
      y: light.y,
      radius: light.radius ?? d.radius,
      color,
      strength,
      bands: 4,
      cone,
      shadow: light.group === 'lamps' && i === art.lights.points.findIndex((l) => l.group === 'lamps') ? lampShadow : undefined,
      halo: d.halo * dim,
      haloRadius: d.haloRadius,
    });
  });
  art.lights.bulbs.forEach(([x, y], i) => {
    const b = leds.bulbs[i];
    lighting.addPoint({ x, y: y + 3, radius: 28, color: b.color, strength: 0.26 * b.brightness * dim, bands: 3, halo: 0.26 * b.brightness, haloRadius: 7 });
  });
  for (const s of art.lights.ledStrips) {
    lighting.addLine({ ...s, radius: s.radius ?? 90, color: leds.strip.color, strength: 0.6 * leds.strip.brightness * dim, halo: 0.25 * leds.strip.brightness, haloRadius: 5 });
  }
}

/** The bulbs in their current LED colours, and the LED strips' little lights: drawn after the lighting. */
export function drawLeds(ctx, art, look, leds) {
  art.lights.bulbs.forEach(([x, y], i) => drawBulbShape(ctx, x, y, look.lights.bulb, leds.bulbs[i].color, leds.bulbs[i].brightness));
  const body = rgbToHex(leds.strip.color, leds.strip.brightness);
  const core = rgbToHex(leds.strip.color, leds.strip.brightness, 0.55);
  for (const { x0, y0, x1, y1 } of art.lights.ledStrips) {
    const steps = Math.max(1, Math.round(Math.hypot(x1 - x0, y1 - y0) / 4));
    for (let i = 0; i <= steps; i++) {
      const x = Math.round(x0 + ((x1 - x0) * i) / steps);
      const y = Math.round(y0 + ((y1 - y0) * i) / steps);
      rect(ctx, x, y, 2, 1, body);
      rect(ctx, x, y, 1, 1, core);
    }
  }
}

/**
 * Window light for a hand-drawn scene: beams in the air through the
 * window, and, if scene.json gives the surfaces, bright patches where it
 * lands (the sill, and the desk or floor).
 */
export function buildSceneWindowLight(art, win, casters, w, h) {
  const patch = new Float32Array(w * h);
  const shafts = new Float32Array(w * h);
  const glass = art.window;
  if (!glass) return { patch, shafts };
  const panes = art.panes ?? [glass];
  const cx = glass.x + glass.w / 2;
  const surfaces = art.surfaces ?? {};
  if (Number.isFinite(surfaces.sill)) {
    for (let x = glass.x - 12; x < glass.x + glass.w + 12; x++) {
      for (let y = surfaces.sill; y < surfaces.sill + 3; y++) if (x >= 0 && x < w) patch[y * w + x] = 0.6;
    }
  }
  const ground = surfaces.desk ?? surfaces.floor; // { top, bottom }
  if (ground) {
    for (let y = ground.top; y < ground.bottom; y++) {
      const depth = (y - ground.top) / (ground.bottom - ground.top);
      const spread = 1 + depth * 0.25;
      const shift = win.slant * depth * 100;
      for (const pane of panes) {
        const a = Math.round(cx + (pane.x - cx) * spread + shift);
        const b = Math.round(cx + (pane.x + pane.w - cx) * spread + shift);
        for (let x = Math.max(0, a); x < Math.min(w, b); x++) {
          const edge = Math.min(x - a, b - 1 - x) < 3 ? 0.6 : 1;
          patch[y * w + x] = band((1 - depth * 0.35) * edge, 4, x, y);
        }
      }
    }
  }
  if (casters) for (let i = 0; i < w * h; i++) if (casters[i]) patch[i] = 0;
  const startY = glass.y + glass.h * 0.4;
  const endY = ground?.bottom ?? h;
  for (let y = Math.round(startY); y < endY; y++) {
    const p = (y - startY) / (endY - startY);
    const shift = win.slant * p * 80;
    for (const pane of panes) {
      for (let x = Math.max(0, Math.round(pane.x + shift)); x < Math.min(w, Math.round(pane.x + pane.w + shift)); x++) {
        const streak = 0.65 + 0.35 * Math.sin(x * 0.19 + y * 0.06) * Math.sin(x * 0.045);
        shafts[y * w + x] = band(Math.sin(p * Math.PI) * streak, 3, x, y);
      }
    }
  }
  return { patch, shafts };
}

/** Raindrop shadows sliding through the window light, for any scene. */
export function addSceneRainShadows(lighting, art, patch, slant, t, rain, w) {
  const glass = art.window;
  const ground = art.surfaces?.desk ?? art.surfaces?.floor;
  if (!glass || !ground) return;
  const cx = glass.x + glass.w / 2;
  for (const { u, v } of rainShadowSpots(glass, t, rain)) {
    if (v < 0 || v > 1) continue;
    const depth = 1 - v;
    const x = Math.round(cx + (glass.x + u * glass.w - cx) * (1 + depth * 0.25) + slant * depth * 100);
    const y = Math.round(ground.top + depth * (ground.bottom - ground.top - 2));
    for (const [dx, dy] of [[0, 0], [1, 0], [0, 1], [1, 1]]) {
      if (patch[(y + dy) * w + x + dx] > 0) lighting.shade(x + dx, y + dy, 0.3);
    }
  }
}

/** The view outside and the weather on the glass, inside the scene's window. */
export function drawSceneView(ctx, art, theme, t, rain) {
  const glass = art.window;
  if (!glass) return;
  const win = theme.lighting.window;
  ctx.save();
  ctx.beginPath();
  ctx.rect(glass.x, glass.y, glass.w, glass.h);
  ctx.clip();
  theme.drawView(ctx, glass, t);
  if (win.glass === 'rain') drawRainOnGlass(ctx, glass, t, rain);
  if (win.glass === 'frost') drawFrost(ctx, art.panes ?? [glass]);
  ctx.restore();
}

/**
 * The wallpaper and rug the player chose, if the artist drew them: each is
 * a full-size picture drawn over the back layer (see "styles" in
 * ART_BRIEF.md). Without one, the back layer's own wall or rug shows.
 */
export function drawStyles(ctx, art, look) {
  for (const id of look.styleIds ?? []) {
    const image = art.images[`style:${id}`];
    if (image) ctx.drawImage(image, 0, 0);
  }
}

/** True for every non-transparent pixel of an image: an object that can cast a shadow. */
export function castersFromImage(image, w, h) {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(image, 0, 0);
  return castersFrom(ctx, w, h);
}

// ---- The close-up, from hand-drawn art ---------------------------------------

/**
 * Like createCloseUpView in closeup.js, for a hand-drawn close-up.
 * `options` passes in what closeup.js knows: the canvas size, how to place
 * decorations (closeUpDecor) and the default spots for them.
 */
export function createArtCloseUp(art, { width: w, height: h, closeUpDecor, drawDecor, decorDefaults, scale, itemArt }) {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  const interiorCanvas = document.createElement('canvas');
  interiorCanvas.width = w;
  interiorCanvas.height = h;
  const interior = interiorCanvas.getContext('2d', { willReadFrequently: true });
  for (const c of [ctx, interior]) c.imageSmoothingEnabled = false;
  const lighting = createLighting(w, h);
  const decorScale = art.decor?.scale ?? scale;
  const spots = { ...decorDefaults, ...art.decor?.spots };
  const rain = { count: 60, seed: 5 };
  const casters = art.images.casters ? castersFromImage(art.images.casters, w, h) : null;
  const firstLamp = art.lights.points.find((l) => l.group === 'lamps');
  const lampShadow = casters && firstLamp ? castShadows(casters, w, h, firstLamp, firstLamp.radius ?? 230, { softness: 4, darkness: 0.85, step: 2 }) : null;
  let windowLight = null; // worked out per window view

  return {
    canvas,
    draw({ theme, look, placed, pets, studying, progress, t, steady }) {
      const win = theme.lighting.window;
      if (windowLight?.themeId !== theme.id) windowLight = { themeId: theme.id, ...buildSceneWindowLight(art, win, casters, w, h) };
      const decor = closeUpDecor(placed, pets, spots, decorScale, itemArt);

      ctx.clearRect(0, 0, w, h);
      drawSceneView(ctx, art, theme, t, rain);

      interior.clearRect(0, 0, w, h);
      interior.drawImage(art.images.back, 0, 0);
      drawStyles(interior, art, look);
      for (const d of [...decor.window, decor.sill, decor.shelf, decor.desk]) {
        if (d) drawDecor(interior, d, t, decorScale);
      }
      drawWritingArea(interior, art.writing, progress);
      drawArtBuddy(interior, art.buddy, art.images.buddy, studying, t);
      if (art.images.front) interior.drawImage(art.images.front, 0, 0);

      const leds = ledState(look, art.lights.bulbs.length, t, steady);
      const flash = win.flashes && !steady ? fireworkFlash(t) : { strength: 0, color: win.color };
      const windowColor = win.color.map((c, i) => c + (flash.color[i] - c) * Math.min(1, flash.strength));
      const painted = art.lighting === 'painted';
      lighting.begin(painted ? [1, 1, 1] : theme.lighting.ambient, painted ? 0 : 0.4);
      addSceneLights(lighting, art, { theme, look, leds, t, steady, lampShadow });
      if (!painted) {
        lighting.addMask(windowLight.patch, windowColor, win.strength + flash.strength * 0.5);
        if (win.glass === 'rain') addSceneRainShadows(lighting, art, windowLight.patch, win.slant, t, rain, w);
      }
      if (flash.strength > 0) lighting.addPoint({ x: w / 2, y: h / 3, radius: w * 0.75, color: flash.color, strength: flash.strength * 0.2, bands: 4 });
      lighting.applyTo(interior);
      ctx.drawImage(interiorCanvas, 0, 0);

      if (art.images.emissive) ctx.drawImage(art.images.emissive, 0, 0);
      drawLeds(ctx, art, look, leds);
      if (decor.sill?.asleep) drawSleepZ(ctx, decor.sill.box, t, decorScale);
      lighting.addAirMask(windowLight.shafts, windowColor, win.shafts + flash.strength * 0.04);
      addDust(lighting, windowLight.shafts, w, h, windowColor, steady ? 0 : t, { count: 160, amount: win.shafts > 0.1 ? 0.45 : 0.25 });
      if (art.steam) drawSteamAt(ctx, art.steam, steady ? 0 : t);
      lighting.applyAir(ctx);
    },
  };
}

/**
 * The close-up buddy from the animation sheet: writing (with a short rest
 * now and then), or looking up while paused; blinking every few seconds.
 */
function drawArtBuddy(ctx, buddy, sheet, studying, t) {
  const blinking = t % 4.7 < 0.15;
  const resting = t % 10 > 8.7;
  const a = buddy.animations;
  // The first of these that the sheet has: e.g. no "blinkWrite" frames just means no blinking.
  const choices = studying
    ? [blinking && 'blinkWrite', resting && 'rest', 'write']
    : [blinking && 'blinkPaused', 'paused'];
  let frame = a.write.frames[0];
  for (const name of choices) {
    const found = name ? frameAt(a, name, t) : null;
    if (found !== null) {
      frame = found;
      break;
    }
  }
  drawFrame(ctx, sheet, frame, buddy.frameW, buddy.frameH, buddy.x, buddy.y);
}

/**
 * Lines of handwriting appearing on the notebook page as the session goes
 * on. `writing` is { x, y, w, lines, gap, slant, ink }: the first line's
 * left end, how long each line is, how many lines, the space between them,
 * how far each line shifts sideways (for a page lying at an angle), and the
 * ink colour.
 */
export function drawWritingArea(ctx, writing, progress) {
  if (!writing) return;
  const { x, y, w, lines = 8, gap = 4, slant = 0, ink = '#4b5596' } = writing;
  let left = Math.max(0, Math.min(1, progress)) * lines * w;
  for (let i = 0; i < lines && left > 0; i++) {
    const rng = makeRng(i + 100);
    const lx = Math.round(x + slant * i * gap);
    const ly = Math.round(y + i * gap);
    const end = Math.min(w, Math.round(left));
    for (let px = 0; px < end; px++) {
      const r = rng();
      if (r < 0.15) continue;
      rect(ctx, lx + px, ly, 1, 1, ink);
      if (r > 0.78) rect(ctx, lx + px, ly - 1, 1, 1, ink);
    }
    left -= w;
  }
}

function drawSleepZ(ctx, box, t, scale) {
  for (let i = 0; i < 2; i++) {
    const p = (t * 0.4 + i * 0.5) % 1;
    ctx.globalAlpha = 1 - p;
    drawSpriteScaled(ctx, SPRITES.sleepZ, box.x + box.w - 8 + Math.floor(p * 10), box.y - 10 - Math.floor(p * 20), scale);
  }
  ctx.globalAlpha = 1;
}

/** Steam rising from a mug at [x, y]. */
export function drawSteamAt(ctx, [mx, my], t) {
  for (let i = 0; i < 6; i++) {
    const p = (t * 0.22 + i / 6) % 1;
    const x = mx + Math.round(Math.sin(t * 1.1 + i * 1.7 + p * 4) * 4);
    const y = my - Math.floor(p * 40);
    ctx.fillStyle = `rgba(255, 250, 240, ${0.3 * (1 - p)})`;
    ctx.fillRect(x, y, 1, 4);
    ctx.fillRect(x + 1, y + 1, 1, 3);
  }
}
