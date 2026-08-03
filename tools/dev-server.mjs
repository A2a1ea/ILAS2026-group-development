import { createReadStream, existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { createServer } from "node:http";
import { networkInterfaces } from "node:os";
import { createRequire } from "node:module";
import { dirname, extname, join, normalize, resolve, sep } from "node:path";

const require = createRequire(import.meta.url);
const root = resolve(".");
const rankingFile = join(root, ".logs", "rankings.json");
const unknownWordsFile = join(root, ".logs", "unknown-words.json");
const wordsFile = join(root, "data", "words-ja.json");
const wordUpgradeSheetFile = join(root, "data", "word-upgrades.csv");
const rankingLimit = 10;
const rankingCommentLimit = 24;
const supabaseUrl = String(process.env.SUPABASE_URL || "").replace(/\/$/, "");
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const supabaseRankingTable = process.env.SUPABASE_RANKING_TABLE || "rankings";
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
    handleRankings(request, response).catch((error) => {
      console.error("Ranking API error:", error);
      response.writeHead(500);
      response.end("Ranking API error");
    });
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

async function handleRankings(request, response) {
  if (request.method === "GET") {
    sendJson(response, await readSharedRankings());
    return;
  }

  if (request.method !== "POST") {
    response.writeHead(405, { Allow: "GET, POST" });
    response.end("Method not allowed");
    return;
  }

  try {
    const entry = sanitizeRanking(JSON.parse(await readRequestBody(request, 4096)));
    if (!entry) {
      response.writeHead(400);
      response.end("Invalid ranking entry");
      return;
    }
    sendJson(response, await addSharedRanking(entry));
  } catch {
    response.writeHead(400);
    response.end("Invalid JSON");
  }
}

function readRequestBody(request, limit) {
  return new Promise((resolveBody, rejectBody) => {
    let body = "";
    request.on("data", (chunk) => {
      body += chunk;
      if (body.length > limit) {
        request.destroy();
        rejectBody(new Error("Request body too large"));
      }
    });
    request.on("end", () => resolveBody(body));
    request.on("error", rejectBody);
  });
}

function sanitizeRanking(entry) {
  const name = String(entry?.name || "Player").replace(/[^\w -]/g, "").trim().slice(0, 18) || "Player";
  const stages = Math.floor(Number(entry?.stages));
  const score = Math.floor(Number(entry?.score));
  if (!Number.isFinite(stages) || stages < 1 || !Number.isFinite(score) || score < 0) return null;
  const usedLetters = sanitizeUsedLetters(entry?.usedLetters);
  return {
    name,
    stages,
    score,
    usedLetters,
    comment: sanitizeRankingComment(entry?.comment, usedLetters),
    date: new Date().toISOString(),
  };
}

function sanitizeUsedLetters(letters) {
  const source = Array.isArray(letters) ? letters.join("") : String(letters || "");
  return [...normalizeKana(source)]
    .filter((char, index, all) => /[ぁ-ん]/.test(char) && all.indexOf(char) === index)
    .slice(0, 32);
}

function sanitizeRankingComment(comment, usedLetters) {
  const allowed = new Set(usedLetters);
  if (!allowed.size) return "";
  return [...normalizeKana(comment || "")]
    .filter((char) => allowed.has(char))
    .join("")
    .slice(0, rankingCommentLimit);
}

async function readSharedRankings() {
  if (hasSupabaseRankingConfig()) {
    try {
      return await fetchSupabaseRankings();
    } catch (error) {
      console.warn("Supabase ranking GET failed; falling back to local rankings.", error.message);
    }
  }
  return readRankings();
}

async function addSharedRanking(entry) {
  if (hasSupabaseRankingConfig()) {
    try {
      const response = await fetch(supabaseRankingEndpoint(), {
        method: "POST",
        headers: supabaseHeaders({ preferRepresentation: true }),
        body: JSON.stringify(toSupabaseRanking(entry)),
      });
      if (!response.ok) throw new Error(`POST ${response.status}`);
      const posted = await parseSupabaseRankings(response);
      if (posted.length) return posted;
      return await fetchSupabaseRankings();
    } catch (error) {
      console.warn("Supabase ranking POST failed; falling back to local rankings.", error.message);
    }
  }
  const rankings = rankEntries([...readRankings(), entry]).slice(0, rankingLimit);
  writeRankings(rankings);
  return rankings;
}

async function fetchSupabaseRankings() {
  const response = await fetch(`${supabaseRankingEndpoint()}?select=*&order=stages.desc,score.desc,created_at.desc&limit=${rankingLimit}`, {
    headers: supabaseHeaders(),
  });
  if (!response.ok) throw new Error(`GET ${response.status}`);
  return parseSupabaseRankings(response);
}

function hasSupabaseRankingConfig() {
  return Boolean(supabaseUrl && supabaseServiceRoleKey);
}

function supabaseRankingEndpoint() {
  return `${supabaseUrl}/rest/v1/${encodeURIComponent(supabaseRankingTable)}`;
}

function supabaseHeaders({ preferRepresentation = false } = {}) {
  const headers = {
    Accept: "application/json",
    apikey: supabaseServiceRoleKey,
    Authorization: `Bearer ${supabaseServiceRoleKey}`,
  };
  if (preferRepresentation) {
    headers["Content-Type"] = "application/json";
    headers.Prefer = "return=representation";
  }
  return headers;
}

async function parseSupabaseRankings(response) {
  const data = await response.json();
  const entries = Array.isArray(data) ? data : [];
  return rankEntries(entries.map(sanitizeStoredRanking).filter(Boolean));
}

function toSupabaseRanking(entry) {
  return {
    name: entry.name,
    stages: entry.stages,
    score: entry.score,
    used_letters: entry.usedLetters,
    comment: entry.comment,
    created_at: entry.date,
  };
}

function sanitizeStoredRanking(entry) {
  const name = String(entry?.name || "Player").replace(/[^\w -]/g, "").trim().slice(0, 18) || "Player";
  const stages = Math.floor(Number(entry?.stages));
  const score = Math.floor(Number(entry?.score));
  if (!Number.isFinite(stages) || stages < 1 || !Number.isFinite(score) || score < 0) return null;
  const usedLetters = sanitizeUsedLetters(entry?.usedLetters || entry?.used_letters);
  return {
    name,
    stages,
    score,
    usedLetters,
    comment: sanitizeRankingComment(entry?.comment, usedLetters),
    date: String(entry?.date || entry?.created_at || new Date().toISOString()),
  };
}

function readRankings() {
  try {
    const rankings = JSON.parse(readFileSync(rankingFile, "utf8").replace(/^\uFEFF/, ""));
    return rankEntries(Array.isArray(rankings) ? rankings : [rankings]);
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

  const power = Number.isFinite(entry.power)
    ? entry.power
    : Math.max(1, Math.min(5, [...word].length - 1 + rareLetterBonus(word)));
  sendJson(response, {
    valid: true,
    word,
    source: entry.source || "local",
    recognized: entry.recognized || [word],
    upgrade: {
      valid: true,
      word,
      type: entry.type,
      label: entry.label,
      power,
      title: entry.title || `${word} ${entry.label}`,
      description: entry.description || describeUpgrade(entry.type, power),
      highRoll: Boolean(entry.highRoll),
      recognized: entry.recognized || [word],
    },
  });
}

function readWordMap() {
  const entries = [];
  try {
    const data = JSON.parse(readFileSync(wordsFile, "utf8"));
    entries.push(...(data.words || []).filter((entry) => !isUnsafeStoredWord(entry)));
  } catch {
    // Missing local dictionary is fine; the editable sheet can still drive upgrades.
  }
  entries.push(...readWordUpgradeSheet());
  return new Map(entries.map((entry) => [normalizeKana(entry.word), entry]));
}

function isUnsafeStoredWord(entry) {
  const word = normalizeKana(entry?.word);
  return entry?.source === "wiktionary" && [...word].length < 4;
}

function readWordUpgradeSheet() {
  if (!existsSync(wordUpgradeSheetFile)) return [];
  const text = readFileSync(wordUpgradeSheetFile, "utf8").replace(/^\uFEFF/, "");
  const rows = parseCsv(text).filter((row) => row.some((cell) => cell.trim()));
  const [headers, ...records] = rows;
  if (!headers) return [];
  const keys = headers.map((header) => header.trim());
  return records
    .map((row) => Object.fromEntries(keys.map((key, index) => [key, row[index]?.trim() || ""])))
    .filter((row) => row.word && row.type)
    .map((row) => ({
      word: normalizeKana(row.word),
      type: row.type,
      label: row.label || upgradeLabelFromType(row.type),
      power: row.power ? Number(row.power) : undefined,
      title: row.title || undefined,
      description: row.description || undefined,
      highRoll: /^true$/i.test(row.highRoll),
      source: row.source || "sheet",
      recognized: [normalizeKana(row.word)],
    }));
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = "";
  let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];
    if (quoted) {
      if (char === '"' && next === '"') {
        cell += '"';
        index += 1;
      } else if (char === '"') {
        quoted = false;
      } else {
        cell += char;
      }
    } else if (char === '"') {
      quoted = true;
    } else if (char === ",") {
      row.push(cell);
      cell = "";
    } else if (char === "\n") {
      row.push(cell.replace(/\r$/, ""));
      rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += char;
    }
  }
  row.push(cell.replace(/\r$/, ""));
  rows.push(row);
  return rows;
}

function upgradeLabelFromType(type) {
  if (type === "attack") return "攻撃";
  if (type === "mobility") return "移動";
  if (type === "defense") return "守り";
  if (type === "control") return "制御";
  if (type === "life") return "生命";
  return "闇";
}

async function fetchKuromojiWordEntry(word) {
  if ([...word].length < 3) return null;
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
  return !["\u52a9\u8a5e", "\u52a9\u52d5\u8a5e", "\u8a18\u53f7", "\u30d5\u30a3\u30e9\u30fc"].includes(token.pos);
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
  if ([...word].length < 4) return null;
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
  if (/[闇影夜]/.test(word) && word.length >= 3) return { type: "pattern", label: "闇" };
  if (word.length <= 2) return { type: "mobility", label: "移動" };
  if (/[火炎鬼刀刃雷焼肉]/.test(word)) return { type: "attack", label: "攻撃" };
  if (/[守盾石城亀]/.test(word)) return { type: "defense", label: "守り" };
  if (/[雪雨月夜雲煙]/.test(word)) return { type: "control", label: "制御" };
  if (/[花心命光薬食卵]/.test(word)) return { type: "life", label: "生命" };
  return { type: "life", label: "生命" };
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
  if (type === "attack") return `炎: 弾威力 +${power}。強化で重い火柱弾が増える。`;
  if (type === "mobility") return "風: 移動速度と低速性能アップ。強化で横風の針弾が増える。";
  if (type === "defense") return "HP回復と短い無敵。";
  if (type === "control") return "氷: 敵弾スローと弾圧低下。強化で大きい制圧弾が増える。";
  if (type === "life") return "光: 最大HPアップと回復。強化で追尾する光弾が増える。";
  return "闇: 全ボス弱点を突ける。強化で波打つ闇弾が増えるが弾圧リスクも上がる。";
}

function rankEntries(entries) {
  return (Array.isArray(entries) ? entries : [])
    .filter((entry) => entry && Number.isFinite(entry.stages) && Number.isFinite(entry.score))
    .sort((a, b) => b.stages - a.stages || b.score - a.score || String(b.date || "").localeCompare(String(a.date || "")))
    .slice(0, rankingLimit);
}

function sendJson(response, data) {
  response.writeHead(200, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  });
  response.end(JSON.stringify(data));
}
