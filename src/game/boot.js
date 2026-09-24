import Phaser from 'phaser';
import { L } from './lines.js';
import { ui } from './ui.js';
import { preloadSfx } from './audio.js';
import { save } from './save.js';

const base = import.meta.env.BASE_URL;

/** Loads the art manifest and every image in it, then hands over to the first scene. */
export class Boot extends Phaser.Scene {
  constructor() { super('boot'); }
  preload() {
    ui.loading(L('loading'));
    this.load.json('manifest', `${base}art/manifest.json?v=${__BUILD__}`);
    preloadSfx(this);
  }
  create() {
    const manifest = this.cache.json.get('manifest');
    this.registry.set('manifest', manifest);
    for (const [key, meta] of Object.entries(manifest.images)) this.load.image(key, `${base}art/${meta.file}?v=${__BUILD__}`);
    // the words' font has to be in before the first bubble, or it's drawn in a stand-in; never wait more than a few seconds for it
    const font = Promise.race([document.fonts.load('700 27px Mali', 'Hvad er det? åøæ…'), new Promise(r => setTimeout(r, 4000))]);
    this.load.once('complete', () => font.then(() => { ui.loaded(); const s = save.get('scene', 'street'); this.scene.start(['street', 'meadow', 'forest', 'swamp'].includes(s) ? s : 'street'); }));
    this.load.once('loaderror', f => ui.fail('Could not load ' + (f && f.key)));
    this.load.start();
  }
}

/** Pixel size and pivot for an image key, at the manifest's scale. */
export function art(scene, key) {
  const m = scene.registry.get('manifest'); const im = m.images[key];
  if (!im) throw new Error('no art for ' + key);
  const sc = im.scale ?? m.scale; // big strips are rendered smaller to stay inside phone texture limits
  return { w: im.width * sc, h: im.height * sc, scale: sc, pivot: im.pivot || { x: 0.5, y: 1 }, meta: im };
}
