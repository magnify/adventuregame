import Phaser from 'phaser';
import data from './street.json';
import { Stage, say, pocket, ui, wait, tween } from '../game/stage.js';
import { art } from '../game/boot.js';

// The opening, as told: she walks down the street, sees something in a tree, climbs, finds a small locked door,
// looks under the mat, the key fits like a glove, light, the meadow, she's pulled in, the door slams,
// the key rattles out and lands under the mat.

const MAT_UP = -32; // degrees the mat tips up when lifted

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
    door.setPosition(this.doorPos.x, this.doorPos.y);
    // the mat hinges on its left edge, so lifting it tips the right end up like a real doormat; the key lies under its middle
    mat.setOrigin(0.03, 1).setPosition(this.doorPos.x - 0.47 * mat.displayWidth, this.doorPos.y + 5);
    key.setPosition(this.doorPos.x + 6, this.doorPos.y - 1).setAngle(-8);
    // a glint on the door so she notices something in the tree
    this.glint = this.add.image(this.doorPos.x + 12, this.doorPos.y - 50, 'forest/wisp').setScale(0.7).setTint(0xffe28a).setBlendMode(Phaser.BlendModes.ADD).setDepth(14);
    this.tweens.add({ targets: this.glint, alpha: { from: 0.35, to: 1 }, scale: { from: 0.5, to: 0.95 }, duration: 900, yoyo: true, repeat: -1 });
    this.up = !!this.flags.up;
    if (this.up) { this.glint.setVisible(false); this.focusOn(this.doorPos.x - 30, this.doorPos.y - 75, 2); this.frozen = true; this.girl.setPosition(this.branchPos.x, this.branchPos.y); this.girlX = this.targetX = this.branchPos.x; }
    if (this.flags.matUp && !pocket.has('key') && !this.flags.through) { mat.setAngle(MAT_UP); key.setVisible(true); }
    this.started = this.flags.begun;
    if (!this.started) ui.card({ title: 'The Door in the Tree', text: 'Tap things, solve puzzles.', buttons: [{ id: 'go', label: 'Begin' }] }).then(() => { this.started = true; this.setFlag('begun'); });
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
    this.dimGlint();
    this.focusOn(this.doorPos.x - 30, this.doorPos.y - 75, 2); // up close: the door, the mat and her
  }
  /** The glow only has to catch her eye from the street; once she's up there it would hide the mat and key. */
  dimGlint() { this.tweens.killTweensOf(this.glint); this.tweens.add({ targets: this.glint, alpha: 0, duration: 500, onComplete: () => this.glint.setVisible(false) }); }
  async descend() {
    this.focusOff();
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
      // locked, whatever she carries: the key has to be used on it (tap the pocket, then the door, or drag it here)
      await this.climb();
      this.sfx.play('locked'); this.tweens.add({ targets: door, angle: { from: -3, to: 3 }, duration: 70, yoyo: true, repeat: 3, onComplete: () => door.setAngle(0) });
      if (pocket.has('key')) { pocket.nudge(); await say(this, this.girl, ['key'], { height: 285, ms: 1100 }); }
      else await say(this, this.girl, ['key', 'question'], { height: 285 });
      return true;
    }
    if (id === 'mat') {
      await this.climb();
      const lifted = mat.angle < MAT_UP / 2;
      this.sfx.play('creak', { rate: 1.6, volume: 0.3 });
      if (lifted || pocket.has('key') || this.flags.through) { await tween(this, { targets: mat, angle: lifted ? 0 : MAT_UP, duration: 320, ease: lifted ? 'Bounce.Out' : 'Back.Out' }); return true; }
      await tween(this, { targets: mat, angle: MAT_UP, duration: 420, ease: 'Back.Out' });
      if (!this.flags.matUp) {
        // the key was there all along: it pops into view with a glint
        key.setVisible(true).setScale(key.scaleX * 0.6); const s0 = key.scaleX / 0.6;
        this.sfx.play('chime', { volume: 0.45 });
        await tween(this, { targets: key, scale: s0, y: key.y - 10, duration: 260, ease: 'Back.Out' });
        await tween(this, { targets: key, y: key.y + 10, duration: 200, ease: 'Bounce.Out' });
        this.setFlag('matUp');
      }
      return true;
    }
    if (id === 'key') {
      await this.climb(); if (!this.flags.matUp) return true;
      this.girl.play('reach'); await wait(this, 250); this.sfx.play('pick');
      // the key flies into her pocket in the corner, growing a little on the way
      const r = pocket.el.getBoundingClientRect(); const cam = this.cameras.main;
      const to = cam.getWorldPoint(this.scale.transformX(r.left + r.width / 2), this.scale.transformY(r.top + r.height / 2));
      key.setDepth(40);
      await tween(this, { targets: key, x: to.x, y: to.y, angle: 20, scale: key.scaleX * 1.8, duration: 650, ease: 'Cubic.In' });
      this.remove(key); pocket.set('key'); this.girl.play('idle');
      await tween(this, { targets: mat, angle: 0, duration: 300, ease: 'Bounce.Out' });
      return true;
    }
    return false;
  }

  async onUse(id, item) {
    if (id === 'door' && item === 'key') { await this.climb(); await this.openDoor(); return true; }
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
    this.tweens.add({ targets: mat, angle: MAT_UP, duration: 200, yoyo: true, hold: 250 });
    await tween(this, { targets: k, x: this.doorPos.x + 6, y: this.doorPos.y + 1, angle: 720, duration: 500, ease: 'Bounce.Out' });
    await wait(this, 300); k.setVisible(false);
    this.setFlag('through');
    await this.go('meadow', { light: true, x: 300 });
  }
}
