import Phaser from 'phaser';
import data from './forest.json';
import { Stage, smooth, mix, toInt, say } from '../game/stage.js';
import { art } from '../game/boot.js';

// World one: the narrow path through a forest that gets darker. A fork; they take the narrow path;
// it gets mysteriously dark; wisps lead them on into a swamp.

export class Forest extends Stage {
  constructor() { super('forest', data); }

  darkness(x) { return smooth(Phaser.Math.Clamp((x - data.dark.from) / (data.dark.to - data.dark.from), 0, 1)); }
  tintFor(x, key) { const dk = this.darkness(x); if (key === 'forest/mushroom-glow') return 0xffffff; return toInt(mix('#ffffff', '#3a4468', dk * 0.85)); }

  async onEnter() {
    const D = data, G = D.groundY, W = D.width, rnd = this.rnd, tier = this.tier; this.started = true;
    // vegetation by band; each prop tinted once by how dark it is where it stands
    for (const band of D.bands) {
      const i = D.bands.indexOf(band); const from = i === 0 ? 0 : D.bands[i - 1].until;
      const x0 = i === 0 ? 0 : D.dark.from + from * (D.dark.to - D.dark.from);
      const x1 = band.until > 1 ? W : D.dark.from + band.until * (D.dark.to - D.dark.from);
      for (let x = x0; x < Math.min(x1, W); x += band.treeEvery / tier.density) {
        const key = band.trees[Math.floor(rnd() * band.trees.length)]; const back = rnd() < 0.45;
        const px = x + (rnd() - 0.5) * band.treeEvery * 0.8; if (Math.abs(px - D.fork.x) < 160) continue;
        if (back) this.prop({ key, x: px, y: G - 60 - rnd() * 60, scale: 0.55 + rnd() * 0.2, depth: -20 - rnd() * 5, scroll: 0.7 });
        else this.prop({ key, x: px, y: G + 8 + rnd() * 30, scale: 0.9 + rnd() * 0.3, depth: 10 + rnd() });
      }
      for (let x = x0; x < Math.min(x1, W); x += band.underEvery / tier.density) {
        const key = band.under[Math.floor(rnd() * band.under.length)]; const px = x + (rnd() - 0.5) * band.underEvery; const front = rnd() < 0.5;
        this.prop({ key, x: px, y: front ? G + 40 + rnd() * 60 : G - 6 + rnd() * 12, scale: front ? 1 + rnd() * 0.3 : 0.7 + rnd() * 0.3, depth: front ? 30 : 8 });
      }
    }
    // the wide path: a lighter strip going up and left into the trees at the fork
    const wide = this.add.graphics().setDepth(-30); wide.fillStyle(0xd8c89a, 0.55); wide.beginPath(); wide.moveTo(D.fork.x - 140, G - 10); wide.lineTo(D.fork.x - 700, G - 260); wide.lineTo(D.fork.x - 560, G - 280); wide.lineTo(D.fork.x + 40, G - 10); wide.closePath(); wide.fillPath();
    this.wideZone = new Phaser.Geom.Rectangle(D.fork.x - 760, G - 320, 760, 300);
    this.mist = this.add.rectangle(0, 0, 10, 10, 0x1a2238, 0).setOrigin(0).setDepth(40);
    this.wisps = Array.from({ length: 5 }, (_, i) => { const w = this.add.image(0, 0, 'forest/wisp').setScale(0.8 + i * 0.15).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0).setDepth(35).setTint(0x9df5dc); w.phase = i * 1.3; return w; });
    this.glows = this.props.filter(p => p.texture.key === 'forest/mushroom-glow').map(p => { const g = this.add.image(p.x, p.y - 30, 'forest/wisp').setScale(1.6).setTint(0xff9a3c).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0.5).setDepth(p.depth + 1); g.phase = rnd() * 6; return g; });
    this.shimmered = false;
  }

  onGroundTap(wp) { if (this.wideZone.contains(wp.x, wp.y)) { this.walkTo(data.fork.x); this.fuss = 3.5; this.barlinAnchor = { x: data.fork.x + 200, y: data.groundY - 250 }; this.time.delayedCall(3500, () => { this.barlinAnchor = null; }); return true; } return false; }

  onArrive(x) { if (x > data.end.x - 60 && !this.busy) this.go('swamp', { x: 300 }); }

  onUpdate(dt, t) {
    const dk = this.darkness(this.girlX), G = data.groundY, wv = this.cameras.main.worldView;
    if (Math.abs(dk - (this.lastDk ?? -1)) > 0.004) { this.paintSky(dk); this.lastDk = dk; }
    this.tiles[0].setTint(toInt(mix(this.tiles[0].data_.tint.bright, this.tiles[0].data_.tint.dark, dk)));
    this.tiles[1].setTint(toInt(mix('#ffffff', '#2a3352', dk * 0.9)));
    this.mist.setPosition(wv.x, wv.y).setSize(wv.width, wv.height).setAlpha(dk * 0.35);
    const girlTint = toInt(mix('#ffffff', '#5a6488', dk * 0.7)); this.girl.each(o => o.setTint && o.setTint(girlTint));
    this.barlin.glow.setAlpha(dk * 0.9 * (0.8 + Math.sin(t * 5) * 0.2));
    const wk = smooth(Phaser.Math.Clamp((this.girlX - (data.dark.to - 900)) / 700, 0, 1));
    if (wk > 0.5 && !this.shimmered) { this.shimmered = true; this.sfx.play('shimmer'); }
    this.wisps.forEach((w, i) => { const ph = w.phase + t * (0.8 + i * 0.1); w.x = this.girlX + 380 + i * 90 + Math.sin(ph) * 60; w.y = G - 120 - i * 30 + Math.sin(ph * 1.7) * 40; w.setAlpha(wk * (0.55 + 0.45 * Math.sin(ph * 2.3))); });
    this.glows.forEach(g => g.setAlpha(0.35 + 0.25 * Math.sin(t * 2 + g.phase)));
  }
}
