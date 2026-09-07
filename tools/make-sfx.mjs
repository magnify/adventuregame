// Synthesise the game's sound effects as small WAV files. No samples, nothing to license.
import fs from 'node:fs';
const SR = 22050;
function wav(samples) {
  const n = samples.length, buf = Buffer.alloc(44 + n * 2);
  buf.write('RIFF', 0); buf.writeUInt32LE(36 + n * 2, 4); buf.write('WAVE', 8); buf.write('fmt ', 12); buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(1, 22);
  buf.writeUInt32LE(SR, 24); buf.writeUInt32LE(SR * 2, 28); buf.writeUInt16LE(2, 32); buf.writeUInt16LE(16, 34); buf.write('data', 36); buf.writeUInt32LE(n * 2, 40);
  for (let i = 0; i < n; i++) buf.writeInt16LE(Math.max(-1, Math.min(1, samples[i])) * 32767, 44 + i * 2);
  return buf;
}
const gen = (dur, f) => { const n = Math.floor(SR * dur), out = new Float32Array(n); for (let i = 0; i < n; i++) out[i] = f(i / SR, i / n); return out; };
const env = (p, a = 0.01, r = 0.3) => Math.min(1, p / a) * Math.pow(1 - p, r * 10);
let seed = 7; const noise = () => ((seed = (seed * 16807) % 2147483647) / 2147483647) * 2 - 1;
const tone = (t, f) => Math.sin(2 * Math.PI * f * t);
const sfx = {
  // a soft footstep: filtered noise thump
  step: gen(0.12, (t, p) => noise() * 0.25 * Math.pow(1 - p, 6) + tone(t, 90) * 0.2 * Math.pow(1 - p, 4)),
  // a bubble pop for picture bubbles
  pop: gen(0.14, (t, p) => tone(t, 520 + 400 * (1 - p)) * 0.35 * env(p, 0.005, 0.4)),
  // pick something up
  pick: gen(0.22, (t, p) => (tone(t, 660) * 0.5 + tone(t, 990) * 0.3) * 0.35 * env(p, 0.005, 0.35) * (p < 0.5 ? 1 : 0.6) + tone(t, 1320) * 0.2 * env(Math.max(0, (p - 0.4) / 0.6), 0.01, 0.4)),
  // the locked door: a dull knock and a rattle
  locked: gen(0.35, (t, p) => (tone(t, 140) * 0.5 * Math.pow(1 - p, 8)) + noise() * 0.12 * (p > 0.3 && p < 0.7 ? 1 : 0) * Math.sin(p * 60)),
  // a key turning
  unlock: gen(0.4, (t, p) => noise() * 0.15 * (p < 0.15 ? 1 : 0) + tone(t, 2200) * 0.25 * env(Math.max(0, (p - 0.35) / 0.65), 0.005, 0.5) + tone(t, 1650) * 0.15 * env(Math.max(0, (p - 0.55) / 0.45), 0.005, 0.5)),
  // door creak
  creak: gen(0.6, (t, p) => tone(t, 240 + Math.sin(p * 9) * 60 + p * 120) * 0.22 * env(p, 0.05, 0.25) * (1 + 0.3 * Math.sin(t * 700))),
  // door slam
  slam: gen(0.3, (t, p) => noise() * 0.6 * Math.pow(1 - p, 10) + tone(t, 70) * 0.5 * Math.pow(1 - p, 5)),
  // being pulled through the door: rising whoosh
  whoosh: gen(1.2, (t, p) => noise() * 0.4 * Math.sin(Math.PI * p) * (0.3 + 0.7 * Math.pow(Math.sin(Math.PI * p), 2)) + tone(t, 200 + p * p * 1400) * 0.1 * Math.sin(Math.PI * p)),
  // a small chime for something magic
  chime: gen(0.9, (t, p) => (tone(t, 880) + tone(t, 1320) * 0.6 + tone(t, 1760) * 0.4) * 0.2 * env(p, 0.005, 0.15)),
  // an insect saying something
  chirp: gen(0.25, (t, p) => tone(t, 1800 + Math.sin(p * 40) * 300) * 0.2 * env(p, 0.01, 0.3) * (Math.sin(p * 90) > 0 ? 1 : 0.2)),
  // a low hum: barlin's wings
  flutter: gen(0.3, (t, p) => tone(t, 110 + Math.sin(p * 30) * 10) * 0.12 * Math.sin(Math.PI * p) + noise() * 0.05 * Math.sin(Math.PI * p)),
  // squelch for mud
  squelch: gen(0.5, (t, p) => noise() * 0.3 * Math.pow(1 - p, 3) * (0.5 + 0.5 * Math.sin(p * 80)) + tone(t, 120 - p * 60) * 0.3 * Math.pow(1 - p, 2)),
  // grow: barlin's magic
  grow: gen(0.9, (t, p) => tone(t, 300 + p * 900) * 0.18 * Math.sin(Math.PI * p) + tone(t, 600 + p * 1800) * 0.08 * Math.sin(Math.PI * p)),
  // wisp shimmer
  shimmer: gen(1.4, (t, p) => (tone(t, 1500 + Math.sin(t * 6) * 200) * 0.08 + tone(t, 2250 + Math.sin(t * 5) * 300) * 0.05) * Math.sin(Math.PI * p)),
};
for (const [k, s] of Object.entries(sfx)) fs.writeFileSync(`public/sfx/${k}.wav`, wav(s));
console.log('wrote', Object.keys(sfx).length, 'sounds:', Object.keys(sfx).join(' '));
