import * as THREE from 'three';

/** Collects placements per model name and builds InstancedMeshes from a kit scene. */
export class Scatter {
  constructor(kit) { this.kit = kit; this.placed = new Map(); this.built = []; }
  place(name, x, z, ry, s) {
    const m = new THREE.Matrix4().compose(new THREE.Vector3(x, 0, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, ry, 0)), new THREE.Vector3(s, s, s));
    if (!this.placed.has(name)) this.placed.set(name, []);
    this.placed.get(name).push(m);
  }
  build(scene, tier, tweak = () => {}) {
    for (const [name, mats] of this.placed) {
      const node = this.kit.getObjectByName(name);
      if (!node) { console.warn('kit is missing', name); continue; }
      node.updateWorldMatrix(true, true);
      const rootInv = new THREE.Matrix4().copy(node.matrixWorld).invert();
      node.traverse(o => {
        if (!o.isMesh) return;
        const local = new THREE.Matrix4().multiplyMatrices(rootInv, o.matrixWorld);
        const im = new THREE.InstancedMesh(o.geometry, o.material, mats.length);
        const tmp = new THREE.Matrix4();
        mats.forEach((m, i) => im.setMatrixAt(i, tmp.multiplyMatrices(m, local)));
        im.castShadow = tier.shadows; im.receiveShadow = tier.shadows; im.frustumCulled = false;
        tweak(name, im);
        scene.add(im); this.built.push(im);
      });
    }
  }
  dispose(scene) { for (const im of this.built) { scene.remove(im); im.dispose(); } this.built = []; }
}

/** Deterministic random so a scene looks the same every visit. */
export function seeded(seed = 1234567) { let s = seed; return () => (s = (s * 16807) % 2147483647) / 2147483647; }
