# ILAS2026 Browser Game

This repository contains a lightweight browser game development environment for **Vertical Bullet Garden**, a vertical scrolling bullet-hell shooter MVP.

## Requirements

- Node.js 18 or newer.
- Run `npm install` once so the local WebSocket dependency is available.

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
- The current run loop is Phase 1, one-letter-at-a-time word-board upgrade forging from collected letters, Phase 2, another word-board upgrade, and a final boss battle.
- Collected letters are saved for upgrade forging instead of auto-crafting during combat.
- Each placed hiragana tile immediately checks the horizontal and vertical Japanese words through that tile, then stores valid words as attack, mobility, defense, control, life, or shot-pattern upgrades.
- Japanese word validation is served by the local dev server at `/api/words/validate` using `data/words-ja.json`, with the browser list kept as a fallback.
- Carrying too many letters now adds risk: movement gets heavier, and heavy hoarding also raises enemy bullet pressure.
- Phase 2+ can spawn letter-shield enemies that resist normal shots, must be damaged with K-fired letter bullets, and reward useful hiragana when defeated.
- Letter-shield rewards are colored hiragana tiles; any upgrade word using one gets triple effect power.
- The versus button starts a real-time room on `/ws/versus`; player state, position, word events, and finish results are relayed between browsers in the same room.
- The current MVP includes scrolling background, enemies, enemy bullets, HP, upgrades, final boss fight, online flow rankings through the dev server, game clear, and game over.
- The generated background asset is still stored at `assets/courtyard-bg.png`; the current game also draws a code-native scrolling starfield over the stage.
- Work logs are stored under `.logs/`.
- OpenAI API keys must not be placed in browser-side code. See `docs/OPENAI_SECURITY.md`.
