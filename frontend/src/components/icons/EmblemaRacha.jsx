export function EmblemaRacha({ size = 64, className = "" }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="Llama de Racha"
    >
      <defs>
        <linearGradient id="flameGrad" x1="50" y1="90" x2="50" y2="10" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FF3B30" />
          <stop offset="60%" stopColor="#FF9500" />
          <stop offset="100%" stopColor="#FFCC00" />
        </linearGradient>
        <linearGradient id="flameInner" x1="50" y1="85" x2="50" y2="35" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FF9500" />
          <stop offset="100%" stopColor="#FFF275" />
        </linearGradient>
        <filter id="flameShadow" x="0" y="0" width="100" height="100" filterUnits="userSpaceOnUse">
          <feDropShadow dx="0" dy="4" stdDeviation="3" floodColor="#FF3B30" floodOpacity="0.25" />
        </filter>
      </defs>

      {/* Llama exterior */}
      <path
        d="M50 8C50 8 32 30 32 52C32 68 40 86 50 92C60 86 68 68 68 52C68 38 60 28 50 8Z"
        fill="url(#flameGrad)"
        filter="url(#flameShadow)"
      />

      {/* Lengüeta lateral izquierda */}
      <path
        d="M34 50C25 56 22 66 26 76C30 84 38 88 44 90C36 84 32 75 34 66C36 58 40 54 34 50Z"
        fill="#FF3B30"
        opacity="0.9"
      />

      {/* Lengüeta lateral derecha */}
      <path
        d="M66 50C75 56 78 66 74 76C70 84 62 88 56 90C64 84 68 75 66 66C64 58 60 54 66 50Z"
        fill="#FF453A"
        opacity="0.9"
      />

      {/* Llama interior brillante */}
      <path
        d="M50 38C50 38 40 52 40 68C40 78 45 86 50 89C55 86 60 78 60 68C60 56 54 48 50 38Z"
        fill="url(#flameInner)"
      />
    </svg>
  )
}
