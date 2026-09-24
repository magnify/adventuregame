// The feel checks: plays the street frame by frame (the game only moves when this steps it), records every frame,
// and measures the things Brian has had to catch by eye. Each check is one of his reports, turned into a number.
// Writes a filmstrip per moment for a reviewer. Usage: npm run feel -- [build dir] [out dir]
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import sharp from 'sharp';
const DIR = process.argv[2] || 'dist-demo', OUT = process.argv[3] || 'tests/shots/feel'; fs.mkdirSync(OUT, { recursive: true });
const PORT = 4191, FPS = 30, W = 960, H = 540;
const srv = spawn('python3', ['-m', 'http.server', String(PORT), '--directory', DIR], { stdio: 'ignore' });
await new Promise(r => setTimeout(r, 1200));
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport: { width: W, height: H } });
const errs = []; p.on('pageerror', e => errs.push(e.message));
const results = []; const check = (name, ok, detail) => { results.push({ name, ok, detail }); console.log(`${ok ? 'pass' : 'FAIL'}  ${name.padEnd(34)} ${detail}`); };
const step = (n = 1) => p.evaluate(n => window.__step(n), n);
const scene = `const s = window.__game.scene.getScenes(true)[0];`;
const q = body => p.evaluate(new Function(`${scene} return (${body});`));
// screen box of a game object, in page pixels
const box = expr => q(`(() => { const o = ${expr}; const c = s.cameras.main; const g = o.getBounds(); const v = c.worldView; return { x: (g.x - v.x) * c.zoom, y: (g.y - v.y) * c.zoom, w: g.width * c.zoom, h: g.height * c.zoom }; })()`);
const frames = {}; const grab = async (tag) => { (frames[tag] ||= []).push(await p.screenshot()); };
const film = async (tag, every = 3) => { const fs2 = (frames[tag] || []).filter((_, i) => i % every === 0).slice(0, 16); if (!fs2.length) return;
  const small = await Promise.all(fs2.map(f => sharp(f).resize(320).png().toBuffer())); const cols = 4, rows = Math.ceil(small.length / cols);
  await sharp({ create: { width: cols * 322, height: rows * 182, channels: 3, background: '#fff' } }).composite(small.map((im, i) => ({ input: im, left: (i % cols) * 322, top: Math.floor(i / cols) * 182 }))).png().toFile(`${OUT}/${tag}.png`); };

// ---- load, fresh
await p.goto(`http://localhost:${PORT}/index.html?test`, { timeout: 90000 });
await p.evaluate(() => localStorage.clear()); await p.reload();
for (let i = 0; i < 600; i++) { if (await p.evaluate(() => document.getElementById('loading')?.classList.contains('off'))) break; await p.evaluate(() => window.__step?.(1)); await p.waitForTimeout(50); }

await step(10); await p.click('#ui button', { timeout: 15000 }); await step(20);

// ---- 1. the walk: she moves steadily across the screen, never jerks or slides backwards
{
  await p.mouse.click(W * 0.8, H * 0.86); const xs = [], poses = [];
  for (let i = 0; i < FPS * 3; i++) { await step(1); const r = await q(`({ x: (s.girl.x - s.cameras.main.worldView.x) * s.cameras.main.zoom, wx: s.girl.x, pose: s.girl.img.texture.key, mode: s.girl.mode })`); xs.push(r); if (i % 2 === 0) await grab('walk'); }
  const walking = xs.filter(r => r.mode === 'walk'); const d = walking.map((r, i) => i ? r.wx - walking[i - 1].wx : 0).slice(1);
  const back = d.filter(v => v < -0.5).length; const jerk = Math.max(0, ...d.slice(6).map((v, i) => Math.abs(v - d[i + 5])));
  check('walk: never slides backwards', back === 0, `${back} backward frames`);
  check('walk: no jerks in her speed', jerk < 4, `largest frame-to-frame change ${jerk.toFixed(1)} px`);
  const sx = walking.map(r => r.x); const sjerk = Math.max(0, ...sx.slice(8).map((v, i) => Math.abs((v - sx[i + 7]) - (sx[i + 7] - sx[i + 6]))));
  check('walk: steady on screen (camera)', sjerk < 4, `largest on-screen jolt ${sjerk.toFixed(1)} px`);
  const changes = walking.map(r => r.pose).filter((k, i, a) => i && k !== a[i - 1]).length, secs = walking.length / FPS;
  check('walk: steps at a walking pace', changes / secs <= 6, `${(changes / secs).toFixed(1)} picture changes a second`);
  check('walk: only walking pictures', walking.every(r => /walk/.test(r.pose)), `pictures used: ${[...new Set(walking.map(r => r.pose.split('/')[1]))].join(', ')}`);
  await film('walk', 2);
}

// ---- 2. the tree grows from behind the pavement, not on top of it
{
  const pave = await q(`(() => { const t = s.tiles.find(t => t.data_.key === 'street/pavement'); const c = s.cameras.main; return (t.y - c.worldView.y) * c.zoom; })()`);
  const trees = `s.props.concat([...s.hots.values()]).filter(o => o.texture.key === 'street/tree')`;
  const shot = async () => sharp(await p.screenshot()).raw().toBuffer({ resolveWithObject: true });
  // compare the frame with and without the tree, nothing else moving: she and the glow are hidden, time barely advances
  await q(`void (s.girl.setVisible(false), s.glint?.setVisible(false))`); await p.evaluate(() => window.__step(1, 0.01));
  const withTree = await shot(); await q(`${trees}.forEach(o => o.setAlpha(0))`); await p.evaluate(() => window.__step(1, 0.01)); const without = await shot();
  await q(`void (${trees}.forEach(o => o.setAlpha(1)), s.girl.setVisible(true), s.glint?.setVisible(true))`); await step(1);
  await sharp(without.data, { raw: without.info }).png().toFile(`${OUT}/tree-without.png`); await sharp(withTree.data, { raw: withTree.info }).png().toFile(`${OUT}/tree-with.png`);
  let lowest = 0; for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const i = (y * W + x) * 3; if (Math.abs(withTree.data[i] - without.data[i]) + Math.abs(withTree.data[i + 1] - without.data[i + 1]) > 30) lowest = Math.max(lowest, y); }
  check('tree: no part of it on the pavement', lowest <= pave + 2, `tree reaches y ${lowest}, pavement starts at y ${Math.round(pave)}`);
}

// ---- 3. the climb: she goes up the trunk, hands on it, and ends on the branch
{
  await q(`void s.act(s.hots.get('tree'))`); const trail = [];
  for (let i = 0; i < FPS * 8; i++) { await step(1); const r = await q(`({ x: s.girl.x, y: s.girl.y, mode: s.girl.mode, pose: s.girl.img.texture.key, trunk: s.trunkX, up: s.up })`); trail.push(r); if (r.mode === 'climb' && i % 2 === 0) await grab('climb'); if (r.up && r.mode === 'idle') break; }
  const climbing = trail.filter(r => r.mode === 'climb');
  const off = Math.max(0, ...climbing.map(r => Math.abs(r.x - r.trunk)));
  check('climb: stays on the trunk', climbing.length > 0 && off < 30, `${climbing.length} climbing frames, furthest ${off.toFixed(0)} px from the trunk`);
  check('climb: hand over hand', new Set(climbing.map(r => r.pose)).size >= 2, `pictures: ${[...new Set(climbing.map(r => r.pose.split('/')[1]))].join(', ')}`);
  await step(FPS * 2); await film('climb', 1);
}

// ---- 4. up close: door and mat big enough to see and tap, all of her in view
{
  await step(FPS); await grab('closeup');
  const door = await box(`s.hots.get('door')`), mat = await box(`s.hots.get('mat')`), girl = await box('s.girl.img');
  check('close-up: door is big on screen', door.h >= 70, `door ${door.h.toFixed(0)} px tall at ${W}x${H}`);
  const inView = o => o.x >= 0 && o.y >= 0 && o.x + o.w <= W && o.y + o.h <= H;
  check('close-up: door, mat and her all in view', inView(door) && inView(mat) && inView(girl), `door ${inView(door)}, mat ${inView(mat)}, girl ${inView(girl)}`);
  await film('closeup', 1);
}

// ---- 5. a bubble: on screen, above her head, not over her face
{
  await q(`void s.act(s.hots.get('mat'))`); let bub = null;
  for (let i = 0; i < FPS * 3 && !bub; i++) { await step(1); bub = await q(`(() => { const c = s.children.list.find(o => o.type === 'Container' && o.depth === 50 && o.alpha > 0.9); if (!c) return null; const g = c.getBounds(), v = s.cameras.main.worldView, z = s.cameras.main.zoom; return { x: (g.x - v.x) * z, y: (g.y - v.y) * z, w: g.width * z, h: g.height * z }; })()`); }
  await grab('bubble'); const girl = await box('s.girl.img');
  check('bubble: appears', !!bub, bub ? 'shown' : 'no bubble seen');
  if (bub) {
    check('bubble: fully on screen', bub.x >= 0 && bub.y >= 0 && bub.x + bub.w <= W && bub.y + bub.h <= H, `bubble at ${bub.x.toFixed(0)},${bub.y.toFixed(0)} size ${bub.w.toFixed(0)}x${bub.h.toFixed(0)}`);
    const face = { y0: girl.y, y1: girl.y + girl.h * 0.3 }; const overFace = bub.y + bub.h > face.y0 + 8 && bub.x < girl.x + girl.w && bub.x + bub.w > girl.x;
    check('bubble: not over her face', !overFace, overFace ? 'overlaps the top of her' : 'clear of her head');
  }
  await film('bubble', 1);
}

check('no errors in the page', errs.length === 0, errs.slice(0, 3).join(' | ') || 'none');
await b.close(); srv.kill();
const failed = results.filter(r => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} pass; filmstrips in ${OUT}`);
if (failed.length) process.exit(1);
