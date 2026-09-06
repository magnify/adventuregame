import { defineConfig } from 'vite';

// GitHub Pages serves this project from https://magnify.github.io/three-suns/,
// so every asset URL needs the repo name as a base path.
export default defineConfig({
  base: '/three-suns/',
  build: {
    target: ['es2020', 'safari16'],
    assetsInlineLimit: 0, // never inline models/textures as base64 — keep them as separate cached files
  },
  // public/models/*.glb are served as-is (Vite copies public/ verbatim to dist/),
  // so they stay cacheable across deploys as long as filenames don't change.
});
