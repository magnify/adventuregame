import { save } from './save.js';

// How much can the device take? Phones and tablets get fewer props; a crash flips the light tier on for good.
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
  return { lite, mobile, density: lite ? 0.7 : 1, debug: params.has('debug') };
}
