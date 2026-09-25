// Plays the whole story through in a headless browser by driving the scenes' own hotspots, and screenshots each place.
// Software WebGL is slow: keep the viewport small and the waits generous.
import { launch } from './browser.mjs';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
const PORT = 4175, OUT = process.env.SHOTS || 'tests/shots'; fs.mkdirSync(OUT, { recursive: true });
const srv = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], { stdio: 'ignore' });
await new Promise(r => setTimeout(r, 2500));
const b = await launch(['--autoplay-policy=no-user-gesture-required']);
const p = await b.newPage({ viewport: { width: 960, height: 540 } });
const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error' && !/ERR_CONNECTION|404|fonts|AudioContext/.test(m.text())) errs.push(m.text().slice(0, 200)); });
const fail = msg => { console.log('FAIL', msg, errs); srv.kill(); process.exit(1); };
await p.goto(`http://localhost:${PORT}/adventuregame/?debug`, { waitUntil: 'domcontentloaded', timeout: 90000 });
await p.evaluate(() => localStorage.clear()); await p.reload({ waitUntil: 'domcontentloaded', timeout: 90000 });
const loaded = () => p.waitForFunction(() => document.getElementById('loading').classList.contains('off'), null, { timeout: 180000 }).catch(() => fail('load'));
const cur = () => p.evaluate(() => window.__game.scene.getScenes(true)[0]?.scene.key);
const state = () => p.evaluate(() => window.__game.scene.getScenes(true)[0]?.state);
const idle = () => p.waitForFunction(() => { const s = window.__game.scene.getScenes(true)[0]; return s && s.started && !s.busy && Math.abs(s.targetX - s.girlX) < 3; }, null, { timeout: 120000 });
const act = async id => { await idle(); await p.evaluate(id => { const s = window.__game.scene.getScenes(true)[0]; const h = s.hots.get(id); if (!h) throw new Error('no hotspot ' + id); return s.act(h); }, id); await idle(); };
const walk = async x => { await idle(); await p.evaluate(x => { window.__game.scene.getScenes(true)[0].walkTo(x); }, x); await idle(); };
const shot = name => p.screenshot({ path: `${OUT}/${name}.png`, timeout: 180000 });
const until = async (key, ms = 60000) => p.waitForFunction(k => window.__game.scene.getScenes(true)[0]?.scene.key === k && window.__game.scene.getScenes(true)[0].started, key, { timeout: ms }).catch(() => fail('did not reach ' + key));

await loaded(); console.log('scene', await cur());
await p.evaluate(() => document.querySelector('#ui button')?.click()); await p.waitForTimeout(500);
await shot('1-street');
// a real finger first: tap the pavement ahead of her and she must walk there (the story below drives hotspots directly)
{ const before = await p.evaluate(() => window.__game.scene.getScenes(true)[0].girlX);
  await p.mouse.click(520, 470); await p.waitForTimeout(3500); // open paving, clear of the tree and its bed
  const after = await p.evaluate(() => window.__game.scene.getScenes(true)[0].girlX);
  if (!(after > before + 100)) fail(`a tap on the ground did not move her (${before} -> ${after})`);
  console.log('tap walk', Math.round(before), '->', Math.round(after));
  await walk(300); }
await act('cat'); await act('door'); console.log('door locked ->', (await state()).pocket);
await act('mat'); await act('key'); console.log('pocket', (await state()).pocket);
await shot('2-street-branch');
// use the key the way a child would: tap the pocket to hold it (tap again to let go), then drag it onto the door
const screenOf = id => p.evaluate(id => { const s = window.__game.scene.getScenes(true)[0]; const h = s.hots.get(id), c = s.cameras.main;
  return { x: (h.x - c.worldView.x) * c.zoom, y: (h.y - h.displayHeight / 2 - c.worldView.y) * c.zoom }; }, id);
await idle(); await p.click('#pocket'); if (!(await p.$eval('#pocket', e => e.classList.contains('held')))) fail('tapping the pocket did not hold the key');
await p.click('#pocket'); if (await p.$eval('#pocket', e => e.classList.contains('held'))) fail('tapping the pocket again did not let go');
{ const pk = await p.$eval('#pocket', e => { const r = e.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; }); const d = await screenOf('door');
  await p.mouse.move(pk.x, pk.y); await p.mouse.down(); await p.mouse.move(pk.x + 40, pk.y - 40, { steps: 4 }); await p.mouse.move(d.x, d.y, { steps: 10 }); await p.mouse.up(); console.log('dragged key to door'); }
await until('meadow', 90000); console.log('scene', await cur());
await p.waitForTimeout(6000); await shot('3-meadow');
await act('beetle'); await walk(2900); await until('forest'); console.log('scene', await cur());
await act('signpost'); await walk(3300); await shot('4-forest-mid'); await walk(6050); await until('swamp', 120000); console.log('scene', await cur());
await p.waitForTimeout(1500); await walk(1500); await p.waitForFunction(() => window.__game.scene.getScenes(true)[0].stuck, null, { timeout: 30000 }).catch(() => fail('did not get stuck'));
await p.waitForFunction(() => !window.__game.scene.getScenes(true)[0].busy, null, { timeout: 30000 }); await shot('5-swamp-stuck');
await act('barlin-hot'); console.log('freed, pocket', (await state()).pocket);
await walk(3150); await p.waitForTimeout(6000); await shot('6-witch-house');
console.log('errors', errs.length ? errs : 'none');
await b.close(); srv.kill();
if (errs.length) process.exit(1);
