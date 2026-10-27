/**
 * PomodoroTimer: pure timer logic. It never touches the DOM, which means it
 * can be unit-tested in Node (see tests/timer.test.js).
 *
 * Key idea: we never count down by subtracting 1 every second. Browsers
 * throttle setInterval/setTimeout in background tabs (sometimes to once per
 * minute), so a tick-counting timer silently drifts. Instead we remember the
 * exact moment the phase should end (#endsAt) and compute
 *
 *     remaining = endsAt - now
 *
 * whenever someone asks. However late a tick arrives, the answer is correct.
 */

export const Phase = Object.freeze({
  FOCUS: 'focus',
  BREAK: 'break',
});

export const Status = Object.freeze({
  IDLE: 'idle', // waiting to start, full duration remaining
  RUNNING: 'running',
  PAUSED: 'paused',
});

export class PomodoroTimer {
  // Fields starting with # are private: code outside this class cannot read
  // or change them, so nothing can "cheat" by setting the remaining time.
  #durations;
  #now;
  #onComplete;

  #phase = Phase.FOCUS;
  #status = Status.IDLE;
  #remainingMs; // source of truth while IDLE or PAUSED
  #endsAt = null; // source of truth while RUNNING (a timestamp in ms)

  /**
   * @param {object} options
   * @param {number} options.focusMs  Length of a focus session in milliseconds.
   * @param {number} options.breakMs  Length of a break in milliseconds.
   * @param {(event: {phase: string}) => void} [options.onComplete]
   *   Called exactly once when a phase runs all the way to zero.
   * @param {() => number} [options.now]
   *   Clock function. Defaults to Date.now; tests pass a fake clock instead.
   */
  constructor({ focusMs, breakMs, onComplete = () => {}, now = Date.now }) {
    this.#durations = { [Phase.FOCUS]: focusMs, [Phase.BREAK]: breakMs };
    this.#onComplete = onComplete;
    this.#now = now;
    this.#remainingMs = focusMs;
  }

  get phase() {
    return this.#phase;
  }

  get status() {
    return this.#status;
  }

  /** Full length of the current phase. */
  get durationMs() {
    return this.#durations[this.#phase];
  }

  getRemainingMs() {
    if (this.#status !== Status.RUNNING) return this.#remainingMs;
    const remaining = this.#endsAt - this.#now();
    // Clamp: never negative, and never longer than the phase itself
    // (that could happen if the system clock is moved backwards).
    return Math.min(this.durationMs, Math.max(0, remaining));
  }

  /** How much of the phase is done, from 0 to 1. Handy for progress bars. */
  getProgress() {
    return 1 - this.getRemainingMs() / this.durationMs;
  }

  /** Starts an idle phase or resumes a paused one. */
  start() {
    if (this.#status === Status.RUNNING) return;
    this.#endsAt = this.#now() + this.#remainingMs;
    this.#status = Status.RUNNING;
  }

  pause() {
    if (this.#status !== Status.RUNNING) return;
    // Freeze the remaining time so the clock stops "moving" while paused.
    this.#remainingMs = this.getRemainingMs();
    this.#endsAt = null;
    this.#status = Status.PAUSED;
  }

  /** Back to the start of the current phase. Never counts as a completion. */
  reset() {
    this.#enterPhase(this.#phase);
  }

  /** Jumps to the next phase without finishing this one. Never counts as a completion. */
  skip() {
    this.#enterPhase(nextPhase(this.#phase));
  }

  /**
   * Checks whether the running phase has reached zero. Call it as often as
   * you like (from an interval, a timeout, when the tab becomes visible):
   * extra calls are harmless, and completion can only fire once because the
   * timer leaves the RUNNING state before notifying anyone.
   */
  update() {
    if (this.#status !== Status.RUNNING || this.getRemainingMs() > 0) return;
    const finished = this.#phase;
    this.#enterPhase(nextPhase(finished));
    this.#onComplete({ phase: finished });
  }

  #enterPhase(phase) {
    this.#phase = phase;
    this.#status = Status.IDLE;
    this.#remainingMs = this.#durations[phase];
    this.#endsAt = null;
  }
}

function nextPhase(phase) {
  return phase === Phase.FOCUS ? Phase.BREAK : Phase.FOCUS;
}
