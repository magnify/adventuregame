# Working on this game

A tap-to-explore story for a child, told by her father. Wordless in play. The crew builds it; he tells it.

## Order of work
1. **Story first.** `docs/story.md` is the brief, written as he told it. Nothing goes in the game that isn't in it.
   Gaps a scene needs are marked **[open]** there, not invented. Names marked placeholder stay easy to change.
2. **Contract before art.** Every image is listed in `docs/art-contract.md` with size and pivot before it's drawn,
   and, for the diorama, the depth it stands at (far, middle, near). Art lives in `art/src/`; `npm run art` renders it.
   Swap a file, keep its name and pivot, and the game doesn't know. Ask Codex for art with `tools/codex-art.sh`: it
   runs only on Brian's ChatGPT subscription, never an API key.
3. **The game is a paper diorama** (three.js, `diorama.html`, `src/diorama/`): the pictures stand up as cards at real
   depths in a lit box, and the camera turns only a little (about 11 degrees), because every picture is drawn flat from
   the front. Brian chose it over the flat version on 2026-09-25. The street is done in 3D; the meadow, forest and swamp
   still exist only in the flat Phaser version (`index.html`, `src/scenes/`, `src/game/stage.js`), which stays until each
   place is rebuilt in 3D. Both share the words, start card, pocket and sounds in `src/game/`.
   Characters are whole pictures, one per pose, swapped with a little bounce.
4. **Critic before push.** Before a build goes live, someone who did not build it looks at screenshots only and scores
   each scene against `docs/critic.md`. The builder fixes and resubmits until every scene passes. Restraint wins:
   the critic's first question is what can be removed.
5. **Prove it before calling it done.** `npm test` loads the game; `npm run play` walks the whole story and screenshots
   every place; `npm run poses` shows each character in every pose; `npm run feel` plays the street frame by frame and measures what Brian would otherwise catch by eye (every report of his becomes a check there); `npm run diorama` does the same for the 3D street with real taps. Nobody says it works if nobody ran it. Real devices beat headless browsers: the site at
   https://magnify.github.io/adventuregame/ is the truth, and a push to `main` deploys it in about a minute, only if every
   check passes. Work in progress is shown at https://claude.ai/artifact/1jGzrHKEeu5cQmus7eKaJK. The diorama link
   https://claude.ai/artifact/Hnwp4MjFpwvAUyxyskz6Tz is shared publicly on LinkedIn: never publish to it again.

## Standards
- Say what's true. If a step was skipped, say so. If a check wasn't run on the device, say that.
- The child is the player. Every tap answers with something: a sound, a wiggle, a picture bubble. Nothing is a dead end.
- Sound is half of feel. `npm run sfx` regenerates the synthesised effects in `public/sfx/`.
- Keep it light: phones and tablets first. `?debug` on the address shows frame rate and errors; `?lite` forces the light tier.

## Who does what
Mech draws and composes. Scribe owns any words a person reads. Pilo owns build, deploy and the pipeline.
Doc checks anything claimed as fact, licences included. Vera verifies before anything is called done.
