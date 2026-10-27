// A gentle chime made with the Web Audio API. Generating the sound in code
// means no audio files to license or download.

let audioCtx = null;
let muted = false;

/**
 * Browsers block audio until the user has interacted with the page (the
 * "autoplay policy"). Call this from a click handler, such as the Start
 * button, so the chime is allowed to play later even if the tab is hidden.
 */
export function unlockAudio() {
  if (!audioCtx) {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return; // very old browser: stay silent rather than crash
    audioCtx = new AudioCtx();
  }
  if (audioCtx.state === 'suspended') audioCtx.resume();
}

export function setMuted(value) {
  muted = value;
}

/** Three soft bell notes rising gently (an E major chord: E5, G#5, B5). */
export function playChime() {
  if (muted || !audioCtx) return;
  const start = audioCtx.currentTime + 0.05;
  [659.25, 830.61, 987.77].forEach((freq, i) => playBell(freq, start + i * 0.22));
}

function playBell(freq, at) {
  // A quiet overtone one octave up makes a plain sine wave sound more like a bell.
  for (const [multiplier, peak] of [[1, 0.16], [2, 0.03]]) {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'sine';
    osc.frequency.value = freq * multiplier;
    // Envelope: a fast but soft attack, then a long fade. Exponential ramps
    // can't reach exactly 0, hence 0.0001.
    gain.gain.setValueAtTime(0.0001, at);
    gain.gain.exponentialRampToValueAtTime(peak, at + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + 1.8);
    osc.connect(gain).connect(audioCtx.destination);
    osc.start(at);
    osc.stop(at + 1.9);
  }
}
