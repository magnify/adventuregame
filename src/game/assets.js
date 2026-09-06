import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'meshoptimizer';

const base = import.meta.env.BASE_URL;
const loader = new GLTFLoader();
loader.setMeshoptDecoder(MeshoptDecoder);

const cache = new Map();

/** Load a GLB from public/models once. Returns the gltf (scene + animations). */
export function loadModel(name, onProgress) {
  if (!cache.has(name)) {
    cache.set(name, new Promise((res, rej) => loader.load(`${base}models/${name}.glb`, res, onProgress, rej)));
  }
  return cache.get(name);
}

/** Make the kit's materials behave: crisp cut-out leaves, sane texture sampling. */
export function prepareMaterials(root, tier) {
  root.traverse(o => {
    if (!o.isMesh) return;
    const m = o.material;
    if (m.alphaTest > 0) { m.alphaTest = 0.5; m.transparent = false; m.side = THREE.DoubleSide; }
    if (m.map) { m.map.anisotropy = tier.anisotropy; m.map.colorSpace = THREE.SRGBColorSpace; }
    m.needsUpdate = true;
    o.castShadow = tier.shadows; o.receiveShadow = tier.shadows;
  });
}
