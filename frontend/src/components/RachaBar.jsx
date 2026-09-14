import { Flame } from 'lucide-react'

export function RachaBar({ racha = 0, mejorRacha = 0 }) {
  // Generar los últimos 7 días con formato de fecha real
  const dias = Array.from({ length: 7 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (6 - i))
    return d
  })

  // Días activos de la racha actual (mínimo 0, máximo 7 en la barra visible)
  const diasActivos = Math.min(Math.max(racha, 0), 7)

  return (
    <section className="card">
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16
      }}>
        <div>
          <h3 className="apple-headline" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            Racha de asistencia
            <Flame size={18} color="var(--color-warning)" fill="var(--color-warning)" />
          </h3>
          <p className="apple-subheadline" style={{ fontSize: 13, marginTop: 2 }}>
            <span className="tabular-nums font-semibold">{racha}</span> {racha === 1 ? 'día consecutivo' : 'días consecutivos'} · Récord: <span className="tabular-nums font-semibold">{mejorRacha}</span>
          </p>
        </div>

        <div className="apple-badge apple-badge-flame">
          <span className="tabular-nums" style={{ fontSize: 15 }}>{racha} 🔥</span>
        </div>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(7, 1fr)',
        gap: 8,
        textAlign: 'center'
      }}>
        {dias.map((d, i) => {
          const activo = i >= 7 - diasActivos && diasActivos > 0
          const esHoy = i === 6
          const nombreDia = d.toLocaleDateString('es-ES', { weekday: 'narrow' }).toUpperCase()

          return (
            <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
              <div
                style={{
                  width: '100%',
                  aspectRatio: '1 / 1',
                  maxHeight: 42,
                  borderRadius: 10,
                  backgroundColor: activo ? 'var(--color-positive)' : 'var(--color-fill-secondary)',
                  color: activo ? '#FFFFFF' : 'var(--color-tertiary-ink)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 700,
                  fontSize: 13,
                  border: esHoy && !activo ? '1.5px dashed var(--color-separator-opaque)' : 'none',
                  transition: 'background-color 0.2s ease',
                }}
              >
                {activo ? '✓' : ''}
              </div>

              <span style={{
                fontSize: 11,
                fontWeight: esHoy ? 700 : 500,
                color: esHoy ? 'var(--color-accent)' : 'var(--color-tertiary-ink)'
              }}>
                {nombreDia}
              </span>
            </div>
          )
        })}
      </div>
    </section>
  )
}
