// frontend/src/pages/PantallaJuegos.jsx
import { useState, useEffect, useRef } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
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
  Swords,
  ChevronRight,
  ChevronDown,
  LayoutGrid,
  ArrowLeft,
  HelpCircle,
  ShoppingBag,
  ExternalLink,
  Zap,
  Info
} from 'lucide-react'
import { animarEscalonado } from '../utils/animations'

// Configuración unificada de los juegos de recreo de SMR2
const CATALOGO_JUEGOS = [
  {
    id: 'ruleta',
    nombre: 'Ruleta Casino Europea',
    tag: 'Mesa Casino · Azar',
    categoria: 'casino',
    tipoTexto: 'Solo · 37 Números (0–36)',
    icono: Disc,
    color: '#FF3B30',
    colorBg: 'rgba(255, 59, 48, 0.12)',
    bordeColor: 'rgba(255, 59, 48, 0.28)',
    descripcion: 'Mesa clásica de 37 casillas. Apuesta fichas de 1 a 25 SE a color, par/impar, docenas o a número exacto con pagos reales de casino.',
    premioMaximo: 'Hasta x36 tu apuesta',
    detalles: [
      'Rojo / Negro, Par / Impar, Falta / Pasa: pago 1 a 1',
      'Docenas y Columnas: pago 2 a 1',
      'Pleno exacto (un solo número): pago 35 a 1 (+ tu ficha)',
      'Seguro de Ruleta 50%: amortigua la mitad de pérdidas si está activo en tu perfil'
    ],
    ctaTexto: 'Entrar a la Ruleta'
  },
  {
    id: 'veintiuno',
    nombre: 'Duelo 21 (Blackjack)',
    tag: 'Cartas · PvP o Crupier',
    categoria: 'pvp',
    tipoTexto: '1v1 Online o vs Crupier SMR2',
    icono: Crown,
    color: '#007AFF',
    colorBg: 'rgba(0, 122, 255, 0.12)',
    bordeColor: 'rgba(0, 122, 255, 0.28)',
    descripcion: 'Juego de cartas 21 Blackjack. Reta a cualquier compañero con código de sala en tiempo real o juega en solitario contra el Crupier de guardia.',
    premioMaximo: 'Bote del duelo en StevenEuros',
    detalles: [
      'Pide cartas o plántate buscando aproximarte a 21 sin pasarte',
      'Figuras (J, Q, K) valen 10, los Ases valen 1 u 11',
      'Modo PvP en vivo: comparte tu código de 4 caracteres',
      'Modo Crupier de Guardia: juega solo si no hay compañeros en línea'
    ],
    ctaTexto: 'Jugar al Duelo 21'
  },
  {
    id: 'pvp',
    nombre: 'Batalla de Dados 1v1',
    tag: 'Dados en Pizarra · PvP',
    categoria: 'pvp',
    tipoTexto: '1v1 en Directo con Código',
    icono: Dices,
    color: '#34C759',
    colorBg: 'rgba(52, 199, 89, 0.12)',
    bordeColor: 'rgba(52, 199, 89, 0.28)',
    descripcion: 'Duelos rápidos de dados físicos grabados. Fija la apuesta en StevenEuros, dale el código a tu compañero de pupitre y gana el bote.',
    premioMaximo: 'Bote íntegro de la apuesta',
    detalles: [
      'Crea una sala o únete a una existente con el código de 4 cifras',
      'Tiradas simultáneas: la suma más alta se lleva el bote en SE',
      'Dados Dorados VIP de la Tienda otorgan estilo y desempate a favor',
      'Sincronización instantánea en tiempo real'
    ],
    ctaTexto: 'Lanzar Dados 1v1'
  },
  {
    id: 'yoshi',
    nombre: 'Yoshi Runner Arcade',
    tag: 'Arcade · Reto Diario',
    categoria: 'arcade',
    tipoTexto: 'Carrera + Ruleta Yoshi',
    icono: Gamepad2,
    color: '#FF9500',
    colorBg: 'rgba(255, 149, 0, 0.12)',
    bordeColor: 'rgba(255, 149, 0, 0.28)',
    descripcion: 'Corre sin frenos, esquiva tuberías y Shy Guys, y recoge monedas. Desbloquea la Ruleta Yoshi al terminar para ganar premios en StevenEuros.',
    premioMaximo: '+15 SE reto + Ruleta de Monedas',
    detalles: [
      'Controles: [Espacio] o tap para saltar, [Abajo] o swipe para agacharte',
      'Frutas y Huevos suman +1 a +3 SE sin tope diario',
      'Monedas doradas suman fichas para la Ruleta Yoshi post-partida',
      'Supera los 250m de carrera para completar el Reto Diario y ganar +15 SE'
    ],
    ctaTexto: 'Correr en Yoshi Runner'
  }
]

export function PantallaJuegos() {
  const { perfil, setPerfil } = useAuth()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()

  const urlGame = searchParams.get('game')
  const [juegoSeleccionado, setJuegoSeleccionado] = useState(() => {
    if (urlGame && ['catalogo', 'ruleta', 'veintiuno', 'pvp', 'yoshi'].includes(urlGame)) {
      return urlGame
    }
    const guardado = localStorage.getItem('muudel_ultimo_juego')
    return guardado && ['catalogo', 'ruleta', 'veintiuno', 'pvp', 'yoshi'].includes(guardado)
      ? guardado
      : 'catalogo'
  })

  const [mostrarReglas, setMostrarReglas] = useState(false)
  const [rankingArcade, setRankingArcade] = useState([])
  const [cargandoRanking, setCargandoRanking] = useState(false)
  const [filtroCategoria, setFiltroCategoria] = useState('todos') // 'todos' | 'pvp' | 'casino' | 'arcade'
  const [monedasHoy, setMonedasHoy] = useState(() => {
    const fecha = new Date().toISOString().split('T')[0]
    return Number(localStorage.getItem(`muudel_arcade_monedas_${fecha}_${perfil?.id}`) || 0)
  })
  const [retoArcadeCompletado, setRetoArcadeCompletado] = useState(false)
  const pageRef = useRef(null)

  const fechaHoy = new Date().toISOString().split('T')[0]
  const OBJETIVO_RETO = 250
  const RECOMPENSA_RETO = 15

  // Cambiar juego y guardar preferencia
  const seleccionarJuego = (id) => {
    sound.playPop()
    setJuegoSeleccionado(id)
    localStorage.setItem('muudel_ultimo_juego', id)
    setSearchParams({ game: id }, { replace: true })
    setMostrarReglas(false)
  }

  // Sincronizar parámetro URL si cambia externamente
  useEffect(() => {
    if (urlGame && ['catalogo', 'ruleta', 'veintiuno', 'pvp', 'yoshi'].includes(urlGame) && urlGame !== juegoSeleccionado) {
      setJuegoSeleccionado(urlGame)
    }
  }, [urlGame])

  useEffect(() => {
    if (pageRef.current) {
      animarEscalonado(pageRef.current.children, { stagger: 0.04, duration: 0.3 })
    }
  }, [juegoSeleccionado])

  // Comprobar reto de arcade hoy y récords
  useEffect(() => {
    const key = `muudel_reto_arcade_${perfil?.id}_${fechaHoy}`
    if (localStorage.getItem(key)) {
      setRetoArcadeCompletado(true)
    }

    cargarRankingArcade()

    const desuscribirRecord = suscribirEvento('arcade_record', (data) => {
      if (data) cargarRankingArcade()
    })

    const handleSyncWindow = (e) => {
      const { puntos, userId } = e.detail || {}
      if (puntos != null && (!userId || userId === perfil?.id)) {
        setPerfil(prev => prev ? { ...prev, puntos_total: puntos } : prev)
      }
    }
    window.addEventListener('steveneuros_actualizados', handleSyncWindow)

    return () => {
      desuscribirRecord()
      window.removeEventListener('steveneuros_actualizados', handleSyncWindow)
    }
  }, [perfil?.id, fechaHoy])

  const cargarRankingArcade = async () => {
    setCargandoRanking(true)
    try {
      let res = await supabase
        .from('juegos_puntuaciones')
        .select('puntos, created_at, profiles(id, nombre, color_acento, digito_id)')
        .eq('juego', 'yoshi_runner')
        .order('puntos', { ascending: false })
        .limit(10)

      let filas = res.data

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

  const handleMonedasGanadas = (nuevoSaldoMonedas) => {
    if (typeof nuevoSaldoMonedas === 'number' && perfil) {
      setPerfil(prev => ({
        ...prev,
        monedas_ruleta_yoshi: nuevoSaldoMonedas
      }))
    }
  }

  const handleRetoSuperado = async (score) => {
    if (retoArcadeCompletado) return

    const key = `muudel_reto_arcade_${perfil?.id}_${fechaHoy}`
    localStorage.setItem(key, 'true')
    setRetoArcadeCompletado(true)

    const nuevosPuntos = (perfil?.puntos_total || 0) + RECOMPENSA_RETO
    const perfilActualizado = { ...perfil, puntos_total: nuevosPuntos }
    setPerfil(perfilActualizado)
    localStorage.setItem('racha_local_user', JSON.stringify(perfilActualizado))
    window.dispatchEvent(new CustomEvent('steveneuros_actualizados', { detail: { puntos: nuevosPuntos, userId: perfil.id } }))
    transmitirEvento('steveneuros_actualizados', { alumnoId: perfil.id, nuevosPuntos, userId: perfil.id })

    try {
      await supabase
        .from('profiles')
        .update({ puntos_total: nuevosPuntos })
        .eq('id', perfil.id)

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
        retoTitulo: 'Desafío Yoshi: Supera 250m en el Runner',
        puntos: RECOMPENSA_RETO,
        userId: perfil.id,
        nombre: perfil.nombre,
        username: perfil.username || '',
        color: perfil.color_acento,
        evidencia: `Auto-validado en recreo: Puntuación de ${score}m alcanzada`,
        estado: 'aprobado',
        fecha: new Date().toLocaleDateString('es-ES'),
        hora: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      })
      localStorage.setItem('muudel_entregas_retos', JSON.stringify(entregas))
    } catch (_) {}

    transmitirEvento('puntos_actualizados', { userId: perfil?.id, nuevosPuntos })
    transmitirEvento('reto_completado_notif', {
      nombre: perfil?.nombre,
      retoTitulo: 'Desafío Yoshi Runner 250m',
      puntos: RECOMPENSA_RETO
    })

    sound.playStamp()
    triggerConfetti()
  }

  // Perks activos de la tienda
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
        perks.push({ id: 'racha_x2', label: 'Racha x2', Icon: Flame, color: '#FF3B30' })
      }
      if (items.some(i => i.catalogoId === 'congelar_racha' && i.estado !== 'usado')) {
        perks.push({ id: 'escudo', label: 'Escudo Racha', Icon: Shield, color: '#0A84FF' })
      }
      return perks
    } catch (_) {
      return []
    }
  })()

  // Juego activo en detalle
  const juegoActualConfig = CATALOGO_JUEGOS.find(j => j.id === juegoSeleccionado)

  // Filtro de catálogo
  const juegosFiltrados = CATALOGO_JUEGOS.filter(j => {
    if (filtroCategoria === 'todos') return true
    return j.categoria === filtroCategoria
  })

  return (
    <main className="juegos-container">
      {/* 1. ENCABEZADO PRINCIPAL DEL SALÓN DE RECREO */}
      <header style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div
              style={{
                width: 46,
                height: 46,
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
              <Gamepad2 size={26} />
            </div>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <h1 className="apple-large-title" style={{ fontSize: 'clamp(20px, 3.8vw, 25px)', margin: 0, letterSpacing: -0.4 }}>
                  Salón de Recreo SMR2
                </h1>
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 800,
                    letterSpacing: 0.8,
                    padding: '2px 8px',
                    borderRadius: 4,
                    border: '1px solid rgba(217, 56, 41, 0.35)',
                    backgroundColor: 'rgba(217, 56, 41, 0.08)',
                    color: '#D93829',
                    fontFamily: 'monospace'
                  }}
                >
                  PAUSA · 18:10
                </span>
              </div>
              <p className="apple-subheadline" style={{ fontSize: 13, margin: '2px 0 0', color: 'var(--color-secondary-ink)' }}>
                Minijuegos de aula, ruleta clásica y duelos multijugador 1v1 con apuestas en StevenEuros.
              </p>
            </div>
          </div>

          {/* Acceso directo a la Tienda de Recompensas */}
          <button
            type="button"
            className="btn-secondary"
            onClick={() => navigate('/tienda')}
            style={{
              minHeight: 38,
              padding: '6px 12px',
              fontSize: 12,
              fontWeight: 700,
              gap: 6,
              borderRadius: 10
            }}
          >
            <ShoppingBag size={15} color="#FF9500" />
            <span>Tienda de Ventajas</span>
          </button>
        </div>

        {/* 2. BILLETERA INTEGRADA Y CHIPS DE ESTADO */}
        <div className="juegos-wallet-bar">
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
            {/* Saldo StevenEuros */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  backgroundColor: 'rgba(255, 149, 0, 0.15)',
                  color: '#D97706',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <Coins size={17} />
              </div>
              <div>
                <div style={{ fontSize: 11, color: 'var(--color-secondary-ink)', fontWeight: 600 }}>Saldo disponible</div>
                <div style={{ fontSize: 15, fontWeight: 800, color: '#D97706', fontFamily: 'monospace' }}>
                  {perfil?.puntos_total || 0} SE 💶
                </div>
              </div>
            </div>

            {/* Monedas Ruleta Yoshi */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingLeft: 12, borderLeft: '1px solid var(--color-separator)' }}>
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  backgroundColor: 'rgba(52, 199, 89, 0.15)',
                  color: '#2F9E44',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <Sparkles size={17} />
              </div>
              <div>
                <div style={{ fontSize: 11, color: 'var(--color-secondary-ink)', fontWeight: 600 }}>Fichas Yoshi</div>
                <div style={{ fontSize: 15, fontWeight: 800, color: '#2F9E44', fontFamily: 'monospace' }}>
                  {perfil?.monedas_ruleta_yoshi || 0} 🎰
                </div>
              </div>
            </div>
          </div>

          {/* Perks activos en el aula */}
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
                      border: `1px solid ${p.color}35`,
                      color: p.color,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4
                    }}
                  >
                    <IconComp size={12} />
                    <span>{p.label}</span>
                  </span>
                )
              })
            ) : (
              <span style={{ fontSize: 11, color: 'var(--color-secondary-ink)' }}>
                Sin ventajas activas · Consíguelas en la Tienda
              </span>
            )}
          </div>
        </div>

        {/* 3. BARRA DE NAVEGACIÓN RÁPIDA (SEGMENTED CONTROL APPLE) */}
        <nav
          aria-label="Selector de Juegos"
          className="juegos-nav-segmented"
        >
          <button
            type="button"
            className={`juegos-nav-btn ${juegoSeleccionado === 'catalogo' ? 'active' : ''}`}
            onClick={() => seleccionarJuego('catalogo')}
          >
            <LayoutGrid size={16} />
            <span>Catálogo Completo (4)</span>
          </button>

          <button
            type="button"
            className={`juegos-nav-btn ${juegoSeleccionado === 'ruleta' ? 'active' : ''}`}
            onClick={() => seleccionarJuego('ruleta')}
          >
            <Disc size={16} color="#FF3B30" />
            <span>Ruleta Europea</span>
          </button>

          <button
            type="button"
            className={`juegos-nav-btn ${juegoSeleccionado === 'veintiuno' ? 'active' : ''}`}
            onClick={() => seleccionarJuego('veintiuno')}
          >
            <Crown size={16} color="#007AFF" />
            <span>Duelo 21</span>
          </button>

          <button
            type="button"
            className={`juegos-nav-btn ${juegoSeleccionado === 'pvp' ? 'active' : ''}`}
            onClick={() => seleccionarJuego('pvp')}
          >
            <Dices size={16} color="#34C759" />
            <span>Dados 1v1</span>
          </button>

          <button
            type="button"
            className={`juegos-nav-btn ${juegoSeleccionado === 'yoshi' ? 'active' : ''}`}
            onClick={() => seleccionarJuego('yoshi')}
          >
            <Gamepad2 size={16} color="#FF9500" />
            <span>Yoshi Runner</span>
            {retoArcadeCompletado ? (
              <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: '#34C759' }} />
            ) : (
              <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: '#FF9500' }} />
            )}
          </button>
        </nav>
      </header>

      {/* 4. CONTENIDO PRINCIPAL EN FUNCIÓN DEL MODO */}
      <div ref={pageRef} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* ========================================================================= */}
        {/* VISTA A: CATÁLOGO GENERAL DE JUEGOS (LOBBY HUB) */}
        {/* ========================================================================= */}
        {juegoSeleccionado === 'catalogo' && (
          <>
            {/* Banner destacado: Reto de Recreo Yoshi Runner */}
            <section
              className="card"
              style={{
                padding: '16px 20px',
                backgroundColor: retoArcadeCompletado ? 'rgba(52, 199, 89, 0.08)' : 'rgba(0, 122, 255, 0.06)',
                border: retoArcadeCompletado ? '1px solid rgba(52, 199, 89, 0.28)' : '1px solid rgba(0, 122, 255, 0.24)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: 14
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 12,
                    backgroundColor: retoArcadeCompletado ? 'rgba(52, 199, 89, 0.2)' : 'rgba(0, 122, 255, 0.16)',
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
                        letterSpacing: 0.6,
                        color: retoArcadeCompletado ? 'var(--color-positive)' : 'var(--color-accent)'
                      }}
                    >
                      {retoArcadeCompletado ? '¡Reto Diario Superado!' : 'Desafío del Aula Hoy'}
                    </span>
                    <span className="apple-badge apple-badge-accent" style={{ fontSize: 11, fontWeight: 700 }}>
                      +{RECOMPENSA_RETO} SE 💶
                    </span>
                  </div>
                  <h3 className="apple-headline" style={{ fontSize: 16, margin: '2px 0 0' }}>
                    Alcanza {OBJETIVO_RETO}m en Yoshi Runner Arcade
                  </h3>
                  <p className="apple-caption" style={{ fontSize: 12, margin: '2px 0 0' }}>
                    {retoArcadeCompletado
                      ? 'Recompensa acreditada a tu cuenta de StevenEuros. ¡Sigue corriendo para batir el récord del aula!'
                      : `Supera la distancia en carrera para auto-validar la recompensa de +${RECOMPENSA_RETO} SE instantáneamente.`}
                  </p>
                </div>
              </div>

              <div>
                <button
                  type="button"
                  className={retoArcadeCompletado ? 'btn-secondary' : 'btn-primary'}
                  onClick={() => seleccionarJuego('yoshi')}
                  style={{ minHeight: 40, padding: '8px 16px', fontSize: 13, fontWeight: 700, gap: 6 }}
                >
                  <Gamepad2 size={16} />
                  <span>{retoArcadeCompletado ? 'Volver a Jugar' : 'Iniciar Desafío'}</span>
                </button>
              </div>
            </section>

            {/* Filtros de Categoría */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-secondary-ink)', marginRight: 4 }}>
                  Filtrar:
                </span>
                <button
                  type="button"
                  onClick={() => setFiltroCategoria('todos')}
                  style={{
                    padding: '4px 10px',
                    borderRadius: 8,
                    fontSize: 12,
                    fontWeight: 700,
                    border: '1px solid',
                    borderColor: filtroCategoria === 'todos' ? 'var(--color-accent)' : 'var(--color-separator)',
                    backgroundColor: filtroCategoria === 'todos' ? 'var(--color-accent)' : 'var(--color-surface)',
                    color: filtroCategoria === 'todos' ? '#FFF' : 'var(--color-secondary-ink)',
                    cursor: 'pointer'
                  }}
                >
                  Todos ({CATALOGO_JUEGOS.length})
                </button>
                <button
                  type="button"
                  onClick={() => setFiltroCategoria('pvp')}
                  style={{
                    padding: '4px 10px',
                    borderRadius: 8,
                    fontSize: 12,
                    fontWeight: 700,
                    border: '1px solid',
                    borderColor: filtroCategoria === 'pvp' ? 'var(--color-accent)' : 'var(--color-separator)',
                    backgroundColor: filtroCategoria === 'pvp' ? 'var(--color-accent)' : 'var(--color-surface)',
                    color: filtroCategoria === 'pvp' ? '#FFF' : 'var(--color-secondary-ink)',
                    cursor: 'pointer'
                  }}
                >
                  Multijugador 1v1 (2)
                </button>
                <button
                  type="button"
                  onClick={() => setFiltroCategoria('casino')}
                  style={{
                    padding: '4px 10px',
                    borderRadius: 8,
                    fontSize: 12,
                    fontWeight: 700,
                    border: '1px solid',
                    borderColor: filtroCategoria === 'casino' ? 'var(--color-accent)' : 'var(--color-separator)',
                    backgroundColor: filtroCategoria === 'casino' ? 'var(--color-accent)' : 'var(--color-surface)',
                    color: filtroCategoria === 'casino' ? '#FFF' : 'var(--color-secondary-ink)',
                    cursor: 'pointer'
                  }}
                >
                  Casino (1)
                </button>
                <button
                  type="button"
                  onClick={() => setFiltroCategoria('arcade')}
                  style={{
                    padding: '4px 10px',
                    borderRadius: 8,
                    fontSize: 12,
                    fontWeight: 700,
                    border: '1px solid',
                    borderColor: filtroCategoria === 'arcade' ? 'var(--color-accent)' : 'var(--color-separator)',
                    backgroundColor: filtroCategoria === 'arcade' ? 'var(--color-accent)' : 'var(--color-surface)',
                    color: filtroCategoria === 'arcade' ? '#FFF' : 'var(--color-secondary-ink)',
                    cursor: 'pointer'
                  }}
                >
                  Arcade (1)
                </button>
              </div>

              <span style={{ fontSize: 12, color: 'var(--color-secondary-ink)' }}>
                Toca cualquier juego para entrar a su mesa
              </span>
            </div>

            {/* Parrilla de Tarjetas Apple (Grid Hub) */}
            <div className="juegos-grid-hub">
              {juegosFiltrados.map((juego) => {
                const IconComp = juego.icono
                return (
                  <article
                    key={juego.id}
                    className="juegos-card-item"
                    onClick={() => seleccionarJuego(juego.id)}
                  >
                    <div>
                      {/* Top de la tarjeta: Icono y Tags */}
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10, marginBottom: 12 }}>
                        <div
                          style={{
                            width: 44,
                            height: 44,
                            borderRadius: 12,
                            backgroundColor: juego.colorBg,
                            border: `1px solid ${juego.bordeColor}`,
                            color: juego.color,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0
                          }}
                        >
                          <IconComp size={24} />
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                          <span
                            style={{
                              fontSize: 10,
                              fontWeight: 800,
                              textTransform: 'uppercase',
                              letterSpacing: 0.5,
                              padding: '2px 7px',
                              borderRadius: 4,
                              backgroundColor: juego.colorBg,
                              color: juego.color,
                              border: `1px solid ${juego.bordeColor}`
                            }}
                          >
                            {juego.tag}
                          </span>
                          <span style={{ fontSize: 11, color: 'var(--color-secondary-ink)', fontWeight: 600 }}>
                            {juego.tipoTexto}
                          </span>
                        </div>
                      </div>

                      {/* Título y descripción */}
                      <h2 className="apple-headline" style={{ fontSize: 18, margin: '0 0 6px', letterSpacing: -0.2 }}>
                        {juego.nombre}
                      </h2>
                      <p className="apple-subheadline" style={{ fontSize: 13, lineHeight: 1.45, color: 'var(--color-secondary-ink)', margin: 0 }}>
                        {juego.descripcion}
                      </p>
                    </div>

                    <div>
                      {/* Detalle de premio */}
                      <div
                        style={{
                          padding: '8px 12px',
                          borderRadius: 8,
                          backgroundColor: 'var(--color-fill-tertiary)',
                          border: '1px solid var(--color-separator)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          marginBottom: 12
                        }}
                      >
                        <span style={{ fontSize: 11, color: 'var(--color-secondary-ink)', fontWeight: 600 }}>Recompensa:</span>
                        <strong style={{ fontSize: 12, color: 'var(--color-ink)', fontWeight: 800 }}>
                          {juego.premioMaximo}
                        </strong>
                      </div>

                      {/* Botón de Entrada */}
                      <button
                        type="button"
                        className="btn-primary"
                        style={{
                          width: '100%',
                          minHeight: 44,
                          fontSize: 13,
                          fontWeight: 700,
                          backgroundColor: juego.color,
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 6
                        }}
                      >
                        <IconComp size={16} />
                        <span>{juego.ctaTexto}</span>
                        <ChevronRight size={16} />
                      </button>
                    </div>
                  </article>
                )
              })}
            </div>

            {/* Panel de Estadísticas y Récords Globales */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 14 }}>
              {/* Monedero de recreos acumulado */}
              <section className="card">
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                  <Coins size={18} color="#D97706" />
                  <h3 className="apple-headline" style={{ fontSize: 15, margin: 0 }}>
                    Monedero de Recreo SMR2
                  </h3>
                </div>
                <p className="apple-caption" style={{ margin: '0 0 12px' }}>
                  Sin límite diario en juegos de habilidad. Consigue StevenEuros en carreras o apuesta en las mesas para aumentar tu saldo.
                </p>

                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span className="apple-caption">Ganados hoy en Arcade:</span>
                  <strong style={{ fontSize: 13, color: '#D97706' }}>{monedasHoy} SE (Ilimitado)</strong>
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
                      width: `${Math.min(100, Math.max(10, monedasHoy * 2))}%`,
                      backgroundColor: '#F59E0B',
                      borderRadius: 9999,
                      transition: 'width 0.3s ease'
                    }}
                  />
                </div>
              </section>

              {/* Récords destacados del aula */}
              <section className="card" style={{ padding: 0, overflow: 'hidden' }}>
                <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--color-separator)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Trophy size={16} color="#FF9500" />
                    <h3 className="apple-headline" style={{ fontSize: 15, margin: 0 }}>
                      Mejores Marcas del Aula
                    </h3>
                  </div>
                  <span className="apple-caption" style={{ fontSize: 11 }}>
                    Yoshi Runner SMR2
                  </span>
                </div>

                {cargandoRanking ? (
                  <div style={{ padding: '20px 16px', textAlign: 'center', color: 'var(--color-secondary-ink)', fontSize: 13 }}>
                    Cargando marcas del aula...
                  </div>
                ) : rankingArcade.length === 0 ? (
                  <div style={{ padding: '20px 16px', textAlign: 'center', color: 'var(--color-secondary-ink)', fontSize: 13 }}>
                    <Clock size={22} style={{ margin: '0 auto 6px', opacity: 0.6 }} />
                    <p style={{ margin: 0, fontWeight: 600 }}>Aún no hay récords registrados hoy.</p>
                  </div>
                ) : (
                  rankingArcade.slice(0, 3).map((jugador, i) => (
                    <div
                      key={jugador.id || i}
                      style={{
                        padding: '10px 16px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        borderBottom: i < 2 ? '0.5px solid var(--color-separator)' : 'none'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span
                          style={{
                            width: 18,
                            fontWeight: 800,
                            fontSize: 12,
                            color: i === 0 ? '#D4AF37' : i === 1 ? '#8E8E93' : '#CD7F32'
                          }}
                        >
                          #{i + 1}
                        </span>
                        <InsigniaIniciales nombre={jugador.nombre} color={jugador.color} size={26} />
                        <span style={{ fontWeight: 600, fontSize: 13 }}>{jugador.nombre}</span>
                      </div>
                      <span style={{ fontWeight: 800, fontSize: 13, color: 'var(--color-accent)' }}>
                        {jugador.puntos}m
                      </span>
                    </div>
                  ))
                )}
              </section>
            </div>
          </>
        )}

        {/* ========================================================================= */}
        {/* VISTAS B: ESCENARIO ACTIVO DE CADA JUEGO */}
        {/* ========================================================================= */}
        {juegoSeleccionado !== 'catalogo' && juegoActualConfig && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {/* Cabecera del Escenario de Juego */}
            <div className="juegos-stage-topbar" style={{ borderRadius: 14, border: '1px solid var(--color-separator)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => seleccionarJuego('catalogo')}
                  style={{
                    minHeight: 36,
                    padding: '6px 12px',
                    fontSize: 12,
                    fontWeight: 700,
                    borderRadius: 8,
                    gap: 6
                  }}
                  title="Volver a la selección de todos los juegos"
                >
                  <ArrowLeft size={14} />
                  <span>Ver Todos</span>
                </button>

                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 8,
                      backgroundColor: juegoActualConfig.colorBg,
                      color: juegoActualConfig.color,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    {(() => {
                      const IconComp = juegoActualConfig.icono
                      return <IconComp size={18} />
                    })()}
                  </div>
                  <div>
                    <h2 style={{ fontSize: 15, fontWeight: 800, margin: 0, letterSpacing: -0.2 }}>
                      {juegoActualConfig.nombre}
                    </h2>
                    <span style={{ fontSize: 11, color: 'var(--color-secondary-ink)' }}>
                      {juegoActualConfig.tag}
                    </span>
                  </div>
                </div>
              </div>

              {/* Botón de Ayuda / Reglas colapsables */}
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setMostrarReglas(prev => !prev)}
                style={{
                  minHeight: 36,
                  padding: '6px 12px',
                  fontSize: 12,
                  fontWeight: 600,
                  borderRadius: 8,
                  gap: 6
                }}
              >
                <HelpCircle size={15} />
                <span>{mostrarReglas ? 'Ocultar Reglas' : 'Reglas & Pagos'}</span>
                {mostrarReglas ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              </button>
            </div>

            {/* Panel colapsable de Reglas y Ayuda de la mesa activa */}
            {mostrarReglas && (
              <section className="card" style={{ padding: '16px 20px', backgroundColor: 'var(--color-fill-secondary)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <Info size={16} color="var(--color-accent)" />
                  <h4 className="apple-headline" style={{ fontSize: 14, margin: 0 }}>
                    Reglas y funcionamiento: {juegoActualConfig.nombre}
                  </h4>
                </div>
                <p className="apple-subheadline" style={{ fontSize: 13, margin: '0 0 10px', color: 'var(--color-secondary-ink)' }}>
                  {juegoActualConfig.descripcion}
                </p>
                <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12.5, lineHeight: 1.6, color: 'var(--color-ink)' }}>
                  {juegoActualConfig.detalles.map((d, idx) => (
                    <li key={idx}>{d}</li>
                  ))}
                </ul>
              </section>
            )}

            {/* ─── COMPONENTE ESPECÍFICO DEL JUEGO SELECCIONADO ─── */}
            {juegoSeleccionado === 'ruleta' && (
              <>
                <section>
                  <RuletaCasinoGame perfil={perfil} setPerfil={setPerfil} />
                </section>

                {/* Panel contextual de Ruleta: Tabla de Pagos & Perks */}
                <section className="card" style={{ padding: '16px 20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, marginBottom: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Disc size={18} color="#FF3B30" />
                      <h3 className="apple-headline" style={{ fontSize: 15, margin: 0 }}>
                        Tabla de Pagos de la Ruleta Europea
                      </h3>
                    </div>
                    <span className="apple-caption" style={{ fontSize: 11 }}>
                      Límite de mesa: 25 SE (ampliable en Tienda)
                    </span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10, fontSize: 12.5 }}>
                    <div style={{ padding: 10, borderRadius: 8, backgroundColor: 'var(--color-fill-secondary)' }}>
                      <strong>🔴 / ⚫ Rojo o Negro:</strong> Paga 1:1
                    </div>
                    <div style={{ padding: 10, borderRadius: 8, backgroundColor: 'var(--color-fill-secondary)' }}>
                      <strong>⚖️ Par o Impar:</strong> Paga 1:1
                    </div>
                    <div style={{ padding: 10, borderRadius: 8, backgroundColor: 'var(--color-fill-secondary)' }}>
                      <strong>📊 Docenas (1ª, 2ª, 3ª):</strong> Paga 2:1
                    </div>
                    <div style={{ padding: 10, borderRadius: 8, backgroundColor: 'var(--color-fill-secondary)' }}>
                      <strong>🎯 Pleno (Número Exacto 0–36):</strong> Paga 35:1
                    </div>
                  </div>
                </section>
              </>
            )}

            {juegoSeleccionado === 'veintiuno' && (
              <>
                <section>
                  <Duelo21PvP perfil={perfil} setPerfil={setPerfil} />
                </section>

                {/* Panel contextual de Duelo 21: Instrucciones de sala */}
                <section className="card" style={{ padding: '16px 20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <Crown size={18} color="#007AFF" />
                    <h3 className="apple-headline" style={{ fontSize: 15, margin: 0 }}>
                      Guía del Duelo 21 SMR2
                    </h3>
                  </div>
                  <p className="apple-caption" style={{ margin: '0 0 10px', lineHeight: 1.5 }}>
                    Puedes jugar en solitario contra el <strong>Crupier de Guardia SMR2</strong> o crear una sala multijugador PvP para retar a tu compañero de pupitre.
                  </p>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 10, fontSize: 12.5 }}>
                    <div style={{ padding: 10, borderRadius: 8, backgroundColor: 'var(--color-fill-secondary)' }}>
                      <strong>1. Crear Sala PvP:</strong> Define la apuesta en SE y copia el código de 4 caracteres.
                    </div>
                    <div style={{ padding: 10, borderRadius: 8, backgroundColor: 'var(--color-fill-secondary)' }}>
                      <strong>2. Unirse:</strong> Tu compañero introduce el código y la partida comienza en tiempo real.
                    </div>
                  </div>
                </section>
              </>
            )}

            {juegoSeleccionado === 'pvp' && (
              <>
                <section>
                  <BatallaDadosPvP />
                </section>

                {/* Panel contextual de Dados PvP: Reglas de tirada */}
                <section className="card" style={{ padding: '16px 20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <Dices size={18} color="#34C759" />
                    <h3 className="apple-headline" style={{ fontSize: 15, margin: 0 }}>
                      Reglas de la Batalla de Dados en Pizarra
                    </h3>
                  </div>
                  <p className="apple-caption" style={{ margin: '0 0 10px', lineHeight: 1.5 }}>
                    Duelos de dados físicos simultáneos entre dos alumnos de clase. La suma total más alta se lleva el bote apostado en StevenEuros.
                  </p>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 10, fontSize: 12.5 }}>
                    <div style={{ padding: 10, borderRadius: 8, backgroundColor: 'var(--color-fill-secondary)' }}>
                      <strong>🎲 Dados Físicos Grabados:</strong> Se tiran dos dados por jugador con física de giro.
                    </div>
                    <div style={{ padding: 10, borderRadius: 8, backgroundColor: 'var(--color-fill-secondary)' }}>
                      <strong>👑 Dados Dorados VIP:</strong> Obtenibles en la Tienda, otorgan distinción visual y desempate a favor.
                    </div>
                  </div>
                </section>
              </>
            )}

            {juegoSeleccionado === 'yoshi' && (
              <>
                {/* RETO DEL DÍA INTEGRADO EN YOSHI RUNNER */}
                <section
                  className="card"
                  style={{
                    padding: '16px 20px',
                    backgroundColor: retoArcadeCompletado ? 'rgba(52, 199, 89, 0.08)' : 'rgba(0, 122, 255, 0.06)',
                    border: retoArcadeCompletado ? '1px solid rgba(52, 199, 89, 0.28)' : '1px solid rgba(0, 122, 255, 0.24)',
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
                        width: 42,
                        height: 42,
                        borderRadius: 12,
                        backgroundColor: retoArcadeCompletado ? 'rgba(52, 199, 89, 0.2)' : 'rgba(0, 122, 255, 0.16)',
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
                          {retoArcadeCompletado ? '¡Reto Completado!' : 'Desafío Yoshi Diario'}
                        </span>
                        <span className="apple-badge apple-badge-accent" style={{ fontSize: 11, fontWeight: 700 }}>
                          +{RECOMPENSA_RETO} SE 💶
                        </span>
                      </div>
                      <h3 className="apple-headline" style={{ fontSize: 15, margin: '2px 0 0' }}>
                        Supera {OBJETIVO_RETO}m de distancia en carrera
                      </h3>
                      <p className="apple-caption" style={{ fontSize: 12, margin: '2px 0 0' }}>
                        {retoArcadeCompletado
                          ? 'Reto superado con éxito. StevenEuros acreditados.'
                          : `Llega a ${OBJETIVO_RETO}m para ganar +${RECOMPENSA_RETO} SE de bonificación directa.`}
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

                {/* JUEGO ARCADE */}
                <section>
                  <YoshiRunnerGame
                    perfil={perfil}
                    onMonedasGanadas={handleMonedasGanadas}
                    onRetoCompletado={handleRetoSuperado}
                    retoActivo={{ objetivo_puntuacion: OBJETIVO_RETO }}
                  />
                </section>

                {/* Panel contextual de Yoshi: Estadísticas y Ranking */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 14 }}>
                  <section className="card">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                      <Coins size={18} color="#FBBF24" />
                      <h3 className="apple-headline" style={{ fontSize: 15, margin: 0 }}>
                        Monedas Yoshi (Para Ruleta)
                      </h3>
                    </div>
                    <p className="apple-caption" style={{ margin: '0 0 10px' }}>
                      Las monedas y frutas recogidas en carrera se acumulan exclusivamente como Monedas Yoshi (🪙) para girar la Ruleta Yoshi. ¡No otorgan StevenEuros directos!
                    </p>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                      <span className="apple-caption">Saldo para Ruleta:</span>
                      <strong style={{ fontSize: 13, color: '#FBBF24' }}>{perfil?.monedas_ruleta_yoshi || 0} 🪙</strong>
                    </div>
                  </section>

                  <section className="card" style={{ padding: 0, overflow: 'hidden' }}>
                    <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--color-separator)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Trophy size={16} color="#FF9500" />
                        <h3 className="apple-headline" style={{ fontSize: 15, margin: 0 }}>
                          Récords Yoshi Runner
                        </h3>
                      </div>
                      <span className="apple-caption" style={{ fontSize: 11 }}>Aula SMR2</span>
                    </div>

                    {cargandoRanking ? (
                      <div style={{ padding: '16px', textAlign: 'center', color: 'var(--color-secondary-ink)', fontSize: 13 }}>
                        Cargando récords...
                      </div>
                    ) : rankingArcade.length === 0 ? (
                      <div style={{ padding: '16px', textAlign: 'center', color: 'var(--color-secondary-ink)', fontSize: 13 }}>
                        Sé el primero en correr y establecer una marca hoy.
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
                                fontSize: 12,
                                color: i === 0 ? '#D4AF37' : i === 1 ? '#8E8E93' : i === 2 ? '#CD7F32' : 'var(--color-tertiary-ink)'
                              }}
                            >
                              #{i + 1}
                            </span>
                            <InsigniaIniciales nombre={jugador.nombre} color={jugador.color} size={28} />
                            <span style={{ fontWeight: 600, fontSize: 13 }}>{jugador.nombre}</span>
                          </div>
                          <span style={{ fontWeight: 800, fontSize: 13, color: 'var(--color-accent)' }}>
                            {jugador.puntos}m
                          </span>
                        </div>
                      ))
                    )}
                  </section>
                </div>
              </>
            )}

            {/* Selector rápido inferior para cambiar a otro juego sin volver arriba */}
            <div
              style={{
                marginTop: 8,
                padding: '14px 16px',
                borderRadius: 14,
                backgroundColor: 'var(--color-surface)',
                border: '1px solid var(--color-separator)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: 10
              }}
            >
              <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-secondary-ink)' }}>
                Cambiar a otro juego de recreo:
              </span>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {CATALOGO_JUEGOS.filter(j => j.id !== juegoSeleccionado).map(j => {
                  const IconComp = j.icono
                  return (
                    <button
                      key={j.id}
                      type="button"
                      className="btn-secondary"
                      onClick={() => seleccionarJuego(j.id)}
                      style={{
                        minHeight: 36,
                        padding: '6px 12px',
                        fontSize: 12,
                        fontWeight: 600,
                        gap: 6,
                        borderRadius: 8
                      }}
                    >
                      <IconComp size={14} color={j.color} />
                      <span>{j.nombre.split(' ')[0]}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
