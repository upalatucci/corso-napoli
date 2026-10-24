"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { journeyProgress } from "@/lib/course";
import { JOURNEY_CAMMINO_SRC } from "@/lib/journey-asset";

const ROUTE_STOPS = [
  [70, 500],
  [160, 492],
  [250, 500],
  [340, 450],
  [430, 430],
  [520, 455],
  [610, 462],
  [700, 420],
  [790, 372],
  [880, 408],
  [980, 410],
  [1125, 360],
];

export function KamakuraKyotoJourney() {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const update = () => setProgress(journeyProgress());
    update();
    const id = window.setInterval(update, 3_600_000);
    const onVisible = () => {
      if (document.visibilityState === "visible") update();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  const reachedStops = Math.floor(progress * ROUTE_STOPS.length);

  return (
    <section className="wave-panel wave-journey" aria-labelledby="journey-title">
      <p className="wave-eyebrow text-center">Un viaggio da Kamakura a Kyoto</p>
      <h2 id="journey-title" className="wave-title text-center">
        Il cammino verso il corso
      </h2>
      <p className="mt-2 text-center text-sm wave-muted">
        Manca poco: le tappe si accendono giorno dopo giorno fino al Grand Hotel Salerno.
      </p>

      <div className="wave-journey__frame">
        <Image
          src={JOURNEY_CAMMINO_SRC}
          alt="Illustrazione del cammino da Kamakura a Kyoto, in stile onda del sito"
          fill
          sizes="(min-width: 56rem) 62rem, 100vw"
          className="wave-journey__image"
          unoptimized
          priority={false}
        />
        <svg className="wave-journey__route" viewBox="0 0 1200 620" preserveAspectRatio="none" aria-hidden>
          <path
            className="wave-journey__route-base"
            d="M 70 500 C 165 470, 210 540, 300 480 S 430 410, 510 450 S 625 500, 690 430 S 780 345, 850 390 S 960 455, 1125 360"
          />
          <path
            className="wave-journey__route-progress"
            style={{ strokeDashoffset: 1180 * (1 - progress) }}
            d="M 70 500 C 165 470, 210 540, 300 480 S 430 410, 510 450 S 625 500, 690 430 S 780 345, 850 390 S 960 455, 1125 360"
          />
          {ROUTE_STOPS.map(([cx, cy], index) => {
            const reached = index < reachedStops;
            return (
              <circle
                key={`${cx}-${cy}`}
                className={reached ? "wave-journey__stop is-reached" : "wave-journey__stop"}
                cx={cx}
                cy={cy}
                r={reached ? 14 : 11}
              />
            );
          })}
        </svg>
        <span className="wave-journey__label wave-journey__label--start">Kamakura</span>
        <span className="wave-journey__label wave-journey__label--end">Kyoto</span>
      </div>
    </section>
  );
}
