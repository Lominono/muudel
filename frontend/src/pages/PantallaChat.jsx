import { useState, useRef, useEffect, useMemo } from 'react'
import { useAuth } from '../App'
import { useChat } from '../hooks/useChat'
import {
  ArrowUp,
  Heart,
  Hash,
  ShieldCheck,
  MessageSquare,
  ShoppingBag,
  Zap,
  Sparkles,
  Megaphone,
  Coffee,
  X,
  Lock,
  Unlock,
  Radio,
  Stamp,
  Pin,
  Reply,
  Trash2,
  Search,
  Smile,
  ExternalLink,
  ChevronDown
} from 'lucide-react'
import { sound, triggerConfetti } from '../utils/haptics'
import { animarBurbuja } from '../utils/animations'
import { AvatarUsuario } from '../components/AvatarUsuario'
import { TiendaRecompensas, emitirEfectoChat, CATALOGO_RECOMPENSAS, SELLOS_OFICIALES, formatearTiempoRestante } from '../components/TiendaRecompensas'
import { suscribirEvento, transmitirEvento } from '../utils/realtimeHub'

const CANALES = [
  { id: 'general', label: 'General', desc: 'Sala principal del aula' },
  { id: 'dudas', label: 'Dudas', desc: 'Consultas sobre ejercicios' },
  { id: 'apuntes', label: 'Apuntes', desc: 'Resúmenes y enlaces útiles' },
  { id: 'avisos', label: 'Avisos', desc: 'Comunicados oficiales del profe' },
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
  const {
    mensajes,
    cargando,
    enviar,
    toggleLike,
    like,
    toggleReaccion,
    toggleFijado,
    eliminarMensaje,
    emitirTyping,
    usuariosEscribiendo
  } = useChat(canal, perfil)

  const chatEndRef = useRef(null)
  const ultimoMensajeRef = useRef(null)
  const typingTimerRef = useRef(null)
  const inputRef = useRef(null)

  // Estados de Interfaz y Nuevas Funciones
  const [mensajeAResponder, setMensajeAResponder] = useState(null) // { id, texto, nombre }
  const [mostrarBuscador, setMostrarBuscador] = useState(false)
  const [queryBusqueda, setQueryBusqueda] = useState('')
  const [mensajeDestacadoId, setMensajeDestacadoId] = useState(null)
  const [menuReaccionesAbiertoId, setMenuReaccionesAbiertoId] = useState(null)
  const [mostrarMenuSellos, setMostrarMenuSellos] = useState(false)

  // Estados de la Tienda y Efectos de Chat
  const [mostrarTienda, setMostrarTienda] = useState(false)
  const [mostrarMenuEfectos, setMostrarMenuEfectos] = useState(false)
  const [relojTick, setRelojTick] = useState(0)

  // Efectos visuales activos en la pantalla
  const [temblorActivo, setTemblorActivo] = useState(false)
  const [alertaDescanso, setAlertaDescanso] = useState(null)
  const [megafonoActivo, setMegafonoActivo] = useState(() => {
    try {
      const guardado = localStorage.getItem('muudel_megafono_activo')
      if (guardado) {
        const parsed = JSON.parse(guardado)
        if (parsed.expiraEn && Date.now() >= parsed.expiraEn) {
          localStorage.removeItem('muudel_megafono_activo')
          return null
        }
        return parsed
      }
      return null
    } catch (e) {
      return null
    }
  })

  // Estado de moderación del chat
  const [chatSilenciado, setChatSilenciado] = useState(false)
  const idUltimoEfectoProcesado = useRef(null)

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

  // 1. Tick cada segundo para actualizar cuentas regresivas
  useEffect(() => {
    const timer = setInterval(() => {
      setRelojTick(prev => prev + 1)
      try {
        const guardado = localStorage.getItem('muudel_megafono_activo')
        if (guardado) {
          const m = JSON.parse(guardado)
          if (m.expiraEn && Date.now() >= m.expiraEn) {
            localStorage.removeItem('muudel_megafono_activo')
            setMegafonoActivo(null)
          } else {
            setMegafonoActivo(m)
          }
        } else {
          setMegafonoActivo(null)
        }
      } catch (e) {}
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  // 2. Comprobar si el chat está silenciado por el moderador
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

  // Helper para consultar tiempo de recarga (cooldown)
  const obtenerCooldownRestante = (itemId) => {
    try {
      const hasta = Number(localStorage.getItem(`muudel_cooldown_${itemId}`) || 0)
      if (hasta > Date.now()) {
        return Math.ceil((hasta - Date.now()) / 1000)
      }
      return 0
    } catch (e) {
      return 0
    }
  }

  // 3. Escuchar efectos de chat, megáfono y moderación
  useEffect(() => {
    const desuscribirEfectos = suscribirEvento('efecto_chat', (payload) => {
      const { tipo, autor, texto: textoExtra } = payload || {}
      if (tipo) ejecutarEfecto(tipo, autor, textoExtra)
    })

    const desuscribirMegafono = suscribirEvento('megafono_activo', (payload) => {
      if (payload) {
        setMegafonoActivo(payload)
      }
    })

    const desuscribirSilencio = suscribirEvento('silencio_chat', ({ silenciadoHasta }) => {
      if (silenciadoHasta && Number(silenciadoHasta) > Date.now()) {
        setChatSilenciado(true)
      } else {
        setChatSilenciado(false)
      }
    })

    return () => {
      desuscribirEfectos()
      desuscribirMegafono()
      desuscribirSilencio()
    }
  }, [])

  // 4. Detectar efectos en los mensajes
  useEffect(() => {
    if (mensajes.length === 0) return
    const ultimo = mensajes[mensajes.length - 1]
    if (!ultimo || !ultimo.texto) return

    if (ultimo.id !== idUltimoEfectoProcesado.current) {
      idUltimoEfectoProcesado.current = ultimo.id

      if (ultimo.texto.startsWith('[EFECTO:')) {
        const match = ultimo.texto.match(/\[EFECTO:([a-z0-9_]+)(?::([^\]]+))?\]\s*(.*)/i)
        if (match) {
          const tipo = match[1]
          const autor = match[2] || ultimo.nombre || 'Compañero'
          const contenido = match[3] || ''
          ejecutarEfecto(tipo, autor, contenido)
        }
      } else if (ultimo.texto.startsWith('[SELLO:')) {
        sound.playStamp()
      }
    }
  }, [mensajes])

  const ejecutarEfecto = (tipo, autor, textoExtra) => {
    const deshabilitados = localStorage.getItem('muudel_efectos_chat_desactivados') === 'true'
    if (deshabilitados) return

    if (tipo === 'terremoto') {
      sound.playPop()
      setTemblorActivo(true)
      setTimeout(() => setTemblorActivo(false), 3500)
    } else if (tipo === 'confeti') {
      sound.playStamp()
      triggerConfetti()
    } else if (tipo === 'megafono') {
      sound.playPop()
      const expiraEn = Date.now() + 30 * 60 * 1000
      const nuevoMegafono = {
        autor: autor || 'Compañero',
        texto: textoExtra || 'Aviso fijado de clase',
        expiraEn: expiraEn,
        hora: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
      setMegafonoActivo(nuevoMegafono)
    } else if (tipo === 'descanso') {
      sound.playPop()
      setAlertaDescanso(`¡${autor} avisa: Descanso de las 18:10!`)
      setTimeout(() => setAlertaDescanso(null), 5000)
    } else if (tipo === 'sello') {
      sound.playStamp()
    }
  }

  // Scroll automático hacia el final
  useEffect(() => {
    if (!queryBusqueda) {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
    if (ultimoMensajeRef.current) {
      animarBurbuja(ultimoMensajeRef.current)
    }
  }, [mensajes.length, queryBusqueda])

  // Desplazarse a un mensaje específico (por cita o fijado)
  const scrollToMessage = (msgId) => {
    const el = document.getElementById(`msg-${msgId}`)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' })
      setMensajeDestacadoId(msgId)
      setTimeout(() => setMensajeDestacadoId(null), 1600)
      sound.playPop()
    }
  }

  // Control del indicador de escritura (typing)
  const handleInputChange = (e) => {
    setTexto(e.target.value)
    if (perfil) {
      emitirTyping(perfil, true)
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current)
      typingTimerRef.current = setTimeout(() => {
        emitirTyping(perfil, false)
      }, 2500)
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
  }

  const manejarEstamparSello = async (sello) => {
    if (!perfil) return
    sound.playStamp()
    setMostrarMenuSellos(false)
    await enviar(sello.texto, perfil.id, perfil)
  }

  const parsearEfectoMensaje = (textoMsg) => {
    if (!textoMsg.startsWith('[EFECTO:')) return null
    const match = textoMsg.match(/\[EFECTO:([a-z0-9_]+)(?::([^\]]+))?\]\s*(.*)/i)
    if (!match) return null
    return {
      tipo: match[1],
      autor: match[2],
      contenido: match[3]
    }
  }

  const parsearSelloMensaje = (textoMsg) => {
    if (!textoMsg.startsWith('[SELLO:')) return null
    const match = textoMsg.match(/\[SELLO:([A-Z0-9_]+)\]/i)
    if (!match) return null
    const selloId = match[1].toUpperCase()
    return SELLOS_OFICIALES.find(s => s.id === selloId) || SELLOS_OFICIALES[0]
  }

  // Formateo enriquecido de texto: código monospace, enlaces y menciones
  const renderizarTextoEnriquecido = (cadena, esPropio) => {
    if (!cadena) return null

    // 1. Detección de bloques de código ```
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
    // Regex para URLs, código inline `...` y menciones @...
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

  // Lista de usuarios escribiendo (excluyendo al usuario actual)
  const nombresEscribiendo = Object.entries(usuariosEscribiendo)
    .filter(([uid]) => uid !== perfil?.id)
    .map(([, nombre]) => nombre)

  const estaBloqueadoEnvio = chatSilenciado && perfil?.rol !== 'moderador'

  return (
    <main className={`app-container ${temblorActivo ? 'chat-screen-shake' : ''}`}>
      {/* Cabecera */}
      <header style={{ marginBottom: 10 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <h1 className="apple-large-title" style={{ fontSize: 26 }}>
                Chat de Clase
              </h1>
              <span className="apple-badge apple-badge-positive" style={{ fontSize: 11, padding: '2px 8px' }}>
                En vivo
              </span>
            </div>
            <p className="apple-subheadline" style={{ marginTop: 1, fontSize: 13 }}>
              SMR2 Tarde · Intercambio, código y sellos de clase
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {/* Botón Buscador */}
            <button
              type="button"
              onClick={() => {
                setMostrarBuscador(!mostrarBuscador)
                if (mostrarBuscador) setQueryBusqueda('')
              }}
              title="Buscar mensajes"
              style={{
                width: 36,
                height: 36,
                borderRadius: 9999,
                backgroundColor: mostrarBuscador ? 'var(--color-accent)' : 'var(--color-fill-secondary)',
                color: mostrarBuscador ? '#FFFFFF' : 'var(--color-ink)',
                border: '1px solid var(--color-separator)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              <Search size={16} />
            </button>

            {/* Botón de la Cantina / Tienda */}
            <button
              type="button"
              onClick={() => setMostrarTienda(true)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '8px 14px',
                borderRadius: 9999,
                backgroundColor: 'var(--color-fill-secondary)',
                color: 'var(--color-ink)',
                border: '1px solid var(--color-separator)',
                fontSize: 13,
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                flexShrink: 0
              }}
            >
              <ShoppingBag size={15} />
              <span>Tienda ({perfil?.puntos_total || 0} pts)</span>
            </button>
          </div>
        </div>

        {/* Barra de Búsqueda Desplegable */}
        {mostrarBuscador && (
          <div style={{
            marginTop: 10,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            animation: 'fadeIn 0.15s ease'
          }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <Search size={15} style={{ position: 'absolute', left: 12, top: 12, color: 'var(--color-tertiary-ink)' }} />
              <input
                type="text"
                value={queryBusqueda}
                onChange={(e) => setQueryBusqueda(e.target.value)}
                placeholder="Buscar mensajes, palabras o alumnos en este canal..."
                className="apple-input"
                autoFocus
                style={{ paddingLeft: 36, minHeight: 38, fontSize: 13, width: '100%' }}
              />
              {queryBusqueda && (
                <button
                  type="button"
                  onClick={() => setQueryBusqueda('')}
                  style={{
                    position: 'absolute',
                    right: 10,
                    top: 10,
                    background: 'none',
                    border: 'none',
                    color: 'var(--color-tertiary-ink)',
                    cursor: 'pointer'
                  }}
                >
                  <X size={15} />
                </button>
              )}
            </div>
            {queryBusqueda && (
              <span className="apple-caption" style={{ whiteSpace: 'nowrap' }}>
                {mensajesFiltrados.length} encontrados
              </span>
            )}
          </div>
        )}
      </header>

      {/* Alerta de descanso flotante */}
      {alertaDescanso && (
        <div style={{
          padding: '10px 14px',
          borderRadius: 12,
          backgroundColor: 'var(--color-positive-bg)',
          border: '1px solid rgba(52, 199, 89, 0.35)',
          color: 'var(--color-positive)',
          fontSize: 13,
          fontWeight: 700,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          marginBottom: 10,
          animation: 'fadeIn 0.2s ease'
        }}>
          <Coffee size={18} />
          <span>{alertaDescanso}</span>
        </div>
      )}

      {/* Megáfono fijado en la cabecera */}
      {megafonoActivo && (
        <div className="chat-megaphone-pinned">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
            <div style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              backgroundColor: 'var(--color-accent)',
              color: '#FFFFFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}>
              <Megaphone size={16} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--color-accent)', textTransform: 'uppercase' }}>
                  Aviso Fijado ({megafonoActivo.autor})
                </span>
                {megafonoActivo.expiraEn && (
                  <span style={{
                    fontSize: 10,
                    fontWeight: 700,
                    padding: '1px 6px',
                    borderRadius: 4,
                    backgroundColor: 'rgba(255, 149, 0, 0.12)',
                    color: 'var(--color-warning)'
                  }}>
                    ⏱️ {formatearTiempoRestante(megafonoActivo.expiraEn)}
                  </span>
                )}
                {megafonoActivo.hora && (
                  <span style={{ fontSize: 10, color: 'var(--color-tertiary-ink)' }}>
                    {megafonoActivo.hora}
                  </span>
                )}
              </div>
              <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-ink)', margin: 0, wordBreak: 'break-word' }}>
                {megafonoActivo.texto}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              setMegafonoActivo(null)
              try { localStorage.removeItem('muudel_megafono_activo') } catch (e) {}
            }}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--color-secondary-ink)',
              cursor: 'pointer',
              padding: 4
            }}
          >
            <X size={15} />
          </button>
        </div>
      )}

      {/* Selector de canales estilo Apple Segmented Control */}
      <div style={{
        display: 'flex',
        gap: 6,
        marginBottom: 8,
        overflowX: 'auto',
        paddingBottom: 2,
        scrollbarWidth: 'none',
      }}>
        {CANALES.map((c) => {
          const activo = canal === c.id
          return (
            <button
              key={c.id}
              onClick={() => {
                setCanal(c.id)
                setMensajeAResponder(null)
                setQueryBusqueda('')
              }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '7px 14px',
                borderRadius: 9999,
                border: 'none',
                backgroundColor: activo ? 'var(--color-accent)' : 'var(--color-fill-secondary)',
                color: activo ? '#FFFFFF' : 'var(--color-ink)',
                fontWeight: activo ? 700 : 500,
                fontSize: 13,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all 0.15s ease',
              }}
            >
              <Hash size={13} opacity={activo ? 0.95 : 0.6} />
              <span>{c.label}</span>
            </button>
          )
        })}
      </div>

      {/* Banner de Mensaje Fijado en este Canal */}
      {mensajeFijado && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 10,
          padding: '8px 12px',
          borderRadius: 10,
          backgroundColor: 'var(--color-surface)',
          border: '1px solid rgba(10, 132, 255, 0.3)',
          marginBottom: 8,
          boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 0 }}>
            <Pin size={14} color="var(--color-accent)" style={{ flexShrink: 0, transform: 'rotate(45deg)' }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <span style={{ fontSize: 10, fontWeight: 800, color: 'var(--color-accent)', textTransform: 'uppercase', display: 'block' }}>
                Mensaje fijado {mensajeFijado.fijado_por_nombre ? `por ${mensajeFijado.fijado_por_nombre}` : ''}
              </span>
              <p style={{
                fontSize: 12,
                fontWeight: 600,
                color: 'var(--color-ink)',
                margin: 0,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis'
              }}>
                {mensajeFijado.texto}
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
            <button
              type="button"
              onClick={() => scrollToMessage(mensajeFijado.id)}
              style={{
                padding: '3px 8px',
                borderRadius: 6,
                backgroundColor: 'rgba(10, 132, 255, 0.12)',
                color: 'var(--color-accent)',
                border: 'none',
                fontSize: 11,
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              Ver
            </button>
            {perfil?.rol === 'moderador' && (
              <button
                type="button"
                onClick={() => toggleFijado(mensajeFijado.id, perfil)}
                title="Desfijar mensaje"
                style={{ background: 'none', border: 'none', color: 'var(--color-tertiary-ink)', cursor: 'pointer', padding: 2 }}
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Ventana de mensajes del chat estilo iOS */}
      <div
        className="card"
        style={{
          flex: 1,
          height: 'calc(100vh - 275px)',
          minHeight: 460,
          display: 'flex',
          flexDirection: 'column',
          padding: 0,
          overflow: 'hidden',
          marginBottom: 8
        }}
      >
        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '16px 14px',
          display: 'flex',
          flexDirection: 'column',
          gap: 6
        }}>
          {cargando && mensajes.length === 0 ? (
            <div style={{ textAlign: 'center', margin: 'auto' }}>
              <p className="apple-caption">Cargando mensajes de #{canal}...</p>
            </div>
          ) : mensajesFiltrados.length === 0 ? (
            <div style={{ textAlign: 'center', margin: 'auto', padding: 24 }}>
              <div style={{ display: 'inline-flex', padding: 12, borderRadius: 14, background: 'var(--color-fill-secondary)', color: 'var(--color-secondary-ink)', marginBottom: 8 }}>
                <MessageSquare size={24} />
              </div>
              <p className="apple-subheadline" style={{ fontSize: 14 }}>
                {queryBusqueda ? `Sin resultados para "${queryBusqueda}"` : `No hay mensajes en #${canal}.`}
              </p>
              <p className="apple-caption" style={{ marginTop: 2 }}>
                {queryBusqueda ? 'Intenta con otras palabras o limpia la búsqueda.' : 'Escribe un mensaje, haz una pregunta o estampa un sello.'}
              </p>
            </div>
          ) : (
            mensajesFiltrados.map((m, idx) => {
              const esPropio = perfil && m.user_id === perfil.id
              const esUltimo = idx === mensajesFiltrados.length - 1
              const hora = m.created_at
                ? new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                : ''
              const isLiked = likedId === m.id
              const autorNombre = m.nombre || m.profiles?.nombre || 'Compañero'
              const autorUsername = m.username || m.profiles?.username
              const autorRol = m.rol || m.profiles?.rol || 'alumno'
              const autorColor = m.color_acento || m.profiles?.color_acento
              const autorDigito = m.digito_id || m.profiles?.digito_id
              const autorApodo = m.titulo_vip || (m.profiles?.frase ? m.profiles.frase : (esPropio && perfil?.frase ? perfil.frase : null))
              const autorMarco = m.marco_avatar || m.profiles?.marco_avatar || (esPropio ? perfil?.marco_avatar : null)
              const autorBurbuja = m.burbuja_chat || m.profiles?.burbuja_chat || (esPropio ? perfil?.burbuja_chat : null)
              const autorPin = m.insignia_activa || m.profiles?.insignia_activa || (esPropio ? perfil?.insignia_activa : null)
              const esModerador = autorRol === 'moderador'

              // Agrupación de mensajes consecutivos
              const mensajeAnterior = idx > 0 ? mensajesFiltrados[idx - 1] : null
              const mismoEmisor = mensajeAnterior && mensajeAnterior.user_id === m.user_id && (new Date(m.created_at) - new Date(mensajeAnterior.created_at)) < 120000

              // 1. Mensaje tipo SELLO FÍSICO DE TINTA
              const selloDetectado = parsearSelloMensaje(m.texto)
              if (selloDetectado) {
                return (
                  <div
                    key={m.id || idx}
                    id={`msg-${m.id}`}
                    ref={esUltimo ? ultimoMensajeRef : null}
                    className={mensajeDestacadoId === m.id ? 'chat-highlight-flash' : ''}
                    style={{
                      width: '100%',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: esPropio ? 'flex-end' : 'flex-start',
                      margin: '6px 0',
                      borderRadius: 12,
                      padding: '4px 6px'
                    }}
                  >
                    {!mismoEmisor && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                        <span className="apple-caption" style={{ fontWeight: 600 }}>{autorNombre}</span>
                        {autorUsername && <span className="apple-caption" style={{ color: 'var(--color-accent)' }}>@{autorUsername}</span>}
                        {autorDigito && <span className="apple-caption">({autorDigito})</span>}
                      </div>
                    )}

                    <div className={`sello-tinta ${selloDetectado.clase}`} style={{ fontSize: 13, padding: '8px 18px' }}>
                      ★ {selloDetectado.etiqueta} ★
                    </div>

                    <span className="apple-caption" style={{ fontSize: 10, marginTop: 4 }}>
                      {hora}
                    </span>
                  </div>
                )
              }

              // 2. Mensaje tipo EFECTO DE CLASE
              const efectoInfo = parsearEfectoMensaje(m.texto)
              if (efectoInfo) {
                const configEfecto = {
                  terremoto: { color: '#FF3B30', bg: 'var(--color-negative-bg)', icono: Zap, titulo: 'SACUDIDA EN EL AULA' },
                  confeti: { color: '#FF9500', bg: 'var(--color-warning-bg)', icono: Sparkles, titulo: 'LLUVIA DE CONFETI' },
                  megafono: { color: '#007AFF', bg: 'rgba(0, 122, 255, 0.08)', icono: Megaphone, titulo: 'TABLÓN DE AVISOS' },
                  descanso: { color: '#34C759', bg: 'var(--color-positive-bg)', icono: Coffee, titulo: 'SILBATO 18:10' }
                }[efectoInfo.tipo] || { color: '#007AFF', bg: 'var(--color-fill-secondary)', icono: Radio, titulo: 'AVISO EN DIRECTO' }

                const IconoEfecto = configEfecto.icono

                return (
                  <div
                    key={m.id || idx}
                    id={`msg-${m.id}`}
                    ref={esUltimo ? ultimoMensajeRef : null}
                    style={{
                      width: '100%',
                      padding: '12px 14px',
                      borderRadius: 14,
                      backgroundColor: configEfecto.bg,
                      border: `1.5px solid ${configEfecto.color}35`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 12,
                      margin: '4px 0',
                      animation: 'fadeIn 0.2s ease'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
                      <div style={{
                        width: 32,
                        height: 32,
                        borderRadius: 8,
                        backgroundColor: configEfecto.color,
                        color: '#FFFFFF',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0
                      }}>
                        <IconoEfecto size={16} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ fontSize: 11, fontWeight: 800, color: configEfecto.color, letterSpacing: 0.5 }}>
                            {configEfecto.titulo}
                          </span>
                          <span style={{ fontSize: 11, color: 'var(--color-secondary-ink)' }}>
                            · {autorNombre}
                          </span>
                        </div>
                        <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-ink)', margin: '2px 0 0', wordBreak: 'break-word' }}>
                          {efectoInfo.contenido || m.texto}
                        </p>
                      </div>
                    </div>

                    <span className="apple-caption" style={{ fontSize: 11, flexShrink: 0 }}>
                      {hora}
                    </span>
                  </div>
                )
              }

              // 3. Mensaje regular estilo iOS con soporte de citas y reacciones
              const tieneReacciones = m.reacciones && Object.keys(m.reacciones).length > 0

              return (
                <div
                  key={m.id || idx}
                  id={`msg-${m.id}`}
                  ref={esUltimo ? ultimoMensajeRef : null}
                  className={`chat-message-row ${mensajeDestacadoId === m.id ? 'chat-highlight-flash' : ''}`}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: esPropio ? 'flex-end' : 'flex-start',
                    maxWidth: '88%',
                    alignSelf: esPropio ? 'flex-end' : 'flex-start',
                    marginTop: mismoEmisor ? 2 : 8,
                    borderRadius: 14,
                    padding: '2px 4px',
                    position: 'relative'
                  }}
                >
                  {/* Encabezado del remitente */}
                  {!esPropio && !mismoEmisor && (
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      marginBottom: 3,
                      paddingLeft: 4,
                      flexWrap: 'wrap'
                    }}>
                      <AvatarUsuario nombre={autorNombre} color={autorColor} rol={autorRol} size={22} fontSize={10} marco={autorMarco} />
                      <span className="apple-caption" style={{ fontWeight: 700, color: 'var(--color-ink)' }}>
                        {autorNombre}
                      </span>
                      {autorUsername && (
                        <span className="apple-caption" style={{ color: 'var(--color-accent)', fontWeight: 600 }}>
                          @{autorUsername}
                        </span>
                      )}
                      {autorPin === 'pin_oro' && <span title="Pin de Oro Coleccionista SMR2" style={{ fontSize: 12 }}>👑</span>}
                      {autorPin === 'pin_hacker' && <span title="Insignia Hacker Ético" style={{ fontSize: 12 }}>🛡️</span>}
                      {autorPin === 'pin_arcade' && <span title="Medalla Estrella Yoshi" style={{ fontSize: 12 }}>⭐</span>}
                      {esModerador && (
                        <span style={{
                          fontSize: 10,
                          fontWeight: 800,
                          padding: '1px 6px',
                          borderRadius: 6,
                          backgroundColor: 'rgba(10, 132, 255, 0.12)',
                          color: 'var(--color-accent)',
                          border: '1px solid rgba(10, 132, 255, 0.25)',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 3
                        }}>
                          <ShieldCheck size={11} />
                          Profesor
                        </span>
                      )}
                      {autorDigito && (
                        <span style={{
                          fontSize: 10,
                          fontWeight: 700,
                          padding: '1px 5px',
                          borderRadius: 4,
                          backgroundColor: 'var(--color-fill-secondary)',
                          color: 'var(--color-secondary-ink)',
                          fontVariantNumeric: 'tabular-nums'
                        }}>
                          {autorDigito}
                        </span>
                      )}
                      {autorApodo && (
                        <span style={{
                          fontSize: 10,
                          fontWeight: 700,
                          padding: '1px 6px',
                          borderRadius: 6,
                          backgroundColor: 'rgba(255, 149, 0, 0.1)',
                          color: 'var(--color-warning)',
                          border: '1px solid rgba(255, 149, 0, 0.25)'
                        }}>
                          {autorApodo}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Burbuja del mensaje con soporte de doble click/tap para dar me gusta */}
                  <div
                    onDoubleClick={(e) => {
                      e.stopPropagation()
                      manejarLike(m.id)
                    }}
                    style={{
                      padding: '10px 14px',
                      borderRadius: 18,
                      borderBottomRightRadius: esPropio ? 4 : 18,
                      borderBottomLeftRadius: esPropio ? 18 : 4,
                      backgroundColor: autorBurbuja === 'carmin'
                        ? (esPropio ? '#991B1B' : '#7F1D1D')
                        : autorBurbuja === 'matrix'
                        ? '#064E3B'
                        : esPropio
                        ? 'var(--color-accent)'
                        : esModerador
                        ? 'var(--color-surface)'
                        : 'var(--color-surface)',
                      border: autorBurbuja === 'carmin'
                        ? '1.5px solid #F59E0B'
                        : autorBurbuja === 'matrix'
                        ? '1.5px solid #34C759'
                        : esPropio
                        ? 'none'
                        : esModerador
                        ? '1.5px solid rgba(10, 132, 255, 0.35)'
                        : '1px solid var(--color-separator)',
                      color: (autorBurbuja || esPropio) ? '#FFFFFF' : 'var(--color-ink)',
                      fontSize: 15,
                      lineHeight: 1.4,
                      wordBreak: 'break-word',
                      boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
                      position: 'relative',
                      cursor: 'pointer'
                    }}
                    title="Doble clic para dar me gusta ❤️"
                  >
                    {/* Indicador de Cita / Mensaje citado */}
                    {(m.reply_to_texto || m.reply_to) && (
                      <div
                        onClick={(e) => {
                          e.stopPropagation()
                          if (m.reply_to) scrollToMessage(m.reply_to)
                        }}
                        className="chat-reply-quote"
                        style={{
                          borderLeftColor: esPropio ? '#FFFFFF' : 'var(--color-accent)',
                          backgroundColor: esPropio ? 'rgba(255, 255, 255, 0.15)' : 'rgba(120, 120, 128, 0.08)',
                          color: esPropio ? '#FFFFFF' : 'var(--color-ink)'
                        }}
                      >
                        <div style={{ fontWeight: 700, fontSize: 11, marginBottom: 2 }}>
                          ↩️ {m.reply_to_nombre || 'Respuesta a compañero'}
                        </div>
                        <div style={{
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          opacity: 0.9
                        }}>
                          {m.reply_to_texto || 'Mensaje citado'}
                        </div>
                      </div>
                    )}

                    {/* Texto formateado del mensaje */}
                    {renderizarTextoEnriquecido(m.texto, esPropio)}

                    {/* Badge flotante de Me Gusta en la esquina de la burbuja */}
                    {((m.likes_count || 0) > 0 || m.liked_by_me) && (
                      <div
                        onClick={(e) => {
                          e.stopPropagation()
                          manejarLike(m.id)
                        }}
                        className={`chat-bubble-like-badge ${m.liked_by_me ? 'liked' : ''} ${isLiked ? 'heart-pop' : ''}`}
                        title={m.likers && m.likers.length > 0 ? `Le gusta a: ${m.likers.join(', ')}` : (m.liked_by_me ? 'Ya no me gusta' : 'Dar me gusta')}
                        style={{
                          position: 'absolute',
                          bottom: -9,
                          right: esPropio ? 10 : -8,
                          backgroundColor: 'var(--color-surface)',
                          border: m.liked_by_me ? '1.5px solid rgba(255, 59, 48, 0.5)' : '1px solid var(--color-separator)',
                          boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
                          borderRadius: 9999,
                          padding: '2px 7px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 3,
                          fontSize: 11,
                          fontWeight: 700,
                          cursor: 'pointer',
                          color: '#FF3B30',
                          zIndex: 5,
                          userSelect: 'none',
                          transition: 'all 0.18s cubic-bezier(0.16, 1, 0.3, 1)'
                        }}
                      >
                        <Heart size={12} fill="currentColor" />
                        <span className="tabular-nums" style={{ color: 'var(--color-ink)' }}>
                          {m.likes_count || 1}
                        </span>
                      </div>
                    )}

                    {/* Pin badge si está fijado */}
                    {m.fijado && (
                      <div style={{
                        position: 'absolute',
                        top: -8,
                        right: esPropio ? 'auto' : -6,
                        left: esPropio ? -6 : 'auto',
                        width: 20,
                        height: 20,
                        borderRadius: '50%',
                        backgroundColor: 'var(--color-accent)',
                        color: '#FFFFFF',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
                      }}>
                        <Pin size={11} style={{ transform: 'rotate(45deg)' }} />
                      </div>
                    )}
                  </div>

                  {/* Barra de Reacciones con Emoji Pills */}
                  {tieneReacciones && (
                    <div style={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: 4,
                      marginTop: 6,
                      paddingLeft: esPropio ? 0 : 4,
                      paddingRight: esPropio ? 4 : 0
                    }}>
                      {Object.entries(m.reacciones).map(([emoji, userIds]) => {
                        if (!Array.isArray(userIds) || userIds.length === 0) return null
                        const reaccionadaPorMi = perfil && userIds.includes(perfil.id)
                        return (
                          <button
                            key={emoji}
                            type="button"
                            onClick={() => manejarReaccionEmoji(m.id, emoji)}
                            className={`chat-reaction-pill ${reaccionadaPorMi ? 'activa' : ''}`}
                            title={reaccionadaPorMi ? 'Quitar mi reacción' : 'Reaccionar'}
                          >
                            <span>{emoji}</span>
                            <span className="tabular-nums">{userIds.length}</span>
                          </button>
                        )
                      })}
                    </div>
                  )}

                  {/* Acciones y Metadatos debajo de la burbuja */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    marginTop: 4,
                    padding: '0 4px',
                    flexWrap: 'wrap'
                  }}>
                    <span className="apple-caption" style={{ fontSize: 11 }}>
                      {hora}
                    </span>

                    {/* Botón de Me Gusta mejorado */}
                    <button
                      type="button"
                      onClick={() => manejarLike(m.id)}
                      className={`chat-like-btn ${isLiked ? 'heart-pop' : ''} ${m.liked_by_me ? 'liked' : ''}`}
                      title={
                        m.likers && m.likers.length > 0
                          ? `Le gusta a: ${m.likers.join(', ')}`
                          : m.liked_by_me ? 'Ya no me gusta' : 'Dar me gusta'
                      }
                      style={{
                        background: m.liked_by_me ? 'rgba(255, 59, 48, 0.12)' : 'transparent',
                        border: m.liked_by_me ? '1px solid rgba(255, 59, 48, 0.3)' : '1px solid transparent',
                        borderRadius: 10,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4,
                        color: m.liked_by_me
                          ? '#FF3B30'
                          : 'var(--color-secondary-ink)',
                        fontSize: 12,
                        fontWeight: 600,
                        padding: '2px 7px',
                        transition: 'all 0.16s ease'
                      }}
                    >
                      <Heart
                        size={13}
                        fill={m.liked_by_me ? '#FF3B30' : 'none'}
                        color={m.liked_by_me ? '#FF3B30' : 'currentColor'}
                        style={{
                          transform: isLiked ? 'scale(1.3)' : 'scale(1)',
                          transition: 'transform 0.15s ease'
                        }}
                      />
                      <span className="tabular-nums font-semibold">
                        {m.liked_by_me ? 'Te gusta' : 'Me gusta'}
                      </span>
                    </button>

                    {/* Botón Responder (Quote) */}
                    <button
                      type="button"
                      onClick={() => {
                        setMensajeAResponder({ id: m.id, texto: m.texto, nombre: autorNombre })
                        inputRef.current?.focus()
                        sound.playPop()
                      }}
                      title="Citar y responder"
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--color-secondary-ink)',
                        cursor: 'pointer',
                        padding: '2px 4px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 2,
                        fontSize: 11,
                        fontWeight: 600
                      }}
                    >
                      <Reply size={12} />
                      <span>Responder</span>
                    </button>

                    {/* Selector de Reacciones Populares */}
                    <div style={{ position: 'relative' }}>
                      <button
                        type="button"
                        onClick={() => setMenuReaccionesAbiertoId(menuReaccionesAbiertoId === m.id ? null : m.id)}
                        title="Añadir reacción"
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'var(--color-secondary-ink)',
                          cursor: 'pointer',
                          padding: '2px 4px',
                          display: 'inline-flex',
                          alignItems: 'center'
                        }}
                      >
                        <Smile size={12} />
                      </button>

                      {menuReaccionesAbiertoId === m.id && (
                        <div style={{
                          position: 'absolute',
                          bottom: 24,
                          left: esPropio ? 'auto' : 0,
                          right: esPropio ? 0 : 'auto',
                          display: 'flex',
                          gap: 6,
                          padding: '6px 8px',
                          borderRadius: 20,
                          backgroundColor: 'var(--color-surface)',
                          border: '1px solid var(--color-separator)',
                          boxShadow: '0 4px 12px rgba(0,0,0,0.12)',
                          zIndex: 100,
                          animation: 'fadeIn 0.15s ease'
                        }}>
                          {REACCIONES_POPULARES.map(({ emoji, label }) => (
                            <button
                              key={emoji}
                              type="button"
                              onClick={() => manejarReaccionEmoji(m.id, emoji)}
                              title={label}
                              style={{
                                background: 'none',
                                border: 'none',
                                fontSize: 16,
                                cursor: 'pointer',
                                padding: '2px',
                                transition: 'transform 0.1s ease'
                              }}
                              onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.25)'}
                              onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                            >
                              {emoji}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Fijar en el canal (Solo Moderador) */}
                    {perfil?.rol === 'moderador' && (
                      <button
                        type="button"
                        onClick={() => {
                          toggleFijado(m.id, perfil)
                          sound.playStamp()
                        }}
                        title={m.fijado ? 'Desfijar del canal' : 'Fijar mensaje en canal'}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: m.fijado ? 'var(--color-accent)' : 'var(--color-secondary-ink)',
                          cursor: 'pointer',
                          padding: '2px 4px'
                        }}
                      >
                        <Pin size={12} style={{ transform: 'rotate(45deg)' }} />
                      </button>
                    )}

                    {/* Eliminar Mensaje (Autor o Moderador) */}
                    {(esPropio || perfil?.rol === 'moderador') && (
                      <button
                        type="button"
                        onClick={() => {
                          if (confirm('¿Eliminar este mensaje del chat?')) {
                            eliminarMensaje(m.id)
                            sound.playPop()
                          }
                        }}
                        title="Eliminar mensaje"
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'var(--color-secondary-ink)',
                          cursor: 'pointer',
                          padding: '2px 4px'
                        }}
                      >
                        <Trash2 size={12} />
                      </button>
                    )}
                  </div>
                </div>
              )
            })
          )}
          <div ref={chatEndRef} />
        </div>

        {/* Indicador de Usuarios Escribiendo (Typing) */}
        {nombresEscribiendo.length > 0 && (
          <div style={{ padding: '4px 14px', animation: 'fadeIn 0.2s ease' }}>
            <div className="chat-typing-dots">
              <span className="chat-dot-bounce" />
              <span className="chat-dot-bounce" />
              <span className="chat-dot-bounce" />
              <span style={{ marginLeft: 4, fontWeight: 600 }}>
                {nombresEscribiendo.join(', ')} {nombresEscribiendo.length === 1 ? 'está escribiendo...' : 'están escribiendo...'}
              </span>
            </div>
          </div>
        )}

        {/* Banner de Mensaje al que se responde (Reply Bar) */}
        {mensajeAResponder && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '8px 14px',
            backgroundColor: 'var(--color-surface-secondary)',
            borderTop: '1px solid var(--color-separator)',
            borderLeft: '4px solid var(--color-accent)',
            animation: 'fadeIn 0.15s ease'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 0 }}>
              <Reply size={15} color="var(--color-accent)" />
              <div style={{ flex: 1, minWidth: 0 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-accent)', display: 'block' }}>
                  Respondiendo a {mensajeAResponder.nombre}
                </span>
                <p style={{
                  fontSize: 12,
                  color: 'var(--color-secondary-ink)',
                  margin: 0,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis'
                }}>
                  {mensajeAResponder.texto}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setMensajeAResponder(null)}
              style={{ background: 'none', border: 'none', color: 'var(--color-tertiary-ink)', cursor: 'pointer', padding: 4 }}
            >
              <X size={15} />
            </button>
          </div>
        )}

        {/* Cajón de Sellos Rápidos de Aula */}
        {mostrarMenuSellos && (
          <div style={{
            padding: '10px 14px',
            backgroundColor: 'var(--color-surface)',
            borderTop: '1px solid var(--color-separator)',
            animation: 'fadeIn 0.15s ease'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <span className="apple-caption" style={{ fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.5, color: 'var(--color-ink)' }}>
                Sellos Oficiales de Clase
              </span>
              <button
                type="button"
                onClick={() => setMostrarMenuSellos(false)}
                style={{ background: 'none', border: 'none', color: 'var(--color-secondary-ink)', cursor: 'pointer' }}
              >
                <X size={15} />
              </button>
            </div>

            <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 }}>
              {SELLOS_RAPIDOS.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => manejarEstamparSello(s)}
                  className={`sello-tinta ${s.clase}`}
                  style={{
                    fontSize: 11,
                    padding: '8px 14px',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    transform: 'none',
                    transition: 'all 0.12s ease'
                  }}
                >
                  {s.etiqueta}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Menú de Acciones Rápidas y Efectos de la Cantina */}
        {mostrarMenuEfectos && (
          <div style={{
            padding: '10px 14px',
            backgroundColor: 'var(--color-surface)',
            borderTop: '1px solid var(--color-separator)',
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
            animation: 'fadeIn 0.15s ease'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span className="apple-caption" style={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, color: 'var(--color-ink)' }}>
                Efectos del Aula (Consumen Puntos)
              </span>
              <button
                type="button"
                onClick={() => setMostrarMenuEfectos(false)}
                style={{ background: 'none', border: 'none', color: 'var(--color-secondary-ink)', cursor: 'pointer' }}
              >
                <X size={15} />
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 6 }}>
              {CATALOGO_RECOMPENSAS.filter(r => r.categoria === 'chat').map((ef) => {
                const IconoEf = ef.icon
                const alcanzable = (perfil?.puntos_total || 0) >= ef.costo
                const segsCooldown = obtenerCooldownRestante(ef.id)
                const enCooldown = segsCooldown > 0

                return (
                  <button
                    key={ef.id}
                    type="button"
                    disabled={!alcanzable || enCooldown}
                    onClick={async () => {
                      if (ef.id === 'sello_tinta_chat') {
                        setMostrarMenuEfectos(false)
                        setMostrarMenuSellos(true)
                      } else {
                        // Comprobar puntos y disparar
                        if (segsCooldown > 0) return
                        if ((perfil?.puntos_total || 0) < ef.costo) {
                          alert(`Te faltan ${ef.costo - (perfil?.puntos_total || 0)} pts`)
                          return
                        }
                        if (ef.cooldownMs) {
                          localStorage.setItem(`muudel_cooldown_${ef.id}`, String(Date.now() + ef.cooldownMs))
                        }
                        setMostrarMenuEfectos(false)
                        const nuevosPuntos = (perfil?.puntos_total || 0) - ef.costo
                        const updated = { ...perfil, puntos_total: nuevosPuntos }
                        setPerfil(updated)
                        localStorage.setItem('racha_local_user', JSON.stringify(updated))
                        try {
                          await supabase.from('profiles').update({ puntos_total: nuevosPuntos }).eq('id', perfil.id)
                          await emitirEfectoChat(ef.efecto, perfil)
                        } catch (err) {}
                      }
                    }}
                    style={{
                      padding: '8px 10px',
                      borderRadius: 10,
                      border: `1px solid var(--color-separator)`,
                      backgroundColor: enCooldown ? 'var(--color-fill-secondary)' : 'var(--color-surface-secondary)',
                      color: enCooldown ? 'var(--color-secondary-ink)' : alcanzable ? 'var(--color-ink)' : 'var(--color-tertiary-ink)',
                      fontSize: 12,
                      fontWeight: 700,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 6,
                      cursor: (alcanzable && !enCooldown) ? 'pointer' : 'not-allowed',
                      opacity: (alcanzable && !enCooldown) ? 1 : 0.5
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, overflow: 'hidden' }}>
                      <IconoEf size={14} style={{ flexShrink: 0, color: enCooldown ? 'var(--color-secondary-ink)' : ef.color }} />
                      <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {ef.titulo.split(' ')[0]}
                      </span>
                    </div>
                    <span style={{ fontSize: 11, color: enCooldown ? 'var(--color-warning)' : 'var(--color-secondary-ink)', fontWeight: enCooldown ? 800 : 500 }}>
                      {enCooldown ? `⏳ ${segsCooldown}s` : `${ef.costo}p`}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* Respuestas rápidas */}
        <div style={{
          display: 'flex',
          gap: 6,
          padding: '6px 12px',
          overflowX: 'auto',
          backgroundColor: 'var(--color-surface-secondary)',
          borderTop: '0.5px solid var(--color-separator)',
          scrollbarWidth: 'none',
        }}>
          {RESPUESTAS_RAPIDAS.map((frase) => (
            <button
              key={frase}
              type="button"
              onClick={() => {
                setTexto(frase)
                inputRef.current?.focus()
              }}
              style={{
                background: 'var(--color-surface)',
                border: '1px solid var(--color-separator)',
                padding: '4px 10px',
                borderRadius: 9999,
                fontSize: 12,
                fontWeight: 500,
                color: 'var(--color-secondary-ink)',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              {frase}
            </button>
          ))}
        </div>

        {/* Barra de entrada de texto */}
        <form
          onSubmit={manejarEnvio}
          style={{
            padding: '10px 12px',
            backgroundColor: 'var(--color-surface)',
            borderTop: '0.5px solid var(--color-separator)',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          {/* Botón de Sellos Rápidos */}
          <button
            type="button"
            onClick={() => {
              setMostrarMenuSellos(!mostrarMenuSellos)
              setMostrarMenuEfectos(false)
            }}
            title="Estampar sello de clase"
            style={{
              width: 36,
              height: 36,
              borderRadius: 9999,
              backgroundColor: mostrarMenuSellos ? 'var(--color-fill-secondary)' : 'transparent',
              color: 'var(--color-ink)',
              border: '1px solid var(--color-separator)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              flexShrink: 0
            }}
          >
            <Stamp size={17} />
          </button>

          {/* Botón de Efectos de Clase */}
          <button
            type="button"
            onClick={() => {
              setMostrarMenuEfectos(!mostrarMenuEfectos)
              setMostrarMenuSellos(false)
            }}
            title="Efectos de la tienda"
            style={{
              width: 36,
              height: 36,
              borderRadius: 9999,
              backgroundColor: mostrarMenuEfectos ? 'var(--color-fill-secondary)' : 'transparent',
              color: 'var(--color-warning)',
              border: '1px solid var(--color-separator)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              flexShrink: 0
            }}
          >
            <Sparkles size={16} />
          </button>

          <input
            ref={inputRef}
            className="apple-input"
            value={texto}
            disabled={estaBloqueadoEnvio}
            onChange={handleInputChange}
            placeholder={
              estaBloqueadoEnvio
                ? '🔒 Chat silenciado temporalmente por moderación'
                : mensajeAResponder
                ? `Respondiendo a @${mensajeAResponder.nombre}...`
                : `Mensaje en #${canal}...`
            }
            style={{
              minHeight: 40,
              borderRadius: 20,
              padding: '8px 16px',
              fontSize: 15,
              opacity: estaBloqueadoEnvio ? 0.6 : 1
            }}
          />

          <button
            type="submit"
            disabled={!texto.trim() || estaBloqueadoEnvio}
            style={{
              width: 36,
              height: 36,
              borderRadius: 9999,
              backgroundColor: texto.trim() && !estaBloqueadoEnvio ? 'var(--color-accent)' : 'var(--color-fill-secondary)',
              color: texto.trim() && !estaBloqueadoEnvio ? '#FFFFFF' : 'var(--color-tertiary-ink)',
              border: 'none',
              cursor: texto.trim() && !estaBloqueadoEnvio ? 'pointer' : 'default',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              transition: 'all 0.15s ease',
            }}
          >
            <ArrowUp size={18} strokeWidth={2.5} />
          </button>
        </form>
      </div>

      {/* MODAL DE LA CANTINA / TIENDA DE RECOMPENSAS */}
      {mostrarTienda && (
        <TiendaRecompensas onClose={() => setMostrarTienda(false)} />
      )}
    </main>
  )
}
