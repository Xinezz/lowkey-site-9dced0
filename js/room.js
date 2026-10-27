// Draws the study room onto a 640×360 canvas, then lets CSS scale it up.
// Drawing at a fixed resolution and scaling by a whole number is what gives
// sharp pixels instead of a blurry image.
//
// The painting itself lives in room-art.js; this file runs the animation:
// each frame it adds the moving parts (decorations, the buddy, the clock),
// lights everything (lighting.js) and adds what glows.

import { ROOM_FPS } from './config.js';
import { getTheme } from './themes.js';
import { SPRITES } from './sprites.js';
import { getItem } from './items.js';
import { isPetCareUnlocked } from './levels.js';
import { needingAttention } from './pets.js';
import { createBuddy, updateBuddy } from './buddy.js';
import { buddyDepth, drawBuddy } from './buddy-art.js';
import { createCloseUpView } from './closeup.js';
import { drawFrame, frameAt, frameAtDistance } from './art.js';
import {
  addSceneLights,
  addSceneRainShadows,
  buildSceneWindowLight,
  castersFromImage,
  drawLeds,
  drawSceneView,
  drawStyles,
  ledState,
} from './art-scene.js';
import { DEFAULT_GLOW, DEFAULT_LIGHTS, DEFAULT_RUG } from './style-art.js';
import { drawSpriteScaled, ellipse, hexToRgb, rect, spriteSize } from './pixel.js';
import { band, castersFrom, castShadows, createLighting } from './lighting.js';
import { ledBrightness, ledColor } from './leds.js';
import {
  addDust,
  bulbStates,
  drawBulbShape,
  drawFrost,
  drawRainOnGlass,
  fireworkFlash,
  rainShadowSpots,
  rgbToHex,
} from './light-fx.js';
import {
  CANDLE,
  CLOCK,
  LAMP_AXIS,
  LAMP_LIGHT,
  LED_COVE,
  MUG_TOP,
  STRING_BULBS,
  drawCandleFlame,
  drawClockHands,
  drawKeyGlow,
  drawLampMouth,
  drawPendantGlass,
  drawScreen,
  paintCasters,
  paintChair,
  paintRoom,
  stringY,
} from './room-art.js';
import { CHAIR, GLASS, ITEM_SCALE, MONITOR, PANES, PENDANTS, ROOM_H, ROOM_W, SILL_Y, SPOTS } from './layout.js';

const SCALE = ITEM_SCALE; // decorations, pets and the buddy are shown at twice their drawn size
const CELEBRATION_MS = 2400;
const HEART_MS = 1400;
const CLOSE_UP_FADE_SECONDS = 1.2; // how long the move to (or from) the close-up takes
const NEED_ICONS = { food: SPRITES.needFood, love: SPRITES.needLove, energy: SPRITES.needEnergy };
const STRIP_COLORS = ['#b37bff', '#ff7ac8', '#6fa8ff', '#57d6c8']; // when the chosen lights have only one colour
const PENDANT_COLOR = [1, 0.56, 0.82]; // the hanging lamps' soft pink
const SCREEN_COLOR = [0.62, 0.8, 1]; // the monitor's cool blue
const RAIN = { count: 46, seed: 9 }; // raindrops on the window
const FLOOR_PATCH = { top: 310, bottom: ROOM_H }; // where window light lands on the floor

/**
 * Starts the animation loop.
 * @param {HTMLCanvasElement} canvas
 * @param {object} sources
 * @param {() => object} sources.getState  The game state, read every frame,
 *   so any change (a new background, a new item, a hungry pet) shows up on
 *   the next frame automatically.
 * @param {() => boolean} sources.isFocusing  While true, pets don't show
 *   "I need something" bubbles, so they never interrupt a focus session.
 * @param {() => {goal: 'desk' | 'relax', studying: boolean, closeUp: boolean, progress: number}} sources.getScene
 *   Where the study buddy should be and whether they're actively studying;
 *   whether to move in close once they're at the desk; and how far the
 *   focus session is (0 → 1), which fills their notebook page.
 * @param {object} [sources.art]  Hand-drawn art from art.js ({ closeup, room, items }),
 *   used instead of the built-in art wherever it exists.
 * @returns {{celebrate: (itemId: string) => void, react: (itemId: string) => void}}
 */
export function startRoom(canvas, { getState, isFocusing, getScene, art = {} }) {
  itemArt = art.items ?? new Map();
  // A hand-drawn room that doesn't say where its window is follows the
  // template (art/templates), so it has the built-in room's window.
  const roomArt = art.room && {
    ...art.room,
    window: art.room.window ?? GLASS,
    panes: art.room.panes ?? (art.room.window ? null : PANES),
    surfaces: art.room.window ? art.room.surfaces : { sill: SILL_Y, floor: FLOOR_PATCH, ...art.room.surfaces },
  };
  // Light is worked out pixel by pixel (see lighting.js), so these canvases
  // are read back every frame: willReadFrequently makes that fast.
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  ctx.imageSmoothingEnabled = false;
  keepCanvasCrisp(canvas);

  // The room itself is painted on a second, invisible canvas with see-through
  // window panes. See drawRoom() for why.
  const interior = makeCanvas().getContext('2d', { willReadFrequently: true });
  interior.imageSmoothingEnabled = false;
  const lighting = createLighting(ROOM_W, ROOM_H);
  let cache = null; // the parts of the room that don't move, and their shadows

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const frameInterval = 1000 / ROOM_FPS;
  let lastFrame = -Infinity;
  let celebration = null; // { itemId, startedAt } while sparkles are showing
  let hearts = []; // { itemId, startedAt } for each heart floating up
  const buddy = createBuddy();
  const closeUp = createCloseUpView(art.closeup ?? null, itemArt);
  let closeness = 0; // 0 = the whole room, 1 = the close-up, in between while fading

  // requestAnimationFrame runs ~60 times a second while the tab is visible
  // and pauses when it is hidden. We only redraw ROOM_FPS times a second.
  function frame(now) {
    requestAnimationFrame(frame);
    if (now - lastFrame < frameInterval) return;
    // Seconds since the last drawn frame. After the tab was hidden this can
    // be large, and the buddy simply arrives where they were heading.
    const seconds = lastFrame === -Infinity ? 0 : (now - lastFrame) / 1000;
    lastFrame = now;

    const state = getState();
    const theme = getTheme(state.themeId);
    const placed = placementsOf(state);
    const look = lookOf(state, theme);
    // Until pet care unlocks, pets are just decorations with no needs.
    const pets = isPetCareUnlocked(state) ? state.pets : {};
    const t = reduceMotion.matches ? 0 : now / 1000;

    const scene = getScene();
    updateBuddy(buddy, scene.goal, reduceMotion.matches ? Infinity : seconds);

    // Once the buddy has sat down, fade over to the close-up (and back after).
    const target = scene.closeUp && buddy.mode === 'seated' ? 1 : 0;
    const step = reduceMotion.matches ? 1 : seconds / CLOSE_UP_FADE_SECONDS;
    closeness = target > closeness ? Math.min(target, closeness + step) : Math.max(target, closeness - step);

    if (closeness < 1) {
      const view = { theme, look, placed, pets, buddy, scene, t, steady: reduceMotion.matches };
      if (roomArt) {
        if (cache?.key !== theme.id) cache = buildArtRoomCache(theme, roomArt);
        drawArtRoom(ctx, interior, lighting, cache, roomArt, view);
      } else {
        const key = JSON.stringify([theme.id, look.wall, look.rug]);
        if (cache?.key !== key) cache = buildRoomCache(key, theme, look);
        drawRoom(ctx, interior, lighting, cache, view);
      }
      drawPetIcons(ctx, placed, pets, isFocusing(), t);
      drawEffects(now, placed);
    }
    if (closeness > 0) {
      // The close-up is drawn at the same size as the room.
      closeUp.draw({ theme, look, placed, pets, studying: scene.studying, progress: scene.progress, t, steady: reduceMotion.matches });
      ctx.globalAlpha = closeness;
      ctx.drawImage(closeUp.canvas, 0, 0);
      ctx.globalAlpha = 1;
    }
  }

  /** Hearts and sparkles. They only show for items that are actually in the room. */
  function drawEffects(now, placed) {
    const placementOf = (itemId) => placed.find((p) => p.item.id === itemId);
    hearts = hearts.filter((heart) => now - heart.startedAt < HEART_MS);
    for (const heart of hearts) {
      const placement = placementOf(heart.itemId);
      if (placement) drawHeart(ctx, placement, now - heart.startedAt);
    }

    if (celebration && now - celebration.startedAt > CELEBRATION_MS) celebration = null;
    const celebrated = celebration && placementOf(celebration.itemId);
    if (celebrated) drawCelebration(ctx, celebrated, now - celebration.startedAt, reduceMotion.matches);
  }
  requestAnimationFrame(frame);

  return {
    /** Twinkles around an item for a couple of seconds, e.g. right after buying it. */
    celebrate(itemId) {
      celebration = { itemId, startedAt: performance.now() };
    },
    /** A little heart floats up from a pet, e.g. after feeding or playing with it. */
    react(itemId) {
      hearts.push({ itemId, startedAt: performance.now() });
    },
  };
}

/** Every decoration in the room, paired with the spot it stands in. */
function placementsOf(state) {
  return Object.entries(state.placements)
    .map(([spotId, itemId]) => ({ item: getItem(itemId), spot: SPOTS[spotId] }))
    .filter((placement) => placement.item && placement.spot);
}

/** The chosen styles, with the room's defaults filled in where nothing is chosen. */
function lookOf(state, theme) {
  const chosen = (kind) => (state.style[kind] ? getItem(state.style[kind]) : null);
  return {
    lights: chosen('lights')?.lights ?? DEFAULT_LIGHTS,
    glowColor: chosen('glow')?.glowColor ?? DEFAULT_GLOW,
    rug: chosen('rug')?.rug ?? DEFAULT_RUG,
    wall: chosen('wallpaper')?.wallpaper ?? theme.room,
    // Which wallpaper and rug, by id, for hand-drawn art (its "styles" pictures).
    styleIds: [state.style.wallpaper, state.style.rug].filter(Boolean),
  };
}

/**
 * Sizes the canvas so each art pixel covers a whole number of *device*
 * pixels. On a laptop at 125% Windows scaling, devicePixelRatio is 1.25, so
 * a CSS-pixel scale of 3 would give uneven 3- and 4-pixel-wide art pixels.
 *
 * But rounding down leaves empty bands around the room (2.5× → 2× wastes
 * 20%). Unless a whole number is a near-perfect fit, we use the exact fit
 * instead: edges stay hard thanks to `image-rendering: pixelated`, only some
 * art pixels end up one device pixel wider than others.
 */
function keepCanvasCrisp(canvas) {
  const container = canvas.parentElement;
  const MARGIN = 0; // the room fills the whole screen
  const MIN_FILL = 0.95; // use a whole-number scale only if it fills at least 95% of the screen

  function fit() {
    const dpr = window.devicePixelRatio || 1;
    const maxW = (container.clientWidth - MARGIN) * dpr;
    const maxH = (container.clientHeight - MARGIN) * dpr;
    const ratio = Math.min(maxW / ROOM_W, maxH / ROOM_H);
    const whole = Math.floor(ratio);
    const scale = whole >= 1 && whole / ratio >= MIN_FILL ? whole : Math.max(ratio, 0.1);
    canvas.style.width = `${(ROOM_W * scale) / dpr}px`;
    canvas.style.height = `${(ROOM_H * scale) / dpr}px`;
  }

  new ResizeObserver(fit).observe(container);
  window.addEventListener('resize', fit); // also fires when zoom or monitor DPI changes
  fit();
}

function makeCanvas() {
  const canvas = document.createElement('canvas');
  canvas.width = ROOM_W;
  canvas.height = ROOM_H;
  return canvas;
}

// ---------------------------------------------------------------------------
// The parts that never move, painted once
// ---------------------------------------------------------------------------

/**
 * Paints the room (room-art.js) and the chair once, and works out the
 * shadows: which pixels the desk lamp can't reach.
 */
function buildRoomCache(key, theme, look) {
  const base = makeCanvas().getContext('2d');
  paintRoom(base, { room: theme.room, wall: look.wall, rug: look.rug });
  const chair = makeCanvas().getContext('2d');
  paintChair(chair);

  const casterCtx = makeCanvas().getContext('2d', { willReadFrequently: true });
  paintCasters(casterCtx);
  const casters = castersFrom(casterCtx, ROOM_W, ROOM_H);

  return {
    key,
    base: base.canvas,
    chair: chair.canvas,
    lampShadow: castShadows(casters, ROOM_W, ROOM_H, LAMP_LIGHT, 150, { softness: 3, darkness: 0.8, step: 2 }),
    ...buildWindowLight(theme.lighting.window),
  };
}

/**
 * Sun or moonlight through the window: a bright strip on the sill, the
 * panes' shapes on the desk top and on the floor (with the window bars'
 * shadows between them), and faint beams in the air on the way down.
 */
function buildWindowLight(win) {
  const patch = new Float32Array(ROOM_W * ROOM_H);
  const shafts = new Float32Array(ROOM_W * ROOM_H);
  const cx = GLASS.x + GLASS.w / 2;
  const columns = [PANES[0], PANES[1], PANES[2]].map((p) => [p.x, p.x + p.w]);

  for (let x = GLASS.x - 18; x < GLASS.x + GLASS.w + 18; x++) {
    for (let y = SILL_Y; y < SILL_Y + 2; y++) patch[y * ROOM_W + x] = 0.6;
  }
  // The desk top, just in front of the window.
  for (let y = 237; y < 246; y++) {
    for (const [x0, x1] of columns) {
      const shift = win.slant * 14;
      for (let x = Math.round(x0 + shift); x < Math.round(x1 + shift); x++) {
        if (x >= 0 && x < ROOM_W) patch[y * ROOM_W + x] = band(0.75, 4, x, y);
      }
    }
  }
  // The floor: light through the lower panes lands nearer, the upper panes further forward.
  const { top, bottom } = FLOOR_PATCH;
  for (let y = top; y < bottom; y++) {
    const depth = (y - top) / (bottom - top);
    if (depth > 0.44 && depth < 0.52) continue; // the shadow of the cross bar
    const spread = 1 + depth * 0.35;
    const shift = win.slant * (30 + depth * 120);
    for (const [x0, x1] of columns) {
      const a = Math.round(cx + (x0 - cx) * spread + shift);
      const b = Math.round(cx + (x1 - cx) * spread + shift);
      for (let x = Math.max(0, a); x < Math.min(ROOM_W, b); x++) {
        const edge = Math.min(x - a, b - 1 - x) < 3 ? 0.6 : 1;
        patch[y * ROOM_W + x] = band((0.95 - depth * 0.3) * edge, 4, x, y);
      }
    }
  }
  // Beams in the air, from the lower half of the window down to the floor.
  const startY = GLASS.y + GLASS.h / 2;
  for (let y = startY; y < ROOM_H; y++) {
    const p = (y - startY) / (ROOM_H - startY);
    const shift = win.slant * p * 150;
    for (const [x0, x1] of columns) {
      const spread = 1 + p * 0.3;
      for (let x = Math.max(0, Math.round(cx + (x0 - cx) * spread + shift)); x < Math.min(ROOM_W, Math.round(cx + (x1 - cx) * spread + shift)); x++) {
        const streak = 0.65 + 0.35 * Math.sin(x * 0.21 + y * 0.07) * Math.sin(x * 0.05);
        shafts[y * ROOM_W + x] = band(Math.sin(p * Math.PI) * streak * 0.8, 3, x, y);
      }
    }
  }
  return { patch, shafts };
}

// ---------------------------------------------------------------------------
// Every frame
// ---------------------------------------------------------------------------

/**
 * Each frame, in layers:
 *   1. The view outside, painted straight onto the visible canvas, with
 *      weather on the glass.
 *   2. The room, painted unlit on `interior` with holes where the panes are:
 *      the still parts from the cache, then decorations, the chair and the
 *      buddy, sorted by depth.
 *   3. Light (lighting.js): ambient, the desk lamp with shadows, the
 *      monitor, the pendant lamps, the string lights, the LED cove, the
 *      candle, glowing decorations, and the window. Then the room is laid
 *      over the view.
 *   4. Things that glow by themselves, and light in the air (halos, beams, dust).
 */
function drawRoom(ctx, interior, lighting, cache, { theme, look, placed, pets, buddy, scene, t, steady }) {
  const win = theme.lighting.window;

  ctx.save();
  ctx.beginPath();
  ctx.rect(GLASS.x, GLASS.y, GLASS.w, GLASS.h);
  ctx.clip();
  theme.drawView(ctx, GLASS, t);
  if (win.glass === 'rain') drawRainOnGlass(ctx, GLASS, t, RAIN);
  if (win.glass === 'frost') drawFrost(ctx, PANES);
  drawGlassShine(ctx);
  ctx.restore();

  interior.clearRect(0, 0, ROOM_W, ROOM_H);
  interior.drawImage(cache.base, 0, 0);
  drawClockHands(interior, new Date());
  for (const layer of ['window', 'wall', 'shelf', 'desk', 'bed']) drawItems(interior, placed, pets, layer, t);
  drawFloorByDepth(interior, cache.chair, placed, pets, { buddy, studying: scene.studying }, t);

  const glow = hexToRgb(look.glowColor);
  const bulbs = bulbStates(look.lights, STRING_BULBS.length, t, steady);
  const stripColors = new Set(look.lights.colors).size > 1 ? look.lights.colors : STRIP_COLORS;
  const strip = { color: ledColor(stripColors, 0, steady ? 0 : t), brightness: ledBrightness(99, t, steady) };
  const flash = win.flashes && !steady ? fireworkFlash(t) : { strength: 0, color: win.color };
  const windowColor = win.color.map((c, i) => c + (flash.color[i] - c) * Math.min(1, flash.strength));
  const candle = steady ? 1 : 0.85 + 0.15 * Math.sin(t * 9) * Math.sin(t * 5.3);
  const glowing = placed.filter((placement) => placement.item.glow);
  const screen = { x: MONITOR.x + MONITOR.w / 2, y: MONITOR.y + MONITOR.h / 2 };

  lighting.begin(theme.lighting.ambient, 0.35);
  lighting.addPoint({
    ...LAMP_LIGHT,
    radius: 190,
    color: glow,
    strength: theme.lighting.lamp * 1.2,
    shadow: cache.lampShadow,
    cone: { dx: LAMP_AXIS[0], dy: LAMP_AXIS[1], inner: 0.8, outer: 0.3, spill: 0.22 },
    halo: 0.45,
    haloRadius: 14,
  });
  lighting.addPoint({ ...screen, radius: 170, color: SCREEN_COLOR, strength: 0.55, bands: 4, halo: 0.12, haloRadius: 50 });
  for (const p of PENDANTS) {
    lighting.addPoint({ x: p.x, y: p.y, radius: 190, color: PENDANT_COLOR, strength: 0.5, bands: 5, halo: 0.4, haloRadius: 16 });
  }
  STRING_BULBS.forEach((x, i) => {
    const b = bulbs[i];
    lighting.addPoint({ x, y: stringY(x) + 5, radius: 28, color: b.color, strength: 0.24 * b.brightness, bands: 3, halo: 0.24 * b.brightness, haloRadius: 6 });
  });
  lighting.addLine({
    x0: LED_COVE.x0, y0: LED_COVE.y, x1: LED_COVE.x1, y1: LED_COVE.y,
    radius: 110, color: strip.color, strength: 0.6 * strip.brightness, halo: 0.3 * strip.brightness, haloRadius: 5,
  });
  lighting.addPoint({ x: CANDLE.x, y: CANDLE.y + 1, radius: 44, color: [1, 0.72, 0.42], strength: 0.5 * candle, bands: 4, halo: 0.4 * candle, haloRadius: 7 });
  glowing.forEach((placement, i) => {
    const box = itemBox(placement);
    const { x, y, radius, color } = placement.item.glow;
    const flicker = steady ? 1 : 0.92 + 0.08 * Math.sin(t * 7 + i * 3) * Math.sin(t * 3.1 + i);
    lighting.addPoint({
      x: box.x + x * SCALE, y: box.y + y * SCALE, radius: radius * SCALE * 2.2, color: hexToRgb(color),
      strength: 0.5 * flicker, bands: 4, halo: 0.3, haloRadius: radius * SCALE * 0.8,
    });
  });
  lighting.addMask(cache.patch, windowColor, win.strength + flash.strength * 0.5);
  if (win.glass === 'rain') addRainShadows(lighting, cache.patch, win.slant, t);
  if (flash.strength > 0) {
    lighting.addPoint({ x: GLASS.x + GLASS.w / 2, y: GLASS.y + GLASS.h / 2, radius: 420, color: flash.color, strength: flash.strength * 0.2, bands: 4 });
  }
  lighting.applyTo(interior);
  ctx.drawImage(interior.canvas, 0, 0);

  drawEmissive(ctx, { look, bulbs, strip, glowing, scene, t });
  lighting.addAirMask(cache.shafts, windowColor, win.shafts + flash.strength * 0.04);
  addDust(lighting, cache.shafts, ROOM_W, ROOM_H, windowColor, steady ? 0 : t, { count: 140, amount: win.shafts > 0.1 ? 0.45 : 0.25 });
  drawSteam(ctx, t);
  lighting.applyAir(ctx);
}

function drawGlassShine(ctx) {
  ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
  for (let i = 0; i < 40; i++) ctx.fillRect(GLASS.x + 12 + i, GLASS.y + 60 - i, 4, 1);
  for (let i = 0; i < 18; i++) ctx.fillRect(GLASS.x + 34 + i, GLASS.y + 46 - i, 2, 1);
  for (let i = 0; i < 30; i++) ctx.fillRect(GLASS.x + 196 + i, GLASS.y + 130 - i, 3, 1);
}

/** Shadows of the raindrops on the glass, sliding across the light on the floor. */
function addRainShadows(lighting, patch, slant, t) {
  const { top, bottom } = FLOOR_PATCH;
  const cx = GLASS.x + GLASS.w / 2;
  for (const { u, v } of rainShadowSpots(GLASS, t, RAIN)) {
    if (v < 0 || v > 1) continue;
    const depth = 1 - v; // light through the top of the glass lands furthest forward
    const y = Math.round(top + depth * (bottom - top - 1));
    const x = Math.round(cx + (GLASS.x + u * GLASS.w - cx) * (1 + depth * 0.35) + slant * (30 + depth * 120));
    for (const [dx, dy] of [[0, 0], [1, 0], [0, 1], [1, 1]]) {
      if (patch[(y + dy) * ROOM_W + x + dx] > 0) lighting.shade(x + dx, y + dy, 0.3);
    }
  }
}

/**
 * Things that make their own light, drawn after the lighting so the dark of
 * night doesn't dim them: the lamp's shade, the monitor, the keyboard, the
 * pendant lamps, the string lights in their current LED colours, the LED
 * cove, the candle, and glowing decorations (except on the floor, where
 * the buddy may walk in front of them).
 */
function drawEmissive(ctx, { look, bulbs, strip, glowing, scene, t }) {
  drawLampMouth(ctx);
  const accent = rgbToHex(strip.color, 1, 0.2);
  drawScreen(ctx, t, scene.progress, scene.studying, accent);
  drawKeyGlow(ctx, accent);
  drawPendantGlass(ctx, '#ff9ad6', '#ffd8ee');
  STRING_BULBS.forEach((x, i) => drawBulbShape(ctx, x, stringY(x) + 3, look.lights.bulb, bulbs[i].color, bulbs[i].brightness));
  const body = rgbToHex(strip.color, strip.brightness);
  const core = rgbToHex(strip.color, strip.brightness, 0.55);
  for (let x = LED_COVE.x0 + 1; x < LED_COVE.x1; x += 4) {
    rect(ctx, x, LED_COVE.y, 2, 1, body);
    rect(ctx, x, LED_COVE.y, 1, 1, core);
  }
  drawCandleFlame(ctx, t);
  for (const placement of glowing) {
    if (placement.spot.layer !== 'floor') drawDecoration(ctx, placement, {}, t);
  }
}

// ---------------------------------------------------------------------------
// The room from hand-drawn art (see art-scene.js and ART_BRIEF.md)
// ---------------------------------------------------------------------------

/**
 * This room's layout as a scene.json (see art.js and ART_BRIEF.md): where
 * the window, lights and chair are. Art drawn on top of the template
 * (art/templates) can start from it; decoration spots come from layout.js.
 */
export function roomExample() {
  const r2 = (v) => Math.round(v * 100) / 100;
  return {
    lighting: 'dynamic',
    layers: { back: 'back.png', front: 'front.png', emissive: 'emissive.png', casters: 'casters.png' },
    window: GLASS,
    panes: PANES,
    surfaces: { sill: SILL_Y, floor: FLOOR_PATCH },
    clock: CLOCK,
    lights: {
      lamps: [{ x: Math.round(LAMP_LIGHT.x), y: Math.round(LAMP_LIGHT.y), dx: r2(LAMP_AXIS[0]), dy: r2(LAMP_AXIS[1]), radius: 190, strength: 1.2, inner: 0.8, outer: 0.3, spill: 0.22 }],
      screens: [{ x: MONITOR.x + MONITOR.w / 2, y: MONITOR.y + MONITOR.h / 2, radius: 170, strength: 0.55 }],
      pendants: PENDANTS.map(({ x, y }) => ({ x, y, radius: 190, strength: 0.5 })),
      candles: [{ x: CANDLE.x, y: CANDLE.y + 1 }],
      bulbs: STRING_BULBS.map((x) => [x, stringY(x) + 3]),
      ledStrips: [{ x0: LED_COVE.x0, y0: LED_COVE.y, x1: LED_COVE.x1, y1: LED_COVE.y, radius: 110 }],
    },
    buddy: {
      sheet: 'buddy.png',
      frameW: 64,
      frameH: 128,
      footX: 32,
      footY: 124,
      seat: [CHAIR.cx, CHAIR.seatY],
      animations: {
        walk: { frames: [0, 1, 2, 3, 4, 5, 6, 7], stride: 10 },
        sit: { frames: [8, 9], fps: 2 },
        sitPaused: { frames: [10], fps: 1 },
        relax: { frames: [11, 12, 13, 14], fps: 2 },
      },
    },
  };
}

function buildArtRoomCache(theme, roomArt) {
  const casters = roomArt.images.casters ? castersFromImage(roomArt.images.casters, ROOM_W, ROOM_H) : null;
  const lamp = roomArt.lights.points.find((l) => l.group === 'lamps');
  return {
    key: theme.id,
    lampShadow: casters && lamp ? castShadows(casters, ROOM_W, ROOM_H, lamp, lamp.radius ?? 190, { softness: 3, darkness: 0.8, step: 2 }) : null,
    ...buildSceneWindowLight(roomArt, theme.lighting.window, casters, ROOM_W, ROOM_H),
  };
}

/** Like drawRoom, with the PNG layers in place of the built-in painting. */
function drawArtRoom(ctx, interior, lighting, cache, roomArt, { theme, look, placed, pets, buddy, scene, t, steady }) {
  const win = theme.lighting.window;
  drawSceneView(ctx, roomArt, theme, t, RAIN);

  interior.clearRect(0, 0, ROOM_W, ROOM_H);
  interior.drawImage(roomArt.images.back, 0, 0);
  drawStyles(interior, roomArt, look);
  if (roomArt.clock) drawClockHands(interior, new Date(), roomArt.clock);
  for (const layer of ['window', 'wall', 'shelf', 'desk', 'bed']) drawItems(interior, placed, pets, layer, t);
  const things = [{ depth: buddyDepth(buddy), draw: () => drawArtRoomBuddy(interior, roomArt, buddy, scene.studying, t) }];
  for (const placement of placed) {
    if (placement.spot.layer === 'floor') things.push({ depth: placement.spot.y, draw: () => drawDecoration(interior, placement, pets, t) });
  }
  things.sort((a, b) => a.depth - b.depth).forEach((thing) => thing.draw());
  if (roomArt.images.front) interior.drawImage(roomArt.images.front, 0, 0);

  const leds = ledState(look, roomArt.lights.bulbs.length, t, steady);
  const flash = win.flashes && !steady ? fireworkFlash(t) : { strength: 0, color: win.color };
  const windowColor = win.color.map((c, i) => c + (flash.color[i] - c) * Math.min(1, flash.strength));
  const painted = roomArt.lighting === 'painted';
  lighting.begin(painted ? [1, 1, 1] : theme.lighting.ambient, painted ? 0 : 0.35);
  addSceneLights(lighting, roomArt, { theme, look, leds, t, steady, lampShadow: cache.lampShadow });
  placed.filter((p) => p.item.glow).forEach((placement, i) => {
    const box = itemBox(placement);
    const { x, y, radius, color } = placement.item.glow;
    const flicker = steady ? 1 : 0.92 + 0.08 * Math.sin(t * 7 + i * 3) * Math.sin(t * 3.1 + i);
    lighting.addPoint({ x: box.x + x * SCALE, y: box.y + y * SCALE, radius: radius * SCALE * 2.2, color: hexToRgb(color), strength: 0.5 * flicker, bands: 4, halo: 0.3, haloRadius: radius * SCALE * 0.8 });
  });
  if (!painted) {
    lighting.addMask(cache.patch, windowColor, win.strength + flash.strength * 0.5);
    if (win.glass === 'rain') addSceneRainShadows(lighting, roomArt, cache.patch, win.slant, t, RAIN, ROOM_W);
  }
  if (flash.strength > 0) lighting.addPoint({ x: ROOM_W / 2, y: ROOM_H / 3, radius: 420, color: flash.color, strength: flash.strength * 0.2, bands: 4 });
  lighting.applyTo(interior);
  ctx.drawImage(interior.canvas, 0, 0);

  if (roomArt.images.emissive) ctx.drawImage(roomArt.images.emissive, 0, 0);
  drawLeds(ctx, roomArt, look, leds);
  for (const placement of placed) {
    if (placement.item.glow && placement.spot.layer !== 'floor') drawDecoration(ctx, placement, pets, t);
  }
  lighting.addAirMask(cache.shafts, windowColor, win.shafts + flash.strength * 0.04);
  addDust(lighting, cache.shafts, ROOM_W, ROOM_H, windowColor, steady ? 0 : t, { count: 140, amount: win.shafts > 0.1 ? 0.45 : 0.25 });
  lighting.applyAir(ctx);
}

/**
 * The room buddy from the animation sheet. Every frame shares one anchor
 * point (footX, footY): the spot on the floor between their feet, or where
 * they sit on the chair seat (buddy.seat). Frames face right and are
 * mirrored to face left.
 */
function drawArtRoomBuddy(ctx, roomArt, buddy, studying, t) {
  if (buddy.mode === 'away') return;
  const b = roomArt.buddy;
  const a = b.animations;
  if (buddy.mode === 'seated') {
    const [sx, sy] = b.seat ?? [CHAIR.cx, CHAIR.seatY];
    const frame = studying ? frameAt(a, 'sit', t) : frameAt(a, 'sitPaused', t) ?? a.sit.frames[0];
    drawFrame(ctx, roomArt.images.buddy, frame, b.frameW, b.frameH, sx - b.footX, sy - b.footY);
    return;
  }
  const footX = Math.round(buddy.x) + 20; // the middle of the space the buddy stands in
  ellipse(ctx, footX, Math.round(buddy.y), 16, 3, 'rgba(20, 10, 30, 0.35)');
  const frame = buddy.mode === 'walking' ? frameAtDistance(a, 'walk', buddy.walked) : frameAt(a, 'relax', t);
  const left = buddy.facing < 0 ? footX - (b.frameW - b.footX) : footX - b.footX;
  drawFrame(ctx, roomArt.images.buddy, frame, b.frameW, b.frameH, left, Math.round(buddy.y) - b.footY, buddy.facing < 0);
}

function drawSteam(ctx, t) {
  const [mx, my] = MUG_TOP;
  for (let i = 0; i < 5; i++) {
    const p = (t * 0.25 + i / 5) % 1; // 0 → 1 as each wisp rises and fades
    const x = mx + Math.round(Math.sin(t * 1.1 + i * 1.7 + p * 4) * 3);
    const y = my - Math.floor(p * 26);
    ctx.fillStyle = `rgba(255, 250, 240, ${0.3 * (1 - p)})`;
    ctx.fillRect(x, y, 1, 3);
    ctx.fillRect(x + 1, y + 1, 1, 2);
  }
}

// ---------------------------------------------------------------------------
// Decorations, the chair and the buddy
// ---------------------------------------------------------------------------

// Collectibles that have their own hand-drawn PNG (art/items/<id>.png), by
// id; pets also by "<id>-asleep". Set by startRoom.
let itemArt = new Map();

/** A decoration's hand-drawn picture, if it has one (the asleep one for a sleeping pet). */
function artFor(item, pets) {
  if (item.pet && pets?.[item.id]?.asleep && itemArt.has(`${item.id}-asleep`)) return itemArt.get(`${item.id}-asleep`);
  return itemArt.get(item.id) ?? null;
}

/**
 * Where a decoration sits on screen: centred in its spot, standing on the
 * spot's surface (or hanging from it, for spots with anchor: 'top').
 * Built-in sprites are drawn SCALE times bigger; hand-drawn ones as they are.
 */
function itemBox({ item, spot }) {
  const image = itemArt.get(item.id);
  const size = image ? { w: image.width / SCALE, h: image.height / SCALE } : spriteSize(item.sprite);
  const w = size.w * SCALE;
  const h = size.h * SCALE;
  return {
    x: spot.x + Math.floor((spot.w - w) / 2),
    y: spot.anchor === 'top' ? spot.y : spot.y - h,
    w,
    h,
  };
}

/** A cared-for pet uses its awake or asleep sprite; everything else its usual one. */
function spriteFor(item, pets) {
  const pet = pets[item.id];
  if (!item.pet || !pet) return item.sprite;
  return pet.asleep ? item.pet.asleep : item.pet.awake;
}

/** Draws the decorations that belong to one layer, back (higher up) to front (lower down). */
function drawItems(ctx, placed, pets, layer, t) {
  placed
    .filter((placement) => placement.spot.layer === layer)
    .sort((a, b) => a.spot.y - b.spot.y)
    .forEach((placement) => drawDecoration(ctx, placement, pets, t));
}

/**
 * Everything standing on the floor (the chair, floor decorations, pets on
 * the rug, the buddy) is drawn from back to front by where it touches the
 * floor: further back (smaller y) first, closer (bigger y) last. This "depth
 * sorting" is how most 2D games let characters walk in front of and behind
 * furniture.
 */
function drawFloorByDepth(ctx, chairCanvas, placed, pets, { buddy, studying }, t) {
  const things = [
    { depth: CHAIR.floorY, draw: () => ctx.drawImage(chairCanvas, 0, 0) },
    { depth: buddyDepth(buddy), draw: () => drawBuddyWithShadow(ctx, buddy, studying, t) },
  ];
  for (const placement of placed) {
    if (placement.spot.layer !== 'floor') continue;
    things.push({ depth: placement.spot.y, draw: () => drawDecoration(ctx, placement, pets, t) });
  }
  things.sort((a, b) => a.depth - b.depth).forEach((thing) => thing.draw());
}

/** One decoration: its hand-drawn picture if it has one, otherwise its sprite, enlarged. */
function drawDecoration(ctx, placement, pets, t) {
  const box = itemBox(placement);
  const image = artFor(placement.item, pets);
  if (image) ctx.drawImage(image, box.x, box.y);
  else drawSpriteScaled(ctx, spriteFor(placement.item, pets), box.x, box.y, SCALE, t);
}

/** The buddy, with a soft shadow on the floor under their feet when they're standing. */
function drawBuddyWithShadow(ctx, buddy, studying, t) {
  if (buddy.mode === 'walking' || buddy.mode === 'relaxing') {
    ellipse(ctx, Math.round(buddy.x) + 20, Math.round(buddy.y), 16, 3, 'rgba(20, 10, 30, 0.35)');
  }
  drawBuddy(ctx, buddy, studying, t);
}

/**
 * Drawn on top of everything (and unlit) so it stays readable:
 * sleeping pets get floating z's; a pet that needs something shows a
 * thought bubble, but never during a focus session.
 */
function drawPetIcons(ctx, placed, pets, focusing, t) {
  for (const placement of placed) {
    const pet = pets[placement.item.id];
    if (!pet) continue;
    const box = itemBox(placement);
    const centerX = box.x + Math.floor(box.w / 2);

    if (pet.asleep) {
      for (let i = 0; i < 2; i++) {
        const p = (t * 0.4 + i * 0.5) % 1; // 0 → 1 as each z drifts up and fades
        ctx.globalAlpha = 1 - p;
        drawSpriteScaled(ctx, SPRITES.sleepZ, centerX + 4 + Math.floor(p * 8), Math.max(0, box.y - 8 - Math.floor(p * 16)), SCALE);
      }
      ctx.globalAlpha = 1;
      continue;
    }

    const need = focusing ? null : needingAttention(pet);
    if (need) {
      const x = centerX - 8;
      const y = Math.max(0, box.y - 20);
      drawSpriteScaled(ctx, SPRITES.bubble, x, y, SCALE);
      drawSpriteScaled(ctx, NEED_ICONS[need], x + 4, y + 2, SCALE);
    }
  }
}

function drawHeart(ctx, placement, elapsed) {
  const box = itemBox(placement);
  const p = elapsed / HEART_MS;
  ctx.globalAlpha = 1 - p * p; // fades out faster near the end
  drawSpriteScaled(ctx, SPRITES.heart, box.x + Math.floor(box.w / 2) - 4, Math.max(0, box.y - 12 - Math.floor(p * 20)), SCALE);
  ctx.globalAlpha = 1;
}

/** Four little sparkles that take turns blinking at the corners of an item. */
function drawCelebration(ctx, placement, elapsed, steady) {
  const box = itemBox(placement);
  const left = box.x - 5;
  const right = box.x + box.w + 4;
  const top = box.y - 5;
  const bottom = box.y + box.h + 4;
  const corners = [[left, top], [right, top], [right, bottom], [left, bottom]];
  const phase = Math.floor(elapsed / 250);
  corners.forEach(([x, y], i) => {
    if (steady || (phase + i) % 2 === 0) {
      rect(ctx, x, y - 2, 2, 6, '#fff6dc');
      rect(ctx, x - 2, y, 6, 2, '#fff6dc');
    }
  });
}
