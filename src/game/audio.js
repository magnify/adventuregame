const NAMES = ['step', 'pop', 'pick', 'locked', 'unlock', 'creak', 'slam', 'whoosh', 'chime', 'chirp', 'flutter', 'squelch', 'grow', 'shimmer'];
const base = import.meta.env.BASE_URL;

export function preloadSfx(scene) { for (const n of NAMES) scene.load.audio(`sfx/${n}`, `${base}sfx/${n}.wav`); }

/** Thin wrapper so scenes can say sfx.play('pop') and never crash if audio is locked or missing. */
export function makeSfx(scene) {
  return {
    play(name, opts = {}) { try { if (scene.cache.audio.exists(`sfx/${name}`)) scene.sound.play(`sfx/${name}`, { volume: 0.6, ...opts }); } catch {} },
  };
}
