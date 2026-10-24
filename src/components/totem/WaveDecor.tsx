/** Bolle di schiuma decorative negli angoli dei pannelli. */
export function WaveDecor() {
  return (
    <svg className="wave-decor" viewBox="0 0 48 48" aria-hidden>
      <circle cx="14" cy="20" r="7" fill="#fff" stroke="var(--wave-ink)" strokeWidth="2" />
      <circle cx="28" cy="14" r="5" fill="#fff" stroke="var(--wave-ink)" strokeWidth="1.8" />
      <circle cx="34" cy="26" r="4" fill="#fff" stroke="var(--wave-ink)" strokeWidth="1.6" />
    </svg>
  );
}
