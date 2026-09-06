// Tiny wrapper around localStorage that never throws (private mode, sandboxed frames).
const KEY = 'three-suns';
export const save = {
  get(k, fallback = null) { try { const v = localStorage.getItem(`${KEY}:${k}`); return v == null ? fallback : JSON.parse(v); } catch { return fallback; } },
  set(k, v) { try { localStorage.setItem(`${KEY}:${k}`, JSON.stringify(v)); } catch {} },
  del(k) { try { localStorage.removeItem(`${KEY}:${k}`); } catch {} },
};
