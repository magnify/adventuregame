import Phaser from 'phaser';
import './game/ui.css';
import { pickTier } from './game/tier.js';
import { ui } from './game/ui.js';
import { save } from './game/save.js';
import { Boot } from './game/boot.js';
import { Street } from './scenes/street.js';
import { Meadow } from './scenes/meadow.js';
import { Forest } from './scenes/forest.js';
import { Swamp } from './scenes/swamp.js';

const tier = pickTier();
addEventListener('error', e => { if (!document.getElementById('loading').classList.contains('off')) ui.fail('The forest could not load: ' + (e.message || e.type)); });

const game = new Phaser.Game({
  type: Phaser.WEBGL,
  canvas: document.getElementById('view'),
  backgroundColor: '#101830',
  scale: { mode: Phaser.Scale.RESIZE, width: innerWidth, height: innerHeight },
  render: { antialias: true, pixelArt: false, roundPixels: false, powerPreference: 'high-performance' },
  input: { activePointers: 2 },
  scene: [Boot, Street, Meadow, Forest, Swamp],
});
game.registry.set('tier', tier);
window.__game = game;

// start over: wipe progress and go back to the street
const reset = document.createElement('button'); reset.id = 'reset'; reset.title = 'Start over'; reset.textContent = '↺';
reset.addEventListener('click', () => { for (const k of ['scene', 'pocket']) save.del(k); for (const s of ['street', 'meadow', 'forest', 'swamp']) { save.del(`${s}.x`); save.del(`${s}.flags`); } location.reload(); });
document.body.appendChild(reset);
