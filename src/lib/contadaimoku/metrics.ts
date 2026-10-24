import type { TrackKind } from "./config";
import { MILESTONES } from "./milestones";
import type { DayEntry, Progress } from "./types";

export function completedStages(value: number, kind: TrackKind) {
  return MILESTONES[kind].filter((m) => value >= m.value).length;
}

export function stageInfo(value: number, kind: TrackKind) {
  const stages = MILESTONES[kind];
  const completed = completedStages(value, kind);
  if (completed >= stages.length) {
    const last = stages[stages.length - 1];
    return { completed, localPct: 1, visualPct: 1, next: last, remaining: 0 };
  }
  const prev = completed === 0 ? 0 : stages[completed - 1].value;
  const next = stages[completed];
  const localPct = Math.min(1, Math.max(0, (value - prev) / (next.value - prev)));
  return {
    completed,
    localPct,
    visualPct: (completed + localPct) / stages.length,
    next,
    remaining: Math.max(0, next.value - value),
  };
}

export function dayKeyRome(date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Rome" }).format(date);
}

export function emptyDay(day: string): DayEntry {
  return { day, minutes: 0, daimokuSessions: 0, shakubuku: 0, super: 0 };
}

export function upsertDay(days: DayEntry[], patch: Partial<DayEntry> & { day: string }) {
  const index = days.findIndex((d) => d.day === patch.day);
  const base = index >= 0 ? days[index] : emptyDay(patch.day);
  const merged = { ...base, ...patch };
  const next = [...days];
  if (index >= 0) next[index] = merged;
  else next.push(merged);
  next.sort((a, b) => a.day.localeCompare(b.day));
  return next;
}

export function metricForDay(day: DayEntry, metric: "daimoku" | "shakubuku" | "super" | "contributi") {
  if (metric === "daimoku") return day.minutes * 50;
  if (metric === "shakubuku") return day.shakubuku;
  if (metric === "super") return day.super;
  return day.daimokuSessions + day.shakubuku + day.super;
}

export function totalContributions(progress: Progress, days: DayEntry[]) {
  const sessions = days.reduce((sum, d) => sum + d.daimokuSessions, 0);
  const plus = progress.shakubuku + progress.super;
  return sessions + plus;
}
