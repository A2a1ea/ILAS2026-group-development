# Work Log: Development Environment

## Requested Tools

- `openai-docs`: checked official authentication guidance for browser/API-key safety.
- `imagegen`: reused the project-bound generated game background at `assets/courtyard-bg.png`.
- `playwright-interactive`: used the Codex in-app browser flow to verify the local game visually. The repository also includes a dependency-free smoke test because this shell does not provide `npm`.

## Environment Added

- `package.json` with `dev`, `dev:5173`, and `test` scripts.
- `tools/dev-server.mjs` for a no-dependency local static server on `127.0.0.1:5173`.
- `tools/smoke-test.mjs` for a no-dependency smoke test that starts the server and checks the HTML, CSS, JS, and generated asset.
- `.gitignore` for dependencies, build output, Playwright reports, and local environment files.
- `.env.example` and `docs/OPENAI_SECURITY.md` documenting that API keys stay server-side.

## How To Use

```bash
npm run dev
npm test
```

Or, without npm:

```bash
node tools/dev-server.mjs
node tools/smoke-test.mjs
```

## Verification

- Ran `node tools/smoke-test.mjs`: passed.
- Started the dev server on `http://127.0.0.1:5173/`: HTTP 200.
- Opened the dev server in the Codex in-app browser.
- Confirmed the game title, HUD, canvas, start overlay, and no browser console errors.
