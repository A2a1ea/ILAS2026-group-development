# ILAS2026 Browser Game

This repository contains a lightweight browser game development environment for **Vertical Bullet Garden**, a vertical scrolling bullet-hell shooter MVP.

## Requirements

- Node.js 18 or newer.
- No npm install step is required for the built-in dev server or smoke test.

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

## Development Notes

- The game runs from `index.html`, `styles.css`, and `script.js`.
- Arrow keys move, Shift slows movement, Z fires upward, Enter starts, and Esc pauses.
- The first MVP includes scrolling background, enemies, enemy bullets, HP, boss fight, game clear, and game over.
- The generated background asset is still stored at `assets/courtyard-bg.png`; the current game also draws a code-native scrolling starfield over the stage.
- Work logs are stored under `.logs/`.
- OpenAI API keys must not be placed in browser-side code. See `docs/OPENAI_SECURITY.md`.
