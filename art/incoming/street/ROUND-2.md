# Street artwork — round 2

For issue #2. Generated with the built-in image_gen tool; one call per asset (seven calls total). Reference: art/reference/street-anchor.webp. The open door also used door-closed.png as its edit reference.

## Files

| File | Canvas | Format |
|---|---|---|
| door-closed.png | 1024 × 1536 | RGBA |
| door-open.png | 1024 × 1536 | RGBA |
| mat.png | 1774 × 887 | RGBA |
| key.png | 1774 × 887 | RGBA |
| lamp.png | 724 × 2172 | RGBA |
| cat.png | 1254 × 1254 | RGBA |
| sky.png | 2172 × 724 | RGB, fully opaque |

## Checks and fitting notes

All six props have real transparent pixels; sky is fully opaque. Reviewed a neutral-background contact sheet: complete silhouettes, cat faces left, lamp is unlit, key bow is transparent, mat is thin. No code changes, game tests, or device checks.

These are incoming source assets, not fitted replacements. The door designs match, but generated frame placement and size differ despite the alignment instruction. Normalize the open frame to the closed frame before texture swapping. Measured visible bounds (alpha > 128; right and bottom exclusive): closed [166, 256, 860, 1298], open [95, 127, 925, 1342]. These bounds provide an initial crop/scale reference, not a guarantee of exact contour registration. All sprites retain generated canvas margins for fitting.

## Exact prompts

### door-closed

Use case: illustration-story. Create door-closed.png: one isolated small arched wooden door, matching the tiny tree door in the supplied style reference. Full straight-on front elevation. Portrait 2:3 canvas. Door assembly centered with generous transparent margin of about 15% on all sides so a matching open state can share its canvas. Warm muted oak-brown vertical paper planks, rounded arch frame made of brown card, one clear old-fashioned keyhole with small brass escutcheon, two simple dark iron strap hinges on the LEFT. Door closed. Complete threshold and arch visible, no tree, no masonry, no doormat, no environment or detached shadow. Tactile layered card, torn grain, small convincing paper shadows within assembly. Game sprite with genuine alpha transparency outside the door. Same style, palette and paper texture as the reference image. Made of layered cut paper and card, photographed, soft shadows between layers. Side view. Transparent background. No text.

### door-open

Use case: precise-object-edit. Create door-open.png from the first attached image (the exact closed-door sprite). The second image is the street style reference. Change ONLY the door's state: swing its wooden panel open on the existing LEFT hinges, toward the viewer and left, revealing warm bright pale golden light filling the arched doorway. Keep the SAME portrait 1024x1536 canvas, the exact same outer arch/frame geometry, position, scale, threshold and textures. Frame exterior occupies exactly the same pixels as the first image. Keep the complete open panel inside canvas; narrow foreshortened panel to left, recognizable matching warm brown planks and dark iron hinges. No new architecture or environment. No ground, tree or doormat. Make the opening luminous cream/gold layered paper; subtle glow may overlap the INNER doorway but do not add a large opaque glow outside the asset. All exterior remains genuine transparent alpha. Same style, palette and paper texture as the reference image. Made of layered cut paper and card, photographed, soft shadows between layers. Side view. Transparent background. No text.

### mat

Use case: illustration-story. Generate mat.png, one isolated small red-and-cream striped doormat matching the doormat in the reference tree doorway. A thin horizontal rectangle viewed at a very low side angle, slight view of its top face so the stripes show; about four times wider than its visible height, nearly flat, not a chunky block. Alternating faded warm red and ivory strips of fibrous card, rough cut edges, tiny layered paper thickness. Complete mat centered with transparent space around it. No door, tree, branch, key, floor, shadow on an external ground, or other objects. Landscape canvas. Genuine transparent alpha outside the mat. Same style, palette and paper texture as the reference image. Made of layered cut paper and card, photographed, soft shadows between layers. Side view. Transparent background. No text.

### key

Use case: illustration-story. Generate key.png: a single small old brass skeleton key, perfectly side-on, horizontal with oval ring bow on the LEFT and two simple square teeth at the RIGHT. Isolated full object with generous clear margin. Warm dull ochre brass represented by layered golden-brown cut card with visible paper grain and subtly torn edges, matching the brass hardware and warm colours in the street reference. Simple instantly readable silhouette for a child's game. The opening in the oval bow must be genuinely transparent, as must the entire surrounding canvas. Landscape 2:1 canvas. No keyring, chain, lock, hand, ground or other props. No external cast shadow. Same style, palette and paper texture as the reference image. Made of layered cut paper and card, photographed, soft shadows between layers. Side view. Transparent background. No text.

### lamp

Use case: illustration-story. Generate lamp.png, one whole old European black iron street lamp, matching the shape of the lamp at the left of the supplied reference but UNLIT. Complete from ornamental finial to broad plinth base, nothing cropped. Very tall narrow silhouette centered on a portrait 1:3 canvas with transparent margin around all sides. A square tapered lantern with four simple dark mullions and a pitched cap, slender fluted shaft, stepped foot. The lantern is switched off: pale neutral cool-grey paper window panes, NO yellow light, NO glow or flames. Material is handmade layered charcoal-brown and grey cut card, fine paper grain and worn edges, not actual metal. Side-view stage prop. No street, pavement, buildings, plants, cat, ground cast shadow or other objects. Genuine alpha transparency surrounding the whole lamp. Same style, palette and paper texture as the reference image. Made of layered cut paper and card, photographed, soft shadows between layers. Side view. Transparent background. No text.

### cat

Use case: illustration-story. Generate cat.png: one grey-and-white cat sitting quietly, strict SIDE PROFILE FACING LEFT. Whole cat from ear tips to all paws and tail tip, no cropping, centered on square canvas with clear transparent margin. Soft charcoal-grey and warm ivory-white paper patches; white muzzle, chest and front paws, grey back and ears, small muted pink nose, one visible gentle eye. Tail curled on the floor to the right of the sitting body. Match the cat's handmade layered paper construction in the reference, with real fibrous paper grain, cut and torn edges, subtle shadows between card layers. Calm attentive expression, anatomically clear silhouette that reads at small game size. No ground, floor, contact shadow outside the silhouette, houses, tree, accessories or other objects. Genuine alpha transparency outside the cat. Same style, palette and paper texture as the reference image. Made of layered cut paper and card, photographed, soft shadows between layers. Side view. Transparent background. No text.

### sky

Use case: illustration-story. Generate sky.png, the distant sky layer for the street in the supplied style reference. Very wide landscape about 3:1. Soft pale powder-blue early morning sky made of lightly textured handmade paper, warming to cream near a low horizon. A low pale buttery yellow sun disc toward the left. Along the bottom quarter only, very faint dusty blue-grey silhouettes of distant small European rooftops, chimneys and one slender church spire, atmospheric and subordinate. Vast quiet open sky above. Flat stage-like composition. No near houses, window boxes, tree, lamp, cat, road, pavement, grass, people or foreground props. This sky asset is the explicit exception to the transparent sprites: FULLY OPAQUE background filling every pixel, no transparency. Same style, palette and paper texture as the reference image. Made of layered cut paper and card, photographed, soft shadows between layers. Side view. Opaque background. No text.

