import { courseNapoli2026 } from "@/lib/course";
import { WaveBanner } from "./WaveBanner";
import { WaveDecor } from "./WaveDecor";

export function TotemHero() {
  return (
    <header id="inizio" className="wave-hero">
      <div className="wave-hero__shell">
        <div className="wave-hero__scene">
          <WaveBanner />
        </div>

        <div className="wave-hero__content">
          <h1 className="wave-logo wave-logo--hero" aria-label="Josho Napoli">
            <span className="wave-logo__josho">Josho</span>
            <span className="wave-logo__napoli">Napoli</span>
          </h1>
          <p className="wave-hero__tag">Contadaimoku · percorso collettivo</p>

          <div className="wave-hero__body">
            <div className="wave-quote-card">
              <WaveDecor />
              <blockquote className="wave-quote">
                <p>“Le onde aumentano di potenza e tenacia ogni volta che incontrano un ostacolo”</p>
              </blockquote>
              <p className="wave-quote__author">Daisaku Ikeda</p>
            </div>

            <div className="wave-event-stamp">
              <p className="wave-event-stamp__kicker">Corso territorio</p>
              <p className="wave-event-stamp__title">Napoli</p>
              <p className="wave-event-stamp__dates">6 · 7 · 8 novembre 2026</p>
              <p className="wave-event-stamp__venue">
                {courseNapoli2026.venue}
                <span className="wave-event-stamp__city">{courseNapoli2026.venueCity}</span>
              </p>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
