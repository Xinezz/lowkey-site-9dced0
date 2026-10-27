// Hand-drawn art, loaded from PNG files in the art/ folder.
//
// The game can draw everything itself (room-art.js, closeup.js), but the
// real art is meant to be drawn by hand by a pixel artist (see
// ART_BRIEF.md). art/index.json lists what has been drawn so far:
//
//   {
//     "scenes": ["closeup", "room"],
//     "items": { "room": ["cat", ...], "closeup": ["cat", ...] }
//   }
//
// Each scene has its own folder, art/closeup/ or art/room/, with a
// scene.json saying which PNG layers there are, where the window is, where
// the lights are and how the buddy's animation frames are laid out. Items
// are art/items/<id>.png (in the room) and art/items/closeup/<id>.png (up
// close); a pet can also have <id>-asleep.png.
//
// Anything not listed, or that fails to load, is drawn by the game itself,
// so the game always works.
//
// validateScene() has no DOM code, so tests/art.test.js can check it.

const LIGHTING_MODES = ['dynamic', 'painted'];

/**
 * Checks a parsed scene.json and fills in defaults. Returns { scene } or
 * { errors: [...] } describing what's wrong, so a mistake in the file
 * gives a clear message in the console instead of a broken picture.
 */
export function validateScene(json, kind) {
  const errors = [];
  const isObject = (v) => typeof v === 'object' && v !== null && !Array.isArray(v);
  const isRect = (v) => isObject(v) && ['x', 'y', 'w', 'h'].every((k) => Number.isFinite(v[k]));
  const isPoint = (v) => Array.isArray(v) && v.length === 2 && v.every(Number.isFinite);

  if (!isObject(json)) return { errors: ['scene.json is not an object'] };
  const lighting = json.lighting ?? 'dynamic';
  if (!LIGHTING_MODES.includes(lighting)) errors.push(`"lighting" must be one of ${LIGHTING_MODES.join(', ')}`);
  const layers = json.layers ?? {};
  if (typeof layers.back !== 'string') errors.push('"layers.back" (the PNG behind everything) is required');
  for (const name of ['front', 'emissive', 'casters']) {
    if (layers[name] !== undefined && typeof layers[name] !== 'string') errors.push(`"layers.${name}" must be a file name`);
  }
  if (json.window !== undefined && !isRect(json.window)) errors.push('"window" must be { x, y, w, h }');
  if (json.panes !== undefined && !(Array.isArray(json.panes) && json.panes.every(isRect))) {
    errors.push('"panes" must be a list of { x, y, w, h }');
  }
  const surfaces = json.surfaces ?? {};
  if (!isObject(surfaces)) errors.push('"surfaces" must be an object');
  if (surfaces.sill !== undefined && !Number.isFinite(surfaces.sill)) errors.push('"surfaces.sill" must be a number (the y of the windowsill)');
  for (const name of ['desk', 'floor']) {
    const s = surfaces[name];
    if (s !== undefined && !(isObject(s) && Number.isFinite(s.top) && Number.isFinite(s.bottom) && s.bottom > s.top)) {
      errors.push(`"surfaces.${name}" must be { top, bottom } with bottom below top`);
    }
  }
  if (json.steam !== undefined && !isPoint(json.steam)) errors.push('"steam" must be an [x, y] point (the top of the mug)');
  if (json.clock !== undefined && !isPoint(json.clock)) errors.push('"clock" must be an [x, y] point (the middle of the clock face)');
  const styles = json.styles ?? {};
  if (!isObject(styles) || !Object.values(styles).every((file) => typeof file === 'string')) {
    errors.push('"styles" must map wallpaper and rug ids to file names, e.g. { "rug-plaid": "styles/rug-plaid.png" }');
  }
  if (json.writing !== undefined && !(isObject(json.writing) && ['x', 'y', 'w'].every((k) => Number.isFinite(json.writing[k])))) {
    errors.push('"writing" needs at least x, y and w');
  }
  const decor = json.decor ?? {};
  if (!isObject(decor)) errors.push('"decor" must be an object');
  for (const [name, spot] of Object.entries(decor.spots ?? {})) {
    if (!isPoint(spot)) errors.push(`"decor.spots.${name}" must be an [x, y] point`);
  }
  if (decor.scale !== undefined && !(Number.isInteger(decor.scale) && decor.scale > 0)) errors.push('"decor.scale" must be a whole number');

  const lights = json.lights ?? {};
  const pointLights = [];
  for (const group of ['lamps', 'fills', 'screens', 'pendants', 'candles']) {
    const list = lights[group] ?? [];
    if (!Array.isArray(list)) {
      errors.push(`"lights.${group}" must be a list`);
      continue;
    }
    list.forEach((light, i) => {
      if (!isObject(light) || !Number.isFinite(light.x) || !Number.isFinite(light.y)) {
        errors.push(`"lights.${group}[${i}]" needs x and y`);
      } else {
        pointLights.push({ group, ...light });
      }
    });
  }
  const bulbs = lights.bulbs ?? [];
  if (!Array.isArray(bulbs) || !bulbs.every(isPoint)) errors.push('"lights.bulbs" must be a list of [x, y] points');
  const ledStrips = lights.ledStrips ?? [];
  if (!Array.isArray(ledStrips) || !ledStrips.every((s) => isObject(s) && ['x0', 'y0', 'x1', 'y1'].every((k) => Number.isFinite(s[k])))) {
    errors.push('"lights.ledStrips" must be a list of { x0, y0, x1, y1 }');
  }

  const buddy = json.buddy;
  if (!isObject(buddy)) {
    errors.push('"buddy" (the animation sheet) is required');
  } else {
    if (typeof buddy.sheet !== 'string') errors.push('"buddy.sheet" must be a file name');
    if (!(buddy.frameW > 0 && buddy.frameH > 0)) errors.push('"buddy.frameW" and "buddy.frameH" must be positive');
    const needed = kind === 'room' ? ['walk', 'sit', 'relax'] : ['write'];
    for (const name of needed) {
      const anim = buddy.animations?.[name];
      if (!isObject(anim) || !Array.isArray(anim.frames) || anim.frames.length === 0) {
        errors.push(`"buddy.animations.${name}" needs a list of frames`);
      }
    }
    if (kind === 'room' && !(Number.isFinite(buddy.footX) && Number.isFinite(buddy.footY))) {
      errors.push('"buddy.footX" and "buddy.footY" (the point between the feet, in each frame) are required');
    }
    if (buddy.seat !== undefined && !isPoint(buddy.seat)) errors.push('"buddy.seat" must be an [x, y] point (the middle of the chair seat)');
    if (kind === 'closeup' && !(Number.isFinite(buddy.x) && Number.isFinite(buddy.y))) {
      errors.push('"buddy.x" and "buddy.y" (where frames are drawn) are required');
    }
  }
  if (errors.length) return { errors };
  return {
    scene: {
      lighting,
      layers,
      window: json.window ?? null,
      panes: json.panes ?? null,
      surfaces,
      steam: json.steam ?? null,
      clock: json.clock ?? null,
      styles,
      lights: { points: pointLights, bulbs, ledStrips },
      writing: json.writing ?? null,
      decor: json.decor ?? null,
      buddy,
    },
  };
}

/**
 * Which frame of an animation to show at time t (seconds). `fps` defaults
 * to 6. Returns the frame number on the sheet, or null if there's no such
 * animation.
 */
export function frameAt(animations, name, t) {
  const anim = animations?.[name];
  if (!anim?.frames?.length) return null;
  const fps = anim.fps ?? 6;
  return anim.frames[Math.floor(t * fps) % anim.frames.length];
}

/** The same, but driven by distance walked (so feet never slide): one frame every `stride` pixels. */
export function frameAtDistance(animations, name, walked) {
  const anim = animations?.[name];
  if (!anim?.frames?.length) return null;
  return anim.frames[Math.floor(walked / (anim.stride ?? 10)) % anim.frames.length];
}

/** Draws frame number `index` from a sheet laid out left to right, top to bottom. */
export function drawFrame(ctx, sheet, index, frameW, frameH, x, y, mirror = false) {
  const perRow = Math.max(1, Math.floor(sheet.width / frameW));
  const sx = (index % perRow) * frameW;
  const sy = Math.floor(index / perRow) * frameH;
  if (mirror) {
    ctx.save();
    ctx.translate(Math.round(x) + frameW, Math.round(y));
    ctx.scale(-1, 1);
    ctx.drawImage(sheet, sx, sy, frameW, frameH, 0, 0, frameW, frameH);
    ctx.restore();
  } else {
    ctx.drawImage(sheet, sx, sy, frameW, frameH, Math.round(x), Math.round(y), frameW, frameH);
  }
}

// ---- Loading (browser only) ------------------------------------------------

// When published, each module is loaded as e.g. art.js?v=<version> (see
// scripts/publish-site.sh). Adding the same ?v= to art files means a new
// version never shows old, cached art.
const VERSION = new URL(import.meta.url).searchParams.get('v');
const withVersion = (path) => (VERSION ? `${path}?v=${VERSION}` : path);

async function fetchJson(path) {
  try {
    const response = await fetch(withVersion(path));
    return response.ok ? await response.json() : null;
  } catch {
    return null;
  }
}

function loadImage(path) {
  return new Promise((resolve) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => resolve(null);
    image.src = withVersion(path);
  });
}

async function loadScene(dir, kind) {
  const json = await fetchJson(`${dir}scene.json`);
  if (!json) {
    console.warn(`art/index.json lists ${kind}, but ${dir}scene.json is missing or isn't valid JSON, so the built-in art is used instead.`);
    return null;
  }
  const { scene, errors } = validateScene(json, kind);
  if (errors) {
    console.warn(`${dir}scene.json has problems, so the built-in art is used instead:\n- ${errors.join('\n- ')}`);
    return null;
  }
  const styleNames = Object.fromEntries(Object.entries(scene.styles).map(([id, file]) => [`style:${id}`, file]));
  const names = { ...scene.layers, buddy: scene.buddy.sheet, ...styleNames };
  const entries = await Promise.all(Object.entries(names).map(async ([name, file]) => [name, await loadImage(dir + file)]));
  const images = Object.fromEntries(entries);
  const missing = Object.entries(names).filter(([name]) => !images[name]).map(([, file]) => file);
  if (!images.back || !images.buddy) {
    console.warn(`Couldn't load ${missing.join(', ')} from ${dir}, so the built-in art is used instead.`);
    return null;
  }
  if (missing.length) console.warn(`Couldn't load ${missing.join(', ')} from ${dir}; carrying on without them.`);
  return { ...scene, images };
}

async function loadItems(lists) {
  const items = new Map();
  const ids = [...(lists?.room ?? []), ...(lists?.closeup ?? []).map((id) => `closeup/${id}`)];
  await Promise.all(
    ids.map(async (id) => {
      const image = await loadImage(`art/items/${id}.png`);
      if (image) items.set(id, image);
    }),
  );
  return items;
}

/**
 * Loads whatever hand-drawn art exists. Never fails: anything missing is
 * simply null (or not in the items map), and the game draws its own.
 * @returns {Promise<{ closeup: object | null, room: object | null, items: Map<string, HTMLImageElement> }>}
 */
export async function loadArt() {
  const index = (await fetchJson('art/index.json')) ?? {};
  const scenes = Array.isArray(index.scenes) ? index.scenes : [];
  const load = (kind) => (scenes.includes(kind) ? loadScene(`art/${kind}/`, kind) : null);
  const [closeup, room, items] = await Promise.all([load('closeup'), load('room'), loadItems(index.items)]);
  return { closeup, room, items };
}
