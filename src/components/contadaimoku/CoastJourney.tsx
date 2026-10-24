"use client";

import { COAST_STOPS } from "@/lib/contadaimoku/milestones";
import type { TrackKind } from "@/lib/contadaimoku/config";
import { TRACKS } from "@/lib/contadaimoku/config";

type PreviewStages = Record<TrackKind, number>;

export function CoastJourney({
  fill,
  preview,
  previewTrack,
  onPreviewTrack,
  onPreviewStep,
  onExitPreview,
}: {
  fill: number;
  preview: PreviewStages | null;
  previewTrack: TrackKind;
  onPreviewTrack: (kind: TrackKind) => void;
  onPreviewStep: (delta: number) => void;
  onExitPreview: () => void;
}) {
  const previewFill = preview
    ? (preview.daimoku + preview.shakubuku + preview.super) / 36
    : null;
  const progress = Math.min(1, Math.max(0, previewFill ?? fill));
  const reached = Math.floor(progress * COAST_STOPS.length);

  return (
    <div className="space-y-4">
      <div className="relative overflow-hidden rounded-3xl border border-white/25 bg-gradient-to-b from-[#b8e8f7] to-[#2bb9e3] p-6 shadow-xl">
        {preview && (
          <span className="absolute right-4 top-4 rounded-full bg-[#0a3d62] px-3 py-1 text-xs font-semibold text-white">
            Anteprima · nessun dato registrato
          </span>
        )}
        <div
          className="absolute inset-y-0 left-0 bg-gradient-to-r from-[#ffffff55] to-[#ffffff00] transition-[width] duration-700"
          style={{ width: `${progress * 100}%` }}
          aria-hidden
        />
        <div className="relative z-10">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#0a3d62]">Un viaggio lungo il Golfo</p>
          <h3 className="mt-1 font-display text-2xl text-[#05324f]">12 onde verso il corso</h3>
          <svg viewBox="0 0 800 220" className="mt-4 w-full" aria-hidden>
            <path
              d="M 20 150 C 120 120, 180 170, 260 130 S 420 90, 520 120 S 650 60, 780 100"
              fill="none"
              stroke="#0a3d62"
              strokeWidth="4"
              strokeDasharray="8 10"
              opacity={0.35}
            />
            <path
              d="M 20 150 C 120 120, 180 170, 260 130 S 420 90, 520 120 S 650 60, 780 100"
              fill="none"
              stroke="#ffffff"
              strokeWidth="5"
              pathLength={1}
              strokeDasharray={`${progress} 1`}
            />
            {COAST_STOPS.map((stop, index) => {
              const t = index / (COAST_STOPS.length - 1);
              const x = 20 + t * 760;
              const y = 150 - Math.sin(t * Math.PI) * 55;
              const active = index < reached;
              return (
                <g key={stop}>
                  <circle cx={x} cy={y} r={active ? 9 : 6} fill={active ? "#ffffff" : "#0a3d6288"} />
                  {index % 2 === 0 && (
                    <text x={x} y={y + 22} textAnchor="middle" fontSize="11" fill="#05324f">
                      {stop}
                    </text>
                  )}
                </g>
              );
            })}
          </svg>
          <p className="mt-2 text-sm text-[#05324f]">
            Da <strong>Pozzuoli</strong> verso <strong>Capri</strong>: ogni tappa si illumina con il cammino
            collettivo.
          </p>
        </div>
      </div>

      <div className="rounded-3xl border border-white/20 bg-white/10 p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-widest text-white/70">Esplora le tappe</p>
            <p className="font-semibold">Guarda il percorso in anteprima</p>
            <p className="text-sm text-white/80">Serve solo a vedere come cambia il viaggio. I conteggi reali non cambiano.</p>
          </div>
          {preview && (
            <button type="button" className="rounded-full border border-white/40 px-3 py-1 text-sm" onClick={onExitPreview}>
              Torna al percorso reale
            </button>
          )}
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {(Object.keys(TRACKS) as TrackKind[]).map((kind) => (
            <button
              key={kind}
              type="button"
              className={`rounded-full px-3 py-1 text-sm ${previewTrack === kind ? "bg-white text-[#05324f]" : "bg-white/15"}`}
              onClick={() => onPreviewTrack(kind)}
            >
              {TRACKS[kind].short}
            </button>
          ))}
        </div>
        <div className="mt-4 flex items-center justify-center gap-4">
          <button
            type="button"
            className="rounded-full border border-white/40 px-4 py-2"
            disabled={!preview && false}
            onClick={() => onPreviewStep(-1)}
            aria-label="Tappa precedente in anteprima"
          >
            ‹
          </button>
          <output className="text-center">
            <strong className="text-2xl">{preview ? preview[previewTrack] : "—"}</strong>
            <span className="block text-xs text-white/70">/ 12 tappe · {TRACKS[previewTrack].short}</span>
          </output>
          <button
            type="button"
            className="rounded-full border border-white/40 px-4 py-2"
            onClick={() => onPreviewStep(1)}
            aria-label="Tappa successiva in anteprima"
          >
            ›
          </button>
        </div>
      </div>
    </div>
  );
}
