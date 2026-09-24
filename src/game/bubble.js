import Phaser from 'phaser';
import { L } from './lines.js';

/**
 * A speech bubble: a scrap of cream paper with a few simple words (a line id from lines.js, in the chosen language).
 * It hangs on its speaker: every frame it finds their head again, sits above it (or beside it when there's no room
 * above, as in a close-up), and its tail points at them, so it never drifts off when they move or the view zooms.
 * Returns a promise that resolves when it's gone.
 */
export function bubble(scene, x, y, line, opts = {}) {
  const { ms, tone = 0xf3ead8, depth = 50, tail = true } = opts;
  const words = L(line);
  const text = scene.add.text(0, 0, words, { fontFamily: 'Mali, sans-serif', fontStyle: 'bold', fontSize: '27px', color: '#4a3a2e', align: 'center', wordWrap: { width: 360 } }).setOrigin(0.5);
  const padX = 22, padY = 12, w = Math.max(80, text.width + padX * 2), h = text.height + padY * 2, T = 16, M = 8;
  // the container sits on the tail's tip, so it pops out of the speaker's head and tipX/tipY are 0
  const c = scene.add.container(x, y).setDepth(depth); c.tipX = 0; c.tipY = 0;
  const g = scene.add.graphics(); c.add([g, text]);
  let drawn = '';
  const head = () => { const sp = opts.follow?.(); return sp || { centerX: x, top: y, right: x, left: x, height: 0 }; };
  const place = () => {
    if (!c.active) return;
    const b = head(), v = scene.cameras.main.worldView;
    let tip, cx, cy, side = 'above';
    tip = { x: b.centerX, y: b.top - 6 };
    if (tip.y - T - h < v.y + M && opts.follow) { // no room above: beside the head, facing it
      side = b.right + T + w + M <= v.right ? 'right' : 'left';
      tip = { x: side === 'right' ? b.right + 2 : b.left - 2, y: b.top + b.height * 0.18 };
    }
    if (side === 'above') { cx = Phaser.Math.Clamp(0, v.x + M + w / 2 - tip.x, v.right - M - w / 2 - tip.x); cy = -T - h / 2; }
    else { cx = (side === 'right' ? 1 : -1) * (T + w / 2); cy = Phaser.Math.Clamp(0, v.y + M + h / 2 - tip.y, v.bottom - M - h / 2 - tip.y); }
    c.setPosition(tip.x, tip.y);
    const key = `${side}|${Math.round(cx)}|${Math.round(cy)}`; if (key === drawn) return; drawn = key;
    // cream paper with a soft cast shadow, no ink line: the same stuff as everything else on screen
    g.clear();
    const card = (dx, dy, color, alpha) => {
      g.fillStyle(color, alpha); g.fillRoundedRect(cx - w / 2 + dx, cy - h / 2 + dy, w, h, 22);
      if (!tail) return;
      if (side === 'above') { const bx = Phaser.Math.Clamp(0, cx - w / 2 + 24, cx + w / 2 - 24); g.fillTriangle(bx - 12 + dx, -T - 2 + dy, bx + 12 + dx, -T - 2 + dy, dx, dy); }
      else { const ex = cx - Math.sign(cx) * (w / 2 - 2), by = Phaser.Math.Clamp(0, cy - h / 2 + 20, cy + h / 2 - 20); g.fillTriangle(ex + dx, by - 11 + dy, ex + dx, by + 11 + dy, dx, dy); }
    };
    card(3, 7, 0x3c2d1e, 0.18); card(1, 2, 0x5a4636, 0.2); card(0, 0, tone, 1);
    text.setPosition(cx, cy);
  };
  place(); scene.events.on('update', place); c.once('destroy', () => scene.events.off('update', place));
  c.setAngle(-1.5 + Math.random() * 3);
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
  const follow = src.getBounds ? () => { if (!src.active) return null; const b = src.getBounds(); return { centerX: b.centerX + (opts.dx || 0), top: b.top + (opts.dy || 0), left: b.left, right: b.right, height: b.height }; } : null;
  const b = follow ? follow() : { centerX: who.x, top: who.y - (opts.height ?? 220) };
  return bubble(scene, b.centerX, b.top - 6, line, { ...opts, follow });
}
