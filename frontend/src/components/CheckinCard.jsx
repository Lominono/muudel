import { useState, useRef, useEffect } from 'react'
import { Check, Key, ShieldCheck, Lock, AlertCircle } from 'lucide-react'
import { useCheckin } from '../hooks/useCheckin'
import { SelloPresente } from './icons/SelloPresente'
import { sound, triggerConfetti } from '../utils/haptics'
import { animarEscalonado } from '../utils/animations'

export function CheckinCard({ userId, rol = 'alumno', onAbrirPanelAdmin = null }) {
  const { hoy, cargando, hacerCheckin } = useCheckin(userId)
  const [enviando, setEnviando] = useState(false)
  const [pinIngresado, setPinIngresado] = useState('')
  const [pinError, setPinError] = useState('')
  const cardRef = useRef(null)

  const pinEsperado = localStorage.getItem('racha_pin_hoy') || ''
  const sesionAbierta = localStorage.getItem('racha_sesion_activa') !== 'false' && Boolean(pinEsperado)

  useEffect(() => {
    if (cardRef.current) {
      animarEscalonado(cardRef.current.children, { stagger: 0.04 })
    }
  }, [hoy, cargando, sesionAbierta])

  const manejarValidarPin = async (e) => {
    e.preventDefault()
    setPinError('')
    if (enviando) return

    if (!pinIngresado.trim()) {
      setPinError('Introduce el código de 4 dígitos.')
      return
    }

    if (pinIngresado.trim() !== pinEsperado.trim()) {
      setPinError('Código incorrecto. Comprueba el PIN de la pizarra.')
      sound.playPop()
      return
    }

    setEnviando(true)
    sound.playStamp()
    triggerConfetti()

    await hacerCheckin(false)
    setEnviando(false)
  }

  if (cargando) {
    return (
      <div className="card" style={{ padding: '32px 20px', textAlign: 'center' }}>
        <p className="apple-caption">Comprobando asistencia...</p>
      </div>
    )
  }

  const yaRegistrado = Boolean(hoy)
  const puntos = yaRegistrado ? hoy.puntos_ganados : 10

  return (
    <section ref={cardRef} className="card" style={{ textAlign: 'center', padding: '28px 20px', position: 'relative' }}>
      {yaRegistrado ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
          {/* Sello físico validado */}
          <SelloPresente esTarde={hoy.es_tarde} hora={hoy.hora} />

          <p className="apple-subheadline" style={{ marginTop: 4, fontSize: 15 }}>
            Asistencia certificada · <strong style={{ color: 'var(--color-ink)' }}>+{puntos} puntos</strong> en tu marcador.
          </p>

          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '5px 14px',
            borderRadius: 9999,
            backgroundColor: 'var(--color-positive-bg)',
            color: 'var(--color-positive)'
          }}>
            <Check size={14} strokeWidth={2.5} />
            <span className="apple-caption" style={{ fontWeight: 600, color: 'var(--color-positive)' }}>
              Verificado por el profesor
            </span>
          </div>
        </div>
      ) : sesionAbierta ? (
        <div>
          <div style={{ display: 'inline-flex', padding: 12, borderRadius: 14, background: 'var(--color-fill-secondary)', marginBottom: 12 }}>
            <Key size={26} color="var(--color-accent)" />
          </div>

          <h2 className="apple-headline" style={{ fontSize: 20, marginBottom: 6 }}>
            Pase de lista abierto
          </h2>

          <p className="apple-subheadline" style={{ marginBottom: 18, fontSize: 14 }}>
            Introduce el código PIN proyectado en clase para confirmar tu presencia hoy:
          </p>

          <form onSubmit={manejarValidarPin} style={{ maxWidth: 280, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 10 }}>
            <input
              type="text"
              maxLength={4}
              placeholder="PIN de 4 dígitos"
              className="apple-input"
              value={pinIngresado}
              onChange={(e) => {
                setPinError('')
                setPinIngresado(e.target.value.replace(/\D/g, ''))
              }}
              style={{
                textAlign: 'center',
                fontSize: 22,
                letterSpacing: 8,
                fontWeight: 700,
                minHeight: 46
              }}
              required
            />

            {pinError && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, color: 'var(--color-negative)', fontSize: 12 }}>
                <AlertCircle size={14} />
                <span>{pinError}</span>
              </div>
            )}

            <button
              type="submit"
              className="btn-primary"
              disabled={enviando || pinIngresado.length < 4}
              style={{
                width: '100%',
                minHeight: 42,
                fontSize: 14,
                opacity: pinIngresado.length === 4 ? 1 : 0.6
              }}
            >
              {enviando ? 'Validando...' : 'Confirmar Asistencia (+10 pts)'}
            </button>
          </form>
        </div>
      ) : (
        <div style={{ padding: '8px 0' }}>
          <div style={{
            display: 'inline-flex',
            padding: 12,
            borderRadius: 14,
            background: 'var(--color-fill-secondary)',
            color: 'var(--color-secondary-ink)',
            marginBottom: 12
          }}>
            <Lock size={26} />
          </div>

          <h2 className="apple-headline" style={{ fontSize: 19, marginBottom: 6 }}>
            Pase de lista pendiente
          </h2>

          <p className="apple-subheadline" style={{ fontSize: 14, color: 'var(--color-secondary-ink)' }}>
            El profesor aún no ha abierto el pase de lista de hoy. Espera las indicaciones en clase para que tome lista o active el PIN de la sesión.
          </p>
        </div>
      )}
    </section>
  )
}
