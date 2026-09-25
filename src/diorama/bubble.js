import { L } from '../game/lines.js';

/**
 * Speech bubbles for the diorama: cream paper on the page over the 3D street, in the game's words and font.
 * A bubble hangs on its speaker: every frame it finds their head on screen again, sits above it (or beside it when
 * there's no room above, as up close), and its tail points at them. Time runs on the scene's clock, so the checks
 * that step the scene frame by frame see exactly what a player would.
 */
const T = 16, M = 8; // tail length and the margin kept from the screen edge, in page pixels
const live = new Set();

const style = document.createElement('style');
style.textContent = `
.bubble { position: fixed; left: 0; top: 0; z-index: 3; pointer-events: none; box-sizing: border-box; max-width: min(62vw, 380px);
  background: #f3ead8; color: #4a3a2e; font: 700 clamp(17px, 2.8vw, 28px)/1.15 Mali, "Comic Sans MS", cursive; text-align: center;
  padding: .38em .8em .42em; border-radius: 22px; opacity: 0; transform: scale(.4); transform-origin: var(--ox) var(--oy);
  filter: drop-shadow(1px 2px 0 rgba(90, 70, 54, .2)) drop-shadow(3px 7px 6px rgba(60, 45, 30, .18));
  transition: transform .22s cubic-bezier(.3, 1.6, .5, 1), opacity .22s; }
.bubble.in { opacity: 1; transform: scale(1) rotate(var(--rot)); }
.bubble.out { opacity: 0; transform: scale(.8) rotate(var(--rot)); transition-duration: .16s; }
.bubble::after { content: ''; position: absolute; width: 0; height: 0; border: 11px solid transparent; }
.bubble[data-side=above]::after { top: 100%; left: var(--tx); margin-left: -11px; border-top: ${T}px solid #f3ead8; border-bottom: 0; }
.bubble[data-side=right]::after { right: 100%; top: var(--ty); margin-top: -11px; border-right: ${T}px solid #f3ead8; border-left: 0; }
.bubble[data-side=left]::after { left: 100%; top: var(--ty); margin-top: -11px; border-left: ${T}px solid #f3ead8; border-right: 0; }
@media (prefers-reduced-motion: reduce) { .bubble { transition: none; } }`;
document.head.appendChild(style);

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

/** Say a line. head() gives the speaker's head on screen as { x, top, left, right, h }. Resolves when it's gone. */
export function say(head, line, { ms } = {}) {
  const words = L(line), el = document.createElement('div');
  el.className = 'bubble'; el.textContent = words; el.style.setProperty('--rot', `${(-1.5 + Math.random() * 3).toFixed(2)}deg`);
  document.body.appendChild(el);
  return new Promise(res => {
    const b = { el, head, age: 0, stay: (ms ?? 1100 + words.length * 55) / 1000, res };
    live.add(b); place(b); // it pops in on the next tick of the scene's clock, from where it was just laid out
  });
}

/** Advance every bubble by dt seconds and keep each on its speaker. Called once per frame by the scene. */
export function tickBubbles(dt) {
  for (const b of live) {
    b.age += dt; place(b); if (!b.shown) { b.shown = true; b.el.classList.add('in'); }
    if (b.age >= b.stay && !b.leaving) { b.leaving = b.age; b.el.classList.remove('in'); b.el.classList.add('out'); }
    if (b.leaving && b.age - b.leaving > 0.18) { b.el.remove(); live.delete(b); b.res(); }
  }
}

function place(b) {
  const h = b.head(); if (!h) return;
  const W = innerWidth, H = innerHeight, w = b.el.offsetWidth, hh = b.el.offsetHeight;
  let side = 'above', tipX = h.x, tipY = h.top - 4;
  if (tipY - T - hh < M) { // no room above: beside the head, facing it
    side = h.right + T + w + M <= W ? 'right' : 'left';
    tipX = side === 'right' ? h.right + 2 : h.left - 2; tipY = h.top + h.h * 0.18;
  }
  let cx, cy; // the card's centre, relative to the tail's tip
  if (side === 'above') { cx = clamp(0, M + w / 2 - tipX, W - M - w / 2 - tipX); cy = -T - hh / 2; }
  else { cx = (side === 'right' ? 1 : -1) * (T + w / 2); cy = clamp(0, M + hh / 2 - tipY, H - M - hh / 2 - tipY); }
  const left = tipX + cx - w / 2, top = tipY + cy - hh / 2;
  b.el.style.left = `${left}px`; b.el.style.top = `${top}px`; b.el.dataset.side = side;
  b.el.dataset.tip = `${Math.round(tipX)},${Math.round(tipY)}`;
  b.el.style.setProperty('--tx', `${clamp(tipX - left, 22, w - 22)}px`); b.el.style.setProperty('--ty', `${clamp(tipY - top, 18, hh - 18)}px`);
  b.el.style.setProperty('--ox', `${tipX - left}px`); b.el.style.setProperty('--oy', `${tipY - top}px`);
}
