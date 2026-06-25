import { randomUUID } from "node:crypto";

const sessions = new Map();
const queue = [];
const SESSION_TTL_MS = 20 * 60 * 1000;

export function createStorySession() {
  trimSessions();

  const session = {
    id: randomUUID(),
    status: "waiting",
    createdAt: Date.now(),
    updatedAt: Date.now(),
    lastSeenAt: Date.now(),
  };

  sessions.set(session.id, session);
  queue.push(session.id);
  pumpSessionQueue();

  return serializeSession(session);
}

export function getStorySession(id) {
  trimSessions();

  const session = sessions.get(id);
  if (!session) {
    return null;
  }

  session.lastSeenAt = Date.now();
  session.updatedAt = Date.now();
  pumpSessionQueue();
  return serializeSession(session);
}

export function finishStorySession(id) {
  const session = sessions.get(id);
  if (!session) {
    return null;
  }

  session.status = "finished";
  session.updatedAt = Date.now();
  removeFromQueue(id);
  pumpSessionQueue();
  return serializeSession(session);
}

function pumpSessionQueue() {
  const maxActive = getStorySessionConcurrency();
  const activeCount = [...sessions.values()].filter((session) => session.status === "active").length;
  let slots = Math.max(0, maxActive - activeCount);

  while (slots > 0 && queue.length) {
    const id = queue.shift();
    const session = sessions.get(id);
    if (!session || session.status !== "waiting") {
      continue;
    }

    session.status = "active";
    session.updatedAt = Date.now();
    slots -= 1;
  }
}

function trimSessions() {
  const now = Date.now();

  for (const [id, session] of sessions.entries()) {
    if (now - session.lastSeenAt < SESSION_TTL_MS) {
      continue;
    }

    sessions.delete(id);
    removeFromQueue(id);
  }
}

function removeFromQueue(id) {
  const index = queue.indexOf(id);
  if (index >= 0) {
    queue.splice(index, 1);
  }
}

function serializeSession(session) {
  return {
    id: session.id,
    status: session.status,
    createdAt: session.createdAt,
    updatedAt: session.updatedAt,
    queuePosition: session.status === "waiting" ? queue.indexOf(session.id) + 1 : 0,
    activeCount: [...sessions.values()].filter((item) => item.status === "active").length,
    maxActive: getStorySessionConcurrency(),
  };
}

function getStorySessionConcurrency() {
  const value = Number(process.env.STORY_SESSION_CONCURRENCY || 6);
  if (!Number.isFinite(value)) {
    return 6;
  }

  return Math.min(12, Math.max(1, Math.trunc(value)));
}
