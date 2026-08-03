import { spawn } from "node:child_process";
import { existsSync, readFileSync, rmSync, writeFileSync } from "node:fs";

const port = 5187;
const rankingFile = ".logs/rankings.json";
const originalRankingFile = existsSync(rankingFile) ? readFileSync(rankingFile, "utf8") : null;
const server = spawn(process.execPath, ["tools/dev-server.mjs", "--port", String(port)], {
  stdio: ["ignore", "pipe", "pipe"],
});

try {
  await waitForServer(port);
  const html = await (await fetch(`http://127.0.0.1:${port}/`)).text();
  const js = await (await fetch(`http://127.0.0.1:${port}/script.js`)).text();
  const css = await (await fetch(`http://127.0.0.1:${port}/styles.css`)).text();
  const devServerJs = readFileSync("tools/dev-server.mjs", "utf8");
  const wordUpgradeSheet = readFileSync("data/word-upgrades.csv", "utf8");
  const asset = await fetch(`http://127.0.0.1:${port}/assets/courtyard-bg.png`);
  const rankings = await fetch(`http://127.0.0.1:${port}/api/rankings/stages`);
  const smokeRankName = `Smoke${String(Date.now()).slice(-8)}`;
  const rankingPost = await fetch(`http://127.0.0.1:${port}/api/rankings/stages`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: smokeRankName,
      stages: 99,
      score: 12345,
      usedLetters: ["ほ", "の", "お"],
      comment: "ほげのおabc",
    }),
  });
  const rankingPostResult = await rankingPost.json();
  const duplicateNameRankingPost = await fetch(`http://127.0.0.1:${port}/api/rankings/stages`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: smokeRankName,
      stages: 98,
      score: 12344,
      usedLetters: ["か", "さ"],
      comment: "かさかさ",
    }),
  });
  const duplicateNameRankingPostResult = await duplicateNameRankingPost.json();
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
  const highRollWord = await fetch(`http://127.0.0.1:${port}/api/words/validate?word=${encodeURIComponent("\u307b\u306e\u304a")}`);
  const highRollWordResult = await highRollWord.json();

  assert(html.includes("<canvas"), "index.html should include the game canvas");
  assert(html.includes("Vertical Bullet Garden"), "index.html should include the bullet shooter title");
  assert(html.includes("rankingList"), "index.html should include the ranking list");
  assert(html.includes("startButton"), "index.html should include the loop mode button");
  assert(html.includes("keyPreset"), "index.html should include the key preset selector");
  assert(html.includes("touhou"), "index.html should include the Touhou-style key preset");
  assert(html.includes("controlHint"), "index.html should include the current key hint");
  assert(html.includes("debugPanel"), "index.html should include the hidden debug panel");
  assert(html.includes("debugBossSelect"), "index.html should include debug boss selection");
  assert(html.includes("buffTray"), "index.html should include the buff icon tray");
  assert(!html.includes("versusButton"), "index.html should not include the versus mode button");
  assert(!html.includes("rivalGame"), "index.html should not include the opponent canvas");
  assert(html.includes("script.js"), "index.html should load script.js");

  assert(js.includes("function startGame"), "script.js should include startGame");
  assert(js.includes("function toggleDebugMode"), "script.js should include hidden debug mode");
  assert(js.includes("debugCommandBuffer"), "script.js should track the hidden debug command");
  assert(js.includes("function grantDebugLetters"), "script.js should grant arbitrary debug letters");
  assert(js.includes("function debugSkipPhase"), "script.js should skip to upgrade debug flow");
  assert(js.includes("function debugStartBoss"), "script.js should start a selected debug boss");
  assert(js.includes("game.debugInvincible"), "script.js should include debug invincibility");
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
  assert(js.includes("BOSS_DESIGNS"), "script.js should define multiple boss designs");
  assert(js.includes("Ember Crown"), "script.js should include the fire-weak boss");
  assert(js.includes("Azure Spiral"), "script.js should include the wind-weak boss");
  assert(js.includes("Violet Script"), "script.js should include the ice-weak boss");
  assert(js.includes("function selectBossDesign"), "script.js should rotate boss designs");
  assert(js.includes("function bossAttributeMultiplier"), "script.js should apply boss weakness and resistance");
  assert(js.includes('bullet.attribute === "pattern"'), "dark shots should hit every boss weakness");
  assert(js.includes("function fireBossPattern"), "script.js should vary boss attack patterns");
  assert(js.includes("function drawEmberBoss"), "script.js should draw a unique ember boss");
  assert(js.includes("function drawAzureBoss"), "script.js should draw a unique azure boss");
  assert(js.includes("function drawVioletBoss"), "script.js should draw a unique violet boss");
  assert(js.includes("enterUpgrade();"), "boss defeat should return to the upgrade board");
  assert(js.includes("collect more letters"), "non-boss phases should keep collecting letters");
  assert(js.includes("function enterUpgrade"), "script.js should include upgrade selection between phases");
  assert(js.includes("function startFinalBattle"), "script.js should include recurring boss progression");
  assert(js.includes("function collectLetter"), "script.js should include bullet-based letter collection");
  assert(js.includes("function fireStoredLetter"), "script.js should include K-key letter discard shots");
  assert(js.includes("function cycleSelectedLetter"), "script.js should let players cycle selected rack letters");
  assert(js.includes("letterSelect"), "script.js should expose rack selection as a key preset action");
  assert(js.includes("h: \"letterSelect\""), "script.js should use H for rack selection in standard controls");
  assert(js.includes("a: \"letterSelect\""), "script.js should use a left-hand key for rack selection in Touhou controls");
  assert(js.includes("keyAction(key) === \"letterSelect\""), "script.js should cycle rack selection through the selected preset");
  assert(js.includes("selectedLetterIndex"), "script.js should track selected rack letters");
  assert(js.includes("KEY_PRESETS"), "script.js should define key presets");
  assert(js.includes("touhou"), "script.js should include a Touhou-style key preset");
  assert(js.includes("arrowleft"), "script.js should support arrow-key movement");
  assert(js.includes("z: \"shoot\""), "script.js should support Z shooting in Touhou-style controls");
  assert(js.includes("x: \"letterShot\""), "script.js should support X letter shots in Touhou-style controls");
  assert(js.includes("function isActionPressed"), "script.js should resolve input actions through the selected preset");
  assert(js.includes("SHOT_ATTRIBUTES"), "script.js should define switchable shot attributes");
  assert(js.includes('label: "炎"'), "script.js should expose fire as a shot attribute");
  assert(js.includes('label: "風"'), "script.js should expose wind as a shot attribute");
  assert(js.includes('label: "氷"'), "script.js should expose ice as a shot attribute");
  assert(js.includes('label: "光"'), "script.js should expose light as a shot attribute");
  assert(js.includes('label: "闇"'), "script.js should expose dark as a shot attribute");
  assert(js.includes("全弱点/希少"), "script.js should explain dark as a rare all-weakness attribute");
  assert(js.includes("HIGH_ROLL_WORDS"), "script.js should define high-roll three-letter words");
  assert(js.indexOf("fetch(`${WORD_ENDPOINT}") < js.indexOf("HIGH_ROLL_WORDS.has(normalized)"), "word validation API should override hardcoded fallback upgrades");
  assert(js.includes("ほのお"), "script.js should include a fire high-roll word");
  assert(js.includes("はやて"), "script.js should include a wind high-roll word");
  assert(js.includes("こおり"), "script.js should include an ice high-roll word");
  assert(js.includes("ひかり"), "script.js should include a light high-roll word");
  assert(js.includes("やみよ"), "script.js should include a dark high-roll word");
  assert(js.includes('words: ["やみよ", "よる", "かげ"]'), "dark word tags should stay intentionally rare");
  assert(js.includes("function buildHighRollChoices"), "script.js should create special choices for high-roll words");
  assert(js.includes("function cycleShotAttribute"), "script.js should switch shot attributes");
  assert(js.includes("function fireAttributeShots"), "script.js should fire different bullet patterns by attribute");
  assert(js.includes("attributeMods"), "script.js should track per-attribute shot upgrades");
  assert(js.includes("function increaseAttributeMod"), "script.js should improve bullet trajectories when taking matching upgrades");
  assert(js.includes("function attributeModLevel"), "script.js should scale bullet patterns by attribute upgrade level");
  assert(js.includes("function drawPlayerBulletShape"), "script.js should draw different player bullet shapes by attribute");
  assert(js.includes('motion: "wave"'), "dark shots should have a wave trajectory");
  assert(js.includes('motion: "crosswind"'), "wind upgrades should add crosswind trajectories");
  assert(js.includes('motion: "seeker"'), "light shots should include a stabilizing seeker shot");
  assert(js.includes("key === \" \" && !event.repeat"), "script.js should switch attributes with Space");
  assert(js.includes("attribute.role"), "script.js should show the current shot attribute role in the HUD");
  assert(js.includes("function formatRecognizedWord"), "script.js should show dictionary recognition details");
  assert(js.includes("function forgeSelectedWord"), "script.js should include word-board forging");
  assert(js.includes("Confirm will continue without an upgrade."), "forge should let players continue when no upgrade word is available");
  assert(!js.includes("Make a valid 3-letter word before choosing an upgrade."), "forge should not trap players without a valid word");
  assert(!js.includes("createFallbackUpgrade"), "forge should not create free fallback upgrades without a word");
  assert(js.includes("function buildUpgradeChoices"), "script.js should create roguelike upgrade choices");
  assert(js.includes("function chooseUpgradeReward"), "script.js should let players choose one upgrade reward");
  assert(js.includes("usedUpgradeLetters"), "script.js should track letters spent on upgrades for ranking comments");
  assert(js.includes("if (entry.usedLetters.length)"), "game-over ranking form should appear whenever upgrade letters were used");
  assert(js.includes("renderRankingCommentForm"), "script.js should show an in-game ranking comment form");
  assert(js.includes("renderRankingResult"), "script.js should show the top-ten ranking after comment submission");
  assert(js.includes("submitRankingEntry"), "script.js should submit ranking entries through the Web API");
  assert(js.includes("sanitizeRankingComment"), "script.js should restrict ranking comments to used upgrade letters");
  assert(js.includes("function isTextEntryTarget"), "script.js should ignore game controls while typing ranking comments");
  assert(js.includes("if (isTextEntryTarget(event.target)) return;"), "global key handlers should not intercept text inputs");
  assert(js.includes("\u30ea\u30b9\u30af\u5f37\u5316"), "script.js should include a risk-reward upgrade choice");
  assert(js.includes("\u30dc\u30b9\u5bfe\u7b56"), "script.js should include boss-counter upgrade choices");
  assert(js.includes("\u5927\u5f53\u305f\u308a\u899a\u9192"), "script.js should include readable high-roll upgrade choices");
  assert(js.includes("function highRollSignatureChoice"), "script.js should keep high-roll choices tied to their original attribute");
  assert(js.includes("闇侵食"), "script.js should give dark its own all-weakness high-roll choice");
  assert(!js.includes("夜討ち変質"), "high-roll choices should not convert other attributes into boss weakness counters");
  assert(js.includes("riskBulletPressure"), "script.js should apply risk to future bullet pressure");
  assert(js.includes("function getBoardWords"), "script.js should extract board words from the filled grid");
  assert(js.includes("function scoreMoveAt"), "script.js should score words immediately after each placed tile");
  assert(js.includes("function getWordsThroughCell"), "script.js should inspect words through the latest tile");
  assert(js.includes("function canPlaceAt"), "script.js should enforce adjacent tile placement");
  assert(js.includes("INVENTORY_LIMIT = 8"), "script.js should strictly cap held letters at eight");
  assert(js.includes("UPGRADE_TILE_LIMIT = 3"), "script.js should limit upgrade boards to three placed letters");
  assert(js.includes("BOARD_COLS = 3"), "script.js should use a three-letter board");
  assert(js.includes("Rack full"), "script.js should warn when the letter rack is full");
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
  assert(js.includes("enemy.letterShield ? enemy.hp : bullet.damage"), "letter-shield enemies should die to one letter bullet");
  assert(js.includes("rewardLetterShield"), "script.js should reward defeating letter-shield enemies");
  assert(js.includes("amplifyUpgrade"), "script.js should triple upgrades made with powered letters");
  assert(js.includes("makePoweredLetter"), "script.js should create colored reward letters");
  assert(js.includes("FIRST_STAGE_SPAWN_DELAY"), "script.js should keep stage one spawn pressure low");
  assert(js.includes("LETTER_POOL"), "script.js should define a hiragana letter pool");
  assert(js.includes("keyAction(key) === \"letterShot\""), "script.js should fire stored letters through the selected preset");
  assert(js.includes("Fire K/X to make space"), "script.js should explain selected letter discard controls");
  assert(js.includes("isActionPressed(\"focus\")"), "script.js should include focus movement through the selected preset");
  assert(js.includes("cycleShotAttribute"), "script.js should keep Space reserved for attribute switching");

  assert(devServerJs.includes("logUnknownWord"), "dev server should log unknown words");
  assert(devServerJs.includes("word-upgrades.csv"), "dev server should load code-free word upgrades from CSV");
  assert(devServerJs.includes("sanitizeRankingComment"), "dev server should sanitize ranking comments");
  assert(devServerJs.includes("sanitizeUsedLetters"), "dev server should store allowed ranking comment letters");
  assert(devServerJs.includes("function readWordUpgradeSheet"), "dev server should parse the editable word upgrade sheet");
  assert(devServerJs.includes("function parseCsv"), "dev server should parse spreadsheet CSV exports");
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
  assert(css.includes(".ranking-comment-form"), "styles.css should style the game-over ranking comment form");
  assert(css.includes(".ranking-result"), "styles.css should style the post-submit top-ten ranking");
  assert(css.includes(".debug-panel"), "styles.css should style the hidden debug panel");
  assert(css.includes(".word-board"), "styles.css should include the upgrade word board");
  assert(css.includes(".upgrade-choices"), "styles.css should include upgrade choice card layout");
  assert(css.includes(".upgrade-card"), "styles.css should style upgrade choice cards");
  assert(css.includes(".tile-board"), "styles.css should include the rectangular word board grid");
  assert(css.includes("repeat(3, 1fr)"), "styles.css should render the upgrade board as three slots");
  assert(css.includes("aspect-ratio: 3 / 1"), "styles.css should size the board as a three-letter strip");
  assert(css.includes(".tile-cell.zone-core"), "styles.css should include connected board color zones");
  assert(css.includes(".tile-cell.scored"), "styles.css should highlight scored word tiles");
  assert(css.includes(".letter-tile.powered"), "styles.css should style colored reward letters");
  assert(css.includes(".letter-tile.selected"), "styles.css should highlight the selected rack letter");

  assert(asset.ok, "background image should be served");
  assert(rankings.ok, "ranking API should be served");
  assert(rankingPost.ok, "ranking API should accept posted scores");
  assert(rankingPostResult.some((entry) => entry.comment === "\u307b\u306e\u304a"), "ranking API should keep comments to used upgrade letters only");
  assert(duplicateNameRankingPost.ok, "ranking API should accept repeated player names");
  assert(duplicateNameRankingPostResult.filter((entry) => entry.name === smokeRankName).length === 2, "ranking API should keep separate runs for the same player name");
  assert(localWord.ok && localWordResult.valid, "word validation API should validate local Japanese words");
  assert(dictionaryWord.ok && dictionaryWordResult.valid && dictionaryWordResult.source === "kuromoji", "word validation API should accept one-token dictionary words");
  assert(compoundDictionaryWord.ok && compoundDictionaryWordResult.valid && compoundDictionaryWordResult.source === "kuromoji", "word validation API should accept 3+ character compound dictionary words");
  assert(compoundDictionaryWordResult.recognized.includes("\u3084\u304d"), "compound dictionary words should expose the first recognized token");
  assert(compoundDictionaryWordResult.recognized.includes("\u305d\u3070"), "compound dictionary words should expose the second recognized token");
  assert(compoundDictionaryWordResult.recognized.includes("\u713c\u304d\u305d\u3070"), "compound dictionary words should expose representative converted forms");
  assert(splitDictionaryWord.ok && !splitDictionaryWordResult.valid, "word validation API should reject split dictionary fragments");
  assert(unknownWord.ok && !unknownWordResult.valid, "word validation API should reject and log unknown Japanese words");
  assert(highRollWord.ok && highRollWordResult.valid && highRollWordResult.upgrade.type === "attack", "word validation API should validate fire high-roll words");
  assert(highRollWordResult.upgrade.highRoll && highRollWordResult.source === "sheet", "word validation API should prefer spreadsheet-managed high-roll words");
  assert(wordUpgradeSheet.includes("word,type,label,power,title,description,highRoll,source"), "word upgrade sheet should expose spreadsheet-friendly columns");
  assert(wordUpgradeSheet.includes("やみよ,pattern,闇"), "word upgrade sheet should include editable dark high-roll words");

  console.log("Smoke test passed.");
} finally {
  server.kill();
  if (originalRankingFile == null) {
    rmSync(rankingFile, { force: true });
  } else {
    writeFileSync(rankingFile, originalRankingFile);
  }
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
