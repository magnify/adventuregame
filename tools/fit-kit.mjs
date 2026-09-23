// Finds where each paper-doll part sits in the character's reference picture, by matching the parts against it,
// and prints the socket on the body and the resting angle for each part. Measured from the artwork, not guessed.
// Usage: node tools/fit-kit.mjs barlin
import sharp from 'sharp';
import fs from 'node:fs';
const who = process.argv[2] || 'barlin';
const manifest = JSON.parse(fs.readFileSync('art/src/manifest.json', 'utf8')).images;
const REF_W = 150; // match at this width: coarse enough to be quick, fine enough to place a hat
const load = async (file, w) => { const { data, info } = await sharp(file).trim({ threshold: 10 }).resize({ width: w }).ensureAlpha().raw().toBuffer({ resolveWithObject: true }); return { data, w: info.width, h: info.height }; };
const ref = await load(`art/reference/${who}-sheet.png`, REF_W);
const px = (im, x, y) => { const i = (y * im.w + x) * 4; return [im.data[i], im.data[i + 1], im.data[i + 2], im.data[i + 3]]; };
// rotate + scale a part into a sprite of points: [dx, dy, r, g, b] relative to its pivot
const sprite = (im, pivot, scale, ang) => { const pts = [], c = Math.cos(ang), s = Math.sin(ang);
  for (let y = 0; y < im.h; y += 1) for (let x = 0; x < im.w; x += 1) { const p = px(im, x, y); if (p[3] < 160) continue;
    const lx = (x - pivot.x * im.w) * scale, ly = (y - pivot.y * im.h) * scale; pts.push([Math.round(lx * c - ly * s), Math.round(lx * s + ly * c), p[0], p[1], p[2]]); }
  const seen = new Set(); return pts.filter(q => { const k = q[0] + ',' + q[1]; if (seen.has(k)) return false; seen.add(k); return true; }); };
const score = (pts, ox, oy) => { let d = 0, n = 0; for (const [dx, dy, r, g, b] of pts) { const x = ox + dx, y = oy + dy; if (x < 0 || y < 0 || x >= ref.w || y >= ref.h) { d += 200; n++; continue; } const q = px(ref, x, y); if (q[3] < 160) { d += 200; n++; continue; } d += (Math.abs(q[0] - r) + Math.abs(q[1] - g) + Math.abs(q[2] - b)) / 3; n++; } return d / n; };
const best = (im, pivot, scales, angs, region) => { let top = { s: 1e9 };
  for (const sc of scales) for (const a of angs) { const pts = sprite(im, pivot, sc, a);
    for (let y = region.y0; y < region.y1; y += 1) for (let x = region.x0; x < region.x1; x += 1) { const s = score(pts, x, y); if (s < top.s) top = { s, x, y, sc, a }; } }
  return top; };
const parts = who === 'barlin' ? ['wing-back', 'wing-front', 'hat'] : ['head', 'arm-l', 'arm-r', 'leg-l', 'leg-r'];
const body = await load(`art/src/characters/${who}/body.png`, 90); const bm = manifest[`${who}/body`];
const B = best(body, bm.pivot, [0.9, 1.0, 1.1, 1.2, 1.3, 1.4], [-40, -30, -20, -10, 0, 10].map(d => d * Math.PI / 180), { x0: 20, x1: ref.w - 20, y0: 20, y1: ref.h - 10 });
console.log(`body   at (${B.x}, ${B.y}) scale ${B.sc} tilt ${(B.a * 180 / Math.PI).toFixed(0)}° match ${B.s.toFixed(1)}`);
const bodyW = body.w * B.sc, bodyH = body.h * B.sc; // body size in reference pixels
for (const part of parts) {
  const m = manifest[`${who}/${part}`]; const pw = Math.round(90 * m.width / bm.width); // same pixel density as the body
  const im = await load(`art/src/characters/${who}/${part}.png`, Math.max(8, pw));
  const angs = part.startsWith('wing') ? [-90, -80, -70, -60, -50, -40, -30, -20, -10, 0, 10, 20].map(d => d * Math.PI / 180) : part === 'hat' ? [-20, -10, 0, 10, 20, 30].map(d => d * Math.PI / 180) : [0];
  const P = best(im, m.pivot, [B.sc * 0.8, B.sc * 0.9, B.sc, B.sc * 1.1, B.sc * 1.2], angs, { x0: 0, x1: ref.w, y0: 0, y1: ref.h });
  // the part's pivot sits at (P.x, P.y); express it in the body's own 0..1 frame
  const c = Math.cos(-B.a), sn = Math.sin(-B.a), dx = P.x - B.x, dy = P.y - B.y; // undo the body's tilt
  const sx = (dx * c - dy * sn) / bodyW + bm.pivot.x, sy = (dx * sn + dy * c) / bodyH + bm.pivot.y;
  console.log(`${part.padEnd(11)} socket { "x": ${sx.toFixed(2)}, "y": ${sy.toFixed(2)} }  angle ${((P.a - B.a) * 180 / Math.PI).toFixed(0)}° relative to body  size ×${(P.sc / B.sc).toFixed(2)}  match ${P.s.toFixed(1)}`);
}
