export function SelloPresente({ esTarde = false, hora = '' }) {
  const color = esTarde ? 'var(--color-warning)' : 'var(--color-positive)'
  const colorBg = esTarde ? 'var(--color-warning-bg)' : 'var(--color-positive-bg)'
  const texto = esTarde ? 'PRESENTE · TARDE' : 'PRESENTE · A TIEMPO'

  return (
    <div
      className="sello-animado"
      style={{
        display: 'inline-flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '10px 22px',
        border: `3px double ${color}`,
        borderRadius: 12,
        backgroundColor: colorBg,
        color: color,
        transform: 'rotate(-3.5deg)',
        userSelect: 'none',
        boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
      }}
    >
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        fontSize: 12,
        letterSpacing: 2,
        fontWeight: 800,
        textTransform: 'uppercase',
      }}>
        <span>★</span>
        <span>RACHA DE CLASE</span>
        <span>★</span>
      </div>

      <div style={{
        fontSize: 20,
        fontWeight: 900,
        letterSpacing: 2,
        margin: '2px 0',
        textTransform: 'uppercase',
      }}>
        {texto}
      </div>

      {hora && (
        <div style={{
          fontSize: 11,
          letterSpacing: 1,
          fontWeight: 600,
          opacity: 0.85,
        }}>
          {hora}
        </div>
      )}
    </div>
  )
}
