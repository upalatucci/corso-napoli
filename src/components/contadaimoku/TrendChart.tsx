"use client";

import type { ChartBucket } from "@/lib/contadaimoku/metrics";
import { chartSummary, metricForDay } from "@/lib/contadaimoku/metrics";
import { formatCount, formatDaimoku } from "@/lib/contadaimoku/format";

type Metric = "daimoku" | "shakubuku" | "super" | "contributi";

function formatMetricValue(metric: Metric, value: number) {
  if (metric === "daimoku") return formatDaimoku(value / 50);
  return formatCount(value);
}

export function TrendChart({
  buckets,
  metric,
  rangeLabel,
}: {
  buckets: ChartBucket[];
  metric: Metric;
  rangeLabel: string;
}) {
  const values = buckets.map((d) => metricForDay(d, metric));
  const max = Math.max(1, ...values);
  const totals = values.reduce<number[]>((acc, v, i) => {
    acc.push((acc[i - 1] ?? 0) + v);
    return acc;
  }, []);
  const totalMax = Math.max(1, ...totals);
  const summary = chartSummary(buckets, metric);

  const width = 720;
  const height = 160;
  const pad = 18;
  const innerW = width - pad * 2;
  const step = innerW / Math.max(buckets.length, 1);
  const barW = Math.max(4, step - 4);

  return (
    <div className="rounded-2xl border border-white/20 bg-[#063a5c]/40 p-4 backdrop-blur-sm">
      <div className="mb-3 flex flex-wrap items-end justify-between gap-2 text-sm text-white/80">
        <span className="uppercase tracking-widest">{rangeLabel}</span>
        <span>
          Totale raggiunto: <strong className="text-white">{formatMetricValue(metric, totals.at(-1) ?? 0)}</strong>
        </span>
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} className="h-auto w-full" role="img">
        <title>{metric}: contributi del periodo e totale cumulativo</title>
        {buckets.map((day, index) => {
          const x = pad + index * step;
          const barH = (values[index] / max) * 70;
          const lineY = height - 28 - ((totals[index] ?? 0) / totalMax) * 70;
          return (
            <g key={day.key}>
              <rect
                x={x}
                y={height - 28 - barH}
                width={barW}
                height={Math.max(1, barH)}
                rx={4}
                className="fill-[#5ed4f3]"
              >
                <title>{day.fullLabel}: {formatMetricValue(metric, values[index])}</title>
              </rect>
              {index % Math.ceil(buckets.length / 7) === 0 && (
                <text x={x + barW / 2} y={height - 6} textAnchor="middle" className="fill-white/70 text-[10px]">
                  {day.label}
                </text>
              )}
              <circle cx={x + barW / 2} cy={lineY} r={3} className="fill-white" />
            </g>
          );
        })}
        <polyline
          fill="none"
          stroke="white"
          strokeWidth={2}
          points={buckets
            .map((_, index) => {
              const x = pad + index * step + barW / 2;
              const y = height - 28 - ((totals[index] ?? 0) / totalMax) * 70;
              return `${x},${y}`;
            })
            .join(" ")}
        />
      </svg>
      <div className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
        <div>
          <span className="text-white/70">Aggiunti nel periodo</span>
          <p className="font-semibold">{formatMetricValue(metric, summary.periodTotal)}</p>
        </div>
        <div>
          <span className="text-white/70">Media nel periodo</span>
          <p className="font-semibold">{formatMetricValue(metric, summary.average)}</p>
        </div>
        <div>
          <span className="text-white/70">Giorno migliore</span>
          <p className="font-semibold">{summary.bestLabel}</p>
        </div>
      </div>
    </div>
  );
}
