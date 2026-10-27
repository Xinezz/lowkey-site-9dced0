// What happens when a focus session is finished: coins, the happy-pet
// bonus, levels, and anything a new level unlocks. Keeping it in one
// function makes the core loop of the game easy to read and to test.

import { REWARDS } from './config.js';
import { ITEMS } from './items.js';
import { isOwned } from './economy.js';
import { displayItem } from './decorations.js';
import { getLevel } from './levels.js';
import { advancePets, allPetsHappy, syncPets } from './pets.js';

/**
 * Call only from the timer's onComplete for a focus phase, i.e. when a
 * session ran all the way to zero.
 * @returns {{ coins: number, bonus: number, newLevel: number | null, newItemIds: string[] }}
 */
export function finishFocusSession(state, now) {
  // Bring the pets up to date first, so the bonus uses their needs right now.
  advancePets(state, now, { calm: true });
  const bonus = allPetsHappy(state) ? REWARDS.happyPetBonus : 0;

  const levelBefore = getLevel(state.completedFocusSessions);
  state.completedFocusSessions += 1;
  const coins = REWARDS.coinsPerFocusSession + bonus;
  state.coins += coins;

  const level = getLevel(state.completedFocusSessions);
  const newItemIds = grantLevelRewards(state, now);
  return { coins, bonus, newLevel: level > levelBefore ? level : null, newItemIds };
}

/**
 * Hands out items earned by reaching a level (like the cat that arrives
 * with pet care) and sets up needs for every pet. Safe to call at any time:
 * it only gives what's missing. Returns the ids of newly given items.
 */
export function grantLevelRewards(state, now) {
  const level = getLevel(state.completedFocusSessions);
  const given = [];
  for (const item of ITEMS) {
    if (item.levelReward && level >= item.levelReward && !isOwned(state, item.id)) {
      state.ownedItemIds.push(item.id);
      displayItem(state, item.id); // straight into the room
      given.push(item.id);
    }
  }
  syncPets(state, now);
  return given;
}
