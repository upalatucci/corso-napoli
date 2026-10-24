/** Fascia hero: tre risoluzioni della stessa illustrazione, onda intera. */
export function WaveBanner() {
  return (
    <picture className="wave-banner__media" aria-hidden>
      <source media="(min-width: 64rem)" srcSet="/hero-wave-desktop.webp" type="image/webp" />
      <source media="(min-width: 40rem)" srcSet="/hero-wave-tablet.webp" type="image/webp" />
      <img
        src="/hero-wave-mobile.webp"
        alt=""
        className="wave-banner__img"
        decoding="async"
        fetchPriority="high"
      />
    </picture>
  );
}
