import { NextRequest, NextResponse } from "next/server";
import { createProofChallenge, sha256Hex, verifyProof } from "@/lib/contadaimoku/proof";
import {
  applyMinutes,
  applyPlus,
  getPlus,
  getTimer,
  readState,
  savePlus,
  saveTimer,
} from "@/lib/contadaimoku/store";
import { dayKeyRome } from "@/lib/contadaimoku/metrics";
import { activeTimerCount, clearTimerActive, markTimerActive } from "@/lib/contadaimoku/presence";
import type { PlusEvent, TimerSession } from "@/lib/contadaimoku/types";

function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status });
}

function requireActionHeader(request: NextRequest) {
  return request.headers.get("x-contadaimoku-action") === "1";
}

export async function GET() {
  const state = await readState();
  const active = await activeTimerCount();
  return json({ progress: state.progress, days: state.days, presence: { active } });
}

async function parseBody(request: NextRequest) {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  if (!requireActionHeader(request)) {
    return json({ error: "Richiesta non valida" }, 400);
  }
  const body = await parseBody(request);
  if (!body || typeof body.action !== "string") {
    return json({ error: "Azione mancante" }, 400);
  }

  if (body.action === "proof:challenge") {
    const purpose = String(body.purpose ?? "");
    const amount = Number(body.amount ?? 0);
    if (!purpose || !Number.isFinite(amount)) {
      return json({ error: "Parametri non validi" }, 400);
    }
    const proof = createProofChallenge(purpose, amount);
    return json({ proof });
  }

  const state = await readState();

  if (body.action === "timer:start") {
    const sessionId = String(body.sessionId ?? "");
    const durationMinutes = Number(body.durationMinutes ?? 0);
    const secretHash = String(body.secretHash ?? "");
    const proofToken = String(body.proofToken ?? "");
    const proofSolution = String(body.proofSolution ?? "");
    if (
      !/^[0-9a-f-]{36}$/i.test(sessionId) ||
      !Number.isInteger(durationMinutes) ||
      durationMinutes < 1 ||
      durationMinutes > 720 ||
      !secretHash
    ) {
      return json({ error: "Sessione non valida" }, 400);
    }
    if (!verifyProof(proofToken, proofSolution)) {
      return json({ error: "Verifica anonima non valida" }, 403);
    }
    const startedAt = Math.floor(Date.now() / 1000);
    const endsAt = startedAt + durationMinutes * 60;
    const session: TimerSession = {
      id: sessionId,
      secretHash,
      minutes: durationMinutes,
      startedAt,
      endsAt,
    };
    await saveTimer(session);
    await markTimerActive(sessionId);
    const active = await activeTimerCount();
    return json({
      timer: { startedAt, endsAt },
      presence: { active },
    });
  }

  if (body.action === "timer:manual") {
    const sessionId = String(body.sessionId ?? "");
    const minutes = Number(body.minutes ?? 0);
    const secretHash = String(body.secretHash ?? "");
    const proofToken = String(body.proofToken ?? "");
    const proofSolution = String(body.proofSolution ?? "");
    if (
      !/^[0-9a-f-]{36}$/i.test(sessionId) ||
      !Number.isInteger(minutes) ||
      minutes < 1 ||
      minutes > 720
    ) {
      return json({ error: "Minuti non validi" }, 400);
    }
    if (!verifyProof(proofToken, proofSolution)) {
      return json({ error: "Verifica anonima non valida" }, 403);
    }
    const session: TimerSession = {
      id: sessionId,
      secretHash,
      minutes,
      startedAt: Math.floor(Date.now() / 1000),
      endsAt: Math.floor(Date.now() / 1000),
      completed: true,
      countedMinutes: minutes,
    };
    await saveTimer(session);
    const updated = await applyMinutes(state, minutes);
    return json({
      progress: updated.progress,
      days: updated.days,
      timer: { id: sessionId, countedMinutes: minutes },
    });
  }

  if (body.action === "timer:complete") {
    const sessionId = String(body.sessionId ?? "");
    const secret = String(body.secret ?? "");
    const stopEarly = Boolean(body.stopEarly);
    const countedMinutes = body.countedMinutes !== undefined ? Number(body.countedMinutes) : undefined;
    const session = await getTimer(sessionId);
    if (!session) return json({ error: "Sessione non trovata" }, 404);
    if (session.completed) return json({ error: "Sessione già registrata" }, 409);
    const secretHash = await sha256Hex(secret);
    if (secretHash !== session.secretHash) {
      return json({ error: "Segreto non valido" }, 403);
    }
    let minutes = session.minutes;
    if (stopEarly && countedMinutes !== undefined) {
      minutes = Math.max(1, Math.min(session.minutes, Math.floor(countedMinutes)));
    }
    session.completed = true;
    session.countedMinutes = minutes;
    await saveTimer(session);
    await clearTimerActive(sessionId);
    const updated = await applyMinutes(state, minutes);
    return json({
      progress: updated.progress,
      days: updated.days,
      timer: { id: sessionId, countedMinutes: minutes },
    });
  }

  if (body.action === "timer:cancel") {
    const sessionId = String(body.sessionId ?? "");
    const secret = String(body.secret ?? "");
    const session = await getTimer(sessionId);
    if (!session) return json({ error: "Sessione non trovata" }, 404);
    const secretHash = await sha256Hex(secret);
    if (secretHash !== session.secretHash) {
      return json({ error: "Segreto non valido" }, 403);
    }
    await clearTimerActive(sessionId);
    return json({ cancelled: sessionId });
  }

  if (body.action === "plus:add") {
    const kind = body.kind === "super" ? "super" : body.kind === "shakubuku" ? "shakubuku" : null;
    const amount = Number(body.amount ?? 1);
    const requestId = String(body.requestId ?? "");
    const verifierHash = String(body.verifierHash ?? "");
    const proofToken = String(body.proofToken ?? "");
    const proofSolution = String(body.proofSolution ?? "");
    if (!kind || !/^[0-9a-f-]{36}$/i.test(requestId) || !Number.isInteger(amount) || amount < 1) {
      return json({ error: "Contributo non valido" }, 400);
    }
    if (kind === "super" && amount > 1) return json({ error: "Importo non valido" }, 400);
    if (kind === "shakubuku" && amount > 50) return json({ error: "Importo non valido" }, 400);
    if (!verifyProof(proofToken, proofSolution)) {
      return json({ error: "Verifica anonima non valida" }, 403);
    }
    const existing = await getPlus(requestId);
    if (existing) return json({ error: "Contributo già registrato" }, 409);
    const eventDay = dayKeyRome();
    const event: PlusEvent = {
      id: requestId,
      kind,
      amount,
      secretHash: verifierHash,
      createdAt: Date.now(),
      day: eventDay,
    };
    await savePlus(event);
    const updated = await applyPlus(state, kind, amount);
    return json({
      progress: updated.progress,
      days: updated.days,
      event: { id: requestId, kind, amount },
    });
  }

  return json({ error: "Azione non supportata" }, 400);
}
