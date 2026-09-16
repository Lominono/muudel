export function InsigniaIniciales({
  nombre = '',
  color = '#007AFF',
  size = 44,
  fontSize,
  className = '',
  style = {},
}) {
  // Extraer las iniciales del nombre (hasta 2 letras)
  const partes = (nombre || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)

  let iniciales = '?'
  if (partes.length === 1) {
    iniciales = partes[0].substring(0, 2).toUpperCase()
  } else if (partes.length >= 2) {
    iniciales = (partes[0][0] + partes[1][0]).toUpperCase()
  }

  const calcFontSize = fontSize || Math.round(size * 0.38)

  return (
    <div
      className={className}
      style={{
        width: size,
        height: size,
        minWidth: size,
        minHeight: size,
        borderRadius: size >= 64 ? 20 : Math.round(size * 0.28),
        backgroundColor: color || '#007AFF',
        color: '#FFFFFF',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontWeight: 700,
        fontSize: calcFontSize,
        letterSpacing: -0.5,
        fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", system-ui, sans-serif',
        userSelect: 'none',
        boxShadow: '0 2px 6px rgba(0, 0, 0, 0.12)',
        ...style,
      }}
      aria-label={`Insignia de ${nombre || 'Usuario'}`}
    >
      {iniciales}
    </div>
  )
}
