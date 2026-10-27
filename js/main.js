// Entry point. This file is the "glue": it loads the save, creates the
// timer, connects the buttons and starts the room. The rules themselves live
// elsewhere (timer.js, economy.js, decorations.js, storage.js), which keeps
// each file small and testable.

import { DEV_MODE, REWARDS, TIMER_CONFIG, UI_TICK_MS } from './config.js';
import { PomodoroTimer, Phase, Status } from './timer.js';
import { playChime, setMuted, unlockAudio } from './sound.js';
import { startRoom } from './room.js';
import { loadArt } from './art.js';
import { getItem } from './items.js';
import { FOCUS_VIEWS, resetProgress } from './state.js';
import { purchaseItem } from './economy.js';
import { equipNewItem, moveToNextSpot, setDisplayed, setStyle, showAll, storeAll } from './decorations.js';
import { SPOTS } from './layout.js';
import { getTheme, isThemeUnlocked } from './themes.js';
import { finishFocusSession, grantLevelRewards } from './progression.js';
import { getLevelProgress } from './levels.js';
import { advancePets, feedPet, needingAttention, playWithPet, syncPets, tuckIn, wakeUp } from './pets.js';
import { loadGame, saveGame, SAVE_KEY, BACKUP_KEY } from './storage.js';
import { createCollectionUI } from './collection-ui.js';
import { createRoomPanel } from './room-panel.js';
import { createPetsPanel } from './pets-panel.js';
import { createIcon } from './ui-icons.js';

// ---- Game state -------------------------------------------------------------
// Everything about the player's progress lives in this one object. It is
// loaded from localStorage at start-up and saved after every change.
const loaded = loadGame();
const state = loaded.state;
let saveWorking = loaded.status !== 'unavailable';

// A save from before pets existed may already be past the unlock level, so
// hand out anything earned. Then let the pets catch up on the time you were away.
grantLevelRewards(state, Date.now());
advancePets(state, Date.now());

const PET_SAVE_INTERVAL_MS = 60_000;

// ---- DOM references (looked up once, not on every tick) ---------------------
const $ = (id) => document.getElementById(id);
const els = {
  time: $('time-display'),
  phaseLabel: $('phase-label'),
  progressFill: $('progress-fill'),
  statusText: $('status-text'),
  startBtn: $('start-btn'),
  resetBtn: $('reset-btn'),
  skipBtn: $('skip-btn'),
  sessionCount: $('session-count'),
  levelCount: $('level-count'),
  levelStat: $('level-stat'),
  coinCount: $('coin-count'),
  coinStat: $('coin-stat'),
  muteBtn: $('mute-btn'),
  focusViewList: $('focus-view-list'),
  roomPanel: {
    themeList: $('theme-list'),
    lightsList: $('lights-list'),
    glowList: $('glow-list'),
    rugList: $('rug-list'),
    wallpaperList: $('wallpaper-list'),
    decorFilter: $('decor-filter'),
    decorList: $('decor-list'),
    decorEmpty: $('decor-empty'),
    showAllButton: $('show-all-btn'),
    storeAllButton: $('store-all-btn'),
  },
  shop: {
    list: $('item-grid'),
    collectionTabs: $('collection-tabs'),
    kindFilter: $('kind-filter'),
    hideOwned: $('hide-owned'),
    empty: $('shop-empty'),
    progress: $('collection-progress'),
  },
  collectionHint: $('collection-hint'),
  saveStatus: $('save-status'),
  resetProgressBtn: $('reset-progress-btn'),
  resetDialog: $('reset-dialog'),
  resetSummary: $('reset-summary'),
  progressSummary: $('progress-summary'),
  stage: $('stage'),
  hudTimer: $('hud-timer'),
  hudTime: $('hud-time'),
  hudPhase: $('hud-phase'),
  window: $('window'),
  windowTitle: $('window-title'),
  windowClose: $('window-close'),
  panels: [...document.querySelectorAll('.window-panel')],
  dockButtons: [...document.querySelectorAll('.dock-btn[data-window]')],
  petsDot: $('pets-dot'),
  fullscreenBtn: $('fullscreen-btn'),
  pets: {
    tabLock: $('pets-tab-lock'),
    locked: $('pets-locked'),
    lockedText: $('pets-locked-text'),
    unlockFill: $('pets-unlock-fill'),
    unlockCount: $('pets-unlock-count'),
    unlocked: $('pets-unlocked'),
    bonus: $('pet-bonus'),
    list: $('pet-list'),
  },
  roomCanvas: $('room-canvas'),
  toast: $('toast'),
  devBadge: $('dev-badge'),
};

const APP_TITLE = 'Lo-Fi Study Room';
const ROOM_DESCRIPTION = 'A cozy pixel-art study room with a desk, lamp, window, plants and books';

const START_LABELS = {
  [Status.IDLE]: 'Start',
  [Status.RUNNING]: 'Pause',
  [Status.PAUSED]: 'Resume',
};

const STATUS_MESSAGES = {
  [Phase.FOCUS]: {
    [Status.IDLE]: 'Ready when you are. Press Start to focus.',
    [Status.RUNNING]: 'Focusing. One small step at a time.',
    [Status.PAUSED]: 'Paused. Resume whenever you are ready.',
  },
  [Phase.BREAK]: {
    [Status.IDLE]: 'Break time. Press Start when you are ready.',
    [Status.RUNNING]: 'On a break. Stretch, sip some tea, rest your eyes.',
    [Status.PAUSED]: 'Break paused.',
  },
};

// How a pet that needs something is described in the welcome-back message.
const NEED_PHRASES = { food: 'is hungry', love: 'missed you', energy: 'is sleepy' };

// Created in init(), once the page is ready.
let room = null;
let collection = null;
let roomPanel = null;
let petsPanel = null;

let openWindowName = null; // 'timer', 'room', 'shop', 'pets', 'settings', or null when closed

// ---- Saving -----------------------------------------------------------------

/**
 * Call after every change to `state`: it saves, then refreshes the screen.
 * Saving straight away (rather than on a timer or when the page closes)
 * means a crash or a closed laptop can only ever lose the very last click.
 */
function commit() {
  const ok = saveGame(state);
  if (!ok && saveWorking) showToast("Couldn't save your progress. This browser may be blocking storage.");
  saveWorking = ok;
  renderAll();
}

/** Tells the player what happened when their save was loaded. */
function showLoadNotice() {
  if (loaded.problems.length) console.warn('Saved data needed repairs:', loaded.problems);

  if (loaded.status === 'unreadable') {
    console.warn(`The damaged save was kept in localStorage under "${BACKUP_KEY}".`);
    showToast("Your saved progress couldn't be read, so a fresh room was started.");
  } else if (loaded.status === 'unavailable') {
    showToast("Saving isn't available in this browser, so progress won't be kept.");
  } else if (loaded.problems.length) {
    showToast('Some saved data looked wrong and was repaired.');
  } else if (loaded.status === 'loaded' && (state.completedFocusSessions > 0 || state.ownedItemIds.length > 0)) {
    const needy = Object.entries(state.pets).find(([, pet]) => needingAttention(pet));
    if (needy) {
      const [petId, pet] = needy;
      showToast(`Welcome back. ${getItem(petId).name} ${NEED_PHRASES[needingAttention(pet)]}.`);
    } else {
      showToast('Welcome back. Your room is just as you left it.');
    }
  }
}

/**
 * Pets change a little every tick, but saving that often would be wasteful.
 * Because needs are stored with a timestamp, an older save is still correct:
 * on loading, the missing time is simply applied again.
 */
function savePetsQuietly() {
  if (Object.keys(state.pets).length === 0) return;
  saveWorking = saveGame(state);
}

// ---- Timer ------------------------------------------------------------------

const timer = new PomodoroTimer({ ...TIMER_CONFIG, onComplete: handlePhaseComplete });

/**
 * Runs only when a phase reaches zero by itself, never on Reset or Skip.
 * This is the single place where rewards are granted.
 */
function handlePhaseComplete({ phase }) {
  playChime();
  if (phase !== Phase.FOCUS) {
    showToast('Break finished. Ready for another focus session?');
    return;
  }

  const result = finishFocusSession(state, Date.now());
  commit();

  const bonusText = result.bonus ? ` (with a +${result.bonus} happy-pet bonus)` : '';
  let message = `Focus complete: +${result.coins} coins${bonusText}.`;
  if (result.newItemIds.includes('cat')) {
    message += ` Level ${result.newLevel}! Pet care is unlocked and a sleepy cat has moved in.`;
    room?.celebrate('cat');
  } else if (result.newLevel) {
    message += ` You reached level ${result.newLevel}.`;
  } else {
    message += ` Enjoy your ${describeDuration(TIMER_CONFIG.breakMs)} break.`;
  }
  showToast(message);
}

function isFocusing() {
  return timer.phase === Phase.FOCUS && timer.status === Status.RUNNING;
}

/**
 * What the room should show, read every frame:
 * - where the study buddy should be: at the desk for the whole focus session
 *   (studying while it runs, looking up while paused), otherwise relaxing;
 * - whether to move in to the close-up while they're at the desk;
 * - how far the focus session is (0 → 1), which fills their notebook page.
 */
function getScene() {
  const inSession = timer.phase === Phase.FOCUS && timer.status !== Status.IDLE;
  return {
    goal: inSession ? 'desk' : 'relax',
    studying: isFocusing(),
    closeUp: inSession && state.focusView === 'closeup',
    progress: timer.phase === Phase.FOCUS ? timer.getProgress() : 0,
  };
}

/** Re-reads the timer and refreshes the screen. Safe to call at any time, as often as you like. */
function tick() {
  timer.update();
  advancePets(state, Date.now(), { calm: isFocusing() });
  renderTimer();
  if (openWindowName === 'pets') petsPanel.render(); // only redraw meters you can actually see
  els.petsDot.hidden = isFocusing() || !Object.values(state.pets).some(needingAttention);
}

let alarmId = null;

/**
 * The regular UI tick is a repeating timer, and browsers may delay those by
 * up to a minute in background tabs. A single timeout set right after a click
 * is delayed far less, so we also schedule one for the exact end of the phase.
 * That way the chime plays on time even if you are in another tab.
 */
function scheduleAlarm() {
  clearTimeout(alarmId);
  if (timer.status === Status.RUNNING) {
    alarmId = setTimeout(tick, timer.getRemainingMs() + 50);
  }
}

function toggleTimer() {
  unlockAudio(); // a click is our chance to get permission to play sound later
  if (timer.status === Status.RUNNING) {
    timer.pause();
  } else {
    timer.start();
    // Starting to focus tucks the timer window away, so you can watch your
    // buddy sit down and get to work. The countdown stays visible top left.
    if (timer.phase === Phase.FOCUS && openWindowName === 'timer') closeWindow();
  }
  onTimerChanged();
}

function resetTimer() {
  timer.reset();
  onTimerChanged();
}

function skipPhase() {
  timer.skip();
  onTimerChanged();
}

function onTimerChanged() {
  scheduleAlarm();
  renderTimer();
}

// ---- Shop and decorations ---------------------------------------------------

const PURCHASE_ERRORS = {
  'not-enough-coins': 'Not enough coins yet. Finish a focus session to earn more.',
  'already-owned': 'You already own that one.',
  'unknown-item': 'That item does not exist.',
};

function buyItem(itemId) {
  const result = purchaseItem(state, itemId);
  if (!result.ok) {
    showToast(PURCHASE_ERRORS[result.reason]);
    collection.render(); // undo anything odd, e.g. a button re-enabled in dev tools
    return;
  }
  // Put it to use straight away: on display, switched on, or as the new view.
  const { spotId, replaced } = equipNewItem(state, result.item);
  syncPets(state, Date.now()); // a new pet gets needs (once pet care is unlocked)
  commit();
  collection.flash(itemId);
  if (spotId) room?.celebrate(itemId);
  showToast(`${result.item.name} ${describeNewItem(result.item, spotId)}.${describeSwap(replaced)}`);
}

/** "is now in your room (desk, by the mug)", "is your window view now", ... for the purchase message. */
function describeNewItem(item, spotId) {
  if (item.kind === 'view') return 'is your window view now';
  if (item.kind === 'decor') return `is now in your room (${SPOTS[spotId].label.toLowerCase()})`;
  return 'is in use now. Change it any time in the Room window';
}

/** " Desk Bonsai went into storage to make room." when something was swapped out. */
function describeSwap(replacedId) {
  return replacedId ? ` ${getItem(replacedId).name} went into storage to make room.` : '';
}

/**
 * Runs one pet action (feedPet, playWithPet, tuckIn or wakeUp) on the
 * up-to-date state, saves if it worked, and returns the result so the pet
 * card can show a little note.
 */
function careForPet(petId, action, { heart = false } = {}) {
  advancePets(state, Date.now(), { calm: isFocusing() });
  const result = action(state, petId);
  if (result.ok) {
    commit();
    if (heart) room?.react(petId);
  }
  return result;
}

function changeItemDisplay(itemId, displayed) {
  const result = setDisplayed(state, itemId, displayed);
  if (!result.ok) {
    roomPanel.render(); // not owned: put the switch back
    return;
  }
  commit();
  if (displayed) room?.celebrate(itemId);
  if (result.replaced) showToast(describeSwap(result.replaced).trim());
}

function moveItem(itemId) {
  const result = moveToNextSpot(state, itemId);
  if (!result) return;
  commit();
  room?.celebrate(itemId);
  const swapText = result.swapped ? ` It swapped places with the ${getItem(result.swapped).name}.` : '';
  showToast(`Moved to: ${SPOTS[result.spotId].label}.${swapText}`);
}

function changeAllDisplays(displayed) {
  if (displayed) showAll(state);
  else storeAll(state);
  commit();
}

function changeStyle(kind, itemId) {
  if (!setStyle(state, kind, itemId)) {
    roomPanel.render(); // not owned: put the choice back
    return;
  }
  commit();
}

function changeTheme(themeId) {
  const theme = getTheme(themeId);
  if (theme.id === themeId && isThemeUnlocked(theme, state.ownedItemIds)) state.themeId = themeId;
  commit(); // also re-renders, which puts the choice back if it wasn't allowed
}

// ---- Reset progress ---------------------------------------------------------

function openResetDialog() {
  els.resetSummary.textContent =
    `This removes ${plural(state.coins, 'coin')}, ` +
    `${plural(state.completedFocusSessions, 'completed session')} and ` +
    `${plural(state.ownedItemIds.length, 'collectible')}.`;
  els.resetDialog.returnValue = ''; // so closing with Escape doesn't reuse an old answer
  els.resetDialog.showModal();
}

/** The dialog's 'close' event fires however it was closed; returnValue says which button. */
function handleResetDialogClose() {
  if (els.resetDialog.returnValue !== 'reset') return;
  resetProgress(state);
  commit();
  showToast('Progress reset. Here is to a fresh start.');
}

// ---- Rendering --------------------------------------------------------------

function renderAll() {
  renderStats();
  renderMute();
  renderFocusView();
  renderRoomDescription();
  renderSaveStatus();
  collection.render();
  roomPanel.render();
  petsPanel.render();
}

function renderTimer() {
  const timeText = formatTime(timer.getRemainingMs());
  const phaseName = timer.phase === Phase.FOCUS ? 'Focus' : 'Break';

  setText(els.time, timeText);
  setText(els.phaseLabel, phaseName);
  setText(els.hudTime, timeText);
  setText(els.hudPhase, phaseName);
  setText(els.startBtn, START_LABELS[timer.status]);
  setText(els.statusText, STATUS_MESSAGES[timer.phase][timer.status]);
  els.skipBtn.title = timer.phase === Phase.FOCUS ? 'Skip to the break (skipped sessions earn nothing)' : 'Skip the break';
  els.progressFill.style.transform = `scaleX(${timer.getProgress()})`;

  // data-* attributes let CSS react to the phase, e.g. the mint accent during breaks.
  document.body.dataset.phase = timer.phase;
  document.body.dataset.status = timer.status;

  // The tab title shows the countdown, so you can check it from another tab.
  const title = timer.status === Status.IDLE ? APP_TITLE : `${timeText} ${phaseName} · ${APP_TITLE}`;
  if (document.title !== title) document.title = title;
}

function renderStats() {
  setText(els.sessionCount, String(state.completedFocusSessions));
  const { level, sessionsToNext } = getLevelProgress(state.completedFocusSessions);
  const levelText = `Level ${level}: ${plural(sessionsToNext, 'more focus session')} to level ${level + 1}`;
  setText(els.levelCount, String(level));
  els.levelStat.title = levelText;
  setText(
    els.progressSummary,
    `${levelText}. ${plural(state.completedFocusSessions, 'focus session')} finished, ` +
      `${plural(state.coins, 'coin')} to spend.`,
  );
  const coinText = String(state.coins);
  if (els.coinCount.textContent !== coinText) {
    els.coinCount.textContent = coinText;
    els.coinStat.classList.add('bump');
  }
}

function renderMute() {
  setText(els.muteBtn, state.muted ? 'Sound: off' : 'Sound: on');
}

function renderFocusView() {
  for (const radio of els.focusViewList.querySelectorAll('input')) radio.checked = radio.value === state.focusView;
}

/** Keeps the canvas's screen-reader description in sync with what's in the room. */
function renderRoomDescription() {
  const shown = Object.values(state.placements).map((itemId) => getItem(itemId).name);
  const label = shown.length ? `${ROOM_DESCRIPTION}. Decorations: ${shown.join(', ')}.` : `${ROOM_DESCRIPTION}.`;
  els.roomCanvas.setAttribute('aria-label', label);
}

function renderSaveStatus() {
  els.saveStatus.classList.toggle('is-warning', !saveWorking);
  setText(
    els.saveStatus,
    saveWorking
      ? `Progress saves automatically in this browser${DEV_MODE ? ' (dev mode uses its own separate save)' : ''}.`
      : "Saving isn't working in this browser (storage may be blocked or full), so progress will be lost when you close the page.",
  );
}

/** Only touches the DOM when the text really changes. */
function setText(el, text) {
  if (el.textContent !== text) el.textContent = text;
}

/** 1 500 000 ms → "25:00". Rounds up, so 00:00 only appears when time is really up. */
function formatTime(ms) {
  const totalSeconds = Math.ceil(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

/** 300 000 ms → "5-minute", 5 000 ms → "5-second" (dev mode). */
function describeDuration(ms) {
  return ms >= 60_000 ? `${Math.round(ms / 60_000)}-minute` : `${Math.round(ms / 1000)}-second`;
}

/** plural(1, 'coin') → "1 coin", plural(3, 'coin') → "3 coins" */
function plural(count, word) {
  return `${count} ${word}${count === 1 ? '' : 's'}`;
}

let toastTimeoutId = null;

function showToast(message) {
  els.toast.textContent = message;
  els.toast.classList.add('is-visible');
  clearTimeout(toastTimeoutId);
  toastTimeoutId = setTimeout(() => els.toast.classList.remove('is-visible'), 5000);
}

// ---- Sound toggle -----------------------------------------------------------

function toggleMute() {
  state.muted = !state.muted;
  setMuted(state.muted);
  commit();
  if (!state.muted) {
    unlockAudio();
    playChime(); // a quick preview, so you know how loud it is
  }
}

// ---- Focus view: close-up or whole room ---------------------------------------

function setFocusView(view) {
  if (!FOCUS_VIEWS.includes(view) || view === state.focusView) return;
  state.focusView = view;
  commit();
}

/** The V key flips between the two, and says which one is on. */
function toggleFocusView() {
  setFocusView(state.focusView === 'closeup' ? 'room' : 'closeup');
  showToast(state.focusView === 'closeup' ? 'During focus: close-up with your study buddy.' : 'During focus: the whole room.');
}

// ---- Dock and pop-up window -------------------------------------------------

/** Shows the window with the panel that belongs to a dock icon (e.g. 'shop'). */
function openWindow(name) {
  openWindowName = name;
  const panel = els.panels.find((p) => p.dataset.window === name);
  for (const p of els.panels) p.hidden = p !== panel;
  els.windowTitle.textContent = panel.dataset.title;
  els.window.hidden = false;
  for (const button of els.dockButtons) {
    button.setAttribute('aria-expanded', String(button.dataset.window === name));
  }
  if (name === 'pets') petsPanel.render();
  // Move keyboard focus into the window, so Tab goes through its controls next.
  els.window.focus();
}

function closeWindow() {
  if (!openWindowName) return;
  const button = els.dockButtons.find((b) => b.dataset.window === openWindowName);
  openWindowName = null;
  els.window.hidden = true;
  for (const b of els.dockButtons) b.setAttribute('aria-expanded', 'false');
  // If the window had keyboard focus, hand it back to the icon that opened it.
  if (els.window.contains(document.activeElement) || document.activeElement === document.body) button?.focus();
}

function toggleWindow(name) {
  if (openWindowName === name) closeWindow();
  else openWindow(name);
}

function setupDock() {
  for (const button of els.dockButtons) {
    button.querySelector('.dock-icon').append(createIcon(button.dataset.window));
    button.addEventListener('click', () => toggleWindow(button.dataset.window));
  }
  els.hudTimer.addEventListener('click', () => toggleWindow('timer'));
  els.windowClose.addEventListener('click', closeWindow);
  // Clicking (or tapping) the room itself closes the window, to get it out of the way.
  els.stage.addEventListener('pointerdown', closeWindow);

  // Full screen hides the browser's own bars. Not every browser allows it
  // (e.g. iPhone Safari), so the button only appears where it works.
  els.fullscreenBtn.querySelector('.dock-icon').append(createIcon('fullscreen'));
  els.fullscreenBtn.hidden = !document.fullscreenEnabled;
  els.fullscreenBtn.addEventListener('click', () => {
    if (document.fullscreenElement) document.exitFullscreen();
    else document.documentElement.requestFullscreen().catch(() => showToast('Full screen is not available here.'));
  });
  document.addEventListener('fullscreenchange', () => {
    els.fullscreenBtn.setAttribute('aria-pressed', String(Boolean(document.fullscreenElement)));
  });
}

// ---- Keyboard shortcuts and page lifecycle ----------------------------------

function setupGlobalListeners() {
  document.addEventListener('keydown', (event) => {
    // Escape closes the pop-up window (the reset dialog handles Escape itself).
    if (event.key === 'Escape' && openWindowName && !els.resetDialog.open) {
      closeWindow();
      return;
    }
    if (event.repeat || event.ctrlKey || event.metaKey || event.altKey) return;
    const target = event.target instanceof Element ? event.target : document.body;
    if (event.code === 'KeyV' && !target.closest('input[type="text"], textarea, select, dialog')) {
      toggleFocusView();
      return;
    }
    if (event.code !== 'Space') return;
    // If a button or radio has focus, Space already activates it: don't toggle twice.
    if (target.closest('button, input, textarea, select, a, label, dialog')) return;
    event.preventDefault(); // otherwise Space scrolls the page
    toggleTimer();
  });

  // When you come back to the tab, refresh immediately instead of waiting for
  // the next tick. When you leave it (or close it), save the pets' latest needs.
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) savePetsQuietly();
    else tick();
  });
  window.addEventListener('pagehide', savePetsQuietly);

  // Coins and items are saved, but a session in progress isn't: warn before a refresh loses it.
  window.addEventListener('beforeunload', (event) => {
    if (timer.phase === Phase.FOCUS && timer.status !== Status.IDLE) event.preventDefault();
  });

  // With the game open in two tabs, each would save its own copy and could
  // overwrite the other's progress. The 'storage' event fires in the *other*
  // tabs whenever one tab saves, so they reload the latest save and stay in sync.
  window.addEventListener('storage', (event) => {
    if (event.key !== SAVE_KEY) return;
    const latest = loadGame();
    if (latest.status !== 'loaded') return;
    Object.assign(state, latest.state);
    setMuted(state.muted);
    renderAll();
  });
}

// ---- Start-up ---------------------------------------------------------------

function init() {
  setMuted(state.muted);
  els.devBadge.hidden = !DEV_MODE;
  els.collectionHint.textContent = `Each finished focus session earns ${REWARDS.coinsPerFocusSession} coins. Everything you buy goes straight into your room.`;

  els.startBtn.addEventListener('click', toggleTimer);
  els.resetBtn.addEventListener('click', resetTimer);
  els.skipBtn.addEventListener('click', skipPhase);
  els.muteBtn.addEventListener('click', toggleMute);
  els.focusViewList.addEventListener('change', (event) => setFocusView(event.target.value));
  els.resetProgressBtn.addEventListener('click', openResetDialog);
  els.resetDialog.addEventListener('close', handleResetDialogClose);
  els.coinStat.addEventListener('animationend', () => els.coinStat.classList.remove('bump'));

  setupDock();
  setupGlobalListeners();
  collection = createCollectionUI({ els: els.shop, getState: () => state, onBuy: buyItem });
  roomPanel = createRoomPanel({
    els: els.roomPanel,
    getState: () => state,
    onThemeChange: changeTheme,
    onStyleChange: changeStyle,
    onDisplayChange: changeItemDisplay,
    onMove: moveItem,
    onDisplayAll: changeAllDisplays,
  });
  petsPanel = createPetsPanel({
    els: els.pets,
    getState: () => state,
    onFeed: (petId) => careForPet(petId, feedPet, { heart: true }),
    onPlay: (petId) => careForPet(petId, playWithPet, { heart: true }),
    onTuckIn: (petId) => careForPet(petId, tuckIn),
    onWakeUp: (petId) => careForPet(petId, wakeUp),
  });

  els.coinCount.textContent = String(state.coins); // set first, so a loaded balance doesn't "bump"
  renderTimer();
  renderAll();

  setInterval(tick, UI_TICK_MS);
  setInterval(savePetsQuietly, PET_SAVE_INTERVAL_MS);
  showLoadNotice();
  // The room starts once any hand-drawn art (art/ folder) has loaded; until
  // then the canvas stays blank, which is only a moment.
  loadArt().then((art) => {
    room = startRoom(els.roomCanvas, { getState: () => state, isFocusing, getScene, art });
  });
}

init();
