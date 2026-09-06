# Three Suns

A tap-to-explore story game for a child: a girl, a door in a tree, and the world with three suns.
Wordless in play. Tap where she should go; things she meets talk in pictures.

Plays at https://magnify.github.io/adventuregame/ — add it to the home screen on an iPad.

## Run it

```
npm install
npm run art      # rasterise art/src/*.svg → public/art/*.png
npm run dev      # local server
npm test         # build, serve, load it in a headless browser
```

Pushing to `main` builds and deploys to GitHub Pages.

## How it's put together

- **The story** is `docs/story.md`. It's the brief. Nothing goes in the game that isn't in it, and gaps are marked open rather than invented.
- **Art is swappable by contract.** `docs/art-contract.md` lists every image, its size and its pivot. `art/src/` holds the current set as SVG; `art/src/manifest.json` describes it. Replace a file, keep its name and pivot, and the game doesn't know. Real drawings later go through the same door.
- **Characters are paper puppets** (`src/game/puppet.js`): head, body, arms, legs as separate images hung on named points. The code does the walking, breathing and blinking, so any redraw keeps its life.
- **Scenes are data.** `src/scenes/forest.json` says what the forest is made of; `src/scenes/forest.js` reads it. A new world is a new pair of files.
- **Engine:** Phaser 3 via Vite. Progress is kept in the browser's local storage.

## Adding a world

1. Write the scene into `docs/story.md` first.
2. List the art it needs in `docs/art-contract.md`; draw placeholders in `art/src/`; add them to the manifest; run `npm run art`.
3. Add `src/scenes/<name>.json` and `src/scenes/<name>.js`, register the scene in `src/main.js`.
