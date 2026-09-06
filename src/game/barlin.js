import * as THREE from 'three';

/** Barlin (placeholder name): the butterfly with the top hat. Built from primitives; he's ours. */
export function makeBarlin() {
  const g = new THREE.Group();
  const dark = new THREE.MeshStandardMaterial({ color: '#2b2036' });
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.05, 0.22, 4, 8), dark); body.rotation.z = Math.PI / 2; g.add(body);
  const shape = new THREE.Shape(); shape.moveTo(0, 0); shape.bezierCurveTo(0.25, 0.35, 0.55, 0.3, 0.5, 0.02); shape.bezierCurveTo(0.55, -0.25, 0.2, -0.3, 0, 0);
  const wingGeo = new THREE.ShapeGeometry(shape, 12);
  const wingMat = new THREE.MeshStandardMaterial({ color: '#ff9b2f', emissive: '#ff6a00', emissiveIntensity: 0.35, side: THREE.DoubleSide });
  const wings = [1, -1].map(s => { const w = new THREE.Mesh(wingGeo, wingMat); w.rotation.x = -Math.PI / 2; w.scale.x = s; const piv = new THREE.Group(); piv.add(w); g.add(piv); return piv; });
  const hat = new THREE.Group(); const hatMat = new THREE.MeshStandardMaterial({ color: '#1a1420' });
  hat.add(new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.13, 12), hatMat));
  const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.02, 14), hatMat); brim.position.y = -0.06; hat.add(brim);
  const band = new THREE.Mesh(new THREE.CylinderGeometry(0.078, 0.078, 0.035, 12), new THREE.MeshStandardMaterial({ color: '#c8323c' })); band.position.y = -0.035; hat.add(band);
  hat.position.set(0.16, 0.13, 0); hat.rotation.z = -0.25; g.add(hat);
  const glow = new THREE.PointLight('#ffb060', 0, 4, 2); g.add(glow);
  g.traverse(o => { if (o.isMesh) o.castShadow = true; });

  const target = new THREE.Vector3();
  return {
    object: g, glow,
    /** Hover near a point, facing along a direction, with a little life in it. */
    update(dt, time, anchor, dir, fuss = 0) {
      target.set(anchor.x + Math.sin(time * 1.3) * 0.35 + Math.sin(time * 6) * 0.6 * fuss, anchor.y + 1.5 + Math.sin(time * 2.1) * 0.18, anchor.z + Math.cos(time * 0.9) * 0.3);
      g.position.lerp(target, Math.min(1, dt * 2.5));
      g.rotation.y = Math.atan2(dir.x, dir.z) + Math.PI / 2 + Math.sin(time) * 0.2;
      const flap = Math.sin(time * 18) * 0.9; wings[0].rotation.y = flap; wings[1].rotation.y = -flap;
    },
  };
}
