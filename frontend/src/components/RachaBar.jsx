import { useEffect, useRef } from 'react'
import { EmblemaRacha } from './icons/EmblemaRacha'
import { animarLlama, animarEscalonado } from '../utils/animations'

export function RachaBar({ racha = 0, mejorRacha = 0 }) {
  const flameRef = useRef(null)
  const daysRef = useRef(null)

  useEffect(() => {
    const tween = animarLlama(flameRef.current)
    if (daysRef.current) {
      animarEscalonado(daysRef.current.children, { stagger: 0.04, duration: 0.3 })
    }
    return () => tween?.kill()
  }, [])

  const dias = Array.from({ length: 7 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (6 - i))
    return d
  })

  const diasActivos = Math.min(Math.max(racha, 0), 7)

  return (
    <section className="card">
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div ref={flameRef} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <EmblemaRacha size={38} />
          </div>

          <div>
            <h3 className="apple-headline">
              Racha de asistencia
            </h3>
            <p className="apple-subheadline" style={{ fontSize: 13, marginTop: 1 }}>
              <strong className="tabular-nums" style={{ color: 'var(--color-ink)' }}>{racha}</strong> {racha === 1 ? 'día consecutivo' : 'días consecutivos'} · Récord: <span className="tabular-nums font-semibold">{mejorRacha}</span>
            </p>
          </div>
        </div>

        <div className="apple-badge apple-badge-flame" style={{ padding: '6px 12px' }}>
          <span className="tabular-nums" style={{ fontSize: 14, fontWeight: 700 }}>
            {racha} {racha === 1 ? 'DÍA' : 'DÍAS'}
          </span>
        </div>
      </div>

      <div
        ref={daysRef}
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(7, 1fr)',
          gap: 8,
          textAlign: 'center'
        }}
      >
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
                  maxHeight: 40,
                  borderRadius: 10,
                  backgroundColor: activo ? 'var(--color-positive)' : 'var(--color-fill-secondary)',
                  color: activo ? '#FFFFFF' : 'var(--color-tertiary-ink)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 700,
                  fontSize: 13,
                  border: esHoy && !activo ? '1.5px dashed var(--color-separator-opaque)' : 'none',
                  boxShadow: activo ? '0 2px 6px rgba(52, 199, 89, 0.25)' : 'none',
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
