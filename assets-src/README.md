# assets-src/

Inputs for `npm run assets` (see `tools/pack-assets.mjs`). These two files are
already merged/pre-baked from the original kits and are small enough to keep
in git as the pipeline's source of truth:

- `nature.glb` — 21 Quaternius Stylized Nature MegaKit models merged into one
  file, webp textures.
- `rogue.glb` — KayKit Adventurers Rogue, animations pruned to the set the
  game actually uses.

The pipeline meshopt-compresses these into `public/models/*.glb`.

## If you need to rebuild these from scratch

The original kits are 100MB+ each and are **not** committed here. Download
them yourself (both are free/CC0) and re-run the merge:

- Quaternius Stylized Nature MegaKit — https://quaternius.com/packs/stylizednature.html
- KayKit Adventurers — https://kaylousberg.itch.io/kaykit-adventurers

There's no single merge script checked in (the merge is a one-off, kit-specific
job); `tools/pack-assets.mjs` only handles the repeatable step — compressing
whatever is in this folder — so it's the one thing CI and this repo depend on.
