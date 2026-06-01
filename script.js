const canvas = document.querySelector("#game");
const ctx = canvas.getContext("2d");
const scoreEl = document.querySelector("#score");
const hpEl = document.querySelector("#hp");
const timeEl = document.querySelector("#time");
const stateEl = document.querySelector("#best");
const overlay = document.querySelector("#overlay");
const startButton = document.querySelector("#startButton");

const WIDTH = canvas.width;
const HEIGHT = canvas.height;
const PLAYER_RADIUS = 14;
const HIT_RADIUS = 4;
const keys = new Set();

let game = createGame("title");
let lastFrame = 0;

function createGame(mode = "title") {
  return {
    mode,
    score: 0,
    time: 0,
    spawnTimer: 0,
    bossTimer: 0,
    kills: 0,
    hits: 0,
    scroll: 0,
    flash: 0,
    player: {
      x: WIDTH / 2,
      y: HEIGHT - 92,
      hp: 5,
      invuln: 0,
      shotCooldown: 0,
      speed: 270,
      slowSpeed: 125,
    },
    playerBullets: [],
    enemyBullets: [],
    enemies: [],
    particles: [],
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
  game.scroll += dt * (game.mode === "boss" ? 45 : 110);
  game.flash = Math.max(0, game.flash - dt);
  updatePlayer(dt);
  updatePlayerBullets(dt);
  updateEnemies(dt);
  updateEnemyBullets(dt);
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
    spawnEnemy();
    game.spawnTimer = Math.max(0.35, 1.15 - game.time * 0.012);
  }

  if (game.time >= 42) {
    game.mode = "boss";
    game.enemies.length = 0;
    game.enemyBullets.length = 0;
    game.boss = {
      x: WIDTH / 2,
      y: -70,
      hp: 420,
      maxHp: 420,
      radius: 42,
      phase: 0,
      attackTimer: 0,
      entry: 0,
    };
  }
}

function updatePlayer(dt) {
  const p = game.player;
  let dx = 0;
  let dy = 0;
  if (keys.has("arrowleft")) dx -= 1;
  if (keys.has("arrowright")) dx += 1;
  if (keys.has("arrowup")) dy -= 1;
  if (keys.has("arrowdown")) dy += 1;
  const speed = keys.has("shift") ? p.slowSpeed : p.speed;
  const len = Math.hypot(dx, dy) || 1;
  p.x = clamp(p.x + (dx / len) * speed * dt, PLAYER_RADIUS, WIDTH - PLAYER_RADIUS);
  p.y = clamp(p.y + (dy / len) * speed * dt, 78, HEIGHT - PLAYER_RADIUS);
  p.invuln = Math.max(0, p.invuln - dt);
  p.shotCooldown = Math.max(0, p.shotCooldown - dt);

  if (keys.has("z") && p.shotCooldown <= 0) {
    game.playerBullets.push({ x: p.x - 7, y: p.y - 18, vx: 0, vy: -720, radius: 4, damage: 8 });
    game.playerBullets.push({ x: p.x + 7, y: p.y - 18, vx: 0, vy: -720, radius: 4, damage: 8 });
    p.shotCooldown = 0.09;
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
  const roll = Math.random();
  const x = 50 + Math.random() * (WIDTH - 100);
  if (roll < 0.5) {
    game.enemies.push({ type: "A", x, y: -24, vx: 0, vy: 96, hp: 22, radius: 18, score: 100, shootTimer: 0.8 });
  } else if (roll < 0.82) {
    game.enemies.push({ type: "B", x, y: -24, baseX: x, vx: 0, vy: 72, hp: 35, radius: 21, score: 160, shootTimer: 0.55, wave: Math.random() * 8 });
  } else {
    game.enemies.push({ type: "C", x, y: -30, vx: 0, vy: 125, hp: 55, radius: 24, score: 240, shootTimer: 0.9, hold: 2.6 });
  }
}

function updateEnemies(dt) {
  for (const e of game.enemies) {
    if (e.type === "B") {
      e.wave += dt * 4.2;
      e.x = clamp(e.baseX + Math.sin(e.wave) * 60, e.radius, WIDTH - e.radius);
    }

    if (e.type === "C" && e.y > 145 && e.hold > 0) {
      e.hold -= dt;
    } else {
      e.y += e.vy * dt;
    }

    e.shootTimer -= dt;
    if (e.shootTimer <= 0) {
      fireEnemyPattern(e);
      e.shootTimer = e.type === "C" ? 1.1 : 1.35;
    }
  }
  game.enemies = game.enemies.filter((e) => e.y < HEIGHT + 50 && e.hp > 0);
}

function fireEnemyPattern(enemy) {
  if (enemy.type === "A") {
    fireAimed(enemy.x, enemy.y, 165, 7);
  } else if (enemy.type === "B") {
    for (let i = -1; i <= 1; i += 1) fireBullet(enemy.x, enemy.y, i * 55, 190, 7, "#ff8db3");
  } else {
    fireCircle(enemy.x, enemy.y, 10, 140, "#ffcf6f");
  }
}

function updateBoss(dt) {
  const boss = game.boss;
  if (!boss) return;
  boss.entry += dt;
  boss.y = Math.min(105, boss.y + dt * 90);
  boss.attackTimer -= dt;

  if (boss.attackTimer <= 0 && boss.y >= 104) {
    boss.phase = boss.hp < boss.maxHp * 0.35 ? 3 : (boss.phase + 1) % 3;
    if (boss.phase === 0) fireFan(boss.x, boss.y + 24, Math.PI / 2, 11, 0.9, 190, "#ff7da8");
    if (boss.phase === 1) fireCircle(boss.x, boss.y + 10, 22, 135, "#ffd36e");
    if (boss.phase === 2) {
      for (let i = 0; i < 5; i += 1) fireAimed(boss.x + (i - 2) * 24, boss.y + 30, 210, 7);
    }
    if (boss.phase === 3) {
      fireCircle(boss.x, boss.y + 10, 28, 165, "#ff5b93", boss.entry * 0.9);
      fireFan(boss.x, boss.y + 28, Math.PI / 2, 13, 1.1, 225, "#79e7ff");
    }
    boss.attackTimer = boss.phase === 3 ? 0.72 : 1.05;
  }

  boss.x = WIDTH / 2 + Math.sin(game.time * 1.2) * 92;
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
  for (const b of game.enemyBullets) {
    b.x += b.vx * dt;
    b.y += b.vy * dt;
  }
  game.enemyBullets = game.enemyBullets.filter((b) => b.x > -40 && b.x < WIDTH + 40 && b.y > -50 && b.y < HEIGHT + 50);
}

function checkCollisions() {
  for (let i = game.playerBullets.length - 1; i >= 0; i -= 1) {
    const bullet = game.playerBullets[i];
    let consumed = false;
    for (const enemy of game.enemies) {
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
      if (game.boss.hp <= 0) clearGame();
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
  p.hp -= 1;
  p.invuln = 1.4;
  game.hits += 1;
  game.flash = 0.2;
  burst(p.x, p.y, "#ff6b9a", 18);
  if (p.hp <= 0) finish("game_over");
}

function clearGame() {
  game.score += 2500 + game.player.hp * 500;
  finish("game_clear");
}

function finish(mode) {
  game.mode = mode;
  updateHud();
  overlay.hidden = false;
  overlay.querySelector("h1").textContent = mode === "game_clear" ? "Stage Clear" : "Game Over";
  overlay.querySelector("p").textContent = `Score ${game.score} / Kills ${game.kills} / Hits ${game.hits}`;
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
  drawPlayer();
  drawParticles();
  drawBossHp();
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
  ctx.fillStyle = "#baf6ff";
  ctx.shadowColor = "#79e7ff";
  ctx.shadowBlur = 10;
  for (const b of game.playerBullets) {
    ctx.beginPath();
    ctx.roundRect(b.x - 3, b.y - 12, 6, 18, 3);
    ctx.fill();
  }
  ctx.shadowBlur = 0;
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

function updateHud() {
  scoreEl.textContent = game.score;
  hpEl.textContent = game.player.hp;
  timeEl.textContent = game.mode === "boss" ? "Boss" : Math.floor(game.time);
  stateEl.textContent = game.mode.replace("_", " ");
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
  if (["arrowleft", "arrowright", "arrowup", "arrowdown", "z", "shift", "enter", "escape"].includes(key)) event.preventDefault();
  if (key === "enter" && !["playing", "boss"].includes(game.mode)) startGame();
  if (key === "escape") togglePause();
  keys.add(key);
});

window.addEventListener("keyup", (event) => {
  keys.delete(event.key.toLowerCase());
});

updateHud();
draw();
