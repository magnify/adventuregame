import Phaser from 'phaser';
import { art } from './boot.js';
import { makeGirl, Barlin } from './puppet.js';
import { ui } from './ui.js';
import { save } from './save.js';
import { bubble, say } from './bubble.js';
import { pocket } from './pocket.js';
import { makeSfx } from './audio.js';

export const lerp = (a, b, k) => a + (b - a) * k;
export const smooth = k => k * k * (3 - 2 * k);
export const mix = (a, b, k) => Phaser.Display.Color.Interpolate.ColorWithColor(Phaser.Display.Color.HexStringToColor(a), Phaser.Display.Color.HexStringToColor(b), 1, k);
export const toInt = c => Phaser.Display.Color.GetColor(c.r, c.g, c.b);
export const seeded = (s = 20240906) => () => (s = (s * 16807) % 2147483647) / 2147483647;
export const wait = (scene, ms) => new Promise(r => scene.time.delayedCall(ms, r));
export const tween = (scene, cfg) => new Promise(r => scene.tweens.add({ ...cfg, onComplete: () => { cfg.onComplete?.(); r(); } }));

/**
 * A Stage is one place in the story. The scene file (JSON) says what's in it; the scene class says what happens.
 * Common machinery lives here: camera, sky, tiles, props, hotspots, the girl, walking, bubbles, pocket, transitions.
 */
export class Stage extends Phaser.Scene {
  constructor(key, data) { super(key); this.key = key; this.data_ = data; }

  // ---- overridable hooks
  darkness() { return 0; }
  tintFor() { return 0xffffff; }
  onHot() { return false; }       // return true if handled
  onArrive() {}
  onUpdate() {}
  async onEnter() {}

  create() {
    const D = this.data_; this.D = D; this.sfx = makeSfx(this); this.busy = false; this.rnd = seeded(D.seed || 20240906);
    this.tier = this.registry.get('tier'); this.flags = save.get(`${this.key}.flags`, {});
    pocket.init();
    this.cameras.main.setBounds(0, 0, D.width, D.height);
    this.fitCamera(); this.scale.on('resize', () => this.fitCamera());

    // sky
    this.skyTex = this.textures.exists(`sky-${this.key}`) ? this.textures.get(`sky-${this.key}`) : this.textures.createCanvas(`sky-${this.key}`, 8, 256);
    this.sky = this.add.image(0, 0, `sky-${this.key}`).setOrigin(0).setDepth(-100);
    this.paintSky(0);
    // tiles
    this.tiles = (D.tiles || []).map(t => { const a = art(this, t.key); const ts = this.add.tileSprite(t.x ?? -1000, t.y, D.width / (t.scroll || 1) + 3000, a.h / a.scale, t.key).setOrigin(0).setScrollFactor(t.scroll || 1, t.scrollY ?? t.scroll ?? 1).setTileScale(1 / a.scale).setDepth(t.depth ?? (t.scroll < 1 ? -50 : 5)); ts.data_ = t; if (typeof t.tint === 'string') ts.setTint(Phaser.Display.Color.HexStringToColor(t.tint).color); return ts; });
    // props and hotspots
    this.hots = new Map(); this.props = [];
    for (const p of D.props || []) this.prop(p);
    for (const hsp of D.hotspots || []) this.hot(hsp);
    // the girl
    const startX = save.get(`${this.key}.x`, D.start.x);
    this.girl = makeGirl(this, startX, D.groundY, D.girlScale || 1.3).setDepth(20); this.girlX = startX; this.targetX = startX; this.speed = D.speed || 230; this.walkResolve = null; this.stepAt = 0;
    if (D.barlin) { this.barlin = new Barlin(this, startX + 220, D.groundY - 260, 1.3).setDepth(21); this.barlin.setVisible(D.barlin !== 'later'); this.fuss = 0; this.barlinAnchor = null; }
    // input
    this.input.on('pointerdown', p => { this.down = { x: p.x, y: p.y }; });
    this.input.on('pointerup', p => this.tap(p));
    // camera start
    const cam = this.cameras.main; cam.scrollX = Phaser.Math.Clamp(startX - cam.width / cam.zoom * 0.42, 0, D.width - cam.width / cam.zoom);
    if (this.tier.debug) this.debug = this.add.text(0, 0, '', { font: '14px monospace', color: '#fff', backgroundColor: '#0008' }).setDepth(100);
    save.set('scene', this.key);
    this.onEnter();
  }

  fitCamera() { const cam = this.cameras.main; cam.setZoom(Math.max(cam.height / this.D.height, cam.width / this.D.width)); }

  prop(p) {
    const a = art(this, p.key); const img = this.add.image(p.x, p.y ?? this.D.groundY, p.key).setOrigin(a.pivot.x, a.pivot.y).setScale((p.scale || 1) / a.scale).setDepth(p.depth ?? 10).setScrollFactor(p.scroll ?? 1);
    if (p.flip) img.setFlipX(true); img.setTint(this.tintFor(p.x, p.key)); img.data_ = p; this.props.push(img); return img;
  }
  hot(h) {
    const img = this.prop({ depth: 12, ...h }); img.setInteractive({ useHandCursor: true }); img.hot = h; this.hots.set(h.id, img);
    if (h.hidden) img.setVisible(false);
    if (this.flags[`gone:${h.id}`]) img.setVisible(false);
    return img;
  }

  paintSky(dk) {
    const S = this.D.sky; const ctx = this.skyTex.getContext(); const g = ctx.createLinearGradient(0, 0, 0, 256);
    const c = (a, b) => { const m = mix(a, b, dk); return `rgb(${m.r},${m.g},${m.b})`; };
    g.addColorStop(0, c(S.bright, S.dark || S.bright)); g.addColorStop(1, c(S.horizonBright, S.horizonDark || S.horizonBright));
    ctx.fillStyle = g; ctx.fillRect(0, 0, 8, 256); this.skyTex.refresh();
  }

  // ---- walking
  walkTo(x) { this.targetX = Phaser.Math.Clamp(x, this.D.minX ?? 60, this.D.maxX ?? this.D.width - 60); this.settle(); return new Promise(res => { this.walkResolve = res; }); }
  /** Resolve whoever was waiting on the last walk; used when a walk is cut short or replaced. */
  settle() { if (this.walkResolve) { const r = this.walkResolve; this.walkResolve = null; r(); } }
  faceTo(x) { this.girl.face(x < this.girlX ? -1 : 1); }

  tap(p) {
    if (!this.down) return; const moved = Phaser.Math.Distance.Between(p.x, p.y, this.down.x, this.down.y); this.down = null;
    if (moved > 14 || this.busy || !this.started) return;
    const wp = this.cameras.main.getWorldPoint(p.x, p.y);
    // hotspot under the finger?
    let hit = null;
    for (const img of this.hots.values()) { if (!img.visible) continue; const b = img.getBounds(); b.inflate(30, 30); if (b.contains(wp.x, wp.y)) { if (!hit || img.depth > hit.depth) hit = img; } }
    if (hit) { this.act(hit); return; }
    if (this.onGroundTap && this.onGroundTap(wp) === true) return;
    this.walkTo(wp.x);
  }

  async act(img) {
    const h = img.hot; this.busy = true;
    try {
      const wx = h.walkTo ?? (img.x - 110 * (img.x > this.girlX ? 1 : -1));
      if (!h.noWalk) { await this.walkTo(wx); this.faceTo(img.x); }
      const handled = await this.onHot(h.id, img, h);
      if (!handled) await this.react(img, h);
    } finally { this.busy = false; }
  }

  /** Default reaction: the thing wiggles or hops, makes a sound, maybe says something. */
  async react(img, h) {
    const kind = h.react || 'wiggle';
    if (h.sound) this.sfx.play(h.sound);
    if (kind === 'wiggle') this.tweens.add({ targets: img, angle: { from: -4, to: 4 }, duration: 90, yoyo: true, repeat: 3, onComplete: () => img.setAngle(0) });
    if (kind === 'hop') this.tweens.add({ targets: img, y: img.y - 40, duration: 180, yoyo: true, ease: 'Quad.Out' });
    if (kind === 'puff') this.tweens.add({ targets: img, scaleX: img.scaleX * 1.25, scaleY: img.scaleY * 0.8, duration: 120, yoyo: true, ease: 'Quad.Out' });
    if (h.bubble) await say(this, img, h.bubble, { height: img.displayHeight + 10, ms: h.ms || 1500 });
    if (h.girl) await say(this, this.girl, h.girl, { height: 285 });
  }

  /** Leave for another stage, with a flash of light or a fade to dark. */
  async go(scene, { light = false, x } = {}) {
    this.busy = true;
    const cam = this.cameras.main;
    if (light) { cam.flash(900, 255, 246, 208); await wait(this, 700); } else { cam.fadeOut(600, 16, 24, 48); await wait(this, 620); }
    if (x != null) save.set(`${scene}.x`, x);
    ui.clear(); this.scene.start(scene);
  }

  setFlag(k, v = true) { this.flags[k] = v; save.set(`${this.key}.flags`, this.flags); }
  remove(img) { img.setVisible(false); if (img.hot) this.setFlag(`gone:${img.hot.id}`); }

  update(_, ms) {
    const dt = Math.min(ms / 1000, 0.05), cam = this.cameras.main, G = this.D.groundY, t = this.time.now / 1000;
    // walk
    if (!this.frozen) {
      const d = this.targetX - this.girlX; const moving = Math.abs(d) > 2;
      if (moving) { this.girlX += Math.sign(d) * Math.min(Math.abs(d), this.speed * dt); this.girl.face(Math.sign(d)); this.girl.play('walk'); if (t - this.stepAt > 0.32) { this.stepAt = t; this.sfx.play('step', { volume: 0.25, rate: 0.9 + Math.random() * 0.2 }); } }
      else { if (this.girl.mode === 'walk') { save.set(`${this.key}.x`, this.girlX); this.onArrive(this.girlX); } if (this.girl.mode === 'walk') this.girl.play('idle'); if (this.walkResolve) { const r = this.walkResolve; this.walkResolve = null; r(); } }
      this.girl.x = this.girlX;
    }
    this.girl.tick(dt);
    // camera follows, a little ahead
    const view = cam.width / cam.zoom; const want = this.girlX - view * 0.42;
    cam.scrollX = Phaser.Math.Linear(cam.scrollX, Phaser.Math.Clamp(want, 0, this.D.width - view), Math.min(1, dt * 2.5));
    cam.scrollY = this.D.height - cam.height / cam.zoom;
    const wv = cam.worldView; this.sky.setPosition(wv.x - 4, wv.y - 4).setDisplaySize(wv.width + 8, wv.height + 8);
    if (this.debug) { this.debug.setPosition(wv.x + 8, wv.y + 8).setText(`${Math.round(this.game.loop.actualFps)} fps  ${this.key}  x ${Math.round(this.girlX)}`); }
    // Barlin hovers ahead, or where a scene asks him to
    if (this.barlin && this.barlin.visible) {
      this.fuss = Math.max(0, this.fuss - dt);
      const a = this.barlinAnchor || { x: this.girlX + 230 * (this.girl.facing || 1), y: G - 250 };
      this.barlin.x = Phaser.Math.Linear(this.barlin.x, a.x + Math.sin(t * 1.3) * 30 + (this.fuss > 0 ? Math.sin(t * 7) * 40 : 0), Math.min(1, dt * 2.5));
      this.barlin.y = Phaser.Math.Linear(this.barlin.y, a.y + Math.sin(t * 2.1) * 14, Math.min(1, dt * 3));
      this.barlin.face(a.x > this.barlin.x - 5 ? 1 : -1); this.barlin.tick(dt, this.fuss > 0 ? 1 : 0);
    }
    this.onUpdate(dt, t);
  }

  get state() { return { x: this.girlX, target: this.targetX, started: this.started, busy: this.busy, flags: this.flags, pocket: pocket.get() }; }
}
export { bubble, say, pocket, ui, save };
