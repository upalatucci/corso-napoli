export const STORAGE_PREFIX = "contadaimoku-napoli";

export const CAMPAIGN = {
  daimokuGoalMinutes: 1_000_000,
  daimokuDisplayGoal: 50_000_000,
  shakubukuGoal: 3_000,
  invitiGoal: 300,
  deadlineLabel: "8 novembre 2026",
  courseDates: "6 · 7 · 8 novembre 2026",
};

export const DAIMOKU_PER_MINUTE = 50;

export const TRACKS = {
  daimoku: { label: "Daimoku", short: "Daimoku", unit: "minuti" },
  shakubuku: { label: "Shakubuku", short: "Shakubuku", unit: "Shakubuku" },
  super: { label: "Inviti a un meeting", short: "Inviti", unit: "inviti" },
} as const;

export type TrackKind = keyof typeof TRACKS;
