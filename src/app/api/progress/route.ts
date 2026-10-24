import { NextRequest, NextResponse } from "next/server";
import { createProofChallenge, sha256Hex, verifyProof } from "@/lib/contadaimoku/proof";
import {
  applyMinutes,
  applyPlus,
  correctMinutes,
  getPlus,
  getTimer,
  isValidDays,
  isValidProgress,
  readState,
  savePlus,
  saveTimer,
  undoPlus,
} from "@/lib/contadaimoku/store";
import { dayKeyRome } from "@/lib/contadaimoku/metrics";
import type { PlusEvent, TimerSession } from "@/lib/contadaimoku/types";

const CORRECTION_WINDOW_SEC = 48 * 60 * 60;

function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status });
}

function requireActionHeader(request: NextRequest) {
  return request.headers.get("x-contadaimoku-action") === "1";
}

export async function GET() {
  const state = await readState();
  return json({ progress: state.progress, days: state.days });
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
    return json({
      timer: { startedAt, endsAt },
      presence: { active: 1 },
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
    const correctionUntil = Math.floor(Date.now() / 1000) + CORRECTION_WINDOW_SEC;
    const session: TimerSession = {
      id: sessionId,
      secretHash,
      minutes,
      startedAt: Math.floor(Date.now() / 1000),
      endsAt: Math.floor(Date.now() / 1000),
      completed: true,
      countedMinutes: minutes,
      correctionUntil,
    };
    await saveTimer(session);
    const updated = await applyMinutes(state, minutes);
    return json({
      progress: updated.progress,
      days: updated.days,
      timer: { id: sessionId, countedMinutes: minutes, correctionUntil },
    });
  }

  if (body.action === "timer:complete") {
    const sessionId = String(body.sessionId ?? "");
    const secret = String(body.secret ?? "");
    const stopEarly = Boolean(body.stopEarly);
    const countedMinutes = body.countedMinutes !== undefined ? Number(body.countedMinutes) : undefined;
    const session = await getTimer(sessionId);
    if (!session) return json({ error: "Sessione non trovata" }, 404);
    const secretHash = await sha256Hex(secret);
    if (secretHash !== session.secretHash) {
      return json({ error: "Segreto non valido" }, 403);
    }
    let minutes = session.minutes;
    if (stopEarly && countedMinutes !== undefined) {
      minutes = Math.max(1, Math.min(session.minutes, Math.floor(countedMinutes)));
    }
    const correctionUntil = Math.floor(Date.now() / 1000) + CORRECTION_WINDOW_SEC;
    session.completed = true;
    session.countedMinutes = minutes;
    session.correctionUntil = correctionUntil;
    await saveTimer(session);
    const updated = await applyMinutes(state, minutes);
    return json({
      progress: updated.progress,
      days: updated.days,
      timer: { id: sessionId, countedMinutes: minutes, correctionUntil },
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
    const event: PlusEvent = {
      id: requestId,
      kind,
      amount,
      secretHash: verifierHash,
      createdAt: Date.now(),
    };
    await savePlus(event);
    const updated = await applyPlus(state, kind, amount);
    const correctionUntil = Math.floor(Date.now() / 1000) + CORRECTION_WINDOW_SEC;
    return json({
      progress: updated.progress,
      days: updated.days,
      event: { id: requestId, kind, amount, correctionUntil },
    });
  }

  return json({ error: "Azione non supportata" }, 400);
}

export async function PATCH(request: NextRequest) {
  if (!requireActionHeader(request)) {
    return json({ error: "Richiesta non valida" }, 400);
  }
  const body = await parseBody(request);
  if (body?.action !== "timer:correct") {
    return json({ error: "Azione non supportata" }, 400);
  }
  const sessionId = String(body.sessionId ?? "");
  const secret = String(body.secret ?? "");
  const minutes = Number(body.minutes ?? 0);
  const session = await getTimer(sessionId);
  if (!session?.completed || !session.countedMinutes) {
    return json({ error: "Sessione non correggibile" }, 404);
  }
  if ((session.correctionUntil ?? 0) < Math.floor(Date.now() / 1000)) {
    return json({ error: "Finestra di correzione scaduta" }, 403);
  }
  const secretHash = await sha256Hex(secret);
  if (secretHash !== session.secretHash) {
    return json({ error: "Segreto non valido" }, 403);
  }
  if (!Number.isInteger(minutes) || minutes < 0 || minutes > session.countedMinutes) {
    return json({ error: "Minuti non validi" }, 400);
  }
  const delta = minutes - session.countedMinutes;
  const deltaSessions = minutes === 0 ? -1 : 0;
  session.countedMinutes = minutes;
  if (minutes === 0) session.correctionUntil = Math.floor(Date.now() / 1000);
  await saveTimer(session);
  const state = await readState();
  const updated = await correctMinutes(state, delta, deltaSessions);
  return json({ progress: updated.progress, days: updated.days });
}

export async function DELETE(request: NextRequest) {
  if (!requireActionHeader(request)) {
    return json({ error: "Richiesta non valida" }, 400);
  }
  const body = await parseBody(request);
  if (body?.action !== "plus:undo") {
    return json({ error: "Azione non supportata" }, 400);
  }
  const eventId = String(body.eventId ?? "");
  const kind = body.kind === "super" ? "super" : body.kind === "shakubuku" ? "shakubuku" : null;
  const secret = String(body.secret ?? "");
  if (!kind || !/^[0-9a-f-]{36}$/i.test(eventId)) {
    return json({ error: "Evento non valido" }, 400);
  }
  const event = await getPlus(eventId);
  if (!event) return json({ error: "Evento non trovato" }, 404);
  const secretHash = await sha256Hex(secret);
  if (secretHash !== event.secretHash) {
    return json({ error: "Segreto non valido" }, 403);
  }
  const state = await readState();
  const updated = await undoPlus(state, kind, event.amount, dayKeyRome());
  return json({ progress: updated.progress, days: updated.days });
}
