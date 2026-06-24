# UI/UX Guidelines

Treat this file and `DESIGN.md` as the source of truth for all product, game design, and visual design decisions.

## Core experience

Big2Go should feel like a polished real mobile card game, not a web form or dashboard.

The player should understand the first action instantly:

1. Pick player count if desired.
2. Tap **PLAY NOW**.
3. Play cards with large touch-friendly controls.

## Landing page principles

- Picture-first, words-second.
- One dominant action: **PLAY NOW**.
- Keep the first screen clean and exciting.
- Avoid long explanations above the fold.
- Make every visible control clickable.
- Use dialogs or secondary screens for rules, settings, rank, bonus, and goals.
- Keep legal/support links away from the main play path unless needed.

## Mobile layout rules

- Design for portrait phone first.
- Avoid horizontal page overflow.
- Prefer one-screen landing layout whenever possible.
- Use large tap targets: ideally 44px minimum height.
- Keep primary CTA visible without scrolling.
- Use safe-area padding for modern phones.
- Avoid tiny text on important buttons.

## Landing page hierarchy

1. Top online/settings bar
2. Card/logo hero with Big2Go brand
3. Large gold **PLAY NOW** button
4. Continue / Rules / Share buttons
5. Player selector: 4, 3, 2 players
6. Bottom action bar: Rank, Bonus, Goals

## Visual style

- Deep purple/blue card-table fantasy background
- Gold/orange CTA button
- Bright white card faces
- Strong rounded panels
- High contrast text
- Playful casino/card-game energy
- Minimal visible copy

## Interaction rules

- **PLAY NOW** starts a new game.
- **Continue** restores a saved table when available; otherwise it should guide the player to start a game.
- **Rules** opens a readable rules dialog.
- **Share** uses native sharing when available, clipboard fallback otherwise.
- **Settings**, **Rank**, **Bonus**, and **Goals** must respond when tapped, even if they show placeholder dialogs before backend features exist.
- Player-count buttons must visibly show the selected option.

## Gameplay screen rules

- Keep cards large and readable.
- Avoid page-level horizontal scrolling.
- Selected cards should visibly lift or highlight.
- The current turn and required move should be obvious.
- Primary actions should sit near the thumb area.
- AI turns should feel responsive but not instant/confusing.

## Naming rules

Use:

- Product name: `Big2Go`
- Slug/file prefix: `big2go`

Do not use:

- `Lucky2`
- `lucky2`
- `Big Two Moon Market`
- `big-two-moon-market`
