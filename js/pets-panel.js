// The Pets window. Before pet care unlocks it shows what's coming and how many
// sessions are left; afterwards, one card per pet with need meters and
// buttons. Like the other panels, the cards are built once and render()
// only updates them.

import { PET_CONFIG as P, REWARDS, UNLOCKS } from './config.js';
import { ITEMS } from './items.js';
import { NEEDS, isPetHappy, lowestNeed } from './pets.js';
import { isPetCareUnlocked, sessionsForLevel } from './levels.js';
import { createSpriteThumbnail } from './pixel.js';

const NEED_LABELS = { food: 'Hunger', love: 'Love', energy: 'Sleep' };

// Words for each need, from best to worst (see needWord below).
const NEED_WORDS = {
  food: ['Full', 'Satisfied', 'Peckish', 'Hungry'],
  love: ['Adoring', 'Content', 'Wants a cuddle', 'Lonely'],
  energy: ['Rested', 'Awake', 'Drowsy', 'Sleepy'],
};

const NOTES = {
  'not-hungry': 'Not hungry right now.',
  'not-enough-coins': `A snack costs ${P.feed.cost} coins. Finish a focus session to earn more.`,
  asleep: 'Shh, sleeping. Wake them up first.',
  'too-sleepy': 'Too sleepy to play. Maybe tuck them in?',
  'not-sleepy': 'Not sleepy yet.',
};

export function needWord(need, value) {
  const [great, fine, low, bad] = NEED_WORDS[need];
  if (value >= 70) return great;
  if (value >= P.happyAt) return fine;
  if (value >= P.lowAt) return low;
  return bad;
}

function moodText(pet) {
  if (pet.asleep) return 'Asleep';
  if (NEEDS.every((need) => pet[need] >= 70)) return 'Very happy';
  if (isPetHappy(pet)) return 'Happy';
  const need = lowestNeed(pet);
  return needWord(need, pet[need]);
}

/**
 * @param {object} options
 * @param {object} options.els  { tabLock, locked, lockedText, unlockFill, unlockCount, unlocked, bonus, list }
 * @param {() => object} options.getState
 * @param {(petId: string) => {ok: boolean, reason?: string}} options.onFeed
 * @param {(petId: string) => {ok: boolean, reason?: string}} options.onPlay
 * @param {(petId: string) => {ok: boolean, reason?: string}} options.onTuckIn
 * @param {(petId: string) => {ok: boolean, reason?: string}} options.onWakeUp
 */
export function createPetsPanel({ els, getState, onFeed, onPlay, onTuckIn, onWakeUp }) {
  const cards = new Map(); // petId → parts of its card
  const unlockSessions = sessionsForLevel(UNLOCKS.petCareLevel);

  for (const item of ITEMS.filter((i) => i.pet)) buildCard(item);

  function buildCard(item) {
    const card = document.createElement('li');
    card.className = 'pet-card';

    const head = document.createElement('div');
    head.className = 'pet-head';
    const thumb = document.createElement('div');
    thumb.className = 'pet-thumb';
    const awakeThumb = createSpriteThumbnail(item.pet.awake, 60, 44);
    const asleepThumb = createSpriteThumbnail(item.pet.asleep, 60, 44);
    thumb.append(awakeThumb, asleepThumb);
    const titles = document.createElement('div');
    const name = document.createElement('span');
    name.className = 'pet-name';
    name.textContent = item.name;
    const mood = document.createElement('span');
    mood.className = 'pet-mood';
    titles.append(name, mood);
    head.append(thumb, titles);

    const meters = {};
    const needs = document.createElement('div');
    for (const need of NEEDS) {
      const row = document.createElement('div');
      row.className = 'need-row';
      const label = document.createElement('span');
      label.className = 'need-label';
      label.textContent = NEED_LABELS[need];
      const meter = document.createElement('div');
      meter.className = 'meter';
      meter.setAttribute('role', 'meter');
      meter.setAttribute('aria-label', `${item.name} ${NEED_LABELS[need].toLowerCase()}`);
      meter.setAttribute('aria-valuemin', '0');
      meter.setAttribute('aria-valuemax', '100');
      const fill = document.createElement('div');
      fill.className = 'meter-fill';
      meter.append(fill);
      const word = document.createElement('span');
      word.className = 'need-word';
      row.append(label, meter, word);
      needs.append(row);
      meters[need] = { meter, fill, word };
    }

    const actions = document.createElement('div');
    actions.className = 'pet-actions';
    const feedButton = makeButton('Feed');
    const coin = document.createElement('span');
    coin.className = 'coin-icon';
    coin.setAttribute('aria-hidden', 'true');
    feedButton.append(coin, String(P.feed.cost));
    feedButton.setAttribute('aria-label', `Feed ${item.name} (${P.feed.cost} coins)`);
    const playButton = makeButton(item.pet.playLabel);
    const sleepButton = makeButton('Tuck in');
    actions.append(feedButton, playButton, sleepButton);

    const note = document.createElement('p');
    note.className = 'pet-note';
    note.setAttribute('aria-live', 'polite');

    let noteTimeout = null;
    function showNote(text) {
      note.textContent = text;
      clearTimeout(noteTimeout);
      noteTimeout = setTimeout(() => (note.textContent = ''), 4000);
    }

    feedButton.addEventListener('click', () => {
      const result = onFeed(item.id);
      showNote(result.ok ? `${item.name} munches happily.` : NOTES[result.reason]);
    });
    playButton.addEventListener('click', () => {
      const result = onPlay(item.id);
      showNote(result.ok ? item.pet.playReaction : NOTES[result.reason]);
    });
    sleepButton.addEventListener('click', () => {
      const asleep = getState().pets[item.id]?.asleep;
      const result = asleep ? onWakeUp(item.id) : onTuckIn(item.id);
      if (result.ok) showNote(asleep ? 'Wakes up and stretches.' : 'Snuggles in for a nap.');
      else showNote(NOTES[result.reason]);
    });

    card.append(head, needs, actions, note);
    els.list.append(card);
    cards.set(item.id, { card, awakeThumb, asleepThumb, mood, meters, feedButton, playButton, sleepButton });
  }

  function render() {
    const state = getState();
    const unlocked = isPetCareUnlocked(state);
    els.tabLock.hidden = unlocked;
    els.locked.hidden = unlocked;
    els.unlocked.hidden = !unlocked;

    if (!unlocked) {
      const done = Math.min(state.completedFocusSessions, unlockSessions);
      const left = unlockSessions - done;
      els.unlockFill.style.transform = `scaleX(${done / unlockSessions})`;
      els.unlockCount.textContent = `${done} / ${unlockSessions} focus sessions`;
      els.lockedText.textContent = `Reach level ${UNLOCKS.petCareLevel} to unlock pet care: ${left} more focus session${left === 1 ? '' : 's'} to go.`;
      return;
    }

    const pets = Object.values(state.pets);
    const happy = pets.length > 0 && pets.every(isPetHappy);
    els.bonus.classList.toggle('is-happy', happy);
    els.bonus.textContent = happy
      ? `All your pets are happy: +${REWARDS.happyPetBonus} bonus coins after each focus session.`
      : `Keep every need above half to earn +${REWARDS.happyPetBonus} bonus coins after each focus session.`;

    for (const [id, parts] of cards) {
      const pet = state.pets[id];
      parts.card.hidden = !pet;
      if (!pet) continue;

      parts.awakeThumb.hidden = pet.asleep;
      parts.asleepThumb.hidden = !pet.asleep;
      parts.mood.textContent = moodText(pet);
      for (const need of NEEDS) {
        // Round down: thresholds are whole numbers, so 49.9 must read as 49 ("below half"), not 50.
        const value = Math.floor(pet[need]);
        const { meter, fill, word } = parts.meters[need];
        fill.style.width = `${value}%`;
        fill.dataset.level = value >= P.happyAt ? 'good' : value >= P.lowAt ? 'ok' : 'low';
        meter.setAttribute('aria-valuenow', String(value));
        word.textContent = needWord(need, value);
      }
      parts.feedButton.disabled = pet.asleep || state.coins < P.feed.cost;
      parts.playButton.disabled = pet.asleep;
      parts.sleepButton.textContent = pet.asleep ? 'Wake up' : 'Tuck in';
    }
  }

  return { render };
}

function makeButton(label) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'btn btn-small';
  button.textContent = label;
  return button;
}
