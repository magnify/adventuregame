import Phaser from 'phaser';
import { art } from './boot.js';

/**
 * Characters are whole pictures, one per pose, swapped by the game with a little bounce: no joints to come apart.
 * Each pose is an image `<name>/<pose>` in the manifest; a missing pose falls back to the standing picture, so a
 * character works with just one picture and gets richer as poses arrive. A soft baked shadow sits just behind it.
 */
const SHADOW = { x: 2.5, y: 4 };

class Poses extends Phaser.GameObjects.Container {
  constructor(scene, x, y, name, rest, scale) {
    super(scene, x, y); scene.add.existing(this);
    this.name = name; this.rest = rest; this.facing = 1; this.mode = 'idle'; this.t = 0;
    this.shadow = scene.add.image(SHADOW.x, SHADOW.y, '__DEFAULT'); this.img = scene.add.image(0, 0, '__DEFAULT');
    this.add([this.shadow, this.img]); this.show(rest); this.setScale(scale);
  }
  has(pose) { return this.scene.textures.exists(`${this.name}/${pose}`); }
  /** Show a pose if it exists, otherwise the resting picture. */
  show(pose) {
    const key = `${this.name}/${this.has(pose) ? pose : this.rest}`; if (this.img.texture.key === key) return;
    const a = art(this.scene, key); this.img.setTexture(key).setOrigin(a.pivot.x, a.pivot.y).setScale(1 / a.scale);
    const sk = key + '~shadow'; if (this.scene.textures.exists(sk)) { const s = art(this.scene, sk); this.shadow.setTexture(sk).setOrigin(s.pivot.x, s.pivot.y).setScale(1 / s.scale).setVisible(true); } else this.shadow.setVisible(false);
  }
  face(dir) { if (dir && dir !== this.facing) { this.facing = dir; this.scaleX = Math.abs(this.scaleX) * dir; } }
  play(mode) { this.mode = mode; }
  /** Place the picture and its shadow together. */
  pose(x, y, rot, sx = 1, sy = 1) {
    const a = art(this.scene, this.img.texture.key);
    this.img.setPosition(x, y).setRotation(rot).setScale(sx / a.scale, sy / a.scale);
    if (this.shadow.visible) { const s = art(this.scene, this.shadow.texture.key); this.shadow.setPosition(x + SHADOW.x, y + SHADOW.y).setRotation(rot).setScale(sx / s.scale, sy / s.scale); }
  }
}

/** The girl: stands, walks, climbs, reaches, gets stuck. Feet are the picture's pivot, on the ground. */
export class Girl extends Poses {
  constructor(scene, x, y, scale = 1) { super(scene, x, y, 'girl', 'stand', scale); this.blinkAt = 2 + Math.random() * 3; this.blinking = 0; this.stride = 1; }
  tick(dt) {
    this.t += dt; const t = this.t, m = this.mode;
    if (m === 'walk') {
      const phase = Math.floor(t * 5.5 * Math.max(0.6, this.stride)) % 2; this.show(phase ? 'walk-2' : 'walk-1');
      this.pose(0, -Math.abs(Math.sin(t * 5.5 * Math.PI)) * 5 * this.stride, Math.sin(t * 5.5 * Math.PI) * 0.025);
    } else if (m === 'climb') {
      const phase = Math.floor(t * 3) % 2; this.show(phase ? 'climb-2' : 'climb-1');
      this.pose(0, -Math.abs(Math.sin(t * 3 * Math.PI)) * 4, this.has('climb-1') ? 0 : Math.sin(t * 6) * 0.06);
    } else if (m === 'reach') { this.show('reach'); this.pose(0, 0, this.has('reach') ? 0 : -0.05); }
    else if (m === 'stuck') { this.show('stuck'); this.pose(0, 0, Math.sin(t * 6) * 0.05); }
    else {
      if (this.blinking > 0) this.blinking -= dt; else if (t > this.blinkAt) { this.blinking = 0.13; this.blinkAt = t + 2.5 + Math.random() * 3.5; }
      this.show(this.blinking > 0 ? 'stand-blink' : 'stand');
      this.pose(0, 0, 0, 1, 1 + Math.sin(t * 1.6) * 0.008); // breathing
    }
  }
}

/** Barlin: flaps through his wing pictures; with only one picture, the whole of him beats gently instead. */
export class Barlin extends Poses {
  constructor(scene, x, y, scale = 1) {
    super(scene, x, y, 'barlin', 'fly-1', scale);
    this.glow = scene.add.image(0, 0, 'forest/wisp').setOrigin(0.5).setScale(3).setTint(0xffb060).setAlpha(0).setBlendMode(Phaser.BlendModes.ADD);
    this.addAt(this.glow, 0); this.t = Math.random() * 10;
    this.hat = this.img; // scenes tip his hat; with whole pictures that's a little bow of all of him
  }
  /** A little bow, tipping his hat: the bow picture if there is one, and a tilt of all of him either way. */
  bow() {
    this.bowing = true; return new Promise(res => this.scene.tweens.add({ targets: this, angle: -22 * this.facing, duration: 260, yoyo: true, hold: 200, ease: 'Quad.Out', onComplete: () => { this.bowing = false; res(); } }));
  }
  tick(dt, fuss = 0) {
    this.t += dt; if (this.bowing && this.has('bow')) { this.show('bow'); this.pose(0, 0, 0); return; } const t = this.t, wob = Math.sin(t * 3) * 0.04 * (1 + fuss * 3);
    if (this.has('fly-2')) { const f = [1, 2, 3, 2][Math.floor(t * 14) % 4]; this.show(`fly-${f}`); this.pose(0, Math.sin(t * 2.1) * 3, wob); }
    else { const beat = Math.sin(t * 14); this.pose(0, Math.sin(t * 2.1) * 3 + beat * 1.5, wob, 1, 1 - Math.abs(beat) * 0.08); }
  }
}

export function makeGirl(scene, x, y, scale = 1) { return new Girl(scene, x, y, scale); }
