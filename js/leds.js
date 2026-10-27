// How LED lights behave over time. These are pure functions of the time, so
// they're easy to unit-test (tests/leds.test.js) and every frame agrees.
//
// Real LEDs aren't perfectly steady. Cheap strands twinkle, colour-changing
// ones drift from one colour to the next every so often, and now and then a
// bulb flickers. Each bulb gets its own timing, so they never pulse together.

import { hexToRgb } from './pixel.js';

export const LED_TIMING = Object.freeze({
  holdSeconds: 14, // how long a colour stays
  fadeSeconds: 3, // how long the change to the next colour takes
});

/** A repeatable "random" number from 0 to 1 for any whole number. */
export function hash(n) {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

function smooth(t) {
  return t * t * (3 - 2 * t);
}

/**
 * The colour of bulb `index` at time t, as [r, g, b] from 0 to 1. Each bulb
 * starts on its own colour from the palette and steps along it, fading from
 * one colour to the next. With a one-colour palette it never changes.
 */
export function ledColor(colors, index, t) {
  const { holdSeconds, fadeSeconds } = LED_TIMING;
  const period = holdSeconds + fadeSeconds;
  const step = Math.floor(t / period);
  const into = t - step * period;
  const fade = into < holdSeconds ? 0 : smooth((into - holdSeconds) / fadeSeconds);
  const from = hexToRgb(colors[(((index + step) % colors.length) + colors.length) % colors.length]);
  const to = hexToRgb(colors[(((index + step + 1) % colors.length) + colors.length) % colors.length]);
  return from.map((c, i) => c + (to[i] - c) * fade);
}

/**
 * How bright bulb `index` is at time t, from about 0.4 to 1: a slow twinkle,
 * and every half a minute or so, a short flicker. `steady` (for people who
 * prefer reduced motion) keeps it at full brightness.
 */
export function ledBrightness(index, t, steady = false) {
  if (steady) return 1;
  const speed = 0.7 + hash(index) * 0.9;
  const twinkle = 0.86 + 0.14 * Math.sin(t * speed + hash(index + 7) * Math.PI * 2);
  const period = 24 + hash(index + 3) * 18;
  const phase = (t + hash(index + 11) * period) % period;
  const flickering = phase < 0.5 && Math.floor(phase * 16) % 3 === 1;
  return twinkle * (flickering ? 0.55 : 1);
}
