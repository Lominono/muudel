// frontend/src/pages/PantallaChat.jsx
import { useState, useRef, useEffect, useMemo, useCallback } from 'react'
import { useAuth } from '../App'
import { useChat } from '../hooks/useChat'
import { useDirectMessages } from '../hooks/useDirectMessages'
import { PanelMensajesDirectos } from '../components/PanelMensajesDirectos'
import {
  ArrowUp,
  Heart,
  Hash,
  ShieldCheck,
  MessageSquare,
  X,
  Lock,
  Stamp,
  Pin,
  Reply,
  Trash2,
  Search,
  Smile,
  ExternalLink,
  ChevronDown,
  CheckCircle2,
  Zap,
  Sparkles,
  Megaphone,
  Coffee,
  Radio,
  Folder,
  Send,
  MoreVertical,
  Check,
  CornerDownLeft
} from 'lucide-react'
import { sound, triggerConfetti } from '../utils/haptics'
import { animarBurbuja } from '../utils/animations'
import { AvatarUsuario } from '../components/AvatarUsuario'
import { suscribirEvento, transmitirEvento } from '../utils/realtimeHub'
import { analizarTextoAntiIA } from '../utils/antiAiDetector'

const CANALES = [
  { id: 'general', label: 'General', desc: 'Sala principal del aula de SMR2' },
  { id: 'dudas', label: 'Dudas', desc: 'Consultas sobre ejercicios y laboratorio' },
  { id: 'apuntes', label: 'Apuntes', desc: 'Chuletas, comandos y enlaces útiles' },
  { id: 'avisos', label: 'Avisos', desc: 'Comunicados oficiales de clase' },
]

const RESPUESTAS_RAPIDAS = [
  'Presente 15:30',
  'Visto en clase',
  'Descanso 18:10',
  '¿Qué ejercicio es?',
  'Duda resuelta',
  'Apunte subido',
]

const REACCIONES_POPULARES = [
  { emoji: '❤️', label: 'Me gusta' },
  { emoji: '👍', label: 'Entendido' },
  { emoji: '💡', label: 'Buena idea' },
  { emoji: '🔥', label: 'Crack' },
  { emoji: '❓', label: 'Misma duda' }
]

const SELLOS_RAPIDOS = [
  { id: 'PRESENTE', etiqueta: 'PRESENTE 15:30', clase: 'sello-tinta-rojo', texto: '[SELLO:PRESENTE]' },
  { id: 'ENTENDIDO', etiqueta: 'ENTENDIDO', clase: 'sello-tinta-verde', texto: '[SELLO:ENTENDIDO]' },
  { id: 'DUDA', etiqueta: 'DUDA EN CLASE', clase: 'sello-tinta-azul', texto: '[SELLO:DUDA]' },
  { id: 'VISTO', etiqueta: 'VISTO Y COPIADO', clase: 'sello-tinta-azul', texto: '[SELLO:VISTO]' },
]

export function PantallaChat() {
  const { perfil, setPerfil } = useAuth()
  const [canal, setCanal] = useState('general')
  const [texto, setTexto] = useState('')
  const [likedId, setLikedId] = useState(null)

  // Detección de ancho móvil vs PC
  const [esMovil, setEsMovil] = useState(() => {
    if (typeof window !== 'undefined') return window.innerWidth <= 768
    return false
  })

  useEffect(() => {
    const handleResize = () => setEsMovil(window.innerWidth <= 768)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // Soporte de visualViewport en móviles para teclado virtual sin saltos
  const [tecladoDesfase, setTecladoDesfase] = useState(0)
  useEffect(() => {
    if (!esMovil || typeof window === 'undefined' || !window.visualViewport) return

    const handleVisualResize = () => {
      const vv = window.visualViewport
      const desfase = Math.max(0, window.innerHeight - vv.height - vv.offsetTop)
      setTecladoDesfase(desfase)
    }

    window.visualViewport.addEventListener('resize', handleVisualResize)
    window.visualViewport.addEventListener('scroll', handleVisualResize)
    return () => {
      window.visualViewport.removeEventListener('resize', handleVisualResize)
      window.visualViewport.removeEventListener('scroll', handleVisualResize)
    }
  }, [esMovil])

  // Modo de vista: 'canales' o 'dms'
  const [modoVista, setModoVista] = useState('canales')
  const [destinatarioDmSeleccionado, setDestinatarioDmSeleccionado] = useState(null)
  const dmHook = useDirectMessages(perfil, destinatarioDmSeleccionado)

  const abrirChatPrivadoCon = (contacto) => {
    sound.playPop()
    setDestinatarioDmSeleccionado(contacto)
    setModoVista('dms')
  }

  const {
    mensajes,
    cargando,
    enviar,
    toggleLike,
    like,
    toggleReaccion,
    toggleFijado,
    eliminarMensaje,
    marcarSolucion,
    emitirTyping,
    usuariosEscribiendo
  } = useChat(canal, perfil)

  const estadoAntiIa = useMemo(() => {
    if (!texto.trim() || texto.length < 25) return null
    return analizarTextoAntiIA(texto)
  }, [texto])

  const chatEndRef = useRef(null)
  const scrollContainerRef = useRef(null)
  const ultimoMensajeRef = useRef(null)
  const typingTimerRef = useRef(null)
  const textareaRef = useRef(null)

  // Estados de Interfaz
  const [mensajeAResponder, setMensajeAResponder] = useState(null) // { id, texto, nombre }
  const [mostrarBuscador, setMostrarBuscador] = useState(false)
  const [queryBusqueda, setQueryBusqueda] = useState('')
  const [mensajeDestacadoId, setMensajeDestacadoId] = useState(null)
  const [menuReaccionesAbiertoId, setMenuReaccionesAbiertoId] = useState(null)
  const [mostrarMenuSellos, setMostrarMenuSellos] = useState(false)

  // Botón flotante para ir al último mensaje y contador de no leídos
  const [mostrarBotonScrollBottom, setMostrarBotonScrollBottom] = useState(false)
  const [mensajesNuevosScrolleado, setMensajesNuevosScrolleado] = useState(0)

  // Gestos táctiles móviles: Long Press para menú de acciones
  const touchTimerRef = useRef(null)
  const [mensajeAccionSheet, setMensajeAccionSheet] = useState(null)

  // Estado de moderación del chat
  const [chatSilenciado, setChatSilenciado] = useState(false)

  // Mensaje fijado en el canal actual
  const mensajeFijado = useMemo(() => {
    return mensajes.find(m => m.fijado)
  }, [mensajes])

  // Filtrado de mensajes por búsqueda
  const mensajesFiltrados = useMemo(() => {
    if (!queryBusqueda.trim()) return mensajes
    const q = queryBusqueda.toLowerCase()
    return mensajes.filter(m =>
      (m.texto && m.texto.toLowerCase().includes(q)) ||
      (m.nombre && m.nombre.toLowerCase().includes(q)) ||
      (m.username && m.username.toLowerCase().includes(q))
    )
  }, [mensajes, queryBusqueda])

  // Comprobar silencio del chat
  useEffect(() => {
    const revisarSilencio = () => {
      try {
        const hasta = localStorage.getItem('muudel_chat_silenciado_hasta')
        if (hasta && Number(hasta) > Date.now()) {
          setChatSilenciado(true)
        } else {
          setChatSilenciado(false)
        }
      } catch (e) {
        setChatSilenciado(false)
      }
    }
    revisarSilencio()
    const timer = setInterval(revisarSilencio, 3000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    const desuscribirSilencio = suscribirEvento('silencio_chat', ({ silenciadoHasta }) => {
      if (silenciadoHasta && Number(silenciadoHasta) > Date.now()) {
        setChatSilenciado(true)
      } else {
        setChatSilenciado(false)
      }
    })
    return () => {
      desuscribirSilencio()
    }
  }, [])

  // Control de scroll y detección para el botón "ir al último mensaje"
  const handleScroll = (e) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget
    const distFondo = scrollHeight - scrollTop - clientHeight
    if (distFondo > 160) {
      setMostrarBotonScrollBottom(true)
    } else {
      setMostrarBotonScrollBottom(false)
      setMensajesNuevosScrolleado(0)
    }
  }

  const scrollToBottom = (suave = true) => {
    chatEndRef.current?.scrollIntoView({ behavior: suave ? 'smooth' : 'auto' })
    setMostrarBotonScrollBottom(false)
    setMensajesNuevosScrolleado(0)
  }

  // Scroll automático hacia el final al recibir mensajes si el usuario está cerca del fondo
  useEffect(() => {
    if (!queryBusqueda) {
      if (mostrarBotonScrollBottom) {
        setMensajesNuevosScrolleado(prev => prev + 1)
      } else {
        scrollToBottom(true)
      }
    }
    if (ultimoMensajeRef.current) {
      animarBurbuja(ultimoMensajeRef.current)
    }
  }, [mensajes.length, queryBusqueda])

  const scrollToMessage = (msgId) => {
    const el = document.getElementById(`msg-${msgId}`)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' })
      setMensajeDestacadoId(msgId)
      setTimeout(() => setMensajeDestacadoId(null), 1600)
      sound.playPop()
    }
  }

  // Control del input / textarea con auto-expansión en PC
  const handleTextareaChange = (e) => {
    setTexto(e.target.value)
    // Auto-ajustar altura hasta un máximo de 130px
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${Math.min(130, textareaRef.current.scrollHeight)}px`
    }
    if (perfil) {
      emitirTyping(perfil, true)
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current)
      typingTimerRef.current = setTimeout(() => {
        emitirTyping(perfil, false)
      }, 2500)
    }
  }

  // Atajos de teclado en PC: Enter envía, Shift+Enter inserta salto de línea
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      manejarEnvio()
    }
  }

  const manejarEnvio = async (e) => {
    if (e) e.preventDefault()
    if (!texto.trim() || !perfil) return

    if (chatSilenciado && perfil.rol !== 'moderador') {
      sound.playPop()
      return
    }

    const contenido = texto
    setTexto('')
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }
    if (perfil) emitirTyping(perfil, false)
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current)

    const replyData = mensajeAResponder ? {
      id: mensajeAResponder.id,
      texto: mensajeAResponder.texto,
      nombre: mensajeAResponder.nombre
    } : null

    setMensajeAResponder(null)
    sound.playPop()
    await enviar(contenido, perfil.id, perfil, replyData)
    setTimeout(() => scrollToBottom(true), 50)
  }

  const manejarLike = async (id) => {
    if (!perfil) return
    setLikedId(id)
    sound.playPop()
    const yaTieneLike = mensajes.find(m => m.id === id)?.liked_by_me
    if (!yaTieneLike) {
      sound.playStamp()
    }
    await toggleLike(id, perfil.id, perfil.username ? `@${perfil.username}` : (perfil.nombre?.split(' ')[0] || 'Compañero'))
    setTimeout(() => setLikedId(null), 350)
  }

  const manejarReaccionEmoji = (msgId, emoji) => {
    if (!perfil) return
    sound.playPop()
    toggleReaccion(msgId, emoji, perfil.id)
    setMenuReaccionesAbiertoId(null)
    setMensajeAccionSheet(null)
  }

  const manejarEstamparSello = async (sello) => {
    if (!perfil) return
    sound.playStamp()
    setMostrarMenuSellos(false)
    setMensajeAccionSheet(null)
    await enviar(sello.texto, perfil.id, perfil)
    setTimeout(() => scrollToBottom(true), 50)
  }

  // Gestos táctiles móviles (Long-press)
  const iniciarLongPress = (msg) => {
    if (!esMovil) return
    touchTimerRef.current = setTimeout(() => {
      sound.playPop()
      setMensajeAccionSheet(msg)
    }, 450)
  }

  const cancelarLongPress = () => {
    if (touchTimerRef.current) {
      clearTimeout(touchTimerRef.current)
      touchTimerRef.current = null
    }
  }

  const parsearEfectoMensaje = (textoMsg) => {
    if (!textoMsg || !textoMsg.startsWith('[EFECTO:')) return null
    const match = textoMsg.match(/\[EFECTO:([a-z0-9_]+)(?::([^\]]+))?\]\s*(.*)/i)
    if (!match) return null
    return {
      tipo: match[1],
      autor: match[2],
      contenido: match[3]
    }
  }

  const parsearSelloMensaje = (textoMsg) => {
    if (!textoMsg || !textoMsg.startsWith('[SELLO:')) return null
    const match = textoMsg.match(/\[SELLO:([A-Z0-9_]+)\]/i)
    if (!match) return null
    const selloId = match[1].toUpperCase()
    return SELLOS_RAPIDOS.find(s => s.id === selloId) || SELLOS_RAPIDOS[0]
  }

  // Renderizado enriquecido
  const renderizarTextoEnriquecido = (cadena, esPropio) => {
    if (!cadena) return null
    if (cadena.includes('```')) {
      const partes = cadena.split(/(```[\s\S]*?```)/g)
      return partes.map((parte, i) => {
        if (parte.startsWith('```') && parte.endsWith('```')) {
          const codigo = parte.slice(3, -3).replace(/^[\r\n]+|[\r\n]+$/g, '')
          return (
            <pre key={i} className="chat-code-block">
              <code>{codigo}</code>
            </pre>
          )
        }
        return <span key={i}>{renderizarInline(parte, esPropio)}</span>
      })
    }
    return renderizarInline(cadena, esPropio)
  }

  const renderizarInline = (str, esPropio) => {
    const tokens = str.split(/(`[^`]+`|https?:\/\/[^\s]+|@[a-zA-Z0-9_]+)/g)
    return tokens.map((token, idx) => {
      if (token.startsWith('`') && token.endsWith('`') && token.length > 2) {
        return (
          <code key={idx} className="chat-code-inline">
            {token.slice(1, -1)}
          </code>
        )
      }
      if (token.startsWith('http://') || token.startsWith('https://')) {
        return (
          <a
            key={idx}
            href={token}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              color: esPropio ? '#FFFFFF' : 'var(--color-accent)',
              textDecoration: 'underline',
              wordBreak: 'break-all',
              fontWeight: 600
            }}
          >
            {token.replace(/^https?:\/\//, '').slice(0, 30)}...
            <ExternalLink size={12} style={{ display: 'inline', marginLeft: 2 }} />
          </a>
        )
      }
      if (token.startsWith('@') && token.length > 1) {
        return (
          <span
            key={idx}
            style={{
              fontWeight: 700,
              color: esPropio ? '#FFFFFF' : 'var(--color-accent)',
              backgroundColor: esPropio ? 'rgba(255,255,255,0.2)' : 'rgba(10, 132, 255, 0.1)',
              padding: '1px 5px',
              borderRadius: 5
            }}
          >
            {token}
          </span>
        )
      }
      return token
    })
  }

  const nombresEscribiendo = Object.entries(usuariosEscribiendo)
    .filter(([uid]) => uid !== perfil?.id)
    .map(([, nombre]) => nombre)

  const estaBloqueadoEnvio = chatSilenciado && perfil?.rol !== 'moderador'

  // ──────────────────────────────────────────────────────────────────────────
  // COMPONENTES AUXILIARES PARA EL RENDER
  // ──────────────────────────────────────────────────────────────────────────

  // Lista de canales estilo Apple
  const renderSidebarCanales = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, padding: '8px 10px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 8px' }}>
        <span className="apple-caption" style={{ fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.6, fontSize: 11 }}>
          Canales de Aula
        </span>
        <span className="apple-badge apple-badge-positive" style={{ fontSize: 10, padding: '1px 6px' }}>
          En vivo
        </span>
      </div>

      {CANALES.map((c) => {
        const activo = modoVista === 'canales' && canal === c.id
        return (
          <button
            key={c.id}
            type="button"
            onClick={() => {
              sound.playPop()
              setModoVista('canales')
              setCanal(c.id)
              setMensajeAResponder(null)
              setQueryBusqueda('')
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '9px 12px',
              borderRadius: 12,
              border: 'none',
              backgroundColor: activo ? 'var(--color-accent)' : 'transparent',
              color: activo ? '#FFFFFF' : 'var(--color-ink)',
              fontWeight: activo ? 700 : 500,
              fontSize: 14,
              cursor: 'pointer',
              textAlign: 'left',
              transition: 'all 0.12s ease',
              width: '100%'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
              <Hash size={16} opacity={activo ? 1 : 0.6} />
              <div style={{ minWidth: 0 }}>
                <span style={{ display: 'block', fontSize: 13, lineHeight: 1.2 }}>{c.label}</span>
                <span style={{
                  display: 'block',
                  fontSize: 10,
                  opacity: activo ? 0.9 : 0.6,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis'
                }}>
                  {c.desc}
                </span>
              </div>
            </div>
            {c.id === 'dudas' && (
              <span style={{
                fontSize: 10,
                backgroundColor: activo ? 'rgba(255,255,255,0.25)' : 'var(--color-fill-secondary)',
                color: activo ? '#FFF' : 'var(--color-secondary-ink)',
                padding: '2px 6px',
                borderRadius: 9999,
                fontWeight: 700
              }}>
                Q&A
              </span>
            )}
          </button>
        )
      })}
    </div>
  )

  // ──────────────────────────────────────────────────────────────────────────
  // VISTA MÓVIL A PANTALLA COMPLETA
  // ──────────────────────────────────────────────────────────────────────────
  if (esMovil) {
    return (
      <div
        className="chat-mobile-layout"
        style={{
          height: '100dvh',
          paddingBottom: tecladoDesfase > 0 ? `${tecladoDesfase}px` : '0px',
          transition: 'padding-bottom 0.1s ease-out'
        }}
      >
        {/* Cabecera Móvil Compacta con Safe-Area Top */}
        <header style={{
          paddingTop: 'max(10px, env(safe-area-inset-top, 10px))',
          paddingBottom: 10,
          paddingLeft: 14,
          paddingRight: 14,
          backgroundColor: 'var(--color-surface)',
          borderBottom: '1px solid var(--color-separator)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          zIndex: 40
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{
              width: 32,
              height: 32,
              borderRadius: 10,
              backgroundColor: 'rgba(0, 122, 255, 0.12)',
              color: 'var(--color-accent)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 800
            }}>
              <Hash size={18} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <h1 className="apple-headline" style={{ fontSize: 16, margin: 0 }}>
                  #{canal}
                </h1>
                <span className="apple-badge apple-badge-positive" style={{ fontSize: 10, padding: '1px 6px' }}>
                  En vivo
                </span>
              </div>
              <p className="apple-caption" style={{ margin: 0, fontSize: 11 }}>
                {CANALES.find(c => c.id === canal)?.desc}
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {/* Botón DMs */}
            <button
              type="button"
              onClick={() => {
                sound.playPop()
                setModoVista(modoVista === 'canales' ? 'dms' : 'canales')
              }}
              style={{
                minWidth: 44,
                minHeight: 44,
                borderRadius: 12,
                backgroundColor: modoVista === 'dms' ? 'var(--color-accent)' : 'var(--color-fill-secondary)',
                color: modoVista === 'dms' ? '#FFF' : 'var(--color-ink)',
                border: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                position: 'relative'
              }}
              aria-label="Abrir Mensajes Directos"
            >
              <MessageSquare size={18} />
              {dmHook.totalNoLeidos > 0 && (
                <span style={{
                  position: 'absolute',
                  top: 4,
                  right: 4,
                  width: 10,
                  height: 10,
                  borderRadius: '50%',
                  backgroundColor: 'var(--color-destructive)'
                }} />
              )}
            </button>

            {/* Botón Buscador */}
            <button
              type="button"
              onClick={() => {
                sound.playPop()
                setMostrarBuscador(!mostrarBuscador)
                if (mostrarBuscador) setQueryBusqueda('')
              }}
              style={{
                minWidth: 44,
                minHeight: 44,
                borderRadius: 12,
                backgroundColor: mostrarBuscador ? 'var(--color-accent)' : 'var(--color-fill-secondary)',
                color: mostrarBuscador ? '#FFF' : 'var(--color-ink)',
                border: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer'
              }}
              aria-label="Buscar en el chat"
            >
              <Search size={18} />
            </button>
          </div>
        </header>

        {/* Selector Deslizable de Canales en Móvil */}
        {modoVista === 'canales' && (
          <div style={{
            display: 'flex',
            gap: 6,
            padding: '6px 12px',
            backgroundColor: 'var(--color-surface)',
            borderBottom: '1px solid var(--color-separator)',
            overflowX: 'auto',
            scrollbarWidth: 'none',
            whiteSpace: 'nowrap'
          }}>
            {CANALES.map((c) => {
              const act = canal === c.id
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => {
                    sound.playPop()
                    setCanal(c.id)
                    setMensajeAResponder(null)
                    setQueryBusqueda('')
                  }}
                  style={{
                    minHeight: 36,
                    padding: '4px 14px',
                    borderRadius: 9999,
                    border: 'none',
                    backgroundColor: act ? 'var(--color-accent)' : 'var(--color-fill-secondary)',
                    color: act ? '#FFFFFF' : 'var(--color-ink)',
                    fontSize: 13,
                    fontWeight: act ? 700 : 500,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 5,
                    cursor: 'pointer'
                  }}
                >
                  <Hash size={13} opacity={act ? 1 : 0.6} />
                  <span>{c.label}</span>
                </button>
              )
            })}
          </div>
        )}

        {/* Buscador Desplegable en Móvil */}
        {mostrarBuscador && (
          <div style={{
            padding: '8px 12px',
            backgroundColor: 'var(--color-surface-secondary)',
            borderBottom: '1px solid var(--color-separator)',
            display: 'flex',
            alignItems: 'center',
            gap: 8
          }}>
            <Search size={16} color="var(--color-secondary-ink)" />
            <input
              type="text"
              value={queryBusqueda}
              onChange={(e) => setQueryBusqueda(e.target.value)}
              placeholder="Buscar mensajes o alumnos..."
              autoFocus
              className="apple-input"
              style={{ flex: 1, minHeight: 40, fontSize: 15 }}
            />
            {queryBusqueda && (
              <button
                type="button"
                onClick={() => setQueryBusqueda('')}
                style={{ background: 'none', border: 'none', color: 'var(--color-secondary-ink)', minWidth: 40, minHeight: 40 }}
              >
                <X size={18} />
              </button>
            )}
          </div>
        )}

        {/* Vista Alternativa de DMs en Móvil */}
        {modoVista === 'dms' ? (
          <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <PanelMensajesDirectos
              perfil={perfil}
              destinatarioInicial={destinatarioDmSeleccionado}
              useDmHook={dmHook}
              onSelectDestinatario={(contacto) => setDestinatarioDmSeleccionado(contacto)}
              onCerrar={() => setModoVista('canales')}
            />
          </div>
        ) : (
          <>
            {/* Banner de Mensaje Fijado */}
            {mensajeFijado && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '7px 12px',
                backgroundColor: 'rgba(10, 132, 255, 0.08)',
                borderBottom: '1px solid rgba(10, 132, 255, 0.2)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1, minWidth: 0 }}>
                  <Pin size={13} color="var(--color-accent)" style={{ transform: 'rotate(45deg)' }} />
                  <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-accent)', whiteSpace: 'nowrap' }}>Fijado:</span>
                  <p style={{ fontSize: 12, color: 'var(--color-ink)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {mensajeFijado.texto}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => scrollToMessage(mensajeFijado.id)}
                  style={{
                    border: 'none',
                    background: 'none',
                    color: 'var(--color-accent)',
                    fontSize: 12,
                    fontWeight: 700,
                    padding: '4px 8px',
                    cursor: 'pointer'
                  }}
                >
                  Ver
                </button>
              </div>
            )}

            {/* Contenedor Principal de Mensajes Móvil con Scroll Suave */}
            <div
              ref={scrollContainerRef}
              onScroll={handleScroll}
              style={{
                flex: 1,
                overflowY: 'auto',
                WebkitOverflowScrolling: 'touch',
                padding: '12px 14px',
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
                position: 'relative'
              }}
            >
              {cargando && mensajes.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 30, color: 'var(--color-secondary-ink)' }}>
                  Cargando mensajes del aula...
                </div>
              ) : mensajesFiltrados.length === 0 ? (
                <div style={{ textAlign: 'center', margin: 'auto', padding: 20 }}>
                  <MessageSquare size={32} color="var(--color-tertiary-ink)" style={{ margin: '0 auto 8px' }} />
                  <p className="apple-subheadline" style={{ fontSize: 14 }}>
                    {queryBusqueda ? `Sin coincidencias para "${queryBusqueda}"` : `Sé el primero en escribir en #${canal}`}
                  </p>
                </div>
              ) : (
                mensajesFiltrados.map((m, idx) => {
                  const esPropio = perfil && m.user_id === perfil.id
                  const esUltimo = idx === mensajesFiltrados.length - 1
                  const hora = m.created_at
                    ? new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                    : ''
                  const autorNombre = m.nombre || m.profiles?.nombre || 'Compañero'
                  const autorUsername = m.username || m.profiles?.username
                  const autorRol = m.rol || m.profiles?.rol || 'alumno'
                  const autorColor = m.color_acento || m.profiles?.color_acento
                  const autorDigito = m.digito_id || m.profiles?.digito_id
                  const esModerador = autorRol === 'moderador'

                  const sello = parsearSelloMensaje(m.texto)
                  if (sello) {
                    const colorTag = sello.id === 'PRESENTE' ? '#FF3B30' : sello.id === 'ENTENDIDO' ? '#34C759' : '#007AFF'
                    return (
                      <div
                        key={m.id || idx}
                        id={`msg-${m.id}`}
                        ref={esUltimo ? ultimoMensajeRef : null}
                        onTouchStart={() => iniciarLongPress(m)}
                        onTouchEnd={cancelarLongPress}
                        style={{
                          alignSelf: esPropio ? 'flex-end' : 'flex-start',
                          margin: '4px 0',
                          userSelect: 'none'
                        }}
                      >
                        <div style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 6,
                          padding: '8px 16px',
                          borderRadius: 9999,
                          backgroundColor: `${colorTag}18`,
                          color: colorTag,
                          border: `1.5px solid ${colorTag}33`,
                          fontSize: 13,
                          fontWeight: 800
                        }}>
                          <CheckCircle2 size={15} />
                          <span>{sello.etiqueta}</span>
                          <span style={{ fontSize: 10, opacity: 0.7, marginLeft: 4 }}>{hora}</span>
                        </div>
                      </div>
                    )
                  }

                  const tieneReacciones = m.reacciones && Object.keys(m.reacciones).length > 0

                  return (
                    <div
                      key={m.id || idx}
                      id={`msg-${m.id}`}
                      ref={esUltimo ? ultimoMensajeRef : null}
                      onTouchStart={() => iniciarLongPress(m)}
                      onTouchEnd={cancelarLongPress}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: esPropio ? 'flex-end' : 'flex-start',
                        width: '100%',
                        animation: 'fadeIn 0.15s ease'
                      }}
                    >
                      {/* Remitente si no es propio */}
                      {!esPropio && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3, paddingLeft: 4 }}>
                          <AvatarUsuario nombre={autorNombre} color={autorColor} rol={autorRol} size={22} fontSize={10} />
                          <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-ink)' }}>{autorNombre}</span>
                          {esModerador && (
                            <span style={{
                              fontSize: 9,
                              fontWeight: 800,
                              padding: '1px 5px',
                              borderRadius: 4,
                              backgroundColor: 'rgba(10, 132, 255, 0.15)',
                              color: 'var(--color-accent)'
                            }}>
                              Profe
                            </span>
                          )}
                        </div>
                      )}

                      {/* Burbuja Grande con Zonas Táctiles Cómodas */}
                      <div
                        style={{
                          maxWidth: '86%',
                          padding: '12px 16px',
                          borderRadius: 20,
                          borderBottomRightRadius: esPropio ? 4 : 20,
                          borderBottomLeftRadius: esPropio ? 20 : 4,
                          backgroundColor: esPropio ? 'var(--color-accent)' : 'var(--color-surface)',
                          color: esPropio ? '#FFFFFF' : 'var(--color-ink)',
                          border: esPropio ? 'none' : '1px solid var(--color-separator)',
                          boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                          fontSize: 15,
                          lineHeight: 1.45,
                          position: 'relative'
                        }}
                      >
                        {/* Cita si es respuesta */}
                        {m.reply_to && (
                          <div style={{
                            padding: '4px 8px',
                            borderLeft: `3px solid ${esPropio ? 'rgba(255,255,255,0.7)' : 'var(--color-accent)'}`,
                            backgroundColor: esPropio ? 'rgba(255,255,255,0.15)' : 'var(--color-fill-secondary)',
                            borderRadius: 6,
                            marginBottom: 6,
                            fontSize: 12
                          }}>
                            <strong>{m.reply_to.nombre}:</strong> {m.reply_to.texto}
                          </div>
                        )}

                        <div>{renderizarTextoEnriquecido(m.texto, esPropio)}</div>

                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'flex-end',
                          gap: 4,
                          marginTop: 4,
                          fontSize: 10,
                          opacity: 0.75
                        }}>
                          <span>{hora}</span>
                        </div>
                      </div>

                      {/* Reacciones debajo de la burbuja */}
                      {tieneReacciones && (
                        <div style={{ display: 'flex', gap: 4, marginTop: 4, flexWrap: 'wrap' }}>
                          {Object.entries(m.reacciones).map(([emoji, uids]) => {
                            if (!Array.isArray(uids) || uids.length === 0) return null
                            const propia = perfil && uids.includes(perfil.id)
                            return (
                              <button
                                key={emoji}
                                type="button"
                                onClick={() => manejarReaccionEmoji(m.id, emoji)}
                                style={{
                                  minHeight: 28,
                                  minWidth: 36,
                                  borderRadius: 14,
                                  border: `1px solid ${propia ? 'var(--color-accent)' : 'var(--color-separator)'}`,
                                  backgroundColor: propia ? 'rgba(10, 132, 255, 0.12)' : 'var(--color-surface)',
                                  color: propia ? 'var(--color-accent)' : 'var(--color-ink)',
                                  fontSize: 12,
                                  fontWeight: 700,
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  gap: 3,
                                  padding: '2px 8px'
                                }}
                              >
                                <span>{emoji}</span>
                                <span>{uids.length}</span>
                              </button>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  )
                })
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Botón Flotante "Ir al último mensaje" con badge */}
            {mostrarBotonScrollBottom && (
              <button
                type="button"
                className="chat-scroll-bottom-btn"
                onClick={() => scrollToBottom(true)}
                aria-label="Ir al último mensaje"
                style={{ bottom: '78px' }}
              >
                <ChevronDown size={22} />
                {mensajesNuevosScrolleado > 0 && (
                  <span style={{
                    position: 'absolute',
                    top: -4,
                    right: -4,
                    backgroundColor: 'var(--color-destructive)',
                    color: '#FFF',
                    fontSize: 10,
                    fontWeight: 900,
                    borderRadius: 9999,
                    padding: '1px 5px',
                    minWidth: 16,
                    height: 16,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    {mensajesNuevosScrolleado}
                  </span>
                )}
              </button>
            )}

            {/* Indicador de Usuarios Escribiendo */}
            {nombresEscribiendo.length > 0 && (
              <div style={{ padding: '2px 14px', fontSize: 11, color: 'var(--color-secondary-ink)', display: 'flex', alignItems: 'center', gap: 6 }}>
                <span className="chat-dot-bounce" />
                <span>{nombresEscribiendo.join(', ')} escribiendo...</span>
              </div>
            )}

            {/* Banner de Cita/Respuesta Activa */}
            {mensajeAResponder && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '6px 14px',
                backgroundColor: 'var(--color-surface-secondary)',
                borderTop: '1px solid var(--color-separator)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0, flex: 1 }}>
                  <Reply size={14} color="var(--color-accent)" />
                  <span style={{ fontSize: 12, color: 'var(--color-accent)', fontWeight: 700 }}>
                    Respondiendo a {mensajeAResponder.nombre}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setMensajeAResponder(null)}
                  style={{ background: 'none', border: 'none', color: 'var(--color-secondary-ink)', minWidth: 36, minHeight: 36, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                  <X size={16} />
                </button>
              </div>
            )}

            {/* Menú de Sellos Rápidos */}
            {mostrarMenuSellos && (
              <div style={{
                padding: '8px 12px',
                backgroundColor: 'var(--color-surface)',
                borderTop: '1px solid var(--color-separator)',
                display: 'flex',
                gap: 6,
                overflowX: 'auto',
                scrollbarWidth: 'none'
              }}>
                {SELLOS_RAPIDOS.map(s => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => manejarEstamparSello(s)}
                    style={{
                      minHeight: 38,
                      padding: '4px 12px',
                      borderRadius: 9999,
                      border: '1px solid var(--color-separator)',
                      backgroundColor: 'var(--color-surface-secondary)',
                      color: 'var(--color-ink)',
                      fontSize: 12,
                      fontWeight: 700,
                      whiteSpace: 'nowrap',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4
                    }}
                  >
                    <CheckCircle2 size={13} color="var(--color-accent)" />
                    <span>{s.etiqueta}</span>
                  </button>
                ))}
              </div>
            )}

            {/* Input Anclado Abajo Siempre Accesible con Teclado Abierto */}
            <footer style={{
              padding: '8px 12px',
              paddingBottom: tecladoDesfase > 0 ? '8px' : 'max(8px, env(safe-area-inset-bottom, 8px))',
              backgroundColor: 'var(--color-surface)',
              borderTop: '1px solid var(--color-separator)',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              zIndex: 40
            }}>
              <button
                type="button"
                onClick={() => setMostrarMenuSellos(!mostrarMenuSellos)}
                style={{
                  minWidth: 44,
                  minHeight: 44,
                  borderRadius: 12,
                  border: '1px solid var(--color-separator)',
                  backgroundColor: mostrarMenuSellos ? 'var(--color-accent)' : 'var(--color-fill-secondary)',
                  color: mostrarMenuSellos ? '#FFF' : 'var(--color-ink)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer'
                }}
                aria-label="Abrir sellos de clase"
              >
                <Stamp size={18} />
              </button>

              <input
                type="text"
                value={texto}
                disabled={estaBloqueadoEnvio}
                onChange={(e) => setTexto(e.target.value)}
                placeholder={
                  estaBloqueadoEnvio
                    ? '🔒 Chat silenciado'
                    : mensajeAResponder
                    ? `Respondiendo a @${mensajeAResponder.nombre}...`
                    : `Mensaje en #${canal}...`
                }
                className="apple-input"
                style={{
                  flex: 1,
                  minHeight: 44,
                  fontSize: 16,
                  borderRadius: 22,
                  padding: '8px 16px'
                }}
              />

              <button
                type="button"
                disabled={!texto.trim() || estaBloqueadoEnvio}
                onClick={manejarEnvio}
                style={{
                  minWidth: 44,
                  minHeight: 44,
                  borderRadius: 22,
                  border: 'none',
                  backgroundColor: texto.trim() && !estaBloqueadoEnvio ? 'var(--color-accent)' : 'var(--color-fill-secondary)',
                  color: texto.trim() && !estaBloqueadoEnvio ? '#FFFFFF' : 'var(--color-tertiary-ink)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: texto.trim() && !estaBloqueadoEnvio ? 'pointer' : 'default'
                }}
                aria-label="Enviar mensaje"
              >
                <ArrowUp size={20} strokeWidth={2.6} />
              </button>
            </footer>

            {/* Action Sheet Móvil al Mantener Pulsado (Long Press) */}
            {mensajeAccionSheet && (
              <div
                className="chat-mobile-sheet-overlay"
                onClick={() => setMensajeAccionSheet(null)}
              >
                <div
                  className="chat-mobile-sheet"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div style={{ width: 36, height: 4, backgroundColor: 'var(--color-separator)', borderRadius: 2, margin: '0 auto 8px' }} />

                  {/* Fila de Reacciones Rápidas */}
                  <div style={{ display: 'flex', justifyContent: 'space-around', padding: '6px 0', borderBottom: '1px solid var(--color-separator)' }}>
                    {REACCIONES_POPULARES.map(({ emoji, label }) => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => manejarReaccionEmoji(mensajeAccionSheet.id, emoji)}
                        style={{
                          fontSize: 24,
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          minWidth: 44,
                          minHeight: 44,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                        aria-label={label}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>

                  <button
                    type="button"
                    className="chat-sheet-action-btn"
                    onClick={() => {
                      manejarLike(mensajeAccionSheet.id)
                      setMensajeAccionSheet(null)
                    }}
                  >
                    <Heart size={18} color="#FF3B30" />
                    <span>Dar Me Gusta</span>
                  </button>

                  <button
                    type="button"
                    className="chat-sheet-action-btn"
                    onClick={() => {
                      setMensajeAResponder({
                        id: mensajeAccionSheet.id,
                        texto: mensajeAccionSheet.texto,
                        nombre: mensajeAccionSheet.nombre || mensajeAccionSheet.profiles?.nombre || 'Compañero'
                      })
                      setMensajeAccionSheet(null)
                      sound.playPop()
                    }}
                  >
                    <Reply size={18} color="var(--color-accent)" />
                    <span>Responder / Citar</span>
                  </button>

                  {(perfil?.id === mensajeAccionSheet.user_id || perfil?.rol === 'moderador') && (
                    <button
                      type="button"
                      className="chat-sheet-action-btn"
                      style={{ color: '#EF4444' }}
                      onClick={() => {
                        if (confirm('¿Eliminar este mensaje?')) {
                          eliminarMensaje(mensajeAccionSheet.id)
                        }
                        setMensajeAccionSheet(null)
                      }}
                    >
                      <Trash2 size={18} />
                      <span>Eliminar mensaje</span>
                    </button>
                  )}

                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => setMensajeAccionSheet(null)}
                    style={{ minHeight: 46, borderRadius: 14, fontWeight: 700 }}
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    )
  }

  // ──────────────────────────────────────────────────────────────────────────
  // VISTA PC (DESKTOP WORKSPACE CON LAYOUT SPLIT)
  // ──────────────────────────────────────────────────────────────────────────
  return (
    <div className="chat-pc-container">
      {/* Barra Lateral Izquierda: Canales y Contactos */}
      <aside className="chat-pc-sidebar">
        {/* Cabecera Sidebar */}
        <div style={{
          padding: '14px 16px',
          borderBottom: '1px solid var(--color-separator)',
          backgroundColor: 'var(--color-surface-secondary)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <div>
              <h2 className="apple-headline" style={{ fontSize: 16, margin: 0 }}>
                Chat de Clase
              </h2>
              <span className="apple-caption" style={{ fontSize: 11 }}>
                SMR2 Tarde · En tiempo real
              </span>
            </div>
            <span className="apple-badge apple-badge-positive" style={{ fontSize: 10 }}>
              Live
            </span>
          </div>

          {/* Segmented Control: Canales vs Mensajes Directos */}
          <div style={{
            display: 'flex',
            backgroundColor: 'var(--color-fill-tertiary)',
            padding: 3,
            borderRadius: 10,
            gap: 2
          }}>
            <button
              type="button"
              onClick={() => {
                sound.playPop()
                setModoVista('canales')
              }}
              style={{
                flex: 1,
                border: 'none',
                padding: '6px 10px',
                borderRadius: 8,
                backgroundColor: modoVista === 'canales' ? 'var(--color-surface)' : 'transparent',
                color: modoVista === 'canales' ? 'var(--color-ink)' : 'var(--color-secondary-ink)',
                fontSize: 12,
                fontWeight: modoVista === 'canales' ? 700 : 500,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 5,
                boxShadow: modoVista === 'canales' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none'
              }}
            >
              <Hash size={13} />
              <span>Canales</span>
            </button>

            <button
              type="button"
              onClick={() => {
                sound.playPop()
                setModoVista('dms')
              }}
              style={{
                flex: 1,
                border: 'none',
                padding: '6px 10px',
                borderRadius: 8,
                backgroundColor: modoVista === 'dms' ? 'var(--color-surface)' : 'transparent',
                color: modoVista === 'dms' ? 'var(--color-ink)' : 'var(--color-secondary-ink)',
                fontSize: 12,
                fontWeight: modoVista === 'dms' ? 700 : 500,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 5,
                boxShadow: modoVista === 'dms' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none'
              }}
            >
              <MessageSquare size={13} />
              <span>Privados</span>
              {dmHook.totalNoLeidos > 0 && (
                <span style={{
                  minWidth: 16,
                  height: 16,
                  borderRadius: 8,
                  backgroundColor: 'var(--color-destructive)',
                  color: '#FFF',
                  fontSize: 10,
                  fontWeight: 900,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '0 4px'
                }}>
                  {dmHook.totalNoLeidos}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Contenido Sidebar con Scroll */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {modoVista === 'canales' ? (
            renderSidebarCanales()
          ) : (
            <div style={{ padding: '8px 10px', display: 'flex', flexDirection: 'column', gap: 4 }}>
              <div style={{ padding: '6px 8px' }}>
                <span className="apple-caption" style={{ fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.6, fontSize: 11 }}>
                  Compañeros de Clase
                </span>
              </div>
              {dmHook.contactosClase.map(c => {
                const activo = destinatarioDmSeleccionado?.id === c.id
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => {
                      sound.playPop()
                      setDestinatarioDmSeleccionado(c)
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      padding: '8px 10px',
                      borderRadius: 12,
                      border: 'none',
                      backgroundColor: activo ? 'var(--color-fill-secondary)' : 'transparent',
                      color: 'var(--color-ink)',
                      cursor: 'pointer',
                      textAlign: 'left',
                      width: '100%',
                      transition: 'background-color 0.12s ease'
                    }}
                  >
                    <AvatarUsuario nombre={c.nombre} color={c.color_acento} rol={c.rol} size={30} fontSize={12} marco={c.marco_avatar} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: 13, fontWeight: 700 }}>{c.nombre}</span>
                      </div>
                      <span className="apple-caption" style={{ fontSize: 11 }}>
                        {c.rol === 'moderador' ? 'Profesor' : `@${c.username || 'alumno'}`}
                      </span>
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* Pie de Sidebar con Datos de Usuario Actual */}
        <div style={{
          padding: '10px 14px',
          borderTop: '1px solid var(--color-separator)',
          backgroundColor: 'var(--color-surface-secondary)',
          display: 'flex',
          alignItems: 'center',
          gap: 10
        }}>
          <AvatarUsuario nombre={perfil?.nombre} color={perfil?.color_acento} rol={perfil?.rol} size={32} fontSize={12} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-ink)', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {perfil?.nombre}
            </span>
            <span className="apple-caption" style={{ fontSize: 11 }}>
              {perfil?.rol === 'moderador' ? 'Profesor' : 'Estudiante'} · {perfil?.puntos_total || 0} SE 💶
            </span>
          </div>
        </div>
      </aside>

      {/* Panel Derecho Principal de Chat */}
      <main className="chat-pc-main">
        {modoVista === 'dms' ? (
          <PanelMensajesDirectos
            perfil={perfil}
            destinatarioInicial={destinatarioDmSeleccionado}
            useDmHook={dmHook}
            onSelectDestinatario={(contacto) => setDestinatarioDmSeleccionado(contacto)}
            onCerrar={() => setModoVista('canales')}
          />
        ) : (
          <>
            {/* Cabecera Superior del Canal */}
            <div style={{
              padding: '12px 18px',
              borderBottom: '1px solid var(--color-separator)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              backgroundColor: 'var(--color-surface-secondary)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  backgroundColor: 'rgba(0, 122, 255, 0.12)',
                  color: 'var(--color-accent)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 900
                }}>
                  <Hash size={20} />
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <h1 className="apple-headline" style={{ fontSize: 17, margin: 0 }}>
                      #{canal}
                    </h1>
                    <span className="apple-badge apple-badge-neutral" style={{ fontSize: 11 }}>
                      {CANALES.find(c => c.id === canal)?.desc}
                    </span>
                  </div>
                </div>
              </div>

              {/* Acciones de Cabecera: Buscador */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ position: 'relative', width: 220 }}>
                  <Search size={14} style={{ position: 'absolute', left: 10, top: 10, color: 'var(--color-tertiary-ink)' }} />
                  <input
                    type="text"
                    value={queryBusqueda}
                    onChange={(e) => setQueryBusqueda(e.target.value)}
                    placeholder="Buscar en el canal..."
                    className="apple-input"
                    style={{ paddingLeft: 30, minHeight: 34, fontSize: 12, width: '100%', borderRadius: 10 }}
                  />
                  {queryBusqueda && (
                    <button
                      type="button"
                      onClick={() => setQueryBusqueda('')}
                      style={{ position: 'absolute', right: 8, top: 8, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-tertiary-ink)' }}
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Banner de Mensaje Fijado */}
            {mensajeFijado && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '8px 18px',
                backgroundColor: 'rgba(10, 132, 255, 0.08)',
                borderBottom: '1px solid rgba(10, 132, 255, 0.2)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 0 }}>
                  <Pin size={14} color="var(--color-accent)" style={{ transform: 'rotate(45deg)' }} />
                  <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-accent)' }}>Mensaje Fijado:</span>
                  <p style={{ fontSize: 13, color: 'var(--color-ink)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {mensajeFijado.texto}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => scrollToMessage(mensajeFijado.id)}
                  style={{
                    backgroundColor: 'rgba(10, 132, 255, 0.15)',
                    border: 'none',
                    color: 'var(--color-accent)',
                    fontSize: 12,
                    fontWeight: 700,
                    padding: '4px 10px',
                    borderRadius: 8,
                    cursor: 'pointer'
                  }}
                >
                  Ir al mensaje
                </button>
              </div>
            )}

            {/* Hilo de Mensajes con Ancho de Lectura Cómodo (760px) */}
            <div
              ref={scrollContainerRef}
              onScroll={handleScroll}
              style={{
                flex: 1,
                overflowY: 'auto',
                padding: '16px 20px',
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
                position: 'relative'
              }}
            >
              <div style={{ maxWidth: 760, margin: '0 auto', width: '100%', display: 'flex', flexDirection: 'column', gap: 8 }}>
                {cargando && mensajes.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: 40, color: 'var(--color-secondary-ink)' }}>
                    Cargando mensajes del canal...
                  </div>
                ) : mensajesFiltrados.length === 0 ? (
                  <div style={{ textAlign: 'center', margin: 'auto', padding: 40 }}>
                    <MessageSquare size={36} color="var(--color-tertiary-ink)" style={{ margin: '0 auto 10px' }} />
                    <p className="apple-subheadline">
                      {queryBusqueda ? `Sin resultados para "${queryBusqueda}"` : `Bienvenido al canal #${canal}`}
                    </p>
                  </div>
                ) : (
                  mensajesFiltrados.map((m, idx) => {
                    const esPropio = perfil && m.user_id === perfil.id
                    const esUltimo = idx === mensajesFiltrados.length - 1
                    const hora = m.created_at
                      ? new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                      : ''
                    const autorNombre = m.nombre || m.profiles?.nombre || 'Compañero'
                    const autorUsername = m.username || m.profiles?.username
                    const autorRol = m.rol || m.profiles?.rol || 'alumno'
                    const autorColor = m.color_acento || m.profiles?.color_acento
                    const autorDigito = m.digito_id || m.profiles?.digito_id
                    const esModerador = autorRol === 'moderador'

                    const sello = parsearSelloMensaje(m.texto)
                    if (sello) {
                      const colorTag = sello.id === 'PRESENTE' ? '#FF3B30' : sello.id === 'ENTENDIDO' ? '#34C759' : '#007AFF'
                      return (
                        <div
                          key={m.id || idx}
                          id={`msg-${m.id}`}
                          ref={esUltimo ? ultimoMensajeRef : null}
                          style={{
                            alignSelf: esPropio ? 'flex-end' : 'flex-start',
                            margin: '4px 0'
                          }}
                        >
                          <div style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 6,
                            padding: '8px 16px',
                            borderRadius: 9999,
                            backgroundColor: `${colorTag}18`,
                            color: colorTag,
                            border: `1.5px solid ${colorTag}33`,
                            fontSize: 13,
                            fontWeight: 800
                          }}>
                            <CheckCircle2 size={15} />
                            <span>{sello.etiqueta}</span>
                            <span style={{ fontSize: 10, opacity: 0.7, marginLeft: 6 }}>{hora}</span>
                          </div>
                        </div>
                      )
                    }

                    const tieneReacciones = m.reacciones && Object.keys(m.reacciones).length > 0

                    return (
                      <div
                        key={m.id || idx}
                        id={`msg-${m.id}`}
                        ref={esUltimo ? ultimoMensajeRef : null}
                        className="chat-message-row"
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: esPropio ? 'flex-end' : 'flex-start',
                          width: '100%',
                          position: 'relative',
                          padding: '3px 8px'
                        }}
                      >
                        {/* Barra de Herramientas Flotante en Hover para PC */}
                        <div className="chat-hover-toolbar">
                          {REACCIONES_POPULARES.slice(0, 3).map(({ emoji, label }) => (
                            <button
                              key={emoji}
                              type="button"
                              onClick={() => manejarReaccionEmoji(m.id, emoji)}
                              title={label}
                              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, padding: 2 }}
                            >
                              {emoji}
                            </button>
                          ))}
                          <button
                            type="button"
                            onClick={() => manejarLike(m.id)}
                            title="Me gusta"
                            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2 }}
                          >
                            <Heart size={13} color={m.liked_by_me ? '#FF3B30' : 'currentColor'} fill={m.liked_by_me ? '#FF3B30' : 'none'} />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setMensajeAResponder({ id: m.id, texto: m.texto, nombre: autorNombre })
                              textareaRef.current?.focus()
                              sound.playPop()
                            }}
                            title="Responder / Citar"
                            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2 }}
                          >
                            <Reply size={13} />
                          </button>
                          {(esPropio || perfil?.rol === 'moderador') && (
                            <button
                              type="button"
                              onClick={() => {
                                if (confirm('¿Eliminar mensaje?')) eliminarMensaje(m.id)
                              }}
                              title="Eliminar"
                              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, color: '#EF4444' }}
                            >
                              <Trash2 size={13} />
                            </button>
                          )}
                        </div>

                        {/* Remitente si no es propio */}
                        {!esPropio && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3, paddingLeft: 4 }}>
                            <AvatarUsuario nombre={autorNombre} color={autorColor} rol={autorRol} size={22} fontSize={10} />
                            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-ink)' }}>{autorNombre}</span>
                            {autorUsername && (
                              <span style={{ fontSize: 11, color: 'var(--color-accent)', fontWeight: 600 }}>
                                @{autorUsername}
                              </span>
                            )}
                            {esModerador && (
                              <span style={{
                                fontSize: 9,
                                fontWeight: 800,
                                padding: '1px 5px',
                                borderRadius: 4,
                                backgroundColor: 'rgba(10, 132, 255, 0.15)',
                                color: 'var(--color-accent)'
                              }}>
                                Profesor
                              </span>
                            )}
                          </div>
                        )}

                        {/* Burbuja de Lectura Cómoda */}
                        <div
                          style={{
                            maxWidth: '75%',
                            padding: '10px 15px',
                            borderRadius: 18,
                            borderBottomRightRadius: esPropio ? 4 : 18,
                            borderBottomLeftRadius: esPropio ? 18 : 4,
                            backgroundColor: esPropio ? 'var(--color-accent)' : 'var(--color-surface)',
                            color: esPropio ? '#FFFFFF' : 'var(--color-ink)',
                            border: esPropio ? 'none' : '1px solid var(--color-separator)',
                            boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
                            fontSize: 14.5,
                            lineHeight: 1.45
                          }}
                        >
                          {/* Cita si es respuesta */}
                          {m.reply_to && (
                            <div style={{
                              padding: '4px 8px',
                              borderLeft: `3px solid ${esPropio ? 'rgba(255,255,255,0.7)' : 'var(--color-accent)'}`,
                              backgroundColor: esPropio ? 'rgba(255,255,255,0.15)' : 'var(--color-fill-secondary)',
                              borderRadius: 6,
                              marginBottom: 6,
                              fontSize: 12
                            }}>
                              <strong>{m.reply_to.nombre}:</strong> {m.reply_to.texto}
                            </div>
                          )}

                          <div>{renderizarTextoEnriquecido(m.texto, esPropio)}</div>

                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'flex-end',
                            gap: 6,
                            marginTop: 4,
                            fontSize: 10,
                            opacity: 0.75
                          }}>
                            <span>{hora}</span>
                          </div>
                        </div>

                        {/* Reacciones en PC */}
                        {tieneReacciones && (
                          <div style={{ display: 'flex', gap: 4, marginTop: 4, flexWrap: 'wrap' }}>
                            {Object.entries(m.reacciones).map(([emoji, uids]) => {
                              if (!Array.isArray(uids) || uids.length === 0) return null
                              const propia = perfil && uids.includes(perfil.id)
                              return (
                                <button
                                  key={emoji}
                                  type="button"
                                  onClick={() => manejarReaccionEmoji(m.id, emoji)}
                                  style={{
                                    minHeight: 24,
                                    borderRadius: 12,
                                    border: `1px solid ${propia ? 'var(--color-accent)' : 'var(--color-separator)'}`,
                                    backgroundColor: propia ? 'rgba(10, 132, 255, 0.12)' : 'var(--color-surface)',
                                    color: propia ? 'var(--color-accent)' : 'var(--color-ink)',
                                    fontSize: 11,
                                    fontWeight: 700,
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: 3,
                                    padding: '2px 7px',
                                    cursor: 'pointer'
                                  }}
                                >
                                  <span>{emoji}</span>
                                  <span>{uids.length}</span>
                                </button>
                              )
                            })}
                          </div>
                        )}
                      </div>
                    )
                  })
                )}
                <div ref={chatEndRef} />
              </div>
            </div>

            {/* Botón Flotante "Ir al último mensaje" en PC */}
            {mostrarBotonScrollBottom && (
              <button
                type="button"
                className="chat-scroll-bottom-btn"
                onClick={() => scrollToBottom(true)}
                aria-label="Ir al último mensaje"
                style={{ bottom: '90px' }}
              >
                <ChevronDown size={20} />
                {mensajesNuevosScrolleado > 0 && (
                  <span style={{
                    position: 'absolute',
                    top: -4,
                    right: -4,
                    backgroundColor: 'var(--color-destructive)',
                    color: '#FFF',
                    fontSize: 10,
                    fontWeight: 900,
                    borderRadius: 9999,
                    padding: '1px 5px',
                    minWidth: 16,
                    height: 16,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    {mensajesNuevosScrolleado}
                  </span>
                )}
              </button>
            )}

            {/* Banner de Respuesta Cita Activa */}
            {mensajeAResponder && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '8px 18px',
                backgroundColor: 'var(--color-surface-secondary)',
                borderTop: '1px solid var(--color-separator)',
                maxWidth: 760,
                margin: '0 auto',
                width: '100%'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Reply size={15} color="var(--color-accent)" />
                  <span style={{ fontSize: 13, color: 'var(--color-accent)', fontWeight: 700 }}>
                    Respondiendo a @{mensajeAResponder.nombre}
                  </span>
                  <span style={{ fontSize: 12, color: 'var(--color-secondary-ink)' }}>
                    "{mensajeAResponder.texto.slice(0, 50)}..."
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setMensajeAResponder(null)}
                  style={{ background: 'none', border: 'none', color: 'var(--color-secondary-ink)', cursor: 'pointer' }}
                >
                  <X size={16} />
                </button>
              </div>
            )}

            {/* Cajón de Sellos en PC */}
            {mostrarMenuSellos && (
              <div style={{
                padding: '8px 18px',
                backgroundColor: 'var(--color-surface)',
                borderTop: '1px solid var(--color-separator)',
                display: 'flex',
                gap: 8,
                maxWidth: 760,
                margin: '0 auto',
                width: '100%'
              }}>
                {SELLOS_RAPIDOS.map(s => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => manejarEstamparSello(s)}
                    style={{
                      padding: '5px 12px',
                      borderRadius: 9999,
                      border: '1px solid var(--color-separator)',
                      backgroundColor: 'var(--color-surface-secondary)',
                      color: 'var(--color-ink)',
                      fontSize: 12,
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4
                    }}
                  >
                    <CheckCircle2 size={13} color="var(--color-accent)" />
                    <span>{s.etiqueta}</span>
                  </button>
                ))}
              </div>
            )}

            {/* Input Multilínea en PC (Enter envía, Shift+Enter salto de línea) */}
            <footer style={{
              padding: '12px 18px 16px',
              backgroundColor: 'var(--color-surface)',
              borderTop: '1px solid var(--color-separator)'
            }}>
              <div style={{ maxWidth: 760, margin: '0 auto', width: '100%', display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10 }}>
                  <button
                    type="button"
                    onClick={() => setMostrarMenuSellos(!mostrarMenuSellos)}
                    title="Sellos rápidos oficiales de clase"
                    style={{
                      width: 42,
                      height: 42,
                      borderRadius: 12,
                      border: '1px solid var(--color-separator)',
                      backgroundColor: mostrarMenuSellos ? 'var(--color-accent)' : 'var(--color-fill-secondary)',
                      color: mostrarMenuSellos ? '#FFF' : 'var(--color-ink)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      flexShrink: 0
                    }}
                  >
                    <Stamp size={18} />
                  </button>

                  <textarea
                    ref={textareaRef}
                    rows={1}
                    value={texto}
                    disabled={estaBloqueadoEnvio}
                    onChange={handleTextareaChange}
                    onKeyDown={handleKeyDown}
                    placeholder={
                      estaBloqueadoEnvio
                        ? '🔒 Chat silenciado temporalmente por moderación'
                        : mensajeAResponder
                        ? `Respondiendo a @${mensajeAResponder.nombre}...`
                        : `Escribe en #${canal}...`
                    }
                    className="chat-multiline-input"
                  />

                  <button
                    type="button"
                    disabled={!texto.trim() || estaBloqueadoEnvio}
                    onClick={manejarEnvio}
                    title="Enviar mensaje (Enter)"
                    style={{
                      width: 42,
                      height: 42,
                      borderRadius: 12,
                      border: 'none',
                      backgroundColor: texto.trim() && !estaBloqueadoEnvio ? 'var(--color-accent)' : 'var(--color-fill-secondary)',
                      color: texto.trim() && !estaBloqueadoEnvio ? '#FFFFFF' : 'var(--color-tertiary-ink)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: texto.trim() && !estaBloqueadoEnvio ? 'pointer' : 'default',
                      flexShrink: 0
                    }}
                  >
                    <ArrowUp size={20} strokeWidth={2.4} />
                  </button>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 4px' }}>
                  <span className="apple-caption" style={{ fontSize: 11 }}>
                    Presiona <kbd style={{ padding: '1px 4px', borderRadius: 4, backgroundColor: 'var(--color-fill-secondary)' }}>Enter</kbd> para enviar · <kbd style={{ padding: '1px 4px', borderRadius: 4, backgroundColor: 'var(--color-fill-secondary)' }}>Shift + Enter</kbd> para nueva línea
                  </span>

                  {estadoAntiIa && (
                    <span className="apple-caption" style={{ color: estadoAntiIa.esGenuino ? 'var(--color-positive)' : 'var(--color-warning)', fontWeight: 600 }}>
                      {estadoAntiIa.esGenuino ? '✓ Autoría Humana Verificada' : '⚠️ Detectado patrón sintético'}
                    </span>
                  )}
                </div>
              </div>
            </footer>
          </>
        )}
      </main>
    </div>
  )
}
