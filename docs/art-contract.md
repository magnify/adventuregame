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

## Street scene  (`art/src/street/`)  the opening, from the story's first page
Scene 2400×1080. Ground (pavement top) at y=900. The tree stands at x=1700.

| file              | size     | pivot    | notes |
|-------------------|----------|----------|-------|
| houses.svg        | 1024×520 | tile     | a row of narrow townhouses, soft colours, windows, doors, seamless. Bottom at y=900. |
| pavement.svg      | 512×180  | tile     | paving slabs then kerb then road. Top at y=880. |
| tree.svg          | 640×920  | 0.5, 1.0 | big leafy tree with a thick trunk and one strong side branch at about 45% height on the LEFT, wide enough to stand on. A rectangular hole in the trunk just above the branch, 80×120 at 1x, where the door goes. Leave the hole transparent. |
| tree-bed.png      | 760×110  | 0.5, 0.3 | the patch of earth the tree grows from, cut into the pavement: dark soil with a few grass tufts and low leaves, edged by a ring of grey kerb stones matching the pavement, seen from the same slight angle as the paving. The pivot is where the roots meet the soil; its back edge sits on the pavement's top line. The tree's roots end inside the soil, never on stone. |
| door-closed.svg   | 80×120   | 0.5, 1.0 | small arched wooden door with a keyhole, sized to the hole. |
| door-open.svg     | 80×120   | 0.5, 1.0 | the same door swung open, showing bright light inside (flat pale yellow). |
| door-open-meadow.png | 80×120 | 0.5, 1.0 | the open door again, same frame to the pixel, with a glimpse of the meadow inside: three suns, tall grass, big flowers. Shown once her eyes adjust to the light (drawn by Codex). |
| mat.svg           | 100×26   | 0.5, 1.0 | little red doormat with stripes. |
| key.svg           | 52×26    | 0.5, 0.5 | brass key, side view. |
| lamp.svg          | 60×300   | 0.5, 1.0 | street lamp, unlit. |
| cat.svg           | 90×70    | 0.5, 1.0 | a sitting cat, tappable, side view facing left. |

## Meadow scene  (`art/src/meadow/`)  the world with three suns
Scene 3000×1080. Ground at y=900. Flowers are big here; the insects talk.

| file              | size     | pivot    | notes |
|-------------------|----------|----------|-------|
| hills.svg         | 1024×420 | tile     | rolling hills in two greens, seamless. Bottom at y=900. |
| grass.svg         | 512×180  | tile     | meadow grass to soil. Top at y=880. |
| flower-tall-1.svg | 160×420  | 0.5, 1.0 | one huge flower, taller than the girl, pink. |
| flower-tall-2.svg | 140×380  | 0.5, 1.0 | another, yellow. |
| flower-tall-3.svg | 180×460  | 0.5, 1.0 | another, pale blue. |
| beetle.svg        | 110×80   | 0.5, 1.0 | round beetle, side view facing left, friendly. |
| ladybird.svg      | 80×60    | 0.5, 1.0 | facing left. |
| snail.svg         | 120×90   | 0.5, 1.0 | facing left. |
| cricket.svg       | 100×90   | 0.5, 1.0 | facing left, long back legs. |
| stone.svg         | 200×110  | 0.5, 1.0 | a smooth boulder to sit on. |

## Swamp scene  (`art/src/swamp/`)
Scene 3600×1080. Ground at y=900 but the middle stretch is mud. Dark greens and browns, mist.

| file              | size     | pivot    | notes |
|-------------------|----------|----------|-------|
| trees-back.svg    | 1024×560 | tile     | a dense wall of dark tree trunks and hanging moss, seamless. Bottom at y=900. |
| ground.svg        | 512×180  | tile     | wet dark earth with puddles. Top at y=880. |
| mud.svg           | 480×140  | 0.5, 0.3 | a brown mud pool, wider than the girl, with a rim. She sinks into it up to the waist. |
| reeds.svg         | 140×220  | 0.5, 1.0 | |
| stump.svg         | 180×140  | 0.5, 1.0 | |
| stick-small.svg   | 70×16    | 0.5, 0.5 | a twig, lying flat. |
| stick-big.svg     | 280×40   | 0.5, 0.5 | the same twig grown into a proper staff. |
| witch-house.svg   | 640×560  | 0.5, 1.0 | a crooked hut on short stilts, one lit window, a door, a chimney with smoke drawn as a shape. Faces left. |
| lantern.svg       | 50×80    | 0.5, 0.0 | hanging lantern, lit, pivot at the hook. |
| frog.svg          | 90×70    | 0.5, 1.0 | tappable, facing left. |

## Pictograms  (`art/src/icon/`)  what characters say
All 64×64, pivot 0.5,0.5, thick ink lines, one or two flat colours, readable at 40px on a phone.

key, question, no (red circle and slash), arrow-right, hat (Barlin's top hat), heart, exclaim, sun,
mud (brown splat), stick, magic (sparkle), house, eat (a bun with a bite), drink (a cup), ear,
look (an eye), climb (a little figure on a ladder), door, meadow (a flower), z (a sleeping z).
