import { useState, useEffect } from 'react'
import { useAuth } from '../App'
import { useChat } from '../hooks/useChat'
import { TabBar } from '../components/TabBar'

const CANALES = ['general', 'dudas', 'apuntes', 'retos']

export function PantallaChat() {
  const { perfil } = useAuth()
  const [canal, setCanal] = useState('general')
  const [texto, setTexto] = useState('')
  const { mensajes, cargando, enviar, like } = useChat(canal)

  const manejarEnvio = async () => {
    if (!texto.trim() || !perfil) return
    const result = await enviar(texto, perfil.id)
    if (!result.error) setTexto('')
  }

  return (
    <div style={{ maxWidth: 600, margin: '0 auto', padding: 24, paddingBottom: 80 }}>
      <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 16 }}>💬 Chat</h1>
      <div style={{ display: 'flex', gap: 6, marginBottom: 16, overflowX: 'auto' }}>
        {CANALES.map(c => (
          <button key={c} onClick={() => setCanal(c)} style={{
            padding: '10px 16px',
            borderRadius: 20,
            border: 'none',
            background: canal === c ? '#0A84FF' : 'var(--color-surface)',
            color: canal === c ? '#FFF' : '#000',
            fontWeight: 600,
            fontSize: 14,
            cursor: 'pointer',
            whiteSpace: 'nowrap',
            minHeight: 44,
          }}>
            #{c}
          </button>
        ))}
      </div>
      <div style={{ background: 'var(--color-surface)', borderRadius: 12, height: 400, overflowY: 'auto', padding: 16, marginBottom: 12 }}>
        {carguing && <p style={{ color: '#98989D', fontSize: 14 }}>Cargando...</p>}
        {mensajes.map(m => (
          <div key={m.id} style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 13, color: '#98989D' }}>
              {m.nombre || 'Anónimo'} · {new Date(m.created_at).toLocaleTimeString()}
            </div>
            <div style={{ fontSize: 16, marginTop: 2 }}>{m.texto}</div>
            <button onClick={() => like(m.id, perfil?.id)} style={{
              background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, color: '#6B6B70'
            }}>
              ❤️ {m.likes_count || 0}
            </button>
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <input value={texto} onChange={e => setTexto(e.target.value)} onKeyDown={e => e.key === 'Enter' && manejarEnvio()} placeholder="Escribí algo..." style={{
          flex: 1, borderRadius: 12, padding: 12, border: '1px solid rgba(0,0,0,0.1)', fontSize: 16, minHeight: 44,
        }} />
        <button className="btn-primary" onClick={manejarEnvio}>Enviar</button>
      </div>
      <TabBar />
    </div>
  )
}
