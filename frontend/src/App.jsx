import { useState, createContext, useContext, useEffect, useRef } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { createClient } from '@supabase/supabase-js'
import { TabBar } from './components/TabBar'
import { PantallaHoy } from './pages/PantallaHoy'
import { PantallaRanking } from './pages/PantallaRanking'
import { PantallaChat } from './pages/PantallaChat'
import { PantallaPerfil } from './pages/PantallaPerfil'

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
)

const AuthContext = createContext(null)

export function useAuth() {
  return useContext(AuthContext)
}

function App() {
  const [session, setSession] = useState(null)
  const [perfil, setPerfil] = useState(null)
  const [cargando, setCargando] = useState(true)
  const [loginError, setLoginError] = useState(null)
  const cargandoRef = useRef(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      if (session?.user) {
        cargarPerfil(session.user.id)
      } else {
        setCargando(false)
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session)
        if (session?.user && !cargandoRef.current) {
          cargarPerfil(session.user.id)
        } else if (!session) {
          setPerfil(null)
          setCargando(false)
        }
      }
    )
    return () => subscription.unsubscribe()
  }, [])

  const cargarPerfil = async (userId) => {
    if (cargandoRef.current) return
    cargandoRef.current = true
    const { data } = await supabase.from('profiles').select('*').eq('id', userId).single()
    setPerfil(data)
    setCargando(false)
    cargandoRef.current = false
  }

  const inicioSesion = async () => {
    try {
      setLoginError(null)
      await supabase.auth.signInWithOAuth({ provider: 'google' })
    } catch (e) {
      setLoginError('No se pudo conectar. Intentá de nuevo.')
    }
  }

  if (cargando) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <div style={{ fontSize: 32 }}>⏳</div>
      </div>
    )
  }

  return (
    <AuthContext.Provider value={{ session, perfil, setPerfil }}>
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
    </AuthContext.Provider>
  )
}

function PantallaInicio() {
  const { inicioSesion } = useAuth()
  const { loginError } = useAuth()
  return (
    <div style={{ maxWidth: 400, margin: '100px auto', textAlign: 'center', padding: 32 }}>
      <div style={{ fontSize: 64, marginBottom: 16 }}>🔥</div>
      <h1 style={{ fontSize: 32, fontWeight: 700, marginBottom: 8 }}>Racha de Clase</h1>
      <p style={{ color: '#6B6B70', fontSize: 17, marginBottom: 40 }}>
        Ve a clase, sumá puntos, subí tu racha. Simple así.
      </p>
      <button className="btn-primary" onClick={inicioSesion} style={{ width: '100%' }}>
        Entrar con Google
      </button>
      {loginError && <p style={{ color: '#FF453A', marginTop: 12, fontSize: 15 }}>{loginError}</p>}
      <p style={{ marginTop: 16, fontSize: 13, color: '#98989D' }}>
        Pón tu código de clase cuando te pidan
      </p>
    </div>
  )
}

export default App
