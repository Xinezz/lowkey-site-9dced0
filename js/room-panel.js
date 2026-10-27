// The Room window: the window view, lighting (string lights and lamp glow),
// rug and wallpaper, and which decorations stand where. Like the other
// panels, the controls are built once and render() only updates them.

import { THEMES, getTheme, isThemeUnlocked } from './themes.js';
import { COLLECTIONS, ITEMS, itemsOfKind } from './items.js';
import { SPOTS } from './layout.js';
import { isOwned } from './economy.js';
import { STYLE_KINDS, spotOf, spotsFor } from './decorations.js';
import { createDefaultStylePreview, createItemPreview, createViewPreview } from './previews.js';

const PICKER_W = 60; // CSS px for each style picture: the 30-pixel scenes at 2×
const PICKER_H = 48;
const DEFAULT_STYLE_NAMES = { lights: 'Classic', glow: 'Warm', rug: 'Lavender', wallpaper: 'Matches the view' };

/**
 * @param {object} options
 * @param {object} options.els  { themeList, lightsList, glowList, rugList, wallpaperList,
 *                                decorFilter, decorList, decorEmpty, showAllButton, storeAllButton }
 * @param {() => object} options.getState
 * @param {(themeId: string) => void} options.onThemeChange
 * @param {(kind: string, itemId: string | null) => void} options.onStyleChange
 * @param {(itemId: string, displayed: boolean) => void} options.onDisplayChange
 * @param {(itemId: string) => void} options.onMove
 * @param {(displayed: boolean) => void} options.onDisplayAll
 */
export function createRoomPanel({ els, getState, onThemeChange, onStyleChange, onDisplayChange, onMove, onDisplayAll }) {
  const themeCards = new Map(); // themeId → card
  const styleChips = []; // { kind, itemId, chip, radio }
  const decorRows = new Map(); // itemId → parts of its row
  let wallpaperDefault = null; // { holder, themeId } so its preview can follow the view

  buildThemePicker();
  for (const kind of STYLE_KINDS) buildStylePicker(kind);
  buildDecorList();
  els.showAllButton.addEventListener('click', () => onDisplayAll(true));
  els.storeAllButton.addEventListener('click', () => onDisplayAll(false));

  function buildThemePicker() {
    for (const theme of THEMES) {
      // Native radio buttons give us keyboard support (arrow keys) for free.
      const card = document.createElement('label');
      card.className = 'theme-card';
      const radio = radioInput('theme', theme.id);
      const preview = createViewPreview(theme, 128, 80);
      preview.classList.add('theme-preview');
      const text = document.createElement('span');
      text.className = 'theme-text';
      text.append(span('theme-name', theme.name), span('theme-desc', theme.description));
      card.append(radio, preview, text, span('theme-check', 'Selected'));
      els.themeList.append(card);
      themeCards.set(theme.id, card);
    }
    // One listener on the parent handles every radio inside it ("event delegation").
    els.themeList.addEventListener('change', (event) => onThemeChange(event.target.value));
  }

  /** A row of choices for one style: the room's default first, then every item of that kind. */
  function buildStylePicker(kind) {
    const list = els[`${kind}List`];
    const addChip = (itemId, name, preview) => {
      const chip = document.createElement('label');
      chip.className = 'style-chip';
      const radio = radioInput(`style-${kind}`, itemId ?? '');
      const holder = span('style-preview', '');
      holder.append(preview);
      chip.append(radio, holder, span('style-name', name));
      list.append(chip);
      styleChips.push({ kind, itemId, chip, radio });
      return holder;
    };

    const room = getTheme(getState().themeId).room;
    const defaultHolder = addChip(null, DEFAULT_STYLE_NAMES[kind], createDefaultStylePreview(kind, room, PICKER_W, PICKER_H));
    if (kind === 'wallpaper') wallpaperDefault = { holder: defaultHolder, themeId: getState().themeId };
    for (const item of itemsOfKind(kind)) addChip(item.id, item.name, createItemPreview(item, PICKER_W, PICKER_H));

    list.addEventListener('change', (event) => onStyleChange(kind, event.target.value || null));
  }

  function buildDecorList() {
    els.decorFilter.append(new Option('All collections', 'all'));
    for (const { id, label } of COLLECTIONS) els.decorFilter.append(new Option(label, id));
    els.decorFilter.addEventListener('change', render);

    for (const item of ITEMS.filter((i) => i.kind === 'decor')) {
      const row = document.createElement('li');
      row.className = 'decor-row';

      // A real checkbox, hidden visually and drawn as a pixel switch with CSS.
      const label = document.createElement('label');
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.value = item.id;
      checkbox.className = 'visually-hidden';
      const thumb = span('decor-thumb', '');
      thumb.append(createItemPreview(item, 40, 32));
      const text = span('decor-text', '');
      const stateLabel = span('decor-state', '');
      text.append(span('decor-name', item.name), stateLabel);
      const toggle = span('switch', '');
      toggle.setAttribute('aria-hidden', 'true');
      label.append(checkbox, thumb, text, toggle);

      const moveButton = document.createElement('button');
      moveButton.type = 'button';
      moveButton.className = 'btn btn-small decor-move';
      moveButton.textContent = 'Move';
      moveButton.title = 'Move to the next spot (swapping with anything there)';
      moveButton.setAttribute('aria-label', `Move ${item.name} to another spot`);
      moveButton.addEventListener('click', () => onMove(item.id));

      row.append(label, moveButton);
      els.decorList.append(row);
      decorRows.set(item.id, { item, row, checkbox, stateLabel, moveButton });
    }

    els.decorList.addEventListener('change', (event) => {
      if (event.target.type === 'checkbox') onDisplayChange(event.target.value, event.target.checked);
    });
  }

  function render() {
    const state = getState();

    for (const [themeId, card] of themeCards) {
      const theme = getTheme(themeId);
      card.hidden = !isThemeUnlocked(theme, state.ownedItemIds);
      card.querySelector('input').checked = themeId === state.themeId;
    }

    for (const { kind, itemId, chip, radio } of styleChips) {
      chip.hidden = itemId !== null && !isOwned(state, itemId);
      radio.checked = (state.style[kind] ?? null) === itemId;
    }
    // "Matches the view" shows the current view's own wall.
    if (wallpaperDefault && wallpaperDefault.themeId !== state.themeId) {
      wallpaperDefault.holder.replaceChildren(createDefaultStylePreview('wallpaper', getTheme(state.themeId).room, PICKER_W, PICKER_H));
      wallpaperDefault.themeId = state.themeId;
    }

    const filter = els.decorFilter.value;
    let ownedCount = 0;
    let shownCount = 0;
    for (const { item, row, checkbox, stateLabel, moveButton } of decorRows.values()) {
      const owned = isOwned(state, item.id);
      if (owned) ownedCount += 1;
      row.hidden = !owned || (filter !== 'all' && item.collection !== filter);
      if (!row.hidden) shownCount += 1;
      const spotId = spotOf(state, item.id);
      checkbox.checked = spotId !== null;
      stateLabel.textContent = spotId ? SPOTS[spotId].label : 'In storage';
      // Items in storage, or with only one possible spot (like a wall poster),
      // can't move. The button stays invisible rather than gone, so every
      // row's switch lines up.
      const unmovable = spotId === null || spotsFor(item).length < 2;
      moveButton.classList.toggle('is-unavailable', unmovable);
      moveButton.disabled = unmovable;
    }

    els.decorEmpty.hidden = shownCount > 0;
    els.decorEmpty.textContent =
      ownedCount === 0
        ? "Nothing here yet. Buy decorations in the Shop and they'll appear here."
        : 'No decorations from this collection yet.';
    els.showAllButton.disabled = ownedCount === 0;
    els.storeAllButton.disabled = ownedCount === 0;
  }

  return { render };
}

function radioInput(name, value) {
  const radio = document.createElement('input');
  radio.type = 'radio';
  radio.name = name;
  radio.value = value;
  radio.className = 'visually-hidden';
  return radio;
}

function span(className, text) {
  const element = document.createElement('span');
  element.className = className;
  element.textContent = text;
  return element;
}
