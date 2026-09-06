import * as THREE from 'three';
import { Path, Walker } from '../game/path.js';
import { Character } from '../game/character.js';
import { makeBarlin } from '../game/barlin.js';
import { Scatter, seeded } from '../game/instances.js';

// World one, scene one: the narrow path through a forest that gets darker, under three suns.
// From the story: a fork, they take the narrow path; it gets mysteriously dark; wisps lead them on into a swamp.

const lerp = (a, b, k) => a + (b - a) * k;
const smooth = k => k * k * (3 - 2 * k);

export function forest(ctx) {
  const { camera, tier, assets, save, ui } = ctx;
  const scene = new THREE.Scene();
  const rnd = seeded();

  // ---- the paths
  const path = new Path([[0, 0, 10], [0, 0, 2], [2.5, 0, -6], [-1.5, 0, -15], [2.5, 0, -25], [-3, 0, -36], [0.5, 0, -47], [-1, 0, -58]]);
  const wide = new Path([[0.5, 0, -2], [-4, 0, -6], [-10, 0, -9], [-17, 0, -10]], 0.5);
  const FORK_T = 0.16;
  const darkness = t => smooth(Math.min(1, Math.max(0, (t - 0.12) / 0.8)));

  // ---- sky, suns, fog
  const SKY_BRIGHT = new THREE.Color('#cfe3f0'), SKY_DARK = new THREE.Color('#0e1428');
  scene.background = SKY_BRIGHT.clone();
  scene.fog = new THREE.FogExp2(SKY_BRIGHT.clone(), 0.012);
  const hemi = new THREE.HemisphereLight('#dff0ff', '#4a6a3a', 0.9); scene.add(hemi);
  const suns = [
    { color: '#FFD98A', dir: [12, 18, 14], i: 2.2, shadow: true },
    { color: '#FFB3C6', dir: [-16, 12, 6], i: 1.1 },
    { color: '#CFE8FF', dir: [3, 22, -14], i: 0.9 },
  ].map(s => {
    const l = new THREE.DirectionalLight(s.color, s.i); l.position.set(...s.dir); l.userData.base = s.i;
    if (s.shadow && tier.shadows) { l.castShadow = true; l.shadow.mapSize.set(tier.shadowMap, tier.shadowMap); const c = l.shadow.camera; c.left = c.bottom = -16; c.right = c.top = 16; c.near = 1; c.far = 80; l.shadow.bias = -0.0008; l.shadow.normalBias = 0.02; }
    scene.add(l); scene.add(l.target); return l;
  });
  const sunSprites = suns.map(l => {
    const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d');
    const grd = g.createRadialGradient(64, 64, 10, 64, 64, 64); grd.addColorStop(0, '#fff'); grd.addColorStop(0.35, l.color.getStyle()); grd.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grd; g.fillRect(0, 0, 128, 128);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, transparent: true, depthWrite: false, fog: false }));
    sp.position.copy(l.position).normalize().multiplyScalar(150); sp.scale.setScalar(26); scene.add(sp); return sp;
  });

  // ---- ground: green fading to dark, a worn strip along the path
  const seg = tier.groundSegments;
  const gGeo = new THREE.PlaneGeometry(160, 160, seg, seg); gGeo.rotateX(-Math.PI / 2);
  {
    const pos = gGeo.attributes.position, col = new Float32Array(pos.count * 3);
    const c1 = new THREE.Color('#6fa85a'), c2 = new THREE.Color('#1d2a24'), worn = new THREE.Color('#9c8a62'), tmp = new THREE.Color(), v = new THREE.Vector3();
    for (let i = 0; i < pos.count; i++) {
      v.set(pos.getX(i), 0, pos.getZ(i));
      const { t, d } = path.nearest(v); const dk = darkness(t);
      tmp.copy(c1).lerp(c2, dk);
      const onPath = Math.max(0, 1 - d / 1.6);
      tmp.lerp(worn.clone().lerp(c2, dk * 0.7), onPath * 0.85);
      pos.setY(i, (Math.sin(v.x * 0.7) * Math.cos(v.z * 0.5) * 0.25 + Math.sin(v.x * 2.1 + v.z) * 0.08) * (1 - onPath) - 0.02);
      col.set([tmp.r, tmp.g, tmp.b], i * 3);
    }
    gGeo.setAttribute('color', new THREE.BufferAttribute(col, 3)); gGeo.computeVertexNormals();
  }
  const ground = new THREE.Mesh(gGeo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1 })); ground.receiveShadow = tier.shadows; scene.add(ground);
  const tapPlane = new THREE.Mesh(new THREE.PlaneGeometry(400, 400).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ visible: false })); scene.add(tapPlane);

  // ---- vegetation, denser and stranger as it gets darker
  const scatter = new Scatter(assets.kit);
  for (let i = 0; i < 400; i++) {
    const t = rnd(); const p = path.point(t), n = path.side(t); const dk = darkness(t);
    const side = rnd() < 0.5 ? -1 : 1; const off = 7 + rnd() * rnd() * 20;
    const q = p.clone().addScaledVector(n, side * off);
    if (Math.abs(q.x) > 70 || Math.abs(q.z) > 70) continue;
    if (t < 0.13 && path.distanceTo(q) < 3.5) continue;
    if (rnd() >= (0.2 + dk * 0.45) * tier.density) continue;
    const r = rnd(); let name;
    if (dk < 0.3) name = r < 0.5 ? 'CommonTree_1' : r < 0.75 ? 'CommonTree_3' : r < 0.9 ? 'CommonTree_5' : 'Pine_2';
    else if (dk < 0.65) name = r < 0.35 ? 'TwistedTree_2' : r < 0.6 ? 'TwistedTree_4' : r < 0.8 ? 'CommonTree_3' : 'DeadTree_2';
    else name = r < 0.4 ? 'DeadTree_4' : r < 0.7 ? 'TwistedTree_4' : r < 0.85 ? 'DeadTree_2' : 'TwistedTree_2';
    const big = /Twisted|Dead/.test(name); if (big && off < 11.5) continue;
    scatter.place(name, q.x, q.z, rnd() * Math.PI * 2, (big ? 0.45 : 0.75) + rnd() * 0.35 + dk * 0.15);
  }
  for (let i = 0; i < 480 * tier.density; i++) {
    const t = rnd(); const p = path.point(t), n = path.side(t); const dk = darkness(t);
    const q = p.clone().addScaledVector(n, (rnd() < 0.5 ? -1 : 1) * (1.4 + rnd() * 4.5)); const r = rnd(); let name;
    if (dk < 0.35) name = r < 0.4 ? 'Grass_Common_Tall' : r < 0.6 ? 'Flower_3_Group' : r < 0.75 ? 'Clover_1' : r < 0.9 ? 'Bush_Common' : 'Plant_1';
    else if (dk < 0.7) name = r < 0.4 ? 'Grass_Wispy_Short' : r < 0.65 ? 'Fern_1' : r < 0.8 ? 'Mushroom_Common' : r < 0.9 ? 'Rock_Medium_1' : 'Bush_Common';
    else name = r < 0.35 ? 'Fern_1' : r < 0.6 ? 'Mushroom_Laetiporus' : r < 0.75 ? 'Mushroom_Common' : r < 0.9 ? 'Rock_Medium_2' : 'Grass_Wispy_Short';
    scatter.place(name, q.x, q.z, rnd() * Math.PI * 2, 0.6 + rnd() * 0.8);
  }
  for (let i = 0; i < 40; i++) { const t = rnd() * 0.5; const q = path.point(t).addScaledVector(path.side(t), (rnd() < 0.5 ? -1 : 1) * (0.9 + rnd() * 0.5)); scatter.place('Pebble_Round_1', q.x, q.z, rnd() * 6, 0.5 + rnd() * 0.6); }
  for (let i = 0; i < 40; i++) { const t = rnd(); const q = wide.point(t).addScaledVector(wide.side(t), (rnd() < 0.5 ? -1 : 1) * (2.6 + rnd() * 5)); const r = rnd(); scatter.place(r < 0.5 ? 'CommonTree_1' : r < 0.8 ? 'Flower_3_Group' : 'Bush_Common', q.x, q.z, rnd() * 6, 0.8 + rnd() * 0.6); }
  scatter.build(scene, tier, (name, im) => {
    if (name === 'Mushroom_Laetiporus') { im.material = im.material.clone(); im.material.emissive = new THREE.Color('#ff9a3c'); im.material.emissiveIntensity = 0.9; im.material.emissiveMap = im.material.map; }
  });

  // ---- the girl (placeholder model), Barlin, the wisps
  const girl = new Character(assets.rogue, { scale: 0.56 }); scene.add(girl.root); girl.play('Idle');
  const walker = new Walker(path, Math.min(save.get('forest.t', 0), 0.9));
  const barlin = makeBarlin(); scene.add(barlin.object);
  const wisps = [];
  {
    const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d');
    const grd = g.createRadialGradient(32, 32, 2, 32, 32, 32); grd.addColorStop(0, 'rgba(220,255,240,1)'); grd.addColorStop(0.3, 'rgba(120,230,200,0.8)'); grd.addColorStop(1, 'rgba(60,180,160,0)');
    g.fillStyle = grd; g.fillRect(0, 0, 64, 64);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
    for (let i = 0; i < 5; i++) {
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0 }));
      sp.scale.setScalar(0.9 + i * 0.15);
      const light = (tier.pointLights && i < 2) ? new THREE.PointLight('#7ef0d0', 0, 7, 2) : null; if (light) sp.add(light);
      sp.userData = { phase: i * 1.3, light }; scene.add(sp); wisps.push(sp);
    }
  }

  // ---- camera follows behind and above, looking down the path
  const camPos = new THREE.Vector3(), camLook = new THREE.Vector3(), camDir = new THREE.Vector3(), wantDir = new THREE.Vector3();
  function frameCamera(t) { const p = path.point(t), tan = path.tangent(t); camPos.copy(p).addScaledVector(tan, -9.5).add(new THREE.Vector3(2.4, 6.2, 0)); camLook.copy(p).addScaledVector(tan, 4).setY(0.9); }

  let started = false, done = false, nudge = 0;

  return {
    scene,
    async build() {
      girl.snap(walker.position, walker.yaw);
      frameCamera(walker.t); camera.position.copy(camPos); camera.lookAt(camLook);
      if (walker.t > 0.02) { started = true; return; }
      ui.card({ title: 'The World With Three Suns', text: 'Tap where she should go. The butterfly knows the way.', suns: true, buttons: [{ id: 'go', label: 'Begin' }] }).then(() => { started = true; });
    },
    tap(ray) {
      if (!started || done) return;
      const hit = ray.intersectObject(tapPlane)[0]; if (!hit) return;
      const near = path.nearest(hit.point);
      // toward the wide path: she goes to the fork, Barlin makes a fuss over the narrow one
      if (wide.distanceTo(hit.point) < near.d && wide.distanceTo(hit.point) < 6) { walker.goTo(FORK_T); nudge = 3.5; return; }
      if (near.d > 9) return;
      walker.goTo(near.t);
    },
    update(dt, time) {
      const moving = walker.step(dt);
      if (moving) girl.play('Walking_A'); else { if (girl.current === girl.actions.Walking_A) save.set('forest.t', walker.t); girl.play('Idle'); }
      girl.place(walker.position, walker.yaw, dt); girl.update(dt);

      frameCamera(walker.t);
      camera.position.lerp(camPos, Math.min(1, dt * 2.2));
      wantDir.copy(camLook).sub(camera.position).normalize(); camera.getWorldDirection(camDir); camDir.lerp(wantDir, Math.min(1, dt * 3)); camera.lookAt(camera.position.clone().add(camDir));

      const dk = darkness(walker.t), p = walker.position;
      scene.background.copy(SKY_BRIGHT).lerp(SKY_DARK, dk); scene.fog.color.copy(scene.background); scene.fog.density = lerp(0.012, 0.06, dk);
      hemi.intensity = lerp(0.9, 0.28, dk);
      suns.forEach(l => { l.intensity = l.userData.base * lerp(1, 0.14, dk); });
      sunSprites.forEach(sp => sp.material.opacity = 1 - smooth(Math.min(1, dk * 1.6)));
      suns[0].target.position.copy(p); suns[0].position.copy(p).add(new THREE.Vector3(12, 18, 14));
      barlin.glow.intensity = lerp(0, 5, dk);
      ctx.renderer.toneMappingExposure = lerp(1.05, 1.0, dk);

      let bt = Math.min(1, walker.t + 0.045);
      if (nudge > 0) { nudge -= dt; bt = FORK_T + 0.02; }
      barlin.update(dt, time, path.point(bt), path.tangent(bt), nudge > 0 ? 1 : 0);

      const wk = smooth(Math.min(1, Math.max(0, (walker.t - 0.8) / 0.15)));
      wisps.forEach((w, i) => {
        const wt = Math.min(1, walker.t + 0.08 + i * 0.02); const wp = path.point(wt), side = path.side(wt);
        const ph = w.userData.phase + time * (0.8 + i * 0.1);
        w.position.copy(wp).addScaledVector(side, Math.sin(ph) * (1.2 + i * 0.3)).setY(0.8 + Math.sin(ph * 1.7) * 0.4 + i * 0.15);
        w.material.opacity = wk * (0.55 + 0.45 * Math.sin(ph * 2.3));
        if (w.userData.light) w.userData.light.intensity = wk * 8;
      });

      if (!done && walker.t > 0.985 && !moving) {
        done = true;
        setTimeout(() => ui.card({ title: 'Into the swamp', text: "The wisps lead on. That's as far as the story goes tonight.", buttons: [{ id: 'again', label: 'Walk it again' }], small: 'Trees and plants by Quaternius. Characters by Kay Lousberg. Both gave them away free.' })
          .then(() => { walker.t = walker.target = 0; done = false; save.set('forest.t', 0); girl.snap(walker.position, walker.yaw); frameCamera(0); camera.position.copy(camPos); }), 1200);
      }
    },
    dispose() { scatter.dispose(scene); ui.clear(); },
    // for tests
    get state() { return { t: walker.t, target: walker.target, started, done, nudge: nudge > 0 }; },
  };
}
