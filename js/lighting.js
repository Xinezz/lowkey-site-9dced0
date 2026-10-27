// Pixel-art lighting, shared by the room and the close-up.
//
// Each frame the scene is first painted "unlit": every object in its own
// colours, like a colouring book. This module then works out how much light
// reaches each pixel and multiplies the colour by it. Light comes from:
//   - ambient light: dim and blue at night, warm in the daytime;
//   - point lights: the desk lamp (a cone), bulbs, lanterns, an LED strip;
//   - masks: sun or moonlight falling through the window panes.
// A light's brightness is rounded into a few bands, with a dither pattern
// where two bands meet. That stepped look is how pixel artists paint light,
// rather than a smooth photographic gradient.
//
// Shadows: castShadows() marches a line from every pixel towards a light;
// if an object (a "caster") is in the way, that pixel is in shadow. It's
// slow-ish, so callers keep the result until the room changes.
//
// Light hanging in the air (the halo round a bulb, sunbeams full of dust) is
// added on top of everything afterwards: the "air" buffer.

import { ditherStep } from './pixel.js';

// Light can brighten a colour, but only so far: past this, pale things
// next to a lamp would turn pure white.
const MAX_LIGHT = 1.6;

/** Rounds a level from 0 to 1 into `bands` steps, with thin dithered seams where two steps meet. */
export function band(level, bands, x, y) {
  if (level <= 0) return 0;
  return Math.max(0, Math.min(bands, ditherStep(level * bands - 0.5, x, y, 0.35))) / bands;
}

/**
 * @param {number} w  Width in pixels.
 * @param {number} h  Height in pixels.
 */
export function createLighting(w, h) {
  const light = new Float32Array(w * h * 3); // multiplies the colour of each pixel
  const air = new Float32Array(w * h * 3); // added on top, 1 = full brightness

  /**
   * Starts a frame: every pixel gets the ambient light. `vignette` (0 → 1)
   * darkens the corners a little, like light fading towards the room's edges.
   */
  function begin([r, g, b], vignette = 0) {
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const dx = (x - w / 2) / (w / 2);
        const dy = (y - h / 2) / (h / 2);
        const v = 1 - vignette * Math.min(1, (dx * dx + dy * dy) * 0.5);
        const i = (y * w + x) * 3;
        light[i] = r * v;
        light[i + 1] = g * v;
        light[i + 2] = b * v;
      }
    }
    air.fill(0);
  }

  /**
   * A point light.
   * @param {object} o
   * @param {number} o.x, o.y      where it is
   * @param {number} o.radius      how far it reaches
   * @param {number[]} o.color     [r, g, b], 0 → 1
   * @param {number} [o.strength]  brightness at the centre
   * @param {number} [o.bands]     how many steps the light is rounded into
   * @param {Float32Array} [o.shadow]  from castShadows(): 1 = lit, 0 = in shadow
   * @param {object} [o.cone]      a spotlight: { dx, dy } direction, inner and outer
   *   (cosines of the angle where the beam is full, and where it ends), spill (light outside the beam)
   * @param {number} [o.halo]      strength of the glow in the air around it
   * @param {number} [o.haloRadius]
   */
  function addPoint({ x, y, radius, color, strength = 1, bands = 5, shadow, cone, halo = 0, haloRadius = 0 }) {
    const x0 = Math.max(0, Math.floor(x - radius));
    const x1 = Math.min(w - 1, Math.ceil(x + radius));
    const y0 = Math.max(0, Math.floor(y - radius));
    const y1 = Math.min(h - 1, Math.ceil(y + radius));
    for (let py = y0; py <= y1; py++) {
      for (let px = x0; px <= x1; px++) {
        const dx = px - x;
        const dy = py - y;
        const d = Math.sqrt(dx * dx + dy * dy);
        if (d >= radius) continue;
        let f = 1 - d / radius;
        f *= f;
        if (cone) {
          const along = d > 0 ? (dx * cone.dx + dy * cone.dy) / d : 1;
          const inBeam = Math.max(0, Math.min(1, (along - cone.outer) / (cone.inner - cone.outer)));
          f *= cone.spill + (1 - cone.spill) * inBeam;
        }
        const i = py * w + px;
        if (shadow) f *= shadow[i];
        const q = band(f, bands, px, py) * strength;
        if (q > 0) {
          light[i * 3] += color[0] * q;
          light[i * 3 + 1] += color[1] * q;
          light[i * 3 + 2] += color[2] * q;
        }
        if (halo && d < haloRadius) {
          const g = band((1 - d / haloRadius) ** 2, 4, px, py) * halo;
          air[i * 3] += color[0] * g;
          air[i * 3 + 1] += color[1] * g;
          air[i * 3 + 2] += color[2] * g;
        }
      }
    }
  }

  /** A light along a line, like an LED strip: brightest close to the line. */
  function addLine({ x0, y0, x1, y1, radius, color, strength = 1, bands = 4, halo = 0, haloRadius = 0 }) {
    const left = Math.max(0, Math.floor(Math.min(x0, x1) - radius));
    const right = Math.min(w - 1, Math.ceil(Math.max(x0, x1) + radius));
    const top = Math.max(0, Math.floor(Math.min(y0, y1) - radius));
    const bottom = Math.min(h - 1, Math.ceil(Math.max(y0, y1) + radius));
    const lx = x1 - x0;
    const ly = y1 - y0;
    const len2 = lx * lx + ly * ly || 1;
    for (let py = top; py <= bottom; py++) {
      for (let px = left; px <= right; px++) {
        const along = Math.max(0, Math.min(1, ((px - x0) * lx + (py - y0) * ly) / len2));
        const d = Math.hypot(px - (x0 + along * lx), py - (y0 + along * ly));
        if (d >= radius) continue;
        const i = py * w + px;
        const q = band((1 - d / radius) ** 2, bands, px, py) * strength;
        light[i * 3] += color[0] * q;
        light[i * 3 + 1] += color[1] * q;
        light[i * 3 + 2] += color[2] * q;
        if (halo && d < haloRadius) {
          const g = (1 - d / haloRadius) * halo;
          air[i * 3] += color[0] * g;
          air[i * 3 + 1] += color[1] * g;
          air[i * 3 + 2] += color[2] * g;
        }
      }
    }
  }

  /** Light shaped by a mask (one number per pixel, 0 → 1), e.g. sunlight through the panes. */
  function addMask(mask, color, strength = 1) {
    for (let i = 0; i < w * h; i++) {
      const m = mask[i];
      if (m <= 0) continue;
      light[i * 3] += color[0] * m * strength;
      light[i * 3 + 1] += color[1] * m * strength;
      light[i * 3 + 2] += color[2] * m * strength;
    }
  }

  /** Light hanging in the air (sunbeams), from a mask. */
  function addAirMask(mask, color, strength = 1) {
    for (let i = 0; i < w * h; i++) {
      const m = mask[i];
      if (m <= 0) continue;
      air[i * 3] += color[0] * m * strength;
      air[i * 3 + 1] += color[1] * m * strength;
      air[i * 3 + 2] += color[2] * m * strength;
    }
  }

  /** One bright pixel in the air, e.g. a speck of dust caught in a sunbeam. */
  function addAirPixel(x, y, color, amount) {
    if (x < 0 || y < 0 || x >= w || y >= h) return;
    const i = (Math.round(y) * w + Math.round(x)) * 3;
    air[i] += color[0] * amount;
    air[i + 1] += color[1] * amount;
    air[i + 2] += color[2] * amount;
  }

  /** Dims the light in a few pixels: the shadow of a raindrop on the glass, say. */
  function shade(x, y, amount) {
    if (x < 0 || y < 0 || x >= w || y >= h) return;
    const i = (Math.round(y) * w + Math.round(x)) * 3;
    light[i] *= 1 - amount;
    light[i + 1] *= 1 - amount;
    light[i + 2] *= 1 - amount;
  }

  /** Multiplies a canvas by the light. See-through pixels (the window panes) are left alone. */
  function applyTo(ctx) {
    const image = ctx.getImageData(0, 0, w, h);
    const d = image.data;
    for (let i = 0, p = 0; i < w * h; i++, p += 4) {
      if (d[p + 3] === 0) continue;
      d[p] = Math.min(255, d[p] * Math.min(MAX_LIGHT, light[i * 3]));
      d[p + 1] = Math.min(255, d[p + 1] * Math.min(MAX_LIGHT, light[i * 3 + 1]));
      d[p + 2] = Math.min(255, d[p + 2] * Math.min(MAX_LIGHT, light[i * 3 + 2]));
    }
    ctx.putImageData(image, 0, 0);
  }

  /** Adds the light in the air on top of a finished picture. */
  function applyAir(ctx) {
    const image = ctx.getImageData(0, 0, w, h);
    const d = image.data;
    for (let i = 0, p = 0; i < w * h; i++, p += 4) {
      const r = air[i * 3];
      const g = air[i * 3 + 1];
      const b = air[i * 3 + 2];
      if (r + g + b <= 0) continue;
      d[p] = Math.min(255, d[p] + r * 255);
      d[p + 1] = Math.min(255, d[p + 1] + g * 255);
      d[p + 2] = Math.min(255, d[p + 2] + b * 255);
    }
    ctx.putImageData(image, 0, 0);
  }

  return { begin, addPoint, addLine, addMask, addAirMask, addAirPixel, shade, applyTo, applyAir };
}

/**
 * Which pixels a light can reach. `casters` has one value per pixel: true
 * where an object blocks light. For every other pixel within `radius`, a line
 * is marched towards the light (and towards two points beside it, which
 * gives shadows soft edges). `step` > 1 checks every few pixels along each
 * line, which is faster and fine for objects wider than the step.
 * @returns {Float32Array} 1 = fully lit … 1 - darkness = fully in shadow
 */
export function castShadows(casters, w, h, light, radius, { softness = 3, darkness = 0.8, step = 1 } = {}) {
  const visible = new Float32Array(w * h).fill(1);
  const sources = [
    [light.x, light.y],
    [light.x - softness, light.y + softness * 0.5],
    [light.x + softness, light.y - softness * 0.5],
  ];
  const x0 = Math.max(0, Math.floor(light.x - radius));
  const x1 = Math.min(w - 1, Math.ceil(light.x + radius));
  const y0 = Math.max(0, Math.floor(light.y - radius));
  const y1 = Math.min(h - 1, Math.ceil(light.y + radius));
  for (let py = y0; py <= y1; py++) {
    for (let px = x0; px <= x1; px++) {
      const i = py * w + px;
      if (casters[i]) continue; // objects are shaded by their own drawing
      let blocked = 0;
      for (const [lx, ly] of sources) {
        const dx = lx - px;
        const dy = ly - py;
        const dist = Math.hypot(dx, dy);
        if (dist > radius) continue;
        for (let s = 1; s < dist - 2; s += step) {
          const sx = Math.round(px + (dx * s) / dist);
          const sy = Math.round(py + (dy * s) / dist);
          if (casters[sy * w + sx]) {
            blocked += 1;
            break;
          }
        }
      }
      visible[i] = 1 - (darkness * blocked) / sources.length;
    }
  }
  return visible;
}

/**
 * The same for light coming from one direction (sun through a window):
 * marches from each pixel in `mask` along (dx, dy) for up to `length` pixels.
 * Multiplies the mask in place.
 */
export function shadeMaskByCasters(mask, casters, w, h, dx, dy, length, darkness = 0.85) {
  const d = Math.hypot(dx, dy);
  const ux = dx / d;
  const uy = dy / d;
  for (let i = 0; i < w * h; i++) {
    if (mask[i] <= 0 || casters[i]) continue;
    const px = i % w;
    const py = (i - px) / w;
    for (let s = 2; s < length; s++) {
      const sx = Math.round(px + ux * s);
      const sy = Math.round(py + uy * s);
      if (sx < 0 || sy < 0 || sx >= w || sy >= h) break;
      if (casters[sy * w + sx]) {
        mask[i] *= 1 - darkness;
        break;
      }
    }
  }
}

/** True for every pixel of a canvas that isn't see-through: an object that can cast a shadow. */
export function castersFrom(ctx, w, h) {
  const data = ctx.getImageData(0, 0, w, h).data;
  const casters = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) casters[i] = data[i * 4 + 3] > 0 ? 1 : 0;
  return casters;
}
