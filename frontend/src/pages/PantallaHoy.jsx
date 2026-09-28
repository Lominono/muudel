// frontend/src/pages/PantallaHoy.jsx (Feed Principal del Aula)
import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../App'
import { CheckinCard } from '../components/CheckinCard'
import { RachaBar } from '../components/RachaBar'
import { RetoDelDia } from '../components/RetoDelDia'
import { TopRanking } from '../components/TopRanking'
import { AvatarUsuario } from '../components/AvatarUsuario'
import { ContadorCierreLista } from '../components/ContadorCierreLista'
import { MetaAsistenciaAula } from '../components/MetaAsistenciaAula'
import { PreguntaFlashDia } from '../components/PreguntaFlashDia'
import { TiendaRecompensas } from '../components/TiendaRecompensas'
import { ModalHorario } from '../components/ModalHorario'
import { getClaseActual } from '../utils/horarioData'
import { supabase, NIVELES } from '../utils/supabase'
import { sound, triggerConfetti } from '../utils/haptics'
import {
  Award,
  TrendingUp,
  Megaphone,
  ShoppingBag,
  Flame,
  Zap,
  Calendar,
  Hourglass,
  Clock,
  Shield,
  Gamepad2,
  Heart,
  MessageSquare,
  Sparkles,
  Share2,
  Plus,
  X,
  Send,
  CheckCircle2,
  Check,
  FileCode,
  Layers,
  Crown
} from 'lucide-react'
import { animarEscalonado } from '../utils/animations'
import { transmitirEvento, suscribirEvento } from '../utils/realtimeHub'
import { formatearTiempoRestante } from '../components/TiendaRecompensas'

// Semilla inicial de respuestas auténticas de SMR2
const RESPUESTAS_SEMILLA = [
  {
    id: 'resp-seed-1',
    userId: 'user-seed-1',
    nombre: 'Marc Rovira',
    username: 'mrovira',
    color: '#007AFF',
    retoTitulo: 'Topología VLAN & Subredes 15:30',
    hora: '16:05',
    fecha: 'Hoy',
    evidencia: `Switch(config)# vlan 20
Switch(config-vlan)# name VENTAS_SMR2
Switch(config)# interface range fa0/1 - 5
Switch(config-if-range)# switchport mode access
Switch(config-if-range)# switchport access vlan 20`,
    estado: 'aprobado',
    feedback: '¡Impecable! Rango de puertos configurado según la norma.',
    likes: 4
  },
  {
    id: 'resp-seed-2',
    userId: 'user-seed-2',
    nombre: 'Laura Sanz',
    username: 'lsanz',
    color: '#34C759',
    retoTitulo: 'Desafío Yoshi: Supera 100m en el Recreo',
    hora: '17:22',
    fecha: 'Hoy',
    evidencia: 'Récord de 142m conseguido esquivando las bombas Bob-omb y tuberías piraña.',
    estado: 'aprobado',
    feedback: 'Verificado por el motor del juego (+30 pts acreditados)',
    likes: 7
  },
  {
    id: 'resp-seed-3',
    userId: 'user-seed-3',
    nombre: 'Carlos Díaz',
    username: 'cdiaz',
    color: '#FF9500',
    retoTitulo: 'Topología VLAN & Subredes 15:30',
    hora: '18:35',
    fecha: 'Hoy',
    evidencia: 'He subido la captura de Packet Tracer con el ping exitoso entre los hosts en la misma VLAN.',
    estado: 'pendiente',
    feedback: null,
    likes: 2
  }
]

// Semilla inicial de posts de la clase
const POSTS_SEMILLA = [
  {
    id: 'post-seed-1',
    userId: 'profe-1',
    autor: 'lominoño',
    username: 'profe',
    color: '#FF3B30',
    rol: 'moderador',
    categoria: 'Aviso',
    titulo: '📌 Repaso clave para el control de enrutamiento estático',
    contenido: 'Recordad que la sintaxis en Cisco es `ip route <red_destino> <máscara> <ip_siguiente_salto>`. No olvidéis levantar las interfaces antes con `no shutdown`.',
    fecha: 'Hoy 15:45',
    likes: 12
  },
  {
    id: 'post-seed-2',
    userId: 'user-seed-4',
    autor: 'Adrián Gómez',
    username: 'agomez',
    color: '#007AFF',
    rol: 'alumno',
    categoria: 'Truco',
    titulo: '💡 Chuleta rápida para calcular subredes /24 a /30',
    contenido: 'Para calcular saltos de IP rápido: /25 salta de 128 en 128, /26 de 64 en 64, /27 de 32 en 32, /28 de 16 en 16 y /30 de 4 en 4. ¡Ahorra un montón de tiempo en las prácticas!',
    fecha: 'Hoy 16:30',
    likes: 9
  },
  {
    id: 'post-seed-3',
    userId: 'user-seed-5',
    autor: 'Elena Martín',
    username: 'emartin',
    color: '#AF52DE',
    rol: 'alumno',
    categoria: 'Linux',
    titulo: '🐧 Comando útil para ver puertos abiertos en Debian',
    contenido: 'Usad `ss -tulpn` en vez del viejo `netstat`. Muestra los procesos exactos con PID escuchando en cada puerto TCP/UDP.',
    fecha: 'Hoy 17:10',
    likes: 6
  }
]

export function PantallaHoy() {
  const { perfil, setPerfil } = useAuth()
  const navigate = useNavigate()
  const [ranking, setRanking] = useState([])
  const [mostrarTienda, setMostrarTienda] = useState(false)
  const [mostrarModalHorario, setMostrarModalHorario] = useState(false)
  const [avisoHoy, setAvisoHoy] = useState(() => localStorage.getItem('racha_aviso_hoy') || '')
  const [relojTick, setRelojTick] = useState(0)

  // Filtro del feed: 'todos' | 'respuestas' | 'posts'
  const [filtroFeed, setFiltroFeed] = useState('todos')

  // Respuestas de alumnos a retos
  const [respuestasFeed, setRespuestasFeed] = useState(() => {
    try {
      const guardadas = JSON.parse(localStorage.getItem('muudel_entregas_retos') || '[]')
      if (guardadas && guardadas.length > 0) {
        return [...guardadas, ...RESPUESTAS_SEMILLA.filter(s => !guardadas.some(g => g.id === s.id))]
      }
    } catch (e) {}
    return RESPUESTAS_SEMILLA
  })

  // Posts y tips de la comunidad
  const [postsFeed, setPostsFeed] = useState(() => {
    try {
      const guardados = JSON.parse(localStorage.getItem('muudel_feed_posts') || '[]')
      if (guardados && guardados.length > 0) {
        return [...guardados, ...POSTS_SEMILLA.filter(s => !guardados.some(g => g.id === s.id))]
      }
    } catch (e) {}
    return POSTS_SEMILLA
  })

  // Modal para crear nuevo post
  const [mostrarModalCrearPost, setMostrarModalCrearPost] = useState(false)
  const [nuevoPostTitulo, setNuevoPostTitulo] = useState('')
  const [nuevoPostContenido, setNuevoPostContenido] = useState('')
  const [nuevoPostCategoria, setNuevoPostCategoria] = useState('Truco')
  const [publicandoPost, setPublicandoPost] = useState(false)

  // Likes dados localmente por el usuario
  const [likesDados, setLikesDados] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(`muudel_feed_likes_${perfil?.id}`) || '{}')
    } catch (e) {
      return {}
    }
  })

  // Estado de asistencia 15:30
  const [solicitudPendiente, setSolicitudPendiente] = useState(null)
  const [asistenciaConfirmada, setAsistenciaConfirmada] = useState(null)
  const [totalAlumnosClase, setTotalAlumnosClase] = useState(20)
  const [asistenciasHoyCount, setAsistenciasHoyCount] = useState(0)

  const contentRef = useRef(null)
  const fechaHoy = new Date().toISOString().split('T')[0]
  const claseActual = getClaseActual()

  // 1. Tick cada segundo
  useEffect(() => {
    const timer = setInterval(() => {
      setRelojTick(prev => prev + 1)
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  // 2. Cargar datos iniciales y suscripciones en tiempo real
  useEffect(() => {
    // Cargar aviso diario
    const avisoGuardado = localStorage.getItem('racha_aviso_hoy') || ''
    setAvisoHoy(avisoGuardado)

    // Solicitud pendiente de hoy
    try {
      const solicitudes = JSON.parse(localStorage.getItem('muudel_solicitudes_' + fechaHoy) || '[]')
      const miSol = solicitudes.find(s => s.userId === perfil?.id)
      if (miSol) setSolicitudPendiente(miSol)
    } catch (e) {}

    // Asistencia confirmada
    try {
      const localCheckins = JSON.parse(localStorage.getItem('racha_checkins_' + fechaHoy) || '{}')
      if (localCheckins[perfil?.id]) {
        setAsistenciaConfirmada(localCheckins[perfil?.id])
      }
    } catch (e) {}

    cargarDatosClase()

    // Suscripción a nuevas entregas de retos en tiempo real
    const desuscribirEntregas = suscribirEvento('nueva_entrega_reto', (entrega) => {
      if (entrega) {
        setRespuestasFeed(prev => {
          const filtradas = prev.filter(r => r.id !== entrega.id)
          const actualizadas = [entrega, ...filtradas]
          try {
            localStorage.setItem('muudel_entregas_retos', JSON.stringify(actualizadas))
          } catch (e) {}
          return actualizadas
        })
      }
    })

    // Suscripción a nuevos posts de clase en tiempo real
    const desuscribirPosts = suscribirEvento('nuevo_feed_post', (post) => {
      if (post) {
        setPostsFeed(prev => {
          const filtrados = prev.filter(p => p.id !== post.id)
          const actualizados = [post, ...filtrados]
          try {
            localStorage.setItem('muudel_feed_posts', JSON.stringify(actualizados))
          } catch (e) {}
          return actualizados
        })
      }
    })

    // Suscripción a likes de posts en tiempo real
    const desuscribirLikesPost = suscribirEvento('like_feed_item', ({ itemId, nuevoCount }) => {
      setPostsFeed(prev => prev.map(p => p.id === itemId ? { ...p, likes: nuevoCount } : p))
      setRespuestasFeed(prev => prev.map(r => r.id === itemId ? { ...r, likes: nuevoCount } : r))
    })

    const desuscribirConfirmacion = suscribirEvento('asistencia_confirmada', (payload) => {
      if (!payload) return
      if (payload.userId === perfil?.id) {
        setSolicitudPendiente(null)
        setAsistenciaConfirmada(payload)
        sound.playStamp()
        triggerConfetti()
      }
      setAsistenciasHoyCount(prev => prev + 1)
    })

    const desuscribirMasiva = suscribirEvento('asistencia_masiva', () => {
      setSolicitudPendiente(null)
      setAsistenciaConfirmada({
        fecha: fechaHoy,
        hora: '15:30',
        es_tarde: false,
        puntos_ganados: 10
      })
      setAsistenciasHoyCount(prev => Math.max(prev, totalAlumnosClase))
      sound.playStamp()
      triggerConfetti()
    })

    const desuscribirAviso = suscribirEvento('aviso_admin', ({ texto }) => {
      setAvisoHoy(texto || '')
      try { localStorage.setItem('racha_aviso_hoy', texto || '') } catch (e) {}
    })

    const desuscribirPuntos = suscribirEvento('puntos_actualizados', () => {
      cargarDatosClase()
    })

    return () => {
      desuscribirEntregas()
      desuscribirPosts()
      desuscribirLikesPost()
      desuscribirConfirmacion()
      desuscribirMasiva()
      desuscribirAviso()
      desuscribirPuntos()
    }
  }, [perfil?.id, fechaHoy, totalAlumnosClase])

  useEffect(() => {
    if (contentRef.current) {
      animarEscalonado(contentRef.current.children, { stagger: 0.05, duration: 0.35 })
    }
  }, [])

  const cargarDatosClase = async () => {
    try {
      const { data: alumnosData } = await supabase
        .from('profiles')
        .select('*')
        .eq('rol', 'alumno')
        .order('puntos_total', { ascending: false })

      if (alumnosData && alumnosData.length > 0) {
        setTotalAlumnosClase(alumnosData.length)
        setRanking(alumnosData.slice(0, 5))
      } else if (perfil && perfil.rol === 'alumno') {
        setRanking([perfil])
      }

      const { data: chkData } = await supabase
        .from('checkins')
        .select('user_id')
        .eq('fecha', fechaHoy)

      const confirmadosRemotos = chkData ? chkData.length : 0
      const localCheckins = JSON.parse(localStorage.getItem('racha_checkins_' + fechaHoy) || '{}')
      const totalHoy = Math.max(confirmadosRemotos, Object.keys(localCheckins).length)
      setAsistenciasHoyCount(totalHoy)

      if (perfil) {
        const { data: miChk } = await supabase
          .from('checkins')
          .select('*')
          .eq('user_id', perfil.id)
          .eq('fecha', fechaHoy)
          .maybeSingle()

        if (miChk) {
          setAsistenciaConfirmada(miChk)
          setSolicitudPendiente(null)
        }
      }
    } catch (e) {}
  }

  // Enviar solicitud de asistencia a las 15:30
  const handleMandarSolicitud = async (esTarde) => {
    if (!perfil) return
    const horaActual = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

    const nuevaSolicitud = {
      userId: perfil.id,
      nombre: perfil.nombre,
      digito_id: perfil.digito_id || null,
      username: perfil.username || null,
      email: perfil.email || null,
      hora: horaActual,
      fecha: fechaHoy,
      esTarde,
      puntos: esTarde ? 5 : 10
    }

    try {
      const guardadas = JSON.parse(localStorage.getItem('muudel_solicitudes_' + fechaHoy) || '[]')
      const filtradas = guardadas.filter(s => s.userId !== perfil.id)
      const actualizadas = [nuevaSolicitud, ...filtradas]
      localStorage.setItem('muudel_solicitudes_' + fechaHoy, JSON.stringify(actualizadas))
      setSolicitudPendiente(nuevaSolicitud)
    } catch (e) {}

    transmitirEvento('solicitud_asistencia', nuevaSolicitud)
    triggerConfetti()
    sound.playStamp()
  }

  const sumarPuntos = (puntosGanados) => {
    if (!perfil) return
    const nuevosPuntos = (perfil.puntos_total || 0) + puntosGanados
    const updated = { ...perfil, puntos_total: nuevosPuntos }
    setPerfil(updated)
    localStorage.setItem('racha_local_user', JSON.stringify(updated))
    transmitirEvento('puntos_actualizados', { userId: perfil.id, nuevosPuntos })

    try {
      supabase.from('profiles').update({ puntos_total: nuevosPuntos }).eq('id', perfil.id)
    } catch (e) {}
  }

  // Dar like a una respuesta o post
  const handleToggleLike = (id, esPost = false) => {
    sound.playPop()
    const yaLeDi = Boolean(likesDados[id])
    const nuevoEstado = !yaLeDi

    const nuevosLikesDados = { ...likesDados }
    if (nuevoEstado) {
      nuevosLikesDados[id] = true
    } else {
      delete nuevosLikesDados[id]
    }
    setLikesDados(nuevosLikesDados)
    try {
      localStorage.setItem(`muudel_feed_likes_${perfil?.id}`, JSON.stringify(nuevosLikesDados))
    } catch (e) {}

    let nuevoCount = 0
    if (esPost) {
      setPostsFeed(prev => {
        const actualizados = prev.map(p => {
          if (p.id === id) {
            nuevoCount = Math.max(0, (p.likes || 0) + (nuevoEstado ? 1 : -1))
            return { ...p, likes: nuevoCount }
          }
          return p
        })
        try { localStorage.setItem('muudel_feed_posts', JSON.stringify(actualizados)) } catch (e) {}
        return actualizados
      })
    } else {
      setRespuestasFeed(prev => {
        const actualizados = prev.map(r => {
          if (r.id === id) {
            nuevoCount = Math.max(0, (r.likes || 0) + (nuevoEstado ? 1 : -1))
            return { ...r, likes: nuevoCount }
          }
          return r
        })
        try { localStorage.setItem('muudel_entregas_retos', JSON.stringify(actualizados)) } catch (e) {}
        return actualizados
      })
    }

    transmitirEvento('like_feed_item', { itemId: id, nuevoCount })
  }

  // Crear nuevo post para el feed
  const handleCrearNuevoPost = (e) => {
    e.preventDefault()
    if (!nuevoPostTitulo.trim() || !nuevoPostContenido.trim()) return

    setPublicandoPost(true)
    const nuevo = {
      id: 'post-' + Date.now(),
      userId: perfil.id,
      autor: perfil.nombre,
      username: perfil.username || '',
      color: perfil.color_acento || '#007AFF',
      rol: perfil.rol || 'alumno',
      categoria: nuevoPostCategoria,
      titulo: nuevoPostTitulo.trim(),
      contenido: nuevoPostContenido.trim(),
      fecha: 'Hoy ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      likes: 1
    }

    setPostsFeed(prev => {
      const actualizados = [nuevo, ...prev]
      try { localStorage.setItem('muudel_feed_posts', JSON.stringify(actualizados)) } catch (e) {}
      return actualizados
    })

    transmitirEvento('nuevo_feed_post', nuevo)
    sound.playStamp()
    triggerConfetti()

    setNuevoPostTitulo('')
    setNuevoPostContenido('')
    setPublicandoPost(false)
    setMostrarModalCrearPost(false)

    // Recompensar con +5 pts por aportar al aula
    sumarPuntos(5)
  }

  if (!perfil) return null

  const fechaHoyTexto = new Date().toLocaleDateString('es-ES', {
    weekday: 'long',
    day: 'numeric',
    month: 'long'
  })

  // Items unificados para vista "Todos"
  const feedUnificado = [
    ...respuestasFeed.map(r => ({ ...r, tipoFeed: 'respuesta' })),
    ...postsFeed.map(p => ({ ...p, tipoFeed: 'post' }))
  ].sort((a, b) => (b.id > a.id ? 1 : -1))

  const itemsMostrados = filtroFeed === 'todos'
    ? feedUnificado
    : filtroFeed === 'respuestas'
    ? respuestasFeed.map(r => ({ ...r, tipoFeed: 'respuesta' }))
    : postsFeed.map(p => ({ ...p, tipoFeed: 'post' }))

  return (
    <main className="app-container" style={{ maxWidth: 680, margin: '0 auto', paddingBottom: 90 }}>
      {/* Cabecera del Feed Principal */}
      <header style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <p className="apple-caption" style={{ textTransform: 'capitalize', fontWeight: 600, letterSpacing: 0.2 }}>
              {fechaHoyTexto}
            </p>
            <h1 className="apple-large-title" style={{ marginTop: 1, fontSize: 30, letterSpacing: -0.5 }}>
              Feed Principal
            </h1>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {/* Botón de acceso a la Tienda con saldo de puntos */}
            <button
              type="button"
              onClick={() => { sound.playPop(); setMostrarTienda(true) }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '7px 13px',
                borderRadius: 9999,
                backgroundColor: 'rgba(255, 149, 0, 0.12)',
                color: '#D97706',
                border: '1px solid rgba(255, 149, 0, 0.3)',
                fontSize: 13,
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              <ShoppingBag size={15} />
              <span className="tabular-nums">{perfil.puntos_total || 0} pts</span>
            </button>

            <AvatarUsuario
              nombre={perfil.nombre}
              color={perfil.color_acento}
              rol={perfil.rol}
              size={36}
              marco={perfil.marco_avatar}
              showRoleBadge={true}
            />
          </div>
        </div>

        <p className="apple-caption" style={{ marginTop: 2, fontSize: 13 }}>
          Respuestas de clase, tienda escolar y posts técnicos de SMR2.
        </p>
      </header>

      <div ref={contentRef} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {/* BANNER DESTACADO: ACCESO DIRECTO A LA TIENDA DE RECOMPENSAS VIRTUALES */}
        <section
          className="card"
          onClick={() => { sound.playPop(); setMostrarTienda(true) }}
          style={{
            padding: '14px 16px',
            backgroundColor: 'var(--color-surface)',
            border: '1.5px solid rgba(255, 149, 0, 0.3)',
            boxShadow: '0 4px 20px rgba(255, 149, 0, 0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            cursor: 'pointer',
            transition: 'transform 0.15s ease'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 14,
                backgroundColor: 'rgba(255, 149, 0, 0.15)',
                color: '#D97706',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}
            >
              <ShoppingBag size={24} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', color: '#D97706', letterSpacing: 0.5 }}>
                  Tienda Escolar Virtual
                </span>
                <span className="apple-badge apple-badge-warning" style={{ fontSize: 10, fontWeight: 800 }}>
                  🔥 Plazas Limitadas
                </span>
              </div>
              <h3 className="apple-headline" style={{ fontSize: 15, margin: '2px 0 0' }}>
                Canjea auras, títulos VIP y efectos en vivo
              </h3>
              <p className="apple-caption" style={{ fontSize: 12, margin: 0 }}>
                Todo se activa desde tu mochila cuando tú decidas y es visible para toda la clase.
              </p>
            </div>
          </div>

          <button
            type="button"
            className="btn-primary"
            onClick={(e) => { e.stopPropagation(); sound.playPop(); setMostrarTienda(true) }}
            style={{
              flexShrink: 0,
              backgroundColor: '#FF9500',
              fontWeight: 700,
              fontSize: 12,
              padding: '6px 14px',
              borderRadius: 9999,
              minHeight: 34
            }}
          >
            Abrir Tienda
          </button>
        </section>

        {/* Tablón de avisos de lominoño si está publicado */}
        {avisoHoy && (
          <div className="card" style={{
            backgroundColor: 'rgba(255, 149, 0, 0.08)',
            border: '1px solid rgba(255, 149, 0, 0.3)',
            padding: '12px 16px',
            display: 'flex',
            gap: 12,
            alignItems: 'flex-start'
          }}>
            <Megaphone size={19} color="var(--color-warning)" style={{ flexShrink: 0, marginTop: 2 }} />
            <div>
              <span className="apple-caption" style={{ fontWeight: 800, color: 'var(--color-warning)', letterSpacing: 0.5, textTransform: 'uppercase', fontSize: 11 }}>
                Aviso oficial de lominoño
              </span>
              <p style={{ fontSize: 13, color: 'var(--color-ink)', marginTop: 2, fontWeight: 500, margin: 0 }}>
                {avisoHoy}
              </p>
            </div>
          </div>
        )}

        {/* WIDGET COMPACTO DE ASISTENCIA 15:30 Y RACHA */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 10 }}>
          <ContadorCierreLista
            userId={perfil.id}
            nombreUsuario={perfil.nombre}
            asistenciaConfirmada={asistenciaConfirmada}
            solicitudPendiente={solicitudPendiente}
            onMandarSolicitud={handleMandarSolicitud}
          />

          <RachaBar
            racha={perfil.racha_actual || 0}
            mejorRacha={perfil.mejor_racha || 0}
            congelada={perfil.racha_congelada}
          />
        </div>

        {/* Sello Físico si la asistencia ya fue sellada */}
        {asistenciaConfirmada && (
          <CheckinCard
            userId={perfil.id}
            rol={perfil.rol}
            onAbrirPanelAdmin={() => navigate('/admin')}
          />
        )}

        {/* SECCIÓN DEL FEED: FILTROS Y ACCIÓN DE PUBLICAR POST */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 10,
          marginTop: 6,
          flexWrap: 'wrap'
        }}>
          {/* Segmented Control de Filtro */}
          <div className="segmented-control" style={{ maxWidth: 360, margin: 0 }}>
            <button
              type="button"
              className={`segmented-control-item ${filtroFeed === 'todos' ? 'active' : ''}`}
              onClick={() => setFiltroFeed('todos')}
            >
              Todos
            </button>
            <button
              type="button"
              className={`segmented-control-item ${filtroFeed === 'respuestas' ? 'active' : ''}`}
              onClick={() => setFiltroFeed('respuestas')}
            >
              Respuestas ({respuestasFeed.length})
            </button>
            <button
              type="button"
              className={`segmented-control-item ${filtroFeed === 'posts' ? 'active' : ''}`}
              onClick={() => setFiltroFeed('posts')}
            >
              Posts & Tips ({postsFeed.length})
            </button>
          </div>

          {/* Botón para compartir un Post / Tip */}
          <button
            type="button"
            className="btn-secondary"
            onClick={() => { sound.playPop(); setMostrarModalCrearPost(true) }}
            style={{
              padding: '6px 12px',
              fontSize: 12,
              fontWeight: 700,
              gap: 5,
              borderRadius: 9999,
              minHeight: 32,
              backgroundColor: 'var(--color-surface)',
              border: '1px solid var(--color-separator)'
            }}
          >
            <Plus size={14} color="var(--color-accent)" />
            <span>Compartir Post (+5 pts)</span>
          </button>
        </div>

        {/* LISTADO DE ACTIVIDAD DEL FEED */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {itemsMostrados.map((item) => {
            const esRespuesta = item.tipoFeed === 'respuesta'
            const yaLeDiLike = Boolean(likesDados[item.id])

            if (esRespuesta) {
              return (
                <article
                  key={item.id}
                  className="card"
                  style={{
                    padding: '14px 16px',
                    backgroundColor: 'var(--color-surface)',
                    border: '1px solid var(--color-separator)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 10
                  }}
                >
                  {/* Encabezado del alumno */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <AvatarUsuario
                        nombre={item.nombre}
                        color={item.color || '#007AFF'}
                        size={32}
                        fontSize={12}
                      />
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--color-ink)' }}>
                            {item.nombre}
                          </span>
                          {item.username && (
                            <span className="apple-caption" style={{ color: 'var(--color-accent)' }}>
                              @{item.username}
                            </span>
                          )}
                        </div>
                        <span className="apple-caption" style={{ fontSize: 11 }}>
                          Respondió al reto {item.hora ? `a las ${item.hora}` : ''}
                        </span>
                      </div>
                    </div>

                    {/* Badge de estado del reto */}
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4,
                        padding: '3px 8px',
                        borderRadius: 6,
                        fontSize: 11,
                        fontWeight: 700,
                        backgroundColor: item.estado === 'aprobado' ? 'rgba(52, 199, 89, 0.12)' : 'rgba(255, 149, 0, 0.12)',
                        color: item.estado === 'aprobado' ? 'var(--color-positive)' : 'var(--color-warning)'
                      }}
                    >
                      {item.estado === 'aprobado' ? <CheckCircle2 size={12} /> : <Clock size={12} />}
                      <span>{item.estado === 'aprobado' ? 'Verificado' : 'En revisión'}</span>
                    </span>
                  </div>

                  {/* Título del reto asociado */}
                  <div style={{
                    fontSize: 12,
                    fontWeight: 700,
                    color: 'var(--color-accent)',
                    backgroundColor: 'rgba(0, 122, 255, 0.06)',
                    padding: '4px 8px',
                    borderRadius: 6,
                    display: 'inline-block'
                  }}>
                    🎯 {item.retoTitulo || 'Reto Técnico de Clase'}
                  </div>

                  {/* Contenido / Solución del alumno */}
                  <div style={{
                    backgroundColor: 'var(--color-surface-secondary)',
                    padding: '10px 12px',
                    borderRadius: 10,
                    border: '1px solid var(--color-separator)'
                  }}>
                    {item.evidencia && item.evidencia.includes('\n') ? (
                      <pre style={{
                        margin: 0,
                        fontFamily: 'SF Mono, Menlo, monospace',
                        fontSize: 12,
                        lineHeight: 1.4,
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-word',
                        color: 'var(--color-ink)'
                      }}>
                        {item.evidencia}
                      </pre>
                    ) : (
                      <p style={{ margin: 0, fontSize: 13, color: 'var(--color-ink)', lineHeight: 1.4 }}>
                        {item.evidencia}
                      </p>
                    )}
                  </div>

                  {/* Feedback del moderador si existe */}
                  {item.feedback && (
                    <div style={{
                      fontSize: 12,
                      color: 'var(--color-positive)',
                      backgroundColor: 'rgba(52, 199, 89, 0.08)',
                      padding: '6px 10px',
                      borderRadius: 8,
                      border: '1px solid rgba(52, 199, 89, 0.2)'
                    }}>
                      💬 <strong>lominoño:</strong> {item.feedback}
                    </div>
                  )}

                  {/* Fila de Interacción */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 2 }}>
                    <button
                      type="button"
                      onClick={() => handleToggleLike(item.id, false)}
                      style={{
                        background: yaLeDiLike ? 'rgba(255, 59, 48, 0.1)' : 'transparent',
                        border: yaLeDiLike ? '1px solid rgba(255, 59, 48, 0.3)' : '1px solid transparent',
                        borderRadius: 8,
                        padding: '3px 8px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 5,
                        fontSize: 12,
                        fontWeight: 600,
                        color: yaLeDiLike ? '#FF3B30' : 'var(--color-secondary-ink)',
                        cursor: 'pointer'
                      }}
                    >
                      <Heart size={14} fill={yaLeDiLike ? '#FF3B30' : 'none'} />
                      <span>{item.likes || 0}</span>
                    </button>

                    <span className="apple-caption" style={{ fontSize: 11 }}>
                      Respuesta oficial SMR2
                    </span>
                  </div>
                </article>
              )
            }

            // CASO POST TÉCNICO / COMUNIDAD
            return (
              <article
                key={item.id}
                className="card"
                style={{
                  padding: '14px 16px',
                  backgroundColor: 'var(--color-surface)',
                  border: '1px solid var(--color-separator)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 10
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <AvatarUsuario
                      nombre={item.autor}
                      color={item.color || '#007AFF'}
                      rol={item.rol || 'alumno'}
                      size={32}
                      fontSize={12}
                    />
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--color-ink)' }}>
                          {item.autor}
                        </span>
                        {item.username && (
                          <span className="apple-caption" style={{ color: 'var(--color-accent)' }}>
                            @{item.username}
                          </span>
                        )}
                        {item.rol === 'moderador' && (
                          <span className="apple-badge apple-badge-accent" style={{ fontSize: 9 }}>
                            Profesor
                          </span>
                        )}
                      </div>
                      <span className="apple-caption" style={{ fontSize: 11 }}>
                        {item.fecha}
                      </span>
                    </div>
                  </div>

                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 800,
                      padding: '3px 8px',
                      borderRadius: 6,
                      backgroundColor: 'rgba(120, 120, 128, 0.1)',
                      color: 'var(--color-secondary-ink)'
                    }}
                  >
                    #{item.categoria || 'Tip'}
                  </span>
                </div>

                <div>
                  <h4 style={{ fontSize: 15, fontWeight: 700, margin: '0 0 6px', color: 'var(--color-ink)' }}>
                    {item.titulo}
                  </h4>
                  <p style={{ fontSize: 13, color: 'var(--color-secondary-ink)', margin: 0, lineHeight: 1.45, whiteSpace: 'pre-line' }}>
                    {item.contenido}
                  </p>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 2 }}>
                  <button
                    type="button"
                    onClick={() => handleToggleLike(item.id, true)}
                    style={{
                      background: yaLeDiLike ? 'rgba(255, 59, 48, 0.1)' : 'transparent',
                      border: yaLeDiLike ? '1px solid rgba(255, 59, 48, 0.3)' : '1px solid transparent',
                      borderRadius: 8,
                      padding: '3px 8px',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 5,
                      fontSize: 12,
                      fontWeight: 600,
                      color: yaLeDiLike ? '#FF3B30' : 'var(--color-secondary-ink)',
                      cursor: 'pointer'
                    }}
                  >
                    <Heart size={14} fill={yaLeDiLike ? '#FF3B30' : 'none'} />
                    <span>{item.likes || 0}</span>
                  </button>

                  <span className="apple-caption" style={{ fontSize: 11 }}>
                    Post de la clase
                  </span>
                </div>
              </article>
            )
          })}
        </div>

        {/* Reto diario interactivo */}
        <RetoDelDia perfil={perfil} onCompletado={sumarPuntos} />

        {/* Pregunta Flash */}
        <PreguntaFlashDia userId={perfil.id} onSumarPuntos={sumarPuntos} />

        {/* Banner Recreo Arcade */}
        <section
          className="card"
          style={{
            padding: '14px 16px',
            backgroundColor: 'rgba(48, 209, 88, 0.08)',
            border: '1px solid rgba(48, 209, 88, 0.25)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            flexWrap: 'wrap',
            cursor: 'pointer'
          }}
          onClick={() => navigate('/juegos')}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 12,
                backgroundColor: '#30D158',
                color: '#FFFFFF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 12px rgba(48, 209, 88, 0.3)'
              }}
            >
              <Gamepad2 size={22} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', color: '#248A3D', letterSpacing: 0.5 }}>
                  Recreo Arcade SMR2
                </span>
                <span className="apple-badge apple-badge-neutral" style={{ fontSize: 10, backgroundColor: 'rgba(48, 209, 88, 0.15)', color: '#248A3D' }}>
                  +60 pts diarios
                </span>
              </div>
              <h4 className="apple-headline" style={{ fontSize: 15, margin: 0 }}>
                Yoshi Runner
              </h4>
              <p className="apple-caption" style={{ fontSize: 12, margin: 0 }}>
                Invencibilidad aleatoria táctica (1.5s - 6s) y radar de alertas.
              </p>
            </div>
          </div>

          <button
            type="button"
            className="btn-primary"
            onClick={(e) => { e.stopPropagation(); navigate('/juegos') }}
            style={{
              backgroundColor: '#30D158',
              color: '#FFFFFF',
              fontSize: 12,
              fontWeight: 700,
              padding: '6px 14px',
              minHeight: 34,
              borderRadius: 9999
            }}
          >
            Jugar
          </button>
        </section>

        {/* Podio real de clase */}
        {ranking.length > 0 && <TopRanking lista={ranking} />}
      </div>

      {/* MODAL CREAR POST O TIP */}
      {mostrarModalCrearPost && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          backdropFilter: 'blur(8px)',
          zIndex: 2500,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 16
        }}>
          <div className="card" style={{
            maxWidth: 480,
            width: '100%',
            padding: 20,
            backgroundColor: 'var(--color-bg)',
            boxShadow: '0 8px 30px rgba(0,0,0,0.2)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <h3 className="apple-headline" style={{ fontSize: 16, margin: 0 }}>
                Compartir Post o Tip con la Clase
              </h3>
              <button
                type="button"
                onClick={() => setMostrarModalCrearPost(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-secondary-ink)' }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCrearNuevoPost} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div>
                <label className="apple-caption" style={{ display: 'block', marginBottom: 4 }}>
                  Categoría
                </label>
                <select
                  value={nuevoPostCategoria}
                  onChange={(e) => setNuevoPostCategoria(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: 10,
                    border: '1px solid var(--color-separator)',
                    backgroundColor: 'var(--color-surface)',
                    fontSize: 13,
                    color: 'var(--color-ink)'
                  }}
                >
                  <option value="Truco">Truco / Chuleta</option>
                  <option value="Cisco">Cisco / Redes</option>
                  <option value="Linux">Linux / Shell</option>
                  <option value="Duda">Duda Técnica</option>
                  <option value="Aviso">Aviso Compañeros</option>
                </select>
              </div>

              <div>
                <label className="apple-caption" style={{ display: 'block', marginBottom: 4 }}>
                  Título
                </label>
                <input
                  type="text"
                  placeholder="Ej: Chuleta de comandos para el examen..."
                  value={nuevoPostTitulo}
                  onChange={(e) => setNuevoPostTitulo(e.target.value)}
                  maxLength={90}
                  required
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: 10,
                    border: '1px solid var(--color-separator)',
                    backgroundColor: 'var(--color-surface)',
                    fontSize: 13,
                    color: 'var(--color-ink)'
                  }}
                />
              </div>

              <div>
                <label className="apple-caption" style={{ display: 'block', marginBottom: 4 }}>
                  Contenido
                </label>
                <textarea
                  rows={4}
                  placeholder="Escribe la explicación o pega los comandos clave..."
                  value={nuevoPostContenido}
                  onChange={(e) => setNuevoPostContenido(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: 10,
                    border: '1px solid var(--color-separator)',
                    backgroundColor: 'var(--color-surface)',
                    fontSize: 13,
                    color: 'var(--color-ink)',
                    resize: 'none'
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 4 }}>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setMostrarModalCrearPost(false)}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={publicandoPost}
                  style={{ gap: 6 }}
                >
                  <Send size={14} />
                  <span>Publicar en Feed (+5 pts)</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DE LA TIENDA DE RECOMPENSAS VIRTUALES */}
      {mostrarTienda && (
        <TiendaRecompensas onClose={() => setMostrarTienda(false)} />
      )}

      {/* MODAL DEL HORARIO */}
      <ModalHorario
        abierto={mostrarModalHorario}
        onCerrar={() => setMostrarModalHorario(false)}
      />
    </main>
  )
}

// Exportar también como PantallaFeed por claridad
export { PantallaHoy as PantallaFeed }
