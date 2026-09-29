// frontend/src/components/PanelMensajesDirectos.jsx
import { useState, useRef, useEffect, useMemo } from 'react'
import {
  Search,
  Send,
  ArrowLeft,
  Check,
  CheckCheck,
  Sparkles,
  Smile,
  Shield,
  MessageSquare,
  Lock,
  Stamp,
  User,
  X
} from 'lucide-react'
import { AvatarUsuario } from './AvatarUsuario'
import { sound } from '../utils/haptics'
import { analizarTextoAntiIA } from '../utils/antiAiDetector'

const REACCIONES_DM = ['❤️', '👍', '🔥', '💡', '😂']

const RESPUESTAS_RAPIDAS_DM = [
  '¿Tienes los apuntes de hoy?',
  '¡Gracias por la ayuda!',
  'Nos vemos en clase 15:30',
  '¿Hacemos el reto juntos?'
]

const SELLOS_DM = [
  { id: 'ENTENDIDO', label: 'ENTENDIDO', texto: '[SELLO:ENTENDIDO]', clase: 'sello-tinta-verde' },
  { id: 'VISTO', label: 'VISTO', texto: '[SELLO:VISTO]', clase: 'sello-tinta-azul' },
  { id: 'GRACIAS', label: 'GRACIAS', texto: '[SELLO:GRACIAS]', clase: 'sello-tinta-rojo' }
]

export function PanelMensajesDirectos({
  perfil,
  destinatarioInicial = null,
  onCerrar = null,
  onSelectDestinatario = null,
  useDmHook
}) {
  const [destinatarioSeleccionado, setDestinatarioSeleccionado] = useState(destinatarioInicial)
  const [busqueda, setBusqueda] = useState('')
  const [nuevoTexto, setNuevoTexto] = useState('')
  const [mostrarSellos, setMostrarSellos] = useState(false)
  const [menuReaccionId, setMenuReaccionId] = useState(null)
  const chatBottomRef = useRef(null)
  const inputRef = useRef(null)

  const {
    mensajes,
    conversaciones,
    contactosClase,
    cargando,
    escribiendoDestinatario,
    enviarMensaje,
    toggleReaccion,
    emitirTyping
  } = useDmHook

  // Mantener actualizado si cambia el destinatario externo
  useEffect(() => {
    if (destinatarioInicial) {
      setDestinatarioSeleccionado(destinatarioInicial)
    }
  }, [destinatarioInicial])

  // Scroll al final al recibir mensajes
  useEffect(() => {
    if (chatBottomRef.current) {
      chatBottomRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [mensajes, escribiendoDestinatario])

  // Filtrado de contactos y conversaciones
  const contactosFiltrados = useMemo(() => {
    if (!busqueda.trim()) return contactosClase
    const query = busqueda.toLowerCase().trim()
    return contactosClase.filter(c =>
      c.nombre?.toLowerCase().includes(query) ||
      c.username?.toLowerCase().includes(query)
    )
  }, [contactosClase, busqueda])

  // Mapa de conversaciones para búsqueda rápida
  const convMap = useMemo(() => {
    const map = {}
    conversaciones.forEach(c => { map[c.otroId] = c })
    return map
  }, [conversaciones])

  // Análisis Anti-IA en vivo
  const estadoAntiIa = useMemo(() => {
    if (!nuevoTexto.trim() || nuevoTexto.length < 25) return null
    return analizarTextoAntiIA(nuevoTexto)
  }, [nuevoTexto])

  const handleEnviar = async (e) => {
    if (e) e.preventDefault()
    if (!nuevoTexto.trim() || !destinatarioSeleccionado) return

    const textoAEnviar = nuevoTexto
    setNuevoTexto('')
    emitirTyping(false)
    await enviarMensaje(textoAEnviar, destinatarioSeleccionado)
    if (inputRef.current) inputRef.current.focus()
  }

  const handleSeleccionarContacto = (contacto) => {
    sound.playPop()
    setDestinatarioSeleccionado(contacto)
    // Propagar al padre para que el hook reciba el destinatarioActivo correcto
    if (onSelectDestinatario) onSelectDestinatario(contacto)
  }

  const parsearContenido = (texto) => {
    const matchSello = texto.match(/\[SELLO:([A-Z0-9_]+)\]/)
    if (matchSello) {
      const tipo = matchSello[1]
      const limpio = texto.replace(/\[SELLO:[A-Z0-9_]+\]/, '').trim()
      let clase = 'sello-tinta-azul'
      if (tipo === 'ENTENDIDO') clase = 'sello-tinta-verde'
      if (tipo === 'GRACIAS' || tipo === 'PRESENTE') clase = 'sello-tinta-rojo'

      return (
        <div>
          <div style={{ marginBottom: 6 }}>
            <span className={clase} style={{ fontSize: 11, padding: '2px 8px', letterSpacing: 0.5 }}>
              {tipo}
            </span>
          </div>
          {limpio && <p style={{ margin: 0, fontSize: 14 }}>{limpio}</p>}
        </div>
      )
    }
    return <p style={{ margin: 0, fontSize: 14, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{texto}</p>
  }

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: destinatarioSeleccionado ? 'minmax(260px, 320px) 1fr' : '1fr',
        backgroundColor: 'var(--color-bg)',
        border: '1px solid var(--color-separator)',
        borderRadius: 16,
        overflow: 'hidden',
        minHeight: 520,
        height: 'calc(100vh - 220px)',
        boxShadow: '0 4px 20px rgba(0,0,0,0.06)'
      }}
      className="dm-layout-grid"
    >
      {/* ─── COLUMNA IZQUIERDA: CONTACTOS Y CONVERSACIONES ─── */}
      <aside
        style={{
          borderRight: '1px solid var(--color-separator)',
          backgroundColor: 'var(--color-surface)',
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          overflow: 'hidden'
        }}
        className={destinatarioSeleccionado ? 'dm-sidebar-con-chat' : 'dm-sidebar-solitario'}
      >
        {/* Cabecera Sidebar */}
        <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--color-separator)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 8,
                  backgroundColor: 'rgba(10, 132, 255, 0.12)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--color-accent)'
                }}
              >
                <Lock size={15} />
              </div>
              <h3 className="apple-headline" style={{ fontSize: 15, margin: 0 }}>
                Chats Privados
              </h3>
            </div>
            {onCerrar && (
              <button
                type="button"
                onClick={onCerrar}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-secondary-ink)' }}
              >
                <X size={18} />
              </button>
            )}
          </div>

          {/* Buscador de compañeros */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              backgroundColor: 'rgba(120, 120, 128, 0.08)',
              borderRadius: 10,
              padding: '6px 10px'
            }}
          >
            <Search size={14} color="var(--color-tertiary-ink)" />
            <input
              type="text"
              placeholder="Buscar compañero o profe..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              style={{
                border: 'none',
                background: 'transparent',
                outline: 'none',
                fontSize: 13,
                width: '100%',
                color: 'var(--color-ink)'
              }}
            />
          </div>
        </div>

        {/* Lista scrolleable de contactos */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '6px 8px' }}>
          {contactosFiltrados.length === 0 ? (
            <div style={{ padding: '24px 16px', textAlign: 'center', color: 'var(--color-secondary-ink)', fontSize: 13 }}>
              <p style={{ margin: 0 }}>No se encontraron compañeros.</p>
            </div>
          ) : (
            contactosFiltrados.map((contacto) => {
              const conv = convMap[contacto.id]
              const esActivo = destinatarioSeleccionado?.id === contacto.id
              const tieneNoLeidos = conv && conv.noLeidos > 0

              return (
                <div
                  key={contacto.id}
                  onClick={() => handleSeleccionarContacto(contacto)}
                  style={{
                    padding: '10px 12px',
                    borderRadius: 10,
                    marginBottom: 4,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    cursor: 'pointer',
                    backgroundColor: esActivo
                      ? 'rgba(10, 132, 255, 0.1)'
                      : tieneNoLeidos
                      ? 'rgba(255, 149, 0, 0.08)'
                      : 'transparent',
                    border: esActivo
                      ? '1px solid rgba(10, 132, 255, 0.3)'
                      : '1px solid transparent',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <AvatarUsuario
                    nombre={contacto.nombre}
                    color={contacto.color_acento || '#0A84FF'}
                    rol={contacto.rol}
                    size={38}
                    fontSize={14}
                  />

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span
                        style={{
                          fontWeight: tieneNoLeidos || esActivo ? 700 : 500,
                          fontSize: 13,
                          color: 'var(--color-ink)',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        {contacto.nombre}
                      </span>
                      {contacto.rol === 'moderador' && (
                        <span className="apple-badge apple-badge-accent" style={{ fontSize: 9 }}>
                          Profe
                        </span>
                      )}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 2 }}>
                      <p
                        style={{
                          margin: 0,
                          fontSize: 11,
                          color: tieneNoLeidos ? 'var(--color-ink)' : 'var(--color-secondary-ink)',
                          fontWeight: tieneNoLeidos ? 600 : 400,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          maxWidth: 160
                        }}
                      >
                        {conv ? conv.ultimoMensaje : `@${contacto.username || 'alumno'}`}
                      </p>

                      {tieneNoLeidos && (
                        <span
                          style={{
                            backgroundColor: '#FF3B30',
                            color: '#FFFFFF',
                            fontSize: 10,
                            fontWeight: 800,
                            padding: '1px 6px',
                            borderRadius: 9999,
                            flexShrink: 0
                          }}
                        >
                          {conv.noLeidos}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </aside>

      {/* ─── COLUMNA DERECHA: CONVERSACIÓN ACTIVA ─── */}
      {destinatarioSeleccionado ? (
        <section
          style={{
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
            backgroundColor: 'var(--color-surface)',
            overflow: 'hidden'
          }}
        >
          {/* Cabecera del Chat Activo */}
          <div
            style={{
              padding: '12px 16px',
              borderBottom: '1px solid var(--color-separator)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              backgroundColor: 'var(--color-surface)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <button
                type="button"
                onClick={() => {
                  setDestinatarioSeleccionado(null)
                  if (onSelectDestinatario) onSelectDestinatario(null)
                }}
                className="dm-back-btn"
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: 4,
                  display: 'none',
                  color: 'var(--color-ink)'
                }}
              >
                <ArrowLeft size={18} />
              </button>

              <AvatarUsuario
                nombre={destinatarioSeleccionado.nombre}
                color={destinatarioSeleccionado.color_acento || '#0A84FF'}
                rol={destinatarioSeleccionado.rol}
                size={36}
                fontSize={13}
              />

              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <h4 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: 'var(--color-ink)' }}>
                    {destinatarioSeleccionado.nombre}
                  </h4>
                  {destinatarioSeleccionado.rol === 'moderador' && (
                    <span className="apple-badge apple-badge-accent" style={{ fontSize: 9 }}>
                      Profesor SMR2
                    </span>
                  )}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span
                    style={{
                      width: 7,
                      height: 7,
                      borderRadius: '50%',
                      backgroundColor: '#30D158',
                      display: 'inline-block'
                    }}
                  />
                  <span className="apple-caption" style={{ fontSize: 11 }}>
                    {escribiendoDestinatario ? 'escribiendo...' : 'Mensajes cifrados y privados'}
                  </span>
                </div>
              </div>
            </div>

            <span className="apple-caption" style={{ fontSize: 11, color: 'var(--color-secondary-ink)' }}>
              1 a 1
            </span>
          </div>

          {/* Área de mensajes con scroll */}
          <div
            style={{
              flex: 1,
              overflowY: 'auto',
              padding: '16px 20px',
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
              backgroundColor: 'var(--color-bg)'
            }}
          >
            {cargando ? (
              <div style={{ margin: 'auto', textAlign: 'center', color: 'var(--color-secondary-ink)' }}>
                <p className="apple-caption">Cargando mensajes...</p>
              </div>
            ) : mensajes.length === 0 ? (
              <div style={{ margin: 'auto', textAlign: 'center', color: 'var(--color-secondary-ink)', maxWidth: 300 }}>
                <Lock size={28} style={{ margin: '0 auto 8px', opacity: 0.5, color: 'var(--color-accent)' }} />
                <h4 style={{ margin: '0 0 4px', fontSize: 14, fontWeight: 600 }}>Chat Privado</h4>
                <p className="apple-caption" style={{ fontSize: 12, margin: 0 }}>
                  Este es el inicio de tu conversación directa con {destinatarioSeleccionado.nombre}. Solo vosotros dos podéis ver estos mensajes.
                </p>
              </div>
            ) : (
              mensajes.map((m) => {
                const esMio = m.sender_id === perfil.id
                const tieneReacciones = m.reacciones && Object.keys(m.reacciones).length > 0

                return (
                  <div
                    key={m.id}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: esMio ? 'flex-end' : 'flex-start',
                      position: 'relative'
                    }}
                  >
                    <div
                      style={{
                        maxWidth: '78%',
                        padding: '10px 14px',
                        borderRadius: esMio ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                        backgroundColor: esMio ? 'var(--color-accent)' : 'var(--color-surface)',
                        color: esMio ? '#FFFFFF' : 'var(--color-ink)',
                        boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
                        border: esMio ? 'none' : '1px solid var(--color-separator)',
                        position: 'relative'
                      }}
                      onContextMenu={(e) => {
                        e.preventDefault()
                        setMenuReaccionId(menuReaccionId === m.id ? null : m.id)
                      }}
                    >
                      {parsearContenido(m.texto)}

                      {/* Footer de la burbuja: hora y estado de lectura */}
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'flex-end',
                          gap: 4,
                          marginTop: 4,
                          fontSize: 10,
                          opacity: 0.85
                        }}
                      >
                        <span>
                          {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        {esMio && (
                          <span>
                            {m.leido ? (
                              <CheckCheck size={12} color="#FFFFFF" />
                            ) : (
                              <Check size={12} color="rgba(255,255,255,0.7)" />
                            )}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Reacciones */}
                    {tieneReacciones && (
                      <div
                        style={{
                          display: 'flex',
                          gap: 4,
                          marginTop: -6,
                          zIndex: 2,
                          padding: '2px 6px',
                          borderRadius: 9999,
                          backgroundColor: 'var(--color-surface)',
                          boxShadow: '0 2px 6px rgba(0,0,0,0.1)',
                          border: '1px solid var(--color-separator)'
                        }}
                      >
                        {Object.entries(m.reacciones).map(([emoji, users]) => (
                          <button
                            key={emoji}
                            type="button"
                            onClick={() => toggleReaccion(m.id, emoji)}
                            style={{
                              background: 'none',
                              border: 'none',
                              fontSize: 12,
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: 2,
                              padding: 0
                            }}
                          >
                            <span>{emoji}</span>
                            <span style={{ fontSize: 10, fontWeight: 700 }}>{users.length}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })
            )}

            {escribiendoDestinatario && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--color-secondary-ink)', fontSize: 12 }}>
                <span className="apple-badge apple-badge-neutral" style={{ fontSize: 11 }}>
                  {destinatarioSeleccionado.nombre} está escribiendo...
                </span>
              </div>
            )}
            <div ref={chatBottomRef} />
          </div>

          {/* Banner Anti-IA si aplica */}
          {estadoAntiIa && (
            <div
              style={{
                padding: '6px 16px',
                backgroundColor: estadoAntiIa.esGenuino ? 'rgba(48, 209, 88, 0.08)' : 'rgba(255, 149, 0, 0.1)',
                borderTop: '1px solid var(--color-separator)',
                fontSize: 11,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Shield size={12} color={estadoAntiIa.esGenuino ? '#30D158' : '#FF9500'} />
                <span style={{ fontWeight: 600 }}>
                  {estadoAntiIa.esGenuino ? 'Autoría Humana Verificada (+5 XP Habilidades)' : 'Aviso: Redacta con tus propias palabras'}
                </span>
              </div>
            </div>
          )}

          {/* Respuestas rápidas */}
          <div
            style={{
              padding: '6px 16px',
              display: 'flex',
              gap: 6,
              overflowX: 'auto',
              borderTop: '1px solid var(--color-separator)',
              backgroundColor: 'var(--color-surface)'
            }}
          >
            {RESPUESTAS_RAPIDAS_DM.map((r, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setNuevoTexto(r)}
                style={{
                  fontSize: 11,
                  padding: '3px 10px',
                  borderRadius: 9999,
                  border: '1px solid var(--color-separator)',
                  background: 'rgba(120, 120, 128, 0.05)',
                  color: 'var(--color-ink)',
                  whiteSpace: 'nowrap',
                  cursor: 'pointer'
                }}
              >
                {r}
              </button>
            ))}
          </div>

          {/* Input Formulario */}
          <form
            onSubmit={handleEnviar}
            style={{
              padding: '10px 16px 14px',
              borderTop: '1px solid var(--color-separator)',
              display: 'flex',
              gap: 8,
              alignItems: 'center',
              backgroundColor: 'var(--color-surface)',
              position: 'relative'
            }}
          >
            {/* Botón de Sellos Rápidos */}
            <button
              type="button"
              onClick={() => setMostrarSellos(!mostrarSellos)}
              style={{
                width: 36,
                height: 36,
                borderRadius: '50%',
                border: '1px solid var(--color-separator)',
                background: mostrarSellos ? 'rgba(10, 132, 255, 0.15)' : 'rgba(120, 120, 128, 0.08)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--color-accent)'
              }}
              title="Añadir sello de tinta"
            >
              <Stamp size={16} />
            </button>

            {/* Menú flotante de sellos */}
            {mostrarSellos && (
              <div
                style={{
                  position: 'absolute',
                  bottom: 56,
                  left: 16,
                  backgroundColor: 'var(--color-surface)',
                  border: '1px solid var(--color-separator)',
                  borderRadius: 12,
                  padding: 8,
                  boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
                  display: 'flex',
                  gap: 6,
                  zIndex: 20
                }}
              >
                {SELLOS_DM.map(s => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => {
                      setNuevoTexto(prev => `${s.texto} ${prev}`.trim())
                      setMostrarSellos(false)
                    }}
                    className={s.clase}
                    style={{ fontSize: 10, padding: '3px 8px', cursor: 'pointer' }}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            )}

            <input
              ref={inputRef}
              type="text"
              placeholder={`Mensaje para ${destinatarioSeleccionado.nombre}...`}
              value={nuevoTexto}
              onChange={(e) => {
                setNuevoTexto(e.target.value)
                emitirTyping(e.target.value.length > 0)
              }}
              style={{
                flex: 1,
                padding: '9px 14px',
                borderRadius: 9999,
                border: '1px solid var(--color-separator)',
                backgroundColor: 'rgba(120, 120, 128, 0.06)',
                fontSize: 14,
                outline: 'none',
                color: 'var(--color-ink)'
              }}
            />

            <button
              type="submit"
              disabled={!nuevoTexto.trim()}
              className="btn-primary"
              style={{
                width: 38,
                height: 38,
                borderRadius: '50%',
                padding: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                opacity: nuevoTexto.trim() ? 1 : 0.4,
                cursor: nuevoTexto.trim() ? 'pointer' : 'default'
              }}
            >
              <Send size={16} />
            </button>
          </form>
        </section>
      ) : (
        /* Vista vacía cuando no hay chat seleccionado */
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 32,
            textAlign: 'center',
            color: 'var(--color-secondary-ink)'
          }}
        >
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: '50%',
              backgroundColor: 'rgba(10, 132, 255, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 14,
              color: 'var(--color-accent)'
            }}
          >
            <MessageSquare size={28} />
          </div>
          <h3 className="apple-headline" style={{ fontSize: 17, margin: '0 0 6px' }}>
            Selecciona un compañero
          </h3>
          <p className="apple-caption" style={{ maxWidth: 320, margin: 0, fontSize: 13 }}>
            Elige a cualquier alumno o profesor de la lista para iniciar un chat privado en tiempo real.
          </p>
        </div>
      )}
    </div>
  )
}
