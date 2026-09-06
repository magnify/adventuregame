import * as THREE from 'three';
import './ui.css';
import { pickTier } from './tier.js';
import { ui, makeDebug } from './ui.js';
import { save } from './save.js';
import { loadModel, prepareMaterials } from './assets.js';
import { forest } from '../scenes/forest.js';

const SCENES = { forest };

export async function start() {
  const tier = pickTier();
  const canvas = document.getElementById('view');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: tier.antialias });
  renderer.setPixelRatio(tier.pixelRatio);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = tier.shadows;
  renderer.shadowMap.type = THREE.PCFShadowMap;

  canvas.addEventListener('webglcontextlost', e => {
    e.preventDefault(); save.set('lite', true);
    ui.fail('The forest was too heavy for this device. Reloading a lighter one…');
    setTimeout(() => location.reload(), 1200);
  });
  addEventListener('error', e => { if (!document.getElementById('loading').classList.contains('off')) ui.fail('The forest could not load: ' + (e.message || e.type)); });

  const camera = new THREE.PerspectiveCamera(34, 1, 0.1, tier.far);
  const resize = () => { renderer.setSize(innerWidth, innerHeight, false); camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); };
  addEventListener('resize', resize); resize();

  const debug = tier.debug ? makeDebug(renderer, tier) : null;

  // ---- assets shared by every scene
  ui.loading('Growing the forest…');
  const [kit, rogue] = await Promise.all([loadModel('nature'), loadModel('rogue')]);
  prepareMaterials(kit.scene, tier); prepareMaterials(rogue.scene, tier);
  const assets = { kit: kit.scene, rogue };

  // ---- scene lifecycle
  const ctx = { THREE, renderer, camera, tier, assets, save, ui };
  let current = null;
  async function enter(name, state) {
    if (current) current.dispose();
    current = SCENES[name](ctx);
    await current.build(state);
    save.set('scene', name);
  }

  // ---- input: a tap is a short press that didn't drag
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
  let down = null;
  canvas.addEventListener('pointerdown', e => { down = [e.clientX, e.clientY]; });
  canvas.addEventListener('pointerup', e => {
    if (!down || !current) return;
    const moved = Math.hypot(e.clientX - down[0], e.clientY - down[1]); down = null;
    if (moved > 12) return;
    ndc.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    current.tap(ray);
  });
  window.__game = { get scene() { return current; }, enter };

  // ---- first scene
  const startScene = save.get('scene', 'forest');
  await enter(startScene in SCENES ? startScene : 'forest');
  ui.loaded();

  // ---- loop
  const clock = new THREE.Timer();
  function frame() {
    clock.update();
    const dt = Math.min(clock.getDelta(), 0.05), time = clock.getElapsed();
    if (current) { current.update(dt, time); renderer.render(current.scene, camera); }
    debug?.tick(dt);
    requestAnimationFrame(frame);
  }
  frame();
}
