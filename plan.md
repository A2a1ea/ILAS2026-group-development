# ILAS2026 Browser Game Development Plan

## Concept

Lantern Dash is a compact browser arcade game for this repository. The player guides a glowing study lantern through a night-school courtyard, collecting knowledge stars while avoiding drifting blockers.

## Goals

- Run entirely in the browser with no build step.
- Use keyboard, mouse, and touch-friendly controls.
- Include a generated visual asset in the project, not only in local tool output.
- Keep the code small enough for a group project to read and extend.
- Record implementation notes under `.logs/`.
- Preserve the repository's original group-planning purpose while adding a playable development target.

## Development Environment

- `node tools/dev-server.mjs`: start a dependency-free local server.
- `node tools/smoke-test.mjs`: run a dependency-free smoke test.
- `npm run dev` and `npm test`: optional shortcuts when npm is available locally.
- Codex in-app Browser / Playwright-style browser checks are used for visual verification.

## OpenAI Docs Decision

OpenAI's API authentication documentation states that API keys are secrets and should not be exposed in client-side code such as browsers or apps. This game is currently static and does not need an AI service, so it intentionally does not embed an OpenAI API key in browser code.

Reference: https://developers.openai.com/api/reference/overview#authentication

## Gameplay

- Move the lantern with arrow keys, WASD, pointer drag, or touch drag.
- Collect stars to gain points and extend the timer.
- Avoid dark blockers that reduce time.
- The game ends when the timer reaches zero.
- Restart from the game-over overlay.

## Files

- `index.html`: page structure and game UI.
- `styles.css`: responsive layout, overlays, and visual treatment.
- `script.js`: Canvas loop, input, collisions, scoring, and reset flow.
- `assets/courtyard-bg.png`: generated game background asset.
- `tools/dev-server.mjs`: local static server.
- `tools/smoke-test.mjs`: local smoke test.
- `.logs/`: implementation and environment logs.

## Initial Group Tasks

- Confirm project requirements.
- Choose future extensions for the browser game.
- Create the first working prototype.
- Review progress regularly as a group.

## Next Ideas

- Add levels with changing obstacle patterns.
- Add a leaderboard stored in `localStorage`.
- Add sound effects and mute controls.
- Replace vector game pieces with a small sprite sheet.
