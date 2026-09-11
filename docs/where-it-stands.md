# Where it stands (parked September 2026)

Playable at https://magnify.github.io/adventuregame/ from the first tap to the witch's door.
Parked because it's not at the level of the games it's measured against (Machinarium, Pilgrims, Lost in Play),
and the gap is the art, not the code.

## What's built and works
- Four places from the story as told: the street and the door in the tree, the meadow with three suns,
  the forest path that darkens, the swamp with the mud and the stick. Ends at the witch's door.
- Engine: Phaser via Vite. Scenes are data (`src/scenes/*.json`) with small scene classes on `src/game/stage.js`.
  Paper puppets (`src/game/puppet.js`), picture bubbles, a pocket, synthesised sound (`npm run sfx`), save state.
- Art by contract (`docs/art-contract.md`, `art/src/`, `npm run art`). All placeholder, all ours, swappable file by file.
- Verification: `npm test` loads it; `npm run play` walks the whole story in a headless browser and screenshots each place.
  A critic's sheet (`docs/critic.md`) was used once; its notes were acted on.
- Deploys to GitHub Pages on every push to `main`.

## What fell short
- The art. Placeholder cut-outs drawn as SVG read as placeholders. The characters are the weakest part:
  the girl's rig hides her arms, Barlin is a shape with a hat.
- Interactions are thin: one gag per creature, one puzzle per place. Pilgrims-level reactivity needs dozens.
- No music, and the sounds are synthesised sketches.

## If it comes back
1. Decide the art source first: an illustrator, generated images cut to the contract, or her drawings photographed.
   Everything else is ready to receive it.
2. Then the witch's house, which needs the rest of the story (`docs/story.md`, the open items).
3. Then reactivity: everything on screen should answer a tap.

The 3D version of the forest (three.js, Quaternius kit) is on the `three-d-forest` branch, working, if the look is ever wanted.
