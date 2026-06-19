import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { createReadStream, existsSync } from "node:fs";
import { extname, join, normalize, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { generateStudyCards } from "./lib/study-cards.js";

const rootDir = fileURLToPath(new URL(".", import.meta.url));
const port = Number(process.env.PORT || 3000);

await loadLocalEnv();

const server = createServer(async (request, response) => {
  try {
    const url = new URL(request.url || "/", `http://${request.headers.host || "localhost"}`);

    if (url.pathname === "/api/generate-cards") {
      await handleGenerateCards(request, response);
      return;
    }

    await serveStatic(url.pathname, response);
  } catch (error) {
    sendJson(response, error.statusCode || 500, { error: error.message || "Server error" });
  }
});

server.listen(port, () => {
  console.log(`AI 学习卡片生成器已启动: http://localhost:${port}`);
  console.log(`项目目录: ${rootDir}`);
  console.log(process.env.OPENAI_API_KEY ? "AI 状态: 已配置 OPENAI_API_KEY" : "AI 状态: 未配置 OPENAI_API_KEY，将使用前端演示卡片");
});

async function handleGenerateCards(request, response) {
  if (request.method !== "POST") {
    sendJson(response, 405, { error: "Method not allowed" });
    return;
  }

  const body = await readJsonBody(request);
  const result = await generateStudyCards(body);
  sendJson(response, 200, result);
}

async function serveStatic(pathname, response) {
  const safePath = pathname === "/" ? "/index.html" : decodeURIComponent(pathname);
  const filePath = normalize(join(rootDir, safePath));
  const resolvedPath = resolve(filePath);

  if (!resolvedPath.startsWith(resolve(rootDir)) || !existsSync(resolvedPath)) {
    sendText(response, 404, "Not found");
    return;
  }

  response.writeHead(200, { "Content-Type": getContentType(resolvedPath) });
  createReadStream(resolvedPath).pipe(response);
}

async function readJsonBody(request) {
  const chunks = [];
  for await (const chunk of request) {
    chunks.push(chunk);
  }

  const raw = Buffer.concat(chunks).toString("utf8");
  if (!raw) {
    return {};
  }

  return JSON.parse(raw);
}

function sendJson(response, statusCode, body) {
  response.writeHead(statusCode, { "Content-Type": "application/json; charset=utf-8" });
  response.end(JSON.stringify(body));
}

function sendText(response, statusCode, body) {
  response.writeHead(statusCode, { "Content-Type": "text/plain; charset=utf-8" });
  response.end(body);
}

function getContentType(filePath) {
  const types = {
    ".html": "text/html; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".svg": "image/svg+xml",
  };

  return types[extname(filePath).toLowerCase()] || "application/octet-stream";
}

async function loadLocalEnv() {
  const envFiles = [".env.local", ".env"];

  for (const envFile of envFiles) {
    const envPath = join(rootDir, envFile);
    if (!existsSync(envPath)) {
      continue;
    }

    const content = await readFile(envPath, "utf8");
    for (const line of content.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) {
        continue;
      }

      const [key, ...valueParts] = trimmed.split("=");
      if (!process.env[key]) {
        process.env[key] = valueParts.join("=").replace(/^["']|["']$/g, "");
      }
    }
  }
}
