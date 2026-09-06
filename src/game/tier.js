import { save } from './save.js';

// Decide how much the device can take. Phones and tablets get the light tier.
// If the last run died before it settled (the boot flag was never cleared), go light from then on.
export function pickTier() {
  const params = new URLSearchParams(location.search);
  const mobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || navigator.maxTouchPoints > 1;
  const crashed = save.get('boot') === 1 || save.get('lite') === true;
  if (crashed) save.set('lite', true);
  let lite = mobile || crashed;
  if (params.has('full')) lite = false;
  if (params.has('lite')) lite = true;
  save.set('boot', 1);
  setTimeout(() => save.del('boot'), 9000);
  return {
    lite,
    mobile,
    pixelRatio: Math.min(devicePixelRatio || 1, lite ? 1.25 : 2),
    antialias: !lite,
    shadows: !lite,
    shadowMap: 1024,
    far: lite ? 140 : 220,
    density: lite ? 0.6 : 1,
    pointLights: !lite,
    anisotropy: lite ? 1 : 4,
    groundSegments: lite ? 48 : 80,
    debug: params.has('debug'),
  };
}
