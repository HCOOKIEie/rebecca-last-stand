# V6 execution animation

Asset: `smasher-finish-v6.png`

Created with the built-in `image_gen` tool, preserving transparent alpha. The existing `smasher-atlas-v2.png` was the identity and pixel-style reference. Four original articulated poses: defeated kneel, execution recoil, hands collapsing forward, fully prone. No raster post-processing was applied. Runtime source rectangles and ground pivots register the poses without modifying the generated image.

## Full generation prompt

```text
Use case: identity-preserve.
Asset type: high-detail pixel-art sprite sheet for a 2D side-view game. The supplied image is the exact character identity and pixel-rendering style reference, NOT the layout to preserve. Create NEW death-animation poses of this same adult male cyborg Adam Smasher from Cyberpunk Edgerunners: massive graphite armored body, ivory human skull-like face with red eyes, military olive shoulder launcher, red neck cables, navy joints, heavy segmented shoulder plates and large cybernetic hands. Preserve this exact character design, lighting and richly shaded crisp pixel clusters.
Composition: one square transparent sprite sheet, exactly 2 columns by 2 rows, four isolated full-body poses, equal square cells with generous transparent gutters and absolutely no overlap. Each pose faces the viewer's RIGHT in the same three-quarter side view. Same anatomical proportions and sprite scale across all four poses. Think 1024x1024 sheet, each cell512x512. Ground contact baseline at y475 within each cell. Ground must NOT be drawn. Entire body always fits within its own cell.
TOP LEFT: defeated KNEELING upright, BOTH KNEES on the ground, shins folded backward on ground, hips resting above heels, massive shoulders still high, head lowered but ivory skull face clearly visible, arms hanging limp beside thighs. This is a vulnerable kneel, not a squat, not a superhero landing.
TOP RIGHT: immediately after a shotgun execution hit, STILL KNEELING, torso jerks backward and chin lifts slightly, shoulders open, one hand lifts weakly; same knees grounded and same placement. Mechanical armor damage only; no gore or impact effects.
BOTTOM LEFT: the heavy cyborg is TOPPLING FORWARD from his knees, upper body angled approximately 45 degrees toward right, right palm touches ground ahead of knees as the other arm gives way, skull face points toward ground, real articulated bent body.
BOTTOM RIGHT: fully fallen DEAD, whole body lying PRONE facing right, chest and shoulder plating down on ground, head at far right turned enough that skull profile is visible, arms extended loosely, knees/legs trailing left, heavy believable collapsed anatomy. Maximum height of this prone pose about one quarter of a cell. Not a standing sprite rotated.
Pixel art only: crisp stepped edges, clustered deliberate pixel shading, thin dark outline, muted gunmetal blue highlights, tiny red electronics. No smooth painting, no blurry antialiasing, no motion blur, no glow, no particles, no scene, no text, no labels, no frames, no watermark, no ground shadows. Fully transparent alpha background. Four distinct consistent poses only.
```

