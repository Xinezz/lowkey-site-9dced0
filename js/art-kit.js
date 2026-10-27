// Small painters shared by the room and the close-up: leaves, books, pots,
// picture frames. Each draws one thing, shaded as if lit from the left.

import { bayer, ellipse, mixHex, rampColor, rect, shadeRect } from './pixel.js';
import { CLAY, INK, LEAF } from './palette.js';

/**
 * A heart-shaped leaf (like a pothos) with a vein, from (x, y) at the stem
 * end towards `angle` (radians; -π/2 points up), `len` pixels long.
 */
export function drawLeaf(ctx, x, y, len, angle, ramp = LEAF) {
  const ca = Math.cos(angle);
  const sa = Math.sin(angle);
  const r = Math.ceil(len) + 1;
  for (let py = Math.floor(y - r); py <= y + r; py++) {
    for (let px = Math.floor(x - r); px <= x + r; px++) {
      const dx = px - x;
      const dy = py - y;
      const u = dx * ca + dy * sa; // along the leaf, from stem to tip
      const v = -dx * sa + dy * ca; // across it
      if (u < 0 || u > len) continue;
      const half = len * 0.42 * Math.sin(Math.PI * Math.min(1, (u / len) * 0.92 + 0.08)) ** 0.75;
      if (Math.abs(v) > half) continue;
      let level = 0.6 - (v / (half + 0.01)) * 0.22 + (u / len) * 0.12;
      if (Math.abs(v) < 0.7 && u > 1 && u < len - 1.5) level -= 0.3; // the vein
      if (Math.abs(v) > half - 1) level = 0.08; // the rim, a darker green instead of black
      ctx.fillStyle = rampColor(ramp, level, px, py);
      ctx.fillRect(px, py, 1, 1);
    }
  }
}

/** A book standing up, seen from the spine: rounded with light, bands and a tiny title. */
export function drawBookSpine(ctx, x, y, w, h, color) {
  const ramp = [mixHex(color, INK, 0.45), mixHex(color, INK, 0.2), color, mixHex(color, '#fff4d8', 0.3)];
  shadeRect(ctx, x, y, w, h, ramp, (px) => 0.9 - ((px - x) / Math.max(1, w - 1)) * 0.8);
  const gold = mixHex(color, '#f2d08a', 0.6);
  rect(ctx, x, y + 3, w, 1, gold);
  rect(ctx, x, y + h - 4, w, 1, gold);
  if (h > 16) rect(ctx, x, y + h - 7, w, 1, gold);
  for (let ty = y + 6; ty < y + h - 8; ty += 2) rect(ctx, x + Math.floor(w / 2) - 1, ty, Math.min(2, w - 2), 1, mixHex(color, '#ffffff', 0.45));
  rect(ctx, x, y, w, 1, mixHex(color, INK, 0.5)); // top edge
}

/** A book lying flat, seen from the side: cover top and bottom, the page block between. */
export function drawBookLying(ctx, x, y, w, h, color) {
  rect(ctx, x - 1, y - 1, w + 2, h + 2, mixHex(color, INK, 0.65));
  rect(ctx, x, y, w, h, color);
  rect(ctx, x, y, w, 1, mixHex(color, '#ffffff', 0.3));
  rect(ctx, x + 2, y + 1, w - 3, h - 2, '#f3ead6');
  for (let py = y + 1; py < y + h - 1; py++) {
    for (let px = x + 2; px < x + w - 1; px++) if ((px + py * 3) % 4 === 0) rect(ctx, px, py, 1, 1, '#d9cdb6');
  }
}

/** A terracotta pot, `w` wide at the rim, standing on `bottom`, centred on cx. */
export function drawPot(ctx, cx, bottom, w, h, ramp = CLAY) {
  const top = bottom - h;
  for (let y = top + 3; y < bottom; y++) {
    const half = Math.round(w / 2 - ((y - top) / h) * (w * 0.12));
    shadeRect(ctx, cx - half, y, half * 2 + 1, 1, ramp, (px) => 0.85 - ((px - (cx - half)) / (half * 2)) * 0.75);
  }
  rect(ctx, cx - w / 2 - 1, top, w + 3, 4, ramp[3]); // rim
  rect(ctx, cx - w / 2 - 1, top, w + 3, 1, ramp[4]);
  rect(ctx, cx - w / 2 - 1, top + 3, w + 3, 1, ramp[1]);
  rect(ctx, cx - w / 2 + 1, top - 1, w - 1, 1, '#3b2a2a'); // soil
}

/** A small round succulent in a pot. */
export function drawSucculent(ctx, cx, bottom) {
  shadeRect(ctx, cx - 5, bottom - 6, 10, 6, CLAY, (px) => 0.85 - ((px - (cx - 5)) / 9) * 0.7);
  rect(ctx, cx - 6, bottom - 7, 12, 2, CLAY[4]);
  for (const [dx, dy, r] of [[0, -11, 3], [-3, -9, 2], [3, -9, 2], [0, -14, 2]]) {
    ellipse(ctx, cx + dx, bottom + dy, r + 1, r, LEAF[1]);
    ellipse(ctx, cx + dx, bottom + dy, r, r - 1, LEAF[4]);
    rect(ctx, cx + dx - 1, bottom + dy - 1, 1, 1, LEAF[5]);
  }
}

/**
 * A picture in a frame. `paint(ctx, x, y, w, h)` draws the picture itself
 * inside the mat.
 */
export function drawFramed(ctx, x, y, w, h, frame, paint) {
  rect(ctx, x + 2, y + 2, w, h, 'rgba(20, 12, 30, 0.35)'); // shadow on the wall
  rect(ctx, x, y, w, h, mixHex(frame, INK, 0.4));
  rect(ctx, x + 1, y + 1, w - 2, h - 2, frame);
  rect(ctx, x + 1, y + 1, w - 2, 1, mixHex(frame, '#ffffff', 0.3));
  rect(ctx, x + 3, y + 3, w - 6, h - 6, '#efe6d8'); // mat
  paint(ctx, x + 5, y + 5, w - 10, h - 10);
  rect(ctx, x + 5, y + 5, w - 10, 1, 'rgba(20, 12, 30, 0.25)'); // the mat's inner shadow
}

/** A soft dithered shadow ellipse, e.g. under furniture. */
export function softShadow(ctx, cx, cy, rx, ry, alpha = 0.4) {
  for (let y = -ry; y <= ry; y++) {
    for (let x = -rx; x <= rx; x++) {
      const d = (x / rx) ** 2 + (y / ry) ** 2;
      if (d > 1) continue;
      if (d > 0.55 && bayer(cx + x, cy + y) > 0.5) continue;
      rect(ctx, cx + x, cy + y, 1, 1, `rgba(20, 10, 30, ${alpha})`);
    }
  }
}
