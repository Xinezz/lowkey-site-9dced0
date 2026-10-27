// Game rules for coins and purchases. Like timer.js, this file has no DOM
// code, so every rule can be unit-tested (see tests/economy.test.js).
//
// Important: the UI disables "Buy" buttons you can't afford, but the rules
// here check again anyway. Never rely on the interface alone to enforce a
// rule: a disabled button can be re-enabled from the browser's dev tools.

// (Earning coins for a finished session lives in progression.js.)

import { getItem } from './items.js';

/** An item is "unlocked" once the player owns it. */
export function isOwned(state, itemId) {
  return state.ownedItemIds.includes(itemId);
}

/** Level rewards (like the cat) have no price: they can't be bought. */
export function isForSale(item) {
  return item.price !== null;
}

export function canAfford(state, item) {
  return isForSale(item) && state.coins >= item.price;
}

/**
 * Tries to buy an item. Instead of throwing errors, it returns a small
 * result object, which makes the caller's job simple:
 *   { ok: true, item }  or  { ok: false, reason, item }
 */
export function purchaseItem(state, itemId) {
  const item = getItem(itemId);
  if (!item) return { ok: false, reason: 'unknown-item' };
  if (!isForSale(item)) return { ok: false, reason: 'not-for-sale', item };
  if (isOwned(state, itemId)) return { ok: false, reason: 'already-owned', item };
  if (!canAfford(state, item)) return { ok: false, reason: 'not-enough-coins', item };

  state.coins -= item.price;
  state.ownedItemIds.push(item.id);
  return { ok: true, item };
}
