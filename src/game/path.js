import * as THREE from 'three';

/** A walkable curve with a scalar position 0..1 along it. */
export class Path {
  constructor(points, tension = 0.4) {
    this.curve = new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(...p)), false, 'catmullrom', tension);
    this.length = this.curve.getLength();
    this.samples = this.curve.getSpacedPoints(400);
  }
  point(t) { return this.curve.getPointAt(THREE.MathUtils.clamp(t, 0, 1)); }
  tangent(t) { return this.curve.getTangentAt(THREE.MathUtils.clamp(t, 0, 1)); }
  side(t) { const tan = this.tangent(t); return new THREE.Vector3(-tan.z, 0, tan.x); }
  /** Nearest scalar position to a world point, and how far off the path it is. */
  nearest(p) {
    let best = 0, bd = Infinity;
    for (let i = 0; i < this.samples.length; i++) { const d = this.samples[i].distanceToSquared(p); if (d < bd) { bd = d; best = i; } }
    return { t: best / (this.samples.length - 1), d: Math.sqrt(bd) };
  }
  distanceTo(p) { return this.nearest(p).d; }
}

/** Moves a character along a Path toward a target t at a speed in metres per second. */
export class Walker {
  constructor(path, t = 0) { this.path = path; this.t = t; this.target = t; this.speed = 2.1; this.walking = false; this.facing = 0; }
  goTo(t) { this.target = THREE.MathUtils.clamp(t, 0, 1); }
  /** Returns true while moving. */
  step(dt) {
    const d = this.target - this.t;
    if (Math.abs(d) > 0.0015) {
      this.t += Math.sign(d) * Math.min(Math.abs(d), (this.speed / this.path.length) * dt);
      this.facing = d < 0 ? Math.PI : 0;
      this.walking = true;
    } else this.walking = false;
    return this.walking;
  }
  get position() { return this.path.point(this.t); }
  get yaw() { const tan = this.path.tangent(this.t); return Math.atan2(tan.x, tan.z) + this.facing; }
}
