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
  Coffee,
  X,
  Lock,
  Unlock,
  Radio,
  Stamp
} from 'lucide-react'
import { sound, triggerConfetti } from '../utils/haptics'
import { animarBurbuja } from '../utils/animations'
import { AvatarUsuario } from '../components/AvatarUsuario'
import { TiendaRecompensas, emitirEfectoChat, CATALOGO_RECOMPENSAS, SELLOS_OFICIALES } from '../components/TiendaRecompensas'

const CANALES = [
  { id: 'general', label: 'General' },
  { id: 'dudas', label: 'Dudas' },
  { id: 'apuntes', label: 'Apuntes' },
  { id: 'avisos', label: 'Avisos' },
]

const RESPUESTAS_RAPIDAS = [
  'Presente 15:30',
  'Visto en clase',
  'Descanso 18:10',
  '¿Qué ejercicio es?',
  'Duda resuelta',
  'Apunte subido',
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
    } else if (tipo === 'megafono') {
      sound.playPop()
      const nuevoMegafono = {
        autor: autor || 'Compañero',
        texto: textoExtra || 'Aviso fijado de clase',
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
      alert(`Te faltan ${itemEfecto.costo - puntos} pts para canjear "${itemEfecto.titulo}"`)
      return
    }

    setMostrarMenuEfectos(false)
    const nuevosPuntos = puntos - itemEfecto.costo
    const updated = { ...perfil, puntos_total: nuevosPuntos }
    setPerfil(updated)
    localStorage.setItem('racha_local_user', JSON.stringify(updated))

    try {
      await supabase.from('profiles').update({ puntos_total: nuevosPuntos }).eq('id', perfil.id)
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

  const parsearSelloMensaje = (textoMsg) => {
    if (!textoMsg.startsWith('[SELLO:')) return null
    const match = textoMsg.match(/\[SELLO:([A-Z0-9_]+)\]/i)
    if (!match) return null
    const selloId = match[1].toUpperCase()
    return SELLOS_OFICIALES.find(s => s.id === selloId) || SELLOS_OFICIALES[0]
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
              SMR2 Tarde · Comunidad y sellos de asistencia
            </p>
          </div>

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
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--color-accent)', textTransform: 'uppercase' }}>
                  Aviso Fijado ({megafonoActivo.autor})
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
        className="card"
        style={{
          height: '56vh',
          minHeight: 400,
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
                Escribe un mensaje o estampa un sello de clase.
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
              
              // Apodo de clase desbloqueado
              const autorApodo = m.titulo_vip || (m.profiles?.frase ? m.profiles.frase : (esPropio && perfil?.frase ? perfil.frase : null))

              // 1. Mensaje tipo SELLO FÍSICO DE TINTA
              const selloDetectado = parsearSelloMensaje(m.texto)
              if (selloDetectado) {
                return (
                  <div
                    key={m.id || idx}
                    ref={esUltimo ? ultimoMensajeRef : null}
                    style={{
                      width: '100%',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: esPropio ? 'flex-end' : 'flex-start',
                      margin: '4px 0'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                      <span className="apple-caption" style={{ fontWeight: 600 }}>{autorNombre}</span>
                      {autorDigito && <span className="apple-caption">({autorDigito})</span>}
                    </div>

                    <div className={`sello-tinta ${selloDetectado.clase}`} style={{ fontSize: 14, padding: '8px 18px' }}>
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

              // 3. Mensaje regular estilo iOS
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
                      {autorApodo && (
                        <span style={{
                          fontSize: 10,
                          fontWeight: 700,
                          padding: '1px 6px',
                          borderRadius: 6,
                          backgroundColor: 'rgba(0, 122, 255, 0.08)',
                          color: 'var(--color-accent)',
                          border: '1px solid rgba(0, 122, 255, 0.2)'
                        }}>
                          {autorApodo}
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
                      backgroundColor: esPropio ? 'var(--color-accent)' : 'var(--color-surface)',
                      border: esPropio ? 'none' : '1px solid var(--color-separator)',
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

        {/* Menú de Acciones Rápidas y Sellos */}
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
                Sellos y Efectos de Clase
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
                    onClick={() => {
                      if (ef.id === 'sello_tinta_chat') {
                        setMostrarMenuEfectos(false)
                        setMostrarTienda(true)
                      } else {
                        dispararEfectoRapido(ef)
                      }
                    }}
                    style={{
                      padding: '8px 10px',
                      borderRadius: 10,
                      border: `1px solid var(--color-separator)`,
                      backgroundColor: 'var(--color-surface-secondary)',
                      color: alcanzable ? 'var(--color-ink)' : 'var(--color-tertiary-ink)',
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
                      <IconoEf size={14} style={{ flexShrink: 0, color: ef.color }} />
                      <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {ef.titulo.split(' ')[0]}
                      </span>
                    </div>
                    <span style={{ fontSize: 11, color: 'var(--color-secondary-ink)' }}>{ef.costo}p</span>
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
          {/* Botón de Sellos y Efectos Rápidos */}
          <button
            type="button"
            onClick={() => setMostrarMenuEfectos(!mostrarMenuEfectos)}
            title="Acceso a sellos y efectos"
            style={{
              width: 36,
              height: 36,
              borderRadius: 9999,
              backgroundColor: mostrarMenuEfectos ? 'var(--color-fill-secondary)' : 'transparent',
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

      {/* MODAL DE LA CANTINA / TIENDA DE RECOMPENSAS */}
      {mostrarTienda && (
        <TiendaRecompensas onClose={() => setMostrarTienda(false)} />
      )}
    </main>
  )
}
