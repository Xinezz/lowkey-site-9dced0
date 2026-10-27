// Levels come from finished focus sessions. Each level takes one more
// session than the one before: level 2 after 1 session, level 3 after 3,
// level 4 after 6, level 5 after 10, and so on.
//
// The level is never stored. It's always worked out from
// completedFocusSessions, so the two can't disagree.

import { UNLOCKS } from './config.js';

/** Total finished sessions needed to reach `level`: 0, 1, 3, 6, 10, 15… */
export function sessionsForLevel(level) {
  return (level * (level - 1)) / 2;
}

export function getLevel(sessions) {
  let level = 1;
  while (sessionsForLevel(level + 1) <= sessions) level += 1;
  return level;
}

/** Everything a progress bar needs: e.g. { level: 2, done: 1, needed: 2, sessionsToNext: 1 }. */
export function getLevelProgress(sessions) {
  const level = getLevel(sessions);
  const start = sessionsForLevel(level);
  const next = sessionsForLevel(level + 1);
  return { level, done: sessions - start, needed: next - start, sessionsToNext: next - sessions };
}

export function isPetCareUnlocked(state) {
  return getLevel(state.completedFocusSessions) >= UNLOCKS.petCareLevel;
}

/** How many more sessions until pet care unlocks (0 once it has). */
export function sessionsUntilPetCare(state) {
  return Math.max(0, sessionsForLevel(UNLOCKS.petCareLevel) - state.completedFocusSessions);
}
