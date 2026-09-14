import { useState } from 'react'
import { Check, Clock, Sparkles } from 'lucide-react'
import { useCheckin } from '../hooks/useCheckin'

export function CheckinCard({ userId }) {
  const { hoy, cargando, hacerCheckin } = useCheckin(userId)
  const [enviando, setEnviando] = useState(false)

  const manejarCheckin = async (esTarde) => {
    if (enviando) return
    setEnviando(true)
    await hacerCheckin(esTarde)
    setEnviando(false)
  }

  if (cargando) {
    return (
      <div className="card" style={{ padding: '32px 20px', textAlign: 'center' }}>
        <p className="apple-caption">Verificando asistencia de hoy...</p>
      </div>
    )
  }

  const yaRegistrado = Boolean(hoy)
  const puntos = yaRegistrado ? hoy.puntos_ganados : 10

  return (
    <section className="card" style={{ textAlign: 'center', padding: '28px 20px' }}>
      {yaRegistrado ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
          {/* Sello memorable PRESENTE según principios anti-IA */}
          <div className="sello-presente">
            ✓ PRESENTE {hoy.es_tarde ? '· TARDE' : '· A TIEMPO'}
          </div>

          <p className="apple-subheadline" style={{ marginTop: 4 }}>
            Has sumado <strong style={{ color: 'var(--color-ink)' }}>+{puntos} puntos</strong> a tu registro hoy.
          </p>

          <span className="apple-caption" style={{ color: 'var(--color-tertiary-ink)' }}>
            Registrado a las {hoy.hora || 'hora actual'}
          </span>
        </div>
      ) : (
        <div>
          <div style={{ display: 'inline-flex', padding: 10, borderRadius: 14, background: 'var(--color-fill-secondary)', marginBottom: 12 }}>
            <Sparkles size={24} color="var(--color-accent)" />
          </div>

          <h2 className="apple-headline" style={{ fontSize: 20, marginBottom: 6 }}>
            ¿Estás en clase hoy?
          </h2>

          <p className="apple-subheadline" style={{ marginBottom: 24 }}>
            Registra tu asistencia para mantener tu racha y sumar puntos.
          </p>

          <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button
              className="btn-primary btn-positive"
              onClick={() => manejarCheckin(false)}
              disabled={enviando}
              style={{ flex: '1 1 180px' }}
            >
              <Check size={18} strokeWidth={2.5} />
              <span>A tiempo (+10)</span>
            </button>

            <button
              className="btn-secondary"
              onClick={() => manejarCheckin(true)}
              disabled={enviando}
              style={{ flex: '1 1 150px' }}
            >
              <Clock size={18} strokeWidth={2} />
              <span>Tarde (+5)</span>
            </button>
          </div>
        </div>
      )}
    </section>
  )
}
