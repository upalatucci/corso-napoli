"use client";

import { useEffect, useState } from "react";
import { courseNapoli2026 } from "@/lib/course";
import { WaveDecor } from "./WaveDecor";

const MINUTES_IN_MS = 60_000;
const HOURS_IN_MS = 60 * MINUTES_IN_MS;
const DAYS_IN_MS = 24 * HOURS_IN_MS;
const WEEKS_IN_MS = 7 * DAYS_IN_MS;

function pad(n: number) {
  return n.toString().padStart(2, "0");
}

function computeRemaining(targetMs: number) {
  const delta = targetMs - Date.now();
  if (delta <= 0) {
    return { weeks: 0, days: 0, hours: 0, minutes: 0, done: true };
  }
  const weeks = Math.trunc(delta / WEEKS_IN_MS);
  const afterWeeks = delta % WEEKS_IN_MS;
  const days = Math.trunc(afterWeeks / DAYS_IN_MS);
  const afterDays = afterWeeks % DAYS_IN_MS;
  const hours = Math.trunc(afterDays / HOURS_IN_MS);
  const minutes = Math.trunc((afterDays % HOURS_IN_MS) / MINUTES_IN_MS);
  return { weeks, days, hours, minutes, done: false };
}

export function CourseCountdown() {
  const target = courseNapoli2026.courseStart.getTime();
  const [parts, setParts] = useState({ weeks: 0, days: 0, hours: 0, minutes: 0, done: false });

  useEffect(() => {
    const tick = () => setParts(computeRemaining(target));
    tick();
    const id = window.setInterval(tick, 60_000);
    return () => window.clearInterval(id);
  }, [target]);

  return (
    <section className="wave-panel wave-panel--flat text-center" aria-labelledby="countdown-title">
      <WaveDecor />
      <p className="wave-eyebrow" id="countdown-title">Mancano al corso</p>
      <p className="mt-1 text-sm wave-muted">{courseNapoli2026.venueNote}</p>
      {parts.done ? (
        <p className="wave-stat mt-3">Il corso è iniziato!</p>
      ) : (
        <div className="wave-countdown-grid">
          {(
            [
              ["weeks", "Settimane", parts.weeks],
              ["days", "Giorni", parts.days],
              ["hours", "Ore", parts.hours],
              ["minutes", "Minuti", parts.minutes],
            ] as const
          ).map(([key, label, value]) => (
            <div key={key} className="wave-countdown-tile">
              <span className="wave-countdown-value">{pad(value)}</span>
              <span className="wave-countdown-unit">{label}</span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
