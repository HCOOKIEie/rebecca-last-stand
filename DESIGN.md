---
name: One More Shot V6
description: Cyberpunk Edgerunners pixel action game
colors:
  background: "#0d0d14"
  panel: "#191117"
  red: "#ff5366"
  red-dim: "#83323e"
  cyan: "#70e5ef"
  yellow: "#f6f237"
  text: "#e9dfe2"
  muted: "#bcadb4"
  line: "#56303c"
typography:
  display:
    fontFamily: "Rajdhani, Microsoft YaHei, sans-serif"
    fontWeight: 600
  body:
    fontFamily: "Microsoft YaHei, PingFang SC, sans-serif"
    fontSize: "13px"
  title:
    fontSize: "clamp(28px,4.5cqw,54px)"
    fontWeight: 900
    lineHeight: 1.15
    letterSpacing: "-3px"
rounded:
  square: "0px"
spacing:
  small: "8px"
  medium: "12px"
  large: "20px"
components:
  button-primary:
    backgroundColor: "{colors.yellow}"
    textColor: "#161318"
    rounded: "{rounded.square}"
    padding: "0 20px"
    height: "46px"
  button-secondary:
    backgroundColor: "transparent"
    textColor: "{colors.red}"
    rounded: "{rounded.square}"
    height: "40px"
  combat-panel:
    backgroundColor: "#130f19e6"
    textColor: "{colors.cyan}"
    padding: "8px 12px"
---
## Overview
**Creative North Star: "Night City, one more shot."**

The game itself leads. Detailed pixel characters and the blue-violet glass plaza carry the scene; compact combat panels translate the user's explicitly requested Cyberpunk 2077 influence.

**Key Characteristics:**
- Acid-yellow actions, red interface boundaries, cyan live readings.
- Angular panels and locally bundled condensed Latin lettering.
- Open combat floor with HUD information outside the characters' feet.

Motion uses fixed 120 Hz simulation, render interpolation, registered sprite pivots, recoil, afterimages and brief impact feedback. Reduced effects removes camera shake, flashes and hit hold.

## Colors
**The Functional Color Rule.** Yellow signals primary action or opportunity, red signals danger and interface structure, cyan carries live player data. Dark panels separate text from the vivid scene.

## Typography
Rajdhani is the condensed Latin/data voice. Chinese headings and body use the installed Microsoft YaHei / PingFang fallback chain. Regular secondary UI text is at least 11px; game instructions use 11–12px and legal footer text uses 10px. The compact mobile ability strip uses 9–10px names and keys with separate readable cooldown values; touch targets remain 49px tall.

## Layout
Desktop uses a 16:9 canvas inside compact status bars. Intro copy sits left, character art right. Health and boss bars sit above play, ammunition and counter state below.

Below 900px the stage gains separate HUD space. Below 560px it becomes 3:4 with a 16:9 arena letterboxed at 26% from the top. Touch controls live below the stage. No horizontal page overflow is intended.

**The Containment Rule.** Modal grid columns use minmax(0,1fr); cards use width:min(420px,88%) and min-width:0 so pause and result actions remain inside the stage.

## Elevation & Depth
Semiopaque near-black panels establish readable foregrounds. Pause dims and blurs the scene. Death results keep the aftermath clear, placing a smaller card opposite the death location on desktop and below the arena on phones. Scene lighting comes from the background artwork; UI shadows stay subdued.

## Shapes
Square edges, one-pixel red boundaries and a 12px cut at the primary button's bottom-right corner. Interface icons are consistent inline stroked SVG.

## Components
Primary buttons start/resume/retry; secondary outlined buttons return home. Difficulty selectors indicate state with a red inset edge. HUD bars show health, boss armor, dash readiness and shells. Modal containment applies equally to pause and result.

V3 difficulty is an extension of the same system: four compact preset buttons, cyan range controls with yellow readouts, and an explicit full-arsenal checkbox. Settings use a contained width:min(490px,92%) card with internal overflow when needed. During combat, applying settings is explicitly labeled as a restart; cancellation preserves the current encounter.

V3.1 opens with Rebecca grounded under the airborne boss and a protected initial reaction window. Stomp waves use hollow translucent pressure arcs, trailing ripples, floor highlights, dust and sharp glass silhouettes. Pixel death debris follows gravity and remains on the floor with a spreading irregular blood pool; the live character and its afterimages disappear immediately.

V4 places three compact, clickable target buttons under the boss armor bar. Yellow indicates the selected part; destroyed parts show a disabled dashed border. Mobile uses 32px-high target buttons and moves the boss panel into the upper HUD zone. The opening airborne pivot leaves the boss silhouette below this panel.

Sandevistan uses mint and yellow path arrows, independently locked before each dash; decorative afterimages stay translucent. Orange cracks mean imminent collapse, a dark recessed cavity means no footing, and cyan grating indicates a usable emergency bridge. These colors describe distinct gameplay states.

Victory clears combat HUD and uses cinematic letterbox bars. A compact cyan communication panel contains an original pixel portrait and three short dialogue beats; Rebecca lowers the weapon while Smasher remains in his completed death pose. Skip is enabled after 2.5 seconds. Replay returns to the cinematic without changing results. The final moon epilogue uses a subdued blue overlay and pale-yellow title.

## V6 mode and execution interface

The intro adds a two-column combatant selector before the mission. Rebecca is cyan; Smasher is yellow. Both selection color and aria-pressed communicate the current role. Mission copy, opponent identity, control guide and tips follow the active role. On phones, the decorative slogan and character caption are removed so mode, difficulty and start controls remain visible; the intro has bounded vertical overflow for very small screens.

Smasher's six ability buttons sit below the playable floor and between the existing readouts on desktop. Each includes its key, weapon name and cooldown. Ready is cyan, active is yellow, and cooling uses a muted border plus a numeric state. On phones the full-width strip occupies the gap below the letterboxed arena; the armor and status readouts move lower. Buttons are pointer-enabled inside the otherwise passive HUD. Target-part controls are hidden in this mode.

Zero armor produces a clearly readable kneeling Smasher, not a result overlay. A local prompt explains the approach requirement; the yellow interaction button becomes available only when the ground/range/readiness conditions are met. E and touch invoke the same action. The 2.6-second execution has a final shot, failed support, forward collapse, contact debris and a held dead pose. A dedicated finish atlas preserves the mechanical silhouette across these stages. Keep the dead pose continuous into Lucy's later communication; never reset to a standing sprite. Smasher's own victory uses a separate result and omits that communication.

Execution VFX remain local to the body and floor. Reduced effects preserve pose sequencing and the interaction cue while reducing flashes, debris and camera response. New panels must not cover attacks or the kneeling silhouette.

## Do's and Don'ts
- Do preserve the character silhouettes and pixel sampling.
- Do keep combat telegraphs distinct from decorative effects.
- Do honor reduced-effects settings.
- Don't put weapon panels over the combat floor.
- Don't reinstate timer-based victory; the boss must be defeated.



## V5 floor breach and combat feedback

At half armor, a 5.4-second protected sequence moves the fight from the glass plaza into an original ruined concrete undercroft. Charge, fracture, descent, landing and cyberware activation are timed events. Combat time and resources freeze during the transition; the first post-landing Sandevistan attack receives a full warning, and lower-level concrete cannot collapse again. Reduced motion uses a quiet crossfade.

Shotgun feedback combines a complete forearm/weapon recoil transform, correctly attached muzzle flash, small physical pushback, directional camera kick, a single per-shell impact accent and layered synthesized audio. Every Sandevistan lock has one distinct three-pulse cue before its dash. Audio pauses with the simulation; new scenes cancel queued voices. V5 scores are separate from prior records.

Background: assets/corpo-undercroft-v5.png, original image_gen art; complete prompt in assets/ART_DIRECTION_V5.md. Validation: 47 engine tests, real PCM audio render, 19 fixtures using actual game.js rendering functions. Browser file:// automation was not available; fixture images are not browser screenshots.
