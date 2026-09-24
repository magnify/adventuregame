import Phaser from 'phaser';
import data from './meadow.json';
import { Stage, say, wait, tween } from '../game/stage.js';

// The world with three suns. Insects that talk. Barlin (placeholder name) leads her into the world.

export class Meadow extends Stage {
  constructor() { super('meadow', data); }

  async onEnter() {
    const G = this.D.groundY;
    this.suns = [['#FFD98A', 520, 150, 0.7], ['#FFB3C6', 900, 240, 0.36], ['#CFE8FF', 1200, 120, 0.3]].map(([c, x, y, s]) => {
      const col = Phaser.Display.Color.HexStringToColor(c).color;
      const halo = this.add.image(x, y, 'forest/wisp').setScale(s * 7).setTint(col).setAlpha(0.55).setBlendMode(Phaser.BlendModes.ADD).setScrollFactor(0.1).setDepth(-91);
      const sun = this.add.image(x, y, 'forest/sun').setScale(s).setTint(col).setScrollFactor(0.1).setDepth(-90); sun.halo = halo; sun.base = s; return sun;
    });
    this.started = true;
    if (!this.flags.landed) {
      // she tumbles out of the sky, where the door dropped her
      this.busy = true; this.frozen = true; this.girl.setY(G - 700); this.girl.setAngle(-30);
      await wait(this, 200); this.sfx.play('whoosh', { rate: 1.3, volume: 0.4 });
      await tween(this, { targets: this.girl, y: G, angle: 0, duration: 900, ease: 'Bounce.Out' });
      this.cameras.main.shake(150, 0.003); this.frozen = false;
      await say(this, this.girl, 'where-am-i');
      await say(this, this.girl, 'three-suns');
      this.setFlag('landed');
      await this.barlinArrives();
      this.busy = false;
    } else { this.barlin.setVisible(true); }
  }

  async barlinArrives() {
    const G = this.D.groundY;
    this.barlin.setVisible(true); this.barlin.setPosition(this.girlX + 900, G - 500); this.sfx.play('flutter');
    this.barlinAnchor = { x: this.girlX + 200, y: G - 250 };
    await wait(this, 1400);
    // he tips his hat
    await this.barlin.bow();
    await say(this, this.barlin, 'barlin-hello');
    await say(this, this.barlin, 'come-with-me');
    this.barlinAnchor = null;
  }

  onArrive(x) { if (x > this.D.width - 140 && !this.busy) this.go('forest', { x: 400 }); }

  onUpdate(dt, t) { this.suns.forEach((s, i) => { s.setScale(s.base * (1 + Math.sin(t * 0.7 + i) * 0.03)); s.halo.setAlpha(0.45 + 0.15 * Math.sin(t * 0.9 + i)); }); }
}
