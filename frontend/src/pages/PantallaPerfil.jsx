import { useAuth } from '../App'
import { TabBar } from '../components/TabBar'
import { NIVELES } from '../utils/supabase'

export function PantallaPerfil() {
  const { perfil } = useAuth()

  if (!perfil) return null

  const nivel = NIVELES.filter(n => perfil.puntos_total >= n.min).pop() || NIVELES[0]
  const siguiente = NIVELES.find(n => perfil.puntos_total < n.min)
  const xpEnNivel = perfil.puntos_total - nivel.min
  const xpNecesario = siguiente ? siguiente.min - nivel.min : 100

  return (
    <div style={{ maxWidth: 500, margin: '0 auto', padding: 24, paddingBottom: 80 }}>
      <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 24 }}>👤 Perfil</h1>
      <div className="card" style={{ textAlign: 'center', marginBottom: 16 }}>
        <div style={{ fontSize: 64, marginBottom: 8 }}>{perfil.avatar_emoji}</div>
        <h2 style={{ fontSize: 24, fontWeight: 700 }}>{perfil.nombre}</h2>
        {perfil.frase && <p style={{ color: '#6B6B70', fontSize: 15, fontStyle: 'italic' }}>“{perfil.frase}”</p>}
        <div style={{ marginTop: 12 }}>
          <span style={{
            background: '#0A84FF', color: '#FFF', borderRadius: 20,
            padding: '4px 14px', fontSize: 14, fontWeight: 600,
          }}>
            {nivel.nombre}
          </span>
        </div>
        <div style={{ height: 8, background: 'rgba(0,0,0,0.06)', borderRadius: 4, marginTop: 12, overflow: 'hidden' }}>
          <div style={{
            height: '100%', background: '#0A84FF', borderRadius: 4,
            width: `${(xpEnNivel / xpNecesario) * 100}%`,
            transition: 'width 0.3s',
          }} />
        </div>
        <p style={{ fontSize: 12, color: '#98989D', marginTop: 4 }}>
          {xpEnNivel} / {xpNecesario} XP para {siguiente?.nombre || '¡Eres Leyenda!'}
        </p>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <h3 style={{ fontSize: 17, fontWeight: 700, marginBottom: 12 }}>Estadísticas</h3>
        {[
          ['Puntos totales', perfil.puntos_total],
          ['Racha actual', `${perfil.racha_actual} días`],
          ['Mejor racha', perfil.mejor_racha],
          ['Rol', perfil.rol],
        ].map(([label, valor]) => (
          <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
            <span style={{ color: '#6B6B70' }}>{label}</span>
            <span style={{ fontWeight: 600, fontFamily: 'monospace' }}>{valor}</span>
          </div>
        ))}
      </div>

      <div className="card">
        <h3 style={{ fontSize: 17, fontWeight: 700, marginBottom: 8 }}>Logros</h3>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {['🔥', '🏆', '💡', '📚', '🎯'].map(e => (
            <div key={e} style={{ fontSize: 36, opacity: 0.8 }}>{e}</div>
          ))}
        </div>
      </div>
      <TabBar />
    </div>
  )
}
