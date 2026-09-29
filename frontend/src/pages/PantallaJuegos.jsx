// frontend/src/pages/PantallaJuegos.jsx
import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../App'
import { YoshiRunnerGame } from '../games/yoshiRunner/YoshiRunnerGame'
import { DustRacingGame } from '../games/dustRacing/DustRacingGame'
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
  Sparkles,
  Award,
  CheckCircle2,
  Clock,
  Car,
  Compass
} from 'lucide-react'
import { animarEscalonado } from '../utils/animations'

export function PantallaJuegos() {
  const { perfil, setPerfil } = useAuth()
  const [juegoSeleccionado, setJuegoSeleccionado] = useState('dust') // 'dust' | 'yoshi'
  const [rankingArcade, setRankingArcade] = useState([])
  const [cargandoRanking, setCargandoRanking] = useState(false)
  const [monedasHoy, setMonedasHoy] = useState(() => {
    const fecha = new Date().toISOString().split('T')[0]
    return Number(localStorage.getItem(`muudel_arcade_monedas_${fecha}_${perfil?.id}`) || 0)
  })
  const [retoArcadeCompletado, setRetoArcadeCompletado] = useState(false)
  const pageRef = useRef(null)

  const fechaHoy = new Date().toISOString().split('T')[0]
  const OBJETIVO_RETO = juegoSeleccionado === 'dust' ? 150 : 100
  const RECOMPENSA_RETO = juegoSeleccionado === 'dust' ? 35 : 30

  useEffect(() => {
    if (pageRef.current) {
      animarEscalonado(pageRef.current.children, { stagger: 0.05, duration: 0.35 })
    }
  }, [juegoSeleccionado])

  // Comprobar si el reto del juego actual ya fue completado hoy
  useEffect(() => {
    const key = `muudel_reto_arcade_${juegoSeleccionado}_${perfil?.id}_${fechaHoy}`
    const legacyKey = `muudel_reto_arcade_${perfil?.id}_${fechaHoy}`
    if (localStorage.getItem(key) || (juegoSeleccionado === 'yoshi' && localStorage.getItem(legacyKey))) {
      setRetoArcadeCompletado(true)
    } else {
      setRetoArcadeCompletado(false)
    }

    cargarRankingArcade()

    // Escuchar nuevos récords en tiempo real
    const desuscribirRecord = suscribirEvento('arcade_record', (data) => {
      if (data) {
        cargarRankingArcade()
      }
    })

    return () => desuscribirRecord()
  }, [perfil?.id, fechaHoy, juegoSeleccionado])

  const cargarRankingArcade = async () => {
    setCargandoRanking(true)
    const juegoDbNombre = juegoSeleccionado === 'dust' ? 'dust_racing' : 'yoshi_runner'

    try {
      // 1. Intentar en tabla arcade_scores
      let res = await supabase
        .from('arcade_scores')
        .select('puntuacion, created_at, profiles(id, nombre, color_acento, digito_id)')
        .eq('juego', juegoDbNombre)
        .order('puntuacion', { ascending: false })
        .limit(15)

      let filas = res.data

      // 2. Si no hay en arcade_scores, intentar en juegos_puntuaciones
      if (!filas || filas.length === 0) {
        const resAlt = await supabase
          .from('juegos_puntuaciones')
          .select('puntos, created_at, profiles(id, nombre, color_acento, digito_id)')
          .eq('juego', juegoDbNombre)
          .order('puntos', { ascending: false })
          .limit(15)

        if (resAlt.data && resAlt.data.length > 0) {
          filas = resAlt.data.map(item => ({
            puntuacion: item.puntos,
            profiles: item.profiles,
            created_at: item.created_at
          }))
        }
      }

      if (filas && filas.length > 0) {
        // Agrupar por usuario única mejor puntuación
        const mapa = {}
        filas.forEach(item => {
          const uId = item.profiles?.id || 'anon'
          const pts = item.puntuacion || 0
          if (!mapa[uId] || pts > mapa[uId].puntos) {
            mapa[uId] = {
              id: uId,
              nombre: item.profiles?.nombre || 'Piloto SMR2',
              color: item.profiles?.color_acento || '#0A84FF',
              digito: item.profiles?.digito_id || '',
              puntos: pts
            }
          }
        })
        setRankingArcade(Object.values(mapa).sort((a, b) => b.puntos - a.puntos).slice(0, 5))
        setCargandoRanking(false)
        return
      }
    } catch (_) {}

    // Fallback local si el servidor no tiene datos aún
    const highKey = juegoSeleccionado === 'dust' ? 'muudel_dust_highscore' : 'muudel_yoshi_highscore'
    const high = Number(localStorage.getItem(highKey) || 0)
    if (high > 0 && perfil) {
      setRankingArcade([{
        id: perfil.id,
        nombre: perfil.nombre || 'Tú',
        color: perfil.color_acento || '#0A84FF',
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

  // Validación automática del reto de clase
  const handleRetoSuperado = async (score) => {
    if (retoArcadeCompletado) return

    const key = `muudel_reto_arcade_${juegoSeleccionado}_${perfil?.id}_${fechaHoy}`
    localStorage.setItem(key, 'true')
    setRetoArcadeCompletado(true)

    // Sumar puntos del reto al alumno
    const nuevosPuntos = (perfil?.puntos_total || 0) + RECOMPENSA_RETO
    const perfilActualizado = { ...perfil, puntos_total: nuevosPuntos }
    setPerfil(perfilActualizado)
    localStorage.setItem('racha_local_user', JSON.stringify(perfilActualizado))

    // Guardar en Supabase o local
    try {
      await supabase
        .from('profiles')
        .update({ puntos_total: nuevosPuntos })
        .eq('id', perfil.id)

      await supabase.from('reto_completado').upsert({
        reto_id: `reto-arcade-${juegoSeleccionado}`,
        user_id: perfil.id,
        validado: true,
        estado: 'aprobado',
        evidencia: `Auto-comprobado por motor de ${juegoSeleccionado === 'dust' ? 'Dust Racing 2D' : 'Yoshi Runner'} (Récord: ${score} pts)`,
        fecha: new Date().toISOString()
      })
    } catch (_) {}

    // Guardar en tabla local de entregas para que el profesor/moderador lo vea verificado
    try {
      const entregas = JSON.parse(localStorage.getItem('muudel_entregas_retos') || '[]')
      entregas.unshift({
        id: 'ent-' + Date.now(),
        retoId: `reto-arcade-${juegoSeleccionado}`,
        retoTitulo: juegoSeleccionado === 'dust'
          ? 'Desafío Dust Racing: 3 Vueltas al Circuito SMR2'
          : 'Desafío Yoshi: Supera 100m en el Runner',
        puntos: RECOMPENSA_RETO,
        userId: perfil.id,
        nombre: perfil.nombre,
        username: perfil.username || '',
        color: perfil.color_acento,
        evidencia: `Auto-validado por el juego: Puntuación de ${score} pts alcanzada`,
        estado: 'aprobado',
        fecha: new Date().toLocaleDateString('es-ES'),
        hora: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      })
      localStorage.setItem('muudel_entregas_retos', JSON.stringify(entregas))
    } catch (_) {}

    transmitirEvento('puntos_actualizados', { userId: perfil?.id, nuevosPuntos })
    transmitirEvento('reto_completado_notif', {
      nombre: perfil?.nombre,
      retoTitulo: juegoSeleccionado === 'dust' ? 'Gran Premio Dust Racing SMR2' : 'Desafío Yoshi Runner 100m',
      puntos: RECOMPENSA_RETO
    })

    sound.playStamp()
    triggerConfetti()
  }

  return (
    <main className="app-container" style={{ maxWidth: 880 }}>
      {/* Encabezado Principal estilo Apple HIG */}
      <header style={{ marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, marginBottom: 6 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: 10,
                backgroundColor: 'rgba(52, 199, 89, 0.15)',
                color: '#34C759',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <Gamepad2 size={24} />
            </div>
            <div>
              <h1 className="apple-large-title" style={{ fontSize: 26, margin: 0 }}>
                Recreo Arcade
              </h1>
              <p className="apple-subheadline" style={{ fontSize: 13, margin: '2px 0 0' }}>
                Juegos de habilidad, física 60 FPS y bolsa de puntos diarios SMR2.
              </p>
            </div>
          </div>

          <div className="sello-tinta sello-tinta-verde" style={{ fontSize: 10, padding: '4px 10px' }}>
            REGISTRO OFICIAL CLASE SMR2
          </div>
        </div>

        {/* Apple Segmented Control para Alternar Entre Juegos */}
        <div
          role="tablist"
          style={{
            display: 'inline-flex',
            padding: 3,
            backgroundColor: 'var(--color-fill-secondary)',
            borderRadius: 12,
            marginTop: 10,
            gap: 2,
            width: '100%',
            maxWidth: 440
          }}
        >
          <button
            type="button"
            role="tab"
            aria-selected={juegoSeleccionado === 'dust'}
            onClick={() => {
              sound.playPop()
              setJuegoSeleccionado('dust')
            }}
            style={{
              flex: 1,
              padding: '8px 16px',
              borderRadius: 10,
              fontSize: 13,
              fontWeight: juegoSeleccionado === 'dust' ? 700 : 500,
              border: 'none',
              cursor: 'pointer',
              backgroundColor: juegoSeleccionado === 'dust' ? 'var(--color-surface)' : 'transparent',
              color: juegoSeleccionado === 'dust' ? 'var(--color-ink)' : 'var(--color-secondary-ink)',
              boxShadow: juegoSeleccionado === 'dust' ? '0 1px 4px rgba(0,0,0,0.12)' : 'none',
              transition: 'all 0.15s ease',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 7
            }}
          >
            <Car size={16} color={juegoSeleccionado === 'dust' ? '#F59E0B' : 'currentColor'} />
            <span>🏎️ Dust Racing 2D</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={juegoSeleccionado === 'yoshi'}
            onClick={() => {
              sound.playPop()
              setJuegoSeleccionado('yoshi')
            }}
            style={{
              flex: 1,
              padding: '8px 16px',
              borderRadius: 10,
              fontSize: 13,
              fontWeight: juegoSeleccionado === 'yoshi' ? 700 : 500,
              border: 'none',
              cursor: 'pointer',
              backgroundColor: juegoSeleccionado === 'yoshi' ? 'var(--color-surface)' : 'transparent',
              color: juegoSeleccionado === 'yoshi' ? 'var(--color-ink)' : 'var(--color-secondary-ink)',
              boxShadow: juegoSeleccionado === 'yoshi' ? '0 1px 4px rgba(0,0,0,0.12)' : 'none',
              transition: 'all 0.15s ease',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 7
            }}
          >
            <span>🦖 Yoshi Runner SMR2</span>
          </button>
        </div>
      </header>

      <div ref={pageRef} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* RETO DEL DÍA INTEGRADO SEGÚN EL JUEGO ACTIVO */}
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
                    fontWeight: 800,
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
                {juegoSeleccionado === 'dust'
                  ? 'Gran Premio SMR2: Completa 3 vueltas en Dust Racing 2D'
                  : `Desafío Yoshi: Alcanza ${OBJETIVO_RETO}m en Yoshi Runner`}
              </h3>
              <p className="apple-caption" style={{ fontSize: 12, marginTop: 2 }}>
                {retoArcadeCompletado
                  ? 'Reto superado y homologado. Puntos acreditados a tu cuenta.'
                  : juegoSeleccionado === 'dust'
                    ? 'Supera 150 pts de carrera o cruza la meta en 3 vueltas para validarlo automáticamente.'
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

        {/* RENDERIZADO DEL JUEGO SELECCIONADO */}
        <section>
          {juegoSeleccionado === 'dust' ? (
            <DustRacingGame
              perfil={perfil}
              onMonedasGanadas={handleMonedasGanadas}
              onRetoCompletado={handleRetoSuperado}
            />
          ) : (
            <YoshiRunnerGame
              perfil={perfil}
              onMonedasGanadas={handleMonedasGanadas}
              onRetoCompletado={handleRetoSuperado}
              retoActivo={{ objetivo_puntuacion: OBJETIVO_RETO }}
            />
          )}
        </section>

        {/* PANEL INFERIOR: BOLSA DE GANANCIAS Y RÉCORDS DEL AULA */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 14 }}>
          {/* Tarjeta: Límite y Puntos del Recreo */}
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

            <div style={{ marginTop: 14, fontSize: 12, color: 'var(--color-secondary-ink)', lineHeight: 1.45 }}>
              {juegoSeleccionado === 'dust' ? (
                <>
                  Monedas en pista: <strong>+1 pt</strong> · Vuelta rápida: <strong>+10 pts</strong> · Derrapes continuados: <strong>+1 pt/s</strong>.
                </>
              ) : (
                <>
                  Huevos Yoshi: <strong>+5 pts</strong> · Monedas doradas: <strong>+1 pt</strong> · Aplastar bombas: <strong>+30 pts</strong>.
                </>
              )}
            </div>
          </section>

          {/* Tarjeta: Top Récords de la Clase */}
          <section className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--color-separator)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Trophy size={16} color="#FF9500" />
                <h3 className="apple-headline" style={{ fontSize: 15 }}>
                  Récords: {juegoSeleccionado === 'dust' ? 'Dust Racing 2D' : 'Yoshi Runner'}
                </h3>
              </div>
              <span className="apple-caption" style={{ fontSize: 11 }}>
                Servidor SMR2
              </span>
            </div>

            {cargandoRanking ? (
              <div style={{ padding: '24px 16px', textAlign: 'center', color: 'var(--color-secondary-ink)', fontSize: 13 }}>
                Cargando marcas del servidor...
              </div>
            ) : rankingArcade.length === 0 ? (
              <div style={{ padding: '24px 16px', textAlign: 'center', color: 'var(--color-secondary-ink)', fontSize: 13 }}>
                <Clock size={24} style={{ margin: '0 auto 8px', opacity: 0.6 }} />
                <p style={{ margin: 0, fontWeight: 600 }}>Aún no hay puntuaciones registradas para este juego hoy.</p>
                <p style={{ margin: '4px 0 0', fontSize: 11, opacity: 0.8 }}>¡Juega una carrera para inscribir la primera marca oficial en la pizarra!</p>
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
                    {jugador.puntos} {juegoSeleccionado === 'dust' ? 'pts' : 'm'}
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
