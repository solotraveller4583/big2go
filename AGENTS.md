# AGENTS.md

## Project

Big2Go is a static mobile-first Big Two card game built with plain HTML, CSS, and JavaScript.

## Source of truth

Treat `DESIGN.md` and `UI_UX_GUIDELINES.md` as the source of truth for all product, game design, and visual design decisions.

## Working rules for agents

- Keep the public product name as **Big2Go**.
- Keep file/service slugs lowercase as **big2go**.
- Do not reintroduce the old names `Lucky2`, `lucky2`, `Big Two Moon Market`, or `big-two-moon-market`.
- Prefer simple static files over frameworks unless the user explicitly asks for a framework.
- Keep the landing page mobile-first, touch-friendly, and playable from the first screen.
- After changing HTML, CSS, JS, manifest, or service worker files, bump `CACHE_NAME` in `sw.js`.

## Verification

Run before finalizing changes:

```bash
node --check game.js
node --check sw.js
```

Also verify in a browser that:

- The landing page shows **Big2Go**.
- No horizontal page overflow exists.
- Player selection works.
- **PLAY NOW** starts the game.
- No browser console errors appear.
