# Three Suns

A tap-to-explore 3D story for children, built with [three.js](https://threejs.org/).
Targets iPhone/iPad Safari first, laptops second. Deployed on GitHub Pages at
https://magnify.github.io/three-suns/.

The story lives in [`docs/story.md`](docs/story.md) — read that first. Places
in the game where the story doesn't say enough yet are marked **[open]** in
that doc.

## Running it

```
npm install
npm run dev       # local dev server
npm run build     # production build to dist/
npm run preview   # serve dist/ locally, same as production
npm test          # headless smoke test (builds, serves, checks it loads)
```

Pushing to `main` builds and deploys to GitHub Pages automatically
(`.github/workflows/pages.yml`).

## Project layout

- `src/main.js` — entry point, hands off to `src/game/app.js`.
- `src/game/`, `src/scenes/` — the game itself: scenes, story beats, controls.
  Not this doc's concern — see whoever's building those for how a scene/world
  is structured internally.
- `public/models/` — committed, meshopt-compressed `.glb` files the game
  loads at runtime via three's `GLTFLoader` + `MeshoptDecoder`.
- `public/icons/`, `public/manifest.webmanifest` — home-screen/PWA bits for
  iPad.
- `tools/pack-assets.mjs` — the asset pipeline (see below).
- `tests/smoke.spec.mjs` — the one automated check: build it, serve it,
  confirm the loading screen clears and nothing throws.

## Adding a world/asset

1. Drop the merged, pre-baked source `.glb` in `assets-src/` (see
   `assets-src/README.md` — the *original* multi-hundred-MB kits are never
   committed).
2. Run `npm run assets`. This meshopt-compresses everything in `assets-src/`
   into `public/models/`, and prints before/after sizes.
3. Load it in game code with `GLTFLoader` + `MeshoptDecoder` (from the
   `meshoptimizer` package) — the compressed files require the decoder to be
   registered on the loader, plain `GLTFLoader` alone won't read them.
4. Commit the result — `public/models/*.glb` is checked in; CI does not run
   the asset pipeline, it just builds what's already there.

## Credits

See [`CREDITS.md`](CREDITS.md).
