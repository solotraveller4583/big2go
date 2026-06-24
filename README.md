# Big2Go

Big2Go is a mobile-first browser card game based on Big Two (also known as Deuces, Dai Di, or Pusoy Dos). Players race to clear their cards first against AI opponents using singles, pairs, triples, and five-card poker-style combinations.

## Features

- 2–4 player support with AI opponents
- Full 52-card deck
- Big Two ordering: 3 low, 2 high
- 3♦ opening rule
- Validates singles, pairs, triples, straights, flushes, full houses, four of a kind, and straight flushes
- Clean mobile landing page with player selection
- Large touch-friendly card layout
- Saved progress in localStorage
- PWA manifest and service worker for install/offline support

## Run locally

From this project folder:

```bash
python -m http.server 8090 --bind 127.0.0.1
```

Then open:

```text
http://127.0.0.1:8090/
```

## Main files

- `index.html` — home screen and game table UI
- `styles.css` — shared game styling
- `big2go-final-mobile.css` — final mobile landing polish
- `big2go-casino.css` and related `big2go-*` CSS files — landing visual layers
- `game.js` — Big Two rules, AI, rendering, and save/resume logic
- `manifest.webmanifest` — PWA install metadata
- `sw.js` — offline caching
- `icon.svg` — Big2Go app icon
- `privacy.html`, `terms.html`, `credits.html` — public-site support pages

## Deployment

The Render static site name is configured as:

```yaml
name: big2go
```

Publish directory should be the repository root: `.`
