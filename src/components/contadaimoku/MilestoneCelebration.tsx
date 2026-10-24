"use client";

import type { TrackKind } from "@/lib/contadaimoku/config";
import { TRACKS } from "@/lib/contadaimoku/config";
import { milestoneLabel } from "@/lib/contadaimoku/format";
import { MILESTONES } from "@/lib/contadaimoku/milestones";

export type Celebration = {
  kind: TrackKind;
  milestoneIndex: number;
  bulk?: boolean;
  amount?: number;
};

type Props = {
  celebration: Celebration | null;
  onClose: () => void;
};

export function MilestoneCelebration({ celebration, onClose }: Props) {
  if (!celebration) return null;
  const milestone = MILESTONES[celebration.kind][celebration.milestoneIndex];
  if (!milestone) return null;

  const title =
    celebration.bulk && celebration.amount
      ? `${celebration.amount} Shakubuku registrati`
      : `Nuova tappa · ${TRACKS[celebration.kind].short}`;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center" role="dialog">
      <div className="w-full max-w-lg rounded-3xl bg-gradient-to-b from-[#d9f3fb] to-[#2bb9e3] p-6 text-[#05324f] shadow-2xl">
        <p className="text-xs font-semibold uppercase tracking-widest">Un’onda di incoraggiamento</p>
        <h2 className="mt-2 font-display text-3xl">{title}</h2>
        <p className="mt-1 text-sm font-semibold">{milestone.title}</p>
        <p className="mt-1 text-sm">{milestoneLabel(celebration.kind, milestone.value)}</p>
        <blockquote className="mt-4 border-l-4 border-[#0a3d62]/40 pl-4 italic">«{milestone.quote}»</blockquote>
        <cite className="mt-3 block text-xs text-[#0a3d62]/80">{milestone.source}</cite>
        <button
          type="button"
          className="mt-6 w-full rounded-2xl bg-[#0a3d62] px-4 py-3 font-semibold text-white"
          onClick={onClose}
        >
          Continua il cammino
        </button>
      </div>
    </div>
  );
}
