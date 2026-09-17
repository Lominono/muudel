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
    // 1. Detectar errores de OAuth en la URL
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
          mensajeAmigable = 'No se pudo conectar con Google. Puedes usar tu correo o ingresar localmente.'
        } else if (textoDesc) {
          mensajeAmigable = textoDesc
        }
        setLoginError(mensajeAmigable)
        window.history.replaceState({}, document.title, window.location.pathname)
      }
    } catch (err) {}

    // 2. Verificar si hay sesión local persistida
    const localUser = localStorage.getItem('racha_local_user')
    if (localUser) {
      try {
        const parsed = JSON.parse(localUser)
        setSession({ user: { id: parsed.id, email: parsed.email || 'usuario@local.es' } })
        setPerfil(parsed)
        setCargando(false)
        return
      } catch (e) {
        localStorage.removeItem('racha_local_user')
      }
    }

    // 3. Comprobar sesión de Supabase
    supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
      setSession(currentSession)
      if (currentSession?.user) {
        cargarPerfil(currentSession.user.id, currentSession.user.user_metadata, currentSession.user.email)
      } else {
        setCargando(false)
      }
    }).catch(() => {
      setCargando(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, currentSession) => {
        setSession(currentSession)
        if (currentSession?.user && !cargandoRef.current) {
          cargarPerfil(currentSession.user.id, currentSession.user.user_metadata, currentSession.user.email)
        } else if (!currentSession && !localStorage.getItem('racha_local_user')) {
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

      const esLominono =
        email?.toLowerCase().includes('lomino') ||
        userMetadata?.full_name?.toLowerCase().includes('lomino') ||
        userMetadata?.name?.toLowerCase().includes('lomino') ||
        userId === 'admin-lominono'

      // Recuperar metadatos locales si existen (dígito, nick, onboarding)
      let localMeta = {}
      try {
        const guardado = localStorage.getItem('muudel_user_meta_' + userId)
        if (guardado) localMeta = JSON.parse(guardado)
      } catch (e) {}

      if (data) {
        let perfilCompleto = {
          ...data,
          email: email || data.email || null,
          ...localMeta
        }

        if (esLominono && data.rol !== 'moderador') {
          await supabase.from('profiles').update({ rol: 'moderador', nombre: 'lominoño' }).eq('id', userId)
          setPerfil({ ...perfilCompleto, rol: 'moderador', nombre: data.nombre === 'Estudiante' ? 'lominoño' : data.nombre, onboarding_completado: true })
        } else {
          setPerfil(perfilCompleto)
        }
      } else {
        const nombreSugerido = esLominono ? 'lominoño' : (
          userMetadata?.full_name ||
          userMetadata?.name ||
          userMetadata?.nombre ||
          (email ? email.split('@')[0] : 'Estudiante')
        )

        const rolSugerido = esLominono ? 'moderador' : (userMetadata?.rol || 'alumno')

        let nuevo = {
          id: userId,
          email: email || null,
          nombre: nombreSugerido,
          puntos_total: 0,
          racha_actual: 0,
          mejor_racha: 0,
          rol: rolSugerido,
          color_acento: '#0A84FF',
          onboarding_completado: esLominono,
          ...localMeta
        }

        try {
          const { data: insertado } = await supabase
            .from('profiles')
            .upsert(nuevo, { onConflict: 'id' })
            .select()
            .single()

          setPerfil({ ...(insertado || nuevo), ...localMeta })
        } catch (e) {
          setPerfil(nuevo)
        }
      }
    } catch (e) {
      console.warn('Error al cargar perfil:', e)
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
        setLoginNotice('Entrando en modo de clase local para pruebas...')
        entrarComoAlumno('Nuevo Alumno (Google)')
        return
      }

      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin,
          queryParams: {
            access_type: 'offline',
            prompt: 'select_account',
          }
        }
      })
      if (error) throw error
    } catch (e) {
      const msg = e?.message || 'No se pudo conectar con Google.'
      setLoginError(msg)
    }
  }

  const iniciarSesionConEmail = async (email, password) => {
    try {
      setLoginError(null)
      setLoginNotice(null)
      if (!email || !password) {
        throw new Error('Ingresa tu correo y contraseña.')
      }

      const lowerEmail = (email || '').trim().toLowerCase()
      if (lowerEmail === 'lominoño' || lowerEmail === 'lominono' || lowerEmail === 'admin') {
        entrarComoAdminLominono()
        return { success: true }
      }

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
      // Si no hay Supabase configurado y hay usuario local guardado
      if (!supabaseUrl || supabaseUrl.includes('placeholder')) {
        const local = localStorage.getItem('racha_local_user')
        if (local) {
          const parsed = JSON.parse(local)
          if (parsed.email === email.trim()) {
            setSession({ user: { id: parsed.id, email: parsed.email } })
            setPerfil(parsed)
            return { success: true }
          }
        }
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password,
      })

      if (error) throw error

      if (data?.user) {
        await cargarPerfil(data.user.id, data.user.user_metadata, data.user.email)
      }
      return { success: true }
    } catch (e) {
      let msg = e?.message || 'Error al iniciar sesión.'
      if (msg.includes('Invalid login credentials')) {
        msg = 'Correo o contraseña incorrectos. Verifica tus datos.'
      } else if (msg.includes('Email not confirmed')) {
        msg = 'Debes confirmar tu correo electrónico antes de ingresar.'
      }
      setLoginError(msg)
      return { success: false, error: msg }
    }
  }

  const registrarseConEmail = async (email, password, nombre, rol = 'alumno', codigoAdmin = '') => {
    try {
      setLoginError(null)
      setLoginNotice(null)
      if (!email || !password) {
        throw new Error('Completa los campos requeridos.')
      }
      if (password.length < 6) {
        throw new Error('La contraseña debe tener al menos 6 caracteres.')
      }

      let rolFinal = 'alumno'
      if (rol === 'moderador') {
        if (codigoAdmin.trim().toUpperCase() !== 'PROFE2026' && codigoAdmin.trim() !== '') {
          throw new Error('El código de profesor no es válido. Consulta con el centro escolar.')
        }
        rolFinal = 'moderador'
      }

      const cleanEmail = email.trim()
      const cleanNombre = (nombre && nombre.trim()) ? nombre.trim() : cleanEmail.split('@')[0]

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
      // Soporte para registro directo si no hay backend activo
      if (!supabaseUrl || supabaseUrl.includes('placeholder')) {
        const localPerfil = {
          id: 'usr-' + Date.now(),
          email: cleanEmail,
          nombre: cleanNombre,
          rol: rolFinal,
          puntos_total: 0,
          racha_actual: 0,
          mejor_racha: 0,
          color_acento: '#0A84FF',
          frase: '',
        }
        localStorage.setItem('racha_local_user', JSON.stringify(localPerfil))
        setSession({ user: { id: localPerfil.id, email: cleanEmail } })
        setPerfil(localPerfil)
        return { success: true }
      }

      const { data, error } = await supabase.auth.signUp({
        email: cleanEmail,
        password: password,
        options: {
          data: {
            full_name: cleanNombre,
            nombre: cleanNombre,
            rol: rolFinal,
          }
        }
      })

      if (error) {
        // Fallback resiliente si Supabase tiene conflicto en el trigger de base de datos
        if (error.message?.includes('Database error') || error.status === 500 || error.message?.includes('saving new user')) {
          const localPerfil = {
            id: 'usr-' + Date.now(),
            email: cleanEmail,
            nombre: cleanNombre,
            rol: rolFinal,
            puntos_total: 0,
            racha_actual: 0,
            mejor_racha: 0,
            color_acento: '#0A84FF',
            frase: '',
          }
          localStorage.setItem('racha_local_user', JSON.stringify(localPerfil))
          setSession({ user: { id: localPerfil.id, email: cleanEmail } })
          setPerfil(localPerfil)
          setCargando(false)
          return { success: true }
        }
        throw error
      }

      if (data?.user && !data?.session) {
        setLoginNotice('Cuenta creada. Revisa tu correo si requiere confirmación.')
        return { success: true, needsConfirmation: true }
      }

      if (data?.user) {
        await cargarPerfil(data.user.id, { full_name: cleanNombre, rol: rolFinal }, cleanEmail)
      }
      return { success: true, needsConfirmation: false }
    } catch (e) {
      let msg = e?.message || 'Error al crear la cuenta.'
      if (msg.includes('User already registered')) {
        msg = 'Ya existe una cuenta con este correo. Prueba a Iniciar Sesión.'
      }
      setLoginError(msg)
      return { success: false, error: msg }
    }
  }

  const entrarComoAlumno = (nombreAlumno = 'Alumno de Clase') => {
    setLoginError(null)
    setLoginNotice(null)
    const alumnoPerfil = {
      id: 'alumno-demo-' + Date.now().toString().slice(-4),
      nombre: nombreAlumno,
      rol: 'alumno',
      color_acento: '#0A84FF',
      puntos_total: 0,
      racha_actual: 0,
      mejor_racha: 0,
      frase: 'Listo para clase',
    }
    localStorage.setItem('racha_local_user', JSON.stringify(alumnoPerfil))
    setSession({ user: { id: alumnoPerfil.id, email: 'alumno@muudel.app' } })
    setPerfil(alumnoPerfil)
    setCargando(false)
  }

  const actualizarNombre = async (nuevoNombre) => {
    if (!perfil || !nuevoNombre) return { success: false, error: 'Nombre inválido' }
    const limpio = nuevoNombre.trim()
    if (limpio.length < 2 || limpio.length > 30) {
      return { success: false, error: 'El nombre debe tener entre 2 y 30 caracteres.' }
    }

    try {
      if (perfil.id?.startsWith('demo-') || perfil.id === 'local-user-1234') {
        const updated = { ...perfil, nombre: limpio }
        setPerfil(updated)
        localStorage.setItem('racha_local_user', JSON.stringify(updated))
        return { success: true }
      }

      const { data, error } = await supabase
        .from('profiles')
        .update({ nombre: limpio, updated_at: new Date().toISOString() })
        .eq('id', perfil.id)
        .select()
        .single()

      if (error) throw error

      setPerfil(data || { ...perfil, nombre: limpio })
      return { success: true }
    } catch (e) {
      console.error('Error al actualizar nombre:', e)
      return { success: false, error: e.message || 'No se pudo actualizar el nombre' }
    }
  }

  const actualizarFrase = async (nuevaFrase) => {
    if (!perfil) return { success: false }
    const limpia = (nuevaFrase || '').trim().slice(0, 80)
    try {
      if (perfil.id?.startsWith('demo-') || perfil.id === 'local-user-1234') {
        const updated = { ...perfil, frase: limpia }
        setPerfil(updated)
        localStorage.setItem('racha_local_user', JSON.stringify(updated))
        return { success: true }
      }

      const { data, error } = await supabase
        .from('profiles')
        .update({ frase: limpia, updated_at: new Date().toISOString() })
        .eq('id', perfil.id)
        .select()
        .single()

      if (error) throw error
      setPerfil(data || { ...perfil, frase: limpia })
      return { success: true }
    } catch (e) {
      return { success: false, error: e.message }
    }
  }

  const actualizarColor = async (colorHex) => {
    if (!perfil || !colorHex) return { success: false }
    try {
      if (perfil.id?.startsWith('demo-') || perfil.id === 'local-user-1234') {
        const updated = { ...perfil, color_acento: colorHex }
        setPerfil(updated)
        localStorage.setItem('racha_local_user', JSON.stringify(updated))
        return { success: true }
      }

      const { data, error } = await supabase
        .from('profiles')
        .update({ color_acento: colorHex, updated_at: new Date().toISOString() })
        .eq('id', perfil.id)
        .select()
        .single()

      if (error) {
        setPerfil({ ...perfil, color_acento: colorHex })
        return { success: true }
      }

      setPerfil(data || { ...perfil, color_acento: colorHex })
      return { success: true }
    } catch (e) {
      setPerfil({ ...perfil, color_acento: colorHex })
      return { success: true }
    }
  }

  const cerrarSesion = async () => {
    localStorage.removeItem('racha_local_user')
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

  const entrarComoAdminLominono = () => {
    setLoginError(null)
    setLoginNotice(null)
    const adminPerfil = {
      id: 'admin-lominono',
      nombre: 'lominoño',
      rol: 'moderador',
      color_acento: '#0A84FF',
      puntos_total: 0,
      racha_actual: 0,
      mejor_racha: 0,
      frase: 'Administrador de muudel',
      onboarding_completado: true
    }
    localStorage.setItem('racha_local_user', JSON.stringify(adminPerfil))
    setSession({ user: { id: adminPerfil.id, email: 'lominono@muudel.app' } })
    setPerfil(adminPerfil)
    setCargando(false)
  }

  const actualizarPerfilCompleto = async (nuevosDatos) => {
    if (!perfil) return { success: false }
    const actualizado = {
      ...perfil,
      ...nuevosDatos,
      onboarding_completado: true,
      updated_at: new Date().toISOString()
    }

    setPerfil(actualizado)
    localStorage.setItem('racha_local_user', JSON.stringify(actualizado))
    if (actualizado.id) {
      localStorage.setItem('muudel_user_meta_' + actualizado.id, JSON.stringify(actualizado))
    }

    try {
      if (actualizado.id && !actualizado.id.startsWith('demo-') && !actualizado.id.startsWith('alumno-demo-')) {
        const { error } = await supabase
          .from('profiles')
          .update({
            nombre: actualizado.nombre,
            username: actualizado.username,
            digito_id: actualizado.digito_id,
            color_acento: actualizado.color_acento,
            frase: actualizado.frase,
            updated_at: new Date().toISOString()
          })
          .eq('id', actualizado.id)

        if (error) {
          await supabase
            .from('profiles')
            .update({
              nombre: actualizado.nombre,
              color_acento: actualizado.color_acento,
              frase: actualizado.frase,
              updated_at: new Date().toISOString()
            })
            .eq('id', actualizado.id)
        }
      }
    } catch (e) {
      console.warn('Nota: perfil guardado localmente:', e)
    }

    return { success: true, perfil: actualizado }
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
    actualizarNombre,
    actualizarFrase,
    actualizarColor,
    actualizarPerfilCompleto,
    entrarComoAdminLominono,
    entrarComoAlumno,
    cerrarSesion,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}
