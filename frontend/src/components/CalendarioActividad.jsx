import { useState, useEffect } from 'react'
import { Calendar } from 'lucide-react'
import { supabase } from '../utils/supabase'

export function CalendarioActividad({ userId = null }) {
  const [registros, setRegistros] = useState({})
  const totalDias = 28 // 4 semanas completas

  useEffect(() => {
    if (!userId) return

    const hoy = new Date()
    const hace28Dias = new Date()
    hace28Dias.setDate(hoy.getDate() - (totalDias - 1))
    const fechaInicioStr = hace28Dias.toISOString().split('T')[0]

    supabase
      .from('checkins')
      .select('fecha, es_tarde')
      .eq('user_id', userId)
      .gte('fecha', fechaInicioStr)
      .then(({ data }) => {
        const mapa = {}
        if (data) {
          data.forEach((chk) => {
            mapa[chk.fecha] = chk
          })
        }
        // Comprobar también checkins locales del día si existen
        const hoyStr = hoy.toISOString().split('T')[0]
        const localCheckins = localStorage.getItem('racha_checkins_' + hoyStr)
        if (localCheckins) {
          try {
            const parsed = JSON.parse(localCheckins)
            if (parsed[userId]) {
              mapa[hoyStr] = parsed[userId]
            }
          } catch (e) {}
        }

        setRegistros(mapa)
      })
      .catch(() => {})
  }, [userId])

  const dias = Array.from({ length: totalDias }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (totalDias - 1 - i))
    const fechaStr = d.toISOString().split('T')[0]
    const registro = registros[fechaStr]

    return {
      fecha: d,
      fechaStr,
      activo: Boolean(registro),
      esTarde: Boolean(registro?.es_tarde),
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
          Historial de asistencia
          <Calendar size={17} color="var(--color-accent)" />
        </h3>
        <span className="apple-badge apple-badge-accent">
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
            <span className="apple-caption">Sin clase</span>
          </div>
        </div>

        <span className="apple-caption tabular-nums">
          <strong style={{ color: 'var(--color-ink)' }}>{asistencias}</strong> / {totalDias} días
        </span>
      </div>
    </section>
  )
}
