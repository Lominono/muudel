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
  const [loginNotice, setLoginNotice] = useState(null)
  const cargandoRef = useRef(false)

  useEffect(() => {
    // 0. Detectar y procesar posibles errores de OAuth en la URL (#error=... o ?error=...)
    try {
      const hash = window.location.hash ? window.location.hash.replace(/^#/, '') : ''
      const hashParams = new URLSearchParams(hash)
      const searchParams = new URLSearchParams(window.location.search)

      const errorParam = hashParams.get('error') || searchParams.get('error')
      const errorDesc = hashParams.get('error_description') || searchParams.get('error_description')

      if (errorParam || errorDesc) {
        let mensajeAmigable = 'No se pudo completar el inicio de sesión.'
        const textoDesc = decodeURIComponent(errorDesc || errorParam || '').replace(/\+/g, ' ')

        if (textoDesc.includes('Unable to exchange external code') || textoDesc.includes('server_error')) {
          mensajeAmigable = 'No se pudo intercambiar el código con Google. Verifica que la URL del sitio esté autorizada en Google Cloud y Supabase, o usa tu correo electrónico.'
        } else if (textoDesc.includes('access_denied')) {
          mensajeAmigable = 'Inicio de sesión cancelado o denegado.'
        } else if (textoDesc) {
          mensajeAmigable = textoDesc
        }

        setLoginError(mensajeAmigable)
        // Limpiar hash y query parameters para dejar la URL limpia
        window.history.replaceState({}, document.title, window.location.pathname)
      }
    } catch (err) {
      console.warn('Error al verificar parámetros de URL:', err)
    }

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
        cargarPerfil(session.user.id, session.user.user_metadata, session.user.email)
      } else {
        setCargando(false)
      }
    }).catch((err) => {
      console.warn('Error al obtener sesión:', err)
      setCargando(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session)
        if (session?.user && !cargandoRef.current) {
          cargarPerfil(session.user.id, session.user.user_metadata, session.user.email)
        } else if (!session && !localStorage.getItem('racha_demo_user')) {
          setPerfil(null)
          setCargando(false)
        }
      }
    )
    return () => subscription?.unsubscribe()
  }, [])

  const cargarPerfil = async (userId, userMetadata = null, email = null) => {
    if (cargandoRef.current) return
    cargandoRef.current = true
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle()

      if (data) {
        setPerfil(data)
      } else {
        // Generar un nombre apropiado a partir de metadata o correo
        const nombreSugerido = 
          userMetadata?.full_name ||
          userMetadata?.name ||
          userMetadata?.nombre ||
          (email ? email.split('@')[0] : 'Estudiante')

        const nuevo = {
          id: userId,
          nombre: nombreSugerido,
          avatar_emoji: '🧑‍🎓',
          puntos_total: 10,
          racha_actual: 1,
          mejor_racha: 1,
          rol: 'alumno'
        }

        // Asegurar que el registro quede guardado en Supabase
        const { data: insertado } = await supabase
          .from('profiles')
          .upsert(nuevo, { onConflict: 'id' })
          .select()
          .single()

        setPerfil(insertado || nuevo)
      }
    } catch (e) {
      console.warn('No se pudo cargar o sincronizar el perfil:', e)
    } finally {
      setCargando(false)
      cargandoRef.current = false
    }
  }

  const inicioSesion = async () => {
    try {
      setLoginError(null)
      setLoginNotice(null)
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
      setLoginError(msg || 'No se pudo conectar con Google. Puedes usar tu correo o el modo demostración.')
    }
  }

  const iniciarSesionConEmail = async (email, password) => {
    try {
      setLoginError(null)
      setLoginNotice(null)
      if (!email || !password) {
        throw new Error('Por favor ingresa tu correo y contraseña.')
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password,
      })

      if (error) throw error

      if (data?.user) {
        cargarPerfil(data.user.id, data.user.user_metadata, data.user.email)
      }
      return { success: true }
    } catch (e) {
      console.error('Error al iniciar sesión con correo:', e)
      let msg = e?.message || 'Error al iniciar sesión.'
      if (msg.includes('Invalid login credentials')) {
        msg = 'Correo o contraseña incorrectos. Verifica tus datos o crea una cuenta nueva.'
      } else if (msg.includes('Email not confirmed')) {
        msg = 'Debes confirmar tu correo electrónico antes de ingresar. Revisa tu bandeja de entrada.'
      }
      setLoginError(msg)
      return { success: false, error: msg }
    }
  }

  const registrarseConEmail = async (email, password, nombre) => {
    try {
      setLoginError(null)
      setLoginNotice(null)
      if (!email || !password) {
        throw new Error('Por favor completa todos los campos requeridos.')
      }
      if (password.length < 6) {
        throw new Error('La contraseña debe tener al menos 6 caracteres.')
      }

      const cleanEmail = email.trim()
      const cleanNombre = (nombre && nombre.trim()) ? nombre.trim() : cleanEmail.split('@')[0]

      const { data, error } = await supabase.auth.signUp({
        email: cleanEmail,
        password: password,
        options: {
          data: {
            full_name: cleanNombre,
            nombre: cleanNombre,
          }
        }
      })

      if (error) throw error

      if (data?.user && !data?.session) {
        setLoginNotice('¡Cuenta creada con éxito! Si tu proyecto requiere confirmación, revisa tu correo electrónico.')
        return { success: true, needsConfirmation: true }
      }

      if (data?.user) {
        cargarPerfil(data.user.id, data.user.user_metadata, data.user.email)
      }
      return { success: true, needsConfirmation: false }
    } catch (e) {
      console.error('Error al registrar usuario:', e)
      let msg = e?.message || 'Error al crear la cuenta.'
      if (msg.includes('User already registered')) {
        msg = 'Ya existe una cuenta con este correo. Por favor inicia sesión.'
      } else if (msg.includes('Password should be at least')) {
        msg = 'La contraseña debe tener al menos 6 caracteres.'
      }
      setLoginError(msg)
      return { success: false, error: msg }
    }
  }

  const entrarModoDemo = (rol = 'alumno') => {
    setLoginError(null)
    setLoginNotice(null)
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
    setCargando(false)
  }

  const cerrarSesion = async () => {
    localStorage.removeItem('racha_demo_user')
    try {
      await supabase.auth.signOut()
    } catch (e) {}
    setSession(null)
    setPerfil(null)
  }

  const limpiarErrores = () => {
    setLoginError(null)
    setLoginNotice(null)
  }

  const value = {
    session,
    perfil,
    setPerfil,
    cargando,
    loginError,
    loginNotice,
    setLoginError,
    setLoginNotice,
    limpiarErrores,
    inicioSesion,
    iniciarSesionConEmail,
    registrarseConEmail,
    entrarModoDemo,
    cerrarSesion,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}
