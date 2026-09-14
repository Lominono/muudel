export function TrofeoPodio({ rank = 1, size = 48 }) {
  const config = {
    1: { color: '#E5A00D', fill: '#FFD700', label: '1' },
    2: { color: '#7E868C', fill: '#D3D3D3', label: '2' },
    3: { color: '#B35A25', fill: '#CD7F32', label: '3' },
  }[rank] || { color: 'var(--color-accent)', fill: 'var(--color-accent)', label: rank }

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label={`Trofeo posición ${rank}`}
    >
      {/* Copa */}
      <path
        d="M20 12H44V26C44 32.6274 38.6274 38 32 38C25.3726 38 20 32.6274 20 26V12Z"
        fill={config.color}
        opacity="0.2"
        stroke={config.color}
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      {/* Asas */}
      <path
        d="M20 16H14C11.7909 16 10 17.7909 10 20V22C10 26.4183 13.5817 30 18 30H20"
        stroke={config.color}
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M44 16H50C52.2091 16 54 17.7909 54 20V22C54 26.4183 50.4183 30 46 30H44"
        stroke={config.color}
        strokeWidth="2"
        strokeLinecap="round"
      />
      {/* Tallo */}
      <path
        d="M32 38V48"
        stroke={config.color}
        strokeWidth="3"
        strokeLinecap="round"
      />
      {/* Base */}
      <path
        d="M22 52H42"
        stroke={config.color}
        strokeWidth="3"
        strokeLinecap="round"
      />
      {/* Estrella o número en el centro */}
      <circle cx="32" cy="24" r="5" fill={config.color} />
      <text
        x="32"
        y="27"
        textAnchor="middle"
        fontSize="8"
        fontWeight="800"
        fill="#FFFFFF"
        fontFamily="-apple-system, sans-serif"
      >
        {config.label}
      </text>
    </svg>
  )
}
