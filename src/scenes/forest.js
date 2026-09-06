import Phaser from 'phaser';
import data from './forest.json';
import { art } from '../game/boot.js';
import { makeGirl, Barlin } from '../game/puppet.js';
import { ui } from '../game/ui.js';
import { save } from '../game/save.js';

// World one, scene one: the narrow path through a forest that gets darker, under three suns.
// From the story: a fork; they take the narrow path; it gets mysteriously dark; wisps lead them on into a swamp.

const lerp = (a, b, k) => a + (b - a) * k;
const smooth = k => k * k * (3 - 2 * k);
const mix = (a, b, k) => Phaser.Display.Color.Interpolate.ColorWithColor(Phaser.Display.Color.HexStringToColor(a), Phaser.Display.Color.HexStringToColor(b), 1, k);
const toInt = c => Phaser.Display.Color.GetColor(c.r, c.g, c.b);
const seeded = (s = 20240906) => () => (s = (s * 16807) % 2147483647) / 2147483647;

export class Forest extends Phaser.Scene {
  constructor() { super('forest'); }

  darkness(x) { return smooth(Phaser.Math.Clamp((x - data.dark.from) / (data.dark.to - data.dark.from), 0, 1)); }

  create() {
    const tier = this.registry.get('tier'); const rnd = seeded();
    const H = data.height, W = data.width, G = data.groundY;
    this.cameras.main.setBounds(0, 0, W, H);
    this.fitCamera(); this.scale.on('resize', () => this.fitCamera());

    // sky: a gradient we repaint as she walks, pinned to the camera
    this.skyTex = this.textures.createCanvas('sky', 8, 256);
    this.sky = this.add.image(0, 0, 'sky').setOrigin(0).setDepth(-100);
    this.paintSky(0);
    // three suns, far away
    this.suns = ['#FFD98A', '#FFB3C6', '#CFE8FF'].map((c, i) => this.add.image(500 + i * 420, 200 + (i % 2) * 110, 'forest/sun').setScale(0.42 - i * 0.06).setTint(Phaser.Display.Color.HexStringToColor(c).color).setScrollFactor(0.08).setDepth(-90).setAlpha(0.95));

    // tiles: far trees and ground
    this.tiles = data.tiles.map(t => { const a = art(this, t.key); const ts = this.add.tileSprite(0, t.y, W / t.scroll + 2000, a.h / a.scale, t.key).setOrigin(0, t.key.includes('far') ? 1 : 0).setScrollFactor(t.scroll).setTileScale(1 / a.scale).setDepth(t.key.includes('ground') ? 5 : -50); ts.data_ = t; return ts; });

    // vegetation by band; each prop tinted once by how dark it is where it stands
    this.props = this.add.group();
    const placeProp = (key, x, y, s, depth, scroll = 1) => {
      const a = art(this, key); const img = this.add.image(x, y, key).setOrigin(a.pivot.x, a.pivot.y).setScale(s / a.scale).setDepth(depth).setScrollFactor(scroll);
      img.setTint(this.tintFor(x, key)); this.props.add(img); return img;
    };
    for (const band of data.bands) {
      const from = band === data.bands[0] ? 0 : data.bands[data.bands.indexOf(band) - 1].until;
      const x0 = data.dark.from + from * (data.dark.to - data.dark.from) - (band === data.bands[0] ? data.dark.from : 0);
      const x1 = data.dark.from + Math.min(band.until, 1) * (data.dark.to - data.dark.from) + (band.until > 1 ? W : 0);
      for (let x = x0; x < Math.min(x1, W); x += band.treeEvery / tier.density) {
        const key = band.trees[Math.floor(rnd() * band.trees.length)]; const back = rnd() < 0.45;
        const px = x + (rnd() - 0.5) * band.treeEvery * 0.8; if (Math.abs(px - data.fork.x) < 120) continue;
        if (back) placeProp(key, px, G - 60 - rnd() * 60, 0.55 + rnd() * 0.2, -20 - rnd() * 5, 0.7);
        else placeProp(key, px, G + 8 + rnd() * 30, 0.9 + rnd() * 0.3, 10 + rnd());
      }
      for (let x = x0; x < Math.min(x1, W); x += band.underEvery / tier.density) {
        const key = band.under[Math.floor(rnd() * band.under.length)]; const px = x + (rnd() - 0.5) * band.underEvery;
        const front = rnd() < 0.5; placeProp(key, px, front ? G + 40 + rnd() * 60 : G - 6 + rnd() * 12, front ? 1 + rnd() * 0.3 : 0.7 + rnd() * 0.3, front ? 30 : 8);
      }
    }
    for (const p of data.props) placeProp(p.key, p.x, G + 6, p.scale, 12);
    // the wide path: a lighter strip going up and left into the trees at the fork
    this.wide = this.add.graphics().setDepth(-30); this.wide.fillStyle(0xd8c89a, 0.55); this.wide.beginPath(); this.wide.moveTo(data.fork.x - 140, G - 10); this.wide.lineTo(data.fork.x - 700, G - 260); this.wide.lineTo(data.fork.x - 560, G - 280); this.wide.lineTo(data.fork.x + 40, G - 10); this.wide.closePath(); this.wide.fillPath();
    this.wideZone = new Phaser.Geom.Rectangle(data.fork.x - 760, G - 320, 760, 300);

    // mist that thickens with the dark
    this.mist = this.add.rectangle(0, 0, 10, 10, 0x1a2238, 0).setOrigin(0).setDepth(40);

    // the girl, Barlin, the wisps
    const startX = save.get('forest.x', data.start.x);
    this.girl = makeGirl(this, startX, G, 1).setDepth(20); this.girlX = startX; this.targetX = startX; this.speed = 220;
    this.barlin = new Barlin(this, startX + 220, G - 260, 1).setDepth(21); this.fuss = 0;
    this.wisps = Array.from({ length: 5 }, (_, i) => { const w = this.add.image(0, 0, 'forest/wisp').setScale(0.8 + i * 0.15).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0).setDepth(35).setTint(0x9df5dc); w.phase = i * 1.3; return w; });
    this.glows = this.props.getChildren().filter(p => p.texture.key === 'forest/mushroom-glow').map(p => { const g = this.add.image(p.x, p.y - 30, 'forest/wisp').setScale(1.6).setTint(0xff9a3c).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0.5).setDepth(p.depth + 1); g.phase = rnd() * 6; return g; });

    // input: a tap that didn't drag
    this.input.on('pointerdown', p => { this.down = { x: p.x, y: p.y }; });
    this.input.on('pointerup', p => {
      if (!this.down || !this.started || this.done) return;
      const moved = Phaser.Math.Distance.Between(p.x, p.y, this.down.x, this.down.y); this.down = null; if (moved > 14) return;
      const wp = this.cameras.main.getWorldPoint(p.x, p.y);
      if (this.wideZone.contains(wp.x, wp.y)) { this.targetX = data.fork.x; this.fuss = 3.5; return; }
      this.targetX = Phaser.Math.Clamp(wp.x, data.start.x - 200, data.end.x);
    });

    this.started = startX > data.start.x + 20; this.done = false;
    if (!this.started) ui.card({ title: 'The World With Three Suns', text: 'Tap where she should go. The butterfly knows the way.', suns: true, buttons: [{ id: 'go', label: 'Begin' }] }).then(() => { this.started = true; });
    this.cameras.main.scrollX = startX - this.cameras.main.width / this.cameras.main.zoom * 0.4;
    if (tier.debug) this.debug = this.add.text(8, 8, '', { font: '20px monospace', color: '#fff', backgroundColor: '#0008' }).setDepth(100);
  }

  fitCamera() { const cam = this.cameras.main; cam.setZoom(Math.max(cam.height / data.height, cam.width / data.width)); }

  tintFor(x, key) { const dk = this.darkness(x); if (key === 'forest/mushroom-glow') return 0xffffff; return toInt(mix('#ffffff', '#3a4468', dk * 0.85)); }

  paintSky(dk) {
    const ctx = this.skyTex.getContext(); const g = ctx.createLinearGradient(0, 0, 0, 256);
    g.addColorStop(0, `rgb(${Object.values(mix(data.sky.bright, data.sky.dark, dk)).slice(0, 3).join(',')})`);
    g.addColorStop(1, `rgb(${Object.values(mix(data.sky.horizonBright, data.sky.horizonDark, dk)).slice(0, 3).join(',')})`);
    ctx.fillStyle = g; ctx.fillRect(0, 0, 8, 256); this.skyTex.refresh();
    const cam = this.cameras.main; this.sky.setDisplaySize(cam.worldView.width + 8, cam.worldView.height + 8);
  }

  update(_, ms) {
    const dt = Math.min(ms / 1000, 0.05); const G = data.groundY, cam = this.cameras.main;
    // walk
    const d = this.targetX - this.girlX;
    const moving = Math.abs(d) > 2;
    if (moving) { this.girlX += Math.sign(d) * Math.min(Math.abs(d), this.speed * dt); this.girl.face(Math.sign(d)); this.girl.play('walk'); }
    else { if (this.girl.mode === 'walk') save.set('forest.x', this.girlX); this.girl.play('idle'); }
    this.girl.x = this.girlX; this.girl.tick(dt);
    // camera follows, a little ahead
    const view = cam.width / cam.zoom; const want = this.girlX - view * 0.42;
    cam.scrollX = Phaser.Math.Linear(cam.scrollX, Phaser.Math.Clamp(want, 0, data.width - view), Math.min(1, dt * 2.5));
    cam.scrollY = data.height - cam.height / cam.zoom;
    const wv = cam.worldView; this.sky.setPosition(wv.x - 4, wv.y - 4); this.mist.setPosition(wv.x, wv.y).setSize(wv.width, wv.height);
    if (this.debug) this.debug.setPosition(wv.x + 8, wv.y + 8);
    // light
    const dk = this.darkness(this.girlX);
    if (Math.abs(dk - (this.lastDk ?? -1)) > 0.004) { this.paintSky(dk); this.lastDk = dk; }
    this.suns.forEach(s => s.setAlpha(0.95 * (1 - smooth(Math.min(1, dk * 1.5)))));
    this.tiles[0].setTint(toInt(mix(this.tiles[0].data_.tint.bright, this.tiles[0].data_.tint.dark, dk)));
    this.tiles[1].setTint(toInt(mix('#ffffff', '#2a3352', dk * 0.9)));
    this.mist.setAlpha(dk * 0.35);
    const girlTint = toInt(mix('#ffffff', '#5a6488', dk * 0.7)); this.girl.each(o => o.setTint && o.setTint(girlTint));
    // Barlin leads, and fusses at the fork if she heads for the wide path
    this.fuss = Math.max(0, this.fuss - dt);
    const bx = this.fuss > 0 ? data.fork.x + 160 : this.girlX + 230 * (this.girl.facing || 1);
    const t = this.time.now / 1000;
    this.barlin.x = Phaser.Math.Linear(this.barlin.x, bx + Math.sin(t * 1.3) * 30 + (this.fuss > 0 ? Math.sin(t * 7) * 40 : 0), Math.min(1, dt * 2.5));
    this.barlin.y = Phaser.Math.Linear(this.barlin.y, G - 250 + Math.sin(t * 2.1) * 14, Math.min(1, dt * 3));
    this.barlin.face(bx > this.barlin.x ? 1 : -1); this.barlin.tick(dt, this.fuss > 0 ? 1 : 0);
    this.barlin.glow.setAlpha(dk * 0.9 * (0.8 + Math.sin(t * 5) * 0.2));
    // wisps appear near the end
    const wk = smooth(Phaser.Math.Clamp((this.girlX - (data.dark.to - 900)) / 700, 0, 1));
    this.wisps.forEach((w, i) => { const ph = w.phase + t * (0.8 + i * 0.1); w.x = this.girlX + 380 + i * 90 + Math.sin(ph) * 60; w.y = G - 120 - i * 30 + Math.sin(ph * 1.7) * 40; w.setAlpha(wk * (0.55 + 0.45 * Math.sin(ph * 2.3))); });
    this.glows.forEach(g => g.setAlpha(0.35 + 0.25 * Math.sin(t * 2 + g.phase)));
    if (this.debug) this.debug.setText(`${Math.round(this.game.loop.actualFps)} fps  x ${Math.round(this.girlX)}  dark ${dk.toFixed(2)}`);
    // the end of the path
    if (!this.done && this.girlX > data.end.x - 30 && !moving) {
      this.done = true;
      this.time.delayedCall(1200, () => ui.card({ title: 'Into the swamp', text: "The wisps lead on. That's as far as the story goes tonight.", buttons: [{ id: 'again', label: 'Walk it again' }] })
        .then(() => { this.girlX = this.targetX = data.start.x; save.set('forest.x', data.start.x); this.done = false; cam.scrollX = 0; }));
    }
  }

  get state() { return { x: this.girlX, target: this.targetX, started: this.started, done: this.done, fuss: this.fuss > 0 }; }
}
