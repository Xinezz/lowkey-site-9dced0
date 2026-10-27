// Saving and loading progress with localStorage.
//
// localStorage only stores strings, so the state goes through JSON. The save
// is wrapped in an "envelope" with a version number: if the save format ever
// changes, the version tells a future loader which conversion to apply.
//
// Every function takes the storage object as a parameter (defaulting to the
// real localStorage). Tests pass in a fake one, just like the timer's fake clock.

import { DEV_MODE } from './config.js';
import { createInitialState, sanitizeState } from './state.js';

// Dev mode (?dev) earns coins much faster, so it gets its own save and never
// touches your real progress.
export const SAVE_KEY = DEV_MODE ? 'lofi-study-room:save:dev' : 'lofi-study-room:save';
export const BACKUP_KEY = `${SAVE_KEY}:unreadable`;
const SAVE_VERSION = 1;

/**
 * @returns {{ state: object, status: 'new' | 'loaded' | 'unreadable' | 'unavailable', problems: string[] }}
 *   new         no save yet (first visit)
 *   loaded      save found; `problems` lists anything that had to be repaired
 *   unreadable  save was damaged; a fresh state is returned and the damaged text is kept under BACKUP_KEY
 *   unavailable the browser blocks storage (e.g. strict privacy settings)
 */
export function loadGame(storage = getLocalStorage()) {
  const fresh = (status, problems = []) => ({ state: createInitialState(), status, problems });

  if (!storage) return fresh('unavailable');

  let text;
  try {
    text = storage.getItem(SAVE_KEY);
  } catch {
    return fresh('unavailable');
  }
  if (text === null) return fresh('new');

  let envelope;
  try {
    envelope = JSON.parse(text);
  } catch {
    keepBackup(storage, text);
    return fresh('unreadable', ['the save is not valid JSON']);
  }

  if (envelope?.version !== SAVE_VERSION) {
    keepBackup(storage, text);
    return fresh('unreadable', [`unsupported save version ${JSON.stringify(envelope?.version)}`]);
  }

  const { state, problems } = sanitizeState(envelope.state);
  return { state, status: 'loaded', problems };
}

/** Returns true if the save worked. It can fail when storage is full or blocked. */
export function saveGame(state, storage = getLocalStorage()) {
  if (!storage) return false;
  const envelope = { version: SAVE_VERSION, savedAt: new Date().toISOString(), state };
  try {
    storage.setItem(SAVE_KEY, JSON.stringify(envelope));
    return true;
  } catch (error) {
    console.warn('Could not save progress:', error);
    return false;
  }
}

/** Keeps a copy of a damaged save, so nothing is silently thrown away. */
function keepBackup(storage, text) {
  try {
    storage.setItem(BACKUP_KEY, text);
  } catch {
    // Nothing more we can do; the game still starts with a fresh state.
  }
}

/** Even reading the `localStorage` property can throw when a browser blocks site data. */
function getLocalStorage() {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}
