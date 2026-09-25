import { useState, useRef, useEffect } from 'react'
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
  Flame,
  Coffee,
  X,
  Volume2,
  Lock,
  Unlock,
  Radio
} from 'lucide-react'
import { sound, triggerConfetti } from '../utils/haptics'
import { animarBurbuja } from '../utils/animations'
import { AvatarUsuario } from '../components/AvatarUsuario'
import { TiendaRecompensas, emitirEfectoChat, CATALOGO_RECOMPENSAS } from '../components/TiendaRecompensas'

const CANALES = [
  { id: 'general', label: 'General' },
  { id: 'dudas', label: 'Dudas' },
  { id: 'apuntes', label: 'Apuntes' },
  { id: 'avisos', label: 'Avisos' },
]

const RESPUESTAS_RAPIDAS = [
  'Presente ✋',
  '15:30 ⏰',
  'Descanso ☕',
  '¿En qué aula?',
  'Apunte de SOR 📁',
  'Top 1 🏆',
]

export function PantallaChat() {
  const { perfil, setPerfil } = useAuth()
  const [canal, setCanal] = useState('general')
  const [texto, setTexto] = useState('')
  const [likedId, setLikedId] = useState(null)
  const { mensajes, cargando, enviar, like } = useChat(canal)
  const chatEndRef = useRef(null)
  const ultimoMensajeRef = useRef(null)

  // Estados de la Tienda y Efectos de Chat
  const [mostrarTienda, setMostrarTienda] = useState(false)
  const [mostrarMenuEfectos, setMostrarMenuEfectos] = useState(false)

  // Efectos visuales activos en la pantalla
  const [temblorActivo, setTemblorActivo] = useState(false)
  const [fiestaActiva, setFiestaActiva] = useState(false)
  const [alertaDescanso, setAlertaDescanso] = useState(null)
  const [megafonoActivo, setMegafonoActivo] = useState(() => {
    try {
      const guardado = localStorage.getItem('muudel_megafono_activo')
      return guardado ? JSON.parse(guardado) : null
    } catch (e) {
      return null
    }
  })

  // Estado de moderación del chat
  const [chatSilenciado, setChatSilenciado] = useState(false)
  const idUltimoEfectoProcesado = useRef(null)

  // 1. Comprobar si el chat está silenciado por el moderador
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
    const timer = setInterval(revisarSilencio, 5000)
    return () => clearInterval(timer)
  }, [])

  // 2. Escuchar evento local de efecto de chat
  useEffect(() => {
    const handler = (e) => {
      const { tipo, autor, texto: textoExtra } = e.detail || {}
      ejecutarEfecto(tipo, autor, textoExtra)
    }
    window.addEventListener('muudel-efecto-chat', handler)
    return () => window.removeEventListener('muudel-efecto-chat', handler)
  }, [])

  // 3. Detectar efectos en los mensajes que llegan por Supabase
  useEffect(() => {
    if (mensajes.length === 0) return
    const ultimo = mensajes[mensajes.length - 1]
    if (!ultimo || !ultimo.texto) return

    if (ultimo.id !== idUltimoEfectoProcesado.current && ultimo.texto.startsWith('[EFECTO:')) {
      idUltimoEfectoProcesado.current = ultimo.id
      const match = ultimo.texto.match(/\[EFECTO:([a-z0-9_]+)(?::([^\]]+))?\]\s*(.*)/i)
      if (match) {
        const tipo = match[1]
        const autor = match[2] || ultimo.nombre || 'Compañero'
        const contenido = match[3] || ''
        ejecutarEfecto(tipo, autor, contenido)
      }
    }
  }, [mensajes])

  // Despachador de efectos visuales y sonoros
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
    } else if (tipo === 'fiesta') {
      sound.playPop()
      setFiestaActiva(true)
      setTimeout(() => setFiestaActiva(false), 6000)
    } else if (tipo === 'megafono') {
      sound.playPop()
      const nuevoMegafono = {
        autor: autor || 'Compañero',
        texto: textoExtra || '¡Anuncio para toda la clase!',
        hora: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
      setMegafonoActivo(nuevoMegafono)
    } else if (tipo === 'descanso') {
      sound.playPop()
      setAlertaDescanso(`¡${autor} avisa: Descanso de las 18:10!`)
      setTimeout(() => setAlertaDescanso(null), 5000)
    }
  }

  // Scroll automático y animación de burbujas
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    if (ultimoMensajeRef.current) {
      animarBurbuja(ultimoMensajeRef.current)
    }
  }, [mensajes])

  const manejarEnvio = async (e) => {
    if (e) e.preventDefault()
    if (!texto.trim() || !perfil) return

    if (chatSilenciado && perfil.rol !== 'moderador') {
      sound.playPop()
      return
    }

    const contenido = texto
    setTexto('')
    sound.playPop()
    await enviar(contenido, perfil.id, perfil)
  }

  const manejarLike = (id) => {
    setLikedId(id)
    sound.playPop()
    like(id)
    setTimeout(() => setLikedId(null), 300)
  }

  // Lanzar efecto rápido descontando puntos
  const dispararEfectoRapido = async (itemEfecto) => {
    if (!perfil) return
    const puntos = perfil.puntos_total || 0

    if (puntos < itemEfecto.costo) {
      sound.playPop()
      alert(`Te faltan ${itemEfecto.costo - puntos} pts para desatar ${itemEfecto.titulo}`)
      return
    }

    setMostrarMenuEfectos(false)
    const nuevosPuntos = puntos - itemEfecto.costo
    const updated = { ...perfil, puntos_total: nuevosPuntos }
    setPerfil(updated)
    localStorage.setItem('racha_local_user', JSON.stringify(updated))

    try {
      emitirEfectoChat(itemEfecto.efecto, perfil)
    } catch (e) {}
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

  const estaBloqueadoEnvio = chatSilenciado && perfil?.rol !== 'moderador'

  return (
    <main className={`app-container ${temblorActivo ? 'chat-screen-shake' : ''}`}>
      {/* Cabecera */}
      <header style={{ marginBottom: 14 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 className="apple-large-title" style={{ fontSize: 28 }}>
              Chat de Clase
            </h1>
            <p className="apple-subheadline" style={{ marginTop: 1, fontSize: 13 }}>
              SMR2 Tarde · Comunidad activa y efectos en vivo
            </p>
          </div>

          {/* Botón de la Cantina / Tienda con puntos en vivo */}
          <button
            type="button"
            onClick={() => setMostrarTienda(true)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '8px 14px',
              borderRadius: 9999,
              backgroundColor: 'rgba(10, 132, 255, 0.1)',
              color: 'var(--color-accent)',
              border: '1px solid rgba(10, 132, 255, 0.25)',
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
      </header>

      {/* Alerta de descanso flotante */}
      {alertaDescanso && (
        <div style={{
          padding: '10px 14px',
          borderRadius: 12,
          backgroundColor: 'rgba(255, 149, 0, 0.14)',
          border: '1px solid rgba(255, 149, 0, 0.35)',
          color: 'var(--color-warning)',
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
              backgroundColor: '#D4AF37',
              color: '#FFFFFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}>
              <Megaphone size={16} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 11, fontWeight: 800, color: '#D4AF37', textTransform: 'uppercase' }}>
                  Anuncio Fijado ({megafonoActivo.autor})
                </span>
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

      {/* Selector de canales */}
      <div style={{
        display: 'flex',
        gap: 8,
        marginBottom: 10,
        overflowX: 'auto',
        paddingBottom: 4,
        scrollbarWidth: 'none',
      }}>
        {CANALES.map((c) => {
          const activo = canal === c.id
          return (
            <button
              key={c.id}
              onClick={() => setCanal(c.id)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                padding: '6px 14px',
                borderRadius: 9999,
                border: 'none',
                backgroundColor: activo ? 'var(--color-accent)' : 'var(--color-fill-secondary)',
                color: activo ? '#FFFFFF' : 'var(--color-ink)',
                fontWeight: 600,
                fontSize: 13,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all 0.15s ease',
              }}
            >
              <Hash size={13} opacity={activo ? 0.9 : 0.6} />
              {c.label}
            </button>
          )
        })}
      </div>

      {/* Ventana de mensajes del chat */}
      <div
        className={`card ${fiestaActiva ? 'chat-party-mode' : ''}`}
        style={{
          height: '56vh',
          minHeight: 400,
          display: 'flex',
          flexDirection: 'column',
          padding: 0,
          overflow: 'hidden',
          marginBottom: 8,
          transition: 'border 0.2s ease, box-shadow 0.2s ease'
        }}
      >
        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: 16,
          display: 'flex',
          flexDirection: 'column',
          gap: 12
        }}>
          {cargando && mensajes.length === 0 ? (
            <div style={{ textAlign: 'center', margin: 'auto' }}>
              <p className="apple-caption">Cargando mensajes...</p>
            </div>
          ) : mensajes.length === 0 ? (
            <div style={{ textAlign: 'center', margin: 'auto', padding: 24 }}>
              <div style={{ display: 'inline-flex', padding: 12, borderRadius: 14, background: 'var(--color-fill-secondary)', color: 'var(--color-secondary-ink)', marginBottom: 8 }}>
                <MessageSquare size={24} />
              </div>
              <p className="apple-subheadline" style={{ fontSize: 14 }}>
                No hay mensajes en #{canal}.
              </p>
              <p className="apple-caption" style={{ marginTop: 2 }}>
                Escribe un mensaje o activa un efecto de la tienda.
              </p>
            </div>
          ) : (
            mensajes.map((m, idx) => {
              const esPropio = perfil && m.user_id === perfil.id
              const esUltimo = idx === mensajes.length - 1
              const hora = m.created_at
                ? new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                : ''
              const isLiked = likedId === m.id
              const autorNombre = m.nombre || m.profiles?.nombre || 'Compañero'
              const autorRol = m.rol || m.profiles?.rol || 'alumno'
              const autorColor = m.color_acento || m.profiles?.color_acento
              const autorDigito = m.digito_id || m.profiles?.digito_id
              
              // Título VIP desbloqueado en la tienda
              const autorTitulo = m.titulo_vip || (m.profiles?.frase?.startsWith('👑') ? m.profiles.frase : (esPropio && perfil?.frase?.startsWith('👑') ? perfil.frase : null))

              const efectoInfo = parsearEfectoMensaje(m.texto)

              // Si es un mensaje de efecto viral de chat, renderizar tarjeta especial
              if (efectoInfo) {
                const configEfecto = {
                  terremoto: { color: '#FF3B30', bg: 'rgba(255, 59, 48, 0.1)', icono: Zap, titulo: 'TERREMOTO EN CLASE' },
                  confeti: { color: '#FF9500', bg: 'rgba(255, 149, 0, 0.1)', icono: Sparkles, titulo: 'LLUVIA DE CONFETI' },
                  megafono: { color: '#D4AF37', bg: 'rgba(212, 175, 55, 0.12)', icono: Megaphone, titulo: 'MEGÁFONO DE CLASE' },
                  fiesta: { color: '#AF52DE', bg: 'rgba(175, 82, 222, 0.12)', icono: Flame, titulo: 'MODO FIESTA / DISCO' },
                  descanso: { color: '#0A84FF', bg: 'rgba(10, 132, 255, 0.1)', icono: Coffee, titulo: 'SIRENA DE DESCANSO' }
                }[efectoInfo.tipo] || { color: '#0A84FF', bg: 'rgba(10, 132, 255, 0.1)', icono: Radio, titulo: 'AVISO EN DIRECTO' }

                const IconoEfecto = configEfecto.icono

                return (
                  <div
                    key={m.id || idx}
                    ref={esUltimo ? ultimoMensajeRef : null}
                    style={{
                      width: '100%',
                      padding: '12px 14px',
                      borderRadius: 14,
                      backgroundColor: configEfecto.bg,
                      border: `1.5px solid ${configEfecto.color}40`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 12,
                      animation: 'fadeIn 0.25s ease'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
                      <div style={{
                        width: 34,
                        height: 34,
                        borderRadius: 10,
                        backgroundColor: configEfecto.color,
                        color: '#FFFFFF',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0
                      }}>
                        <IconoEfecto size={18} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ fontSize: 11, fontWeight: 800, color: configEfecto.color, letterSpacing: 0.5 }}>
                            {configEfecto.titulo}
                          </span>
                          <span style={{ fontSize: 11, color: 'var(--color-tertiary-ink)' }}>
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

              return (
                <div
                  key={m.id || idx}
                  ref={esUltimo ? ultimoMensajeRef : null}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: esPropio ? 'flex-end' : 'flex-start',
                    maxWidth: '85%',
                    alignSelf: esPropio ? 'flex-end' : 'flex-start',
                  }}
                >
                  {!esPropio && (
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      marginBottom: 3,
                      paddingLeft: 4,
                      flexWrap: 'wrap'
                    }}>
                      <AvatarUsuario nombre={autorNombre} color={autorColor} rol={autorRol} size={20} fontSize={9} />
                      <span className="apple-caption" style={{ fontWeight: 600, color: 'var(--color-secondary-ink)' }}>
                        {autorNombre}
                      </span>
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
                      {autorTitulo && (
                        <span style={{
                          fontSize: 10,
                          fontWeight: 700,
                          padding: '1px 6px',
                          borderRadius: 9999,
                          backgroundColor: 'rgba(255, 149, 0, 0.14)',
                          color: 'var(--color-warning)',
                          border: '1px solid rgba(255, 149, 0, 0.3)'
                        }}>
                          {autorTitulo}
                        </span>
                      )}
                    </div>
                  )}

                  <div
                    style={{
                      padding: '10px 14px',
                      borderRadius: 18,
                      borderBottomRightRadius: esPropio ? 4 : 18,
                      borderBottomLeftRadius: esPropio ? 18 : 4,
                      backgroundColor: esPropio ? 'var(--color-accent)' : 'var(--color-fill-secondary)',
                      color: esPropio ? '#FFFFFF' : 'var(--color-ink)',
                      fontSize: 15,
                      lineHeight: 1.35,
                      wordBreak: 'break-word',
                      boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
                    }}
                  >
                    {m.texto}
                  </div>

                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    marginTop: 3,
                    padding: '0 4px'
                  }}>
                    <span className="apple-caption" style={{ fontSize: 11 }}>
                      {hora}
                    </span>

                    <button
                      onClick={() => manejarLike(m.id)}
                      className={isLiked ? 'heart-pop' : ''}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 3,
                        color: (m.likes_count || 0) > 0 ? 'var(--color-negative)' : 'var(--color-tertiary-ink)',
                        fontSize: 12,
                        padding: '2px 4px',
                      }}
                    >
                      <Heart
                        size={13}
                        fill={(m.likes_count || 0) > 0 ? 'currentColor' : 'none'}
                      />
                      <span className="tabular-nums font-semibold">{m.likes_count || 0}</span>
                    </button>
                  </div>
                </div>
              )
            })
          )}
          <div ref={chatEndRef} />
        </div>

        {/* Menú flotante de Efectos Rápidos */}
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
                💥 Desatar Efecto en el Chat (Toda la clase lo ve)
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

                return (
                  <button
                    key={ef.id}
                    type="button"
                    disabled={!alcanzable}
                    onClick={() => dispararEfectoRapido(ef)}
                    style={{
                      padding: '8px 10px',
                      borderRadius: 10,
                      border: `1px solid ${ef.color}35`,
                      backgroundColor: `${ef.color}10`,
                      color: ef.color,
                      fontSize: 12,
                      fontWeight: 700,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 6,
                      cursor: alcanzable ? 'pointer' : 'not-allowed',
                      opacity: alcanzable ? 1 : 0.5
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, overflow: 'hidden' }}>
                      <IconoEf size={14} style={{ flexShrink: 0 }} />
                      <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {ef.titulo.split(' ')[0]}
                      </span>
                    </div>
                    <span style={{ fontSize: 11, opacity: 0.9 }}>{ef.costo}p</span>
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
              onClick={() => setTexto(frase)}
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
          {/* Botón de Efectos de Chat Rápidos */}
          <button
            type="button"
            onClick={() => setMostrarMenuEfectos(!mostrarMenuEfectos)}
            title="Desatar Efecto Viral de Chat"
            style={{
              width: 36,
              height: 36,
              borderRadius: 9999,
              backgroundColor: mostrarMenuEfectos ? 'var(--color-accent)' : 'var(--color-fill-secondary)',
              color: mostrarMenuEfectos ? '#FFFFFF' : 'var(--color-accent)',
              border: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              flexShrink: 0
            }}
          >
            <Sparkles size={17} />
          </button>

          <input
            className="apple-input"
            value={texto}
            disabled={estaBloqueadoEnvio}
            onChange={(e) => setTexto(e.target.value)}
            placeholder={
              estaBloqueadoEnvio
                ? '🔒 Chat silenciado temporalmente por moderación'
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

      {/* MODAL DE LA TIENDA DE RECOMPENSAS */}
      {mostrarTienda && (
        <TiendaRecompensas onClose={() => setMostrarTienda(false)} />
      )}
    </main>
  )
}
