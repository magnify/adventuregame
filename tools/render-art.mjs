// Rasterise every SVG in art/src to PNG at 2x (or take a PNG source as is) into public/art, and copy the manifest with pixel sizes.
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const SRC = 'art/src', OUT = 'public/art', SCALE = 2, MAX_TEX = 4096;
const manifest = JSON.parse(fs.readFileSync(path.join(SRC, 'manifest.json'), 'utf8'));
fs.mkdirSync(OUT, { recursive: true });
const out = { scale: SCALE, images: {} };
for (let [key, meta] of Object.entries(manifest.images || manifest)) {
  const file = key.replace(/\//g, '-') + '.png';
  // many phones can't hold a texture over 4096px on a side; render big strips at a lower scale instead
  // characters are seen close and move: render them sharper (5x) where the source art has the pixels for it
  const want = /^(girl|barlin)\//.test(key) ? 3.5 : SCALE; // sharp on a tablet, light enough for eight poses in a phone's memory
  const sc = Math.min(want, MAX_TEX / meta.width, MAX_TEX / meta.height);
  const w = Math.round(meta.width * sc), h = Math.round(meta.height * sc);
  if (sc !== SCALE) meta = { ...meta, scale: sc };
  // A PNG beside the SVG wins: generated paper art. Trim its empty margin, make solid paper fully opaque.
  const pngPath = [path.join(SRC, key + '.png'), path.join(SRC, 'characters', key + '.png')].find(f => fs.existsSync(f));
  if (pngPath) {
    const trimmed = await (meta.trim === false ? sharp(pngPath) : sharp(pngPath).trim({ threshold: 10 })).resize(w, h, { fit: 'fill' }) /* poses keep their shared box so they line up */.raw().toBuffer({ resolveWithObject: true });
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
// Soft paper shadows for things that move or stand in front: a blurred silhouette drawn just behind each piece,
// so a cut-out sits in the scene the way the layered paper does. Baked here so phones pay nothing for them.
const SHADOW = /^(girl|barlin)\/|^street\/(cat|lamp)$/, PAD = 6; // pad in 1x px, room for the blur
for (const [key, meta] of Object.entries(out.images)) {
  if (!SHADOW.test(key) || key.endsWith('~shadow') || key === 'girl/stand-blink') continue;
  const sc = meta.scale ?? SCALE, pad = Math.round(PAD * sc);
  const { data, info } = await sharp(path.join(OUT, meta.file)).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const w = info.width + pad * 2, h = info.height + pad * 2, px = Buffer.alloc(w * h * 4);
  for (let y = 0; y < info.height; y++) for (let x = 0; x < info.width; x++) px[((y + pad) * w + x + pad) * 4 + 3] = Math.round(data[(y * info.width + x) * 4 + 3] * 0.5);
  const file = key.replace(/\//g, '-') + '~shadow.webp';
  // a shadow is a blur: a third of the resolution looks the same and costs a phone a ninth of the memory
  const ss = sc / 3;
  await sharp(await sharp(px, { raw: { width: w, height: h, channels: 4 } }).blur(2.2 * sc).png().toBuffer()).resize(Math.round(w / 3), Math.round(h / 3)).webp({ quality: 80, alphaQuality: 80 }).toFile(path.join(OUT, file));
  const pv = meta.pivot || { x: 0.5, y: 1 };
  out.images[key + '~shadow'] = { width: meta.width + PAD * 2, height: meta.height + PAD * 2, scale: ss,
    pivot: { x: (pv.x * meta.width + PAD) / (meta.width + PAD * 2), y: (pv.y * meta.height + PAD) / (meta.height + PAD * 2) }, file };
}
fs.writeFileSync(path.join(OUT, 'manifest.json'), JSON.stringify(out));
console.log('wrote', Object.keys(out.images).length, 'images');
