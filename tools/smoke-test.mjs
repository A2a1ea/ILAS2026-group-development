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
  assert(html.includes("<canvas"), "index.html should include the game canvas");
  assert(html.includes("Vertical Bullet Garden"), "index.html should include the bullet shooter title");
  assert(html.includes("script.js"), "index.html should load script.js");
  assert(js.includes("function startGame"), "script.js should include startGame");
  assert(js.includes("function updateBoss"), "script.js should include boss logic");
  assert(js.includes("keys.has(\"z\")"), "script.js should include Z-key shooting");
  assert(js.includes("keys.has(\"shift\")"), "script.js should include focus movement");
  assert(css.includes(".stage-wrap"), "styles.css should include the game stage styles");
  assert(asset.ok, "background image should be served");

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
