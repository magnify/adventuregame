// Assembles a character from its kit, standing still, and nudges every socket and part size until the assembled
// figure matches the character's reference picture pixel for pixel. Prints the settings and writes a side-by-side:
// reference, assembled, and the difference between them (black where they agree).
// Usage: node tools/match-kit.mjs girl [out.png]
import sharp from 'sharp';
import fs from 'node:fs';
const who = process.argv[2] || 'girl', OUT = process.argv[3] || `tests/shots/${who}-match.png`;
const man = JSON.parse(fs.readFileSync('art/src/manifest.json', 'utf8')).images;
const RH = 240; // compare at this height
const refImg = await sharp(`art/reference/${who}-sheet.png`).trim({ threshold: 10 }).resize({ height: RH }).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const RW = refImg.info.width, ref = refImg.data;
const RIGS = {
  girl: { order: ['arm-r', 'leg-l', 'leg-r', 'body', 'arm-l', 'head'], at: { head: 'neck', 'arm-l': 'shoulder-l', 'arm-r': 'shoulder-r', 'leg-l': 'hip-l', 'leg-r': 'hip-r' } },
};
const RIG = RIGS[who];
const src = {}; for (const k of RIG.order) src[k] = fs.readFileSync(`art/src/characters/${who}/${k}.png`);
const cache = new Map();
const part = async (k, w, h) => { const key = `${k}:${w}:${h}`; if (!cache.has(key)) cache.set(key, await sharp(src[k]).trim({ threshold: 10 }).resize(w, h, { fit: 'fill' }).ensureAlpha().raw().toBuffer()); return cache.get(key); };
// settings: one scale and body offset, then per part a socket (x, y on the body) and a size factor
const P = { s: RH / 200, bx: 0, by: 0 };
for (const k of RIG.order) if (k !== 'body') { const pt = man[`${who}/body`].points[RIG.at[k]]; P[`${k}.x`] = pt.x; P[`${k}.y`] = pt.y; P[`${k}.m`] = 1; }
async function render(p) {
  const out = new Uint8Array(RW * RH * 4); const b = man[`${who}/body`];
  const bw = b.width * p.s, bh = b.height * p.s; const bx0 = RW / 2 - bw / 2 + p.bx, by0 = p.by;
  for (const k of RIG.order) {
    const m = man[`${who}/${k}`]; const sz = k === 'body' ? 1 : p[`${k}.m`];
    const w = Math.max(2, Math.round(m.width * p.s * sz)), h = Math.max(2, Math.round(m.height * p.s * sz)); const px = await part(k, w, h);
    let x0, y0; if (k === 'body') { x0 = bx0; y0 = by0; } else { const ax = bx0 + p[`${k}.x`] * bw, ay = by0 + p[`${k}.y`] * bh; x0 = ax - m.pivot.x * w; y0 = ay - m.pivot.y * h; }
    x0 = Math.round(x0); y0 = Math.round(y0);
    for (let y = 0; y < h; y++) { const Y = y + y0; if (Y < 0 || Y >= RH) continue; for (let x = 0; x < w; x++) { const X = x + x0; if (X < 0 || X >= RW) continue; const i = (y * w + x) * 4, o = (Y * RW + X) * 4, a = px[i + 3] / 255; if (!a) continue;
      out[o] = out[o] * (1 - a) + px[i] * a; out[o + 1] = out[o + 1] * (1 - a) + px[i + 1] * a; out[o + 2] = out[o + 2] * (1 - a) + px[i + 2] * a; out[o + 3] = Math.max(out[o + 3], px[i + 3]); } }
  }
  return out;
}
const score = async p => { const o = await render(p); let d = 0, n = 0; for (let i = 0; i < RW * RH; i++) { const a = o[i * 4 + 3] > 128, r = ref[i * 4 + 3] > 128; if (!a && !r) continue; n++; d += a && r ? (Math.abs(o[i * 4] - ref[i * 4]) + Math.abs(o[i * 4 + 1] - ref[i * 4 + 1]) + Math.abs(o[i * 4 + 2] - ref[i * 4 + 2])) / 3 : 160; } return d / n; };
// sizes may only move a little from the kit's own proportions, or the fit 'wins' by shrinking a part out of sight
const BOUNDS = { m: [0.88, 1.15] };
const ok = (k, v) => !k.endsWith('.m') || (v >= BOUNDS.m[0] && v <= BOUNDS.m[1]);
const step = k => k === 's' ? 0.05 : k === 'bx' || k === 'by' ? 4 : k.endsWith('.m') ? 0.06 : 0.04;
let best = await score(P);
console.log(`start: difference ${best.toFixed(1)}`);
for (let round = 0, f = 1; round < 6; round++, f /= 2) {
  let moved = true;
  while (moved) { moved = false;
    for (const k of Object.keys(P)) for (const dir of [1, -1]) { const q = { ...P, [k]: P[k] + dir * step(k) * f }; if (!ok(k, q[k])) continue; const sc = await score(q); if (sc < best - 0.01) { best = sc; Object.assign(P, q); moved = true; } } }
  console.log(`round ${round}: difference ${best.toFixed(1)}`);
}
for (const k of Object.keys(P)) console.log(k.padEnd(10), P[k].toFixed(3));
fs.writeFileSync(OUT.replace(/\.png$/, '.json'), JSON.stringify(P, null, 1));
const mine = await render(P); const raw = { width: RW, height: RH, channels: 4 };
const a = await sharp(Buffer.from(ref), { raw }).flatten({ background: '#ffffff' }).png().toBuffer(), b = await sharp(Buffer.from(mine), { raw }).flatten({ background: '#ffffff' }).png().toBuffer();
const over = await sharp(a).composite([{ input: b, blend: 'difference' }]).png().toBuffer();
await sharp({ create: { width: RW * 3 + 20, height: RH, channels: 3, background: '#ffffff' } }).composite([{ input: a, left: 0, top: 0 }, { input: b, left: RW + 10, top: 0 }, { input: over, left: RW * 2 + 20, top: 0 }]).png().toFile(OUT);
console.log('wrote', OUT);
