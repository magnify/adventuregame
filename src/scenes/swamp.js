import Phaser from 'phaser';
import data from './swamp.json';
import { Stage, say, pocket, ui, wait, tween } from '../game/stage.js';
import { art } from '../game/boot.js';
import { L } from '../game/lines.js';

// The swamp, as told: the wisps have led them here. She gets stuck in the mud. Barlin knows a little magic:
// he makes a stick larger, it floats over to her, she pulls herself out. The stick is her first weapon.
// The witch's house is at the far end. The story continues there; the game stops at its door for now.

export class Swamp extends Stage {
  constructor() { super('swamp', data); }

  async onEnter() {
    this.started = true; const G = data.groundY;
    this.mudImg = this.props.find(p => p.data_.id === 'mud');
    const a = art(this, 'swamp/mud'); const sink = a.meta.points?.sink || { x: 0.5, y: 0.6 };
    const ms = this.mudImg.scaleY * a.scale; this.sinkY = this.mudImg.y + (sink.y - a.pivot.y) * a.meta.height * ms - 6;
    this.stuck = false; this.freed = !!this.flags.freed;
    if (this.freed) { const st = this.hots.get('stick'); st.setVisible(false); }
    // wisps drift off ahead and fade: they've done their leading
    this.wisps = Array.from({ length: 3 }, (_, i) => this.add.image(this.girlX + 300 + i * 80, G - 200 - i * 40, 'forest/wisp').setBlendMode(Phaser.BlendModes.ADD).setTint(0x9df5dc).setAlpha(0.7).setDepth(35));
    this.tweens.add({ targets: this.wisps, x: '+=900', y: '-=200', alpha: 0, duration: 5000, ease: 'Sine.In' });
    // lantern sways
    const lantern = this.props.find(p => p.data_.key === 'swamp/lantern'); if (lantern) this.tweens.add({ targets: lantern, angle: { from: -6, to: 6 }, duration: 1800, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
    this.lightGlow = this.add.image(2970, 640, 'forest/wisp').setScale(4).setTint(0xffc070).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0.6).setDepth(10);
    // murk: a band of dark mist over the back wall, and a low fog along the ground
    this.add.rectangle(0, 0, data.width, 920, 0x1f2c2a, 0.35).setOrigin(0).setDepth(-40);
    this.add.rectangle(0, data.groundY - 80, data.width, 120, 0x2c3a36, 0.35).setOrigin(0).setDepth(28);
    // the mud is a trap she can't see coming
    this.mudZone = { from: data.mud.x - 120, to: data.mud.x + 120 };
    // Barlin's own hotspot follows him
    this.hots.get('barlin-hot').setVisible(false);
    this.hots.get('housedoor').setVisible(false);
  }

  onUpdate(dt, t) {
    this.lightGlow.setAlpha(0.4 + 0.15 * Math.sin(t * 3));
    // stepping into the mud
    if (!this.stuck && !this.freed && !this.busy && this.girlX > this.mudZone.from && this.girlX < this.mudZone.to && this.girl.mode === 'walk') this.sink();
    // let a tap on Barlin count while she's stuck: keep his hotspot on him
    const bh = this.hots.get('barlin-hot'); if (this.stuck) { bh.setVisible(true).setPosition(this.barlin.x, this.barlin.y).setAlpha(0.001).setScale(1.6); } else bh.setVisible(false);
  }

  onGroundTap(wp) {
    if (this.stuck) { this.busy = true; this.girl.play('stuck'); this.sfx.play('squelch', { volume: 0.4 }); say(this, this.girl, 'stuck').then(() => { this.busy = false; }); return true; }
    if (wp.x > 3200 && this.freed) { this.walkTo(3150); this.time.delayedCall(2600, () => this.atTheDoor()); return true; }
    return false;
  }

  async sink() {
    this.stuck = true; this.busy = true; this.frozen = true; this.targetX = this.girlX; this.settle();
    this.sfx.play('squelch'); this.girl.play('stuck');
    await tween(this, { targets: this.girl, y: this.sinkY, duration: 700, ease: 'Quad.In' });
    await say(this, this.girl, 'stuck');
    await say(this, this.girl, 'help-barlin');
    this.barlinAnchor = { x: this.girlX + 140, y: data.groundY - 300 };
    await say(this, this.barlin, 'little-magic');
    this.busy = false;
  }

  async onHot(id, img) {
    if (id === 'stick' && !this.stuck) { return false; }
    if (id === 'barlin-hot' && this.stuck) { await this.magic(); return true; }
    if (id === 'stick' && this.stuck) { await say(this, this.girl, 'cant-reach'); return true; }
    return false;
  }

  /** Barlin flies to the twig, makes it grow, and it floats to her. She pulls herself out. */
  async magic() {
    const stick = this.hots.get('stick'); const G = data.groundY;
    this.barlinAnchor = { x: stick.x, y: stick.y - 200 }; this.sfx.play('flutter'); await wait(this, 1400);
    await say(this, this.barlin, 'hold-on');
    this.sfx.play('grow'); this.sfx.play('chime', { volume: 0.4 });
    const sparkle = this.add.image(stick.x, stick.y, 'forest/wisp').setTint(0xffe28a).setBlendMode(Phaser.BlendModes.ADD).setScale(0.5).setDepth(34);
    this.tweens.add({ targets: sparkle, scale: 3, alpha: 0, duration: 900 });
    const big = art(this, 'swamp/stick-big');
    await tween(this, { targets: stick, scale: stick.scale * 3.6, duration: 900, ease: 'Elastic.Out' });
    stick.setTexture('swamp/stick-big').setScale(1 / big.scale);
    // it floats to her, and she grabs it
    await tween(this, { targets: stick, x: this.girl.x - 40, y: this.girl.y - 140, angle: -20, duration: 1400, ease: 'Sine.InOut' });
    this.girl.play('reach'); await wait(this, 300); this.sfx.play('pick');
    // and pulls herself out
    this.sfx.play('squelch', { rate: 0.8 });
    await Promise.all([
      tween(this, { targets: this.girl, y: G, x: this.mudZone.to + 90, duration: 1000, ease: 'Back.Out' }),
      tween(this, { targets: stick, x: this.mudZone.to + 90, y: G - 120, alpha: 0, scale: 0.2, duration: 1000, ease: 'Quad.In' }),
    ]);
    this.remove(stick); pocket.set('stick'); this.girl.play('idle');
    this.girlX = this.targetX = this.mudZone.to + 90; this.frozen = false; this.stuck = false; this.freed = true; this.setFlag('freed');
    this.barlinAnchor = null;
    await say(this, this.girl, 'thanks-barlin');
    await say(this, this.girl, 'my-stick');
  }

  onArrive(x) { if (x >= 3140 && this.freed && !this.busy) this.atTheDoor(); }

  async atTheDoor() {
    if (this.busy || this.flags.door) return; this.busy = true; this.setFlag('door');
    this.faceTo(3400); this.sfx.play('creak'); this.cameras.main.pan(3000, this.cameras.main.midPoint.y, 1400, 'Sine.easeInOut');
    this.barlinAnchor = { x: 3100, y: data.groundY - 320 };
    await say(this, this.girl, 'witch-house');
    await say(this, this.barlin, 'dont-eat');
    await ui.card({ title: L('witch-title'), text: L('witch-end'), buttons: [{ id: 'again', label: L('back-to-street') }], bottom: true });
    save.set('street.flags', {}); save.set('street.x', 300); save.set('meadow.flags', {}); save.set('forest.x', 400); save.set('swamp.flags', {}); save.set('swamp.x', 300); pocket.set(null);
    this.flags = {}; this.busy = false; await this.go('street', { x: 300 });
  }
}
import { save } from '../game/save.js';
