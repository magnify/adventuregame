import Phaser from 'phaser';
import './game/ui.css';
import { pickTier } from './game/tier.js';
import { ui } from './game/ui.js';
import { Boot } from './game/boot.js';
import { Forest } from './scenes/forest.js';

const tier = pickTier();
addEventListener('error', e => { if (!document.getElementById('loading').classList.contains('off')) ui.fail('The forest could not load: ' + (e.message || e.type)); });

const game = new Phaser.Game({
  type: Phaser.WEBGL,
  canvas: document.getElementById('view'),
  backgroundColor: '#101830',
  scale: { mode: Phaser.Scale.RESIZE, width: innerWidth, height: innerHeight },
  render: { antialias: true, pixelArt: false, roundPixels: false, powerPreference: 'high-performance' },
  input: { activePointers: 2 },
  scene: [Boot, Forest],
});
game.registry.set('tier', tier);
window.__game = game;
