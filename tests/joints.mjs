// Joint check: poses both puppets through every animation, draws each part exactly where the game puts it,
// and measures how much of each limb, wing and hat overlaps the body it hangs from. A part that comes loose
// fails here, and every pose is written to a contact sheet to look at before anyone else has to.
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
const PORT = 4185, OUT = process.env.SHOTS || 'tests/shots'; fs.mkdirSync(OUT, { recursive: true });
const MIN = 0.5; // at least half of each part's root (the paper around its pin) must lie over its parent, in every pose
const srv = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], { stdio: 'ignore' });
await new Promise(r => setTimeout(r, 2500));
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport: { width: 960, height: 540 } });
const load = () => p.waitForFunction(() => document.getElementById('loading').classList.contains('off'), null, { timeout: 180000 });
await p.goto(`http://localhost:${PORT}/adventuregame/`, { timeout: 90000 }); await load();
await p.evaluate(() => { localStorage.clear(); localStorage.setItem('three-suns:scene', '"meadow"'); }); await p.reload(); await load();
await p.waitForTimeout(1500);

const result = await p.evaluate(({ MIN }) => {
  const s = window.__game.scene.getScenes(true)[0]; s.sys.pause();
  const W = 520, H = 520;
  const draw = (ctx, img, ox, oy) => {
    const m = img.getWorldTransformMatrix(); const src = img.texture.getSourceImage();
    ctx.setTransform(m.a, m.b, m.c, m.d, m.tx + ox, m.ty + oy);
    if (img.flipX) { ctx.scale(-1, 1); }
    ctx.drawImage(src, -img.displayOriginX, -img.displayOriginY);
  };
  const mask = (img, ox, oy) => { const c = new OffscreenCanvas(W, H); const x = c.getContext('2d'); draw(x, img, ox, oy); const d = x.getImageData(0, 0, W, H).data; const m = new Uint8Array(W * H); for (let i = 0; i < m.length; i++) m[i] = d[i * 4 + 3] > 128 ? 1 : 0; return m; };
  const frames = [], fails = [], worst = {};
  const check = (who, pose, parts, parent, children, anchor) => {
    const ox = W / 2 - anchor.x, oy = anchor.y;
    const pm = mask(parent, ox, oy);
    for (const [name, img] of Object.entries(children)) {
      if (!img || !img.visible) continue;
      // the root: this part's own paper within a small radius of its pin
      const m = img.getWorldTransformMatrix(); const px = m.tx + ox, py = m.ty + oy; const sc = Math.hypot(m.a, m.b);
      const r = 0.3 * Math.min(img.displayWidth, img.displayHeight) * sc / Math.abs(img.scaleX || 1) ;
      const cm = mask(img, ox, oy); let area = 0, over = 0;
      for (let y = Math.max(0, Math.floor(py - r)); y < Math.min(H, py + r); y++) for (let x = Math.max(0, Math.floor(px - r)); x < Math.min(W, px + r); x++) {
        const i = y * W + x; if (!cm[i] || (x - px) ** 2 + (y - py) ** 2 > r * r) continue; area++; if (pm[i]) over++; }
      // and the other way round: the parent's own paper around that pin, covered by the part (a head over its neck)
      let pa = 0, pc = 0;
      for (let y = Math.max(0, Math.floor(py - r)); y < Math.min(H, py + r); y++) for (let x = Math.max(0, Math.floor(px - r)); x < Math.min(W, px + r); x++) {
        const i = y * W + x; if (!pm[i] || (x - px) ** 2 + (y - py) ** 2 > r * r) continue; pa++; if (cm[i]) pc++; }
      const share = Math.max(area ? over / area : 0, pa > 20 ? pc / pa : 0); const k = `${who} ${name}`; worst[k] = Math.min(worst[k] ?? 1, share);
      if (share < MIN) fails.push(`${k} in ${pose}: only ${(share * 100).toFixed(0)}% of its root on the body`);
    }
    const c = new OffscreenCanvas(W, H); const x = c.getContext('2d');
    for (const img of parts) if (img.visible) draw(x, img, ox, oy);
    const d = x.getImageData(0, 0, W, H).data; let x0 = W, y0 = H, x1 = 0, y1 = 0;
    for (let yy = 0; yy < H; yy++) for (let xx = 0; xx < W; xx++) if (d[(yy * W + xx) * 4 + 3] > 20) { x0 = Math.min(x0, xx); y0 = Math.min(y0, yy); x1 = Math.max(x1, xx); y1 = Math.max(y1, yy); }
    frames.push({ who, pose, c, box: [x0, y0, x1 - x0 + 1, y1 - y0 + 1] });
  };
  // the girl: every mode, eight moments through its cycle
  const g = s.girl; const P = g.parts; const gAnchor = { x: g.x, y: H - 30 - g.y };
  for (const mode of ['idle', 'walk', 'climb', 'reach', 'stuck']) for (let i = 0; i < 8; i++) {
    g.play(mode); g.t = i * 0.09; g.tick(0);
    const order = g.list.filter(o => o.visible);
    check('girl', `${mode} ${i}`, order, P.body, { head: P.head, 'arm-l': P['arm-l'], 'arm-r': P['arm-r'], 'leg-l': P['leg-l'], 'leg-r': P['leg-r'] }, gAnchor);
  }
  // Barlin: a full flap, both ways round
  const bl = s.barlin; bl.setVisible(true); const bAnchor = { x: bl.x, y: H / 2 - bl.y };
  for (const dir of [1, -1]) for (let i = 0; i < 8; i++) {
    bl.face(dir); bl.t = i * (Math.PI * 2 / 16) / 8; bl.tick(0, 0);
    const order = bl.list.filter(o => o.visible && o !== bl.glow);
    check('barlin', `flap ${dir > 0 ? 'right' : 'left'} ${i}`, order, bl.body, { 'wing-back': bl.wingBack, 'wing-front': bl.wingFront, hat: bl.hat }, bAnchor);
  }
  // contact sheet
  const cols = 8, cw = 200, ch = 220; const rows = Math.ceil(frames.length / cols);
  const sheet = new OffscreenCanvas(cols * cw, rows * ch); const sx = sheet.getContext('2d'); sx.fillStyle = '#fff'; sx.fillRect(0, 0, sheet.width, sheet.height);
  sx.fillStyle = '#efe9df';
  frames.forEach((f, i) => { const [bx, by, bw, bh] = f.box; const k = Math.min((cw - 12) / bw, (ch - 12) / bh); const X = (i % cols) * cw, Y = Math.floor(i / cols) * ch;
    sx.fillRect(X + 2, Y + 2, cw - 4, ch - 4); sx.drawImage(f.c, bx, by, bw, bh, X + (cw - bw * k) / 2, Y + (ch - bh * k) / 2, bw * k, bh * k); });
  return sheet.convertToBlob().then(bl => bl.arrayBuffer()).then(ab => ({ png: Array.from(new Uint8Array(ab)), fails, worst }));
}, { MIN });

fs.writeFileSync(`${OUT}/joints.png`, Buffer.from(result.png));
for (const [k, v] of Object.entries(result.worst)) console.log(k.padEnd(20), 'at worst', (v * 100).toFixed(1) + '% over its body');
await b.close(); srv.kill();
if (result.fails.length) { console.log('FAIL', result.fails.length, 'loose joints:\n ' + [...new Set(result.fails)].slice(0, 12).join('\n ')); process.exit(1); }
console.log('joints hold in every pose; sheet at', `${OUT}/joints.png`);
