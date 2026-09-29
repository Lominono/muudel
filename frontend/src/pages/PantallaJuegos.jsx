// frontend/src/pages/PantallaJuegos.jsx
import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../App'
import { YoshiRunnerGame } from '../games/yoshiRunner/YoshiRunnerGame'
import { InsigniaIniciales } from '../components/InsigniaIniciales'
import { sound, triggerConfetti } from '../utils/haptics'
import { suscribirEvento, transmitirEvento } from '../utils/realtimeHub'
import { supabase } from '../utils/supabase'
import {
  Gamepad2,
  Trophy,
  Coins,
  Flame,
  Target,
  CheckCircle2,
  Clock
} from 'lucide-react'
import { animarEscalonado } from '../utils/animations'

export function PantallaJuegos() {
  const { perfil, setPerfil } = useAuth()
  const [rankingArcade, setRankingArcade] = useState([])
  const [cargandoRanking, setCargandoRanking] = useState(false)
  const [monedasHoy, setMonedasHoy] = useState(() => {
    const fecha = new Date().toISOString().split('T')[0]
    return Number(localStorage.getItem(`muudel_arcade_monedas_${fecha}_${perfil?.id}`) || 0)
  })
  const [retoArcadeCompletado, setRetoArcadeCompletado] = useState(false)
  const pageRef = useRef(null)

  const fechaHoy = new Date().toISOString().split('T')[0]
  const OBJETIVO_RETO = 100
  const RECOMPENSA_RETO = 30

  useEffect(() => {
    if (pageRef.current) {
      animarEscalonado(pageRef.current.children, { stagger: 0.05, duration: 0.35 })
    }
  }, [])

  // Comprobar si el reto de arcade ya fue completado hoy
  useEffect(() => {
    const key = `muudel_reto_arcade_${perfil?.id}_${fechaHoy}`
    if (localStorage.getItem(key)) {
      setRetoArcadeCompletado(true)
    }

    cargarRankingArcade()

    // Escuchar récords en tiempo real
    const desuscribirRecord = suscribirEvento('arcade_record', (data) => {
      if (data) {
        cargarRankingArcade()
      }
    })

    return () => desuscribirRecord()
  }, [perfil?.id, fechaHoy])

  const cargarRankingArcade = async () => {
    setCargandoRanking(true)
    try {
      // 1. Intentar desde juegos_puntuaciones
      let res = await supabase
        .from('juegos_puntuaciones')
        .select('puntos, created_at, profiles(id, nombre, color_acento, digito_id)')
        .eq('juego', 'yoshi_runner')
        .order('puntos', { ascending: false })
        .limit(10)

      let filas = res.data

      // 2. Si no hay en juegos_puntuaciones, probar arcade_scores
      if (!filas || filas.length === 0) {
        const resAlt = await supabase
          .from('arcade_scores')
          .select('puntuacion, created_at, profiles(id, nombre, color_acento, digito_id)')
          .eq('juego', 'yoshi_runner')
          .order('puntuacion', { ascending: false })
          .limit(10)

        if (resAlt.data && resAlt.data.length > 0) {
          filas = resAlt.data.map(item => ({
            puntos: item.puntuacion,
            profiles: item.profiles,
            created_at: item.created_at
          }))
        }
      }

      if (filas && filas.length > 0) {
        const mapa = {}
        filas.forEach(item => {
          const uId = item.profiles?.id || item.user_id
          if (!mapa[uId] || item.puntos > mapa[uId].puntos) {
            mapa[uId] = {
              id: uId,
              nombre: item.profiles?.nombre || 'Alumno SMR2',
              color: item.profiles?.color_acento || '#007AFF',
              digito: item.profiles?.digito_id || '',
              puntos: item.puntos
            }
          }
        })
        setRankingArcade(Object.values(mapa).sort((a, b) => b.puntos - a.puntos).slice(0, 5))
        setCargandoRanking(false)
        return
      }
    } catch (_) {}

    // Fallback a localStorage local
    const high = Number(localStorage.getItem('muudel_yoshi_highscore') || 0)
    if (high > 0 && perfil) {
      setRankingArcade([{
        id: perfil.id,
        nombre: perfil.nombre || 'Tú',
        color: perfil.color_acento || '#007AFF',
        puntos: high,
        digito: perfil.digito_id || '#01'
      }])
    } else {
      setRankingArcade([])
    }
    setCargandoRanking(false)
  }

  const handleMonedasGanadas = (nuevasMonedas) => {
    const nuevoTotal = monedasHoy + nuevasMonedas
    setMonedasHoy(nuevoTotal)
    const fecha = new Date().toISOString().split('T')[0]
    localStorage.setItem(`muudel_arcade_monedas_${fecha}_${perfil?.id}`, String(nuevoTotal))

    if (perfil) {
      setPerfil(prev => ({
        ...prev,
        puntos_total: (prev?.puntos_total || 0) + nuevasMonedas
      }))
    }
  }

  // Validación automática del reto al superar los 100m
  const handleRetoSuperado = async (score) => {
    if (retoArcadeCompletado) return

    const key = `muudel_reto_arcade_${perfil?.id}_${fechaHoy}`
    localStorage.setItem(key, 'true')
    setRetoArcadeCompletado(true)

    // Sumar puntos del reto al alumno
    const nuevosPuntos = (perfil?.puntos_total || 0) + RECOMPENSA_RETO
    const perfilActualizado = { ...perfil, puntos_total: nuevosPuntos }
    setPerfil(perfilActualizado)
    localStorage.setItem('racha_local_user', JSON.stringify(perfilActualizado))

    try {
      await supabase
        .from('profiles')
        .update({ puntos_total: nuevosPuntos })
        .eq('id', perfil.id)

      await supabase.from('reto_completado').upsert({
        reto_id: 'reto-arcade-yoshi',
        user_id: perfil.id,
        validado: true,
        estado: 'aprobado',
        evidencia: `Auto-comprobado por motor de Yoshi Runner (Récord: ${score}m)`,
        fecha: new Date().toISOString()
      })
    } catch (_) {}

    try {
      const entregas = JSON.parse(localStorage.getItem('muudel_entregas_retos') || '[]')
      entregas.unshift({
        id: 'ent-' + Date.now(),
        retoId: 'reto-arcade-yoshi',
        retoTitulo: 'Desafío Yoshi: Supera 100m en el Runner',
        puntos: RECOMPENSA_RETO,
        userId: perfil.id,
        nombre: perfil.nombre,
        username: perfil.username || '',
        color: perfil.color_acento,
        evidencia: `Auto-validado por el juego: Puntuación de ${score}m alcanzada`,
        estado: 'aprobado',
        fecha: new Date().toLocaleDateString('es-ES'),
        hora: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      })
      localStorage.setItem('muudel_entregas_retos', JSON.stringify(entregas))
    } catch (_) {}

    transmitirEvento('puntos_actualizados', { userId: perfil?.id, nuevosPuntos })
    transmitirEvento('reto_completado_notif', {
      nombre: perfil?.nombre,
      retoTitulo: 'Desafío Yoshi Runner 100m',
      puntos: RECOMPENSA_RETO
    })

    sound.playStamp()
    triggerConfetti()
  }

  return (
    <main className="app-container" style={{ maxWidth: 840, padding: 'clamp(12px, 3vw, 24px)' }}>
      {/* Encabezado Apple HIG */}
      <header style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div
              style={{
                width: 42,
                height: 42,
                borderRadius: 12,
                backgroundColor: 'rgba(52, 199, 89, 0.12)',
                color: '#34C759',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 2px 8px rgba(52, 199, 89, 0.15)'
              }}
            >
              <Gamepad2 size={24} />
            </div>
            <div>
              <h1 className="apple-large-title" style={{ fontSize: 'clamp(22px, 4vw, 28px)', margin: 0 }}>
                Recreo Arcade
              </h1>
              <p className="apple-subheadline" style={{ fontSize: 13, margin: '2px 0 0' }}>
                Pausa activa de clase SMR2 y bolsa de puntos diarios.
              </p>
            </div>
          </div>

          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '4px 12px',
              borderRadius: 9999,
              backgroundColor: 'rgba(0, 122, 255, 0.1)',
              color: 'var(--color-accent)',
              fontSize: 12,
              fontWeight: 600
            }}
          >
            🦖 Yoshi Runner SMR2
          </span>
        </div>
      </header>

      <div ref={pageRef} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* RETO DEL DÍA INTEGRADO */}
        <section
          className="card"
          style={{
            padding: '16px',
            backgroundColor: retoArcadeCompletado ? 'rgba(52, 199, 89, 0.08)' : 'rgba(0, 122, 255, 0.06)',
            border: retoArcadeCompletado ? '1px solid rgba(52, 199, 89, 0.25)' : '1px solid rgba(0, 122, 255, 0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 12
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                backgroundColor: retoArcadeCompletado ? 'rgba(52, 199, 89, 0.18)' : 'rgba(0, 122, 255, 0.15)',
                color: retoArcadeCompletado ? 'var(--color-positive)' : 'var(--color-accent)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}
            >
              {retoArcadeCompletado ? <CheckCircle2 size={24} /> : <Target size={24} />}
            </div>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: 0.5,
                    color: retoArcadeCompletado ? 'var(--color-positive)' : 'var(--color-accent)'
                  }}
                >
                  {retoArcadeCompletado ? '¡Reto Completado!' : 'Reto Arcade de Hoy'}
                </span>
                <span className="apple-badge apple-badge-accent" style={{ fontSize: 11 }}>
                  +{RECOMPENSA_RETO} pts
                </span>
              </div>
              <h3 className="apple-headline" style={{ fontSize: 16, marginTop: 2 }}>
                Desafío Yoshi: Alcanza {OBJETIVO_RETO}m en Yoshi Runner
              </h3>
              <p className="apple-caption" style={{ fontSize: 12, marginTop: 2 }}>
                {retoArcadeCompletado
                  ? 'Reto superado. Puntos acreditados a tu cuenta.'
                  : 'Llega a 100m en tu partida para completarlo automáticamente.'}
              </p>
            </div>
          </div>

          <div>
            {retoArcadeCompletado ? (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '6px 14px',
                  borderRadius: 9999,
                  backgroundColor: 'rgba(52, 199, 89, 0.15)',
                  color: 'var(--color-positive)',
                  fontWeight: 700,
                  fontSize: 13
                }}
              >
                <CheckCircle2 size={16} />
                <span>Superado</span>
              </span>
            ) : (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '6px 14px',
                  borderRadius: 9999,
                  backgroundColor: 'rgba(0, 122, 255, 0.12)',
                  color: 'var(--color-accent)',
                  fontWeight: 700,
                  fontSize: 13
                }}
              >
                <Flame size={15} />
                <span>En progreso</span>
              </span>
            )}
          </div>
        </section>

        {/* JUEGO ARCADE YOSHI RUNNER */}
        <section>
          <YoshiRunnerGame
            perfil={perfil}
            onMonedasGanadas={handleMonedasGanadas}
            onRetoCompletado={handleRetoSuperado}
            retoActivo={{ objetivo_puntuacion: OBJETIVO_RETO }}
          />
        </section>

        {/* PANEL INFERIOR: ESTADÍSTICAS Y RÉCORDS */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 14 }}>
          {/* Bolsa de Monedas Diarias */}
          <section className="card">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <Coins size={18} color="#D97706" />
              <h3 className="apple-headline" style={{ fontSize: 15 }}>
                Bolsa de Monedas Diarias
              </h3>
            </div>
            <p className="apple-caption" style={{ marginBottom: 12 }}>
              Hasta 60 puntos diarios en recreos para canjear en la tienda o subir en el ranking.
            </p>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <span className="apple-caption">Ganados hoy:</span>
              <strong style={{ fontSize: 13, color: '#D97706' }}>{monedasHoy} / 60 pts</strong>
            </div>

            <div
              style={{
                height: 8,
                backgroundColor: 'var(--color-fill-secondary)',
                borderRadius: 9999,
                overflow: 'hidden'
              }}
            >
              <div
                style={{
                  height: '100%',
                  width: `${Math.min(100, (monedasHoy / 60) * 100)}%`,
                  backgroundColor: '#F59E0B',
                  borderRadius: 9999,
                  transition: 'width 0.3s ease'
                }}
              />
            </div>

            <div style={{ marginTop: 14, fontSize: 12, color: 'var(--color-secondary-ink)', lineHeight: 1.4 }}>
              Huevos Yoshi: <strong>+5 pts</strong> · Monedas doradas: <strong>+1 pt</strong> · Aplastar bombas/caparazones: <strong>+30 pts</strong>.
            </div>
          </section>

          {/* Récords de la Clase */}
          <section className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--color-separator)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Trophy size={16} color="#FF9500" />
                <h3 className="apple-headline" style={{ fontSize: 15 }}>
                  Récords de Yoshi Runner
                </h3>
              </div>
              <span className="apple-caption" style={{ fontSize: 11 }}>
                Aula SMR2
              </span>
            </div>

            {cargandoRanking ? (
              <div style={{ padding: '24px 16px', textAlign: 'center', color: 'var(--color-secondary-ink)', fontSize: 13 }}>
                Cargando marcas del aula...
              </div>
            ) : rankingArcade.length === 0 ? (
              <div style={{ padding: '24px 16px', textAlign: 'center', color: 'var(--color-secondary-ink)', fontSize: 13 }}>
                <Clock size={24} style={{ margin: '0 auto 8px', opacity: 0.6 }} />
                <p style={{ margin: 0, fontWeight: 600 }}>Aún no hay puntuaciones registradas hoy.</p>
                <p style={{ margin: '4px 0 0', fontSize: 11, opacity: 0.8 }}>¡Juega una partida para registrar la primera marca!</p>
              </div>
            ) : (
              rankingArcade.map((jugador, i) => (
                <div
                  key={jugador.id || i}
                  style={{
                    padding: '10px 16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    borderBottom: i < rankingArcade.length - 1 ? '0.5px solid var(--color-separator)' : 'none',
                    backgroundColor: jugador.nombre === perfil?.nombre ? 'rgba(0, 122, 255, 0.05)' : 'transparent'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span
                      style={{
                        width: 20,
                        fontWeight: 800,
                        fontSize: 13,
                        color: i === 0 ? '#D4AF37' : i === 1 ? '#8E8E93' : i === 2 ? '#CD7F32' : 'var(--color-tertiary-ink)'
                      }}
                    >
                      #{i + 1}
                    </span>
                    <InsigniaIniciales nombre={jugador.nombre} color={jugador.color} size={30} />
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 13 }}>
                        {jugador.nombre}
                      </div>
                      {jugador.digito && (
                        <span className="apple-caption" style={{ fontSize: 10 }}>
                          {jugador.digito}
                        </span>
                      )}
                    </div>
                  </div>

                  <span style={{ fontWeight: 800, fontSize: 14, color: 'var(--color-accent)' }}>
                    {jugador.puntos}m
                  </span>
                </div>
              ))
            )}
          </section>
        </div>
      </div>
    </main>
  )
}
