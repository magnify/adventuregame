import { save } from './save.js';
const base = import.meta.env.BASE_URL;

// Things that have their paper cut-out show that in the pocket; the rest fall back to the pictogram.
const PAPER = { key: 'pocket-key.webp' };

/** What she carries. One thing at a time is plenty for a small child; shown bottom-left as a pictogram. */
export const pocket = {
  el: null, held: false,
  init() {
    if (this.el) return;
    const el = document.createElement('div'); el.id = 'pocket'; el.className = 'empty'; el.innerHTML = '<img alt="">';
    el.addEventListener('pointerdown', e => this.grab(e));
    document.body.appendChild(el); this.el = el; this.render();
  },
  /** Tap the pocket to hold what's in it (then tap where to use it), or drag it straight onto something. */
  grab(e) {
    if (!this.get()) return; e.preventDefault(); e.stopPropagation();
    const start = { x: e.clientX, y: e.clientY }; let ghost = null;
    const move = ev => {
      if (!ghost && Math.hypot(ev.clientX - start.x, ev.clientY - start.y) > 12) {
        ghost = this.el.querySelector('img').cloneNode(); ghost.className = 'pocket-ghost'; ghost.removeAttribute('hidden'); document.body.appendChild(ghost); this.setHeld(false);
      }
      if (ghost) { ghost.style.left = ev.clientX + 'px'; ghost.style.top = ev.clientY + 'px'; }
    };
    const up = ev => {
      removeEventListener('pointermove', move); removeEventListener('pointerup', up); removeEventListener('pointercancel', up);
      if (ghost) { ghost.remove(); if (ev.type === 'pointerup') dispatchEvent(new CustomEvent('pocket-drop', { detail: { x: ev.clientX, y: ev.clientY, item: this.get() } })); }
      else this.setHeld(!this.held);
    };
    addEventListener('pointermove', move); addEventListener('pointerup', up); addEventListener('pointercancel', up);
  },
  setHeld(v) { this.held = !!v && !!this.get(); if (this.el) this.el.classList.toggle('held', this.held); },
  /** Draw the eye to the pocket: something in it is what's needed here. */
  nudge() { this.render(true); },
  get() { return save.get('pocket', null); },
  set(item) { save.set('pocket', item); this.setHeld(false); this.render(true); },
  has(item) { return this.get() === item; },
  render(bump = false) {
    if (!this.el) return; const item = this.get(); const img = this.el.querySelector('img');
    this.el.classList.toggle('empty', !item);
    if (item) { img.src = `${base}art/${PAPER[item] || `icon-${item}.png`}?v=${__BUILD__}`; img.hidden = false; } else { img.removeAttribute('src'); img.hidden = true; }
    if (bump) { this.el.classList.remove('bump'); void this.el.offsetWidth; this.el.classList.add('bump'); }
  },
};
