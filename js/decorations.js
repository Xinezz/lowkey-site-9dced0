// Rules for decorating the room. No DOM code, so it is unit-tested in
// tests/decorations.test.js.
//
// Decorations stand in spots (see SPOTS in layout.js): state.placements maps
// a spot id to the item standing there, e.g. { sillLeft: 'pothos' }. Each
// spot holds one item, and an item fits any spot whose type matches its slot.
//
// Room styles (string lights, lamp glow, rug, wallpaper) live in state.style,
// one choice each; null means the room's built-in default. The window view is
// state.themeId.

import { SPOTS } from './layout.js';
import { ITEMS, getItem } from './items.js';
import { isOwned } from './economy.js';

export const STYLE_KINDS = Object.freeze(['lights', 'glow', 'rug', 'wallpaper']);

/** Ids of every spot an item could stand in, in room order. */
export function spotsFor(item) {
  return Object.keys(SPOTS).filter((spotId) => SPOTS[spotId].type === item.slot);
}

/** The spot an item is standing in, or null if it's in storage. */
export function spotOf(state, itemId) {
  return Object.keys(state.placements).find((spotId) => state.placements[spotId] === itemId) ?? null;
}

export function isDisplayed(state, itemId) {
  return spotOf(state, itemId) !== null;
}

export function freeSpotsFor(state, item) {
  return spotsFor(item).filter((spotId) => !state.placements[spotId]);
}

/**
 * Puts an owned decoration in a spot. Whatever stood there before goes back
 * to storage. Returns { ok: true, replaced } or { ok: false, reason }.
 */
export function placeItem(state, itemId, spotId) {
  const item = getItem(itemId);
  if (!item || item.kind !== 'decor') return { ok: false, reason: 'not-a-decoration' };
  if (!isOwned(state, itemId)) return { ok: false, reason: 'not-owned' };
  if (SPOTS[spotId]?.type !== item.slot) return { ok: false, reason: 'wrong-spot' };

  const replaced = state.placements[spotId] ?? null;
  removeItem(state, itemId);
  state.placements[spotId] = itemId;
  return { ok: true, replaced: replaced === itemId ? null : replaced };
}

/** Puts a decoration back in storage. */
export function removeItem(state, itemId) {
  const spotId = spotOf(state, itemId);
  if (spotId) delete state.placements[spotId];
}

/** Puts an owned decoration in the first free spot that fits. Returns the spot id, or null if all are taken. */
export function autoPlace(state, itemId) {
  const item = getItem(itemId);
  if (!item || item.kind !== 'decor' || !isOwned(state, itemId)) return null;
  const current = spotOf(state, itemId);
  if (current) return current;
  const [free] = freeSpotsFor(state, item);
  if (!free) return null;
  state.placements[free] = itemId;
  return free;
}

/**
 * Shows a decoration: in a free spot if there is one, otherwise in the first
 * spot of its type, sending whatever stood there back to storage. So showing
 * something always works, and the player is told what made room for it.
 * Returns { ok: true, spotId, replaced } or { ok: false, reason }.
 */
export function displayItem(state, itemId) {
  const current = spotOf(state, itemId);
  if (current) return { ok: true, spotId: current, replaced: null };
  const free = autoPlace(state, itemId);
  if (free) return { ok: true, spotId: free, replaced: null };
  const item = getItem(itemId);
  if (!item || item.kind !== 'decor') return { ok: false, reason: 'not-a-decoration' };
  if (!isOwned(state, itemId)) return { ok: false, reason: 'not-owned' };
  const [first] = spotsFor(item);
  const { replaced } = placeItem(state, itemId, first);
  return { ok: true, spotId: first, replaced };
}

/**
 * Shows (true) or stores (false) a decoration.
 * Returns { ok: true, spotId, replaced } or { ok: false, reason }.
 */
export function setDisplayed(state, itemId, displayed) {
  if (!isOwned(state, itemId)) return { ok: false, reason: 'not-owned' };
  if (displayed) return displayItem(state, itemId);
  removeItem(state, itemId);
  return { ok: true, spotId: null, replaced: null };
}

/**
 * Moves a displayed decoration to the next spot of its type (wrapping
 * round). If something stands there, the two swap places.
 * Returns { spotId, swapped } (swapped is the other item's id, or null), or
 * null when the item isn't displayed or has nowhere else to go.
 */
export function moveToNextSpot(state, itemId) {
  const item = getItem(itemId);
  const current = spotOf(state, itemId);
  if (!item || !current) return null;
  const spots = spotsFor(item);
  if (spots.length < 2) return null;
  const next = spots[(spots.indexOf(current) + 1) % spots.length];
  const swapped = state.placements[next] ?? null;
  state.placements[next] = itemId;
  if (swapped) state.placements[current] = swapped;
  else delete state.placements[current];
  return { spotId: next, swapped };
}

/** Shows as many owned decorations as there are free spots, in catalogue order. */
export function showAll(state) {
  for (const item of ITEMS) if (item.kind === 'decor' && isOwned(state, item.id)) autoPlace(state, item.id);
}

export function storeAll(state) {
  state.placements = {};
}

/**
 * Chooses a room style: a string-lights, lamp-glow, rug or wallpaper item,
 * or null for the room's default. Returns false (changing nothing) for items
 * the player doesn't own or of the wrong kind.
 */
export function setStyle(state, kind, itemId) {
  if (!STYLE_KINDS.includes(kind)) return false;
  if (itemId !== null) {
    const item = getItem(itemId);
    if (!item || item.kind !== kind || !isOwned(state, itemId)) return false;
  }
  state.style[kind] = itemId;
  return true;
}

/**
 * What happens right after buying (or being given) something, so it shows up
 * straight away: decorations go on display (see displayItem), styles are
 * switched on, and a new view becomes the background.
 * @returns {{ spotId: string | null, replaced: string | null }} for decorations, {} otherwise
 */
export function equipNewItem(state, item) {
  if (item.kind === 'decor') {
    const { spotId = null, replaced = null } = displayItem(state, item.id);
    return { spotId, replaced };
  }
  if (item.kind === 'view') state.themeId = item.themeId;
  else setStyle(state, item.kind, item.id);
  return {};
}

/** Is this item currently in use (displayed, or the chosen style or view)? */
export function isInUse(state, item) {
  if (item.kind === 'decor') return isDisplayed(state, item.id);
  if (item.kind === 'view') return state.themeId === item.themeId;
  return state.style[item.kind] === item.id;
}
