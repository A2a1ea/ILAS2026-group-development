const canvas = document.querySelector("#game");
const ctx = canvas.getContext("2d");
const scoreEl = document.querySelector("#score");
const timeEl = document.querySelector("#time");
const bestEl = document.querySelector("#best");
const overlay = document.querySelector("#overlay");
const startButton = document.querySelector("#startButton");

const WIDTH = canvas.width;
const HEIGHT = canvas.height;
const keys = new Set();
const bg = new Image();
bg.src = "assets/courtyard-bg.png";

let state = createState();
let lastFrame = 0;
let running = false;
let pointerActive = false;
let pointerTarget = null;

bestEl.textContent = localStorage.getItem("lanternDashBest") || "0";

function createState() {
  return {
    score: 0,
    time: 45,
    player: { x: WIDTH * 0.5, y: HEIGHT * 0.62, r: 18, speed: 285 },
    stars: Array.from({ length: 7 }, makeStar),
    shadows: Array.from({ length: 5 }, makeShadow),
    particles: [],
  };
}

function makeStar() {
  return {
    x: 70 + Math.random() * (WIDTH - 140),
    y: 70 + Math.random() * (HEIGHT - 140),
    r: 11 + Math.random() * 5,
    pulse: Math.random() * Math.PI * 2,
  };
}

function makeShadow() {
  const angle = Math.random() * Math.PI * 2;
  const speed = 65 + Math.random() * 75;
  return {
    x: 80 + Math.random() * (WIDTH - 160),
    y: 80 + Math.random() * (HEIGHT - 160),
    r: 20 + Math.random() * 16,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
  };
}

function startGame() {
  state = createState();
  running = true;
  lastFrame = performance.now();
  overlay.hidden = true;
  canvas.focus();
  requestAnimationFrame(loop);
}

function endGame() {
  running = false;
  const best = Math.max(Number(localStorage.getItem("lanternDashBest") || 0), state.score);
  localStorage.setItem("lanternDashBest", String(best));
  bestEl.textContent = best;
  overlay.hidden = false;
  overlay.querySelector("h1").textContent = "Time Up";
  overlay.querySelector("p").textContent = `Final score: ${state.score}. Ready for another run?`;
  startButton.textContent = "Restart";
}

function loop(now) {
  if (!running) return;
  const dt = Math.min((now - lastFrame) / 1000, 0.033);
  lastFrame = now;
  update(dt);
  draw();
  requestAnimationFrame(loop);
}

function update(dt) {
  state.time -= dt;
  if (state.time <= 0) {
    state.time = 0;
    draw();
    endGame();
    return;
  }

  movePlayer(dt);
  moveShadows(dt);
  collectStars();
  hitShadows();
  updateParticles(dt);
  updateHud();
}

function movePlayer(dt) {
  let dx = 0;
  let dy = 0;
  if (keys.has("arrowleft") || keys.has("a")) dx -= 1;
  if (keys.has("arrowright") || keys.has("d")) dx += 1;
  if (keys.has("arrowup") || keys.has("w")) dy -= 1;
  if (keys.has("arrowdown") || keys.has("s")) dy += 1;

  if (pointerTarget) {
    dx += (pointerTarget.x - state.player.x) / 90;
    dy += (pointerTarget.y - state.player.y) / 90;
  }

  const len = Math.hypot(dx, dy) || 1;
  state.player.x = clamp(state.player.x + (dx / len) * state.player.speed * dt, state.player.r, WIDTH - state.player.r);
  state.player.y = clamp(state.player.y + (dy / len) * state.player.speed * dt, state.player.r, HEIGHT - state.player.r);
}

function moveShadows(dt) {
  for (const shadow of state.shadows) {
    shadow.x += shadow.vx * dt;
    shadow.y += shadow.vy * dt;
    if (shadow.x < shadow.r || shadow.x > WIDTH - shadow.r) shadow.vx *= -1;
    if (shadow.y < shadow.r || shadow.y > HEIGHT - shadow.r) shadow.vy *= -1;
    shadow.x = clamp(shadow.x, shadow.r, WIDTH - shadow.r);
    shadow.y = clamp(shadow.y, shadow.r, HEIGHT - shadow.r);
  }
}

function collectStars() {
  for (let i = state.stars.length - 1; i >= 0; i -= 1) {
    const star = state.stars[i];
    if (distance(star, state.player) < star.r + state.player.r) {
      state.score += 10;
      state.time = Math.min(state.time + 2.5, 60);
      burst(star.x, star.y, "#ffd36e", 12);
      state.stars.splice(i, 1, makeStar());
    }
  }
}

function hitShadows() {
  for (const shadow of state.shadows) {
    if (distance(shadow, state.player) < shadow.r + state.player.r) {
      state.time = Math.max(0, state.time - 4);
      shadow.x = 80 + Math.random() * (WIDTH - 160);
      shadow.y = 80 + Math.random() * (HEIGHT - 160);
      burst(state.player.x, state.player.y, "#73e3ff", 10);
    }
  }
}

function updateParticles(dt) {
  state.particles = state.particles.filter((p) => {
    p.life -= dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    return p.life > 0;
  });
}

function burst(x, y, color, count) {
  for (let i = 0; i < count; i += 1) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 70 + Math.random() * 150;
    state.particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      color,
      life: 0.45 + Math.random() * 0.35,
    });
  }
}

function updateHud() {
  scoreEl.textContent = state.score;
  timeEl.textContent = Math.ceil(state.time);
}

function draw() {
  if (bg.complete && bg.naturalWidth) {
    ctx.drawImage(bg, 0, 0, WIDTH, HEIGHT);
  } else {
    ctx.fillStyle = "#102342";
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
  }

  ctx.fillStyle = "rgba(3, 9, 19, 0.22)";
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
  drawStars();
  drawShadows();
  drawParticles();
  drawPlayer();
}

function drawStars() {
  for (const star of state.stars) {
    star.pulse += 0.045;
    const radius = star.r + Math.sin(star.pulse) * 2;
    ctx.save();
    ctx.translate(star.x, star.y);
    ctx.rotate(star.pulse * 0.22);
    ctx.fillStyle = "#ffd36e";
    ctx.shadowColor = "#ffd36e";
    ctx.shadowBlur = 18;
    ctx.beginPath();
    for (let i = 0; i < 10; i += 1) {
      const a = (Math.PI * 2 * i) / 10 - Math.PI / 2;
      const r = i % 2 === 0 ? radius : radius * 0.45;
      ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
}

function drawShadows() {
  for (const shadow of state.shadows) {
    const gradient = ctx.createRadialGradient(shadow.x, shadow.y, 4, shadow.x, shadow.y, shadow.r);
    gradient.addColorStop(0, "rgba(2, 7, 17, 0.88)");
    gradient.addColorStop(1, "rgba(2, 7, 17, 0.16)");
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(shadow.x, shadow.y, shadow.r, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawPlayer() {
  const { x, y, r } = state.player;
  const glow = ctx.createRadialGradient(x, y, 2, x, y, r * 3.4);
  glow.addColorStop(0, "rgba(255, 229, 146, 0.95)");
  glow.addColorStop(0.35, "rgba(115, 227, 255, 0.4)");
  glow.addColorStop(1, "rgba(115, 227, 255, 0)");
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(x, y, r * 3.4, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#fff0a6";
  ctx.strokeStyle = "#241606";
  ctx.lineWidth = 4;
  roundRect(ctx, x - r, y - r * 1.1, r * 2, r * 2.2, 7);
  ctx.fill();
  ctx.stroke();

  ctx.strokeStyle = "#73e3ff";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(x, y - r * 1.1, r * 0.78, Math.PI, 0);
  ctx.stroke();
}

function drawParticles() {
  for (const p of state.particles) {
    ctx.globalAlpha = Math.max(p.life, 0);
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
}

function roundRect(context, x, y, w, h, r) {
  context.beginPath();
  context.moveTo(x + r, y);
  context.arcTo(x + w, y, x + w, y + h, r);
  context.arcTo(x + w, y + h, x, y + h, r);
  context.arcTo(x, y + h, x, y, r);
  context.arcTo(x, y, x + w, y, r);
  context.closePath();
}

function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function eventToCanvasPoint(event) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: ((event.clientX - rect.left) / rect.width) * WIDTH,
    y: ((event.clientY - rect.top) / rect.height) * HEIGHT,
  };
}

startButton.addEventListener("click", startGame);

window.addEventListener("keydown", (event) => {
  const key = event.key.toLowerCase();
  if (["arrowleft", "arrowright", "arrowup", "arrowdown", "w", "a", "s", "d"].includes(key)) {
    event.preventDefault();
    keys.add(key);
  }
});

window.addEventListener("keyup", (event) => {
  keys.delete(event.key.toLowerCase());
});

canvas.addEventListener("pointerdown", (event) => {
  pointerActive = true;
  pointerTarget = eventToCanvasPoint(event);
  canvas.setPointerCapture(event.pointerId);
});

canvas.addEventListener("pointermove", (event) => {
  if (pointerActive) pointerTarget = eventToCanvasPoint(event);
});

canvas.addEventListener("pointerup", () => {
  pointerActive = false;
  pointerTarget = null;
});

draw();
