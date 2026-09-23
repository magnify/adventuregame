// Is a scene finished in paper? Lists every image the scene can show and fails on any that still comes from a flat
// SVG placeholder instead of generated paper art. Soft lights (glows, wisps) are allowed to stay non-paper, by name.
// Usage: node tools/check-scene.mjs street
import fs from 'node:fs';
const scene = process.argv[2] || 'street';
const SOFT = new Set(['forest/wisp']); // a blurred glow, not an object: it has no paper version by design
const data = JSON.parse(fs.readFileSync(`src/scenes/${scene}.json`, 'utf8'));
const code = fs.readFileSync(`src/scenes/${scene}.js`, 'utf8');
const keys = new Set();
for (const list of [data.tiles, data.props, data.hotspots]) for (const t of list || []) keys.add(t.key);
for (const m of code.matchAll(/'((?:[a-z]+)\/[a-z0-9-]+)'/g)) keys.add(m[1]);
for (const m of code.matchAll(/\[((?:'[a-z-]+',?\s*)+)\]/g)) for (const k of m[1].matchAll(/'([a-z-]+)'/g)) keys.add(`icon/${k[1]}`); // bubble pictures
for (const h of data.hotspots || []) for (const k of h.bubble || []) keys.add(`icon/${k}`);
for (const k of ['girl/body', 'girl/head', 'girl/arm-l', 'girl/arm-r', 'girl/leg-l', 'girl/leg-r', 'pocket/key']) keys.add(k);
if (data.barlin) for (const k of ['barlin/body', 'barlin/wing-front', 'barlin/wing-back', 'barlin/hat']) keys.add(k);
const manifest = JSON.parse(fs.readFileSync('art/src/manifest.json', 'utf8')).images;
const src = k => ['art/src/', 'art/src/characters/'].map(d => d + k).find(p => fs.existsSync(p + '.png') || fs.existsSync(p + '.svg'));
const flat = [], paper = [];
for (const k of [...keys].filter(k => manifest[k]).sort()) {
  const base = src(k); if (!base) continue;
  if (fs.existsSync(base + '.png')) paper.push(k); else if (SOFT.has(k)) paper.push(k + ' (soft light)'); else flat.push(k);
}
console.log(`${scene}: ${paper.length} paper, ${flat.length} flat`);
if (flat.length) { console.log('still flat placeholders:\n  ' + flat.join('\n  ')); process.exit(1); }
