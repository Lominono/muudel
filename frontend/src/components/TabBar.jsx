import { NavLink } from 'react-router-dom'

const tabs = [
  { to: '/', label: 'Hoy', icon: '⚡' },
  { to: '/ranking', label: 'Ranking', icon: '🏆' },
  { to: '/chat', label: 'Chat', icon: '💬' },
  { to: '/perfil', label: 'Perfil', icon: '👤' },
]

export function TabBar() {
  return (
    <div style={{
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      background: 'var(--color-surface)',
      borderTop: '1px solid rgba(0,0,0,0.06)',
      display: 'flex',
      justifyContent: 'space-around',
      paddingBottom: 'env(safe-area-inset-bottom, 8px)',
      paddingTop: 'max(8px, env(safe-area-inset-bottom, 8px))',
    }}>
      {tabs.map(t => (
        <NavLink
          key={t.to}
          to={t.to}
          end={t.to === '/'}
          style={({ isActive }) => ({
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 4,
            textDecoration: 'none',
            color: isActive ? '#0A84FF' : '#6B6B70',
            minWidth: 60,
            minHeight: 44,
            justifyContent: 'center',
          })}
        >
          <span style={{ fontSize: 24 }}>{t.icon}</span>
          <span style={{ fontSize: 11, fontWeight: 500 }}>{t.label}</span>
        </NavLink>
      ))}
    </div>
  )
}
