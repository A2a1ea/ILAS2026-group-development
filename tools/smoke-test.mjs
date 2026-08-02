import { spawn } from "node:child_process";
import { readFileSync } from "node:fs";

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
  const localWord = await fetch(`http://127.0.0.1:${port}/api/words/validate?word=${encodeURIComponent("\u306d\u3053")}`);
  const localWordResult = await localWord.json();
  const dictionaryWord = await fetch(`http://127.0.0.1:${port}/api/words/validate?word=${encodeURIComponent("\u306f\u3057\u308b")}`);
  const dictionaryWordResult = await dictionaryWord.json();
  const compoundDictionaryWord = await fetch(`http://127.0.0.1:${port}/api/words/validate?word=${encodeURIComponent("\u3084\u304d\u305d\u3070")}`);
  const compoundDictionaryWordResult = await compoundDictionaryWord.json();
  const splitDictionaryWord = await fetch(`http://127.0.0.1:${port}/api/words/validate?word=${encodeURIComponent("\u3042\u3044\u3046")}`);
  const splitDictionaryWordResult = await splitDictionaryWord.json();
  const unknownWord = await fetch(`http://127.0.0.1:${port}/api/words/validate?word=${encodeURIComponent("\u3066\u3059\u3068\u307f\u3068\u308d\u3044")}`);
  const unknownWordResult = await unknownWord.json();

  assert(html.includes("<canvas"), "index.html should include the game canvas");
  assert(html.includes("Vertical Bullet Garden"), "index.html should include the bullet shooter title");
  assert(html.includes("rankingList"), "index.html should include the ranking list");
  assert(html.includes("startButton"), "index.html should include the loop mode button");
  assert(html.includes("keyPreset"), "index.html should include the key preset selector");
  assert(html.includes("touhou"), "index.html should include the Touhou-style key preset");
  assert(html.includes("controlHint"), "index.html should include the current key hint");
  assert(html.includes("buffTray"), "index.html should include the buff icon tray");
  assert(!html.includes("versusButton"), "index.html should not include the versus mode button");
  assert(!html.includes("rivalGame"), "index.html should not include the opponent canvas");
  assert(html.includes("script.js"), "index.html should load script.js");

  assert(js.includes("function startGame"), "script.js should include startGame");
  assert(!js.includes("showVersusMode"), "script.js should not include a versus mode menu entry");
  assert(!js.includes("startVersusMode"), "script.js should not include a live versus mode starter");
  assert(!js.includes("sendVersusState"), "script.js should not sync versus state");
  assert(!js.includes("drawRivalScreen"), "script.js should not draw the opponent screen");
  assert(js.includes("function updateBuffTray"), "script.js should update the buff icon tray");
  assert(js.includes("function buffIconForType"), "script.js should choose buff icons by type");
  assert(js.includes("function advanceAfterUpgrade"), "script.js should include upgrade progression logic");
  assert(js.includes("startNextPhase();"), "upgrade progression should continue into the next endless phase");
  assert(js.includes("function isBossPhase"), "endless flow should include a recurring boss phase check");
  assert(js.includes("phase % 3 === 0"), "endless flow should loop through two phases and then a boss");
  assert(js.includes("function clearBossPhase"), "boss defeat should continue the endless run");
  assert(js.includes("enterUpgrade();"), "boss defeat should return to the upgrade board");
  assert(js.includes("collect more letters"), "non-boss phases should keep collecting letters");
  assert(js.includes("function enterUpgrade"), "script.js should include upgrade selection between phases");
  assert(js.includes("function startFinalBattle"), "script.js should include recurring boss progression");
  assert(js.includes("function collectLetter"), "script.js should include bullet-based letter collection");
  assert(js.includes("function fireStoredLetter"), "script.js should include K-key letter discard shots");
  assert(js.includes("KEY_PRESETS"), "script.js should define key presets");
  assert(js.includes("touhou"), "script.js should include a Touhou-style key preset");
  assert(js.includes("arrowleft"), "script.js should support arrow-key movement");
  assert(js.includes("z: \"shoot\""), "script.js should support Z shooting in Touhou-style controls");
  assert(js.includes("x: \"letterShot\""), "script.js should support X letter shots in Touhou-style controls");
  assert(js.includes("function isActionPressed"), "script.js should resolve input actions through the selected preset");
  assert(js.includes("SHOT_ATTRIBUTES"), "script.js should define switchable shot attributes");
  assert(js.includes("function cycleShotAttribute"), "script.js should switch shot attributes");
  assert(js.includes("key === \" \" && !event.repeat"), "script.js should switch attributes with Space");
  assert(js.includes("currentShotAttribute().label"), "script.js should show the current shot attribute in the HUD");
  assert(js.includes("function formatRecognizedWord"), "script.js should show dictionary recognition details");
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
  assert(js.includes("MAX_ACTIVE_ENEMIES = 5"), "script.js should cap active enemies at five");
  assert(js.includes("ENEMY_TURN_TIME"), "script.js should time-limit enemies before they retreat");
  assert(js.includes("ENEMY_TURN_Y"), "script.js should turn enemies before they reach the lower screen");
  assert(js.includes("turning"), "script.js should track enemy U-turn state");
  assert(js.includes("ENEMY_TURN_EXIT_SPEED"), "script.js should send timed-out enemies back upward");
  assert(js.includes("stageDensityScale"), "script.js should scale bullet density by flow phase");
  assert(js.includes("chooseEnemyType"), "script.js should vary enemy spawn types by flow phase");
  assert(js.includes("letterShield"), "script.js should include enemies that require letter bullets");
  assert(js.includes("rewardLetterShield"), "script.js should reward defeating letter-shield enemies");
  assert(js.includes("amplifyUpgrade"), "script.js should triple upgrades made with powered letters");
  assert(js.includes("makePoweredLetter"), "script.js should create colored reward letters");
  assert(js.includes("FIRST_STAGE_SPAWN_DELAY"), "script.js should keep stage one spawn pressure low");
  assert(js.includes("LETTER_POOL"), "script.js should define a hiragana letter pool");
  assert(js.includes("keyAction(key) === \"letterShot\""), "script.js should fire stored letters through the selected preset");
  assert(js.includes("isActionPressed(\"focus\")"), "script.js should include focus movement through the selected preset");
  assert(!js.includes("debugInvincible"), "script.js should not reserve Space for debug invincibility");

  assert(devServerJs.includes("logUnknownWord"), "dev server should log unknown words");
  assert(devServerJs.includes("fetchKuromojiWordEntry"), "dev server should validate words through the morphological dictionary");
  assert(devServerJs.includes("isDictionaryWord"), "dev server should accept multi-token dictionary words");
  assert(devServerJs.includes("isMeaningfulDictionaryToken"), "dev server should reject meaningless dictionary fragments");
  assert(devServerJs.includes("conversionForms"), "dev server should include representative conversion forms for readings");
  assert(devServerJs.includes('source: "kuromoji"'), "dev server should report dictionary-sourced words");
  assert(devServerJs.includes("fetchExternalWordEntry"), "dev server should query an external dictionary for missing words");
  assert(devServerJs.includes("addWordEntry"), "dev server should add externally found words to the local dictionary");
  assert(!devServerJs.includes("WebSocketServer"), "dev server should not host the versus WebSocket");
  assert(!devServerJs.includes("/ws/versus"), "dev server should not expose the versus socket path");

  assert(css.includes(".stage-wrap"), "styles.css should include the game stage styles");
  assert(css.includes(".menu-actions"), "styles.css should include title menu button styles");
  assert(css.includes(".key-config"), "styles.css should style the key preset selector");
  assert(!css.includes(".versus-layout"), "styles.css should not include the two-screen versus layout");
  assert(!css.includes(".rival-column"), "styles.css should not include opponent screen styles");
  assert(css.includes(".buff-tray"), "styles.css should include buff icon tray styles");
  assert(css.includes(".buff-icon"), "styles.css should include buff icon styles");
  assert(css.includes(".status-panel"), "styles.css should include letter and ranking panel styles");
  assert(css.includes(".word-board"), "styles.css should include the upgrade word board");
  assert(css.includes(".tile-board"), "styles.css should include the rectangular word board grid");
  assert(css.includes(".tile-cell.zone-core"), "styles.css should include connected board color zones");
  assert(css.includes(".tile-cell.scored"), "styles.css should highlight scored word tiles");
  assert(css.includes(".letter-tile.powered"), "styles.css should style colored reward letters");

  assert(asset.ok, "background image should be served");
  assert(rankings.ok, "ranking API should be served");
  assert(localWord.ok && localWordResult.valid, "word validation API should validate local Japanese words");
  assert(dictionaryWord.ok && dictionaryWordResult.valid && dictionaryWordResult.source === "kuromoji", "word validation API should accept one-token dictionary words");
  assert(compoundDictionaryWord.ok && compoundDictionaryWordResult.valid && compoundDictionaryWordResult.source === "kuromoji", "word validation API should accept 3+ character compound dictionary words");
  assert(compoundDictionaryWordResult.recognized.includes("\u3084\u304d"), "compound dictionary words should expose the first recognized token");
  assert(compoundDictionaryWordResult.recognized.includes("\u305d\u3070"), "compound dictionary words should expose the second recognized token");
  assert(compoundDictionaryWordResult.recognized.includes("\u713c\u304d\u305d\u3070"), "compound dictionary words should expose representative converted forms");
  assert(splitDictionaryWord.ok && !splitDictionaryWordResult.valid, "word validation API should reject split dictionary fragments");
  assert(unknownWord.ok && !unknownWordResult.valid, "word validation API should reject and log unknown Japanese words");

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
