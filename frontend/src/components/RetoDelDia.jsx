import { useState, useEffect, useRef } from 'react'
import { Target, CheckCircle2, Award } from 'lucide-react'
import { sound, triggerConfetti } from '../utils/haptics'
import gsap from 'gsap'

export function RetoDelDia({ perfil, onCompletado }) {
  const [completado, setCompletado] = useState(false)
  const [cargando, setCargando] = useState(false)
  const successBadgeRef = useRef(null)

  // Reto diario
  const reto = {
    id: 'reto-dia-1',
    titulo: 'Puntualidad y nota colaborativa',
    descripcion: 'Llega 5 minutos antes y deja una idea clave de la lección en el canal #apuntes.',
    puntos: 25,
  }

  useEffect(() => {
    const hoyStr = new Date().toISOString().split('T')[0]
    const key = `racha_reto_${perfil?.id}_${hoyStr}`
    if (localStorage.getItem(key)) {
      setCompletado(true)
    }
  }, [perfil?.id])

  useEffect(() => {
    if (completado && successBadgeRef.current) {
      gsap.fromTo(
        successBadgeRef.current,
        { scale: 0.9, opacity: 0 },
        { scale: 1, opacity: 1, duration: 0.35, ease: 'back.out(1.8)' }
      )
    }
  }, [completado])

  const manejarCompletar = () => {
    if (completado || cargando) return
    setCargando(true)
    sound.playPop()
    triggerConfetti()

    const hoyStr = new Date().toISOString().split('T')[0]
    const key = `racha_reto_${perfil?.id}_${hoyStr}`
    localStorage.setItem(key, 'true')
    setCompletado(true)
    setCargando(false)

    if (onCompletado) {
      onCompletado(reto.puntos)
    }
  }

  return (
    <section className="card" style={{ position: 'relative', overflow: 'hidden' }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 10,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 32,
            height: 32,
            borderRadius: 10,
            backgroundColor: completado ? 'var(--color-positive-bg)' : 'rgba(0, 122, 255, 0.12)',
            color: completado ? 'var(--color-positive)' : 'var(--color-accent)',
          }}>
            {completado ? <CheckCircle2 size={18} /> : <Target size={18} />}
          </div>

          <div>
            <span className="apple-caption" style={{ textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 700 }}>
              Reto del Día
            </span>
            <h3 className="apple-headline" style={{ fontSize: 16 }}>
              {reto.titulo}
            </h3>
          </div>
        </div>

        <span className="apple-badge apple-badge-accent">
          +{reto.puntos} XP
        </span>
      </div>

      <p className="apple-subheadline" style={{ fontSize: 14, marginBottom: 16 }}>
        {reto.descripcion}
      </p>

      {completado ? (
        <div
          ref={successBadgeRef}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            padding: '10px 14px',
            borderRadius: 10,
            backgroundColor: 'var(--color-positive-bg)',
            color: 'var(--color-positive)',
            fontSize: 14,
            fontWeight: 600,
          }}
        >
          <CheckCircle2 size={16} />
          <span>¡Reto superado! +{reto.puntos} puntos añadidos</span>
        </div>
      ) : (
        <button
          className="btn-secondary"
          onClick={manejarCompletar}
          disabled={cargando}
          style={{ width: '100%', minHeight: 40, fontSize: 14, gap: 6 }}
        >
          <Award size={16} />
          <span>Marcar reto como conseguido</span>
        </button>
      )}
    </section>
  )
}
