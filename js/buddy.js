// The study buddy: a character who studies at the desk while you focus and
// relaxes by the window during breaks. This file only decides where the
// buddy is and what they're doing; buddy-art.js draws them. No DOM code,
// so it's unit-tested in tests/buddy.test.js.
//
// The buddy is a tiny "state machine": they are always in exactly one mode,
//   'away'      outside the room (before your first focus session)
//   'walking'   on the way to a spot
//   'seated'    at the desk
//   'relaxing'  by the window
// and updateBuddy() moves them between modes based on what the timer is doing.

import { BUDDY_SPOTS } from './layout.js';

const WALK_SPEED = 80; // art pixels per second (the room is 640 wide)

export function createBuddy() {
  return {
    x: BUDDY_SPOTS.door.x,
    y: BUDDY_SPOTS.door.y,
    mode: 'away',
    facing: 1, // 1 = facing right, -1 = facing left
    entered: false, // becomes true the first time they come in to study
    walked: 0, // total distance walked, used to pick the walking animation frame
  };
}

/**
 * Moves the buddy towards where they want to be.
 * @param {object} buddy
 * @param {'desk' | 'relax'} goal  'desk' while a focus session is running or
 *   paused, 'relax' otherwise.
 * @param {number} seconds  Time since the last update. Infinity means
 *   "arrive straight away" (used for reduced motion).
 */
export function updateBuddy(buddy, goal, seconds) {
  if (goal === 'desk') buddy.entered = true;

  // Before the first focus session the buddy hasn't arrived yet: they stay outside.
  const spot = goal === 'desk' ? 'desk' : buddy.entered ? 'relax' : 'door';
  const target = BUDDY_SPOTS[spot];
  const dx = target.x - buddy.x;
  const dy = target.y - buddy.y;
  const distance = Math.hypot(dx, dy);
  const step = WALK_SPEED * seconds;

  if (distance <= step) {
    buddy.x = target.x;
    buddy.y = target.y;
    buddy.mode = { desk: 'seated', relax: 'relaxing', door: 'away' }[spot];
    return;
  }

  // Move `step` pixels along the straight line to the target.
  buddy.x += (dx / distance) * step;
  buddy.y += (dy / distance) * step;
  if (dx !== 0) buddy.facing = Math.sign(dx);
  buddy.walked += step;
  buddy.mode = 'walking';
}
