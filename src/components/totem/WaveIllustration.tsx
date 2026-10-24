/** Onda stilizzata: cresta + schiuma a “dita”, tratteggio interno, cielo/mare distinti. */
export function WaveIllustration({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 400 260"
      preserveAspectRatio="xMidYMax meet"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-hidden
    >
      <defs>
        <linearGradient id="wi-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#f8fcff" />
          <stop offset="100%" stopColor="#b8e4f7" />
        </linearGradient>
        <linearGradient id="wi-water" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#3cc4e8" />
          <stop offset="100%" stopColor="#00AEEF" />
        </linearGradient>
        <clipPath id="wi-clip">
          <path
            d="M -24 152
               C 48 152, 72 88, 128 98
               C 168 106, 192 48, 252 62
               C 292 70, 318 32, 368 48
               C 392 56, 408 44, 424 50
               L 424 260 L -24 260 Z"
          />
        </clipPath>
      </defs>

      <rect width="400" height="260" fill="url(#wi-sky)" />

      <ellipse cx="72" cy="44" rx="36" ry="12" fill="#fff" opacity="0.92" />
      <ellipse cx="330" cy="36" rx="28" ry="10" fill="#fff" opacity="0.8" />

      {/* Onda di fondo */}
      <path
        d="M -24 178 Q 100 162 200 170 T 424 164 L 424 260 L -24 260 Z"
        fill="#5ecfea"
        opacity="0.45"
      />

      {/* Corpo onda */}
      <path
        d="M -24 152
           C 48 152, 72 88, 128 98
           C 168 106, 192 48, 252 62
           C 292 70, 318 32, 368 48
           C 392 56, 408 44, 424 50
           L 424 260 L -24 260 Z"
        fill="url(#wi-water)"
        stroke="#1a4a6e"
        strokeWidth="3.5"
        strokeLinejoin="round"
      />

      <g clipPath="url(#wi-clip)" stroke="#0c3d5c" strokeWidth="1.2" fill="none" opacity="0.5">
        <path d="M 8 158 Q 55 142 98 150" />
        <path d="M 22 170 Q 68 154 112 162" />
        <path d="M 36 182 Q 82 166 126 174" />
        <path d="M 88 118 Q 128 102 162 112" />
        <path d="M 102 130 Q 142 114 176 124" />
        <path d="M 116 142 Q 156 126 190 136" />
        <path d="M 158 78 Q 196 64 228 74" />
        <path d="M 172 90 Q 210 76 242 86" />
        <path d="M 248 68 Q 282 56 312 64" />
        <path d="M 262 80 Q 296 68 326 76" />
        <path d="M 318 52 Q 348 42 378 50" />
      </g>

      {/* Schiuma sulla cresta */}
      <path
        d="M 168 52
           C 188 34, 210 44, 228 30
           C 246 18, 266 30, 284 22
           C 302 14, 322 26, 340 18
           C 358 10, 378 22, 396 14
           L 402 22
           C 384 32, 366 22, 348 30
           C 330 38, 312 28, 294 36
           C 276 44, 258 34, 240 42
           C 222 50, 204 40, 186 48
           C 178 52, 172 56, 168 52 Z"
        fill="#ffffff"
        stroke="#1a4a6e"
        strokeWidth="2.8"
        strokeLinejoin="round"
      />

      {/* Dita di schiuma (infrangimento) */}
      <g fill="#fff" stroke="#1a4a6e" strokeWidth="2" strokeLinejoin="round">
        <path d="M 198 38 L 208 68 L 190 64 Z" />
        <path d="M 248 28 L 258 58 L 240 54 Z" />
        <path d="M 298 22 L 308 52 L 290 48 Z" />
        <path d="M 348 18 L 358 48 L 340 44 Z" />
      </g>

      <g fill="#fff" stroke="#1a4a6e" strokeWidth="1.3">
        <circle cx="208" cy="48" r="4.5" />
        <circle cx="242" cy="38" r="4" />
        <circle cx="276" cy="32" r="4.5" />
        <circle cx="310" cy="28" r="4" />
        <circle cx="344" cy="24" r="3.5" />
        <circle cx="378" cy="22" r="3.5" />
      </g>

      {/* Linea orizzonte mare */}
      <path
        d="M -24 152 C 80 148, 160 138, 252 142 C 340 146, 390 138, 424 140"
        fill="none"
        stroke="#1a4a6e"
        strokeWidth="2"
        opacity="0.35"
      />
    </svg>
  );
}
