import { useState } from 'react'
import { Check, Clock, Sparkles } from 'lucide-react'
import { useCheckin } from '../hooks/useCheckin'
import { SelloPresente } from './icons/SelloPresente'
import { sound, triggerConfetti } from '../utils/haptics'

export function CheckinCard({ userId }) {
  const { hoy, cargando, hacerCheckin } = useCheckin(userId)
  const [enviando, setEnviando] = useState(false)

  const manejarCheckin = async (esTarde) => {
    if (enviando) return
    setEnviando(true)
    sound.playStamp()
    triggerConfetti()

    await hacerCheckin(esTarde)
    setEnviando(false)
  }

  if (cargando) {
    return (
      <div className="card" style={{ padding: '32px 20px', textAlign: 'center' }}>
        <p className="apple-caption">Comprobando asistencia de hoy...</p>
      </div>
    )
  }

  const yaRegistrado = Boolean(hoy)
  const puntos = yaRegistrado ? hoy.puntos_ganados : 10

  return (
    <section className="card" style={{ textAlign: 'center', padding: '28px 20px', position: 'relative' }}>
      {yaRegistrado ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
          {/* Sello memorable PRESENTE con animación de estampado */}
          <SelloPresente esTarde={hoy.es_tarde} hora={hoy.hora} />

          <p className="apple-subheadline" style={{ marginTop: 6, fontSize: 15 }}>
            Has acumulado <strong style={{ color: 'var(--color-ink)' }}>+{puntos} puntos</strong> en tu registro de hoy.
          </p>

          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '4px 12px',
            borderRadius: 9999,
            backgroundColor: 'var(--color-fill-secondary)',
          }}>
            <span style={{ fontSize: 13, color: 'var(--color-positive)', fontWeight: 700 }}>●</span>
            <span className="apple-caption" style={{ fontWeight: 600 }}>
              Asistencia guardada con éxito
            </span>
          </div>
        </div>
      ) : (
        <div>
          <div style={{ display: 'inline-flex', padding: 12, borderRadius: 16, background: 'var(--color-fill-secondary)', marginBottom: 12 }}>
            <Sparkles size={26} color="var(--color-accent)" />
          </div>

          <h2 className="apple-headline" style={{ fontSize: 21, marginBottom: 6 }}>
            ¿Estás en clase hoy?
          </h2>

          <p className="apple-subheadline" style={{ marginBottom: 24, fontSize: 15 }}>
            Registra tu llegada para certificar tu asistencia y mantener tu racha activa.
          </p>

          <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button
              className="btn-primary btn-positive"
              onClick={() => manejarCheckin(false)}
              disabled={enviando}
              style={{ flex: '1 1 180px' }}
            >
              <Check size={18} strokeWidth={2.5} />
              <span>A tiempo (+10 pts)</span>
            </button>

            <button
              className="btn-secondary"
              onClick={() => manejarCheckin(true)}
              disabled={enviando}
              style={{ flex: '1 1 150px' }}
            >
              <Clock size={18} strokeWidth={2} />
              <span>Tarde (+5 pts)</span>
            </button>
          </div>
        </div>
      )}
    </section>
  )
}
