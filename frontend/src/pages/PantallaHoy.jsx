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
  X
} from 'lucide-react'
import { transmitirEvento, suscribirEvento } from '../utils/realtimeHub'
import { analizarTextoAntiIA } from '../utils/antiAiDetector'
import { sumarXpSkill } from '../utils/skillsData'
import { obtenerConfigRecompensas, calcularPuntosGanados } from '../utils/recompensasConfig'

export function PantallaHoy() {
  const { perfil, setPerfil } = useAuth()
  const navigate = useNavigate()

  // Tabs estilo X: 'para_ti' | 'tips' | 'respuestas'
  const [tabActiva, setTabActiva] = useState('para_ti')

  // Modales
  const [mostrarTienda, setMostrarTienda] = useState(false)
  const [mostrarModalHorario, setMostrarModalHorario] = useState(false)
  const [avisoHoy, setAvisoHoy] = useState(() => localStorage.getItem('racha_aviso_hoy') || '')

  // Compositor inline estilo X
  const [textoPost, setTextoPost] = useState('')
  const [categoriaPost, setCategoriaPost] = useState('Truco') // 'Truco' | 'Linux' | 'Redes' | 'Duda' | 'General'
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

    // Suscripción en tiempo real a nuevos posts
    const canalFeed = supabase
      .channel('feed-posts-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'feed_posts' }, () => {
        cargarFeedCompleto()
      })
      .subscribe()

    // Suscripciones de eventos Broadcast de clase
    const desNuevoPost = suscribirEvento('nuevo_feed_post', (nuevoPost) => {
      setPostsFeed(prev => {
        if (prev.some(p => p.id === nuevoPost.id)) return prev
        return [nuevoPost, ...prev]
      })
    })

    const desLike = suscribirEvento('like_feed_item', ({ itemId, nuevoCount }) => {
      setPostsFeed(prev => prev.map(p => p.id === itemId ? { ...p, likes: nuevoCount } : p))
      setRespuestasFeed(prev => prev.map(r => r.id === itemId ? { ...r, likes: nuevoCount } : r))
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

    return () => {
      supabase.removeChannel(canalFeed)
      desNuevoPost()
      desLike()
      desCheckin()
      desRecompensas()
    }
  }, [perfil?.id, fechaHoy])

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

      // 2. Cargar posts desde la tabla feed_posts
      const { data: postsData, error: errPosts } = await supabase
        .from('feed_posts')
        .select(`
          id, categoria, titulo, contenido, likes_count, created_at,
          profiles (id, nombre, username, color_acento, rol, avatar_emoji)
        `)
        .eq('soft_deleted', false)
        .order('created_at', { ascending: false })
        .limit(50)

      if (!errPosts && postsData) {
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

        const mapeados = postsData.map(p => ({
          id: p.id,
          tipo: 'post',
          userId: p.profiles?.id,
          autor: p.profiles?.nombre || 'Alumno SMR2',
          username: p.profiles?.username || 'alumno',
          color: p.profiles?.color_acento || '#007AFF',
          rol: p.profiles?.rol || 'alumno',
          avatarEmoji: p.profiles?.avatar_emoji || '🧑',
          categoria: p.categoria || 'General',
          titulo: p.titulo,
          contenido: p.contenido,
          tiempoHace: calcularTiempoRelativo(p.created_at),
          likes: p.likes_count || 0,
          liked: Boolean(likedSet[p.id])
        }))
        setPostsFeed(mapeados)
      }

      // 3. Cargar entregas y respuestas recientes de clase
      try {
        const entregasLocales = JSON.parse(localStorage.getItem('muudel_entregas_retos') || '[]')
        const respuestasMapeadas = entregasLocales.slice(0, 15).map(e => ({
          id: e.id,
          tipo: 'respuesta',
          userId: e.userId,
          autor: e.nombre || 'Compañero',
          username: e.username || 'smr2',
          color: e.color || '#007AFF',
          rol: 'alumno',
          categoria: 'Reto',
          retoTitulo: e.retoTitulo || 'Reto Técnico',
          contenido: e.evidencia,
          feedback: e.feedback,
          estado: e.estado || 'aprobado',
          tiempoHace: e.hora || 'Hoy',
          likes: e.likes || 0,
          liked: Boolean(likesDados[e.id])
        }))
        setRespuestasFeed(respuestasMapeadas)
      } catch (_) {}
    } catch (err) {
      console.warn('Error cargando feed:', err)
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

    // Extraer título natural (primera frase o hasta 60 caracteres)
    let tituloAuto = contenidoLimpio.split('\n')[0].substring(0, 65).trim()
    if (tituloAuto.length < 3) tituloAuto = `${categoriaPost} técnico de ${perfil.nombre}`

    const analisisAntiIA = analizarTextoAntiIA(contenidoLimpio)

    try {
      const { data: postCreado, error } = await supabase
        .from('feed_posts')
        .insert({
          user_id: perfil.id,
          categoria: categoriaPost,
          titulo: tituloAuto,
          contenido: contenidoLimpio
        })
        .select(`
          id, categoria, titulo, contenido, likes_count, created_at,
          profiles (id, nombre, username, color_acento, rol, avatar_emoji)
        `)
        .single()

      if (!error && postCreado) {
        const nuevo = {
          id: postCreado.id,
          tipo: 'post',
          userId: perfil.id,
          autor: perfil.nombre,
          username: perfil.username || 'tu_usuario',
          color: perfil.color_acento || '#007AFF',
          rol: perfil.rol || 'alumno',
          avatarEmoji: perfil.avatar_emoji || '🧑',
          categoria: postCreado.categoria,
          titulo: postCreado.titulo,
          contenido: postCreado.contenido,
          tiempoHace: 'ahora mismo',
          likes: 0,
          liked: false,
          antiAi: analisisAntiIA
        }

        setPostsFeed(prev => [nuevo, ...prev])
        transmitirEvento('nuevo_feed_post', nuevo)
        setTextoPost('')
        triggerConfetti()

        // Premiar puntos según configuración activa del aula
        const mult = Number(configRec?.multiplicadorGlobal) || 1.0
        const baseFeed = Number(configRec?.puntosPostFeed) || 10
        const ratio = analisisAntiIA.esGenuino ? 1.0 : 0.5
        const ptsExtra = Math.max(1, Math.round(baseFeed * ratio * mult))
        const nuevoSaldo = (perfil.puntos_total || 0) + ptsExtra
        setPerfil({ ...perfil, puntos_total: nuevoSaldo })
        localStorage.setItem('racha_local_user', JSON.stringify({ ...perfil, puntos_total: nuevoSaldo }))
        await supabase.from('profiles').update({ puntos_total: nuevoSaldo }).eq('id', perfil.id)

        // Otorgar XP de competencia técnica
        let skillKey = 'autoria_tecnica'
        if (categoriaPost === 'Truco' || categoriaPost === 'Linux') skillKey = 'linux_bash'
        else if (categoriaPost === 'Redes') skillKey = 'redes_vlans'
        sumarXpSkill(perfil.id, skillKey, 15)
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
      setPostsFeed(prev => prev.map(p => {
        if (p.id === itemId) {
          const nuevoCount = Math.max(0, (p.likes || 0) + (yaLeDi ? -1 : 1))
          return { ...p, likes: nuevoCount, liked: !yaLeDi }
        }
        return p
      }))

      try {
        if (!yaLeDi) {
          await supabase.from('feed_post_likes').insert({ post_id: itemId, user_id: perfil.id })
          await supabase.rpc('increment_likes_count', { post_id: itemId })
        } else {
          await supabase.from('feed_post_likes').delete().match({ post_id: itemId, user_id: perfil.id })
        }
      } catch (_) {}
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
    // 'para_ti' combina posts y respuestas de clase ordenados cronológicamente
    return [...postsFeed, ...respuestasFeed]
  })()

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
              <span>{perfil?.puntos_total || 0} pts</span>
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
                  Asistencia sellada hoy a las {asistenciaConfirmada.hora || '15:30'} (+{asistenciaConfirmada.puntos_ganados || calcularPuntosGanados('checkin')} pts)
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
                Sellar (+{calcularPuntosGanados('checkin')} pts)
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

      {/* 3. COMPOSITOR INLINE ESTILO X ("¿QUÉ ESTÁ PASANDO EN CLASE?") */}
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
          <textarea
            ref={composerRef}
            rows={textoPost.includes('\n') ? 3 : 2}
            value={textoPost}
            onChange={(e) => setTextoPost(e.target.value)}
            placeholder="¿Qué está pasando en clase? Comparte un comando, duda o truco..."
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
            {['Truco', 'Linux', 'Redes', 'Duda', 'General'].map(cat => {
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
          </div>

          {/* Barra inferior del compositor: Contador, Recompensa y Botón Postear */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderTop: '1px solid var(--color-separator)',
            paddingTop: 8,
            marginTop: 4
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-accent)' }}>
                🎁 +{Math.max(1, Math.round((Number(configRec?.puntosPostFeed) || 10) * 0.5 * (Number(configRec?.multiplicadorGlobal) || 1)))} a +{Math.max(1, Math.round((Number(configRec?.puntosPostFeed) || 10) * (Number(configRec?.multiplicadorGlobal) || 1)))} monedas al publicar
              </span>
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
              <span>{publicando ? 'Publicando...' : 'Postear'}</span>
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
          const esRespuesta = item.tipo === 'respuesta'

          return (
            <article
              key={item.id}
              style={{
                padding: '14px 16px',
                borderBottom: '1px solid var(--color-separator)',
                display: 'flex',
                gap: 12,
                backgroundColor: 'transparent',
                transition: 'background-color 0.1s ease'
              }}
              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--color-fill-tertiary)' }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent' }}
            >
              {/* Columna izquierda: Avatar */}
              <div style={{ flexShrink: 0 }}>
                <AvatarUsuario
                  nombre={item.autor}
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
                    {item.rol === 'moderador' && (
                      <span className="apple-badge apple-badge-accent" style={{ fontSize: 9 }}>
                        Profesor
                      </span>
                    )}
                    <span style={{ fontSize: 13, color: 'var(--color-secondary-ink)', opacity: 0.8 }}>
                      @{item.username || 'alumno'}
                    </span>
                    <span style={{ color: 'var(--color-secondary-ink)', opacity: 0.5 }}>·</span>
                    <span style={{ fontSize: 12, color: 'var(--color-secondary-ink)' }}>
                      {item.tiempoHace}
                    </span>
                  </div>

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

                {/* Fila de Interacciones estilo X (Acciones limpias) */}
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
                    title="Responder en Chat"
                    onClick={() => navigate('/chat')}
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
                    <MessageSquare size={15} />
                    <span>0</span>
                  </button>

                  {/* Repost / Retweet */}
                  <button
                    type="button"
                    title="Impulsar en el aula"
                    onClick={() => { sound.playStamp(); triggerConfetti() }}
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
                    <Repeat2 size={16} />
                    <span>0</span>
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
