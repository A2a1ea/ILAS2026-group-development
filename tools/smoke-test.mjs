import { spawn } from "node:child_process";

const port = 5173;
const server = spawn(process.execPath, ["tools/dev-server.mjs", "--port", String(port)], {
  stdio: ["ignore", "pipe", "pipe"],
});

try {
  await waitForServer(port);
  const html = await (await fetch(`http://127.0.0.1:${port}/`)).text();
  const js = await (await fetch(`http://127.0.0.1:${port}/script.js`)).text();
  const css = await (await fetch(`http://127.0.0.1:${port}/styles.css`)).text();
  const asset = await fetch(`http://127.0.0.1:${port}/assets/courtyard-bg.png`);
  const rankings = await fetch(`http://127.0.0.1:${port}/api/rankings/stages`);
  assert(html.includes("<canvas"), "index.html should include the game canvas");
  assert(html.includes("Vertical Bullet Garden"), "index.html should include the bullet shooter title");
  assert(html.includes("rankingList"), "index.html should include the ranking list");
  assert(html.includes("script.js"), "index.html should load script.js");
  assert(js.includes("function startGame"), "script.js should include startGame");
  assert(js.includes("function updateBoss"), "script.js should include boss logic");
  assert(js.includes("function clearStage"), "script.js should include endless stage progression");
  assert(js.includes("function collectLetter"), "script.js should include bullet-based letter collection");
  assert(js.includes("function fireStoredLetter"), "script.js should include K-key letter discard shots");
  assert(js.includes("MAX_ACTIVE_ENEMIES = 5"), "script.js should cap active enemies at five");
  assert(js.includes("stageDensityScale"), "script.js should scale bullet density by stage");
  assert(js.includes("chooseEnemyType"), "script.js should vary enemy spawn types by stage");
  assert(js.includes("FIRST_STAGE_SPAWN_DELAY"), "script.js should keep stage one spawn pressure low");
  assert(js.includes("aefilsowt"), "script.js should limit dropped letters to word letters");
  assert(js.includes("word: \"fast\""), "script.js should include the fast word effect");
  assert(js.includes("word: \"slow\""), "script.js should include the slow word effect");
  assert(js.includes("word: \"life\""), "script.js should include the life word effect");
  assert(js.includes("keys.has(\"j\")"), "script.js should include J-key shooting");
  assert(js.includes("\"k\""), "script.js should include K-key handling");
  assert(js.includes("keys.has(\"shift\")"), "script.js should include focus movement");
  assert(css.includes(".stage-wrap"), "styles.css should include the game stage styles");
  assert(css.includes(".status-panel"), "styles.css should include letter and ranking panel styles");
  assert(asset.ok, "background image should be served");
  assert(rankings.ok, "ranking API should be served");

  console.log("Smoke test passed.");
} finally {
  server.kill();
}

async function waitForServer(targetPort) {
  const deadline = Date.now() + 5000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`http://127.0.0.1:${targetPort}/`);
      if (response.ok) return;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }
  throw new Error("Timed out waiting for the dev server.");
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}
