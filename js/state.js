// The player's progress, kept in one plain object. Plain data (numbers,
// strings, arrays) is easy to inspect in the console and can be saved with
// JSON.stringify and loaded back with JSON.parse (see storage.js).

import { DEFAULT_THEME_ID, THEMES, isThemeUnlocked } from './themes.js';
import { getItem } from './items.js';
import { SPOTS } from './layout.js';
import { NEEDS, createPet } from './pets.js';
import { STYLE_KINDS, autoPlace } from './decorations.js';

/** What you see while focusing: the close-up at the desk with your buddy, or the whole room. */
export const FOCUS_VIEWS = Object.freeze(['closeup', 'room']);

/** What a brand-new player starts with. */
export function createInitialState() {
  return {
    coins: 0,
    completedFocusSessions: 0,
    ownedItemIds: [], // ids from ITEMS in items.js; arrays rather than Sets because JSON can store them
    placements: {}, // which decoration stands in which spot, e.g. { sillLeft: 'pothos' }
    style: { lights: null, glow: null, rug: null, wallpaper: null }, // chosen styles; null = the default
    pets: {}, // needs per pet id, e.g. { cat: { food: 70, love: 50, energy: 80, asleep: false } }
    petsUpdatedAt: null, // when the needs above were last brought up to date (a timestamp in ms)
    themeId: DEFAULT_THEME_ID, // the window view
    muted: false,
    focusView: 'closeup', // one of FOCUS_VIEWS
  };
}

/**
 * Clears progress (coins, sessions, items, pets) but keeps preferences
 * (sound, the focus view, and the window view if it's one of the free ones).
 */
export function resetProgress(state) {
  const fresh = createInitialState();
  state.coins = fresh.coins;
  state.completedFocusSessions = fresh.completedFocusSessions;
  state.ownedItemIds = fresh.ownedItemIds;
  state.placements = fresh.placements;
  state.style = fresh.style;
  state.pets = fresh.pets;
  state.petsUpdatedAt = fresh.petsUpdatedAt;
  const theme = THEMES.find((t) => t.id === state.themeId);
  if (!theme || !isThemeUnlocked(theme, state.ownedItemIds)) state.themeId = fresh.themeId;
}

/**
 * Turns untrusted data into a valid state. Saved data can be edited by
 * anyone in the browser's dev tools, or damaged by an old version of the
 * game, so it is never used directly. This function never throws: anything
 * wrong is replaced with a safe default and described in `problems`.
 *
 * @param {unknown} raw  Whatever was parsed from storage.
 * @param {number} [now] The current time, used to reject timestamps from the future.
 * @returns {{ state: object, problems: string[] }}
 */
export function sanitizeState(raw, now = Date.now()) {
  const state = createInitialState();
  const problems = [];

  if (!isPlainObject(raw)) {
    problems.push('the saved state is not an object');
    return { state, problems };
  }

  state.coins = readCount(raw, 'coins', problems);
  state.completedFocusSessions = readCount(raw, 'completedFocusSessions', problems);
  state.ownedItemIds = readIdList(raw, 'ownedItemIds', (id) => getItem(id) !== undefined, problems);
  readPlacements(raw, state, problems);
  readStyle(raw.style, state, problems);

  state.pets = readPets(raw.pets, state.ownedItemIds, problems);
  state.petsUpdatedAt = readTimestamp(raw.petsUpdatedAt, now, problems);

  const theme = THEMES.find((t) => t.id === raw.themeId);
  if (theme && isThemeUnlocked(theme, state.ownedItemIds)) state.themeId = raw.themeId;
  else problems.push(`unknown or locked background ${JSON.stringify(raw.themeId)}`);

  if (typeof raw.muted === 'boolean') state.muted = raw.muted;
  else problems.push(`"muted" was ${JSON.stringify(raw.muted)}`);

  // Saves from before the close-up existed have no focusView: they get the default.
  if (FOCUS_VIEWS.includes(raw.focusView)) state.focusView = raw.focusView;
  else if (raw.focusView !== undefined) problems.push(`"focusView" was ${JSON.stringify(raw.focusView)}`);

  return { state, problems };
}

/** A whole number of 0 or more, or 0 if the saved value is anything else. */
function readCount(raw, field, problems) {
  const value = raw[field];
  if (Number.isSafeInteger(value) && value >= 0) return value;
  problems.push(`"${field}" was ${JSON.stringify(value)}, so it was set to 0`);
  return 0;
}

/** A list of item ids, keeping only valid ones and dropping duplicates. */
function readIdList(raw, field, isValid, problems) {
  const value = raw[field];
  if (!Array.isArray(value)) {
    problems.push(`"${field}" was not a list`);
    return [];
  }
  const kept = [...new Set(value.filter((id) => typeof id === 'string' && isValid(id)))];
  if (kept.length !== value.length) {
    problems.push(`"${field}" had ${value.length - kept.length} unknown or duplicate entries`);
  }
  return kept;
}

/**
 * Which decoration stands where. Each entry must be a real spot holding an
 * owned decoration of the matching type, and each item may stand only once.
 * Older saves had a plain list of displayed items instead (placedItemIds);
 * those items are put into free spots. A save with neither shows everything
 * the player owns.
 */
function readPlacements(raw, state, problems) {
  if (raw.placements === undefined) {
    const shown = Array.isArray(raw.placedItemIds) ? raw.placedItemIds : state.ownedItemIds;
    for (const id of shown) autoPlace(state, id);
    return;
  }
  if (!isPlainObject(raw.placements)) {
    problems.push('"placements" was not an object');
    return;
  }
  for (const [spotId, itemId] of Object.entries(raw.placements)) {
    const item = getItem(itemId);
    const fits = item?.kind === 'decor' && SPOTS[spotId]?.type === item.slot;
    const alreadyPlaced = Object.values(state.placements).includes(itemId);
    if (fits && state.ownedItemIds.includes(itemId) && !alreadyPlaced) state.placements[spotId] = itemId;
    else problems.push(`removed ${JSON.stringify(itemId)} from spot ${JSON.stringify(spotId)}`);
  }
}

/** The chosen string lights, lamp glow, rug and wallpaper: owned items of the right kind, or null. */
function readStyle(saved, state, problems) {
  if (saved === undefined) return;
  if (!isPlainObject(saved)) {
    problems.push('"style" was not an object');
    return;
  }
  for (const kind of STYLE_KINDS) {
    const itemId = saved[kind] ?? null;
    if (itemId === null) continue;
    const item = getItem(itemId);
    if (item?.kind === kind && state.ownedItemIds.includes(itemId)) state.style[kind] = itemId;
    else problems.push(`style ${kind} was ${JSON.stringify(itemId)}`);
  }
}

/** Needs for each owned pet. Saves from before pets existed simply have none. */
function readPets(value, ownedItemIds, problems) {
  if (value === undefined) return {};
  if (!isPlainObject(value)) {
    problems.push('"pets" was not an object');
    return {};
  }

  const pets = {};
  for (const [id, saved] of Object.entries(value)) {
    if (!getItem(id)?.pet || !ownedItemIds.includes(id) || !isPlainObject(saved)) {
      problems.push(`dropped needs for unknown or unowned pet "${id}"`);
      continue;
    }
    const pet = createPet();
    for (const need of NEEDS) {
      const level = saved[need];
      if (Number.isFinite(level) && level >= 0 && level <= 100) pet[need] = level;
      else problems.push(`pet "${id}" had ${need} ${JSON.stringify(level)}`);
    }
    if (typeof saved.asleep === 'boolean') pet.asleep = saved.asleep;
    else problems.push(`pet "${id}" had asleep ${JSON.stringify(saved.asleep)}`);
    pets[id] = pet;
  }
  return pets;
}

/** A time in the past (or null). A time in the future would make pets un-hungry, so it becomes "now". */
function readTimestamp(value, now, problems) {
  if (value === undefined || value === null) return null;
  if (!Number.isFinite(value) || value < 0) {
    problems.push(`"petsUpdatedAt" was ${JSON.stringify(value)}`);
    return null;
  }
  if (value > now) {
    problems.push('"petsUpdatedAt" was in the future');
    return now;
  }
  return value;
}

function isPlainObject(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
