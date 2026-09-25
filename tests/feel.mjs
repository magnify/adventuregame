// The feel checks: plays the street frame by frame (the game only moves when this steps it), records every frame,
// and measures the things Brian has had to catch by eye. Each check is one of his reports, turned into a number.
// Writes a filmstrip per moment for a reviewer. Usage: npm run feel -- [build dir] [out dir]
import { launch } from './browser.mjs';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import sharp from 'sharp';
const DIR = process.argv[2] || 'dist-demo', OUT = process.argv[3] || 'tests/shots/feel'; fs.mkdirSync(OUT, { recursive: true });
const PORT = 4191, FPS = 30, W = 960, H = 540;
const srv = spawn('python3', ['-m', 'http.server', String(PORT), '--directory', DIR], { stdio: 'ignore' });
await new Promise(r => setTimeout(r, 1200));
const b = await launch();
const p = await b.newPage({ viewport: { width: W, height: H } });
const errs = []; p.on('pageerror', e => errs.push(e.message));
const results = []; const check = (name, ok, detail) => { results.push({ name, ok, detail }); console.log(`${ok ? 'pass' : 'FAIL'}  ${name.padEnd(34)} ${detail}`); };
// a check whose fix is waiting on art: shown on every run, never silently skipped, and it doesn't fail the build
const waiting = (name, detail) => { results.push({ name, ok: true, waiting: true }); console.log(`wait  ${name.padEnd(34)} ${detail}`); };
const step = (n = 1) => p.evaluate(n => window.__step(n), n);
const scene = `const s = window.__game.scene.getScenes(true)[0];`;
const q = body => p.evaluate(new Function(`${scene} return (${body});`));
// screen box of a game object, in page pixels
const box = expr => q(`(() => { const o = ${expr}; const c = s.cameras.main; const g = o.getBounds(); const v = c.worldView; return { x: (g.x - v.x) * c.zoom, y: (g.y - v.y) * c.zoom, w: g.width * c.zoom, h: g.height * c.zoom }; })()`);
// a bubble, measured against whoever is speaking: on screen, pointing at their head, not over their face
const bubbles = {}; const sampleBubble = async (tag, speaker) => {
  const r = await q(`(() => { const c = s.children.list.find(o => o.type === 'Container' && o.depth === 50 && o.alpha > 0.9 && o.scale > 0.95); if (!c) return null;
    const sp = ${speaker}, b = sp.getBounds(), cam = s.cameras.main, v = cam.worldView, z = cam.zoom, g = c.getBounds();
    const tip = { x: c.x + (c.tipX ?? 2), y: c.y + (c.tipY ?? 15) };
    const aimed = tip.x >= b.left - 12 && tip.x <= b.right + 12 && tip.y >= b.top - 40 && tip.y <= b.top + b.height * 0.45;
    const sx = x => (x - v.x) * z, sy = y => (y - v.y) * z, on = sx(g.left) >= 0 && sy(g.top) >= 0 && sx(g.right) <= ${W} && sy(g.bottom) <= ${H};
    const face = { l: b.left, r: b.right, t: b.top, bt: b.top + b.height * 0.3 };
    const overFace = Math.min(g.right, face.r) - Math.max(g.left, face.l) > 8 && Math.min(g.bottom, face.bt) - Math.max(g.top, face.t) > 8;
    return { aimed, on, overFace }; })()`);
  if (r) { (bubbles[tag] ||= []).push(r); if (bubbles[tag].length === 8) await p.screenshot({ path: `${OUT}/bubble-${tag.replace(/\W+/g, '-')}.png` }); } return r;
};
const judgeBubbles = tag => { const all = bubbles[tag] || [];
  check(`bubble (${tag}): shown`, all.length > 0, `${all.length} frames`);
  if (!all.length) return;
  check(`bubble (${tag}): points at the speaker`, all.every(r => r.aimed), `${all.filter(r => !r.aimed).length} of ${all.length} frames pointing elsewhere`);
  check(`bubble (${tag}): on screen, clear of the face`, all.every(r => r.on && !r.overFace), `${all.filter(r => !r.on).length} off screen, ${all.filter(r => r.overFace).length} over the face`);
};
const frames = {}; const grab = async (tag, clip) => { (frames[tag] ||= []).push(await p.screenshot(clip ? { clip } : {})); };
const film = async (tag, every = 3) => { const fs2 = (frames[tag] || []).filter((_, i) => i % every === 0).slice(0, 16); if (!fs2.length) return;
  const small = await Promise.all(fs2.map(f => sharp(f).resize(320).png().toBuffer())); const th = (await sharp(small[0]).metadata()).height, cols = 4, rows = Math.ceil(small.length / cols);
  await sharp({ create: { width: cols * 322, height: rows * (th + 2), channels: 3, background: '#fff' } }).composite(small.map((im, i) => ({ input: im, left: (i % cols) * 322, top: Math.floor(i / cols) * (th + 2) }))).png().toFile(`${OUT}/${tag}.png`); };

// ---- load, fresh
await p.goto(`http://localhost:${PORT}/index.html?test`, { timeout: 90000 });
await p.evaluate(() => localStorage.clear()); await p.reload();
for (let i = 0; i < 600; i++) { if (await p.evaluate(() => document.getElementById('loading')?.classList.contains('off'))) break; await p.evaluate(() => window.__step?.(1)); await p.waitForTimeout(50); }

await step(10); await p.click('#ui button', { timeout: 15000 }); await step(20);

// ---- 0. the words: every letter in every line, both languages, is drawn by the game's own font, not borrowed from another
{
  const chars = [...new Set(fs.readFileSync('src/game/lines.js', 'utf8').match(/'[^']*'|"[^"]*"/g).join('').replace(/['"]/g, ''))].filter(c => c.trim()).join('');
  const r = await p.evaluate(async chars => {
    const fam = getComputedStyle(document.getElementById('ui')).fontFamily.split(',')[0].trim();
    await document.fonts.load(`700 34px ${fam}`, chars);
    const c = document.createElement('canvas').getContext('2d'), w = (ch, fb) => { c.font = `700 34px ${fam}, ${fb}`; return c.measureText(ch).width; };
    return { fam, borrowed: [...chars].filter(ch => w(ch, 'serif') !== w(ch, 'monospace')).join('') };
  }, chars);
  check('words: every letter in the font', !r.borrowed, r.borrowed ? `${r.fam} lacks ${r.borrowed}` : `${r.fam} has all ${chars.length}`);
  const bubbleFont = fs.readFileSync('src/game/bubble.js', 'utf8').match(/fontFamily: '([^,']+)/)[1];
  check('words: bubbles use the same font', `'${bubbleFont}'` === r.fam || bubbleFont === r.fam.replace(/"/g, ''), `bubbles ${bubbleFont}, page ${r.fam}`);
}

// ---- 1. the walk: she moves steadily across the screen, never jerks or slides backwards
{
  await p.mouse.click(W * 0.8, H * 0.86); const xs = [], poses = [];
  for (let i = 0; i < FPS * 3; i++) { await step(1); const r = await q(`({ x: (s.girl.x - s.cameras.main.worldView.x) * s.cameras.main.zoom, wx: s.girl.x, pose: s.girl.img.texture.key, mode: s.girl.mode })`); xs.push(r); await sampleBubble('walking off', 's.girl.img'); if (i % 2 === 0) await grab('walk'); }
  const walking = xs.filter(r => r.mode === 'walk'); const d = walking.map((r, i) => i ? r.wx - walking[i - 1].wx : 0).slice(1);
  const back = d.filter(v => v < -0.5).length; const jerk = Math.max(0, ...d.slice(6).map((v, i) => Math.abs(v - d[i + 5])));
  check('walk: never slides backwards', back === 0, `${back} backward frames`);
  check('walk: no jerks in her speed', jerk < 4, `largest frame-to-frame change ${jerk.toFixed(1)} px`);
  const sx = walking.map(r => r.x); const sjerk = Math.max(0, ...sx.slice(8).map((v, i) => Math.abs((v - sx[i + 7]) - (sx[i + 7] - sx[i + 6]))));
  check('walk: steady on screen (camera)', sjerk < 4, `largest on-screen jolt ${sjerk.toFixed(1)} px`);
  const changes = walking.map(r => r.pose).filter((k, i, a) => i && k !== a[i - 1]).length, secs = walking.length / FPS;
  check('walk: steps at a walking pace', changes / secs <= 6, `${(changes / secs).toFixed(1)} picture changes a second`);
  const holds = []; walking.forEach((r, i) => { if (i && r.pose === walking[i - 1].pose) holds[holds.length - 1]++; else holds.push(1); });
  const shortest = Math.min(...holds.slice(0, -1)); // the last hold is cut off by the end of the recording
  check('walk: legs never flicker', shortest >= 4, `shortest step held ${shortest} frames (from the first step: ${holds.slice(0, 6).join(', ')})`);
  check('walk: only walking pictures', walking.every(r => /walk/.test(r.pose)), `pictures used: ${[...new Set(walking.map(r => r.pose.split('/')[1]))].join(', ')}`);
  await film('walk', 2);
  judgeBubbles('walking off');
}

// ---- 1b. the cat says something: the bubble belongs to the cat
{
  await step(FPS * 3); void q(`void s.act(s.hots.get('cat'))`);
  for (let i = 0; i < FPS * 8; i++) { await step(1); await sampleBubble('cat', "s.hots.get('cat')"); if (i > FPS && !(await q('s.busy'))) break; }
  judgeBubbles('cat');
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
  // every pixel the tree adds; the lowest row, and how far across it spreads below the pavement's top edge
  let lowest = 0, l = W, r = 0;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const i = (y * W + x) * 3; if (Math.abs(withTree.data[i] - without.data[i]) + Math.abs(withTree.data[i + 1] - without.data[i + 1]) > 30) { lowest = Math.max(lowest, y); if (y > pave + 2) { l = Math.min(l, x); r = Math.max(r, x); } } }
  // Brian: a tree on the pavement is standing on stone. It grows from its own bed of earth: its roots end in the soil,
  // and nothing of it touches the paving outside the bed
  const bed = await q(`s.textures.exists('street/tree-bed') && (() => { const o = s.props.find(o => o.texture.key === 'street/tree-bed'); if (!o) return 'missing'; const g = o.getBounds(), v = s.cameras.main.worldView, z = s.cameras.main.zoom; return { top: (g.top - v.y) * z, bottom: (g.bottom - v.y) * z, left: (g.left - v.x) * z, right: (g.right - v.x) * z }; })()`);
  if (!bed) waiting('tree: grows from a bed of earth', 'no tree bed art yet: the job is with GPT');
  else if (bed === 'missing') check('tree: grows from a bed of earth', false, 'the bed art is in, but not placed in the street');
  else {
    check('tree: roots end in the bed', lowest >= bed.top + (bed.bottom - bed.top) * 0.2 && lowest <= bed.bottom - (bed.bottom - bed.top) * 0.25, `roots end at y ${lowest}, soil between ${Math.round(bed.top + (bed.bottom - bed.top) * 0.2)} and ${Math.round(bed.bottom - (bed.bottom - bed.top) * 0.25)}`);
    const skyTap = await q(`(() => { const t = s.hots.get('tree'), b = t.getBounds(); return s.hotAt({ x: b.left + 12, y: b.top + 12 })?.hot?.id ?? null; })()`);
    check('tree: a tap on the sky beside it is not the tree', skyTap !== 'tree', `tap at the corner of its picture: ${skyTap ?? 'nothing'}`);
    check('tree: nothing of it on the paving', r < l || (l >= bed.left && r <= bed.right), r < l ? 'nothing below the pavement edge' : `below the pavement edge it spans x ${l}-${r}, bed spans ${Math.round(bed.left)}-${Math.round(bed.right)}`);
  }
}

// ---- 3. up the tree: she fades at the foot of the trunk and appears on the branch; never seen halfway up
{
  await q(`void s.act(s.hots.get('tree'))`); const trail = [];
  const ground = await q('s.D.groundY'), branch = await q('s.branchPos.y');
  for (let i = 0; i < FPS * 8; i++) { await step(1); const r = await q(`({ y: s.girl.y, a: s.girl.alpha, up: s.up, mode: s.girl.mode })`); trail.push(r); if (i % 2 === 0) await grab('climb', { x: W - 360, y: 0, width: 360, height: H }); if (r.up && r.mode === 'idle' && r.a >= 1) break; }
  const between = trail.filter(r => r.a > 0.05 && Math.abs(r.y - ground) > 2 && Math.abs(r.y - branch) > 2);
  check('up the tree: never seen halfway', between.length === 0, `${between.length} frames with her visible between the ground and the branch`);
  const last = trail[trail.length - 1];
  check('up the tree: arrives on the branch', last.up && Math.abs(last.y - branch) <= 2 && last.a >= 1, `ends at y ${Math.round(last.y)} (branch ${Math.round(branch)}), fully shown ${last.a >= 1}`);
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

// ---- 5. bubbles up close: the locked door, then the key under the mat
{
  await q(`void s.act(s.hots.get('door'))`);
  for (let i = 0; i < FPS * 5; i++) { await step(1); await sampleBubble('close-up, door', 's.girl.img'); if (i > FPS && !(await q('s.busy'))) break; }
  judgeBubbles('close-up, door');
  await q(`void s.act(s.hots.get('mat'))`);
  for (let i = 0; i < FPS * 5; i++) { await step(1); if (await sampleBubble('close-up, key', 's.girl.img')) await grab('bubble'); }
  judgeBubbles('close-up, key');
  await film('bubble', 3);
}

check('no errors in the page', errs.length === 0, errs.slice(0, 3).join(' | ') || 'none');
await b.close(); srv.kill();
const failed = results.filter(r => !r.ok);
const held = results.filter(r => r.waiting).length;
console.log(`\n${results.length - failed.length - held}/${results.length - held} pass${held ? `, ${held} waiting on art` : ''}; filmstrips in ${OUT}`);
if (failed.length) process.exit(1);
