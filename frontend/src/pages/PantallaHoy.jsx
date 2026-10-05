// frontend/src/pages/PantallaHoy.jsx (Feed de Clase SMR2 - Responsive Desktop & Mobile)
import { useState, useEffect, useRef, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../App'
import { AvatarUsuario } from '../components/AvatarUsuario'
import { TiendaRecompensas } from '../components/TiendaRecompensas'
import { ModalHorario } from '../components/ModalHorario'
import { supabase } from '../utils/supabase'
import { sound, triggerConfetti } from '../utils/haptics'
import {
  Heart,
  MessageSquare,
  Repeat2,
  Share2,
  Send,
  Sparkles,
  ShoppingBag,
  Flame,
  CheckCircle2,
  Clock,
  Code2,
  Terminal,
  HelpCircle,
  Megaphone,
  Check,
  ChevronRight,
  X,
  Calendar,
  ShieldCheck,
  Trash2,
  Pin,
  CornerDownRight,
  Search,
  RefreshCw,
  Copy,
  Hash,
  Laptop,
  Smartphone,
  SlidersHorizontal,
  ExternalLink,
  Award,
  Zap,
  TrendingUp,
  BookOpen
} from 'lucide-react'
import { transmitirEvento, suscribirEvento } from '../utils/realtimeHub'
import { analizarTextoAntiIA } from '../utils/antiAiDetector'
import { sumarXpSkill } from '../utils/skillsData'
import { obtenerConfigRecompensas, calcularPuntosGanados } from '../utils/recompensasConfig'
import { getEstadoHorarioCompleto } from '../utils/horarioData'

export const ADMIN_LOMINONO_ID = '00000000-0000-4000-a000-000000000001'

const NOMBRES_INVENTADOS = [
  'alumno inventado', 'usuario inventado', 'demo', 'test', 'mock', 'bot',
  'admin', 'profesor', 'lominoño', 'sistema', 'moderador'
]

const CATEGORIAS_VALIDAS = [
  { id: 'todas', label: 'Todos', icon: Hash },
  { id: 'Aviso', label: 'Avisos', icon: Megaphone, color: '#FF9500' },
  { id: 'Linux', label: 'Linux / Bash', icon: Terminal, color: '#0A84FF' },
  { id: 'Redes', label: 'Redes / Cisco', icon: Code2, color: '#34C759' },
  { id: 'Truco', label: 'Chuletas & Tips', icon: Sparkles, color: '#AF52DE' },
  { id: 'Duda', label: 'Dudas Aula', icon: HelpCircle, color: '#FF2D55' },
  { id: 'General', label: 'General', icon: BookOpen, color: '#8E8E93' }
]

// Resolver autor del post: distingue alumnos reales de administración
function resolverAutorFeed(p) {
  const prof = p?.profiles
  const nombreRaw = (prof?.nombre || '').trim()
  const nombreLower = nombreRaw.toLowerCase()

  const esNombreInventado = NOMBRES_INVENTADOS.some(palabra => nombreLower.includes(palabra))
  const esModerador = prof?.rol === 'moderador' || prof?.rol === 'admin'
  const esAdminId = p?.user_id === ADMIN_LOMINONO_ID
  const esPostAdmin = Boolean(p?.es_admin) || p?.categoria === 'Aviso'
  const sinPerfilReal = !prof || !nombreRaw

  const esAdministracion = sinPerfilReal || esModerador || esAdminId || esPostAdmin || esNombreInventado

  if (esAdministracion) {
    const nombreVisible = (nombreRaw && !esNombreInventado) ? nombreRaw : 'lominoño'
    return {
      userId: prof?.id || ADMIN_LOMINONO_ID,
      autor: `${nombreVisible} (Post de administración)`,
      autorLimpio: nombreVisible,
      username: prof?.username ? `@${prof.username.replace('@', '')}` : '@administracion',
      rol: 'moderador',
      esAdministracion: true,
      color: prof?.color_acento || '#0A84FF',
      avatarEmoji: prof?.avatar_emoji || '🛡️'
    }
  }

  return {
    userId: prof.id,
    autor: nombreRaw,
    autorLimpio: nombreRaw,
    username: prof.username ? `@${prof.username.replace('@', '')}` : `@${nombreRaw.toLowerCase().replace(/\s+/g, '')}`,
    rol: prof.rol || 'alumno',
    esAdministracion: false,
    color: prof.color_acento || '#007AFF',
    avatarEmoji: prof.avatar_emoji || '🧑‍🎓'
  }
}

// Posts oficiales garantizados en caso de BD vacía o primera inicialización
const POSTS_ADMINISTRACION_OFICIALES = [
  {
    id: 'post-admin-bienvenida',
    tipo: 'post',
    userId: ADMIN_LOMINONO_ID,
    autor: 'lominoño (Post de administración)',
    autorLimpio: 'lominoño',
    username: 'administracion',
    color: '#0A84FF',
    rol: 'moderador',
    avatarEmoji: '🛡️',
    esAdministracion: true,
    categoria: 'Aviso',
    titulo: 'Bienvenidos al Feed Oficial de SMR2 Tarde',
    contenido: 'Este es el canal oficial de comunicación del aula SMR2. Aquí compartimos comandos de Linux, resolución de dudas técnicas, chuletas de examen y avisos del profesorado. ¡Cada publicación constructiva suma StevenEuros (SE 💶) a tu cuenta!',
    tiempoHace: 'Fijado',
    likes: 5,
    liked: false,
    fijado: true,
    created_at: new Date(Date.now() - 3600 * 1000 * 24).toISOString()
  },
  {
    id: 'post-admin-linux-tip',
    tipo: 'post',
    userId: ADMIN_LOMINONO_ID,
    autor: 'lominoño (Post de administración)',
    autorLimpio: 'lominoño',
    username: 'administracion',
    color: '#0A84FF',
    rol: 'moderador',
    avatarEmoji: '🐧',
    esAdministracion: true,
    categoria: 'Linux',
    titulo: 'Chuleta de Permisos Octales y Diagnóstico de Red',
    contenido: "Para el examen de administración de sistemas, memorizad estas equivalencias octales:\n```bash\nchmod 755 script.sh # rwxr-xr-x (scripts ejecutables para todos)\nchmod 644 config.conf # rw-r--r-- (archivos de configuración)\nchmod 600 id_rsa # rw------- (claves SSH privadas)\n\n# Diagnóstico de puertos y red:\nss -tulpn && ip -br a\n```",
    tiempoHace: '2h',
    likes: 8,
    liked: false,
    fijado: false,
    created_at: new Date(Date.now() - 3600 * 1000 * 2).toISOString()
  }
]

export function PantallaHoy() {
  const { perfil, setPerfil } = useAuth()
  const navigate = useNavigate()

  // Detección reactiva de pantalla ancha (PC / Laptop Desktop >= 1024px)
  const [esDesktop, setEsDesktop] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth >= 1024
    }
    return false
  })

  useEffect(() => {
    const handleResize = () => {
      setEsDesktop(window.innerWidth >= 1024)
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // Pestañas principales de Timeline: 'para_ti' | 'tips' | 'respuestas'
  const [tabActiva, setTabActiva] = useState('para_ti')

  // Filtro por categoría y búsqueda en tiempo real
  const [filtroCategoria, setFiltroCategoria] = useState('todas')
  const [busquedaQuery, setBusquedaQuery] = useState('')
  const [busquedaAbiertaMovil, setBusquedaAbiertaMovil] = useState(false)

  // Modales interactivos
  const [mostrarTienda, setMostrarTienda] = useState(false)
  const [mostrarModalHorario, setMostrarModalHorario] = useState(false)
  const [avisoHoy, setAvisoHoy] = useState(() => localStorage.getItem('racha_aviso_hoy') || '')

  // Estado del horario oficial y clase en curso en tiempo real
  const [estadoHorario, setEstadoHorario] = useState(() => getEstadoHorarioCompleto())

  // Compositor de publicaciones
  const [textoPost, setTextoPost] = useState('')
  const [categoriaPost, setCategoriaPost] = useState('Truco')
  const [fijarPostAdmin, setFijarPostAdmin] = useState(false)
  const [publicando, setPublicando] = useState(false)
  const [composerExpandidoMovil, setComposerExpandidoMovil] = useState(false)
  const composerRef = useRef(null)

  // Posts del feed y respuestas a retos
  const [postsFeed, setPostsFeed] = useState([])
  const [cargandoPosts, setCargandoPosts] = useState(true)
  const [refrescando, setRefrescando] = useState(false)
  const [respuestasFeed, setRespuestasFeed] = useState([])

  // Likes y Reposts locales
  const [likesDados, setLikesDados] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(`muudel_feed_likes_${perfil?.id}`) || '{}')
    } catch (e) {
      return {}
    }
  })
  const [repostsDados, setRepostsDados] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(`muudel_feed_reposts_${perfil?.id}`) || '{}')
    } catch (e) {
      return {}
    }
  })

  // Hilo de comentarios
  const [comentariosAbiertos, setComentariosAbiertos] = useState({})
  const [comentariosPorPost, setComentariosPorPost] = useState({})
  const [cargandoComentarios, setCargandoComentarios] = useState({})
  const [nuevoComentarioTexto, setNuevoComentarioTexto] = useState({})
  const [enviandoComentario, setEnviandoComentario] = useState(false)

  // Estado de Asistencia 15:30
  const [asistenciaConfirmada, setAsistenciaConfirmada] = useState(null)
  const [solicitudPendiente, setSolicitudPendiente] = useState(null)
  const [bannerAsistenciaVisible, setBannerAsistenciaVisible] = useState(true)

  // Configuración de economía y ganancias
  const [configRec, setConfigRec] = useState(() => obtenerConfigRecompensas())
  const [toastNotif, setToastNotif] = useState(null)

  const fechaHoy = new Date().toISOString().split('T')[0]
  const esModerador = perfil?.rol === 'moderador' || perfil?.rol === 'admin' || perfil?.id === ADMIN_LOMINONO_ID

  const avisarToast = (mensaje, tipo = 'info') => {
    setToastNotif({ mensaje, tipo })
    setTimeout(() => setToastNotif(null), 3500)
  }

  // Carga inicial y suscripciones en tiempo real
  useEffect(() => {
    cargarFeedCompleto()

    const timerHorario = setInterval(() => {
      setEstadoHorario(getEstadoHorarioCompleto())
    }, 15000)

    // Suscripción Supabase Realtime a publicaciones
    const canalFeed = supabase
      .channel('feed-posts-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'feed_posts' }, () => {
        cargarFeedCompleto(false)
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'feed_post_comments' }, (payload) => {
        const comNuevo = payload.new
        if (comNuevo && comNuevo.post_id) {
          cargarComentariosPost(comNuevo.post_id)
        }
      })
      .subscribe()

    // Suscripciones broadcast por realtimeHub
    const desNuevoPost = suscribirEvento('nuevo_feed_post', (nuevoPost) => {
      setPostsFeed(prev => {
        if (prev.some(p => p.id === nuevoPost.id)) return prev
        return [nuevoPost, ...prev]
      })
    })

    const desEliminarPost = suscribirEvento('eliminar_feed_post', ({ postId }) => {
      if (postId) {
        setPostsFeed(prev => prev.filter(p => p.id !== postId))
      }
    })

    const desLike = suscribirEvento('like_feed_item', ({ itemId, nuevoCount }) => {
      setPostsFeed(prev => prev.map(p => p.id === itemId ? { ...p, likes: nuevoCount } : p))
      setRespuestasFeed(prev => prev.map(r => r.id === itemId ? { ...r, likes: nuevoCount } : r))
    })

    const desNuevoComentario = suscribirEvento('nuevo_feed_comentario', ({ postId, comentario }) => {
      if (postId && comentario) {
        setComentariosPorPost(prev => ({
          ...prev,
          [postId]: [...(prev[postId] || []).filter(c => c.id !== comentario.id), comentario]
        }))
      }
    })

    const desCheckin = suscribirEvento('checkin_confirmado', (datos) => {
      if (datos.userId === perfil?.id) {
        setAsistenciaConfirmada(datos)
        setSolicitudPendiente(null)
      }
    })

    const desRecompensas = suscribirEvento('recompensas_config_actualizada', (nuevaCfg) => {
      if (nuevaCfg) setConfigRec(nuevaCfg)
    })

    const desStevenEuros = suscribirEvento('steveneuros_actualizados', (datos) => {
      const { alumnoId, userId, nuevosPuntos } = datos || {}
      const targetId = userId || alumnoId
      if (!targetId || String(targetId) === String(perfil?.id)) {
        if (nuevosPuntos != null) {
          setPerfil(prev => prev ? { ...prev, puntos_total: nuevosPuntos } : prev)
        } else {
          cargarSaldoFresco()
        }
      }
    })

    const desMasivo = suscribirEvento('ajuste_masivo_puntos', () => {
      cargarSaldoFresco()
    })

    const handleSyncStevenEuros = (e) => {
      const { puntos, nuevosPuntos, userId, alumnoId } = e.detail || {}
      const targetId = userId || alumnoId
      const pts = nuevosPuntos ?? puntos
      if (!targetId || String(targetId) === String(perfil?.id)) {
        if (pts != null) {
          setPerfil(prev => prev ? { ...prev, puntos_total: pts } : prev)
        } else {
          cargarSaldoFresco()
        }
      }
    }
    window.addEventListener('steveneuros_actualizados', handleSyncStevenEuros)

    const handleRtProfiles = (e) => {
      const payload = e.detail
      if (payload?.new && String(payload.new.id) === String(perfil?.id)) {
        setPerfil(prev => prev ? { ...prev, puntos_total: payload.new.puntos_total, racha_actual: payload.new.racha_actual ?? prev.racha_actual } : prev)
      }
    }
    window.addEventListener('muudel-rt-postgres-profiles', handleRtProfiles)

    const handleRtFeedPosts = () => {
      cargarFeedCompleto(false)
    }
    window.addEventListener('muudel-rt-postgres-feed_posts', handleRtFeedPosts)

    return () => {
      clearInterval(timerHorario)
      supabase.removeChannel(canalFeed)
      desNuevoPost()
      desEliminarPost()
      desLike()
      desNuevoComentario()
      desCheckin()
      desRecompensas()
      desStevenEuros()
      desMasivo()
      window.removeEventListener('steveneuros_actualizados', handleSyncStevenEuros)
      window.removeEventListener('muudel-rt-postgres-profiles', handleRtProfiles)
      window.removeEventListener('muudel-rt-postgres-feed_posts', handleRtFeedPosts)
    }
  }, [perfil?.id, fechaHoy])

  const cargarSaldoFresco = async () => {
    if (!perfil?.id) return
    try {
      const { data } = await supabase
        .from('profiles')
        .select('puntos_total, racha_actual')
        .eq('id', perfil.id)
        .single()
      if (data) {
        setPerfil(prev => prev ? { ...prev, puntos_total: data.puntos_total, racha_actual: data.racha_actual ?? prev.racha_actual } : prev)
      }
    } catch (_) {}
  }

  const cargarFeedCompleto = async (mostrarCargador = true) => {
    if (mostrarCargador) setCargandoPosts(true)
    setRefrescando(true)
    try {
      // 1. Cargar estado de check-in de hoy
      if (perfil) {
        const { data: miChk } = await supabase
          .from('checkins')
          .select('*')
          .eq('user_id', perfil.id)
          .eq('fecha', fechaHoy)
          .maybeSingle()

        if (miChk) setAsistenciaConfirmada(miChk)
      }

      // 2. Cargar likes del usuario actual
      let likedSet = {}
      if (perfil) {
        const { data: misLikes } = await supabase
          .from('feed_post_likes')
          .select('post_id')
          .eq('user_id', perfil.id)
        if (misLikes) {
          misLikes.forEach(l => { likedSet[l.post_id] = true })
        }
      }
      setLikesDados(likedSet)

      // 3. Cargar posts reales desde Supabase con fallback a API del servidor
      let rawPosts = null
      const { data: postsData, error: errPosts } = await supabase
        .from('feed_posts')
        .select(`
          id, categoria, titulo, contenido, likes_count, created_at, es_admin, fijado,
          profiles (id, nombre, username, color_acento, rol, avatar_emoji)
        `)
        .eq('soft_deleted', false)
        .order('created_at', { ascending: false })
        .limit(60)

      if (!errPosts && postsData) {
        rawPosts = postsData
      } else {
        try {
          const resp = await fetch('/api/feed/posts')
          const json = await resp.json()
          if (json.posts) rawPosts = json.posts
        } catch (_) {}
      }

      if (rawPosts && rawPosts.length > 0) {
        const mapeados = rawPosts.map(p => {
          const autorInfo = resolverAutorFeed(p)
          return {
            id: p.id,
            tipo: 'post',
            userId: autorInfo.userId,
            autor: autorInfo.autor,
            autorLimpio: autorInfo.autorLimpio,
            username: autorInfo.username,
            color: autorInfo.color,
            rol: autorInfo.rol,
            esAdministracion: autorInfo.esAdministracion,
            avatarEmoji: autorInfo.avatarEmoji,
            categoria: p.categoria || 'General',
            titulo: p.titulo,
            contenido: p.contenido,
            fijado: Boolean(p.fijado),
            tiempoHace: calcularTiempoRelativo(p.created_at),
            likes: p.likes_count || 0,
            liked: Boolean(likedSet[p.id]),
            created_at: p.created_at
          }
        })
        setPostsFeed(mapeados)
      } else {
        setPostsFeed(POSTS_ADMINISTRACION_OFICIALES)
      }

      // 4. Cargar respuestas a retos técnicos completados
      try {
        const { data: entregasData } = await supabase
          .from('reto_completado')
          .select(`
            id, user_id, reto_id, evidencia, feedback_admin, created_at,
            profiles (id, nombre, username, color_acento, rol, avatar_emoji),
            retos (titulo)
          `)
          .eq('validado', true)
          .order('created_at', { ascending: false })
          .limit(20)

        if (entregasData && entregasData.length > 0) {
          const respuestasMapeadas = entregasData
            .filter(e => e.evidencia)
            .map(e => {
              const autorInfo = resolverAutorFeed(e)
              return {
                id: 'rc_' + e.id,
                tipo: 'respuesta',
                userId: autorInfo.userId,
                autor: autorInfo.autor,
                autorLimpio: autorInfo.autorLimpio,
                username: autorInfo.username,
                color: autorInfo.color,
                rol: autorInfo.rol,
                esAdministracion: autorInfo.esAdministracion,
                avatarEmoji: autorInfo.avatarEmoji,
                categoria: 'Reto',
                retoTitulo: e.retos?.titulo || 'Reto Técnico',
                contenido: e.evidencia,
                feedback: e.feedback_admin,
                estado: 'aprobado',
                tiempoHace: calcularTiempoRelativo(e.created_at),
                likes: 0,
                liked: false,
                created_at: e.created_at
              }
            })
          setRespuestasFeed(respuestasMapeadas)
        } else {
          setRespuestasFeed([])
        }
      } catch (_) {
        setRespuestasFeed([])
      }
    } catch (err) {
      console.warn('Error cargando feed:', err)
      setPostsFeed(POSTS_ADMINISTRACION_OFICIALES)
    } finally {
      setCargandoPosts(false)
      setRefrescando(false)
    }
  }

  // Publicar post desde el compositor
  const handlePublicarPost = async (e) => {
    if (e && e.preventDefault) e.preventDefault()
    const contenidoLimpio = textoPost.trim()
    if (!contenidoLimpio || !perfil || publicando) return

    setPublicando(true)
    sound.playStamp()

    let tituloAuto = contenidoLimpio.split('\n')[0].substring(0, 65).trim()
    if (tituloAuto.length < 3) {
      tituloAuto = esModerador
        ? `Aviso de Administración`
        : `${categoriaPost} técnico de ${perfil.nombre}`
    }

    const analisisAntiIA = analizarTextoAntiIA(contenidoLimpio)

    try {
      let postCreado = null

      // Inserción en Supabase
      try {
        const { data, error } = await supabase
          .from('feed_posts')
          .insert({
            user_id: perfil.id,
            categoria: categoriaPost,
            titulo: tituloAuto,
            contenido: contenidoLimpio,
            es_admin: esModerador,
            fijado: esModerador && fijarPostAdmin
          })
          .select(`
            id, categoria, titulo, contenido, likes_count, created_at, es_admin, fijado,
            profiles (id, nombre, username, color_acento, rol, avatar_emoji)
          `)
          .single()

        if (!error && data) postCreado = data
      } catch (_) {}

      // Fallback a API con Service Key
      if (!postCreado) {
        try {
          const resp = await fetch('/api/feed/publicar', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              user_id: perfil.id,
              categoria: categoriaPost,
              titulo: tituloAuto,
              contenido: contenidoLimpio,
              es_admin: esModerador
            })
          })
          const json = await resp.json()
          if (json.post) postCreado = json.post
        } catch (_) {}
      }

      if (postCreado) {
        const autorInfo = resolverAutorFeed({
          ...postCreado,
          profiles: {
            id: perfil.id,
            nombre: perfil.nombre,
            username: perfil.username,
            rol: perfil.rol,
            color_acento: perfil.color_acento,
            avatar_emoji: perfil.avatar_emoji
          }
        })

        const nuevo = {
          id: postCreado.id,
          tipo: 'post',
          userId: autorInfo.userId,
          autor: autorInfo.autor,
          autorLimpio: autorInfo.autorLimpio,
          username: autorInfo.username,
          color: autorInfo.color,
          rol: autorInfo.rol,
          esAdministracion: autorInfo.esAdministracion,
          avatarEmoji: autorInfo.avatarEmoji,
          categoria: postCreado.categoria,
          titulo: postCreado.titulo,
          contenido: postCreado.contenido,
          fijado: Boolean(postCreado.fijado),
          tiempoHace: 'ahora mismo',
          likes: 0,
          liked: false,
          created_at: new Date().toISOString()
        }

        setPostsFeed(prev => [nuevo, ...prev])
        transmitirEvento('nuevo_feed_post', nuevo)
        setTextoPost('')
        setFijarPostAdmin(false)
        setComposerExpandidoMovil(false)
        triggerConfetti()
        avisarToast('¡Publicación compartida con el aula!', 'exito')

        // Premiar StevenEuros si es alumno
        if (!esModerador) {
          const mult = Number(configRec?.multiplicadorGlobal) || 1.0
          const baseFeed = Number(configRec?.puntosPostFeed) || 10
          const ratio = analisisAntiIA.esGenuino ? 1.0 : 0.5
          const ptsExtra = Math.max(1, Math.round(baseFeed * ratio * mult))
          let nuevoSaldo = (perfil.puntos_total || 0) + ptsExtra

          try {
            const headers = { 'Content-Type': 'application/json' }
            try {
              const { data: sData } = await supabase.auth.getSession()
              if (sData?.session?.access_token) headers['Authorization'] = `Bearer ${sData.session.access_token}`
            } catch (_) {}
            if (perfil?.id) headers['x-user-id'] = perfil.id

            const fResp = await fetch('/api/ruleta/feed-recompensa', {
              method: 'POST',
              headers,
              body: JSON.stringify({
                puntos: ptsExtra,
                motivo: `Publicación en Feed (${categoriaPost || 'Aporte'})`,
                idempotency_key: `feed_post_${perfil.id}_${Date.now()}`
              })
            })
            const fData = await fResp.json()
            if (fData?.nuevoSaldo !== undefined) {
              nuevoSaldo = fData.nuevoSaldo
            }
          } catch (_) {}

          setPerfil({ ...perfil, puntos_total: nuevoSaldo })
          localStorage.setItem('racha_local_user', JSON.stringify({ ...perfil, puntos_total: nuevoSaldo }))
          window.dispatchEvent(new CustomEvent('steveneuros_actualizados', { detail: { puntos: nuevoSaldo, userId: perfil.id } }))
          transmitirEvento('steveneuros_actualizados', { alumnoId: perfil.id, nuevosPuntos: nuevoSaldo, userId: perfil.id })

          let skillKey = 'autoria_tecnica'
          if (categoriaPost === 'Truco' || categoriaPost === 'Linux') skillKey = 'linux_bash'
          else if (categoriaPost === 'Redes') skillKey = 'redes_vlans'
          sumarXpSkill(perfil.id, skillKey, 15)
        }
      }
    } catch (err) {
      console.warn('Error al publicar post:', err)
      avisarToast('No se pudo publicar. Inténtalo de nuevo.', 'error')
    } finally {
      setPublicando(false)
    }
  }

  // Like interactivo
  const handleToggleLike = async (itemId, esPostReal = true) => {
    sound.playPop()
    const yaLeDi = Boolean(likesDados[itemId])

    setLikesDados(prev => {
      const copia = { ...prev }
      if (yaLeDi) delete copia[itemId]
      else copia[itemId] = true
      localStorage.setItem(`muudel_feed_likes_${perfil?.id}`, JSON.stringify(copia))
      return copia
    })

    if (esPostReal) {
      const postActual = postsFeed.find(p => p.id === itemId)
      const nuevoCount = Math.max(0, (postActual?.likes || 0) + (yaLeDi ? -1 : 1))

      setPostsFeed(prev => prev.map(p => {
        if (p.id === itemId) return { ...p, likes: nuevoCount, liked: !yaLeDi }
        return p
      }))

      transmitirEvento('like_feed_item', { itemId, nuevoCount })

      try {
        if (!yaLeDi) {
          await supabase.from('feed_post_likes').upsert({ post_id: itemId, user_id: perfil?.id })
          await supabase.rpc('increment_likes_count', { post_id: itemId })
        } else {
          await supabase.from('feed_post_likes').delete().match({ post_id: itemId, user_id: perfil?.id })
          await supabase.rpc('decrement_likes_count', { post_id: itemId })
        }
        await supabase.from('feed_posts').update({ likes_count: nuevoCount }).eq('id', itemId)
      } catch (_) {
        try {
          await fetch('/api/feed/like', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ postId: itemId, userId: perfil?.id, darLike: !yaLeDi })
          })
        } catch (_) {}
      }
    } else {
      setRespuestasFeed(prev => prev.map(r => {
        if (r.id === itemId) {
          const nuevoCount = Math.max(0, (r.likes || 0) + (yaLeDi ? -1 : 1))
          return { ...r, likes: nuevoCount, liked: !yaLeDi }
        }
        return r
      }))
    }
  }

  // Repost
  const handleRepost = (itemId) => {
    sound.playStamp()
    const yaRepostee = Boolean(repostsDados[itemId])
    setRepostsDados(prev => {
      const copia = { ...prev }
      if (yaRepostee) delete copia[itemId]
      else copia[itemId] = true
      localStorage.setItem(`muudel_feed_reposts_${perfil?.id}`, JSON.stringify(copia))
      return copia
    })
    triggerConfetti()
    avisarToast(yaRepostee ? 'Impulso cancelado' : '¡Publicación impulsada en el aula!', 'exito')
  }

  // Eliminar post
  const handleEliminarPost = async (postId) => {
    if (!window.confirm('¿Seguro que deseas eliminar esta publicación del feed?')) return
    sound.playPop()

    setPostsFeed(prev => prev.filter(p => p.id !== postId))

    try {
      await supabase.from('feed_posts').update({ soft_deleted: true }).eq('id', postId)
      await fetch('/api/feed/eliminar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postId, userId: perfil?.id })
      })
    } catch (_) {}

    transmitirEvento('eliminar_feed_post', { postId })
    avisarToast('Publicación eliminada correctamente.')
  }

  // Cargar comentarios
  const cargarComentariosPost = async (postId) => {
    setCargandoComentarios(prev => ({ ...prev, [postId]: true }))
    try {
      const { data, error } = await supabase
        .from('feed_post_comments')
        .select(`
          id, post_id, contenido, created_at,
          profiles (id, nombre, username, color_acento, rol, avatar_emoji)
        `)
        .eq('post_id', postId)
        .order('created_at', { ascending: true })

      if (!error && data) {
        setComentariosPorPost(prev => ({ ...prev, [postId]: data }))
      } else {
        const resp = await fetch(`/api/feed/comentarios/${postId}`)
        const json = await resp.json()
        setComentariosPorPost(prev => ({ ...prev, [postId]: json.comentarios || [] }))
      }
    } catch (_) {
      setComentariosPorPost(prev => ({ ...prev, [postId]: [] }))
    } finally {
      setCargandoComentarios(prev => ({ ...prev, [postId]: false }))
    }
  }

  const handleToggleComentarios = (postId) => {
    const estaAbierto = Boolean(comentariosAbiertos[postId])
    setComentariosAbiertos(prev => ({ ...prev, [postId]: !estaAbierto }))
    if (!estaAbierto && !comentariosPorPost[postId]) {
      cargarComentariosPost(postId)
    }
  }

  const handleEnviarComentario = async (postId) => {
    const texto = (nuevoComentarioTexto[postId] || '').trim()
    if (!texto || !perfil || enviandoComentario) return

    setEnviandoComentario(true)
    sound.playPop()

    try {
      let nuevoCom = null

      try {
        const { data, error } = await supabase
          .from('feed_post_comments')
          .insert({
            post_id: postId,
            user_id: perfil.id,
            contenido: texto
          })
          .select(`
            id, post_id, contenido, created_at,
            profiles (id, nombre, username, color_acento, rol, avatar_emoji)
          `)
          .single()

        if (!error && data) nuevoCom = data
      } catch (_) {}

      if (!nuevoCom) {
        try {
          const resp = await fetch('/api/feed/comentar', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ postId, userId: perfil.id, contenido: texto })
          })
          const json = await resp.json()
          if (json.comentario) nuevoCom = json.comentario
        } catch (_) {}
      }

      if (nuevoCom) {
        setComentariosPorPost(prev => ({
          ...prev,
          [postId]: [...(prev[postId] || []), nuevoCom]
        }))
        setNuevoComentarioTexto(prev => ({ ...prev, [postId]: '' }))
        transmitirEvento('nuevo_feed_comentario', { postId, comentario: nuevoCom })
        triggerConfetti()

        if (!esModerador) {
          let nuevoSaldo = (perfil.puntos_total || 0) + 2
          try {
            const headers = { 'Content-Type': 'application/json' }
            try {
              const { data: sData } = await supabase.auth.getSession()
              if (sData?.session?.access_token) headers['Authorization'] = `Bearer ${sData.session.access_token}`
            } catch (_) {}
            if (perfil?.id) headers['x-user-id'] = perfil.id

            const cResp = await fetch('/api/ruleta/feed-recompensa', {
              method: 'POST',
              headers,
              body: JSON.stringify({
                puntos: 2,
                motivo: 'Comentario en feed',
                idempotency_key: `feed_com_${perfil.id}_${Date.now()}`
              })
            })
            const cData = await cResp.json()
            if (cData?.nuevoSaldo !== undefined) {
              nuevoSaldo = cData.nuevoSaldo
            }
          } catch (_) {}

          setPerfil(p => ({ ...p, puntos_total: nuevoSaldo }))
          localStorage.setItem('racha_local_user', JSON.stringify({ ...perfil, puntos_total: nuevoSaldo }))
          window.dispatchEvent(new CustomEvent('steveneuros_actualizados', { detail: { puntos: nuevoSaldo, userId: perfil.id } }))
          transmitirEvento('steveneuros_actualizados', { alumnoId: perfil.id, nuevosPuntos: nuevoSaldo, userId: perfil.id })
        }
      }
    } catch (err) {
      console.warn('Error al enviar comentario:', err)
    } finally {
      setEnviandoComentario(false)
    }
  }

  // Check-in rápido
  const handleCheckinRapido = async () => {
    if (!perfil) return
    sound.playStamp()
    const horaActual = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    const ptsCheckin = calcularPuntosGanados('checkin')

    const solicitud = {
      userId: perfil.id,
      nombre: perfil.nombre,
      hora: horaActual,
      fecha: fechaHoy,
      esTarde: false,
      puntos: ptsCheckin
    }

    try {
      const { data } = await supabase.from('checkins').insert([{
        user_id: perfil.id,
        fecha: fechaHoy,
        hora: horaActual,
        puntos_ganados: ptsCheckin
      }]).select().single()

      if (data) {
        setAsistenciaConfirmada(data)
        const nuevoSaldo = (perfil.puntos_total || 0) + ptsCheckin
        const nuevaRacha = (perfil.racha_actual || 0) + 1
        setPerfil(p => ({ ...p, puntos_total: nuevoSaldo, racha_actual: nuevaRacha }))
        localStorage.setItem('racha_local_user', JSON.stringify({ ...perfil, puntos_total: nuevoSaldo, racha_actual: nuevaRacha }))
        triggerConfetti()
        avisarToast(`¡Asistencia sellada! +${ptsCheckin} SE acreditados.`, 'exito')
      }
    } catch (_) {
      setSolicitudPendiente(solicitud)
      transmitirEvento('solicitud_asistencia', solicitud)
      avisarToast('Solicitud de presencia enviada a lominoño.')
    }
  }

  // Copiar código o comando al portapapeles
  const handleCopiarComando = (codigo) => {
    if (navigator?.clipboard) {
      navigator.clipboard.writeText(codigo)
      sound.playPop()
      avisarToast('Comando copiado al portapapeles', 'exito')
    }
  }

  // Compartir publicación
  const handleCompartirPost = async (item) => {
    sound.playPop()
    if (navigator?.share) {
      try {
        await navigator.share({
          title: item.titulo || `Publicación de ${item.autorLimpio} en Muudel`,
          text: item.contenido,
          url: window.location.href
        })
        return
      } catch (_) {}
    }

    if (navigator?.clipboard) {
      navigator.clipboard.writeText(item.contenido)
      avisarToast('Contenido copiado al portapapeles', 'exito')
    }
  }

  // Filtrado reactivo de items
  const itemsTimeline = useMemo(() => {
    let base = postsFeed
    if (tabActiva === 'tips') {
      base = postsFeed.filter(p => ['Truco', 'Linux', 'Redes', 'Comando'].includes(p.categoria))
    } else if (tabActiva === 'respuestas') {
      base = respuestasFeed
    }

    if (filtroCategoria !== 'todas') {
      base = base.filter(p => (p.categoria || '').toLowerCase() === filtroCategoria.toLowerCase())
    }

    if (busquedaQuery.trim()) {
      const q = busquedaQuery.toLowerCase().trim()
      base = base.filter(p =>
        (p.contenido || '').toLowerCase().includes(q) ||
        (p.titulo || '').toLowerCase().includes(q) ||
        (p.autor || '').toLowerCase().includes(q) ||
        (p.categoria || '').toLowerCase().includes(q)
      )
    }

    return [...base].sort((a, b) => {
      if (a.fijado && !b.fijado) return -1
      if (!a.fijado && b.fijado) return 1
      return 0
    })
  }, [postsFeed, respuestasFeed, tabActiva, filtroCategoria, busquedaQuery])

  // Conteo de publicaciones por categoría para el sidebar de PC
  const conteoCategorias = useMemo(() => {
    const mapa = { todas: postsFeed.length }
    postsFeed.forEach(p => {
      const c = p.categoria || 'General'
      mapa[c] = (mapa[c] || 0) + 1
    })
    return mapa
  }, [postsFeed])

  // Renderizador de texto con formateo de terminal y comandos monospace
  const renderizarTextoConComandos = (texto) => {
    if (!texto) return null
    const bloques = texto.split(/(```[\s\S]*?```)/g)

    return bloques.map((bloque, bIdx) => {
      if (bloque.startsWith('```') && bloque.endsWith('```')) {
        const codigoLimpio = bloque.replace(/^```[a-zA-Z]*\n?/, '').replace(/```$/, '').trim()
        return (
          <div
            key={bIdx}
            style={{
              margin: '8px 0',
              borderRadius: 10,
              backgroundColor: '#1E1E1E',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              overflow: 'hidden',
              fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace'
            }}
          >
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '6px 12px',
              backgroundColor: '#2D2D2D',
              borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
              fontSize: 11,
              color: '#9E9E9E'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Terminal size={12} color="#0A84FF" />
                <span style={{ fontWeight: 600 }}>Comando / Código SMR2</span>
              </div>
              <button
                type="button"
                onClick={() => handleCopiarComando(codigoLimpio)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#0A84FF',
                  cursor: 'pointer',
                  fontSize: 11,
                  fontWeight: 600,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4
                }}
              >
                <Copy size={11} />
                <span>Copiar</span>
              </button>
            </div>
            <pre style={{
              margin: 0,
              padding: '10px 12px',
              color: '#34C759',
              fontSize: 13,
              lineHeight: 1.45,
              overflowX: 'auto',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-all'
            }}>
              <code>{codigoLimpio}</code>
            </pre>
          </div>
        )
      }

      // Si tiene comandos inline entre comillas invertidas `comando`
      const partesInline = bloque.split(/(`[^`]+`)/g)
      return (
        <span key={bIdx}>
          {partesInline.map((pInline, pIdx) => {
            if (pInline.startsWith('`') && pInline.endsWith('`') && pInline.length > 2) {
              const cmd = pInline.slice(1, -1)
              return (
                <code
                  key={pIdx}
                  onClick={() => handleCopiarComando(cmd)}
                  title="Pulsar para copiar"
                  style={{
                    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                    backgroundColor: 'var(--color-surface-secondary)',
                    color: 'var(--color-accent)',
                    padding: '2px 6px',
                    borderRadius: 6,
                    fontSize: '0.9em',
                    border: '1px solid var(--color-separator)',
                    cursor: 'pointer'
                  }}
                >
                  {cmd}
                </code>
              )
            }
            return pInline
          })}
        </span>
      )
    })
  }

  return (
    <div style={{
      maxWidth: esDesktop ? 1160 : '100%',
      margin: '0 auto',
      minHeight: '100vh',
      padding: esDesktop ? '16px 20px 80px' : '0 0 96px',
      display: esDesktop ? 'flex' : 'block',
      gap: 24,
      alignItems: 'flex-start'
    }}>
      {/* Toast Flotante de Notificación */}
      {toastNotif && (
        <aside
          role="status"
          style={{
            position: 'fixed',
            bottom: 84,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 9999,
            backgroundColor: toastNotif.tipo === 'error' ? 'var(--color-negative)' : '#1C1C1E',
            color: '#FFFFFF',
            padding: '10px 18px',
            borderRadius: 9999,
            fontSize: 13,
            fontWeight: 700,
            boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            border: '1px solid rgba(255, 255, 255, 0.15)'
          }}
        >
          {toastNotif.tipo === 'error' ? <X size={15} /> : <Check size={15} color="var(--color-positive)" />}
          <span>{toastNotif.mensaje}</span>
        </aside>
      )}

      {/* ========================================================================= */}
      {/* COLUMNA PRINCIPAL: TIMELINE (EN MÓVIL ES COMPLETA, EN PC ES EL PANEL IZQ) */}
      {/* ========================================================================= */}
      <div style={{
        flex: 1,
        minWidth: 0,
        maxWidth: esDesktop ? 740 : '100%',
        backgroundColor: 'var(--color-surface)',
        borderRadius: esDesktop ? 18 : 0,
        border: esDesktop ? '1px solid var(--color-separator)' : 'none',
        boxShadow: esDesktop ? '0 2px 14px rgba(0, 0, 0, 0.04)' : 'none',
        overflow: 'hidden'
      }}>
        {/* CABECERA STICKY DEL FEED */}
        <header style={{
          position: 'sticky',
          top: 0,
          zIndex: 90,
          backgroundColor: 'var(--tab-bar-bg)',
          backdropFilter: 'blur(18px)',
          WebkitBackdropFilter: 'blur(18px)',
          borderBottom: '1px solid var(--color-separator)'
        }}>
          {/* Barra superior de controles */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: esDesktop ? '12px 18px' : '10px 14px',
            gap: 10
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: esDesktop ? 20 : 17, fontWeight: 900, letterSpacing: -0.5, color: 'var(--color-ink)' }}>
                Feed SMR2
              </span>

              {/* Botón de refrescar en vivo */}
              <button
                type="button"
                onClick={() => cargarFeedCompleto(false)}
                title="Actualizar publicaciones del aula"
                disabled={refrescando}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--color-secondary-ink)',
                  cursor: 'pointer',
                  padding: 4,
                  display: 'inline-flex',
                  alignItems: 'center'
                }}
              >
                <RefreshCw
                  size={15}
                  style={{
                    animation: refrescando ? 'spin 0.8s linear infinite' : 'none',
                    opacity: refrescando ? 1 : 0.7
                  }}
                />
              </button>

              {avisoHoy && (
                <span
                  title={avisoHoy}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                    fontSize: 11,
                    fontWeight: 700,
                    backgroundColor: 'rgba(255, 149, 0, 0.12)',
                    color: '#D97706',
                    padding: '2px 8px',
                    borderRadius: 9999
                  }}
                >
                  <Megaphone size={11} />
                  <span>Aviso</span>
                </span>
              )}
            </div>

            {/* Controles de Racha, Monedas y Perfil */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {/* Buscador toggle en móvil */}
              {!esDesktop && (
                <button
                  type="button"
                  onClick={() => setBusquedaAbiertaMovil(prev => !prev)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: busquedaQuery ? 'var(--color-accent)' : 'var(--color-secondary-ink)',
                    padding: 6,
                    cursor: 'pointer'
                  }}
                  title="Buscar en el feed"
                >
                  <Search size={18} />
                </button>
              )}

              {/* Chip de Racha */}
              <div
                title={`Racha actual: ${perfil?.racha_actual || 0} días`}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                  padding: '4px 9px',
                  borderRadius: 9999,
                  backgroundColor: 'rgba(255, 59, 48, 0.1)',
                  color: 'var(--color-negative)',
                  fontSize: 12,
                  fontWeight: 800
                }}
              >
                <Flame size={14} />
                <span>{perfil?.racha_actual || 0}d</span>
              </div>

              {/* Chip de StevenEuros (Abre Tienda) */}
              <button
                type="button"
                onClick={() => { sound.playPop(); setMostrarTienda(true) }}
                title="Abrir tienda de recompensas"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 5,
                  padding: '4px 10px',
                  borderRadius: 9999,
                  backgroundColor: 'rgba(255, 149, 0, 0.12)',
                  color: '#D97706',
                  border: '1px solid rgba(255, 149, 0, 0.25)',
                  fontSize: 12,
                  fontWeight: 800,
                  cursor: 'pointer'
                }}
              >
                <ShoppingBag size={13} />
                <span>{perfil?.puntos_total || 0} SE 💶</span>
              </button>

              {/* Avatar del usuario */}
              <div onClick={() => navigate('/perfil')} style={{ cursor: 'pointer' }}>
                <AvatarUsuario
                  nombre={perfil?.nombre || 'Usuario'}
                  color={perfil?.color_acento || '#007AFF'}
                  rol={perfil?.rol || 'alumno'}
                  size={32}
                  marco={perfil?.marco_avatar}
                  showRoleBadge={false}
                />
              </div>
            </div>
          </div>

          {/* Input de Búsqueda Desplegable en Móvil */}
          {!esDesktop && busquedaAbiertaMovil && (
            <div style={{ padding: '0 14px 10px' }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                backgroundColor: 'var(--color-surface-secondary)',
                borderRadius: 10,
                padding: '6px 10px',
                border: '1px solid var(--color-separator)'
              }}>
                <Search size={15} color="var(--color-secondary-ink)" />
                <input
                  type="text"
                  placeholder="Buscar comando, tema o compañero..."
                  value={busquedaQuery}
                  onChange={(e) => setBusquedaQuery(e.target.value)}
                  style={{
                    flex: 1,
                    border: 'none',
                    outline: 'none',
                    backgroundColor: 'transparent',
                    fontSize: 13,
                    color: 'var(--color-ink)'
                  }}
                  autoFocus
                />
                {busquedaQuery && (
                  <button
                    type="button"
                    onClick={() => setBusquedaQuery('')}
                    style={{ background: 'none', border: 'none', padding: 2, cursor: 'pointer', color: 'var(--color-secondary-ink)' }}
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Pestañas de Navegación de Timeline */}
          <div style={{ display: 'flex', borderTop: '1px solid var(--color-separator)' }}>
            {[
              { id: 'para_ti', label: 'Para ti', count: postsFeed.length },
              { id: 'tips', label: 'Chuletas & Tips', count: postsFeed.filter(p => ['Truco', 'Linux', 'Redes', 'Comando'].includes(p.categoria)).length },
              { id: 'respuestas', label: 'Soluciones', count: respuestasFeed.length }
            ].map((t) => {
              const activa = tabActiva === t.id
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => { sound.playPop(); setTabActiva(t.id) }}
                  style={{
                    flex: 1,
                    padding: '11px 6px',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    position: 'relative',
                    fontSize: 13,
                    fontWeight: activa ? 800 : 500,
                    color: activa ? 'var(--color-ink)' : 'var(--color-secondary-ink)',
                    transition: 'color 0.15s ease',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6
                  }}
                >
                  <span>{t.label}</span>
                  {t.count > 0 && (
                    <span style={{
                      fontSize: 10,
                      fontWeight: 700,
                      padding: '1px 5px',
                      borderRadius: 9999,
                      backgroundColor: activa ? 'rgba(10, 132, 255, 0.12)' : 'var(--color-fill-secondary)',
                      color: activa ? 'var(--color-accent)' : 'var(--color-secondary-ink)'
                    }}>
                      {t.count}
                    </span>
                  )}
                  {activa && (
                    <div style={{
                      position: 'absolute',
                      bottom: 0,
                      left: '50%',
                      transform: 'translateX(-50%)',
                      width: 44,
                      height: 3,
                      borderRadius: 9999,
                      backgroundColor: 'var(--color-accent)'
                    }} />
                  )}
                </button>
              )
            })}
          </div>

          {/* Carrusel Horizontal de Categorías (Pill Selector) */}
          <div style={{
            display: 'flex',
            gap: 6,
            padding: '8px 14px',
            overflowX: 'auto',
            borderTop: '1px solid var(--color-separator)',
            scrollbarWidth: 'none',
            WebkitOverflowScrolling: 'touch'
          }}>
            {CATEGORIAS_VALIDAS.map((cat) => {
              const activa = filtroCategoria.toLowerCase() === cat.id.toLowerCase()
              const CatIcon = cat.icon
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => {
                    sound.playPop()
                    setFiltroCategoria(activa && cat.id !== 'todas' ? 'todas' : cat.id)
                  }}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 5,
                    padding: '5px 11px',
                    borderRadius: 9999,
                    fontSize: 12,
                    fontWeight: 700,
                    border: activa ? '1px solid var(--color-accent)' : '1px solid var(--color-separator)',
                    backgroundColor: activa ? 'rgba(10, 132, 255, 0.12)' : 'var(--color-surface-secondary)',
                    color: activa ? 'var(--color-accent)' : 'var(--color-secondary-ink)',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <CatIcon size={12} color={activa ? 'var(--color-accent)' : cat.color || 'currentColor'} />
                  <span>{cat.label}</span>
                </button>
              )
            })}
          </div>
        </header>

        {/* WIDGET MÓVIL: CLASE EN CURSO EN 1 LÍNEA (SOLO MÓVIL) */}
        {!esDesktop && (
          <div
            onClick={() => { sound.playPop(); setMostrarModalHorario(true) }}
            role="button"
            tabIndex={0}
            style={{
              padding: '8px 14px',
              backgroundColor: estadoHorario.estado === 'en_clase' ? 'rgba(52, 199, 89, 0.08)' : 'var(--color-surface-secondary)',
              borderBottom: '1px solid var(--color-separator)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              cursor: 'pointer',
              fontSize: 12
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
              <span style={{
                width: 7,
                height: 7,
                borderRadius: '50%',
                backgroundColor: estadoHorario.estado === 'en_clase' ? 'var(--color-positive)' : 'var(--color-warning)',
                flexShrink: 0
              }} />
              <strong style={{ color: 'var(--color-ink)' }}>
                {estadoHorario.claseActual?.codigo || 'SMR2'}:
              </strong>
              <span style={{ color: 'var(--color-secondary-ink)', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                {estadoHorario.claseActual?.nombre || 'Jornada escolar'}
              </span>
              {estadoHorario.minutosRestantes > 0 && (
                <span style={{ color: 'var(--color-accent)', fontWeight: 700, flexShrink: 0 }}>
                  ({estadoHorario.minutosRestantes} min)
                </span>
              )}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 2, color: 'var(--color-accent)', fontWeight: 700, flexShrink: 0 }}>
              <span>Horario</span>
              <ChevronRight size={13} />
            </div>
          </div>
        )}

        {/* BANNER COMPACTO DE ASISTENCIA 15:30 */}
        {bannerAsistenciaVisible && (
          <div style={{
            padding: '8px 16px',
            borderBottom: '1px solid var(--color-separator)',
            backgroundColor: asistenciaConfirmada ? 'rgba(52, 199, 89, 0.06)' : 'rgba(10, 132, 255, 0.06)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 10
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, minWidth: 0 }}>
              {asistenciaConfirmada ? (
                <>
                  <CheckCircle2 size={16} color="var(--color-positive)" />
                  <span style={{ fontWeight: 600, color: 'var(--color-positive)' }}>
                    Asistencia sellada hoy a las {asistenciaConfirmada.hora || '15:30'} (+{asistenciaConfirmada.puntos_ganados || calcularPuntosGanados('checkin')} SE)
                  </span>
                </>
              ) : solicitudPendiente ? (
                <>
                  <Clock size={16} color="var(--color-warning)" />
                  <span style={{ fontWeight: 600, color: 'var(--color-warning)' }}>
                    Solicitud enviada a lominoño. Esperando confirmación...
                  </span>
                </>
              ) : (
                <>
                  <Clock size={16} color="var(--color-accent)" />
                  <span style={{ fontWeight: 600, color: 'var(--color-ink)' }}>
                    Clase de las 15:30: Sella tu presencia en el aula
                  </span>
                </>
              )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
              {!asistenciaConfirmada && !solicitudPendiente && (
                <button
                  type="button"
                  onClick={handleCheckinRapido}
                  style={{
                    backgroundColor: 'var(--color-accent)',
                    color: '#FFFFFF',
                    border: 'none',
                    borderRadius: 9999,
                    padding: '4px 12px',
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  Sellar (+{calcularPuntosGanados('checkin')} SE)
                </button>
              )}
              <button
                type="button"
                onClick={() => setBannerAsistenciaVisible(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--color-secondary-ink)',
                  padding: 4
                }}
              >
                <X size={14} />
              </button>
            </div>
          </div>
        )}

        {/* COMPOSITOR DE PUBLICACIONES */}
        <section style={{
          padding: esDesktop ? '16px 18px' : '12px 14px',
          borderBottom: '1px solid var(--color-separator)',
          backgroundColor: 'var(--color-surface)',
          display: 'flex',
          gap: 12
        }}>
          <AvatarUsuario
            nombre={perfil?.nombre || 'Yo'}
            color={perfil?.color_acento || '#007AFF'}
            rol={perfil?.rol || 'alumno'}
            size={esDesktop ? 42 : 36}
          />

          <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {esModerador && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                fontSize: 11,
                fontWeight: 700,
                color: 'var(--color-accent)',
                backgroundColor: 'rgba(10, 132, 255, 0.08)',
                padding: '4px 10px',
                borderRadius: 8,
                border: '1px solid rgba(10, 132, 255, 0.2)'
              }}>
                <ShieldCheck size={13} />
                <span>Publicando como: {perfil?.nombre || 'lominoño'} (Post de administración)</span>
              </div>
            )}

            <textarea
              ref={composerRef}
              rows={textoPost.includes('\n') || (esDesktop && textoPost.length > 50) ? 3 : 2}
              value={textoPost}
              onChange={(e) => setTextoPost(e.target.value)}
              onKeyDown={(e) => {
                if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                  handlePublicarPost(e)
                }
              }}
              onFocus={() => setComposerExpandidoMovil(true)}
              placeholder={esModerador ? 'Publicar comunicado oficial o tip técnico para la clase...' : '¿Qué estás aprendiendo hoy? Comparte un comando bash, chuleta de redes o duda...'}
              style={{
                width: '100%',
                border: 'none',
                outline: 'none',
                backgroundColor: 'transparent',
                fontSize: esDesktop ? 15 : 14,
                lineHeight: 1.45,
                resize: 'none',
                fontFamily: 'inherit',
                color: 'var(--color-ink)'
              }}
            />

            {/* Categorías pill selector en el compositor */}
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
              {(esModerador
                ? ['Aviso', 'Linux', 'Redes', 'Truco', 'Duda', 'General']
                : ['Truco', 'Linux', 'Redes', 'Duda', 'General']
              ).map(cat => {
                const sel = categoriaPost === cat
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setCategoriaPost(cat)}
                    style={{
                      padding: '3px 8px',
                      borderRadius: 9999,
                      fontSize: 11,
                      fontWeight: 700,
                      border: sel ? '1px solid var(--color-accent)' : '1px solid var(--color-separator)',
                      backgroundColor: sel ? 'rgba(10, 132, 255, 0.12)' : 'var(--color-fill-secondary)',
                      color: sel ? 'var(--color-accent)' : 'var(--color-secondary-ink)',
                      cursor: 'pointer'
                    }}
                  >
                    #{cat}
                  </button>
                )
              })}

              {/* Botón rápido para insertar bloque de código */}
              <button
                type="button"
                onClick={() => {
                  setTextoPost(prev => prev + '\n```bash\n# comando de terminal\n\n```\n')
                  composerRef.current?.focus()
                }}
                title="Insertar bloque de comandos bash / linux"
                style={{
                  background: 'none',
                  border: '1px solid var(--color-separator)',
                  borderRadius: 6,
                  padding: '2px 7px',
                  fontSize: 11,
                  color: 'var(--color-secondary-ink)',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4
                }}
              >
                <Terminal size={11} />
                <span>+ Código</span>
              </button>

              {esModerador && (
                <label style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 600, color: 'var(--color-secondary-ink)', cursor: 'pointer', marginLeft: 6 }}>
                  <input
                    type="checkbox"
                    checked={fijarPostAdmin}
                    onChange={(e) => setFijarPostAdmin(e.target.checked)}
                    style={{ accentColor: 'var(--color-accent)' }}
                  />
                  <span>📌 Fijar</span>
                </label>
              )}
            </div>

            {/* Barra inferior del compositor */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderTop: '1px solid var(--color-separator)',
              paddingTop: 8,
              marginTop: 4,
              flexWrap: 'wrap',
              gap: 8
            }}>
              <div>
                {!esModerador ? (
                  <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-accent)' }}>
                    🎁 Ganas +{Math.max(1, Math.round((Number(configRec?.puntosPostFeed) || 10) * (Number(configRec?.multiplicadorGlobal) || 1)))} SE al publicar contenido técnico
                  </span>
                ) : (
                  <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-positive)' }}>
                    ✓ Comunicado Oficial Verificado
                  </span>
                )}
                {esDesktop && (
                  <span style={{ fontSize: 11, color: 'var(--color-tertiary-ink)', marginLeft: 8 }}>
                    (Ctrl + Enter para enviar)
                  </span>
                )}
              </div>

              <button
                type="button"
                onClick={handlePublicarPost}
                disabled={!textoPost.trim() || publicando}
                style={{
                  backgroundColor: textoPost.trim() ? 'var(--color-accent)' : 'rgba(10, 132, 255, 0.4)',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: 9999,
                  padding: '6px 18px',
                  fontSize: 13,
                  fontWeight: 800,
                  cursor: textoPost.trim() ? 'pointer' : 'default',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  transition: 'all 0.15s ease'
                }}
              >
                <Send size={13} />
                <span>{publicando ? 'Publicando...' : (esModerador ? 'Publicar Oficial' : 'Postear')}</span>
              </button>
            </div>
          </div>
        </section>

        {/* BANNER SI HAY FILTRO ACTIVO */}
        {(filtroCategoria !== 'todas' || busquedaQuery) && (
          <div style={{
            padding: '8px 16px',
            backgroundColor: 'var(--color-surface-secondary)',
            borderBottom: '1px solid var(--color-separator)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: 12
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ color: 'var(--color-secondary-ink)' }}>Filtrando por:</span>
              {filtroCategoria !== 'todas' && (
                <strong style={{ color: 'var(--color-accent)' }}>#{filtroCategoria}</strong>
              )}
              {busquedaQuery && (
                <strong style={{ color: 'var(--color-ink)' }}>"{busquedaQuery}"</strong>
              )}
              <span style={{ color: 'var(--color-secondary-ink)' }}>({itemsTimeline.length} resultados)</span>
            </div>
            <button
              type="button"
              onClick={() => { setFiltroCategoria('todas'); setBusquedaQuery('') }}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--color-accent)',
                fontWeight: 700,
                cursor: 'pointer',
                fontSize: 11
              }}
            >
              Mostrar todos
            </button>
          </div>
        )}

        {/* TIMELINE DE PUBLICACIONES */}
        <main style={{ display: 'flex', flexDirection: 'column' }}>
          {cargandoPosts && itemsTimeline.length === 0 && (
            <div style={{ padding: '40px 16px', textAlign: 'center', color: 'var(--color-secondary-ink)' }}>
              <Sparkles size={24} style={{ opacity: 0.5, margin: '0 auto 8px', display: 'block' }} />
              <span style={{ fontSize: 13 }}>Cargando publicaciones de la clase...</span>
            </div>
          )}

          {!cargandoPosts && itemsTimeline.length === 0 && (
            <div style={{ padding: '48px 24px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
              <Sparkles size={32} color="var(--color-accent)" style={{ opacity: 0.4 }} />
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800 }}>No hay publicaciones para mostrar</h3>
              <p style={{ margin: 0, fontSize: 13, color: 'var(--color-secondary-ink)', maxWidth: 320 }}>
                {busquedaQuery || filtroCategoria !== 'todas'
                  ? 'Prueba a cambiar el filtro o el término de búsqueda.'
                  : 'Sé el primero del aula en compartir un comando, apunte o duda.'}
              </p>
            </div>
          )}

          {itemsTimeline.map((item) => {
            const yaLeDiLike = Boolean(likesDados[item.id])
            const yaRepostee = Boolean(repostsDados[item.id])
            const esRespuesta = item.tipo === 'respuesta'
            const esAdminPost = item.esAdministracion || item.rol === 'moderador'
            const puedeBorrar = esModerador || item.userId === perfil?.id
            const comentariosEstePost = comentariosPorPost[item.id] || []
            const comentariosAbiertosEstePost = Boolean(comentariosAbiertos[item.id])

            return (
              <article
                key={item.id}
                style={{
                  padding: esDesktop ? '16px 18px' : '14px 14px',
                  borderBottom: '1px solid var(--color-separator)',
                  display: 'flex',
                  gap: 12,
                  backgroundColor: item.fijado ? 'rgba(10, 132, 255, 0.03)' : 'transparent',
                  transition: 'background-color 0.12s ease'
                }}
              >
                {/* Columna Izquierda: Avatar */}
                <div style={{ flexShrink: 0 }}>
                  <AvatarUsuario
                    nombre={item.autorLimpio || item.autor}
                    color={item.color || '#007AFF'}
                    rol={item.rol || 'alumno'}
                    size={esDesktop ? 42 : 36}
                    fontSize={13}
                  />
                </div>

                {/* Columna Derecha: Cabecera, Contenido y Acciones */}
                <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {/* Cabecera del post */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0, flexWrap: 'wrap' }}>
                      <span style={{ fontWeight: 800, fontSize: 14, color: 'var(--color-ink)' }}>
                        {item.autor}
                      </span>

                      {esAdminPost && (
                        <span
                          style={{
                            fontSize: 10,
                            fontWeight: 700,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 3,
                            backgroundColor: 'rgba(10, 132, 255, 0.12)',
                            color: '#0A84FF',
                            padding: '1px 6px',
                            borderRadius: 6,
                            border: '1px solid rgba(10, 132, 255, 0.25)'
                          }}
                        >
                          <ShieldCheck size={11} />
                          Post de administración
                        </span>
                      )}

                      <span style={{ fontSize: 12, color: 'var(--color-secondary-ink)', opacity: 0.8 }}>
                        {item.username.startsWith('@') ? item.username : `@${item.username}`}
                      </span>
                      <span style={{ color: 'var(--color-secondary-ink)', opacity: 0.5 }}>·</span>
                      <span style={{ fontSize: 12, color: 'var(--color-secondary-ink)' }}>
                        {item.tiempoHace}
                      </span>

                      {item.fijado && (
                        <span style={{
                          fontSize: 10,
                          fontWeight: 800,
                          color: '#FF9500',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 2,
                          backgroundColor: 'rgba(255, 149, 0, 0.1)',
                          padding: '1px 6px',
                          borderRadius: 4
                        }}>
                          <Pin size={10} /> Fijado
                        </span>
                      )}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span
                        onClick={() => setFiltroCategoria(item.categoria)}
                        title={`Filtrar por #${item.categoria}`}
                        style={{
                          fontSize: 11,
                          fontWeight: 700,
                          padding: '2px 7px',
                          borderRadius: 9999,
                          backgroundColor: esRespuesta ? 'rgba(52, 199, 89, 0.1)' : 'rgba(10, 132, 255, 0.08)',
                          color: esRespuesta ? 'var(--color-positive)' : 'var(--color-accent)',
                          flexShrink: 0,
                          cursor: 'pointer'
                        }}
                      >
                        #{item.categoria || (esRespuesta ? 'Reto' : 'Tip')}
                      </span>

                      {puedeBorrar && (
                        <button
                          type="button"
                          onClick={() => handleEliminarPost(item.id)}
                          title="Eliminar publicación"
                          style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            color: 'var(--color-secondary-ink)',
                            padding: 4,
                            display: 'inline-flex',
                            alignItems: 'center',
                            opacity: 0.7
                          }}
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Título opcional si existe */}
                  {item.titulo && !esRespuesta && item.titulo !== item.contenido && (
                    <h4 style={{ margin: 0, fontSize: 14, fontWeight: 800, color: 'var(--color-ink)' }}>
                      {item.titulo}
                    </h4>
                  )}

                  {/* Cuerpo del post con formateo de comandos y markdown */}
                  <div style={{
                    fontSize: 14,
                    lineHeight: 1.5,
                    color: 'var(--color-ink)',
                    wordBreak: 'break-word',
                    whiteSpace: 'pre-line'
                  }}>
                    {renderizarTextoConComandos(item.contenido)}
                  </div>

                  {/* Fila de Interacciones (Thumb-Friendly en móvil) */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    maxWidth: 380,
                    marginTop: 6,
                    color: 'var(--color-secondary-ink)'
                  }}>
                    {/* Botón Comentarios */}
                    <button
                      type="button"
                      title="Ver o responder comentarios"
                      onClick={() => handleToggleComentarios(item.id)}
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 5,
                        color: comentariosAbiertosEstePost ? 'var(--color-accent)' : 'inherit',
                        fontSize: 12,
                        minHeight: 38,
                        minWidth: 44,
                        padding: '4px 6px'
                      }}
                    >
                      <MessageSquare size={16} />
                      <span>{comentariosEstePost.length}</span>
                    </button>

                    {/* Botón Repost */}
                    <button
                      type="button"
                      title="Impulsar en el aula"
                      onClick={() => handleRepost(item.id)}
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 5,
                        color: yaRepostee ? 'var(--color-positive)' : 'inherit',
                        fontSize: 12,
                        minHeight: 38,
                        minWidth: 44,
                        padding: '4px 6px'
                      }}
                    >
                      <Repeat2 size={16} />
                      <span>{yaRepostee ? 1 : 0}</span>
                    </button>

                    {/* Botón Me Gusta */}
                    <button
                      type="button"
                      title="Me gusta"
                      onClick={() => handleToggleLike(item.id, !esRespuesta)}
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 5,
                        color: yaLeDiLike ? '#FF3B30' : 'inherit',
                        fontSize: 12,
                        minHeight: 38,
                        minWidth: 44,
                        padding: '4px 6px',
                        transition: 'color 0.12s ease'
                      }}
                    >
                      <Heart size={16} fill={yaLeDiLike ? '#FF3B30' : 'none'} color={yaLeDiLike ? '#FF3B30' : 'currentColor'} />
                      <span>{item.likes || 0}</span>
                    </button>

                    {/* Botón Compartir */}
                    <button
                      type="button"
                      title="Compartir publicación"
                      onClick={() => handleCompartirPost(item)}
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 5,
                        color: 'inherit',
                        fontSize: 12,
                        minHeight: 38,
                        minWidth: 44,
                        padding: '4px 6px'
                      }}
                    >
                      <Share2 size={15} />
                    </button>
                  </div>

                  {/* HILO DE COMENTARIOS INLINE */}
                  {comentariosAbiertosEstePost && (
                    <div style={{
                      marginTop: 10,
                      paddingTop: 10,
                      borderTop: '1px solid var(--color-separator)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 8
                    }}>
                      {cargandoComentarios[item.id] && comentariosEstePost.length === 0 && (
                        <div style={{ fontSize: 12, color: 'var(--color-secondary-ink)', padding: 6 }}>
                          Cargando comentarios...
                        </div>
                      )}

                      {comentariosEstePost.map((c, cIdx) => {
                        const cProf = c.profiles
                        const cEsAdmin = cProf?.rol === 'moderador' || !cProf
                        const cNombre = cEsAdmin ? `${cProf?.nombre || 'lominoño'} (Post de administración)` : (cProf?.nombre || 'Alumno')

                        return (
                          <div key={c.id || cIdx} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                            <CornerDownRight size={13} color="var(--color-secondary-ink)" style={{ marginTop: 6, flexShrink: 0 }} />
                            <AvatarUsuario
                              nombre={cProf?.nombre || 'lominoño'}
                              color={cProf?.color_acento || '#007AFF'}
                              rol={cProf?.rol || 'alumno'}
                              size={26}
                              fontSize={10}
                            />
                            <div style={{
                              flex: 1,
                              backgroundColor: 'var(--color-surface-secondary)',
                              borderRadius: 10,
                              padding: '6px 10px',
                              fontSize: 12,
                              lineHeight: 1.4
                            }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                                <span style={{ fontWeight: 700, color: 'var(--color-ink)' }}>{cNombre}</span>
                                <span style={{ fontSize: 10, color: 'var(--color-secondary-ink)' }}>
                                  {calcularTiempoRelativo(c.created_at)}
                                </span>
                              </div>
                              <div style={{ color: 'var(--color-ink)', wordBreak: 'break-word' }}>
                                {c.contenido}
                              </div>
                            </div>
                          </div>
                        )
                      })}

                      {/* Input para responder */}
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 4 }}>
                        <input
                          type="text"
                          className="apple-input"
                          placeholder="Añade un aporte o duda técnica..."
                          value={nuevoComentarioTexto[item.id] || ''}
                          onChange={(e) => {
                            const val = e.target.value
                            setNuevoComentarioTexto(prev => ({ ...prev, [item.id]: val }))
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleEnviarComentario(item.id)
                          }}
                          style={{ flex: 1, height: 34, fontSize: 12 }}
                        />
                        <button
                          type="button"
                          disabled={!(nuevoComentarioTexto[item.id] || '').trim() || enviandoComentario}
                          onClick={() => handleEnviarComentario(item.id)}
                          className="btn-primary"
                          style={{ minHeight: 34, padding: '0 12px', fontSize: 12, fontWeight: 700 }}
                        >
                          Responder (+2 SE)
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </article>
            )
          })}
        </main>
      </div>

      {/* ========================================================================= */}
      {/* COLUMNA LATERAL DERECHA (EXCLUSIVA DE PC / PANTALLA ANCHA >= 1024px)      */}
      {/* ========================================================================= */}
      {esDesktop && (
        <aside style={{
          width: 360,
          flexShrink: 0,
          position: 'sticky',
          top: 16,
          display: 'flex',
          flexDirection: 'column',
          gap: 16
        }}>
          {/* WIDGET 1: HORARIO EN DIRECTO DEL AULA */}
          <div style={{
            backgroundColor: 'var(--color-surface)',
            borderRadius: 16,
            padding: 16,
            border: '1px solid var(--color-separator)',
            boxShadow: '0 2px 12px rgba(0,0,0,0.04)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Clock size={16} color="var(--color-accent)" />
                <h3 style={{ margin: 0, fontSize: 14, fontWeight: 800, color: 'var(--color-ink)' }}>
                  Clase en Directo SMR2
                </h3>
              </div>
              <span style={{
                fontSize: 10,
                fontWeight: 800,
                padding: '2px 7px',
                borderRadius: 9999,
                backgroundColor: estadoHorario.estado === 'en_clase'
                  ? 'rgba(52, 199, 89, 0.15)'
                  : estadoHorario.estado === 'en_descanso'
                  ? 'rgba(255, 149, 0, 0.15)'
                  : 'var(--color-surface-secondary)',
                color: estadoHorario.estado === 'en_clase'
                  ? 'var(--color-positive)'
                  : estadoHorario.estado === 'en_descanso'
                  ? 'var(--color-warning)'
                  : 'var(--color-secondary-ink)'
              }}>
                {estadoHorario.estado === 'en_clase' ? '● EN CURSO' : estadoHorario.estado === 'en_descanso' ? 'DESCANSO' : 'FINALIZADA'}
              </span>
            </div>

            <div style={{
              backgroundColor: 'var(--color-surface-secondary)',
              borderRadius: 12,
              padding: '12px 14px',
              marginBottom: 10,
              border: '1px solid var(--color-separator)'
            }}>
              <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--color-ink)' }}>
                {estadoHorario.claseActual?.nombre || 'Jornada fuera de horario'}
              </div>
              <div style={{ fontSize: 12, color: 'var(--color-secondary-ink)', marginTop: 2 }}>
                Profesor: {estadoHorario.claseActual?.profesor || 'lominoño'}
              </div>

              {estadoHorario.minutosRestantes > 0 && (
                <div style={{ marginTop: 10 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, fontWeight: 700, color: 'var(--color-secondary-ink)', marginBottom: 4 }}>
                    <span>Tiempo restante</span>
                    <span style={{ color: 'var(--color-accent)' }}>{estadoHorario.minutosRestantes} minutos</span>
                  </div>
                  <div style={{ height: 6, borderRadius: 9999, backgroundColor: 'rgba(0,0,0,0.1)', overflow: 'hidden' }}>
                    <div style={{
                      width: `${Math.min(100, Math.max(10, 100 - (estadoHorario.minutosRestantes / 50 * 100)))}%`,
                      height: '100%',
                      backgroundColor: 'var(--color-accent)',
                      borderRadius: 9999
                    }} />
                  </div>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => { sound.playPop(); setMostrarModalHorario(true) }}
              className="btn-secondary"
              style={{ width: '100%', minHeight: 36, fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
            >
              <Calendar size={13} />
              <span>Ver Horario Semanal Completo</span>
            </button>
          </div>

          {/* WIDGET 2: TEMAS Y CANALES TÉCNICOS SMR2 */}
          <div style={{
            backgroundColor: 'var(--color-surface)',
            borderRadius: 16,
            padding: 16,
            border: '1px solid var(--color-separator)',
            boxShadow: '0 2px 12px rgba(0,0,0,0.04)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
              <TrendingUp size={16} color="var(--color-accent)" />
              <h3 style={{ margin: 0, fontSize: 14, fontWeight: 800, color: 'var(--color-ink)' }}>
                Canales & Temas Técnicos
              </h3>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {CATEGORIAS_VALIDAS.map((cat) => {
                const activo = filtroCategoria.toLowerCase() === cat.id.toLowerCase()
                const count = conteoCategorias[cat.id] || 0
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => {
                      sound.playPop()
                      setFiltroCategoria(activo && cat.id !== 'todas' ? 'todas' : cat.id)
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '8px 12px',
                      borderRadius: 10,
                      border: activo ? '1px solid var(--color-accent)' : '1px solid var(--color-separator)',
                      backgroundColor: activo ? 'rgba(10, 132, 255, 0.08)' : 'var(--color-surface-secondary)',
                      color: activo ? 'var(--color-accent)' : 'var(--color-ink)',
                      fontSize: 13,
                      fontWeight: 600,
                      cursor: 'pointer',
                      transition: 'all 0.12s ease',
                      textAlign: 'left'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ color: cat.color || 'var(--color-secondary-ink)' }}>#</span>
                      <span>{cat.label}</span>
                    </div>
                    <span style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: 'var(--color-secondary-ink)',
                      backgroundColor: 'rgba(0,0,0,0.05)',
                      padding: '1px 6px',
                      borderRadius: 9999
                    }}>
                      {count}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* WIDGET 3: BILLETERA DE STEVETOKENS & TIENDA */}
          <div style={{
            backgroundColor: 'var(--color-surface)',
            borderRadius: 16,
            padding: 16,
            border: '1px solid var(--color-separator)',
            boxShadow: '0 2px 12px rgba(0,0,0,0.04)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <ShoppingBag size={16} color="var(--color-warning)" />
                <h3 style={{ margin: 0, fontSize: 14, fontWeight: 800, color: 'var(--color-ink)' }}>
                  Tu Economía de Clase
                </h3>
              </div>
              <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--color-negative)' }}>
                🔥 {perfil?.racha_actual || 0}d racha
              </span>
            </div>

            <div style={{
              display: 'flex',
              alignItems: 'baseline',
              gap: 6,
              marginBottom: 10
            }}>
              <span style={{ fontSize: 24, fontWeight: 900, color: 'var(--color-ink)', fontVariantNumeric: 'tabular-nums' }}>
                {perfil?.puntos_total || 0}
              </span>
              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-secondary-ink)' }}>
                StevenEuros (SE 💶)
              </span>
            </div>

            <button
              type="button"
              onClick={() => { sound.playPop(); setMostrarTienda(true) }}
              className="btn-primary"
              style={{ width: '100%', minHeight: 38, fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
            >
              <ShoppingBag size={14} />
              <span>Abrir Tienda de Recompensas</span>
            </button>
          </div>
        </aside>
      )}

      {/* MODAL TIENDA DE RECOMPENSAS VIRTUALES */}
      {mostrarTienda && (
        <TiendaRecompensas onClose={() => setMostrarTienda(false)} />
      )}

      {/* MODAL HORARIO SEMANAL */}
      <ModalHorario
        abierto={mostrarModalHorario}
        onCerrar={() => setMostrarModalHorario(false)}
      />
    </div>
  )
}

function calcularTiempoRelativo(fechaIso) {
  if (!fechaIso) return 'ahora'
  const diffSegundos = Math.floor((Date.now() - new Date(fechaIso).getTime()) / 1000)
  if (diffSegundos < 60) return `${Math.max(1, diffSegundos)}s`
  const diffMin = Math.floor(diffSegundos / 60)
  if (diffMin < 60) return `${diffMin}m`
  const diffHoras = Math.floor(diffMin / 60)
  if (diffHoras < 24) return `${diffHoras}h`
  const diffDias = Math.floor(diffHoras / 24)
  return `${diffDias}d`
}

export { PantallaHoy as PantallaFeed }
