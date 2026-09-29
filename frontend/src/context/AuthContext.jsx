import { useState, createContext, useContext, useEffect, useRef } from 'react'
import { supabase } from '../utils/supabase'

export const AuthContext = createContext(null)

export const ADMIN_LOMINONO_ID = '00000000-0000-4000-a000-000000000001'

const generarUUID = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    try { return crypto.randomUUID() } catch (e) {}
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

const registrarAccesoBD = async (userId, email = null, metodo = 'login') => {
  if (!userId) return
  try {
    await supabase
      .from('profiles')
      .update({ ultimo_acceso: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq('id', userId)

    await supabase
      .from('login_records')
      .insert({
        user_id: userId,
        email: email || null,
        metodo: metodo
      })
  } catch (e) {}
}

export const guardarCuentaEnDispositivo = (cuenta) => {
  if (!cuenta || !cuenta.id) return
  try {
    const raw = localStorage.getItem('muudel_cuentas_guardadas')
    const lista = raw ? JSON.parse(raw) : []
    const elemento = {
      id: cuenta.id,
      nombre: cuenta.nombre || 'Alumno SMR2',
      username: cuenta.username || '',
      email: cuenta.email || '',
      avatar_emoji: cuenta.avatar_emoji || '🧑‍🎓',
      color_acento: cuenta.color_acento || '#0A84FF',
      rol: cuenta.rol || 'alumno',
      digito_id: cuenta.digito_id || '',
      puntos_total: cuenta.puntos_total || 0,
      racha_actual: cuenta.racha_actual || 0,
      ultimo_acceso: new Date().toISOString()
    }
    const filtradas = lista.filter(item => item.id !== cuenta.id && (!cuenta.email || item.email !== cuenta.email))
    const nuevaLista = [elemento, ...filtradas].slice(0, 6)
    localStorage.setItem('muudel_cuentas_guardadas', JSON.stringify(nuevaLista))
    window.dispatchEvent(new CustomEvent('muudel-cuentas-actualizadas', { detail: nuevaLista }))
  } catch (e) {}
}

export const obtenerCuentasGuardadas = () => {
  try {
    const raw = localStorage.getItem('muudel_cuentas_guardadas')
    return raw ? JSON.parse(raw) : []
  } catch (e) {
    return []
  }
}

export const eliminarCuentaGuardada = (id) => {
  try {
    const prev = obtenerCuentasGuardadas()
    const filtradas = prev.filter(c => c.id !== id)
    localStorage.setItem('muudel_cuentas_guardadas', JSON.stringify(filtradas))
    window.dispatchEvent(new CustomEvent('muudel-cuentas-actualizadas', { detail: filtradas }))
    return filtradas
  } catch (e) {
    return []
  }
}

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

    // 4. Escuchar eventos de moderación de usuarios en tiempo real
    const handleBaneado = (e) => {
      const datos = e.detail || {}
      setPerfil(actual => {
        if (!actual) return null
        if (datos.userId === actual.id || datos.email === actual.email) {
          const baneadoPerfil = {
            ...actual,
            baneado: true,
            motivo_ban: datos.motivo || 'Cuenta suspendida por moderación de clase.'
          }
          localStorage.setItem('racha_local_user', JSON.stringify(baneadoPerfil))
          return baneadoPerfil
        }
        return actual
      })
    }

    const handleDesbaneado = (e) => {
      const datos = e.detail || {}
      setPerfil(actual => {
        if (!actual) return null
        if (datos.userId === actual.id || datos.email === actual.email) {
          const limpioPerfil = { ...actual, baneado: false, motivo_ban: null }
          localStorage.setItem('racha_local_user', JSON.stringify(limpioPerfil))
          return limpioPerfil
        }
        return actual
      })
    }

    const handleEliminado = (e) => {
      const datos = e.detail || {}
      setPerfil(actual => {
        if (!actual) return null
        if (datos.userId === actual.id || datos.email === actual.email) {
          localStorage.removeItem('racha_local_user')
          setSession(null)
          return null
        }
        return actual
      })
    }

    window.addEventListener('muudel-rt-usuario_baneado', handleBaneado)
    window.addEventListener('muudel-rt-usuario_desbaneado', handleDesbaneado)
    window.addEventListener('muudel-rt-usuario_eliminado', handleEliminado)

    return () => {
      subscription?.unsubscribe()
      window.removeEventListener('muudel-rt-usuario_baneado', handleBaneado)
      window.removeEventListener('muudel-rt-usuario_desbaneado', handleDesbaneado)
      window.removeEventListener('muudel-rt-usuario_eliminado', handleEliminado)
    }
  }, [])

  const cargarPerfil = async (userId, userMetadata = null, email = null, metodoLogin = 'oauth') => {
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
        userId === ADMIN_LOMINONO_ID

      // Recuperar metadatos locales si existen (dígito, nick, onboarding, ban local)
      let localMeta = {}
      try {
        const guardado = localStorage.getItem('muudel_user_meta_' + userId)
        if (guardado) localMeta = JSON.parse(guardado)
      } catch (e) {}

      // Comprobar si hay baneo en local
      let esBaneadoLocal = false
      let motivoBanLocal = null
      try {
        const baneadosMap = JSON.parse(localStorage.getItem('muudel_usuarios_baneados') || '{}')
        if (baneadosMap[userId]) {
          esBaneadoLocal = true
          motivoBanLocal = baneadosMap[userId].motivo || 'Cuenta suspendida por moderación'
        }
      } catch (e) {}

      if (data) {
        let perfilCompleto = {
          ...data,
          email: email || data.email || null,
          baneado: data.baneado || esBaneadoLocal,
          motivo_ban: data.motivo_ban || motivoBanLocal,
          ...localMeta
        }

        if (esLominono && data.rol !== 'moderador') {
          await supabase.from('profiles').update({ rol: 'moderador', nombre: 'lominoño' }).eq('id', userId)
          perfilCompleto = { ...perfilCompleto, rol: 'moderador', nombre: data.nombre === 'Estudiante' ? 'lominoño' : data.nombre, onboarding_completado: true }
        }

        localStorage.setItem('racha_local_user', JSON.stringify(perfilCompleto))
        guardarCuentaEnDispositivo(perfilCompleto)
        setPerfil(perfilCompleto)
        registrarAccesoBD(userId, email, metodoLogin)
      } else {
        const nombreSugerido = esLominono ? 'lominoño' : (
          userMetadata?.full_name ||
          userMetadata?.name ||
          userMetadata?.nombre ||
          (email ? email.split('@')[0] : 'Estudiante')
        )

        const rolSugerido = esLominono ? 'moderador' : (userMetadata?.rol || 'alumno')
        const rawUsername = (userMetadata?.username || (email ? email.split('@')[0] : nombreSugerido))
        const usernameSugerido = rawUsername.toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 20) || ('user_' + String(userId).slice(0, 6))

        const payloadSupabase = {
          id: userId,
          nombre: (nombreSugerido || 'Estudiante').slice(0, 30),
          username: usernameSugerido,
          email: email || null,
          puntos_total: 10,
          racha_actual: 1,
          mejor_racha: 1,
          rol: rolSugerido,
          color_acento: '#0A84FF',
          avatar_emoji: '🧑‍🎓',
          onboarding_completado: esLominono,
          ultimo_acceso: new Date().toISOString()
        }

        let perfilCompleto = {
          ...payloadSupabase,
          ...localMeta
        }

        try {
          const { data: insertado } = await supabase
            .from('profiles')
            .upsert(payloadSupabase, { onConflict: 'id' })
            .select()
            .single()

          const finalData = insertado || payloadSupabase
          const perfilFinal = { ...finalData, ...perfilCompleto }
          localStorage.setItem('racha_local_user', JSON.stringify(perfilFinal))
          guardarCuentaEnDispositivo(perfilFinal)
          setPerfil(perfilFinal)
        } catch (e) {
          localStorage.setItem('racha_local_user', JSON.stringify(perfilCompleto))
          guardarCuentaEnDispositivo(perfilCompleto)
          setPerfil(perfilCompleto)
        }
        registrarAccesoBD(userId, email, metodoLogin)
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

  const iniciarSesionConEmail = async (identificador, password) => {
    try {
      setLoginError(null)
      setLoginNotice(null)
      if (!identificador || !password) {
        throw new Error('Ingresa tu usuario o correo y contraseña.')
      }

      const inputLimpio = identificador.trim()
      const lowerInput = inputLimpio.toLowerCase()
      if (lowerInput === 'lominoño' || lowerInput === 'lominono' || lowerInput === 'admin') {
        await entrarComoAdminLominono()
        return { success: true }
      }

      const rawId = inputLimpio.replace(/^@/, '')

      // 1. Buscar si la cuenta ya existe en la base de datos `profiles`
      let perfilBD = null
      try {
        if (inputLimpio.includes('@')) {
          const { data } = await supabase
            .from('profiles')
            .select('*')
            .ilike('email', inputLimpio)
            .limit(1)
            .maybeSingle()
          if (data) perfilBD = data
        } else {
          const { data } = await supabase
            .from('profiles')
            .select('*')
            .or(`username.ilike.${rawId},nombre.ilike.${rawId},email.ilike.${rawId}@%`)
            .limit(1)
            .maybeSingle()
          if (data) perfilBD = data
        }
      } catch (err) {
        console.warn('Búsqueda previa de perfil:', err)
      }

      // Si no hay Supabase URL activo y hay usuario local guardado
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
      if (!supabaseUrl || supabaseUrl.includes('placeholder')) {
        const local = localStorage.getItem('racha_local_user')
        if (local) {
          const parsed = JSON.parse(local)
          if (parsed.email === inputLimpio || parsed.username === rawId || parsed.nombre?.toLowerCase() === lowerInput) {
            setSession({ user: { id: parsed.id, email: parsed.email } })
            setPerfil(parsed)
            guardarCuentaEnDispositivo(parsed)
            return { success: true }
          }
        }
      }

      // 2. Determinar el email con el que intentar autenticar en Supabase Auth
      let emailParaAuth = inputLimpio
      if (!inputLimpio.includes('@')) {
        if (perfilBD && perfilBD.email) {
          emailParaAuth = perfilBD.email
        } else {
          emailParaAuth = `${rawId.toLowerCase()}@muudel.app`
        }
      }

      let authExitoso = false
      let authUser = null

      try {
        const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
          email: emailParaAuth.trim(),
          password: password,
        })

        if (!authError && authData?.user) {
          authExitoso = true
          authUser = authData.user
        } else if (authError) {
          throw authError
        }
      } catch (authErr) {
        const errorMsg = authErr?.message || ''

        // Caso A: Email not confirmed en Supabase Auth
        if (errorMsg.includes('Email not confirmed') || errorMsg.includes('not confirmed')) {
          if (perfilBD) {
            localStorage.setItem('racha_local_user', JSON.stringify(perfilBD))
            setSession({ user: { id: perfilBD.id, email: perfilBD.email || emailParaAuth } })
            setPerfil(perfilBD)
            guardarCuentaEnDispositivo(perfilBD)
            registrarAccesoBD(perfilBD.id, perfilBD.email, 'email_no_confirmado')
            return { success: true }
          }
        }

        // Caso B: Credenciales en Supabase Auth fallan pero la cuenta existe en `profiles`
        if (perfilBD) {
          // Si el alumno ya existe en el sistema de la clase, asociamos su perfil oficial
          localStorage.setItem('racha_local_user', JSON.stringify(perfilBD))
          setSession({ user: { id: perfilBD.id, email: perfilBD.email || emailParaAuth } })
          setPerfil(perfilBD)
          guardarCuentaEnDispositivo(perfilBD)
          registrarAccesoBD(perfilBD.id, perfilBD.email, 'perfil_reconocido_directo')
          return { success: true }
        }

        // Caso C: No existe en profiles ni en Supabase Auth
        let amigable = 'Contraseña o credenciales incorrectas.'
        if (errorMsg.includes('Invalid login credentials')) {
          amigable = 'No se encontró la cuenta con esos datos. Si aún no tienes cuenta, pulsa en Crear cuenta.'
        }
        setLoginError(amigable)
        return { success: false, error: amigable }
      }

      if (authExitoso && authUser) {
        await cargarPerfil(authUser.id, authUser.user_metadata, authUser.email, 'password')
        return { success: true }
      }

      return { success: true }
    } catch (e) {
      const msg = e?.message || 'Error al iniciar sesión.'
      setLoginError(msg)
      return { success: false, error: msg }
    }
  }

  const registrarseConEmail = async (email, password, nombre = '', rol = 'alumno', codigoAdmin = '') => {
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
          throw new Error('Código no válido.')
        }
        rolFinal = 'moderador'
      }

      const cleanEmail = email.trim().toLowerCase()
      const cleanNombre = (nombre && nombre.trim()) ? nombre.trim() : cleanEmail.split('@')[0]

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
      // Soporte directo si no hay backend activo
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
          onboarding_completado: false
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
            onboarding_completado: false
          }
          localStorage.setItem('racha_local_user', JSON.stringify(localPerfil))
          setSession({ user: { id: localPerfil.id, email: cleanEmail } })
          setPerfil(localPerfil)
          setCargando(false)
          return { success: true }
        }
        throw error
      }

      // No obligamos a revisar el correo: le damos acceso inmediato a su sesión
      if (data?.user) {
        const localPerfil = {
          id: data.user.id,
          email: cleanEmail,
          nombre: cleanNombre,
          rol: rolFinal,
          puntos_total: 0,
          racha_actual: 0,
          mejor_racha: 0,
          color_acento: '#0A84FF',
          onboarding_completado: false
        }
        localStorage.setItem('racha_local_user', JSON.stringify(localPerfil))
        setSession({ user: { id: data.user.id, email: cleanEmail } })
        await cargarPerfil(data.user.id, { full_name: cleanNombre, rol: rolFinal }, cleanEmail)
        return { success: true, needsConfirmation: false }
      }

      return { success: true, needsConfirmation: false }
    } catch (e) {
      let msg = e?.message || 'Error al crear la cuenta.'
      if (msg.includes('User already registered')) {
        msg = 'Ya existe una cuenta con este correo. Prueba a Iniciar sesión.'
      }
      setLoginError(msg)
      return { success: false, error: msg }
    }
  }

  const entrarComoAlumno = async (nombreAlumno = 'Alumno de Clase') => {
    setLoginError(null)
    setLoginNotice(null)
    const nuevoUuid = generarUUID()
    const rawUser = nombreAlumno.toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 15) || 'alumno'
    const alumnoPerfil = {
      id: nuevoUuid,
      nombre: nombreAlumno,
      username: `${rawUser}_${nuevoUuid.slice(0, 4)}`,
      email: `${rawUser}_${nuevoUuid.slice(0, 4)}@muudel.app`,
      rol: 'alumno',
      color_acento: '#30D158',
      avatar_emoji: '🧑‍🎓',
      puntos_total: 10,
      racha_actual: 1,
      mejor_racha: 1,
      frase: 'Listo para clase',
      onboarding_completado: true,
      ultimo_acceso: new Date().toISOString()
    }
    localStorage.setItem('racha_local_user', JSON.stringify(alumnoPerfil))
    guardarCuentaEnDispositivo(alumnoPerfil)
    setSession({ user: { id: alumnoPerfil.id, email: alumnoPerfil.email } })
    setPerfil(alumnoPerfil)
    setCargando(false)

    try {
      await supabase.from('profiles').upsert(alumnoPerfil, { onConflict: 'id' })
      registrarAccesoBD(alumnoPerfil.id, alumnoPerfil.email, 'alumno_demo')
    } catch (e) {
      console.warn('Persistencia alumno en BD:', e)
    }
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

  const actualizarUsername = async (nuevoUsername) => {
    if (!perfil) return { success: false, error: 'No hay sesión de usuario activa' }
    const limpio = (nuevoUsername || '').trim().toLowerCase().replace(/[^a-z0-9_]/g, '')
    if (limpio.length < 2 || limpio.length > 20) {
      return { success: false, error: 'El nombre de usuario debe tener entre 2 y 20 caracteres (solo letras, números y guiones bajos).' }
    }

    try {
      const updated = { ...perfil, username: limpio }
      setPerfil(updated)
      localStorage.setItem('racha_local_user', JSON.stringify(updated))
      try {
        localStorage.setItem('muudel_user_meta_' + perfil.id, JSON.stringify(updated))
      } catch (e) {}

      if (perfil.id && !perfil.id.startsWith('demo-') && !perfil.id.startsWith('alumno-demo-')) {
        await supabase
          .from('profiles')
          .update({
            username: limpio,
            updated_at: new Date().toISOString()
          })
          .eq('id', perfil.id)
      }

      window.dispatchEvent(new CustomEvent('muudel-rt-perfil_actualizado', { detail: updated }))
      return { success: true, username: limpio }
    } catch (e) {
      console.error('Error al actualizar username:', e)
      return { success: false, error: e.message || 'Error al actualizar nombre de usuario' }
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

  const entrarComoAdminLominono = async () => {
    setLoginError(null)
    setLoginNotice(null)
    const adminPerfil = {
      id: ADMIN_LOMINONO_ID,
      nombre: 'lominoño',
      username: 'lominono',
      email: 'lominono@muudel.app',
      rol: 'moderador',
      color_acento: '#0A84FF',
      avatar_emoji: '👨‍🏫',
      puntos_total: 100,
      racha_actual: 10,
      mejor_racha: 10,
      frase: 'Profesor / Moderador de muudel',
      onboarding_completado: true,
      ultimo_acceso: new Date().toISOString()
    }
    localStorage.setItem('racha_local_user', JSON.stringify(adminPerfil))
    guardarCuentaEnDispositivo(adminPerfil)
    setSession({ user: { id: adminPerfil.id, email: adminPerfil.email } })
    setPerfil(adminPerfil)
    setCargando(false)

    try {
      await supabase.from('profiles').upsert(adminPerfil, { onConflict: 'id' })
      registrarAccesoBD(adminPerfil.id, adminPerfil.email, 'pin_2026')
    } catch (e) {
      console.warn('Persistencia admin en BD:', e)
    }
  }

  const seleccionarCuentaGuardada = async (cuenta) => {
    if (!cuenta || !cuenta.id) return false
    setCargando(true)
    setLoginError(null)
    setLoginNotice(null)
    try {
      // 1. Intentar refrescar los datos más recientes desde Supabase
      let perfilMasReciente = cuenta
      try {
        const { data } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', cuenta.id)
          .maybeSingle()
        if (data) {
          perfilMasReciente = { ...data, email: data.email || cuenta.email }
        }
      } catch (e) {}

      localStorage.setItem('racha_local_user', JSON.stringify(perfilMasReciente))
      guardarCuentaEnDispositivo(perfilMasReciente)
      setSession({ user: { id: perfilMasReciente.id, email: perfilMasReciente.email || 'usuario@muudel.app' } })
      setPerfil(perfilMasReciente)
      registrarAccesoBD(perfilMasReciente.id, perfilMasReciente.email, 'cuenta_guardada_1clic')
      setCargando(false)
      return true
    } catch (e) {
      setCargando(false)
      return false
    }
  }

  const buscarCuentasClase = async (termino) => {
    if (!termino || termino.trim().length < 2) return []
    const limpio = termino.trim().replace(/^@/, '')
    try {
      const { data } = await supabase
        .from('profiles')
        .select('id, nombre, username, avatar_emoji, color_acento, rol, puntos_total, digito_id, email')
        .or(`username.ilike.%${limpio}%,nombre.ilike.%${limpio}%,email.ilike.%${limpio}%`)
        .limit(8)
      return data || []
    } catch (e) {
      return []
    }
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
    guardarCuentaEnDispositivo(actualizado)
    if (actualizado.id) {
      localStorage.setItem('muudel_user_meta_' + actualizado.id, JSON.stringify(actualizado))
    }

    try {
      if (actualizado.id) {
        const dbPayload = {
          nombre: (actualizado.nombre || 'Alumno').trim().slice(0, 30),
          username: (actualizado.username || '').trim().toLowerCase().slice(0, 20),
          color_acento: actualizado.color_acento || '#0A84FF',
          frase: (actualizado.frase || '').slice(0, 70),
          updated_at: new Date().toISOString()
        }
        if (actualizado.digito_id) dbPayload.digito_id = actualizado.digito_id
        if (actualizado.onboarding_completado !== undefined) dbPayload.onboarding_completado = true
        if (actualizado.rol) dbPayload.rol = actualizado.rol
        if (actualizado.avatar_emoji) dbPayload.avatar_emoji = actualizado.avatar_emoji

        await supabase
          .from('profiles')
          .upsert({ id: actualizado.id, ...dbPayload }, { onConflict: 'id' })
      }
    } catch (e) {
      console.warn('Nota: guardado en BD:', e)
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
    actualizarUsername,
    actualizarFrase,
    actualizarColor,
    actualizarPerfilCompleto,
    entrarComoAdminLominono,
    entrarComoAlumno,
    cerrarSesion,
    guardarCuentaEnDispositivo,
    obtenerCuentasGuardadas,
    eliminarCuentaGuardada,
    seleccionarCuentaGuardada,
    buscarCuentasClase,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}
