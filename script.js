const canvas = document.querySelector("#game");
const ctx = canvas.getContext("2d");
const scoreEl = document.querySelector("#score");
const hpEl = document.querySelector("#hp");
const timeEl = document.querySelector("#time");
const stateEl = document.querySelector("#best");
const letterRackEl = document.querySelector("#letterRack");
const effectsEl = document.querySelector("#effects");
const rankingListEl = document.querySelector("#rankingList");
const overlay = document.querySelector("#overlay");
const startButton = document.querySelector("#startButton");

const WIDTH = canvas.width;
const HEIGHT = canvas.height;
const PLAYER_RADIUS = 14;
const HIT_RADIUS = 4;
const STAGE_DURATION = 38;
const MAX_HP = 5;
const MAX_ACTIVE_ENEMIES = 5;
const FIRST_STAGE_SPAWN_DELAY = 1.95;
const RANKING_ENDPOINT = "/api/rankings/stages";
const WORD_EFFECTS = [
  { word: "fast", label: "Fast", target: "self", duration: 8 },
  { word: "slow", label: "Slow", target: "enemy", duration: 7 },
  { word: "life", label: "Life", target: "self", duration: 0 },
];
const keys = new Set();
let debugInvincible = false;

let game = createGame("title");
let lastFrame = 0;

function createGame(mode = "title") {
  return {
    mode,
    score: 0,
    time: 0,
    stage: 1,
    stageTime: 0,
    stagesCleared: 0,
    spawnTimer: mode === "playing" ? 1.2 : 0,
    letterTimer: 1.2,
    bossTimer: 0,
    kills: 0,
    hits: 0,
    scroll: 0,
    flash: 0,
    message: mode === "title" ? "Shoot falling letters to craft fast, slow, and life." : "",
    messageTimer: 0,
    inventory: [],
    effects: {
      fast: 0,
      slow: 0,
    },
    player: {
      x: WIDTH / 2,
      y: HEIGHT - 92,
      hp: MAX_HP,
      invuln: 0,
      shotCooldown: 0,
      speed: 270,
      slowSpeed: 125,
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
  game = createGame("playing");
  lastFrame = performance.now();
  overlay.hidden = true;
  canvas.focus();
  requestAnimationFrame(loop);
}

function loop(now) {
  const dt = Math.min((now - lastFrame) / 1000, 0.033);
  lastFrame = now;
  update(dt);
  draw();
  if (["playing", "boss", "pause"].includes(game.mode)) requestAnimationFrame(loop);
}

function update(dt) {
  if (game.mode === "pause") return;
  game.time += dt;
  game.stageTime += dt;
  game.scroll += dt * (game.mode === "boss" ? 45 : 110);
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
  if (game.mode !== "playing") {
    updateBoss(dt);
    return;
  }

  game.spawnTimer -= dt;
  if (game.spawnTimer <= 0) {
    if (game.enemies.length < MAX_ACTIVE_ENEMIES) spawnEnemy();
    game.spawnTimer = enemySpawnDelay();
  }

  if (game.stageTime >= STAGE_DURATION) {
    game.mode = "boss";
    game.enemies.length = 0;
    game.enemyBullets.length = 0;
    const maxHp = Math.round(360 + game.stage * 95);
    game.boss = {
      x: WIDTH / 2,
      y: -70,
      hp: maxHp,
      maxHp,
      radius: 40 + Math.min(10, game.stage * 2),
      phase: 0,
      attackTimer: 0,
      entry: 0,
    };
    setMessage(`Stage ${game.stage} boss incoming`);
  }
}

function updateLetterSpawner(dt) {
  if (!["playing", "boss"].includes(game.mode)) return;
  game.letterTimer -= dt;
  if (game.letterTimer <= 0) {
    spawnLetter();
    game.letterTimer = Math.max(0.42, 1.35 - game.stage * 0.035);
  }
}

function updatePlayer(dt) {
  const p = game.player;
  let dx = 0;
  let dy = 0;
  if (keys.has("a")) dx -= 1;
  if (keys.has("d")) dx += 1;
  if (keys.has("w")) dy -= 1;
  if (keys.has("s")) dy += 1;
  const speedBoost = game.effects.fast > 0 ? 1.45 : 1;
  const speed = (keys.has("shift") ? p.slowSpeed : p.speed) * speedBoost;
  const len = Math.hypot(dx, dy) || 1;
  p.x = clamp(p.x + (dx / len) * speed * dt, PLAYER_RADIUS, WIDTH - PLAYER_RADIUS);
  p.y = clamp(p.y + (dy / len) * speed * dt, 78, HEIGHT - PLAYER_RADIUS);
  p.invuln = Math.max(0, p.invuln - dt);
  p.shotCooldown = Math.max(0, p.shotCooldown - dt);

  if (keys.has("j") && p.shotCooldown <= 0) {
    game.playerBullets.push({ x: p.x - 7, y: p.y - 18, vx: 0, vy: -720, radius: 4, damage: 8, type: "normal" });
    game.playerBullets.push({ x: p.x + 7, y: p.y - 18, vx: 0, vy: -720, radius: 4, damage: 8, type: "normal" });
    p.shotCooldown = 0.09;
  }
}

function updateEffects(dt) {
  for (const key of Object.keys(game.effects)) {
    game.effects[key] = Math.max(0, game.effects[key] - dt);
  }
}

function updatePlayerBullets(dt) {
  for (const b of game.playerBullets) {
    b.x += b.vx * dt;
    b.y += b.vy * dt;
  }
  game.playerBullets = game.playerBullets.filter((b) => b.y > -20);
}

function spawnEnemy() {
  const type = chooseEnemyType();
  const x = 50 + Math.random() * (WIDTH - 100);
  const hpScale = 0.75 + (game.stage - 1) * 0.15;
  const speedScale = 0.72 + (game.stage - 1) * 0.08;
  if (type === "A") {
    game.enemies.push({ type: "A", x, y: -24, vx: 0, vy: 96 * speedScale, hp: Math.round(22 * hpScale), radius: 18, score: 100, shootTimer: 1.35 });
  } else if (type === "B") {
    game.enemies.push({ type: "B", x, y: -24, baseX: x, vx: 0, vy: 72 * speedScale, hp: Math.round(35 * hpScale), radius: 21, score: 160, shootTimer: 1.15, wave: Math.random() * 8 });
  } else {
    game.enemies.push({ type: "C", x, y: -30, vx: 0, vy: 125 * speedScale, hp: Math.round(55 * hpScale), radius: 24, score: 240, shootTimer: 1.35, hold: 2.6 });
  }
}

function enemySpawnDelay() {
  const stagePressure = Math.min(0.9, (game.stage - 1) * 0.14);
  const timePressure = Math.min(0.35, game.stageTime * 0.006);
  return Math.max(0.48, FIRST_STAGE_SPAWN_DELAY - stagePressure - timePressure);
}

function chooseEnemyType() {
  if (game.stage <= 1) return "A";
  const purpleChance = game.stage < 4 ? 0 : Math.min(0.26, (game.stage - 3) * 0.07);
  const yellowChance = Math.min(0.54, (game.stage - 1) * 0.14);
  const roll = Math.random();
  if (roll < purpleChance) return "C";
  if (roll < purpleChance + yellowChance) return "B";
  return "A";
}

function updateEnemies(dt) {
  const slowScale = enemySlowScale();
  const densityScale = stageDensityScale();
  for (const e of game.enemies) {
    if (e.type === "B") {
      e.wave += dt * 4.2 * slowScale;
      e.x = clamp(e.baseX + Math.sin(e.wave) * 60, e.radius, WIDTH - e.radius);
    }

    if (e.type === "C" && e.y > 145 && e.hold > 0) {
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
  game.enemies = game.enemies.filter((e) => e.y < HEIGHT + 50 && e.hp > 0);
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
    if (boss.phase === 0) fireFan(boss.x, boss.y + 24, Math.PI / 2, 7 + density * 2, 0.75, 165 + density * 10, "#ff7da8");
    if (boss.phase === 1) fireCircle(boss.x, boss.y + 10, 14 + density * 3, 118 + density * 8, "#ffd36e");
    if (boss.phase === 2) {
      const aimedCount = 3 + Math.min(5, density);
      for (let i = 0; i < aimedCount; i += 1) fireAimed(boss.x + (i - (aimedCount - 1) / 2) * 24, boss.y + 30, 185 + density * 8, 7);
    }
    if (boss.phase === 3) {
      fireCircle(boss.x, boss.y + 10, 18 + density * 3, 145 + density * 8, "#ff5b93", boss.entry * 0.9);
      fireFan(boss.x, boss.y + 28, Math.PI / 2, 9 + density * 2, 0.95, 195 + density * 8, "#79e7ff");
    }
    boss.attackTimer = Math.max(0.58, (boss.phase === 3 ? 0.9 : 1.25) - density * 0.05);
  }

  boss.x = WIDTH / 2 + Math.sin(game.time * 1.2 * slowScale) * 92;
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
  const slowScale = enemySlowScale();
  for (const b of game.enemyBullets) {
    b.x += b.vx * dt * slowScale;
    b.y += b.vy * dt * slowScale;
  }
  game.enemyBullets = game.enemyBullets.filter((b) => b.x > -40 && b.x < WIDTH + 40 && b.y > -50 && b.y < HEIGHT + 50);
}

function enemySlowScale() {
  return game.effects.slow > 0 ? 0.55 : 1;
}

function stageDensityScale() {
  return Math.min(8, Math.max(0, game.stage - 1));
}

function spawnLetter() {
  const alphabet = "aefilsowt";
  const char = alphabet[Math.floor(Math.random() * alphabet.length)];
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
  if (!["playing", "boss"].includes(game.mode)) return;
  game.inventory.push(letter.char);
  if (game.inventory.length > 18) game.inventory.shift();
  game.score += 25;
  burst(letter.x, letter.y, "#d6ff8f", 8);
  craftAvailableWords();
}

function fireStoredLetter() {
  if (!["playing", "boss"].includes(game.mode)) return;
  const char = game.inventory.pop();
  if (!char) {
    setMessage("No letter to discard");
    return;
  }
  game.playerBullets.push({
    type: "letter",
    char,
    x: game.player.x,
    y: game.player.y - 22,
    vx: 0,
    vy: -560,
    radius: 13,
    damage: 8,
  });
  setMessage(`Discarded ${char}`);
  craftAvailableWords();
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
    const index = game.inventory.indexOf(char);
    if (index >= 0) game.inventory.splice(index, 1);
  }
}

function countLetters(letters) {
  const counts = {};
  for (const char of letters) counts[char] = (counts[char] || 0) + 1;
  return counts;
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
        enemy.hp -= bullet.damage;
        consumed = true;
        burst(bullet.x, bullet.y, "#79e7ff", 4);
        if (enemy.hp <= 0) destroyEnemy(enemy);
        break;
      }
    }
    if (!consumed && game.boss && distance(bullet, game.boss) < bullet.radius + game.boss.radius) {
      game.boss.hp -= bullet.damage;
      consumed = true;
      burst(bullet.x, bullet.y, "#ffd36e", 3);
      if (game.boss.hp <= 0) {
        clearStage();
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
  burst(enemy.x, enemy.y, "#ffd36e", 12);
  enemy.y = HEIGHT + 100;
}

function damagePlayer() {
  const p = game.player;
  if (debugInvincible) return;
  p.hp -= 1;
  p.invuln = 1.4;
  game.hits += 1;
  game.flash = 0.2;
  burst(p.x, p.y, "#ff6b9a", 18);
  if (p.hp <= 0) finish("game_over");
}

function clearStage() {
  game.score += 1600 + game.stage * 450 + game.player.hp * 200;
  game.stagesCleared += 1;
  game.stage += 1;
  game.stageTime = 0;
  game.mode = "playing";
  game.boss = null;
  game.enemies.length = 0;
  game.enemyBullets.length = 0;
  game.playerBullets.length = 0;
  game.player.hp = Math.min(MAX_HP, game.player.hp + 1);
  game.spawnTimer = 1.1;
  game.letterTimer = 0.55;
  setMessage(`Stage ${game.stage - 1} clear. Stage ${game.stage} starts.`);
  submitRanking();
}

function finish(mode) {
  game.mode = mode;
  updateHud();
  submitRanking();
  overlay.hidden = false;
  overlay.querySelector("h1").textContent = "Game Over";
  overlay.querySelector("p").textContent = `Cleared ${game.stagesCleared} stages / Score ${game.score} / Kills ${game.kills} / Hits ${game.hits}`;
  startButton.textContent = "Back to Title";
}

function togglePause() {
  if (game.mode === "playing" || game.mode === "boss") {
    game.mode = "pause";
    overlay.hidden = false;
    overlay.querySelector("h1").textContent = "Paused";
    overlay.querySelector("p").textContent = "Press Esc to resume, or Enter to restart.";
    startButton.textContent = "Restart";
  } else if (game.mode === "pause") {
    game.mode = game.boss ? "boss" : "playing";
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
  if (keys.has("shift")) {
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
      ctx.fillStyle = "#baf6ff";
      ctx.shadowColor = "#79e7ff";
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.roundRect(b.x - 3, b.y - 12, 6, 18, 3);
      ctx.fill();
    }
  }
  ctx.restore();
}

function drawEnemies() {
  for (const e of game.enemies) {
    ctx.fillStyle = e.type === "A" ? "#ff8db3" : e.type === "B" ? "#ffd36e" : "#c99cff";
    ctx.shadowColor = ctx.fillStyle;
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.arc(e.x, e.y, e.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
  }
}

function drawBoss() {
  const b = game.boss;
  if (!b) return;
  ctx.fillStyle = "#ff6b9a";
  ctx.shadowColor = "#ff6b9a";
  ctx.shadowBlur = 24;
  ctx.beginPath();
  ctx.ellipse(b.x, b.y, b.radius * 1.25, b.radius, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#ffd36e";
  ctx.beginPath();
  ctx.arc(b.x, b.y + 4, b.radius * 0.42, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;
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
  const pct = clamp(game.boss.hp / game.boss.maxHp, 0, 1);
  ctx.fillStyle = "rgba(255, 255, 255, 0.16)";
  ctx.fillRect(32, 32, w, 8);
  ctx.fillStyle = "#ff6b9a";
  ctx.fillRect(32, 32, w * pct, 8);
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
  hpEl.textContent = game.player.hp;
  timeEl.textContent = game.mode === "boss" ? `${game.stage} Boss` : game.stage;
  stateEl.textContent = game.stagesCleared;
  letterRackEl.textContent = game.inventory.length ? game.inventory.join(" ") : "collect letters";
  const activeEffects = Object.entries(game.effects)
    .filter(([, time]) => time > 0)
    .map(([name, time]) => `${name} ${Math.ceil(time)}s`);
  effectsEl.textContent = activeEffects.length ? activeEffects.join(" / ") : "no active effects";
}

function setMessage(message) {
  game.message = message;
  game.messageTimer = 2.4;
}

async function submitRanking() {
  if (game.stagesCleared <= 0) return;
  const entry = {
    name: readPlayerName(),
    stages: game.stagesCleared,
    score: game.score,
    date: new Date().toISOString(),
  };
  try {
    await fetch(RANKING_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(entry),
    });
    await loadRankings();
  } catch {
    saveLocalRanking(entry);
    renderRankings(readLocalRankings());
  }
}

async function loadRankings() {
  try {
    const response = await fetch(RANKING_ENDPOINT);
    if (!response.ok) throw new Error("Ranking API unavailable");
    const rankings = await response.json();
    renderRankings(rankEntries(rankings));
  } catch {
    renderRankings(readLocalRankings());
  }
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
  localStorage.setItem("vbg-rankings", JSON.stringify(rankings.slice(0, 10)));
}

function readLocalRankings() {
  try {
    return rankEntries(JSON.parse(localStorage.getItem("vbg-rankings") || "[]"));
  } catch {
    return [];
  }
}

function rankEntries(entries) {
  const bestByName = new Map();
  for (const entry of entries) {
    if (!entry || !Number.isFinite(entry.stages) || !Number.isFinite(entry.score)) continue;
    const current = bestByName.get(entry.name);
    if (!current || entry.stages > current.stages || (entry.stages === current.stages && entry.score > current.score)) {
      bestByName.set(entry.name, entry);
    }
  }
  return [...bestByName.values()]
    .filter((entry) => entry && Number.isFinite(entry.stages) && Number.isFinite(entry.score))
    .sort((a, b) => b.stages - a.stages || b.score - a.score)
    .slice(0, 10);
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
    item.textContent = `${index + 1}. ${entry.name} - ${entry.stages} stages / ${entry.score}`;
    rankingListEl.append(item);
  });
}

function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

startButton.addEventListener("click", startGame);

window.addEventListener("keydown", (event) => {
  const key = event.key.toLowerCase();
  if (["a", "d", "w", "s", "j", "k", "shift", "enter", "escape", " "].includes(key)) event.preventDefault();
  if (key === "enter" && !["playing", "boss"].includes(game.mode)) startGame();
  if (key === "escape") togglePause();
  if (key === " ") debugInvincible = true;
  if (key === "k" && !event.repeat) fireStoredLetter();
  keys.add(key);
});

window.addEventListener("keyup", (event) => {
  const key = event.key.toLowerCase();
  if (key === " ") debugInvincible = false;
  keys.delete(key);
});

updateHud();
loadRankings();
draw();
