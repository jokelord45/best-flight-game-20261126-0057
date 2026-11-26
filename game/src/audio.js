// All sound is synthesised with WebAudio: no audio files, no network. An engine hum whose
// pitch follows the throttle, a chime for a ring, a thud for a delivered parcel, a klaxon for
// low fuel and a crunch for a crash. Created lazily on the first user gesture, so browsers
// that block audio before interaction stay silent until then.
export function createAudio() {
  let context = null;
  let engineOsc = null;
  let engineGain = null;
  let muted = false;

  function ensure() {
    if (context) return true;
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return false;
      context = new AudioContext();
      engineOsc = context.createOscillator();
      engineOsc.type = 'sawtooth';
      engineOsc.frequency.value = 55;
      const filter = context.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 320;
      engineGain = context.createGain();
      engineGain.gain.value = 0;
      engineOsc.connect(filter);
      filter.connect(engineGain);
      engineGain.connect(context.destination);
      engineOsc.start();
      return true;
    } catch {
      return false;
    }
  }

  function blip(frequency, duration, type, volume, when = 0) {
    if (!context || muted) return;
    const start = context.currentTime + when;
    const osc = context.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(frequency, start);
    const gain = context.createGain();
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(volume, start + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    osc.connect(gain);
    gain.connect(context.destination);
    osc.start(start);
    osc.stop(start + duration + 0.05);
  }

  return {
    /** Call from a user gesture so the browser lets audio start. */
    unlock() {
      if (ensure() && context.state === 'suspended') context.resume();
    },
    /** Engine hum follows the throttle, 0..1; 0 silences it. */
    engine(throttle, flying) {
      if (!ensure() || muted) return;
      const target = flying ? 0.05 + throttle * 0.05 : 0;
      engineGain.gain.setTargetAtTime(target, context.currentTime, 0.1);
      engineOsc.frequency.setTargetAtTime(48 + throttle * 55, context.currentTime, 0.1);
    },
    ring() {
      blip(880, 0.28, 'sine', 0.16);
      blip(1318, 0.36, 'sine', 0.12, 0.07);
    },
    drop() {
      blip(220, 0.16, 'triangle', 0.18);
      blip(110, 0.3, 'triangle', 0.14, 0.12);
    },
    warn() {
      blip(620, 0.12, 'square', 0.08);
      blip(620, 0.12, 'square', 0.08, 0.18);
    },
    crash() {
      blip(90, 0.5, 'sawtooth', 0.22);
      blip(55, 0.7, 'sawtooth', 0.18, 0.08);
    },
    land() {
      blip(523, 0.2, 'sine', 0.14);
      blip(659, 0.2, 'sine', 0.14, 0.12);
      blip(784, 0.4, 'sine', 0.14, 0.24);
    },
    toggleMute() {
      muted = !muted;
      if (engineGain && context) engineGain.gain.setTargetAtTime(0, context.currentTime, 0.05);
      return muted;
    },
    isMuted() {
      return muted;
    },
  };
}
