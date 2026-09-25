import { useState, useEffect } from 'react'
import { useNavigate, Navigate } from 'react-router-dom'
import { useAuth } from '../App'
import { supabase } from '../utils/supabase'
import { InsigniaIniciales } from '../components/InsigniaIniciales'
import { sound, triggerConfetti } from '../utils/haptics'
import {
  ShieldCheck,
  Calendar,
  Users,
  Target,
  Plus,
  Check,
  Clock,
  Flame,
  Award,
  Search,
  AlertCircle,
  Lock,
  Unlock,
  ShoppingBag,
  ShieldAlert,
  FileText,
  CheckCheck,
  MessageCircleQuestion,
  HelpCircle,
  ChevronRight
} from 'lucide-react'

const PIN_ADMIN_CORRECTO = '2026'

export function PantallaAdmin() {
  const { perfil } = useAuth()
  const navigate = useNavigate()

  // 1. Estado de Seguridad por PIN de Moderador
  const [desbloqueado, setDesbloqueado] = useState(() => {
    return sessionStorage.getItem('muudel_admin_desbloqueado') === 'true'
  })
  const [pinInput, setPinInput] = useState('')
  const [pinError, setPinError] = useState('')
  const [intentosFallidos, setIntentosFallidos] = useState(0)

  // 2. Navegación entre pestañas del Panel
  const [tab, setTab] = useState('asistencia') // 'asistencia' | 'canjes' | 'alumnos' | 'retos' | 'seguridad'
  const [cargando, setCargando] = useState(true)

  // Datos de asistencia y solicitudes de las 15:30
  const [checkinsHoy, setCheckinsHoy] = useState([])
  const [solicitudesHoy, setSolicitudesHoy] = useState([])
  const [todosAlumnos, setTodosAlumnos] = useState([])

  // Canjes de puntos pedidos por alumnos
  const [canjesPedidos, setCanjesPedidos] = useState([])

  // Auditoría
  const [logsAuditoria, setLogsAuditoria] = useState([])

  // Búsqueda y acciones
  const [busqueda, setBusqueda] = useState('')
  const [accionEnCurso, setAccionEnCurso] = useState(null)
  const [notificacion, setNotificacion] = useState(null)

  // Modal de confirmación para acciones críticas
  const [modalConfirmacion, setModalConfirmacion] = useState(null)

  // Nuevo Reto y Pregunta Flash
  const [nuevoRetoTitulo, setNuevoRetoTitulo] = useState('')
  const [nuevoRetoDesc, setNuevoRetoDesc] = useState('')
  const [nuevoRetoPuntos, setNuevoRetoPuntos] = useState(25)
  const [retosActivos, setRetosActivos] = useState([])
  const [guardandoReto, setGuardandoReto] = useState(false)

  // Pregunta Flash custom
  const [nuevaPreguntaTexto, setNuevaPreguntaTexto] = useState('')
  const [opcionesFlash, setOpcionesFlash] = useState(['', '', ''])

  const fechaHoy = new Date().toISOString().split('T')[0]

  useEffect(() => {
    if (desbloqueado) {
      cargarDatos()
    }
  }, [tab, desbloqueado])

  const avisar = (msg, tipo = 'exito') => {
    setNotificacion({ msg, tipo })
    setTimeout(() => setNotificacion(null), 3500)
  }

  const registrarAuditoria = (accion, detalle) => {
    const nuevoLog = {
      id: 'aud-' + Date.now(),
      fecha: new Date().toLocaleDateString('es-ES'),
      hora: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      autor: perfil?.nombre || 'lominoño',
      accion,
      detalle
    }
    try {
      const logs = JSON.parse(localStorage.getItem('muudel_audit_log') || '[]')
      const actualizados = [nuevoLog, ...logs].slice(0, 80)
      localStorage.setItem('muudel_audit_log', JSON.stringify(actualizados))
      setLogsAuditoria(actualizados)
    } catch (e) {}
  }

  const cargarDatos = async () => {
    setCargando(true)
    try {
      // 1. Cargar todos los alumnos
      const { data: alumnosData } = await supabase
        .from('profiles')
        .select('*')
        .order('nombre', { ascending: true })

      let listaAlumnos = alumnosData || []
      // Enriquecer con metadatos locales (dígito de lista, nick) si existen
      listaAlumnos = listaAlumnos.map(a => {
        try {
          const meta = localStorage.getItem('muudel_user_meta_' + a.id)
          if (meta) return { ...a, ...JSON.parse(meta) }
        } catch (e) {}
        return a
      })

      setTodosAlumnos(listaAlumnos)

      // 2. Cargar checkins confirmados de hoy
      const { data: checkinsData } = await supabase
        .from('checkins')
        .select('*, profiles(nombre, color_acento)')
        .eq('fecha', fechaHoy)
        .order('hora', { ascending: true })

      const mapaRemoto = checkinsData || []
      const localCheckins = localStorage.getItem('racha_checkins_' + fechaHoy)
      let listaCombinada = [...mapaRemoto]

      if (localCheckins) {
        try {
          const parsed = JSON.parse(localCheckins)
          Object.values(parsed).forEach(chk => {
            if (!listaCombinada.find(c => c.user_id === chk.user_id)) {
              listaCombinada.push(chk)
            }
          })
        } catch (e) {}
      }
      setCheckinsHoy(listaCombinada)

      // 3. Cargar solicitudes de confirmación de las 15:30
      const solicitudesGuardadas = localStorage.getItem('muudel_solicitudes_' + fechaHoy)
      if (solicitudesGuardadas) {
        try {
          setSolicitudesHoy(JSON.parse(solicitudesGuardadas))
        } catch (e) {
          setSolicitudesHoy([])
        }
      } else {
        setSolicitudesHoy([])
      }

      // 4. Cargar canjes de puntos de alumnos
      const canjesGuardados = localStorage.getItem('muudel_canjes_pedidos')
      if (canjesGuardados) {
        try {
          setCanjesPedidos(JSON.parse(canjesGuardados))
        } catch (e) {
          setCanjesPedidos([])
        }
      }

      // 5. Cargar retos
      const { data: retosData } = await supabase
        .from('retos')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20)

      setRetosActivos(retosData || [])

      // 6. Cargar registros de auditoría
      const logs = JSON.parse(localStorage.getItem('muudel_audit_log') || '[]')
      setLogsAuditoria(logs)
    } catch (err) {
      console.warn('Error al cargar datos administrativos:', err)
    } finally {
      setCargando(false)
    }
  }

  // Comprobar PIN de seguridad
  const handleDesbloquearPin = (e) => {
    e.preventDefault()
    setPinError('')

    if (intentosFallidos >= 5) {
      setPinError('Demasiados intentos fallidos. Espera 30 segundos.')
      return
    }

    if (pinInput.trim() === PIN_ADMIN_CORRECTO) {
      sound.playPop()
      setDesbloqueado(true)
      sessionStorage.setItem('muudel_admin_desbloqueado', 'true')
      setPinInput('')
      setIntentosFallidos(0)
      registrarAuditoria('Acceso al Panel', 'Desbloqueo seguro por PIN de moderador')
    } else {
      sound.playPop()
      setIntentosFallidos(prev => prev + 1)
      setPinError('PIN incorrecto. Revisa el código maestro de moderador.')
    }
  }

  const handleBloquear = () => {
    sessionStorage.removeItem('muudel_admin_desbloqueado')
    setDesbloqueado(false)
    sound.playPop()
  }

  // Aprobar solicitud de confirmación de las 15:30
  const handleAprobarSolicitud = async (solicitud) => {
    setAccionEnCurso(solicitud.userId)
    const puntos = solicitud.esTarde ? 5 : 10
    const horaActual = solicitud.hora || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

    const nuevoRecord = {
      user_id: solicitud.userId,
      fecha: fechaHoy,
      hora: horaActual,
      es_tarde: solicitud.esTarde,
      puntos_ganados: puntos
    }

    // 1. Guardar checkin local
    try {
      const localCheckins = JSON.parse(localStorage.getItem('racha_checkins_' + fechaHoy) || '{}')
      localCheckins[solicitud.userId] = nuevoRecord
      localStorage.setItem('racha_checkins_' + fechaHoy, JSON.stringify(localCheckins))
    } catch (e) {}

    // 2. Sincronizar con Supabase
    try {
      await supabase.from('checkins').upsert(nuevoRecord, { onConflict: 'user_id, fecha' })
    } catch (e) {}

    // 3. Quitar de solicitudes pendientes
    const restantes = solicitudesHoy.filter(s => s.userId !== solicitud.userId)
    setSolicitudesHoy(restantes)
    localStorage.setItem('muudel_solicitudes_' + fechaHoy, JSON.stringify(restantes))

    // 4. Actualizar lista de checkins hoy
    setCheckinsHoy(prev => [nuevoRecord, ...prev.filter(c => c.user_id !== solicitud.userId)])

    // 5. Auditar
    registrarAuditoria(
      'Aprobación de Asistencia 15:30',
      `Confirmada presencia de ${solicitud.nombre} (${solicitud.esTarde ? 'Tarde +5 pts' : 'Puntual +10 pts'})`
    )

    sound.playStamp()
    avisar(`Asistencia certificada para ${solicitud.nombre}`)
    setAccionEnCurso(null)
  }

  // Aprobar todas las solicitudes pendientes de un solo clic
  const handleAprobarTodas = async () => {
    if (solicitudesHoy.length === 0) return
    setAccionEnCurso('todas')

    for (const sol of solicitudesHoy) {
      await handleAprobarSolicitud(sol)
    }

    triggerConfetti()
    avisar('Todas las solicitudes de las 15:30 han sido aprobadas.')
    setAccionEnCurso(null)
  }

  // Marcar entrega de canje de puntos
  const handleCompletarCanje = (canjeId) => {
    const actualizados = canjesPedidos.map(c => c.id === canjeId ? { ...c, estado: 'entregado' } : c)
    setCanjesPedidos(actualizados)
    localStorage.setItem('muudel_canjes_pedidos', JSON.stringify(actualizados))
    sound.playPop()
    avisar('Recompensa marcada como entregada.')
    registrarAuditoria('Entrega de Recompensa', `Canje #${canjeId} validado y entregado`)
  }

  // Bonificar puntos directos
  const handleBonificarPuntos = async (alumnoId, puntosExtra, motivo = 'Participación en clase') => {
    setAccionEnCurso(alumnoId)
    const alumno = todosAlumnos.find((a) => a.id === alumnoId)
    if (!alumno) return

    const nuevosPuntos = (alumno.puntos_total || 0) + puntosExtra

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          puntos_total: nuevosPuntos,
          updated_at: new Date().toISOString()
        })
        .eq('id', alumnoId)

      if (!error) {
        sound.playPop()
        avisar(`+${puntosExtra} pts asignados a ${alumno.nombre}.`)
        setTodosAlumnos((prev) =>
          prev.map((a) => (a.id === alumnoId ? { ...a, puntos_total: nuevosPuntos } : a))
        )
        registrarAuditoria('Bonificación de Puntos', `+${puntosExtra} pts a ${alumno.nombre} (${motivo})`)
      }
    } catch (err) {
      avisar('Error al actualizar puntos.', 'error')
    } finally {
      setAccionEnCurso(null)
    }
  }

  // Cambiar rol con confirmación de seguridad
  const solicitarCambioRol = (alumno, nuevoRol) => {
    setModalConfirmacion({
      titulo: `¿Cambiar rol a ${nuevoRol === 'moderador' ? 'Moderador' : 'Alumno'}?`,
      mensaje: `Estás a punto de modificar los permisos de ${alumno.nombre}. Esta es una acción administrativa crítica.`,
      accion: () => ejecutarCambioRol(alumno.id, nuevoRol)
    })
  }

  const ejecutarCambioRol = async (alumnoId, nuevoRol) => {
    setAccionEnCurso(alumnoId)
    setModalConfirmacion(null)
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ rol: nuevoRol, updated_at: new Date().toISOString() })
        .eq('id', alumnoId)

      if (!error) {
        avisar(`Rol actualizado a ${nuevoRol}.`)
        setTodosAlumnos((prev) =>
          prev.map((a) => (a.id === alumnoId ? { ...a, rol: nuevoRol } : a))
        )
        registrarAuditoria('Cambio de Rol', `Usuario ${alumnoId} pasó a ${nuevoRol}`)
      }
    } catch (err) {
      avisar('Error al modificar rol.', 'error')
    } finally {
      setAccionEnCurso(null)
    }
  }

  // Publicar Nuevo Reto
  const handleCrearReto = async (e) => {
    e.preventDefault()
    if (!nuevoRetoTitulo.trim()) return
    setGuardandoReto(true)

    try {
      const { data, error } = await supabase.from('retos').insert({
        titulo: nuevoRetoTitulo.trim(),
        descripcion: nuevoRetoDesc.trim() || null,
        puntos: Number(nuevoRetoPuntos),
        creado_por: perfil?.id || null,
        activo: true,
      }).select().single()

      if (!error && data) {
        sound.playStamp()
        avisar('Nuevo reto publicado con éxito.')
        setRetosActivos((prev) => [data, ...prev])
        registrarAuditoria('Publicación de Reto', `Reto: ${nuevoRetoTitulo.trim()} (${nuevoRetoPuntos} pts)`)
        setNuevoRetoTitulo('')
        setNuevoRetoDesc('')
      }
    } catch (err) {
      avisar('Error al crear reto.', 'error')
    } finally {
      setGuardandoReto(false)
    }
  }

  // Publicar Pregunta Flash del día
  const handleGuardarPreguntaFlash = (e) => {
    e.preventDefault()
    if (!nuevaPreguntaTexto.trim()) return

    const opcionesValidas = opcionesFlash.filter(o => o.trim().length > 0)
    if (opcionesValidas.length < 2) {
      avisar('Añade al menos 2 opciones de respuesta.', 'error')
      return
    }

    const nuevaPregunta = {
      id: 'custom-' + Date.now(),
      pregunta: nuevaPreguntaTexto.trim(),
      opciones: opcionesValidas.map((txt, idx) => ({ id: String.fromCharCode(97 + idx), texto: txt.trim() })),
      creadaPor: perfil?.nombre || 'lominoño'
    }

    localStorage.setItem('muudel_pregunta_custom_hoy', JSON.stringify(nuevaPregunta))
    registrarAuditoria('Pregunta Flash', `Publicada pregunta: "${nuevaPreguntaTexto.trim()}"`)
    sound.playStamp()
    avisar('Pregunta Flash activada para la clase de hoy.')
    setNuevaPreguntaTexto('')
    setOpcionesFlash(['', '', ''])
  }

  // 1. RESTRICCIÓN TOTAL: Si no es moderador, redirigir sin dejar rastro de que la página existe
  if (!perfil || perfil.rol !== 'moderador') {
    return <Navigate to="/" replace />
  }

  // 2. PANTALLA DE BLOQUEO POR PIN DE SEGURIDAD
  if (!desbloqueado) {
    return (
      <main style={{ maxWidth: 420, margin: '60px auto', padding: '20px 16px' }}>
        <div className="card" style={{ padding: '36px 24px', textAlign: 'center' }}>
          <div style={{
            width: 56,
            height: 56,
            borderRadius: 18,
            backgroundColor: 'rgba(10, 132, 255, 0.12)',
            color: 'var(--color-accent)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 14px'
          }}>
            <Lock size={28} />
          </div>

          <h2 className="apple-large-title" style={{ fontSize: 24, marginBottom: 4 }}>
            Panel Protegido
          </h2>
          <p className="apple-subheadline" style={{ fontSize: 14, marginBottom: 22 }}>
            Introduce el PIN de seguridad de moderador para desbloquear las herramientas de clase:
          </p>

          <form onSubmit={handleDesbloquearPin} style={{ maxWidth: 280, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 12 }}>
            <input
              type="password"
              inputMode="numeric"
              maxLength={6}
              placeholder="PIN Maestro"
              value={pinInput}
              onChange={(e) => {
                setPinError('')
                setPinInput(e.target.value.replace(/\D/g, ''))
              }}
              className="apple-input"
              style={{
                textAlign: 'center',
                fontSize: 26,
                letterSpacing: 10,
                fontWeight: 700,
                minHeight: 50
              }}
              autoFocus
              required
            />

            {pinError && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, color: 'var(--color-negative)', fontSize: 13, fontWeight: 600 }}>
                <AlertCircle size={15} />
                <span>{pinError}</span>
              </div>
            )}

            <button
              type="submit"
              className="btn-primary"
              disabled={pinInput.length < 4}
              style={{ width: '100%', minHeight: 44, fontSize: 15, fontWeight: 700, marginTop: 4 }}
            >
              Desbloquear Gestión
            </button>

            <span className="apple-caption" style={{ color: 'var(--color-tertiary-ink)', marginTop: 4 }}>
              PIN por defecto: <strong>2026</strong>
            </span>
          </form>
        </div>
      </main>
    )
  }

  const alumnosFiltrados = todosAlumnos.filter((a) =>
    (a.nombre || '').toLowerCase().includes(busqueda.toLowerCase())
  )

  const aTiempoCount = checkinsHoy.filter((c) => !c.es_tarde).length
  const tardeCount = checkinsHoy.filter((c) => c.es_tarde).length

  return (
    <main className="app-container" style={{ maxWidth: 860 }}>
      {/* Cabecera del Panel */}
      <header style={{ marginBottom: 18 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <ShieldCheck size={26} color="var(--color-accent)" />
            <h1 className="apple-large-title" style={{ fontSize: 26 }}>
              Panel de lominoño
            </h1>
          </div>

          <button
            onClick={handleBloquear}
            title="Bloquear sesión de administración"
            style={{
              padding: '6px 12px',
              borderRadius: 9999,
              border: '1px solid var(--color-separator)',
              backgroundColor: 'var(--color-surface-secondary)',
              color: 'var(--color-secondary-ink)',
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6
            }}
          >
            <Lock size={13} />
            <span>Bloquear</span>
          </button>
        </div>

        <p className="apple-subheadline">
          Asistencia de las 15:30, canjes de puntos, retos y auditoría de clase.
        </p>

        {/* Notificación flotante */}
        {notificacion && (
          <div style={{
            marginTop: 12,
            padding: '10px 14px',
            borderRadius: 12,
            fontSize: 13,
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            backgroundColor: notificacion.tipo === 'error' ? 'rgba(255, 59, 48, 0.12)' : 'rgba(52, 199, 89, 0.12)',
            color: notificacion.tipo === 'error' ? 'var(--color-negative)' : 'var(--color-positive)',
            border: `1px solid ${notificacion.tipo === 'error' ? 'rgba(255, 59, 48, 0.3)' : 'rgba(52, 199, 89, 0.3)'}`
          }}>
            {notificacion.tipo === 'error' ? <AlertCircle size={16} /> : <Check size={16} />}
            <span>{notificacion.msg}</span>
          </div>
        )}

        {/* Selector de Pestañas con scroll suave */}
        <div style={{
          display: 'flex',
          gap: 6,
          marginTop: 16,
          overflowX: 'auto',
          paddingBottom: 4,
          scrollbarWidth: 'none'
        }}>
          {[
            { id: 'asistencia', label: `Asistencia (${solicitudesHoy.length})`, icon: Calendar },
            { id: 'canjes', label: `Canjes (${canjesPedidos.filter(c => c.estado === 'pendiente').length})`, icon: ShoppingBag },
            { id: 'alumnos', label: `Comunidad (${todosAlumnos.length})`, icon: Users },
            { id: 'retos', label: 'Retos & Flash', icon: Target },
            { id: 'seguridad', label: 'Auditoría', icon: ShieldAlert }
          ].map((t) => {
            const Icono = t.icon
            const activo = tab === t.id
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '8px 14px',
                  borderRadius: 9999,
                  border: 'none',
                  backgroundColor: activo ? 'var(--color-accent)' : 'var(--color-fill-secondary)',
                  color: activo ? '#FFFFFF' : 'var(--color-ink)',
                  fontWeight: 600,
                  fontSize: 13,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.15s ease'
                }}
              >
                <Icono size={14} />
                <span>{t.label}</span>
              </button>
            )
          })}
        </div>
      </header>

      {/* PESTAÑA 1: ASISTENCIA Y SOLICITUDES DE LAS 15:30 */}
      {tab === 'asistencia' && (
        <div>
          {/* Solicitudes de las 15:30 pendientes */}
          <section className="card" style={{
            marginBottom: 16,
            border: solicitudesHoy.length > 0 ? '1.5px solid var(--color-accent)' : '1px solid var(--color-separator)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Clock size={18} color="var(--color-accent)" />
                <h3 className="apple-headline" style={{ fontSize: 16 }}>
                  Solicitudes de las 15:30 ({solicitudesHoy.length})
                </h3>
              </div>

              {solicitudesHoy.length > 0 && (
                <button
                  className="btn-primary"
                  onClick={handleAprobarTodas}
                  disabled={accionEnCurso === 'todas'}
                  style={{ minHeight: 32, padding: '4px 12px', fontSize: 12, fontWeight: 700 }}
                >
                  <CheckCheck size={14} />
                  <span>Aprobar Todas</span>
                </button>
              )}
            </div>

            {solicitudesHoy.length === 0 ? (
              <p className="apple-subheadline" style={{ fontSize: 13, color: 'var(--color-secondary-ink)' }}>
                No hay solicitudes pendientes en este momento. Conforme los alumnos pulsen a las 15:30, aparecerán aquí para tu visto bueno.
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {solicitudesHoy.map((sol) => (
                  <div
                    key={sol.userId}
                    style={{
                      padding: '10px 14px',
                      borderRadius: 12,
                      backgroundColor: 'var(--color-surface-secondary)',
                      border: '1px solid var(--color-separator)',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                        <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--color-ink)' }}>
                          {sol.nombre}
                        </span>
                        {sol.digito_id && (
                          <span style={{
                            fontSize: 11,
                            fontWeight: 700,
                            padding: '1px 6px',
                            borderRadius: 6,
                            backgroundColor: 'rgba(10, 132, 255, 0.12)',
                            color: 'var(--color-accent)',
                            fontVariantNumeric: 'tabular-nums'
                          }}>
                            {sol.digito_id}
                          </span>
                        )}
                        {sol.username && (
                          <span style={{ fontSize: 12, color: 'var(--color-secondary-ink)' }}>
                            @{sol.username}
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--color-secondary-ink)', marginTop: 2 }}>
                        {sol.email ? `${sol.email} · ` : ''}Aviso: {sol.hora} · {sol.esTarde ? 'Retraso (+5 pts)' : 'Puntual (+10 pts)'}
                      </div>
                    </div>

                    <button
                      className="btn-primary"
                      disabled={accionEnCurso === sol.userId}
                      onClick={() => handleAprobarSolicitud(sol)}
                      style={{ minHeight: 32, padding: '4px 12px', fontSize: 12, fontWeight: 600, flexShrink: 0 }}
                    >
                      Aprobar
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Resumen del día */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 16 }}>
            <div className="card" style={{ padding: '12px 10px', textAlign: 'center' }}>
              <span className="apple-caption">Total Presentes</span>
              <div className="tabular-nums" style={{ fontSize: 22, fontWeight: 800, color: 'var(--color-accent)', marginTop: 2 }}>
                {checkinsHoy.length}
              </div>
            </div>
            <div className="card" style={{ padding: '12px 10px', textAlign: 'center' }}>
              <span className="apple-caption">A tiempo (15:30)</span>
              <div className="tabular-nums" style={{ fontSize: 22, fontWeight: 800, color: 'var(--color-positive)', marginTop: 2 }}>
                {aTiempoCount}
              </div>
            </div>
            <div className="card" style={{ padding: '12px 10px', textAlign: 'center' }}>
              <span className="apple-caption">Con retraso</span>
              <div className="tabular-nums" style={{ fontSize: 22, fontWeight: 800, color: 'var(--color-warning)', marginTop: 2 }}>
                {tardeCount}
              </div>
            </div>
          </div>

          {/* Lista de checkins confirmados hoy */}
          <section className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--color-separator)' }}>
              <h3 className="apple-headline" style={{ fontSize: 16 }}>
                Alumnos en Clase Hoy ({checkinsHoy.length})
              </h3>
            </div>

            {checkinsHoy.length === 0 ? (
              <div style={{ padding: 32, textAlign: 'center' }}>
                <p className="apple-subheadline" style={{ fontSize: 14 }}>
                  Aún no hay asistencias confirmadas hoy.
                </p>
              </div>
            ) : (
              checkinsHoy.map((c, i) => (
                <div
                  key={c.id || i}
                  style={{
                    padding: '12px 16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    borderBottom: i < checkinsHoy.length - 1 ? '0.5px solid var(--color-separator)' : 'none'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <InsigniaIniciales nombre={c.profiles?.nombre || 'Alumno'} color={c.profiles?.color_acento} size={34} />
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>{c.profiles?.nombre || 'Alumno'}</div>
                      <div style={{ fontSize: 12, color: 'var(--color-secondary-ink)' }}>Llegó a las {c.hora}</div>
                    </div>
                  </div>

                  <span className={`apple-badge ${c.es_tarde ? 'apple-badge-warning' : 'apple-badge-positive'}`} style={{ fontSize: 12 }}>
                    {c.es_tarde ? '+5 pts (Tarde)' : '+10 pts (A tiempo)'}
                  </span>
                </div>
              ))
            )}
          </section>
        </div>
      )}

      {/* PESTAÑA 2: CANJES DE PUNTOS DE ALUMNOS (LA CANTINA) */}
      {tab === 'canjes' && (
        <section className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--color-separator)' }}>
            <h3 className="apple-headline" style={{ fontSize: 16 }}>
              Peticiones de Recompensas de Clase
            </h3>
            <p className="apple-caption" style={{ marginTop: 2 }}>
              Ventajas que los alumnos han pedido canjeando sus puntos reales
            </p>
          </div>

          {canjesPedidos.length === 0 ? (
            <div style={{ padding: 36, textAlign: 'center' }}>
              <p className="apple-subheadline" style={{ fontSize: 14 }}>
                No hay canjes solicitados por ahora.
              </p>
            </div>
          ) : (
            canjesPedidos.map((canje, i) => (
              <div
                key={canje.id || i}
                style={{
                  padding: '14px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  borderBottom: i < canjesPedidos.length - 1 ? '0.5px solid var(--color-separator)' : 'none'
                }}
              >
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--color-ink)' }}>
                    {canje.nombre}
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--color-accent)', fontWeight: 600, marginTop: 2 }}>
                    {canje.titulo} · <span style={{ color: 'var(--color-secondary-ink)', fontWeight: 400 }}>{canje.costo} pts</span>
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--color-tertiary-ink)', marginTop: 2 }}>
                    Solicitado: {canje.fecha}
                  </div>
                </div>

                {canje.estado === 'pendiente' ? (
                  <button
                    className="btn-primary"
                    onClick={() => handleCompletarCanje(canje.id)}
                    style={{ minHeight: 32, padding: '4px 12px', fontSize: 12, fontWeight: 600 }}
                  >
                    Validar Entrega
                  </button>
                ) : (
                  <span className="apple-badge apple-badge-positive" style={{ fontSize: 12 }}>
                    Entregado
                  </span>
                )}
              </div>
            ))
          )}
        </section>
      )}

      {/* PESTAÑA 3: ALUMNOS Y COMUNIDAD */}
      {tab === 'alumnos' && (
        <div>
          {/* Buscador */}
          <div style={{ position: 'relative', marginBottom: 14 }}>
            <Search size={16} color="var(--color-secondary-ink)" style={{ position: 'absolute', left: 14, top: 12 }} />
            <input
              type="text"
              className="apple-input"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar por nombre de alumno..."
              style={{ paddingLeft: 40 }}
            />
          </div>

          <section className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--color-separator)' }}>
              <h3 className="apple-headline" style={{ fontSize: 16 }}>
                Listado de Estudiantes ({alumnosFiltrados.length})
              </h3>
            </div>

            {alumnosFiltrados.map((alumno, i) => (
              <div
                key={alumno.id}
                style={{
                  padding: '14px 16px',
                  borderBottom: i < alumnosFiltrados.length - 1 ? '0.5px solid var(--color-separator)' : 'none'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <InsigniaIniciales nombre={alumno.nombre} color={alumno.color_acento} size={36} />
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                        <span style={{ fontWeight: 700, fontSize: 14 }}>{alumno.nombre}</span>
                        {alumno.digito_id && (
                          <span style={{
                            fontSize: 11,
                            fontWeight: 700,
                            padding: '1px 6px',
                            borderRadius: 6,
                            backgroundColor: 'rgba(10, 132, 255, 0.12)',
                            color: 'var(--color-accent)',
                            fontVariantNumeric: 'tabular-nums'
                          }}>
                            {alumno.digito_id}
                          </span>
                        )}
                        {alumno.username && (
                          <span style={{ fontSize: 12, color: 'var(--color-secondary-ink)' }}>
                            @{alumno.username}
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--color-secondary-ink)', marginTop: 1 }}>
                        {alumno.email ? `${alumno.email} · ` : ''}{alumno.puntos_total || 0} pts · {alumno.racha_actual || 0} días de racha
                      </div>
                    </div>
                  </div>

                  <span className={`apple-badge ${alumno.rol === 'moderador' ? 'apple-badge-accent' : 'apple-badge-neutral'}`} style={{ fontSize: 11 }}>
                    {alumno.rol === 'moderador' ? 'Moderador' : 'Alumno'}
                  </span>
                </div>

                {/* Acciones de profesor */}
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 10 }}>
                  <button
                    className="btn-secondary"
                    disabled={accionEnCurso === alumno.id}
                    onClick={() => handleBonificarPuntos(alumno.id, 5, 'Participación en clase')}
                    style={{ minHeight: 30, padding: '3px 10px', fontSize: 12 }}
                  >
                    +5 pts (Participar)
                  </button>
                  <button
                    className="btn-secondary"
                    disabled={accionEnCurso === alumno.id}
                    onClick={() => handleBonificarPuntos(alumno.id, 10, 'Aporte destacado')}
                    style={{ minHeight: 30, padding: '3px 10px', fontSize: 12 }}
                  >
                    +10 pts (Aporte)
                  </button>
                  <button
                    className="btn-secondary"
                    disabled={accionEnCurso === alumno.id}
                    onClick={() => solicitarCambioRol(alumno, alumno.rol === 'moderador' ? 'alumno' : 'moderador')}
                    style={{ minHeight: 30, padding: '3px 10px', fontSize: 12, color: alumno.rol === 'moderador' ? 'var(--color-secondary-ink)' : 'var(--color-accent)' }}
                  >
                    {alumno.rol === 'moderador' ? 'Hacer Alumno' : 'Hacer Moderador'}
                  </button>
                </div>
              </div>
            ))}
          </section>
        </div>
      )}

      {/* PESTAÑA 4: RETOS Y PREGUNTA FLASH */}
      {tab === 'retos' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Pregunta Flash del día */}
          <section className="card">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <MessageCircleQuestion size={18} color="var(--color-warning)" />
              <h3 className="apple-headline" style={{ fontSize: 16 }}>
                Lanzar Pregunta Flash para Hoy
              </h3>
            </div>
            <p className="apple-caption" style={{ marginBottom: 14 }}>
              Caducará a medianoche. Los alumnos recibirán +5 pts al responder y verán los votos de los demás.
            </p>

            <form onSubmit={handleGuardarPreguntaFlash} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <input
                type="text"
                className="apple-input"
                placeholder="Pregunta para la clase (ej: ¿Qué ejercicio os cuesta más?)"
                value={nuevaPreguntaTexto}
                onChange={(e) => setNuevaPreguntaTexto(e.target.value)}
                required
              />

              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 6 }}>
                {opcionesFlash.map((op, idx) => (
                  <input
                    key={idx}
                    type="text"
                    className="apple-input"
                    placeholder={`Opción ${idx + 1}`}
                    value={op}
                    onChange={(e) => {
                      const copia = [...opcionesFlash]
                      copia[idx] = e.target.value
                      setOpcionesFlash(copia)
                    }}
                    style={{ minHeight: 36, fontSize: 13 }}
                  />
                ))}
              </div>

              <button
                type="submit"
                className="btn-primary"
                disabled={!nuevaPreguntaTexto.trim()}
                style={{ minHeight: 40, fontSize: 14, fontWeight: 700, marginTop: 4 }}
              >
                Activar Pregunta Flash Hoy
              </button>
            </form>
          </section>

          {/* Formulario de Reto */}
          <section className="card">
            <h3 className="apple-headline" style={{ fontSize: 16, marginBottom: 10 }}>
              Publicar Reto de Clase
            </h3>
            <form onSubmit={handleCrearReto} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <input
                type="text"
                className="apple-input"
                placeholder="Título del reto (ej: Repasar tema 4 antes de las 20:00)"
                value={nuevoRetoTitulo}
                onChange={(e) => setNuevoRetoTitulo(e.target.value)}
                required
              />
              <textarea
                className="apple-input"
                placeholder="Instrucciones o descripción..."
                rows={2}
                value={nuevoRetoDesc}
                onChange={(e) => setNuevoRetoDesc(e.target.value)}
              />
              <select
                className="apple-input"
                value={nuevoRetoPuntos}
                onChange={(e) => setNuevoRetoPuntos(Number(e.target.value))}
              >
                <option value={10}>10 puntos (Reto rápido)</option>
                <option value={25}>25 puntos (Reto estándar)</option>
                <option value={50}>50 puntos (Reto avanzado)</option>
                <option value={100}>100 puntos (Gran desafío de clase)</option>
              </select>

              <button
                type="submit"
                className="btn-primary"
                disabled={guardandoReto || !nuevoRetoTitulo.trim()}
                style={{ minHeight: 40, fontSize: 14, fontWeight: 700 }}
              >
                {guardandoReto ? 'Publicando...' : 'Publicar Reto'}
              </button>
            </form>
          </section>
        </div>
      )}

      {/* PESTAÑA 5: SEGURIDAD Y AUDITORÍA */}
      {tab === 'seguridad' && (
        <section className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--color-separator)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <ShieldAlert size={18} color="var(--color-accent)" />
              <h3 className="apple-headline" style={{ fontSize: 16 }}>
                Registro de Seguridad y Auditoría
              </h3>
            </div>
            <p className="apple-caption" style={{ marginTop: 2 }}>
              Historial cronológico de acciones ejecutadas por moderadores
            </p>
          </div>

          {logsAuditoria.length === 0 ? (
            <div style={{ padding: 36, textAlign: 'center' }}>
              <p className="apple-subheadline" style={{ fontSize: 14 }}>
                No hay registros de auditoría aún.
              </p>
            </div>
          ) : (
            logsAuditoria.map((log, i) => (
              <div
                key={log.id || i}
                style={{
                  padding: '12px 16px',
                  borderBottom: i < logsAuditoria.length - 1 ? '0.5px solid var(--color-separator)' : 'none'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
                  <span style={{ fontWeight: 700, fontSize: 13, color: 'var(--color-ink)' }}>
                    {log.accion}
                  </span>
                  <span className="apple-caption" style={{ fontSize: 11, color: 'var(--color-tertiary-ink)' }}>
                    {log.hora} · {log.fecha}
                  </span>
                </div>
                <p style={{ fontSize: 12, color: 'var(--color-secondary-ink)' }}>
                  {log.detalle}
                </p>
                <span style={{ fontSize: 11, color: 'var(--color-tertiary-ink)' }}>
                  Autor: {log.autor}
                </span>
              </div>
            ))
          )}
        </section>
      )}

      {/* MODAL DE CONFIRMACIÓN PARA ACCIONES CRÍTICAS */}
      {modalConfirmacion && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.45)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          zIndex: 2000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 20
        }}>
          <div className="card" style={{ maxWidth: 400, width: '100%', padding: '24px 20px', textAlign: 'center' }}>
            <ShieldAlert size={36} color="var(--color-warning)" style={{ margin: '0 auto 12px' }} />
            <h3 className="apple-headline" style={{ fontSize: 18, marginBottom: 6 }}>
              {modalConfirmacion.titulo}
            </h3>
            <p className="apple-subheadline" style={{ fontSize: 14, marginBottom: 20 }}>
              {modalConfirmacion.mensaje}
            </p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                className="btn-primary"
                onClick={modalConfirmacion.accion}
                style={{ flex: 1, minHeight: 42, fontSize: 14 }}
              >
                Confirmar
              </button>
              <button
                className="btn-secondary"
                onClick={() => setModalConfirmacion(null)}
                style={{ minHeight: 42, fontSize: 14 }}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
