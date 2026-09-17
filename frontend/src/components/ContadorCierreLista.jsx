import { useState, useEffect } from 'react'
import { sound, triggerConfetti } from '../utils/haptics'
import { Clock, Send, CheckCircle2, Flame, AlertCircle } from 'lucide-react'

export function ContadorCierreLista({
  userId,
  nombreUsuario,
  asistenciaConfirmada,
  solicitudPendiente,
  onMandarSolicitud
}) {
  const [tiempoRestante, setTiempoRestante] = useState('')
  const [faseHorario, setFaseHorario] = useState('antes') // 'antes' | 'abierto' | 'tarde' | 'cerrado'
  const [enviando, setEnviando] = useState(false)

  useEffect(() => {
    const calcularTiempo = () => {
      const ahora = new Date()
      const objetivo1530 = new Date()
      objetivo1530.setHours(15, 30, 0, 0)

      const limiteTarde1540 = new Date()
      limiteTarde1540.setHours(15, 40, 0, 0)

      const limiteCierre1630 = new Date()
      limiteCierre1630.setHours(16, 30, 0, 0)

      const ventanaApertura1515 = new Date()
      ventanaApertura1515.setHours(15, 15, 0, 0)

      if (ahora < ventanaApertura1515) {
        // Antes de las 15:15
        setFaseHorario('antes')
        const difMs = objetivo1530 - ahora
        const horas = Math.floor(difMs / (1000 * 60 * 60))
        const minutos = Math.floor((difMs % (1000 * 60 * 60)) / (1000 * 60))
        const segundos = Math.floor((difMs % (1000 * 60)) / 1000)
        setTiempoRestante(`${String(horas).padStart(2, '0')}h ${String(minutos).padStart(2, '0')}m ${String(segundos).padStart(2, '0')}s`)
      } else if (ahora >= ventanaApertura1515 && ahora <= limiteTarde1540) {
        // Entre 15:15 y 15:40 -> A tiempo
        setFaseHorario('abierto')
        const difMs = limiteTarde1540 - ahora
        const minutos = Math.floor(difMs / (1000 * 60))
        const segundos = Math.floor((difMs % (1000 * 60)) / 1000)
        setTiempoRestante(`${String(minutos).padStart(2, '0')}m ${String(segundos).padStart(2, '0')}s para llegar puntual`)
      } else if (ahora > limiteTarde1540 && ahora <= limiteCierre1630) {
        // Entre 15:40 y 16:30 -> Tarde
        setFaseHorario('tarde')
        const difMs = limiteCierre1630 - ahora
        const minutos = Math.floor(difMs / (1000 * 60))
        const segundos = Math.floor((difMs % (1000 * 60)) / 1000)
        setTiempoRestante(`${String(minutos).padStart(2, '0')}m ${String(segundos).padStart(2, '0')}s para cierre de lista`)
      } else {
        setFaseHorario('cerrado')
        setTiempoRestante('Pase de lista cerrado por hoy')
      }
    }

    calcularTiempo()
    const timer = setInterval(calcularTiempo, 1000)
    return () => clearInterval(timer)
  }, [])

  const handleEnviar = async () => {
    if (enviando || solicitudPendiente || asistenciaConfirmada) return
    setEnviando(true)
    sound.playPop()
    await onMandarSolicitud(faseHorario === 'tarde')
    setEnviando(false)
  }

  // 1. Si la asistencia ya está confirmada por el admin
  if (asistenciaConfirmada) {
    return (
      <div className="card" style={{
        padding: '16px 18px',
        marginBottom: 16,
        backgroundColor: 'rgba(52, 199, 89, 0.08)',
        border: '1px solid rgba(52, 199, 89, 0.3)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 36,
            height: 36,
            borderRadius: 10,
            backgroundColor: 'rgba(52, 199, 89, 0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--color-positive)'
          }}>
            <CheckCircle2 size={20} />
          </div>
          <div>
            <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-ink)' }}>
              ¡Lista confirmada por lominoño!
            </span>
            <p style={{ fontSize: 12, color: 'var(--color-secondary-ink)', marginTop: 1 }}>
              Llegaste a las {asistenciaConfirmada.hora || '15:30'} · Puntos sumados al marcador
            </p>
          </div>
        </div>

        <span className="apple-badge apple-badge-positive" style={{ fontSize: 12 }}>
          {asistenciaConfirmada.es_tarde ? '+5 pts (Tarde)' : '+10 pts (A tiempo)'}
        </span>
      </div>
    )
  }

  // 2. Si el alumno ya mandó la solicitud pero el admin está revisando
  if (solicitudPendiente) {
    return (
      <div className="card" style={{
        padding: '16px 18px',
        marginBottom: 16,
        backgroundColor: 'rgba(255, 149, 0, 0.08)',
        border: '1px solid rgba(255, 149, 0, 0.35)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 36,
            height: 36,
            borderRadius: 10,
            backgroundColor: 'rgba(255, 149, 0, 0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--color-warning)'
          }}>
            <Clock size={20} />
          </div>
          <div>
            <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-ink)' }}>
              Solicitud de presencia enviada
            </span>
            <p style={{ fontSize: 12, color: 'var(--color-secondary-ink)', marginTop: 1 }}>
              Enviada a las {solicitudPendiente.hora}. lominoño la revisará al pasar lista.
            </p>
          </div>
        </div>

        <span className="apple-badge apple-badge-warning" style={{ fontSize: 12 }}>
          Pendiente
        </span>
      </div>
    )
  }

  // 3. Si aún no ha mandado solicitud
  return (
    <div className="card" style={{
      padding: '18px 20px',
      marginBottom: 16,
      border: faseHorario === 'tarde' ? '1.5px solid rgba(255, 59, 48, 0.35)' : '1px solid var(--color-separator)',
      backgroundColor: 'var(--color-surface)'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Clock size={16} color={faseHorario === 'tarde' ? 'var(--color-negative)' : 'var(--color-accent)'} />
            <span className="apple-caption" style={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>
              Clases de tarde · 15:30
            </span>
          </div>
          <h3 style={{ fontSize: 17, fontWeight: 700, color: 'var(--color-ink)', marginTop: 3 }}>
            {faseHorario === 'antes' ? 'La clase arranca a las 15:30' : faseHorario === 'abierto' ? '¡Hora de clase! Avisa que has llegado' : 'Vas con retraso, avisa rápido'}
          </h3>
        </div>

        <span className="tabular-nums" style={{
          fontSize: 12,
          fontWeight: 700,
          padding: '4px 10px',
          borderRadius: 8,
          backgroundColor: 'var(--color-fill-secondary)',
          color: 'var(--color-ink)'
        }}>
          {tiempoRestante}
        </span>
      </div>

      <p style={{ fontSize: 13, color: 'var(--color-secondary-ink)', marginBottom: 14, lineHeight: 1.4 }}>
        {faseHorario === 'antes'
          ? 'A las 15:30 se abre el envío de confirmación de presencia para que lominoño te selle la lista.'
          : 'Manda tu confirmación para que lominoño la revise en el panel y no pierdas tu racha.'}
      </p>

      {/* Botón de confirmar presencia */}
      <button
        className="btn-primary"
        onClick={handleEnviar}
        disabled={enviando}
        style={{
          width: '100%',
          minHeight: 44,
          fontSize: 14,
          fontWeight: 700,
          gap: 8,
          backgroundColor: faseHorario === 'tarde' ? 'var(--color-negative)' : 'var(--color-accent)'
        }}
      >
        <Send size={16} />
        <span>
          {enviando
            ? 'Enviando a lominoño...'
            : faseHorario === 'tarde'
            ? 'Mandar confirmación (Con retraso +5 pts)'
            : 'Mandar confirmación de que he llegado (+10 pts)'}
        </span>
      </button>
    </div>
  )
}
