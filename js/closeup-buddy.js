// The study buddy up close, for the close-up view during focus (closeup.js),
// at full resolution. Seen from the side, facing left over their notebook:
// plum hair to the shoulders with a side-swept fringe, round glasses, big
// lavender headphones and an oversized mint hoodie.
//
// The parts are big (the head is 124 × 156 pixels), so they're painted with
// geometry rather than typed pixel by pixel. The head is described upright
// (a face profile, row by row: forehead, nose, lips, chin) and then painted
// tilted forward, so the buddy looks down at their work: each pixel asks
// "where would I be on an upright head?" and takes that colour.
//
// Shading picks from colour ramps as if light came from the lamp and window
// on the left; edges facing the light get a rim of brighter colour, and each
// part gets an outline in its own deep colour. They're still ordinary text
// sprites, so the sprite tests check them too. No DOM code at the top level.

import { addOutline, addRim, distanceToSegment, inEllipse, paintSprite } from './sprite-tools.js';
import { ditherStep, drawSprite } from './pixel.js';

const PALETTE = {
  // Outlines, each a deep shade of what it surrounds.
  a: '#170d1c', // hair
  b: '#7a3b3a', // skin
  v: '#211836', // headphones
  g: '#17302c', // hoodie
  n: '#4a3020', // pencil
  // Hair: deep plum, shadows leaning blue, highlights leaning pink.
  1: '#1c1024',
  2: '#2e1a36',
  3: '#45284d',
  4: '#633c64',
  5: '#8c5a84',
  6: '#bf8bab',
  // Skin.
  r: '#ad5f5a',
  s: '#d28b77',
  S: '#efb796',
  L: '#ffd7bc',
  e: '#fff0e0', // rim light
  c: '#ec8b91', // blush
  m: '#d07a80', // lips
  u: '#93434e', // where the lips meet
  // Eyes and glasses.
  k: '#23111f', // lashes
  i: '#4a2a4a', // iris
  j: '#86587e', // iris, lit from below
  w: '#ffffff',
  f: '#2b1a30', // glasses frame
  G: '#eef8ff', // glint on the lens
  // Headphones.
  Q: '#3c3070',
  q: '#6a59a8',
  p: '#9884d6',
  P: '#dccfff',
  x: '#281f3e', // ear cushion
  X: '#43365e',
  o: '#a8e0ff', // a little light on the cup
  t: '#bab2ce', // metal slider
  // Hoodie: mint, shadows leaning teal, highlights leaning yellow.
  D: '#22403c',
  N: '#386558',
  h: '#578e77',
  l: '#7db497',
  H: '#a9d9b8',
  R: '#d2efd6', // rim light
  W: '#efeaf5', // drawstrings
  Z: '#b8b0cc', // their metal tips
  T: '#e9e3f1', // the T-shirt under the hoodie
  U: '#b4abc8',
  // Pencil.
  Y: '#f4c54f',
  y: '#c98f2a',
  A: '#e8c39e',
  K: '#3a3340',
  F: '#cfc8dc',
  E: '#e98fa8',
};

const OUTLINE_FOR = {};
for (const k of '123456') OUTLINE_FOR[k] = 'a';
for (const k of 'rsSLecmukijwGf') OUTLINE_FOR[k] = 'b';
for (const k of 'QqpPxXot') OUTLINE_FOR[k] = 'v';
for (const k of 'DNhlHRWZTU') OUTLINE_FOR[k] = 'g';
for (const k of 'YyAKFE') OUTLINE_FOR[k] = 'n';
const outlineFor = (key) => OUTLINE_FOR[key] ?? 'a';
const RIM = { S: 'e', L: 'e', s: 'S', 3: '5', 4: '6', 5: '6', h: 'R', l: 'R', N: 'l', q: 'p', p: 'P' };

// Light from the left (the lamp) and a little from above (the window).
const LIGHT = normalize([-0.8, -0.45]);

function normalize([x, y]) {
  const d = Math.hypot(x, y);
  return [x / d, y / d];
}

/** A ramp key for a level from 0 (darkest) to 1 (lightest). */
function shade(keys, level, x, y) {
  return keys[Math.max(0, Math.min(keys.length - 1, ditherStep(level * (keys.length - 1), x, y)))];
}

/** How much a rounded surface centred on (cx, cy) faces the light, 0 → 1. */
function roundLight(x, y, cx, cy, rx, ry) {
  return 0.5 + (((x - cx) / rx) * LIGHT[0] + ((y - cy) / ry) * LIGHT[1]) * 0.55;
}

function lerp(a, b, t) {
  return a + (b - a) * Math.max(0, Math.min(1, t));
}

/** Reads a value off a list of [v, u] points by straight lines between them. */
function along(points, v) {
  if (v <= points[0][0]) return points[0][1];
  for (let i = 1; i < points.length; i++) {
    const [v0, u0] = points[i - 1];
    const [v1, u1] = points[i];
    if (v <= v1) return u0 + ((u1 - u0) * (v - v0)) / (v1 - v0);
  }
  return points.at(-1)[1];
}

// ---- The head, described upright, facing left -------------------------------

const HEAD_W = 124;
const HEAD_H = 156;
const HEAD_TOP = 10; // empty rows above the crown, for the headband
const PIVOT = [62, 112]; // the head tilts around the top of the neck

// The front of the face, as [row, column] points: forehead, brow, the dip
// at the eye, the nose, lips, chin, then back under the jaw.
const PROFILE = [
  [28, 25], [36, 23], [44, 21], [47, 21], [50, 23], [56, 23], [60, 21], [64, 19], [68, 17], [70, 16], [72, 17],
  [74, 20], [76, 21], [78, 20], [80, 22], [82, 21], [84, 22], [87, 24], [90, 24], [94, 24], [97, 26], [100, 30],
  [102, 36], [103, 44],
];

function faceEdge(v) {
  return v < 26 || v > 104 ? Infinity : along(PROFILE, v);
}

/** The back of the cheek and jaw: up to the ear, which the headphones cover. */
function jawBack(v) {
  if (v < 74) return 70;
  if (v < 92) return lerp(72, 66, (v - 74) / 18);
  return lerp(66, 40, (v - 92) / 12);
}

function isFace(u, v) {
  return v >= 26 && v <= 104 && u >= faceEdge(v) && u <= jawBack(v);
}

function isNeck(u, v) {
  return v >= 90 && v <= HEAD_H - HEAD_TOP && u >= lerp(46, 54, (v - 90) / 56) && u <= lerp(70, 84, (v - 90) / 56);
}

/** Where the fringe ends over the forehead: strands of slightly different lengths. */
function fringe(u) {
  return 36 + 7 * Math.abs(Math.sin(u * 0.33)) + (u < 30 ? 3 : 0) - (u > 46 ? 3 : 0);
}

/** A lock of hair falling in front of the ear, framing the face. */
function isSideLock(u, v) {
  return v >= 36 && v <= 99 + 3 * Math.sin(u * 0.9) && u >= 51 + 2 * Math.sin(v * 0.18) && u <= 64;
}

function isHair(u, v) {
  if (inEllipse(u, v, 64, 44, 44, 46)) return true; // crown and the back of the head
  return u >= 60 && v >= 30 && v <= 128 + 4 * Math.sin(u * 0.3) && inEllipse(u, v, 84, 84, 28, 48); // down to the shoulders
}

const CUP = { x: 76, y: 68, rx: 16, ry: 22 };

/** The eye, for each way the buddy can look: lashes, iris, and a spark of light. */
function eyeKey(u, v, look) {
  if (look === 'blink') {
    const lid = 58 + ((u - 29) / 6) ** 2 * -1.2;
    if (u >= 24 && u <= 34 && Math.abs(v - lid) < 1) return 'k';
    if (u === 23 && v === 58) return 'k';
    return null;
  }
  const down = look === 'down';
  const lidTop = down ? 55 : 52;
  const lid = lidTop + ((u - 29) / 5) ** 2 * 1.2;
  if (u >= 25 && u <= 34 && v >= lid && v < lid + 2) return 'k'; // the upper lid, with lashes
  if ((u === 24 && v === lidTop) || (u === 23 && v === lidTop - 1)) return 'k'; // a lash flicking out at the front
  const irisTop = lid + 2;
  const irisBottom = down ? 60 : 61;
  if (u >= 26 && u <= 31 && v >= irisTop && v <= irisBottom) {
    if (u === 29 && v === Math.ceil(irisTop)) return 'w';
    return v >= irisBottom - 1 ? 'j' : 'i';
  }
  if (u >= 27 && u <= 32 && v === 62) return 's'; // the lower lid
  return null;
}

function faceKey(u, v, look) {
  const eye = eyeKey(u, v, look);
  if (eye) return eye;
  // An eyebrow, drawn a little lower at the front: concentrating.
  if (u >= 22 && u <= 36 && v >= 46 - (u - 22) * 0.06 && v <= 47.6 - (u - 22) * 0.06) return '2';
  const edge = faceEdge(v);
  if (v >= 77 && v <= 79 && u <= edge + 2) return 'm';
  if (v === 80 && u <= edge + 3) return 'u';
  if (v >= 81 && v <= 82 && u <= edge + 1) return 'm';
  if (u === 21 && v === 73) return 'r'; // nostril
  if (u <= edge + 0.5 && v >= 67 && v <= 70) return 'L'; // light on the tip of the nose
  if (inEllipse(u, v, 31, 70, 4.5, 1.6)) return 'c';
  let level = 0.84 - ((u - edge) / 40) * 0.55;
  if (v <= fringe(u) + 3) level -= 0.3; // the fringe's shadow on the forehead
  if (v >= 96) level -= 0.32; // under the chin
  if (u >= 56) level -= 0.25; // in the shadow of the hair and headphones
  if (u >= 19 && u <= 23 && v >= 73 && v <= 74) level -= 0.2; // under the nose
  if (inEllipse(u, v, 28, 64, 4, 2)) level += 0.15; // the top of the cheek
  return shade('rsSL', level, u, v);
}

function hairKey(u, v) {
  const nx = (u - 64) / 44;
  const ny = (v - 44) / 46;
  let level = 0.38 - (nx * 0.55 + ny * 0.4) * 0.55;
  // Strands fan out from the parting. Two waves at different scales make
  // them irregular, like real hair, instead of tidy stripes.
  const angle = Math.atan2(v + 2, u - 50);
  const dist = Math.hypot(u - 50, v + 2);
  level += (Math.sin(angle * 37 + dist * 0.04) * 0.6 + Math.sin(angle * 83 + dist * 0.11) * 0.4) * 0.09;
  const r = Math.hypot((u - 58) / 40, (v - 30) / 38);
  if (r > 0.6 && r < 0.68 && u < 68 && v < 40) level += 0.26; // the shine glossy hair gets
  if (v > 92 || u > 98) level -= 0.12;
  return shade('123456', level, u, v);
}

function headphoneKey(u, v) {
  // The cup over the ear.
  const nx = (u - CUP.x) / CUP.rx;
  const ny = (v - CUP.y) / CUP.ry;
  const d = nx * nx + ny * ny;
  if (d <= 1) {
    if (d > 0.86) return 'Q'; // the shell's edge
    if (nx < -0.62) return d > 0.5 ? 'x' : 'X'; // the cushion, against the head
    if (d > 0.18 && d < 0.26) return 'q'; // a ring pressed into the shell
    if (u >= 79 && u <= 80 && v >= 78 && v <= 79) return 'o';
    return shade('QqpP', roundLight(u, v, CUP.x, CUP.y, CUP.rx, CUP.ry) + 0.12, u, v);
  }
  // The slider joining cup and band.
  if (v >= 40 && v <= CUP.y - CUP.ry + 1 && Math.abs(u - 75) <= 2) return 't';
  // The band: up from the cup over the crown, just clear of the hair.
  const bandU = 74 - (46 - v) * 0.08;
  const top = 44 - 46 * Math.sqrt(Math.max(0, 1 - ((bandU - 64) / 44) ** 2));
  const off = u - bandU;
  if (v >= top - 2 && v <= 42 && Math.abs(off) <= 4) {
    if (Math.abs(off) > 3.2) return 'Q';
    return off < -1.5 ? 'P' : off < 1 ? 'p' : 'q';
  }
  return null;
}

/** The glasses: a thin round lens in front of the eye, and an arm back to the ear. */
function glassesKey(u, v) {
  const lens = ((u - 21) / 3.6) ** 2 + ((v - 57) / 7.5) ** 2;
  if (lens <= 1 && lens >= 0.55) return 'f';
  if (lens < 0.55 && u <= 20 && v >= 51 && v <= 53) return 'G';
  // The arm, from the top of the lens back towards the ear.
  if (u >= 24 && u <= 60 && Math.abs(v - (52 + (u - 24) * 0.06)) < 0.6) return 'f';
  return null;
}

/** Which colour an upright head pixel is: the parts in front win. */
function headKey(u, v, look) {
  const phones = headphoneKey(u, v);
  if (phones) return phones;
  const face = isFace(u, v);
  const lock = isSideLock(u, v);
  if (face || inEllipse(u, v, 21, 57, 3.6, 7.5)) {
    const glasses = glassesKey(u, v);
    if (glasses) return glasses;
  }
  if (face && v >= fringe(u) && !lock) return faceKey(u, v, look);
  if (isHair(u, v) || lock) {
    if (u >= 24 && u <= 60 && Math.abs(v - (52 + (u - 24) * 0.06)) < 0.6) return 'f'; // the glasses' arm over the hair
    return hairKey(u, v);
  }
  if (isNeck(u, v)) return v <= 100 ? 'r' : u <= lerp(48, 56, (v - 90) / 56) ? 'S' : 's';
  return null;
}

/**
 * Paints the head tilted forward by `tilt` degrees (looking down at the
 * desk), or nearly upright when looking ahead.
 */
function paintHead(look, tilt) {
  const a = (tilt * Math.PI) / 180;
  const cos = Math.cos(a);
  const sin = Math.sin(a);
  const [px, py] = PIVOT;
  const sprite = paintSprite(`closeupHead-${look}-${tilt}`, HEAD_W, HEAD_H, PALETTE, (x, y) => {
    // Where this pixel would be on the upright head.
    const dx = x - px;
    const dy = y - HEAD_TOP - py;
    const u = Math.round(px + dx * cos - dy * sin);
    const v = Math.round(py + dx * sin + dy * cos);
    return headKey(u, v, look);
  });
  return addOutline(addRim(sprite, RIM), outlineFor);
}

// ---- The body: an oversized hoodie, leaning towards the desk -----------------

// The torso's own coordinates start just left of the neck: the collar is at (60, 18).
const TORSO = { x: 300, y: 181, w: 196, h: 200 };

function torsoFront(y) {
  return 44 - (y - 24) * 0.17;
}

function torsoBack(y) {
  // Shoulder blades round outwards, then the back curves in towards the chair.
  return 146 + Math.sin(Math.min(1, Math.max(0, (y - 10) / 150)) * Math.PI) * 18 - Math.max(0, y - 150) * 0.1;
}

function insideTorso(x, y) {
  return (
    inEllipse(x, y, 94, 22, 28, 16) || // the hood, bunched at the back of the neck
    inEllipse(x, y, 100, 46, 58, 30) || // shoulders
    (y >= 24 && x >= torsoFront(y) && x <= torsoBack(y))
  );
}

function paintTorso() {
  const sprite = paintSprite('closeupTorso', TORSO.w, TORSO.h, PALETTE, (x, y) => {
    // The T-shirt's collar, inside the hoodie's.
    if (inEllipse(x, y, 60, 20, 11, 5)) return y < 19 ? 'U' : 'T';
    if (!insideTorso(x, y)) return null;
    if (inEllipse(x, y, 94, 22, 28, 16) && !inEllipse(x, y, 100, 50, 58, 28)) {
      if (inEllipse(x, y, 92, 20, 16, 8)) return 'D'; // inside the hood
      return shade('DNhl', 0.6 - (y - 4) / 40 + (x < 88 ? 0.2 : 0), x, y);
    }
    // Drawstrings, with metal tips.
    for (const [x0, x1, y1] of [[54, 46, 74], [66, 60, 70]]) {
      if (y >= 22 && y <= y1 && Math.abs(x - lerp(x0, x1, (y - 22) / (y1 - 22))) < 1) return y >= y1 - 3 ? 'Z' : 'W';
    }
    const front = torsoFront(Math.max(24, y));
    const back = torsoBack(Math.max(24, y));
    const across = (x - front) / Math.max(1, back - front);
    let level = 0.8 - across * 0.68;
    if (!insideTorso(x, y - 3)) level += 0.25; // the tops of the shoulders
    // Soft folds hanging down from under the arm.
    for (let k = 0; k < 3; k++) {
      const crease = x - 96 + (y - 70) * 0.4 + k * 18;
      if (y > 72 && Math.abs(crease) < 1.1) level -= 0.28;
      else if (y > 72 && crease > 1.1 && crease < 2.8) level += 0.08;
    }
    if (Math.abs(x - front - 16 - Math.sin(y * 0.05) * 3) < 0.9 && y > 56) level -= 0.18; // a long fold down the chest
    if (Math.abs(y - 150 + (x - front) * 0.05) < 0.8 && across < 0.45) level -= 0.3; // the front pocket's top
    return shade('DNhlH', level, x, y);
  });
  return addOutline(addRim(sprite, RIM), outlineFor);
}

/** The hoodie's collar on its own, drawn over the neck so the neck tucks into it. */
function paintCollar() {
  const sprite = paintSprite('closeupCollar', 52, 24, PALETTE, (x, y) => {
    // A U shape: the collar shows under the chin, the hood covers the back.
    if (!inEllipse(x, y, 26, 12, 22, 9) || inEllipse(x, y, 24, 8, 16, 6) || y < 8) return null;
    return shade('NhlH', 0.85 - y / 18 - (x / 52) * 0.35, x, y);
  });
  return addOutline(addRim(sprite, RIM), outlineFor);
}

// ---- Arms and hands --------------------------------------------------------

// The arm reaches forward along the desk, so the hand writes on the page
// in front of the buddy: the upper arm hangs from the shoulder, and the
// forearm rests on the desk.
const ARM = { x: 245, y: 211, w: 172, h: 136 };
const SHOULDER = [152, 16];
const ELBOW = [133, 89];
const WRIST = [61, 85];
const PENCIL_TIP = [WRIST[0] - 38, WRIST[1] + 10];
const PENCIL_END = [PENCIL_TIP[0] + 28, PENCIL_TIP[1] - 40];

/** The sleeve and hand that write. Fingers are little capsules wrapped round the pencil. */
function paintArm() {
  const [wx, wy] = WRIST;
  // Each finger from its knuckle to its tip, measured from the wrist.
  const fingers = [
    [[-20, -8], [-34, 1], 4.2], // index
    [[-18, -2], [-30, 5], 3.8], // middle
    [[-16, 2], [-24, 7], 3.4], // ring, tucked under
    [[-14, -13], [-28, -8], 3.8], // thumb, over the pencil
  ].map(([[x0, y0], [x1, y1], r]) => [[wx + x0, wy + y0], [wx + x1, wy + y1], r]);
  const sprite = paintSprite('closeupArm', ARM.w, ARM.h, PALETTE, (x, y) => {
    // Fingers and the back of the hand.
    for (const [[x0, y0], [x1, y1], r] of fingers) {
      const d = distanceToSegment(x, y, x0, y0, x1, y1);
      if (d <= r) {
        const tip = Math.hypot(x - x1, y - y1) < 1.6;
        if (tip && y <= y1) return 'L'; // a nail catching the light
        return shade('rsSL', 0.85 - (d / r) * 0.35 - (y - wy + 12) / 40, x, y);
      }
    }
    if (inEllipse(x, y, wx - 12, wy - 5, 13, 9)) {
      if (Math.abs(x - wx + 19 - (y - wy + 5) * 0.4) < 0.6) return 's'; // knuckle line
      return shade('rsSL', 0.82 - (y - wy + 14) / 22 - (x - wx + 24) * 0.012, x, y);
    }
    // The pencil, held between the fingers.
    const pd = distanceToSegment(x, y, ...PENCIL_TIP, ...PENCIL_END);
    if (pd <= 1.6) {
      const t = Math.hypot(x - PENCIL_TIP[0], y - PENCIL_TIP[1]) / Math.hypot(PENCIL_END[0] - PENCIL_TIP[0], PENCIL_END[1] - PENCIL_TIP[1]);
      if (t < 0.05) return 'K';
      if (t < 0.12) return 'A';
      if (t > 0.93) return 'E';
      if (t > 0.87) return pd < 0.5 ? 'P' : 'F';
      return x + (y - PENCIL_TIP[1]) * 0.7 < PENCIL_TIP[0] + 1 ? 'Y' : 'y';
    }
    // The sleeve: a wide upper arm down to the elbow, then the forearm resting on the desk.
    const fore = distanceToSegment(x, y, ...ELBOW, ...WRIST);
    const foreRadius = lerp(8.5, 11.5, (x - WRIST[0]) / (ELBOW[0] - WRIST[0])); // thinner at the wrist
    if (fore <= foreRadius && x >= WRIST[0] - 4) {
      if (x <= WRIST[0] + 8) return x % 2 ? 'N' : 'h'; // ribbed cuff
      let level = 0.72 - ((y - ELBOW[1] + 3) / foreRadius) * 0.45;
      const fromElbow = Math.hypot(x - ELBOW[0], y - ELBOW[1]);
      if (fromElbow < 22) {
        // Bunched fabric at the bend of the elbow: a few zig-zag creases.
        const zig = Math.abs(((x + y * 0.6) % 9) - 4.5);
        if (zig < 0.9 && fromElbow > 8) level -= 0.3;
      }
      return shade('DNhlH', level, x, y);
    }
    const upper = distanceToSegment(x, y, ...SHOULDER, ...ELBOW);
    const upperRadius = lerp(14, 12, (y - SHOULDER[1]) / (ELBOW[1] - SHOULDER[1]));
    if (upper <= upperRadius) {
      const len = Math.hypot(ELBOW[0] - SHOULDER[0], ELBOW[1] - SHOULDER[1]);
      const side = ((x - SHOULDER[0]) * (ELBOW[1] - SHOULDER[1]) - (y - SHOULDER[1]) * (ELBOW[0] - SHOULDER[0])) / len;
      let level = 0.6 - (side / upperRadius) * 0.4;
      if (Math.abs(side + 5 + Math.sin(y * 0.1) * 2) < 0.8 && y > 30) level -= 0.25; // a fold down the sleeve
      return shade('DNhlH', level, x, y);
    }
    return null;
  });
  return addOutline(addRim(sprite, RIM), outlineFor);
}

const FAR_ARM = { x: 293, y: 307, w: 150, h: 36 };

/** The other arm, mostly hidden behind the body, its hand flat on the notebook holding the page. */
function paintFarArm() {
  const fingers = [
    [[24, 18], [9, 14], 2.6],
    [[24, 21], [7, 19], 2.7],
    [[25, 24], [9, 24], 2.6],
    [[27, 27], [13, 29], 2.4],
    [[32, 17], [24, 11], 2.6], // thumb
  ];
  const sprite = paintSprite('closeupFarArm', FAR_ARM.w, FAR_ARM.h, PALETTE, (x, y) => {
    for (const [[x0, y0], [x1, y1], r] of fingers) {
      const d = distanceToSegment(x, y, x0, y0, x1, y1);
      if (d <= r) return Math.hypot(x - x1, y - y1) < 1.4 ? 'L' : shade('rsSL', 0.8 - (d / r) * 0.3 - (y - 12) / 40, x, y);
    }
    if (inEllipse(x, y, 32, 22, 9, 7)) return shade('rsSL', 0.72 - (y - 15) / 18, x, y);
    if (distanceToSegment(x, y, 42, 22, 146, 24) <= 9) {
      if (x < 48) return x % 2 ? 'D' : 'N'; // cuff
      return shade('DNhl', 0.5 - (y - 14) / 30, x, y); // in the body's shadow
    }
    return null;
  });
  return addOutline(sprite, outlineFor);
}

// A music note that drifts up from the headphones while studying.
const NOTE = {
  name: 'closeupNote',
  palette: { n: '#e9e1ff', o: '#2b2138' },
  rows: ['...oooo', '..onnno', '..onnno', '..on...', 'oonn...', 'onnn...', 'oonn...'],
};

const HEAD_TILT = { down: 13, up: 3 };

export const CLOSEUP_SPRITES = {
  headDown: paintHead('down', HEAD_TILT.down),
  headDownBlink: paintHead('blink', HEAD_TILT.down),
  headUp: paintHead('up', HEAD_TILT.up),
  headUpBlink: paintHead('blink', HEAD_TILT.up),
  torso: paintTorso(),
  collar: paintCollar(),
  arm: paintArm(),
  farArm: paintFarArm(),
  note: NOTE,
};

const HEAD_POS = { x: 285, y: 61 };

// Where the pencil touches the paper, so the notebook's newest line can start there.
export const PENCIL_POINT = Object.freeze({ x: ARM.x + PENCIL_TIP[0], y: ARM.y + PENCIL_TIP[1] });

/**
 * Draws the buddy at the desk.
 * @param {CanvasRenderingContext2D} ctx
 * @param {boolean} studying  True while focus is running; false while paused.
 * @param {number} t  Time in seconds.
 */
export function drawCloseUpBuddy(ctx, studying, t) {
  const breath = t % 4.5 > 2.6 ? 1 : 0; // shoulders rise and fall slowly
  const resting = !studying || t % 10 > 8.7; // a short pause in the writing every few seconds
  const nod = studying && t % 11 > 10.4 ? 1 : 0;
  const blinking = t % 4.7 < 0.15;

  // Writing: the hand moves in tiny loops while the pencil is on the paper.
  const loop = [[0, 0], [1, 0], [2, 1], [1, 1]][Math.floor(t * 5) % 4];
  const [ax, ay] = resting ? [0, studying ? -1 : 0] : loop;

  drawSprite(ctx, CLOSEUP_SPRITES.farArm, FAR_ARM.x, FAR_ARM.y);
  drawSprite(ctx, CLOSEUP_SPRITES.torso, TORSO.x, TORSO.y - breath);
  const head = studying
    ? blinking ? CLOSEUP_SPRITES.headDownBlink : CLOSEUP_SPRITES.headDown
    : blinking ? CLOSEUP_SPRITES.headUpBlink : CLOSEUP_SPRITES.headUp;
  drawSprite(ctx, head, HEAD_POS.x, HEAD_POS.y - breath + nod);
  drawSprite(ctx, CLOSEUP_SPRITES.collar, TORSO.x + 34, TORSO.y + 6 - breath);
  drawSprite(ctx, CLOSEUP_SPRITES.arm, ARM.x + ax, ARM.y + ay);

  if (studying) {
    const p = (t % 5) / 5; // 0 → 1 as the note floats up and fades
    ctx.globalAlpha = 0.85 * (1 - p);
    drawSprite(ctx, NOTE, HEAD_POS.x + 120 + Math.floor(p * 12), HEAD_POS.y + 30 - Math.floor(p * 30));
    ctx.globalAlpha = 1;
  }
}
