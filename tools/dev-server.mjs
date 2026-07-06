import { createReadStream, existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { createServer } from "node:http";
import { networkInterfaces } from "node:os";
import { createRequire } from "node:module";
import { dirname, extname, join, normalize, resolve, sep } from "node:path";
import { randomUUID } from "node:crypto";
import { WebSocketServer } from "ws";

const require = createRequire(import.meta.url);
const root = resolve(".");
const rankingFile = join(root, ".logs", "rankings.json");
const unknownWordsFile = join(root, ".logs", "unknown-words.json");
const wordsFile = join(root, "data", "words-ja.json");
const kuromoji = require("kuromoji");
const kuromojiDictPath = join(dirname(require.resolve("kuromoji/package.json")), "dict");
const conversionForms = new Map([
  ["やきそば", ["焼きそば"]],
]);
const port = readPort();
const host = readHost();
let tokenizerPromise = null;

const mimeTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".md": "text/markdown; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
};

const server = createServer((request, response) => {
  const url = new URL(request.url || "/", `http://${request.headers.host || "127.0.0.1"}`);
  if (url.pathname === "/api/rankings/stages") {
    handleRankings(request, response);
    return;
  }
  if (url.pathname === "/api/words/validate") {
    handleWordValidation(request, response, url);
    return;
  }

  const pathname = decodeURIComponent(url.pathname);
  const filePath = resolvePath(pathname);

  if (!filePath) {
    response.writeHead(403);
    response.end("Forbidden");
    return;
  }

  const target = existsSync(filePath) && statSync(filePath).isDirectory()
    ? join(filePath, "index.html")
    : filePath;

  if (!existsSync(target)) {
    response.writeHead(404);
    response.end("Not found");
    return;
  }

  response.writeHead(200, {
    "Content-Type": mimeTypes[extname(target)] || "application/octet-stream",
    "Cache-Control": "no-store",
  });
  createReadStream(target).pipe(response);
});

server.listen(port, host, () => {
  console.log(`Lantern Dash dev server: http://127.0.0.1:${port}/`);
  for (const url of networkUrls(port)) console.log(`Network URL: ${url}`);
});

const rooms = new Map();
const sockets = new Map();
const wss = new WebSocketServer({ server, path: "/ws/versus" });

wss.on("connection", (socket) => {
  const id = randomUUID();
  sockets.set(socket, { id, clientId: id, roomId: null, name: `P${id.slice(0, 4)}`, alive: true });
  sendSocket(socket, "hello", { id });

  socket.on("pong", () => {
    const meta = sockets.get(socket);
    if (meta) meta.alive = true;
  });

  socket.on("message", (raw) => {
    let message;
    try {
      message = JSON.parse(String(raw));
    } catch {
      sendSocket(socket, "error", { message: "Invalid JSON" });
      return;
    }
    handleVersusMessage(socket, message);
  });

  socket.on("close", () => {
    leaveVersusRoom(socket);
    sockets.delete(socket);
  });
});

setInterval(() => {
  for (const socket of wss.clients) {
    const meta = sockets.get(socket);
    if (!meta) continue;
    if (!meta.alive) {
      leaveVersusRoom(socket);
      sockets.delete(socket);
      socket.terminate();
      continue;
    }
    meta.alive = false;
    socket.ping();
  }
}, 5000);

function handleVersusMessage(socket, message) {
  if (message.type === "join") {
    joinVersusRoom(socket, message.roomId, message.name, message.clientId);
    return;
  }
  if (message.type === "state") {
    broadcastToRoom(socket, "peer-state", { state: message.state || {} });
    return;
  }
  if (message.type === "word") {
    broadcastToRoom(socket, "peer-word", { word: message.word || null });
    return;
  }
  if (message.type === "finish") {
    broadcastToRoom(socket, "peer-finish", {
      result: message.result,
      score: message.score,
      stagesCleared: message.stagesCleared,
    });
  }
}

function joinVersusRoom(socket, requestedRoomId, requestedName, requestedClientId) {
  leaveVersusRoom(socket);
  const meta = sockets.get(socket);
  if (!meta) return;
  meta.roomId = sanitizeRoomId(requestedRoomId);
  meta.name = String(requestedName || meta.name).slice(0, 18);
  meta.clientId = sanitizeClientId(requestedClientId || meta.clientId);
  if (!rooms.has(meta.roomId)) rooms.set(meta.roomId, new Set());
  replaceDuplicateClient(socket, meta.roomId, meta.clientId);
  rooms.get(meta.roomId).add(socket);
  sendSocket(socket, "joined", {
    roomId: meta.roomId,
    playerId: meta.id,
    peers: roomPeers(meta.roomId, socket),
  });
  broadcastRoster(meta.roomId, socket, "peer-joined", { id: meta.id, name: meta.name });
}

function leaveVersusRoom(socket) {
  const meta = sockets.get(socket);
  if (!meta?.roomId) return;
  const room = rooms.get(meta.roomId);
  if (room) {
    room.delete(socket);
    if (!room.size) rooms.delete(meta.roomId);
  }
  broadcastRoster(meta.roomId, socket, "peer-left", { id: meta.id, name: meta.name });
  meta.roomId = null;
}

function broadcastToRoom(sender, type, payload) {
  const meta = sockets.get(sender);
  if (!meta?.roomId) return;
  const room = rooms.get(meta.roomId);
  if (!room) return;
  for (const peer of room) {
    if (peer === sender || peer.readyState !== 1) continue;
    if (sockets.get(peer)?.clientId === meta.clientId) continue;
    sendSocket(peer, type, { ...payload, from: meta.id, name: meta.name });
  }
}

function replaceDuplicateClient(currentSocket, roomId, clientId) {
  const room = rooms.get(roomId);
  if (!room) return;
  for (const peer of [...room]) {
    if (peer === currentSocket) continue;
    if (sockets.get(peer)?.clientId !== clientId) continue;
    room.delete(peer);
    const peerMeta = sockets.get(peer);
    if (peerMeta) peerMeta.roomId = null;
    peer.close(1000, "duplicate client replaced");
  }
}

function broadcastRoster(roomId, sender, type, payload) {
  const room = rooms.get(roomId);
  if (!room) return;
  const senderMeta = sockets.get(sender);
  for (const peer of room) {
    if (peer === sender || peer.readyState !== 1) continue;
    if (sockets.get(peer)?.clientId === senderMeta?.clientId) continue;
    sendSocket(peer, type, {
      ...payload,
      from: senderMeta?.id,
      name: senderMeta?.name,
      peers: roomPeers(roomId, peer),
    });
  }
}

function roomPeers(roomId, exceptSocket) {
  const room = rooms.get(roomId);
  if (!room) return [];
  const exceptMeta = sockets.get(exceptSocket);
  return [...room]
    .filter((socket) => socket !== exceptSocket)
    .filter((socket) => sockets.get(socket)?.clientId !== exceptMeta?.clientId)
    .map((socket) => {
      const meta = sockets.get(socket);
      return { id: meta.id, name: meta.name };
    });
}

function sendSocket(socket, type, payload) {
  if (socket.readyState !== 1) return;
  socket.send(JSON.stringify({ type, ...payload }));
}

function sanitizeRoomId(roomId) {
  const cleaned = String(roomId || "default").replace(/[^\w-]/g, "").slice(0, 24);
  return cleaned || "default";
}

function sanitizeClientId(clientId) {
  const cleaned = String(clientId || "").replace(/[^\w-]/g, "").slice(0, 80);
  return cleaned || randomUUID();
}

function readPort() {
  const index = process.argv.indexOf("--port");
  const value = index >= 0 ? Number(process.argv[index + 1]) : Number(process.env.PORT || 5173);
  return Number.isInteger(value) && value > 0 ? value : 5173;
}

function readHost() {
  const index = process.argv.indexOf("--host");
  return index >= 0 ? String(process.argv[index + 1] || "0.0.0.0") : String(process.env.HOST || "0.0.0.0");
}

function networkUrls(targetPort) {
  if (host === "127.0.0.1" || host === "localhost") return [];
  return Object.values(networkInterfaces())
    .flat()
    .filter((item) => item && item.family === "IPv4" && !item.internal)
    .map((item) => `http://${item.address}:${targetPort}/`);
}

function resolvePath(pathname) {
  const cleanPath = normalize(pathname).replace(/^([/\\])+/, "");
  const filePath = resolve(root, cleanPath || "index.html");
  return filePath === root || filePath.startsWith(root + sep) ? filePath : null;
}

function handleRankings(request, response) {
  if (request.method === "GET") {
    sendJson(response, readRankings());
    return;
  }

  if (request.method !== "POST") {
    response.writeHead(405, { Allow: "GET, POST" });
    response.end("Method not allowed");
    return;
  }

  let body = "";
  request.on("data", (chunk) => {
    body += chunk;
    if (body.length > 4096) request.destroy();
  });
  request.on("end", () => {
    try {
      const entry = sanitizeRanking(JSON.parse(body));
      if (!entry) {
        response.writeHead(400);
        response.end("Invalid ranking entry");
        return;
      }
      const rankings = rankEntries([...readRankings(), entry]).slice(0, 10);
      writeRankings(rankings);
      sendJson(response, rankings);
    } catch {
      response.writeHead(400);
      response.end("Invalid JSON");
    }
  });
}

function sanitizeRanking(entry) {
  const name = String(entry?.name || "Player").replace(/[^\w -]/g, "").trim().slice(0, 18) || "Player";
  const stages = Math.floor(Number(entry?.stages));
  const score = Math.floor(Number(entry?.score));
  if (!Number.isFinite(stages) || stages < 1 || !Number.isFinite(score) || score < 0) return null;
  return {
    name,
    stages,
    score,
    date: new Date().toISOString(),
  };
}

function readRankings() {
  try {
    return rankEntries(JSON.parse(readFileSync(rankingFile, "utf8")));
  } catch {
    return [];
  }
}

function writeRankings(rankings) {
  mkdirSync(join(root, ".logs"), { recursive: true });
  writeFileSync(rankingFile, `${JSON.stringify(rankings, null, 2)}\n`);
}

function logUnknownWord(word) {
  const now = new Date().toISOString();
  const words = readUnknownWords();
  const current = words.find((entry) => entry.word === word);
  if (current) {
    current.count += 1;
    current.lastSeen = now;
  } else {
    words.push({ word, count: 1, firstSeen: now, lastSeen: now });
  }
  words.sort((a, b) => b.count - a.count || a.word.localeCompare(b.word, "ja"));
  mkdirSync(join(root, ".logs"), { recursive: true });
  writeFileSync(unknownWordsFile, `${JSON.stringify(words.slice(0, 300), null, 2)}\n`);
}

function readUnknownWords() {
  try {
    const words = JSON.parse(readFileSync(unknownWordsFile, "utf8"));
    return Array.isArray(words) ? words.filter((entry) => entry && typeof entry.word === "string") : [];
  } catch {
    return [];
  }
}

async function handleWordValidation(request, response, url) {
  if (request.method !== "GET") {
    response.writeHead(405, { Allow: "GET" });
    response.end("Method not allowed");
    return;
  }

  const word = normalizeKana(url.searchParams.get("word") || "").slice(0, 12);
  if (!word) {
    sendJson(response, { valid: false, word: "", source: "local" });
    return;
  }

  let entry = readWordMap().get(word);
  if (!entry) entry = await fetchKuromojiWordEntry(word);
  if (!entry) {
    try {
      entry = await fetchExternalWordEntry(word);
      if (entry) {
        addWordEntry(entry);
      }
    } catch {
      entry = null;
    }
    if (!entry) {
      logUnknownWord(word);
      sendJson(response, { valid: false, word, source: "local" });
      return;
    }
  }

  const recognized = entry.recognized || [word];
  const element = inferElement(word, recognized);
  const power = Math.max(1, Math.min(5, [...word].length - 1 + rareLetterBonus(word)));
  sendJson(response, {
    valid: true,
    word,
    source: entry.source || "local",
    recognized,
    upgrade: {
      valid: true,
      word,
      type: entry.type,
      label: entry.label,
      power,
      element,
      title: `${word} ${entry.label}`,
      description: `${describeUpgrade(entry.type, power)} / ${element} unlocked`,
      recognized,
    },
  });
}

function readWordMap() {
  try {
    const data = JSON.parse(readFileSync(wordsFile, "utf8"));
    return new Map((data.words || []).map((entry) => [normalizeKana(entry.word), entry]));
  } catch {
    return new Map();
  }
}

async function fetchKuromojiWordEntry(word) {
  const tokenizer = await getTokenizer();
  const tokens = tokenizer.tokenize(word);
  if (!isDictionaryWord(word, tokens)) return null;

  return {
    word,
    ...inferWordEntry(word),
    recognized: recognizedDictionaryWords(word, tokens),
    source: "kuromoji",
  };
}

function isDictionaryWord(word, tokens) {
  if (tokens.length === 1) return tokenMatchesWord(tokens[0], word);
  if ([...word].length < 3) return false;
  if (!tokens.every(isMeaningfulDictionaryToken)) return false;
  return tokens.map((token) => normalizeKana(token.surface_form)).join("") === word;
}

function recognizedDictionaryWords(word, tokens) {
  if (tokens.length === 1) return [...new Set([word, ...tokenKanjiForms(tokens[0])])];
  return [...new Set([
    ...tokens.map((token) => normalizeKana(token.surface_form)),
    ...wholeCompoundForms(word, tokens),
  ])];
}

function wholeCompoundForms(word, tokens) {
  const surfaces = tokens.map((token) => token.surface_form || "");
  const candidates = [word, surfaces.join(""), ...(conversionForms.get(word) || [])];
  const kanji = tokens.map((token) => tokenKanjiForms(token)[0] || token.surface_form || "").join("");
  if (kanji) candidates.push(kanji);
  return candidates.map(normalizeKana).filter(Boolean);
}

function tokenKanjiForms(token) {
  if (!Array.isArray(token?.features)) return [];
  return token.features
    .slice(6)
    .filter((value) => value && value !== "*" && /[^\u3040-\u309f\u30a0-\u30ff]/.test(value));
}

function tokenMatchesWord(token, word) {
  if (!isMeaningfulDictionaryToken(token)) return false;
  const surfaces = [
    token.surface_form,
    token.basic_form,
    katakanaToHiragana(token.reading),
    katakanaToHiragana(token.pronunciation),
  ].filter((value) => value && value !== "*").map(normalizeKana);

  return surfaces.includes(word);
}

function isMeaningfulDictionaryToken(token) {
  if (token.word_type !== "KNOWN") return false;
  return !["助詞", "助動詞", "記号", "フィラー"].includes(token.pos);
}

function getTokenizer() {
  tokenizerPromise ||= new Promise((resolveTokenizer, rejectTokenizer) => {
    kuromoji.builder({ dicPath: kuromojiDictPath }).build((error, tokenizer) => {
      if (error) {
        rejectTokenizer(error);
        return;
      }
      resolveTokenizer(tokenizer);
    });
  });
  return tokenizerPromise;
}

async function fetchExternalWordEntry(word) {
  const url = new URL("https://ja.wiktionary.org/w/api.php");
  url.searchParams.set("action", "query");
  url.searchParams.set("format", "json");
  url.searchParams.set("formatversion", "2");
  url.searchParams.set("redirects", "1");
  url.searchParams.set("titles", word);
  const response = await fetch(url, {
    headers: {
      "User-Agent": "ILAS2026WordGame/0.1 (local development word validation)",
    },
  });
  if (!response.ok) return null;
  const data = await response.json();
  const page = data?.query?.pages?.[0];
  if (!page || page.missing) return null;
  return {
    word,
    ...inferWordEntry(word),
    source: "wiktionary",
  };
}

function addWordEntry(entry) {
  const data = readWordData();
  const word = normalizeKana(entry.word);
  if ((data.words || []).some((item) => normalizeKana(item.word) === word)) return;
  data.words = [...(data.words || []), {
    word,
    type: entry.type,
    label: entry.label,
    source: entry.source || "local",
  }].sort((a, b) => normalizeKana(a.word).localeCompare(normalizeKana(b.word), "ja"));
  mkdirSync(join(root, "data"), { recursive: true });
  writeFileSync(wordsFile, `${JSON.stringify(data, null, 2)}\n`);
}

function readWordData() {
  try {
    const data = JSON.parse(readFileSync(wordsFile, "utf8"));
    return { words: Array.isArray(data.words) ? data.words : [] };
  } catch {
    return { words: [] };
  }
}

function inferWordEntry(word) {
  if (word.length <= 2) return { type: "mobility", label: "移動" };
  if (/[火炎鬼刀刃雷焼肉]/.test(word)) return { type: "attack", label: "攻撃" };
  if (/[守盾石城亀]/.test(word)) return { type: "defense", label: "守り" };
  if (/[雪雨月夜雲煙]/.test(word)) return { type: "control", label: "制御" };
  if (/[花心命光薬食卵]/.test(word)) return { type: "life", label: "生命" };
  return { type: "pattern", label: "弾幕" };
}

function inferElement(word, recognized = []) {
  const combined = [word, ...recognized].join("");
  if (/(ほのお|ひ|やき|焼|あつ|たいよう|火)/.test(combined)) return "fire";
  if (/(みず|あめ|うみ|なみ|しお|水|雨|海)/.test(combined)) return "water";
  if (/(かぜ|そら|はね|とり|風|空|羽|鳥)/.test(combined)) return "wind";
  if (/(つち|いし|やま|もり|土|石|山|森)/.test(combined)) return "earth";
  if (/(ひかり|ほし|つき|光|星|月)/.test(combined)) return "light";
  return "neutral";
}

function normalizeKana(word) {
  return String(word).trim().toLowerCase().replace(/[ァ-ン]/g, (char) => String.fromCharCode(char.charCodeAt(0) - 0x60));
}

function katakanaToHiragana(word = "") {
  return String(word).replace(/[\u30a1-\u30f6]/g, (char) => String.fromCharCode(char.charCodeAt(0) - 0x60));
}

function rareLetterBonus(word) {
  return [...word].filter((char) => "ゃゅょっん".includes(char)).length;
}

function describeUpgrade(type, power) {
  if (type === "attack") return `弾の威力 +${power}`;
  if (type === "mobility") return "移動速度アップ。";
  if (type === "defense") return "HP回復と短い無敵。";
  if (type === "control") return "敵弾スローを付与。";
  if (type === "life") return "最大HPアップと回復。";
  return "拡散ショットを追加。";
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

function sendJson(response, data) {
  response.writeHead(200, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  });
  response.end(JSON.stringify(data));
}
