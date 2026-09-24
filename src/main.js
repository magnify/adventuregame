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
// ?test: the game runs only when a test steps it, one frame at a time, so every run plays out exactly the same
const TEST = new URLSearchParams(location.search).has('test');
addEventListener('error', e => { if (!document.getElementById('loading').classList.contains('off')) ui.fail('The forest could not load: ' + (e.message || e.type)); });

const game = new Phaser.Game({
  type: Phaser.WEBGL,
  canvas: document.getElementById('view'),
  backgroundColor: '#101830',
  scale: { mode: Phaser.Scale.RESIZE, width: innerWidth, height: innerHeight },
  render: { antialias: true, pixelArt: false, roundPixels: false, powerPreference: 'high-performance', preserveDrawingBuffer: TEST },
  input: { activePointers: 2 },
  scene: [Boot, Street, Meadow, Forest, Swamp],
});
game.registry.set('tier', tier);
window.__game = game;
if (TEST) {
  let now = 0;
  // tweens read the wall clock; in a test the clock is the steps, so a two-second climb takes two seconds of steps
  const t0 = Date.now(); Date.now = () => t0 + now;
  game.events.once('ready', () => game.loop.sleep());
  /** Advance the game by n frames of ms each. */
  // Phaser wakes its own loop on focus and visibility; keep it asleep so only the test moves time
  window.__step = (n = 1, ms = 1000 / 30) => { if (game.loop.running) game.loop.sleep(); for (let i = 0; i < n; i++) { now += ms; game.step(now, ms); } };
  game.events.on('resume', () => game.loop.sleep()); game.events.on('visible', () => game.loop.sleep());
}

// start over: wipe progress and go back to the street
const reset = document.createElement('button'); reset.id = 'reset'; reset.title = 'Start over'; reset.textContent = '↺';
reset.addEventListener('click', () => { for (const k of ['scene', 'pocket']) save.del(k); for (const s of ['street', 'meadow', 'forest', 'swamp']) { save.del(`${s}.x`); save.del(`${s}.flags`); } location.reload(); });
document.body.appendChild(reset);
