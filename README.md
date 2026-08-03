# ILAS2026 Browser Game

This repository contains a lightweight browser game development environment for **Vertical Bullet Garden**, a vertical scrolling bullet-hell shooter MVP.

## Requirements

- Node.js 18 or newer.
- Run `npm install` once so the local dictionary dependency is available.

## Commands

```bash
node tools/dev-server.mjs
node tools/smoke-test.mjs
```

If your local Node installation includes npm, the same commands are available through:

```bash
npm run dev
npm test
```

The dev server listens on the local network by default. Use the printed `Network URL` such as `http://192.168.x.x:5173/` from another computer on the same Wi-Fi. Use `npm run dev:local` when you only want this computer to access it.

## Development Notes

- The game runs from `index.html`, `styles.css`, and `script.js`.
- WASD moves, Shift slows movement, J fires upward, K discards the newest collected letter as a letter bullet, Enter starts, and Esc pauses.
- The current run loop is endless: two scrolling phases, one boss phase, word-board upgrade forging between phases, then the cycle repeats until game over.
- Collected letters are saved for upgrade forging instead of auto-crafting during combat, with a strict eight-letter rack limit.
- Upgrade forging uses a compact three-letter board; short words become roguelike reward choices instead of a long cleanup puzzle.
- Japanese word validation is served by the local dev server at `/api/words/validate` using `data/words-ja.json`, with the browser list kept as a fallback.
- Carrying too many letters now adds risk quickly: movement gets heavier, and a full rack rejects extra letters while raising enemy bullet pressure.
- Phase 2+ can spawn letter-shield enemies that resist normal shots, must be damaged with K-fired letter bullets, and reward useful hiragana when defeated.
- Letter-shield rewards are colored hiragana tiles; any upgrade word using one gets triple effect power.
- The current MVP includes scrolling background, enemies, enemy bullets, HP, upgrades, recurring boss phases, endless online flow rankings through the dev server, and game over.
- Shared rankings can be backed by Supabase through server-side environment variables. See `docs/SUPABASE_RANKINGS.md`.
- The generated background asset is still stored at `assets/courtyard-bg.png`; the current game also draws a code-native scrolling starfield over the stage.
- Work logs are stored under `.logs/`.
- OpenAI API keys must not be placed in browser-side code. See `docs/OPENAI_SECURITY.md`.
