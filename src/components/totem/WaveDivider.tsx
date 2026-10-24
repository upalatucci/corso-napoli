export function WaveDivider() {
  return (
    <div className="wave-divider" aria-hidden>
      <svg viewBox="0 0 400 28" preserveAspectRatio="none">
        <path
          fill="var(--wave-cyan)"
          stroke="var(--wave-ink)"
          strokeWidth="2"
          d="M0 14 C 40 2, 80 24, 120 12 S 200 2, 240 14 S 320 26, 360 12 S 388 6, 400 10 L 400 28 L 0 28 Z"
        />
      </svg>
    </div>
  );
}
