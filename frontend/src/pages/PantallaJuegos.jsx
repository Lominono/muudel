// frontend/src/pages/PantallaJuegos.jsx
import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../App'
import { YoshiRunnerGame } from '../games/yoshiRunner/YoshiRunnerGame'
import { SPRITES_DATA_URI } from '../games/yoshiRunner/yoshiAssets'
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
  Maximize2,
  HelpCircle,
  Clock
} from 'lucide-react'
import { animarEscalonado } from '../utils/animations'

export function PantallaJuegos() {
  const { perfil, setPerfil } = useAuth()
  const [rankingArcade, setRankingArcade] = useState([])
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

    // Escuchar nuevos récords en tiempo real
    const desuscribirRecord = suscribirEvento('arcade_record', (data) => {
      if (data) {
        cargarRankingArcade()
      }
    })

    return () => desuscribirRecord()
  }, [perfil?.id, fechaHoy])

  const cargarRankingArcade = async () => {
    // 1. Intentar desde Supabase
    try {
      const { data } = await supabase
        .from('juegos_puntuaciones')
        .select('puntos, created_at, profiles(id, nombre, color_acento, digito_id)')
        .eq('juego', 'yoshi_runner')
        .order('puntos', { ascending: false })
        .limit(10)

      if (data && data.length > 0) {
        // Agrupar por usuario mejor puntuación
        const mapa = {}
        data.forEach(item => {
          const uId = item.profiles?.id || item.user_id
          if (!mapa[uId] || item.puntos > mapa[uId].puntos) {
            mapa[uId] = {
              id: uId,
              nombre: item.profiles?.nombre || 'Alumno',
              color: item.profiles?.color_acento || '#0A84FF',
              digito: item.profiles?.digito_id || '',
              puntos: item.puntos
            }
          }
        })
        setRankingArcade(Object.values(mapa).sort((a, b) => b.puntos - a.puntos).slice(0, 5))
        return
      }
    } catch (e) {}

    // 2. Fallback local / simulación de aula
    const high = Number(localStorage.getItem('muudel_yoshi_highscore') || 0)
    const mock = [
      { id: '1', nombre: perfil?.nombre || 'Tú', color: perfil?.color_acento || '#0A84FF', puntos: Math.max(high, 85), digito: perfil?.digito_id || '#01' },
      { id: '2', nombre: 'JuanFe', color: '#FF9500', puntos: 142, digito: '#04' },
      { id: '3', nombre: 'Laura', color: '#30D158', puntos: 110, digito: '#12' },
      { id: '4', nombre: 'Carlos SMR', color: '#BF5AF2', puntos: 78, digito: '#08' },
    ].sort((a, b) => b.puntos - a.puntos)

    setRankingArcade(mock)
  }

  const handleMonedasGanadas = (nuevasMonedas) => {
    const nuevoTotal = monedasHoy + nuevasMonedas
    setMonedasHoy(nuevoTotal)
    if (perfil) {
      setPerfil(prev => ({
        ...prev,
        puntos_total: (prev.puntos_total || 0) + nuevasMonedas
      }))
    }
  }

  // Validación automática del reto al superar los 100 puntos en Yoshi Runner
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

    // Guardar en Supabase o local
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
    } catch (e) {}

    // Guardar en tabla local de entregas para que el admin lo vea verificado
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
    } catch (e) {}

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
    <main className="app-container" style={{ maxWidth: 840 }}>
      <header style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              backgroundColor: 'rgba(52, 199, 89, 0.15)',
              color: '#34C759',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <Gamepad2 size={22} />
          </div>
          <h1 className="apple-large-title" style={{ fontSize: 26 }}>
            Recreo Arcade
          </h1>
        </div>
        <p className="apple-subheadline" style={{ fontSize: 13 }}>
          Mini-juegos para ganar monedas escolares, despejar la mente y completar retos interactivos.
        </p>
      </header>

      <div ref={pageRef} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* RETO DEL DÍA INTEGRADO CON EL JUEGO */}
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
                  {retoArcadeCompletado ? '¡Reto Completado y Comprobado!' : 'Reto Arcade de Hoy'}
                </span>
                <span className="apple-badge apple-badge-accent" style={{ fontSize: 11 }}>
                  +{RECOMPENSA_RETO} pts
                </span>
              </div>
              <h3 className="apple-headline" style={{ fontSize: 16, marginTop: 2 }}>
                Desafío Yoshi: Alcanza al menos {OBJETIVO_RETO}m en Yoshi Runner
              </h3>
              <p className="apple-caption" style={{ fontSize: 12, marginTop: 2 }}>
                {retoArcadeCompletado
                  ? 'Has demostrado tus reflejos y la recompensa ya se acreditó a tu cuenta.'
                  : 'Se comprueba automáticamente durante tu partida sin necesidad de enviar capturas.'}
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

        {/* EL JUEGO PRINCIPAL: YOSHI RUNNER */}
        <section>
          <YoshiRunnerGame
            perfil={perfil}
            onMonedasGanadas={handleMonedasGanadas}
            onRetoCompletado={handleRetoSuperado}
            retoActivo={{ objetivo_puntuacion: OBJETIVO_RETO }}
          />
        </section>

        {/* PANEL INFERIOR: ESTADÍSTICAS Y RANKING DEL AULA */}
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
              Puedes canjear hasta 60 monedas diarias jugando limpiamente en el recreo.
            </p>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <span className="apple-caption">Ganadas hoy:</span>
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
              💡 Recoger huevos de Yoshi te otorga <strong>+5 pts</strong> cada uno, y cada moneda dorada suma <strong>+1 pt</strong> directo a tu perfil para usar en la tienda escolar.
            </div>
          </section>

          {/* Tarjeta: Top Récords de la Clase */}
          <section className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--color-separator)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Trophy size={16} color="#FF9500" />
              <h3 className="apple-headline" style={{ fontSize: 15 }}>
                Récords de Yoshi Runner (Clase)
              </h3>
            </div>

            {rankingArcade.map((jugador, i) => (
              <div
                key={jugador.id}
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
            ))}
          </section>
        </div>
      </div>
    </main>
  )
}
