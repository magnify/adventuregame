# Girl paper doll source kit

For issue #6. Built-in image_gen, using street-anchor.webp and the integrated street cat as style references. The full sheet establishes the design; each part uses that sheet or its matching near/open state. Eight selected PNGs, nine generation calls including one torso correction.

## Handoff

All canvases are 1024 × 1536 with genuine alpha transparency. Reviewed all silhouettes together on a neutral background. Head and blink bounds match within one horizontal pixel; the leg pair has identical visible bounds. The torso has no sleeves; the arms and legs have rounded overlap tabs.

The source kit still needs preparation before rigging:
- Native part scales differ despite the shared-scale prompts, particularly the back arm. Normalize visible part bounds to the full sheet's proportions; measurements.json records alpha > 128 bounds (right/bottom exclusive).
- Initial target visible heights at sheet scale: head about 390px, torso including neck tab about 520px, arms including shoulder overlap about 540px, legs including hip overlap about 570px. These are fitting guides, not tested rig values.
- The model outputs interior alpha around 252–254 despite requesting 255. Normalize solid interiors on import while retaining antialiased edges and true exterior transparency.
- The blink edit slightly changes texture, so check for a visible flicker at final game size.

No code changes, rig assembly, animation tests, or device checks. This is a source art handoff, not a claim that the kit is ready to texture-swap without fitting.

## Exact prompts

### girl-sheet

Use case: illustration-story. Create girl-sheet.png, a single complete child hero for a gentle paper-diorama adventure game. References show the established street and cat: match their handmade cut-card realism. Girl aged six or seven, child proportions, head about 30% of standing height, appealing thoughtful small smile, dark chestnut chin-length bob with a simple side part, warm peach paper skin, small dark eyes and tiny nose. Warm saturated vermilion-red A-line coat ending at hips with a simple rounded cream collar, two large dark brown paper buttons, long sleeves; muted ochre trousers and dark chocolate ankle boots, toes pointing RIGHT. Whole girl standing in a THREE-QUARTER SIDE VIEW FACING RIGHT, arms straight hanging slightly away from torso, legs slightly apart, all hair and both shoes visible, relaxed pose designed for jointed paper doll animation. Simple bold shapes legible at small size; layered torn paper and card with fine grain, soft internal contact shadows like reference cat. Portrait 1024x1536 canvas with generous transparent margin, full figure centered, no props, no ground, no backdrop, no lettering or clothing logos. Solid paper interiors fully opaque alpha 255; actual alpha zero around the silhouette, keep natural antialiased boundary. Same style, palette and paper texture as the reference image. Made of layered cut paper and card, photographed, soft shadows between layers. Side view. Transparent background. No text.

### head

Use case: precise-object-edit. From this exact girl-sheet reference, create head.png by REMOVING everything except the head and all hair. Preserve the original head pixels, facial identity, open eyes, direction facing RIGHT, hair silhouette, textures and scale as closely as possible. NO neck: remove the visible neck below her chin; keep the chin and back hair. This is a puppet part extraction, NOT a new portrait or zoom. KEEP EXACT 1024x1536 canvas and the original head's position (approximately x250..705, y85..480), leaving the rest of the large canvas empty alpha. The head must remain about 455 pixels wide and 395 pixels high, not fill the canvas. No body, collar, arms, legs, separate facial parts or props. Solid paper interiors alpha 255, exterior alpha zero. Same style, palette and paper texture as the reference image. Made of layered cut paper and card, photographed, soft shadows between layers. Side view. Transparent background. No text.

### head-blink

Use case: precise-object-edit. Create head-blink.png by editing the attached open-eye head. Change ONLY the two eyes to gently closed curved eyelids for a blink, preserving eyebrow positions. Everything else must remain identical: same facial expression, nose, mouth, hair, colours, grain, silhouette, scale, placement and 1024x1536 canvas. Do not zoom, crop, reposition, add neck, or redraw hairstyle. This is the alternate blink texture for the same game puppet. Preserve transparent exterior and make solid paper interiors fully opaque alpha 255. Same style, palette and paper texture as the reference image. Made of layered cut paper and card, photographed, soft shadows between layers. Side view. Transparent background. No text.

### body

Use case: precise-object-edit. Create body.png, the separate torso of the exact girl in reference 1; reference 2 is her separately generated head for identity/scale. Only the body from the neck to hips: her vermilion red A-line coat, cream rounded collar, two dark brown cross-stitched buttons, three-quarter side view facing right. No head, NO sleeves, arms, hands, trousers, legs or shoes. Fill the coat under where arms obscured it, keeping the same red fabric/card shapes and seam direction. Short rounded peach neck tab rises above collar to overlap under head, rounded concealed shoulder attachment areas and gently rounded hip attachment areas, like a paper doll joint. For consistent native kit scale draw the body approximately 590 pixels wide by 850 pixels high in the CENTER of a 1024x1536 transparent canvas. Preserve exact coat design from the full girl; not a different outfit. Solid paper fully opaque, genuine transparent exterior. Same style, palette and paper texture as the reference image. Made of layered cut paper and card, photographed, soft shadows between layers. Side view. Transparent background. No text.

### arm-front

Use case: precise-object-edit. Create arm-front.png, ONLY the nearer arm from the attached girl's design, detached as a single jointed-paper-doll part. One vermilion red long coat sleeve with matching torn layered red card patches, ending in the same small peach child's hand, relaxed fingers pointing down, thumb on viewer's right. Entire arm hangs STRAIGHT vertically, not diagonal. Rounded shoulder cap at top, with a small extra rounded red overlap tab so it can rotate under the torso. Keep the same proportions and exact red, hand shape and layered-paper look of reference. No head, collar, torso, other arm, legs or props. Approximately 250 pixels wide by 840 pixels high, centered with abundant empty alpha on a 1024x1536 portrait canvas, at consistent kit scale. Complete silhouette, fully opaque paper interiors, true transparent exterior. Same style, palette and paper texture as the reference image. Made of layered cut paper and card, photographed, soft shadows between layers. Side view. Transparent background. No text.

### arm-back

Use case: precise-object-edit. Create arm-back.png from the attached arm-front puppet part. Keep EXACT silhouette, size, position, rounded shoulder overlap tab, hand shape, straight-down pose and full 1024x1536 transparent canvas. Change ONLY its tone: make the entire red sleeve and peach hand modestly darker, about 12 percent, as the far arm is in shade behind the body. Keep it clearly red, with the same paper grain and torn layers. Do not mirror, scale, zoom or redraw the arm. No other objects. Genuine transparent exterior, fully opaque solid paper. Same style, palette and paper texture as the reference image. Made of layered cut paper and card, photographed, soft shadows between layers. Side view. Transparent background. No text.

### leg-front

Use case: precise-object-edit. Generate leg-front.png, a SINGLE detached near leg for the exact girl in the attached sheet. Only one ochre trouser leg and its attached dark chocolate ankle boot pointing RIGHT, matching the sheet's paper grain, patches, cut edges and shape. Straight vertical leg, not diagonal. At the top add a smoothly rounded extended ochre hip tab for overlap under the coat, with no visible metal pin. Slightly flared trouser cuff over the short brown boot. Child's proportions, not an adult long leg. Complete isolated piece from hip tab to shoe sole, canvas portrait 1024x1536. Leg height approximately 900px and width including shoe 350px, centered with transparent margin. No other leg, no torso, head, arms, floor or shadow beyond the sprite. Solid paper interiors fully opaque, genuine transparent exterior. Same style, palette and paper texture as the reference image. Made of layered cut paper and card, photographed, soft shadows between layers. Side view. Transparent background. No text.

### leg-back

Use case: precise-object-edit. Create leg-back.png from the attached leg-front puppet part. Keep EXACT silhouette, canvas size 1024x1536, scale, position, rounded hip tab, trouser shape and right-pointing ankle boot. Change ONLY the colour value to modestly darker (about 12 percent), like the far leg in shade. Same muted ochre trousers and dark chocolate boot, same paper texture and layer shapes. No mirror, no zoom, no repositioning. Keep the complete leg and generous true alpha transparency outside it, solid paper fully opaque. No other objects. Same style, palette and paper texture as the reference image. Made of layered cut paper and card, photographed, soft shadows between layers. Side view. Transparent background. No text.

### body correction

Use case: precise-object-edit. Correct the attached puppet torso image. DELETE BOTH LONG SLEEVES ENTIRELY: remove the entire long red shape hanging down the LEFT side and the long red shape on the RIGHT. The final piece is a SLEEVELESS coat torso like a small sleeveless A-line vest, with clearly exposed rounded shoulder caps/armholes and sides tapering to the hem. There must be NO arms, NO sleeves, NO hands, NO legs. Keep the central red coat front, two brown cross-stitched buttons, cream collar and short peach rounded neck tab unchanged. At left the outer contour runs directly from shoulder near collar down the torso side, not via a hanging sleeve. At right likewise. Narrower resulting silhouette. Keep same canvas and central coat scale, exact material and palette. Genuine transparent background, solid interiors alpha 255. Same style, palette and paper texture as the reference image. Made of layered cut paper and card, photographed, soft shadows between layers. Side view. Transparent background. No text.
