// frontend/src/pages/PantallaJuegos.jsx
import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../App'
import { YoshiRunnerGame } from '../games/yoshiRunner/YoshiRunnerGame'
import { RuletaCasinoGame } from '../games/ruleta/RuletaCasinoGame'
import { BatallaDadosPvP } from '../games/BatallaDadosPvP'
import { Duelo21PvP } from '../games/veintiuno/Duelo21PvP'
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
  Clock,
  Sparkles,
  Disc,
  Dices,
  ShieldCheck,
  Crown,
  Ticket,
  Shield,
  Swords
} from 'lucide-react'
import { animarEscalonado } from '../utils/animations'

export function PantallaJuegos() {
  const { perfil, setPerfil } = useAuth()
  const [juegoSeleccionado, setJuegoSeleccionado] = useState('ruleta') // 'ruleta' | 'veintiuno' | 'pvp' | 'yoshi'
  const [rankingArcade, setRankingArcade] = useState([])
  const [cargandoRanking, setCargandoRanking] = useState(false)
  const [monedasHoy, setMonedasHoy] = useState(() => {
    const fecha = new Date().toISOString().split('T')[0]
    return Number(localStorage.getItem(`muudel_arcade_monedas_${fecha}_${perfil?.id}`) || 0)
  })
  const [retoArcadeCompletado, setRetoArcadeCompletado] = useState(false)
  const pageRef = useRef(null)

  const fechaHoy = new Date().toISOString().split('T')[0]
  const OBJETIVO_RETO = 250 // Nerf: requiere llegar a 250m
  const RECOMPENSA_RETO = 10 // Nerf: recompensa moderada de 10 pts
  const LIMITE_BOLSA = 20 // Nerf: máximo 20 pts diarios en juegos

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

      // Registrar récord en arcade_scores (tabla con esquema específico para juegos)
      await supabase.from('arcade_scores').insert({
        user_id: perfil.id,
        juego: 'yoshi_runner',
        puntuacion: score,
        monedas: RECOMPENSA_RETO,
        fecha: fechaHoy
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

  // Obtener ventajas activas de la tienda web para juegos
  const mejorasActivas = (() => {
    try {
      const invRaw = localStorage.getItem('muudel_inventario_' + perfil?.id)
      const tieneSeguro = localStorage.getItem('muudel_seguro_ruleta_' + perfil?.id) === 'true'
      const items = invRaw ? JSON.parse(invRaw) : []
      const perks = []

      if (tieneSeguro || items.some(i => i.catalogoId === 'seguro_ruleta' && i.estado !== 'usado')) {
        perks.push({ id: 'seguro', label: 'Seguro Ruleta 50%', Icon: ShieldCheck, color: '#30D158' })
      }
      if (items.some(i => i.catalogoId === 'dados_oro_pvp' && i.estado !== 'expirado')) {
        perks.push({ id: 'dados_oro', label: 'Dados Dorados VIP', Icon: Crown, color: '#FBBF24' })
      }
      if (items.some(i => i.catalogoId === 'ruleta_max_500')) {
        perks.push({ id: 'ruleta_500', label: 'Licencia VIP 500', Icon: Crown, color: '#D4AF37' })
      } else if (items.some(i => i.catalogoId === 'ruleta_max_100')) {
        perks.push({ id: 'ruleta_100', label: 'Licencia Casino 100', Icon: Ticket, color: '#FF3B30' })
      } else if (items.some(i => i.catalogoId === 'ruleta_max_50')) {
        perks.push({ id: 'ruleta_50', label: 'Licencia Casino 50', Icon: Ticket, color: '#FF9500' })
      }
      if (items.some(i => i.catalogoId === 'racha_x2' && i.estado === 'activo')) {
        perks.push({ id: 'racha_x2', label: 'Racha x2 Activa', Icon: Flame, color: '#FF3B30' })
      }
      if (items.some(i => i.catalogoId === 'congelar_racha' && i.estado !== 'usado')) {
        perks.push({ id: 'escudo', label: 'Escudo Racha', Icon: Shield, color: '#0A84FF' })
      }
      return perks
    } catch (_) {
      return []
    }
  })()

  return (
    <main className="app-container" style={{ maxWidth: 880, padding: 'clamp(12px, 3vw, 24px)' }}>
      {/* Encabezado de Recreo y Salón de Juegos */}
      <header style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                backgroundColor: 'rgba(52, 199, 89, 0.12)',
                border: '1px solid rgba(52, 199, 89, 0.3)',
                color: '#2F9E44',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 2px 6px rgba(0,0,0,0.06)'
              }}
            >
              <Gamepad2 size={24} />
            </div>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <h1 className="apple-large-title" style={{ fontSize: 'clamp(20px, 3.5vw, 24px)', margin: 0, letterSpacing: -0.3 }}>
                  Recreo y Apuestas SMR2
                </h1>
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: 0.6,
                    padding: '2px 7px',
                    borderRadius: 4,
                    border: '1px solid rgba(217, 56, 41, 0.3)',
                    backgroundColor: 'rgba(217, 56, 41, 0.08)',
                    color: '#D93829',
                    fontFamily: 'monospace'
                  }}
                >
                  PAUSA 18:10
                </span>
              </div>
              <p className="apple-subheadline" style={{ fontSize: 13, margin: '2px 0 0', color: 'var(--color-secondary-ink)' }}>
                Mesa de ruleta europea, duelos 1v1 de dados en pizarra y arcade Yoshi.
              </p>
            </div>
          </div>

          {/* Selector de Juego estilo Apple Segmented Control Equilibrado (con Iconos) */}
          <div
            className="segmented-control"
            style={{
              width: '100%',
              maxWidth: 580,
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              padding: 3,
              backgroundColor: 'var(--color-fill-secondary)',
              borderRadius: 12
            }}
          >
            <button
              type="button"
              className={`segmented-control-item ${juegoSeleccionado === 'ruleta' ? 'active' : ''}`}
              onClick={() => {
                sound.playPop()
                setJuegoSeleccionado('ruleta')
              }}
              style={{
                minHeight: 40,
                padding: '8px 6px',
                fontSize: 12,
                fontWeight: 700,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 5
              }}
            >
              <Disc size={14} />
              <span>Ruleta</span>
            </button>
            <button
              type="button"
              className={`segmented-control-item ${juegoSeleccionado === 'veintiuno' ? 'active' : ''}`}
              onClick={() => {
                sound.playPop()
                setJuegoSeleccionado('veintiuno')
              }}
              style={{
                minHeight: 40,
                padding: '8px 6px',
                fontSize: 12,
                fontWeight: 700,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 5
              }}
            >
              <Crown size={14} />
              <span>Duelo 21</span>
            </button>
            <button
              type="button"
              className={`segmented-control-item ${juegoSeleccionado === 'pvp' ? 'active' : ''}`}
              onClick={() => {
                sound.playPop()
                setJuegoSeleccionado('pvp')
              }}
              style={{
                minHeight: 40,
                padding: '8px 6px',
                fontSize: 12,
                fontWeight: 700,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 5
              }}
            >
              <Dices size={14} />
              <span>Dados PvP</span>
            </button>
            <button
              type="button"
              className={`segmented-control-item ${juegoSeleccionado === 'yoshi' ? 'active' : ''}`}
              onClick={() => {
                sound.playPop()
                setJuegoSeleccionado('yoshi')
              }}
              style={{
                minHeight: 40,
                padding: '8px 6px',
                fontSize: 12,
                fontWeight: 700,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 5
              }}
            >
              <Gamepad2 size={14} />
              <span>Yoshi</span>
            </button>
          </div>
        </div>
      </header>

      {/* BARRA TÁCTIL DE SALDO Y PERKS ACTIVOS */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 10,
          padding: '10px 14px',
          borderRadius: 10,
          backgroundColor: 'var(--color-surface)',
          border: '1px solid var(--color-separator)',
          marginBottom: 16,
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              backgroundColor: 'rgba(255, 149, 0, 0.12)',
              color: '#FF9500',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <Coins size={16} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 12, color: 'var(--color-secondary-ink)', fontWeight: 600 }}>
              Saldo disponible:
            </span>
            <strong style={{ fontSize: 15, color: '#D97706', fontFamily: 'monospace', fontWeight: 800 }}>
              {perfil?.puntos_total || 0} pts
            </strong>
          </div>
        </div>

        {/* Perks Activos en mesa con iconos */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          {mejorasActivas.length > 0 ? (
            mejorasActivas.map(p => {
              const IconComp = p.Icon
              return (
                <span
                  key={p.id}
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    padding: '3px 8px',
                    borderRadius: 6,
                    backgroundColor: `${p.color}15`,
                    border: `1px solid ${p.color}40`,
                    color: p.color,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 5
                  }}
                >
                  <IconComp size={12} />
                  <span>{p.label}</span>
                </span>
              )
            })
          ) : (
            <span style={{ fontSize: 11, color: 'var(--color-secondary-ink)' }}>
              Sin perks activos · Compra ventajas en la Tienda
            </span>
          )}
        </div>
      </div>

      <div ref={pageRef} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* VISTA 1: RULETA DE APUESTAS CASINO */}
        {juegoSeleccionado === 'ruleta' && (
          <section>
            <RuletaCasinoGame perfil={perfil} setPerfil={setPerfil} />
          </section>
        )}

        {/* VISTA 2: DUELO 21 (BLACKJACK PVP Y CRUPIER) */}
        {juegoSeleccionado === 'veintiuno' && (
          <section>
            <Duelo21PvP perfil={perfil} setPerfil={setPerfil} />
          </section>
        )}

        {/* VISTA 3: DUELO PVP DE DADOS */}
        {juegoSeleccionado === 'pvp' && (
          <section>
            <BatallaDadosPvP />
          </section>
        )}

        {/* VISTA 3: YOSHI RUNNER CON RETO INTEGRADO */}
        {juegoSeleccionado === 'yoshi' && (
          <>
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
                      : `Llega a ${OBJETIVO_RETO}m en tu partida para completarlo automáticamente.`}
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
          </>
        )}

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
              Hasta {LIMITE_BOLSA} puntos diarios en recreos para canjear en la tienda o subir en el ranking.
            </p>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <span className="apple-caption">Ganados hoy:</span>
              <strong style={{ fontSize: 13, color: '#D97706' }}>{monedasHoy} / {LIMITE_BOLSA} pts</strong>
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
                  width: `${Math.min(100, (monedasHoy / LIMITE_BOLSA) * 100)}%`,
                  backgroundColor: '#F59E0B',
                  borderRadius: 9999,
                  transition: 'width 0.3s ease'
                }}
              />
            </div>

            <div style={{ marginTop: 14, fontSize: 12, color: 'var(--color-secondary-ink)', lineHeight: 1.4 }}>
              Frutas y huevos Yoshi: <strong>+1 a +3 pts</strong> · Monedas doradas: <strong>+1 pt</strong> · Límite de recreo: <strong>{LIMITE_BOLSA} pts/día</strong>.
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
