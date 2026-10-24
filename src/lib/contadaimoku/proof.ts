import { createHash, randomBytes } from "crypto";

const DEFAULT_DIFFICULTY = 19;
const TIMER_START_DIFFICULTY = 16;

function difficultyForPurpose(purpose: string) {
  return purpose === "timer:start" ? TIMER_START_DIFFICULTY : DEFAULT_DIFFICULTY;
}

export type ProofChallenge = {
  token: string;
  difficulty: number;
  expiresAt: number;
  algorithm: "SHA-256";
};

function base64Url(bytes: Buffer) {
  return bytes.toString("base64url");
}

export function createProofChallenge(purpose: string, amount: number): ProofChallenge {
  const secret = base64Url(randomBytes(32));
  const expiresAt = Math.floor(Date.now() / 1000) + 300;
  const difficulty = difficultyForPurpose(purpose);
  const payload = base64Url(Buffer.from(JSON.stringify({ purpose, amount, expiresAt, difficulty })));
  const token = `${payload}.${secret}`;
  return { token, difficulty, expiresAt, algorithm: "SHA-256" };
}

function leadingZeroBits(hash: Buffer) {
  let bits = 0;
  for (const byte of hash) {
    if (byte === 0) {
      bits += 8;
      continue;
    }
    bits += Math.clz32(byte) - 24;
    break;
  }
  return bits;
}

function readPayload(token: string) {
  try {
    const [payloadB64] = token.split(".");
    return JSON.parse(Buffer.from(payloadB64, "base64url").toString("utf8")) as {
      expiresAt?: number;
      difficulty?: number;
      purpose?: string;
    };
  } catch {
    return null;
  }
}

export function verifyProof(token: string, solution: string) {
  if (!/^[A-Za-z0-9_-]{20,600}\.[A-Za-z0-9_-]{43}$/.test(token)) return false;
  if (!/^(0|[1-9]\d{0,9})$/.test(solution)) return false;
  const payload = readPayload(token);
  if (!payload) return false;
  const expiresAt = payload.expiresAt ?? 0;
  if (expiresAt * 1000 < Date.now() + 2000) return false;
  const difficulty =
    typeof payload.difficulty === "number" && payload.difficulty >= 12 && payload.difficulty <= 22
      ? payload.difficulty
      : difficultyForPurpose(payload.purpose ?? "");
  const hash = createHash("sha256").update(`${token}.${solution}`).digest();
  return leadingZeroBits(hash) >= difficulty;
}

export async function sha256Hex(text: string) {
  const hash = createHash("sha256").update(text).digest("hex");
  return hash;
}
