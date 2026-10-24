"use client";

import { COAST_STOPS } from "@/lib/contadaimoku/milestones";

export function CoastJourney({ fill }: { fill: number }) {
  const progress = Math.min(1, Math.max(0, fill));
  const reached = Math.floor(progress * COAST_STOPS.length);

  return (
    <div className="relative overflow-hidden rounded-3xl border border-white/25 bg-gradient-to-b from-[#b8e8f7] to-[#2bb9e3] p-6 shadow-xl">
      <div
        className="absolute inset-y-0 left-0 bg-gradient-to-r from-[#ffffff55] to-[#ffffff00] transition-[width] duration-700"
        style={{ width: `${progress * 100}%` }}
        aria-hidden
      />
      <div className="relative z-10">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#0a3d62]">
          Un viaggio lungo il Golfo
        </p>
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
  );
}
