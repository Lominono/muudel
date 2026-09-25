import { useState, useEffect, useRef } from 'react'
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
  ChevronRight,
  MessageSquare,
  VolumeX,
  Volume2,
  Megaphone,
  Trash2,
  Sparkles,
  Download,
  RotateCcw,
  Hourglass
} from 'lucide-react'
import { transmitirEvento, suscribirEvento } from '../utils/realtimeHub'
import { formatearTiempoRestante } from '../components/TiendaRecompensas'

const PIN_ADMIN_CORRECTO = '2026'
const TIEMPO_BLOQUEO_SEGUNDOS = 60
const TIEMPO_INACTIVIDAD_MS = 10 * 60 * 1000 // 10 minutos de inactividad

export function PantallaAdmin() {
  const { perfil } = useAuth()
  const navigate = useNavigate()
  const [relojTick, setRelojTick] = useState(0)

  // 1. Estado de Seguridad por PIN de Moderador
  const [desbloqueado, setDesbloqueado] = useState(() => {
    return sessionStorage.getItem('muudel_admin_desbloqueado') === 'true'
  })
  const [pinInput, setPinInput] = useState('')
  const [pinError, setPinError] = useState('')
  const [intentosFallidos, setIntentosFallidos] = useState(0)
  const [segundosBloqueo, setSegundosBloqueo] = useState(0)

  // 2. Navegación entre pestañas del Panel
  const [tab, setTab] = useState('asistencia') // 'asistencia' | 'canjes' | 'chat' | 'alumnos' | 'retos' | 'seguridad'
  const [cargando, setCargando] = useState(true)

  // Datos de asistencia y solicitudes de las 15:30
  const [checkinsHoy, setCheckinsHoy] = useState([])
  const [solicitudesHoy, setSolicitudesHoy] = useState([])
  const [todosAlumnos, setTodosAlumnos] = useState([])

  // Canjes de puntos pedidos por alumnos
  const [canjesPedidos, setCanjesPedidos] = useState([])
  const [filtroCanjes, setFiltroCanjes] = useState('pendientes') // 'todos' | 'pendientes' | 'entregados' | 'rechazados'

  // Auditoría
  const [logsAuditoria, setLogsAuditoria] = useState([])

  // Moderación del Chat
  const [chatSilenciadoHasta, setChatSilenciadoHasta] = useState(() => {
    return localStorage.getItem('muudel_chat_silenciado_hasta') || null
  })
  const [efectosBloqueados, setEfectosBloqueados] = useState(() => {
    return localStorage.getItem('muudel_efectos_chat_desactivados') === 'true'
  })
  const [textoMegafonoAdmin, setTextoMegafonoAdmin] = useState('')
  const [canalParaLimpiar, setCanalParaLimpiar] = useState('general')

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
  const timerInactividadRef = useRef(null)

  // 1. Contador regresivo si hay bloqueo por intentos fallidos
  useEffect(() => {
    let interval = null
    if (segundosBloqueo > 0) {
      interval = setInterval(() => {
        setSegundosBloqueo((prev) => {
          if (prev <= 1) {
            clearInterval(interval)
            return 0
          }
          return prev - 1
        })
      }, 1000)
    }
    return () => {
      if (interval) clearInterval(interval)
    }
  }, [segundosBloqueo])

  // 2. Autobloqueo por inactividad de 10 minutos (Seguridad física en clase)
  useEffect(() => {
    if (!desbloqueado) return

    const resetInactividad = () => {
      if (timerInactividadRef.current) clearTimeout(timerInactividadRef.current)
      timerInactividadRef.current = setTimeout(() => {
        handleBloquear()
        avisar('Panel bloqueado automáticamente por inactividad.', 'error')
      }, TIEMPO_INACTIVIDAD_MS)
    }

    const eventos = ['mousedown', 'mousemove', 'keydown', 'touchstart', 'scroll']
    eventos.forEach((e) => window.addEventListener(e, resetInactividad))
    resetInactividad()

    return () => {
      eventos.forEach((e) => window.removeEventListener(e, resetInactividad))
      if (timerInactividadRef.current) clearTimeout(timerInactividadRef.current)
    }
  }, [desbloqueado])

  // Tick cada segundo para actualizar cuentas regresivas y bloqueos
  useEffect(() => {
    const timer = setInterval(() => {
      setRelojTick(prev => prev + 1)
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  // Suscripción a eventos en tiempo real (solicitudes 15:30, canjes de tienda, puntos)
  useEffect(() => {
    if (!desbloqueado) return

    // 1. Escuchar solicitudes de presencia de las 15:30 en tiempo real
    const desuscribirSol = suscribirEvento('solicitud_asistencia', (nuevaSol) => {
      if (!nuevaSol) return
      sound.playPop()
      setSolicitudesHoy((prev) => {
        const sinRepetir = prev.filter((s) => s.userId !== nuevaSol.userId)
        const actualizadas = [nuevaSol, ...sinRepetir]
        try {
          localStorage.setItem('muudel_solicitudes_' + fechaHoy, JSON.stringify(actualizadas))
        } catch (e) {}
        return actualizadas
      })
      avisar(`📢 ${nuevaSol.nombre} ha solicitado confirmar presencia (15:30)`)
    })

    // 2. Escuchar nuevos canjes de recompensas en tiempo real
    const desuscribirCanjes = suscribirEvento('nuevo_canje', (nuevoTicket) => {
      if (!nuevoTicket) return
      sound.playStamp()
      setCanjesPedidos((prev) => {
        const sinRepetir = prev.filter((c) => c.id !== nuevoTicket.id)
        const actualizados = [nuevoTicket, ...sinRepetir]
        try {
          localStorage.setItem('muudel_canjes_pedidos', JSON.stringify(actualizados))
        } catch (e) {}
        return actualizados
      })
      avisar(`🎟️ Nuevo canje de ${nuevoTicket.nombre}: "${nuevoTicket.titulo}"`)
    })

    // 3. Escuchar actualizaciones de puntos o checkins
    const desuscribirPuntos = suscribirEvento('puntos_actualizados', () => {
      cargarDatos()
    })

    return () => {
      desuscribirSol()
      desuscribirCanjes()
      desuscribirPuntos()
    }
  }, [desbloqueado, fechaHoy])

  useEffect(() => {
    if (desbloqueado) {
      cargarDatos()
    }
  }, [tab, desbloqueado])

  const avisar = (msg, tipo = 'exito') => {
    setNotificacion({ msg, tipo })
    setTimeout(() => setNotificacion(null), 3800)
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
      const actualizados = [nuevoLog, ...logs].slice(0, 100)
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

  // Desbloqueo seguro por PIN
  const handleDesbloquearPin = (e) => {
    e.preventDefault()
    setPinError('')

    if (segundosBloqueo > 0) {
      setPinError(`Acceso suspendido temporalmente. Espera ${segundosBloqueo}s.`)
      return
    }

    if (pinInput.trim() === PIN_ADMIN_CORRECTO) {
      sound.playPop()
      setDesbloqueado(true)
      sessionStorage.setItem('muudel_admin_desbloqueado', 'true')
      setPinInput('')
      setIntentosFallidos(0)
      registrarAuditoria('Acceso al Panel', 'Desbloqueo seguro verificado')
    } else {
      sound.playPop()
      const nuevosFallos = intentosFallidos + 1
      setIntentosFallidos(nuevosFallos)
      if (nuevosFallos >= 3) {
        setSegundosBloqueo(TIEMPO_BLOQUEO_SEGUNDOS)
        setPinError(`3 intentos fallidos. Bloqueado durante ${TIEMPO_BLOQUEO_SEGUNDOS} segundos.`)
      } else {
        setPinError(`PIN incorrecto. Te quedan ${3 - nuevosFallos} intentos antes del bloqueo.`)
      }
    }
  }

  const handleBloquear = () => {
    sessionStorage.removeItem('muudel_admin_desbloqueado')
    setDesbloqueado(false)
    sound.playPop()
  }

  // Aprobar solicitud individual de las 15:30
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

    // 2. Guardar en Supabase
    try {
      await supabase.from('checkins').upsert(nuevoRecord)
      const alumnoActual = todosAlumnos.find((a) => a.id === solicitud.userId)
      if (alumnoActual) {
        const nuevosPuntos = (alumnoActual.puntos_total || 0) + puntos
        await supabase.from('profiles').update({ puntos_total: nuevosPuntos }).eq('id', solicitud.userId)
      }
    } catch (e) {}

    // 3. Remover de pendientes
    const actualizadas = solicitudesHoy.filter((s) => s.userId !== solicitud.userId)
    setSolicitudesHoy(actualizadas)
    localStorage.setItem('muudel_solicitudes_' + fechaHoy, JSON.stringify(actualizadas))

    // 4. Actualizar estado
    setCheckinsHoy((prev) => [nuevoRecord, ...prev.filter((c) => c.user_id !== solicitud.userId)])
    sound.playStamp()
    avisar(`Asistencia de ${solicitud.nombre} aprobada (+${puntos} pts).`)
    registrarAuditoria('Pase de Lista', `Asistencia aprobada a ${solicitud.nombre} (+${puntos} pts)`)
    
    // Transmitir en tiempo real al alumno y a toda la clase
    transmitirEvento('asistencia_confirmada', {
      userId: solicitud.userId,
      fecha: fechaHoy,
      hora: horaActual,
      esTarde: solicitud.esTarde,
      puntos
    })
    
    setAccionEnCurso(null)
  }

  // Rechazar solicitud de asistencia
  const handleRechazarSolicitud = (solicitud) => {
    const actualizadas = solicitudesHoy.filter((s) => s.userId !== solicitud.userId)
    setSolicitudesHoy(actualizadas)
    localStorage.setItem('muudel_solicitudes_' + fechaHoy, JSON.stringify(actualizadas))
    sound.playPop()
    avisar(`Solicitud de ${solicitud.nombre} desestimada.`, 'error')
    registrarAuditoria('Rechazo Asistencia', `Solicitud de las 15:30 rechazada para ${solicitud.nombre}`)
  }

  // Aprobar todas las solicitudes en bloque
  const handleAprobarTodas = async () => {
    if (solicitudesHoy.length === 0) return
    setAccionEnCurso('todas')

    for (const sol of solicitudesHoy) {
      await handleAprobarSolicitud(sol)
    }

    transmitirEvento('asistencia_masiva', { fecha: fechaHoy })
    triggerConfetti()
    avisar('Todas las solicitudes de las 15:30 han sido aprobadas.')
    setAccionEnCurso(null)
  }

  // Marcar a todos los alumnos de la clase como presentes (+10 pts)
  const handleMarcarTodosPresentes = async () => {
    setModalConfirmacion({
      titulo: '¿Pase de lista general?',
      mensaje: `Se registrará asistencia puntual (+10 pts) para todos los ${todosAlumnos.length} alumnos registrados en la clase.`,
      accion: async () => {
        setModalConfirmacion(null)
        setAccionEnCurso('masivo')
        const horaActual = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

        for (const al of todosAlumnos) {
          const rec = {
            user_id: al.id,
            fecha: fechaHoy,
            hora: horaActual,
            es_tarde: false,
            puntos_ganados: 10
          }
          try {
            await supabase.from('checkins').upsert(rec)
            await supabase.from('profiles').update({ puntos_total: (al.puntos_total || 0) + 10 }).eq('id', al.id)
          } catch (e) {}
        }

        setSolicitudesHoy([])
        localStorage.setItem('muudel_solicitudes_' + fechaHoy, '[]')
        await cargarDatos()
        transmitirEvento('asistencia_masiva', { fecha: fechaHoy })
        triggerConfetti()
        sound.playStamp()
        avisar('Pase de lista general completado para toda la clase.')
        registrarAuditoria('Pase Masivo', 'Todos los alumnos marcados presentes (+10 pts)')
        setAccionEnCurso(null)
      }
    })
  }

  // Validar entrega de canje de puntos
  const handleCompletarCanje = (canjeId) => {
    const actualizados = canjesPedidos.map(c => c.id === canjeId ? { ...c, estado: 'entregado' } : c)
    setCanjesPedidos(actualizados)
    localStorage.setItem('muudel_canjes_pedidos', JSON.stringify(actualizados))
    transmitirEvento('estado_canje', { canjeId, estado: 'entregado' })
    sound.playPop()
    avisar('Recompensa marcada como entregada.')
    registrarAuditoria('Entrega de Recompensa', `Canje #${canjeId} validado y entregado`)
  }

  // Rechazar canje y reembolsar puntos automáticamente al alumno
  const handleRechazarCanje = async (canje) => {
    setModalConfirmacion({
      titulo: `¿Rechazar canje de ${canje.nombre}?`,
      mensaje: `Se le devolverán los ${canje.costo} puntos inmediatamente a su saldo.`,
      accion: async () => {
        setModalConfirmacion(null)
        // 1. Devolver puntos al alumno
        const alumno = todosAlumnos.find(a => a.id === canje.userId)
        if (alumno) {
          const nuevosPuntos = (alumno.puntos_total || 0) + canje.costo
          try {
            await supabase.from('profiles').update({ puntos_total: nuevosPuntos }).eq('id', canje.userId)
          } catch (e) {}
          setTodosAlumnos(prev => prev.map(a => a.id === canje.userId ? { ...a, puntos_total: nuevosPuntos } : a))
        }

        // 2. Actualizar estado del canje
        const actualizados = canjesPedidos.map(c => c.id === canje.id ? { ...c, estado: 'rechazado' } : c)
        setCanjesPedidos(actualizados)
        localStorage.setItem('muudel_canjes_pedidos', JSON.stringify(actualizados))

        transmitirEvento('estado_canje', { canjeId: canje.id, estado: 'rechazado', userId: canje.userId, costo: canje.costo })
        transmitirEvento('puntos_actualizados', { userId: canje.userId })

        sound.playPop()
        avisar(`Canje rechazado. ${canje.costo} pts devueltos a ${canje.nombre}.`)
        registrarAuditoria('Reembolso Canje', `Rechazado canje de ${canje.costo} pts a ${canje.nombre}`)
      }
    })
  }

  // MODERACIÓN DEL CHAT: Silenciar
  const handleSilenciarChat = (minutos) => {
    if (minutos === 0) {
      localStorage.removeItem('muudel_chat_silenciado_hasta')
      setChatSilenciadoHasta(null)
      transmitirEvento('silencio_chat', { silenciadoHasta: null })
      sound.playPop()
      avisar('Chat de clase restablecido. Todos pueden escribir.')
      registrarAuditoria('Moderación Chat', 'Silencio de chat levantado')
    } else {
      const hasta = Date.now() + minutos * 60 * 1000
      localStorage.setItem('muudel_chat_silenciado_hasta', String(hasta))
      setChatSilenciadoHasta(String(hasta))
      transmitirEvento('silencio_chat', { silenciadoHasta: String(hasta) })
      sound.playStamp()
      avisar(`Chat silenciado durante ${minutos} minutos.`)
      registrarAuditoria('Moderación Chat', `Chat silenciado durante ${minutos} min`)
    }
  }

  // MODERACIÓN DEL CHAT: Toggle de efectos de la tienda
  const handleToggleEfectos = () => {
    const nuevoEstado = !efectosBloqueados
    setEfectosBloqueados(nuevoEstado)
    localStorage.setItem('muudel_efectos_chat_desactivados', String(nuevoEstado))
    transmitirEvento('toggle_efectos', { efectosBloqueados: nuevoEstado })
    sound.playPop()
    if (nuevoEstado) {
      avisar('Efectos locos (terremoto, confeti) BLOQUEADOS temporalmente.', 'error')
      registrarAuditoria('Moderación Chat', 'Efectos virales bloqueados')
    } else {
      avisar('Efectos locos de la tienda PERMITIDOS nuevamente.')
      registrarAuditoria('Moderación Chat', 'Efectos virales reactivados')
    }
  }

  // MODERACIÓN DEL CHAT: Lanzar Megáfono de moderador
  const handleLanzarMegafonoAdmin = async (e) => {
    e.preventDefault()
    if (!textoMegafonoAdmin.trim()) return

    const textoAnuncio = textoMegafonoAdmin.trim()
    const mensajeTexto = `[EFECTO:megafono:lominoño] 📢 COMUNICADO DE MODERACIÓN: ${textoAnuncio}`
    const expiraEn = Date.now() + 60 * 60 * 1000 // 1 hora fijado

    const megaData = {
      id: 'mega-' + Date.now(),
      autor: 'lominoño (Moderador)',
      texto: textoAnuncio,
      expiraEn,
      hora: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }

    // 1. Guardar anuncio fijado
    localStorage.setItem('muudel_megafono_activo', JSON.stringify(megaData))
    transmitirEvento('megafono_activo', megaData)
    transmitirEvento('aviso_admin', { texto: textoAnuncio })

    // 2. Publicar en chat
    try {
      await supabase.from('messages').insert({
        user_id: perfil.id,
        canal: 'general',
        texto: mensajeTexto
      })
    } catch (err) {}

    // 3. Local
    try {
      const prev = JSON.parse(localStorage.getItem('racha_chat_general') || '[]')
      const nuevo = {
        id: 'msg-' + Date.now(),
        canal: 'general',
        user_id: perfil.id,
        texto: mensajeTexto,
        nombre: 'lominoño',
        rol: 'moderador',
        color_acento: '#0A84FF',
        created_at: new Date().toISOString()
      }
      localStorage.setItem('racha_chat_general', JSON.stringify([...prev, nuevo]))
      transmitirEvento('nuevo_mensaje_chat', nuevo)
    } catch (e) {}

    setTextoMegafonoAdmin('')
    triggerConfetti()
    sound.playStamp()
    avisar('Megáfono oficial fijado en el chat para toda la clase.')
    registrarAuditoria('Megáfono Moderador', `Publicado: "${textoAnuncio}"`)
  }

  // MODERACIÓN DEL CHAT: Limpiar canal
  const handleLimpiarChat = (canalNombre) => {
    setModalConfirmacion({
      titulo: `¿Vaciar mensajes de #${canalNombre}?`,
      mensaje: 'Esta acción limpiará el historial local del canal para despejar el aula.',
      accion: () => {
        setModalConfirmacion(null)
        localStorage.removeItem('racha_chat_' + canalNombre)
        transmitirEvento('limpieza_canal', { canal: canalNombre })
        sound.playPop()
        avisar(`Canal #${canalNombre} vaciado con éxito.`)
        registrarAuditoria('Limpieza Chat', `Vaciado canal #${canalNombre}`)
      }
    })
  }

  // Bonificar o penalizar puntos a un alumno
  const handleModificarPuntos = async (alumnoId, deltaPuntos, motivo) => {
    setAccionEnCurso(alumnoId)
    const alumno = todosAlumnos.find((a) => a.id === alumnoId)
    if (!alumno) return

    const nuevosPuntos = Math.max(0, (alumno.puntos_total || 0) + deltaPuntos)

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
        avisar(`${deltaPuntos > 0 ? '+' : ''}${deltaPuntos} pts aplicados a ${alumno.nombre}.`)
        setTodosAlumnos((prev) =>
          prev.map((a) => (a.id === alumnoId ? { ...a, puntos_total: nuevosPuntos } : a))
        )
        transmitirEvento('puntos_actualizados', { alumnoId, nuevosPuntos })
        registrarAuditoria('Ajuste de Puntos', `${deltaPuntos > 0 ? '+' : ''}${deltaPuntos} pts a ${alumno.nombre} (${motivo})`)
      }
    } catch (err) {
      avisar('Error al modificar puntos.', 'error')
    } finally {
      setAccionEnCurso(null)
    }
  }

  // Cambiar rol con confirmación de seguridad
  const solicitarCambioRol = (alumno, nuevoRol) => {
    setModalConfirmacion({
      titulo: `¿Cambiar rol a ${nuevoRol === 'moderador' ? 'Moderador' : 'Alumno'}?`,
      mensaje: `Estás modificando los permisos de ${alumno.nombre}. Esta acción otorga acceso administrativo.`,
      accion: async () => {
        setModalConfirmacion(null)
        setAccionEnCurso(alumno.id)
        try {
          await supabase.from('profiles').update({ rol: nuevoRol }).eq('id', alumno.id)
          avisar(`Rol de ${alumno.nombre} actualizado a ${nuevoRol}.`)
          setTodosAlumnos((prev) =>
            prev.map((a) => (a.id === alumno.id ? { ...a, rol: nuevoRol } : a))
          )
          registrarAuditoria('Cambio de Rol', `${alumno.nombre} pasó a ${nuevoRol}`)
        } catch (err) {
          avisar('Error al modificar rol.', 'error')
        } finally {
          setAccionEnCurso(null)
        }
      }
    })
  }

  // Exportar auditoría a archivo descargable
  const exportarAuditoria = () => {
    try {
      const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(logsAuditoria, null, 2))
      const downloadAnchor = document.createElement('a')
      downloadAnchor.setAttribute('href', dataStr)
      downloadAnchor.setAttribute('download', `muudel_auditoria_${fechaHoy}.json`)
      document.body.appendChild(downloadAnchor)
      downloadAnchor.click()
      downloadAnchor.remove()
      avisar('Registro de auditoría descargado.')
    } catch (e) {
      avisar('Error al exportar.', 'error')
    }
  }

  // Crear Reto
  const handleCrearReto = async (e) => {
    e.preventDefault()
    if (!nuevoRetoTitulo.trim()) return
    setGuardandoReto(true)
    try {
      const nuevo = {
        titulo: nuevoRetoTitulo.trim(),
        descripcion: nuevoRetoDesc.trim() || 'Reto de la sesión de hoy',
        puntos: nuevoRetoPuntos,
        activo: true,
        fecha_fin: new Date(Date.now() + 24 * 3600 * 1000).toISOString()
      }
      const { error } = await supabase.from('retos').insert(nuevo)
      if (!error) {
        sound.playStamp()
        triggerConfetti()
        avisar('¡Reto de clase publicado!')
        setNuevoRetoTitulo('')
        setNuevoRetoDesc('')
        registrarAuditoria('Reto Creado', `Reto: ${nuevo.titulo} (+${nuevo.puntos} pts)`)
        cargarDatos()
      }
    } catch (err) {
      avisar('Error al crear reto.', 'error')
    } finally {
      setGuardandoReto(false)
    }
  }

  // Pregunta Flash
  const handleGuardarPreguntaFlash = (e) => {
    e.preventDefault()
    if (!nuevaPreguntaTexto.trim()) return
    const opcionesValidas = opcionesFlash.filter((o) => o.trim().length > 0)
    const preguntaObj = {
      id: 'pf-' + fechaHoy,
      fecha: fechaHoy,
      pregunta: nuevaPreguntaTexto.trim(),
      opciones: opcionesValidas.length >= 2 ? opcionesValidas : ['Sí, todo claro', 'Tengo dudas', 'A medias'],
      puntos: 5,
      activa: true
    }
    localStorage.setItem('muudel_pregunta_flash_' + fechaHoy, JSON.stringify(preguntaObj))
    sound.playStamp()
    triggerConfetti()
    avisar('Pregunta flash de hoy activada para los alumnos.')
    registrarAuditoria('Pregunta Flash', `Activada: "${nuevaPreguntaTexto}"`)
    setNuevaPreguntaTexto('')
    setOpcionesFlash(['', '', ''])
  }

  // PANTALLA DE BLOQUEO POR PIN (ACCESO DE ALTA SEGURIDAD)
  if (!desbloqueado) {
    return (
      <main className="app-container" style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="card" style={{ maxWidth: 360, width: '100%', padding: '36px 24px', textAlign: 'center' }}>
          <div style={{
            width: 52,
            height: 52,
            borderRadius: 16,
            backgroundColor: segundosBloqueo > 0 ? 'rgba(255, 59, 48, 0.12)' : 'rgba(10, 132, 255, 0.12)',
            color: segundosBloqueo > 0 ? 'var(--color-negative)' : 'var(--color-accent)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px'
          }}>
            {segundosBloqueo > 0 ? <ShieldAlert size={28} /> : <Lock size={28} />}
          </div>

          <h2 className="apple-large-title" style={{ fontSize: 22, marginBottom: 4 }}>
            Panel de lominoño
          </h2>
          <p className="apple-subheadline" style={{ fontSize: 13, marginBottom: 20 }}>
            Introduce el PIN maestro de moderador para desbloquear las herramientas de clase:
          </p>

          <form onSubmit={handleDesbloquearPin} style={{ maxWidth: 280, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 12 }}>
            <input
              type="password"
              inputMode="numeric"
              maxLength={4}
              placeholder="••••"
              disabled={segundosBloqueo > 0}
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
                minHeight: 50,
                opacity: segundosBloqueo > 0 ? 0.5 : 1
              }}
              autoFocus
              required
            />

            {segundosBloqueo > 0 && (
              <div style={{ padding: '8px 12px', borderRadius: 10, backgroundColor: 'rgba(255, 59, 48, 0.12)', color: 'var(--color-negative)', fontSize: 13, fontWeight: 700 }}>
                Suspensión por seguridad: {segundosBloqueo}s restantes
              </div>
            )}

            {pinError && segundosBloqueo === 0 && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, color: 'var(--color-negative)', fontSize: 13, fontWeight: 600 }}>
                <AlertCircle size={15} />
                <span>{pinError}</span>
              </div>
            )}

            <button
              type="submit"
              className="btn-primary"
              disabled={pinInput.length < 4 || segundosBloqueo > 0}
              style={{ width: '100%', minHeight: 44, fontSize: 15, fontWeight: 700, marginTop: 4 }}
            >
              Desbloquear Panel
            </button>

            <span className="apple-caption" style={{ color: 'var(--color-tertiary-ink)', marginTop: 4 }}>
              Código por defecto: <strong>2026</strong>
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

  const canjesFiltrados = canjesPedidos.filter(c => {
    if (filtroCanjes === 'todos') return true
    if (filtroCanjes === 'pendientes') return c.estado === 'pendiente'
    if (filtroCanjes === 'entregados') return c.estado === 'entregado'
    if (filtroCanjes === 'rechazados') return c.estado === 'rechazado'
    return true
  })

  return (
    <main className="app-container" style={{ maxWidth: 880 }}>
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
            type="button"
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

        <p className="apple-subheadline" style={{ fontSize: 13 }}>
          Gestión de asistencia 15:30, moderación de chat, canjes de puntos y auditoría.
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
            { id: 'chat', label: 'Control del Chat', icon: MessageSquare },
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
                type="button"
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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Clock size={18} color="var(--color-accent)" />
                <h3 className="apple-headline" style={{ fontSize: 16 }}>
                  Solicitudes de las 15:30 ({solicitudesHoy.length})
                </h3>
              </div>

              <div style={{ display: 'flex', gap: 8 }}>
                {solicitudesHoy.length > 0 && (
                  <button
                    type="button"
                    className="btn-primary"
                    onClick={handleAprobarTodas}
                    disabled={accionEnCurso === 'todas'}
                    style={{ minHeight: 32, padding: '4px 12px', fontSize: 12, fontWeight: 700 }}
                  >
                    <CheckCheck size={14} />
                    <span>Aprobar Todas</span>
                  </button>
                )}

                <button
                  type="button"
                  className="btn-secondary"
                  onClick={handleMarcarTodosPresentes}
                  disabled={accionEnCurso === 'masivo'}
                  style={{ minHeight: 32, padding: '4px 12px', fontSize: 12, fontWeight: 600 }}
                >
                  <Users size={14} />
                  <span>Pase General a Toda la Clase</span>
                </button>
              </div>
            </div>

            {solicitudesHoy.length === 0 ? (
              <p className="apple-subheadline" style={{ fontSize: 13, color: 'var(--color-secondary-ink)' }}>
                No hay solicitudes pendientes en este momento. Conforme los alumnos pulsen el botón a las 15:30, aparecerán aquí para tu visto bueno.
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
                      alignItems: 'center',
                      flexWrap: 'wrap',
                      gap: 8
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

                    <div style={{ display: 'flex', gap: 6 }}>
                      <button
                        type="button"
                        className="btn-primary"
                        disabled={accionEnCurso === sol.userId}
                        onClick={() => handleAprobarSolicitud(sol)}
                        style={{ minHeight: 32, padding: '4px 12px', fontSize: 12, fontWeight: 600 }}
                      >
                        Aprobar
                      </button>
                      <button
                        type="button"
                        className="btn-secondary"
                        onClick={() => handleRechazarSolicitud(sol)}
                        style={{ minHeight: 32, padding: '4px 10px', fontSize: 12, color: 'var(--color-negative)' }}
                      >
                        Descartar
                      </button>
                    </div>
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

      {/* PESTAÑA 2: CONTROL Y MODERACIÓN DEL CHAT */}
      {tab === 'chat' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* 1. Silencio y Emergencia */}
          <section className="card">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <VolumeX size={18} color="var(--color-negative)" />
              <h3 className="apple-headline" style={{ fontSize: 16 }}>
                Silenciar el Chat de Clase
              </h3>
            </div>
            <p className="apple-caption" style={{ marginBottom: 14 }}>
              Evita distracciones durante las explicaciones del profesor o en exámenes.
            </p>

            <div style={{
              padding: '12px 14px',
              borderRadius: 12,
              backgroundColor: chatSilenciadoHasta ? 'rgba(255, 59, 48, 0.1)' : 'rgba(52, 199, 89, 0.1)',
              border: `1px solid ${chatSilenciadoHasta ? 'rgba(255, 59, 48, 0.3)' : 'rgba(52, 199, 89, 0.3)'}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 14
            }}>
              <div>
                <span style={{ fontSize: 13, fontWeight: 700, color: chatSilenciadoHasta ? 'var(--color-negative)' : 'var(--color-positive)' }}>
                  {chatSilenciadoHasta ? '🔒 Chat Silenciado Actualmente' : '🟢 Chat Libre y Abierto'}
                </span>
                {chatSilenciadoHasta && (
                  <div style={{ fontSize: 11, color: 'var(--color-secondary-ink)', marginTop: 2 }}>
                    Hasta: {new Date(Number(chatSilenciadoHasta)).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                )}
              </div>

              {chatSilenciadoHasta ? (
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => handleSilenciarChat(0)}
                  style={{ minHeight: 32, fontSize: 12, fontWeight: 700 }}
                >
                  <Unlock size={14} />
                  <span>Levantar Silencio</span>
                </button>
              ) : null}
            </div>

            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => handleSilenciarChat(15)}
                style={{ flex: 1, minHeight: 36, fontSize: 13 }}
              >
                Silenciar 15 min
              </button>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => handleSilenciarChat(30)}
                style={{ flex: 1, minHeight: 36, fontSize: 13 }}
              >
                Silenciar 30 min
              </button>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => handleSilenciarChat(60)}
                style={{ flex: 1, minHeight: 36, fontSize: 13 }}
              >
                Silenciar 1 hora
              </button>
            </div>
          </section>

          {/* 2. Control de Efectos Virales de la Tienda */}
          <section className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Sparkles size={18} color="var(--color-warning)" />
                  <h3 className="apple-headline" style={{ fontSize: 16 }}>
                    Efectos Virales de la Tienda
                  </h3>
                </div>
                <p className="apple-caption" style={{ marginTop: 2 }}>
                  Permite o bloquea terremotos, confeti y fiesta durante las clases.
                </p>
              </div>

              <button
                type="button"
                onClick={handleToggleEfectos}
                className={efectosBloqueados ? 'btn-secondary' : 'btn-primary'}
                style={{
                  minHeight: 34,
                  fontSize: 12,
                  fontWeight: 700,
                  backgroundColor: efectosBloqueados ? 'rgba(255, 59, 48, 0.12)' : 'var(--color-positive)',
                  color: efectosBloqueados ? 'var(--color-negative)' : '#FFFFFF'
                }}
              >
                {efectosBloqueados ? 'Bloqueados (Activar)' : 'Permitidos (Bloquear)'}
              </button>
            </div>
          </section>

          {/* 3. Megáfono Oficial de Lominoño */}
          <section className="card">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <Megaphone size={18} color="#D4AF37" />
              <h3 className="apple-headline" style={{ fontSize: 16 }}>
                Lanzar Megáfono Oficial (Fijado para toda la clase)
              </h3>
            </div>
            <p className="apple-caption" style={{ marginBottom: 12 }}>
              Fija un comunicado oficial con prioridad de moderador en la cabecera del chat sin coste de puntos.
            </p>

            <form onSubmit={handleLanzarMegafonoAdmin} style={{ display: 'flex', gap: 8 }}>
              <input
                type="text"
                className="apple-input"
                value={textoMegafonoAdmin}
                onChange={(e) => setTextoMegafonoAdmin(e.target.value)}
                placeholder="Ej: Bajad todos a la sala de ordenadores 2 / Práctica abierta en Moodle"
                style={{ flex: 1 }}
              />
              <button
                type="submit"
                disabled={!textoMegafonoAdmin.trim()}
                className="btn-primary"
                style={{ minHeight: 40, fontSize: 13, fontWeight: 700, backgroundColor: '#D4AF37' }}
              >
                Fijar Comunicado
              </button>
            </form>
          </section>

          {/* 4. Limpieza de Spam o Canales */}
          <section className="card">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <Trash2 size={18} color="var(--color-negative)" />
              <h3 className="apple-headline" style={{ fontSize: 16 }}>
                Limpieza de Spam en el Chat
              </h3>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <select
                className="apple-input"
                value={canalParaLimpiar}
                onChange={(e) => setCanalParaLimpiar(e.target.value)}
                style={{ width: 140 }}
              >
                <option value="general">#general</option>
                <option value="dudas">#dudas</option>
                <option value="apuntes">#apuntes</option>
                <option value="avisos">#avisos</option>
              </select>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => handleLimpiarChat(canalParaLimpiar)}
                style={{ minHeight: 40, fontSize: 13, color: 'var(--color-negative)', fontWeight: 600 }}
              >
                Vaciar Mensajes Locales
              </button>
            </div>
          </section>
        </div>
      )}

      {/* PESTAÑA 3: CANJES DE PUNTOS Y RECOMPENSAS */}
      {tab === 'canjes' && (
        <section className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--color-separator)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
            <div>
              <h3 className="apple-headline" style={{ fontSize: 16 }}>
                Peticiones de Recompensas ({canjesFiltrados.length})
              </h3>
              <p className="apple-caption" style={{ marginTop: 2 }}>
                Valida las ventajas o reembolsa los puntos si no es viable
              </p>
            </div>

            {/* Filtros de canjes */}
            <div style={{ display: 'flex', gap: 4 }}>
              {['pendientes', 'entregados', 'rechazados', 'todos'].map(f => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setFiltroCanjes(f)}
                  style={{
                    padding: '4px 10px',
                    borderRadius: 8,
                    border: 'none',
                    fontSize: 12,
                    fontWeight: 600,
                    textTransform: 'capitalize',
                    backgroundColor: filtroCanjes === f ? 'var(--color-accent)' : 'var(--color-fill-secondary)',
                    color: filtroCanjes === f ? '#FFFFFF' : 'var(--color-secondary-ink)',
                    cursor: 'pointer'
                  }}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          {canjesFiltrados.length === 0 ? (
            <div style={{ padding: 36, textAlign: 'center' }}>
              <p className="apple-subheadline" style={{ fontSize: 14 }}>
                No hay canjes en este filtro.
              </p>
            </div>
          ) : (
            canjesFiltrados.map((canje, i) => (
              <div
                key={canje.id || i}
                style={{
                  padding: '14px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  borderBottom: i < canjesFiltrados.length - 1 ? '0.5px solid var(--color-separator)' : 'none',
                  flexWrap: 'wrap',
                  gap: 8
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                    <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--color-ink)' }}>
                      {canje.nombre}
                    </span>
                    <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--color-accent)' }}>
                      {canje.codigo || '#SMR2-TICKET'}
                    </span>
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--color-accent)', fontWeight: 600, marginTop: 2 }}>
                    {canje.titulo} · <span style={{ color: 'var(--color-secondary-ink)', fontWeight: 400 }}>{canje.costo} pts</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 11, color: 'var(--color-tertiary-ink)' }}>
                      Solicitado: {canje.fecha} {canje.hora || ''}
                    </span>
                    {canje.expiraEn && (
                      <span style={{
                        fontSize: 10,
                        fontWeight: 700,
                        padding: '1px 6px',
                        borderRadius: 4,
                        backgroundColor: (canje.expiraEn <= Date.now()) ? 'rgba(255, 59, 48, 0.12)' : 'rgba(255, 149, 0, 0.12)',
                        color: (canje.expiraEn <= Date.now()) ? 'var(--color-negative)' : 'var(--color-warning)'
                      }}>
                        ⏳ {formatearTiempoRestante(canje.expiraEn)}
                      </span>
                    )}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  {canje.estado === 'pendiente' ? (
                    <>
                      <button
                        type="button"
                        className="btn-primary"
                        onClick={() => handleCompletarCanje(canje.id)}
                        style={{ minHeight: 32, padding: '4px 12px', fontSize: 12, fontWeight: 600 }}
                      >
                        Aprobar y Entregar
                      </button>
                      <button
                        type="button"
                        className="btn-secondary"
                        onClick={() => handleRechazarCanje(canje)}
                        style={{ minHeight: 32, padding: '4px 10px', fontSize: 12, color: 'var(--color-negative)' }}
                      >
                        Rechazar y Devolver Pts
                      </button>
                    </>
                  ) : (
                    <span className={`apple-badge ${canje.estado === 'entregado' ? 'apple-badge-positive' : 'apple-badge-neutral'}`} style={{ fontSize: 12 }}>
                      {canje.estado === 'entregado' ? 'Entregado' : 'Rechazado (Reembolsado)'}
                    </span>
                  )}
                </div>
              </div>
            ))
          )}
        </section>
      )}

      {/* PESTAÑA 4: ALUMNOS Y COMUNIDAD */}
      {tab === 'alumnos' && (
        <div>
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
                Estudiantes ({alumnosFiltrados.length})
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
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
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
                        {alumno.email ? `${alumno.email} · ` : ''}<strong>{alumno.puntos_total || 0} pts</strong> · {alumno.racha_actual || 0} días racha
                      </div>
                    </div>
                  </div>

                  <span className={`apple-badge ${alumno.rol === 'moderador' ? 'apple-badge-accent' : 'apple-badge-neutral'}`} style={{ fontSize: 11 }}>
                    {alumno.rol === 'moderador' ? 'Moderador' : 'Alumno'}
                  </span>
                </div>

                {/* Acciones directas de moderador */}
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 10 }}>
                  <button
                    type="button"
                    className="btn-secondary"
                    disabled={accionEnCurso === alumno.id}
                    onClick={() => handleModificarPuntos(alumno.id, 5, 'Participación')}
                    style={{ minHeight: 30, padding: '3px 10px', fontSize: 12 }}
                  >
                    +5 pts (Participar)
                  </button>
                  <button
                    type="button"
                    className="btn-secondary"
                    disabled={accionEnCurso === alumno.id}
                    onClick={() => handleModificarPuntos(alumno.id, 10, 'Aporte destacado')}
                    style={{ minHeight: 30, padding: '3px 10px', fontSize: 12 }}
                  >
                    +10 pts (Aporte)
                  </button>
                  <button
                    type="button"
                    className="btn-secondary"
                    disabled={accionEnCurso === alumno.id}
                    onClick={() => handleModificarPuntos(alumno.id, -10, 'Penalización')}
                    style={{ minHeight: 30, padding: '3px 10px', fontSize: 12, color: 'var(--color-negative)' }}
                  >
                    -10 pts (Sanción)
                  </button>
                  <button
                    type="button"
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

      {/* PESTAÑA 5: RETOS Y PREGUNTA FLASH */}
      {tab === 'retos' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Pregunta Flash */}
          <section className="card">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <MessageCircleQuestion size={18} color="var(--color-warning)" />
              <h3 className="apple-headline" style={{ fontSize: 16 }}>
                Lanzar Pregunta Flash para Hoy
              </h3>
            </div>
            <p className="apple-caption" style={{ marginBottom: 14 }}>
              Caduca a medianoche. Los alumnos reciben +5 pts al responder y ven estadísticas colectivas.
            </p>

            <form onSubmit={handleGuardarPreguntaFlash} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <input
                type="text"
                className="apple-input"
                placeholder="Pregunta para la clase (ej: ¿Qué ejercicio os cuesta más de redes?)"
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
                placeholder="Título del reto (ej: Configurar VLAN 10 y 20 en Packet Tracer)"
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

      {/* PESTAÑA 6: SEGURIDAD Y AUDITORÍA */}
      {tab === 'seguridad' && (
        <section className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--color-separator)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <ShieldAlert size={18} color="var(--color-accent)" />
                <h3 className="apple-headline" style={{ fontSize: 16 }}>
                  Registro de Seguridad y Auditoría
                </h3>
              </div>
              <p className="apple-caption" style={{ marginTop: 2 }}>
                Historial cronológico inmutable de acciones de moderación
              </p>
            </div>

            <button
              type="button"
              className="btn-secondary"
              onClick={exportarAuditoria}
              style={{ minHeight: 32, fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}
            >
              <Download size={14} />
              <span>Exportar JSON</span>
            </button>
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
                <p style={{ fontSize: 12, color: 'var(--color-secondary-ink)', margin: '2px 0' }}>
                  {log.detalle}
                </p>
                <span style={{ fontSize: 11, color: 'var(--color-tertiary-ink)' }}>
                  Moderador: {log.autor}
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
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          zIndex: 3000,
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
                type="button"
                className="btn-primary"
                onClick={modalConfirmacion.accion}
                style={{ flex: 1, minHeight: 42, fontSize: 14 }}
              >
                Confirmar
              </button>
              <button
                type="button"
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
