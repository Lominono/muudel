export function RachaBar({ racha, mejorRacha }) {
  const dias = Array.from({ length: 7 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (6 - i))
    return d
  })

  const diasConCheckin = racha

  return (
    <div className="card" style={{ marginBottom: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div>
          <h3 style={{ fontSize: 17, fontWeight: 700 }}>Tu racha 🔥</h3>
          <p style={{ fontSize: 13, color: '#98989D', fontFamily: 'monospace' }}>
            {racha} días seguidos · Mejor: {mejorRacha}
          </p>
        </div>
        <div style={{
          background: '#FF453A',
          color: '#FFF',
          borderRadius: 20,
          padding: '6px 14px',
          fontSize: 17,
          fontWeight: 700,
          fontFamily: 'monospace',
        }}>
          {racha}
        </div>
      </div>
      <div style={{ display: 'flex', gap: 6 }}>
        {dias.map((d, i) => {
          const activo = i < diasConCheckin
          return (
            <div key={i} style={{ flex: 1, textAlign: 'center' }}>
              <div style={{
                height: 32,
                borderRadius: 6,
                background: activo ? '#30D158' : '#333',
                opacity: activo ? 1 : 0.3,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 11,
                color: '#FFF',
                fontWeight: 600,
              }}>
                {activo ? '✓' : ''}
              </div>
              <div style={{ fontSize: 10, color: '#98989D', marginTop: 4 }}>
                {d.getDate()}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
