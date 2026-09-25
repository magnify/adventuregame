// The diorama's checks: plays the street with real taps, frame by frame (the page only moves when this steps it),
// and measures what Brian would otherwise catch by eye. Screenshots of each moment go to tests/shots/diorama.
// Usage: node tests/diorama.mjs [build dir]
import { launch } from './browser.mjs';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
const DIR = process.argv[2] || 'dist-demo', OUT = 'tests/shots/diorama', PORT = 4193; fs.mkdirSync(OUT, { recursive: true });
const srv = spawn('python3', ['-m', 'http.server', String(PORT), '--directory', DIR], { stdio: 'ignore' });
await new Promise(r => setTimeout(r, 1200));
const b = await launch(); const errs = [], results = [];
const waiting = (name, detail) => console.log(`wait  ${name.padEnd(46)} ${detail}`); // its fix is waiting on art; shown, never skipped silently
const check = (name, ok, detail) => { results.push({ name, ok }); console.log(`${ok ? 'pass' : 'FAIL'}  ${name.padEnd(46)} ${detail}`); };

for (const [name, vp] of [['landscape', { width: 960, height: 540 }], ['portrait', { width: 390, height: 844 }]]) {
  const p = await b.newPage({ viewport: vp }); p.on('pageerror', e => errs.push(`${name}: ${e.message}`));
  await p.goto(`http://localhost:${PORT}/diorama.html?test`); await p.evaluate(() => localStorage.clear());
  await p.reload(); await p.waitForFunction(() => document.body.dataset.ready === '1', null, { timeout: 60000 });
  const step = (n = 1) => p.evaluate(n => window.__dio.step(n).then(() => 0), n);
  const q = f => p.evaluate(f);
  // headless Chrome only draws a frame when asked, so the page's own fades would start at the moment of capture:
  // draw once to start them, let them finish, then capture what a player sees
  const shot = async tag => { await p.screenshot(); await p.waitForTimeout(700); await p.screenshot({ path: `${OUT}/${name}-${tag}.png` }); };
  const until = async (f, max = 300) => { for (let i = 0; i < max; i++) { if (await q(f)) return true; await step(1); } return false; };
  const tapOn = async thing => { const c = await p.evaluate(t => window.__dio.at(t), thing); await p.mouse.click(c.x, c.y); };
  const tag = s => `${name}: ${s}`;

  // a bubble, measured against its speaker: tail on their head, all of it on screen, clear of her face
  const bubble = speaker => q(new Function(`const el = [...document.querySelectorAll('.bubble')].pop(); if (!el) return null;
    const r = el.getBoundingClientRect(), [tx, ty] = el.dataset.tip.split(',').map(Number), s = window.__dio.box('${speaker}'), g = window.__dio.box('girl');
    const w = s.right - s.left, head = '${speaker}' === 'girl' ? { l: s.left + w * 0.28, r: s.right - w * 0.28 } : { l: s.left, r: s.right };
    const aimed = tx >= head.l - 12 && tx <= head.r + 12 && ty >= s.top - 40 && ty <= s.top + s.h * 0.45;
    const on = r.left >= 0 && r.top >= 0 && r.right <= innerWidth && r.bottom <= innerHeight;
    const gw = g.right - g.left, face = { l: g.left + gw * 0.3, r: g.right - gw * 0.3, t: g.top, b: g.top + g.h * 0.3 };
    const overFace = Math.min(r.right, face.r) - Math.max(r.left, face.l) > 8 && Math.min(r.bottom, face.b) - Math.max(r.top, face.t) > 8;
    return { text: el.textContent, aimed, on, overFace };`));
  const judge = async (what, speaker, shotTag) => {
    const seen = await until(() => !!document.querySelector('.bubble.in'), 400); await step(8); const r = seen && await bubble(speaker);
    if (shotTag) await shot(shotTag);
    check(tag(`bubble (${what}) shows`), !!r, r ? `"${r.text}"` : 'no bubble');
    if (r) check(tag(`bubble (${what}) on its speaker`), r.aimed && r.on && !r.overFace, `points at ${speaker}: ${r.aimed}, on screen: ${r.on}, over her face: ${r.overFace}`);
    await until(() => !document.querySelector('.bubble'), 200);
  };
  const inView = r => r.left >= 0 && r.top >= 0 && r.right <= vp.width && r.bottom <= vp.height;
  const overlap = (a, b) => Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left)) * Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));
  const cardBox = () => q(() => { const r = document.querySelector('#ui .card > div')?.getBoundingClientRect(); return r && { left: r.left, right: r.right, top: r.top, bottom: r.bottom }; });

  // ---- the tree grows from its bed of earth: the bottom of its roots is in the soil, not on the stone
  { const tr = await q(() => window.__dio.box('tree')), bd = await q(() => window.__dio.box('bed')), soil = [bd.top + bd.h * 0.2, bd.bottom - bd.h * 0.25];
    check(tag('tree: roots end in its bed of earth'), tr.bottom >= soil[0] && tr.bottom <= soil[1], `roots end at y ${tr.bottom.toFixed(0)}, soil ${soil.map(v => v.toFixed(0)).join('-')}`); }

  // ---- the start card, then her first line
  await step(5); await shot('0-card');
  // the critic: the card hid her, the tree wasn't in the opening frame, her face was a few pixels, and play is wordless
  { const c = await cardBox(), g = await q(() => window.__dio.box('girl')), t = await q(() => window.__dio.box('tree'));
    check(tag('start card clear of her'), overlap(c, g) === 0, overlap(c, g) ? 'the card covers her' : 'she is in view beside it');
    check(tag('start card has no words to read in play'), await q(() => !document.querySelector('#ui .card p')), 'title and two buttons');
    const seen = Math.max(0, Math.min(t.right, vp.width) - Math.max(t.left, 0)) / (t.right - t.left);
    if (name === 'landscape') {
      const glint = await q(() => window.__dio.glint());
      check(tag('the tree is in the opening frame'), seen >= 0.6 && glint.x > 0 && glint.x < vp.width && glint.y > 0 && glint.y < vp.height, `${Math.round(seen * 100)}% of the tree in view, the glint in the tree at ${Math.round(glint.x)},${Math.round(glint.y)}`);
      check(tag('she is big enough to read on the street'), g.h >= vp.height * 0.3, `${Math.round(g.h)} px tall, ${Math.round(g.h / vp.height * 100)}% of the screen`);
    } }
  check(tag('start card offers Dansk and English'), await q(() => [...document.querySelectorAll('#ui button')].map(b => b.textContent).join('/') === 'Dansk/English'), 'Dansk / English');
  await p.click('#ui button'); await step(2);
  await judge('first line', 'girl', '1-start');

  // ---- a real tap on the paving: she walks; the camera turns a little, smoothly, and keeps her in view
  const x0 = await q(() => window.__dio.her.x); const yaws = [], seen = [];
  await p.mouse.click(vp.width * (name === "portrait" ? 0.9 : 0.6), vp.height * 0.72); // open paving, short of the tree
  check(tag('every tap answers where the finger lands'), await q(() => !!document.querySelector('.tapmark')), 'a ring of light at the tap');
  for (let i = 0; i < 90; i++) { await step(1); yaws.push(await q(() => window.__dio.yaw())); seen.push(inView(await q(() => window.__dio.box('girl')))); if (i === 30) await shot('2-walking'); }
  const x1 = await q(() => window.__dio.her.x);
  check(tag('a tap on the paving walks her there'), x1 > x0 + 1, `${x0.toFixed(2)} -> ${x1.toFixed(2)}`);
  const maxYaw = Math.max(...yaws.map(Math.abs)), jolt = Math.max(0, ...yaws.slice(1).map((y, i) => Math.abs(y - yaws[i])));
  check(tag('camera turns gently as she walks'), maxYaw > 0.02 && maxYaw <= 0.2 && jolt < 0.01, `turns up to ${(maxYaw * 57.3).toFixed(1)} deg, largest change ${(jolt * 57.3).toFixed(2)} deg a frame`);
  check(tag('she stays in view while walking'), seen.every(Boolean), `${seen.filter(v => !v).length} frames partly out of view`);
  if (name === 'portrait') { await p.close(); continue; }

  // ---- the cat: a real tap, and the cat says it
  await until(() => !window.__dio.busy(), 100); await tapOn('cat'); await judge('cat', 'cat', '3-cat'); await until(() => !window.__dio.busy(), 200);

  // ---- up the tree: a real tap on the tree; she fades up, the camera swings in to the door
  await tapOn('tree'); const up = await until(() => window.__dio.her.up && !window.__dio.busy(), 400); await step(75); await shot('4-up-close');
  const door = await q(() => window.__dio.box('door')), girl = await q(() => window.__dio.box('girl'));
  check(tag('up the tree: arrives on the branch'), up, up ? 'up' : 'never got up');
  check(tag('close-up: door big enough to tap'), door.h >= 70, `door ${door.h.toFixed(0)} px tall`);
  check(tag('close-up: door and all of her in view'), inView(door) && inView(girl), `door ${inView(door)}, girl ${inView(girl)}`);

  // ---- the puzzle: the door is locked, the key is under the mat, it goes in the pocket, the pocket opens the door
  await tapOn('door'); await judge('locked door', 'girl', '5-locked'); await until(() => !window.__dio.busy(), 200);
  await tapOn('mat'); await until(() => window.__dio.flags.matUp, 200);
  check(tag('lifting the mat shows the key'), await q(() => window.__dio.visible('key')), 'key visible');
  await judge('key found', 'girl', '6-key'); await until(() => !window.__dio.busy(), 200);
  await tapOn('key'); await until(() => window.__dio.pocket.has('key') && !window.__dio.busy(), 200); await step(10); await shot('7-pocket');
  await p.waitForTimeout(700); // the pocket fades in on the page's own clock
  check(tag('tapping the key puts it in the pocket, in sight'), await q(() => { const e = document.getElementById('pocket'), r = e.getBoundingClientRect(), top = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
    return window.__dio.pocket.has('key') && +getComputedStyle(e).opacity > 0.95 && e.contains(top) && r.left > -r.width / 2 && r.bottom <= innerHeight; }), 'in the pocket, and the pocket is on screen, on top');
  await p.click('#pocket'); await step(2); await tapOn('door');
  await judge('door opens', 'girl', '8-wow');
  // the story: a bright light, and when her eyes adjust she sees a meadow through the door
  if (fs.existsSync(`${DIR}/art/street-door-open-meadow.webp`)) { const pic = await q(() => window.__dio.doorPicture()); check(tag('through the open door: the meadow'), pic === 'street-door-open-meadow', `the door shows ${pic}`); }
  else waiting(tag('through the open door: the meadow'), 'the meadow glimpse is being drawn');
  // then she leans closer and is pulled through, and the camera leans in with her until the door fills the view
  { let d = null; for (let i = 0; i < 60; i++) { await step(1); const b = await q(() => window.__dio.box('door')); if (!d || b.h > d.h) d = b; }
    await shot('8b-through'); check(tag('the door fills the view as she goes through'), d.h >= vp.height * 0.4, `door up to ${Math.round(d.h)} px tall`); }
  // after the slam, the key has to be seen falling back under the mat
  let keyBack = 0, through = false;
  for (let i = 0; i < 400 && !through; i++) { await step(1); const r = await q(() => ({ t: window.__dio.flags.through, k: window.__dio.visible('key'), card: !!document.querySelector('#ui .card') })); if (r.t && r.k) keyBack++; through = r.t && r.card; }
  await shot('9-end');
  { const c = await cardBox(), d = await q(() => window.__dio.box('door')); check(tag('end card clear of the door'), !!c && overlap(c, d) === 0, c ? (overlap(c, d) ? 'the card covers the door' : 'the door stays in view') : 'no end card'); }
  check(tag('pocket, then door: she goes through'), through, through ? 'through, end card shown' : 'did not go through');
  check(tag('the key rattles back under the mat'), keyBack > 5 && await q(() => !window.__dio.visible('key') && Math.abs(window.__dio.mat()) < 0.01), `key seen falling back for ${keyBack} frames, then covered by the mat`);
  if (through) { await p.click('#ui button'); await step(40); check(tag('back to the street starts again'), await q(() => !window.__dio.her.up && !window.__dio.flags.through && window.__dio.visible('girl')), 'reset'); }
  await p.close();
}
check('no errors in the page', errs.length === 0, errs.slice(0, 3).join(' | ') || 'none');
await b.close(); srv.kill();
const failed = results.filter(r => !r.ok); console.log(`\n${results.length - failed.length}/${results.length} pass; screenshots in ${OUT}`);
if (failed.length) process.exit(1);
