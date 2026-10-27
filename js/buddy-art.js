// Draws the study buddy (see buddy.js for where they are and what they're doing).
//
// The heads are text sprites like the rest of the game's art. The bodies
// are built from rectangles: that makes poses (sitting, walking, sipping
// tea) easy to animate by moving a few numbers, and easy to restyle later.
// Side views are always drawn facing right, then mirrored to face left.
//
// The buddy is painted at their own small size on a little canvas, then
// shown ITEM_SCALE times bigger in the room, like the decorations.

import { CHAIR, ITEM_SCALE } from './layout.js';
import { drawSprite, rect } from './pixel.js';

const COLORS = {
  outline: '#2b2138',
  hoodie: '#86b89e',
  hoodieShade: '#5f9079',
  jeans: '#4b5d8a',
  jeansShade: '#3b4a70',
  skin: '#f2c7a5',
  shoes: '#f1ecf7',
  mug: '#e89fb4',
};

const HEAD_PALETTE = {
  o: COLORS.outline,
  H: '#4a3346', // hair
  h: '#6b4a5e', // hair highlight
  P: '#e9e1ff', // headphone band (light, so it reads clearly against dark hair)
  p: '#9a7ac0', // headphone cups
  S: COLORS.skin,
  c: '#eaa0a0', // blush
  k: '#2b2138', // eye
};

// Seen from behind, sitting at the desk: hair, headphone band and ear cups.
const headBack = {
  name: 'buddyHeadBack',
  palette: HEAD_PALETTE,
  rows: [
    '....oooooooo....',
    '...oHHHHHHHHo...',
    '..oHPPPPPPPPHo..',
    '.oHPHHHHHHHHPHo.',
    '.oHPHHhhhHHHPHo.',
    'oHPHHHHHHHHHHPHo',
    'oppHHHHHHHHHHppo',
    'oppHHHHHHHHHHppo',
    'oppHHHHHHHHHHppo',
    'oHHHHHHHHHHHHHHo',
    '.oHHHHHHHHHHHHo.',
    '.oHHHHHHHHHHHHo.',
    '..oHHHHHHHHHHo..',
    '...ooHHHHHHoo...',
    '.....oSSSSo.....',
    '.....oSSSSo.....',
  ],
};

// Seen from the side, facing right.
const headSide = {
  name: 'buddyHeadSide',
  palette: HEAD_PALETTE,
  rows: [
    '....ooooooo.....',
    '...oHHHHHHHo....',
    '..oHHHHHHHHHo...',
    '.oHHPPPPPHHHHo..',
    '.oHHHHHPHHHHSo..',
    'oHHHHHppHHHSSSo.',
    'oHHHHppppHHSSSo.',
    'oHHHHppppHSSkSSo',
    'oHHHHHppHHSSSSSo',
    '.oHHHHHHHSSSSSo.',
    '.oHHHHHHSSScSo..',
    '..oHHHHHSSSSo...',
    '...oHHHHSSSo....',
    '....ooHHSSo.....',
    '......oSSo......',
    '......oSSo......',
  ],
};

// A tiny music note that drifts up from the headphones while studying.
const note = {
  name: 'buddyNote',
  palette: { n: '#e9e1ff' },
  rows: ['..nn', '..n.', '..n.', 'nnn.', 'nn..'],
};

export const BUDDY_SPRITES = { headBack, headSide, note };

const SCALE = ITEM_SCALE;
const STANDING_W = 20;
const STANDING_H = 58;
// The seated pose's little canvas: the chair back's top edge is at row
// SEAT_BACK_ROW, with room above for the head and a drifting music note.
const SEAT_W = 36;
const SEAT_H = 54;
const SEAT_CX = 18;
const SEAT_BACK_ROW = 48;

/** How far forward the buddy is, for depth sorting (bigger = closer to you). */
export function buddyDepth(buddy) {
  // Sitting: just behind the chair, so the chair's back covers their lower half.
  return buddy.mode === 'seated' ? CHAIR.floorY - 1 : buddy.y;
}

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {object} buddy  From buddy.js.
 * @param {boolean} studying  True while a focus session is running (not paused).
 * @param {number} t  Time in seconds, for animation.
 */
export function drawBuddy(ctx, buddy, studying, t) {
  if (buddy.mode === 'away') return;
  if (buddy.mode === 'seated') drawSeated(ctx, studying, t);
  else drawStanding(ctx, buddy, t);
}

/** A rectangle with a 1-pixel outline, the building block of the body. */
function outlined(ctx, x, y, w, h, fill) {
  rect(ctx, x, y, w, h, COLORS.outline);
  rect(ctx, x + 1, y + 1, w - 2, h - 2, fill);
}

let seatedCtx = null; // a small off-screen canvas, created on first use

function drawSeated(ctx, studying, t) {
  if (!seatedCtx) seatedCtx = smallCanvas(SEAT_W, SEAT_H);
  const c = seatedCtx;
  c.clearRect(0, 0, SEAT_W, SEAT_H);
  const cx = SEAT_CX;
  const back = SEAT_BACK_ROW;
  const nod = studying && t % 7 > 6.2 ? 1 : 0; // a small nod every few seconds
  const writing = studying && Math.floor(t * 3) % 2 === 1 ? 1 : 0; // the writing arm moves
  const headTop = back - 30 + nod;

  outlined(c, cx - 10, back - 17, 20, 22, COLORS.hoodie); // back and shoulders; the chair hides the rest
  rect(c, cx - 5, back - 16, 10, 5, COLORS.hoodieShade); // the hood, lying on their back
  outlined(c, cx - 13, back - 14, 4, 14, COLORS.hoodie); // left arm
  outlined(c, cx + 9, back - 14 - writing, 4, 14, COLORS.hoodie); // right arm, writing
  drawSprite(c, headBack, cx - 8, headTop);

  if (studying) {
    const p = (t % 4) / 4; // 0 → 1 as the note floats up and fades
    c.globalAlpha = 0.8 * (1 - p);
    drawSprite(c, note, cx + 9 + Math.floor(p * 4), headTop - 2 - Math.floor(p * 10));
    c.globalAlpha = 1;
  }
  ctx.drawImage(c.canvas, CHAIR.cx - SEAT_CX * SCALE, CHAIR.backTop - back * SCALE, SEAT_W * SCALE, SEAT_H * SCALE);
}

function smallCanvas(w, h) {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  return canvas.getContext('2d');
}

// ---- Standing and walking ----------------------------------------------------

let standingCtx = null; // a small off-screen canvas, created on first use

function drawStanding(ctx, buddy, t) {
  if (!standingCtx) standingCtx = smallCanvas(STANDING_W, STANDING_H);
  standingCtx.clearRect(0, 0, STANDING_W, STANDING_H);
  paintStanding(standingCtx, buddy.mode === 'walking' ? walkPose(buddy.walked) : relaxPose(t));

  const left = Math.round(buddy.x);
  const top = Math.round(buddy.y) - STANDING_H * SCALE;
  if (buddy.facing < 0) {
    // Mirror: move to the right edge, then flip the x axis.
    ctx.save();
    ctx.translate(left + STANDING_W * SCALE, top);
    ctx.scale(-1, 1);
    ctx.drawImage(standingCtx.canvas, 0, 0, STANDING_W * SCALE, STANDING_H * SCALE);
    ctx.restore();
  } else {
    ctx.drawImage(standingCtx.canvas, left, top, STANDING_W * SCALE, STANDING_H * SCALE);
  }
}

/**
 * Four-frame walk cycle. The frame comes from distance walked (not time),
 * so the feet always match how far the body moved and never "slide".
 */
function walkPose(walked) {
  const frame = Math.floor(walked / (5 * SCALE)) % 4; // a step every 5 of the buddy's own pixels
  const stride = [2, 0, -2, 0][frame];
  return { frontShin: stride, backShin: -stride, arm: 'swing', armSwing: -Math.sign(stride), bob: frame % 2 };
}

/** Standing by the window with a drink, taking a sip every few seconds. */
function relaxPose(t) {
  return { frontShin: 0, backShin: 0, arm: t % 6 > 4.8 ? 'sip' : 'hold', armSwing: 0, bob: 0 };
}

// Standing figure, top to bottom: head 0–15, hoodie 16–36, legs 36–54, shoes 54–57.
function paintStanding(ctx, pose) {
  const { bob } = pose;
  paintLeg(ctx, 5, pose.backShin, COLORS.jeansShade); // the far leg, in shadow
  paintLeg(ctx, 10, pose.frontShin, COLORS.jeans);

  outlined(ctx, 4, 16 + bob, 12, 21, COLORS.hoodie);
  rect(ctx, 5, 17 + bob, 3, 5, COLORS.hoodieShade); // hood
  rect(ctx, 8, 30 + bob, 7, 1, COLORS.hoodieShade); // pocket

  paintArm(ctx, pose, 18 + bob);
  drawSprite(ctx, headSide, 2, bob);
}

function paintLeg(ctx, x, shin, color) {
  outlined(ctx, x, 36, 5, 9, color); // thigh
  outlined(ctx, x + shin, 44, 5, 11, color); // shin, swings forward or back
  outlined(ctx, x + shin, 54, 6, 4, COLORS.shoes); // shoe, pointing forward
}

function paintArm(ctx, pose, shoulderY) {
  if (pose.arm === 'swing') {
    outlined(ctx, 8 + pose.armSwing, shoulderY, 4, 13, COLORS.hoodie);
    rect(ctx, 9 + pose.armSwing, shoulderY + 12, 2, 2, COLORS.skin); // hand
    return;
  }
  outlined(ctx, 8, shoulderY, 4, 8, COLORS.hoodie); // upper arm
  if (pose.arm === 'hold') {
    outlined(ctx, 10, shoulderY + 6, 5, 4, COLORS.hoodie); // forearm, held out
    rect(ctx, 14, shoulderY + 7, 2, 2, COLORS.skin);
    outlined(ctx, 15, shoulderY + 3, 4, 6, COLORS.mug);
  } else {
    outlined(ctx, 11, shoulderY - 3, 4, 10, COLORS.hoodie); // forearm, raised to drink
    rect(ctx, 12, shoulderY - 4, 2, 2, COLORS.skin);
    outlined(ctx, 13, 8, 4, 5, COLORS.mug); // mug at the mouth
  }
}
