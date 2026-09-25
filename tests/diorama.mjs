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
const check = (name, ok, detail) => { results.push({ name, ok }); console.log(`${ok ? 'pass' : 'FAIL'}  ${name.padEnd(46)} ${detail}`); };

for (const [name, vp] of [['landscape', { width: 960, height: 540 }], ['portrait', { width: 390, height: 844 }]]) {
  const p = await b.newPage({ viewport: vp }); p.on('pageerror', e => errs.push(`${name}: ${e.message}`));
  await p.goto(`http://localhost:${PORT}/diorama.html?test`); await p.evaluate(() => localStorage.clear());
  await p.reload(); await p.waitForFunction(() => document.body.dataset.ready === '1', null, { timeout: 60000 });
  const step = (n = 1) => p.evaluate(n => window.__dio.step(n).then(() => 0), n);
  const q = f => p.evaluate(f);
  const shot = async tag => { await p.waitForTimeout(400); await p.screenshot({ path: `${OUT}/${name}-${tag}.png` }); }; // lets the page's own fades finish first
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

  // ---- the start card, then her first line
  await step(5); await shot('0-card');
  check(tag('start card offers Dansk and English'), await q(() => [...document.querySelectorAll('#ui button')].map(b => b.textContent).join('/') === 'Dansk/English'), 'Dansk / English');
  await p.click('#ui button'); await step(2);
  await judge('first line', 'girl', '1-start');

  // ---- a real tap on the paving: she walks; the camera turns a little, smoothly, and keeps her in view
  const x0 = await q(() => window.__dio.her.x); const yaws = [], seen = [];
  await p.mouse.click(vp.width * 0.9, vp.height * 0.72);
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
  check(tag('tapping the key puts it in the pocket'), await q(() => window.__dio.pocket.has('key') && !document.getElementById('pocket').classList.contains('empty')), 'in the pocket, shown');
  await p.click('#pocket'); await step(2); await tapOn('door');
  await judge('door opens', 'girl', '8-wow');
  const through = await until(() => window.__dio.flags.through && !!document.querySelector('#ui .card'), 400); await shot('9-end');
  check(tag('pocket, then door: she goes through'), through, through ? 'through, end card shown' : 'did not go through');
  if (through) { await p.click('#ui button'); await step(40); check(tag('back to the street starts again'), await q(() => !window.__dio.her.up && !window.__dio.flags.through && window.__dio.visible('girl')), 'reset'); }
  await p.close();
}
check('no errors in the page', errs.length === 0, errs.slice(0, 3).join(' | ') || 'none');
await b.close(); srv.kill();
const failed = results.filter(r => !r.ok); console.log(`\n${results.length - failed.length}/${results.length} pass; screenshots in ${OUT}`);
if (failed.length) process.exit(1);
