import { useState, createContext, useContext, useEffect, useRef } from 'react'
import { supabase } from '../utils/supabase'

export const AuthContext = createContext(null)

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth debe ser usado dentro de un AuthProvider')
  }
  return context
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [perfil, setPerfil] = useState(null)
  const [cargando, setCargando] = useState(true)
  const [loginError, setLoginError] = useState(null)
  const cargandoRef = useRef(false)

  useEffect(() => {
    // 1. Verificar si hay sesión de demo guardada localmente
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

    // 2. Comprobar sesión de Supabase
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
      const { data } = await supabase.from('profiles').select('*').eq('id', userId).single()
      if (data) {
        setPerfil(data)
      } else {
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
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
      if (!supabaseUrl || !supabaseAnonKey || supabaseUrl.includes('placeholder')) {
        throw new Error(
          'Faltan variables de Supabase en Vercel. Ve a Settings > Environment Variables y agrega VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY.'
        )
      }

      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin
        }
      })
      if (error) throw error
    } catch (e) {
      console.error('Error al iniciar sesión con Google:', e)
      const msg = e?.message || e?.error_description || (typeof e === 'string' ? e : '')
      setLoginError(msg || 'No se pudo conectar con Google. Puedes probar el modo demostración mientras configuras Supabase.')
    }
  }

  const entrarModoDemo = (rol = 'alumno') => {
    const demoPerfil = {
      id: 'demo-user-1234',
      nombre: rol === 'moderador' ? 'Profesor Demo' : 'Estudiante Demo',
      avatar_emoji: rol === 'moderador' ? '👨‍🏫' : '🧑‍🎓',
      puntos_total: 150,
      racha_actual: 5,
      mejor_racha: 7,
      frase: 'Siempre presente en clase',
      rol: rol
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

  const value = {
    session,
    perfil,
    setPerfil,
    cargando,
    loginError,
    inicioSesion,
    entrarModoDemo,
    cerrarSesion,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}
