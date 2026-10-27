// The Shop window: a shop and a collection book in one. The cards are
// built once; render() only updates what can change (owned, affordable),
// which is cheaper than rebuilding the whole list after every purchase.
//
// With 100 items, filters matter: a row of collection tabs (Christmas,
// Lunar New Year, ...), a "kind" menu (plants, lighting, ...) and a switch
// that hides what you already own.

import { ITEMS, CATEGORIES, COLLECTIONS } from './items.js';
import { SLOT_NAMES } from './layout.js';
import { canAfford, isForSale, isOwned } from './economy.js';
import { isInUse } from './decorations.js';
import { createItemPreview } from './previews.js';

const THUMB_W = 132; // CSS px available for an item picture (a window view fits at 2×)
const THUMB_H = 84;

// Where a style or view goes, shown on its card in place of a spot.
const KIND_PLACES = {
  lights: 'String lights',
  glow: 'Lamp glow',
  rug: 'Rug',
  wallpaper: 'Wallpaper',
  view: 'Window view',
};

/**
 * @param {object} options
 * @param {object} options.els  { list, collectionTabs, kindFilter, hideOwned, empty, progress }
 * @param {() => object} options.getState
 * @param {(itemId: string) => void} options.onBuy  called when a Buy button is clicked
 */
export function createCollectionUI({ els, getState, onBuy }) {
  const cards = new Map(); // itemId → { card, button, status }
  const tabCounts = new Map(); // collectionId → the "3/17" span on its tab
  let activeCollection = 'all';

  buildCollectionTabs();
  buildKindFilter();
  buildCards();
  els.hideOwned.addEventListener('change', render);

  function buildCollectionTabs() {
    for (const { id, label } of [{ id: 'all', label: 'All' }, ...COLLECTIONS]) {
      const chip = document.createElement('label');
      chip.className = 'chip';
      const radio = document.createElement('input');
      radio.type = 'radio';
      radio.name = 'collection';
      radio.value = id;
      radio.className = 'visually-hidden';
      radio.checked = id === activeCollection;
      const text = document.createElement('span');
      const count = document.createElement('small');
      count.className = 'chip-count';
      text.append(label, ' ', count);
      chip.append(radio, text);
      els.collectionTabs.append(chip);
      tabCounts.set(id, count);
    }
    els.collectionTabs.addEventListener('change', (event) => {
      activeCollection = event.target.value;
      render();
    });
  }

  function buildKindFilter() {
    els.kindFilter.append(new Option('Everything', 'all'));
    for (const { id, label } of CATEGORIES) els.kindFilter.append(new Option(label, id));
    els.kindFilter.addEventListener('change', render);
  }

  function buildCards() {
    for (const item of ITEMS) {
      const card = document.createElement('li');
      card.className = 'item-card';

      const thumb = document.createElement('div');
      thumb.className = 'item-thumb';
      thumb.append(createItemPreview(item, THUMB_W, THUMB_H));

      const name = document.createElement('span');
      name.className = 'item-name';
      name.textContent = item.name;

      const where = document.createElement('span');
      where.className = 'item-where';
      where.textContent = item.kind === 'decor' ? SLOT_NAMES[item.slot] : KIND_PLACES[item.kind];

      const meta = document.createElement('span');
      meta.className = 'item-meta';
      meta.textContent = item.description;

      const status = document.createElement('span');
      status.className = 'item-status';

      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'btn btn-buy';
      if (isForSale(item)) {
        button.setAttribute('aria-label', `Buy ${item.name} for ${item.price} coins`);
        const coin = document.createElement('span');
        coin.className = 'coin-icon';
        coin.setAttribute('aria-hidden', 'true');
        button.append(coin, String(item.price));
        button.addEventListener('click', () => onBuy(item.id));
      }

      // Remove the "just bought" glow once its CSS animation has finished,
      // so it can play again next time.
      card.addEventListener('animationend', () => card.classList.remove('just-bought'));

      card.append(thumb, name, where, meta, status, button);
      els.list.append(card);
      cards.set(item.id, { card, button, status });
    }
  }

  /** Updates every card to match the current state. Call after coins or items change. */
  function render() {
    const state = getState();
    const kind = els.kindFilter.value;
    const hideOwned = els.hideOwned.checked;
    const owned = { all: 0 };
    const total = { all: ITEMS.length };
    let shown = 0;

    for (const item of ITEMS) {
      const { card, button, status } = cards.get(item.id);
      const isMine = isOwned(state, item.id);
      const affordable = canAfford(state, item);
      total[item.collection] = (total[item.collection] ?? 0) + 1;
      if (isMine) {
        owned.all += 1;
        owned[item.collection] = (owned[item.collection] ?? 0) + 1;
      }

      card.hidden =
        (activeCollection !== 'all' && item.collection !== activeCollection) ||
        (kind !== 'all' && item.category !== kind) ||
        (hideOwned && isMine);
      if (!card.hidden) shown += 1;

      card.classList.toggle('is-owned', isMine);
      button.hidden = isMine || !isForSale(item);
      button.disabled = !affordable;
      status.textContent = statusText(state, item, isMine, affordable);
    }

    for (const [id, count] of tabCounts) {
      count.textContent = `${owned[id] ?? 0}/${total[id]}`;
      count.parentElement.classList.toggle('is-complete', owned[id] === total[id]);
    }
    els.progress.textContent = `${owned.all} / ${ITEMS.length} collected`;
    els.empty.hidden = shown > 0;
  }

  /** Plays a short warm glow on a card, as purchase feedback. */
  function flash(itemId) {
    cards.get(itemId).card.classList.add('just-bought');
  }

  return { render, flash };
}

function statusText(state, item, owned, affordable) {
  if (owned && item.kind === 'decor') return isInUse(state, item) ? 'In your room' : 'In storage';
  if (owned) return isInUse(state, item) ? 'In use' : 'Owned';
  if (!isForSale(item)) return `Moves in at level ${item.levelReward}`;
  return affordable ? '' : `Need ${item.price - state.coins} more`;
}
