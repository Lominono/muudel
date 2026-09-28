import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { TabBar } from './components/TabBar'
import { PantallaInicio } from './pages/PantallaInicio'
import { PantallaHoy } from './pages/PantallaHoy'
import { PantallaRanking } from './pages/PantallaRanking'
import { PantallaChat } from './pages/PantallaChat'
import { PantallaPerfil } from './pages/PantallaPerfil'
import { PantallaAdmin } from './pages/PantallaAdmin'
import { PantallaCompletarPerfil } from './pages/PantallaCompletarPerfil'
import { EmblemaRacha } from './components/icons/EmblemaRacha'

export { useAuth }

function ContenidoApp() {
  const { session, perfil, cargando, cerrarSesion } = useAuth()

  if (cargando) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        gap: 14,
        backgroundColor: 'var(--color-bg)',
      }}>
        <EmblemaRacha size={46} className="flame-animada" />
        <p className="apple-caption" style={{ fontWeight: 500, letterSpacing: 0.2 }}>
          Cargando muudel...
        </p>
      </div>
    )
  }

  // Si el usuario está baneado por el moderador
  if (session && perfil?.baneado) {
    return (
      <main style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px 16px',
        backgroundColor: 'var(--color-bg)'
      }}>
        <div className="card" style={{
          maxWidth: 420,
          width: '100%',
          padding: '36px 24px',
          textAlign: 'center',
          boxShadow: '0 8px 32px rgba(255, 59, 48, 0.08)',
          border: '1px solid rgba(255, 59, 48, 0.25)'
        }}>
          <div style={{
            width: 64,
            height: 64,
            borderRadius: 20,
            backgroundColor: 'rgba(255, 59, 48, 0.12)',
            color: 'var(--color-negative)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px'
          }}>
            <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10"/>
              <path d="m14.5 9-5 5"/>
              <path d="m9.5 9 5 5"/>
            </svg>
          </div>

          <h1 className="apple-title-1" style={{ fontSize: 24, marginBottom: 6, color: 'var(--color-ink)' }}>
            Acceso al Aula Suspendido
          </h1>

          <p className="apple-subheadline" style={{ fontSize: 14, color: 'var(--color-secondary-ink)', marginBottom: 20 }}>
            Tu cuenta ha sido restringida por el moderador de clase debido a una infracción de normas.
          </p>

          <div style={{
            padding: '14px 16px',
            borderRadius: 14,
            backgroundColor: 'var(--color-surface-secondary)',
            border: '1px solid var(--color-separator)',
            textAlign: 'left',
            marginBottom: 24
          }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-negative)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>
              Motivo de la sanción
            </div>
            <div style={{ fontSize: 13, color: 'var(--color-ink)', fontWeight: 500, lineHeight: 1.4 }}>
              {perfil.motivo_ban || 'Incumplimiento de las normas de convivencia del aula o del chat.'}
            </div>
            <div style={{ fontSize: 11, color: 'var(--color-tertiary-ink)', marginTop: 8 }}>
              Usuario: <strong>{perfil.nombre}</strong> {perfil.email ? `(${perfil.email})` : ''}
            </div>
          </div>

          <button
            type="button"
            className="btn-secondary"
            onClick={cerrarSesion}
            style={{
              width: '100%',
              minHeight: 44,
              fontSize: 14,
              fontWeight: 600,
              color: 'var(--color-negative)',
              backgroundColor: 'rgba(255, 59, 48, 0.08)'
            }}
          >
            Cerrar sesión
          </button>
        </div>
      </main>
    )
  }

  // Si el alumno ha iniciado sesión pero aún no ha completado su nombre real y dígito
  const necesitaCompletarFicha = Boolean(
    session &&
    perfil &&
    perfil.rol !== 'moderador' &&
    !perfil.onboarding_completado &&
    !perfil.digito_id
  )

  if (necesitaCompletarFicha) {
    return <PantallaCompletarPerfil />
  }

  return (
    <div style={{ minHeight: '100vh', paddingBottom: session ? 84 : 0 }}>
      <Routes>
        {!session ? (
          <Route path="*" element={<PantallaInicio />} />
        ) : (
          <>
            <Route path="/" element={<PantallaHoy />} />
            <Route path="/ranking" element={<PantallaRanking />} />
            <Route path="/chat" element={<PantallaChat />} />
            <Route path="/perfil" element={<PantallaPerfil />} />
            {perfil?.rol === 'moderador' && (
              <Route path="/admin" element={<PantallaAdmin />} />
            )}
            <Route path="*" element={<Navigate to="/" />} />
          </>
        )}
      </Routes>
      {session && <TabBar />}
    </div>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <ContenidoApp />
    </AuthProvider>
  )
}
