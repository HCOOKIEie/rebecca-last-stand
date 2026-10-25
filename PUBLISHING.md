# Publishing

This project contains a browser game implemented in HTML, CSS and JavaScript.
It has no runtime package dependencies and requires no server-side game service.

## GitHub and GitHub Pages

The repository contains the runtime sources, registered image atlases, font license,
asset production notes and combat tests. `output/`, temporary files, installed test
dependencies and duplicate legacy standalone HTML files are excluded.

For GitHub Pages, use **Settings → Pages → Deploy from a branch → main → / (root)**.
The entry point is the repository's `index.html`; all assets use relative paths.
`.nojekyll` preserves this static layout.

## Browser upload for itch.io

Run `npm run build`, then `node prepare-publish.cjs`.
The generated `output/publish/itch/index.html` is a standalone browser build;
it embeds the scripts, five PNG images and font. Upload that single file as an
HTML game, or ZIP it at the archive root as `index.html`.

The curated source tree is generated separately in `output/publish/github/`.
Do not upload the whole working directory or `output/` to a source repository.

Suggested project settings: HTML, released, action, free/no payments, click to
launch fullscreen. Desktop keyboard play is the primary target; touch controls
are included. Clearly disclose graphic violence and the use of generative AI
for graphics, code and dialogue/text. The audio is local procedural synthesis;
it contains no sampled music, voice acting or audio from the anime/game.

## Attribution

This is an unofficial fan work, not approved or endorsed by CD PROJEKT RED,
TRIGGER, Netflix or other associated rights holders. Character and franchise
rights belong to their respective owners. No franchise license is granted by
this repository. See `assets/ART_DIRECTION_V*.md` for asset production notes
and `assets/Rajdhani-OFL.txt` for the font license.

Local preparation does not itself publish to GitHub or itch.io.
