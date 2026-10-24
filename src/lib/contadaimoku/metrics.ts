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

function parseDay(day: string) {
  return new Date(`${day}T00:00:00Z`);
}

function addDays(date: Date, offset: number) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + offset);
  return next;
}

function dayIso(date: Date) {
  return date.toISOString().slice(0, 10);
}

const shortDate = new Intl.DateTimeFormat("it-IT", { day: "numeric", month: "short", timeZone: "UTC" });
const longDate = new Intl.DateTimeFormat("it-IT", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

function sumDays(entries: DayEntry[], key: string, label: string, fullLabel: string): DayEntry & {
  key: string;
  label: string;
  fullLabel: string;
} {
  const total = entries.reduce(
    (acc, e) => ({
      ...acc,
      minutes: acc.minutes + e.minutes,
      daimokuSessions: acc.daimokuSessions + e.daimokuSessions,
      shakubuku: acc.shakubuku + e.shakubuku,
      super: acc.super + e.super,
    }),
    emptyDay(key),
  );
  return { ...total, key, label, fullLabel };
}

export type ChartBucket = DayEntry & { key: string; label: string; fullLabel: string };

export function bucketDays(
  days: DayEntry[],
  mode: "day" | "week" | "all",
  anchor = new Date(),
): ChartBucket[] {
  const map = new Map(days.map((d) => [d.day, d]));
  const anchorDay = parseDay(dayKeyRome(anchor));
  const lastDay = days.length ? parseDay(days[days.length - 1].day) : anchorDay;
  const end = lastDay > anchorDay ? lastDay : anchorDay;

  if (mode === "day") {
    const start = addDays(end, -13);
    const buckets: ChartBucket[] = [];
    for (let cursor = start; cursor <= end; cursor = addDays(cursor, 1)) {
      const key = dayIso(cursor);
      const base = map.get(key) ?? emptyDay(key);
      buckets.push({
        ...base,
        key,
        label: shortDate.format(cursor),
        fullLabel: longDate.format(cursor),
      });
    }
    return buckets;
  }

  if (mode === "week") {
    const weekStart = new Date(end);
    weekStart.setUTCDate(weekStart.getUTCDate() - ((weekStart.getUTCDay() + 6) % 7));
    return Array.from({ length: 12 }, (_, index) => {
      const start = addDays(weekStart, (index - 11) * 7);
      const finish = addDays(start, 6);
      const key = dayIso(start);
      const slice = days.filter((d) => {
        const day = parseDay(d.day);
        return day >= start && day <= finish;
      });
      return sumDays(slice, key, shortDate.format(start), `${longDate.format(start)} – ${longDate.format(finish)}`);
    });
  }

  if (!days.length) return [];
  const first = parseDay(days[0].day);
  const start = new Date(first);
  start.setUTCDate(start.getUTCDate() - ((start.getUTCDay() + 6) % 7));
  const finishWeek = new Date(end);
  finishWeek.setUTCDate(finishWeek.getUTCDate() - ((finishWeek.getUTCDay() + 6) % 7));
  const weeks = Math.max(1, Math.floor((finishWeek.getTime() - start.getTime()) / 604800000) + 1);
  return Array.from({ length: weeks }, (_, index) => {
    const weekBegin = addDays(start, index * 7);
    const weekEnd = addDays(weekBegin, 6);
    const key = dayIso(weekBegin);
    const slice = days.filter((d) => {
      const day = parseDay(d.day);
      return day >= weekBegin && day <= weekEnd;
    });
    return sumDays(slice, key, shortDate.format(weekBegin), `${longDate.format(weekBegin)} – ${longDate.format(weekEnd)}`);
  });
}

export function chartSummary(buckets: ChartBucket[], metric: "daimoku" | "shakubuku" | "super" | "contributi") {
  const values = buckets.map((b) => metricForDay(b, metric));
  const periodTotal = values.reduce((a, b) => a + b, 0);
  const active = values.filter((v) => v > 0);
  const average = active.length ? periodTotal / active.length : 0;
  let bestIndex = 0;
  let bestValue = -1;
  values.forEach((v, i) => {
    if (v > bestValue) {
      bestValue = v;
      bestIndex = i;
    }
  });
  return {
    periodTotal,
    average,
    bestLabel: bestValue > 0 ? buckets[bestIndex]?.label ?? "—" : "Nessun contributo",
  };
}
