import type { DayEntry, Progress } from "./types";

const STORAGE_PROGRESS = "contadaimoku-napoli-progress-v1";
const STORAGE_TIMER = "contadaimoku-napoli-timer-v1";

export type CachedTimerState = {
  id: string;
  secret: string;
  minutes: number;
  startedAt: number;
  completesAt: number;
  confirmed: boolean;
  pausedAt?: number;
  pausedRemainingMs?: number;
};

function isCachedTimerState(value: unknown): value is CachedTimerState {
  if (!value || typeof value !== "object") return false;
  const t = value as CachedTimerState;
  return (
    typeof t.id === "string" &&
    /^[0-9a-f-]{36}$/i.test(t.id) &&
    typeof t.secret === "string" &&
    t.secret.length >= 16 &&
    Number.isFinite(t.minutes) &&
    t.minutes >= 1 &&
    t.minutes <= 720 &&
    Number.isFinite(t.startedAt) &&
    Number.isFinite(t.completesAt) &&
    t.confirmed === true &&
    (t.pausedAt === undefined || Number.isFinite(t.pausedAt)) &&
    (t.pausedRemainingMs === undefined || Number.isFinite(t.pausedRemainingMs))
  );
}

export function timerRemainingMs(timer: CachedTimerState, at = Date.now()) {
  if (timer.pausedAt !== undefined) return Math.max(0, timer.pausedRemainingMs ?? 0);
  return Math.max(0, timer.completesAt - at);
}

export function loadCachedTimer(): CachedTimerState | null {
  try {
    const raw = localStorage.getItem(STORAGE_TIMER);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (!isCachedTimerState(parsed)) {
      localStorage.removeItem(STORAGE_TIMER);
      return null;
    }
    return parsed;
  } catch {
    localStorage.removeItem(STORAGE_TIMER);
    return null;
  }
}

export function saveCachedTimer(timer: CachedTimerState | null) {
  if (!timer?.confirmed) {
    localStorage.removeItem(STORAGE_TIMER);
    return;
  }
  localStorage.setItem(STORAGE_TIMER, JSON.stringify(timer));
}

export function clearCachedTimer() {
  localStorage.removeItem(STORAGE_TIMER);
}

export type ProgressSnapshot = {
  progress: Progress;
  days: DayEntry[];
  savedAt: number;
};

function headers() {
  return {
    "content-type": "application/json",
    "x-contadaimoku-action": "1",
  };
}

function leadingZeroBits(bytes: Uint8Array, target: number) {
  let bits = 0;
  for (const byte of bytes) {
    if (byte === 0) {
      bits += 8;
      continue;
    }
    bits += Math.clz32(byte) - 24;
    break;
  }
  return bits >= target;
}

export async function solveProof(token: string, difficulty: number, expiresAtMs: number) {
  const enc = new TextEncoder();
  for (let i = 0; i <= 4294967295; i += 64) {
    if (Date.now() > expiresAtMs - 2000) {
      throw new Error("La verifica anonima è scaduta");
    }
    const batch = Array.from({ length: 64 }, (_, offset) => i + offset).filter((n) => n <= 4294967295);
    const hashes = await Promise.all(
      batch.map((n) => crypto.subtle.digest("SHA-256", enc.encode(`${token}.${n}`))),
    );
    const index = hashes.findIndex((hash) => leadingZeroBits(new Uint8Array(hash), difficulty));
    if (index >= 0) return String(batch[index]);
  }
  throw new Error("Verifica anonima non completata");
}

export async function requestProof(purpose: string, amount: number) {
  const response = await fetch("/api/progress", {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({ action: "proof:challenge", purpose, amount }),
  });
  const json = await response.json();
  if (!response.ok || !json.proof) {
    throw new Error(json.error ?? "Protezione anonima non disponibile");
  }
  const solution = await solveProof(json.proof.token, json.proof.difficulty, json.proof.expiresAt * 1000);
  return {
    token: json.proof.token,
    solution,
    expiresAt: json.proof.expiresAt * 1000,
    purpose,
    amount,
  };
}

export async function sha256Hex(text: string) {
  const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(hash), (b) => b.toString(16).padStart(2, "0")).join("");
}

export function randomSecret() {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  let raw = "";
  bytes.forEach((b) => {
    raw += String.fromCharCode(b);
  });
  return btoa(raw).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

export async function fetchProgress() {
  const response = await fetch("/api/progress", { headers: { accept: "application/json" }, cache: "no-cache" });
  const json = await response.json();
  return json as { progress: Progress; days: DayEntry[]; presence?: { active: number } };
}

export function loadCachedProgress(): ProgressSnapshot | null {
  try {
    const raw = localStorage.getItem(STORAGE_PROGRESS);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ProgressSnapshot;
    if (!parsed.progress || !Array.isArray(parsed.days)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveCachedProgress(snapshot: ProgressSnapshot) {
  localStorage.setItem(STORAGE_PROGRESS, JSON.stringify(snapshot));
}

export { headers as progressHeaders };
