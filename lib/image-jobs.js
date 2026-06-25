import { mkdir, writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { extname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { generateStoryImage } from "./story-images.js";

const jobs = new Map();
const queue = [];
let runningJobs = 0;
const rootDir = fileURLToPath(new URL("../", import.meta.url));
const GENERATED_DIR = join(rootDir, "story-adventure", "generated");

export function createImageJob(payload) {
  trimJobs();

  const job = {
    id: randomUUID(),
    status: "pending",
    createdAt: Date.now(),
    updatedAt: Date.now(),
    payload,
    result: null,
    error: null,
  };

  jobs.set(job.id, job);
  queue.push(job.id);
  pumpImageQueue();

  return serializeJob(job);
}

export function getImageJob(id) {
  const job = jobs.get(id);
  return job ? serializeJob(job) : null;
}

async function runImageJob(job) {
  job.status = "running";
  job.updatedAt = Date.now();

  try {
    const result = await generateStoryImage(job.payload, process.env);
    const saved = await saveGeneratedImage(job.id, result.imageUrl);

    job.status = "succeeded";
    job.result = {
      ...result,
      imageUrl: saved.publicUrl || result.imageUrl,
      originalImageUrl: result.imageUrl,
      saved: saved.saved,
    };
  } catch (error) {
    console.error("Image job failed", {
      jobId: job.id,
      message: error.message || "Story image generation failed",
      detail: error.detail || null,
      attempts: error.attempts || null,
    });
    job.status = "failed";
    job.error = {
      message: error.message || "Story image generation failed",
      code: error.code || null,
      detail: error.detail || null,
    };
  } finally {
    job.updatedAt = Date.now();
    runningJobs = Math.max(0, runningJobs - 1);
    pumpImageQueue();
  }
}

function pumpImageQueue() {
  const maxConcurrent = getImageJobConcurrency();

  while (runningJobs < maxConcurrent && queue.length) {
    const jobId = queue.shift();
    const job = jobs.get(jobId);
    if (!job || job.status !== "pending") {
      continue;
    }

    runningJobs += 1;
    runImageJob(job);
  }
}

async function saveGeneratedImage(jobId, imageUrl) {
  await mkdir(GENERATED_DIR, { recursive: true });

  if (imageUrl.startsWith("data:")) {
    const match = imageUrl.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
    if (!match) {
      return { saved: false, publicUrl: "" };
    }

    const ext = extensionFromMime(match[1]);
    const filename = `${jobId}${ext}`;
    await writeFile(join(GENERATED_DIR, filename), Buffer.from(match[2], "base64"));
    return { saved: true, publicUrl: `/story-adventure/generated/${filename}` };
  }

  if (/^https?:\/\//i.test(imageUrl)) {
    const response = await fetch(imageUrl);
    if (!response.ok) {
      return { saved: false, publicUrl: imageUrl };
    }

    const contentType = response.headers.get("content-type") || "";
    const urlExt = extname(new URL(imageUrl).pathname);
    const ext = extensionFromMime(contentType) || (urlExt && urlExt.length <= 6 ? urlExt : ".png");
    const filename = `${jobId}${ext}`;
    const bytes = Buffer.from(await response.arrayBuffer());
    await writeFile(join(GENERATED_DIR, filename), bytes);
    return { saved: true, publicUrl: `/story-adventure/generated/${filename}` };
  }

  return { saved: false, publicUrl: imageUrl };
}

function extensionFromMime(mime) {
  const lower = String(mime || "").toLowerCase();
  if (lower.includes("jpeg") || lower.includes("jpg")) return ".jpg";
  if (lower.includes("webp")) return ".webp";
  if (lower.includes("gif")) return ".gif";
  if (lower.includes("png")) return ".png";
  return ".png";
}

function serializeJob(job) {
  return {
    id: job.id,
    status: job.status,
    createdAt: job.createdAt,
    updatedAt: job.updatedAt,
    queuePosition: job.status === "pending" ? queue.indexOf(job.id) + 1 : 0,
    runningCount: runningJobs,
    result: job.result,
    error: job.error,
  };
}

function trimJobs() {
  const maxJobs = getMaxImageJobs();
  if (jobs.size < maxJobs) {
    return;
  }

  const removable = [...jobs.values()]
    .filter((job) => job.status !== "running" && job.status !== "pending")
    .sort((a, b) => a.updatedAt - b.updatedAt);

  while (jobs.size >= maxJobs && removable.length) {
    const removed = removable.shift();
    jobs.delete(removed.id);
  }
}

function getImageJobConcurrency() {
  const value = Number(process.env.IMAGE_JOB_CONCURRENCY || 2);
  if (!Number.isFinite(value)) {
    return 2;
  }

  return Math.min(6, Math.max(1, Math.trunc(value)));
}

function getMaxImageJobs() {
  const value = Number(process.env.IMAGE_MAX_JOBS || 300);
  if (!Number.isFinite(value)) {
    return 300;
  }

  return Math.min(1000, Math.max(100, Math.trunc(value)));
}
