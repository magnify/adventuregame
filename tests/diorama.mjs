// Walks the diorama street frame by frame and screenshots the moments worth judging. Usage: node tests/diorama.mjs [build dir]
import { launch } from './browser.mjs';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
const DIR = process.argv[2] || 'dist-demo', OUT = 'tests/shots/diorama', PORT = 4193; fs.mkdirSync(OUT, { recursive: true });
const srv = spawn('python3', ['-m', 'http.server', String(PORT), '--directory', DIR], { stdio: 'ignore' });
await new Promise(r => setTimeout(r, 1200));
const b = await launch(); const errs = [];
for (const [name, vp] of [['landscape', { width: 960, height: 540 }], ['portrait', { width: 390, height: 844 }]]) {
  const p = await b.newPage({ viewport: vp }); p.on('pageerror', e => errs.push(e.message));
  await p.goto(`http://localhost:${PORT}/diorama.html?test`); await p.waitForFunction(() => document.body.dataset.ready === '1', null, { timeout: 60000 });
  const step = n => p.evaluate(n => window.__dio.step(n).then(() => 0), n); const shot = tag => p.screenshot({ path: `${OUT}/${name}-${tag}.png` });
  await step(60); await shot('1-start');
  if (name === 'portrait') { await p.close(); continue; }
  await p.evaluate(() => void window.__dio.walkTo(9)); await step(40); await shot('2-walking');
  await step(90); await shot('3-by-the-lamp');
  await p.evaluate(() => void window.__dio.climb()); await step(30 * 7); await shot('4-up-close');
  await p.evaluate(() => void window.__dio.descend()); await step(30 * 3); await shot('5-back-down');
  await p.close();
}
console.log('errors', errs.length ? errs : 'none'); await b.close(); srv.kill(); if (errs.length) process.exit(1);
