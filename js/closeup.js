// The close-up view shown during focus: you sit right beside your study
// buddy, who leans over their notebook and writes while you work. Seeing
// someone else working quietly next to you ("body doubling") helps many
// people stay focused, which is the whole idea of study-with-me videos.
//
// It's framed like one: close in, the buddy large on the right, the window
// with your chosen view behind them, a lamp hanging over it, and a busy
// strip of desk along the bottom (laptop, plant, pencils, books, mug, the
// notebook). The
// wallpaper and lights are the ones you picked, and decorations come along:
// a pet naps on the windowsill, a wreath hangs in the window. They're drawn
// three times their size, since we're this close.
//
// How a frame is made:
//   1. The view outside, then weather on the glass (rain, frost).
//   2. The room, painted unlit. Everything that never moves is painted once
//      into a cache, so each frame only adds the buddy, the writing and
//      decorations.
//   3. Light (lighting.js): ambient, the lamp's cone with real shadows, the
//      laptop, the window light, the bulbs and the LED strip.
//   4. Things that glow by themselves, then light in the air: halos, the
//      lamp's beam, sunbeams with dust in them.

import { SPOTS } from './layout.js';
import { SPRITES } from './sprites.js';
import { bayer, drawSpriteScaled, ellipse, hexToRgb, makeRng, mixHex, rampColor, rect, shadeRect, spriteSize } from './pixel.js';
import { BOOK_COLORS, CERAMIC, CUSHION, DARK_WOOD, INK, LEAF, METAL, MINT, PAPER, PLASTIC, SHADE, WOOD } from './palette.js';
import { drawBookLying, drawBookSpine, drawFramed, drawLeaf, drawPot, softShadow } from './art-kit.js';
import { drawWallpaper } from './style-art.js';
import { drawCloseUpBuddy } from './closeup-buddy.js';
import { createArtCloseUp } from './art-scene.js';
import { band, castersFrom, castShadows, createLighting, shadeMaskByCasters } from './lighting.js';
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

export const CLOSEUP_W = 640;
export const CLOSEUP_H = 360;
const W = CLOSEUP_W;
const H = CLOSEUP_H;
const SCALE = 3; // decorations are drawn three times their size: we're very close

// The layout follows a sketch: a big window in the middle with curtains on
// both sides, a shelf of books in the top-left corner, a swing-arm lamp
// hanging over the window, a bookcase and the chair on the right, and the
// desk along the bottom (laptop, plant, books, mug, the notebook).

// The window: one wide pane, its top out of the picture.
const GLASS = Object.freeze({ x: 103, y: 0, w: 340, h: 226 });
const PANES = [GLASS];
const ROD_Y = 6; // the curtain rod, across the top
const CURTAINS = [
  { x: 58, w: 44, h: 229 },
  { x: 445, w: 52, h: 225 },
];
const SILL_Y = 226;
const DESK_TOP = 247; // where the desk meets the wall
const DESK_FRONT = 337; // the desk's front edge
const CORNER_SHELF = { x: 0, y: 60, w: 58 }; // the little shelf in the top-left corner
const BOOKCASE = { x: 548, top: 40, shelves: [92, 152, 212, 272, 332] };
const SHELF = { x: BOOKCASE.x, y: BOOKCASE.shelves[0], w: W - BOOKCASE.x };
const LED_STRIP = { x0: BOOKCASE.x + 2, x1: 640, y: SHELF.y + 6 };
const CHAIR = { x: 478, w: 128, top: 168 };
const MUG = { x: 230, y: 245, w: 38, h: 40 };
const NOTEBOOK = { top: 292, bottom: 328, lines: 8 };
const LAPTOP = { x: -40, screenTop: 190, hinge: 274, depth: 40 };
const PLANT = { x: 121, potBottom: 274 };
const PENCIL_CUP = { x: 116, bottom: 334 };

// The lamp: clamped to the corner shelf, two arms with a joint, and a big
// cone-shaped shade hanging over the window, pointing down at the notebook.
// Its light shines along AXIS.
const LAMP = { base: [54, 66], elbow: [96, 30], head: [150, 44] };
const AXIS = normalize([0.3, 0.95]);
const ACROSS = [AXIS[1], -AXIS[0]];
const SHADE_BACK = [LAMP.head[0] + 2, LAMP.head[1] + 2];
const SHADE_LENGTH = 42;
const SHADE_WIDTH = [11, 32]; // half its width at the back and at the mouth
const MOUTH = [SHADE_BACK[0] + AXIS[0] * SHADE_LENGTH, SHADE_BACK[1] + AXIS[1] * SHADE_LENGTH];
const LAMP_LIGHT = { x: MOUTH[0] - AXIS[0] * 4, y: MOUTH[1] - AXIS[1] * 4 };

// Light bouncing off the bright page lights the buddy's hand and face from
// below, and a soft fill from the lamp's side keeps them easy to see.
const PAGE_BOUNCE = { x: 236, y: 312 };
const FACE_FILL = { x: 350, y: 180 };
const SCREEN_GLOW = { x: 20, y: 232 };

// String lights in swoops under the curtain rod.
const HOOKS = [62, 134, 206, 278, 350, 422, 494];
const BULB_XS = Array.from({ length: Math.floor((488 - 68) / 15) + 1 }, (_, i) => 68 + i * 15);
const STRIP_COLORS = ['#b37bff', '#ff7ac8', '#6fa8ff', '#57d6c8']; // when the chosen lights have only one colour
const SCREEN_COLOR = [0.6, 0.78, 1];
const RAIN = { count: 60, seed: 5 };

function normalize([x, y]) {
  const d = Math.hypot(x, y);
  return [x / d, y / d];
}

function lightsY(x) {
  for (let i = 0; i < HOOKS.length - 1; i++) {
    if (x >= HOOKS[i] && x <= HOOKS[i + 1]) {
      const p = (x - HOOKS[i]) / (HOOKS[i + 1] - HOOKS[i]);
      return Math.round(ROD_Y + 3 + Math.sin(p * Math.PI) * 9);
    }
  }
  return ROD_Y + 3;
}

/**
 * Makes the close-up's canvases once; call draw() every frame. With
 * hand-drawn art (art.js), the art is drawn instead of the built-in scene,
 * with the same light, weather and decorations on top.
 */
export function createCloseUpView(art = null, itemArt = new Map()) {
  if (art) return createArtCloseUp(art, { width: W, height: H, closeUpDecor, drawDecor, decorDefaults: DECOR_SPOTS, scale: SCALE, itemArt });
  const canvas = makeCanvas();
  // The light is worked out pixel by pixel, so these canvases get read back every frame.
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  const interior = makeCanvas().getContext('2d', { willReadFrequently: true });
  for (const c of [ctx, interior]) c.imageSmoothingEnabled = false;
  const lighting = createLighting(W, H);
  let cache = null;

  return {
    canvas,
    /**
     * @param {object} scene  { theme, look, placed, pets, studying, progress, t, steady }
     *   progress (0 → 1) is how far the focus session is: the notebook page
     *   fills with writing as you go. steady = true for reduced motion
     *   (no LED flicker).
     */
    draw(scene) {
      const decor = closeUpDecor(scene.placed, scene.pets, DECOR_SPOTS, SCALE, itemArt);
      const key = JSON.stringify([scene.theme.id, scene.look.wall, decor.signature]);
      if (cache?.key !== key) cache = buildCache(key, scene, decor);
      drawFrame(ctx, interior, lighting, cache, decor, scene);
    },
  };
}

function makeCanvas() {
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  return canvas;
}

// ---- The parts that never move, painted once ---------------------------------

/**
 * Paints the still parts of the scene, and works out the shadows: which
 * pixels the lamp can't reach, and which the window light can't.
 */
function buildCache(key, { theme, look }) {
  const still = makeCanvas().getContext('2d');
  still.imageSmoothingEnabled = false;
  drawWall(still, look.wall);
  drawCornerShelf(still);
  drawPicture(still);
  drawWindow(still, theme.room);
  drawCurtains(still);
  drawLightsWire(still);
  drawDesk(still);
  drawBookcase(still);
  drawChair(still);
  drawLaptop(still);
  drawPlant(still);
  drawBooks(still);
  drawMug(still);
  drawPencilCup(still);
  drawEraser(still);
  drawLamp(still);
  drawNotebookPages(still);

  // Shadow casters: the solid things on the desk, and the buddy.
  const casterCtx = makeCanvas().getContext('2d', { willReadFrequently: true });
  drawPlant(casterCtx);
  drawPencilCup(casterCtx);
  drawBooks(casterCtx);
  drawMug(casterCtx);
  drawLaptop(casterCtx);
  drawChair(casterCtx);
  drawCloseUpBuddy(casterCtx, true, 0);
  const casters = castersFrom(casterCtx, W, H);

  return {
    key,
    still: still.canvas,
    lampShadow: castShadows(casters, W, H, LAMP_LIGHT, 230, { softness: 4, darkness: 0.85, step: 2 }),
    ...buildWindowLight(theme.lighting.window, casters),
    beam: buildLampBeam(),
  };
}

function drawWall(ctx, wall) {
  if (wall.wallStyle === 'logs') {
    const ramp = [mixHex(wall.logLine, INK, 0.3), wall.logLine, wall.log, wall.logHighlight, mixHex(wall.logHighlight, '#ffe0b0', 0.25)];
    for (let top = -6; top < DESK_TOP; top += 26) {
      shadeRect(ctx, 0, Math.max(0, top), W, Math.min(24, DESK_TOP - top), ramp, (x, y) => {
        const v = (y - top) / 24;
        return 0.15 + Math.sin(v * Math.PI) * 0.75 - v * 0.2 + Math.sin(x * 0.04 + top) * 0.05;
      });
      rect(ctx, 0, top + 24, W, 2, mixHex(wall.logHighlight, '#e8d2b0', 0.35));
    }
    return;
  }
  drawWallpaper(ctx, 0, 0, W, DESK_TOP, wall, 3);
  const rng = makeRng(31);
  ctx.fillStyle = mixHex(wall.wallpaper, INK, 0.12);
  for (let i = 0; i < 2600; i++) ctx.fillRect(Math.floor(rng() * W), Math.floor(rng() * DESK_TOP), 1, 1);
  ctx.fillStyle = mixHex(wall.wallpaper, '#ffffff', 0.08);
  for (let i = 0; i < 1500; i++) ctx.fillRect(Math.floor(rng() * W), Math.floor(rng() * DESK_TOP), 1, 1);
}

/** A row of standing books from x0 to x1 on a shelf at y, then one leaning on the last. */
function drawBookRow(ctx, x0, x1, y, seed, [minH, maxH] = [22, 36]) {
  const rng = makeRng(seed);
  let x = x0;
  while (x < x1 - 8) {
    const w = 6 + Math.floor(rng() * 6);
    const h = minH + Math.floor(rng() * (maxH - minH));
    drawBookSpine(ctx, x, y - h, Math.min(w, x1 - x), h, BOOK_COLORS[Math.floor(rng() * BOOK_COLORS.length)]);
    x += w;
  }
  return x;
}

function drawShelfBoard(ctx, x, y, w) {
  rect(ctx, x, y, w, 1, WOOD[6]);
  rect(ctx, x, y + 1, w, 5, WOOD[4]);
  rect(ctx, x, y + 6, w, 1, WOOD[1]);
  for (let px = x; px < x + w; px++) if (bayer(px, y + 8) < 0.5) rect(ctx, px, y + 8, 1, 1, 'rgba(20, 12, 35, 0.35)');
}

/** A small shelf in the top-left corner, packed with books; the lamp is clamped to it. */
function drawCornerShelf(ctx) {
  const { x, y, w } = CORNER_SHELF;
  drawBookRow(ctx, x, x + w - 6, y, 17, [38, 56]);
  drawShelfBoard(ctx, x, y, w);
  rect(ctx, x + w - 10, y + 7, 4, 14, WOOD[2]); // bracket
  rect(ctx, x + w - 10, y + 7, 1, 14, WOOD[5]);
}

/** A framed print on the wall below the corner shelf. */
function drawPicture(ctx) {
  drawFramed(ctx, 8, 104, 38, 48, '#c9a24f', (c, fx, fy, fw, fh) => {
    rect(c, fx, fy, fw, fh, '#f2b38a');
    rect(c, fx, fy + fh - 14, fw, 14, '#7d6aa8');
    rect(c, fx, fy + fh - 18, fw, 4, '#b28ad0');
    ellipse(c, fx + 12, fy + 10, 4, 4, '#fff6dc');
  });
}

/**
 * A tall bookcase on the right, behind the chair: books on every shelf, a
 * plant trailing over the top one, and an LED strip under it.
 */
function drawBookcase(ctx) {
  const { x, top, shelves } = BOOKCASE;
  const w = W - x;
  shadeRect(ctx, x, top, w, H - top, DARK_WOOD, (px) => 0.35 + ((px - x) / w) * 0.2); // the dark inside
  rect(ctx, x, top - 6, w, 6, WOOD[4]); // the top
  rect(ctx, x, top - 6, w, 1, WOOD[6]);
  rect(ctx, x, top - 6, 6, H - top + 6, WOOD[3]); // the side
  rect(ctx, x, top - 6, 1, H - top + 6, WOOD[5]);
  shelves.forEach((y, i) => {
    const end = drawBookRow(ctx, x + 8, i === 0 ? x + 40 : W, y, 61 + i * 13, [26, 44]);
    if (i === 0) {
      for (let k = 0; k < 30; k++) {
        const lx = end + 1 + Math.floor(k * 0.35);
        rect(ctx, lx, y - 1 - k, 7, 1, k === 29 ? INK : '#d08a5c'); // one book leaning
        rect(ctx, lx, y - 1 - k, 1, 1, '#ecb48c');
      }
    }
    drawShelfBoard(ctx, x + 6, y, w - 6);
  });
  rect(ctx, LED_STRIP.x0, LED_STRIP.y - 1, LED_STRIP.x1 - LED_STRIP.x0, 1, '#4a4560'); // the LED channel
  rect(ctx, LED_STRIP.x0, LED_STRIP.y, LED_STRIP.x1 - LED_STRIP.x0, 1, '#2b2638');
  // A trailing plant on the top shelf, hanging over its edge.
  const px = x + 84;
  drawPot(ctx, px, SHELF.y, 14, 12);
  for (const [dx, dy, len, angle] of [[0, -16, 10, -1.7], [-6, -14, 9, -2.4], [6, -14, 9, -0.9], [-4, 4, 9, 2.0], [2, 14, 8, 1.6], [-2, 26, 7, 1.9]]) {
    drawLeaf(ctx, px + dx, SHELF.y + dy, len, angle);
  }
}

function drawWindow(ctx, room) {
  const light = mixHex(room.frame, '#ffffff', 0.4);
  const dark = mixHex(room.frameShade, INK, 0.35);
  rect(ctx, GLASS.x - 9, 0, GLASS.w + 18, GLASS.h + 6, dark);
  rect(ctx, GLASS.x - 8, 0, GLASS.w + 16, GLASS.h + 5, room.frame);
  rect(ctx, GLASS.x - 8, 0, 1, GLASS.h + 5, light);
  rect(ctx, GLASS.x + GLASS.w + 7, 0, 1, GLASS.h + 5, room.frameShade);
  for (const pane of PANES) ctx.clearRect(pane.x, pane.y, pane.w, pane.h);
  rect(ctx, GLASS.x - 3, 0, 3, GLASS.h, room.frameShade); // the frame's inside edge, in shadow

  // A deep sill: lit top, shaded front, and its shadow on the wall below.
  const sx = GLASS.x - 16;
  const sw = GLASS.w + 32;
  rect(ctx, sx, SILL_Y, sw, 3, light);
  rect(ctx, sx, SILL_Y + 3, sw, 3, room.frame);
  rect(ctx, sx, SILL_Y + 6, sw, 5, room.frameShade);
  rect(ctx, sx, SILL_Y + 11, sw, 1, dark);
  for (let y = 0; y < 6; y++) {
    for (let x = sx; x < sx + sw; x++) if (bayer(x, y) < 0.8 - y * 0.13) rect(ctx, x, SILL_Y + 12 + y, 1, 1, 'rgba(20, 12, 35, 0.4)');
  }
}

/**
 * Curtains drawn back to both sides of the window: soft folds, lit on the
 * side facing the glass, hanging from a rod with round finials.
 */
function drawCurtains(ctx) {
  for (const { x, w, h } of CURTAINS) {
    const towardsGlass = x < GLASS.x ? 1 : -1;
    for (let py = ROD_Y + 2; py < ROD_Y + 2 + h; py++) {
      const flare = Math.round(((py - ROD_Y) / h) ** 2 * 5); // the hem spreads out a little
      const left = x - (towardsGlass < 0 ? 0 : flare);
      const right = x + w + (towardsGlass < 0 ? flare : 0);
      for (let px = left; px < right; px++) {
        const across = (px - left) / (right - left);
        const fold = Math.sin(across * Math.PI * 4 + (py - ROD_Y) * 0.012) * 0.22;
        const lit = towardsGlass > 0 ? across : 1 - across;
        let level = 0.38 + fold + lit * 0.3;
        if (py > ROD_Y + h - 3) level -= 0.2; // the hem
        rect(ctx, px, py, 1, 1, rampColor(CUSHION, level, px, py));
      }
    }
    for (let k = 0; k < 4; k++) rect(ctx, x + 4 + k * Math.floor(w / 4), ROD_Y + 2, 3, 3, METAL[3]); // rings
  }
  const rodLeft = CURTAINS[0].x - 8;
  const rodRight = CURTAINS[1].x + CURTAINS[1].w + 8;
  rect(ctx, rodLeft, ROD_Y - 1, rodRight - rodLeft, 3, METAL[1]);
  rect(ctx, rodLeft, ROD_Y - 1, rodRight - rodLeft, 1, METAL[4]);
  for (const fx of [rodLeft - 3, rodRight + 3]) {
    ellipse(ctx, fx, ROD_Y, 4, 4, METAL[0]);
    ellipse(ctx, fx, ROD_Y, 3, 3, METAL[3]);
    rect(ctx, fx - 1, ROD_Y - 2, 1, 1, METAL[4]);
  }
}

function drawLightsWire(ctx) {
  for (let x = HOOKS[0]; x <= HOOKS.at(-1); x++) rect(ctx, x, lightsY(x), 1, 1, '#2d2540');
  for (const x of BULB_XS) {
    rect(ctx, x - 1, lightsY(x) + 1, 3, 2, '#4a4560');
    rect(ctx, x - 1, lightsY(x) + 1, 1, 2, '#6f6a80');
  }
}

/**
 * The back of the buddy's chair, right behind them: a tall padded back in
 * dark fabric with lavender piping, like the room's.
 */
function drawChair(ctx) {
  const { x, w, top } = CHAIR;
  const cx = x + w / 2;
  for (let py = top; py < H; py++) {
    const ny = (py - top) / (H - top);
    const round = ny < 0.08 ? Math.sqrt(1 - ((0.08 - ny) / 0.08) ** 2) : 1; // a rounded top
    const half = (w / 2) * round * (1 - ny * 0.06);
    for (let px = Math.round(cx - half); px < cx + half; px++) {
      const nx = (px - cx) / (w / 2);
      const fromEdge = Math.min(px - (cx - half), cx + half - px, (py - top) * 1.5);
      if (fromEdge < 1.5) {
        rect(ctx, px, py, 1, 1, PLASTIC[0]);
        continue;
      }
      if (fromEdge < 4) {
        rect(ctx, px, py, 1, 1, CUSHION[fromEdge < 2.5 ? 3 : 2]); // piping
        continue;
      }
      let level = 0.62 - nx * 0.25 - ny * 0.25 + Math.cos(nx * 1.4) * 0.1;
      if (Math.abs(((px - x) % 22) - 11) < 0.6) level -= 0.3; // stitched channels
      rect(ctx, px, py, 1, 1, rampColor(PLASTIC, level, px, py));
    }
  }
}

function drawDesk(ctx) {
  for (let top = DESK_TOP; top < DESK_FRONT; top += 14) {
    const rng = makeRng(top * 7);
    const h = Math.min(14, DESK_FRONT - top);
    shadeRect(ctx, 0, top, BOOKCASE.x, h, WOOD, (x, y) => {
      const grain = Math.sin(x * 0.03 + Math.sin(x * 0.009 + top) * 2 + y * 0.7) * 0.06;
      return 0.6 + grain + ((y - top) / 14) * 0.05;
    });
    rect(ctx, 0, top, W, 1, WOOD[2]); // the seam between planks
    rect(ctx, 0, top + 1, W, 1, WOOD[5]);
    for (let i = 0; i < 4; i++) {
      const kx = Math.floor(rng() * W);
      const ky = top + 4 + Math.floor(rng() * 7);
      ellipse(ctx, kx, ky, 4, 1, WOOD[2]);
      rect(ctx, kx - 2, ky, 3, 1, WOOD[1]);
    }
  }
  for (let x = 0; x < W; x++) {
    rect(ctx, x, DESK_TOP, 1, 1, 'rgba(30, 15, 30, 0.5)'); // where the desk meets the wall
    if (bayer(x, DESK_TOP + 1) < 0.6) rect(ctx, x, DESK_TOP + 1, 1, 1, 'rgba(30, 15, 30, 0.35)');
    if (bayer(x, DESK_TOP + 2) < 0.3) rect(ctx, x, DESK_TOP + 2, 1, 1, 'rgba(30, 15, 30, 0.25)');
  }
  rect(ctx, 0, DESK_FRONT, W, 1, WOOD[6]); // the front edge catches the light
  rect(ctx, 0, DESK_FRONT + 1, W, H - DESK_FRONT - 2, WOOD[3]);
  rect(ctx, 0, H - 1, W, 1, WOOD[0]);
}

/** An open laptop at the far left, half out of the picture. Its screen glows (drawLaptopScreen). */
function drawLaptop(ctx) {
  const { x, screenTop, hinge, depth } = LAPTOP;
  // The base, lying on the desk in perspective: wider towards us.
  const widenAt = (y) => Math.round((y - hinge) * 0.5);
  for (let y = hinge; y < hinge + depth; y++) {
    const out = widenAt(y);
    rect(ctx, x - out, y, 132 + out * 2, 1, y === hinge ? METAL[4] : rampColor(METAL, 0.65 - (y - hinge) / (depth * 2.5), x, y));
  }
  for (let r = 0; r < 6; r++) {
    const ky = hinge + 4 + r * 5;
    for (let k = 0; k < 13; k++) rect(ctx, x + 6 + k * 9 - Math.round(r * 2.2), ky, 7, 3, METAL[1]); // keys
  }
  rect(ctx, x + 44 - 6, hinge + depth - 8, 34, 5, METAL[3]); // touchpad
  rect(ctx, x - widenAt(hinge + depth) - 4, hinge + depth, 140 + widenAt(hinge + depth) * 2, 2, 'rgba(20, 10, 30, 0.45)');
  // The lid, leaning back.
  for (let y = screenTop; y < hinge; y++) {
    const lean = Math.round((hinge - y) * 0.12);
    rect(ctx, x + lean, y, 88, 1, METAL[2]);
    rect(ctx, x + lean, y, 2, 1, METAL[4]);
    rect(ctx, x + lean + 86, y, 2, 1, METAL[1]);
  }
  rect(ctx, x + 8, screenTop, 84, 1, METAL[4]);
}

/** The laptop's screen content, glowing: a notes app, with the focus timer's bar in the corner. */
function drawLaptopScreen(ctx, progress, accent) {
  const { x, screenTop, hinge } = LAPTOP;
  for (let y = screenTop + 4; y < hinge - 3; y++) {
    const lean = Math.round((hinge - y) * 0.12);
    const row = y - screenTop - 4;
    rect(ctx, x + lean + 4, y, 80, 1, row < 7 ? '#2e2560' : '#1e1940');
    rect(ctx, x + lean + 4, y, 16, 1, '#26204e'); // sidebar
    if (row > 10 && row % 6 === 0) rect(ctx, x + lean + 24, y, 30 + ((row * 7) % 26), 1, '#9d8ad6'); // lines of notes
    if (row > 10 && row % 6 === 3) rect(ctx, x + lean + 24, y, 18 + ((row * 5) % 30), 1, '#6a59a8');
  }
  const barY = screenTop + 8;
  const lean = Math.round((hinge - barY) * 0.12);
  rect(ctx, x + lean + 56, barY, 24, 2, '#3f3570');
  rect(ctx, x + lean + 56, barY, Math.round(24 * Math.max(0, Math.min(1, progress))), 2, accent);
}

function drawPlant(ctx) {
  const { x: cx, potBottom } = PLANT;
  const stems = [[-6, -48], [10, -52], [-18, -36], [20, -34], [0, -70], [-26, -18], [28, -16]];
  for (const [dx, dy] of stems) {
    for (let i = 0; i <= 16; i++) {
      const p = i / 16;
      rect(ctx, Math.round(cx + dx * p), Math.round(potBottom - 34 + dy * p), 1, 1, LEAF[1]);
    }
  }
  drawPot(ctx, cx, potBottom, 40, 34);
  softShadow(ctx, cx, potBottom + 1, 22, 3, 0.45);
  // Leaves: [x, height above the pot's bottom, length, angle].
  const leaves = [
    [-6, 82, 20, -1.75], [10, 86, 19, -1.2], [-18, 72, 18, -2.4], [20, 70, 18, -0.6],
    [0, 102, 17, -1.55], [-26, 56, 16, -2.9], [28, 54, 16, -0.25], [-8, 114, 14, -1.9],
    [12, 110, 14, -1.0], [-20, 40, 13, 2.8], [26, 38, 13, 0.4], [4, 92, 15, -1.4],
  ];
  for (const [dx, up, len, angle] of leaves) drawLeaf(ctx, cx + dx, potBottom - up, len, angle);
}

function drawPencilCup(ctx) {
  const { x, bottom } = PENCIL_CUP;
  const top = bottom - 32;
  const pencils = [
    [[x + 12, top + 4], [x + 6, top - 36], '#f2c14e'],
    [[x + 18, top + 4], [x + 22, top - 32], '#9a7ac0'],
    [[x + 14, top + 4], [x + 14, top - 40], '#e89fb4'],
    [[x + 22, top + 4], [x + 30, top - 26], '#6fa8d6'],
  ];
  for (const [[x0, y0], [x1, y1], color] of pencils) {
    for (let i = 0; i <= 40; i++) {
      const p = i / 40;
      const px = Math.round(x0 + (x1 - x0) * p);
      const py = Math.round(y0 + (y1 - y0) * p);
      rect(ctx, px, py, 3, 1, p > 0.9 ? '#e8c39e' : color);
      rect(ctx, px + 2, py, 1, 1, p > 0.9 ? '#c9a07a' : mixHex(color, INK, 0.3));
    }
    rect(ctx, x1, y1 - 1, 2, 1, INK);
  }
  // Scissors, their handles sticking up.
  for (const [hx, hy] of [[x + 4, top - 24], [x + 10, top - 20]]) {
    for (let a = 0; a < 24; a++) {
      const ang = (a / 24) * Math.PI * 2;
      rect(ctx, Math.round(hx + Math.cos(ang) * 4), Math.round(hy + Math.sin(ang) * 5), 1, 1, '#4b5fa8');
    }
  }
  rect(ctx, x + 6, top - 16, 2, 18, '#c9c3d6');
  rect(ctx, x, top, 30, 32, MINT[0]);
  shadeRect(ctx, x + 1, top + 1, 28, 30, MINT, (px) => 0.9 - ((px - x - 1) / 27) ** 1.2 * 0.75);
  rect(ctx, x + 1, top + 1, 28, 2, MINT[4]);
  rect(ctx, x + 5, top + 6, 2, 20, MINT[4]);
  softShadow(ctx, x + 15, top + 32, 17, 2, 0.45);
}

/** A stack of books lying on the desk; a decoration can stand on top. */
const BOOK_STACK = [
  [148, 273, 78, 10, '#5d6fa8'],
  [152, 264, 70, 9, '#e6c27a'],
  [150, 256, 66, 8, '#b0577e'],
  [156, 249, 58, 7, '#7fae8a'],
];
const BOOKS_TOP = BOOK_STACK.at(-1)[1] - BOOK_STACK.at(-1)[3] + 1;

function drawBooks(ctx) {
  for (const [x, y, w, h, color] of BOOK_STACK) drawBookLying(ctx, x, y, w, h, color);
  softShadow(ctx, 187, BOOK_STACK[0][1] + 10, 42, 2, 0.45);
}

/** A big mug of tea, with a crescent moon on its side. */
function drawMug(ctx) {
  const { x, y, w, h } = MUG;
  // The handle: a thick ring on the right.
  for (let a = -1.4; a <= 1.4; a += 0.08) {
    const hx = Math.round(x + w - 2 + Math.cos(a) * 9);
    const hy = Math.round(y + h * 0.45 + Math.sin(a) * 11);
    rect(ctx, hx - 1, hy - 1, 5, 4, CERAMIC[0]);
  }
  for (let a = -1.3; a <= 1.3; a += 0.08) {
    rect(ctx, Math.round(x + w - 2 + Math.cos(a) * 9), Math.round(y + h * 0.45 + Math.sin(a) * 11), 3, 2, a < 0 ? CERAMIC[3] : CERAMIC[2]);
  }
  rect(ctx, x - 1, y - 1, w + 2, h + 2, CERAMIC[0]);
  shadeRect(ctx, x, y, w, h, CERAMIC, (px) => 0.92 - ((px - x) / (w - 1)) ** 1.3 * 0.78);
  rect(ctx, x + 5, y + 6, 3, h - 14, CERAMIC[5]); // glaze shine
  rect(ctx, x + 8, y + 8, 1, 10, CERAMIC[5]);
  const [mx, my] = [x + Math.round(w * 0.58), y + Math.round(h * 0.45)];
  for (let py = my - 7; py <= my + 7; py++) {
    for (let px = mx - 7; px <= mx + 7; px++) {
      const inMoon = Math.hypot(px - mx, py - my) <= 6.5 && Math.hypot(px - mx - 4, py - my + 2) > 5.5;
      if (inMoon) rect(ctx, px, py, 1, 1, '#fff6dc');
    }
  }
  rect(ctx, x, y, w, 2, CERAMIC[4]);
  ellipse(ctx, x + Math.floor(w / 2), y + 2, Math.floor(w / 2) - 3, 1, '#5a3628'); // tea
  rect(ctx, x + Math.floor(w / 2) + 4, y + 2, 6, 1, '#9a6a48');
  softShadow(ctx, x + Math.floor(w / 2), y + h + 1, w / 2 + 4, 2, 0.45);
}

/** An eraser at the front of the desk, by the notebook. */
function drawEraser(ctx) {
  rect(ctx, 304, 330, 16, 6, '#e89fb4');
  rect(ctx, 304, 330, 16, 1, '#f6c8d6');
  rect(ctx, 311, 330, 3, 6, '#f3eee6');
}

/** The lamp: clamped to the corner shelf. The inside of its shade glows; that's drawn later, in drawLampMouth. */
function drawLamp(ctx) {
  const [bx, by] = LAMP.base;
  rect(ctx, bx - 7, by - 10, 14, 14, METAL[0]); // the clamp
  rect(ctx, bx - 6, by - 9, 12, 12, METAL[2]);
  rect(ctx, bx - 6, by - 9, 12, 1, METAL[4]);
  rect(ctx, bx - 2, by + 3, 4, 6, METAL[1]); // its screw
  drawArm(ctx, [bx, by - 6], LAMP.elbow);
  drawArm(ctx, LAMP.elbow, LAMP.head);
  // A spring along the lower arm, just beside it.
  const [ex, ey] = LAMP.elbow;
  const len = Math.hypot(ex - bx, ey - by);
  const side = [-(ey - by) / len, (ex - bx) / len];
  for (let i = 0; i < 18; i++) {
    const p = 0.12 + i * 0.045;
    const sx = Math.round(bx + (ex - bx) * p + side[0] * 5);
    const sy = Math.round(by - 6 + (ey - by + 6) * p + side[1] * 5);
    rect(ctx, sx + (i % 2), sy, 2, 1, METAL[4]);
  }
  for (const [jx, jy] of [LAMP.elbow, LAMP.head]) {
    ellipse(ctx, jx, jy, 5, 5, METAL[0]);
    ellipse(ctx, jx, jy, 4, 4, METAL[3]);
    ellipse(ctx, jx, jy, 1, 1, METAL[0]);
  }
  const [sx, sy] = SHADE_BACK;
  const [backHalf, mouthHalf] = SHADE_WIDTH;
  const reach = SHADE_LENGTH + mouthHalf;
  for (let py = sy - reach; py <= sy + reach; py++) {
    for (let px = sx - reach; px <= sx + reach; px++) {
      const u = (px - sx) * AXIS[0] + (py - sy) * AXIS[1];
      const v = (px - sx) * ACROSS[0] + (py - sy) * ACROSS[1];
      if (u < -3 || u > SHADE_LENGTH) continue;
      const half = backHalf + (Math.max(0, u) / SHADE_LENGTH) * (mouthHalf - backHalf);
      if (Math.abs(v) > half) continue;
      const edge = Math.abs(v) > half - 1.2 || u < -2;
      const level = edge ? 0 : 0.55 + (v / half) * 0.35 - (u / SHADE_LENGTH) * 0.15;
      rect(ctx, px, py, 1, 1, rampColor(SHADE, level, px, py));
    }
  }
}

function drawArm(ctx, [x0, y0], [x1, y1]) {
  const steps = Math.ceil(Math.hypot(x1 - x0, y1 - y0));
  for (let i = 0; i <= steps; i++) {
    const px = Math.round(x0 + ((x1 - x0) * i) / steps);
    const py = Math.round(y0 + ((y1 - y0) * i) / steps);
    rect(ctx, px - 2, py, 5, 1, METAL[0]);
    rect(ctx, px - 1, py, 3, 1, METAL[2]);
    rect(ctx, px - 1, py, 1, 1, METAL[4]);
  }
}

// The notebook is a slanted shape, so it looks like it's lying on the desk.
const leftAt = (y) => Math.round(166 - (y - NOTEBOOK.top) * 0.35);
const rightAt = (y) => Math.round(299 - (y - NOTEBOOK.top) * 0.15);
const spineAt = (y) => Math.round(232 - (y - NOTEBOOK.top) * 0.25);
const LINE_ROWS = Array.from({ length: NOTEBOOK.lines }, (_, i) => NOTEBOOK.top + 5 + i * 4);

function drawNotebookPages(ctx) {
  const { top, bottom } = NOTEBOOK;
  softShadow(ctx, Math.round((leftAt(bottom) + rightAt(bottom)) / 2), bottom + 4, 72, 3, 0.45);
  for (let y = top - 1; y <= bottom + 3; y++) {
    rect(ctx, leftAt(y) - 3, y, rightAt(y) - leftAt(y) + 6, 1, y > bottom + 1 ? '#5d4a8c' : '#8a72c4'); // cover
  }
  for (let y = top; y <= bottom; y++) {
    const l = leftAt(y);
    const r = rightAt(y);
    const s = spineAt(y);
    shadeRect(ctx, l, y, r - l, 1, PAPER, (px) => 1 - Math.max(0, 1 - Math.abs(px - s) / 10) * 0.7);
    rect(ctx, s, y, 1, 1, PAPER[0]);
  }
  for (const y of LINE_ROWS) {
    rect(ctx, leftAt(y) + 3, y + 2, spineAt(y) - leftAt(y) - 7, 1, '#d6deee'); // ruled lines
    rect(ctx, spineAt(y) + 4, y + 2, rightAt(y) - spineAt(y) - 7, 1, '#d6deee');
    scribble(ctx, leftAt(y) + 9, spineAt(y) - 5, y, y); // the left page is already full
  }
  for (let y = top; y <= bottom; y++) rect(ctx, leftAt(y) + 6, y, 1, 1, '#f0b4bc'); // margin line
  for (let i = 0; i < 2; i++) rect(ctx, leftAt(bottom) + 2, bottom + 1 + i, rightAt(bottom) - leftAt(bottom) - 2, 1, PAPER[1 - i]); // page edges
  for (let i = 0; i < 9; i++) rect(ctx, spineAt(bottom) + 3, bottom + 1 + i, 3, 1, '#e0565b'); // ribbon
}

/** Handwriting: wobbly strokes with gaps between words, some letters taller. */
function scribble(ctx, x0, x1, y, seed) {
  const rng = makeRng(seed);
  for (let x = x0; x < x1; x++) {
    const r = rng();
    if (r < 0.15) continue;
    rect(ctx, x, y, 1, 1, '#4b5596');
    if (r > 0.78) rect(ctx, x, y - 1, 1, 1, '#4b5596');
    if (r > 0.95) rect(ctx, x, y - 2, 1, 1, '#4b5596');
  }
}

// ---- Light geometry, worked out once per window view --------------------------

/**
 * Sun or moonlight through the panes: a strip on the sill, two bright
 * panes on the desk (the window bar's shadow between them), and beams in
 * the air on the way.
 */
function buildWindowLight(win, casters) {
  const patch = new Float32Array(W * H);
  const shafts = new Float32Array(W * H);
  const cx = GLASS.x + GLASS.w / 2;
  for (let x = GLASS.x - 16; x < GLASS.x + GLASS.w + 16; x++) {
    for (let y = SILL_Y; y < SILL_Y + 3; y++) patch[y * W + x] = 0.6;
  }
  for (let y = DESK_TOP + 2; y < DESK_FRONT; y++) {
    const depth = (y - DESK_TOP) / (DESK_FRONT - DESK_TOP);
    const spread = 1 + depth * 0.2;
    const shift = win.slant * depth * 90;
    for (const pane of PANES) {
      const a = Math.round(cx + (pane.x - cx) * spread + shift);
      const b = Math.round(cx + (pane.x + pane.w - cx) * spread + shift);
      for (let x = Math.max(0, a); x < Math.min(W, b); x++) {
        const edge = Math.min(x - a, b - 1 - x) < 3 ? 0.6 : 1;
        patch[y * W + x] = band((1 - depth * 0.35) * edge, 4, x, y);
      }
    }
  }
  shadeMaskByCasters(patch, casters, W, H, -win.slant * 0.7, -1, 90);
  // The patches lie on the sill and the desk, not on the buddy or the things in front.
  for (let i = 0; i < W * H; i++) if (casters[i]) patch[i] = 0;

  const startY = GLASS.y + 60;
  for (let y = startY; y < DESK_FRONT; y++) {
    const p = (y - startY) / (DESK_FRONT - startY);
    const shift = win.slant * p * 70;
    for (const pane of PANES) {
      for (let x = Math.max(0, Math.round(pane.x + shift)); x < Math.min(W, Math.round(pane.x + pane.w + shift)); x++) {
        const streak = 0.65 + 0.35 * Math.sin(x * 0.19 + y * 0.06) * Math.sin(x * 0.045);
        shafts[y * W + x] = band(Math.sin(p * Math.PI) * streak, 3, x, y);
      }
    }
  }
  return { patch, shafts };
}

/** The lamp's light, faintly visible in the air as a cone. */
function buildLampBeam() {
  const beam = new Float32Array(W * H);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const dx = x - LAMP_LIGHT.x;
      const dy = y - LAMP_LIGHT.y;
      const d = Math.hypot(dx, dy);
      if (d > 150 || d < 1) continue;
      const along = (dx * AXIS[0] + dy * AXIS[1]) / d;
      if (along < 0.82) continue;
      beam[y * W + x] = band((1 - d / 150) * ((along - 0.82) / 0.18), 3, x, y);
    }
  }
  return beam;
}

// ---- Every frame -------------------------------------------------------------------

function drawFrame(ctx, interior, lighting, cache, decor, { theme, look, studying, progress, t, steady }) {
  const win = theme.lighting.window;

  // 1. Outside, and weather on the glass.
  ctx.clearRect(0, 0, W, H);
  ctx.save();
  ctx.beginPath();
  ctx.rect(GLASS.x, GLASS.y, GLASS.w, GLASS.h);
  ctx.clip();
  theme.drawView(ctx, GLASS, t);
  if (win.glass === 'rain') drawRainOnGlass(ctx, GLASS, t, RAIN);
  if (win.glass === 'frost') drawFrost(ctx, PANES);
  drawGlassShine(ctx);
  ctx.restore();

  // 2. The room, unlit.
  interior.clearRect(0, 0, W, H);
  interior.drawImage(cache.still, 0, 0);
  for (const placed of decor.window) drawDecor(interior, placed, t);
  if (decor.sill) drawDecor(interior, decor.sill, t);
  if (decor.shelf) drawDecor(interior, decor.shelf, t);
  if (decor.desk) drawDecor(interior, decor.desk, t);
  drawWriting(interior, progress);
  drawCloseUpBuddy(interior, studying, t);

  // 3. Light.
  const glow = hexToRgb(look.glowColor);
  const bulbs = bulbStates(look.lights, BULB_XS.length, t, steady);
  const stripColors = new Set(look.lights.colors).size > 1 ? look.lights.colors : STRIP_COLORS;
  const strip = { color: ledColor(stripColors, 0, steady ? 0 : t), brightness: ledBrightness(99, t, steady) };
  const flash = win.flashes && !steady ? fireworkFlash(t) : { strength: 0, color: win.color };
  const windowColor = win.color.map((c, i) => c + (flash.color[i] - c) * Math.min(1, flash.strength));

  lighting.begin(theme.lighting.ambient, 0.4);
  lighting.addPoint({
    ...LAMP_LIGHT,
    radius: 300,
    color: glow,
    strength: theme.lighting.lamp * 1.1,
    shadow: cache.lampShadow,
    cone: { dx: AXIS[0], dy: AXIS[1], inner: 0.9, outer: 0.66, spill: 0.16 },
    halo: 0.5,
    haloRadius: 16,
  });
  // Light bouncing off the bright page lights the buddy's hands and face from
  // below, and a soft fill from the lamp's side keeps them easy to see.
  lighting.addPoint({ ...PAGE_BOUNCE, radius: 150, color: glow, strength: theme.lighting.lamp * 0.32, bands: 4 });
  lighting.addPoint({ ...FACE_FILL, radius: 240, color: glow, strength: 0.28 + theme.lighting.lamp * 0.22, bands: 4 });
  lighting.addPoint({ ...SCREEN_GLOW, radius: 150, color: SCREEN_COLOR, strength: 0.42, bands: 4, halo: 0.1, haloRadius: 40 });
  lighting.addMask(cache.patch, windowColor, win.strength + flash.strength * 0.5);
  if (win.glass === 'rain') addRainShadows(lighting, cache.patch, win.slant, t);
  if (flash.strength > 0) {
    lighting.addPoint({ x: GLASS.x + GLASS.w / 2, y: 120, radius: 480, color: flash.color, strength: flash.strength * 0.22, bands: 4 });
  }
  BULB_XS.forEach((x, i) => {
    lighting.addPoint({ x, y: lightsY(x) + 6, radius: 30, color: bulbs[i].color, strength: 0.3 * bulbs[i].brightness, bands: 3, halo: 0.28 * bulbs[i].brightness, haloRadius: 8 });
  });
  lighting.addLine({
    x0: LED_STRIP.x0, y0: LED_STRIP.y + 1, x1: LED_STRIP.x1, y1: LED_STRIP.y + 1,
    radius: 80, color: strip.color, strength: 0.6 * strip.brightness, halo: 0.25 * strip.brightness, haloRadius: 5,
  });
  const decorLights = [...decor.window, decor.desk, decor.shelf].filter((d) => d?.item.glow);
  decorLights.forEach(({ item, box }, i) => {
    const { x, y, radius, color } = item.glow;
    const flicker = steady ? 1 : 0.92 + 0.08 * Math.sin(t * 7 + i * 3) * Math.sin(t * 3.1 + i);
    lighting.addPoint({
      x: box.x + x * SCALE, y: box.y + y * SCALE, radius: radius * SCALE * 2.2, color: hexToRgb(color),
      strength: 0.55 * flicker, bands: 4, halo: 0.3, haloRadius: radius * SCALE * 0.8,
    });
  });
  lighting.applyTo(interior);
  ctx.drawImage(interior.canvas, 0, 0);

  // 4. Things that glow by themselves, then light in the air.
  const accent = rgbToHex(strip.color, 1, 0.2);
  drawLaptopScreen(ctx, progress, accent);
  drawLampMouth(ctx);
  BULB_XS.forEach((x, i) => drawBulbShape(ctx, x, lightsY(x) + 3, look.lights.bulb, bulbs[i].color, bulbs[i].brightness));
  const ledBody = rgbToHex(strip.color, strip.brightness);
  const ledCore = rgbToHex(strip.color, strip.brightness, 0.55);
  for (let x = LED_STRIP.x0 + 1; x < LED_STRIP.x1; x += 4) {
    rect(ctx, x, LED_STRIP.y, 2, 1, ledBody);
    rect(ctx, x, LED_STRIP.y, 1, 1, ledCore);
  }
  if (decor.sill?.asleep) drawSleepZ(ctx, decor.sill.box, t);
  lighting.addAirMask(cache.shafts, windowColor, win.shafts + flash.strength * 0.04);
  lighting.addAirMask(cache.beam, glow, 0.08 * theme.lighting.lamp);
  addDust(lighting, cache.shafts, W, H, windowColor, steady ? 0 : t, { count: 160, amount: win.shafts > 0.1 ? 0.45 : 0.25 });
  drawSteam(ctx, steady ? 0 : t);
  lighting.applyAir(ctx);
}

function drawGlassShine(ctx) {
  ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
  for (let i = 0; i < 60; i++) ctx.fillRect(GLASS.x + 20 + i, GLASS.y + 150 - i, 5, 1);
  for (let i = 0; i < 26; i++) ctx.fillRect(GLASS.x + 54 + i, GLASS.y + 128 - i, 3, 1);
  for (let i = 0; i < 40; i++) ctx.fillRect(GLASS.x + GLASS.w - 70 + i, GLASS.y + GLASS.h - 6 - i, 4, 1);
}

/** Shadows of the raindrops on the glass, sliding down within the window light. */
function addRainShadows(lighting, patch, slant, t) {
  const cx = GLASS.x + GLASS.w / 2;
  for (const { u, v } of rainShadowSpots(GLASS, t, RAIN)) {
    if (v < 0 || v > 1) continue;
    const depth = 1 - v; // light through the top of the glass lands furthest forward
    const x = Math.round(cx + (GLASS.x + u * GLASS.w - cx) * (1 + depth * 0.2) + slant * depth * 90);
    const y = Math.round(DESK_TOP + 2 + depth * (DESK_FRONT - DESK_TOP - 3));
    for (const [dx, dy] of [[0, 0], [1, 0], [0, 1], [1, 1]]) {
      if (patch[(y + dy) * W + x + dx] > 0) lighting.shade(x + dx, y + dy, 0.3);
    }
  }
}

/** The writing on the right-hand page: it grows with the focus session. */
function drawWriting(ctx, progress) {
  const spans = LINE_ROWS.map((y) => ({ y, x0: spineAt(y) + 5, x1: rightAt(y) - 4 }));
  let ink = Math.max(0, Math.min(1, progress)) * spans.reduce((sum, s) => sum + (s.x1 - s.x0), 0);
  for (const { y, x0, x1 } of spans) {
    if (ink <= 0) break;
    scribble(ctx, x0, Math.min(x1, x0 + Math.round(ink)), y, y + 100);
    ink -= x1 - x0;
  }
}

/** The lamp's mouth: a glowing ring with the bulb inside. */
function drawLampMouth(ctx) {
  const half = SHADE_WIDTH[1] - 1;
  for (let i = -half; i <= half; i++) {
    const px = Math.round(MOUTH[0] + ACROSS[0] * i);
    const py = Math.round(MOUTH[1] + ACROSS[1] * i);
    rect(ctx, px, py, 1, 1, Math.abs(i) < half * 0.65 ? '#fffbe8' : '#ffe9b0');
    rect(ctx, px - 1, py - 1, 1, 1, '#ffd98a');
  }
  ellipse(ctx, Math.round(MOUTH[0] - AXIS[0] * 5), Math.round(MOUTH[1] - AXIS[1] * 5), 3, 3, '#ffffff');
}

function drawSteam(ctx, t) {
  for (let i = 0; i < 6; i++) {
    const p = (t * 0.22 + i / 6) % 1; // 0 → 1 as each wisp rises and fades
    const x = MUG.x + Math.floor(MUG.w / 2) + Math.round(Math.sin(t * 1.1 + i * 1.7 + p * 4) * 4);
    const y = MUG.y - 3 - Math.floor(p * 40);
    ctx.fillStyle = `rgba(255, 250, 240, ${0.3 * (1 - p)})`;
    ctx.fillRect(x, y, 1, 4);
    ctx.fillRect(x + 1, y + 1, 1, 3);
  }
}

// ---- For hand-drawn art ------------------------------------------------------

/**
 * This close-up's layout as a scene.json (see art.js and ART_BRIEF.md):
 * where the window, lights, notebook and decorations are. Art drawn on top
 * of the template (art/templates) can start from it.
 */
export function closeUpExample() {
  const r2 = (v) => Math.round(v * 100) / 100;
  const firstRow = LINE_ROWS[0];
  return {
    lighting: 'dynamic',
    layers: { back: 'back.png', front: 'front.png', emissive: 'emissive.png', casters: 'casters.png' },
    window: GLASS,
    panes: PANES,
    surfaces: { sill: SILL_Y, desk: { top: DESK_TOP, bottom: DESK_FRONT } },
    lights: {
      lamps: [{ x: Math.round(LAMP_LIGHT.x), y: Math.round(LAMP_LIGHT.y), dx: r2(AXIS[0]), dy: r2(AXIS[1]), radius: 300, strength: 1.1, inner: 0.9, outer: 0.66, spill: 0.16 }],
      fills: [{ ...PAGE_BOUNCE, radius: 150, strength: 0.32 }, { ...FACE_FILL, radius: 240, strength: 0.5 }],
      screens: [{ ...SCREEN_GLOW, radius: 150, strength: 0.42 }],
      bulbs: BULB_XS.map((x) => [x, lightsY(x) + 3]),
      ledStrips: [{ x0: LED_STRIP.x0, y0: LED_STRIP.y, x1: LED_STRIP.x1, y1: LED_STRIP.y }],
    },
    writing: {
      x: spineAt(firstRow) + 5,
      y: firstRow,
      w: rightAt(firstRow) - 4 - (spineAt(firstRow) + 5),
      lines: NOTEBOOK.lines,
      gap: 4,
      slant: -0.25,
      ink: '#4b5596',
    },
    steam: [MUG.x + Math.floor(MUG.w / 2), MUG.y - 3],
    decor: { scale: SCALE, spots: DECOR_SPOTS },
    buddy: {
      sheet: 'buddy.png',
      frameW: 288,
      frameH: 320,
      x: 236,
      y: 40,
      animations: {
        write: { frames: [0, 1, 2, 3], fps: 6 },
        rest: { frames: [4], fps: 1 },
        paused: { frames: [5], fps: 1 },
        blinkWrite: { frames: [6], fps: 1 },
        blinkPaused: { frames: [7], fps: 1 },
      },
    },
  };
}

// ---- Decorations brought over from the room --------------------------------

// Where decorations from the room appear in the close-up: [x, y], centred
// on x. Window and rod items hang from y; the others stand on it.
const DECOR_SPOTS = Object.freeze({
  window: [245, ROD_Y + 12],
  rodLeft: [CURTAINS[0].x + CURTAINS[0].w / 2, ROD_Y + 3],
  rodRight: [CURTAINS[1].x + CURTAINS[1].w / 2, ROD_Y + 3],
  sill: [215, SILL_Y],
  shelf: [608, SHELF.y],
  desk: [187, BOOKS_TOP],
});

/**
 * Picks which of the room's decorations appear up close, and where:
 * the window decoration and the curtain-rod ones hang in the window, a pet
 * (or plush) from the bed or rug naps on the windowsill, a bird sits on the
 * shelf, and the first desk item stands on the desk. `spots` says where
 * (see DECOR_SPOTS); hand-drawn scenes have their own. `itemArt` has the
 * hand-drawn close-up pictures (art/items/closeup/<id>.png), drawn as they
 * are instead of the enlarged sprite.
 */
export function closeUpDecor(placed, pets, spots, scale, itemArt = new Map()) {
  const at = (spotId) => placed.find((p) => p.spot === SPOTS[spotId]);
  const ofType = (type) => placed.filter((p) => p.spot.type === type);
  const place = (placement, x, y, anchor) => {
    if (!placement) return null;
    const sprite = spriteFor(placement.item, pets);
    const asleep = Boolean(pets[placement.item.id]?.asleep);
    const id = placement.item.id;
    const image = (asleep && itemArt.get(`closeup/${id}-asleep`)) || itemArt.get(`closeup/${id}`) || null;
    const w = image ? image.width : spriteSize(sprite).w * scale;
    const h = image ? image.height : spriteSize(sprite).h * scale;
    const box = { x: Math.round(x - w / 2), y: anchor === 'top' ? y : y - h, w, h };
    return { item: placement.item, sprite, image, box, asleep };
  };

  const rugItems = ofType('rug').sort((a, b) => Boolean(b.item.pet) - Boolean(a.item.pet)); // pets first
  const chosen = {
    window: [
      place(ofType('window')[0], ...spots.window, 'top'),
      place(at('rodLeft'), ...spots.rodLeft, 'top'),
      place(at('rodRight'), ...spots.rodRight, 'top'),
    ].filter(Boolean),
    sill: place(rugItems[0], ...spots.sill),
    shelf: place(ofType('perch')[0], ...spots.shelf),
    desk: place(at('deskLeft') ?? ofType('desk')[0], ...spots.desk),
    scale,
  };
  // Which decorations are where, so the cached room is redrawn when they change.
  chosen.signature = [...chosen.window, chosen.sill, chosen.shelf, chosen.desk].map((d) => d?.item.id ?? '-').join(',');
  return chosen;
}

/** A cared-for pet uses its awake or asleep sprite; everything else its usual one. */
function spriteFor(item, pets) {
  const pet = pets[item.id];
  if (!item.pet || !pet) return item.sprite;
  return pet.asleep ? item.pet.asleep : item.pet.awake;
}

/** One decoration: its hand-drawn picture if it has one, otherwise its sprite, enlarged. */
export function drawDecor(ctx, { sprite, image, box }, t, scale = SCALE) {
  if (image) ctx.drawImage(image, box.x, box.y);
  else drawSpriteScaled(ctx, sprite, box.x, box.y, scale, t);
}


/** Z's floating up from a pet napping on the sill. */
function drawSleepZ(ctx, box, t) {
  for (let i = 0; i < 2; i++) {
    const p = (t * 0.4 + i * 0.5) % 1;
    ctx.globalAlpha = 1 - p;
    drawSpriteScaled(ctx, SPRITES.sleepZ, box.x + box.w - 8 + Math.floor(p * 10), box.y - 10 - Math.floor(p * 20), SCALE);
  }
  ctx.globalAlpha = 1;
}
