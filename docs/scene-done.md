# When a place is finished

The street is the first place to meet this; the meadow, forest and swamp are held to the same bar.
Each line is checked by something that runs, except the last, which is Brian on a real device.

| | Check | How |
|---|---|---|
| 1 | Every picture on screen is paper, no flat placeholders | `npm run check <scene>` |
| 2 | Every character pose looks like the character's reference picture, same size, on the same baseline | `npm run poses`, beside `art/reference/` |
| 3 | Taps work like a finger: tap to walk, tap-then-tap and drag to use | `npm run play` |
| 4 | The story plays through start to end | `npm run play` |
| 5 | The critic scores 8+ on every line of `docs/critic.md`, from screenshots only | a reviewer who didn't build it |
| 6 | It feels right: eased walk, footsteps, a mark where you tap, the tapped thing answers at once, a soft camera | built into `src/game/stage.js` |
| 7 | The exact demo files load and play on phone (both ways up) and tablet sizes, before the link goes out | `npm run demo && npm run demo-check` |
| 8 | Brian has played it on a phone or tablet and is happy | the demo link |

Art rules learned on the street, for every new kit:
- Each place starts from one anchor picture; every piece is generated to match it.
- Pieces arrive separate, on transparent backgrounds; strips repeat edge to edge.
- Characters arrive as whole pictures, one per pose, same canvas and baseline, edited from the reference picture. No jointed kits: generated art doesn't come apart cleanly.
- Moving things get a baked soft shadow (`npm run art` makes it), so they sit in the scene like layered paper.

## Street, now
1 icons still flat (heart, key, question, exclaim, meadow; GPT's icons job) · 2 passes · 3 passes · 4 passes ·
5 last critic failed on line 2 (icons, and the girl reading as a sticker; shadows added since) and line 7 · 6 built · 7 passes · 8 waiting on Brian
