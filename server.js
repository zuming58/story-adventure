import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { createReadStream, existsSync } from "node:fs";
import { extname, join, normalize, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { generateStoryAdventure } from "./lib/story-adventure.js";
import { generateStoryImage } from "./lib/story-images.js";
import { createImageJob, getImageJob } from "./lib/image-jobs.js";

const rootDir = fileURLToPath(new URL(".", import.meta.url));
const port = Number(process.env.PORT || 3100);

await loadLocalEnv();

const server = createServer(async (request, response) => {
  try {
    const url = new URL(request.url || "/", `http://${request.headers.host || "localhost"}`);

    if (url.pathname === "/" || url.pathname === "/story-adventure") {
      const query = url.search || "";
      response.writeHead(302, { Location: `/story-adventure/index.html${query}` });
      response.end();
      return;
    }

    if (url.pathname === "/api/story-adventure/scene") {
      await handleStoryAdventure(request, response);
      return;
    }

    if (url.pathname === "/api/story-adventure/image") {
      await handleStoryImage(request, response);
      return;
    }

    if (url.pathname === "/api/story-adventure/config") {
      await handleStoryConfig(request, response);
      return;
    }

    if (url.pathname === "/api/story-adventure/image-jobs") {
      await handleCreateImageJob(request, response);
      return;
    }

    if (url.pathname.startsWith("/api/story-adventure/image-jobs/")) {
      await handleGetImageJob(url.pathname, request, response);
      return;
    }

    await serveStatic(url.pathname, response);
  } catch (error) {
    sendJson(response, error.statusCode || 500, {
      error: error.message || "Server error",
      code: error.code || undefined,
      reason: error.reason || undefined,
    });
  }
});

server.listen(port, () => {
  console.log(`AI 互动故事冒险机已启动: http://localhost:${port}`);
  console.log(`项目目录: ${rootDir}`);
  console.log(process.env.OPENAI_API_KEY ? "文本 AI: 已配置 OPENAI_API_KEY" : "文本 AI: 未配置 OPENAI_API_KEY，将使用演示故事");
  console.log(process.env.IMAGE_API_KEY ? "图片 AI: 已配置 IMAGE_API_KEY" : "图片 AI: 未配置 IMAGE_API_KEY，将使用默认插图");
});

async function handleStoryAdventure(request, response) {
  if (request.method !== "POST") {
    sendJson(response, 405, { error: "Method not allowed" });
    return;
  }

  const body = await readJsonBody(request);
  const result = await generateStoryAdventure(body);
  sendJson(response, 200, result);
}

async function handleStoryImage(request, response) {
  if (request.method !== "POST") {
    sendJson(response, 405, { error: "Method not allowed" });
    return;
  }

  const body = await readJsonBody(request);
  const result = await generateStoryImage(body);
  sendJson(response, 200, result);
}

async function handleStoryConfig(request, response) {
  if (request.method !== "GET") {
    sendJson(response, 405, { error: "Method not allowed" });
    return;
  }

  sendJson(response, 200, getPublicStoryConfig());
}

function getPublicStoryConfig() {
  return {
    imageMode: process.env.IMAGE_MODE || "each_scene",
    imageStorageMode: process.env.IMAGE_STORAGE_MODE || "browser",
  };
}

async function handleCreateImageJob(request, response) {
  if (request.method !== "POST") {
    sendJson(response, 405, { error: "Method not allowed" });
    return;
  }

  const body = await readJsonBody(request);
  const job = createImageJob(body);
  sendJson(response, 202, job);
}

async function handleGetImageJob(pathname, request, response) {
  if (request.method !== "GET") {
    sendJson(response, 405, { error: "Method not allowed" });
    return;
  }

  const jobId = decodeURIComponent(pathname.split("/").pop() || "");
  const job = getImageJob(jobId);
  if (!job) {
    sendJson(response, 404, { error: "Image job not found" });
    return;
  }

  sendJson(response, 200, job);
}

async function serveStatic(pathname, response) {
  const safePath = decodeURIComponent(pathname);
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
    ".webp": "image/webp",
    ".gif": "image/gif",
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
      const trimmed = line.replace(/^\uFEFF/, "").trim();
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
