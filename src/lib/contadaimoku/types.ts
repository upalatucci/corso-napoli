export type Progress = {
  minutes: number;
  shakubuku: number;
  super: number;
  updatedAt: number;
};

export type DayEntry = {
  day: string;
  minutes: number;
  daimokuSessions: number;
  shakubuku: number;
  super: number;
};

export type Milestone = {
  title: string;
  value: number;
  quote: string;
  source: string;
};

export type TimerSession = {
  id: string;
  secretHash: string;
  minutes: number;
  startedAt: number;
  endsAt: number;
  completed?: boolean;
  countedMinutes?: number;
  correctionUntil?: number;
};

export type PlusEvent = {
  id: string;
  kind: "shakubuku" | "super";
  amount: number;
  secretHash: string;
  createdAt: number;
  day: string;
};

export type StoredState = {
  progress: Progress;
  days: DayEntry[];
};
