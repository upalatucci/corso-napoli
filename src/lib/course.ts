/** Corso Territorio Napoli 2026 — dati pubblici (no obiettivi numerici). */
export const courseNapoli2026 = {
  title: "Corso Territorio Napoli",
  datesLabel: "6 · 7 · 8 novembre 2026",
  venue: "Grand Hotel Salerno",
  venueCity: "Salerno",
  venueNote: "Il corso si terrà al Grand Hotel Salerno dal 6 al 8 novembre 2026.",
  /** Inizio ufficiale del corso (venerdì 6 novembre 2026, ore 14:00 ora di Roma). */
  courseStart: new Date("2026-11-06T14:00:00+01:00"),
  /** Primo giorno del cammino illustrato (si illumina di un passo al giorno fino al corso). */
  journeyStart: new Date("2026-10-24T00:00:00+02:00"),
};

const ROME_TZ = "Europe/Rome";

function romeDayKey(date: Date) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: ROME_TZ }).format(date);
}

function romeDayIndex(dayKey: string) {
  const [y, m, d] = dayKey.split("-").map(Number);
  return Date.UTC(y, m - 1, d);
}

function romeDaysBetween(from: Date, to: Date) {
  return Math.round((romeDayIndex(romeDayKey(to)) - romeDayIndex(romeDayKey(from))) / 86_400_000);
}

/** 0 il primo giorno del cammino, 1 il giorno di inizio corso (fuso Europe/Rome). */
export function journeyProgress(now = new Date()) {
  const start = courseNapoli2026.journeyStart;
  const end = courseNapoli2026.courseStart;
  const today = romeDayKey(now);
  const startDay = romeDayKey(start);
  const endDay = romeDayKey(end);

  if (today < startDay) return 0;
  if (today >= endDay) return 1;

  const span = romeDaysBetween(start, end);
  if (span <= 0) return 1;

  const elapsed = romeDaysBetween(start, now);
  return Math.min(1, Math.max(0, elapsed / span));
}
