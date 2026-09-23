import Phaser from 'phaser';
import { art } from './boot.js';

const SHADOW = { x: 2.5, y: 4 }; // where a part's shadow falls, in 1x pixels

/**
 * A paper puppet: images hung from each other at named points, animated by code.
 * The contract (docs/art-contract.md) says where each part attaches; puppet.json in the manifest carries it.
 * Sizes in the manifest are 1x; the puppet is built at 1x and scaled as a whole.
 */
export class Puppet extends Phaser.GameObjects.Container {
  constructor(scene, x, y, name, parts, scale = 1) {
    super(scene, x, y);
    scene.add.existing(this);
    this.name = name; this.parts = {}; this.pins = {};
    this.facing = 1; this.mode = 'idle'; this.t = 0; this.blinkAt = 2 + Math.random() * 3; this.blinking = 0;
    const s = art(scene, `${name}/body`).scale; // manifest scale, images are s× the contract size
    const px = 1 / s; // draw everything at contract (1x) pixels
    // body first: its pivot is the feet
    const body = art(scene, `${name}/body`);
    const bodyImg = scene.add.image(0, 0, `${name}/body`).setOrigin(body.pivot.x, body.pivot.y).setScale(px);
    this.parts.body = bodyImg;
    const bw = body.meta.width, bh = body.meta.height, bx0 = -body.pivot.x * bw, by0 = -body.pivot.y * bh;
    this.pins = {};
    for (const [pin, at] of Object.entries(body.meta.points || {})) this.pins[pin] = { x: bx0 + at.x * bw, y: by0 + at.y * bh };
    // hang the rest
    for (const p of parts) {
      const a = art(scene, `${name}/${p.key}`); const pin = this.pins[p.at] || { x: 0, y: 0 };
      const img = scene.add.image(pin.x + (p.dx || 0), pin.y + (p.dy || 0), `${name}/${p.key}`).setOrigin(a.pivot.x, a.pivot.y).setScale(px);
      this.parts[p.key] = img; img.setData('pin', p.at);
    }
    // draw order: back arm, legs, body, front arm, head, eyes
    const order = parts.filter(p => p.behind).map(p => p.key).concat(['body'], parts.filter(p => !p.behind).map(p => p.key));
    // each part carries a soft baked shadow just beneath it, so the pieces sit on each other like layered paper
    this.shadows = {};
    for (const k of order) {
      const sk = `${name}/${k}~shadow`;
      if (scene.textures.exists(sk)) { const sa = art(scene, sk); const sh = scene.add.image(0, 0, sk).setOrigin(sa.pivot.x, sa.pivot.y).setScale(1 / sa.scale); this.shadows[k] = sh; this.add(sh); }
      this.add(this.parts[k]);
    }
    this.setScale(scale); this.syncShadows();
  }
  /** Shadows follow their part, a little down and to the side, as if lit from the upper left. */
  syncShadows() { for (const [k, sh] of Object.entries(this.shadows || {})) { const p = this.parts[k]; sh.setPosition(p.x + SHADOW.x, p.y + SHADOW.y).setRotation(p.rotation).setVisible(p.visible); sh.scaleY = sh.scaleX * (p.scaleY / p.scaleX); } }
  face(dir) { if (dir && dir !== this.facing) { this.facing = dir; this.scaleX = Math.abs(this.scaleX) * dir; } }
  play(mode) { this.mode = mode; }
  /** Called every frame. dt in seconds. */
  tick(dt) {
    this.t += dt; const P = this.parts, t = this.t;
    const walking = this.mode === 'walk', climbing = this.mode === 'climb', stuck = this.mode === 'stuck', reaching = this.mode === 'reach';
    const swing = walking ? Math.sin(t * 9) * 0.55 * (this.stride ?? 1) : climbing ? Math.sin(t * 7) * 0.7 : 0;
    if (P['leg-l']) P['leg-l'].rotation = swing;
    if (P['leg-r']) P['leg-r'].rotation = -swing;
    const armIdle = walking || climbing ? 0 : Math.sin(t * 1.6) * 0.04;
    if (P['arm-l']) P['arm-l'].rotation = climbing ? -2.6 + Math.sin(t * 7) * 0.4 : reaching ? -2.2 : stuck ? -1.2 + Math.sin(t * 6) * 0.3 : -swing * 0.45 + armIdle;
    if (P['arm-r']) P['arm-r'].rotation = climbing ? -2.6 - Math.sin(t * 7) * 0.4 : reaching ? -0.4 : stuck ? -1.4 - Math.sin(t * 6) * 0.3 : swing * 0.45 - armIdle;
    const bob = walking ? Math.abs(Math.sin(t * 9)) * -4 : Math.sin(t * 1.6) * -1.2;
    const bodyPin = this.pins.neck || { x: 0, y: 0 };
    if (P.body) { P.body.y = bob; P.body.scaleY = P.body.scaleX * (walking ? 1 : 1 + Math.sin(t * 1.6) * 0.006); }
    for (const [k, img] of Object.entries(P)) { if (k === 'body') continue; const pin = this.pins[img.getData('pin')]; if (pin && (k === 'head' || k.startsWith('arm'))) img.y = pin.y + bob; }
    if (P.head) { P.head.rotation = walking ? Math.sin(t * 9) * 0.03 : Math.sin(t * 1.1) * 0.02; }
    if (this.blinkTex) {
      // painted heads blink by swapping to the eyes-closed head
      if (this.blinking > 0) { this.blinking -= dt; } else if (t > this.blinkAt) { this.blinking = 0.12; this.blinkAt = t + 2.5 + Math.random() * 3.5; }
      P.head.setTexture(this.blinking > 0 ? this.blinkTex : `${this.name}/head`);
    } else if (P.eyes && P['eyes-shut']) {
      const hp = P.head; P.eyes.x = P['eyes-shut'].x = hp.x + (this.eyeOffset?.x || 0); P.eyes.y = P['eyes-shut'].y = hp.y + (this.eyeOffset?.y || 0); P.eyes.rotation = P['eyes-shut'].rotation = hp.rotation;
      if (this.blinking > 0) { this.blinking -= dt; } else if (t > this.blinkAt) { this.blinking = 0.12; this.blinkAt = t + 2.5 + Math.random() * 3.5; }
      P.eyes.visible = this.blinking <= 0; P['eyes-shut'].visible = !P.eyes.visible;
    }
    this.syncShadows();
  }
}

/** The girl, built from the contract's parts. */
export function makeGirl(scene, x, y, scale = 1) {
  // the paper girl has her eyes painted on and a second head to blink with; the old one had separate eyes
  const painted = scene.textures.exists('girl/head-blink');
  const p = new Puppet(scene, x, y, 'girl', [
    { key: 'arm-r', at: 'shoulder-r', behind: true },
    { key: 'leg-l', at: 'hip-l', behind: true }, { key: 'leg-r', at: 'hip-r', behind: true },
    { key: 'arm-l', at: 'shoulder-l' },
    { key: 'head', at: 'neck' }, ...(painted ? [] : [{ key: 'eyes', at: 'neck' }, { key: 'eyes-shut', at: 'neck' }]),
  ], scale);
  if (painted) { p.blinkTex = 'girl/head-blink'; return p; }
  const head = art(scene, 'girl/head'); const eyesAt = head.meta.points?.eyes || { x: 0.5, y: 0.55 };
  p.eyeOffset = { x: (eyesAt.x - head.pivot.x) * head.meta.width, y: (eyesAt.y - head.pivot.y) * head.meta.height };
  return p;
}

/** Barlin: body, two wings flapping about their root, a hat. Hovering is done by whoever owns him. */
export class Barlin extends Phaser.GameObjects.Container {
  constructor(scene, x, y, scale = 1) {
    super(scene, x, y); scene.add.existing(this);
    const s = art(scene, 'barlin/body').scale, px = 1 / s;
    const body = art(scene, 'barlin/body'); const bw = body.meta.width, bh = body.meta.height;
    const pt = (name, d) => { const q = body.meta.points?.[name] || d; return { x: (q.x - body.pivot.x) * bw, y: (q.y - body.pivot.y) * bh }; };
    const wb = pt('wing-back', { x: 0.45, y: 0.4 }), wf = pt('wing-front', { x: 0.5, y: 0.5 }), hat = pt('hat', { x: 0.85, y: 0.2 });
    const a = k => art(scene, `barlin/${k}`).pivot;
    this.wingBack = scene.add.image(wb.x, wb.y, 'barlin/wing-back').setOrigin(a('wing-back').x, a('wing-back').y).setScale(px).setTint(0xd6ccc2); // the far wing sits in his own shade
    this.body = scene.add.image(0, 0, 'barlin/body').setOrigin(body.pivot.x, body.pivot.y).setScale(px);
    this.wingFront = scene.add.image(wf.x, wf.y, 'barlin/wing-front').setOrigin(a('wing-front').x, a('wing-front').y).setScale(px);
    this.hat = scene.add.image(hat.x, hat.y, 'barlin/hat').setOrigin(a('hat').x, a('hat').y).setScale(px).setRotation(0.35);
    this.glow = scene.add.image(0, 0, 'forest/wisp').setOrigin(0.5).setScale(px * 3).setTint(0xffb060).setAlpha(0).setBlendMode(Phaser.BlendModes.ADD);
    const shade = (img, key) => { const sk = `barlin/${key}~shadow`; if (!scene.textures.exists(sk)) return null; const sa = art(scene, sk); return scene.add.image(0, 0, sk).setOrigin(sa.pivot.x, sa.pivot.y).setScale(1 / sa.scale); };
    this.shadowOf = new Map([[this.wingBack, shade(this.wingBack, 'wing-back')], [this.body, shade(this.body, 'body')], [this.wingFront, shade(this.wingFront, 'wing-front')], [this.hat, shade(this.hat, 'hat')]].filter(([, s]) => s));
    const list = [this.glow]; for (const part of [this.wingBack, this.body, this.wingFront, this.hat]) { if (this.shadowOf.get(part)) list.push(this.shadowOf.get(part)); list.push(part); }
    this.add(list);
    this.setScale(scale); this.t = Math.random() * 10; this.facing = 1;
  }
  face(dir) { if (dir && dir !== this.facing) { this.facing = dir; this.scaleX = Math.abs(this.scaleX) * dir; } }
  tick(dt, fuss = 0) {
    this.t += dt; const f = Math.sin(this.t * 16) * 0.6;
    this.wingBack.rotation = -0.52 + f * 0.35; this.wingFront.rotation = -1.22 - f * 0.35; // resting angles measured from his picture (tools/fit-kit.mjs)
    this.hat.rotation = 0.35 + Math.sin(this.t * 3) * 0.05 * (1 + fuss * 3);
    this.body.y = Math.sin(this.t * 2.1) * 3;
    for (const [p, sh] of this.shadowOf) sh.setPosition(p.x + SHADOW.x, p.y + SHADOW.y).setRotation(p.rotation);
  }
}
