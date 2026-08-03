const canvas = document.querySelector("#game");
const ctx = canvas.getContext("2d");
const scoreEl = document.querySelector("#score");
const hpEl = document.querySelector("#hp");
const timeEl = document.querySelector("#time");
const stateEl = document.querySelector("#best");
const letterRackEl = document.querySelector("#letterRack");
const effectsEl = document.querySelector("#effects");
const buffTrayEl = document.querySelector("#buffTray");
const rankingListEl = document.querySelector("#rankingList");
const overlay = document.querySelector("#overlay");
const startButton = document.querySelector("#startButton");
const keyPresetEl = document.querySelector("#keyPreset");
const controlHintEl = document.querySelector("#controlHint");
const debugPanelEl = document.querySelector("#debugPanel");
const debugInvincibleEl = document.querySelector("#debugInvincible");
const debugLettersEl = document.querySelector("#debugLetters");
const debugGrantLettersEl = document.querySelector("#debugGrantLetters");
const debugSkipPhaseEl = document.querySelector("#debugSkipPhase");
const debugBossSelectEl = document.querySelector("#debugBossSelect");
const debugStartBossEl = document.querySelector("#debugStartBoss");

const WIDTH = canvas.width;
const HEIGHT = canvas.height;
const PLAYER_RADIUS = 14;
const HIT_RADIUS = 4;
const PHASE_DURATION = 32;
const MAX_HP = 5;
const MAX_ACTIVE_ENEMIES = 5;
const FIRST_STAGE_SPAWN_DELAY = 1.95;
const ENEMY_TURN_TIME = 4.2;
const ENEMY_TURN_Y = HEIGHT * 0.58;
const ENEMY_TURN_EXIT_SPEED = 150;
const RANKING_ENDPOINT = "/api/rankings/stages";
const RANKING_LIMIT = 10;
const RANKING_COMMENT_LIMIT = 24;
const WORD_ENDPOINT = "/api/words/validate";
const LETTER_POOL = "あああいいいううええおおかかききくくけこさしすすせそたちつてとなにぬねのはひふへほまみむめもやゆよらりるれろわん";
const REWARD_LETTERS = ["ね", "こ", "そ", "ら", "は", "な", "み", "ず", "ほ", "し", "あ", "め", "か", "ぜ", "つ", "き", "ま", "も", "り"];
const INVENTORY_LIMIT = 8;
const UPGRADE_TILE_LIMIT = 3;
const BOARD_COLS = 3;
const BOARD_ROWS = 1;
const BOARD_SIZE = BOARD_COLS * BOARD_ROWS;
const WORD_EFFECTS = [
  { word: "fast", label: "Fast", target: "self", duration: 8 },
  { word: "slow", label: "Slow", target: "enemy", duration: 7 },
  { word: "life", label: "Life", target: "self", duration: 0 },
];
const KEY_PRESETS = {
  standard: {
    label: "WASD / J / K",
    hint: "WASDで移動、Shiftで低速、Jでショット、Hで文字選択、Kで選択文字弾、Spaceで属性切り替え。",
    keys: {
      a: "left",
      d: "right",
      w: "up",
      s: "down",
      shift: "focus",
      j: "shoot",
      k: "letterShot",
      h: "letterSelect",
    },
  },
  touhou: {
    label: "東方式 / 矢印 / Z / X",
    hint: "矢印キーで移動、Shiftで低速、Zでショット、Hで文字選択、Xで選択文字弾、Spaceで属性切り替え。",
    keys: {
      arrowleft: "left",
      arrowright: "right",
      arrowup: "up",
      arrowdown: "down",
      shift: "focus",
      z: "shoot",
      x: "letterShot",
      a: "letterSelect",
    },
  },
};
const SHOT_ATTRIBUTES = [
  { id: "attack", label: "炎", color: "#ff6b9a", glow: "#ff6b9a", damage: 1.22, role: "高火力" },
  { id: "mobility", label: "風", color: "#79e7ff", glow: "#79e7ff", damage: 0.98, role: "速度" },
  { id: "control", label: "氷", color: "#baf6ff", glow: "#79e7ff", damage: 0.92, role: "弾圧低下" },
  { id: "life", label: "光", color: "#fff2a8", glow: "#ffd36e", damage: 0.94, role: "回復" },
  { id: "pattern", label: "闇", color: "#c99cff", glow: "#b98cff", damage: 1.04, role: "全弱点/希少" },
];
const BOSS_DESIGNS = [
  {
    id: "ember",
    name: "Ember Crown",
    weak: "attack",
    resist: "control",
    color: "#ff6b9a",
    accent: "#ffd36e",
    message: "Ember Crown: 炎で王冠を砕け",
  },
  {
    id: "azure",
    name: "Azure Spiral",
    weak: "mobility",
    resist: "attack",
    color: "#79e7ff",
    accent: "#d6ff8f",
    message: "Azure Spiral: 風で軌道を切れ",
  },
  {
    id: "violet",
    name: "Violet Script",
    weak: "control",
    resist: "mobility",
    color: "#b98cff",
    accent: "#ffd36e",
    message: "Violet Script: 氷で呪文をほどけ",
  },
];
const LOCAL_WORDS = new Set([
  "あい", "あお", "あか", "あき", "あさ", "あし", "あめ", "いえ", "いし", "いぬ", "いろ", "うみ", "えき", "おに", "おと", "かい", "かお", "かき", "かさ", "かぜ", "かに", "かめ", "くさ", "くも", "こえ", "こめ", "さけ", "さる", "しか", "しお", "すし", "そら", "たき", "たこ", "たね", "つき", "つち", "てき", "とり", "なみ", "にじ", "ねこ", "はな", "はね", "ひかり", "ひと", "ほし", "まめ", "みず", "もり", "ゆき", "よる", "りす",
  "あかり", "あさひ", "いのち", "うてん", "おおかみ", "かがみ", "かみなり", "きつね", "きぼう", "くすり", "けむり", "こころ", "さくら", "しずく", "しっぽ", "しろ", "すばやさ", "たて", "ちから", "つばさ", "てんき", "ともしび", "ながれ", "はやて", "ひまわり", "ほのお", "まもり", "みらい", "やいば", "ゆめ", "りゅう",
]);
const WORD_TAGS = [
  { type: "attack", label: "攻撃", words: ["ほのお", "ひ", "やいば", "かみなり", "てき", "おに", "りゅう"] },
  { type: "mobility", label: "移動", words: ["はやて", "つばさ", "あし", "ねこ", "きつね", "とり", "はね", "すばやさ"] },
  { type: "defense", label: "守り", words: ["たて", "まもり", "いし", "かめ", "しろ"] },
  { type: "control", label: "制御", words: ["ゆき", "あめ", "くも", "けむり", "よる", "つき"] },
  { type: "life", label: "生命", words: ["いのち", "はな", "こころ", "ひかり", "さくら", "ひまわり", "くすり"] },
  { type: "pattern", label: "闇", words: ["やみよ", "よる", "かげ"] },
];
const HIGH_ROLL_WORDS = new Map([
  ["ほのお", { type: "attack", label: "炎", power: 8, title: "炎上振れ ほのお", description: "炎属性の大当たり。素直に弾威力を大きく伸ばす。" }],
  ["はやて", { type: "mobility", label: "風", power: 8, title: "風上振れ はやて", description: "風属性の大当たり。速度と低速性能を大きく伸ばして避けやすくする。" }],
  ["こおり", { type: "control", label: "氷", power: 8, title: "氷上振れ こおり", description: "氷属性の大当たり。敵弾スローと弾圧低下で盤面を軽くする。" }],
  ["ひかり", { type: "life", label: "光", power: 8, title: "光上振れ ひかり", description: "光属性の大当たり。最大HPと回復で長期戦に強くなる。" }],
  ["やみよ", { type: "pattern", label: "闇", power: 8, title: "闇上振れ やみよ", description: "闇属性の大当たり。作りにくい代わりに全ボスの弱点を突ける。" }],
]);
[
  "あな", "あに", "あね", "あゆ", "あり", "いか", "いき", "いけ", "いす", "いと", "いね", "うし", "うた", "うで", "うに", "うま", "うら", "えだ", "えび", "えり", "おか", "おく", "おけ", "おし", "おや",
  "かぎ", "かく", "かご", "かた", "かみ", "かり", "かわ", "きく", "きり", "きん", "くき", "くに", "くり", "けさ", "けん", "こい", "こう", "こし", "こと", "こな", "この", "こり",
  "さき", "さじ", "さと", "さば", "さら", "さん", "しき", "した", "しま", "しろ", "すい", "すな", "すみ", "せき", "せみ", "せん", "そこ", "そと", "その",
  "たい", "たま", "たり", "たん", "ちか", "ちず", "ちゃ", "つの", "つめ", "つる", "てら", "てん", "とお", "とき", "とし", "との", "とも", "とら",
  "なか", "なし", "なつ", "なべ", "なわ", "にく", "にし", "にわ", "ぬの", "ねつ", "のき", "のり",
  "はい", "はこ", "はし", "はと", "はら", "はり", "ひげ", "ひざ", "ひも", "ふく", "ふね", "ふゆ", "へや", "ほね", "ほん",
  "まき", "まち", "まつ", "まど", "まり", "みせ", "みち", "みみ", "むし", "むね", "むら", "めし", "めだ", "めん", "もち", "もの",
  "やま", "やみ", "やり", "ゆび", "ゆみ", "よこ", "よし", "よみ", "よめ", "らく", "らん", "りん", "るす", "れい", "れき", "ろう", "わに", "わら"
].forEach((word) => LOCAL_WORDS.add(word));
for (const word of HIGH_ROLL_WORDS.keys()) LOCAL_WORDS.add(word);
const keys = new Set();
let keyPreset = readKeyPreset();

let game = createGame("title");
let lastFrame = 0;
let debugMode = false;
let debugCommandBuffer = "";

function createGame(mode = "title") {
  return {
    mode,
    score: 0,
    time: 0,
    phase: 1,
    phaseTime: 0,
    phaseGoal: PHASE_DURATION,
    stage: 1,
    stageTime: 0,
    stagesCleared: 0,
    spawnTimer: mode === "phase" ? 1.2 : 0,
    letterTimer: 1.2,
    bossTimer: 0,
    kills: 0,
    hits: 0,
    riskBulletPressure: 0,
    shotAttributeIndex: 0,
    debugInvincible: false,
    debugBossId: null,
    scroll: 0,
    flash: 0,
    message: mode === "title" ? "ひらがなを集めて、ことばで強化しよう。" : "",
    messageTimer: 0,
    inventory: [],
    selectedLetterIndex: null,
    upgradeBoard: {
      cells: Array(BOARD_SIZE).fill(null),
      activeIndex: null,
      activeCellIndex: null,
      foundWords: [],
      pendingUpgrades: [],
      choiceOptions: [],
      choosing: false,
      message: "Place up to three letters. Make one compact word.",
      busy: false,
    },
    upgrades: [],
    usedUpgradeLetters: [],
    buffIcons: [],
    startingSlow: 0,
    effects: {
      fast: 0,
      slow: 0,
    },
    player: {
      x: WIDTH / 2,
      y: HEIGHT - 92,
      hp: MAX_HP,
      maxHp: MAX_HP,
      invuln: 0,
      shotCooldown: 0,
      speed: 270,
      slowSpeed: 125,
      fireRateMultiplier: 1,
      spread: 0,
      bulletDamageBonus: 0,
      attributeMods: {
        attack: 0,
        mobility: 0,
        control: 0,
        life: 0,
        pattern: 0,
      },
    },
    playerBullets: [],
    enemyBullets: [],
    enemies: [],
    particles: [],
    letters: [],
    boss: null,
  };
}

function startGame() {
  game = createGame("phase");
  lastFrame = performance.now();
  overlay.hidden = true;
  canvas.focus();
  setMessage("Phase 1: collect letters for your first upgrade");
  requestAnimationFrame(loop);
}

function loop(now) {
  const dt = Math.min((now - lastFrame) / 1000, 0.033);
  lastFrame = now;
  update(dt);
  draw();
  if (["phase", "final", "upgrade", "pause"].includes(game.mode)) requestAnimationFrame(loop);
}

function update(dt) {
  if (game.mode === "pause") return;
  if (game.mode === "upgrade") {
    updateParticles(dt);
    updateHud();
    return;
  }
  game.time += dt;
  game.phaseTime += dt;
  game.stageTime = game.phaseTime;
  game.scroll += dt * (game.mode === "final" ? 45 : 110);
  game.flash = Math.max(0, game.flash - dt);
  game.messageTimer = Math.max(0, game.messageTimer - dt);
  updateEffects(dt);
  updatePlayer(dt);
  updatePlayerBullets(dt);
  updateEnemies(dt);
  updateEnemyBullets(dt);
  updateLetterSpawner(dt);
  updateLetters(dt);
  updateParticles(dt);
  updateStage(dt);
  checkCollisions();
  updateHud();
}

function updateStage(dt) {
  if (game.mode === "final") {
    updateBoss(dt);
    return;
  }
  if (game.mode !== "phase") return;

  game.spawnTimer -= dt;
  if (game.spawnTimer <= 0) {
    if (game.enemies.length < MAX_ACTIVE_ENEMIES) spawnEnemy();
    game.spawnTimer = enemySpawnDelay();
  }

  if (game.phaseTime >= game.phaseGoal) enterUpgrade();
}

function updateLetterSpawner(dt) {
  if (game.mode !== "phase") return;
  game.letterTimer -= dt;
  if (game.letterTimer <= 0) {
    spawnLetter();
    game.letterTimer = Math.max(0.42, 1.35 - game.phase * 0.045);
  }
}

function updatePlayer(dt) {
  const p = game.player;
  let dx = 0;
  let dy = 0;
  if (isActionPressed("left")) dx -= 1;
  if (isActionPressed("right")) dx += 1;
  if (isActionPressed("up")) dy -= 1;
  if (isActionPressed("down")) dy += 1;
  const speedBoost = game.effects.fast > 0 ? 1.45 : 1;
  const speed = (isActionPressed("focus") ? p.slowSpeed : p.speed) * speedBoost * inventoryMoveScale();
  const len = Math.hypot(dx, dy) || 1;
  p.x = clamp(p.x + (dx / len) * speed * dt, PLAYER_RADIUS, WIDTH - PLAYER_RADIUS);
  p.y = clamp(p.y + (dy / len) * speed * dt, 78, HEIGHT - PLAYER_RADIUS);
  p.invuln = Math.max(0, p.invuln - dt);
  p.shotCooldown = Math.max(0, p.shotCooldown - dt);

  if (isActionPressed("shoot") && p.shotCooldown <= 0) {
    const attribute = currentShotAttribute();
    const damage = (8 + p.bulletDamageBonus) * attribute.damage;
    fireAttributeShots(attribute, damage);
    p.shotCooldown = Math.max(attribute.cooldown || 0.045, (attribute.fireDelay || 0.09) * p.fireRateMultiplier);
  }
}

function updateEffects(dt) {
  for (const key of Object.keys(game.effects)) {
    game.effects[key] = Math.max(0, game.effects[key] - dt);
  }
}

function updatePlayerBullets(dt) {
  for (const b of game.playerBullets) {
    b.age = (b.age || 0) + dt;
    if (b.motion === "wave") {
      b.x += Math.sin(b.age * b.waveSpeed + b.wavePhase) * b.waveAmp * dt;
    } else if (b.motion === "crosswind") {
      b.x += Math.cos(b.age * 7 + b.wavePhase) * (b.driftAmp || 120) * dt;
    } else if (b.motion === "seeker" && game.boss) {
      const dx = game.boss.x - b.x;
      b.vx += clamp(dx * 0.9, -90, 90) * dt;
    }
    b.x += b.vx * dt;
    b.y += b.vy * dt;
  }
  game.playerBullets = game.playerBullets.filter((b) => b.y > -30 && b.x > -40 && b.x < WIDTH + 40);
}

function currentShotAttribute() {
  return SHOT_ATTRIBUTES[game.shotAttributeIndex] || SHOT_ATTRIBUTES[0];
}

function fireAttributeShots(attribute, damage) {
  const p = game.player;
  const spread = Math.min(3, p.spread);
  const mod = attributeModLevel(attribute.id);
  if (attribute.id === "attack") {
    pushPlayerShot(p.x - 5, p.y - 18, 0, -760, damage * 1.16, attribute, { radius: 5, shape: "flame" });
    pushPlayerShot(p.x + 5, p.y - 18, 0, -760, damage * 1.16, attribute, { radius: 5, shape: "flame" });
    if (spread > 0) pushPlayerShot(p.x, p.y - 20, 0, -700, damage * 0.9, attribute, { radius: 7, shape: "flame" });
    if (mod >= 1) pushPlayerShot(p.x, p.y - 26, 0, -610, damage * (1.05 + mod * 0.08), attribute, { radius: 8 + mod, shape: "flame" });
    if (mod >= 3) {
      pushPlayerShot(p.x - 18, p.y - 12, -45, -660, damage * 0.82, attribute, { radius: 5, shape: "flame" });
      pushPlayerShot(p.x + 18, p.y - 12, 45, -660, damage * 0.82, attribute, { radius: 5, shape: "flame" });
    }
  } else if (attribute.id === "mobility") {
    pushPlayerShot(p.x, p.y - 18, 0, -900, damage, attribute, { radius: 3.5, shape: "needle" });
    pushPlayerShot(p.x - 8, p.y - 14, -150, -820, damage * 0.72, attribute, { radius: 3, shape: "needle" });
    pushPlayerShot(p.x + 8, p.y - 14, 150, -820, damage * 0.72, attribute, { radius: 3, shape: "needle" });
    if (spread > 0) {
      pushPlayerShot(p.x - 13, p.y - 10, -250, -760, damage * 0.55, attribute, { radius: 3, shape: "needle" });
      pushPlayerShot(p.x + 13, p.y - 10, 250, -760, damage * 0.55, attribute, { radius: 3, shape: "needle" });
    }
    if (mod >= 1) {
      pushPlayerShot(p.x - 24, p.y - 4, 115 + mod * 12, -760, damage * 0.58, attribute, { radius: 3, shape: "needle", motion: "crosswind", driftAmp: 160 + mod * 25 });
      pushPlayerShot(p.x + 24, p.y - 4, -115 - mod * 12, -760, damage * 0.58, attribute, { radius: 3, shape: "needle", motion: "crosswind", driftAmp: -160 - mod * 25 });
    }
  } else if (attribute.id === "control") {
    pushPlayerShot(p.x, p.y - 18, 0, -560, damage * 1.28, attribute, { radius: 8, shape: "orb" });
    if (spread > 0) {
      pushPlayerShot(p.x - 14, p.y - 10, -70, -520, damage * 0.72, attribute, { radius: 6, shape: "orb" });
      pushPlayerShot(p.x + 14, p.y - 10, 70, -520, damage * 0.72, attribute, { radius: 6, shape: "orb" });
    }
    if (mod >= 1) {
      pushPlayerShot(p.x - 18, p.y - 18, -35, -480, damage * 0.72, attribute, { radius: 7 + mod * 0.8, shape: "orb" });
      pushPlayerShot(p.x + 18, p.y - 18, 35, -480, damage * 0.72, attribute, { radius: 7 + mod * 0.8, shape: "orb" });
    }
    if (mod >= 3) pushPlayerShot(p.x, p.y - 4, 0, -390, damage * 0.8, attribute, { radius: 11, shape: "orb", motion: "seeker" });
  } else if (attribute.id === "life") {
    pushPlayerShot(p.x - 12, p.y - 16, -70, -680, damage * 0.82, attribute, { radius: 4.5, shape: "spark" });
    pushPlayerShot(p.x, p.y - 20, 0, -720, damage, attribute, { radius: 4.5, shape: "spark" });
    pushPlayerShot(p.x + 12, p.y - 16, 70, -680, damage * 0.82, attribute, { radius: 4.5, shape: "spark" });
    if (spread > 0) pushPlayerShot(p.x, p.y - 6, 0, -610, damage * 0.65, attribute, { radius: 6, shape: "spark", motion: "seeker" });
    if (mod >= 1) {
      pushPlayerShot(p.x - 22, p.y - 8, -35, -620, damage * 0.58, attribute, { radius: 5.5, shape: "spark", motion: "seeker" });
      pushPlayerShot(p.x + 22, p.y - 8, 35, -620, damage * 0.58, attribute, { radius: 5.5, shape: "spark", motion: "seeker" });
    }
  } else {
    pushPlayerShot(p.x - 9, p.y - 18, -55, -640, damage, attribute, { radius: 4.5, shape: "dark", motion: "wave", waveAmp: 210, waveSpeed: 9, wavePhase: 0 });
    pushPlayerShot(p.x + 9, p.y - 18, 55, -640, damage, attribute, { radius: 4.5, shape: "dark", motion: "wave", waveAmp: -210, waveSpeed: 9, wavePhase: Math.PI });
    if (spread > 0) pushPlayerShot(p.x, p.y - 20, 0, -600, damage * 0.78, attribute, { radius: 7, shape: "dark", motion: "wave", waveAmp: 160, waveSpeed: 12, wavePhase: Math.PI / 2 });
    if (mod >= 1) {
      const amp = 240 + mod * 18;
      pushPlayerShot(p.x - 18, p.y - 8, -25, -560, damage * 0.68, attribute, { radius: 5, shape: "dark", motion: "wave", waveAmp: amp, waveSpeed: 13, wavePhase: game.time });
      pushPlayerShot(p.x + 18, p.y - 8, 25, -560, damage * 0.68, attribute, { radius: 5, shape: "dark", motion: "wave", waveAmp: -amp, waveSpeed: 13, wavePhase: game.time + Math.PI });
    }
    if (mod >= 3) pushPlayerShot(p.x, p.y - 28, 0, -520, damage * 0.82, attribute, { radius: 9, shape: "dark", motion: "wave", waveAmp: 120, waveSpeed: 18, wavePhase: game.time * 2 });
  }
}

function attributeModLevel(type) {
  return Math.min(5, game.player.attributeMods?.[type] || 0);
}

function pushPlayerShot(x, y, vx, vy, damage, attribute, options = {}) {
  game.playerBullets.push(createPlayerShot(x, y, vx, vy, damage, attribute, options));
}

function createPlayerShot(x, y, vx, vy, damage, attribute, options = {}) {
  return {
    x,
    y,
    vx,
    vy,
    radius: options.radius || 4,
    damage,
    type: "normal",
    attribute: attribute.id,
    color: attribute.color,
    glow: attribute.glow,
    shape: options.shape || attribute.id,
    motion: options.motion || "straight",
    waveAmp: options.waveAmp || 0,
    waveSpeed: options.waveSpeed || 0,
    wavePhase: options.wavePhase || 0,
    driftAmp: options.driftAmp || 0,
    age: 0,
  };
}

function cycleShotAttribute() {
  if (!["phase", "final"].includes(game.mode)) return;
  game.shotAttributeIndex = (game.shotAttributeIndex + 1) % SHOT_ATTRIBUTES.length;
  const attribute = currentShotAttribute();
  setMessage(`属性: ${attribute.label}`);
  updateHud();
}

function spawnEnemy() {
  const type = chooseEnemyType();
  const x = 50 + Math.random() * (WIDTH - 100);
  const hpScale = 0.75 + (game.phase - 1) * 0.24;
  const speedScale = 0.72 + (game.phase - 1) * 0.12;
  const turnTimer = ENEMY_TURN_TIME + Math.random() * 0.9;
  if (type === "A") {
    game.enemies.push({ type: "A", x, y: -24, vx: 0, vy: 96 * speedScale, turnTimer, turning: false, hp: Math.round(22 * hpScale), radius: 18, score: 100, shootTimer: 1.35 });
  } else if (type === "B") {
    game.enemies.push({ type: "B", x, y: -24, baseX: x, vx: 0, vy: 72 * speedScale, turnTimer, turning: false, hp: Math.round(35 * hpScale), radius: 21, score: 160, shootTimer: 1.15, wave: Math.random() * 8 });
  } else if (type === "C") {
    game.enemies.push({ type: "C", x, y: -30, vx: 0, vy: 125 * speedScale, turnTimer, turning: false, hp: Math.round(55 * hpScale), radius: 24, score: 240, shootTimer: 1.35, hold: 2.6 });
  } else {
    game.enemies.push({ type: "D", x, y: -28, baseX: x, vx: 0, vy: 58 * speedScale, turnTimer, turning: false, hp: Math.round(3 + game.phase), radius: 23, score: 280, shootTimer: 1.6, wave: Math.random() * 8, letterShield: true });
  }
}

function enemySpawnDelay() {
  const stagePressure = Math.min(0.9, (game.phase - 1) * 0.24);
  const timePressure = Math.min(0.35, game.phaseTime * 0.007);
  return Math.max(0.48, FIRST_STAGE_SPAWN_DELAY - stagePressure - timePressure);
}

function chooseEnemyType() {
  if (game.phase <= 1) return "A";
  const letterChance = Math.min(0.22, 0.08 + (game.phase - 2) * 0.05);
  const purpleChance = game.phase >= 3 ? 0.22 : 0;
  const yellowChance = Math.min(0.54, (game.phase - 1) * 0.24);
  const roll = Math.random();
  if (roll < letterChance) return "D";
  const adjustedRoll = roll - letterChance;
  if (adjustedRoll < purpleChance) return "C";
  if (adjustedRoll < purpleChance + yellowChance) return "B";
  return "A";
}

function updateEnemies(dt) {
  const slowScale = enemySlowScale();
  const densityScale = stageDensityScale();
  for (const e of game.enemies) {
    e.turnTimer -= dt * slowScale;
    if (!e.turning && (e.turnTimer <= 0 || e.y >= ENEMY_TURN_Y)) {
      e.turning = true;
      e.vy = -Math.max(Math.abs(e.vy), ENEMY_TURN_EXIT_SPEED);
      e.hold = 0;
    }

    if (e.type === "B" || e.type === "D") {
      e.wave += dt * 4.2 * slowScale;
      e.x = clamp(e.baseX + Math.sin(e.wave) * (e.type === "D" ? 44 : 60), e.radius, WIDTH - e.radius);
    }

    if (!e.turning && e.type === "C" && e.y > 145 && e.hold > 0) {
      e.hold -= dt;
    } else {
      e.y += e.vy * dt * slowScale;
    }

    e.shootTimer -= dt;
    if (e.shootTimer <= 0) {
      fireEnemyPattern(e);
      e.shootTimer = enemyShootDelay(e.type, densityScale);
    }
  }
  game.enemies = game.enemies.filter((e) => e.y > -80 && e.y < HEIGHT + 50 && e.hp > 0);
}

function fireEnemyPattern(enemy) {
  const density = stageDensityScale();
  if (enemy.type === "A") {
    fireAimed(enemy.x, enemy.y, 145 + density * 6, 7);
    if (density >= 2) {
      fireBullet(enemy.x, enemy.y, -45, 175, 7, "#ff6b9a");
      fireBullet(enemy.x, enemy.y, 45, 175, 7, "#ff6b9a");
    }
  } else if (enemy.type === "B") {
    const spread = Math.min(2 + density, 6);
    for (let i = -spread; i <= spread; i += 1) fireBullet(enemy.x, enemy.y, i * 28, 190, 7, "#ff8db3");
  } else {
    fireCircle(enemy.x, enemy.y, 10 + density * 2, 140 + density * 8, "#ffcf6f");
  }
}

function enemyShootDelay(type, density) {
  const baseTimer = type === "C" ? 1.2 : type === "B" ? 1.45 : 1.75;
  return Math.max(0.5, baseTimer - density * 0.08);
}

function updateBoss(dt) {
  const boss = game.boss;
  if (!boss) return;
  const slowScale = enemySlowScale();
  boss.entry += dt;
  boss.y = Math.min(105, boss.y + dt * 90 * slowScale);
  boss.attackTimer -= dt * slowScale;

  if (boss.attackTimer <= 0 && boss.y >= 104) {
    const density = stageDensityScale();
    boss.phase = boss.hp < boss.maxHp * 0.35 ? 3 : (boss.phase + 1) % 3;
    fireBossPattern(boss, density);
    boss.attackTimer = Math.max(0.58, (boss.phase === 3 ? 0.9 : 1.25) - density * 0.05);
  }

  const movement = boss.design.id === "azure" ? 128 : boss.design.id === "violet" ? 74 : 92;
  const rate = boss.design.id === "ember" ? 1.05 : boss.design.id === "azure" ? 1.55 : 0.9;
  boss.x = WIDTH / 2 + Math.sin(game.time * rate * slowScale) * movement;
}

function fireBossPattern(boss, density) {
  if (boss.design.id === "ember") {
    if (boss.phase === 0) fireFan(boss.x, boss.y + 24, Math.PI / 2, 9 + density * 2, 0.85, 178 + density * 10, boss.design.color);
    if (boss.phase === 1) fireCircle(boss.x, boss.y + 10, 12 + density * 3, 126 + density * 8, boss.design.accent, boss.entry * 0.6);
    if (boss.phase === 2) fireFan(boss.x, boss.y + 28, Math.PI / 2, 5 + density, 0.36, 245 + density * 8, "#ff9f55");
    if (boss.phase === 3) {
      fireCircle(boss.x, boss.y + 10, 20 + density * 3, 150 + density * 8, boss.design.color, boss.entry);
      fireFan(boss.x, boss.y + 28, Math.PI / 2, 11 + density * 2, 1.05, 210 + density * 8, boss.design.accent);
    }
    return;
  }

  if (boss.design.id === "azure") {
    if (boss.phase === 0) fireCircle(boss.x, boss.y + 10, 16 + density * 3, 128 + density * 7, boss.design.color, boss.entry * 1.35);
    if (boss.phase === 1) fireCircle(boss.x, boss.y + 10, 16 + density * 3, 128 + density * 7, boss.design.accent, -boss.entry * 1.1);
    if (boss.phase === 2) {
      const aimedCount = 4 + Math.min(6, density);
      for (let i = 0; i < aimedCount; i += 1) fireAimed(boss.x + (i - (aimedCount - 1) / 2) * 22, boss.y + 30, 205 + density * 8, 6);
    }
    if (boss.phase === 3) {
      fireCircle(boss.x, boss.y + 10, 24 + density * 3, 162 + density * 8, boss.design.color, boss.entry * 1.6);
      fireCircle(boss.x, boss.y + 10, 12 + density * 2, 118 + density * 6, boss.design.accent, -boss.entry * 1.35);
    }
    return;
  }

  if (boss.phase === 0) {
    const count = 6 + Math.min(7, density);
    for (let i = 0; i < count; i += 1) {
      const x = 42 + (i / Math.max(1, count - 1)) * (WIDTH - 84);
      fireBullet(x, boss.y + 18, Math.sin(boss.entry + i) * 38, 150 + density * 8, 6, boss.design.color);
    }
  }
  if (boss.phase === 1) fireFan(boss.x, boss.y + 28, Math.PI / 2, 13 + density * 2, 1.2, 158 + density * 8, boss.design.accent);
  if (boss.phase === 2) fireCircle(boss.x, boss.y + 10, 18 + density * 3, 112 + density * 8, boss.design.color, boss.entry * 0.72);
  if (boss.phase === 3) {
    fireFan(boss.x, boss.y + 28, Math.PI / 2, 15 + density * 2, 1.35, 195 + density * 8, boss.design.color);
    fireCircle(boss.x, boss.y + 10, 16 + density * 2, 138 + density * 8, boss.design.accent, boss.entry * 1.2);
  }
}

function fireAimed(x, y, speed, radius) {
  const angle = Math.atan2(game.player.y - y, game.player.x - x);
  fireBullet(x, y, Math.cos(angle) * speed, Math.sin(angle) * speed, radius, "#ff6b9a");
}

function fireFan(x, y, centerAngle, count, spread, speed, color) {
  const start = centerAngle - spread / 2;
  for (let i = 0; i < count; i += 1) {
    const angle = start + (spread * i) / Math.max(1, count - 1);
    fireBullet(x, y, Math.cos(angle) * speed, Math.sin(angle) * speed, 6, color);
  }
}

function fireCircle(x, y, count, speed, color, offset = 0) {
  for (let i = 0; i < count; i += 1) {
    const angle = offset + (Math.PI * 2 * i) / count;
    fireBullet(x, y, Math.cos(angle) * speed, Math.sin(angle) * speed, 6, color);
  }
}

function fireBullet(x, y, vx, vy, radius, color) {
  game.enemyBullets.push({ x, y, vx, vy, radius, color });
}

function updateEnemyBullets(dt) {
  const slowScale = enemySlowScale() * inventoryBulletPressure();
  for (const b of game.enemyBullets) {
    b.x += b.vx * dt * slowScale;
    b.y += b.vy * dt * slowScale;
  }
  game.enemyBullets = game.enemyBullets.filter((b) => b.x > -40 && b.x < WIDTH + 40 && b.y > -50 && b.y < HEIGHT + 50);
}

function enemySlowScale() {
  return game.effects.slow > 0 ? 0.55 : 1;
}

function inventoryRisk() {
  return Math.max(0, game.inventory.length - 4);
}

function inventoryMoveScale() {
  return Math.max(0.66, 1 - inventoryRisk() * 0.045);
}

function inventoryBulletPressure() {
  return 1 + inventoryRisk() * 0.055 + (game.riskBulletPressure || 0);
}

function stageDensityScale() {
  return Math.min(8, Math.max(0, game.phase - 1) * 2 + (game.mode === "final" ? 2 : 0));
}

function spawnLetter() {
  const char = LETTER_POOL[Math.floor(Math.random() * LETTER_POOL.length)];
  game.letters.push({
    char,
    x: 36 + Math.random() * (WIDTH - 72),
    y: -22,
    vy: 78 + Math.random() * 42 + game.stage * 5,
    wobble: Math.random() * Math.PI * 2,
    radius: 15,
  });
}

function updateLetters(dt) {
  for (const letter of game.letters) {
    letter.wobble += dt * 3;
    letter.y += letter.vy * dt;
    letter.x += Math.sin(letter.wobble) * 18 * dt;
  }
  game.letters = game.letters.filter((letter) => letter.y < HEIGHT + 30);
}

function collectLetter(letter) {
  if (!["phase", "final"].includes(game.mode)) return;
  if (game.inventory.length >= INVENTORY_LIMIT) {
    game.riskBulletPressure = (game.riskBulletPressure || 0) + 0.04;
    game.score += 5;
    burst(letter.x, letter.y, "#ff6b9a", 10);
    setMessage(`Rack full (${INVENTORY_LIMIT}). Fire K/X to make space.`);
    return;
  }
  game.inventory.push(letter.char);
  if (game.selectedLetterIndex == null) game.selectedLetterIndex = game.inventory.length - 1;
  game.score += 25;
  burst(letter.x, letter.y, "#d6ff8f", 8);
  if (game.inventory.length === INVENTORY_LIMIT) setMessage("Rack full. Choose letters carefully.");
}
function fireStoredLetter() {
  if (!["phase", "final"].includes(game.mode)) return;
  const index = selectedLetterIndex();
  const item = index == null ? null : game.inventory.splice(index, 1)[0];
  if (!item) {
    setMessage("No letter to discard");
    return;
  }
  normalizeSelectedLetterIndex();
  const char = inventoryChar(item);
  game.playerBullets.push({
    type: "letter",
    char,
    powered: isPoweredLetter(item),
    x: game.player.x,
    y: game.player.y - 22,
    vx: 0,
    vy: -560,
    radius: isPoweredLetter(item) ? 16 : 13,
    damage: isPoweredLetter(item) ? 12 : 8,
  });
  setMessage(`Discarded ${char}`);
}

function cycleSelectedLetter() {
  if (!game.inventory.length) {
    game.selectedLetterIndex = null;
    setMessage("No letters to select");
    updateHud();
    return;
  }
  game.selectedLetterIndex = game.selectedLetterIndex == null
    ? 0
    : (game.selectedLetterIndex + 1) % game.inventory.length;
  const char = inventoryChar(game.inventory[game.selectedLetterIndex]);
  setMessage(`Selected ${char}`);
  updateHud();
}

function selectedLetterIndex() {
  normalizeSelectedLetterIndex();
  if (!game.inventory.length) return null;
  return game.selectedLetterIndex == null ? game.inventory.length - 1 : game.selectedLetterIndex;
}

function normalizeSelectedLetterIndex() {
  if (!game.inventory.length) {
    game.selectedLetterIndex = null;
    return;
  }
  if (game.selectedLetterIndex == null) return;
  game.selectedLetterIndex = clamp(game.selectedLetterIndex, 0, game.inventory.length - 1);
}

function craftAvailableWords() {
  let crafted = true;
  while (crafted) {
    crafted = false;
    for (const effect of WORD_EFFECTS) {
      if (!canBuildWord(effect.word)) continue;
      consumeWord(effect.word);
      applyWordEffect(effect);
      crafted = true;
      break;
    }
  }
}

function canBuildWord(word) {
  const counts = countLetters(game.inventory);
  for (const char of word) {
    counts[char] = (counts[char] || 0) - 1;
    if (counts[char] < 0) return false;
  }
  return true;
}

function consumeWord(word) {
  for (const char of word) {
    const index = game.inventory.findIndex((item) => inventoryChar(item) === char);
    if (index >= 0) game.inventory.splice(index, 1);
  }
}

function countLetters(letters) {
  const counts = {};
  for (const item of letters) {
    const char = inventoryChar(item);
    counts[char] = (counts[char] || 0) + 1;
  }
  return counts;
}

function inventoryChar(item) {
  return typeof item === "string" ? item : item.char;
}

function isPoweredLetter(item) {
  return Boolean(item && typeof item === "object" && item.powered);
}

function makePoweredLetter(char) {
  return { char, powered: true };
}

function inventoryLabel(item) {
  return isPoweredLetter(item) ? `${inventoryChar(item)}*` : inventoryChar(item);
}

function applyWordEffect(effect) {
  game.score += effect.word.length * 120;
  if (effect.word === "life") {
    game.player.hp = Math.min(MAX_HP, game.player.hp + 1);
    setMessage("Life recovered 1 HP");
    return;
  }
  game.effects[effect.word] = effect.duration;
  setMessage(`${effect.label} ${effect.target === "self" ? "buff" : "debuff"} activated`);
}

function enterUpgrade() {
  game.mode = "upgrade";
  game.stagesCleared = Math.max(game.stagesCleared, game.phase);
  game.enemies.length = 0;
  game.enemyBullets.length = 0;
  game.playerBullets.length = 0;
  game.letters.length = 0;
  game.upgradeBoard = {
    cells: Array(BOARD_SIZE).fill(null),
    activeIndex: null,
    activeCellIndex: null,
    foundWords: [],
    pendingUpgrades: [],
    choiceOptions: [],
    choosing: false,
    message: "Place up to three letters. Make one compact word.",
    busy: false,
  };
  showUpgradeOverlay();
  updateHud();
}

function showUpgradeOverlay() {
  overlay.hidden = false;
  overlay.querySelector("h1").textContent = `Upgrade ${game.phase}`;
  overlay.querySelector("p").textContent = "Place up to three letters. A short word becomes one upgrade choice.";
  startButton.textContent = "Confirm Words";
  renderUpgradeBoard();
}

function renderUpgradeBoard() {
  const hint = overlay.querySelector(".hint");
  hint.innerHTML = "";

  const panel = document.createElement("span");
  panel.className = "word-board";

  const summary = document.createElement("span");
  summary.className = "word-slots";
  summary.textContent = game.upgradeBoard.foundWords.length
    ? game.upgradeBoard.foundWords.map((item) => item.word.toUpperCase()).join(" / ")
    : "3 LETTERS";
  panel.append(summary);

  const grid = document.createElement("span");
  grid.className = "tile-board";
  game.upgradeBoard.cells.forEach((cell, index) => {
    const square = document.createElement("button");
    square.type = "button";
    const playable = canPlaceAt(index);
    const selected = game.upgradeBoard.activeCellIndex === index;
    const scored = cell && isScoredCell(index);
    square.className = `tile-cell ${boardCellZone(index)}${cell ? " filled" : ""}${cell?.powered ? " powered" : ""}${playable ? " playable" : ""}${selected ? " selected" : ""}${scored ? " scored" : ""}`;
    square.textContent = cell ? cell.char.toUpperCase() : playable ? "+" : "";
    square.disabled = game.upgradeBoard.busy || (!cell && !playable);
    square.addEventListener("click", () => toggleBoardCell(index));
    grid.append(square);
  });
  panel.append(grid);

  const rack = document.createElement("span");
  rack.className = "letter-bank";
  if (game.upgradeBoard.choosing) {
    rack.append(renderUpgradeChoices());
  } else if (game.inventory.length) {
    game.inventory.forEach((item, index) => {
      const letter = document.createElement("button");
      letter.type = "button";
      const used = isInventoryIndexOnBoard(index);
      const active = game.upgradeBoard.activeIndex === index;
      const selected = game.selectedLetterIndex === index;
      letter.className = `letter-tile${active ? " active" : ""}${selected ? " selected" : ""}${isPoweredLetter(item) ? " powered" : ""}`;
      letter.textContent = inventoryChar(item);
      letter.disabled = game.upgradeBoard.busy || used;
      letter.addEventListener("click", () => {
        if (game.upgradeBoard.activeCellIndex == null) {
          game.upgradeBoard.activeIndex = game.upgradeBoard.activeIndex === index ? null : index;
          game.upgradeBoard.message = game.upgradeBoard.activeIndex == null
            ? "Place up to three letters. Make one compact word."
            : "Now choose any + square.";
          renderUpgradeBoard();
          return;
        }
        placeLetterFromRack(index);
      });
      rack.append(letter);
    });
  } else {
    const empty = document.createElement("span");
    empty.className = "board-note";
    empty.textContent = "No letters collected. Confirm will continue without an upgrade.";
    rack.append(empty);
  }
  panel.append(rack);

  const actions = document.createElement("span");
  actions.className = "board-actions";
  const undo = document.createElement("button");
  undo.type = "button";
  undo.textContent = "Remove Last";
  undo.disabled = game.upgradeBoard.busy || game.upgradeBoard.choosing || !getPlacedCells().length;
  undo.addEventListener("click", () => {
    const placed = getPlacedCells();
    const last = placed[placed.length - 1];
    if (last) {
      game.upgradeBoard.cells[last.index] = null;
      removeStoredWordsUsingCell(last.index);
      game.upgradeBoard.activeCellIndex = last.index;
    }
    renderUpgradeBoard();
  });
  const clear = document.createElement("button");
  clear.type = "button";
  clear.textContent = "Clear";
  clear.disabled = game.upgradeBoard.busy || game.upgradeBoard.choosing || !getPlacedCells().length;
  clear.addEventListener("click", () => {
    game.upgradeBoard.cells = Array(BOARD_SIZE).fill(null);
    game.upgradeBoard.activeIndex = null;
    game.upgradeBoard.activeCellIndex = null;
    game.upgradeBoard.foundWords = [];
    game.upgradeBoard.pendingUpgrades = [];
    game.upgradeBoard.choiceOptions = [];
    game.upgradeBoard.choosing = false;
    game.upgradeBoard.message = "Place up to three letters. Make one compact word.";
    renderUpgradeBoard();
  });
  actions.append(undo, clear);
  panel.append(actions);

  const note = document.createElement("span");
  note.className = "board-note";
  note.textContent = game.upgradeBoard.message;
  panel.append(note);
  hint.append(panel);
}

function renderUpgradeChoices() {
  const choices = document.createElement("span");
  choices.className = "upgrade-choices";
  game.upgradeBoard.choiceOptions.forEach((choice, index) => {
    const card = document.createElement("button");
    card.type = "button";
    card.className = `upgrade-card upgrade-${choice.upgrade.type || "pattern"}${choice.risk ? " risky" : ""}`;
    card.addEventListener("click", () => chooseUpgradeReward(index));

    const title = document.createElement("strong");
    title.textContent = choice.name;
    const word = document.createElement("span");
    word.textContent = `${choice.upgrade.word} / ${choice.upgrade.label}+${choice.upgrade.power}`;
    const detail = document.createElement("small");
    detail.textContent = choice.detail;
    card.append(title, word, detail);
    if (choice.risk) {
      const risk = document.createElement("small");
      risk.className = "risk-text";
      risk.textContent = choice.risk.label;
      card.append(risk);
    }
    choices.append(card);
  });
  return choices;
}

async function forgeSelectedWord() {
  if (game.mode !== "upgrade" || game.upgradeBoard.busy) return;
  if (game.upgradeBoard.choosing) return;
  const validUpgrades = game.upgradeBoard.pendingUpgrades;
  if (!validUpgrades.length) {
    advanceAfterUpgrade();
    return;
  }
  const seedUpgrade = validUpgrades[validUpgrades.length - 1];
  game.upgradeBoard.choiceOptions = buildUpgradeChoices(seedUpgrade);
  game.upgradeBoard.choosing = true;
  game.upgradeBoard.message = "Choose one upgrade reward.";
  renderUpgradeBoard();
}

function advanceAfterUpgrade() {
  overlay.hidden = true;
  restoreOverlayHint();
  startNextPhase();
}

function chooseUpgradeReward(index) {
  if (!game.upgradeBoard.choosing) return;
  const choice = game.upgradeBoard.choiceOptions[index];
  if (!choice) return;
  recordUpgradeLetters(consumePlacedLetters());
  applyDynamicUpgrade(choice.upgrade);
  if (choice.risk) applyUpgradeRisk(choice.risk);
  advanceAfterUpgrade();
}

async function toggleBoardCell(cellIndex) {
  if (game.upgradeBoard.busy || game.upgradeBoard.choosing) return;
  const cell = game.upgradeBoard.cells[cellIndex];
  if (cell) {
    game.upgradeBoard.cells[cellIndex] = null;
    removeStoredWordsUsingCell(cellIndex);
    game.upgradeBoard.activeCellIndex = cellIndex;
    game.upgradeBoard.message = "Removed. Press a letter tile to refill this square.";
    renderUpgradeBoard();
    return;
  }
  if (!canPlaceAt(cellIndex)) {
    game.upgradeBoard.message = "Only connected squares can be selected.";
    renderUpgradeBoard();
    return;
  }
  if (game.upgradeBoard.activeIndex != null && !isInventoryIndexOnBoard(game.upgradeBoard.activeIndex)) {
    await placeLetterAt(cellIndex, game.upgradeBoard.activeIndex);
    return;
  }
  game.upgradeBoard.activeCellIndex = cellIndex;
  game.upgradeBoard.message = "Press a letter tile to place it here.";
  renderUpgradeBoard();
}

async function placeLetterFromRack(sourceIndex) {
  if (game.upgradeBoard.choosing) return;
  if (isInventoryIndexOnBoard(sourceIndex)) return;
  let targetIndex = game.upgradeBoard.activeCellIndex;
  if (targetIndex == null || !canPlaceAt(targetIndex)) targetIndex = firstPlayableCell();
  if (targetIndex == null) {
    game.upgradeBoard.message = "No open connected square is available.";
    renderUpgradeBoard();
    return;
  }
  await placeLetterAt(targetIndex, sourceIndex);
}

async function placeLetterAt(cellIndex, sourceIndex) {
  if (game.upgradeBoard.choosing) return;
  const item = game.inventory[sourceIndex];
  game.upgradeBoard.cells[cellIndex] = {
    char: inventoryChar(item),
    powered: isPoweredLetter(item),
    sourceIndex,
    order: Date.now() + cellIndex,
  };
  game.upgradeBoard.activeIndex = null;
  game.upgradeBoard.activeCellIndex = nextPlayableCell(cellIndex);
  game.upgradeBoard.busy = true;
  game.upgradeBoard.message = "Checking words made by this tile...";
  renderUpgradeBoard();
  const result = await scoreMoveAt(cellIndex);
  game.upgradeBoard.busy = false;
  if (result.added.length) {
    game.upgradeBoard.message = `${result.added.map(formatRecognizedWord).join(" / ")} stored. Add more letters or confirm.`;
  } else if (result.checked.length) {
    game.upgradeBoard.message = `${result.checked.map((item) => item.word).join(" / ")} はまだ辞書にありません。`;
  } else {
    game.upgradeBoard.message = "No 2+ letter line yet. Keep extending the board.";
  }
  renderUpgradeBoard();
}

function canPlaceAt(index) {
  if (game.upgradeBoard.cells[index]) return false;
  if (getPlacedCells().length >= UPGRADE_TILE_LIMIT) return false;
  if (!getPlacedCells().length) return true;
  return neighborIndices(index).some((neighbor) => game.upgradeBoard.cells[neighbor]);
}

function neighborIndices(index) {
  const col = index % BOARD_COLS;
  const row = Math.floor(index / BOARD_COLS);
  const neighbors = [];
  if (col > 0) neighbors.push(index - 1);
  if (col < BOARD_COLS - 1) neighbors.push(index + 1);
  if (row > 0) neighbors.push(index - BOARD_COLS);
  if (row < BOARD_ROWS - 1) neighbors.push(index + BOARD_COLS);
  return neighbors;
}

function boardCellZone(index) {
  const col = index % BOARD_COLS;
  const row = Math.floor(index / BOARD_COLS);
  const centerCol = (BOARD_COLS - 1) / 2;
  const centerRow = (BOARD_ROWS - 1) / 2;
  const distance = Math.abs(col - centerCol) + Math.abs(row - centerRow);
  if (distance <= 1) return "zone-core";
  if (distance <= 3) return "zone-mid";
  return "zone-edge";
}

function firstPlayableCell() {
  return game.upgradeBoard.cells.findIndex((cell, index) => !cell && canPlaceAt(index));
}

function nextPlayableCell(fromIndex) {
  const neighbor = neighborIndices(fromIndex).find((index) => canPlaceAt(index));
  if (neighbor != null) return neighbor;
  const first = firstPlayableCell();
  return first >= 0 ? first : null;
}

function isInventoryIndexOnBoard(sourceIndex) {
  return game.upgradeBoard.cells.some((cell) => cell && cell.sourceIndex === sourceIndex);
}

async function scoreMoveAt(cellIndex) {
  const candidates = getWordsThroughCell(cellIndex).filter((item) => !hasStoredWord(item));
  if (!candidates.length) return { checked: [], added: [] };
  const analyses = await Promise.all(candidates.map((item) => analyzeWord(item.word)));
  const added = [];
  analyses.forEach((analysis, index) => {
    if (!analysis.valid) return;
    const word = candidates[index];
    const powered = word.indices.some((cellIndex) => game.upgradeBoard.cells[cellIndex]?.powered);
    const upgrade = powered ? amplifyUpgrade(analysis, 3) : analysis;
    word.powered = powered;
    word.recognized = upgrade.recognized || [word.word];
    game.upgradeBoard.foundWords.push(word);
    game.upgradeBoard.pendingUpgrades.push(upgrade);
    added.push(word);
  });
  return { checked: candidates, added };
}

function formatRecognizedWord(item) {
  const recognized = [...new Set(item.recognized || [])].filter((word) => word && word !== item.word);
  return recognized.length ? `${item.word} (${recognized.join(" / ")})` : item.word;
}

function amplifyUpgrade(upgrade, multiplier) {
  return {
    ...upgrade,
    power: upgrade.power * multiplier,
    title: `${upgrade.title} x${multiplier}`,
    description: `${upgrade.description} x${multiplier}`,
  };
}

function buildUpgradeChoices(seedUpgrade) {
  if (seedUpgrade.highRoll) return buildHighRollChoices(seedUpgrade);
  const base = normalizeUpgradeChoice(seedUpgrade, "安定強化", "作った単語をそのまま伸ばす。");
  const risky = normalizeUpgradeChoice(
    {
      ...seedUpgrade,
      power: seedUpgrade.power + 2,
      title: `${seedUpgrade.title} +Risk`,
      description: `${seedUpgrade.description} リスクを背負って効果増幅。`,
    },
    "リスク強化",
    "強い代わりに次フェーズの弾圧が上がる。",
    { bulletPressure: 0.12, label: "次フェーズ弾圧 +12%" },
  );
  const counterType = nextBossCounterType();
  const counter = normalizeUpgradeChoice(
    {
      ...seedUpgrade,
      type: counterType,
      label: upgradeLabelForType(counterType),
      power: Math.max(2, seedUpgrade.power),
      title: `${attributeLabelForType(counterType)}対策 ${seedUpgrade.word}`,
      description: `次のボス弱点に寄せた${attributeLabelForType(counterType)}強化。`,
    },
    "ボス対策",
    "次に来る夜ボスの弱点へ寄せる。",
  );
  return [base, risky, counter];
}

function buildHighRollChoices(seedUpgrade) {
  const awakened = normalizeUpgradeChoice(
    {
      ...seedUpgrade,
      power: seedUpgrade.power + 2,
      title: `${seedUpgrade.title} 覚醒`,
      description: `${seedUpgrade.description} さらに覚醒して効果上昇。`,
    },
    "大当たり覚醒",
    "3文字レア単語。ノーリスクでかなり強い。",
  );
  const signature = highRollSignatureChoice(seedUpgrade);
  const overdrive = normalizeUpgradeChoice(
    {
      ...seedUpgrade,
      power: seedUpgrade.power + 5,
      title: `${seedUpgrade.title} 暴走`,
      description: `${seedUpgrade.description} 属性の尖りを暴走させて破格の効果。`,
    },
    "暴走上振れ",
    "元の属性を保ったまま破格に伸ばす。代わりに次フェーズの弾圧が跳ねる。",
    { bulletPressure: 0.18, label: "次フェーズ弾圧 +18%" },
  );
  return [awakened, signature, overdrive];
}

function highRollSignatureChoice(seedUpgrade) {
  const signatures = {
    attack: {
      name: "炎核点火",
      title: `炎核点火 ${seedUpgrade.word}`,
      description: "炎の大当たり。弾威力を一点突破で伸ばし、ボス削りを最優先にする。",
      detail: "火力特化。弱点一致ボスを短時間で倒すための選択。",
      power: seedUpgrade.power + 4,
    },
    mobility: {
      name: "風読み",
      title: `風読み ${seedUpgrade.word}`,
      description: "風の大当たり。移動速度、低速性能、無敵時間をまとめて伸ばす。",
      detail: "回避特化。難しい弾幕を操作精度で抜けるための選択。",
      power: seedUpgrade.power + 3,
    },
    control: {
      name: "氷結支配",
      title: `氷結支配 ${seedUpgrade.word}`,
      description: "氷の大当たり。敵弾スローを強め、次フェーズの弾圧リスクも下げる。",
      detail: "盤面制御特化。リスクを抑えて安全に次へ進む選択。",
      power: seedUpgrade.power + 4,
    },
    life: {
      name: "光環再生",
      title: `光環再生 ${seedUpgrade.word}`,
      description: "光の大当たり。最大HPと回復量を伸ばし、長期戦の許容量を増やす。",
      detail: "生存特化。被弾を許容してボスまで粘るための選択。",
      power: seedUpgrade.power + 3,
    },
    pattern: {
      name: "闇侵食",
      title: `闇侵食 ${seedUpgrade.word}`,
      description: "闇の大当たり。全ボス弱点を突く万能性を保ったまま拡散を増やす。",
      detail: "万能弱点特化。作りにくい闇だけが選べるボス対策。",
      power: seedUpgrade.power + 4,
      risk: { bulletPressure: 0.1, label: "次フェーズ弾圧 +10%" },
    },
  };
  const signature = signatures[seedUpgrade.type] || signatures.life;
  return normalizeUpgradeChoice(
    {
      ...seedUpgrade,
      power: signature.power,
      title: signature.title,
      description: signature.description,
      highRoll: true,
    },
    signature.name,
    signature.detail,
    signature.risk || null,
  );
}

function normalizeUpgradeChoice(upgrade, name, detail, risk = null) {
  return {
    name,
    detail,
    risk,
    upgrade: {
      ...upgrade,
      valid: true,
      power: Math.max(1, Math.round(upgrade.power || 1)),
      label: upgrade.label || upgradeLabelForType(upgrade.type),
      title: upgrade.title || `${upgrade.word} ${upgradeLabelForType(upgrade.type)}`,
      description: upgrade.description || describeDynamicUpgrade(upgrade.type, upgrade.power || 1),
    },
  };
}

function nextBossCounterType() {
  const nextBossPhase = Math.ceil((game.phase + 1) / 3) * 3;
  return selectBossDesign(nextBossPhase).weak;
}

function upgradeLabelForType(type) {
  if (type === "attack") return "攻撃";
  if (type === "mobility") return "移動";
  if (type === "defense") return "守り";
  if (type === "control") return "制御";
  if (type === "life") return "生命";
  return "闇";
}

function attributeLabelForType(type) {
  return SHOT_ATTRIBUTES.find((attribute) => attribute.id === type)?.label || upgradeLabelForType(type);
}

function applyUpgradeRisk(risk) {
  if (risk.bulletPressure) {
    game.riskBulletPressure = (game.riskBulletPressure || 0) + risk.bulletPressure;
  }
}

function getWordsThroughCell(cellIndex) {
  return [
    ...getLineWordsThroughCell(cellIndex, 1, "row"),
    ...getLineWordsThroughCell(cellIndex, BOARD_COLS, "col"),
  ];
}

function getLineWordsThroughCell(cellIndex, step, direction) {
  let start = cellIndex;
  while (sameLine(cellIndex, start - step, direction) && game.upgradeBoard.cells[start - step]) start -= step;
  let end = cellIndex;
  while (sameLine(cellIndex, end + step, direction) && game.upgradeBoard.cells[end + step]) end += step;

  const cells = [];
  for (let index = start; index <= end; index += step) {
    const cell = game.upgradeBoard.cells[index];
    if (!cell) return [];
    cells.push({ ...cell, index });
  }
  const originOffset = cells.findIndex((cell) => cell.index === cellIndex);
  const words = [];
  for (let from = 0; from <= originOffset; from += 1) {
    for (let to = originOffset; to < cells.length; to += 1) {
      const slice = cells.slice(from, to + 1);
      if (slice.length < 2) continue;
      words.push({
        word: slice.map((cell) => cell.char).join("").toLowerCase(),
        indices: slice.map((cell) => cell.index),
        direction,
      });
    }
  }
  return words;
}

function sameLine(origin, index, direction) {
  if (index < 0 || index >= BOARD_SIZE) return false;
  if (direction === "col") return index % BOARD_COLS === origin % BOARD_COLS;
  return Math.floor(index / BOARD_COLS) === Math.floor(origin / BOARD_COLS);
}

function hasStoredWord(word) {
  return game.upgradeBoard.foundWords.some((stored) => stored.word === word.word && stored.indices.join(",") === word.indices.join(","));
}

function removeStoredWordsUsingCell(cellIndex) {
  const keep = [];
  const keepUpgrades = [];
  game.upgradeBoard.foundWords.forEach((word, index) => {
    if (word.indices.includes(cellIndex)) return;
    keep.push(word);
    keepUpgrades.push(game.upgradeBoard.pendingUpgrades[index]);
  });
  game.upgradeBoard.foundWords = keep;
  game.upgradeBoard.pendingUpgrades = keepUpgrades;
}

function isScoredCell(cellIndex) {
  return game.upgradeBoard.foundWords.some((word) => word.indices.includes(cellIndex));
}

function getPlacedCells() {
  return game.upgradeBoard.cells
    .map((cell, index) => cell ? { ...cell, index } : null)
    .filter(Boolean)
    .sort((a, b) => a.order - b.order);
}

function getBoardWords() {
  const words = [];
  for (let row = 0; row < BOARD_ROWS; row += 1) {
    collectLineWords(words, row * BOARD_COLS, 1, BOARD_COLS, "row");
  }
  for (let col = 0; col < BOARD_COLS; col += 1) {
    collectLineWords(words, col, BOARD_COLS, BOARD_ROWS, "col");
  }
  const seen = new Set();
  return words.filter((item) => {
    const key = `${item.word}:${item.indices.join(",")}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function collectLineWords(words, start, step, length, direction) {
  let current = [];
  for (let i = 0; i < length; i += 1) {
    const index = start + i * step;
    const cell = game.upgradeBoard.cells[index];
    if (cell) {
      current.push({ ...cell, index });
    } else {
      pushLineWord(words, current, direction);
      current = [];
    }
  }
  pushLineWord(words, current, direction);
}

function pushLineWord(words, cells, direction) {
  if (cells.length < 3) return;
  words.push({
    word: cells.map((cell) => cell.char).join("").toLowerCase(),
    indices: cells.map((cell) => cell.index),
    direction,
  });
}

function consumePlacedLetters() {
  const placed = getPlacedCells();
  const usedLetters = placed.map((cell) => cell.char);
  const selected = placed.map((cell) => cell.sourceIndex).sort((a, b) => b - a);
  for (const index of selected) game.inventory.splice(index, 1);
  normalizeSelectedLetterIndex();
  game.upgradeBoard.cells = Array(BOARD_SIZE).fill(null);
  game.upgradeBoard.activeIndex = null;
  return usedLetters;
}

function recordUpgradeLetters(letters) {
  for (const char of letters) {
    if (char && !game.usedUpgradeLetters.includes(char)) game.usedUpgradeLetters.push(char);
  }
}

async function analyzeWord(word) {
  const normalized = normalizeKana(word);
  try {
    const response = await fetch(`${WORD_ENDPOINT}?word=${encodeURIComponent(normalized)}`);
    if (response.ok) {
      const result = await response.json();
      if (result?.valid && result.upgrade) return result.upgrade;
      return { valid: false, word: normalized };
    }
  } catch {
    // Fall back to the in-browser list when the local API is unavailable.
  }
  if (HIGH_ROLL_WORDS.has(normalized)) return createHighRollUpgrade(normalized);
  if (!LOCAL_WORDS.has(normalized)) return { valid: false, word: normalized };
  return createWordUpgrade(normalized);
}

function normalizeKana(word) {
  return word.toLowerCase().replace(/[ァ-ン]/g, (char) => String.fromCharCode(char.charCodeAt(0) - 0x60));
}

function createWordUpgrade(word) {
  const combined = word;
  const tag = WORD_TAGS.find((candidate) => candidate.words.some((keyword) => combined.includes(keyword))) || inferWordTag(word);
  const power = Math.max(1, Math.min(5, [...word].length - 1 + rareLetterBonus(word)));
  return {
    valid: true,
    word,
    type: tag.type,
    label: tag.label,
    power,
    title: `${word} ${tag.label}`,
    description: describeDynamicUpgrade(tag.type, power),
  };
}

function inferWordTag(word) {
  if (/[やみかげ]/.test(word) && word.length >= 3) return { type: "pattern", label: "闇" };
  if (/[かきくけこがぎぐげご]/.test(word)) return { type: "attack", label: "攻撃" };
  if (/[まみむめも]/.test(word)) return { type: "defense", label: "守り" };
  if (/[らりるれろ]/.test(word)) return { type: "control", label: "制御" };
  if (word.length <= 2) return { type: "mobility", label: "移動" };
  return { type: "life", label: "生命" };
}

function rareLetterBonus(word) {
  return [...word].filter((char) => "ゃゅょっん".includes(char)).length;
}

function describeDynamicUpgrade(type, power) {
  if (type === "attack") return `炎: 弾威力 +${power}。強化で重い火柱弾が増える。`;
  if (type === "mobility") return "風: 移動速度と低速性能アップ。強化で横風の針弾が増える。";
  if (type === "defense") return "守り: HP回復と短い無敵。立て直し用。";
  if (type === "control") return "氷: 敵弾スローと弾圧低下。強化で大きい制圧弾が増える。";
  if (type === "life") return "光: 最大HPアップと回復。強化で追尾する光弾が増える。";
  return "闇: 全ボス弱点を突ける。強化で波打つ闇弾が増えるが弾圧リスクも上がる。";
}

function applyDynamicUpgrade(upgrade) {
  const p = game.player;
  increaseAttributeMod(upgrade.type, upgrade.highRoll ? 2 : 1);
  if (upgrade.type === "attack") {
    p.bulletDamageBonus += upgrade.power;
  } else if (upgrade.type === "mobility") {
    p.speed += 14 + upgrade.power * 7;
    p.slowSpeed += 7 + upgrade.power * 3;
    p.invuln += 0.4 + upgrade.power * 0.1;
  } else if (upgrade.type === "defense") {
    p.hp = Math.min(p.maxHp, p.hp + 1);
    p.invuln += 1 + upgrade.power * 0.25;
  } else if (upgrade.type === "control") {
    game.startingSlow += 1.3 + upgrade.power * 0.45;
    game.riskBulletPressure = Math.max(0, (game.riskBulletPressure || 0) - 0.03 * upgrade.power);
  } else if (upgrade.type === "life") {
    p.maxHp += 1;
    p.hp = Math.min(p.maxHp, p.hp + 1 + Math.floor(upgrade.power / 3));
  } else {
    p.spread += 1;
    game.riskBulletPressure = (game.riskBulletPressure || 0) + 0.03 + upgrade.power * 0.01;
  }
  game.upgrades.push(upgrade.title);
  addBuffIcon(upgrade);
  game.score += 120 + upgrade.word.length * 90 + upgrade.power * 60;
  setMessage(upgrade.description);
}

function increaseAttributeMod(type, amount) {
  if (!game.player.attributeMods || !Object.hasOwn(game.player.attributeMods, type)) return;
  game.player.attributeMods[type] = Math.min(5, game.player.attributeMods[type] + amount);
}

function createHighRollUpgrade(word) {
  const highRoll = HIGH_ROLL_WORDS.get(word);
  return {
    valid: true,
    word,
    type: highRoll.type,
    label: highRoll.label,
    power: highRoll.power,
    title: highRoll.title,
    description: highRoll.description,
    highRoll: true,
    recognized: [word, highRoll.label],
  };
}

function addBuffIcon(upgrade) {
  game.buffIcons.push({
    icon: buffIconForType(upgrade.type),
    type: upgrade.type || "pattern",
    title: upgrade.title,
    description: upgrade.description,
  });
  game.buffIcons = game.buffIcons.slice(-8);
}

function buffIconForType(type) {
  if (type === "attack") return "A";
  if (type === "mobility") return ">";
  if (type === "defense") return "D";
  if (type === "control") return "~";
  if (type === "life") return "+";
  return "*";
}

function startNextPhase() {
  game.phase += 1;
  game.stage = game.phase;
  game.phaseTime = 0;
  game.effects.slow = game.startingSlow;
  if (isBossPhase(game.phase)) {
    startFinalBattle();
    return;
  }
  game.phaseGoal = PHASE_DURATION + 6;
  game.spawnTimer = 1;
  game.letterTimer = 0.7;
  game.mode = "phase";
  lastFrame = performance.now();
  setMessage(`Phase ${game.phase}: survive and collect more letters`);
}

function isBossPhase(phase) {
  return phase > 0 && phase % 3 === 0;
}

function startFinalBattle() {
  game.phaseTime = 0;
  game.mode = "final";
  game.effects.slow = game.startingSlow;
  game.enemies.length = 0;
  game.letters.length = 0;
  game.enemyBullets.length = 0;
  game.playerBullets.length = 0;
  const maxHp = Math.round(420 + game.phase * 70 + game.upgrades.length * 90);
  const design = debugBossDesign() || selectBossDesign(game.phase);
  game.boss = {
    x: WIDTH / 2,
    y: -70,
    hp: maxHp,
    maxHp,
    radius: 48,
    phase: 0,
    attackTimer: 0,
    entry: 0,
    design,
  };
  lastFrame = performance.now();
  setMessage(design.message);
}

function selectBossDesign(phase) {
  const bossIndex = Math.max(0, Math.floor(phase / 3) - 1);
  return BOSS_DESIGNS[bossIndex % BOSS_DESIGNS.length];
}

function debugBossDesign() {
  if (!debugMode || !game.debugBossId) return null;
  return BOSS_DESIGNS.find((design) => design.id === game.debugBossId) || null;
}

function bossAttributeMultiplier(boss, bullet) {
  if (bullet.type === "letter") return 0.65;
  if (bullet.attribute === "pattern") return 1.52;
  if (bullet.attribute === boss.design.weak) return 1.65;
  if (bullet.attribute === boss.design.resist) return 0.62;
  return 1;
}

function restoreOverlayHint() {
  const hint = overlay.querySelector(".hint");
  hint.textContent = KEY_PRESETS[keyPreset].hint;
}

function checkCollisions() {
  for (let i = game.playerBullets.length - 1; i >= 0; i -= 1) {
    const bullet = game.playerBullets[i];
    let consumed = false;
    for (let j = game.letters.length - 1; j >= 0; j -= 1) {
      const letter = game.letters[j];
      if (distance(bullet, letter) < bullet.radius + letter.radius) {
        game.letters.splice(j, 1);
        collectLetter(letter);
        consumed = true;
        break;
      }
    }
    for (const enemy of game.enemies) {
      if (consumed) break;
      if (distance(bullet, enemy) < bullet.radius + enemy.radius) {
        if (enemy.letterShield && bullet.type !== "letter") {
          consumed = true;
          burst(bullet.x, bullet.y, "#d6ff8f", 5);
          setMessage("文字シールドにはKの文字弾が効く。");
          break;
        }
        enemy.hp -= enemy.letterShield ? enemy.hp : bullet.damage;
        consumed = true;
        burst(bullet.x, bullet.y, enemy.letterShield ? "#d6ff8f" : "#79e7ff", enemy.letterShield ? 8 : 4);
        if (enemy.hp <= 0) destroyEnemy(enemy);
        break;
      }
    }
    if (!consumed && game.boss && distance(bullet, game.boss) < bullet.radius + game.boss.radius) {
      const multiplier = bossAttributeMultiplier(game.boss, bullet);
      game.boss.hp -= bullet.damage * multiplier;
      consumed = true;
      const burstColor = multiplier > 1 ? game.boss.design.accent : multiplier < 1 ? "rgba(238, 248, 255, 0.55)" : game.boss.design.color;
      burst(bullet.x, bullet.y, burstColor, multiplier > 1 ? 8 : 3);
      if (game.boss.hp <= 0) {
        clearBossPhase();
        return;
      }
    }
    if (consumed) game.playerBullets.splice(i, 1);
  }

  const p = game.player;
  if (p.invuln <= 0) {
    for (const bullet of game.enemyBullets) {
      if (distance(bullet, p) < bullet.radius + HIT_RADIUS) {
        damagePlayer();
        bullet.y = HEIGHT + 100;
        break;
      }
    }
    for (const enemy of game.enemies) {
      if (distance(enemy, p) < enemy.radius + HIT_RADIUS) {
        enemy.hp = 0;
        damagePlayer();
        break;
      }
    }
  }
}

function destroyEnemy(enemy) {
  game.score += enemy.score;
  game.kills += 1;
  if (enemy.letterShield) rewardLetterShield(enemy);
  burst(enemy.x, enemy.y, enemy.letterShield ? "#d6ff8f" : "#ffd36e", enemy.letterShield ? 20 : 12);
  enemy.y = HEIGHT + 100;
}

function rewardLetterShield(enemy) {
  const count = 2 + Math.floor(Math.random() * 2);
  const gained = [];
  for (let i = 0; i < count; i += 1) {
    const char = REWARD_LETTERS[Math.floor(Math.random() * REWARD_LETTERS.length)];
    game.inventory.push(makePoweredLetter(char));
    gained.push(char);
  }
  while (game.inventory.length > INVENTORY_LIMIT) game.inventory.shift();
  normalizeSelectedLetterIndex();
  game.score += 180 * count;
  setMessage(`Letter shield broken: powered letters ${gained.join(" ")} gained.`);
  burst(enemy.x, enemy.y, "#eef8ff", 10);
}
function damagePlayer() {
  const p = game.player;
  if (debugMode && game.debugInvincible) {
    p.invuln = 0.5;
    return;
  }
  p.hp -= 1;
  p.invuln = 1.4;
  game.hits += 1;
  game.flash = 0.2;
  burst(p.x, p.y, "#ff6b9a", 18);
  if (p.hp <= 0) finish("game_over");
}

function clearBossPhase() {
  game.score += 1200 + game.phase * 160 + game.player.hp * 220;
  game.stagesCleared = Math.max(game.stagesCleared, game.phase);
  game.boss = null;
  game.enemies.length = 0;
  game.enemyBullets.length = 0;
  game.playerBullets.length = 0;
  setMessage(`Boss ${Math.floor(game.phase / 3)} cleared`);
  enterUpgrade();
}

function finish(mode) {
  game.mode = mode;
  game.stagesCleared = Math.max(game.stagesCleared, game.phase);
  updateHud();
  overlay.hidden = false;
  overlay.querySelector("h1").textContent = mode === "game_clear" ? "Run Clear" : "Game Over";
  overlay.querySelector("p").textContent = `Flow ${game.stagesCleared} / Score ${game.score} / Kills ${game.kills} / Hits ${game.hits}`;
  startButton.textContent = "Back to Title";
  restoreOverlayHint();
  prepareRankingSubmission();
}

function togglePause() {
  if (game.mode === "phase" || game.mode === "final") {
    game.mode = "pause";
    overlay.hidden = false;
    overlay.querySelector("h1").textContent = "Paused";
    overlay.querySelector("p").textContent = "Press Esc to resume, or Enter to restart.";
    startButton.textContent = "Restart";
  } else if (game.mode === "pause") {
    game.mode = game.boss ? "final" : "phase";
    overlay.hidden = true;
    lastFrame = performance.now();
  }
  updateHud();
}

function updateParticles(dt) {
  for (const p of game.particles) {
    p.life -= dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
  }
  game.particles = game.particles.filter((p) => p.life > 0);
}

function burst(x, y, color, count) {
  for (let i = 0; i < count; i += 1) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 45 + Math.random() * 145;
    game.particles.push({ x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, life: 0.25 + Math.random() * 0.35, color });
  }
}

function draw() {
  drawBackground();
  drawPlayerBullets();
  drawEnemies();
  drawBoss();
  drawEnemyBullets();
  drawLetters();
  drawPlayer();
  drawParticles();
  drawBossHp();
  drawMessage();
  if (game.flash > 0) {
    ctx.fillStyle = `rgba(255, 80, 120, ${game.flash * 1.6})`;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
  }
}

function drawBackground() {
  ctx.fillStyle = "#071120";
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
  ctx.save();
  ctx.translate(0, game.scroll % 80);
  for (let y = -80; y < HEIGHT + 80; y += 80) {
    ctx.strokeStyle = "rgba(121, 231, 255, 0.09)";
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(WIDTH, y);
    ctx.stroke();
    for (let x = 32; x < WIDTH; x += 72) {
      const twinkle = 0.35 + Math.sin((game.scroll + x + y) * 0.04) * 0.25;
      ctx.fillStyle = `rgba(255, 244, 190, ${twinkle})`;
      ctx.fillRect(x, y + (x % 47), 2, 2);
    }
  }
  ctx.restore();
  const grad = ctx.createLinearGradient(0, 0, 0, HEIGHT);
  grad.addColorStop(0, "rgba(14, 44, 82, 0.55)");
  grad.addColorStop(1, "rgba(3, 9, 19, 0.25)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
}

function drawPlayer() {
  const p = game.player;
  ctx.save();
  ctx.globalAlpha = p.invuln > 0 ? 0.55 + Math.sin(game.time * 30) * 0.25 : 1;
  ctx.fillStyle = "#79e7ff";
  ctx.shadowColor = "#79e7ff";
  ctx.shadowBlur = 18;
  ctx.beginPath();
  ctx.moveTo(p.x, p.y - 19);
  ctx.lineTo(p.x - 15, p.y + 16);
  ctx.lineTo(p.x, p.y + 8);
  ctx.lineTo(p.x + 15, p.y + 16);
  ctx.closePath();
  ctx.fill();
  if (isActionPressed("focus")) {
    ctx.shadowBlur = 0;
    ctx.strokeStyle = "#ffd36e";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(p.x, p.y, HIT_RADIUS + 3, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();
}

function drawPlayerBullets() {
  ctx.save();
  ctx.font = "700 20px ui-sans-serif, system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  for (const b of game.playerBullets) {
    if (b.type === "letter") {
      ctx.fillStyle = "rgba(255, 211, 110, 0.18)";
      ctx.strokeStyle = "#ffd36e";
      ctx.lineWidth = 2;
      ctx.shadowColor = "#ffd36e";
      ctx.shadowBlur = 14;
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.fillStyle = "#eef8ff";
      ctx.fillText(b.char, b.x, b.y + 1);
    } else {
      ctx.fillStyle = b.color || "#baf6ff";
      ctx.shadowColor = b.glow || "#79e7ff";
      ctx.shadowBlur = 10;
      ctx.beginPath();
      drawPlayerBulletShape(b);
    }
  }
  ctx.restore();
}

function drawPlayerBulletShape(b) {
  if (b.shape === "flame") {
    ctx.moveTo(b.x, b.y - 15);
    ctx.quadraticCurveTo(b.x + 8, b.y - 3, b.x + 2, b.y + 10);
    ctx.quadraticCurveTo(b.x - 9, b.y + 1, b.x, b.y - 15);
    ctx.fill();
  } else if (b.shape === "needle") {
    ctx.roundRect(b.x - 2, b.y - 16, 4, 28, 2);
    ctx.fill();
  } else if (b.shape === "orb") {
    ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "rgba(238, 248, 255, 0.7)";
    ctx.lineWidth = 1.5;
    ctx.stroke();
  } else if (b.shape === "spark") {
    ctx.moveTo(b.x, b.y - 13);
    ctx.lineTo(b.x + 6, b.y - 2);
    ctx.lineTo(b.x + 2, b.y + 11);
    ctx.lineTo(b.x - 6, b.y + 1);
    ctx.closePath();
    ctx.fill();
  } else if (b.shape === "dark") {
    ctx.ellipse(b.x, b.y, b.radius * 1.25, b.radius * 2.1, Math.sin(b.age * 8) * 0.45, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "rgba(255, 242, 168, 0.45)";
    ctx.lineWidth = 1;
    ctx.stroke();
  } else {
    ctx.roundRect(b.x - 3, b.y - 12, 6, 18, 3);
    ctx.fill();
  }
}

function drawEnemies() {
  for (const e of game.enemies) {
    ctx.fillStyle = e.type === "A" ? "#ff8db3" : e.type === "B" ? "#ffd36e" : e.type === "D" ? "#d6ff8f" : "#c99cff";
    ctx.shadowColor = ctx.fillStyle;
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.arc(e.x, e.y, e.radius, 0, Math.PI * 2);
    ctx.fill();
    if (e.letterShield) {
      ctx.shadowBlur = 0;
      ctx.strokeStyle = "#eef8ff";
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.fillStyle = "#071120";
      ctx.font = "800 18px ui-sans-serif, system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("字", e.x, e.y + 1);
    }
    ctx.shadowBlur = 0;
  }
}

function drawBoss() {
  const b = game.boss;
  if (!b) return;
  ctx.save();
  ctx.translate(b.x, b.y);
  ctx.fillStyle = b.design.color;
  ctx.strokeStyle = b.design.accent;
  ctx.shadowColor = b.design.color;
  ctx.shadowBlur = 24;
  if (b.design.id === "ember") drawEmberBoss(b);
  else if (b.design.id === "azure") drawAzureBoss(b);
  else drawVioletBoss(b);
  ctx.restore();

  ctx.save();
  ctx.font = "800 13px ui-sans-serif, system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.fillStyle = b.design.accent;
  ctx.shadowColor = "#071120";
  ctx.shadowBlur = 8;
  ctx.fillText(`${b.design.name}  弱点: ${bossWeakLabel(b)}`, b.x, b.y + b.radius + 30);
  ctx.restore();
}

function drawEmberBoss(b) {
  ctx.beginPath();
  ctx.ellipse(0, 8, b.radius * 1.18, b.radius * 0.82, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.lineWidth = 4;
  ctx.stroke();
  ctx.fillStyle = b.design.accent;
  ctx.beginPath();
  ctx.moveTo(-42, -8);
  ctx.lineTo(-27, -42);
  ctx.lineTo(-10, -12);
  ctx.lineTo(0, -50);
  ctx.lineTo(10, -12);
  ctx.lineTo(27, -42);
  ctx.lineTo(42, -8);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#241606";
  ctx.beginPath();
  ctx.arc(-18, 9, 7, 0, Math.PI * 2);
  ctx.arc(18, 9, 7, 0, Math.PI * 2);
  ctx.fill();
}

function drawAzureBoss(b) {
  ctx.lineWidth = 5;
  for (let i = 0; i < 3; i += 1) {
    ctx.rotate((game.time * 0.7) + i * (Math.PI * 2 / 3));
    ctx.beginPath();
    ctx.ellipse(0, 0, b.radius * 1.35, b.radius * 0.28, 0, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.fillStyle = "rgba(7, 17, 32, 0.88)";
  ctx.beginPath();
  ctx.arc(0, 0, b.radius * 0.62, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = b.design.color;
  ctx.beginPath();
  ctx.arc(0, 0, b.radius * 0.34, 0, Math.PI * 2);
  ctx.fill();
}

function drawVioletBoss(b) {
  ctx.beginPath();
  ctx.moveTo(0, -b.radius);
  ctx.lineTo(b.radius * 0.95, -6);
  ctx.lineTo(b.radius * 0.58, b.radius * 0.82);
  ctx.lineTo(-b.radius * 0.58, b.radius * 0.82);
  ctx.lineTo(-b.radius * 0.95, -6);
  ctx.closePath();
  ctx.fill();
  ctx.lineWidth = 4;
  ctx.stroke();
  ctx.shadowBlur = 0;
  ctx.fillStyle = b.design.accent;
  ctx.font = "900 34px ui-sans-serif, system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("字", 0, 6);
  ctx.strokeStyle = "rgba(238, 248, 255, 0.74)";
  ctx.beginPath();
  ctx.arc(0, 2, b.radius * 0.68, game.time * 0.7, game.time * 0.7 + Math.PI * 1.35);
  ctx.stroke();
}

function bossWeakLabel(boss) {
  return SHOT_ATTRIBUTES.find((attribute) => attribute.id === boss.design.weak)?.label || boss.design.weak;
}

function drawEnemyBullets() {
  for (const b of game.enemyBullets) {
    ctx.fillStyle = b.color;
    ctx.shadowColor = b.color;
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.shadowBlur = 0;
}

function drawLetters() {
  ctx.save();
  ctx.font = "700 24px ui-sans-serif, system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  for (const letter of game.letters) {
    ctx.fillStyle = "rgba(7, 17, 32, 0.85)";
    ctx.strokeStyle = "#d6ff8f";
    ctx.lineWidth = 2;
    ctx.shadowColor = "#d6ff8f";
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.arc(letter.x, letter.y, letter.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.fillStyle = "#eef8ff";
    ctx.fillText(letter.char, letter.x, letter.y + 1);
  }
  ctx.restore();
}

function drawParticles() {
  for (const p of game.particles) {
    ctx.globalAlpha = Math.max(0, p.life * 2);
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawBossHp() {
  if (!game.boss) return;
  const w = WIDTH - 64;
  const boss = game.boss;
  const pct = clamp(boss.hp / boss.maxHp, 0, 1);
  ctx.save();
  ctx.fillStyle = "rgba(255, 255, 255, 0.16)";
  ctx.fillRect(32, 32, w, 8);
  ctx.fillStyle = boss.design.color;
  ctx.fillRect(32, 32, w * pct, 8);
  ctx.font = "800 12px ui-sans-serif, system-ui, sans-serif";
  ctx.textAlign = "left";
  ctx.fillStyle = boss.design.accent;
  ctx.fillText(`${boss.design.name} / 弱点 ${bossWeakLabel(boss)}`, 32, 25);
  ctx.restore();
}

function drawMessage() {
  if (game.messageTimer <= 0 && game.mode !== "title") return;
  if (!game.message) return;
  ctx.save();
  ctx.font = "700 18px ui-sans-serif, system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.fillStyle = "rgba(238, 248, 255, 0.92)";
  ctx.fillText(game.message, WIDTH / 2, 64);
  ctx.restore();
}

function updateHud() {
  scoreEl.textContent = game.score;
  hpEl.textContent = `${game.player.hp}/${game.player.maxHp}`;
  if (game.mode === "final") {
    timeEl.textContent = "Final";
  } else if (game.mode === "upgrade") {
    timeEl.textContent = `Build ${game.phase}`;
  } else if (game.mode === "title") {
    timeEl.textContent = "Ready";
  } else {
    timeEl.textContent = `${game.phase} ${Math.max(0, Math.ceil(game.phaseGoal - game.phaseTime))}s`;
  }
  stateEl.textContent = game.stagesCleared;
  const risk = inventoryRisk();
  const riskText = risk > 6 ? "danger" : risk > 0 ? "heavy" : "light";
  const rackText = game.inventory.map((item, index) => {
    const label = inventoryLabel(item);
    return index === selectedLetterIndex() ? `[${label}]` : label;
  }).join(" ");
  letterRackEl.textContent = game.inventory.length
    ? `${rackText} (${game.inventory.length}/${INVENTORY_LIMIT} ${riskText})`
    : "collect letters";
  const activeEffects = Object.entries(game.effects)
    .filter(([, time]) => time > 0)
    .map(([name, time]) => `${name} ${Math.ceil(time)}s`);
  const attribute = currentShotAttribute();
  const attributeText = `属性: ${attribute.label} (${attribute.role})`;
  const upgrades = game.upgrades.length ? `Upgrades: ${game.upgrades.join(" / ")}` : "";
  effectsEl.textContent = [attributeText, activeEffects.join(" / "), upgrades].filter(Boolean).join(" | ");
  updateBuffTray();
}

function updateBuffTray() {
  if (!buffTrayEl) return;
  const timed = Object.entries(game.effects)
    .filter(([, time]) => time > 0)
    .map(([type, time]) => ({
      icon: timedBuffIcon(type),
      type,
      title: `${type} ${Math.ceil(time)}s`,
      description: timedBuffDescription(type),
    }));
  const permanent = (game.buffIcons || []).slice(-5);
  const icons = [...timed, ...permanent];
  buffTrayEl.hidden = icons.length === 0;
  buffTrayEl.innerHTML = "";
  for (const item of icons) {
    const icon = document.createElement("span");
    icon.className = `buff-icon buff-${item.type || "pattern"}`;
    icon.textContent = item.icon;
    icon.title = [item.title, item.description].filter(Boolean).join(" - ");
    icon.setAttribute("aria-label", icon.title || "buff");
    buffTrayEl.append(icon);
  }
}

function timedBuffIcon(type) {
  if (type === "fast") return ">";
  if (type === "slow") return "~";
  return "*";
}

function timedBuffDescription(type) {
  if (type === "fast") return "speed up";
  if (type === "slow") return "enemy slow";
  return "timed effect";
}

function setMessage(message) {
  game.message = message;
  game.messageTimer = 2.4;
}

function toggleDebugMode() {
  debugMode = !debugMode;
  if (debugPanelEl) debugPanelEl.hidden = !debugMode;
  if (!debugMode) game.debugInvincible = false;
  syncDebugPanel();
  setMessage(debugMode ? "Debug mode enabled" : "Debug mode disabled");
  updateHud();
}

function syncDebugPanel() {
  if (!debugPanelEl) return;
  if (debugInvincibleEl) debugInvincibleEl.checked = Boolean(game.debugInvincible);
  if (debugBossSelectEl && !debugBossSelectEl.options.length) {
    for (const design of BOSS_DESIGNS) {
      const option = document.createElement("option");
      option.value = design.id;
      option.textContent = `${design.name} (${bossWeakLabel({ design })})`;
      debugBossSelectEl.append(option);
    }
  }
  if (debugBossSelectEl) debugBossSelectEl.value = game.debugBossId || BOSS_DESIGNS[0].id;
}

function handleDebugCommandKey(key) {
  if (key.length !== 1 || !/[a-z]/.test(key)) return;
  debugCommandBuffer = `${debugCommandBuffer}${key}`.slice(-5);
  if (debugCommandBuffer === "debug") {
    debugCommandBuffer = "";
    toggleDebugMode();
  }
}

function grantDebugLetters() {
  if (!debugMode || !debugLettersEl) return;
  const letters = normalizeKana(debugLettersEl.value || "").slice(0, INVENTORY_LIMIT);
  if (!letters) return;
  for (const char of letters) {
    if (game.inventory.length >= INVENTORY_LIMIT) game.inventory.shift();
    game.inventory.push(char);
  }
  normalizeSelectedLetterIndex();
  if (game.selectedLetterIndex == null && game.inventory.length) game.selectedLetterIndex = 0;
  setMessage(`Debug letters: ${letters}`);
  updateHud();
}

function debugSkipPhase() {
  if (!debugMode) return;
  if (game.mode === "upgrade") {
    advanceAfterUpgrade();
    return;
  }
  if (["phase", "final", "pause", "title"].includes(game.mode)) {
    game.mode = "phase";
    overlay.hidden = true;
    enterUpgrade();
  }
}

function debugStartBoss() {
  if (!debugMode) return;
  game.debugBossId = debugBossSelectEl?.value || BOSS_DESIGNS[0].id;
  game.phase = Math.max(3, Math.ceil(game.phase / 3) * 3);
  overlay.hidden = true;
  startFinalBattle();
  updateHud();
}

async function prepareRankingSubmission() {
  const entry = buildRankingEntry();
  if (!entry) return;
  if (entry.usedLetters.length) {
    renderRankingCommentForm(entry);
    return;
  }
  await submitRankingEntry(entry);
}

function buildRankingEntry() {
  if (game.score <= 0) return null;
  const reachedStages = Math.max(1, game.stagesCleared, game.phase);
  return {
    name: readPlayerName(),
    stages: reachedStages,
    score: game.score,
    usedLetters: game.usedUpgradeLetters.slice(0, 32),
    date: new Date().toISOString(),
  };
}

function renderRankingCommentForm(entry) {
  const hint = overlay.querySelector(".hint");
  const allowedLetters = uniqueLetters(entry.usedLetters);
  let comment = "";
  hint.innerHTML = "";
  const form = document.createElement("form");
  form.className = "ranking-comment-form";
  const title = document.createElement("strong");
  title.textContent = "ランキングコメント";
  const output = document.createElement("span");
  output.className = "ranking-comment-output";
  output.textContent = "文字を選んでください";
  const bank = document.createElement("span");
  bank.className = "ranking-comment-bank";
  allowedLetters.forEach((char) => {
    const tile = document.createElement("button");
    tile.type = "button";
    tile.className = "ranking-comment-tile";
    tile.textContent = char;
    tile.addEventListener("click", () => {
      if (comment.length >= RANKING_COMMENT_LIMIT) return;
      comment = sanitizeRankingComment(`${comment}${char}`, allowedLetters);
      output.textContent = comment || "文字を選んでください";
    });
    bank.append(tile);
  });
  const note = document.createElement("span");
  note.className = "ranking-comment-note";
  note.textContent = `使える文字: ${allowedLetters.join(" ")}`;
  const actions = document.createElement("span");
  actions.className = "ranking-comment-actions";
  const undo = document.createElement("button");
  undo.type = "button";
  undo.textContent = "1文字戻す";
  undo.addEventListener("click", () => {
    comment = comment.slice(0, -1);
    output.textContent = comment || "文字を選んでください";
  });
  const clear = document.createElement("button");
  clear.type = "button";
  clear.textContent = "消す";
  clear.addEventListener("click", () => {
    comment = "";
    output.textContent = "文字を選んでください";
  });
  const submit = document.createElement("button");
  submit.type = "submit";
  submit.textContent = "送信";
  actions.append(undo, clear, submit);
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    submit.disabled = true;
    entry.comment = sanitizeRankingComment(comment, allowedLetters);
    const rankings = await submitRankingEntry(entry);
    renderRankingResult(hint, rankings, entry);
  });
  form.append(title, output, bank, note, actions);
  hint.append(form);
  keys.clear();
}

async function submitRankingEntry(entry) {
  try {
    const response = await fetch(RANKING_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(entry),
    });
    if (!response.ok) throw new Error("Ranking API unavailable");
    const rankings = await response.json();
    const ranked = rankEntries(rankings);
    renderRankings(ranked);
    return ranked;
  } catch {
    saveLocalRanking(entry);
    const ranked = readLocalRankings();
    renderRankings(ranked);
    return ranked;
  }
}

function renderRankingResult(container, rankings, entry) {
  container.innerHTML = "";
  const wrapper = document.createElement("div");
  wrapper.className = "ranking-result";
  const title = document.createElement("strong");
  title.textContent = entry.comment ? `送信: 「${entry.comment}」` : "ランキング送信しました";
  const list = document.createElement("ol");
  rankEntries(rankings).forEach((rankedEntry, index) => {
    const item = document.createElement("li");
    const comment = rankedEntry.comment ? `「${rankedEntry.comment}」` : "";
    item.textContent = `${index + 1}. ${rankedEntry.name} - ${rankedEntry.stages} stages / ${rankedEntry.score} ${comment}`;
    list.append(item);
  });
  wrapper.append(title, list);
  container.append(wrapper);
}

async function loadRankings() {
  renderRankings(await fetchRankings());
}

async function fetchRankings() {
  try {
    const response = await fetch(RANKING_ENDPOINT);
    if (!response.ok) throw new Error("Ranking API unavailable");
    const rankings = await response.json();
    return rankEntries(rankings);
  } catch {
    return readLocalRankings();
  }
}

function isRankingCandidate(entry, rankings) {
  const ranked = rankEntries([...rankings, entry]);
  return ranked.some((rankedEntry) => rankedEntry.name === entry.name && rankedEntry.date === entry.date)
    && ranked.findIndex((rankedEntry) => rankedEntry.name === entry.name && rankedEntry.date === entry.date) < RANKING_LIMIT;
}

function sanitizeRankingComment(comment, allowedLetters) {
  const allowed = new Set(allowedLetters);
  return [...normalizeKana(comment || "")]
    .filter((char) => allowed.has(char))
    .join("")
    .slice(0, RANKING_COMMENT_LIMIT);
}

function uniqueLetters(letters) {
  return [...new Set((letters || []).map((item) => normalizeKana(String(item))[0]).filter(Boolean))];
}

function readPlayerName() {
  const stored = localStorage.getItem("vbg-player-name");
  if (stored) return stored;
  const generated = `Player-${Math.floor(1000 + Math.random() * 9000)}`;
  localStorage.setItem("vbg-player-name", generated);
  return generated;
}


function saveLocalRanking(entry) {
  const rankings = rankEntries([...readLocalRankings(), entry]);
  localStorage.setItem("vbg-rankings", JSON.stringify(rankings.slice(0, RANKING_LIMIT)));
}

function readLocalRankings() {
  try {
    return rankEntries(JSON.parse(localStorage.getItem("vbg-rankings") || "[]"));
  } catch {
    return [];
  }
}

function rankEntries(entries) {
  return (Array.isArray(entries) ? entries : [])
    .filter((entry) => entry && Number.isFinite(entry.stages) && Number.isFinite(entry.score))
    .sort((a, b) => b.stages - a.stages || b.score - a.score || String(b.date || "").localeCompare(String(a.date || "")))
    .slice(0, RANKING_LIMIT);
}

function renderRankings(rankings) {
  rankingListEl.innerHTML = "";
  if (!rankings.length) {
    const item = document.createElement("li");
    item.textContent = "No runs yet";
    rankingListEl.append(item);
    return;
  }
  rankings.forEach((entry, index) => {
    const item = document.createElement("li");
    const comment = entry.comment ? `「${entry.comment}」` : "";
    item.textContent = `${index + 1}. ${entry.name} - ${entry.stages} stages / ${entry.score} ${comment}`;
    rankingListEl.append(item);
  });
}

function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function readKeyPreset() {
  const stored = localStorage.getItem("vbg-key-preset");
  return KEY_PRESETS[stored] ? stored : "standard";
}

function setKeyPreset(value) {
  keyPreset = KEY_PRESETS[value] ? value : "standard";
  localStorage.setItem("vbg-key-preset", keyPreset);
  keys.clear();
  updateKeyPresetUi();
}

function updateKeyPresetUi() {
  if (keyPresetEl) keyPresetEl.value = keyPreset;
  if (controlHintEl && game.mode !== "upgrade") controlHintEl.textContent = KEY_PRESETS[keyPreset].hint;
}

function normalizeInputKey(event) {
  return event.key.toLowerCase();
}

function keyAction(key) {
  return KEY_PRESETS[keyPreset].keys[key] || null;
}

function isActionPressed(action) {
  return [...keys].some((key) => keyAction(key) === action);
}

function shouldPreventKey(key) {
  return Boolean(keyAction(key)) || ["enter", "escape", " "].includes(key);
}

function isTextEntryTarget(target) {
  return target instanceof HTMLInputElement
    || target instanceof HTMLTextAreaElement
    || target instanceof HTMLSelectElement
    || Boolean(target?.isContentEditable);
}

function handleStartButton() {
  if (game.mode === "upgrade") {
    forgeSelectedWord();
    return;
  }
  startGame();
}

startButton.addEventListener("click", handleStartButton);
keyPresetEl?.addEventListener("change", () => {
  setKeyPreset(keyPresetEl.value);
});
debugInvincibleEl?.addEventListener("change", () => {
  game.debugInvincible = Boolean(debugInvincibleEl.checked);
  setMessage(game.debugInvincible ? "Debug invincible on" : "Debug invincible off");
});
debugGrantLettersEl?.addEventListener("click", grantDebugLetters);
debugSkipPhaseEl?.addEventListener("click", debugSkipPhase);
debugBossSelectEl?.addEventListener("change", () => {
  game.debugBossId = debugBossSelectEl.value;
});
debugStartBossEl?.addEventListener("click", debugStartBoss);

window.addEventListener("keydown", (event) => {
  if (isTextEntryTarget(event.target)) return;
  const key = normalizeInputKey(event);
  handleDebugCommandKey(key);
  if (shouldPreventKey(key)) event.preventDefault();
  if (key === "enter" && !["phase", "final"].includes(game.mode)) handleStartButton();
  if (key === "escape") togglePause();
  if (key === " " && !event.repeat) cycleShotAttribute();
  if (keyAction(key) === "letterSelect" && !event.repeat) cycleSelectedLetter();
  if (keyAction(key) === "letterShot" && !event.repeat) fireStoredLetter();
  keys.add(key);
});

window.addEventListener("keyup", (event) => {
  if (isTextEntryTarget(event.target)) return;
  const key = normalizeInputKey(event);
  keys.delete(key);
});

updateKeyPresetUi();
syncDebugPanel();
updateHud();
loadRankings();
draw();
