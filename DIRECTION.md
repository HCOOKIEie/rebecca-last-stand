# Confirmed visual direction

The user pinned Cyberpunk 2077 and Edgerunners as the visual authority. Red/black angular combat panels, acid-yellow primary actions/title, icy-cyan live data, condensed Rajdhani Latin lettering, legible Chinese body copy. No alternate brand direction is needed. User confirmed victory requires defeating the opponent; Rebecca now finishes a kneeling Smasher through a proximity interaction.

Gameplay fills the primary panel. Intro overlays the left third, with full character artwork right. Combat HUD uses top health/boss bars and bottom ammo/counter readouts. Pixel characters and the night glass plaza are the main visual proof. Character traits follow official reference images: mint hair, black/lime jacket, pink/cyan hands and Guts; Smasher has charcoal armor, pale skull/red optics and olive missile launcher. The scene adapts the finale's purple-blue glass plaza and corporate tower lights to a 2D collision plane.

Motion follows acceleration/deceleration, fixed 120 Hz simulation, interpolation, registered sprite pivots, anticipation/leap/lock/drop/recovery poses, restrained recoil, dash afterimages, glass chips and pressure rings. Reduced effects disables flashes, hit hold and camera shake. Mobile has a letterboxed arena with separate HUD zones and touch buttons.

Verification must cover desktop intro, desktop gameplay, mobile intro/gameplay, pause/result, no horizontal overflow, ammo/reload and HP feedback. No approved generated page comp exists; code-led build within the user's explicitly requested franchise UI direction. Generated sprite/background prompts live in assets/ART_DIRECTION_V2.md.

V6 adds a user-confirmed human Smasher versus AI Rebecca mode. Present two explicit roles within the existing intro, with role-specific mission, controls and scores. Smasher's six manual abilities need discoverable keys and visible cooldowns; reuse the angular HUD and preserve clear attack paths. AI behavior must actually move, evade and fire, with no scripted automatic win. Keep the playable Smasher's outcome independent from Rebecca's Lucy communication.

The requested Rebecca finish is armor zero → mechanical kneeling → player approaches on the ground within 105 pixels → E/touch interaction → 2.6-second final shot and physical collapse → victory. Do not award victory at armor zero, auto-execute at range, or return the corpse to a standing sprite during later cinematics. Use the dedicated assets/smasher-finish-v6.png finish atlas with registered ground pivots; effects emphasize loss of support, body weight and floor contact. The interaction must remain visible with reduced effects.

V6 verification adds both mode selections, all six manual Smasher abilities and cooldown UI, AI combat, the near/far and grounded execution conditions, death-pose continuity, separate results/records, and phone containment of the ability strip and interaction button. The V6 standalone must embed nine scripts and five PNGs without runtime network requests.

V3 extends combat within this established direction: four preset difficulties and custom boss settings, clearly distinct cannon/rush/barrage/stomp telegraphs, existing atlas poses adapted for the new moves, and separate scores per configuration. Preserve the original character assets and main UI composition.

V3.1 adds the requested opening staging (Rebecca below, Smasher above, at least 1.9 seconds to react), detailed procedural pressure/glass shockwaves and a persistent pixel blood/pulp death scene. Retain the generated atlases. The result panel must leave the aftermath visible: opposite side on desktop, below the arena on mobile. Actual engine Canvas previews and browser DOM checks are recorded separately from browser screenshots.

V4 extends the same scene with readable targeted armor destruction, half-health Sandevistan transformation, offensive shotgun combinations, collapsible glass and an original Lucy victory communication. No extra website sections are needed. Keep target controls compact, leave the opening boss silhouette below the HUD, and distinguish orange collapse warnings from cyan usable light bridges. Existing atlases are retained; damage, debris, the Lucy portrait and epilogue are original Canvas geometry. Verify real browser targeting, transformation, victory, replay and phone containment as well as the engine mechanics.


## V5 floor breach and combat feedback

At half armor, a 5.4-second protected sequence moves the fight from the glass plaza into an original ruined concrete undercroft. Charge, fracture, descent, landing and cyberware activation are timed events. Combat time and resources freeze during the transition; the first post-landing Sandevistan attack receives a full warning, and lower-level concrete cannot collapse again. Reduced motion uses a quiet crossfade.

Shotgun feedback combines a complete forearm/weapon recoil transform, correctly attached muzzle flash, small physical pushback, directional camera kick, a single per-shell impact accent and layered synthesized audio. Every Sandevistan lock has one distinct three-pulse cue before its dash. Audio pauses with the simulation; new scenes cancel queued voices. V5 scores are separate from prior records.

Background: assets/corpo-undercroft-v5.png, original image_gen art; complete prompt in assets/ART_DIRECTION_V5.md. Validation: 47 engine tests, real PCM audio render, 19 fixtures using actual game.js rendering functions. Browser file:// automation was not available; fixture images are not browser screenshots.
