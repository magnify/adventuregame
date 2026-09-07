import Phaser from 'phaser';
import data from './meadow.json';
import { Stage, say, wait, tween } from '../game/stage.js';

// The world with three suns. Insects that talk. Barlin (placeholder name) leads her into the world.

export class Meadow extends Stage {
  constructor() { super('meadow', data); }

  async onEnter() {
    const G = this.D.groundY;
    this.suns = [['#FFD98A', 520, 150, 0.7], ['#FFB3C6', 860, 230, 0.5], ['#CFE8FF', 1180, 120, 0.42]].map(([c, x, y, s]) => this.add.image(x, y, 'forest/sun').setScale(s).setTint(Phaser.Display.Color.HexStringToColor(c).color).setScrollFactor(0.1).setDepth(-90));
    this.started = true;
    if (!this.flags.landed) {
      // she tumbles out of the sky, where the door dropped her
      this.busy = true; this.frozen = true; this.girl.setY(G - 700); this.girl.setAngle(-30);
      await wait(this, 200); this.sfx.play('whoosh', { rate: 1.3, volume: 0.4 });
      await tween(this, { targets: this.girl, y: G, angle: 0, duration: 900, ease: 'Bounce.Out' });
      this.cameras.main.shake(150, 0.003); this.frozen = false;
      await say(this, this.girl, ['question'], { height: 230, ms: 1000 });
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
    await tween(this, { targets: this.barlin.hat, y: this.barlin.hat.y - 18, angle: -40, duration: 250, yoyo: true, ease: 'Quad.Out' });
    await say(this, this.barlin, ['hat'], { height: 40, ms: 1200 });
    await say(this, this.barlin, ['sun', 'sun', 'sun'], { height: 40, ms: 1400 });
    await say(this, this.barlin, ['arrow-right'], { height: 40, ms: 1200 });
    this.barlinAnchor = null;
  }

  onArrive(x) { if (x > this.D.width - 140 && !this.busy) this.go('forest', { x: 400 }); }

  onUpdate(dt, t) { this.suns.forEach((s, i) => s.setScale((0.7 - i * 0.14) * (1 + Math.sin(t * 0.7 + i) * 0.03))); }
}
