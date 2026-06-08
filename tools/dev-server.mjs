import { createReadStream, existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, normalize, resolve, sep } from "node:path";

const root = resolve(".");
const rankingFile = join(root, ".logs", "rankings.json");
const port = readPort();

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

server.listen(port, "127.0.0.1", () => {
  console.log(`Lantern Dash dev server: http://127.0.0.1:${port}/`);
});

function readPort() {
  const index = process.argv.indexOf("--port");
  const value = index >= 0 ? Number(process.argv[index + 1]) : Number(process.env.PORT || 5173);
  return Number.isInteger(value) && value > 0 ? value : 5173;
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
