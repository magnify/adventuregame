// Rasterise every SVG in art/src to PNG at 2x into public/art, and copy the manifest with pixel sizes.
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const SRC = 'art/src', OUT = 'public/art', SCALE = 2;
const manifest = JSON.parse(fs.readFileSync(path.join(SRC, 'manifest.json'), 'utf8'));
fs.mkdirSync(OUT, { recursive: true });
const out = { scale: SCALE, images: {} };
for (const [key, meta] of Object.entries(manifest.images || manifest)) {
  const svgPath = [path.join(SRC, key + '.svg'), path.join(SRC, 'characters', key + '.svg')].find(f => fs.existsSync(f)) || path.join(SRC, key + '.svg');
  if (!fs.existsSync(svgPath)) { console.warn('missing', svgPath); continue; }
  const file = key.replace(/\//g, '-') + '.png';
  const w = Math.round(meta.width * SCALE), h = Math.round(meta.height * SCALE);
  await sharp(svgPath, { density: 72 * SCALE }).resize(w, h, { fit: 'fill' }).png({ compressionLevel: 9 }).toFile(path.join(OUT, file));
  out.images[key] = { ...meta, file };
  console.log(key.padEnd(28), `${w}x${h}`);
}
fs.writeFileSync(path.join(OUT, 'manifest.json'), JSON.stringify(out));
console.log('wrote', Object.keys(out.images).length, 'images');
