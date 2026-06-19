// Web Audio API ile sentezlenmiş ses efektleri — harici dosya gerektirmez.
const Sound = (() => {
  let ctx = null;
  let enabled = true;

  function ensure() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (AC) ctx = new AC();
    }
    if (ctx && ctx.state === "suspended") ctx.resume();
    return ctx;
  }

  // Tek bir ton çal
  function tone(freq, duration, type = "sine", gain = 0.2, delay = 0) {
    if (!enabled) return;
    const c = ensure();
    if (!c) return;
    const t0 = c.currentTime + delay;
    const osc = c.createOscillator();
    const g = c.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(gain, t0 + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
    osc.connect(g).connect(c.destination);
    osc.start(t0);
    osc.stop(t0 + duration + 0.02);
  }

  // Kısa gürültü patlaması (kart/çip için)
  function noise(duration, gain = 0.15, delay = 0) {
    if (!enabled) return;
    const c = ensure();
    if (!c) return;
    const t0 = c.currentTime + delay;
    const frames = Math.floor(c.sampleRate * duration);
    const buffer = c.createBuffer(1, frames, c.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < frames; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / frames);
    }
    const src = c.createBufferSource();
    src.buffer = buffer;
    const g = c.createGain();
    g.gain.setValueAtTime(gain, t0);
    const filter = c.createBiquadFilter();
    filter.type = "highpass";
    filter.frequency.value = 1000;
    src.connect(filter).connect(g).connect(c.destination);
    src.start(t0);
  }

  return {
    toggle() {
      enabled = !enabled;
      if (enabled) ensure();
      return enabled;
    },
    isEnabled() {
      return enabled;
    },
    deal() {
      noise(0.12, 0.12);
    },
    chip() {
      tone(880, 0.06, "square", 0.12);
      tone(1320, 0.05, "square", 0.08, 0.04);
    },
    win() {
      tone(523, 0.12, "triangle", 0.2, 0);
      tone(659, 0.12, "triangle", 0.2, 0.12);
      tone(784, 0.18, "triangle", 0.22, 0.24);
    },
    bigwin() {
      tone(523, 0.1, "triangle", 0.2, 0);
      tone(659, 0.1, "triangle", 0.2, 0.1);
      tone(784, 0.1, "triangle", 0.2, 0.2);
      tone(1047, 0.25, "triangle", 0.25, 0.3);
    },
    lose() {
      tone(330, 0.18, "sawtooth", 0.15, 0);
      tone(247, 0.28, "sawtooth", 0.15, 0.16);
    },
    push() {
      tone(440, 0.18, "sine", 0.15);
    },
  };
})();
