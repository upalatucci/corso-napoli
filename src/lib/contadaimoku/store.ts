import { kv } from "@vercel/kv";
import { STORAGE_PREFIX } from "./config";
import { dayKeyRome, emptyDay, upsertDay } from "./metrics";
import type { DayEntry, PlusEvent, Progress, StoredState, TimerSession } from "./types";

const STATE_KEY = `${STORAGE_PREFIX}:state`;

const defaultProgress = (): Progress => ({
  minutes: 0,
  shakubuku: 0,
  super: 0,
  updatedAt: Math.floor(Date.now() / 1000),
});

export async function readState(): Promise<StoredState> {
  const state = await kv.get<StoredState>(STATE_KEY);
  if (!state?.progress) {
    return { progress: defaultProgress(), days: [] };
  }
  return {
    progress: state.progress,
    days: Array.isArray(state.days) ? state.days : [],
  };
}

async function writeState(state: StoredState) {
  state.progress.updatedAt = Math.floor(Date.now() / 1000);
  await kv.set(STATE_KEY, state);
  return state;
}

function timerKey(id: string) {
  return `${STORAGE_PREFIX}:timer:${id}`;
}

function plusKey(id: string) {
  return `${STORAGE_PREFIX}:plus:${id}`;
}

export async function saveTimer(session: TimerSession) {
  await kv.set(timerKey(session.id), session, { ex: 60 * 60 * 24 * 8 });
}

export async function getTimer(id: string) {
  return kv.get<TimerSession>(timerKey(id));
}

export async function savePlus(event: PlusEvent) {
  await kv.set(plusKey(event.id), event, { ex: 60 * 60 * 24 * 8 });
}

export async function getPlus(id: string) {
  return kv.get<PlusEvent>(plusKey(id));
}

export async function applyMinutes(
  state: StoredState,
  minutes: number,
  options?: { sessions?: number },
): Promise<StoredState> {
  const day = dayKeyRome();
  const sessions = options?.sessions ?? 1;
  const next: StoredState = {
    progress: {
      ...state.progress,
      minutes: state.progress.minutes + minutes,
    },
    days: upsertDay(state.days, {
      day,
      minutes: (state.days.find((d) => d.day === day) ?? emptyDay(day)).minutes + minutes,
      daimokuSessions:
        (state.days.find((d) => d.day === day) ?? emptyDay(day)).daimokuSessions + sessions,
    }),
  };
  return writeState(next);
}

export async function applyPlus(
  state: StoredState,
  kind: "shakubuku" | "super",
  amount: number,
): Promise<StoredState> {
  const day = dayKeyRome();
  const current = state.days.find((d) => d.day === day) ?? emptyDay(day);
  const next: StoredState = {
    progress: {
      ...state.progress,
      [kind]: state.progress[kind] + amount,
    },
    days: upsertDay(state.days, {
      day,
      [kind]: current[kind] + amount,
    }),
  };
  return writeState(next);
}

export async function correctMinutes(state: StoredState, deltaMinutes: number, deltaSessions: number) {
  const day = dayKeyRome();
  const current = state.days.find((d) => d.day === day) ?? emptyDay(day);
  const next: StoredState = {
    progress: {
      ...state.progress,
      minutes: Math.max(0, state.progress.minutes + deltaMinutes),
    },
    days: upsertDay(state.days, {
      day,
      minutes: Math.max(0, current.minutes + deltaMinutes),
      daimokuSessions: Math.max(0, current.daimokuSessions + deltaSessions),
    }),
  };
  return writeState(next);
}

export async function undoPlus(
  state: StoredState,
  kind: "shakubuku" | "super",
  amount: number,
  day: string,
) {
  const current = state.days.find((d) => d.day === day) ?? emptyDay(day);
  const next: StoredState = {
    progress: {
      ...state.progress,
      [kind]: Math.max(0, state.progress[kind] - amount),
    },
    days: upsertDay(state.days, {
      day,
      [kind]: Math.max(0, current[kind] - amount),
    }),
  };
  return writeState(next);
}

export function isValidProgress(value: unknown): value is Progress {
  if (!value || typeof value !== "object") return false;
  const p = value as Progress;
  return ["minutes", "shakubuku", "super"].every(
    (k) => Number.isFinite((p as Record<string, number>)[k]) && (p as Record<string, number>)[k] >= 0,
  );
}

export function isValidDays(value: unknown): value is DayEntry[] {
  return (
    Array.isArray(value) &&
    value.every(
      (e) =>
        e &&
        typeof e === "object" &&
        typeof e.day === "string" &&
        /^\d{4}-\d{2}-\d{2}$/.test(e.day) &&
        [e.minutes, e.daimokuSessions, e.shakubuku, e.super].every((n) => Number.isFinite(n) && n >= 0),
    )
  );
}
