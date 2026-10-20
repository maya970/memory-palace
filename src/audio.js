let ctx;

function context() {
  if (!ctx) ctx = new AudioContext();
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

function tone(freq, dur, type, gainValue) {
  const audio = context();
  const osc = audio.createOscillator();
  const gain = audio.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(gainValue, audio.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.0008, audio.currentTime + dur);
  osc.connect(gain);
  gain.connect(audio.destination);
  osc.start();
  osc.stop(audio.currentTime + dur);
}

export const sfx = {
  unlock() {
    try { context(); } catch { /* autoplay gate */ }
  },
  place() {
    try { tone(540, 0.06, 'square', 0.03); } catch { /* ignore */ }
  },
  break() {
    try {
      tone(180, 0.08, 'triangle', 0.04);
      tone(90, 0.1, 'square', 0.02);
    } catch { /* ignore */ }
  },
  open() {
    try { tone(660, 0.07, 'sine', 0.03); } catch { /* ignore */ }
  },
};
