import { CAMPAIGN, DAIMOKU_PER_MINUTE, type TrackKind } from "./config";

const number = new Intl.NumberFormat("it-IT");

export function formatCount(value: number) {
  return number.format(Math.max(0, Math.round(value)));
}

export function formatDaimoku(minutes: number) {
  return `${formatCount(minutes * DAIMOKU_PER_MINUTE)} Daimoku`;
}

export function formatMillionsDaimoku(minutes: number) {
  const millions = Math.max(0, minutes * DAIMOKU_PER_MINUTE) / 1_000_000;
  const digits = millions > 0 && millions < 0.01 ? 3 : millions < 1 ? 2 : 1;
  return `${new Intl.NumberFormat("it-IT", {
    minimumFractionDigits: millions === 0 ? 0 : 1,
    maximumFractionDigits: digits,
  }).format(millions)} milioni`;
}

export function formatTimer(ms: number) {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  if (hours > 0) {
    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export function trackValue(progress: { minutes: number; shakubuku: number; super: number }, kind: TrackKind) {
  if (kind === "daimoku") return progress.minutes;
  if (kind === "shakubuku") return progress.shakubuku;
  return progress.super;
}

export function milestoneLabel(kind: TrackKind, value: number) {
  if (kind === "daimoku") return formatDaimoku(value);
  if (kind === "super") return `${formatCount(value)} inviti`;
  return `${formatCount(value)} Shakubuku`;
}

export function campaignProgress(minutes: number) {
  return Math.min(1, minutes / CAMPAIGN.daimokuGoalMinutes);
}
