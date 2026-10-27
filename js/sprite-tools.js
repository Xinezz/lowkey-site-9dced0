// Helpers for building sprites in code.
//
// Hand-written text rows (see item-sprites.js) suit small, irregular things.
// Round or repeating shapes (wreaths, lanterns, garlands, moons) are easier
// to describe with a little maths. Both produce the same text format, so the
// rest of the game can't tell them apart, and the sprite tests check them all
// the same way. No DOM code here, so tests can import it.

/**
 * Builds a text sprite by asking `paint(x, y)` for every pixel. It returns a
 * palette key, or '.' / null / undefined for a transparent pixel.
 */
export function paintSprite(name, w, h, palette, paint) {
  const rows = [];
  for (let y = 0; y < h; y++) {
    let row = '';
    for (let x = 0; x < w; x++) row += paint(x, y) || '.';
    rows.push(row);
  }
  return { name, palette, rows };
}

/**
 * Gives a sprite a 1-pixel outline: every transparent pixel that touches a
 * coloured one (above, below, left or right) becomes an outline pixel.
 * `key` is one palette key for the whole outline, or a function that picks
 * it from the colour being outlined: pixel artists outline skin in dark
 * brown and hair in deep plum rather than everything in black ("selective
 * outlining"), which looks far less stiff. Leave a free pixel around the
 * drawing for it.
 */
export function addOutline(sprite, key) {
  const { rows } = sprite;
  const pick = typeof key === 'function' ? key : () => key;
  const at = (x, y) => (y >= 0 && y < rows.length && x >= 0 && x < rows[y].length ? rows[y][x] : '.');
  const outlined = rows.map((row, y) =>
    [...row]
      .map((pixel, x) => {
        if (pixel !== '.') return pixel;
        const neighbour = [at(x + 1, y), at(x - 1, y), at(x, y + 1), at(x, y - 1)].find((p) => p !== '.');
        return neighbour ? pick(neighbour) : '.';
      })
      .join(''),
  );
  return { ...sprite, rows: outlined };
}

/**
 * Rim light: pixels along the edge of a shape that face the light (their
 * neighbour on the `side` is empty) swap to a lighter key from `rim`, a map
 * like { S: 'L' }. It's how a figure seems to glow at the edge when light
 * is behind or beside it.
 */
export function addRim(sprite, rim, side = 'left') {
  const { rows } = sprite;
  const dx = side === 'left' ? -1 : 1;
  const lit = rows.map((row, y) =>
    [...row]
      .map((pixel, x) => {
        const outside = row[x + dx] ?? '.';
        const above = rows[y - 1]?.[x] ?? '.';
        return (outside === '.' || above === '.') && rim[pixel] ? rim[pixel] : pixel;
      })
      .join(''),
  );
  return { ...sprite, rows: lit };
}

/** Is (x, y) inside the ellipse centred on (cx, cy) with radii rx and ry? */
export function inEllipse(x, y, cx, cy, rx, ry) {
  return ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1;
}

/** How far (x, y) is from the line segment between (x0, y0) and (x1, y1). */
export function distanceToSegment(x, y, x0, y0, x1, y1) {
  const dx = x1 - x0;
  const dy = y1 - y0;
  const along = Math.max(0, Math.min(1, ((x - x0) * dx + (y - y0) * dy) / (dx * dx + dy * dy)));
  return Math.hypot(x - (x0 + along * dx), y - (y0 + along * dy));
}

/**
 * A palette swap: the same pixels in different colours, a classic way to
 * get several items out of one drawing. Works for animated sprites too.
 */
export function recolor(sprite, name, colors) {
  return { ...sprite, name, palette: { ...sprite.palette, ...colors } };
}

/** The pixels on a straight line between two points (Bresenham's algorithm). */
export function linePoints(x0, y0, x1, y1) {
  const points = [];
  const dx = Math.abs(x1 - x0);
  const dy = -Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let error = dx + dy;
  for (;;) {
    points.push([x0, y0]);
    if (x0 === x1 && y0 === y1) return points;
    const e2 = 2 * error;
    if (e2 >= dy) {
      error += dy;
      x0 += sx;
    }
    if (e2 <= dx) {
      error += dx;
      y0 += sy;
    }
  }
}

/** A Set of "x,y" strings for quick "is this pixel on the shape?" checks. */
export function pointSet(points) {
  return new Set(points.map(([x, y]) => `${x},${y}`));
}

/** Small stamps (lists of rows) placed at fixed positions: returns a lookup paint() can use. */
export function stampLookup(stamps) {
  const pixels = new Map();
  for (const { rows, x, y } of stamps) {
    rows.forEach((row, dy) => {
      [...row].forEach((key, dx) => {
        if (key !== '.') pixels.set(`${x + dx},${y + dy}`, key);
      });
    });
  }
  return (px, py) => pixels.get(`${px},${py}`);
}

/**
 * A round paper lantern hanging from a string: string, cap, a rounded body
 * with ribs, a bottom cap and a tassel. Palette keys: s string, c caps,
 * b body, r ribs, h highlight, d body edge, t tassel.
 */
export function paintLantern({ name, w, bodyH, palette }) {
  const h = 2 + 2 + bodyH + 2 + 3;
  const cx = (w - 1) / 2;
  const capHalf = Math.max(1, Math.round(w * 0.22));
  return paintSprite(name, w, h, palette, (x, y) => {
    const dx = x - cx;
    const centre = Math.abs(dx) < 1;
    if (y < 2) return centre ? 's' : null;
    if (y < 4) return Math.abs(dx) <= capHalf + 0.5 ? 'c' : null;

    const by = y - 4;
    if (by < bodyH) {
      const ry = (bodyH - 1) / 2;
      const ny = (by - ry) / (ry + 0.6);
      const half = (w / 2) * Math.sqrt(Math.max(0, 1 - ny * ny));
      if (Math.abs(dx) > half) return null;
      if (Math.abs(dx) > half - 1) return 'd';
      if (Math.abs(Math.abs(dx) - half * 0.45) < 0.5) return 'r';
      if (dx < -half * 0.35 && ny < -0.1) return 'h';
      return 'b';
    }
    const ty = by - bodyH;
    if (ty < 2) return Math.abs(dx) <= capHalf + 0.5 ? 'c' : null;
    return centre ? 't' : null;
  });
}

/**
 * A round wreath. Palette keys: d dark leaves and edge, g leaves, l light
 * leaves, r berries, and (with a bow) R bow, k bow shadow.
 */
export function paintWreath({ name, size = 20, palette, bow = true }) {
  const c = (size - 1) / 2;
  const bowPixel = stampLookup([
    {
      x: Math.round(c) - 4,
      y: size - 6,
      rows: ['RR....RR', 'RRR..RRR', '.RRRRRR.', 'RRkRRkRR', '.R....R.', 'R......R'],
    },
  ]);
  return paintSprite(name, size, size, palette, (x, y) => {
    if (bow) {
      const bowKey = bowPixel(x, y);
      if (bowKey) return bowKey;
    }
    const d = Math.hypot(x - c, y - c);
    if (d > c + 0.4 || d < c - 4.4) return null;
    if ((x * 7 + y * 13) % 11 === 0) return 'r'; // berries, scattered but always in the same places
    if (d > c - 0.6 || d < c - 3.6) return 'd';
    return (x + y) % 3 === 0 ? 'l' : 'g';
  });
}

/**
 * A garland: a gently sagging string with small stamps (baubles, flags,
 * leaves...) hanging from it at a regular spacing, cycling through `stamps`.
 * Palette key s is the string.
 */
export function paintGarland({ name, w, h, palette, spacing, sag = 3, stamps }) {
  const stringY = (x) => 1 + Math.round(Math.sin((Math.PI * x) / (w - 1)) * sag);
  const placed = [];
  let k = 0;
  for (let x = Math.floor(spacing / 2); x < w - 2; x += spacing, k++) {
    const rows = stamps[k % stamps.length];
    placed.push({ rows, x: x - Math.floor(rows[0].length / 2), y: stringY(x) + 1 });
  }
  const stampAt = stampLookup(placed);
  return paintSprite(name, w, h, palette, (x, y) => stampAt(x, y) ?? (y === stringY(x) ? 's' : null));
}

/** A small six-armed snowflake stamp, 5×5, in the given palette key. */
export function snowflakeStamp(key) {
  return ['..k..', 'k.k.k', '.kkk.', 'k.k.k', '..k..'].map((row) => row.replaceAll('k', key));
}
