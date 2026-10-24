import type { DayEntry, Progress } from "./types";

const STORAGE_PROGRESS = "contadaimoku-napoli-progress-v1";
const STORAGE_CORRECTION = "contadaimoku-napoli-last-correction-v1";

export type ProgressSnapshot = {
  progress: Progress;
  days: DayEntry[];
  savedAt: number;
};

export type LastCorrection = {
  eventId: string;
  kind: "minutes" | "shakubuku" | "super";
  amount: number;
  secret: string;
  expiresAt: number;
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

export function loadLastCorrection(): LastCorrection | null {
  try {
    const raw = localStorage.getItem(STORAGE_CORRECTION);
    if (!raw) return null;
    return JSON.parse(raw) as LastCorrection;
  } catch {
    return null;
  }
}

export function saveLastCorrection(value: LastCorrection | null) {
  if (!value) localStorage.removeItem(STORAGE_CORRECTION);
  else localStorage.setItem(STORAGE_CORRECTION, JSON.stringify(value));
}

export { headers as progressHeaders };
