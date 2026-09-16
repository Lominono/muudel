import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { TabBar } from './components/TabBar'
import { PantallaInicio } from './pages/PantallaInicio'
import { PantallaHoy } from './pages/PantallaHoy'
import { PantallaRanking } from './pages/PantallaRanking'
import { PantallaChat } from './pages/PantallaChat'
import { PantallaPerfil } from './pages/PantallaPerfil'

// Re-exportar useAuth para mantener compatibilidad con imports existentes
export { useAuth }

function ContenidoApp() {
  const { session, cargando } = useAuth()

  if (cargando) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        gap: 12
      }}>
        <div style={{ fontSize: 40, animation: 'pulse 1.5s infinite' }}>🔥</div>
        <p className="apple-caption">Cargando Racha de Clase...</p>
      </div>
    )
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
