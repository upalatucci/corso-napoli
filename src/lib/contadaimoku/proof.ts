import { createHash, randomBytes } from "crypto";

const DIFFICULTY = 19;

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
  const payload = base64Url(Buffer.from(JSON.stringify({ purpose, amount, expiresAt })));
  const token = `${payload}.${secret}`;
  return { token, difficulty: DIFFICULTY, expiresAt, algorithm: "SHA-256" };
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

function readExpiresAt(token: string) {
  try {
    const [payloadB64] = token.split(".");
    const payload = JSON.parse(Buffer.from(payloadB64, "base64url").toString("utf8")) as {
      expiresAt?: number;
    };
    return payload.expiresAt ?? 0;
  } catch {
    return 0;
  }
}

export function verifyProof(token: string, solution: string) {
  if (!/^[A-Za-z0-9_-]{20,600}\.[A-Za-z0-9_-]{43}$/.test(token)) return false;
  if (!/^(0|[1-9]\d{0,9})$/.test(solution)) return false;
  const expiresAt = readExpiresAt(token);
  if (expiresAt * 1000 < Date.now() + 2000) return false;
  const hash = createHash("sha256").update(`${token}.${solution}`).digest();
  return leadingZeroBits(hash) >= DIFFICULTY;
}

export async function sha256Hex(text: string) {
  const hash = createHash("sha256").update(text).digest("hex");
  return hash;
}
