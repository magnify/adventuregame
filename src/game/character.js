import * as THREE from 'three';
import { clone as skeletonClone } from 'three/examples/jsm/utils/SkeletonUtils.js';

/** An animated glTF character with named clips and crossfades. */
export class Character {
  constructor(gltf, { scale = 1, hide = /dagger|knife|sword|bow|arrow|weapon|crossbow|shield|axe|cape/i } = {}) {
    this.root = skeletonClone(gltf.scene);
    this.root.scale.setScalar(scale);
    this.root.traverse(o => { if (o.isMesh) { o.frustumCulled = false; if (hide.test(o.name)) o.visible = false; } });
    this.mixer = new THREE.AnimationMixer(this.root);
    this.actions = {};
    for (const c of gltf.animations) this.actions[c.name] = this.mixer.clipAction(c);
    this.current = null;
    this.targetYaw = 0;
  }
  play(name, fade = 0.3) {
    const a = this.actions[name]; if (!a || a === this.current) return;
    a.reset().play(); if (this.current) this.current.crossFadeTo(a, fade, false); this.current = a;
  }
  /** Place at a world position, turning smoothly toward yaw. */
  place(pos, yaw, dt) {
    this.root.position.copy(pos);
    let dy = yaw - this.root.rotation.y; dy = Math.atan2(Math.sin(dy), Math.cos(dy));
    this.root.rotation.y += dy * Math.min(1, dt * 8);
  }
  snap(pos, yaw) { this.root.position.copy(pos); this.root.rotation.y = yaw; }
  update(dt) { this.mixer.update(dt); }
}
