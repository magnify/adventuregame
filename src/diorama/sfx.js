const base = import.meta.env.BASE_URL;
const NAMES = ['step', 'pop', 'pick', 'locked', 'unlock', 'creak', 'slam', 'whoosh', 'chime', 'chirp'];
let ctx = null; const buffers = {};

/** The game's own sound effects, played through Web Audio. Silent until the first tap unlocks audio; never throws. */
export const sfx = {
  unlock() {
    if (ctx) { ctx.resume?.(); return; }
    try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch { return; }
    for (const n of NAMES) fetch(`${base}sfx/${n}.wav?v=${__BUILD__}`).then(r => r.arrayBuffer()).then(b => ctx.decodeAudioData(b)).then(a => { buffers[n] = a; }).catch(() => {});
  },
  play(name, { volume = 0.6, rate = 1 } = {}) {
    try {
      const b = buffers[name]; if (!ctx || !b) return;
      const s = ctx.createBufferSource(), g = ctx.createGain(); s.buffer = b; s.playbackRate.value = rate; g.gain.value = volume;
      s.connect(g).connect(ctx.destination); s.start();
    } catch {}
  },
};
