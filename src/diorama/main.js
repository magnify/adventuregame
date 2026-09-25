import * as THREE from 'three';

/**
 * The street as a paper diorama: the same cut-out pictures as the game, stood up as cards at real depths
 * in a lit box, so parallax, overlap and shadows come from the space itself instead of being faked per layer.
 * A proof of concept beside the game, not part of it. Units: 1 = 100 scene pixels; the ground is y = 0,
 * the path she walks is z = 0, further back is negative z.
 */
const base = import.meta.env.BASE_URL;
const TEST = new URLSearchParams(location.search).has('test');

const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: TEST });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFShadowMap;
document.body.appendChild(renderer.domElement);
const scene = new THREE.Scene(); scene.background = new THREE.Color(0xe9dcc4);
const camera = new THREE.PerspectiveCamera(26, 1, 0.1, 200);

const loader = new THREE.TextureLoader();
const load = name => new Promise((res, rej) => loader.load(`${base}art/${name}.webp?v=${__BUILD__}`, t => {
  t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = renderer.capabilities.getMaxAnisotropy(); res(t);
}, undefined, rej));
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
  m.castShadow = cast; m.receiveShadow = receive;
  m.customDepthMaterial = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, map: t, alphaTest: 0.5 });
  scene.add(m); return m;
}
/** A floor: a band of a picture laid flat, its top edge at the back. */
function floor(t, x0, x1, z0, z1, y) {
  const g = new THREE.PlaneGeometry(x1 - x0, z1 - z0); g.rotateX(-Math.PI / 2);
  const m = new THREE.Mesh(g, new THREE.MeshLambertMaterial({ map: t }));
  m.position.set((x0 + x1) / 2, y, (z0 + z1) / 2); m.receiveShadow = true; scene.add(m); return m;
}

// warm low daylight raking in from the left, like a lamp on a paper model: lit faces come out at the picture's own
// brightness, and shadows are what the space adds
// measured: ambient at π alone gives the picture's own brightness; this mix keeps lit walls there and shadows at about 3/4
scene.add(new THREE.AmbientLight(0xfff6ea, Math.PI * 0.55));
const sun = new THREE.DirectionalLight(0xfff1dc, Math.PI * 1.25);
sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); sun.shadow.bias = -0.0004; sun.shadow.radius = 5;
Object.assign(sun.shadow.camera, { left: -13, right: 13, top: 11, bottom: -5, near: 1, far: 60 });
scene.add(sun, sun.target);

const Z = { sky: -30, houses: -3.2, lamp: -2.5, cat: -2.1, tree: -1.3, path: 0, kerb: 1, rail: 5.6 };
const X0 = -10, X1 = 34, KERB = 0.3;
const names = ['street-sky', 'street-houses', 'street-pavement', 'street-near', 'street-tree', 'street-lamp', 'street-cat',
  'street-door-closed', 'street-mat', 'girl-stand', 'girl-stand-blink', 'girl-walk-1', 'girl-walk-2'];
const T = Object.fromEntries(await Promise.all(names.map(async n => [n, await load(n)])));

card(T['street-sky'], 108, 36, { py: 0, cast: false, receive: false, lit: false }).position.set(12, -2, Z.sky);
const houses = card(T['street-houses'], 43, 6.3, { cast: false }); houses.position.set(12, 0, Z.houses);
// the pavement picture is slabs (rows 0-168), the kerb's face (168-200) and the cobbled road (200-400)
floor(band(T['street-pavement'], 0, 168, 400, 4.2), X0, X1, Z.houses, Z.kerb, 0);
const kerb = card(band(T['street-pavement'], 168, 200, 400, 4.2), X1 - X0, KERB, { cast: false }); kerb.position.set((X0 + X1) / 2, -KERB, Z.kerb);
floor(crop(T['street-pavement'], 200, 400, 4.2, 7), X0, X1, Z.kerb, Z.rail + 9, -KERB); // runs on under the camera, so an upright phone never sees its edge
const railTex = band(T['street-near'], 0, 200, 200, 4.3);
const rail = card(railTex, X1 - X0, 1, { cast: true }); rail.position.set((X0 + X1) / 2, -KERB, Z.rail);

const lamp = card(T['street-lamp'], 0.48, 3); lamp.position.set(8.2, 0, Z.lamp);
const cat = card(T['street-cat'], 0.81, 0.9); cat.position.set(11.5, 0, Z.cat);
const TREE = { x: 17, w: 6.37, h: 9.2 };
const tree = card(T['street-tree'], TREE.w, TREE.h); tree.position.set(TREE.x, -0.06, Z.tree);
const at = (fx, fy) => ({ x: TREE.x - TREE.w / 2 + fx * TREE.w, y: -0.06 + (1 - fy) * TREE.h });
const doorP = at(0.622, 0.536), branchP = at(0.4, 0.507), trunkX = at(0.53, 0.507).x;
const door = card(T['street-door-closed'], 0.56, 0.84, { cast: false }); door.position.set(doorP.x, doorP.y, Z.tree + 0.02);
const mat = card(T['street-mat'], 1.12, 0.14, { cast: false }); mat.position.set(doorP.x, doorP.y, Z.tree + 0.04);

// her: a paper puppet. One picture per pose, a hop in her step, a slight rock; she casts a real shadow
const girl = card(T['girl-stand'], 1.69, 2.6, { px: 0.457 }); girl.position.set(3, 0, Z.path);
const her = { x: 3, target: 3, v: 0, facing: 1, steps: 0, t: 0, blinkAt: 2.5, up: false, busy: false };
const show = key => { if (girl.material.map === T[key]) return; girl.material.map = T[key]; girl.customDepthMaterial.map = T[key]; girl.customDepthMaterial.needsUpdate = true; };

const cam = { x: 5, closeUp: 0 };
const wait = ms => new Promise(r => timers.push({ at: clock + ms / 1000, r }));
let clock = 0; const timers = [];
const fade = (to, s) => new Promise(r => tweens.push({ from: girl.material.opacity, to, t: 0, s, r }));
const tweens = [];

async function walkTo(x) { her.target = Math.max(0.8, Math.min(TREE.x + 1.2, x)); while (Math.abs(her.x - her.target) > 0.02) await wait(30); }
async function climb() {
  her.busy = true; await walkTo(trunkX); her.facing = 1;
  await fade(0, 0.26);
  her.up = true; her.x = her.target = branchP.x; girl.position.y = branchP.y; girl.position.z = Z.tree + 0.05; cam.closeUp = 1;
  await wait(250); await fade(1, 0.35); her.busy = false;
}
async function descend() {
  her.busy = true; cam.closeUp = 0; await fade(0, 0.24);
  her.up = false; her.x = her.target = trunkX; girl.position.y = 0; girl.position.z = Z.path;
  await fade(1, 0.3); her.busy = false;
}
const wiggle = (o, amp = 0.07) => { const t0 = clock; jiggles.push({ o, t0, amp }); };
const jiggles = [];

// taps: a thing if one is under the finger, otherwise the ground
const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(), ground = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
renderer.domElement.addEventListener('pointerdown', e => {
  if (her.busy) return;
  ndc.set(e.clientX / innerWidth * 2 - 1, -(e.clientY / innerHeight) * 2 + 1); ray.setFromCamera(ndc, camera);
  const hit = ray.intersectObjects([door, mat, cat, lamp, tree]).find(h => { const a = h.uv && sampleAlpha(h.object, h.uv); return a === undefined || a > 0.3; });
  if (her.up) { if (hit && (hit.object === door || hit.object === mat)) wiggle(hit.object); else descend(); return; }
  if (hit?.object === tree || hit?.object === door) { climb(); return; }
  if (hit?.object === cat) { walkTo(cat.position.x - 1.1).then(() => { her.facing = 1; hop(cat); }); return; }
  if (hit?.object === lamp) { walkTo(lamp.position.x - 1).then(() => { her.facing = 1; wiggle(lamp); }); return; }
  const p = ray.ray.intersectPlane(ground, new THREE.Vector3()); if (p) her.target = Math.max(0.8, Math.min(TREE.x + 1.2, p.x));
});
const hop = o => { const t0 = clock; hops.push({ o, t0 }); }; const hops = [];
// taps pass through the clear parts of a picture
const alphaCache = new Map();
function sampleAlpha(obj, uv) {
  const img = obj.material.map?.image; if (!img) return undefined;
  let c = alphaCache.get(img); if (!c) { const cv = document.createElement('canvas'); cv.width = 128; cv.height = Math.round(128 * img.height / img.width); cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height); c = { cv, d: cv.getContext('2d').getImageData(0, 0, cv.width, cv.height).data }; alphaCache.set(img, c); }
  const x = Math.min(c.cv.width - 1, Math.floor(uv.x * c.cv.width)), y = Math.min(c.cv.height - 1, Math.floor((1 - uv.y) * c.cv.height));
  return c.d[(y * c.cv.width + x) * 4 + 3] / 255;
}

function resize() {
  renderer.setSize(innerWidth, innerHeight, false); camera.aspect = innerWidth / innerHeight;
  camera.fov = camera.aspect < 1 ? 62 : camera.aspect < 1.5 ? 44 : 34; camera.updateProjectionMatrix();
}
addEventListener('resize', resize); resize();

const camPos = new THREE.Vector3(5, 3, 15), camLook = new THREE.Vector3(5, 2.4, -1);
function update(dt) {
  clock += dt;
  for (let i = timers.length - 1; i >= 0; i--) if (clock >= timers[i].at) { timers[i].r(); timers.splice(i, 1); }
  for (let i = tweens.length - 1; i >= 0; i--) { const w = tweens[i]; w.t = Math.min(1, w.t + dt / w.s); girl.material.opacity = w.from + (w.to - w.from) * w.t; if (w.t >= 1) { w.r(); tweens.splice(i, 1); } }
  // walk: eased speed, the step count builds with distance so her feet never skate
  const d = her.target - her.x, want = Math.sign(d) * Math.min(2.6, Math.abs(d) * 3);
  her.v += (want - her.v) * Math.min(1, dt * 6); if (Math.abs(d) < 0.02) { her.v = 0; her.x = her.target; }
  her.x += her.v * dt; if (Math.abs(her.v) > 0.05) her.facing = Math.sign(her.v);
  const walking = Math.abs(her.v) > 0.15; her.t += dt;
  if (walking) {
    her.steps += Math.abs(her.v) * dt * 1.7; show(Math.floor(her.steps) % 2 ? 'girl-walk-2' : 'girl-walk-1');
    girl.position.y = (her.up ? branchP.y : 0) + Math.abs(Math.sin(her.steps * Math.PI)) * 0.05; girl.rotation.z = Math.sin(her.steps * Math.PI) * 0.03 * her.facing;
  } else {
    her.steps = 0; girl.rotation.z = 0; girl.position.y = her.up ? branchP.y : 0;
    if (her.t > her.blinkAt) { her.blinkAt = her.t + 2.5 + Math.random() * 3; } show(her.t > her.blinkAt - 0.13 && her.t < her.blinkAt ? 'girl-stand-blink' : 'girl-stand');
  }
  girl.position.x = her.x; girl.scale.x = her.facing;
  for (let i = jiggles.length - 1; i >= 0; i--) { const j = jiggles[i], k = (clock - j.t0) / 0.45; j.o.rotation.z = k < 1 ? Math.sin(k * Math.PI * 4) * j.amp * (1 - k) : 0; if (k >= 1) jiggles.splice(i, 1); }
  for (let i = hops.length - 1; i >= 0; i--) { const h = hops[i], k = (clock - h.t0) / 0.4; h.o.position.y = k < 1 ? Math.sin(k * Math.PI) * 0.35 : 0; if (k >= 1) hops.splice(i, 1); }
  // camera: follows her with a little lead along the street; up the tree it moves in through the layers to the door
  const k = 1 - Math.exp(-dt * 2.6);
  cam.x += (Math.max(4.5, Math.min(19, her.x + her.facing * 1.2)) - cam.x) * k;
  const wantPos = cam.closeUp ? new THREE.Vector3(doorP.x - 0.8, doorP.y + 1.7, Z.tree + 7) : new THREE.Vector3(cam.x, 3, 15);
  const wantLook = cam.closeUp ? new THREE.Vector3(doorP.x - 0.9, doorP.y + 1.3, Z.tree) : new THREE.Vector3(cam.x, 2.4, -1);
  camPos.lerp(wantPos, k); camLook.lerp(wantLook, k); camera.position.copy(camPos); camera.lookAt(camLook);
  sun.position.set(camLook.x - 9, 7.5, 6.5); sun.target.position.set(camLook.x, 0, -1);
}

if (TEST) {
  // the checks drive time themselves: the page only moves when stepped
  // between frames, promise hand-offs settle (as they do between real frames), so a sequence never waits a whole batch
  window.__dio = { step: async (n = 1, ms = 1000 / 30) => { for (let i = 0; i < n; i++) { update(ms / 1000); await new Promise(r => setTimeout(r, 0)); } renderer.render(scene, camera); }, her, cam, girl, door, tree, cat, camera, renderer, scene, sun, walkTo, climb, descend };
  window.__dio.step(1);
} else {
  let last = performance.now();
  renderer.setAnimationLoop(now => { update(Math.min(0.05, (now - last) / 1000)); last = now; renderer.render(scene, camera); });
}
document.body.dataset.ready = '1';
