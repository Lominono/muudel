// frontend/src/pages/PantallaHoy.jsx (Feed de Clase estilo X / Twitter)
import { useState, useEffect, useRef } from 'react'
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
  CornerDownRight
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

// Resolver autor: si es usuario inventado, moderador o del sistema, se muestra como (Post de administración)
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

// Posts oficiales de la administración garantizados en caso de tabla vacía o desconexión
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
    fijado: true
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
    contenido: `Para el examen de administración de sistemas, memorizad estas equivalencias octales:\nchmod 755 -> rwxr-xr-x (scripts ejecutables para todos)\nchmod 644 -> rw-r--r-- (archivos de configuración)\nchmod 600 -> rw------- (claves SSH id_rsa privadas)\n\nDiagnóstico de red: ss -tulpn && ip -br a`,
    tiempoHace: '2h',
    likes: 8,
    liked: false,
    fijado: false
  }
]

export function PantallaHoy() {
  const { perfil, setPerfil } = useAuth()
  const navigate = useNavigate()

  // Tabs estilo X: 'para_ti' | 'tips' | 'respuestas'
  const [tabActiva, setTabActiva] = useState('para_ti')

  // Modales
  const [mostrarTienda, setMostrarTienda] = useState(false)
  const [mostrarModalHorario, setMostrarModalHorario] = useState(false)
  const [avisoHoy, setAvisoHoy] = useState(() => localStorage.getItem('racha_aviso_hoy') || '')

  // Estado del horario oficial y clase en curso en tiempo real
  const [estadoHorario, setEstadoHorario] = useState(() => getEstadoHorarioCompleto())

  // Compositor inline estilo X
  const [textoPost, setTextoPost] = useState('')
  const [categoriaPost, setCategoriaPost] = useState('Truco') // 'Aviso' | 'Truco' | 'Linux' | 'Redes' | 'Duda' | 'General'
  const [fijarPostAdmin, setFijarPostAdmin] = useState(false)
  const [publicando, setPublicando] = useState(false)
  const composerRef = useRef(null)

  // Posts del feed — cargados desde Supabase tabla feed_posts
  const [postsFeed, setPostsFeed] = useState([])
  const [cargandoPosts, setCargandoPosts] = useState(true)

  // Respuestas a retos de alumnos
  const [respuestasFeed, setRespuestasFeed] = useState([])

  // Likes interactivos
  const [likesDados, setLikesDados] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(`muudel_feed_likes_${perfil?.id}`) || '{}')
    } catch (e) {
      return {}
    }
  })

  // Reposts dados localmente
  const [repostsDados, setRepostsDados] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(`muudel_feed_reposts_${perfil?.id}`) || '{}')
    } catch (e) {
      return {}
    }
  })

  // Comentarios interactivos por post
  const [comentariosAbiertos, setComentariosAbiertos] = useState({})
  const [comentariosPorPost, setComentariosPorPost] = useState({})
  const [cargandoComentarios, setCargandoComentarios] = useState({})
  const [nuevoComentarioTexto, setNuevoComentarioTexto] = useState({})
  const [enviandoComentario, setEnviandoComentario] = useState(false)

  // Estado compacto de asistencia 15:30
  const [asistenciaConfirmada, setAsistenciaConfirmada] = useState(null)
  const [solicitudPendiente, setSolicitudPendiente] = useState(null)
  const [bannerAsistenciaVisible, setBannerAsistenciaVisible] = useState(true)

  // Configuración de economía / ganancias de la clase
  const [configRec, setConfigRec] = useState(() => obtenerConfigRecompensas())

  const fechaHoy = new Date().toISOString().split('T')[0]

  // Carga inicial y suscripciones en tiempo real
  useEffect(() => {
    cargarFeedCompleto()

    // Intervalo en vivo para actualizar la clase actual y minutos restantes
    const timerHorario = setInterval(() => {
      setEstadoHorario(getEstadoHorarioCompleto())
    }, 15000)

    // Suscripción en tiempo real a nuevos posts
    const canalFeed = supabase
      .channel('feed-posts-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'feed_posts' }, () => {
        cargarFeedCompleto()
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'feed_post_comments' }, () => {
        // Actualizar comentarios en vivo si están abiertos
      })
      .subscribe()

    // Suscripciones de eventos Broadcast de clase
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

    // Sincronización en vivo del saldo de StevenEuros
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
      cargarFeedCompleto()
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

  const cargarFeedCompleto = async () => {
    setCargandoPosts(true)
    try {
      // 1. Cargar estado de check-in del usuario de hoy
      if (perfil) {
        const { data: miChk } = await supabase
          .from('checkins')
          .select('*')
          .eq('user_id', perfil.id)
          .eq('fecha', fechaHoy)
          .maybeSingle()

        if (miChk) {
          setAsistenciaConfirmada(miChk)
        }
      }

      // Cargar mis likes
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

      // 2. Cargar posts reales desde la tabla feed_posts
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
        // Fallback a API del backend
        try {
          const resp = await fetch('/api/feed/posts')
          const json = await resp.json()
          if (json.posts) rawPosts = json.posts
        } catch (_) {}
      }

      if (rawPosts && rawPosts.length > 0) {
        // Mapear cada post resolviendo de forma explícita si es alumno o (Post de administración)
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
            liked: Boolean(likedSet[p.id])
          }
        })
        setPostsFeed(mapeados)
      } else {
        // Si aún no hay posts creados en la base de datos, mostrar los oficiales de administración
        setPostsFeed(POSTS_ADMINISTRACION_OFICIALES)
      }

      // 3. Cargar respuestas y retos validados de alumnos reales desde Supabase
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
                liked: false
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
    }
  }

  // Enviar post desde el compositor inline estilo X
  const handlePublicarPost = async (e) => {
    if (e && e.preventDefault) e.preventDefault()
    const contenidoLimpio = textoPost.trim()
    if (!contenidoLimpio || !perfil || publicando) return

    setPublicando(true)
    sound.playStamp()

    const esModerador = perfil.rol === 'moderador'
    let tituloAuto = contenidoLimpio.split('\n')[0].substring(0, 65).trim()
    if (tituloAuto.length < 3) {
      tituloAuto = esModerador
        ? `Aviso de Administración`
        : `${categoriaPost} técnico de ${perfil.nombre}`
    }

    const analisisAntiIA = analizarTextoAntiIA(contenidoLimpio)

    try {
      let postCreado = null

      // 1. Intentar inserción directa en Supabase
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

        if (!error && data) {
          postCreado = data
        }
      } catch (_) {}

      // 2. Fallback a API con Service Key
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
          antiAi: analisisAntiIA
        }

        setPostsFeed(prev => [nuevo, ...prev])
        transmitirEvento('nuevo_feed_post', nuevo)
        setTextoPost('')
        setFijarPostAdmin(false)
        triggerConfetti()

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

          // Otorgar XP técnica
          let skillKey = 'autoria_tecnica'
          if (categoriaPost === 'Truco' || categoriaPost === 'Linux') skillKey = 'linux_bash'
          else if (categoriaPost === 'Redes') skillKey = 'redes_vlans'
          sumarXpSkill(perfil.id, skillKey, 15)
        }
      }
    } catch (err) {
      console.warn('Error al publicar post:', err)
    } finally {
      setPublicando(false)
    }
  }

  // Like reactivo estilo X
  const handleToggleLike = async (itemId, esPostReal = true) => {
    sound.playPop()
    const yaLeDi = Boolean(likesDados[itemId])

    // Optimistic UI update
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
        if (p.id === itemId) {
          return { ...p, likes: nuevoCount, liked: !yaLeDi }
        }
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
        // Fallback a API
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

  // Repost / Impulsar post
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
  }

  // Eliminar post del feed (por autor o moderador)
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
  }

  // Desplegar / cerrar hilo de comentarios de un post
  const handleToggleComentarios = async (postId) => {
    const estaAbierto = Boolean(comentariosAbiertos[postId])
    setComentariosAbiertos(prev => ({ ...prev, [postId]: !estaAbierto }))

    if (!estaAbierto && !comentariosPorPost[postId]) {
      setCargandoComentarios(prev => ({ ...prev, [postId]: true }))
      try {
        const { data, error } = await supabase
          .from('feed_post_comments')
          .select(`
            id, post_id, contenido, created_at,
            profiles (id, nombre, username, color_acento, rol, avatar_emoji)
          `)
          .eq('post_id', postId)
          .eq('soft_deleted', false)
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
  }

  // Enviar comentario a un post
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
          .insert({ post_id: postId, user_id: perfil.id, contenido: texto })
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

      if (!nuevoCom) {
        nuevoCom = {
          id: 'com_' + Date.now(),
          post_id: postId,
          contenido: texto,
          created_at: new Date().toISOString(),
          profiles: {
            id: perfil.id,
            nombre: perfil.nombre,
            username: perfil.username,
            rol: perfil.rol,
            color_acento: perfil.color_acento,
            avatar_emoji: perfil.avatar_emoji
          }
        }
      }

      setComentariosPorPost(prev => ({
        ...prev,
        [postId]: [...(prev[postId] || []), nuevoCom]
      }))
      setNuevoComentarioTexto(prev => ({ ...prev, [postId]: '' }))
      transmitirEvento('nuevo_feed_comentario', { postId, comentario: nuevoCom })

      // Micro-recompensa por comentar (+2 SE 💶 desde la Banca)
      if (perfil.rol !== 'moderador') {
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
      }
    } catch (_) {
      setSolicitudPendiente(solicitud)
      transmitirEvento('solicitud_asistencia', solicitud)
    }
  }

  // Filtrado de items
  const itemsTimeline = (() => {
    if (tabActiva === 'tips') {
      return postsFeed.filter(p => p.categoria === 'Truco' || p.categoria === 'Linux' || p.categoria === 'Redes')
    }
    if (tabActiva === 'respuestas') {
      return respuestasFeed
    }
    return postsFeed
  })()

  const esModerador = perfil?.rol === 'moderador'

  return (
    <div style={{
      maxWidth: 640,
      margin: '0 auto',
      minHeight: '100vh',
      backgroundColor: 'var(--color-surface)',
      borderLeft: '1px solid var(--color-separator)',
      borderRight: '1px solid var(--color-separator)',
      paddingBottom: 90
    }}>
      {/* 1. TOP HEADER ESTILO X (STICKY & MINIMALISTA) */}
      <header style={{
        position: 'sticky',
        top: 0,
        zIndex: 100,
        backgroundColor: 'var(--tab-bar-bg)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        borderBottom: '1px solid var(--color-separator)'
      }}>
        {/* Barra superior: Título, Puntos y Perfil */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '10px 16px',
          height: 52
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 18, fontWeight: 900, letterSpacing: -0.5, color: 'var(--color-ink)' }}>
              Feed SMR2
            </span>
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

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {/* Chip de Racha */}
            <div
              title={`Racha actual: ${perfil?.racha_actual || 0} días`}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                padding: '4px 10px',
                borderRadius: 9999,
                backgroundColor: 'rgba(255, 59, 48, 0.1)',
                color: '#FF3B30',
                fontSize: 12,
                fontWeight: 800
              }}
            >
              <Flame size={14} />
              <span>{perfil?.racha_actual || 0}d</span>
            </div>

            {/* Chip de Puntos (Abre tienda) */}
            <button
              type="button"
              onClick={() => { sound.playPop(); setMostrarTienda(true) }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                padding: '4px 11px',
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

            {/* Avatar del usuario con acceso a su perfil */}
            <div onClick={() => navigate('/perfil')} style={{ cursor: 'pointer' }}>
              <AvatarUsuario
                nombre={perfil?.nombre || 'Usuario'}
                color={perfil?.color_acento || '#007AFF'}
                rol={perfil?.rol || 'alumno'}
                size={34}
                marco={perfil?.marco_avatar}
                showRoleBadge={false}
              />
            </div>
          </div>
        </div>

        {/* Pestañas de navegación de Timeline estilo X */}
        <div style={{ display: 'flex', borderTop: '1px solid var(--color-separator)' }}>
          {[
            { id: 'para_ti', label: 'Para ti' },
            { id: 'tips', label: 'Chuletas & Tips' },
            { id: 'respuestas', label: `Soluciones (${respuestasFeed.length})` }
          ].map((tab) => {
            const activa = tabActiva === tab.id
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => { sound.playPop(); setTabActiva(tab.id) }}
                style={{
                  flex: 1,
                  padding: '12px 0',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  position: 'relative',
                  fontSize: 14,
                  fontWeight: activa ? 800 : 500,
                  color: activa ? 'var(--color-ink)' : 'var(--color-secondary-ink)',
                  transition: 'color 0.15s ease'
                }}
              >
                <span>{tab.label}</span>
                {activa && (
                  <div style={{
                    position: 'absolute',
                    bottom: 0,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    width: 48,
                    height: 3,
                    borderRadius: 9999,
                    backgroundColor: 'var(--color-accent)'
                  }} />
                )}
              </button>
            )
          })}
        </div>
      </header>

      {/* WIDGET EN VIVO: CLASE ACTUAL Y HORARIO DE AULA SMR2 */}
      <section
        onClick={() => { sound.playPop(); setMostrarModalHorario(true) }}
        role="button"
        tabIndex={0}
        title="Pulsar para abrir horario semanal completo"
        style={{
          margin: '10px 16px 8px',
          padding: '12px 14px',
          borderRadius: 14,
          backgroundColor: estadoHorario.estado === 'en_clase'
            ? 'rgba(52, 199, 89, 0.08)'
            : estadoHorario.estado === 'en_descanso'
            ? 'rgba(255, 149, 0, 0.08)'
            : 'var(--color-surface)',
          border: estadoHorario.estado === 'en_clase'
            ? '1px solid rgba(52, 199, 89, 0.35)'
            : estadoHorario.estado === 'en_descanso'
            ? '1px solid rgba(255, 149, 0, 0.35)'
            : '1px solid var(--color-separator)',
          boxShadow: estadoHorario.estado === 'en_clase'
            ? '0 2px 12px rgba(52, 199, 89, 0.12)'
            : '0 2px 8px rgba(0, 0, 0, 0.04)',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          transition: 'all 0.15s ease'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
          {/* Badge de Asignatura o Recreo */}
          <div style={{
            width: 44,
            height: 44,
            borderRadius: 12,
            backgroundColor: estadoHorario.claseActual?.colorBg || 'rgba(0, 122, 255, 0.12)',
            color: estadoHorario.claseActual?.color || 'var(--color-accent)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 900,
            fontSize: 13,
            letterSpacing: -0.2,
            flexShrink: 0
          }}>
            {estadoHorario.claseActual?.codigo ? (
              <span>{estadoHorario.claseActual.codigo}</span>
            ) : estadoHorario.estado === 'en_descanso' ? (
              <span style={{ fontSize: 18 }}>☕</span>
            ) : (
              <Calendar size={18} />
            )}
          </div>

          {/* Información de la Clase en Directo */}
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              <span style={{
                fontSize: 10,
                fontWeight: 800,
                padding: '2px 7px',
                borderRadius: 9999,
                backgroundColor: estadoHorario.estado === 'en_clase'
                  ? 'var(--color-positive)'
                  : estadoHorario.estado === 'en_descanso'
                  ? 'var(--color-warning)'
                  : 'var(--color-accent)',
                color: '#FFFFFF'
              }}>
                {estadoHorario.estado === 'en_clase' ? 'EN CLASE AHORA' : estadoHorario.estado === 'en_descanso' ? 'DESCANSO' : 'SMR2'}
              </span>
              <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--color-ink)' }}>
                {estadoHorario.claseActual?.nombre || 'Jornada escolar'}
              </span>
            </div>
            <div style={{ fontSize: 11, color: 'var(--color-secondary-ink)', marginTop: 2 }}>
              {estadoHorario.minutosRestantes ? `${estadoHorario.minutosRestantes} min restantes · ` : ''}Prof. {estadoHorario.claseActual?.profesor || 'lominoño'}
            </div>
          </div>
        </div>

        {/* Botón táctil para abrir horario */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          padding: '6px 10px',
          borderRadius: 8,
          backgroundColor: 'var(--color-surface-secondary)',
          border: '1px solid var(--color-separator)',
          color: 'var(--color-accent)',
          fontSize: 12,
          fontWeight: 700,
          flexShrink: 0
        }}>
          <Calendar size={13} />
          <span className="hidden sm:inline">Ver Horario</span>
          <ChevronRight size={14} />
        </div>
      </section>

      {/* 2. CHIP COMPACTO NO INVASIVO DE ASISTENCIA 15:30 */}
      {bannerAsistenciaVisible && (
        <div style={{
          padding: '8px 16px',
          borderBottom: '1px solid var(--color-separator)',
          backgroundColor: asistenciaConfirmada ? 'rgba(52, 199, 89, 0.06)' : 'rgba(0, 122, 255, 0.06)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 10
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
            {asistenciaConfirmada ? (
              <>
                <CheckCircle2 size={16} color="var(--color-positive)" />
                <span style={{ fontWeight: 600, color: 'var(--color-positive)' }}>
                  Asistencia sellada hoy a las {asistenciaConfirmada.hora || '15:30'} (+{asistenciaConfirmada.puntos_ganados || calcularPuntosGanados('checkin')} SE 💶)
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

          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {!asistenciaConfirmada && !solicitudPendiente && (
              <button
                type="button"
                onClick={handleCheckinRapido}
                style={{
                  backgroundColor: 'var(--color-accent)',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: 9999,
                  padding: '5px 12px',
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                Sellar (+{calcularPuntosGanados('checkin')} SE 💶)
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

      {/* 3. COMPOSITOR INLINE ESTILO X */}
      <section style={{
        padding: '14px 16px',
        borderBottom: '1px solid var(--color-separator)',
        display: 'flex',
        gap: 12,
        backgroundColor: 'var(--color-surface)'
      }}>
        {/* Avatar del autor */}
        <AvatarUsuario
          nombre={perfil?.nombre || 'Yo'}
          color={perfil?.color_acento || '#007AFF'}
          rol={perfil?.rol || 'alumno'}
          size={40}
        />

        {/* Input box */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {/* Indicador para moderadores */}
          {esModerador && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              fontSize: 11,
              fontWeight: 700,
              color: 'var(--color-accent)',
              backgroundColor: 'rgba(0, 122, 255, 0.08)',
              padding: '4px 10px',
              borderRadius: 8,
              border: '1px solid rgba(0, 122, 255, 0.2)'
            }}>
              <ShieldCheck size={13} />
              <span>Publicando como: {perfil?.nombre || 'lominoño'} (Post de administración)</span>
            </div>
          )}

          <textarea
            ref={composerRef}
            rows={textoPost.includes('\n') ? 3 : 2}
            value={textoPost}
            onChange={(e) => setTextoPost(e.target.value)}
            placeholder={esModerador ? 'Publicar comunicado oficial o tip técnico para la clase...' : '¿Qué está pasando en clase? Comparte un comando, duda o truco...'}
            style={{
              width: '100%',
              border: 'none',
              outline: 'none',
              backgroundColor: 'transparent',
              fontSize: 15,
              lineHeight: 1.45,
              resize: 'none',
              fontFamily: 'inherit',
              color: 'var(--color-ink)'
            }}
          />

          {/* Categorías pill selector */}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
            {(esModerador ? ['Aviso', 'Truco', 'Linux', 'Redes', 'Duda', 'General'] : ['Truco', 'Linux', 'Redes', 'Duda', 'General']).map(cat => {
              const sel = categoriaPost === cat
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategoriaPost(cat)}
                  style={{
                    padding: '3px 9px',
                    borderRadius: 9999,
                    fontSize: 11,
                    fontWeight: 700,
                    border: sel ? '1px solid var(--color-accent)' : '1px solid var(--color-separator)',
                    backgroundColor: sel ? 'rgba(0, 122, 255, 0.15)' : 'var(--color-fill-secondary)',
                    color: sel ? 'var(--color-accent)' : 'var(--color-secondary-ink)',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                >
                  #{cat}
                </button>
              )
            })}

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

          {/* Barra inferior del compositor: Recompensa y Botón Postear */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderTop: '1px solid var(--color-separator)',
            paddingTop: 8,
            marginTop: 4
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {!esModerador ? (
                <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-accent)' }}>
                  🎁 +{Math.max(1, Math.round((Number(configRec?.puntosPostFeed) || 10) * 0.5 * (Number(configRec?.multiplicadorGlobal) || 1)))} a +{Math.max(1, Math.round((Number(configRec?.puntosPostFeed) || 10) * (Number(configRec?.multiplicadorGlobal) || 1)))} StevenEuros (SE 💶) al publicar
                </span>
              ) : (
                <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-positive)' }}>
                  ✓ Post Oficial Verificado del Aula SMR2
                </span>
              )}
            </div>

            <button
              type="button"
              onClick={handlePublicarPost}
              disabled={!textoPost.trim() || publicando}
              style={{
                backgroundColor: textoPost.trim() ? 'var(--color-accent)' : 'rgba(0, 122, 255, 0.4)',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: 9999,
                padding: '7px 18px',
                fontSize: 13,
                fontWeight: 800,
                cursor: textoPost.trim() ? 'pointer' : 'default',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                boxShadow: textoPost.trim() ? '0 2px 8px rgba(0, 122, 255, 0.3)' : 'none',
                transition: 'all 0.15s ease'
              }}
            >
              <Send size={13} />
              <span>{publicando ? 'Publicando...' : (esModerador ? 'Publicar (Admin)' : 'Postear')}</span>
            </button>
          </div>
        </div>
      </section>

      {/* 4. STREAM DEL FEED ESTILO X (TIMELINE CONTINUO) */}
      <main style={{ display: 'flex', flexDirection: 'column' }}>
        {cargandoPosts && itemsTimeline.length === 0 && (
          <div style={{ padding: '36px 16px', textAlign: 'center', color: 'var(--color-secondary-ink)' }}>
            <Sparkles size={24} style={{ opacity: 0.5, margin: '0 auto 8px', display: 'block' }} />
            <span style={{ fontSize: 13 }}>Cargando actividad de clase...</span>
          </div>
        )}

        {!cargandoPosts && itemsTimeline.length === 0 && (
          <div style={{ padding: '48px 24px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
            <Sparkles size={32} color="var(--color-accent)" style={{ opacity: 0.4 }} />
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800 }}>El feed está en calma</h3>
            <p style={{ margin: 0, fontSize: 13, color: 'var(--color-secondary-ink)', maxWidth: 320 }}>
              Sé el primero de la clase en compartir un apunte, tip de examen o duda técnica.
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
                padding: '14px 16px',
                borderBottom: '1px solid var(--color-separator)',
                display: 'flex',
                gap: 12,
                backgroundColor: item.fijado ? 'rgba(0, 122, 255, 0.02)' : 'transparent',
                transition: 'background-color 0.1s ease'
              }}
              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = item.fijado ? 'rgba(0, 122, 255, 0.04)' : 'var(--color-fill-tertiary)' }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = item.fijado ? 'rgba(0, 122, 255, 0.02)' : 'transparent' }}
            >
              {/* Columna izquierda: Avatar */}
              <div style={{ flexShrink: 0 }}>
                <AvatarUsuario
                  nombre={item.autorLimpio || item.autor}
                  color={item.color || '#007AFF'}
                  rol={item.rol || 'alumno'}
                  size={40}
                  fontSize={13}
                />
              </div>

              {/* Columna derecha: Cabecera, Contenido y Acciones estilo X */}
              <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
                {/* Cabecera del tweet */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0, flexWrap: 'wrap' }}>
                    <span style={{ fontWeight: 800, fontSize: 14, color: 'var(--color-ink)' }}>
                      {item.autor}
                    </span>

                    {/* Badge destacado de Post de Administración */}
                    {esAdminPost && (
                      <span
                        className="apple-badge apple-badge-accent"
                        style={{
                          fontSize: 10,
                          fontWeight: 700,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 3,
                          backgroundColor: 'rgba(10, 132, 255, 0.12)',
                          color: '#0A84FF',
                          border: '1px solid rgba(10, 132, 255, 0.25)'
                        }}
                      >
                        <ShieldCheck size={11} />
                        Post de administración
                      </span>
                    )}

                    <span style={{ fontSize: 13, color: 'var(--color-secondary-ink)', opacity: 0.8 }}>
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
                        color: 'var(--color-warning)',
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
                    {/* Badge de categoría */}
                    <span style={{
                      fontSize: 11,
                      fontWeight: 700,
                      padding: '2px 7px',
                      borderRadius: 9999,
                      backgroundColor: esRespuesta ? 'rgba(52, 199, 89, 0.1)' : 'rgba(0, 122, 255, 0.08)',
                      color: esRespuesta ? 'var(--color-positive)' : 'var(--color-accent)',
                      flexShrink: 0
                    }}>
                      #{item.categoria || (esRespuesta ? 'Reto' : 'Tip')}
                    </span>

                    {/* Botón de eliminar para moderadores o dueños */}
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
                        onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--color-negative)' }}
                        onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--color-secondary-ink)' }}
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                </div>

                {/* Si es respuesta a un reto específico */}
                {esRespuesta && (
                  <div style={{
                    fontSize: 12,
                    fontWeight: 700,
                    color: 'var(--color-positive)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 5
                  }}>
                    <CheckCircle2 size={13} />
                    <span>Resolvió: {item.retoTitulo}</span>
                  </div>
                )}

                {/* Título opcional si tiene */}
                {item.titulo && !esRespuesta && item.titulo !== item.contenido && (
                  <h4 style={{ margin: 0, fontSize: 14, fontWeight: 800, color: 'var(--color-ink)' }}>
                    {item.titulo}
                  </h4>
                )}

                {/* Cuerpo del tweet */}
                <div style={{
                  fontSize: 14,
                  lineHeight: 1.48,
                  color: 'var(--color-ink)',
                  wordBreak: 'break-word',
                  whiteSpace: 'pre-line'
                }}>
                  {item.contenido}
                </div>

                {/* Feedback del moderador si existe */}
                {item.feedback && (
                  <div style={{
                    fontSize: 12,
                    color: 'var(--color-positive)',
                    backgroundColor: 'rgba(52, 199, 89, 0.08)',
                    padding: '6px 10px',
                    borderRadius: 8,
                    border: '1px solid rgba(52, 199, 89, 0.2)',
                    marginTop: 2
                  }}>
                    💬 <strong>lominoño:</strong> {item.feedback}
                  </div>
                )}

                {/* Fila de Interacciones estilo X */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  maxWidth: 380,
                  marginTop: 6,
                  color: 'var(--color-secondary-ink)'
                }}>
                  {/* Comentarios */}
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
                      padding: 4
                    }}
                  >
                    <MessageSquare size={15} />
                    <span>{comentariosEstePost.length}</span>
                  </button>

                  {/* Repost / Retweet */}
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
                      padding: 4
                    }}
                  >
                    <Repeat2 size={16} />
                    <span>{yaRepostee ? 1 : 0}</span>
                  </button>

                  {/* Corazón Like */}
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
                      padding: 4,
                      transition: 'color 0.12s ease'
                    }}
                  >
                    <Heart size={15} fill={yaLeDiLike ? '#FF3B30' : 'none'} color={yaLeDiLike ? '#FF3B30' : 'currentColor'} />
                    <span>{item.likes || 0}</span>
                  </button>

                  {/* Compartir */}
                  <button
                    type="button"
                    title="Compartir o copiar"
                    onClick={() => {
                      if (navigator.clipboard) {
                        navigator.clipboard.writeText(item.contenido)
                        sound.playPop()
                      }
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 5,
                      color: 'inherit',
                      fontSize: 12,
                      padding: 4
                    }}
                  >
                    <Share2 size={14} />
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
                        placeholder="Escribe una respuesta técnica..."
                        value={nuevoComentarioTexto[item.id] || ''}
                        onChange={(e) => {
                          const val = e.target.value
                          setNuevoComentarioTexto(prev => ({ ...prev, [item.id]: val }))
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleEnviarComentario(item.id)
                        }}
                        style={{ flex: 1, height: 32, fontSize: 12 }}
                      />
                      <button
                        type="button"
                        disabled={!(nuevoComentarioTexto[item.id] || '').trim() || enviandoComentario}
                        onClick={() => handleEnviarComentario(item.id)}
                        className="btn-primary"
                        style={{ minHeight: 32, padding: '0 12px', fontSize: 12, fontWeight: 700 }}
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

      {/* MODAL TIENDA DE RECOMPENSAS VIRTUALES */}
      {mostrarTienda && (
        <TiendaRecompensas onClose={() => setMostrarTienda(false)} />
      )}

      {/* MODAL HORARIO */}
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
