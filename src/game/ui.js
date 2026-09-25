const $ = id => document.getElementById(id);

export const ui = {
  loading(text) { const l = $('loading'); if (!l) return; this.label(l).textContent = text; l.classList.remove('off'); },
  loaded() { const l = $('loading'); if (l) l.classList.add('off'); },
  fail(text) { const l = $('loading'); if (l) { this.label(l).textContent = text; l.classList.remove('off'); l.classList.add('failed'); } },
  /** The scrap of paper the loading words sit on. */
  label(l) { let s = l.querySelector('span'); if (!s) { s = document.createElement('span'); l.textContent = ''; l.appendChild(s); } return s; },
  /** Show a card. Returns a promise that resolves with the id of the button pressed. */
  card({ title, text, buttons = [{ id: 'ok', label: 'Begin' }], suns = false, small = '', bottom = false, top = false }) {
    return new Promise(res => {
      const host = $('ui'); host.innerHTML = '';
      const card = document.createElement('div'); card.className = 'card' + (bottom ? ' bottom' : '') + (top ? ' top' : '');
      card.innerHTML = `<div>${suns ? '<div class="suns"><i style="background:#FFD98A"></i><i style="background:#FFB3C6"></i><i style="background:#CFE8FF"></i></div>' : ''}<h1>${title}</h1>${text ? `<p>${text}</p>` : ''}<div class="buttons"></div>${small ? `<p class="small">${small}</p>` : ''}</div>`;
      const row = card.querySelector('.buttons');
      for (const b of buttons) { const el = document.createElement('button'); el.textContent = b.label; el.addEventListener('click', () => { host.innerHTML = ''; res(b.id); }); row.appendChild(el); }
      host.appendChild(card);
      row.querySelector('button')?.focus();
    });
  },
  clear() { $('ui').innerHTML = ''; },
};

/** Debug overlay: ?debug shows frame time, draw calls and any error. */
export function makeDebug(renderer, tier) {
  const el = document.createElement('pre'); el.id = 'debug';
  el.style.cssText = 'position:fixed;left:8px;top:8px;margin:0;padding:6px 8px;font:12px/1.3 monospace;color:#fff;background:rgba(0,0,0,.55);border-radius:6px;z-index:5;pointer-events:none;white-space:pre-wrap;max-width:60vw';
  document.body.appendChild(el);
  const errors = [];
  addEventListener('error', e => errors.push(e.message)); addEventListener('unhandledrejection', e => errors.push(String(e.reason && e.reason.message || e.reason)));
  let acc = 0, n = 0, fps = 0;
  return {
    tick(dt) { acc += dt; n++; if (acc >= 0.5) { fps = Math.round(n / acc); acc = 0; n = 0; const i = renderer.info; el.textContent = `${fps} fps  ${tier.lite ? 'lite' : 'full'} @${tier.pixelRatio}x\ncalls ${i.render.calls}  tris ${(i.render.triangles / 1000).toFixed(0)}k\n${errors.slice(-3).join('\n')}`; } },
  };
}
