// Tamagotchi-style pet needs. No DOM code, so it is unit-tested in
// tests/pets.test.js.
//
// The big idea is the same as the timer's: instead of lowering hunger by a
// bit every second (which breaks when the tab is asleep or the game is
// closed), we store the needs together with the time they were last
// updated (state.petsUpdatedAt). Whenever we look again, we work out how
// much time has passed and apply it all at once. That's also how pets get
// hungry while the game is closed.

import { PET_CONFIG as P } from './config.js';
import { ITEMS } from './items.js';
import { isOwned } from './economy.js';
import { isPetCareUnlocked } from './levels.js';

export const NEEDS = Object.freeze(['food', 'love', 'energy']);

const HOUR = 3_600_000;

/** A pet that has just moved in: comfortable, but happy to be fed and fussed over. */
export function createPet() {
  return { food: 70, love: 50, energy: 80, asleep: false };
}

/** Ids of the pets the player can care for right now (owned, and pet care unlocked). */
export function careablePetIds(state) {
  if (!isPetCareUnlocked(state)) return [];
  return ITEMS.filter((item) => item.pet && isOwned(state, item.id)).map((item) => item.id);
}

/**
 * Makes state.pets match careablePetIds: new pets get needs, and needs for
 * pets that are gone (e.g. after a reset) are removed. Safe to call often.
 */
export function syncPets(state, now) {
  const ids = careablePetIds(state);
  for (const id of ids) state.pets[id] ??= createPet();
  for (const id of Object.keys(state.pets)) {
    if (!ids.includes(id)) delete state.pets[id];
  }
  state.petsUpdatedAt ??= now;
}

/**
 * Brings every pet's needs up to `now`.
 * @param {object} [options]
 * @param {boolean} [options.calm]  true while a focus session runs: pets keep
 *   you company quietly, and their needs drop at half speed.
 */
export function advancePets(state, now, { calm = false } = {}) {
  const last = state.petsUpdatedAt ?? now;
  // Math.max: if the system clock jumps backwards, no time has passed.
  const hours = (Math.max(0, now - last) * P.timeScale) / HOUR;
  state.petsUpdatedAt = now;
  for (const pet of Object.values(state.pets)) applyTime(pet, hours, calm);
}

/**
 * Needs change at steady rates, so a whole stretch of time can be applied
 * in one go. The only thing that can change halfway is a sleeping pet
 * waking up, so the time is split at exactly that moment.
 */
function applyTime(pet, hours, calm) {
  if (pet.asleep) {
    const hoursToRested = (100 - pet.energy) / P.sleepRecoveryPerHour;
    const asleepHours = Math.min(hours, hoursToRested);
    lowerFoodAndLove(pet, asleepHours, 0.5);
    pet.energy = Math.min(100, pet.energy + P.sleepRecoveryPerHour * asleepHours);
    if (hoursToRested > hours) return; // still asleep at the end

    pet.energy = 100;
    pet.asleep = false; // fully rested: wakes up by itself...
    hours -= asleepHours; // ...and is awake for the rest of the time
  }
  const speed = calm ? 0.5 : 1;
  lowerFoodAndLove(pet, hours, speed);
  pet.energy = decay(pet.energy, P.decayPerHour.energy * speed * hours);
}

function lowerFoodAndLove(pet, hours, speed) {
  pet.food = decay(pet.food, P.decayPerHour.food * speed * hours);
  pet.love = decay(pet.love, P.decayPerHour.love * speed * hours);
}

/** Lowers a need, but never below the floor (and never raises one that is already under it). */
function decay(value, amount) {
  return value <= P.floor ? value : Math.max(P.floor, value - amount);
}

// ---- Actions ----------------------------------------------------------------
// Each returns { ok: true } or { ok: false, reason }, like purchaseItem().

export function feedPet(state, petId) {
  const pet = state.pets[petId];
  if (!pet) return { ok: false, reason: 'no-pet' };
  if (pet.asleep) return { ok: false, reason: 'asleep' };
  if (pet.food >= P.feed.fullAt) return { ok: false, reason: 'not-hungry' };
  if (state.coins < P.feed.cost) return { ok: false, reason: 'not-enough-coins' };

  state.coins -= P.feed.cost;
  pet.food = Math.min(100, pet.food + P.feed.food);
  pet.love = Math.min(100, pet.love + P.feed.love);
  return { ok: true };
}

export function playWithPet(state, petId) {
  const pet = state.pets[petId];
  if (!pet) return { ok: false, reason: 'no-pet' };
  if (pet.asleep) return { ok: false, reason: 'asleep' };
  if (pet.energy < P.play.minEnergy) return { ok: false, reason: 'too-sleepy' };

  pet.love = Math.min(100, pet.love + P.play.love);
  pet.energy = Math.max(0, pet.energy + P.play.energy); // playing is tiring
  return { ok: true };
}

export function tuckIn(state, petId) {
  const pet = state.pets[petId];
  if (!pet) return { ok: false, reason: 'no-pet' };
  if (pet.asleep) return { ok: false, reason: 'asleep' };
  if (pet.energy >= P.tuckInBelow) return { ok: false, reason: 'not-sleepy' };
  pet.asleep = true;
  return { ok: true };
}

export function wakeUp(state, petId) {
  const pet = state.pets[petId];
  if (!pet || !pet.asleep) return { ok: false, reason: 'not-asleep' };
  pet.asleep = false;
  return { ok: true };
}

// ---- Moods ------------------------------------------------------------------

/** The need with the lowest value, e.g. 'food'. */
export function lowestNeed(pet) {
  return NEEDS.reduce((lowest, need) => (pet[need] < pet[lowest] ? need : lowest));
}

export function isPetHappy(pet) {
  return NEEDS.every((need) => pet[need] >= P.happyAt);
}

/** True when there is at least one pet and every one of them is happy. */
export function allPetsHappy(state) {
  const pets = Object.values(state.pets);
  return pets.length > 0 && pets.every(isPetHappy);
}

/** The need a pet would like help with, or null if it's fine (or asleep). */
export function needingAttention(pet) {
  if (pet.asleep) return null;
  const need = lowestNeed(pet);
  return pet[need] < P.lowAt ? need : null;
}
