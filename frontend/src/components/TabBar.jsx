import { NavLink } from 'react-router-dom'
import { Calendar, Trophy, MessageSquare, User, ShieldCheck } from 'lucide-react'
import { useAuth } from '../App'

export function TabBar() {
  const { perfil } = useAuth()

  const tabs = [
    { to: '/', label: 'Hoy', icon: Calendar },
    { to: '/ranking', label: 'Ranking', icon: Trophy },
    { to: '/chat', label: 'Chat', icon: MessageSquare },
    { to: '/perfil', label: 'Perfil', icon: User },
  ]

  if (perfil?.rol === 'moderador') {
    tabs.push({ to: '/admin', label: 'Gestión', icon: ShieldCheck })
  }

  return (
    <nav
      aria-label="Navegación principal"
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: 'var(--tab-bar-bg)',
        backdropFilter: 'blur(24px) saturate(180%)',
        WebkitBackdropFilter: 'blur(24px) saturate(180%)',
        borderTop: '0.5px solid var(--glass-border)',
        display: 'flex',
        justifyContent: 'space-around',
        alignItems: 'center',
        paddingTop: '6px',
        paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 8px)',
        zIndex: 100,
      }}
    >
      {tabs.map((tab) => {
        const IconComponent = tab.icon
        return (
          <NavLink
            key={tab.to}
            to={tab.to}
            end={tab.to === '/'}
            style={({ isActive }) => ({
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 3,
              textDecoration: 'none',
              color: isActive ? 'var(--color-accent)' : 'var(--color-secondary-ink)',
              minWidth: 54,
              minHeight: 44,
              transition: 'color 0.15s ease',
            })}
          >
            {({ isActive }) => (
              <>
                <IconComponent
                  size={22}
                  strokeWidth={isActive ? 2.3 : 1.7}
                />
                <span style={{
                  fontSize: 10,
                  fontWeight: isActive ? 600 : 500,
                  letterSpacing: -0.2,
                }}>
                  {tab.label}
                </span>
              </>
            )}
          </NavLink>
        )
      })}
    </nav>
  )
}
