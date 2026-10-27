// The catalogue of collectibles: every collection, combined into one list.
//
// This is static data that never changes while playing. Whether the player
// owns an item is NOT stored here; that lives in the game state
// (state.ownedItemIds). Keeping "what exists" separate from "what the player
// has" means a save file only needs a short list of ids, and prices or art
// can be changed later without breaking saves.
//
// Every item has: id, name, collection, category, price, description, kind.
//
//   kind 'decor'      (the default) stands in a spot in the room:
//                     slot, sprite, and optionally glow and pet
//   kind 'lights'     a string-lights style:  lights { colors, bulb }
//   kind 'glow'       a desk-lamp colour:     glowColor
//   kind 'rug'        a rug style:            rug { edge, main, inner, center }
//   kind 'wallpaper'  a wall style:           wallpaper { ... colours, pattern }
//   kind 'view'       a window view:          themeId (see themes.js)
//
// `price: null` + `levelReward: n` means the item can't be bought; it is
// given for free on reaching level n.

import { EVERYDAY } from './collections/everyday.js';
import { CHRISTMAS } from './collections/christmas.js';
import { LUNAR } from './collections/lunar.js';
import { MIDAUTUMN } from './collections/midautumn.js';
import { AUTUMN } from './collections/autumn.js';
import { WINTER } from './collections/winter.js';

export const COLLECTIONS = Object.freeze([
  { id: 'everyday', label: 'Everyday', items: EVERYDAY },
  { id: 'christmas', label: 'Christmas', items: CHRISTMAS },
  { id: 'lunar', label: 'Lunar New Year', items: LUNAR },
  { id: 'midautumn', label: 'Mid-Autumn', items: MIDAUTUMN },
  { id: 'autumn', label: 'Autumn', items: AUTUMN },
  { id: 'winter', label: 'Winter', items: WINTER },
]);

export const CATEGORIES = Object.freeze([
  { id: 'plant', label: 'Plants' },
  { id: 'lamp', label: 'Lamps & lanterns' },
  { id: 'wall', label: 'Wall & window' },
  { id: 'decor', label: 'Decor' },
  { id: 'book', label: 'Books' },
  { id: 'pet', label: 'Pets' },
  { id: 'lighting', label: 'Lighting' },
  { id: 'room', label: 'Rugs & wallpaper' },
  { id: 'view', label: 'Window views' },
]);

// Each item learns which collection it belongs to, and decorations get
// kind 'decor' so the rest of the code never has to guess.
export const ITEMS = Object.freeze(
  COLLECTIONS.flatMap(({ id, items }) => items.map((item) => Object.freeze({ kind: 'decor', ...item, collection: id }))),
);

const ITEMS_BY_ID = new Map(ITEMS.map((item) => [item.id, item]));

export function getItem(id) {
  return ITEMS_BY_ID.get(id);
}

/** All items of one kind, e.g. itemsOfKind('rug'). */
export function itemsOfKind(kind) {
  return ITEMS.filter((item) => item.kind === kind);
}

export function getCategoryLabel(categoryId) {
  return CATEGORIES.find((category) => category.id === categoryId)?.label ?? categoryId;
}

export function getCollectionLabel(collectionId) {
  return COLLECTIONS.find((collection) => collection.id === collectionId)?.label ?? collectionId;
}
