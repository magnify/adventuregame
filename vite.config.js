import { defineConfig } from 'vite';

// GitHub Pages serves this project from https://magnify.github.io/three-suns/,
// so every asset URL needs the repo name as a base path.
export default defineConfig({
  base: '/adventuregame/',
  // every build stamps its own id onto art and sound URLs, so a phone never mixes a new game with cached old art
  define: { __BUILD__: JSON.stringify(String(Date.now())) },
  build: {
    target: ['es2022', 'safari16'], // es2022 for the diorama's top-level await; Safari 16 has it
    rollupOptions: { input: { main: 'index.html', diorama: 'diorama.html' } },
    assetsInlineLimit: 0, // never inline models/textures as base64 — keep them as separate cached files
  },
  // public/models/*.glb are served as-is (Vite copies public/ verbatim to dist/),
  // so they stay cacheable across deploys as long as filenames don't change.
});
