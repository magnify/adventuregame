// Takes a character's pose pictures (same canvas, same baseline), crops them all to one shared box so they stay
// aligned with each other, and writes them into art/src/characters/<who>/ with a manifest entry each.
// Usage: node tools/import-poses.mjs girl art/incoming/girl-poses 210 stand
//        (who, folder, height in game pixels of the reference pose, reference pose)
import sharp from 'sharp';
import fs from 'node:fs';
import path from 'node:path';
const [who, dir, refH = '210', refPose = 'stand', pivotY] = process.argv.slice(2);
const files = fs.readdirSync(dir).filter(f => f.endsWith('.png') && f !== 'row.png' && f !== 'stacked.png');
const boxes = {};
for (const f of files) { const t = await sharp(path.join(dir, f)).trim({ threshold: 10 }).toBuffer({ resolveWithObject: true }); boxes[f] = { x: -t.info.trimOffsetLeft, y: -t.info.trimOffsetTop, w: t.info.width, h: t.info.height }; }
const x0 = Math.min(...Object.values(boxes).map(b => b.x)), y0 = Math.min(...Object.values(boxes).map(b => b.y));
const x1 = Math.max(...Object.values(boxes).map(b => b.x + b.w)), y1 = Math.max(...Object.values(boxes).map(b => b.y + b.h));
const W = x1 - x0, H = y1 - y0, ref = boxes[`${refPose}.png`], k = Number(refH) / ref.h; // game px per source px
const pivot = { x: +((ref.x + ref.w / 2 - x0) / W).toFixed(4), y: pivotY ? Number(pivotY) : 1 };
const out = `art/src/characters/${who}`; fs.mkdirSync(out, { recursive: true });
const manPath = 'art/src/manifest.json', man = JSON.parse(fs.readFileSync(manPath, 'utf8'));
for (const k2 of Object.keys(man.images)) if (k2.startsWith(`${who}/`)) delete man.images[k2];
for (const f of files) {
  await sharp(path.join(dir, f)).extract({ left: x0, top: y0, width: W, height: H }).png().toFile(path.join(out, f));
  man.images[`${who}/${f.replace('.png', '')}`] = { width: Math.round(W * k), height: Math.round(H * k), pivot, trim: false };
}
fs.writeFileSync(manPath, JSON.stringify(man, null, 2) + '\n');
console.log(`${who}: ${files.length} poses, shared box ${W}x${H}, ${Math.round(W * k)}x${Math.round(H * k)} in game, pivot`, pivot);
