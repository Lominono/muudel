import { Calendar } from 'lucide-react'

export function CalendarioActividad({ racha = 5 }) {
  // Generar 28 días (4 semanas completas)
  const totalDias = 28
  const dias = Array.from({ length: totalDias }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (totalDias - 1 - i))
    // Simular historial basado en la racha actual
    const esActivo = i >= totalDias - racha || (i % 3 !== 0 && i < 15)
    return {
      fecha: d,
      activo: esActivo,
      esTarde: esActivo && i % 4 === 0,
      esHoy: i === totalDias - 1,
    }
  })

  const asistencias = dias.filter((d) => d.activo).length
  const porcentaje = Math.round((asistencias / totalDias) * 100)

  return (
    <section className="card">
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 14,
      }}>
        <h3 className="apple-headline" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          Asistencia mensual
          <Calendar size={17} color="var(--color-accent)" />
        </h3>
        <span className="apple-badge apple-badge-positive">
          {porcentaje}% de presencia
        </span>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(7, 1fr)',
        gap: 6,
        marginBottom: 12,
      }}>
        {dias.map((dia, idx) => {
          let bg = 'var(--color-fill-secondary)'
          let border = 'none'

          if (dia.activo) {
            bg = dia.esTarde ? 'var(--color-warning)' : 'var(--color-positive)'
          }
          if (dia.esHoy) {
            border = '2px solid var(--color-accent)'
          }

          return (
            <div
              key={idx}
              title={`${dia.fecha.toLocaleDateString()}: ${dia.activo ? (dia.esTarde ? 'Tarde' : 'A tiempo') : 'Sin registro'}`}
              style={{
                aspectRatio: '1 / 1',
                borderRadius: 6,
                backgroundColor: bg,
                border: border,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 10,
                fontWeight: 600,
                color: dia.activo ? '#FFFFFF' : 'var(--color-tertiary-ink)',
                cursor: 'default',
                transition: 'transform 0.15s ease',
              }}
            >
              {dia.fecha.getDate()}
            </div>
          )
        })}
      </div>

      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingTop: 8,
        borderTop: '0.5px solid var(--color-separator)',
      }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ width: 8, height: 8, borderRadius: 2, backgroundColor: 'var(--color-positive)' }} />
            <span className="apple-caption">A tiempo</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ width: 8, height: 8, borderRadius: 2, backgroundColor: 'var(--color-warning)' }} />
            <span className="apple-caption">Tarde</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ width: 8, height: 8, borderRadius: 2, backgroundColor: 'var(--color-fill-secondary)' }} />
            <span className="apple-caption">Libre</span>
          </div>
        </div>

        <span className="apple-caption tabular-nums">
          <strong style={{ color: 'var(--color-ink)' }}>{asistencias}</strong> / {totalDias} días
        </span>
      </div>
    </section>
  )
}
