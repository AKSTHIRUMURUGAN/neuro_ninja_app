NeuronNinja — AI Asset Generation Prompt Library

**Purpose:** Copy each prompt separately into your preferred image-generation tool to create original game assets for NeuronNinja.  
**Target:** 2D fantasy pixel-art mobile game, Expo React Native.  
**Important:** Generate original designs. Do not ask an image model to copy Clash of Clans, Habitica, or any other game's characters, art, UI, or assets.

---

# 0. Global style lock

Paste this style description into every generation prompt, or save it as the tool's reusable style/reference instruction.

> **NeuronNinja art direction:** Original friendly fantasy pixel-art for a mobile productivity RPG. Crisp pixel edges, clean readable silhouettes, charming expressive character design, limited coordinated colour palette, subtle highlights, consistent top-left light source, consistent outline thickness, polished professional indie-game quality. Bright but not childish, adventurous but not scary. Transparent background for individual game assets. No text, letters, numbers, watermark, signature, logos, UI mockups, or existing game franchise references. Design must remain readable when displayed small on a phone. Keep the same visual style, pixel density, proportions, and lighting across the complete asset collection.

## Global negative prompt

> blurry, anti-aliased vector art, photorealism, 3D render, clay, plastic toy, inconsistent pixel size, noisy dithering, muddy colours, cropped subject, cut-off weapon, extra limbs, duplicated objects, multiple views, text, typography, letters, numbers, watermark, logo, signature, background scenery, frame border, collage, reference to an existing game, copied copyrighted character

## Sprite-sheet output rules

Append these rules to every animation prompt:

> Create a **true sprite sheet**, not a storyboard or a collection of separate preview panels. Use equally sized cells in a strict grid. One complete animation frame per cell. Keep the character's scale, camera angle, proportions, lighting, feet baseline, and pivot position consistent in every cell. Transparent background. No gutters, borders, labels, frame numbers, captions, or decorative separators. Keep the complete subject inside every cell. Do not add extra frames or leave blank cells. Return the sprite sheet as one image.

**Important workflow note:** Image models can struggle with exact sprite-sheet grids and consistent frame-to-frame motion. Inspect the grid, crop frames manually if necessary, and correct alignment in LibreSprite or Pixelorama before using it in the app. If the generator cannot produce a reliable sheet, generate one frame at a time using the same reference image and character description.

---

# 1. Player ninja

## 1.1 Ninja character — master reference

**Prompt**

> Create the original main hero character for NeuronNinja, a friendly fantasy productivity RPG. A young adult ninja guardian wearing a deep-indigo and charcoal outfit, teal accent scarf, simple protective shoulder guard, cloth belt, wrist wraps, and a small leaf-shaped emblem. Friendly confident expression, compact athletic proportions, clear silhouette, front three-quarter view facing right, full body, standing neutral pose. Pixel-art sprite, designed for a 96×96 pixel cell, transparent background. This is the master character reference; keep the outfit and colours simple enough to reproduce consistently in all future animation sheets. No weapon in hands, no text, no scenery.

## 1.2 Ninja idle sprite sheet

**Prompt**

> Using the supplied NeuronNinja hero reference, create a 6-frame idle animation sprite sheet. Grid: 2 rows × 3 columns. The ninja stands in the same position and gently breathes; scarf moves slightly; one subtle blink; tiny body movement only. The ninja must return naturally to the first pose for a seamless loop. Full body visible in every cell. Same outfit, proportions, camera angle, pixel scale, light direction, and baseline in all frames. Transparent background. Use the global sprite-sheet output rules.

## 1.3 Ninja walk sprite sheet

**Prompt**

> Using the supplied NeuronNinja hero reference, create an 8-frame walk-cycle sprite sheet. Grid: 2 rows × 4 columns. Side three-quarter view facing right. Show a clean alternating footstep cycle with natural arm movement and slight scarf motion. Keep the character centred on a consistent baseline; do not move the character across the cells. Seamless loop. Transparent background. Use the global sprite-sheet output rules.

## 1.4 Ninja attack sprite sheet

**Prompt**

> Using the supplied NeuronNinja hero reference, create an 8-frame sword attack animation sprite sheet. Grid: 2 rows × 4 columns. The ninja starts in a ready stance, pulls the katana back, performs one fast diagonal slash, follows through, and returns to a balanced ready pose. Clear anticipation and impact pose. Keep the complete sword inside every frame. No additional slash effects; those will be separate reusable effects. Transparent background. Use the global sprite-sheet output rules.

## 1.5 Ninja hit reaction sprite sheet

**Prompt**

> Using the supplied NeuronNinja hero reference, create a 4-frame hit-reaction sprite sheet. Grid: 1 row × 4 columns. The ninja recoils slightly from a harmless impact, leans back, briefly raises one arm defensively, then returns to the normal stance. No blood, injury, or frightening expression. Transparent background. Use the global sprite-sheet output rules.

## 1.6 Ninja victory sprite sheet

**Prompt**

> Using the supplied NeuronNinja hero reference, create a 6-frame victory animation sprite sheet. Grid: 2 rows × 3 columns. The ninja celebrates a successful mission with a small confident fist raise, a cheerful pose, and a subtle scarf movement. End in a proud stable pose. Friendly and motivating, not aggressive. Transparent background. Use the global sprite-sheet output rules.

---

# 2. Villains — master designs and animation sheets

Create each villain's master reference first. Reuse that exact reference image for its idle, attack, hit, special, and defeat sheets.

## 2.1 Scroll Hydra — master reference

**Prompt**

> Design an original friendly fantasy villain called Scroll Hydra, representing endless social-media scrolling. A compact teal-and-violet hydra serpent with three expressive heads, rounded scales, tiny playful horns, large readable eyes, and a mischievous rather than frightening expression. Each head has a slightly different personality. Full body, coiled in a clear readable silhouette, front three-quarter view, pixel-art sprite, 128×128 cell design, transparent background. Do not include phone brands, app logos, text, or real social-media icons.

### Scroll Hydra idle — 6 frames, 2×3

> Using the supplied Scroll Hydra master reference, create a 6-frame idle sprite sheet, 2 rows × 3 columns. The three heads gently sway independently, blink at different moments, and the tail makes a small movement. Keep the body anchored and silhouette consistent. Seamless loop. Transparent background. Use the global sprite-sheet output rules.

### Scroll Hydra attack — 8 frames, 2×4

> Using the supplied Scroll Hydra master reference, create an 8-frame attack sprite sheet, 2 rows × 4 columns. The centre head pulls back, opens its mouth, lunges forward, makes a clear bite motion, then recoils to its starting position. Other heads react subtly. Keep all heads and tail fully inside each frame. No projectile or background effects. Transparent background. Use the global sprite-sheet output rules.

### Scroll Hydra hit — 4 frames, 1×4

> Using the supplied Scroll Hydra master reference, create a 4-frame hit-reaction sprite sheet, 1 row × 4 columns. All three heads briefly recoil in a playful surprised reaction; body compresses slightly and returns to idle. No injury, blood, or dismemberment. Transparent background. Use the global sprite-sheet output rules.

### Scroll Hydra special — 8 frames, 2×4

> Using the supplied Scroll Hydra master reference, create an 8-frame special-ability sprite sheet, 2 rows × 4 columns. All three heads rise, glow softly, and perform a synchronized magical roar pose. The creature remains fully visible. Do not draw floating words, notification logos, phones, or interface icons; special effects will be added separately. Transparent background. Use the global sprite-sheet output rules.

### Scroll Hydra defeat — 8 frames, 2×4

> Using the supplied Scroll Hydra master reference, create an 8-frame defeat animation sprite sheet, 2 rows × 4 columns. The three heads droop one after another, the body gently curls down, and the creature settles into a harmless sleepy defeated pose. No violence or gore. Keep the final pose clear. Transparent background. Use the global sprite-sheet output rules.

## 2.2 Procrastination Slime — master reference

**Prompt**

> Design an original friendly fantasy villain called Procrastination Slime, representing putting important tasks off. A round lime-green and amber jelly creature with a soft translucent-looking pixel-art body, tiny arms, short feet, large sleepy eyes, and a cheeky expression. A small unfinished paper scroll is stuck harmlessly to its side, with no readable text. Full body, front three-quarter view, clear silhouette, pixel-art sprite designed for 128×128 cell, transparent background. Charming and funny, never disgusting or scary.

### Procrastination Slime idle — 6 frames, 2×3

> Using the supplied Procrastination Slime reference, create a 6-frame idle sprite sheet, 2 rows × 3 columns. The slime gently squashes and stretches, blinks slowly, and wobbles from side to side. Seamless loop, stable centre and baseline. Transparent background. Use the global sprite-sheet output rules.

### Procrastination Slime attack — 8 frames, 2×4

> Using the supplied Procrastination Slime reference, create an 8-frame attack sprite sheet, 2 rows × 4 columns. The slime compresses low, stretches upward, then performs one short forward bounce and lands with a soft squash. Keep the entire creature visible in every frame. No extra effects. Transparent background. Use the global sprite-sheet output rules.

### Procrastination Slime hit — 4 frames, 1×4

> Using the supplied Procrastination Slime reference, create a 4-frame hit-reaction sprite sheet, 1 row × 4 columns. The slime briefly flattens, wobbles, then reforms its original rounded shape. Harmless comic reaction. Transparent background. Use the global sprite-sheet output rules.

### Procrastination Slime special — 8 frames, 2×4

> Using the supplied Procrastination Slime reference, create an 8-frame special-ability sprite sheet, 2 rows × 4 columns. The slime stretches both arms outward and creates a harmless sticky puddle beneath itself, then returns to its normal shape. Keep the puddle attached to the character and within the frame. No text or background. Transparent background. Use the global sprite-sheet output rules.

### Procrastination Slime defeat — 8 frames, 2×4

> Using the supplied Procrastination Slime reference, create an 8-frame defeat sprite sheet, 2 rows × 4 columns. The slime slowly deflates into a small harmless blob, gives one final blink, and settles into a relaxed puddle shape. No explosion or gore. Transparent background. Use the global sprite-sheet output rules.

## 2.3 Distraction Wisp — master reference

**Prompt**

> Design an original friendly fantasy villain called Distraction Wisp, representing interrupted focus. A small floating magical spirit with a bright cyan core, violet flame-like wisps, two expressive glowing eyes, and a playful curious face. Its silhouette should be simple and readable at 64×64 pixels. Full character, front three-quarter view, pixel-art sprite, transparent background. No text, logos, phone symbols, or scenery.

### Distraction Wisp idle — 6 frames, 2×3

> Using the supplied Distraction Wisp reference, create a 6-frame floating idle sprite sheet, 2 rows × 3 columns. The wisp gently bobs up and down, its flame-like edges ripple slightly, and its eyes blink once. Seamless loop. Keep its centre aligned. Transparent background. Use the global sprite-sheet output rules.

### Distraction Wisp attack — 8 frames, 2×4

> Using the supplied Distraction Wisp reference, create an 8-frame dash attack sprite sheet, 2 rows × 4 columns. The wisp gathers energy, leans forward, makes a quick short dash pose, then returns to its hovering position. Keep the full spirit visible in every cell; do not add trails or projectiles. Transparent background. Use the global sprite-sheet output rules.

### Distraction Wisp hit — 4 frames, 1×4

> Using the supplied Distraction Wisp reference, create a 4-frame hit reaction sprite sheet, 1 row × 4 columns. The wisp briefly flickers, compresses its glow, looks surprised, and returns to its normal shape. Transparent background. Use the global sprite-sheet output rules.

### Distraction Wisp special — 8 frames, 2×4

> Using the supplied Distraction Wisp reference, create an 8-frame special ability sprite sheet, 2 rows × 4 columns. The wisp spins in place and raises both tiny arms while its core brightens, then returns to hover. Do not include detached particles or background effects. Transparent background. Use the global sprite-sheet output rules.

### Distraction Wisp defeat — 8 frames, 2×4

> Using the supplied Distraction Wisp reference, create an 8-frame defeat sprite sheet, 2 rows × 4 columns. The spirit's glow gradually dims, its wisps curl inward, and it gently fades into a tiny soft sparkle pose. Keep the character visible in each frame; the final fade can be handled by app opacity. Transparent background. Use the global sprite-sheet output rules.

## 2.4 Snooze Goblin — master reference

**Prompt**

> Design an original friendly fantasy villain called Snooze Goblin, representing repeatedly delaying the morning routine. A small sleepy moss-green goblin wearing a loose nightcap, soft purple pyjamas, and carrying a tiny pillow. Droopy eyelids, rounded ears, expressive face, slightly hunched but cute posture. Full body, front three-quarter view, pixel-art sprite designed for 128×128 cell, transparent background. No readable text, no clock numbers, no logos.

### Snooze Goblin idle — 6 frames, 2×3

> Using the supplied Snooze Goblin reference, create a 6-frame idle sprite sheet, 2 rows × 3 columns. The goblin sways sleepily, nods forward, briefly closes its eyes, then wakes slightly. Keep pillow and nightcap consistent. Seamless loop. Transparent background. Use the global sprite-sheet output rules.

### Snooze Goblin attack — 8 frames, 2×4

> Using the supplied Snooze Goblin reference, create an 8-frame pillow-swing attack sprite sheet, 2 rows × 4 columns. The goblin raises its small pillow, swings it once in a readable arc, follows through, and returns to a sleepy stance. Keep the whole pillow visible. No impact effects. Transparent background. Use the global sprite-sheet output rules.

### Snooze Goblin hit — 4 frames, 1×4

> Using the supplied Snooze Goblin reference, create a 4-frame hit-reaction sprite sheet, 1 row × 4 columns. The goblin is briefly startled, its nightcap shifts slightly, it blinks, and returns to its normal sleepy stance. No injury. Transparent background. Use the global sprite-sheet output rules.

### Snooze Goblin special — 8 frames, 2×4

> Using the supplied Snooze Goblin reference, create an 8-frame special animation sprite sheet, 2 rows × 4 columns. The goblin takes a deep yawn, stretches its arms, and leans back sleepily. Do not draw detached clouds, letters, or Z symbols. Transparent background. Use the global sprite-sheet output rules.

### Snooze Goblin defeat — 8 frames, 2×4

> Using the supplied Snooze Goblin reference, create an 8-frame defeat animation sprite sheet, 2 rows × 4 columns. The goblin drops the pillow gently, sits down, curls around it, and falls into a peaceful harmless nap. Transparent background. Use the global sprite-sheet output rules.

## 2.5 Chaos Titan — weekly boss master reference

**Prompt**

> Design an original large weekly boss called Chaos Titan, representing an overloaded and disorganised week. A friendly ancient stone-and-moss giant with broad shoulders, chunky stone arms, glowing turquoise runes, small vines, and a calm but imposing face. Its body is built from organised stone slabs and floating paper-like shapes with no writing. Full body, front three-quarter view, powerful readable silhouette, pixel-art boss sprite designed for a 192×192 cell, transparent background. Impressive, not horror, no weapons copied from existing games.

### Chaos Titan idle — 6 frames, 2×3

> Using the supplied Chaos Titan reference, create a 6-frame idle sprite sheet, 2 rows × 3 columns. The giant breathes slowly, shoulders rise slightly, moss and small vines move gently, and turquoise runes pulse subtly. Keep feet fixed to a common baseline. Transparent background. Use the global sprite-sheet output rules.

### Chaos Titan attack — 8 frames, 2×4

> Using the supplied Chaos Titan reference, create an 8-frame heavy stomp attack sprite sheet, 2 rows × 4 columns. The Titan raises one foot, pauses in anticipation, stomps down, and returns to a strong stance. Keep both feet and full body inside every cell. Do not draw ground cracks or dust; create those as separate effects. Transparent background. Use the global sprite-sheet output rules.

### Chaos Titan hit — 4 frames, 1×4

> Using the supplied Chaos Titan reference, create a 4-frame hit reaction sprite sheet, 1 row × 4 columns. The Titan rocks back slightly, its glowing runes flicker, and it regains its stance. No broken body parts or debris. Transparent background. Use the global sprite-sheet output rules.

### Chaos Titan special — 8 frames, 2×4

> Using the supplied Chaos Titan reference, create an 8-frame weekly-boss special ability sprite sheet, 2 rows × 4 columns. The Titan raises both arms, turquoise runes glow brighter, and it forms a powerful guardian pose. Keep all energy attached to the body; do not add detached background effects. Transparent background. Use the global sprite-sheet output rules.

### Chaos Titan defeat — 10 frames, 2×5

> Using the supplied Chaos Titan reference, create a 10-frame defeat animation sprite sheet, 2 rows × 5 columns. The Titan's glowing runes dim, its shoulders relax, it slowly kneels, and it settles into a peaceful stone guardian pose. No destruction, gore, or frightening collapse. Keep the entire giant visible in every cell. Transparent background. Use the global sprite-sheet output rules.

---

# 3. Weapons — individual icon prompts

Generate each weapon icon separately so the model does not merge multiple weapons into one image. Use a square canvas, transparent background, and the same global style.

## 3.1 Wooden Katana — Common

> Create one original wooden practice katana for NeuronNinja. A simple polished light-brown wooden blade with a dark wrapped handle and a small teal cord. Show the complete weapon diagonally from lower-left to upper-right, centred, no cropping. Friendly fantasy pixel-art inventory icon, crisp pixel edges, readable at 64×64 pixels, transparent background. Common-tier visual treatment: simple materials, no magical glow, no text, no border, no extra objects.

## 3.2 Silver Katana — Uncommon

> Create one original silver katana for NeuronNinja. Bright steel blade, dark navy handle wrap, subtle silver guard, small cool-blue highlight. Complete weapon diagonally from lower-left to upper-right, centred and fully visible. Friendly fantasy pixel-art inventory icon, 64×64 design, transparent background. Uncommon-tier visual treatment: refined craftsmanship, restrained cool glint, no magical aura, no text, no border, no extra objects.

## 3.3 Golden Katana — Rare

> Create one original golden katana for NeuronNinja. Warm gold blade with a polished but readable pixel-art finish, deep red-brown handle wrap, elegant guard, small amber highlight. Complete weapon diagonally from lower-left to upper-right, centred and fully visible. 64×64 friendly fantasy pixel-art inventory icon, transparent background. Rare-tier treatment: a few subtle golden sparkles close to the blade, no text, no border, no extra objects.

## 3.4 Shadow Katana — Epic

> Create one original Shadow Katana for NeuronNinja. Dark violet-black blade with a narrow luminous purple edge, charcoal handle, violet cord, elegant curved silhouette. Complete weapon diagonally from lower-left to upper-right, centred and fully visible. 64×64 fantasy pixel-art inventory icon, transparent background. Epic-tier treatment: subtle contained purple energy around the blade, not obscuring its silhouette. No text, no border, no extra objects.

## 3.5 Dragon Katana — Legendary

> Create one original Dragon Katana for NeuronNinja. A premium fantasy katana with a deep crimson blade, gold fittings, teal jewel in the guard, and a small dragon-inspired decorative curve that is original and not based on any known franchise. Complete weapon diagonally from lower-left to upper-right, centred and fully visible. 64×64 pixel-art inventory icon, transparent background. Legendary-tier treatment: restrained golden and teal magical glow, clear silhouette. No text, no border, no extra objects.

## 3.6 Wind Kunai

> Create one original Wind Kunai throwing weapon for NeuronNinja. Compact silver-grey kunai with teal cloth tie and a small curved wind motif built into the handle design. Show one complete kunai diagonally, centred, 64×64 friendly fantasy pixel-art inventory icon, transparent background. No text, no border, no extra objects.

## 3.7 Stone Hammer

> Create one original Stone Hammer for NeuronNinja. A compact dark stone hammer head with carved teal rune marks and a sturdy wooden handle wrapped in navy cloth. Show the complete hammer diagonally, centred, 64×64 friendly fantasy pixel-art inventory icon, transparent background. No text, no border, no extra objects.

## 3.8 Shadow Bow

> Create one original Shadow Bow for NeuronNinja. Elegant curved dark-violet wooden bow with a teal string and a tiny purple crystal at the grip. Show the complete bow upright at a slight diagonal, centred, 64×64 friendly fantasy pixel-art inventory icon, transparent background. No arrow, no text, no border, no extra objects.

## 3.9 Light Staff

> Create one original Light Staff for NeuronNinja. A short polished wooden staff with a bright turquoise crystal held by simple gold branches at the top. Complete staff upright, centred, readable at 64×64, friendly fantasy pixel-art inventory icon, transparent background. Soft contained glow only. No text, no border, no extra objects.

## 3.10 Weapon equip glow effect — sprite sheet

> Create an 8-frame reusable weapon-equip magical glow effect sprite sheet, 2 rows × 4 columns. No weapon and no character. A small clean ring of teal and gold pixels forms, pulses once, and fades. Transparent background, equal-sized cells, effect centred consistently in every cell, no text, no borders, no frame numbers. Use the global sprite-sheet output rules.

---

# 4. Armour and equipment prompts

Generate each item separately.

## 4.1 Starter Gi

> Create one original simple navy ninja training gi torso armour for NeuronNinja. Folded or front-facing equipment-preview presentation, teal waist tie, simple cloth wrist details, no character wearing it. Friendly fantasy pixel-art equipment icon, 64×64 design, transparent background, readable silhouette, no text or border.

## 4.2 Focus Robe

> Create one original Focus Robe body armour for NeuronNinja. Deep indigo cloth, teal trim, small focus-knot emblem, clean practical ninja design. Display the complete robe as a standalone equipment icon, no character. 64×64 fantasy pixel art, transparent background, no text or border.

## 4.3 Guardian Armour

> Create one original Guardian Armour chest piece for NeuronNinja. Compact dark-steel shoulder and chest protection with teal accents and a small shield emblem. Standalone centred equipment icon, no character, 64×64 pixel-art, transparent background, no text or border.

## 4.4 Stoneplate Armour

> Create one original Stoneplate Armour chest piece for NeuronNinja. Layered grey stone plates, brown straps, small turquoise rune, sturdy but lightweight fantasy design. Standalone equipment icon, 64×64 pixel-art, transparent background, no character, no text or border.

## 4.5 Wind Cloak

> Create one original Wind Cloak for NeuronNinja. Compact folded or floating short cloak, pale teal fabric, navy inner lining, small silver clasp, slight wind-shaped hem. Standalone equipment icon, 64×64 pixel-art, transparent background, no character, no text or border.

## 4.6 Ninja headband

> Create one original ninja headband equipment icon. Deep navy cloth with a small teal leaf emblem in the centre, tied ends visible, symmetrical readable shape, 64×64 fantasy pixel-art, transparent background, no text or border.

---

# 5. Chests — individual prompts and opening sheets

## 5.1 Wooden Chest — closed

> Create one original small wooden reward chest for NeuronNinja. Warm oak planks, simple iron corner brackets, a small teal lock, front three-quarter view, lid fully closed. Entire chest centred with space around it, 96×96 fantasy pixel-art icon, transparent background. Common reward tier, humble and friendly. No text, no coins outside the chest, no border.

## 5.2 Wooden Chest — open

> Create the exact same wooden chest design as the supplied closed-chest reference, now with its lid open. Show a warm gentle golden light inside, but no floating reward objects. Same camera angle, scale, wood pattern, iron brackets, teal lock, and transparent background. 96×96 pixel-art icon, no text, no border.

## 5.3 Silver Chest — closed

> Create one original silver reward chest for NeuronNinja. Cool silver-blue metal panels, sturdy steel bands, a small sapphire-blue lock, front three-quarter view, lid closed. Entire chest centred, 96×96 fantasy pixel-art icon, transparent background. Uncommon reward tier, polished but not overly ornate. No text, no border.

## 5.4 Gold Chest — closed

> Create one original gold reward chest for NeuronNinja. Rich warm gold panels, bronze trim, small amber gemstone lock, front three-quarter view, lid closed. Entire chest centred, 96×96 fantasy pixel-art icon, transparent background. Rare reward tier, premium and readable. No text, no border.

## 5.5 Magic Chest — closed

> Create one original magical reward chest for NeuronNinja. Deep violet wood and dark metal, glowing turquoise runes, a violet crystal lock, front three-quarter view, lid closed. Entire chest centred, 96×96 fantasy pixel-art icon, transparent background. Special reward tier, contained magical glow that does not hide the chest shape. No text, no border.

## 5.6 Legendary Chest — closed

> Create one original legendary reward chest for NeuronNinja. Ornate crimson and gold construction, teal dragon-scale accents, bright central jewel lock, elegant but compact silhouette, front three-quarter view, lid closed. Entire chest centred, 96×96 fantasy pixel-art icon, transparent background. Highest reward tier, rich detail while remaining readable at small size. No text, no border.

## 5.7 Chest opening animation — 8 frames, 2×4

> Using the supplied exact chest reference, create an 8-frame chest-opening sprite sheet, 2 rows × 4 columns. The chest begins fully closed, lock glows, lid lifts gradually, warm light appears, lid opens fully, and the final frame holds the open chest. Keep the chest body fixed in exactly the same position and scale. Do not add reward items, words, coins, or background. Transparent background. Use the global sprite-sheet output rules.

## 5.8 Chest reward burst — 8 frames, 2×4

> Create an 8-frame reusable reward-reveal burst sprite sheet, 2 rows × 4 columns. A compact magical burst of gold, teal, and white pixel sparkles expands from the centre, forms a soft ring, and fades. No chest, no item, no text, no background. Transparent background, equal cells, centred effect. Use the global sprite-sheet output rules.

---

# 6. Castle and building assets

For the castle scene, decide whether the game uses **top-down** or **2:1 isometric** before producing the full set. The prompts below assume a consistent 2:1 isometric view. Do not mix top-down and isometric assets in one map.

## 6.1 Ground tile

> Create one seamless square grass ground tile for an original fantasy pixel-art mobile castle game. 64×64 pixels, 2:1 isometric-compatible environment style, gentle green grass, a few tiny stones and subtle variation, no objects that prevent tiling, no shadows extending outside the tile, no text. The tile must connect cleanly on all four edges.

## 6.2 Stone path tile

> Create one seamless 64×64 fantasy pixel-art stone path tile for a 2:1 isometric castle map. Light grey rounded stones, subtle moss between stones, consistent top-left light, clean edges that tile seamlessly on all sides, no objects, no text.

## 6.3 Ninja Keep — Level 1

> Create an original Level 1 Ninja Keep building for NeuronNinja. Small wooden-and-stone ninja fortress, navy roof, teal banner, one simple entrance, compact readable silhouette. 2:1 isometric view, fixed 2×2 tile footprint on a 64-pixel grid, transparent background, pixel-art, consistent top-left lighting. No labels, characters, or surrounding scenery.

## 6.4 Ninja Keep — Level 2

> Create the Level 2 upgrade of the exact supplied NeuronNinja Ninja Keep reference. Preserve the same 2×2 tile footprint, camera angle, base position, and overall silhouette. Add stronger stone foundations, a second roof detail, improved teal banner, and modest gold trim. It must clearly look like the same building upgraded, not a different building. Transparent background, pixel-art, no text.

## 6.5 Ninja Keep — Level 3

> Create the Level 3 upgrade of the exact supplied NeuronNinja Ninja Keep reference. Preserve the same 2×2 footprint, camera, base position, and silhouette. Add refined dark stone walls, layered navy roof, elegant teal banners, and a small glowing crest. Premium but not oversized. Transparent background, pixel-art, no text.

## 6.6 Focus Dojo — Level 1

> Create an original Level 1 Focus Dojo building for NeuronNinja. A calm small training hall with navy tiled roof, warm wood beams, teal hanging banner with a simple abstract focus symbol, and stone foundation. 2:1 isometric view, 2×2 tile footprint on a 64-pixel grid, transparent background, pixel-art, no people, no text.

## 6.7 Focus Dojo — Level 2

> Create the Level 2 upgrade of the supplied Focus Dojo reference. Keep identical camera angle, 2×2 tile footprint, base position, and building identity. Add a small side training deck, improved roof trim, two lanterns, and a refined teal banner. Transparent background, pixel-art, no text or characters.

## 6.8 Habit Shrine

> Create an original small Habit Shrine building for NeuronNinja. A peaceful stone shrine with a tiny glowing teal leaf emblem, warm lanterns, and a few carefully placed plants. 2:1 isometric view, 2×2 tile footprint on a 64-pixel grid, transparent background, friendly fantasy pixel-art, no text or characters.

## 6.9 Task Workshop

> Create an original Task Workshop building for NeuronNinja. Compact fantasy workshop with wood beams, stone base, a tidy tool rack, small teal roof detail, and one simple chimney. 2:1 isometric view, 2×2 tile footprint on a 64-pixel grid, transparent background, pixel-art, no people, no text.

## 6.10 Watchtower

> Create one original compact fantasy Watchtower for NeuronNinja. Stone lower level, dark navy wooden upper lookout, teal flag, small roof, clear readable silhouette. 2:1 isometric view, 1×1 tile footprint on a 64-pixel grid, transparent background, pixel-art, no characters, no text.

## 6.11 Archer Tower

> Create one original compact Archer Tower building for NeuronNinja. Sturdy stone base, timber lookout platform, navy canopy, teal banner, small decorative target symbol. 2:1 isometric view, 1×1 tile footprint on a 64-pixel grid, transparent background, pixel-art, no archer character, no text.

## 6.12 Training Yard

> Create one original Training Yard building area for NeuronNinja. Small open wooden training platform, two practice posts, one target dummy, navy and teal banners, neat stone border. 2:1 isometric view, 2×2 tile footprint on a 64-pixel grid, transparent background, pixel-art, no characters, no text.

## 6.13 Resource Store

> Create one original Resource Store building for NeuronNinja. Compact stone-and-wood storage hut with a large wooden door, stacked supply crates, small teal roof accent. 2:1 isometric view, 2×2 tile footprint on a 64-pixel grid, transparent background, pixel-art, no text.

## 6.14 Castle wall segment

> Create one straight fantasy castle wall segment for NeuronNinja, designed for modular tiling. Grey stone blocks, dark navy top trim, tiny teal banner detail, 64×64 isometric tile, transparent background. Front and side edges must align cleanly with matching wall segments. No text, no characters.

## 6.15 Castle corner wall

> Create one 90-degree corner segment that matches the supplied NeuronNinja castle wall reference exactly. Same stone blocks, navy top trim, height, lighting, and pixel scale. 64×64 isometric tile, transparent background, designed to connect seamlessly to two straight wall segments. No text.

## 6.16 Castle gate

> Create one modular fantasy castle gate for NeuronNinja. Stone side pillars, dark wooden double gate, navy trim, small teal crest, 2:1 isometric view, matching the supplied wall style and height. Transparent background, pixel-art, no text or characters.

## 6.17 Decorative tree

> Create one small friendly fantasy pixel-art tree for a mobile castle map. Rounded green canopy, warm brown trunk, a few teal highlights, compact isometric view, 1×1 tile scale, transparent background, clean silhouette, no scenery, no text.

## 6.18 Decorative lantern

> Create one small fantasy pixel-art castle lantern for NeuronNinja. Dark bronze post, warm golden light, tiny teal accent, 1×1 tile scale, isometric view, transparent background, no ground tile, no text.

---

# 7. Battle effects — individual sprite sheets

## 7.1 Katana slash — 6 frames, 2×3

> Create a reusable 6-frame katana slash effect sprite sheet, 2 rows × 3 columns. A clean curved white-and-teal slash arc sweeps from lower-left to upper-right, appears quickly, reaches full brightness, and fades. No sword, no character, no background. Transparent background, equal cells, centred effect. Use the global sprite-sheet output rules.

## 7.2 Kunai projectile — 6 frames, 2×3

> Create a 6-frame reusable Wind Kunai projectile animation sprite sheet, 2 rows × 3 columns. Show one small silver kunai with teal cloth tie rotating slightly while travelling in place from left to right across the frame. Keep the kunai fully visible and consistently sized. Transparent background, no character, no background trail. Use the global sprite-sheet output rules.

## 7.3 Impact flash — 4 frames, 1×4

> Create a 4-frame reusable pixel-art impact flash sprite sheet, 1 row × 4 columns. A small white centre flash expands into a short teal-and-gold starburst and quickly fades. No object, no character, transparent background, effect centred in every cell. Use the global sprite-sheet output rules.

## 7.4 Shield block — 6 frames, 2×3

> Create a 6-frame reusable shield-block effect sprite sheet, 2 rows × 3 columns. A translucent teal circular shield pulse forms, flashes once, and fades. No shield item or character. Transparent background, centred effect, equal cells, no text. Use the global sprite-sheet output rules.

## 7.5 Healing pulse — 6 frames, 2×3

> Create a 6-frame reusable healing effect sprite sheet, 2 rows × 3 columns. Gentle mint-green and warm-gold pixel particles rise in a small circular pulse and fade. Positive, calm, non-medical fantasy effect. No character, no text, transparent background. Use the global sprite-sheet output rules.

## 7.6 Villain defeat burst — 8 frames, 2×4

> Create an 8-frame reusable friendly fantasy villain-defeat effect sprite sheet, 2 rows × 4 columns. A compact violet-and-teal magical puff expands into a few soft sparkles and fades. No villain, no weapon, no text, no gore. Transparent background, centred effect. Use the global sprite-sheet output rules.

## 7.7 Gold pickup — 6 frames, 2×3

> Create a 6-frame reusable gold-reward pickup effect sprite sheet, 2 rows × 3 columns. Three small gold coin-like discs pop upward together, rotate slightly, sparkle, and settle. Keep the coins fully visible and grouped in the centre. No numbers, no text, transparent background. Use the global sprite-sheet output rules.

## 7.8 XP sparkle — 6 frames, 2×3

> Create a 6-frame reusable XP gain sparkle effect sprite sheet, 2 rows × 3 columns. Small teal, white, and gold pixel sparkles rise gently and fade. No letters, no numbers, no XP label, no background. Transparent background, centred effect. Use the global sprite-sheet output rules.

## 7.9 Building upgrade sparkle — 8 frames, 2×4

> Create an 8-frame reusable building-upgrade effect sprite sheet, 2 rows × 4 columns. A vertical teal-and-gold magical beam forms from the ground upward, pulses once, and fades into small sparkles. No building, no text, no background. Transparent background, equal cells. Use the global sprite-sheet output rules.

---

# 8. UI icon prompts

Generate each icon as an individual transparent image. Keep the same 64×64 pixel-art style.

## 8.1 Gold resource icon

> One simple gold coin icon for NeuronNinja, warm gold disc with a small original leaf-shaped emblem, front-facing, centred, crisp 64×64 fantasy pixel-art, transparent background, no letters, no numbers, no border.

## 8.2 Wood resource icon

> One small bundle of three neatly stacked timber logs, warm brown with clean pixel edges, centred 64×64 fantasy pixel-art resource icon, transparent background, no text or border.

## 8.3 Stone resource icon

> One small stack of three grey building stones with subtle teal highlights, centred 64×64 fantasy pixel-art resource icon, transparent background, no text or border.

## 8.4 Energy resource icon

> One bright turquoise energy crystal, simple faceted shape, soft contained glow, centred 64×64 fantasy pixel-art resource icon, transparent background, no text or border.

## 8.5 Mission scroll icon

> One rolled parchment mission scroll tied with a teal ribbon, no writing or symbols, centred 64×64 fantasy pixel-art icon, transparent background, no border.

## 8.6 Focus icon

> One simple navy meditation timer/hourglass with a teal centre glow, centred 64×64 fantasy pixel-art UI icon, transparent background, no text or border.

## 8.7 Habit icon

> One small bright green leaf growing from a tiny stone base, symbolising a habit growing over time, centred 64×64 fantasy pixel-art icon, transparent background, no text or border.

## 8.8 Task icon

> One tidy wooden checklist board with three blank teal check marks represented only as simple shapes, no letters or words, centred 64×64 fantasy pixel-art icon, transparent background, no border.

---

# 9. Profile avatar frames and badges

## 9.1 Common avatar frame

> Create one square common-tier fantasy ninja avatar frame for NeuronNinja. Simple dark navy border with subtle wood texture and tiny teal corner details. Empty transparent centre where a user portrait will be placed. Pixel-art, 256×256, no portrait, no text, no letters, no watermark.

## 9.2 Rare avatar frame

> Create one square rare-tier fantasy ninja avatar frame for NeuronNinja. Polished gold-and-amber border with restrained small sparkles, empty transparent centre for a portrait. Pixel-art, 256×256, no portrait, no text, no letters, no watermark.

## 9.3 Legendary avatar frame

> Create one square legendary-tier fantasy ninja avatar frame for NeuronNinja. Ornate crimson, gold, and teal border with small original dragon-scale motifs, elegant and readable, empty transparent centre for portrait. Pixel-art, 256×256, no portrait, no text, no watermark.

## 9.4 Mission-complete badge

> Create one circular mission-complete badge for NeuronNinja. A small teal shield with a gold check symbol, thick readable silhouette, 128×128 fantasy pixel-art icon, transparent background, no text.

## 9.5 Weekly boss badge

> Create one circular weekly-boss achievement badge for NeuronNinja. A friendly stone titan face silhouette inside a dark navy shield, teal and gold trim, 128×128 fantasy pixel-art icon, transparent background, no text.

---

# 10. Audio generation briefs

If using an AI audio generator, generate each sound separately and request clean, short, original game audio. Avoid copyrighted melodies or recognisable franchise sound effects.

| Sound ID | Separate prompt |
|---|---|
| `ui_tap` | “Create a very short, soft, friendly fantasy UI tap sound, around 80 milliseconds, clean and subtle, no voice.” |
| `mission_complete` | “Create a short positive mission-complete chime, around 1 second, two or three original bright notes, warm and motivating, no voice.” |
| `xp_gain` | “Create a tiny rising sparkle sound for gaining experience points, around 500 milliseconds, original and gentle.” |
| `level_up` | “Create an uplifting original fantasy level-up fanfare, around 1.5 seconds, bright but not loud, no voice.” |
| `chest_open` | “Create a short wooden chest opening sound with a soft metallic latch and magical shimmer, around 1 second, original.” |
| `rare_reward` | “Create a short rare-item reveal chime, around 1 second, sparkling and satisfying, original notes.” |
| `legendary_reward` | “Create a distinctive but short legendary reward reveal sound, around 1.5 seconds, warm orchestral sparkle, no copied melody.” |
| `sword_swing` | “Create a quick clean fantasy sword-swing whoosh, around 300 milliseconds, no voice.” |
| `sword_hit` | “Create a short soft metallic fantasy weapon impact, around 250 milliseconds, non-violent, no voice.” |
| `villain_hit` | “Create a light comic fantasy creature hit reaction sound, around 250 milliseconds, friendly and non-threatening.” |
| `villain_defeat` | “Create a short magical poof and sparkle sound for a friendly fantasy creature defeat, around 700 milliseconds, no voice.” |
| `building_upgrade` | “Create a short construction-complete magical chime, around 1 second, wood and stone texture with a bright finish.” |

Export short effects as OGG or another format supported by the app's chosen audio stack. Normalise loudness and test at low volume.

---

# 11. How to generate reliably

## Step 1 — Lock the style

Generate the Ninja master reference first. Approve the palette, outline, pixel scale, camera angle, and proportions. Use that image as a style reference for every subsequent asset.

## Step 2 — Generate master character images

Generate these six images individually:

1. Ninja
2. Scroll Hydra
3. Procrastination Slime
4. Distraction Wisp
5. Snooze Goblin
6. Chaos Titan

Do not start animation sheets until each master reference is approved.

## Step 3 — Generate animation sheets

For each character, generate idle, attack, hit, special, and defeat sheets separately. Reuse the same master reference every time. Check frame alignment and crop into individual frames.

## Step 4 — Generate equipment and chests

Generate every weapon, armour item, and chest separately. Do not ask for a sheet containing multiple different items; separate outputs are easier to crop, catalogue, and map to item IDs.

## Step 5 — Generate castle pieces

Choose top-down or 2:1 isometric before generating any building. Generate the ground tiles and one test building first. Verify that the pieces align on a grid before producing every building level.

## Step 6 — Generate effects and UI

Create reusable effects and resource icons separately. Keep effects independent of characters and weapons so the app can reuse them.

## Step 7 — Clean and export

Use LibreSprite or Pixelorama to:
- Crop exact frame cells.
- Remove stray pixels and backgrounds.
- Align pivots and baselines.
- Check loops.
- Export transparent PNG frames or sprite sheets.
- Record dimensions and frame order in the asset manifest.

---

# 12. Suggested output names

```text
characters/ninja/ninja_master_v01.png
characters/ninja/ninja_idle_6f_v01.png
characters/ninja/ninja_walk_8f_v01.png
characters/ninja/ninja_attack_8f_v01.png
characters/ninja/ninja_hit_4f_v01.png
characters/ninja/ninja_victory_6f_v01.png

enemies/scroll_hydra/scroll_hydra_master_v01.png
enemies/scroll_hydra/scroll_hydra_idle_6f_v01.png
enemies/scroll_hydra/scroll_hydra_attack_8f_v01.png
enemies/scroll_hydra/scroll_hydra_hit_4f_v01.png
enemies/scroll_hydra/scroll_hydra_special_8f_v01.png
enemies/scroll_hydra/scroll_hydra_defeat_8f_v01.png

weapons/wooden_katana_icon_v01.png
weapons/silver_katana_icon_v01.png
weapons/golden_katana_icon_v01.png
weapons/shadow_katana_icon_v01.png
weapons/dragon_katana_icon_v01.png
weapons/wind_kunai_icon_v01.png
weapons/stone_hammer_icon_v01.png
weapons/shadow_bow_icon_v01.png
weapons/light_staff_icon_v01.png

chests/wooden_chest_closed_v01.png
chests/wooden_chest_open_v01.png
chests/wooden_chest_opening_8f_v01.png
chests/silver_chest_closed_v01.png
chests/gold_chest_closed_v01.png
chests/magic_chest_closed_v01.png
chests/legendary_chest_closed_v01.png

castle/ground_grass_tile_v01.png
castle/stone_path_tile_v01.png
castle/ninja_keep_level_01_v01.png
castle/ninja_keep_level_02_v01.png
castle/ninja_keep_level_03_v01.png
castle/focus_dojo_level_01_v01.png
castle/habit_shrine_level_01_v01.png
castle/task_workshop_level_01_v01.png
castle/watchtower_level_01_v01.png
castle/archer_tower_level_01_v01.png

effects/katana_slash_6f_v01.png
effects/kunai_projectile_6f_v01.png
effects/impact_flash_4f_v01.png
effects/shield_block_6f_v01.png
effects/healing_pulse_6f_v01.png
effects/villain_defeat_burst_8f_v01.png
effects/gold_pickup_6f_v01.png
effects/xp_sparkle_6f_v01.png
effects/building_upgrade_8f_v01.png
```

---

# 13. Minimum viable generation batch

Do not generate the entire library in one go. First generate this minimum batch and test it in the app:

- [ ] Ninja master reference
- [ ] Ninja idle sheet
- [ ] Ninja attack sheet
- [ ] Scroll Hydra master reference
- [ ] Scroll Hydra idle sheet
- [ ] Scroll Hydra attack sheet
- [ ] Scroll Hydra hit sheet
- [ ] Scroll Hydra defeat sheet
- [ ] Wooden Katana icon
- [ ] Shadow Katana icon
- [ ] Wooden Chest closed
- [ ] Wooden Chest open
- [ ] Wooden Chest opening sheet
- [ ] Ninja Keep Level 1
- [ ] Focus Dojo Level 1
- [ ] Katana slash effect
- [ ] Impact flash
- [ ] XP sparkle

Once these assets render correctly in Expo and the battle/reward flow works, continue with the remaining prompts.

---

## 14. Integration reminder

The generated art is presentation only. Keep the following data server-authoritative:

- Item ownership and equipment
- Chest entitlements and chest rewards
- XP and resource balances
- Villain health and contribution totals
- Castle building levels and upgrade completion
- Battle snapshots, damage, stars, and results

The app should map stable IDs such as `shadow_katana` or `scroll_hydra` to local, statically imported asset files. Never let an image-generation filename or client animation determine a reward or battle result.