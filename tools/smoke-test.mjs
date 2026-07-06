import { spawn } from "node:child_process";
import { readFileSync } from "node:fs";
import { WebSocket } from "ws";

const port = 5187;
const server = spawn(process.execPath, ["tools/dev-server.mjs", "--port", String(port)], {
  stdio: ["ignore", "pipe", "pipe"],
});

try {
  await waitForServer(port);
  const html = await (await fetch(`http://127.0.0.1:${port}/`)).text();
  const js = await (await fetch(`http://127.0.0.1:${port}/script.js`)).text();
  const css = await (await fetch(`http://127.0.0.1:${port}/styles.css`)).text();
  const devServerJs = readFileSync("tools/dev-server.mjs", "utf8");
  const asset = await fetch(`http://127.0.0.1:${port}/assets/courtyard-bg.png`);
  const rankings = await fetch(`http://127.0.0.1:${port}/api/rankings/stages`);
  const word = await fetch(`http://127.0.0.1:${port}/api/words/validate?word=${encodeURIComponent("ねこ")}`);
  const wordResult = await word.json();
  const dictionaryWord = await fetch(`http://127.0.0.1:${port}/api/words/validate?word=${encodeURIComponent("\u306f\u3057\u308b")}`);
  const dictionaryWordResult = await dictionaryWord.json();
  const splitDictionaryWord = await fetch(`http://127.0.0.1:${port}/api/words/validate?word=${encodeURIComponent("\u3042\u3044\u3046")}`);
  const splitDictionaryWordResult = await splitDictionaryWord.json();
  const unknownWord = await fetch(`http://127.0.0.1:${port}/api/words/validate?word=${encodeURIComponent("てすとみとうろく")}`);
  const unknownWordResult = await unknownWord.json();
  const versusState = await verifyVersusSocket(port);
  const duplicateJoin = await verifyDuplicateVersusClient(port);
  assert(html.includes("<canvas"), "index.html should include the game canvas");
  assert(html.includes("Vertical Bullet Garden"), "index.html should include the bullet shooter title");
  assert(html.includes("rankingList"), "index.html should include the ranking list");
  assert(html.includes("versusButton"), "index.html should include the versus mode button");
  assert(html.includes("rivalGame"), "index.html should include the opponent canvas");
  assert(html.includes("rivalName"), "index.html should include opponent HUD fields");
  assert(html.includes("script.js"), "index.html should load script.js");
  assert(js.includes("function startGame"), "script.js should include startGame");
  assert(js.includes("function showVersusMode"), "script.js should include a versus mode menu entry");
  assert(js.includes("function startVersusMode"), "script.js should include a live versus mode starter");
  assert(js.includes("function sendVersusState"), "script.js should sync versus state");
  assert(js.includes("function createVersusStageSnapshot"), "script.js should sync the rival STG board");
  assert(js.includes("function sendVersusWord"), "script.js should sync made words");
  assert(js.includes("function applyVersusSabotage"), "script.js should turn rival words into sabotage");
  assert(js.includes("function spawnVersusShield"), "script.js should spawn shield enemies from versus sabotage");
  assert(js.includes("function drawVersusPeer"), "script.js should draw the remote player");
  assert(js.includes("function drawRivalScreen"), "script.js should draw the opponent screen");
  assert(js.includes("function drawRivalStageEntities"), "script.js should draw the opponent STG board");
  assert(js.includes("function drawRivalEnemyBullet"), "script.js should draw opponent enemy bullets");
  assert(js.includes("function updateRivalHud"), "script.js should update the opponent HUD");
  assert(js.includes("VS waiting"), "script.js should show waiting when no rival is connected");
  assert(js.includes("VS matched"), "script.js should show matched only after a rival is present");
  assert(js.includes("function advanceAfterUpgrade"), "script.js should include upgrade progression logic");
  assert(js.includes("startNextPhase();"), "upgrade progression should continue into the next endless phase");
  assert(js.includes("collect more letters"), "next phases should keep collecting letters instead of starting a final phase");
  assert(js.includes("function enterUpgrade"), "script.js should include upgrade selection between phases");
  assert(js.includes("function collectLetter"), "script.js should include bullet-based letter collection");
  assert(js.includes("function fireStoredLetter"), "script.js should include K-key letter discard shots");
  assert(js.includes("function forgeSelectedWord"), "script.js should include word-board forging");
  assert(js.includes("function getBoardWords"), "script.js should extract board words from the filled grid");
  assert(js.includes("function scoreMoveAt"), "script.js should score words immediately after each placed tile");
  assert(js.includes("function getWordsThroughCell"), "script.js should inspect words through the latest tile");
  assert(js.includes("function canPlaceAt"), "script.js should enforce adjacent tile placement");
  assert(js.includes("function inventoryRisk"), "script.js should add risk for hoarding letters");
  assert(js.includes("function inventoryMoveScale"), "script.js should slow movement when carrying too many letters");
  assert(js.includes("function boardCellZone"), "script.js should assign visual zones to board cells");
  assert(js.includes("normalizeKana"), "script.js should normalize Japanese kana words");
  assert(js.includes("WORD_ENDPOINT"), "script.js should use the local word validation API");
  assert(devServerJs.includes("logUnknownWord"), "dev server should log unknown words");
  assert(devServerJs.includes("fetchKuromojiWordEntry"), "dev server should validate words through the morphological dictionary");
  assert(devServerJs.includes('source: "kuromoji"'), "dev server should report dictionary-sourced words");
  assert(devServerJs.includes("fetchExternalWordEntry"), "dev server should query an external dictionary for missing words");
  assert(devServerJs.includes("addWordEntry"), "dev server should add externally found words to the local dictionary");
  assert(devServerJs.includes("WebSocketServer"), "dev server should host the versus WebSocket");
  assert(devServerJs.includes("/ws/versus"), "dev server should expose the versus socket path");
  assert(js.includes("MAX_ACTIVE_ENEMIES = 5"), "script.js should cap active enemies at five");
  assert(js.includes("stageDensityScale"), "script.js should scale bullet density by flow phase");
  assert(js.includes("chooseEnemyType"), "script.js should vary enemy spawn types by flow phase");
  assert(js.includes("letterShield"), "script.js should include enemies that require letter bullets");
  assert(js.includes("rewardLetterShield"), "script.js should reward defeating letter-shield enemies");
  assert(js.includes("amplifyUpgrade"), "script.js should triple upgrades made with powered letters");
  assert(js.includes("makePoweredLetter"), "script.js should create colored reward letters");
  assert(js.includes("FIRST_STAGE_SPAWN_DELAY"), "script.js should keep stage one spawn pressure low");
  assert(js.includes("LETTER_POOL"), "script.js should define a hiragana letter pool");
  assert(js.includes("\"ねこ\""), "script.js should include Japanese local words");
  assert(js.includes("label: \"攻撃\""), "script.js should include Japanese upgrade categories");
  assert(js.includes("keys.has(\"j\")"), "script.js should include J-key shooting");
  assert(js.includes("\"k\""), "script.js should include K-key handling");
  assert(js.includes("keys.has(\"shift\")"), "script.js should include focus movement");
  assert(css.includes(".stage-wrap"), "styles.css should include the game stage styles");
  assert(css.includes(".menu-actions"), "styles.css should include title menu button styles");
  assert(css.includes(".versus-layout"), "styles.css should include the two-screen versus layout");
  assert(css.includes(".rival-column"), "styles.css should include opponent screen styles");
  assert(css.includes(".status-panel"), "styles.css should include letter and ranking panel styles");
  assert(css.includes(".word-board"), "styles.css should include the upgrade word board");
  assert(css.includes(".tile-board"), "styles.css should include the rectangular word board grid");
  assert(css.includes(".tile-cell.zone-core"), "styles.css should include connected board color zones");
  assert(css.includes(".tile-cell.scored"), "styles.css should highlight scored word tiles");
  assert(css.includes(".letter-tile.powered"), "styles.css should style colored reward letters");
  assert(asset.ok, "background image should be served");
  assert(rankings.ok, "ranking API should be served");
  assert(word.ok && wordResult.valid, "word validation API should validate local Japanese words");
  assert(dictionaryWord.ok && dictionaryWordResult.valid && dictionaryWordResult.source === "kuromoji", "word validation API should accept one-token dictionary words");
  assert(splitDictionaryWord.ok && !splitDictionaryWordResult.valid, "word validation API should reject split dictionary fragments");
  assert(unknownWord.ok && !unknownWordResult.valid, "word validation API should reject and log unknown Japanese words");
  assert(versusState?.state?.score === 1234, "versus socket should relay peer state between players");
  assert(duplicateJoin?.peers?.length === 0, "versus socket should not match duplicate connections from the same client");

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

async function verifyVersusSocket(targetPort) {
  const roomId = `smoke-${Date.now()}`;
  const first = await openSocket(`ws://127.0.0.1:${targetPort}/ws/versus`);
  const second = await openSocket(`ws://127.0.0.1:${targetPort}/ws/versus`);
  try {
    first.socket.send(JSON.stringify({ type: "join", roomId, name: "SmokeA" }));
    second.socket.send(JSON.stringify({ type: "join", roomId, name: "SmokeB" }));
    await second.next("joined");
    first.socket.send(JSON.stringify({
      type: "state",
      state: { score: 1234, hp: 3, maxHp: 5, phase: 2, x: 100, y: 200 },
    }));
    return await second.next("peer-state");
  } finally {
    first.socket.close();
    second.socket.close();
  }
}

async function verifyDuplicateVersusClient(targetPort) {
  const roomId = `duplicate-${Date.now()}`;
  const clientId = `client-${Date.now()}`;
  const first = await openSocket(`ws://127.0.0.1:${targetPort}/ws/versus`);
  const second = await openSocket(`ws://127.0.0.1:${targetPort}/ws/versus`);
  try {
    first.socket.send(JSON.stringify({ type: "join", roomId, name: "SameA", clientId }));
    await first.next("joined");
    second.socket.send(JSON.stringify({ type: "join", roomId, name: "SameB", clientId }));
    return await second.next("joined");
  } finally {
    first.socket.close();
    second.socket.close();
  }
}

function openSocket(url) {
  return new Promise((resolve, reject) => {
    const socket = new WebSocket(url);
    const messages = [];
    const waiters = [];
    const timer = setTimeout(() => reject(new Error("Timed out opening versus socket.")), 3000);
    socket.addEventListener("open", () => {
      clearTimeout(timer);
      resolve({
        socket,
        next(type) {
          const foundIndex = messages.findIndex((message) => message.type === type);
          if (foundIndex >= 0) return Promise.resolve(messages.splice(foundIndex, 1)[0]);
          return new Promise((messageResolve, messageReject) => {
            const timeout = setTimeout(() => messageReject(new Error(`Timed out waiting for ${type}.`)), 3000);
            waiters.push({ type, resolve: messageResolve, timeout });
          });
        },
      });
    });
    socket.addEventListener("message", (event) => {
      const message = JSON.parse(String(event.data));
      const waiterIndex = waiters.findIndex((waiter) => waiter.type === message.type);
      if (waiterIndex >= 0) {
        const [waiter] = waiters.splice(waiterIndex, 1);
        clearTimeout(waiter.timeout);
        waiter.resolve(message);
        return;
      }
      messages.push(message);
    });
    socket.addEventListener("error", reject);
  });
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}
