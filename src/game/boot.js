import Phaser from 'phaser';
import { ui } from './ui.js';
import { preloadSfx } from './audio.js';
import { save } from './save.js';

const base = import.meta.env.BASE_URL;

/** Loads the art manifest and every image in it, then hands over to the first scene. */
export class Boot extends Phaser.Scene {
  constructor() { super('boot'); }
  preload() {
    ui.loading('Cutting out the forest…');
    this.load.json('manifest', `${base}art/manifest.json`);
    preloadSfx(this);
  }
  create() {
    const manifest = this.cache.json.get('manifest');
    this.registry.set('manifest', manifest);
    for (const [key, meta] of Object.entries(manifest.images)) this.load.image(key, `${base}art/${meta.file}`);
    this.load.once('complete', () => { ui.loaded(); const s = save.get('scene', 'street'); this.scene.start(['street', 'meadow', 'forest', 'swamp'].includes(s) ? s : 'street'); });
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
