// Tests the exact files a demo link serves (a relative-path build), as plain static files, on phone and tablet touch screens.
// Usage: npm run demo-check -- <build dir> [screenshot dir]
import { launch } from './browser.mjs';
import { spawn } from 'node:child_process';
const DIR = process.argv[2] || 'dist-demo', OUT = process.argv[3] || 'tests/shots'; import('node:fs').then(fs => fs.mkdirSync(OUT, { recursive: true }));
const srv = spawn('python3', ['-m', 'http.server', '4190', '--directory', DIR], { stdio: 'ignore' });
await new Promise(r => setTimeout(r, 1500));
const b = await launch();
const results = [];
for (const [name, vp] of [['phone landscape', { width: 844, height: 390 }], ['phone portrait', { width: 390, height: 844 }], ['tablet', { width: 1180, height: 820 }]]) {
  const ctx = await b.newContext({ viewport: vp, hasTouch: true, isMobile: true, deviceScaleFactor: 2 });
  const p = await ctx.newPage(); const errs = []; const missing = [];
  p.on('pageerror', e => errs.push(e.message)); p.on('response', r => { if (r.status() >= 400) missing.push(r.url().replace('http://localhost:4190/', '') + ' ' + r.status()); });
  await p.goto('http://localhost:4190/index.html', { timeout: 90000 });
  await p.waitForFunction(() => document.getElementById('loading').classList.contains('off'), null, { timeout: 180000 });
  await p.waitForTimeout(800); await p.screenshot({ path: `${OUT}/demo-${name.replace(' ', '-')}-start.png` });
  const btn = await p.$('#ui button'); if (btn) await btn.tap(); await p.waitForTimeout(800);
  const x0 = await p.evaluate(() => window.__game.scene.getScenes(true)[0].girlX);
  await p.touchscreen.tap(vp.width * 0.8, vp.height * 0.85); await p.waitForTimeout(4000);
  const x1 = await p.evaluate(() => window.__game.scene.getScenes(true)[0].girlX);
  await p.screenshot({ path: `${OUT}/demo-${name.replace(' ', '-')}-walked.png` });
  results.push(`${name}: loaded, begin tapped, tap-walk ${Math.round(x0)} -> ${Math.round(x1)} ${x1 > x0 + 60 ? 'OK' : 'FAIL'}; errors ${errs.length ? errs.join(' | ') : 'none'}; missing files ${missing.filter(m => !/fonts\.g/.test(m)).join(', ') || 'none'}`);
  await ctx.close();
}
console.log(results.join('\n')); await b.close(); srv.kill(); if (results.some(r => / FAIL|errors (?!none)|missing files (?!none)/.test(r))) process.exit(1);
