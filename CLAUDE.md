# Working on this game

A tap-to-explore story for a child, told by her father. Wordless in play. The crew builds it; he tells it.

## Order of work
1. **Story first.** `docs/story.md` is the brief, written as he told it. Nothing goes in the game that isn't in it.
   Gaps a scene needs are marked **[open]** there, not invented. Names marked placeholder stay easy to change.
2. **Contract before art.** Every image is listed in `docs/art-contract.md` with size and pivot before it's drawn.
   Art lives in `art/src/` as SVG; `npm run art` renders it. Swap a file, keep its name and pivot, and the game doesn't know.
3. **Scenes are data.** `src/scenes/<name>.json` says what's in a place; `src/scenes/<name>.js` says what happens there,
   on top of `src/game/stage.js`. Characters are paper puppets (`src/game/puppet.js`), animated by code.
4. **Critic before push.** Before a build goes live, someone who did not build it looks at screenshots only and scores
   each scene against `docs/critic.md`. The builder fixes and resubmits until every scene passes. Restraint wins:
   the critic's first question is what can be removed.
5. **Prove it before calling it done.** `npm test` loads the game; `npm run play` walks the whole story and screenshots
   every place. Nobody says it works if nobody ran it. Real devices beat headless browsers: the site at
   https://magnify.github.io/adventuregame/ is the truth, and a push to `main` deploys it in about a minute.

## Standards
- Say what's true. If a step was skipped, say so. If a check wasn't run on the device, say that.
- The child is the player. Every tap answers with something: a sound, a wiggle, a picture bubble. Nothing is a dead end.
- Sound is half of feel. `npm run sfx` regenerates the synthesised effects in `public/sfx/`.
- Keep it light: phones and tablets first. `?debug` on the address shows frame rate and errors; `?lite` forces the light tier.

## Who does what
Mech draws and composes. Scribe owns any words a person reads. Pilo owns build, deploy and the pipeline.
Doc checks anything claimed as fact, licences included. Vera verifies before anything is called done.
