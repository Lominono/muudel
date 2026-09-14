import { useState, useRef, useEffect } from 'react'
import { useAuth } from '../App'
import { useChat } from '../hooks/useChat'
import { ArrowUp, Heart, Hash } from 'lucide-react'

const CANALES = [
  { id: 'general', label: 'General' },
  { id: 'dudas', label: 'Dudas' },
  { id: 'apuntes', label: 'Apuntes' },
  { id: 'retos', label: 'Retos' },
]

export function PantallaChat() {
  const { perfil } = useAuth()
  const [canal, setCanal] = useState('general')
  const [texto, setTexto] = useState('')
  const { mensajes, cargando, enviar, like } = useChat(canal)
  const chatEndRef = useRef(null)

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [mensajes])

  const manejarEnvio = async (e) => {
    if (e) e.preventDefault()
    if (!texto.trim() || !perfil) return
    const contenido = texto
    setTexto('')
    await enviar(contenido, perfil.id, perfil)
  }

  return (
    <main style={{ maxWidth: 540, margin: '0 auto', padding: '20px 16px 40px' }}>
      <header style={{ marginBottom: 16 }}>
        <h1 className="apple-large-title">
          Chat de Clase
        </h1>
        <p className="apple-subheadline" style={{ marginTop: 2 }}>
          Pregunta, comparte dudas y debate con tus compañeros.
        </p>
      </header>

      {/* Selector de canales estilo Apple Chips */}
      <div style={{
        display: 'flex',
        gap: 8,
        marginBottom: 16,
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

      {/* Ventana de mensajes estilo iMessage */}
      <div
        className="card"
        style={{
          height: '52vh',
          minHeight: 380,
          display: 'flex',
          flexDirection: 'column',
          padding: 0,
          overflow: 'hidden',
          marginBottom: 12
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
            mensajes.map((m) => {
              const esPropio = perfil && m.user_id === perfil.id
              const hora = m.created_at
                ? new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                : ''

              return (
                <div
                  key={m.id}
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
                      onClick={() => like(m.id, perfil?.id)}
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
                        size={12}
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

        {/* Barra de entrada de texto estilo iOS */}
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
            placeholder={`Escribe en #${canal}...`}
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
              transition: 'background-color 0.15s ease',
            }}
          >
            <ArrowUp size={18} strokeWidth={2.5} />
          </button>
        </form>
      </div>
    </main>
  )
}
