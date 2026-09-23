// Close-ups of the girl in every pose, twice each, so a loose joint shows up in a screenshot, not on a child's tablet.
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
const PORT = 4181, OUT = process.env.SHOTS || 'tests/shots'; fs.mkdirSync(OUT, { recursive: true });
const srv = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], { stdio: 'ignore' });
await new Promise(r => setTimeout(r, 2500));
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport: { width: 960, height: 540 }, deviceScaleFactor: 3 });
await p.goto(`http://localhost:${PORT}/adventuregame/`, { timeout: 90000 });
await p.waitForFunction(() => document.getElementById('loading').classList.contains('off'), null, { timeout: 180000 });
await p.evaluate(() => document.querySelector('#ui button')?.click()); await p.waitForTimeout(500);
for (const m of ['idle', 'walk', 'climb', 'reach', 'stuck']) {
  for (const t of [0, 1]) {
    const box = await p.evaluate(m => { const s = window.__game.scene.getScenes(true)[0]; s.frozen = true; s.girl.play(m); const c = s.cameras.main; const g = s.girl.getBounds(); return { x: (g.x - c.worldView.x) * c.zoom, y: (g.y - c.worldView.y) * c.zoom, w: g.width * c.zoom, h: g.height * c.zoom }; }, m);
    await p.waitForTimeout(t ? 170 : 430);
    await p.screenshot({ path: `${OUT}/pose-${m}-${t}.png`, clip: { x: Math.max(0, box.x - 30), y: Math.max(0, box.y - 20), width: box.w + 60, height: box.h + 40 } });
  }
}
console.log('poses written to', OUT);
await b.close(); srv.kill();
