import { save } from './save.js';
const base = import.meta.env.BASE_URL;

// Things that have their paper cut-out show that in the pocket; the rest fall back to the pictogram.
const PAPER = { key: 'pocket-key.webp' };

/** What she carries. One thing at a time is plenty for a small child; shown bottom-left as a pictogram. */
export const pocket = {
  el: null,
  init() {
    if (this.el) return;
    const el = document.createElement('div'); el.id = 'pocket'; el.className = 'empty'; el.innerHTML = '<img alt="">';
    document.body.appendChild(el); this.el = el; this.render();
  },
  get() { return save.get('pocket', null); },
  set(item) { save.set('pocket', item); this.render(true); },
  has(item) { return this.get() === item; },
  render(bump = false) {
    if (!this.el) return; const item = this.get(); const img = this.el.querySelector('img');
    this.el.classList.toggle('empty', !item);
    if (item) { img.src = `${base}art/${PAPER[item] || `icon-${item}.png`}`; img.hidden = false; } else { img.removeAttribute('src'); img.hidden = true; }
    if (bump) { this.el.classList.remove('bump'); void this.el.offsetWidth; this.el.classList.add('bump'); }
  },
};
