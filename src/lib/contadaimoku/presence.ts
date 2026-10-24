import { kv } from "@vercel/kv";
import { STORAGE_PREFIX } from "./config";

const PRESENCE_KEY = `${STORAGE_PREFIX}:presence`;
const PRESENCE_TTL_SEC = 60 * 60 * 24;

export async function markTimerActive(sessionId: string) {
  await kv.sadd(PRESENCE_KEY, sessionId);
  await kv.expire(PRESENCE_KEY, PRESENCE_TTL_SEC);
}

export async function clearTimerActive(sessionId: string) {
  await kv.srem(PRESENCE_KEY, sessionId);
}

export async function activeTimerCount() {
  const count = await kv.scard(PRESENCE_KEY);
  return typeof count === "number" ? count : 0;
}
