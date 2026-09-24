import Phaser from 'phaser';
import { L } from './lines.js';

/**
 * A speech bubble: a scrap of cream paper with a few simple words (a line id from lines.js, in the chosen language),
 * popping up above a point and fading after long enough to read. Returns a promise that resolves when it's gone.
 */
export function bubble(scene, x, y, line, opts = {}) {
  const { ms, tone = 0xf3ead8, depth = 50, tail = true } = opts;
  const words = L(line);
  const text = scene.add.text(0, 0, words, { fontFamily: 'Gaegu, sans-serif', fontStyle: 'bold', fontSize: '34px', color: '#4a3a2e', align: 'center', wordWrap: { width: 360 } }).setOrigin(0.5);
  const padX = 22, padY = 12, w = Math.max(80, text.width + padX * 2), h = text.height + padY * 2;
  // above the speaker if there's room on screen; in a close-up there often isn't, so it goes beside their head
  const view = scene.cameras.main.worldView, sp = opts.speaker;
  let bx = x, by = y - 24;
  if (by - h < view.y + 8 && sp) {
    by = Math.max(view.y + h + 30, sp.top + h + 20);
    bx = sp.right + w / 2 + 14; if (bx + w / 2 > view.right - 8) bx = sp.left - w / 2 - 14;
  } else by = Math.max(view.y + h + 30, by);
  const c = scene.add.container(bx, by).setDepth(depth);
  // cream paper with a soft cast shadow, no ink line: the same stuff as everything else on screen
  const g = scene.add.graphics();
  const card = (dx, dy, color, alpha) => { g.fillStyle(color, alpha); g.fillRoundedRect(-w / 2 + dx, -h + dy, w, h, 22); if (tail) g.fillTriangle(-13 + dx, -4 + dy, 11 + dx, -4 + dy, 2 + dx, 15 + dy); };
  card(3, 7, 0x3c2d1e, 0.18); card(1, 2, 0x5a4636, 0.2); card(0, 0, tone, 1);
  text.setPosition(0, -h / 2);
  c.add([g, text]); c.setAngle(-1.5 + Math.random() * 3);
  c.setScale(0.4); c.setAlpha(0);
  scene.tweens.add({ targets: c, scale: 1, alpha: 1, duration: 220, ease: 'Back.Out' });
  scene.sfx?.play('pop', { volume: 0.35 });
  const stay = ms ?? 1100 + words.length * 55; // long enough for a grown-up to read it aloud
  return new Promise(res => scene.time.delayedCall(stay, () => { scene.tweens.add({ targets: c, alpha: 0, scale: 0.8, duration: 160, onComplete: () => { c.destroy(); res(); } }); }));
}

/**
 * Say a line above someone. The bubble sits above the top of whoever speaks, worked out from what's on screen,
 * so it never lands on a face whatever size or pose they're in.
 */
export function say(scene, who, line, opts = {}) {
  const src = who.img || who; // a character's picture, not its glow or shadow
  const b = src.getBounds ? src.getBounds() : { centerX: who.x, top: who.y - (opts.height ?? 220) };
  return bubble(scene, b.centerX + (opts.dx || 0), b.top - 6 + (opts.dy || 0), line, { ...opts, speaker: b.right !== undefined ? b : null });
}
