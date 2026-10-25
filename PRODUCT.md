# Product

Chinese language, offline-capable 2D pixel action fan game based on Cyberpunk: Edgerunners episode 10. V6 offers two player roles: Rebecca against Adam Smasher, or human-controlled Smasher against AI Rebecca. The user explicitly requested improved, recognizable character art, fluid movement/dodge/stomp animations, stronger effects, a finale-appropriate background, Cyberpunk 2077-like UI, and a meaningful counterattack.

Confirmed Rebecca objective: **must defeat Adam Smasher to win**. At zero armor he becomes incapacitated and kneels; the player approaches on the ground within 105 pixels and presses E or the interaction button. Victory is awarded only after the 2.6-second execution animation finishes. Smasher mode requires defeating AI Rebecca. Neither mode has a survival timer victory. These are alternate outcomes, not recreations of canon's ending.

## V6 execution and playable Smasher

The menu exposes two explicit roles. Switching roles changes the mission, controls, HUD labels and tips. Records are separate by role and difficulty/configuration. Both roles support keyboard, mouse and touch; Smasher additionally has a six-button ability strip with readable cooldowns.

Rebecca's finale proceeds through armor depletion, kneeling, proximity interaction, the final shotgun blast and a mechanical collapse to a stable dead pose. The user remains in control while approaching. Execution has a distinct 2.6-second animation before the existing Lucy communication and moon epilogue. A dedicated finish atlas, assets/smasher-finish-v6.png, supports the kneel and death sequence; execution-fx.js adds local sparks, impact and prompts.

Smasher controls: A/D move, J arm cannon, K missile salvo, Space aerial stomp, Shift rush, Q Sandevistan and R guard; P/Esc pauses. Abilities require player input and have separate cooldowns. AI Rebecca moves, fires, reloads, reacts to telegraphs and evades with difficulty-dependent reaction and accuracy. Her defeat wins the encounter; loss of Smasher armor loses it. Smasher mode has its own result presentation and does not play the Lucy ending. The new behavior is isolated in smasher-mode.js while retaining the shared collision and damage simulation.

Distribution embeds nine runtime scripts, five PNGs and the local font into the V6 standalone file; all existing offline entry aliases are refreshed by the build. Automated checks cover both engine.test.cjs and smasher-mode.test.cjs. Validation results must distinguish engine fixtures from real browser screenshots.

Combat: six-shell Guts shotgun, projectile damage, two-shell heavy shot, manual/automatic reload, recovery vulnerability, perfect dodge empowers the next shot. Boss rotates locked stomp, aimed cannon volleys, telegraphed cybernetic rush, staggered missile barrage and double stomp. Attack availability changes with HP and preset rank. Ranged attacks make space first when Rebecca is close.

User requested more boss attacks and adjustable boss difficulty. V3 has story/standard/high-risk/nightmare presets (5/4/3/1 player health, 2500/4000/5250/6500 boss armor), plus custom armor, pace, warning time and full/basic arsenal. Settings persist; scores are separate for each configuration. Applying new settings during a fight explicitly restarts it, cancel returns to the paused fight. Keyboard, mouse and touch inputs; pause and reduced-motion options; generated sprites/background, synthesized audio, no network dependency to play.

Audience: a Chinese-speaking Edgerunners fan using a desktop browser, with portrait phone support and local single-file distribution. Art fidelity and readable combat take precedence over generic website presentation.

V3.1 follows the requested opening composition: Rebecca on the ground, Smasher directly above her. Every preset reserves at least 1.9 seconds of initial telegraph and at least 0.65 seconds after target lock, with controls active immediately. Later attacks retain the full leap animation. Layered hollow pressure waves, glass fragments, dust and floor reflections improve stomp effects. Lethal damage replaces the living sprite with a persistent pixel blood/pulp aftermath, colored outfit and cyberware fragments and the dropped shotgun. Results appear after 1.85 seconds, with the card opposite the death location on desktop or below the arena on phones; retry creates a clean world.

V4 implements all five requested additions. A single grounded transformation at half armor enables three separately warned Sandevistan dashes, exposed burning armor and trails. Q / 1–3 or HUD buttons target torso, missile launcher or legs; actual pellet hits deplete part armor and boss HP, a destroyed launcher reduces future salvos to one missile, and destroyed legs extend recovery. Slide shots and airborne heavy shots have damage bonuses; close heavy hits interrupt ground windups with a four-second cooldown. Stomps progressively fracture glass tiles, provide a 1.15-second collapse warning, create dangerous gaps that stop shockwaves, then deploy temporary emergency bridges; falls cost one life and rescue survivors. Victory has a 17-second overload, collapse, weapon-lowering, original Lucy communication and moon epilogue sequence with skip and replay. V4 scores are separate from V3 scores.


## V5 floor breach and combat feedback

At half armor, a 5.4-second protected sequence moves the fight from the glass plaza into an original ruined concrete undercroft. Charge, fracture, descent, landing and cyberware activation are timed events. Combat time and resources freeze during the transition; the first post-landing Sandevistan attack receives a full warning, and lower-level concrete cannot collapse again. Reduced motion uses a quiet crossfade.

Shotgun feedback combines a complete forearm/weapon recoil transform, correctly attached muzzle flash, small physical pushback, directional camera kick, a single per-shell impact accent and layered synthesized audio. Every Sandevistan lock has one distinct three-pulse cue before its dash. Audio pauses with the simulation; new scenes cancel queued voices. V5 scores are separate from prior records.

Background: assets/corpo-undercroft-v5.png, original image_gen art; complete prompt in assets/ART_DIRECTION_V5.md. Validation: 47 engine tests, real PCM audio render, 19 fixtures using actual game.js rendering functions. Browser file:// automation was not available; fixture images are not browser screenshots.
