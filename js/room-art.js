// The room's painting at 640×360: everything that doesn't move. room.js
// paints it once into a cache and then adds the moving parts, the light and
// the glow each frame (see drawRoom there).
//
// It's painted "unlit", in each material's own colours. Light comes later
// (lighting.js), so these colours are fairly bright and even; the night,
// the lamps and the window turn them into the final mood. Shading here is
// only the shape of things: which side of a book is rounded away, where a
// fold in the curtain is.

import {
  BED,
  BLINDS_BOTTOM,
  BOOKSHELF,
  CEILING_Y,
  CHAIR,
  DESK,
  DESK_LAMP,
  FLOOR_Y,
  GLASS,
  MONITOR,
  MULLION_XS,
  MULLION_Y,
  PANES,
  PENDANTS,
  ROD_Y,
  ROOM_H,
  ROOM_W,
  SILL_Y,
  WALL_SHELF,
} from './layout.js';
import { bayer, ellipse, makeRng, mixHex, rampColor, rect, shadeRect } from './pixel.js';
import {
  BOOK_COLORS,
  CERAMIC,
  CUSHION,
  DARK_WOOD,
  INK,
  LEAF,
  LINEN,
  METAL,
  MINT,
  PLASTIC,
  QUILT,
  SHADE,
  WOOD,
} from './palette.js';
import { drawBookLying, drawBookSpine, drawFramed, drawLeaf, drawPot, drawSucculent, softShadow } from './art-kit.js';
import { drawWallpaper } from './style-art.js';

const W = ROOM_W;
const H = ROOM_H;

// ---- Where the light sources are (room.js lights them) -------------------

/** The desk lamp's shade points down at the desk, along LAMP_AXIS. */
export const LAMP_AXIS = normalize([0.47, 0.88]);
const LAMP_ACROSS = [LAMP_AXIS[1], -LAMP_AXIS[0]];
const SHADE_BACK = [DESK_LAMP.head[0] + 2, DESK_LAMP.head[1] + 2];
const SHADE_LENGTH = 22;
export const LAMP_MOUTH = [SHADE_BACK[0] + LAMP_AXIS[0] * SHADE_LENGTH, SHADE_BACK[1] + LAMP_AXIS[1] * SHADE_LENGTH];
export const LAMP_LIGHT = { x: LAMP_MOUTH[0] - LAMP_AXIS[0] * 3, y: LAMP_MOUTH[1] - LAMP_AXIS[1] * 3 };

/** LEDs tucked under the ceiling beam, washing the wall below with colour. */
export const LED_COVE = Object.freeze({ x0: 0, x1: W, y: CEILING_Y - 2 });

/** A candle on the shelf above the bed. */
export const CANDLE = Object.freeze({ x: 512, y: WALL_SHELF.y - 13 });

// String lights hang from the curtain rod in swoops between hooks.
const HOOKS = [150, 216, 282, 348, 414, 480];
export function stringY(x) {
  for (let i = 0; i < HOOKS.length - 1; i++) {
    if (x >= HOOKS[i] && x <= HOOKS[i + 1]) {
      const p = (x - HOOKS[i]) / (HOOKS[i + 1] - HOOKS[i]);
      return Math.round(ROD_Y + 4 + Math.sin(p * Math.PI) * 11);
    }
  }
  return ROD_Y + 4;
}
export const STRING_BULBS = Object.freeze(
  Array.from({ length: Math.floor((HOOKS.at(-1) - HOOKS[0] - 6) / 11) }, (_, i) => HOOKS[0] + 6 + i * 11),
);

function normalize([x, y]) {
  const d = Math.hypot(x, y);
  return [x / d, y / d];
}

// ---- The whole room --------------------------------------------------------

/**
 * Paints everything that never moves. `room` is the window view's room
 * colours (themes.js), `wall` the wallpaper and `rug` the rug style.
 */
export function paintRoom(ctx, { room, wall, rug }) {
  drawWall(ctx, wall);
  drawCeiling(ctx);
  drawFloor(ctx, room);
  drawRug(ctx, rug);
  drawWindow(ctx, room);
  drawCurtains(ctx, room);
  drawStringWire(ctx);
  drawClock(ctx);
  drawPendants(ctx);
  drawBookshelf(ctx);
  drawWallShelf(ctx);
  drawPolaroids(ctx);
  drawBed(ctx);
  drawDesk(ctx);
  drawDeskItems(ctx);
}

/** The solid things on the desk, which block the desk lamp's light. */
export function paintCasters(ctx) {
  drawMonitor(ctx);
  drawMug(ctx);
  drawBooks(ctx);
  drawPencilCup(ctx);
  paintChair(ctx);
}

function drawWall(ctx, wall) {
  if (wall.wallStyle === 'logs') {
    // Round logs: lit on top, shaded underneath, with knots and light filler between them.
    const ramp = [mixHex(wall.logLine, INK, 0.3), wall.logLine, wall.log, wall.logHighlight, mixHex(wall.logHighlight, '#ffe0b0', 0.25)];
    for (let top = CEILING_Y - 6; top < FLOOR_Y; top += 20) {
      shadeRect(ctx, 0, Math.max(0, top), W, Math.min(18, FLOOR_Y - top), ramp, (x, y) => {
        const v = (y - top) / 18;
        return 0.15 + Math.sin(v * Math.PI) * 0.75 - v * 0.2 + Math.sin(x * 0.05 + top) * 0.05;
      });
      rect(ctx, 0, top + 18, W, 2, mixHex(wall.logHighlight, '#e8d2b0', 0.35)); // chinking
      const rng = makeRng(top + 50);
      for (let i = 0; i < 6; i++) {
        const kx = Math.floor(rng() * W);
        ellipse(ctx, kx, top + 9, 4, 2, wall.logLine);
        rect(ctx, kx - 1, top + 8, 3, 1, ramp[0]);
      }
    }
  } else {
    drawWallpaper(ctx, 0, CEILING_Y, W, FLOOR_Y - CEILING_Y, wall, 2);
    // A faint paper texture, so the big wall doesn't look flat.
    const rng = makeRng(31);
    ctx.fillStyle = mixHex(wall.wallpaper, INK, 0.12);
    for (let i = 0; i < 3200; i++) ctx.fillRect(Math.floor(rng() * W), CEILING_Y + Math.floor(rng() * (FLOOR_Y - CEILING_Y)), 1, 1);
    ctx.fillStyle = mixHex(wall.wallpaper, '#ffffff', 0.08);
    for (let i = 0; i < 1800; i++) ctx.fillRect(Math.floor(rng() * W), CEILING_Y + Math.floor(rng() * (FLOOR_Y - CEILING_Y)), 1, 1);
  }
  // Shadow where the wall meets the ceiling ("ambient occlusion").
  for (let y = 0; y < 6; y++) {
    for (let x = 0; x < W; x++) if (bayer(x, y) < 0.6 - y * 0.1) rect(ctx, x, CEILING_Y + y, 1, 1, 'rgba(20, 12, 35, 0.4)');
  }
  // Skirting board.
  const trim = wall.trim ?? '#b4a5e0';
  rect(ctx, 0, FLOOR_Y - 10, W, 10, trim);
  rect(ctx, 0, FLOOR_Y - 10, W, 1, mixHex(trim, '#ffffff', 0.35));
  rect(ctx, 0, FLOOR_Y - 8, W, 1, mixHex(trim, INK, 0.25));
  rect(ctx, 0, FLOOR_Y - 1, W, 1, mixHex(trim, INK, 0.5));
}

function drawCeiling(ctx) {
  shadeRect(ctx, 0, 0, W, CEILING_Y - 4, DARK_WOOD, (x, y) => 0.32 + (y / CEILING_Y) * 0.2 + ((Math.floor(x / 48) % 3) - 1) * 0.04);
  for (let x = 24; x < W; x += 48) rect(ctx, x, 0, 1, CEILING_Y - 4, DARK_WOOD[0]); // gaps between planks
  // The beam's moulding, with the LED channel tucked under it.
  rect(ctx, 0, CEILING_Y - 4, W, 2, DARK_WOOD[4]);
  rect(ctx, 0, CEILING_Y - 4, W, 1, DARK_WOOD[5]);
  rect(ctx, 0, CEILING_Y - 2, W, 2, '#17121f');
}

/** Floorboards running towards you: their joins fan out from the back wall, which gives depth. */
function drawFloor(ctx, room) {
  const rng = makeRng(17);
  const boards = [];
  for (let xb = -400; xb < W + 400; xb += 22) boards.push({ xb, tone: rng() - 0.5, joins: [rng(), rng()] });
  for (let y = FLOOR_Y; y < H; y++) {
    const depth = (y - FLOOR_Y) / (H - FLOOR_Y); // 0 at the wall, 1 at the front
    const spread = 1 + depth * 0.9;
    for (let i = 0; i < boards.length - 1; i++) {
      const x0 = Math.round(W / 2 + (boards[i].xb - W / 2) * spread);
      const x1 = Math.round(W / 2 + (boards[i + 1].xb - W / 2) * spread);
      if (x1 < 0 || x0 >= W) continue;
      const base = mixHex(room.floor, boards[i].tone > 0 ? '#e8c49a' : '#3b2433', Math.abs(boards[i].tone) * 0.16);
      rect(ctx, x0, y, x1 - x0, 1, base);
      rect(ctx, x0, y, 1, 1, room.floorJoint); // the gap between two boards
      // Boards are shorter than the room: here and there, one ends and the next begins.
      for (const j of boards[i].joins) if (Math.abs(depth - j) < 0.012) rect(ctx, x0, y, x1 - x0, 1, room.floorLine);
      if ((x0 * 7 + y * 13) % 97 === 0) rect(ctx, x0 + 3, y, 6, 1, room.floorJoint); // grain
    }
  }
  // Darker where the floor meets the wall.
  for (let y = 0; y < 8; y++) {
    for (let x = 0; x < W; x++) if (bayer(x, y) < 0.7 - y * 0.09) rect(ctx, x, FLOOR_Y + y, 1, 1, 'rgba(20, 12, 35, 0.45)');
  }
}

/** A rug in perspective: wider at the front, with a border, a band and a diamond in the middle. */
function drawRug(ctx, rug) {
  const top = 314;
  const bottom = 354;
  const back = [200, 444];
  const front = [172, 472];
  for (let y = top; y <= bottom; y++) {
    const p = (y - top) / (bottom - top);
    const left = Math.round(back[0] + (front[0] - back[0]) * p);
    const right = Math.round(back[1] + (front[1] - back[1]) * p);
    for (let x = left; x <= right; x++) {
      const u = (x - left) / (right - left); // 0 → 1 across
      const edge = Math.min(u * (right - left), (1 - u) * (right - left), (y - top) * 2.4, (bottom - y) * 2.4);
      if (edge < 1.5 && (x + y) % 2 === 0) continue; // a soft, uneven edge
      const diamond = Math.abs(u - 0.5) * 2 + Math.abs(p - 0.5) * 2;
      let color = rug.main;
      if (edge < 5) color = rug.edge;
      else if (edge < 8) color = rug.inner;
      else if (diamond < 0.42) color = rug.center ?? rug.inner;
      else if (diamond < 0.55) color = rug.inner;
      else if ((Math.floor(u * 24) + Math.floor(p * 6)) % 2 === 0 && edge > 11) color = mixHex(rug.main, rug.inner, 0.35);
      rect(ctx, x, y, 1, 1, color);
    }
  }
  for (let x = front[0] + 4; x < front[1] - 4; x += 2) rect(ctx, x, bottom + 1, 1, 2, mixHex(rug.inner, '#ffffff', 0.4)); // fringe
}

function drawWindow(ctx, room) {
  const light = mixHex(room.frame, '#ffffff', 0.4);
  const dark = mixHex(room.frameShade, INK, 0.35);
  const fx = GLASS.x - 8;
  const fy = GLASS.y - 8;
  const fw = GLASS.w + 16;
  const fh = GLASS.h + 16;
  rect(ctx, fx - 1, fy - 1, fw + 2, fh + 2, dark);
  rect(ctx, fx, fy, fw, fh, room.frame);
  rect(ctx, fx, fy, fw, 1, light); // bevels catching the light
  rect(ctx, fx, fy, 1, fh, light);
  rect(ctx, fx + fw - 1, fy, 1, fh, room.frameShade);
  rect(ctx, GLASS.x - 4, GLASS.y - 4, GLASS.w + 8, GLASS.h + 8, room.frameShade); // a step in the frame
  rect(ctx, GLASS.x - 3, GLASS.y - 3, GLASS.w + 6, GLASS.h + 6, room.frame);
  for (const pane of PANES) ctx.clearRect(pane.x, pane.y, pane.w, pane.h);
  // The inside edge of the frame is in shadow.
  rect(ctx, GLASS.x - 2, GLASS.y - 2, GLASS.w + 4, 2, room.frameShade);
  rect(ctx, GLASS.x - 2, GLASS.y - 2, 2, GLASS.h + 4, room.frameShade);
  for (const mx of MULLION_XS) {
    rect(ctx, mx, GLASS.y, 1, GLASS.h, light);
    rect(ctx, mx + 3, GLASS.y, 1, GLASS.h, room.frameShade);
  }
  rect(ctx, GLASS.x, MULLION_Y, GLASS.w, 1, light);
  rect(ctx, GLASS.x, MULLION_Y + 3, GLASS.w, 1, room.frameShade);
  for (const mx of MULLION_XS) {
    rect(ctx, mx - 2, MULLION_Y + 5, 8, 4, '#b48a3c'); // brass latches
    rect(ctx, mx - 2, MULLION_Y + 5, 8, 1, '#f2d08a');
  }

  drawBlinds(ctx);

  // The sill: lit top, shaded front, and its shadow on the wall below.
  const sx = GLASS.x - 18;
  const sw = GLASS.w + 36;
  rect(ctx, sx, SILL_Y, sw, 2, light);
  rect(ctx, sx, SILL_Y + 2, sw, 2, room.frame);
  rect(ctx, sx, SILL_Y + 4, sw, 4, room.frameShade);
  rect(ctx, sx, SILL_Y + 8, sw, 1, dark);
  for (let y = 0; y < 5; y++) {
    for (let x = sx; x < sx + sw; x++) if (bayer(x, y) < 0.8 - y * 0.16) rect(ctx, x, SILL_Y + 9 + y, 1, 1, 'rgba(20, 12, 35, 0.4)');
  }
}

/** Venetian blinds, pulled most of the way up: a stack of slats at the top of the glass. */
function drawBlinds(ctx) {
  const x = GLASS.x;
  const w = GLASS.w;
  rect(ctx, x - 2, GLASS.y - 2, w + 4, 4, '#7d7398'); // head rail
  rect(ctx, x - 2, GLASS.y - 2, w + 4, 1, '#bdb3d8');
  for (let y = GLASS.y + 2; y < BLINDS_BOTTOM - 4; y += 3) {
    rect(ctx, x, y, w, 1, '#ddd5ee');
    rect(ctx, x, y + 1, w, 1, '#b9afd2');
    rect(ctx, x, y + 2, w, 1, '#8c82aa');
  }
  rect(ctx, x - 1, BLINDS_BOTTOM - 4, w + 2, 4, '#a198c0'); // bottom rail
  rect(ctx, x - 1, BLINDS_BOTTOM - 4, w + 2, 1, '#e6dff4');
  rect(ctx, x - 1, BLINDS_BOTTOM - 1, w + 2, 1, '#6d6390');
  for (const lx of [x + 30, x + 132, x + 234]) rect(ctx, lx, GLASS.y + 2, 1, BLINDS_BOTTOM - GLASS.y - 6, '#cfc7e4'); // ladder strings
  // The pull cord, with a tassel.
  rect(ctx, x + w - 8, BLINDS_BOTTOM, 1, 70, '#e8e2f4');
  rect(ctx, x + w - 9, BLINDS_BOTTOM + 70, 3, 6, '#c9a24f');
  rect(ctx, x + w - 9, BLINDS_BOTTOM + 70, 1, 6, '#f2d08a');
}

/**
 * Sheer curtains: soft folds (a sine wave across the width), gathered by a
 * tie-back. Over the glass they're see-through, so the view shows through them.
 */
function drawCurtains(ctx, room) {
  const top = ROD_Y + 3;
  const bottom = 266;
  const tieY = 178;
  const ramp = [
    mixHex(room.curtainFold, INK, 0.55),
    mixHex(room.curtainFold, INK, 0.25),
    room.curtainFold,
    room.curtain,
    mixHex(room.curtain, '#ffffff', 0.5),
  ];
  for (const side of ['left', 'right']) {
    const outer = side === 'left' ? 118 : 498; // the edge towards the wall
    const dir = side === 'left' ? 1 : -1; // towards the window
    for (let y = top; y < bottom; y++) {
      const pinch = 1 - 0.5 * Math.exp(-(((y - tieY) / 26) ** 2)); // narrowest at the tie-back
      const width = Math.round(64 * pinch);
      for (let i = 0; i < width; i++) {
        const x = outer + dir * i;
        const fold = Math.sin((i / width) * Math.PI * 7 + (y - tieY) * 0.012 * dir);
        let level = 0.58 + fold * 0.38 + (y < top + 4 ? -0.25 : 0);
        if (i >= width - 2) level = 0.05; // the inner edge rolls over into shadow
        const overGlass = x >= GLASS.x && x < GLASS.x + GLASS.w && y >= GLASS.y && y < GLASS.y + GLASS.h;
        ctx.globalAlpha = overGlass ? 0.6 : 1;
        ctx.fillStyle = rampColor(ramp, level, x, y);
        ctx.fillRect(x, y, 1, 1);
      }
    }
    ctx.globalAlpha = 1;
    const tieWidth = Math.round(64 * 0.5);
    const tx = side === 'left' ? outer : outer - tieWidth + 1;
    rect(ctx, tx, tieY - 2, tieWidth, 4, '#c9a24f');
    rect(ctx, tx, tieY - 2, tieWidth, 1, '#f2d08a');
    rect(ctx, side === 'left' ? outer + tieWidth - 3 : outer - tieWidth + 1, tieY + 2, 3, 8, '#b48a3c'); // tassel
  }
  // The rod, with round finials and rings.
  rect(ctx, 112, ROD_Y, 392, 4, '#6d5a8e');
  rect(ctx, 112, ROD_Y, 392, 1, '#a99ac8');
  rect(ctx, 112, ROD_Y + 3, 392, 1, '#3f3358');
  for (const fx of [106, 504]) {
    ellipse(ctx, fx, ROD_Y + 2, 4, 4, '#3f3358');
    ellipse(ctx, fx, ROD_Y + 2, 3, 3, '#8a78ad');
    rect(ctx, fx - 1, ROD_Y, 1, 1, '#cfc4e6');
  }
  for (let x = 122; x < 180; x += 8) rect(ctx, x, ROD_Y - 1, 3, 6, '#4d4070');
  for (let x = 440; x < 498; x += 8) rect(ctx, x, ROD_Y - 1, 3, 6, '#4d4070');
}

function drawStringWire(ctx) {
  for (let x = HOOKS[0]; x <= HOOKS.at(-1); x++) rect(ctx, x, stringY(x), 1, 1, '#2d2540');
  for (const x of STRING_BULBS) {
    const y = stringY(x) + 1;
    rect(ctx, x - 1, y, 3, 2, '#4a4560'); // socket
    rect(ctx, x - 1, y, 1, 2, '#6f6a80');
  }
}

/** A round wall clock above the window. Its hands are drawn every frame (drawClockHands). */
function drawClock(ctx) {
  const [cx, cy] = CLOCK;
  ellipse(ctx, cx + 1, cy + 1, 9, 9, 'rgba(20, 12, 35, 0.35)');
  ellipse(ctx, cx, cy, 9, 9, '#3f3358');
  ellipse(ctx, cx, cy, 8, 8, '#c9a24f');
  ellipse(ctx, cx, cy, 7, 7, '#f3eee6');
  for (let h = 0; h < 12; h++) {
    const a = (h / 12) * Math.PI * 2;
    rect(ctx, Math.round(cx + Math.sin(a) * 6), Math.round(cy - Math.cos(a) * 6), 1, 1, h % 3 === 0 ? INK : '#9a90b0');
  }
}
export const CLOCK = Object.freeze([308, 36]);

/** The clock's hands, showing the real time. */
export function drawClockHands(ctx, date, [cx, cy] = CLOCK) {
  const minutes = date.getMinutes() + date.getSeconds() / 60;
  const hours = (date.getHours() % 12) + minutes / 60;
  for (const [angle, length, color] of [[(hours / 12) * Math.PI * 2, 3.5, INK], [(minutes / 60) * Math.PI * 2, 5.5, '#5b4a8c']]) {
    for (let r = 0; r <= length; r += 0.5) rect(ctx, Math.round(cx + Math.sin(angle) * r), Math.round(cy - Math.cos(angle) * r), 1, 1, color);
  }
  rect(ctx, cx, cy, 1, 1, '#e0565b');
}

/** Two lamps hanging from the ceiling. Their glass globes glow (drawPendantGlass, after the lighting). */
function drawPendants(ctx) {
  for (const { x, y } of PENDANTS) {
    rect(ctx, x, CEILING_Y, 1, y - 10 - CEILING_Y, '#241c30'); // cord
    rect(ctx, x - 3, CEILING_Y, 7, 2, '#3f3358'); // ceiling rose
    rect(ctx, x - 4, y - 11, 9, 3, '#b48a3c'); // brass cap
    rect(ctx, x - 4, y - 11, 9, 1, '#f2d08a');
    rect(ctx, x - 3, y - 8, 7, 1, '#7d5f2a');
  }
}

/** The pendant lamps' glass, glowing in `color` (an '#rrggbb'). */
export function drawPendantGlass(ctx, color, core) {
  for (const { x, y } of PENDANTS) {
    ellipse(ctx, x, y, 8, 8, color);
    ellipse(ctx, x - 1, y - 1, 5, 5, core);
    rect(ctx, x - 4, y - 4, 2, 2, '#ffffff');
  }
}

function drawBookshelf(ctx) {
  const { x, y, w, shelves } = BOOKSHELF;
  const bottom = FLOOR_Y + 10;
  const rng = makeRng(404);
  // The back panel, in shadow, with the boards' joins.
  rect(ctx, x + 4, y, w - 8, bottom - y, DARK_WOOD[2]);
  for (let px = x + 18; px < x + w - 6; px += 22) rect(ctx, px, y, 1, bottom - y, DARK_WOOD[1]);

  let ceiling = y;
  for (const shelfY of [...shelves, bottom - 14]) {
    fillCompartment(ctx, x + 6, ceiling + 4, w - 12, shelfY - ceiling - 4, rng);
    ceiling = shelfY;
  }
  // Shelf boards: lit top, front face, dark underside, and a shadow below each.
  for (const sy of [y, ...shelves]) {
    rect(ctx, x + 4, sy, w - 8, 1, WOOD[6]);
    rect(ctx, x + 4, sy + 1, w - 8, 3, WOOD[4]);
    rect(ctx, x + 4, sy + 4, w - 8, 1, WOOD[1]);
    for (let px = x + 5; px < x + w - 5; px++) if (bayer(px, sy + 5) < 0.5) rect(ctx, px, sy + 5, 1, 1, 'rgba(20, 12, 35, 0.4)');
  }
  // The plinth, with two drawers.
  rect(ctx, x + 4, bottom - 14, w - 8, 14, WOOD[3]);
  rect(ctx, x + 4, bottom - 14, w - 8, 1, WOOD[5]);
  for (const dx of [x + 8, x + w / 2 + 2]) {
    rect(ctx, dx, bottom - 11, w / 2 - 10, 9, WOOD[2]);
    rect(ctx, dx + 1, bottom - 10, w / 2 - 12, 7, WOOD[4]);
    rect(ctx, dx + w / 4 - 7, bottom - 7, 4, 2, '#f2d08a');
  }
  // Sides, rounded with light on the left.
  shadeRect(ctx, x, y - 4, 5, bottom - y + 4, WOOD, (px) => 0.9 - (px - x) * 0.1);
  shadeRect(ctx, x + w - 5, y - 4, 5, bottom - y + 4, WOOD, (px) => 0.5 - (px - (x + w - 5)) * 0.08);
  rect(ctx, x - 2, y - 6, w + 4, 3, WOOD[5]); // top board, overhanging a little
  rect(ctx, x - 2, y - 6, w + 4, 1, WOOD[6]);
  rect(ctx, x - 2, y - 3, w + 4, 1, WOOD[2]);
  softShadow(ctx, x + w / 2, bottom, w / 2 + 6, 3, 0.45);

  // A trailing pothos on top, its vines hanging down the right-hand side.
  drawPot(ctx, x + w - 22, y - 6, 16, 12);
  for (let vy = y - 4; vy < y + 150; vy++) rect(ctx, Math.round(x + w - 6 + Math.sin(vy * 0.08) * 3), vy, 1, 1, LEAF[1]);
  for (let i = 0; i < 16; i++) {
    const vy = y - 2 + i * 9;
    const vx = Math.round(x + w - 6 + Math.sin(vy * 0.08) * 3);
    drawLeaf(ctx, vx, vy, 7 + (i % 3), i % 2 ? 0.9 : 2.3);
  }
  for (const [dx, dy, len, angle] of [[-22, -18, 10, -1.6], [-28, -14, 9, -2.4], [-15, -15, 9, -0.8], [-22, -10, 8, -1.2]]) {
    drawLeaf(ctx, x + w + dx, y + dy, len, angle);
  }
}

/** Books (mostly), with the odd plant, box or photo, filling one shelf. */
function fillCompartment(ctx, x, top, w, h, rng) {
  let px = x;
  while (px < x + w - 4) {
    const roll = rng();
    if (roll < 0.1 && px < x + w - 18) {
      // A short stack of books lying down.
      let sy = top + h;
      for (let i = 0; i < 2 + Math.floor(rng() * 2); i++) {
        sy -= 5;
        drawBookLying(ctx, px + i, sy, 16 - i * 2, 4, BOOK_COLORS[Math.floor(rng() * BOOK_COLORS.length)]);
      }
      px += 19;
    } else if (roll < 0.16 && px < x + w - 14) {
      drawSucculent(ctx, px + 7, top + h);
      px += 15;
    } else if (roll < 0.21 && px < x + w - 16) {
      drawFramed(ctx, px, top + h - 18, 14, 18, '#c9a24f', (c, fx, fy, fw, fh) => {
        rect(c, fx, fy, fw, fh, '#9fd0e8');
        rect(c, fx, fy + fh - 3, fw, 3, '#6fa86f');
      });
      px += 16;
    } else if (roll < 0.25 && px < x + w - 16) {
      // A little storage box.
      rect(ctx, px, top + h - 12, 15, 12, '#7d68b4');
      rect(ctx, px, top + h - 12, 15, 2, '#a28ed6');
      rect(ctx, px + 5, top + h - 7, 5, 2, '#cbbcf0');
      px += 16;
    } else {
      const bw = 4 + Math.floor(rng() * 5);
      const bh = Math.round(h * (0.68 + rng() * 0.3));
      drawBookSpine(ctx, px, top + h - bh, bw, bh, BOOK_COLORS[Math.floor(rng() * BOOK_COLORS.length)]);
      px += bw;
      if (rng() < 0.08) px += 2; // a little gap
    }
  }
}

/** A floating shelf above the bed, with a few things on it. (Its right end is a decoration spot.) */
function drawWallShelf(ctx) {
  const { x, y, w } = WALL_SHELF;
  drawBookLying(ctx, x + 6, y - 5, 22, 4, '#6f8fc4');
  drawBookLying(ctx, x + 8, y - 10, 18, 4, '#c46f73');
  // A candle in a jar; its flame is drawn after the lighting (drawCandleFlame).
  rect(ctx, CANDLE.x - 5, y - 12, 11, 12, '#d8c8e8');
  rect(ctx, CANDLE.x - 4, y - 9, 9, 8, '#f3e6d0');
  rect(ctx, CANDLE.x - 5, y - 12, 11, 1, '#ffffff');
  rect(ctx, CANDLE.x, y - 12, 1, 1, '#2b2138'); // wick
  drawSucculent(ctx, x + 64, y);
  drawFramed(ctx, x + 76, y - 22, 18, 22, '#3f3358', (c, fx, fy, fw, fh) => {
    rect(c, fx, fy, fw, fh, '#f2b38a');
    rect(c, fx, fy + fh - 4, fw, 4, '#7d6aa8');
    rect(c, fx + 4, fy + 2, 3, 3, '#fff6dc');
  });
  // A little figurine: a ghost with a party hat.
  ellipse(ctx, x + 108, y - 7, 5, 6, '#e8e2f4');
  rect(ctx, x + 103, y - 6, 11, 6, '#e8e2f4');
  rect(ctx, x + 106, y - 9, 1, 2, INK);
  rect(ctx, x + 110, y - 9, 1, 2, INK);
  rect(ctx, x + 107, y - 16, 3, 3, '#ff9ccf');
  // The plank and its brackets.
  rect(ctx, x, y, w, 1, WOOD[6]);
  rect(ctx, x, y + 1, w, 4, WOOD[4]);
  rect(ctx, x, y + 5, w, 1, WOOD[1]);
  for (let px = x; px < x + w; px++) if (bayer(px, y + 7) < 0.5) rect(ctx, px, y + 7, 1, 1, 'rgba(20, 12, 35, 0.35)');
  rect(ctx, x, y + 6, w, 1, 'rgba(20, 12, 35, 0.35)');
  for (const bx of [x + 14, x + w - 18]) {
    rect(ctx, bx, y + 6, 4, 8, '#3f3358');
    rect(ctx, bx, y + 6, 1, 8, '#6d5a8e');
  }
}

/** Photos pegged on a string between the posters and the shelf. */
function drawPolaroids(ctx) {
  const x0 = 474;
  const x1 = 588;
  const sag = (x) => Math.round(124 + Math.sin(((x - x0) / (x1 - x0)) * Math.PI) * 4);
  for (let x = x0; x <= x1; x++) rect(ctx, x, sag(x), 1, 1, '#c9b08a');
  const photos = [['#f2b38a', '#7d6aa8'], ['#9fd0e8', '#6fa86f'], ['#ffb3c7', '#b0577e'], ['#bfe3ff', '#5d6fa8']];
  photos.forEach(([sky, ground], i) => {
    const px = 482 + i * 26;
    const py = sag(px + 6) + 2;
    rect(ctx, px + 1, py + 1, 13, 15, 'rgba(20, 12, 35, 0.3)');
    rect(ctx, px, py, 13, 15, '#f3eee6');
    rect(ctx, px + 1, py + 1, 11, 10, sky);
    rect(ctx, px + 1, py + 7, 11, 4, ground);
    rect(ctx, px + 5, py - 2, 3, 4, '#d6c6a8'); // peg
  });
}

/** The bed, in the right-hand corner: headboard, pillows, and a quilt hanging over the side. */
function drawBed(ctx) {
  const { x, top, front, bottom } = BED;
  softShadow(ctx, x + 80, bottom + 6, 92, 6, 0.5);
  // Headboard, against the right wall.
  shadeRect(ctx, 612, 206, 28, front - 206, DARK_WOOD, (px, py) => (py < 210 ? 0.95 : 0.55) - (px - 612) * 0.012);
  rect(ctx, 616, 214, 20, 50, DARK_WOOD[3]);
  rect(ctx, 616, 214, 20, 1, DARK_WOOD[5]);
  // The sheet on top of the mattress.
  shadeRect(ctx, x, top, W - x, front - top, LINEN, (px, py) => 0.72 + ((py - top) / (front - top)) * 0.15 - (px - x) * 0.0006);
  // Pillows, plump and creased.
  for (const [px, py, pw, ph] of [[560, 250, 54, 26], [584, 256, 54, 26]]) {
    for (let yy = py; yy < py + ph; yy++) {
      for (let xx = px; xx < px + pw; xx++) {
        const nx = (xx - px - pw / 2) / (pw / 2);
        const ny = (yy - py - ph / 2) / (ph / 2);
        const d = nx * nx * 0.9 + ny * ny;
        if (d > 1) continue;
        let level = 0.85 - ny * 0.25 - nx * 0.15;
        if (d > 0.82) level = 0.2;
        if (Math.abs(ny + nx * 0.3) < 0.06 && d < 0.6) level -= 0.25; // a crease
        rect(ctx, xx, yy, 1, 1, rampColor(LINEN, level, xx, yy));
      }
    }
  }
  // The quilt: over the top and down the side, patchwork squares with stitches.
  const hem = (px) => Math.round(bottom - 4 + Math.sin(px * 0.18) * 2);
  for (let py = top + 8; py < bottom + 2; py++) {
    for (let px = x; px < 600; px++) {
      if (py > hem(px)) continue;
      const onSide = py >= front;
      const u = (px - x) / 14;
      const v = (py - (onSide ? front : top)) / 10;
      const patch = (Math.floor(u) + Math.floor(v) * 2) % 3;
      let level = [0.58, 0.63, 0.54][patch] + (onSide ? -0.18 : 0.08);
      level += Math.sin(px * 0.09 + (onSide ? 0 : py * 0.15)) * 0.1; // soft folds
      // Each square is puffy: lighter in the middle, sinking at the stitched seams.
      level += (0.25 - Math.max(Math.abs((u % 1) - 0.5), Math.abs((v % 1) - 0.5))) * 0.3;
      if (py === front || py === front + 1) level -= 0.2; // the quilt bends over the edge here
      if (((px - x) % 14 === 0 || (py - (onSide ? front : top)) % 10 === 0) && (px + py) % 2 === 0) level += 0.22; // stitches
      rect(ctx, px, py, 1, 1, rampColor(QUILT, level, px, py));
    }
  }
  for (let px = x; px < 600; px++) rect(ctx, px, hem(px), 1, 1, QUILT[0]);
  // The bed frame below.
  rect(ctx, x, bottom, W - x, 4, WOOD[2]);
  rect(ctx, x, bottom, W - x, 1, WOOD[4]);
  rect(ctx, x + 2, bottom + 4, 6, 10, WOOD[1]);
}

function drawDesk(ctx) {
  const { x, top, w, legBottom } = DESK;
  const front = top + 10;
  softShadow(ctx, x + w / 2, legBottom + 2, w / 2 + 8, 4, 0.5);
  // Under the desk is deep in shadow.
  rect(ctx, x + 8, front + 6, w - 16, legBottom - front - 10, 'rgba(15, 8, 25, 0.55)');
  // Legs, and a drawer unit on the right.
  shadeRect(ctx, x + 6, front + 6, 8, legBottom - front - 6, WOOD, (px) => 0.75 - (px - x - 6) * 0.06);
  const dx = x + w - 66;
  shadeRect(ctx, dx, front + 6, 62, legBottom - front - 6, WOOD, (px) => 0.62 - (px - dx) * 0.004);
  for (let i = 0; i < 3; i++) {
    const dy = front + 9 + i * 15;
    rect(ctx, dx + 3, dy, 56, 13, WOOD[2]);
    rect(ctx, dx + 4, dy + 1, 54, 11, WOOD[4]);
    rect(ctx, dx + 4, dy + 1, 54, 1, WOOD[5]);
    rect(ctx, dx + 26, dy + 5, 10, 2, '#f2d08a');
    rect(ctx, dx + 26, dy + 7, 10, 1, '#9a7a3a');
  }
  // The top: planks with grain, seen a little from above.
  shadeRect(ctx, x, top, w, 10, WOOD, (px, py) => 0.62 + Math.sin(px * 0.05 + Math.sin(px * 0.013) * 2 + py) * 0.05);
  rect(ctx, x, top, w, 1, WOOD[3]);
  rect(ctx, x, front, w, 1, WOOD[6]); // the front edge catches the light
  rect(ctx, x, front + 1, w, 5, WOOD[3]);
  rect(ctx, x, front + 6, w, 1, WOOD[1]);
}

function drawDeskItems(ctx) {
  drawBooks(ctx);
  drawPencilCup(ctx);
  drawLamp(ctx);
  drawMonitor(ctx);
  drawKeyboard(ctx);
  drawMug(ctx);
}

function drawBooks(ctx) {
  drawBookLying(ctx, 422, 233, 30, 6, '#5d6fa8');
  drawBookLying(ctx, 424, 227, 27, 5, '#e6c27a');
  drawBookLying(ctx, 423, 222, 26, 4, '#b0577e');
}

function drawPencilCup(ctx) {
  for (const [[x0, y0], [x1, y1], color] of [
    [[227, 226], [224, 208], '#f2c14e'],
    [[230, 226], [232, 210], '#9a7ac0'],
    [[228, 226], [229, 206], '#e89fb4'],
  ]) {
    for (let i = 0; i <= 20; i++) {
      const p = i / 20;
      const px = Math.round(x0 + (x1 - x0) * p);
      const py = Math.round(y0 + (y1 - y0) * p);
      rect(ctx, px, py, 2, 1, p > 0.88 ? '#e8c39e' : color);
    }
    rect(ctx, x1, y1 - 1, 1, 1, INK);
  }
  rect(ctx, 222, 223, 14, 18, MINT[0]);
  shadeRect(ctx, 223, 224, 12, 16, MINT, (px) => 0.9 - ((px - 223) / 11) ** 1.2 * 0.75);
  rect(ctx, 223, 224, 12, 1, MINT[4]);
}

/** The angle-poise desk lamp. The inside of its shade glows (drawLampMouth, after the lighting). */
function drawLamp(ctx) {
  const [bx, by] = DESK_LAMP.base;
  ellipse(ctx, bx, by, 14, 4, METAL[0]);
  ellipse(ctx, bx, by - 1, 13, 3, METAL[2]);
  rect(ctx, bx - 9, by - 3, 11, 1, METAL[4]);
  drawArm(ctx, [bx, by - 3], DESK_LAMP.elbow);
  drawArm(ctx, DESK_LAMP.elbow, DESK_LAMP.head);
  for (let i = 0; i < 12; i++) {
    const p = 0.15 + i * 0.06;
    const sx = Math.round(bx + (DESK_LAMP.elbow[0] - bx) * p) + 4;
    const sy = Math.round(by - 3 + (DESK_LAMP.elbow[1] - by + 3) * p);
    rect(ctx, sx + (i % 2), sy, 1, 1, METAL[4]); // spring
  }
  for (const [jx, jy] of [DESK_LAMP.elbow, DESK_LAMP.head]) {
    ellipse(ctx, jx, jy, 3, 3, METAL[0]);
    ellipse(ctx, jx, jy, 2, 2, METAL[3]);
    rect(ctx, jx, jy, 1, 1, METAL[0]);
  }
  const [sx, sy] = SHADE_BACK;
  for (let py = sy - 8; py <= sy + 30; py++) {
    for (let px = sx - 20; px <= sx + 24; px++) {
      const u = (px - sx) * LAMP_AXIS[0] + (py - sy) * LAMP_AXIS[1];
      const v = (px - sx) * LAMP_ACROSS[0] + (py - sy) * LAMP_ACROSS[1];
      if (u < -2 || u > SHADE_LENGTH) continue;
      const half = 6 + (Math.max(0, u) / SHADE_LENGTH) * 10;
      if (Math.abs(v) > half) continue;
      const edge = Math.abs(v) > half - 1 || u < -1;
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
    rect(ctx, px - 1, py, 3, 1, METAL[0]);
    rect(ctx, px, py, 1, 1, METAL[3]);
  }
}

/** The glowing inside of the lamp's shade, with the bulb. */
export function drawLampMouth(ctx) {
  for (let i = -14; i <= 14; i++) {
    const px = Math.round(LAMP_MOUTH[0] + LAMP_ACROSS[0] * i);
    const py = Math.round(LAMP_MOUTH[1] + LAMP_ACROSS[1] * i);
    rect(ctx, px, py, 1, 1, Math.abs(i) < 9 ? '#fffbe8' : '#ffe9b0');
    rect(ctx, px - 1, py - 1, 1, 1, '#ffd98a');
  }
  rect(ctx, Math.round(LAMP_MOUTH[0] - LAMP_AXIS[0] * 4) - 2, Math.round(LAMP_MOUTH[1] - LAMP_AXIS[1] * 4) - 1, 4, 3, '#ffffff');
}

function drawMonitor(ctx) {
  const { x, y, w, h } = MONITOR;
  // Stand and base.
  shadeRect(ctx, x + w / 2 - 6, y + h + 4, 12, 236 - (y + h + 4), PLASTIC, (px) => 0.7 - (px - (x + w / 2 - 6)) * 0.05);
  ellipse(ctx, x + w / 2, 239, 20, 3, PLASTIC[1]);
  rect(ctx, x + w / 2 - 16, 237, 26, 1, PLASTIC[4]);
  // Bezel around the screen.
  rect(ctx, x - 5, y - 5, w + 10, h + 10, PLASTIC[0]);
  rect(ctx, x - 4, y - 4, w + 8, h + 8, PLASTIC[2]);
  rect(ctx, x - 4, y - 4, w + 8, 1, PLASTIC[4]);
  rect(ctx, x - 4, y - 4, 1, h + 8, PLASTIC[3]);
  rect(ctx, x - 1, y - 1, w + 2, h + 2, PLASTIC[0]);
  rect(ctx, x, y, w, h, '#0e0c18'); // the screen itself, lit up in drawScreen
  // A sticky note on the corner of the bezel.
  rect(ctx, x + w - 4, y - 7, 12, 11, '#fbe28a');
  rect(ctx, x + w - 4, y - 7, 12, 1, '#fff2b8');
  rect(ctx, x + w - 2, y - 4, 8, 1, '#c9a86a');
  rect(ctx, x + w - 2, y - 2, 6, 1, '#c9a86a');
}

/**
 * The monitor's screen: a little music player, glowing by itself. Its bar
 * fills with the focus session, and the equaliser bounces while you study.
 */
export function drawScreen(ctx, t, progress, playing, accent) {
  const { x, y, w, h } = MONITOR;
  for (let py = y; py < y + h; py++) {
    const v = (py - y) / h;
    for (let px = x; px < x + w; px++) {
      const c = v + bayer(px, py) * 0.15 < 0.55 ? '#2a1f52' : v + bayer(px, py) * 0.15 < 0.85 ? '#22194a' : '#1a1440';
      rect(ctx, px, py, 1, 1, c);
    }
  }
  // Album art: a tiny sunset.
  rect(ctx, x + 6, y + 6, 26, 26, '#f2b38a');
  rect(ctx, x + 6, y + 6, 26, 10, '#c97ba8');
  ellipse(ctx, x + 19, y + 22, 6, 6, '#ffe6a8');
  rect(ctx, x + 6, y + 24, 26, 8, '#5b4a8c');
  rect(ctx, x + 6, y + 28, 26, 4, '#3d3163');
  // Title and artist, as bars of "text".
  rect(ctx, x + 38, y + 9, 34, 3, '#e6dcff');
  rect(ctx, x + 38, y + 15, 22, 2, '#9d8ad6');
  // The equaliser.
  for (let i = 0; i < 9; i++) {
    const level = playing ? 0.35 + 0.65 * Math.abs(Math.sin(t * (2 + (i % 4) * 0.7) + i * 1.3)) : 0.2;
    const bh = Math.max(1, Math.round(level * 10));
    rect(ctx, x + 38 + i * 4, y + 31 - bh, 3, bh, i % 2 ? accent : '#9fd8ff');
  }
  // Progress through the focus session.
  rect(ctx, x + 6, y + 40, w - 12, 2, '#3f3570');
  rect(ctx, x + 6, y + 40, Math.round((w - 12) * Math.max(0, Math.min(1, progress))), 2, accent);
  rect(ctx, x + 6 + Math.round((w - 12) * Math.max(0, Math.min(1, progress))), y + 39, 2, 4, '#ffffff');
  // Play or pause.
  if (playing) {
    rect(ctx, x + w / 2 - 3, y + h - 7, 2, 5, '#e6dcff');
    rect(ctx, x + w / 2 + 1, y + h - 7, 2, 5, '#e6dcff');
  } else {
    for (let i = 0; i < 5; i++) rect(ctx, x + w / 2 - 2, y + h - 7 + i, 1 + Math.min(i, 4 - i), 1, '#e6dcff');
  }
}

/** The keyboard, flat on the desk, with softly backlit keys. */
function drawKeyboard(ctx) {
  rect(ctx, 326, 239, 62, 7, PLASTIC[0]);
  rect(ctx, 327, 239, 60, 1, PLASTIC[3]);
  for (let row = 0; row < 3; row++) {
    for (let k = 0; k < 14; k++) rect(ctx, 328 + k * 4 + (row % 2), 241 + row * 2, 3, 1, PLASTIC[2]);
  }
  rect(ctx, 393, 241, 5, 4, PLASTIC[2]); // mouse
  rect(ctx, 394, 241, 3, 1, PLASTIC[4]);
}

/** The keys' backlight, drawn after the lighting. */
export function drawKeyGlow(ctx, color) {
  ctx.globalAlpha = 0.55;
  for (let row = 0; row < 3; row++) {
    for (let k = 0; k < 14; k++) rect(ctx, 328 + k * 4 + (row % 2), 241 + row * 2, 3, 1, color);
  }
  ctx.globalAlpha = 1;
}

function drawMug(ctx) {
  const x = 402;
  const y = 226;
  for (const [hx, hy] of [[x + 13, y + 3], [x + 14, y + 4], [x + 14, y + 6], [x + 14, y + 8], [x + 13, y + 9]]) {
    rect(ctx, hx - 1, hy, 4, 2, CERAMIC[0]);
    rect(ctx, hx, hy, 2, 1, CERAMIC[3]);
  }
  rect(ctx, x - 1, y - 1, 15, 15, CERAMIC[0]);
  shadeRect(ctx, x, y, 13, 13, CERAMIC, (px) => 0.9 - ((px - x) / 12) ** 1.3 * 0.75);
  rect(ctx, x + 2, y + 3, 1, 7, CERAMIC[5]);
  rect(ctx, x, y, 13, 1, CERAMIC[4]);
  rect(ctx, x + 1, y + 1, 11, 2, '#5a3628');
}
export const MUG_TOP = Object.freeze([408, 224]);

/** The desk chair, seen from behind. Drawn on its own, so the buddy can walk in front of or behind it. */
export function paintChair(ctx) {
  const { cx, backTop, seatY, floorY } = CHAIR;
  softShadow(ctx, cx, floorY - 1, 34, 4, 0.45);
  // The star base with its wheels, and the gas lift.
  for (const [ex, ey] of [[-30, -4], [30, -4], [-18, 0], [18, 0], [0, -7]]) {
    const steps = 30;
    for (let i = 0; i <= steps; i++) {
      const p = i / steps;
      rect(ctx, Math.round(cx + ex * p), Math.round(floorY - 12 + (ey + 6) * p), 2, 2, METAL[1]);
    }
    ellipse(ctx, cx + ex, floorY - 4 + ey + 6, 3, 2, METAL[0]);
  }
  shadeRect(ctx, cx - 3, seatY + 8, 6, floorY - 12 - seatY - 8, METAL, (px) => 0.8 - (px - (cx - 3)) * 0.12);
  // The seat's edge, then the padded back: dark fabric with lavender piping.
  rect(ctx, cx - 30, seatY, 60, 9, PLASTIC[0]);
  shadeRect(ctx, cx - 29, seatY + 1, 58, 6, PLASTIC, (px) => 0.75 - Math.abs(px - cx) / 70);
  rect(ctx, cx - 29, seatY + 1, 58, 1, CUSHION[3]);
  for (let py = backTop; py < seatY + 2; py++) {
    for (let px = cx - 26; px <= cx + 26; px++) {
      const nx = (px - cx) / 26;
      const ny = (py - backTop) / (seatY + 2 - backTop);
      if (ny < 0.12 && Math.abs(nx) > 0.8 + ny) continue; // rounded top corners
      let level = 0.72 - nx * 0.3 - ny * 0.15;
      if (Math.abs(nx) > 0.94) {
        rect(ctx, px, py, 1, 1, PLASTIC[0]); // the outline
        continue;
      }
      if (Math.abs(nx) > 0.86) {
        rect(ctx, px, py, 1, 1, CUSHION[nx < 0 ? 3 : 1]); // piping round the edge
        continue;
      }
      if (Math.abs(px - cx) % 13 === 0) level -= 0.3; // stitched channels
      rect(ctx, px, py, 1, 1, rampColor(PLASTIC, level, px, py));
    }
  }
  rect(ctx, cx - 22, backTop, 44, 1, CUSHION[4]);
  rect(ctx, cx - 24, backTop + 1, 48, 1, CUSHION[2]);
}

/** The candle's flame, which flickers. Drawn after the lighting. */
export function drawCandleFlame(ctx, t) {
  const sway = Math.round(Math.sin(t * 7) * 0.6 + Math.sin(t * 13) * 0.4);
  rect(ctx, CANDLE.x + sway, CANDLE.y - 1, 1, 3, '#fff6dc');
  rect(ctx, CANDLE.x - 1 + sway, CANDLE.y + 1, 3, 2, '#ffc56b');
  rect(ctx, CANDLE.x + sway, CANDLE.y + 3, 1, 1, '#ff8a3a');
}
