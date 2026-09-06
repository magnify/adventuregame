# Art contract

Everything the game draws comes from a file named here. Replace the file, keep the name, size and
pivot, and the game doesn't know the difference. That's how we swap art later without touching code.

All source art is SVG in `art/src/`. `npm run art` rasterises it to PNG at 2x into `public/art/`.
Style for the placeholder set: paper cut-out. Flat fills, one darker shade per shape, an ink
outline (#3A2E2A, 2–3px at 1x), no gradients. Real drawings later will be photographed paper, so
everything should look like it could have been cut out with scissors.

Sizes are in 1x pixels. Pivot is where the part attaches or stands, as a fraction of width/height
(0,0 top-left, 1,1 bottom-right).

## Characters (paper puppets)

A character is a folder of parts plus `puppet.json` listing each part's pivot and its parent
attachment point. The code animates the parts: walk cycle, idle breathing, blink, head turn.

### girl  (`art/src/characters/girl/`)
| part        | size    | pivot     | attaches to        | notes |
|-------------|---------|-----------|--------------------|-------|
| body.svg    | 90×110  | 0.5, 1.0  | ground             | coat, torso. Neck point at (0.5, 0.05). Shoulders at (0.18, 0.15) and (0.82, 0.15). Hips at (0.35, 0.95) and (0.65, 0.95). |
| head.svg    | 100×100 | 0.5, 0.92 | body neck          | face, hair. Eyes drawn separately. |
| eyes.svg    | 40×14   | 0.5, 0.5  | head at (0.5,0.55) | two open eyes on transparent. |
| eyes-shut.svg | 40×14 | 0.5, 0.5  | same               | blink frame. |
| arm-l.svg   | 26×70   | 0.5, 0.08 | body shoulder l    | hangs from the shoulder, mitten at the bottom. |
| arm-r.svg   | 26×70   | 0.5, 0.08 | body shoulder r    | |
| leg-l.svg   | 26×60   | 0.5, 0.06 | body hip l         | boot at the bottom. |
| leg-r.svg   | 26×60   | 0.5, 0.06 | body hip r         | |

Draw the girl facing right. The code flips her to walk left. Standing height about 210px.

### barlin  (`art/src/characters/barlin/`)  the butterfly with the top hat
| part        | size   | pivot    | attaches to | notes |
|-------------|--------|----------|-------------|-------|
| body.svg    | 60×24  | 0.5, 0.5 | air         | side view, facing right. |
| wing-back.svg | 54×60 | 0.1, 0.9 | body at (0.45,0.4) | the far wing, slightly darker. |
| wing-front.svg | 54×60 | 0.1, 0.9 | body at (0.5,0.5) | the near wing. |
| hat.svg     | 30×28  | 0.5, 1.0 | body at (0.85,0.2) | top hat with a band. |

## Forest scene  (`art/src/forest/`)
Scene is 6000px wide, 1080px tall at 1x. Ground line at y=900. Layers scroll at different speeds.

| file            | size      | pivot    | notes |
|-----------------|-----------|----------|-------|
| far-trees.svg   | 1024×500  | tile     | silhouette band of distant treetops, one flat dark-green colour, seamless left–right. Sits with its bottom at y=760. |
| ground.svg      | 512×200   | tile     | grass top edge to soil, seamless. Top at y=880. |
| tree-common-1.svg | 380×620 | 0.5, 1.0 | round leafy tree, bright greens. |
| tree-common-2.svg | 340×580 | 0.5, 1.0 | variant. |
| tree-twisted-1.svg | 420×700 | 0.5, 1.0 | gnarled, darker, reddish leaves. |
| tree-twisted-2.svg | 400×660 | 0.5, 1.0 | variant. |
| tree-dead-1.svg | 360×640   | 0.5, 1.0 | bare, black-brown. |
| tree-dead-2.svg | 320×600   | 0.5, 1.0 | variant. |
| bush.svg        | 200×120   | 0.5, 1.0 | |
| fern.svg        | 160×110   | 0.5, 1.0 | |
| flowers.svg     | 180×120   | 0.5, 1.0 | cluster, pink and white. |
| grass-tuft.svg  | 90×60     | 0.5, 1.0 | |
| mushroom.svg    | 70×70     | 0.5, 1.0 | plain. |
| mushroom-glow.svg | 90×80   | 0.5, 1.0 | orange, will be lit from within by code. |
| rock.svg        | 220×130   | 0.5, 1.0 | |
| signpost.svg    | 120×200   | 0.5, 1.0 | a fork sign with two blank boards, one wide one narrow. |
| wisp.svg        | 64×64     | 0.5, 0.5 | soft pale-green blob, drawn once, tinted and pulsed by code. |
| sun.svg         | 200×200   | 0.5, 0.5 | plain disc, tinted three ways by code. |
