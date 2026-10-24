"use client";

import type { DayEntry } from "@/lib/contadaimoku/types";
import { formatCount } from "@/lib/contadaimoku/format";
import { metricForDay } from "@/lib/contadaimoku/metrics";

type Metric = "daimoku" | "shakubuku" | "super" | "contributi";

export function TrendChart({
  days,
  metric,
}: {
  days: DayEntry[];
  metric: Metric;
}) {
  const slice = days.slice(-14);
  const values = slice.map((d) => metricForDay(d, metric));
  const max = Math.max(1, ...values);
  const totals = values.reduce<number[]>((acc, v, i) => {
    acc.push((acc[i - 1] ?? 0) + v);
    return acc;
  }, []);
  const totalMax = Math.max(1, ...totals);

  const width = 720;
  const height = 160;
  const pad = 18;
  const innerW = width - pad * 2;
  const barW = innerW / Math.max(slice.length, 1) - 4;

  return (
    <div className="rounded-2xl border border-white/20 bg-[#063a5c]/40 p-4 backdrop-blur-sm">
      <svg viewBox={`0 0 ${width} ${height}`} className="h-auto w-full" role="img">
        <title>
          {metric}: contributi del periodo e totale cumulativo
        </title>
        {slice.map((day, index) => {
          const x = pad + index * (innerW / Math.max(slice.length, 1));
          const barH = (values[index] / max) * 70;
          const lineY = height - 28 - (totals[index] / totalMax) * 70;
          return (
            <g key={day.day}>
              <rect
                x={x}
                y={height - 28 - barH}
                width={barW}
                height={Math.max(1, barH)}
                rx={4}
                className="fill-[#5ed4f3]"
              />
              <circle cx={x + barW / 2} cy={lineY} r={3} className="fill-white" />
            </g>
          );
        })}
        <polyline
          fill="none"
          stroke="white"
          strokeWidth={2}
          points={slice
            .map((_, index) => {
              const x = pad + index * (innerW / Math.max(slice.length, 1)) + barW / 2;
              const y = height - 28 - (totals[index] / totalMax) * 70;
              return `${x},${y}`;
            })
            .join(" ")}
        />
      </svg>
      <p className="mt-2 text-center text-sm text-white/80">
        Totale periodo: <strong className="text-white">{formatCount(values.reduce((a, b) => a + b, 0))}</strong>
      </p>
    </div>
  );
}
