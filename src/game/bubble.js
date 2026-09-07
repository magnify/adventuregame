import Phaser from 'phaser';

/**
 * A picture bubble: a rounded card with pictograms, popping up above a point and fading after a while.
 * Icons are keys under art/src/icon (e.g. 'key', 'question'). Returns a promise that resolves when it's gone.
 */
export function bubble(scene, x, y, icons, { ms = 1600, tone = 0xfbf6ec, depth = 50, size = 52, tail = true } = {}) {
  const pad = 14, gap = 8, w = icons.length * size + (icons.length - 1) * gap + pad * 2, h = size + pad * 2;
  const c = scene.add.container(x, y - 24).setDepth(depth);
  const g = scene.add.graphics();
  g.fillStyle(tone, 1); g.lineStyle(4, 0x2b2a33, 1);
  g.fillRoundedRect(-w / 2, -h, w, h, 18); g.strokeRoundedRect(-w / 2, -h, w, h, 18);
  if (tail) { g.fillTriangle(-12, -3, 12, -3, 0, 16); g.lineStyle(4, 0x2b2a33, 1); g.beginPath(); g.moveTo(-12, -2); g.lineTo(0, 16); g.lineTo(12, -2); g.strokePath(); g.fillStyle(tone, 1); g.fillRect(-11, -6, 22, 6); }
  c.add(g);
  icons.forEach((k, i) => { const key = `icon/${k}`; if (!scene.textures.exists(key)) return; const im = scene.add.image(-w / 2 + pad + size / 2 + i * (size + gap), -h / 2, key); im.setDisplaySize(size, size); c.add(im); });
  c.setScale(0.4); c.setAlpha(0);
  scene.tweens.add({ targets: c, scale: 1, alpha: 1, duration: 220, ease: 'Back.Out' });
  scene.sfx?.play('pop', { volume: 0.35 });
  return new Promise(res => scene.time.delayedCall(ms, () => { scene.tweens.add({ targets: c, alpha: 0, scale: 0.8, duration: 160, onComplete: () => { c.destroy(); res(); } }); }));
}

/** Say something above a game object (a puppet, a prop). */
export function say(scene, who, icons, opts = {}) {
  const h = opts.height ?? (who.displayHeight ? who.displayHeight : 220);
  return bubble(scene, who.x + (opts.dx || 0), who.y - h * (opts.above ?? 1) + (opts.dy || 0), icons, opts);
}
