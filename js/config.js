// Central place for tunable values. Changing a number here should never
// require touching game logic.

// `globalThis.location?.` instead of `window.location`: Node has no window,
// and the unit tests import modules that import this file.
const params = new URLSearchParams(globalThis.location?.search ?? '');

/**
 * Add ?dev to the URL (e.g. http://localhost:8000/?dev) to shorten sessions
 * to 10 s focus / 5 s break, so the whole loop can be tested quickly.
 */
export const DEV_MODE = params.has('dev');

/**
 * TEMPORARY, for play-testing: while this is true, sessions are 10 s focus /
 * 5 s break for everyone, even without ?dev (coins and saving stay normal).
 * Set it back to false for real 25-minute sessions before sharing the game.
 */
const SHORT_TIMER_FOR_TESTING = true;
const SHORT_TIMER = DEV_MODE || SHORT_TIMER_FOR_TESTING;

export const TIMER_CONFIG = Object.freeze({
  focusMs: SHORT_TIMER ? 10_000 : 25 * 60_000,
  breakMs: SHORT_TIMER ? 5_000 : 5 * 60_000,
});

export const REWARDS = Object.freeze({
  // Dev mode is generous so every item can be tried after a few 10-second
  // sessions. Coins are still only earned by finishing a session.
  coinsPerFocusSession: DEV_MODE ? 100 :10000000,
  // Extra coins when a focus session ends and every pet's needs are above half.
  happyPetBonus: 3,
});

export const UNLOCKS = Object.freeze({
  petCareLevel: 3, // level 3 = 3 finished focus sessions (see levels.js)
});

// Pet needs are numbers from 0 to 100, where 100 is best:
// food (100 = full), love (100 = adoring), energy (100 = well rested).
export const PET_CONFIG = Object.freeze({
  // Dev mode runs pet time 60× faster: an hour of hunger passes in a minute.
  timeScale: DEV_MODE ? 60 : 1,
  floor: 25, // needs never drop below this on their own, however long you're away
  happyAt: 50, // every need at least this high = happy (and earns the bonus)
  lowAt: 40, // below this, the pet shows a little bubble in the room
  decayPerHour: { food: 6, love: 5, energy: 6 },
  sleepRecoveryPerHour: 40, // energy regained per hour while tucked in
  feed: { cost: 2, food: 30, love: 3, fullAt: 90 },
  play: { love: 15, energy: -8, minEnergy: 20 },
  tuckInBelow: 90, // a pet with more energy than this isn't sleepy
});

/** How often the UI re-reads the timer. Timer accuracy does NOT depend on this. */
export const UI_TICK_MS = 250;

/** Frames per second for the room animation. Low on purpose: calm, and light on the CPU. */
export const ROOM_FPS = 15;
