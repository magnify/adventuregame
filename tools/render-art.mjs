// Rasterise every SVG in art/src to PNG at 2x (or take a PNG source as is) into public/art, and copy the manifest with pixel sizes.
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const SRC = 'art/src', OUT = 'public/art', SCALE = 2;
const manifest = JSON.parse(fs.readFileSync(path.join(SRC, 'manifest.json'), 'utf8'));
fs.mkdirSync(OUT, { recursive: true });
const out = { scale: SCALE, images: {} };
for (const [key, meta] of Object.entries(manifest.images || manifest)) {
  const file = key.replace(/\//g, '-') + '.png';
  const w = Math.round(meta.width * SCALE), h = Math.round(meta.height * SCALE);
  // A PNG beside the SVG wins: generated paper art. Trim its empty margin, make solid paper fully opaque.
  const pngPath = [path.join(SRC, key + '.png'), path.join(SRC, 'characters', key + '.png')].find(f => fs.existsSync(f));
  if (pngPath) {
    const trimmed = await sharp(pngPath).trim({ threshold: 10 }).resize(w, h, { fit: 'fill' }).raw().toBuffer({ resolveWithObject: true });
    const px = trimmed.data; for (let i = 3; i < px.length; i += 4) if (px[i] >= 240) px[i] = 255;
    // photographed paper is too heavy as PNG on a phone; WebP keeps the alpha at a fraction of the weight
    const webp = file.replace(/\.png$/, '.webp'); fs.rmSync(path.join(OUT, file), { force: true });
    await sharp(px, { raw: trimmed.info }).webp({ quality: 86, alphaQuality: 90 }).toFile(path.join(OUT, webp));
    out.images[key] = { ...meta, file: webp };
    console.log(key.padEnd(28), `${w}x${h}`, 'png');
    continue;
  }
  const svgPath = [path.join(SRC, key + '.svg'), path.join(SRC, 'characters', key + '.svg')].find(f => fs.existsSync(f)) || path.join(SRC, key + '.svg');
  if (!fs.existsSync(svgPath)) { console.warn('missing', svgPath); continue; }
  await sharp(svgPath, { density: 72 * SCALE }).resize(w, h, { fit: 'fill' }).png({ compressionLevel: 9 }).toFile(path.join(OUT, file));
  out.images[key] = { ...meta, file };
  console.log(key.padEnd(28), `${w}x${h}`);
}
fs.writeFileSync(path.join(OUT, 'manifest.json'), JSON.stringify(out));
console.log('wrote', Object.keys(out.images).length, 'images');
