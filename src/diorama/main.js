import * as THREE from 'three';
import '../game/ui.css';
import { ui } from '../game/ui.js';
import { pocket } from '../game/pocket.js';
import { L, language } from '../game/lines.js';
import { say, tickBubbles } from './bubble.js';
import { sfx } from './sfx.js';

/**
 * The street as a paper diorama: the game's cut-out pictures stood up as cards at real depths in a lit box, so
 * parallax, overlap and shadows come from the space itself. The story is the game's: the glint in the tree, the
 * locked door, the key under the mat, the pocket, the light, and through. Units: 1 = 100 scene pixels; the ground is
 * y = 0, the path she walks is z = 0, further back is negative z.
 */
const base = import.meta.env.BASE_URL;
const TEST = new URLSearchParams(location.search).has('test');

const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: TEST });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFShadowMap;
document.body.prepend(renderer.domElement);
const scene = new THREE.Scene(); scene.background = new THREE.Color(0xe9dcc4);
const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 200);

// ---- pictures
const loader = new THREE.TextureLoader();
// fetched as data first (as the game does), so pictures from a different file host still draw and can be read back
const load = name => fetch(`${base}art/${name}.${name.startsWith('forest') ? 'png' : 'webp'}?v=${__BUILD__}`)
  .then(r => { if (!r.ok) throw new Error(`${name}: ${r.status}`); return r.blob(); })
  .then(b => new Promise((res, rej) => loader.load(URL.createObjectURL(b), t => {
    t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = renderer.capabilities.getMaxAnisotropy(); res(t);
  }, undefined, rej)));
addEventListener('unhandledrejection', e => ui.fail(`Couldn't load the street: ${e.reason?.message || e.reason}`));
ui.loading(L('loading'));
const names = ['street-sky', 'street-houses', 'street-pavement', 'street-near', 'street-tree', 'street-lamp', 'street-cat',
  'street-door-closed', 'street-door-open', 'street-mat', 'street-key', 'street-tree-bed', 'forest-wisp',
  'girl-stand', 'girl-stand-blink', 'girl-walk-1', 'girl-walk-2', 'girl-reach'];
const T = Object.fromEntries(await Promise.all(names.map(async n => [n, await load(n)])));

/** A horizontal band of a picture (rows a..b of h), repeated across. */
const band = (t, a, b, h, rep = 1) => { const c = t.clone(); c.wrapS = THREE.RepeatWrapping; c.repeat.set(rep, (b - a) / h); c.offset.set(0, 1 - b / h); c.needsUpdate = true; return c; };
/** Rows a..b of a picture as a picture of their own, so they can repeat both ways. */
function crop(t, a, b, repX, repY) {
  const im = t.image, cv = document.createElement('canvas'); cv.width = im.width; cv.height = b - a;
  cv.getContext('2d').drawImage(im, 0, a, im.width, b - a, 0, 0, im.width, b - a);
  const c = new THREE.CanvasTexture(cv); c.colorSpace = THREE.SRGBColorSpace; c.wrapS = c.wrapT = THREE.RepeatWrapping; c.repeat.set(repX, repY);
  c.anisotropy = renderer.capabilities.getMaxAnisotropy(); return c;
}
/** A paper card standing up: origin at its pivot (px across, py up from the bottom), casting a cut-out shadow. */
function card(t, w, h, { px = 0.5, py = 0, cast = true, receive = true, lit = true } = {}) {
  const g = new THREE.PlaneGeometry(w, h); g.translate((0.5 - px) * w, (0.5 - py) * h, 0);
  const opts = { map: t, transparent: true, alphaTest: 0.02, side: THREE.DoubleSide };
  const m = new THREE.Mesh(g, lit ? new THREE.MeshLambertMaterial(opts) : new THREE.MeshBasicMaterial(opts));
  m.castShadow = cast; m.receiveShadow = receive; m.userData.box = { w, h, px, py };
  m.customDepthMaterial = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, map: t, alphaTest: 0.5 });
  scene.add(m); return m;
}
function floor(t, x0, x1, z0, z1, y) {
  const g = new THREE.PlaneGeometry(x1 - x0, z1 - z0); g.rotateX(-Math.PI / 2);
  const m = new THREE.Mesh(g, new THREE.MeshLambertMaterial({ map: t }));
  m.position.set((x0 + x1) / 2, y, (z0 + z1) / 2); m.receiveShadow = true; scene.add(m); return m;
}
/** A soft additive glow: the glint in the tree, the light through the door. */
function glow(color, size) {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: T['forest-wisp'], color, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false }));
  s.scale.setScalar(size); scene.add(s); return s;
}

// ---- light: low warm daylight raking in from the left, like a lamp on a paper model. Measured: ambient at π alone
// gives the picture's own brightness; this mix keeps lit walls there and shadows at about three quarters
scene.add(new THREE.AmbientLight(0xfff6ea, Math.PI * 0.55));
const sun = new THREE.DirectionalLight(0xfff1dc, Math.PI * 1.25);
sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); sun.shadow.bias = -0.0004; sun.shadow.radius = 5;
Object.assign(sun.shadow.camera, { left: -13, right: 13, top: 11, bottom: -5, near: 1, far: 60 });
scene.add(sun, sun.target);

// ---- the set
const Z = { sky: -30, houses: -3.2, lamp: -2.5, cat: -2.1, tree: -1.3, path: 0, kerb: 1, rail: 5.6 };
const X0 = -10, X1 = 34, KERB = 0.3;
// the back of the set is drawn first, so the tree's bed can lie over the paving in front of it
const sky = card(T['street-sky'], 108, 36, { cast: false, receive: false, lit: false }); sky.position.set(12, -2, Z.sky); sky.renderOrder = -3;
const houses = card(T['street-houses'], 43, 6.3, { cast: false }); houses.position.set(12, 0, Z.houses); houses.renderOrder = -2;
// the pavement picture is slabs (rows 0-168), the kerb's face (168-200) and the cobbled road (200-400)
floor(band(T['street-pavement'], 0, 168, 400, 4.2), X0, X1, Z.houses, Z.kerb, 0);
card(band(T['street-pavement'], 168, 200, 400, 4.2), X1 - X0, KERB, { cast: false }).position.set((X0 + X1) / 2, -KERB, Z.kerb);
floor(crop(T['street-pavement'], 200, 400, 4.2, 7), X0, X1, Z.kerb, Z.rail + 9, -KERB); // runs on under the camera
card(band(T['street-near'], 0, 200, 200, 4.3), X1 - X0, 1).position.set((X0 + X1) / 2, -KERB, Z.rail);

const lamp = card(T['street-lamp'], 0.48, 3); lamp.position.set(8.2, 0, Z.lamp);
const cat = card(T['street-cat'], 0.81, 0.9); cat.position.set(11.5, 0, Z.cat);
// the tree grows from its own bed of earth cut into the paving. The bed is a picture drawn from above, so it lies over
// the paving like the game's does (drawn after it, whatever its depth), and the tree stands in it, roots in the soil
const TREE = { x: 17, y: -0.45, w: 6.37, h: 9.2 }, BED = { top: 0.15, w: 7.6, h: 1.1 };
const bed = card(T['street-tree-bed'], BED.w, BED.h, { py: 0.7, cast: false }); bed.position.set(TREE.x, BED.top - 0.3 * BED.h, Z.tree);
bed.material.depthTest = false; bed.renderOrder = -1;
const tree = card(T['street-tree'], TREE.w, TREE.h); tree.position.set(TREE.x, TREE.y, Z.tree); tree.material.depthTest = false;
const at = (fx, fy) => ({ x: TREE.x - TREE.w / 2 + fx * TREE.w, y: TREE.y + (1 - fy) * TREE.h });
const doorP = at(0.622, 0.536), branchP = at(0.4, 0.507), trunkX = at(0.53, 0.507).x;
const door = card(T['street-door-closed'], 0.56, 0.84, { cast: false }); door.position.set(doorP.x, doorP.y, Z.tree + 0.02);
// the mat hinges on its left edge, so lifting it tips the right end up like a real doormat; the key lies under its middle
const MAT_UP = 32 * Math.PI / 180;
const mat = card(T['street-mat'], 1.12, 0.14, { px: 0.03, cast: false }); mat.position.set(doorP.x - 0.47 * 1.12, doorP.y - 0.05, Z.tree + 0.05);
const KEY_AT = new THREE.Vector3(doorP.x + 0.06, doorP.y + 0.01, Z.tree + 0.04);
const key = card(T['street-key'], 0.64, 0.2, { py: 0.5, cast: false }); key.position.copy(KEY_AT); key.rotation.z = 0.14; key.visible = false;
const glint = glow(0xffe28a, 0.9); glint.position.set(doorP.x + 0.12, doorP.y + 0.5, Z.tree + 0.1);

// ---- her: a paper puppet. One picture per pose, a hop in her step, a slight rock; she casts a real shadow
const girl = card(T['girl-stand'], 1.69, 2.6, { px: 0.457 }); girl.position.set(3, 0, Z.path);
const START = 3;
const her = { x: START, target: START, v: 0, facing: 1, steps: 0, t: 0, blinkAt: 2.5, up: false, pose: null, shrinking: false };
const show = k => { if (girl.material.map === T[k]) return; girl.material.map = T[k]; girl.customDepthMaterial.map = T[k]; girl.customDepthMaterial.needsUpdate = true; };
const flags = { begun: false, matUp: false, triedDoor: false, through: false };
let busy = true; // until the start card is answered

// ---- time: everything runs on the scene's clock, so a check can step it frame by frame
let clock = 0; const timers = [], tweens = [];
const wait = ms => new Promise(r => timers.push({ at: clock + ms / 1000, r }));
const ease = { lin: p => p, sineInOut: p => 0.5 - Math.cos(p * Math.PI) / 2, quadOut: p => 1 - (1 - p) ** 2, quadIn: p => p * p, cubicIn: p => p ** 3,
  backOut: p => 1 + 2.70158 * (p - 1) ** 3 + 1.70158 * (p - 1) ** 2,
  bounceOut: p => { const n = 7.5625, d = 2.75; if (p < 1 / d) return n * p * p; if (p < 2 / d) return n * (p -= 1.5 / d) * p + 0.75; if (p < 2.5 / d) return n * (p -= 2.25 / d) * p + 0.9375; return n * (p -= 2.625 / d) * p + 0.984375; } };
/** Run apply(p) for p from 0 to 1 over s seconds. */
const tween = (apply, s, e = ease.sineInOut) => new Promise(r => tweens.push({ apply, s, e, t: 0, r }));
const lerp = (a, b, p) => a + (b - a) * p;
const fadeHer = to => { const from = girl.material.opacity; return tween(p => { girl.material.opacity = lerp(from, to, p); }, to ? 0.32 : 0.26); };

// ---- where things are on screen: for bubbles, the pocket's key flight, and the checks
const v3 = new THREE.Vector3();
function screenBox(o) {
  const { w, h, px, py } = o.userData.box; let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
  for (const [cx, cy] of [[-px * w, -py * h], [(1 - px) * w, -py * h], [-px * w, (1 - py) * h], [(1 - px) * w, (1 - py) * h]]) {
    v3.set(cx, cy, 0); o.localToWorld(v3); v3.project(camera);
    const sx = (v3.x + 1) / 2 * innerWidth, sy = (1 - v3.y) / 2 * innerHeight;
    x0 = Math.min(x0, sx); x1 = Math.max(x1, sx); y0 = Math.min(y0, sy); y1 = Math.max(y1, sy);
  }
  return { x: (x0 + x1) / 2, top: y0, left: x0, right: x1, h: y1 - y0, bottom: y1 };
}
// her picture is wider than she is, so a bubble beside her aims at the middle, where her face is
const headOf = o => () => { const b = screenBox(o), w = b.right - b.left; return o === girl ? { ...b, left: b.left + w * 0.28, right: b.right - w * 0.28 } : b; };
const talk = (o, line) => { sfx.play('pop', { volume: 0.35 }); return say(headOf(o), line); };

// ---- what she does
const clampX = x => Math.max(0.8, Math.min(TREE.x + 1.2, x));
async function walkTo(x) { her.target = clampX(x); while (Math.abs(her.x - her.target) > 0.02) await wait(30); }
async function climb() {
  if (her.up) return;
  await walkTo(trunkX); her.facing = 1;
  sfx.play('whoosh', { volume: 0.3, rate: 1.3 }); await fadeHer(0);
  her.up = true; her.x = her.target = branchP.x; girl.position.z = Z.tree + 0.07;
  tween(p => { glint.material.opacity = 1 - p; }, 0.5); cam.closeUp = 1;
  await wait(180); await fadeHer(1);
}
async function descend() {
  cam.closeUp = 0; sfx.play('whoosh', { volume: 0.3, rate: 1.1 }); await fadeHer(0);
  her.up = false; her.x = her.target = trunkX; girl.position.z = Z.path;
  await fadeHer(1);
}
const wiggle = (o, amp = 0.07, s = 0.45) => { const r0 = o.rotation.z; return tween(p => { o.rotation.z = r0 + Math.sin(p * Math.PI * 4) * amp * (1 - p); }, s, ease.lin); };
const hop = o => tween(p => { o.position.y = Math.sin(p * Math.PI) * 0.35; }, 0.4, ease.lin);

const act = {
  async lamp() { await walkTo(lamp.position.x - 1); her.facing = 1; sfx.play('locked'); await wiggle(lamp); },
  async cat() { await walkTo(cat.position.x - 1.1); her.facing = 1; sfx.play('chirp'); hop(cat); await talk(cat, 'miaow'); },
  async tree() { await climb(); },
  async door() {
    await climb(); sfx.play('locked'); wiggle(door, 0.05, 0.3);
    if (pocket.has('key')) { pocket.nudge(); await talk(girl, 'have-key'); }
    else { await talk(girl, flags.triedDoor ? 'where-key' : 'locked'); flags.triedDoor = true; }
  },
  async mat() {
    await climb(); const lifted = mat.rotation.z > MAT_UP / 2; sfx.play('creak', { rate: 1.6, volume: 0.3 });
    if (lifted || pocket.has('key') || flags.through) { const a = mat.rotation.z, b = lifted ? 0 : MAT_UP; await tween(p => { mat.rotation.z = lerp(a, b, p); }, 0.32, lifted ? ease.bounceOut : ease.backOut); return; }
    await tween(p => { mat.rotation.z = MAT_UP * p; }, 0.42, ease.backOut);
    if (!flags.matUp) {
      // the key was there all along: it pops into view with a glint
      key.visible = true; sfx.play('chime', { volume: 0.45 });
      await tween(p => { key.scale.setScalar(0.6 + 0.4 * p); key.position.y = KEY_AT.y + 0.1 * p; }, 0.26, ease.backOut);
      await tween(p => { key.position.y = KEY_AT.y + 0.1 * (1 - p); }, 0.2, ease.bounceOut);
      flags.matUp = true; talk(girl, 'a-key');
    }
  },
  async key() {
    await climb(); if (!flags.matUp || !key.visible) return;
    her.pose = 'girl-reach'; await wait(250); sfx.play('pick');
    // the key flies out of the tree towards you and into the pocket in the corner, growing on the way
    const r = pocket.el.getBoundingClientRect(), fly = new THREE.Raycaster();
    fly.setFromCamera(new THREE.Vector2((r.left + r.width / 2) / innerWidth * 2 - 1, -((r.top + r.height / 2) / innerHeight) * 2 + 1), camera);
    const from = key.position.clone(), to = fly.ray.at(3, new THREE.Vector3());
    await tween(p => { key.position.lerpVectors(from, to, p); key.rotation.z = 0.14 + p * 0.35; key.scale.setScalar(1 + p * 0.8); }, 0.65, ease.cubicIn);
    key.visible = false; pocket.set('key'); her.pose = null;
    await tween(p => { mat.rotation.z = MAT_UP * (1 - p); }, 0.3, ease.bounceOut);
  },
};
/** The thing in her pocket, used on something: only the key on the door does anything. */
async function useOn(o) {
  if (o !== door || !pocket.has('key')) { await wiggle(o, 0.05, 0.3); return; }
  await climb();
  her.pose = 'girl-reach'; sfx.play('unlock'); await wait(500);
  pocket.set(null); door.material.map = T['street-door-open']; sfx.play('creak');
  const light = glow(0xfff6d0, 0.4); light.position.set(doorP.x, doorP.y + 0.42, Z.tree + 0.12); light.material.opacity = 0;
  await tween(p => { light.material.opacity = p; light.scale.setScalar(0.4 + 3.6 * p); }, 0.9, ease.quadOut);
  her.pose = null; await talk(girl, 'wow');
  // leaning closer... and pulled through
  sfx.play('whoosh'); her.shrinking = true; const g0 = girl.position.clone(), f = her.facing;
  await tween(p => { girl.position.lerpVectors(g0, new THREE.Vector3(doorP.x, doorP.y, Z.tree + 0.07), p); girl.scale.set(f * (1 - 0.95 * p), 1 - 0.95 * p, 1); }, 1.1, ease.quadIn);
  girl.visible = false;
  await tween(p => { light.material.opacity = 1 - p; }, 0.3);
  door.material.map = T['street-door-closed']; sfx.play('slam'); cam.shake = 0.2;
  flags.through = true; scene.remove(light);
  await wait(700);
  await ui.card({ title: L('title'), text: L('witch-end'), buttons: [{ id: 'again', label: L('back-to-street') }] });
  reset();
}
function reset() {
  Object.assign(flags, { matUp: false, triedDoor: false, through: false });
  Object.assign(her, { x: START, target: START, v: 0, facing: 1, up: false, pose: null, shrinking: false });
  girl.visible = true; girl.scale.set(1, 1, 1); girl.position.set(START, 0, Z.path); girl.material.opacity = 1;
  mat.rotation.z = 0; key.visible = false; key.scale.setScalar(1); key.position.copy(KEY_AT); key.rotation.z = 0.14;
  glint.material.opacity = 1; cam.closeUp = 0; pocket.set(null);
}

// ---- taps: a thing if one is under the finger (its clear parts don't count), otherwise the ground
const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(), ground = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
const named = new Map([[lamp, 'lamp'], [cat, 'cat'], [tree, 'tree'], [door, 'door'], [mat, 'mat'], [key, 'key']]);
function pick(cx, cy) {
  ndc.set(cx / innerWidth * 2 - 1, -(cy / innerHeight) * 2 + 1); ray.setFromCamera(ndc, camera);
  const hits = ray.intersectObjects([key.visible && key, door, mat, cat, lamp, tree].filter(Boolean)).filter(h => (sampleAlpha(h.object, h.uv) ?? 1) > 0.3);
  const hit = hits.find(h => h.object !== tree) || hits[0]; // up close, small things win over the tree they sit on
  return { hit: hit?.object || null, groundAt: ray.ray.intersectPlane(ground, new THREE.Vector3()) };
}
const run = async f => { busy = true; try { await f(); } finally { busy = false; } };
function tap(cx, cy) {
  sfx.unlock(); if (busy) return;
  const { hit, groundAt } = pick(cx, cy);
  if (pocket.held) { pocket.setHeld(false); if (hit) { run(() => useOn(hit)); return; } }
  if (her.up && (!hit || hit === tree)) { if (groundAt) run(async () => { await descend(); her.target = clampX(groundAt.x); }); return; }
  if (hit) { run(act[named.get(hit)]); return; }
  if (groundAt) her.target = clampX(groundAt.x);
}
renderer.domElement.addEventListener('pointerdown', e => tap(e.clientX, e.clientY));
addEventListener('pocket-drop', e => { if (busy) return; const { hit } = pick(e.detail.x, e.detail.y); if (hit) run(() => useOn(hit)); });
const alphaCache = new Map();
function sampleAlpha(obj, uv) {
  const img = obj.material.map?.image; if (!img || !uv) return undefined;
  let c = alphaCache.get(img);
  if (!c) { const cv = document.createElement('canvas'); cv.width = 128; cv.height = Math.max(1, Math.round(128 * img.height / img.width)); const x = cv.getContext('2d'); x.drawImage(img, 0, 0, cv.width, cv.height); c = { cv, d: x.getImageData(0, 0, cv.width, cv.height).data }; alphaCache.set(img, c); }
  const px = Math.min(c.cv.width - 1, Math.floor(uv.x * c.cv.width)), py = Math.min(c.cv.height - 1, Math.floor((1 - uv.y) * c.cv.height));
  return c.d[(py * c.cv.width + px) * 4 + 3] / 255;
}

function resize() {
  renderer.setSize(innerWidth, innerHeight, false); camera.aspect = innerWidth / innerHeight;
  camera.fov = camera.aspect < 1 ? 62 : camera.aspect < 1.5 ? 44 : 34; camera.updateProjectionMatrix();
}
addEventListener('resize', resize); resize();

// ---- the camera looks at a point from a distance, a height and a turn. Along the street it follows her with a
// little lead and turns a few degrees the way she walks, so the layers slide past each other; up the tree it swings
// round and in through the leaves to the door. Each setting eases on its own, so the move curves instead of sliding.
const cam = { closeUp: 0, shake: 0, x: 5, look: new THREE.Vector3(5, 2.4, -1), dist: 16, lift: 0.6, yaw: 0 };
const YAW_MAX = 0.2; // radians, about 11 degrees: enough to feel the depth, never enough to see round the paper
function updateCamera(dt) {
  const k = 1 - Math.exp(-dt * 2.6), kYaw = 1 - Math.exp(-dt * 1.2), close = cam.closeUp;
  cam.x += (Math.max(4.5, Math.min(19, her.x + her.facing * 1.2)) - cam.x) * k;
  const look = close ? new THREE.Vector3(doorP.x - 0.9, doorP.y + 1.3, Z.tree) : new THREE.Vector3(cam.x, 2.4, -1);
  const drift = Math.sin(clock * 0.35) * (close ? 0.05 : 0.015); // a slow breath, so the layers never sit dead still
  const yaw = Math.max(-YAW_MAX, Math.min(YAW_MAX, (close ? 0.16 : -her.v / 2.6 * 0.09) + drift));
  cam.look.lerp(look, k); cam.dist += ((close ? 7 : 16) - cam.dist) * k; cam.lift += ((close ? 0.4 : 0.6) - cam.lift) * k; cam.yaw += (yaw - cam.yaw) * kYaw;
  camera.position.set(cam.look.x + Math.sin(cam.yaw) * cam.dist, cam.look.y + cam.lift, cam.look.z + Math.cos(cam.yaw) * cam.dist);
  if (cam.shake > 0) { cam.shake -= dt; camera.position.x += (Math.random() - 0.5) * 0.06; camera.position.y += (Math.random() - 0.5) * 0.04; }
  camera.lookAt(cam.look);
  sun.position.set(cam.look.x - 9, 7.5, 6.5); sun.target.position.set(cam.look.x, 0, -1);
}

function update(dt) {
  clock += dt;
  for (let i = timers.length - 1; i >= 0; i--) if (clock >= timers[i].at) { const t = timers[i]; timers.splice(i, 1); t.r(); }
  for (let i = tweens.length - 1; i >= 0; i--) { const w = tweens[i]; w.t = Math.min(1, w.t + dt / w.s); w.apply(w.e(w.t)); if (w.t >= 1) { tweens.splice(i, 1); w.r(); } }
  // walk: eased speed; the step count builds with distance so her feet never skate
  const d = her.target - her.x, want = Math.sign(d) * Math.min(2.6, Math.abs(d) * 3);
  her.v += (want - her.v) * Math.min(1, dt * 6); if (Math.abs(d) < 0.02) { her.v = 0; her.x = her.target; }
  her.x += her.v * dt; if (Math.abs(her.v) > 0.05) her.facing = Math.sign(her.v);
  const walking = Math.abs(her.v) > 0.15; her.t += dt;
  if (!her.shrinking) {
    if (walking) {
      her.steps += Math.abs(her.v) * dt * 1.7; show(Math.floor(her.steps) % 2 ? 'girl-walk-2' : 'girl-walk-1');
      girl.position.y = (her.up ? branchP.y : 0) + Math.abs(Math.sin(her.steps * Math.PI)) * 0.05; girl.rotation.z = Math.sin(her.steps * Math.PI) * 0.03 * her.facing;
    } else {
      her.steps = 0; girl.rotation.z = 0; girl.position.y = her.up ? branchP.y : 0;
      if (her.t > her.blinkAt) her.blinkAt = her.t + 2.5 + Math.random() * 3;
      show(her.pose || (her.t > her.blinkAt - 0.13 && her.t < her.blinkAt ? 'girl-stand-blink' : 'girl-stand'));
    }
    girl.position.x = her.x; girl.scale.x = her.facing;
  }
  glint.scale.setScalar(0.9 * (0.75 + 0.25 * Math.sin(clock * 3.5)));
  updateCamera(dt); tickBubbles(dt);
}

// ---- start: the game's own card, in Danish or English; then she notices the glint
pocket.init(); pocket.set(null);
async function begin() {
  ui.loaded();
  const l = await ui.card({ title: L('title'), text: L('tagline'), buttons: [{ id: 'da', label: 'Dansk' }, { id: 'en', label: 'English' }] });
  language.set(l); sfx.unlock(); flags.begun = true; busy = false; talk(girl, 'whats-that');
}

if (TEST) {
  // the checks drive time themselves; between frames, promise hand-offs settle as they do between real frames
  const objs = { girl, door, mat, key, tree, cat, lamp, bed };
  window.__dio = {
    step: async (n = 1, ms = 1000 / 30) => { for (let i = 0; i < n; i++) { update(ms / 1000); await new Promise(r => setTimeout(r, 0)); } renderer.render(scene, camera); },
    her, cam, flags, pocket, walkTo, descend, busy: () => busy, yaw: () => cam.yaw,
    box: name => screenBox(objs[name]), visible: name => objs[name].visible && (objs[name].material.opacity ?? 1) > 0.05,
    // where to tap a thing: the middle of its picture on screen
    at: name => {
      if (name === 'tree') { v3.set(trunkX, 1.2, Z.tree).project(camera); return { x: (v3.x + 1) / 2 * innerWidth, y: (1 - v3.y) / 2 * innerHeight }; } // the trunk, where a child taps
      const b = screenBox(objs[name]); return { x: b.x, y: (b.top + b.bottom) / 2 };
    },
  };
  update(0); renderer.render(scene, camera);
} else {
  let last = performance.now();
  renderer.setAnimationLoop(now => { update(Math.min(0.05, (now - last) / 1000)); last = now; renderer.render(scene, camera); });
}
begin();
document.body.dataset.ready = '1';
