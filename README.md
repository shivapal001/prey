# PREY: THE ESCAPE — official site

A static landing page for the Android horror game **PREY: THE ESCAPE** by
SHIVA × WEBLOOM.

## What this folder is

`PREY-WEBSITE/public/` is the site:

- `index.html` — the page
- `css/styles.css` — styling
- `js/main.js` — interactivity
- `assets/images/shot-*.webp` — in-game screenshots
- `assets/images/og-cover.jpg` — open-graph image
- `assets/icons/*` — favicon / app icons derived from the game's launcher icon
- `downloads/PREY_THE_ESCAPE_v1.0.6_RELEASE.apk` — the downloadable Android build
- `site.webmanifest` — PWA manifest

`PREY-WEBSITE/package.json` just bootstraps a local dev server and icon
generation. It is not the game project.

## Icons

Favicon, app icon and download-card icon in `public/assets/icons/` are resized
from the game's own launcher artwork, so the site and the installed app share
the same identity. They are committed — no build step is required.

## Checks

Two zero-dependency Node checks run offline against the built page:

```bash
npm run validate        # assets, anchors, APK, required files
npm run check:assets    # every href/src resolves, sections present
```

Both must exit 0 before publishing. The download card also publishes the
SHA-256 of the APK (`6a0dafe41f85aeb5187d5b88b59d526f2ed21f78694a08a3bfe4f10049fe536a`)
so a download can be verified with `sha256sum` or `Get-FileHash`.

## Dev server

From inside `PREY-WEBSITE/`:

```bash
npm run serve     # Python http.server on :4173
npm start          # npx serve (supports SPA fallback)
```

Then open `http://localhost:4173`.

## APK

The download route serves `downloads/PREY_THE_ESCAPE_v1.0.6_RELEASE.apk`.
To refresh it from a build output, run `npm run sync-apk` (or drop the APK in
that folder manually). The page shows the APK's file size and a verification
checksum.

## Design notes

- The page is opt-in on effects: `html[data-fx="off"]` or
  `prefers-reduced-motion` disables everything.
- All screenshots are captured from the game itself, not mockups.
- The icon is the game's launcher icon, resized for the browser, so the site
  and the installed app share the same visual identity.

## Story sections and content sources

The cinematic sections (Story, The Survivor, Enemies, Locations, Secrets,
Game Experience) are written from the Unity project, not invented:

- `Assets/Scenes/TextCrawl.unity` — Zara, her brother/bunkmate Duke, the town
  at night and the monsters.
- `Assets/Scenes/Level1.unity`, `Level3.unity`, `Level4.unity` — the Backlot
  Gate, the Side Gate, the East Gate, Arnold, Johnny, the generator keys and
  the injured Duke dialogue.
- `Assets/Textures/Maps/` — “Find the key”, “The field” and “You are here”.
- `Assets/Prefabs/Enemies/` — the Ghoul / Zombie names, vision distances,
  patrol and chase speeds, damage and health.
- `Assets/Scripts/` — inventory size, interaction reach, health, healing,
  sprint meter and the enemy state machine.

Details the game does not establish are written as **UNDISCLOSED** instead of
being invented. Enemy abilities and story events are not embellished.

### Placeholders

- `public/assets/images/dossier-zara.svg` — no official character portrait
  exists in the project, so this is a labelled dossier placeholder, not a
  likeness. Replace it with a verified render when one exists.
- `public/assets/images/enemy-ghoul-pending.svg` — no clean enemy render exists
  in the shipped assets (the site uses an actual location frame alongside an
  empty evidence frame). Replace it with a verified in-game capture.

When replacing either file, update the matching `<img src>` in
`public/index.html`. The alt text and the visible “no verified capture” notes
should be removed only once the replacement is genuine.
