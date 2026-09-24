import Phaser from 'phaser';

/**
 * A picture bubble: a rounded card with pictograms, popping up above a point and fading after a while.
 * Icons are keys under art/src/icon (e.g. 'key', 'question'). Returns a promise that resolves when it's gone.
 */
export function bubble(scene, x, y, icons, { ms = 1600, tone = 0xf3ead8, depth = 50, size = 52, tail = true } = {}) {
  const pad = 14, gap = 8, w = icons.length * size + (icons.length - 1) * gap + pad * 2, h = size + pad * 2;
  const c = scene.add.container(x, y - 24).setDepth(depth);
  // a scrap of cream paper with a soft cast shadow, no ink line: the same stuff as everything else on screen
  const g = scene.add.graphics();
  const card = (dx, dy, color, alpha) => { g.fillStyle(color, alpha); g.fillRoundedRect(-w / 2 + dx, -h + dy, w, h, 22); if (tail) g.fillTriangle(-13 + dx, -4 + dy, 11 + dx, -4 + dy, 2 + dx, 15 + dy); };
  card(3, 7, 0x3c2d1e, 0.18); card(1, 2, 0x5a4636, 0.2); card(0, 0, tone, 1);
  g.lineStyle(1.5, 0x9c8266, 0.35); g.strokeRoundedRect(-w / 2 + 1, -h + 1, w - 2, h - 2, 21);
  c.add(g); c.setAngle(-2 + Math.random() * 4);
  icons.forEach((k, i) => { const key = `icon/${k}`; if (!scene.textures.exists(key)) return; const im = scene.add.image(-w / 2 + pad + size / 2 + i * (size + gap), -h / 2, key); im.setDisplaySize(size, size); c.add(im); });
  c.setScale(0.4); c.setAlpha(0);
  scene.tweens.add({ targets: c, scale: 1, alpha: 1, duration: 220, ease: 'Back.Out' });
  scene.sfx?.play('pop', { volume: 0.35 });
  return new Promise(res => scene.time.delayedCall(ms, () => { scene.tweens.add({ targets: c, alpha: 0, scale: 0.8, duration: 160, onComplete: () => { c.destroy(); res(); } }); }));
}

/** Say something above a game object (a character, a prop). */
export function say(scene, who, icons, opts = {}) {
  const h = opts.height ?? (who.displayHeight ? who.displayHeight : 220);
  return bubble(scene, who.x + (opts.dx || 0), who.y - h * (opts.above ?? 1) + (opts.dy || 0), icons, opts);
}
