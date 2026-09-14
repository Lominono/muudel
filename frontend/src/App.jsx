import { useState, createContext, useContext, useEffect, useRef } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { supabase } from './utils/supabase'
import { TabBar } from './components/TabBar'
import { PantallaHoy } from './pages/PantallaHoy'
import { PantallaRanking } from './pages/PantallaRanking'
import { PantallaChat } from './pages/PantallaChat'
import { PantallaPerfil } from './pages/PantallaPerfil'

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
    // Verificar si hay sesión de demo guardada localmente
    const demoGuardado = localStorage.getItem('racha_demo_user')
    if (demoGuardado) {
      try {
        const parsed = JSON.parse(demoGuardado)
        setSession({ user: { id: parsed.id, email: 'demo@alumno.es' } })
        setPerfil(parsed)
        setCargando(false)
        return
      } catch (e) {
        localStorage.removeItem('racha_demo_user')
      }
    }

    // Comprobar sesión de Supabase
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      if (session?.user) {
        cargarPerfil(session.user.id)
      } else {
        setCargando(false)
      }
    }).catch(() => {
      setCargando(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session)
        if (session?.user && !cargandoRef.current) {
          cargarPerfil(session.user.id)
        } else if (!session && !localStorage.getItem('racha_demo_user')) {
          setPerfil(null)
          setCargando(false)
        }
      }
    )
    return () => subscription?.unsubscribe()
  }, [])

  const cargarPerfil = async (userId) => {
    if (cargandoRef.current) return
    cargandoRef.current = true
    try {
      const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single()
      if (data) {
        setPerfil(data)
      } else {
        // Perfil por defecto si no existe aún
        const nuevo = {
          id: userId,
          nombre: 'Alumno',
          avatar_emoji: '🧑‍🎓',
          puntos_total: 10,
          racha_actual: 1,
          mejor_racha: 1,
          rol: 'alumno'
        }
        setPerfil(nuevo)
      }
    } catch (e) {
      console.warn('No se pudo cargar perfil:', e)
    } finally {
      setCargando(false)
      cargandoRef.current = false
    }
  }

  const inicioSesion = async () => {
    try {
      setLoginError(null)
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin
        }
      })
      if (error) throw error
    } catch (e) {
      console.error(e)
      setLoginError('No se pudo conectar con Google. Puedes probar el modo demo debajo.')
    }
  }

  const entrarModoDemo = () => {
    const demoPerfil = {
      id: 'demo-user-1234',
      nombre: 'Estudiante Demo',
      avatar_emoji: '🧑‍🎓',
      puntos_total: 150,
      racha_actual: 5,
      mejor_racha: 7,
      frase: 'Siempre presente en clase',
      rol: 'alumno'
    }
    localStorage.setItem('racha_demo_user', JSON.stringify(demoPerfil))
    setSession({ user: { id: demoPerfil.id, email: 'demo@alumno.es' } })
    setPerfil(demoPerfil)
  }

  const cerrarSesion = async () => {
    localStorage.removeItem('racha_demo_user')
    try {
      await supabase.auth.signOut()
    } catch (e) {}
    setSession(null)
    setPerfil(null)
  }

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
    <AuthContext.Provider value={{
      session,
      perfil,
      setPerfil,
      inicioSesion,
      loginError,
      cerrarSesion,
      entrarModoDemo
    }}>
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
      </div>
      {session && <TabBar />}
    </AuthContext.Provider>
  )
}

function PantallaInicio() {
  const { inicioSesion, loginError, entrarModoDemo } = useAuth()

  return (
    <main style={{
      maxWidth: 440,
      margin: '0 auto',
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      padding: '24px 20px',
    }}>
      <div className="card" style={{
        padding: '36px 28px',
        textAlign: 'center',
      }}>
        <div style={{
          fontSize: 68,
          marginBottom: 16,
          lineHeight: 1,
        }}>
          🔥
        </div>

        <h1 className="apple-large-title" style={{ marginBottom: 8, fontSize: 32 }}>
          Racha de Clase
        </h1>

        <p className="apple-subheadline" style={{ marginBottom: 32, fontSize: 16 }}>
          Asiste a clase, acumula puntos y mantén tu racha activa todos los días.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <button
            className="btn-primary"
            onClick={inicioSesion}
            style={{ width: '100%' }}
          >
            Continuar con Google
          </button>

          <button
            className="btn-secondary"
            onClick={entrarModoDemo}
            style={{ width: '100%' }}
          >
            Probar Modo Demostración
          </button>
        </div>

        {loginError && (
          <div style={{
            marginTop: 16,
            padding: '10px 14px',
            borderRadius: 10,
            background: 'var(--color-negative-bg)',
            color: 'var(--color-negative)',
            fontSize: 14,
            fontWeight: 500,
            textAlign: 'center'
          }}>
            {loginError}
          </div>
        )}

        <div style={{ marginTop: 28, paddingTop: 20, borderTop: '1px solid var(--color-separator)' }}>
          <p className="apple-caption">
            Diseñado con principios Apple Human Interface Guidelines
          </p>
        </div>
      </div>
    </main>
  )
}

export default App
