import Phaser from 'phaser';
import data from './street.json';
import { Stage, say, pocket, ui, wait, tween } from '../game/stage.js';
import { art } from '../game/boot.js';

// The opening, as told: she walks down the street, sees something in a tree, climbs, finds a small locked door,
// looks under the mat, the key fits like a glove, light, the meadow, she's pulled in, the door slams,
// the key rattles out and lands under the mat.

export class Street extends Stage {
  constructor() { super('street', data); }

  async onEnter() {
    // place the door, mat and key on the tree using the tree art's named points
    const tree = this.props.find(p => p.data_.key === 'street/tree' && !p.hot) || this.hots.get('tree');
    const a = art(this, 'street/tree'); const pts = a.meta.points || { door: { x: 0.5, y: 0.5 }, branch: { x: 0.25, y: 0.55 } };
    const tx = tree.x - a.pivot.x * a.meta.width, ty = tree.y - a.pivot.y * a.meta.height;
    this.doorPos = { x: tx + pts.door.x * a.meta.width, y: ty + pts.door.y * a.meta.height };
    this.branchPos = { x: tx + pts.branch.x * a.meta.width, y: ty + pts.branch.y * a.meta.height };
    this.trunkX = tx + (pts.trunk?.x ?? pts.branch.x + 0.13) * a.meta.width; // the near side of the trunk, where she climbs
    const door = this.hots.get('door'), mat = this.hots.get('mat'), key = this.hots.get('key');
    door.setPosition(this.doorPos.x, this.doorPos.y); mat.setPosition(this.doorPos.x, this.doorPos.y + 4); key.setPosition(this.doorPos.x + 4, this.doorPos.y + 1).setAngle(-12);
    // a glint on the door so she notices something in the tree
    this.glint = this.add.image(this.doorPos.x + 12, this.doorPos.y - 50, 'forest/wisp').setScale(0.7).setTint(0xffe28a).setBlendMode(Phaser.BlendModes.ADD).setDepth(14);
    this.tweens.add({ targets: this.glint, alpha: { from: 0.35, to: 1 }, scale: { from: 0.5, to: 0.95 }, duration: 900, yoyo: true, repeat: -1 });
    this.up = !!this.flags.up;
    if (this.up) { this.frozen = true; this.girl.setPosition(this.branchPos.x, this.branchPos.y); this.girlX = this.targetX = this.branchPos.x; }
    if (this.flags.matUp && !pocket.has('key')) { mat.setAngle(-70); key.setVisible(true); }
    this.started = this.flags.begun;
    if (!this.started) ui.card({ title: 'The Door in the Tree', text: 'Tap things. See what happens.', buttons: [{ id: 'go', label: 'Begin' }] }).then(() => { this.started = true; this.setFlag('begun'); });
  }

  // She climbs the trunk hand over hand, then steps out onto the branch; down is the same in reverse.
  async climb() {
    if (this.up) return;
    await this.walkTo(this.trunkX); this.girl.face(1);
    this.frozen = true; this.girl.play('climb');
    const bottom = this.D.groundY, top = this.branchPos.y, pulls = 4;
    for (let i = 1; i <= pulls; i++) {
      this.sfx.play('step', { rate: 0.8 + i * 0.08, volume: 0.35 });
      await tween(this, { targets: this.girl, y: bottom + (top - bottom) * i / pulls, duration: 340, ease: 'Quad.Out' });
      await wait(this, 110);
    }
    this.girl.face(-1); this.girl.play('walk');
    await tween(this, { targets: this.girl, x: this.branchPos.x, duration: 520, ease: 'Sine.InOut' });
    this.girlX = this.targetX = this.branchPos.x; this.girl.play('idle'); this.girl.face(1);
    this.up = true; this.setFlag('up');
  }
  async descend() {
    this.girl.face(1); this.girl.play('walk');
    await tween(this, { targets: this.girl, x: this.trunkX, duration: 480, ease: 'Sine.InOut' });
    this.girl.play('climb');
    const bottom = this.D.groundY, top = this.branchPos.y, pulls = 3;
    for (let i = pulls - 1; i >= 0; i--) {
      await tween(this, { targets: this.girl, y: bottom + (top - bottom) * i / pulls, duration: 300, ease: 'Quad.In' });
      this.sfx.play('step', { rate: 0.9, volume: 0.35 }); await wait(this, 90);
    }
    this.girlX = this.targetX = this.trunkX; this.frozen = false; this.up = false; this.setFlag('up', false); this.girl.play('idle');
  }

  onGroundTap(wp) { if (this.up && wp.y > this.D.groundY - 200) { this.busy = true; this.descend().then(() => { this.busy = false; this.walkTo(wp.x); }); return true; } return false; }

  async onHot(id, img) {
    const door = this.hots.get('door'), mat = this.hots.get('mat'), key = this.hots.get('key');
    if (id === 'tree') { await this.climb(); return true; }
    if (id === 'door') {
      await this.climb();
      if (pocket.has('key')) { await this.openDoor(); return true; }
      this.sfx.play('locked'); this.tweens.add({ targets: door, angle: { from: -3, to: 3 }, duration: 70, yoyo: true, repeat: 3, onComplete: () => door.setAngle(0) });
      await say(this, this.girl, ['key', 'question'], { height: 285 }); return true;
    }
    if (id === 'mat') {
      await this.climb();
      if (pocket.has('key')) { this.tweens.add({ targets: mat, angle: -30, duration: 160, yoyo: true }); return true; }
      if (!this.flags.matUp) { this.sfx.play('creak', { rate: 1.6, volume: 0.3 }); await tween(this, { targets: mat, angle: -70, duration: 350, ease: 'Back.Out' }); key.setVisible(true); this.setFlag('matUp'); this.sfx.play('chime', { volume: 0.4 }); }
      else { await tween(this, { targets: mat, angle: mat.angle < -30 ? 0 : -70, duration: 300 }); }
      return true;
    }
    if (id === 'key') {
      await this.climb(); if (!this.flags.matUp) return true;
      this.girl.play('reach'); await wait(this, 250);
      this.sfx.play('pick'); await tween(this, { targets: key, x: this.girl.x, y: this.girl.y - 120, scale: 0.2, alpha: 0, duration: 400, ease: 'Quad.In' });
      this.remove(key); pocket.set('key'); this.girl.play('idle');
      await tween(this, { targets: mat, angle: 0, duration: 300 });
      return true;
    }
    return false;
  }

  async openDoor() {
    const door = this.hots.get('door'), mat = this.hots.get('mat');
    this.girl.play('reach'); this.sfx.play('unlock'); await wait(this, 500);
    pocket.set(null); door.setTexture('street/door-open'); this.sfx.play('creak');
    const light = this.add.image(this.doorPos.x, this.doorPos.y - 42, 'forest/wisp').setTint(0xfff6d0).setBlendMode(Phaser.BlendModes.ADD).setDepth(15).setScale(0.5).setAlpha(0);
    await tween(this, { targets: light, alpha: 1, scale: 6, duration: 900, ease: 'Quad.Out' });
    await say(this, this.girl, ['meadow', 'exclaim'], { height: 285, ms: 1100 });
    // leaning closer... and pulled through
    this.sfx.play('whoosh');
    await tween(this, { targets: this.girl, x: this.doorPos.x, y: this.doorPos.y, scale: 0.05, duration: 1100, ease: 'Quad.In' });
    this.girl.setVisible(false);
    await tween(this, { targets: light, alpha: 0, scale: 1, duration: 300 });
    door.setTexture('street/door-closed'); this.sfx.play('slam'); this.cameras.main.shake(200, 0.004);
    // the key rattles out and lands under the mat
    const k = this.add.image(this.doorPos.x + 10, this.doorPos.y - 40, 'street/key').setScale(0.5).setDepth(13);
    this.tweens.add({ targets: mat, angle: -60, duration: 200, yoyo: true, hold: 250 });
    await tween(this, { targets: k, x: this.doorPos.x + 6, y: this.doorPos.y + 1, angle: 720, duration: 500, ease: 'Bounce.Out' });
    await wait(this, 300); k.setVisible(false);
    this.setFlag('through');
    await this.go('meadow', { light: true, x: 300 });
  }
}
