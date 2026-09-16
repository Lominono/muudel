import { useState, useRef, useEffect } from 'react'
import { useAuth } from '../App'
import { useChat } from '../hooks/useChat'
import { ArrowUp, Heart, Hash } from 'lucide-react'
import { sound } from '../utils/haptics'
import { animarBurbuja } from '../utils/animations'

const CANALES = [
  { id: 'general', label: 'General' },
  { id: 'dudas', label: 'Dudas' },
  { id: 'apuntes', label: 'Apuntes' },
  { id: 'retos', label: 'Retos' },
]

const RESPUESTAS_RAPIDAS = [
  '👍 Entendido',
  '🔥 ¡Buena racha!',
  '📚 ¿Qué página?',
  '✅ Resuelto',
]

export function PantallaChat() {
  const { perfil } = useAuth()
  const [canal, setCanal] = useState('general')
  const [texto, setTexto] = useState('')
  const [likedId, setLikedId] = useState(null)
  const { mensajes, cargando, enviar, like } = useChat(canal)
  const chatEndRef = useRef(null)
  const ultimoMensajeRef = useRef(null)

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    if (ultimoMensajeRef.current) {
      animarBurbuja(ultimoMensajeRef.current)
    }
  }, [mensajes])

  const manejarEnvio = async (e) => {
    if (e) e.preventDefault()
    if (!texto.trim() || !perfil) return
    const contenido = texto
    setTexto('')
    sound.playPop()
    await enviar(contenido, perfil.id, perfil)
  }

  const manejarLike = (id) => {
    setLikedId(id)
    sound.playPop()
    like(id, perfil?.id)
    setTimeout(() => setLikedId(null), 300)
  }

  return (
    <main style={{ maxWidth: 540, margin: '0 auto', padding: '20px 16px 40px' }}>
      <header style={{ marginBottom: 16 }}>
        <h1 className="apple-large-title">
          Chat de Clase
        </h1>
        <p className="apple-subheadline" style={{ marginTop: 2 }}>
          Preguntas, apuntes del día y avisos de la asignatura.
        </p>
      </header>

      {/* Selector de canales */}
      <div style={{
        display: 'flex',
        gap: 8,
        marginBottom: 12,
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
                padding: '8px 16px',
                borderRadius: 9999,
                border: 'none',
                backgroundColor: activo ? 'var(--color-accent)' : 'var(--color-fill-secondary)',
                color: activo ? '#FFFFFF' : 'var(--color-ink)',
                fontWeight: 600,
                fontSize: 14,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all 0.15s ease',
              }}
            >
              <Hash size={14} opacity={activo ? 0.9 : 0.6} />
              {c.label}
            </button>
          )
        })}
      </div>

      {/* Ventana de mensajes */}
      <div
        className="card"
        style={{
          height: '52vh',
          minHeight: 380,
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
          gap: 14
        }}>
          {cargando && mensajes.length === 0 ? (
            <div style={{ textAlign: 'center', margin: 'auto' }}>
              <p className="apple-caption">Cargando mensajes...</p>
            </div>
          ) : (
            mensajes.map((m, idx) => {
              const esPropio = perfil && m.user_id === perfil.id
              const esUltimo = idx === mensajes.length - 1
              const hora = m.created_at
                ? new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                : ''
              const isLiked = likedId === m.id

              return (
                <div
                  key={m.id}
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
                      paddingLeft: 4
                    }}>
                      <span style={{ fontSize: 13 }}>{m.avatar_emoji || m.profiles?.avatar_emoji || '🧑‍🎓'}</span>
                      <span className="apple-caption" style={{ fontWeight: 600, color: 'var(--color-secondary-ink)' }}>
                        {m.nombre || m.profiles?.nombre || 'Compañero'}
                      </span>
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
          <input
            className="apple-input"
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            placeholder={`Mensaje en #${canal}...`}
            style={{
              minHeight: 40,
              borderRadius: 20,
              padding: '8px 16px',
              fontSize: 15,
            }}
          />

          <button
            type="submit"
            disabled={!texto.trim()}
            style={{
              width: 36,
              height: 36,
              borderRadius: 9999,
              backgroundColor: texto.trim() ? 'var(--color-accent)' : 'var(--color-fill-secondary)',
              color: texto.trim() ? '#FFFFFF' : 'var(--color-tertiary-ink)',
              border: 'none',
              cursor: texto.trim() ? 'pointer' : 'default',
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
    </main>
  )
}
