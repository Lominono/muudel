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
  Hourglass,
  UserX,
  UserCheck,
  Key,
  Ban,
  Bell,
  Send,
  AlertTriangle,
  Upload,
  Folder,
  Eye,
  Edit3,
  ExternalLink,
  HardDrive,
  Pin,
  FileCode,
  Copy,
  Paperclip,
  Coins,
  TrendingUp,
  Sliders,
  DollarSign,
  Zap
} from 'lucide-react'
import { transmitirEvento, suscribirEvento } from '../utils/realtimeHub'
import { conOneSignal } from '../utils/oneSignal'
import { formatearTiempoRestante } from '../components/TiendaRecompensas'
import {
  obtenerConfigRecompensas,
  guardarConfigRecompensas,
  cargarConfigRecompensasDesdeServidor
} from '../utils/recompensasConfig'

export const obtenerPinAdmin = () => {
  return localStorage.getItem('muudel_admin_pin_custom') || '2026'
}

export const formatearTamano = (bytes) => {
  if (!bytes || isNaN(bytes)) return '—'
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}

export const detectarTipoArchivo = (nombre = '', mime = '') => {
  const ext = (nombre.split('.').pop() || '').toLowerCase()
  if (ext === 'pdf' || (mime && mime.includes('pdf'))) return { tipo: 'pdf', label: 'PDF', color: '#FF3B30' }
  if (['sh', 'bash', 'ps1', 'py', 'js', 'sql', 'json', 'html', 'css'].includes(ext)) {
    return { tipo: 'codigo', label: ext.toUpperCase(), color: '#0A84FF' }
  }
  if (['doc', 'docx', 'odt', 'rtf', 'txt', 'md'].includes(ext)) {
    return { tipo: 'documento', label: ext.toUpperCase(), color: '#34C759' }
  }
  if (['zip', 'rar', 'tar', 'gz', '7z'].includes(ext)) {
    return { tipo: 'archivo', label: 'ZIP', color: '#FF9500' }
  }
  if (['png', 'jpg', 'jpeg', 'svg', 'webp'].includes(ext) || (mime && mime.includes('image'))) {
    return { tipo: 'imagen', label: 'IMG', color: '#AF52DE' }
  }
  return { tipo: 'otro', label: ext ? ext.toUpperCase() : 'ARCHIVO', color: '#8E8E93' }
}

export const MATERIAS_SMR2 = [
  'Sistemas Operativos (SOM)',
  'Redes Locales (RL)',
  'Seguridad Informática (SI)',
  'Montaje y Mantenimiento (MME)',
  'Aplicaciones Web (AW)',
  'General / Miscelánea'
]

const RECURSOS_OFICIALES_INICIALES = [
  {
    id: 'apunte-som-01',
    titulo: 'Comandos de Administración Bash y Permisos Chmod (Linux)',
    materia: 'Sistemas Operativos (SOM)',
    texto: `# Guía de Permisos Linux y Administración
chmod 755 script.sh # rwxr-xr-x (dueño r/w/x, grupo r/x, otros r/x)
chmod 644 config.conf # rw-r--r-- (dueño r/w, resto solo lectura)
chmod 600 id_rsa # rw------- (privacidad total, solo dueño)
chown usuario:grupo archivo # Cambiar propietario y grupo
sudo usermod -aG sudo usuario # Añadir usuario a sudoers

# Diagnóstico de almacenamiento y memoria
df -h          # Espacio en particiones montadas
free -h        # Memoria RAM y Swap disponible
top / htop     # Monitor de procesos en tiempo real
journalctl -xe # Inspección de logs del kernel y servicios`,
    file_name: 'guia_bash_permisos_smr2.sh',
    file_size: 18420,
    file_type: 'application/x-sh',
    file_url: null,
    oficial: true,
    autor_nombre: 'lominoño',
    autor_color: '#0A84FF',
    created_at: new Date(Date.now() - 3600 * 1000 * 24 * 2).toISOString()
  },
  {
    id: 'apunte-rl-02',
    titulo: 'Chuleta de Subnetting, VLSM y Rangos CIDR',
    materia: 'Redes Locales (RL)',
    texto: `=== SUBREDES Y CÁLCULO VLSM PARA SMR2 ===
/24 -> 255.255.255.0   -> 256 IPs (254 útiles)
/25 -> 255.255.255.128 -> 128 IPs (126 útiles)
/26 -> 255.255.255.192 -> 64 IPs  (62 útiles)
/27 -> 255.255.255.224 -> 32 IPs  (30 útiles)
/28 -> 255.255.255.240 -> 16 IPs  (14 útiles)
/29 -> 255.255.255.248 -> 8 IPs   (6 útiles)
/30 -> 255.255.255.252 -> 4 IPs   (2 útiles para enlaces WAN punto a punto)

Fórmula número de subredes: 2^n (donde n = bits robados a host)
Fórmula hosts útiles: (2^h) - 2 (primer IP = Red, última IP = Broadcast)`,
    file_name: 'chuleta_subnetting_vlsm.txt',
    file_size: 12300,
    file_type: 'text/plain',
    file_url: null,
    oficial: true,
    autor_nombre: 'lominoño',
    autor_color: '#0A84FF',
    created_at: new Date(Date.now() - 3600 * 1000 * 24 * 1).toISOString()
  },
  {
    id: 'apunte-som-03',
    titulo: 'Configuración de Ámbito DHCP en Windows Server',
    materia: 'Sistemas Operativos (SOM)',
    texto: `# PowerShell: Despliegue de Rol y Ámbito DHCP
Install-WindowsFeature DHCP -IncludeManagementTools
Add-DhcpServerv4Scope -Name "Aula-SMR2" -StartRange 192.168.10.50 -EndRange 192.168.10.200 -SubnetMask 255.255.255.0 -State Active
Set-DhcpServerv4OptionValue -ScopeId 192.168.10.0 -Router 192.168.10.1 -DnsServer 1.1.1.1, 8.8.8.8
Restart-Service dhcpserver
Get-DhcpServerv4Lease -ScopeId 192.168.10.0 # Ver concesiones activas`,
    file_name: 'dhcp_windows_server_config.ps1',
    file_size: 15600,
    file_type: 'application/x-powershell',
    file_url: null,
    oficial: true,
    autor_nombre: 'lominoño',
    autor_color: '#0A84FF',
    created_at: new Date().toISOString()
  },
  {
    id: 'apunte-si-04',
    titulo: 'Checklist de Hardening y Auditoría de Seguridad de Puesto',
    materia: 'Seguridad Informática (SI)',
    texto: `# Protocolo de Seguridad en el Puesto de Trabajo
1. Deshabilitar protocolos obsoletos: SMBv1, SSLv3, Telnet sin cifrar.
2. Contraseñas robustas: mínimo 14 caracteres, rotación de 90 días, MFA obligatorio.
3. Principio de Menor Privilegio (PoLP): cuenta estándar para trabajo diario, UAC en nivel superior.
4. Políticas de Grupo (GPO): bloqueo de ejecución de scripts desde carpetas temporales (%AppData%, %Temp%).
5. Copia de Seguridad 3-2-1: 3 copias, 2 soportes distintos, 1 copia externa/en la nube cifrada.`,
    file_name: 'hardening_seguridad_puesto.md',
    file_size: 19800,
    file_type: 'text/markdown',
    file_url: null,
    oficial: true,
    autor_nombre: 'lominoño',
    autor_color: '#0A84FF',
    created_at: new Date().toISOString()
  }
]

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

  // Modal para cambiar PIN maestro
  const [mostrarModalPin, setMostrarModalPin] = useState(false)
  const [pinActualInput, setPinActualInput] = useState('')
  const [pinNuevoInput, setPinNuevoInput] = useState('')
  const [pinConfirmarInput, setPinConfirmarInput] = useState('')
  const [errorCambioPin, setErrorCambioPin] = useState('')

  // 2. Navegación entre pestañas del Panel
  const [tab, setTab] = useState('asistencia') // 'asistencia' | 'archivos' | 'chat' | 'canjes' | 'alumnos' | 'retos' | 'seguridad'
  const [cargando, setCargando] = useState(true)

  // 3. Gestión y Administración de Archivos y Materiales del Aula
  const [archivosClase, setArchivosClase] = useState([])
  const [filtroMateria, setFiltroMateria] = useState('todas')
  const [filtroTipoArchivo, setFiltroTipoArchivo] = useState('todos')
  const [busquedaArchivo, setBusquedaArchivo] = useState('')
  const [modalSubirArchivo, setMostrarModalSubirArchivo] = useState(false)
  const [modalPreviewArchivo, setModalPreviewArchivo] = useState(null)
  const [modalEditarArchivo, setModalEditarArchivo] = useState(null)
  const [copiadoFeedback, setCopiadoFeedback] = useState(false)

  // Formulario nuevo archivo
  const [nuevoArchivoTitulo, setNuevoArchivoTitulo] = useState('')
  const [nuevoArchivoMateria, setNuevoArchivoMateria] = useState('Sistemas Operativos (SOM)')
  const [nuevoArchivoTexto, setNuevoArchivoTexto] = useState('')
  const [nuevoArchivoEsOficial, setNuevoArchivoEsOficial] = useState(true)
  const [archivoSeleccionado, setArchivoSeleccionado] = useState(null)
  const [subiendoArchivo, setSubiendoArchivo] = useState(false)

  // Datos de asistencia y solicitudes de las 15:30
  const [checkinsHoy, setCheckinsHoy] = useState([])
  const [solicitudesHoy, setSolicitudesHoy] = useState([])
  const [todosAlumnos, setTodosAlumnos] = useState([])
  const [filtroAlumnos, setFiltroAlumnos] = useState('todos') // 'todos' | 'activos' | 'baneados' | 'moderadores'

  // Modal para banear alumno con motivo
  const [modalBaneo, setModalBaneo] = useState(null) // { alumno, motivo: '', preset: '' }

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

  // Sistema de Notificaciones Push & Alertas Globales de Clase
  const [tituloAlertaClase, setTituloAlertaClase] = useState('')
  const [mensajeAlertaClase, setMensajeAlertaClase] = useState('')
  const [nivelAlertaClase, setNivelAlertaClase] = useState('general') // 'general' | 'urgente'

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

  // Gestión de Avisos y Comunicados Activos
  const [avisoDiarioActual, setAvisoDiarioActual] = useState(() => localStorage.getItem('racha_aviso_hoy') || '')
  const [megafonoActual, setMegafonoActual] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('muudel_megafono_activo') || 'null')
    } catch (e) {
      return null
    }
  })

  // Modal para modificar puntaje exacto y racha
  const [modalPuntaje, setModalPuntaje] = useState(null) // { alumno, modo: 'exacto' | 'delta', puntosExactos, deltaPuntos, rachaExacta, modificarRacha, motivo }

  // Entregas de Retos para Comprobación
  const [entregasRetos, setEntregasRetos] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('muudel_entregas_retos') || '[]')
    } catch (e) {
      return []
    }
  })
  const [filtroEntregasRetos, setFiltroEntregasRetos] = useState('pendientes') // 'pendientes' | 'aprobados' | 'rechazados' | 'todos'
  const [modalRechazoReto, setModalRechazoReto] = useState(null) // { entrega, feedback: '' }

  // Configuración de Economía y Ganancias de la Clase
  const [configRecompensas, setConfigRecompensas] = useState(() => obtenerConfigRecompensas())
  const [guardandoRecompensas, setGuardandoRecompensas] = useState(false)
  const [ajusteMasivoCantidad, setAjusteMasivoCantidad] = useState(25)
  const [ajusteMasivoMotivo, setAjusteMasivoMotivo] = useState('Recompensa de clase')
  const [enviandoAjusteMasivo, setEnviandoAjusteMasivo] = useState(false)
  const [busquedaEconomia, setBusquedaEconomia] = useState('')
  const [saldoCustomInputs, setSaldoCustomInputs] = useState({})

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

    // 4. Escuchar nuevas entregas de retos para comprobación
    const desuscribirEntregas = suscribirEvento('nueva_entrega_reto', (entrega) => {
      if (!entrega) return
      sound.playStamp()
      setEntregasRetos((prev) => {
        const sinRepetir = prev.filter(e => !(e.userId === entrega.userId && e.retoId === entrega.retoId))
        const actualizadas = [entrega, ...sinRepetir]
        try {
          localStorage.setItem('muudel_entregas_retos', JSON.stringify(actualizadas))
        } catch (e) {}
        return actualizadas
      })
      avisar(`📝 ${entrega.nombre} ha entregado el reto: "${entrega.retoTitulo}"`)
    })

    // 5. Escuchar cambios de avisos
    const desuscribirAvisos = suscribirEvento('aviso_admin', ({ texto }) => {
      setAvisoDiarioActual(texto || '')
    })

    const desuscribirMega = suscribirEvento('megafono_activo', (data) => {
      setMegafonoActual(data || null)
    })

    // 6. Escuchar nuevos apuntes / archivos subidos
    const desuscribirApuntes = suscribirEvento('nuevo_apunte', (nuevoApunte) => {
      if (!nuevoApunte) return
      sound.playStamp()
      setArchivosClase((prev) => {
        const sinRepetir = prev.filter(a => a.id !== nuevoApunte.id)
        return [nuevoApunte, ...sinRepetir]
      })
      avisar(`📂 Nuevo material publicado: "${nuevoApunte.titulo}"`)
    })

    const desuscribirArchivoBorrado = suscribirEvento('archivo_eliminado', ({ id }) => {
      if (!id) return
      setArchivosClase((prev) => prev.filter(a => a.id !== id))
    })

    return () => {
      desuscribirSol()
      desuscribirCanjes()
      desuscribirPuntos()
      desuscribirEntregas()
      desuscribirAvisos()
      desuscribirMega()
      desuscribirApuntes()
      desuscribirArchivoBorrado()
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
      const baneadosMap = JSON.parse(localStorage.getItem('muudel_usuarios_baneados') || '{}')
      listaAlumnos = listaAlumnos.map(a => {
        let meta = {}
        try {
          const raw = localStorage.getItem('muudel_user_meta_' + a.id)
          if (raw) meta = JSON.parse(raw)
        } catch (e) {}
        const banInfo = baneadosMap[a.id]
        return {
          ...a,
          ...meta,
          baneado: a.baneado || Boolean(banInfo),
          motivo_ban: a.motivo_ban || (banInfo?.motivo || null)
        }
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

      // 6. Cargar avisos actuales
      const avisoHoyLocal = localStorage.getItem('racha_aviso_hoy') || ''
      setAvisoDiarioActual(avisoHoyLocal)
      try {
        const megaLocal = JSON.parse(localStorage.getItem('muudel_megafono_activo') || 'null')
        setMegafonoActual(megaLocal)
      } catch (e) {
        setMegafonoActual(null)
      }

      // 7. Cargar entregas de retos para comprobación
      let listaEntregas = []
      try {
        const rawEnt = localStorage.getItem('muudel_entregas_retos')
        if (rawEnt) listaEntregas = JSON.parse(rawEnt)
      } catch (e) {}

      // Intentar sincronizar también desde Supabase reto_completado si hay
      try {
        const { data: remotos } = await supabase
          .from('reto_completado')
          .select('*, profiles(nombre, color_acento, digito_id, username), retos(titulo, puntos)')
          .order('fecha', { ascending: false })
          .limit(30)

        if (remotos && remotos.length > 0) {
          remotos.forEach(rc => {
            const existe = listaEntregas.find(e => e.userId === rc.user_id && e.retoId === rc.reto_id)
            if (!existe) {
              listaEntregas.push({
                id: `rc-${rc.reto_id}-${rc.user_id}`,
                retoId: rc.reto_id,
                retoTitulo: rc.retos?.titulo || 'Reto de clase',
                puntos: rc.retos?.puntos || 25,
                userId: rc.user_id,
                nombre: rc.profiles?.nombre || 'Alumno',
                username: rc.profiles?.username || '',
                color: rc.profiles?.color_acento || '#0A84FF',
                evidencia: rc.evidencia || 'Sin texto adjunto',
                estado: rc.estado || (rc.validado ? 'aprobado' : 'pendiente'),
                fecha: rc.fecha ? new Date(rc.fecha).toLocaleDateString('es-ES') : fechaHoy,
                hora: rc.fecha ? new Date(rc.fecha).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''
              })
            }
          })
        }
      } catch (e) {}
      setEntregasRetos(listaEntregas)

      // 8. Cargar registros de auditoría
      const logs = JSON.parse(localStorage.getItem('muudel_audit_log') || '[]')
      setLogsAuditoria(logs)

      // 9. Cargar Archivos y Materiales del Aula
      let listaArchivos = []
      try {
        const { data: apuntesRemotos } = await supabase
          .from('apuntes')
          .select('*, profiles(id, nombre, color_acento, digito_id, username)')
          .order('created_at', { ascending: false })

        if (apuntesRemotos && apuntesRemotos.length > 0) {
          listaArchivos = apuntesRemotos.map(a => {
            const metaInfo = detectarTipoArchivo(a.file_name || a.titulo, a.file_type || '')
            return {
              id: a.id,
              titulo: a.titulo,
              materia: a.materia,
              texto: a.texto,
              file_url: a.file_url,
              file_name: a.file_name || `${a.titulo.toLowerCase().replace(/[^a-z0-9]/g, '_')}.${metaInfo.tipo === 'codigo' ? 'sh' : 'md'}`,
              file_size: a.file_size || (a.texto ? a.texto.length * 2 : 12400),
              file_type: a.file_type || (metaInfo.tipo === 'codigo' ? 'text/plain' : 'text/markdown'),
              oficial: a.oficial ?? (a.profiles?.rol === 'moderador' || a.user_id === perfil?.id),
              autor_id: a.user_id,
              autor_nombre: a.profiles?.nombre || 'Compañero SMR2',
              autor_color: a.profiles?.color_acento || '#0A84FF',
              autor_username: a.profiles?.username || '',
              created_at: a.created_at || new Date().toISOString()
            }
          })
        }
      } catch (errDb) {
        console.warn('Lectura remota de apuntes omitida:', errDb)
      }

      // Combinar con almacenamiento local
      try {
        const localArchivos = JSON.parse(localStorage.getItem('muudel_archivos_aula') || '[]')
        localArchivos.forEach(loc => {
          if (!listaArchivos.find(a => a.id === loc.id)) {
            listaArchivos.push(loc)
          }
        })
      } catch (e) {}

      // Si no hay archivos, poblar con recursos de seed para el aula
      if (listaArchivos.length === 0) {
        listaArchivos = [...RECURSOS_OFICIALES_INICIALES]
        try {
          localStorage.setItem('muudel_archivos_aula', JSON.stringify(listaArchivos))
        } catch (_) {}
      }

      setArchivosClase(listaArchivos)

      // 10. Sincronizar Configuración de Economía de Clase
      try {
        const cfgSrv = await cargarConfigRecompensasDesdeServidor()
        if (cfgSrv) setConfigRecompensas(cfgSrv)
      } catch (_) {}
    } catch (err) {
      console.warn('Error al cargar datos administrativos:', err)
    } finally {
      setCargando(false)
    }
  }

  // Desbloqueo seguro por PIN con soporte de PIN dinámico y bloqueo progresivo
  const handleDesbloquearPin = (e) => {
    e.preventDefault()
    setPinError('')

    if (segundosBloqueo > 0) {
      setPinError(`Acceso suspendido temporalmente. Espera ${segundosBloqueo}s.`)
      return
    }

    const pinValido = obtenerPinAdmin()
    if (pinInput.trim() === pinValido) {
      sound.playPop()
      setDesbloqueado(true)
      sessionStorage.setItem('muudel_admin_desbloqueado', 'true')
      setPinInput('')
      setIntentosFallidos(0)
      registrarAuditoria('Acceso al Panel', 'Desbloqueo seguro verificado con PIN')
    } else {
      sound.playPop()
      const nuevosFallos = intentosFallidos + 1
      setIntentosFallidos(nuevosFallos)
      if (nuevosFallos >= 5) {
        setSegundosBloqueo(300)
        setPinError(`5 intentos fallidos consecutivos. Bloqueo estricto de seguridad de 5 minutos (300s).`)
      } else if (nuevosFallos >= 3) {
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

  // Cambiar PIN maestro de moderador
  const handleGuardarNuevoPin = (e) => {
    e.preventDefault()
    setErrorCambioPin('')
    const pinActual = obtenerPinAdmin()

    if (pinActualInput.trim() !== pinActual) {
      setErrorCambioPin('El PIN actual introducido es incorrecto.')
      return
    }
    if (pinNuevoInput.trim().length < 4 || pinNuevoInput.trim().length > 8) {
      setErrorCambioPin('El nuevo PIN debe tener entre 4 y 8 dígitos.')
      return
    }
    if (pinNuevoInput.trim() !== pinConfirmarInput.trim()) {
      setErrorCambioPin('La confirmación del nuevo PIN no coincide.')
      return
    }

    localStorage.setItem('muudel_admin_pin_custom', pinNuevoInput.trim())
    sound.playStamp()
    avisar('PIN de administración actualizado con éxito.')
    registrarAuditoria('Seguridad', 'PIN maestro de administración modificado')
    setMostrarModalPin(false)
    setPinActualInput('')
    setPinNuevoInput('')
    setPinConfirmarInput('')
  }

  // 1. INICIAR BANEO DE USUARIO
  const iniciarBaneo = (alumno) => {
    setModalBaneo({
      alumno,
      motivo: 'Conducta inapropiada en el chat de clase',
      preset: 'Conducta inapropiada en el chat de clase'
    })
  }

  // CONFIRMAR BANEO DE USUARIO
  const confirmarBaneo = async () => {
    if (!modalBaneo?.alumno) return
    const { alumno, motivo } = modalBaneo
    const motivoFinal = (motivo || 'Cuenta suspendida por moderación').trim()
    setAccionEnCurso(alumno.id)

    try {
      await supabase
        .from('profiles')
        .update({ baneado: true, motivo_ban: motivoFinal })
        .eq('id', alumno.id)
    } catch (e) {}

    try {
      const baneadosMap = JSON.parse(localStorage.getItem('muudel_usuarios_baneados') || '{}')
      baneadosMap[alumno.id] = {
        motivo: motivoFinal,
        fecha: new Date().toISOString(),
        nombre: alumno.nombre
      }
      localStorage.setItem('muudel_usuarios_baneados', JSON.stringify(baneadosMap))
    } catch (e) {}

    setTodosAlumnos(prev => prev.map(a => a.id === alumno.id ? { ...a, baneado: true, motivo_ban: motivoFinal } : a))

    // Expulsar la sesión activa del usuario si está en vivo
    transmitirEvento('usuario_baneado', {
      userId: alumno.id,
      email: alumno.email,
      motivo: motivoFinal
    })

    sound.playPop()
    avisar(`Estudiante ${alumno.nombre} sancionado y baneado.`, 'error')
    registrarAuditoria('Baneo de Alumno', `${alumno.nombre} fue baneado. Motivo: "${motivoFinal}"`)
    setModalBaneo(null)
    setAccionEnCurso(null)
  }

  // 2. LEVANTAR BANEO (DESBANEAR)
  const handleDesbanearAlumno = async (alumno) => {
    setModalConfirmacion({
      titulo: `¿Levantar sanción a ${alumno.nombre}?`,
      mensaje: `El estudiante podrá volver a entrar a la plataforma, participar en el chat y pasar lista.`,
      accion: async () => {
        setModalConfirmacion(null)
        setAccionEnCurso(alumno.id)

        try {
          await supabase
            .from('profiles')
            .update({ baneado: false, motivo_ban: null })
            .eq('id', alumno.id)
        } catch (e) {}

        try {
          const baneadosMap = JSON.parse(localStorage.getItem('muudel_usuarios_baneados') || '{}')
          delete baneadosMap[alumno.id]
          localStorage.setItem('muudel_usuarios_baneados', JSON.stringify(baneadosMap))
        } catch (e) {}

        setTodosAlumnos(prev => prev.map(a => a.id === alumno.id ? { ...a, baneado: false, motivo_ban: null } : a))

        transmitirEvento('usuario_desbaneado', {
          userId: alumno.id,
          email: alumno.email
        })

        sound.playStamp()
        avisar(`Sanción levantada para ${alumno.nombre}.`)
        registrarAuditoria('Desbaneo de Alumno', `Se rehabilitó el acceso a ${alumno.nombre}`)
        setAccionEnCurso(null)
      }
    })
  }

  // 3. ELIMINAR USUARIO DEFINITIVAMENTE
  const handleEliminarAlumno = (alumno) => {
    setModalConfirmacion({
      titulo: `¿Eliminar permanentemente a ${alumno.nombre}?`,
      mensaje: `Esta acción borrará de forma irreversible al usuario, sus StevenEuros acumulados (${alumno.puntos_total || 0} SE 💶), sus asistencias y todos sus registros. Esta acción NO se puede deshacer.`,
      peligroso: true,
      accion: async () => {
        setModalConfirmacion(null)
        setAccionEnCurso(alumno.id)

        let borradoExitoso = false

        // 1. Borrar vía API del backend con Service Key (Garantiza borrado real sin bloqueos de RLS ni FK)
        try {
          const resp = await fetch('/api/admin/eliminar-usuario', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: alumno.id })
          })
          if (resp.ok) {
            borradoExitoso = true
          }
        } catch (_) {}

        // 2. Si no respondió la API, intentar vía RPC con SECURITY DEFINER
        if (!borradoExitoso) {
          try {
            const { error: rpcErr } = await supabase.rpc('admin_eliminar_usuario', { p_user_id: alumno.id })
            if (!rpcErr) borradoExitoso = true
          } catch (_) {}
        }

        // 3. Fallback de borrado en cascada directo con el cliente Supabase
        if (!borradoExitoso) {
          try {
            await supabase.from('message_likes').delete().eq('user_id', alumno.id)
            await supabase.from('messages').delete().eq('user_id', alumno.id)
            await supabase.from('checkins').delete().eq('user_id', alumno.id)
            await supabase.from('reto_completado').delete().eq('user_id', alumno.id)
            await supabase.from('achievements').delete().eq('user_id', alumno.id)
            await supabase.from('apuntes').delete().eq('user_id', alumno.id)
            try { await supabase.from('pvp_partidas').delete().or(`creador_id.eq.${alumno.id},oponente_id.eq.${alumno.id}`) } catch (_) {}
            try { await supabase.from('pvp_blackjack').delete().or(`creador_id.eq.${alumno.id},oponente_id.eq.${alumno.id}`) } catch (_) {}
            try { await supabase.from('arcade_scores').delete().eq('user_id', alumno.id) } catch (_) {}
            try { await supabase.from('juegos_puntuaciones').delete().eq('user_id', alumno.id) } catch (_) {}
            const { error: delErr } = await supabase.from('profiles').delete().eq('id', alumno.id)
            if (!delErr) borradoExitoso = true
          } catch (e) {
            console.warn('Fallback delete profiles:', e)
          }
        }

        // 4. Borrar metadatos y baneos locales
        try {
          localStorage.removeItem('muudel_user_meta_' + alumno.id)
          const baneadosMap = JSON.parse(localStorage.getItem('muudel_usuarios_baneados') || '{}')
          delete baneadosMap[alumno.id]
          localStorage.setItem('muudel_usuarios_baneados', JSON.stringify(baneadosMap))
        } catch (e) {}

        // 5. Remover del estado de forma inmediata
        setTodosAlumnos(prev => prev.filter(a => a.id !== alumno.id))

        // 6. Transmitir evento para cerrar sesión remota
        transmitirEvento('usuario_eliminado', {
          userId: alumno.id,
          email: alumno.email
        })

        sound.playPop()
        avisar(`Usuario ${alumno.nombre} eliminado definitivamente del aula y de la base de datos.`, 'error')
        registrarAuditoria('Eliminación Permanente', `${alumno.nombre} (${alumno.email || 'id:' + alumno.id}) eliminado de la base de datos`)
        setAccionEnCurso(null)
      }
    })
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
    avisar(`Asistencia de ${solicitud.nombre} aprobada (+${puntos} SE 💶).`)
    registrarAuditoria('Pase de Lista', `Asistencia aprobada a ${solicitud.nombre} (+${puntos} SE 💶)`)
    
    // Transmitir en tiempo real al alumno y a toda la clase
    transmitirEvento('asistencia_confirmada', {
      userId: solicitud.userId,
      fecha: fechaHoy,
      hora: horaActual,
      esTarde: solicitud.esTarde,
      puntos
    })
    transmitirEvento('steveneuros_actualizados', { userId: solicitud.userId })
    window.dispatchEvent(new CustomEvent('steveneuros_actualizados'))
    
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

  // Marcar a todos los alumnos de la clase como presentes (+10 SE 💶)
  const handleMarcarTodosPresentes = async () => {
    setModalConfirmacion({
      titulo: '¿Pase de lista general?',
      mensaje: `Se registrará asistencia puntual (+10 SE 💶) para todos los ${todosAlumnos.length} alumnos registrados en la clase.`,
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
        transmitirEvento('steveneuros_actualizados', {})
        window.dispatchEvent(new CustomEvent('steveneuros_actualizados'))
        triggerConfetti()
        sound.playStamp()
        avisar('Pase de lista general completado para toda la clase (+10 SE 💶 cada uno).')
        registrarAuditoria('Pase Masivo', 'Todos los alumnos marcados presentes (+10 SE 💶)')
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
      mensaje: `Se le devolverán los ${canje.costo} StevenEuros (SE 💶) inmediatamente a su saldo.`,
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
        transmitirEvento('steveneuros_actualizados', { userId: canje.userId })
        window.dispatchEvent(new CustomEvent('steveneuros_actualizados'))

        sound.playPop()
        avisar(`Canje rechazado. ${canje.costo} SE 💶 devueltos a ${canje.nombre}.`)
        registrarAuditoria('Reembolso Canje', `Rechazado canje de ${canje.costo} SE 💶 a ${canje.nombre}`)
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

  // MODERACIÓN: Lanzar Alerta / Notificación Push a toda la clase
  const handleLanzarAlertaClase = async (e) => {
    e.preventDefault()
    if (!mensajeAlertaClase.trim()) {
      sound.playPop()
      avisar('Escribe el texto de la notificación para la clase.', 'error')
      return
    }

    const alertaObj = {
      id: 'alerta-' + Date.now(),
      titulo: tituloAlertaClase.trim() || 'Aviso de Moderación SMR2',
      mensaje: mensajeAlertaClase.trim(),
      nivel: nivelAlertaClase,
      autor: perfil?.nombre || 'Moderador',
      hora: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }

    try {
      localStorage.setItem('muudel_ultima_alerta_clase', JSON.stringify(alertaObj))
    } catch (_) {}

    transmitirEvento('notificacion_push_clase', alertaObj)

    conOneSignal((OneSignal) => {
      console.log('🔔 [OneSignal] Transmisión de alerta:', alertaObj.titulo)
    })

    sound.playStamp()
    triggerConfetti()
    avisar('¡Notificación emitida a todos los alumnos en vivo!')
    setMensajeAlertaClase('')
    setTituloAlertaClase('')
    registrarAuditoria('Notificaciones', `Alerta enviada: "${alertaObj.titulo}"`)
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

  // AVISOS: Quitar aviso diario de la pantalla principal
  const handleQuitarAvisoDiario = () => {
    localStorage.removeItem('racha_aviso_hoy')
    setAvisoDiarioActual('')
    transmitirEvento('aviso_admin', { texto: '' })
    sound.playPop()
    avisar('Aviso diario de clase retirado con éxito.')
    registrarAuditoria('Quitar Aviso', 'Aviso diario de clase retirado de todas las pantallas')
  }

  // AVISOS: Retirar megáfono fijado del chat
  const handleQuitarMegafono = () => {
    localStorage.removeItem('muudel_megafono_activo')
    setMegafonoActual(null)
    transmitirEvento('megafono_activo', null)
    sound.playPop()
    avisar('Megáfono fijado desanclado de la cabecera del chat.')
    registrarAuditoria('Quitar Megáfono', 'Comunicado fijado del moderador retirado')
  }

  // AVISOS: Retirar todos los avisos y comunicados simultáneamente
  const handleQuitarTodosAvisos = () => {
    localStorage.removeItem('racha_aviso_hoy')
    localStorage.removeItem('muudel_megafono_activo')
    setAvisoDiarioActual('')
    setMegafonoActual(null)
    transmitirEvento('aviso_admin', { texto: '' })
    transmitirEvento('megafono_activo', null)
    sound.playPop()
    avisar('Todos los avisos diarios y comunicados fijados han sido retirados.')
    registrarAuditoria('Limpieza de Avisos', 'Eliminados todos los comunicados y avisos activos del aula')
  }

  // PUNTAJE: Abrir modal de personalización de puntuación y racha
  const handleAbrirModalPuntaje = (alumno) => {
    setModalPuntaje({
      alumno,
      modo: 'exacto', // 'exacto' | 'delta'
      puntosExactos: alumno.puntos_total || 0,
      deltaPuntos: 10,
      rachaExacta: alumno.racha_actual || 0,
      modificarRacha: false,
      motivo: 'Ajuste personalizado de moderación'
    })
  }

  // PUNTAJE: Confirmar y guardar ajuste de puntuación
  const handleConfirmarAjustePuntaje = async (e) => {
    if (e && e.preventDefault) e.preventDefault()
    if (!modalPuntaje?.alumno) return
    const { alumno, modo, puntosExactos, deltaPuntos, rachaExacta, modificarRacha, motivo } = modalPuntaje
    const alumnoId = alumno.id

    let nuevoPuntaje = alumno.puntos_total || 0
    if (modo === 'exacto') {
      nuevoPuntaje = Math.max(0, Number(puntosExactos) || 0)
    } else {
      nuevoPuntaje = Math.max(0, (alumno.puntos_total || 0) + Number(deltaPuntos))
    }

    const payloadUpdate = {
      puntos_total: nuevoPuntaje,
      updated_at: new Date().toISOString()
    }

    if (modificarRacha) {
      payloadUpdate.racha_actual = Math.max(0, Number(rachaExacta) || 0)
    }

    setAccionEnCurso(alumnoId)
    try {
      let actualizadoBd = false

      // 1. Intentar vía Endpoint API con Service Key (Garantizado sin bloqueo de RLS)
      try {
        const resp = await fetch('/api/admin/modificar-puntaje', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: alumnoId,
            puntos_total: nuevoPuntaje,
            racha_actual: modificarRacha ? payloadUpdate.racha_actual : undefined,
            motivo
          })
        })
        if (resp.ok) {
          actualizadoBd = true
        }
      } catch (_) {}

      // 2. Si no respondió la API, llamar al RPC con SECURITY DEFINER
      if (!actualizadoBd) {
        try {
          const { error: rpcErr } = await supabase.rpc('admin_modificar_puntos', {
            p_user_id: alumnoId,
            p_nuevos_puntos: nuevoPuntaje,
            p_nueva_racha: modificarRacha ? payloadUpdate.racha_actual : null
          })
          if (!rpcErr) actualizadoBd = true
        } catch (_) {}
      }

      // 3. Fallback directo con el cliente Supabase
      if (!actualizadoBd) {
        try {
          const { data: upData, error: upErr } = await supabase
            .from('profiles')
            .update(payloadUpdate)
            .eq('id', alumnoId)
            .select()
          if (!upErr && upData && upData.length > 0) {
            actualizadoBd = true
          }
        } catch (_) {}
      }

      if (!actualizadoBd) {
        console.warn('Aviso: el ajuste de puntos se aplicó en local pero no pudo confirmarse en Supabase.')
      }

      // Actualizar en el estado local de todos los alumnos
      setTodosAlumnos(prev => prev.map(a => {
        if (a.id === alumnoId) {
          return {
            ...a,
            puntos_total: nuevoPuntaje,
            ...(modificarRacha ? { racha_actual: payloadUpdate.racha_actual } : {})
          }
        }
        return a
      }))

      // Si es el usuario activo guardado en local
      const localUser = localStorage.getItem('racha_local_user')
      if (localUser) {
        try {
          const parsed = JSON.parse(localUser)
          if (parsed.id === alumnoId) {
            const act = {
              ...parsed,
              puntos_total: nuevoPuntaje,
              ...(modificarRacha ? { racha_actual: payloadUpdate.racha_actual } : {})
            }
            localStorage.setItem('racha_local_user', JSON.stringify(act))
          }
        } catch (err) {}
      }

      sound.playStamp()
      triggerConfetti()
      avisar(`StevenEuros de ${alumno.nombre} establecidos en ${nuevoPuntaje} SE 💶.`)
      registrarAuditoria('Ajuste de StevenEuros', `${alumno.nombre} fijado a ${nuevoPuntaje} SE 💶 ${modificarRacha ? `(racha: ${payloadUpdate.racha_actual}d)` : ''} · Motivo: ${motivo}`)
      transmitirEvento('puntos_actualizados', { alumnoId, nuevosPuntos: nuevoPuntaje, userId: alumnoId })
      transmitirEvento('steveneuros_actualizados', { alumnoId, nuevosPuntos: nuevoPuntaje, userId: alumnoId })
      window.dispatchEvent(new CustomEvent('steveneuros_actualizados', { detail: { puntos: nuevoPuntaje, userId: alumnoId } }))
      setModalPuntaje(null)
    } catch (err) {
      avisar('Error al actualizar el puntaje: ' + (err.message || err), 'error')
    } finally {
      setAccionEnCurso(null)
    }
  }

  // RETOS: Aprobar entrega enviada por un alumno
  const handleAprobarEntregaReto = async (entrega) => {
    setAccionEnCurso(entrega.id)
    const puntos = Number(entrega.puntos) || 25

    // 1. Actualizar entregas en local
    const actualizadas = entregasRetos.map(e => e.id === entrega.id ? { ...e, estado: 'aprobado', feedback: '¡Aprobado y comprobado por lominoño!' } : e)
    setEntregasRetos(actualizadas)
    localStorage.setItem('muudel_entregas_retos', JSON.stringify(actualizadas))

    // 2. Sumar puntos al alumno
    const alumno = todosAlumnos.find(a => a.id === entrega.userId)
    const nuevosPuntos = (alumno?.puntos_total || 0) + puntos

    try {
      await supabase
        .from('profiles')
        .update({ puntos_total: nuevosPuntos })
        .eq('id', entrega.userId)

      await supabase
        .from('reto_completado')
        .upsert({
          reto_id: entrega.retoId,
          user_id: entrega.userId,
          validado: true,
          estado: 'aprobado',
          feedback_admin: '¡Aprobado por lominoño!',
          revisado_por: perfil?.id,
          revisado_en: new Date().toISOString()
        })
    } catch (e) {}

    setTodosAlumnos(prev => prev.map(a => a.id === entrega.userId ? { ...a, puntos_total: nuevosPuntos } : a))

    // Transmitir evento para que la pantalla del alumno celebre en directo
    transmitirEvento('reto_validado', {
      retoId: entrega.retoId,
      userId: entrega.userId,
      puntos,
      feedback: '¡Aprobado por lominoño!'
    })
    transmitirEvento('puntos_actualizados', { userId: entrega.userId, nuevosPuntos })
    transmitirEvento('steveneuros_actualizados', { userId: entrega.userId, nuevosPuntos })
    window.dispatchEvent(new CustomEvent('steveneuros_actualizados'))

    sound.playStamp()
    triggerConfetti()
    avisar(`Reto "${entrega.retoTitulo}" aprobado para ${entrega.nombre} (+${puntos} SE 💶).`)
    registrarAuditoria('Reto Aprobado', `Entrega de "${entrega.retoTitulo}" validada a ${entrega.nombre} (+${puntos} SE 💶)`)
    setAccionEnCurso(null)
  }

  // RETOS: Rechazar entrega con nota de corrección
  const handleRechazarEntregaReto = async (entrega, feedbackTexto) => {
    const feedback = (feedbackTexto || '').trim() || 'Evidencia no válida o explicación incompleta.'
    const actualizadas = entregasRetos.map(e => e.id === entrega.id ? { ...e, estado: 'rechazado', feedback } : e)
    setEntregasRetos(actualizadas)
    localStorage.setItem('muudel_entregas_retos', JSON.stringify(actualizadas))

    try {
      await supabase
        .from('reto_completado')
        .upsert({
          reto_id: entrega.retoId,
          user_id: entrega.userId,
          validado: false,
          estado: 'rechazado',
          feedback_admin: feedback,
          revisado_por: perfil?.id,
          revisado_en: new Date().toISOString()
        })
    } catch (e) {}

    transmitirEvento('reto_rechazado', {
      retoId: entrega.retoId,
      userId: entrega.userId,
      feedback
    })

    sound.playPop()
    avisar(`Entrega de ${entrega.nombre} rechazada con feedback.`, 'error')
    registrarAuditoria('Reto Rechazado', `Rechazada entrega de "${entrega.retoTitulo}" a ${entrega.nombre} (${feedback})`)
    setModalRechazoReto(null)
  }

  // RETOS: Pausar o reanudar reto
  const handleToggleActivoReto = async (reto) => {
    const nuevoEstado = !reto.activo
    try {
      await supabase.from('retos').update({ activo: nuevoEstado }).eq('id', reto.id)
      setRetosActivos(prev => prev.map(r => r.id === reto.id ? { ...r, activo: nuevoEstado } : r))
      sound.playPop()
      avisar(`Reto "${reto.titulo}" ${nuevoEstado ? 'activado' : 'pausado'}.`)
      registrarAuditoria('Estado Reto', `Reto "${reto.titulo}" marcado como ${nuevoEstado ? 'activo' : 'pausado'}`)
    } catch (e) {
      avisar('Error al modificar estado del reto.', 'error')
    }
  }

  // RETOS: Eliminar reto
  const handleEliminarReto = (reto) => {
    setModalConfirmacion({
      titulo: `¿Eliminar reto "${reto.titulo}"?`,
      mensaje: 'Esta acción borrará el reto y no se mostrará a los alumnos.',
      peligroso: true,
      accion: async () => {
        setModalConfirmacion(null)
        try {
          await supabase.from('retos').delete().eq('id', reto.id)
          setRetosActivos(prev => prev.filter(r => r.id !== reto.id))
          sound.playPop()
          avisar(`Reto "${reto.titulo}" eliminado.`)
          registrarAuditoria('Reto Eliminado', `Eliminado reto "${reto.titulo}"`)
        } catch (e) {
          avisar('Error al eliminar reto.', 'error')
        }
      }
    })
  }

  // Bonificar o penalizar StevenEuros a un alumno
  const handleModificarPuntos = async (alumnoId, deltaPuntos, motivo = 'Ajuste StevenEuros') => {
    setAccionEnCurso(alumnoId)
    const alumno = todosAlumnos.find((a) => a.id === alumnoId)
    if (!alumno) return

    const nuevosPuntos = Math.max(0, (alumno.puntos_total || 0) + deltaPuntos)

    try {
      let actualizado = false

      // 1. Intentar endpoint API con Service Key
      try {
        const resp = await fetch('/api/admin/modificar-puntaje', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: alumnoId, puntos_total: nuevosPuntos, motivo })
        })
        if (resp.ok) actualizado = true
      } catch (_) {}

      // 2. Fallback directo a Supabase
      if (!actualizado) {
        try {
          const { error } = await supabase
            .from('profiles')
            .update({
              puntos_total: nuevosPuntos,
              updated_at: new Date().toISOString()
            })
            .eq('id', alumnoId)
          if (!error) actualizado = true
        } catch (_) {}
      }

      // 3. Fallback RPC
      if (!actualizado) {
        try {
          await supabase.rpc('admin_modificar_puntos', { p_user_id: alumnoId, p_nuevos_puntos: nuevosPuntos })
          actualizado = true
        } catch (_) {}
      }

      sound.playPop()
      avisar(`${deltaPuntos > 0 ? '+' : ''}${deltaPuntos} StevenEuros (${deltaPuntos > 0 ? '+' : ''}${deltaPuntos} SE 💶) para ${alumno.nombre}.`)
      setTodosAlumnos((prev) =>
        prev.map((a) => (a.id === alumnoId ? { ...a, puntos_total: nuevosPuntos } : a))
      )

      // Actualizar usuario en sesión si corresponde
      const localUser = localStorage.getItem('racha_local_user')
      if (localUser) {
        try {
          const parsed = JSON.parse(localUser)
          if (String(parsed.id) === String(alumnoId)) {
            const actUser = { ...parsed, puntos_total: nuevosPuntos }
            localStorage.setItem('racha_local_user', JSON.stringify(actUser))
            if (perfil && String(perfil.id) === String(alumnoId)) {
              setPerfil(actUser)
            }
          }
        } catch (_) {}
      }

      transmitirEvento('puntos_actualizados', { alumnoId, nuevosPuntos, userId: alumnoId })
      transmitirEvento('steveneuros_actualizados', { alumnoId, nuevosPuntos, userId: alumnoId })
      window.dispatchEvent(new CustomEvent('steveneuros_actualizados', { detail: { puntos: nuevosPuntos, userId: alumnoId } }))
      registrarAuditoria('Ajuste StevenEuros', `${deltaPuntos > 0 ? '+' : ''}${deltaPuntos} SE a ${alumno.nombre} (${motivo})`)
    } catch (err) {
      avisar('Error al modificar StevenEuros.', 'error')
    } finally {
      setAccionEnCurso(null)
    }
  }

  // ECONOMÍA: Guardar reglas de ganancia de la clase (Check-in, Reto, Feed, Multiplicador)
  const handleGuardarConfigRecompensas = async (e) => {
    if (e?.preventDefault) e.preventDefault()
    setGuardandoRecompensas(true)
    try {
      await guardarConfigRecompensas(configRecompensas)
      sound.playStamp()
      triggerConfetti()
      avisar('Reglas de ganancia y economía guardadas y difundidas a toda la clase.')
      registrarAuditoria(
        'Economía de Clase',
        `Recompensas actualizadas: Checkin ${configRecompensas.puntosCheckin}pts, Retos ${configRecompensas.puntosReto}pts, Feed ${configRecompensas.puntosPostFeed}pts, Multiplicador x${configRecompensas.multiplicadorGlobal}`
      )
    } catch (err) {
      avisar('Error al guardar configuración: ' + (err.message || err), 'error')
    } finally {
      setGuardandoRecompensas(false)
    }
  }

  // ECONOMÍA: Reparto masivo de monedas a todos los alumnos
  const handleAjusteMasivoMonedas = async (cantidad = ajusteMasivoCantidad, motivo = ajusteMasivoMotivo) => {
    const cant = Number(cantidad)
    if (!cant || isNaN(cant)) return
    const motivoTexto = (motivo || 'Recompensa general de clase').trim()

    setModalConfirmacion({
      titulo: `¿Otorgar ${cant > 0 ? '+' : ''}${cant} StevenEuros a TODOS los alumnos?`,
      mensaje: `Esta acción modificará el saldo de StevenEuros de los ${todosAlumnos.length} estudiantes registrados en la clase. Motivo: "${motivoTexto}".`,
      accion: async () => {
        setModalConfirmacion(null)
        setEnviandoAjusteMasivo(true)
        try {
          // 1. Intentar llamar al endpoint de ajuste masivo del backend
          let apiExitosa = false
          try {
            const resp = await fetch('/api/admin/ajuste-masivo', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ cantidad: cant, motivo: motivoTexto })
            })
            if (resp.ok) apiExitosa = true
          } catch (_) {}

          // 2. Si no respondió la API, actualizar directamente en Supabase
          if (!apiExitosa) {
            for (const al of todosAlumnos) {
              const nuevoSaldo = Math.max(0, (al.puntos_total || 0) + cant)
              try {
                await supabase.from('profiles').update({ puntos_total: nuevoSaldo }).eq('id', al.id)
              } catch (_) {}
            }
          }

          // 3. Actualizar en el estado local de todosAlumnos
          setTodosAlumnos(prev => prev.map(a => ({
            ...a,
            puntos_total: Math.max(0, (a.puntos_total || 0) + cant)
          })))

          // 4. Si el alumno activo es el del navegador
          if (perfil) {
            const nuevoPuntajeLocal = Math.max(0, (perfil.puntos_total || 0) + cant)
            const localUser = localStorage.getItem('racha_local_user')
            if (localUser) {
              try {
                const parsed = JSON.parse(localUser)
                localStorage.setItem('racha_local_user', JSON.stringify({ ...parsed, puntos_total: nuevoPuntajeLocal }))
              } catch (_) {}
            }
          }

          // 5. Transmitir evento en tiempo real a todos los clientes conectados
          transmitirEvento('ajuste_masivo_puntos', { cantidad: cant, motivo: motivoTexto })
          transmitirEvento('puntos_actualizados_masivo', { delta: cant })

          sound.playStamp()
          triggerConfetti()
          avisar(`¡${cant > 0 ? '+' : ''}${cant} StevenEuros entregados con éxito a toda la clase!`)
          registrarAuditoria('Reparto Masivo', `${cant > 0 ? '+' : ''}${cant} StevenEuros a todos los alumnos (${motivoTexto})`)
        } catch (err) {
          avisar('Error en reparto masivo: ' + (err.message || err), 'error')
        } finally {
          setEnviandoAjusteMasivo(false)
        }
      }
    })
  }

  // ECONOMÍA: Fijar saldo exacto de StevenEuros a un alumno
  const handleFijarMonedasDirecto = async (alumno, nuevoSaldo, motivo = 'Saldo fijado por moderador') => {
    const alumnoId = alumno.id
    const puntajeFinal = Math.max(0, Math.round(Number(nuevoSaldo) || 0))
    setAccionEnCurso(alumnoId)
    try {
      let actualizado = false
      try {
        const resp = await fetch('/api/admin/modificar-puntaje', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: alumnoId, puntos_total: puntajeFinal, motivo })
        })
        if (resp.ok) actualizado = true
      } catch (_) {}

      if (!actualizado) {
        try {
          const { error } = await supabase.from('profiles').update({ puntos_total: puntajeFinal, updated_at: new Date().toISOString() }).eq('id', alumnoId)
          if (!error) actualizado = true
        } catch (_) {}
      }

      if (!actualizado) {
        try {
          await supabase.rpc('admin_modificar_puntos', { p_user_id: alumnoId, p_nuevos_puntos: puntajeFinal })
          actualizado = true
        } catch (_) {}
      }

      setTodosAlumnos(prev => prev.map(a => a.id === alumnoId ? { ...a, puntos_total: puntajeFinal } : a))

      // Actualizar si es el usuario en sesión
      const localUser = localStorage.getItem('racha_local_user')
      if (localUser) {
        try {
          const parsed = JSON.parse(localUser)
          if (String(parsed.id) === String(alumnoId)) {
            const actUser = { ...parsed, puntos_total: puntajeFinal }
            localStorage.setItem('racha_local_user', JSON.stringify(actUser))
            if (perfil && String(perfil.id) === String(alumnoId)) {
              setPerfil(actUser)
            }
          }
        } catch (_) {}
      }

      transmitirEvento('puntos_actualizados', { alumnoId, nuevosPuntos: puntajeFinal, userId: alumnoId })
      transmitirEvento('steveneuros_actualizados', { alumnoId, nuevosPuntos: puntajeFinal, userId: alumnoId })
      window.dispatchEvent(new CustomEvent('steveneuros_actualizados', { detail: { puntos: puntajeFinal, userId: alumnoId } }))
      sound.playStamp()
      triggerConfetti()
      avisar(`StevenEuros de ${alumno.nombre} fijados en ${puntajeFinal} SE 💶.`)
      registrarAuditoria('Fijar StevenEuros', `${alumno.nombre} tiene ahora ${puntajeFinal} StevenEuros (${motivo})`)
    } catch (err) {
      avisar('Error al fijar StevenEuros.', 'error')
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

  // ==========================================
  // GESTIÓN DE ARCHIVOS Y MATERIALES DEL AULA
  // ==========================================

  // Subir un nuevo archivo o apunte técnico
  const handleSubirArchivo = async (e) => {
    e.preventDefault()
    if (!nuevoArchivoTitulo.trim()) {
      avisar('Por favor introduce un título para el material.', 'error')
      return
    }

    setSubiendoArchivo(true)
    try {
      let fileUrl = null
      let fileName = archivoSeleccionado ? archivoSeleccionado.name : `${nuevoArchivoTitulo.toLowerCase().replace(/[^a-z0-9]/g, '_')}.md`
      let fileSize = archivoSeleccionado ? archivoSeleccionado.size : (nuevoArchivoTexto ? nuevoArchivoTexto.length * 2 : 1024)
      let fileType = archivoSeleccionado ? archivoSeleccionado.type : 'text/markdown'

      // Si seleccionó un archivo físico, convertirlo a dataUrl y opcionalmente subir a storage
      if (archivoSeleccionado) {
        fileUrl = await new Promise((resolve, reject) => {
          const reader = new FileReader()
          reader.onload = () => resolve(reader.result)
          reader.onerror = reject
          reader.readAsDataURL(archivoSeleccionado)
        })

        // Intentar guardar en Supabase Storage si el bucket existe
        try {
          const storagePath = `aula_${Date.now()}_${archivoSeleccionado.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`
          const { data: stData } = await supabase.storage
            .from('apuntes')
            .upload(storagePath, archivoSeleccionado, { cacheControl: '3600', upsert: true })
          if (stData) {
            const { data: pubData } = supabase.storage.from('apuntes').getPublicUrl(storagePath)
            if (pubData?.publicUrl) fileUrl = pubData.publicUrl
          }
        } catch (_) {}
      }

      const nuevoId = 'apunte-' + Date.now()
      const nuevoItem = {
        id: nuevoId,
        titulo: nuevoArchivoTitulo.trim(),
        materia: nuevoArchivoMateria,
        texto: nuevoArchivoTexto.trim() || null,
        file_url: fileUrl,
        file_name: fileName,
        file_size: fileSize,
        file_type: fileType,
        oficial: Boolean(nuevoArchivoEsOficial),
        autor_id: perfil?.id,
        autor_nombre: perfil?.nombre || 'lominoño',
        autor_color: perfil?.color_acento || '#0A84FF',
        autor_username: perfil?.username || '',
        created_at: new Date().toISOString()
      }

      // 1. Guardar en Supabase tabla apuntes si está disponible
      try {
        await supabase.from('apuntes').insert({
          id: nuevoId,
          user_id: perfil?.id,
          titulo: nuevoItem.titulo,
          materia: nuevoItem.materia,
          texto: nuevoItem.texto,
          file_url: nuevoItem.file_url
        })
      } catch (errDb) {
        console.warn('Inserción remota en apuntes omitida:', errDb)
      }

      // 2. Persistir localmente
      const actualizados = [nuevoItem, ...archivosClase.filter(a => a.id !== nuevoId)]
      setArchivosClase(actualizados)
      try {
        localStorage.setItem('muudel_archivos_aula', JSON.stringify(actualizados))
      } catch (e) {}

      // 3. Notificar en vivo a toda la clase
      transmitirEvento('nuevo_apunte', nuevoItem)
      transmitirEvento('notificacion_push_clase', {
        id: 'notif-' + Date.now(),
        titulo: `📂 Nuevo Material: ${nuevoItem.materia}`,
        mensaje: `${nuevoItem.titulo} publicado por ${nuevoItem.autor_nombre}.`,
        nivel: 'general',
        autor: perfil?.nombre || 'lominoño',
        hora: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      })

      sound.playStamp()
      triggerConfetti()
      avisar(`¡Material "${nuevoItem.titulo}" publicado para toda la clase!`)
      registrarAuditoria('Subida de Archivo', `Publicado "${nuevoItem.titulo}" en ${nuevoItem.materia}`)

      // Limpiar formulario y cerrar modal
      setNuevoArchivoTitulo('')
      setNuevoArchivoTexto('')
      setArchivoSeleccionado(null)
      setMostrarModalSubirArchivo(false)
    } catch (err) {
      sound.playPop()
      avisar('Error al procesar el archivo.', 'error')
    } finally {
      setSubiendoArchivo(false)
    }
  }

  // Descargar archivo a la máquina local
  const handleDescargarArchivo = (archivo) => {
    try {
      sound.playPop()
      if (archivo.file_url && archivo.file_url.startsWith('data:')) {
        const link = document.createElement('a')
        link.href = archivo.file_url
        link.download = archivo.file_name || `${archivo.titulo.replace(/\s+/g, '_')}`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
      } else if (archivo.texto) {
        const blob = new Blob([archivo.texto], { type: 'text/markdown;charset=utf-8' })
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = archivo.file_name || `${archivo.titulo.replace(/\s+/g, '_')}.md`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        URL.revokeObjectURL(url)
      } else if (archivo.file_url) {
        window.open(archivo.file_url, '_blank')
      }
      avisar(`Descargando "${archivo.titulo}"...`)
      registrarAuditoria('Descarga de Archivo', `Descargado "${archivo.titulo}"`)
    } catch (e) {
      avisar('No se pudo descargar el archivo.', 'error')
    }
  }

  // Marcar / Desmarcar como Material Oficial del Aula
  const handleToggleOficial = async (archivo) => {
    const nuevoEstado = !archivo.oficial
    const actualizados = archivosClase.map(a => a.id === archivo.id ? { ...a, oficial: nuevoEstado } : a)
    setArchivosClase(actualizados)
    try {
      localStorage.setItem('muudel_archivos_aula', JSON.stringify(actualizados))
    } catch (e) {}

    sound.playStamp()
    avisar(`"${archivo.titulo}" ${nuevoEstado ? 'fijado como Material Oficial' : 'retirado de oficiales'}.`)
    registrarAuditoria('Material Oficial', `${archivo.titulo} marcado como ${nuevoEstado ? 'Oficial' : 'Estándar'}`)
  }

  // Eliminar archivo
  const handleEliminarArchivo = (archivo) => {
    setModalConfirmacion({
      titulo: `¿Eliminar "${archivo.titulo}"?`,
      mensaje: 'Esta acción borrará el recurso y dejará de estar disponible para el aula.',
      peligroso: true,
      accion: async () => {
        setModalConfirmacion(null)
        setAccionEnCurso(archivo.id)
        try {
          await supabase.from('apuntes').delete().eq('id', archivo.id)
        } catch (_) {}

        const actualizados = archivosClase.filter(a => a.id !== archivo.id)
        setArchivosClase(actualizados)
        try {
          localStorage.setItem('muudel_archivos_aula', JSON.stringify(actualizados))
        } catch (e) {}

        transmitirEvento('archivo_eliminado', { id: archivo.id })
        sound.playPop()
        avisar(`Archivo "${archivo.titulo}" eliminado.`)
        registrarAuditoria('Eliminación de Archivo', `Borrado "${archivo.titulo}" de ${archivo.materia}`)
        setAccionEnCurso(null)
      }
    })
  }

  // Guardar edición de archivo
  const handleGuardarEdicionArchivo = async (e) => {
    e.preventDefault()
    if (!modalEditarArchivo) return
    const { archivo, titulo, materia, texto } = modalEditarArchivo
    const tituloFinal = titulo.trim()
    if (!tituloFinal) {
      avisar('El título no puede estar vacío.', 'error')
      return
    }

    try {
      await supabase.from('apuntes').update({
        titulo: tituloFinal,
        materia,
        texto: texto.trim() || null
      }).eq('id', archivo.id)
    } catch (_) {}

    const actualizados = archivosClase.map(a => a.id === archivo.id ? {
      ...a,
      titulo: tituloFinal,
      materia,
      texto: texto.trim() || null
    } : a)

    setArchivosClase(actualizados)
    try {
      localStorage.setItem('muudel_archivos_aula', JSON.stringify(actualizados))
    } catch (e) {}

    sound.playStamp()
    avisar('Archivo actualizado con éxito.')
    registrarAuditoria('Edición Archivo', `Actualizado recurso "${tituloFinal}"`)
    setModalEditarArchivo(null)
  }

  // Copiar contenido al portapapeles
  const handleCopiarContenido = (texto) => {
    if (!texto) return
    navigator.clipboard.writeText(texto)
    setCopiadoFeedback(true)
    sound.playPop()
    avisar('Contenido copiado al portapapeles.')
    setTimeout(() => setCopiadoFeedback(false), 2000)
  }

  // Exportar catálogo completo de archivos en JSON
  const handleExportarCopiaArchivos = () => {
    try {
      const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(archivosClase, null, 2))
      const downloadAnchor = document.createElement('a')
      downloadAnchor.setAttribute('href', dataStr)
      downloadAnchor.setAttribute('download', `muudel_archivos_smr2_${fechaHoy}.json`)
      document.body.appendChild(downloadAnchor)
      downloadAnchor.click()
      downloadAnchor.remove()
      sound.playStamp()
      avisar('Copia de seguridad del repositorio de archivos descargada.')
      registrarAuditoria('Exportación Archivos', 'Descarga de backup JSON del repositorio de archivos')
    } catch (e) {
      avisar('Error al exportar catálogo.', 'error')
    }
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

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button
              type="button"
              onClick={() => {
                setErrorCambioPin('')
                setPinActualInput('')
                setPinNuevoInput('')
                setPinConfirmarInput('')
                setMostrarModalPin(true)
              }}
              title="Cambiar PIN maestro de acceso"
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
              <Key size={13} />
              <span>Cambiar PIN</span>
            </button>

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
            { id: 'archivos', label: archivosClase.length > 0 ? `Archivos (${archivosClase.length})` : 'Archivos', icon: Folder },
            { id: 'chat', label: 'Control del Chat', icon: MessageSquare },
            { id: 'canjes', label: `Canjes (${canjesPedidos.filter(c => c.estado === 'pendiente').length})`, icon: ShoppingBag },
            { id: 'economia', label: 'StevenEuros (SE 💶)', icon: Coins },
            { id: 'alumnos', label: `Comunidad (${todosAlumnos.length})`, icon: Users },
            { id: 'retos', label: entregasRetos.filter(e => e.estado === 'pendiente').length > 0 ? `Retos (${entregasRetos.filter(e => e.estado === 'pendiente').length} pend.)` : `Retos (${retosActivos.length})`, icon: Target },
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
                        {sol.email ? `${sol.email} · ` : ''}Aviso: {sol.hora} · {sol.esTarde ? 'Retraso (+5 SE 💶)' : 'Puntual (+10 SE 💶)'}
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
                    {c.es_tarde ? '+5 SE 💶 (Tarde)' : '+10 SE 💶 (A tiempo)'}
                  </span>
                </div>
              ))
            )}
          </section>
        </div>
      )}

      {/* PESTAÑA ARCHIVOS: GESTIÓN DE ARCHIVOS Y MATERIALES DEL AULA */}
      {tab === 'archivos' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Cabecera y Métricas de Archivos */}
          <section className="card" style={{ padding: '16px 20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Folder size={22} color="var(--color-accent)" />
                  <h3 className="apple-headline" style={{ fontSize: 18 }}>
                    Repositorio de Archivos y Materiales SMR2
                  </h3>
                </div>
                <p className="apple-subheadline" style={{ fontSize: 13, marginTop: 2 }}>
                  Publica chuletas oficiales, scripts de laboratorio, apuntes técnicos y gestiona los recursos del aula.
                </p>
              </div>

              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={() => setMostrarModalSubirArchivo(true)}
                  className="btn-primary"
                  style={{ minHeight: 36, padding: '0 16px', fontSize: 13, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 6 }}
                >
                  <Upload size={14} />
                  <span>Subir Material</span>
                </button>

                <button
                  type="button"
                  onClick={handleExportarCopiaArchivos}
                  className="btn-secondary"
                  style={{ minHeight: 36, padding: '0 12px', fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 6 }}
                  title="Descargar copia de seguridad en JSON de todos los archivos"
                >
                  <Download size={13} />
                  <span>Copia Backup JSON</span>
                </button>
              </div>
            </div>

            {/* Tarjetas resumen */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
              gap: 10,
              paddingTop: 12,
              borderTop: '1px solid var(--color-separator)'
            }}>
              <div style={{ padding: '10px 12px', borderRadius: 10, backgroundColor: 'var(--color-surface-secondary)' }}>
                <span className="apple-caption" style={{ fontSize: 11, color: 'var(--color-secondary-ink)' }}>Total Recursos</span>
                <div style={{ fontSize: 18, fontWeight: 800, marginTop: 2, color: 'var(--color-ink)' }}>
                  {archivosClase.length}
                </div>
              </div>
              <div style={{ padding: '10px 12px', borderRadius: 10, backgroundColor: 'rgba(212, 175, 55, 0.08)' }}>
                <span className="apple-caption" style={{ fontSize: 11, color: '#D4AF37' }}>Materiales Oficiales</span>
                <div style={{ fontSize: 18, fontWeight: 800, marginTop: 2, color: '#D4AF37' }}>
                  {archivosClase.filter(a => a.oficial).length}
                </div>
              </div>
              <div style={{ padding: '10px 12px', borderRadius: 10, backgroundColor: 'var(--color-surface-secondary)' }}>
                <span className="apple-caption" style={{ fontSize: 11, color: 'var(--color-secondary-ink)' }}>Materias Activas</span>
                <div style={{ fontSize: 18, fontWeight: 800, marginTop: 2, color: 'var(--color-accent)' }}>
                  {new Set(archivosClase.map(a => a.materia)).size}
                </div>
              </div>
              <div style={{ padding: '10px 12px', borderRadius: 10, backgroundColor: 'var(--color-surface-secondary)' }}>
                <span className="apple-caption" style={{ fontSize: 11, color: 'var(--color-secondary-ink)' }}>Espacio Estimado</span>
                <div style={{ fontSize: 18, fontWeight: 800, marginTop: 2, color: 'var(--color-positive)' }}>
                  {formatearTamano(archivosClase.reduce((acc, curr) => acc + (curr.file_size || 0), 0))}
                </div>
              </div>
            </div>
          </section>

          {/* Barra de Búsqueda y Filtros */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <div style={{ position: 'relative', flex: 1, minWidth: 220 }}>
                <Search size={15} color="var(--color-secondary-ink)" style={{ position: 'absolute', left: 12, top: 12 }} />
                <input
                  type="text"
                  className="apple-input"
                  value={busquedaArchivo}
                  onChange={(e) => setBusquedaArchivo(e.target.value)}
                  placeholder="Buscar archivo, comando, script o materia..."
                  style={{ paddingLeft: 36, width: '100%', minHeight: 38 }}
                />
              </div>

              <select
                className="apple-input"
                value={filtroMateria}
                onChange={(e) => setFiltroMateria(e.target.value)}
                style={{ minWidth: 200, minHeight: 38 }}
              >
                <option value="todas">Todas las materias</option>
                {MATERIAS_SMR2.map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>

            {/* Chips de tipo de archivo */}
            <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 2, scrollbarWidth: 'none' }}>
              {[
                { id: 'todos', label: `Todos (${archivosClase.length})` },
                { id: 'oficiales', label: `Oficiales (${archivosClase.filter(a => a.oficial).length})` },
                { id: 'codigo', label: `Scripts / Código (${archivosClase.filter(a => detectarTipoArchivo(a.file_name, a.file_type).tipo === 'codigo').length})` },
                { id: 'pdf', label: `PDFs (${archivosClase.filter(a => detectarTipoArchivo(a.file_name, a.file_type).tipo === 'pdf').length})` },
                { id: 'documentos', label: `Documentos (${archivosClase.filter(a => detectarTipoArchivo(a.file_name, a.file_type).tipo === 'documento').length})` }
              ].map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setFiltroTipoArchivo(f.id)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: 9999,
                    border: 'none',
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    backgroundColor: filtroTipoArchivo === f.id ? 'var(--color-accent)' : 'var(--color-fill-secondary)',
                    color: filtroTipoArchivo === f.id ? '#FFFFFF' : 'var(--color-secondary-ink)',
                    transition: 'all 0.15s ease'
                  }}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* Listado de Archivos y Materiales */}
          <section className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--color-separator)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 className="apple-headline" style={{ fontSize: 16 }}>
                Archivos Disponibles ({archivosClase.filter(a => {
                  if (filtroMateria !== 'todas' && a.materia !== filtroMateria) return false
                  const metaInfo = detectarTipoArchivo(a.file_name, a.file_type)
                  if (filtroTipoArchivo === 'oficiales' && !a.oficial) return false
                  if (filtroTipoArchivo === 'pdf' && metaInfo.tipo !== 'pdf') return false
                  if (filtroTipoArchivo === 'codigo' && metaInfo.tipo !== 'codigo') return false
                  if (filtroTipoArchivo === 'documentos' && metaInfo.tipo !== 'documento') return false
                  if (busquedaArchivo.trim()) {
                    const q = busquedaArchivo.toLowerCase()
                    const matchTitulo = a.titulo && a.titulo.toLowerCase().includes(q)
                    const matchMateria = a.materia && a.materia.toLowerCase().includes(q)
                    const matchArchivo = a.file_name && a.file_name.toLowerCase().includes(q)
                    const matchTexto = a.texto && a.texto.toLowerCase().includes(q)
                    const matchAutor = a.autor_nombre && a.autor_nombre.toLowerCase().includes(q)
                    if (!matchTitulo && !matchMateria && !matchArchivo && !matchTexto && !matchAutor) return false
                  }
                  return true
                }).length})
              </h3>
              <span className="apple-caption">
                Organizado por fecha de actualización
              </span>
            </div>

            {archivosClase.filter(a => {
              if (filtroMateria !== 'todas' && a.materia !== filtroMateria) return false
              const metaInfo = detectarTipoArchivo(a.file_name, a.file_type)
              if (filtroTipoArchivo === 'oficiales' && !a.oficial) return false
              if (filtroTipoArchivo === 'pdf' && metaInfo.tipo !== 'pdf') return false
              if (filtroTipoArchivo === 'codigo' && metaInfo.tipo !== 'codigo') return false
              if (filtroTipoArchivo === 'documentos' && metaInfo.tipo !== 'documento') return false
              if (busquedaArchivo.trim()) {
                const q = busquedaArchivo.toLowerCase()
                const matchTitulo = a.titulo && a.titulo.toLowerCase().includes(q)
                const matchMateria = a.materia && a.materia.toLowerCase().includes(q)
                const matchArchivo = a.file_name && a.file_name.toLowerCase().includes(q)
                const matchTexto = a.texto && a.texto.toLowerCase().includes(q)
                const matchAutor = a.autor_nombre && a.autor_nombre.toLowerCase().includes(q)
                if (!matchTitulo && !matchMateria && !matchArchivo && !matchTexto && !matchAutor) return false
              }
              return true
            }).length === 0 ? (
              <div style={{ padding: 40, textAlign: 'center' }}>
                <Folder size={36} color="var(--color-tertiary-ink)" style={{ margin: '0 auto 10px' }} />
                <p className="apple-subheadline" style={{ fontSize: 14 }}>
                  No se encontraron archivos con los filtros seleccionados.
                </p>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => { setFiltroMateria('todas'); setFiltroTipoArchivo('todos'); setBusquedaArchivo('') }}
                  style={{ marginTop: 12, fontSize: 12 }}
                >
                  Restablecer filtros
                </button>
              </div>
            ) : (
              archivosClase.filter(a => {
                if (filtroMateria !== 'todas' && a.materia !== filtroMateria) return false
                const metaInfo = detectarTipoArchivo(a.file_name, a.file_type)
                if (filtroTipoArchivo === 'oficiales' && !a.oficial) return false
                if (filtroTipoArchivo === 'pdf' && metaInfo.tipo !== 'pdf') return false
                if (filtroTipoArchivo === 'codigo' && metaInfo.tipo !== 'codigo') return false
                if (filtroTipoArchivo === 'documentos' && metaInfo.tipo !== 'documento') return false
                if (busquedaArchivo.trim()) {
                  const q = busquedaArchivo.toLowerCase()
                  const matchTitulo = a.titulo && a.titulo.toLowerCase().includes(q)
                  const matchMateria = a.materia && a.materia.toLowerCase().includes(q)
                  const matchArchivo = a.file_name && a.file_name.toLowerCase().includes(q)
                  const matchTexto = a.texto && a.texto.toLowerCase().includes(q)
                  const matchAutor = a.autor_nombre && a.autor_nombre.toLowerCase().includes(q)
                  if (!matchTitulo && !matchMateria && !matchArchivo && !matchTexto && !matchAutor) return false
                }
                return true
              }).map((item, idx, arr) => {
                const tipoInfo = detectarTipoArchivo(item.file_name, item.file_type)
                return (
                  <div
                    key={item.id}
                    style={{
                      padding: '16px',
                      borderBottom: idx < arr.length - 1 ? '0.5px solid var(--color-separator)' : 'none',
                      backgroundColor: item.oficial ? 'rgba(212, 175, 55, 0.02)' : 'transparent',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 10
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 10 }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, flex: 1, minWidth: 260 }}>
                        {/* Insignia de tipo */}
                        <div style={{
                          width: 42,
                          height: 42,
                          borderRadius: 10,
                          backgroundColor: `${tipoInfo.color}15`,
                          color: tipoInfo.color,
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                          border: `1px solid ${tipoInfo.color}30`
                        }}>
                          {tipoInfo.tipo === 'codigo' ? <FileCode size={18} /> : <FileText size={18} />}
                          <span style={{ fontSize: 9, fontWeight: 800, marginTop: 1 }}>{tipoInfo.label}</span>
                        </div>

                        {/* Metadatos y título */}
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 2 }}>
                            <span style={{ fontWeight: 700, fontSize: 15, color: 'var(--color-ink)' }}>
                              {item.titulo}
                            </span>
                            {item.oficial && (
                              <span style={{
                                fontSize: 10,
                                fontWeight: 800,
                                padding: '2px 8px',
                                borderRadius: 6,
                                backgroundColor: 'rgba(212, 175, 55, 0.15)',
                                color: '#D4AF37',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 3
                              }}>
                                <Pin size={10} />
                                <span>OFICIAL</span>
                              </span>
                            )}
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', fontSize: 12, color: 'var(--color-secondary-ink)' }}>
                            <span style={{ fontWeight: 600, color: 'var(--color-accent)' }}>{item.materia}</span>
                            <span>•</span>
                            <span style={{ fontFamily: 'monospace', fontSize: 11 }}>{item.file_name}</span>
                            <span>•</span>
                            <span>{formatearTamano(item.file_size)}</span>
                            <span>•</span>
                            <span>Por {item.autor_nombre}</span>
                            <span>•</span>
                            <span style={{ color: 'var(--color-tertiary-ink)', fontSize: 11 }}>
                              {new Date(item.created_at).toLocaleDateString('es-ES')}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Botones de acción del archivo */}
                      <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                        <button
                          type="button"
                          className="btn-secondary"
                          onClick={() => setModalPreviewArchivo(item)}
                          style={{ minHeight: 32, padding: '4px 10px', fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 4 }}
                          title="Previsualizar e inspeccionar contenido"
                        >
                          <Eye size={13} />
                          <span>Ver</span>
                        </button>

                        <button
                          type="button"
                          className="btn-primary"
                          onClick={() => handleDescargarArchivo(item)}
                          style={{ minHeight: 32, padding: '4px 12px', fontSize: 12, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 4 }}
                          title="Descargar archivo"
                        >
                          <Download size={13} />
                          <span>Descargar</span>
                        </button>

                        <button
                          type="button"
                          className="btn-secondary"
                          onClick={() => handleToggleOficial(item)}
                          style={{
                            minHeight: 32,
                            padding: '4px 10px',
                            fontSize: 12,
                            color: item.oficial ? '#D4AF37' : 'var(--color-secondary-ink)',
                            backgroundColor: item.oficial ? 'rgba(212, 175, 55, 0.1)' : 'transparent',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4
                          }}
                          title={item.oficial ? 'Desmarcar de oficial' : 'Fijar como material oficial'}
                        >
                          <Pin size={13} />
                          <span>{item.oficial ? 'Fijado' : 'Fijar'}</span>
                        </button>

                        <button
                          type="button"
                          className="btn-secondary"
                          onClick={() => setModalEditarArchivo({ archivo: item, titulo: item.titulo, materia: item.materia, texto: item.texto || '' })}
                          style={{ minHeight: 32, padding: '4px 8px', fontSize: 12 }}
                          title="Editar información"
                        >
                          <Edit3 size={13} />
                        </button>

                        <button
                          type="button"
                          className="btn-secondary"
                          onClick={() => handleEliminarArchivo(item)}
                          style={{ minHeight: 32, padding: '4px 8px', fontSize: 12, color: 'var(--color-negative)' }}
                          title="Eliminar recurso"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>

                    {/* Vista previa de fragmento de texto si tiene */}
                    {item.texto && (
                      <div style={{
                        marginTop: 4,
                        padding: '8px 12px',
                        borderRadius: 8,
                        backgroundColor: 'var(--color-surface-secondary)',
                        border: '1px solid var(--color-separator)',
                        fontSize: 12,
                        fontFamily: tipoInfo.tipo === 'codigo' ? 'monospace' : 'inherit',
                        color: 'var(--color-secondary-ink)',
                        maxHeight: 68,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'pre-wrap',
                        lineHeight: 1.4
                      }}>
                        {item.texto.slice(0, 240)}{item.texto.length > 240 ? '...' : ''}
                      </div>
                    )}
                  </div>
                )
              })
            )}
          </section>
        </div>
      )}
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

          {/* 3.1. Notificación Push / Alerta Emergente a toda la clase */}
          <section className="card" style={{ border: '1px solid rgba(0, 122, 255, 0.3)', backgroundColor: 'rgba(0, 122, 255, 0.03)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <Bell size={18} color="#0A84FF" />
              <h3 className="apple-headline" style={{ fontSize: 16 }}>
                Emitir Alerta Push Instantánea a la Clase
              </h3>
            </div>
            <p className="apple-caption" style={{ marginBottom: 12 }}>
              Despliega un aviso prioritario en pantalla completa a todos los alumnos conectados y sus teléfonos al instante.
            </p>

            <form onSubmit={handleLanzarAlertaClase} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <input
                  type="text"
                  className="apple-input"
                  value={tituloAlertaClase}
                  onChange={(e) => setTituloAlertaClase(e.target.value)}
                  placeholder="Título (ej: ¡Atención clase!, Práctica subida, Recordatorio)"
                  style={{ flex: '1 1 200px' }}
                />

                <div style={{ display: 'flex', gap: 4, backgroundColor: 'var(--color-fill-secondary)', padding: 3, borderRadius: 8 }}>
                  <button
                    type="button"
                    onClick={() => setNivelAlertaClase('general')}
                    style={{
                      padding: '4px 10px',
                      borderRadius: 6,
                      fontSize: 12,
                      fontWeight: 600,
                      border: 'none',
                      backgroundColor: nivelAlertaClase === 'general' ? 'var(--color-surface)' : 'transparent',
                      color: nivelAlertaClase === 'general' ? '#0A84FF' : 'var(--color-secondary-ink)',
                      cursor: 'pointer'
                    }}
                  >
                    Informativa
                  </button>
                  <button
                    type="button"
                    onClick={() => setNivelAlertaClase('urgente')}
                    style={{
                      padding: '4px 10px',
                      borderRadius: 6,
                      fontSize: 12,
                      fontWeight: 600,
                      border: 'none',
                      backgroundColor: nivelAlertaClase === 'urgente' ? '#FF3B30' : 'transparent',
                      color: nivelAlertaClase === 'urgente' ? '#FFFFFF' : 'var(--color-secondary-ink)',
                      cursor: 'pointer'
                    }}
                  >
                    Urgente
                  </button>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  type="text"
                  className="apple-input"
                  value={mensajeAlertaClase}
                  onChange={(e) => setMensajeAlertaClase(e.target.value)}
                  placeholder="Mensaje de la notificación (ej: Abrid el Moodle en la tarea 4, tenéis 15 min)"
                  style={{ flex: 1 }}
                />
                <button
                  type="submit"
                  disabled={!mensajeAlertaClase.trim()}
                  className="btn-primary"
                  style={{
                    minHeight: 40,
                    padding: '0 16px',
                    fontSize: 13,
                    fontWeight: 700,
                    backgroundColor: nivelAlertaClase === 'urgente' ? '#D93829' : 'var(--color-accent)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6
                  }}
                >
                  <Send size={14} />
                  <span>Emitir</span>
                </button>
              </div>
            </form>
          </section>

          {/* GESTIÓN Y RETIRADA DE AVISOS Y COMUNICADOS ACTIVOS */}
          <section className="card" style={{ border: '1px solid rgba(255, 149, 0, 0.3)', backgroundColor: 'rgba(255, 149, 0, 0.03)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, flexWrap: 'wrap', gap: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Megaphone size={18} color="#FF9500" />
                <h3 className="apple-headline" style={{ fontSize: 16 }}>
                  Avisos y Comunicados Activos del Aula
                </h3>
              </div>

              {(avisoDiarioActual || megafonoActual) && (
                <button
                  type="button"
                  onClick={handleQuitarTodosAvisos}
                  className="btn-secondary"
                  style={{
                    minHeight: 32,
                    fontSize: 12,
                    color: 'var(--color-negative)',
                    backgroundColor: 'rgba(255, 59, 48, 0.08)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6
                  }}
                  title="Retirar aviso diario y megáfono de un solo clic"
                >
                  <Trash2 size={13} />
                  <span>Quitar Todos los Avisos</span>
                </button>
              )}
            </div>

            <p className="apple-caption" style={{ marginBottom: 14 }}>
              Revisa los avisos emitidos y quítalos en cualquier momento para limpiar el tablón y el chat de los alumnos.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {/* 1. Aviso Diario de Clase (Tablón Pantalla Hoy) */}
              <div style={{
                padding: '12px 14px',
                borderRadius: 12,
                backgroundColor: 'var(--color-surface)',
                border: '1px solid var(--color-separator)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: 8
              }}>
                <div style={{ flex: 1, minWidth: 200 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--color-accent)' }}>
                      Aviso Diario (Tablón de Hoy)
                    </span>
                    <span className={`apple-badge ${avisoDiarioActual ? 'apple-badge-accent' : 'apple-badge-neutral'}`} style={{ fontSize: 10 }}>
                      {avisoDiarioActual ? 'Visible para alumnos' : 'Sin aviso activo'}
                    </span>
                  </div>
                  <div style={{ fontSize: 13, color: avisoDiarioActual ? 'var(--color-ink)' : 'var(--color-tertiary-ink)', fontStyle: avisoDiarioActual ? 'normal' : 'italic', lineHeight: 1.4 }}>
                    {avisoDiarioActual || 'No hay ningún aviso diario publicado hoy.'}
                  </div>
                </div>

                {avisoDiarioActual && (
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={handleQuitarAvisoDiario}
                    style={{ minHeight: 32, fontSize: 12, color: 'var(--color-negative)', display: 'inline-flex', alignItems: 'center', gap: 6 }}
                    title="Eliminar este aviso de las pantallas de los alumnos"
                  >
                    <Trash2 size={13} />
                    <span>Quitar Aviso Diario</span>
                  </button>
                )}
              </div>

              {/* 2. Megáfono Fijado en el Chat */}
              <div style={{
                padding: '12px 14px',
                borderRadius: 12,
                backgroundColor: 'var(--color-surface)',
                border: '1px solid var(--color-separator)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: 8
              }}>
                <div style={{ flex: 1, minWidth: 200 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: '#D4AF37' }}>
                      Megáfono Fijado en Chat
                    </span>
                    <span className={`apple-badge ${megafonoActual ? 'apple-badge-warning' : 'apple-badge-neutral'}`} style={{ fontSize: 10 }}>
                      {megafonoActual ? 'Anclado en la cabecera' : 'Sin megáfono anclado'}
                    </span>
                  </div>
                  <div style={{ fontSize: 13, color: megafonoActual ? 'var(--color-ink)' : 'var(--color-tertiary-ink)', fontStyle: megafonoActual ? 'normal' : 'italic', lineHeight: 1.4 }}>
                    {megafonoActual ? `"${megafonoActual.texto}" (${megafonoActual.autor})` : 'No hay ningún comunicado fijado en la cabecera del chat.'}
                  </div>
                </div>

                {megafonoActual && (
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={handleQuitarMegafono}
                    style={{ minHeight: 32, fontSize: 12, color: 'var(--color-negative)', display: 'inline-flex', alignItems: 'center', gap: 6 }}
                    title="Desanclar megáfono del chat"
                  >
                    <Trash2 size={13} />
                    <span>Retirar Megáfono</span>
                  </button>
                )}
              </div>
            </div>
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
                    {canje.titulo} · <span style={{ color: 'var(--color-secondary-ink)', fontWeight: 400 }}>{canje.costo} SE 💶</span>
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
                        Rechazar y Devolver SE 💶
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
          {/* Barra de Filtros y Búsqueda */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 14 }}>
            <div style={{ position: 'relative' }}>
              <Search size={16} color="var(--color-secondary-ink)" style={{ position: 'absolute', left: 14, top: 12 }} />
              <input
                type="text"
                className="apple-input"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Buscar por nombre, correo o usuario..."
                style={{ paddingLeft: 40 }}
              />
            </div>

            {/* Filtros de estado de usuarios */}
            <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 2, scrollbarWidth: 'none' }}>
              {[
                { id: 'todos', label: `Todos (${todosAlumnos.length})` },
                { id: 'activos', label: `Activos (${todosAlumnos.filter(a => !a.baneado).length})` },
                { id: 'baneados', label: `Baneados (${todosAlumnos.filter(a => a.baneado).length})` },
                { id: 'moderadores', label: `Moderadores (${todosAlumnos.filter(a => a.rol === 'moderador').length})` }
              ].map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setFiltroAlumnos(f.id)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: 9999,
                    border: 'none',
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    backgroundColor: filtroAlumnos === f.id ? 'var(--color-accent)' : 'var(--color-fill-secondary)',
                    color: filtroAlumnos === f.id ? '#FFFFFF' : 'var(--color-secondary-ink)',
                    transition: 'all 0.15s ease'
                  }}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          <section className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--color-separator)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 className="apple-headline" style={{ fontSize: 16 }}>
                Estudiantes ({alumnosFiltrados.length})
              </h3>
              <span className="apple-caption">
                {todosAlumnos.filter(a => a.baneado).length > 0 && (
                  <strong style={{ color: 'var(--color-negative)' }}>
                    {todosAlumnos.filter(a => a.baneado).length} sancionado(s)
                  </strong>
                )}
              </span>
            </div>

            {alumnosFiltrados.length === 0 ? (
              <div style={{ padding: 36, textAlign: 'center' }}>
                <p className="apple-subheadline" style={{ fontSize: 14 }}>
                  No se encontraron estudiantes con este criterio.
                </p>
              </div>
            ) : (
              alumnosFiltrados.map((alumno, i) => (
                <div
                  key={alumno.id}
                  style={{
                    padding: '14px 16px',
                    borderBottom: i < alumnosFiltrados.length - 1 ? '0.5px solid var(--color-separator)' : 'none',
                    backgroundColor: alumno.baneado ? 'rgba(255, 59, 48, 0.03)' : 'transparent'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <InsigniaIniciales nombre={alumno.nombre} color={alumno.baneado ? '#8E8E93' : alumno.color_acento} size={36} />
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                          <span style={{ fontWeight: 700, fontSize: 14, color: alumno.baneado ? 'var(--color-secondary-ink)' : 'var(--color-ink)' }}>
                            {alumno.nombre}
                          </span>
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
                          {alumno.baneado && (
                            <span style={{
                              fontSize: 11,
                              fontWeight: 700,
                              padding: '2px 8px',
                              borderRadius: 6,
                              backgroundColor: 'rgba(255, 59, 48, 0.12)',
                              color: 'var(--color-negative)',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 4
                            }}>
                              <Ban size={12} />
                              <span>Sancionado: {alumno.motivo_ban || 'Baneado'}</span>
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--color-secondary-ink)', marginTop: 2 }}>
                          {alumno.email ? `${alumno.email} · ` : ''}<strong>{alumno.puntos_total || 0} SE 💶</strong> · {alumno.racha_actual || 0} días racha
                        </div>
                      </div>
                    </div>

                    <span className={`apple-badge ${alumno.rol === 'moderador' ? 'apple-badge-accent' : alumno.baneado ? 'apple-badge-negative' : 'apple-badge-neutral'}`} style={{ fontSize: 11 }}>
                      {alumno.rol === 'moderador' ? 'Moderador' : alumno.baneado ? 'Baneado' : 'Alumno'}
                    </span>
                  </div>

                  {/* Acciones directas de moderador */}
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 10 }}>
                    {/* Botón para modificar puntaje exacto y racha */}
                    <button
                      type="button"
                      className="btn-primary"
                      disabled={accionEnCurso === alumno.id}
                      onClick={() => handleAbrirModalPuntaje(alumno)}
                      style={{
                        minHeight: 30,
                        padding: '3px 12px',
                        fontSize: 12,
                        fontWeight: 700,
                        backgroundColor: 'var(--color-accent)',
                        color: '#FFFFFF',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 5
                      }}
                      title="Establecer saldo exacto de StevenEuros o ajustar racha de clase"
                    >
                      <Award size={13} />
                      <span>Modificar StevenEuros</span>
                    </button>

                    <button
                      type="button"
                      className="btn-secondary"
                      disabled={accionEnCurso === alumno.id || alumno.baneado}
                      onClick={() => handleModificarPuntos(alumno.id, 5, 'Participación')}
                      style={{ minHeight: 30, padding: '3px 10px', fontSize: 12 }}
                    >
                      +5 SE (Participar)
                    </button>
                    <button
                      type="button"
                      className="btn-secondary"
                      disabled={accionEnCurso === alumno.id || alumno.baneado}
                      onClick={() => handleModificarPuntos(alumno.id, 10, 'Aporte destacado')}
                      style={{ minHeight: 30, padding: '3px 10px', fontSize: 12 }}
                    >
                      +10 SE (Aporte)
                    </button>
                    <button
                      type="button"
                      className="btn-secondary"
                      disabled={accionEnCurso === alumno.id || alumno.baneado}
                      onClick={() => handleModificarPuntos(alumno.id, 25, 'Premio StevenEuros')}
                      style={{ minHeight: 30, padding: '3px 9px', fontSize: 12, fontWeight: 700, color: 'var(--color-warning)' }}
                      title="Entregar 25 StevenEuros"
                    >
                      +25 SE 💶
                    </button>
                    <button
                      type="button"
                      className="btn-secondary"
                      disabled={accionEnCurso === alumno.id || alumno.baneado}
                      onClick={() => handleModificarPuntos(alumno.id, 50, 'Reto StevenEuros')}
                      style={{ minHeight: 30, padding: '3px 9px', fontSize: 12, fontWeight: 700, color: 'var(--color-warning)' }}
                      title="Entregar 50 StevenEuros"
                    >
                      +50 SE 💶
                    </button>
                    <button
                      type="button"
                      className="btn-secondary"
                      disabled={accionEnCurso === alumno.id || alumno.baneado}
                      onClick={() => handleModificarPuntos(alumno.id, 100, 'Beca StevenEuros')}
                      style={{ minHeight: 30, padding: '3px 9px', fontSize: 12, fontWeight: 700, color: 'var(--color-warning)' }}
                      title="Entregar 100 StevenEuros"
                    >
                      +100 SE 💶
                    </button>
                    <button
                      type="button"
                      className="btn-secondary"
                      disabled={accionEnCurso === alumno.id}
                      onClick={() => handleModificarPuntos(alumno.id, -10, 'Penalización')}
                      style={{ minHeight: 30, padding: '3px 10px', fontSize: 12, color: 'var(--color-negative)' }}
                    >
                      -10 SE (Sanción)
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

                    {/* Botón Banear o Desbanear */}
                    {alumno.baneado ? (
                      <button
                        type="button"
                        className="btn-secondary"
                        disabled={accionEnCurso === alumno.id}
                        onClick={() => handleDesbanearAlumno(alumno)}
                        style={{
                          minHeight: 30,
                          padding: '3px 10px',
                          fontSize: 12,
                          color: 'var(--color-positive)',
                          backgroundColor: 'rgba(52, 199, 89, 0.08)',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4
                        }}
                      >
                        <UserCheck size={13} />
                        <span>Levantar Ban</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="btn-secondary"
                        disabled={accionEnCurso === alumno.id}
                        onClick={() => iniciarBaneo(alumno)}
                        style={{
                          minHeight: 30,
                          padding: '3px 10px',
                          fontSize: 12,
                          color: 'var(--color-negative)',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4
                        }}
                      >
                        <Ban size={13} />
                        <span>Banear</span>
                      </button>
                    )}

                    {/* Botón Eliminar Usuario Permanente */}
                    <button
                      type="button"
                      className="btn-secondary"
                      disabled={accionEnCurso === alumno.id}
                      onClick={() => handleEliminarAlumno(alumno)}
                      style={{
                        minHeight: 30,
                        padding: '3px 10px',
                        fontSize: 12,
                        color: 'var(--color-negative)',
                        backgroundColor: 'rgba(255, 59, 48, 0.08)',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4
                      }}
                      title="Eliminar usuario definitivamente del sistema"
                    >
                      <Trash2 size={13} />
                      <span>Eliminar</span>
                    </button>
                  </div>
                </div>
              ))
            )}
          </section>
        </div>
      )}

      {/* PESTAÑA ECONOMÍA: MODIFICAR MONEDAS Y REGLAS DE GANANCIA */}
      {tab === 'economia' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* 1. MÉTRICAS GENERALES DE ECONOMÍA */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: 12
          }}>
            <div className="card" style={{ padding: '14px 16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--color-secondary-ink)', fontSize: 12, fontWeight: 600 }}>
                <Coins size={16} color="var(--color-warning)" />
                <span>Monedas en Circulación</span>
              </div>
              <div style={{ fontSize: 24, fontWeight: 900, marginTop: 6, color: 'var(--color-ink)' }}>
                {todosAlumnos.reduce((acc, a) => acc + (a.puntos_total || 0), 0).toLocaleString()} 🪙
              </div>
              <div style={{ fontSize: 11, color: 'var(--color-secondary-ink)', marginTop: 2 }}>
                Entre los {todosAlumnos.length} estudiantes del aula
              </div>
            </div>

            <div className="card" style={{ padding: '14px 16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--color-secondary-ink)', fontSize: 12, fontWeight: 600 }}>
                <TrendingUp size={16} color="var(--color-accent)" />
                <span>Multiplicador Activo</span>
              </div>
              <div style={{ fontSize: 24, fontWeight: 900, marginTop: 6, color: 'var(--color-accent)' }}>
                {configRecompensas.multiplicadorGlobal || 1.0}x
              </div>
              <div style={{ fontSize: 11, color: 'var(--color-secondary-ink)', marginTop: 2 }}>
                {Number(configRecompensas.multiplicadorGlobal) > 1.0 ? '⚡ Evento de puntos activado' : 'Ritmo estándar de clase'}
              </div>
            </div>

            <div className="card" style={{ padding: '14px 16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--color-secondary-ink)', fontSize: 12, fontWeight: 600 }}>
                <Users size={16} color="var(--color-positive)" />
                <span>Promedio por Alumno</span>
              </div>
              <div style={{ fontSize: 24, fontWeight: 900, marginTop: 6, color: 'var(--color-ink)' }}>
                {todosAlumnos.length > 0 ? Math.round(todosAlumnos.reduce((acc, a) => acc + (a.puntos_total || 0), 0) / todosAlumnos.length) : 0} 🪙
              </div>
              <div style={{ fontSize: 11, color: 'var(--color-secondary-ink)', marginTop: 2 }}>
                Saldo medio disponible en tienda
              </div>
            </div>
          </div>

          {/* 2. CONFIGURACIÓN DE LO QUE GANAN (REGLAS DE GANANCIA) */}
          <section className="card">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <Sliders size={18} color="var(--color-accent)" />
              <h3 className="apple-headline" style={{ fontSize: 16 }}>
                Reglas de Ganancia de Clase (Lo que ganan)
              </h3>
            </div>
            <p className="apple-caption" style={{ marginBottom: 16 }}>
              Ajusta la cantidad base de monedas y puntos que los alumnos reciben por cada acción en la plataforma.
            </p>

            <form onSubmit={handleGuardarConfigRecompensas} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                gap: 12
              }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 4 }}>
                    🪙 Check-in puntual (15:30)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="1000"
                    className="apple-input"
                    value={configRecompensas.puntosCheckin || 10}
                    onChange={(e) => setConfigRecompensas(prev => ({ ...prev, puntosCheckin: Number(e.target.value) || 0 }))}
                    style={{ width: '100%' }}
                  />
                  <span style={{ fontSize: 11, color: 'var(--color-secondary-ink)' }}>Puntos por sellar asistencia a tiempo</span>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 4 }}>
                    🎯 Completar un Reto de Clase
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="1000"
                    className="apple-input"
                    value={configRecompensas.puntosReto || 25}
                    onChange={(e) => setConfigRecompensas(prev => ({ ...prev, puntosReto: Number(e.target.value) || 0 }))}
                    style={{ width: '100%' }}
                  />
                  <span style={{ fontSize: 11, color: 'var(--color-secondary-ink)' }}>Base por reto verificado y aprobado</span>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 4 }}>
                    📝 Publicar Apunte/Tip en Feed
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="500"
                    className="apple-input"
                    value={configRecompensas.puntosPostFeed || 10}
                    onChange={(e) => setConfigRecompensas(prev => ({ ...prev, puntosPostFeed: Number(e.target.value) || 0 }))}
                    style={{ width: '100%' }}
                  />
                  <span style={{ fontSize: 11, color: 'var(--color-secondary-ink)' }}>Puntos por compartir contenido en el feed</span>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 4 }}>
                    🔥 Bono por Racha Continua
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="500"
                    className="apple-input"
                    value={configRecompensas.bonoRacha || 10}
                    onChange={(e) => setConfigRecompensas(prev => ({ ...prev, bonoRacha: Number(e.target.value) || 0 }))}
                    style={{ width: '100%' }}
                  />
                  <span style={{ fontSize: 11, color: 'var(--color-secondary-ink)' }}>Puntos extra otorgados por mantener racha</span>
                </div>
              </div>

              {/* Selector de Multiplicador Global */}
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 6 }}>
                  ⚡ Multiplicador Global de Recompensas de Clase
                </label>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {[
                    { mult: 1.0, label: 'x1.0 Estándar' },
                    { mult: 1.5, label: 'x1.5 Impulso (+50%)' },
                    { mult: 2.0, label: 'x2.0 Doble Puntos (Examen/Reto)' },
                    { mult: 3.0, label: 'x3.0 Súper Viernes' }
                  ].map(m => {
                    const sel = Number(configRecompensas.multiplicadorGlobal) === m.mult
                    return (
                      <button
                        key={m.mult}
                        type="button"
                        onClick={() => setConfigRecompensas(prev => ({ ...prev, multiplicadorGlobal: m.mult }))}
                        style={{
                          padding: '6px 14px',
                          borderRadius: 9999,
                          border: sel ? '1.5px solid var(--color-accent)' : '1px solid var(--color-separator)',
                          backgroundColor: sel ? 'rgba(0, 122, 255, 0.12)' : 'var(--color-fill-secondary)',
                          color: sel ? 'var(--color-accent)' : 'var(--color-ink)',
                          fontWeight: sel ? 800 : 600,
                          fontSize: 12,
                          cursor: 'pointer',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        {m.label}
                      </button>
                    )
                  })}
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 6 }}>
                <button
                  type="submit"
                  disabled={guardandoRecompensas}
                  className="btn-primary"
                  style={{ minHeight: 38, padding: '6px 20px', fontSize: 13, fontWeight: 700 }}
                >
                  <Check size={15} />
                  <span>{guardandoRecompensas ? 'Guardando...' : 'Guardar Reglas de Ganancia'}</span>
                </button>
              </div>
            </form>
          </section>

          {/* 3. REPARTO MASIVO DE MONEDAS A TODA LA CLASE */}
          <section className="card">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <Zap size={18} color="var(--color-warning)" />
              <h3 className="apple-headline" style={{ fontSize: 16 }}>
                Reparto Masivo de StevenEuros (SE 💶) a Toda la Clase
              </h3>
            </div>
            <p className="apple-caption" style={{ marginBottom: 14 }}>
              Premia a todos los estudiantes registrados al mismo tiempo con StevenEuros tras una dinámica grupal o actividad destacada.
            </p>

            {/* Accesos rápidos de reparto */}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
              {[10, 25, 50, 100].map(cant => (
                <button
                  key={cant}
                  type="button"
                  disabled={enviandoAjusteMasivo}
                  onClick={() => handleAjusteMasivoMonedas(cant, `Premio de +${cant} StevenEuros para toda la clase`)}
                  className="btn-secondary"
                  style={{
                    padding: '8px 14px',
                    fontSize: 13,
                    fontWeight: 700,
                    color: 'var(--color-warning)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6
                  }}
                >
                  <span>+{cant} SE a todos</span>
                </button>
              ))}
            </div>

            {/* Formulario de reparto masivo personalizado */}
            <div style={{
              display: 'flex',
              gap: 10,
              alignItems: 'flex-end',
              flexWrap: 'wrap',
              padding: 12,
              borderRadius: 12,
              backgroundColor: 'var(--color-surface-secondary)',
              border: '1px solid var(--color-separator)'
            }}>
              <div style={{ width: 120 }}>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, marginBottom: 4 }}>
                  Cantidad SE 💶
                </label>
                <input
                  type="number"
                  min="1"
                  max="10000"
                  className="apple-input"
                  value={ajusteMasivoCantidad}
                  onChange={(e) => setAjusteMasivoCantidad(Number(e.target.value) || 0)}
                  style={{ width: '100%' }}
                />
              </div>

              <div style={{ flex: 1, minWidth: 200 }}>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, marginBottom: 4 }}>
                  Concepto / Motivo
                </label>
                <input
                  type="text"
                  className="apple-input"
                  placeholder="Ej: Kahoot de Redes, práctica completada al 100%..."
                  value={ajusteMasivoMotivo}
                  onChange={(e) => setAjusteMasivoMotivo(e.target.value)}
                  style={{ width: '100%' }}
                />
              </div>

              <button
                type="button"
                disabled={enviandoAjusteMasivo || !ajusteMasivoCantidad}
                onClick={() => handleAjusteMasivoMonedas()}
                className="btn-primary"
                style={{
                  minHeight: 38,
                  padding: '6px 18px',
                  fontSize: 13,
                  fontWeight: 700,
                  backgroundColor: 'var(--color-warning)',
                  color: '#000000'
                }}
              >
                <Coins size={14} />
                <span>{enviandoAjusteMasivo ? 'Repartiendo...' : `Repartir +${ajusteMasivoCantidad} SE a Todos`}</span>
              </button>
            </div>
          </section>

          {/* 4. GESTOR INDIVIDUAL DE MONEDAS DE JUGADORES */}
          <section className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{
              padding: '14px 16px',
              borderBottom: '1px solid var(--color-separator)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: 10
            }}>
              <div>
                <h3 className="apple-headline" style={{ fontSize: 16 }}>
                  Modificar StevenEuros (SE 💶) de Jugadores
                </h3>
                <p className="apple-caption" style={{ marginTop: 2 }}>
                  Suma, resta o establece el saldo exacto de StevenEuros (SE 💶) de cada estudiante.
                </p>
              </div>

              {/* Buscador de alumnos */}
              <div style={{ position: 'relative', width: 220 }}>
                <input
                  type="text"
                  className="apple-input"
                  placeholder="Buscar jugador..."
                  value={busquedaEconomia}
                  onChange={(e) => setBusquedaEconomia(e.target.value)}
                  style={{ width: '100%', paddingLeft: 30, fontSize: 12, height: 32 }}
                />
                <Search size={14} style={{ position: 'absolute', left: 9, top: 9, color: 'var(--color-secondary-ink)' }} />
              </div>
            </div>

            {/* Listado de jugadores con controles directos */}
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {todosAlumnos
                .filter(a => {
                  if (!busquedaEconomia.trim()) return true
                  const q = busquedaEconomia.toLowerCase()
                  return (a.nombre || '').toLowerCase().includes(q) || (a.username || '').toLowerCase().includes(q)
                })
                .map((alumno, idx, arr) => {
                  const saldoInput = saldoCustomInputs[alumno.id] ?? alumno.puntos_total ?? 0
                  return (
                    <div
                      key={alumno.id}
                      style={{
                        padding: '12px 16px',
                        borderBottom: idx < arr.length - 1 ? '1px solid var(--color-separator)' : 'none',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        flexWrap: 'wrap',
                        gap: 10,
                        backgroundColor: 'transparent'
                      }}
                    >
                      {/* Información del alumno */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 200 }}>
                        <InsigniaIniciales nombre={alumno.nombre} color={alumno.color_acento || '#0A84FF'} size={34} />
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{ fontWeight: 700, fontSize: 14 }}>{alumno.nombre}</span>
                            {alumno.digito_id && (
                              <span style={{ fontSize: 10, fontWeight: 700, padding: '1px 5px', borderRadius: 4, backgroundColor: 'rgba(0,122,255,0.1)', color: 'var(--color-accent)' }}>
                                {alumno.digito_id}
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: 12, color: 'var(--color-secondary-ink)' }}>
                            <strong style={{ color: 'var(--color-warning)' }}>{alumno.puntos_total || 0} SE 💶</strong> · {alumno.racha_actual || 0}d racha
                          </div>
                        </div>
                      </div>

                      {/* Botones de acción rápida de StevenEuros */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                        <button
                          type="button"
                          className="btn-secondary"
                          disabled={accionEnCurso === alumno.id}
                          onClick={() => handleModificarPuntos(alumno.id, -50, 'Ajuste StevenEuros (-50)')}
                          style={{ minHeight: 28, padding: '2px 8px', fontSize: 11, color: 'var(--color-negative)' }}
                          title="Restar 50 StevenEuros"
                        >
                          -50 SE
                        </button>
                        <button
                          type="button"
                          className="btn-secondary"
                          disabled={accionEnCurso === alumno.id}
                          onClick={() => handleModificarPuntos(alumno.id, -20, 'Ajuste StevenEuros (-20)')}
                          style={{ minHeight: 28, padding: '2px 8px', fontSize: 11, color: 'var(--color-negative)' }}
                          title="Restar 20 StevenEuros"
                        >
                          -20 SE
                        </button>
                        <button
                          type="button"
                          className="btn-secondary"
                          disabled={accionEnCurso === alumno.id}
                          onClick={() => handleModificarPuntos(alumno.id, 20, 'Premio StevenEuros (+20)')}
                          style={{ minHeight: 28, padding: '2px 8px', fontSize: 11, fontWeight: 700, color: 'var(--color-warning)' }}
                          title="Sumar 20 StevenEuros"
                        >
                          +20 SE
                        </button>
                        <button
                          type="button"
                          className="btn-secondary"
                          disabled={accionEnCurso === alumno.id}
                          onClick={() => handleModificarPuntos(alumno.id, 50, 'Premio StevenEuros (+50)')}
                          style={{ minHeight: 28, padding: '2px 8px', fontSize: 11, fontWeight: 700, color: 'var(--color-warning)' }}
                          title="Sumar 50 StevenEuros"
                        >
                          +50 SE
                        </button>
                        <button
                          type="button"
                          className="btn-secondary"
                          disabled={accionEnCurso === alumno.id}
                          onClick={() => handleModificarPuntos(alumno.id, 100, 'Premio StevenEuros (+100)')}
                          style={{ minHeight: 28, padding: '2px 8px', fontSize: 11, fontWeight: 700, color: 'var(--color-warning)' }}
                          title="Sumar 100 StevenEuros"
                        >
                          +100 SE
                        </button>

                        {/* Input para fijar saldo exacto */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginLeft: 4 }}>
                          <input
                            type="number"
                            min="0"
                            className="apple-input"
                            value={saldoInput}
                            onChange={(e) => {
                              const val = e.target.value
                              setSaldoCustomInputs(prev => ({ ...prev, [alumno.id]: val }))
                            }}
                            style={{ width: 68, height: 28, fontSize: 12, padding: '2px 6px', textAlign: 'center' }}
                            title="Saldo exacto de StevenEuros"
                          />
                          <button
                            type="button"
                            className="btn-primary"
                            disabled={accionEnCurso === alumno.id}
                            onClick={() => handleFijarMonedasDirecto(alumno, saldoInput)}
                            style={{ minHeight: 28, padding: '2px 10px', fontSize: 11, fontWeight: 700 }}
                            title="Fijar este saldo exacto de StevenEuros en base de datos"
                          >
                            Fijar SE
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                })}
            </div>
          </section>
        </div>
      )}

      {/* PESTAÑA 5: RETOS Y PREGUNTA FLASH */}
      {tab === 'retos' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* BANDEJA DE COMPROBACIÓN DE RETOS ENTREGADOS POR ALUMNOS */}
          <section className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{
              padding: '14px 16px',
              borderBottom: '1px solid var(--color-separator)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: 8
            }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <CheckCheck size={18} color="var(--color-accent)" />
                  <h3 className="apple-headline" style={{ fontSize: 16 }}>
                    Comprobación de Retos Entregados ({entregasRetos.length})
                  </h3>
                </div>
                <p className="apple-caption" style={{ marginTop: 2 }}>
                  Revisa las pruebas y evidencias de los alumnos antes de acreditar los puntos.
                </p>
              </div>

              {/* Filtros de entregas */}
              <div style={{ display: 'flex', gap: 4 }}>
                {[
                  { id: 'pendientes', label: `Pendientes (${entregasRetos.filter(e => e.estado === 'pendiente').length})` },
                  { id: 'aprobados', label: `Aprobados (${entregasRetos.filter(e => e.estado === 'aprobado').length})` },
                  { id: 'rechazados', label: `Rechazados (${entregasRetos.filter(e => e.estado === 'rechazado').length})` },
                  { id: 'todos', label: 'Todos' }
                ].map(f => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setFiltroEntregasRetos(f.id)}
                    style={{
                      padding: '4px 10px',
                      borderRadius: 8,
                      border: 'none',
                      fontSize: 12,
                      fontWeight: 600,
                      backgroundColor: filtroEntregasRetos === f.id ? 'var(--color-accent)' : 'var(--color-fill-secondary)',
                      color: filtroEntregasRetos === f.id ? '#FFFFFF' : 'var(--color-secondary-ink)',
                      cursor: 'pointer'
                    }}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Listado de entregas */}
            {entregasRetos.filter(e => {
              if (filtroEntregasRetos === 'todos') return true
              return e.estado === filtroEntregasRetos
            }).length === 0 ? (
              <div style={{ padding: 32, textAlign: 'center' }}>
                <p className="apple-subheadline" style={{ fontSize: 14 }}>
                  No hay entregas de retos en esta categoría.
                </p>
              </div>
            ) : (
              entregasRetos.filter(e => {
                if (filtroEntregasRetos === 'todos') return true
                return e.estado === filtroEntregasRetos
              }).map((entrega, idx, arr) => (
                <div
                  key={entrega.id || idx}
                  style={{
                    padding: '14px 16px',
                    borderBottom: idx < arr.length - 1 ? '0.5px solid var(--color-separator)' : 'none',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 8,
                    backgroundColor: entrega.estado === 'pendiente' ? 'rgba(255, 149, 0, 0.03)' : 'transparent'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <InsigniaIniciales nombre={entrega.nombre} color={entrega.color || '#0A84FF'} size={34} />
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ fontWeight: 700, fontSize: 14 }}>{entrega.nombre}</span>
                          {entrega.username && (
                            <span style={{ fontSize: 12, color: 'var(--color-secondary-ink)' }}>
                              @{entrega.username}
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--color-secondary-ink)' }}>
                          Reto: <strong>{entrega.retoTitulo}</strong> · <span style={{ color: 'var(--color-accent)', fontWeight: 700 }}>+{entrega.puntos} SE 💶</span>
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span className={`apple-badge ${
                        entrega.estado === 'aprobado' ? 'apple-badge-positive' : entrega.estado === 'rechazado' ? 'apple-badge-negative' : 'apple-badge-warning'
                      }`} style={{ fontSize: 11 }}>
                        {entrega.estado === 'aprobado' ? 'Aprobado (+SE 💶)' : entrega.estado === 'rechazado' ? 'Rechazado' : 'Pendiente de Revisión'}
                      </span>
                      <span className="apple-caption" style={{ fontSize: 11 }}>
                        {entrega.fecha} {entrega.hora || ''}
                      </span>
                    </div>
                  </div>

                  {/* Evidencia o prueba presentada por el alumno */}
                  <div style={{
                    padding: '10px 12px',
                    borderRadius: 10,
                    backgroundColor: 'var(--color-surface-secondary)',
                    border: '1px solid var(--color-separator)',
                    fontSize: 13,
                    lineHeight: 1.4
                  }}>
                    <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--color-secondary-ink)', marginBottom: 3 }}>
                      Evidencia entregada:
                    </div>
                    <div style={{ color: 'var(--color-ink)', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                      {entrega.evidencia || 'Sin texto de prueba.'}
                    </div>
                    {entrega.feedback && (
                      <div style={{ marginTop: 6, paddingTop: 6, borderTop: '0.5px solid var(--color-separator)', fontSize: 12, color: 'var(--color-tertiary-ink)' }}>
                        Feedback dado: <em>{entrega.feedback}</em>
                      </div>
                    )}
                  </div>

                  {/* Botones de acción del moderador */}
                  {entrega.estado === 'pendiente' && (
                    <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 4 }}>
                      <button
                        type="button"
                        className="btn-secondary"
                        disabled={accionEnCurso === entrega.id}
                        onClick={() => setModalRechazoReto({ entrega, feedback: '' })}
                        style={{ minHeight: 32, padding: '4px 12px', fontSize: 12, color: 'var(--color-negative)' }}
                      >
                        Rechazar con Nota
                      </button>
                      <button
                        type="button"
                        className="btn-primary"
                        disabled={accionEnCurso === entrega.id}
                        onClick={() => handleAprobarEntregaReto(entrega)}
                        style={{ minHeight: 32, padding: '4px 14px', fontSize: 12, fontWeight: 700, backgroundColor: 'var(--color-positive)' }}
                      >
                        Aprobar y Sumar +{entrega.puntos} SE 💶
                      </button>
                    </div>
                  )}
                </div>
              ))
            )}
          </section>

          {/* GESTOR DE RETOS ACTIVOS DEL AULA */}
          <section className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--color-separator)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Target size={18} color="var(--color-accent)" />
                <h3 className="apple-headline" style={{ fontSize: 16 }}>
                  Retos de Clase Disponibles ({retosActivos.length})
                </h3>
              </div>
            </div>

            {retosActivos.length === 0 ? (
              <div style={{ padding: 24, textAlign: 'center' }}>
                <p className="apple-caption">No hay retos en base de datos. Se muestran los retos por defecto del día.</p>
              </div>
            ) : (
              retosActivos.map((r, idx) => (
                <div
                  key={r.id || idx}
                  style={{
                    padding: '12px 16px',
                    borderBottom: idx < retosActivos.length - 1 ? '0.5px solid var(--color-separator)' : 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: 8
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontWeight: 700, fontSize: 14 }}>{r.titulo}</span>
                      <span className="apple-badge apple-badge-accent" style={{ fontSize: 11 }}>
                        +{r.puntos} XP
                      </span>
                      <span className={`apple-badge ${r.activo ? 'apple-badge-positive' : 'apple-badge-neutral'}`} style={{ fontSize: 10 }}>
                        {r.activo ? 'Activo' : 'Pausado'}
                      </span>
                    </div>
                    <p className="apple-caption" style={{ marginTop: 2, maxWidth: 500 }}>
                      {r.descripcion}
                    </p>
                  </div>

                  <div style={{ display: 'flex', gap: 6 }}>
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={() => handleToggleActivoReto(r)}
                      style={{ minHeight: 30, padding: '3px 10px', fontSize: 12 }}
                    >
                      {r.activo ? 'Pausar' : 'Activar'}
                    </button>
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={() => handleEliminarReto(r)}
                      style={{ minHeight: 30, padding: '3px 10px', fontSize: 12, color: 'var(--color-negative)' }}
                    >
                      Eliminar
                    </button>
                  </div>
                </div>
              ))
            )}
          </section>

          {/* Pregunta Flash */}
          <section className="card">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <MessageCircleQuestion size={18} color="var(--color-warning)" />
              <h3 className="apple-headline" style={{ fontSize: 16 }}>
                Lanzar Pregunta Flash para Hoy
              </h3>
            </div>
            <p className="apple-caption" style={{ marginBottom: 14 }}>
              Caduca a medianoche. Los alumnos reciben +5 SE 💶 al responder y ven estadísticas colectivas.
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
                style={{
                  flex: 1,
                  minHeight: 42,
                  fontSize: 14,
                  backgroundColor: modalConfirmacion.peligroso ? 'var(--color-negative)' : undefined,
                  borderColor: modalConfirmacion.peligroso ? 'var(--color-negative)' : undefined
                }}
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

      {/* MODAL PARA BANEAR ALUMNO CON MOTIVO */}
      {modalBaneo && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.55)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          zIndex: 3000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 20
        }}>
          <div className="card" style={{ maxWidth: 440, width: '100%', padding: '28px 24px', textAlign: 'left' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <div style={{
                width: 38,
                height: 38,
                borderRadius: 12,
                backgroundColor: 'rgba(255, 59, 48, 0.12)',
                color: 'var(--color-negative)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Ban size={20} />
              </div>
              <div>
                <h3 className="apple-headline" style={{ fontSize: 17 }}>
                  Suspender y Banear Alumno
                </h3>
                <p className="apple-caption" style={{ marginTop: 1 }}>
                  {modalBaneo.alumno.nombre} {modalBaneo.alumno.email ? `(${modalBaneo.alumno.email})` : ''}
                </p>
              </div>
            </div>

            <p className="apple-subheadline" style={{ fontSize: 13, marginBottom: 16 }}>
              El usuario será expulsado de la plataforma inmediatamente y no podrá acceder al chat ni a la lista de clase mientras esté suspendido.
            </p>

            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-secondary-ink)', display: 'block', marginBottom: 6 }}>
                Motivos frecuentes:
              </label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {[
                  'Conducta inapropiada en el chat de clase',
                  'Spam o flood reiterado de mensajes',
                  'Falta injustificada a clase',
                  'Uso indebido de la plataforma',
                  'Suplantación de identidad'
                ].map(p => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setModalBaneo(prev => ({ ...prev, motivo: p, preset: p }))}
                    style={{
                      padding: '4px 10px',
                      borderRadius: 8,
                      border: '1px solid var(--color-separator)',
                      backgroundColor: modalBaneo.motivo === p ? 'rgba(255, 59, 48, 0.1)' : 'var(--color-surface-secondary)',
                      color: modalBaneo.motivo === p ? 'var(--color-negative)' : 'var(--color-ink)',
                      fontSize: 11,
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-secondary-ink)', display: 'block', marginBottom: 6 }}>
                Motivo que verá el estudiante:
              </label>
              <textarea
                className="apple-input"
                rows={3}
                value={modalBaneo.motivo}
                onChange={(e) => setModalBaneo(prev => ({ ...prev, motivo: e.target.value }))}
                placeholder="Escribe el motivo detallado de la sanción..."
                style={{ width: '100%', resize: 'none', fontSize: 13 }}
                required
              />
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button
                type="button"
                className="btn-primary"
                onClick={confirmarBaneo}
                disabled={!modalBaneo.motivo.trim() || accionEnCurso === modalBaneo.alumno.id}
                style={{
                  flex: 1,
                  minHeight: 42,
                  fontSize: 14,
                  fontWeight: 700,
                  backgroundColor: 'var(--color-negative)',
                  borderColor: 'var(--color-negative)'
                }}
              >
                Confirmar y Banear
              </button>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setModalBaneo(null)}
                style={{ minHeight: 42, fontSize: 14 }}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL PARA CAMBIAR PIN MAESTRO */}
      {mostrarModalPin && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.55)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          zIndex: 3000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 20
        }}>
          <div className="card" style={{ maxWidth: 380, width: '100%', padding: '28px 24px', textAlign: 'left' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <div style={{
                width: 38,
                height: 38,
                borderRadius: 12,
                backgroundColor: 'rgba(10, 132, 255, 0.12)',
                color: 'var(--color-accent)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Key size={20} />
              </div>
              <div>
                <h3 className="apple-headline" style={{ fontSize: 17 }}>
                  Cambiar Clave de Acceso
                </h3>
                <p className="apple-caption" style={{ marginTop: 1 }}>
                  PIN Maestro de Moderación
                </p>
              </div>
            </div>

            <p className="apple-subheadline" style={{ fontSize: 13, marginBottom: 16 }}>
              Define un nuevo código privado para desbloquear el panel en clase.
            </p>

            {errorCambioPin && (
              <div style={{
                padding: '8px 12px',
                borderRadius: 10,
                backgroundColor: 'rgba(255, 59, 48, 0.12)',
                color: 'var(--color-negative)',
                fontSize: 12,
                fontWeight: 600,
                marginBottom: 14
              }}>
                {errorCambioPin}
              </div>
            )}

            <form onSubmit={handleGuardarNuevoPin} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-secondary-ink)', display: 'block', marginBottom: 4 }}>
                  PIN Actual
                </label>
                <input
                  type="password"
                  inputMode="numeric"
                  maxLength={8}
                  placeholder="PIN actual (def: 2026)"
                  value={pinActualInput}
                  onChange={(e) => setPinActualInput(e.target.value)}
                  className="apple-input"
                  style={{ width: '100%', minHeight: 40 }}
                  required
                />
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-secondary-ink)', display: 'block', marginBottom: 4 }}>
                  Nuevo PIN (4 a 8 dígitos)
                </label>
                <input
                  type="password"
                  inputMode="numeric"
                  maxLength={8}
                  placeholder="••••"
                  value={pinNuevoInput}
                  onChange={(e) => setPinNuevoInput(e.target.value.replace(/\D/g, ''))}
                  className="apple-input"
                  style={{ width: '100%', minHeight: 40 }}
                  required
                />
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-secondary-ink)', display: 'block', marginBottom: 4 }}>
                  Confirmar Nuevo PIN
                </label>
                <input
                  type="password"
                  inputMode="numeric"
                  maxLength={8}
                  placeholder="••••"
                  value={pinConfirmarInput}
                  onChange={(e) => setPinConfirmarInput(e.target.value.replace(/\D/g, ''))}
                  className="apple-input"
                  style={{ width: '100%', minHeight: 40 }}
                  required
                />
              </div>

              <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                <button
                  type="submit"
                  className="btn-primary"
                  style={{ flex: 1, minHeight: 42, fontSize: 14, fontWeight: 700 }}
                >
                  Guardar PIN
                </button>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setMostrarModalPin(false)}
                  style={{ minHeight: 42, fontSize: 14 }}
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL PARA MODIFICAR PUNTAJE Y RACHA DE ALUMNO */}
      {modalPuntaje && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.55)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          zIndex: 3000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 20
        }}>
          <div className="card" style={{ maxWidth: 440, width: '100%', padding: '24px', textAlign: 'left', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
              <div style={{
                width: 40,
                height: 40,
                borderRadius: 12,
                backgroundColor: 'rgba(255, 149, 0, 0.12)',
                color: 'var(--color-warning)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Award size={22} />
              </div>
              <div>
                <h3 className="apple-headline" style={{ fontSize: 17 }}>
                  Modificar StevenEuros y Racha
                </h3>
                <p className="apple-caption" style={{ marginTop: 1 }}>
                  {modalPuntaje.alumno.nombre} {modalPuntaje.alumno.username ? `(@${modalPuntaje.alumno.username})` : ''}
                </p>
              </div>
            </div>

            {/* Puntos actuales */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '10px 14px',
              borderRadius: 12,
              backgroundColor: 'var(--color-surface-secondary)',
              marginBottom: 16
            }}>
              <div>
                <span className="apple-caption" style={{ display: 'block' }}>StevenEuros actuales</span>
                <span style={{ fontSize: 18, fontWeight: 700, color: 'var(--color-ink)' }}>
                  {modalPuntaje.alumno.puntos_total || 0} SE 💶
                </span>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span className="apple-caption" style={{ display: 'block' }}>Racha actual</span>
                <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--color-accent)' }}>
                  🔥 {modalPuntaje.alumno.racha_actual || 0} días
                </span>
              </div>
            </div>

            {/* Selector de Modo */}
            <div style={{
              display: 'flex',
              padding: 3,
              backgroundColor: 'var(--color-surface-secondary)',
              borderRadius: 10,
              marginBottom: 16
            }}>
              <button
                type="button"
                onClick={() => setModalPuntaje(p => ({ ...p, modo: 'exacto' }))}
                style={{
                  flex: 1,
                  padding: '7px 0',
                  borderRadius: 8,
                  border: 'none',
                  backgroundColor: modalPuntaje.modo === 'exacto' ? 'var(--color-surface)' : 'transparent',
                  color: modalPuntaje.modo === 'exacto' ? 'var(--color-ink)' : 'var(--color-secondary-ink)',
                  fontWeight: modalPuntaje.modo === 'exacto' ? 700 : 500,
                  fontSize: 13,
                  boxShadow: modalPuntaje.modo === 'exacto' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                  cursor: 'pointer'
                }}
              >
                Saldo Exacto (SE)
              </button>
              <button
                type="button"
                onClick={() => setModalPuntaje(p => ({ ...p, modo: 'delta' }))}
                style={{
                  flex: 1,
                  padding: '7px 0',
                  borderRadius: 8,
                  border: 'none',
                  backgroundColor: modalPuntaje.modo === 'delta' ? 'var(--color-surface)' : 'transparent',
                  color: modalPuntaje.modo === 'delta' ? 'var(--color-ink)' : 'var(--color-secondary-ink)',
                  fontWeight: modalPuntaje.modo === 'delta' ? 700 : 500,
                  fontSize: 13,
                  boxShadow: modalPuntaje.modo === 'delta' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                  cursor: 'pointer'
                }}
              >
                Sumar / Restar (+/-)
              </button>
            </div>

            {modalPuntaje.modo === 'exacto' ? (
              <div style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-secondary-ink)', display: 'block', marginBottom: 4 }}>
                  Nuevo saldo exacto de StevenEuros (SE 💶)
                </label>
                <input
                  type="number"
                  min="0"
                  max="99999"
                  value={modalPuntaje.puntosExactos}
                  onChange={(e) => setModalPuntaje(p => ({ ...p, puntosExactos: e.target.value }))}
                  className="apple-input"
                  style={{ width: '100%', minHeight: 40, fontSize: 16, fontWeight: 700 }}
                  required
                />
              </div>
            ) : (
              <div style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-secondary-ink)', display: 'block', marginBottom: 4 }}>
                  Cantidad de StevenEuros a sumar o restar (usa negativos para restar)
                </label>
                <input
                  type="number"
                  value={modalPuntaje.deltaPuntos}
                  onChange={(e) => setModalPuntaje(p => ({ ...p, deltaPuntos: e.target.value }))}
                  className="apple-input"
                  style={{ width: '100%', minHeight: 40, fontSize: 16, fontWeight: 700 }}
                  required
                />
                <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
                  {[+5, +10, +25, +50, -10, -25].map(val => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setModalPuntaje(p => ({ ...p, deltaPuntos: val }))}
                      style={{
                        padding: '4px 10px',
                        borderRadius: 8,
                        border: '1px solid var(--color-separator)',
                        backgroundColor: Number(modalPuntaje.deltaPuntos) === val ? 'rgba(10, 132, 255, 0.12)' : 'var(--color-surface-secondary)',
                        color: Number(modalPuntaje.deltaPuntos) === val ? 'var(--color-accent)' : 'var(--color-ink)',
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: 'pointer'
                      }}
                    >
                      {val > 0 ? `+${val} SE` : `${val} SE`}
                    </button>
                  ))}
                </div>
                <p className="apple-caption" style={{ marginTop: 6 }}>
                  Resultado final:{' '}
                  <strong>
                    {Math.max(0, (modalPuntaje.alumno.puntos_total || 0) + (Number(modalPuntaje.deltaPuntos) || 0))} SE 💶
                  </strong>
                </p>
              </div>
            )}

            {/* Checkbox para modificar Racha */}
            <div style={{
              padding: '12px',
              borderRadius: 10,
              backgroundColor: 'var(--color-surface-secondary)',
              marginBottom: 14
            }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
                <input
                  type="checkbox"
                  checked={modalPuntaje.modificarRacha}
                  onChange={(e) => setModalPuntaje(p => ({ ...p, modificarRacha: e.target.checked }))}
                />
                <span>Ajustar también racha de días</span>
              </label>
              {modalPuntaje.modificarRacha && (
                <div style={{ marginTop: 10 }}>
                  <label style={{ fontSize: 11, color: 'var(--color-secondary-ink)', display: 'block', marginBottom: 4 }}>
                    Días de racha consecutivos:
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="365"
                    value={modalPuntaje.rachaExacta}
                    onChange={(e) => setModalPuntaje(p => ({ ...p, rachaExacta: e.target.value }))}
                    className="apple-input"
                    style={{ width: '100%', minHeight: 36, fontSize: 14, fontWeight: 700 }}
                  />
                </div>
              )}
            </div>

            {/* Motivo del cambio */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-secondary-ink)', display: 'block', marginBottom: 4 }}>
                Motivo del ajuste
              </label>
              <input
                type="text"
                value={modalPuntaje.motivo}
                onChange={(e) => setModalPuntaje(p => ({ ...p, motivo: e.target.value }))}
                placeholder="Ej: Participación brillante en clase"
                className="apple-input"
                style={{ width: '100%', minHeight: 38, fontSize: 13 }}
              />
              <div style={{ display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
                {['Participación destacada', 'Ayuda a compañero', 'Corrección de error', 'Penalización'].map(preset => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setModalPuntaje(p => ({ ...p, motivo: preset }))}
                    style={{
                      padding: '3px 8px',
                      borderRadius: 6,
                      border: '1px solid var(--color-separator)',
                      backgroundColor: 'transparent',
                      color: 'var(--color-secondary-ink)',
                      fontSize: 11,
                      cursor: 'pointer'
                    }}
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button
                type="button"
                className="btn-primary"
                onClick={handleConfirmarAjustePuntaje}
                disabled={accionEnCurso === modalPuntaje.alumno.id}
                style={{ flex: 1, minHeight: 42, fontSize: 14, fontWeight: 700 }}
              >
                {accionEnCurso === modalPuntaje.alumno.id ? 'Guardando...' : 'Confirmar Ajuste'}
              </button>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setModalPuntaje(null)}
                style={{ minHeight: 42, fontSize: 14 }}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL PARA RECHAZAR ENTREGA DE RETO CON FEEDBACK */}
      {modalRechazoReto && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.55)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          zIndex: 3000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 20
        }}>
          <div className="card" style={{ maxWidth: 440, width: '100%', padding: '24px', textAlign: 'left' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
              <div style={{
                width: 40,
                height: 40,
                borderRadius: 12,
                backgroundColor: 'rgba(255, 59, 48, 0.12)',
                color: 'var(--color-negative)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <AlertCircle size={22} />
              </div>
              <div>
                <h3 className="apple-headline" style={{ fontSize: 17 }}>
                  Rechazar Entrega de Reto
                </h3>
                <p className="apple-caption" style={{ marginTop: 1 }}>
                  {modalRechazoReto.entrega.nombre} · {modalRechazoReto.entrega.retoTitulo}
                </p>
              </div>
            </div>

            <p className="apple-subheadline" style={{ fontSize: 13, marginBottom: 14 }}>
              Indica al estudiante qué debe corregir para que pueda volver a intentarlo y aprender.
            </p>

            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-secondary-ink)', display: 'block', marginBottom: 6 }}>
                Comentario de corrección:
              </label>
              <textarea
                className="apple-input"
                rows={3}
                value={modalRechazoReto.feedback}
                onChange={(e) => setModalRechazoReto(p => ({ ...p, feedback: e.target.value }))}
                placeholder="Explica qué faltó o qué debe corregir el alumno..."
                style={{ width: '100%', resize: 'none', fontSize: 13 }}
                required
              />
            </div>

            <div style={{ marginBottom: 18 }}>
              <label style={{ fontSize: 11, color: 'var(--color-secondary-ink)', display: 'block', marginBottom: 6 }}>
                Sugerencias rápidas:
              </label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {[
                  'Evidencia insuficiente o no adjunta.',
                  'El código o enlace no funciona o no compila.',
                  'La solución no cumple lo pedido en la consigna.',
                  'Por favor explica paso a paso tu procedimiento.'
                ].map(msg => (
                  <button
                    key={msg}
                    type="button"
                    onClick={() => setModalRechazoReto(p => ({ ...p, feedback: msg }))}
                    style={{
                      textAlign: 'left',
                      padding: '6px 10px',
                      borderRadius: 8,
                      border: '1px solid var(--color-separator)',
                      backgroundColor: modalRechazoReto.feedback === msg ? 'rgba(255, 59, 48, 0.08)' : 'var(--color-surface-secondary)',
                      color: modalRechazoReto.feedback === msg ? 'var(--color-negative)' : 'var(--color-ink)',
                      fontSize: 12,
                      cursor: 'pointer'
                    }}
                  >
                    {msg}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button
                type="button"
                className="btn-primary"
                onClick={() => handleRechazarEntregaReto(modalRechazoReto.entrega, modalRechazoReto.feedback)}
                disabled={!modalRechazoReto.feedback?.trim()}
                style={{
                  flex: 1,
                  minHeight: 42,
                  fontSize: 14,
                  fontWeight: 700,
                  backgroundColor: 'var(--color-negative)',
                  borderColor: 'var(--color-negative)'
                }}
              >
                Rechazar con Nota
              </button>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setModalRechazoReto(null)}
                style={{ minHeight: 42, fontSize: 14 }}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL PARA SUBIR NUEVO MATERIAL DE CLASE */}
      {modalSubirArchivo && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.55)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          zIndex: 3000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 20
        }}>
          <div className="card" style={{ maxWidth: 520, width: '100%', padding: '24px', textAlign: 'left', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{
                  width: 38,
                  height: 38,
                  borderRadius: 10,
                  backgroundColor: 'rgba(10, 132, 255, 0.12)',
                  color: 'var(--color-accent)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <Upload size={20} />
                </div>
                <div>
                  <h3 className="apple-headline" style={{ fontSize: 17 }}>
                    Subir Material de Clase SMR2
                  </h3>
                  <p className="apple-caption">Publica recursos, chuletas y guías técnicas</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setMostrarModalSubirArchivo(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: 20,
                  color: 'var(--color-secondary-ink)',
                  cursor: 'pointer',
                  padding: 4
                }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubirArchivo} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {/* Título */}
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-secondary-ink)', display: 'block', marginBottom: 4 }}>
                  Título del recurso *
                </label>
                <input
                  type="text"
                  className="apple-input"
                  value={nuevoArchivoTitulo}
                  onChange={(e) => setNuevoArchivoTitulo(e.target.value)}
                  placeholder="Ej: Chuleta Comandos Linux y Permisos Octales"
                  style={{ width: '100%' }}
                  required
                />
              </div>

              {/* Materia */}
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-secondary-ink)', display: 'block', marginBottom: 4 }}>
                  Materia / Módulo *
                </label>
                <select
                  className="apple-input"
                  value={nuevoArchivoMateria}
                  onChange={(e) => setNuevoArchivoMateria(e.target.value)}
                  style={{ width: '100%' }}
                >
                  {MATERIAS_SMR2.map(m => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>

              {/* Selector de Archivo Local */}
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-secondary-ink)', display: 'block', marginBottom: 4 }}>
                  Archivo adjunto (PDF, Script, Documento, etc.)
                </label>
                <div style={{
                  padding: '16px',
                  borderRadius: 12,
                  border: '1.5px dashed var(--color-separator)',
                  backgroundColor: 'var(--color-surface-secondary)',
                  textAlign: 'center',
                  cursor: 'pointer',
                  position: 'relative'
                }}>
                  <input
                    type="file"
                    onChange={(e) => setArchivoSeleccionado(e.target.files[0] || null)}
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      height: '100%',
                      opacity: 0,
                      cursor: 'pointer'
                    }}
                  />
                  {archivoSeleccionado ? (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                      <FileText size={20} color="var(--color-accent)" />
                      <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-ink)' }}>
                        {archivoSeleccionado.name}
                      </span>
                      <span className="apple-badge apple-badge-neutral" style={{ fontSize: 11 }}>
                        {formatearTamano(archivoSeleccionado.size)}
                      </span>
                    </div>
                  ) : (
                    <div>
                      <Upload size={22} color="var(--color-tertiary-ink)" style={{ margin: '0 auto 6px' }} />
                      <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-ink)', margin: 0 }}>
                        Haz clic o arrastra un archivo aquí
                      </p>
                      <p style={{ fontSize: 11, color: 'var(--color-tertiary-ink)', marginTop: 2 }}>
                        Soporta .pdf, .sh, .ps1, .py, .docx, .sql, .md, .txt, .png (hasta 15 MB)
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Notas Técnicas / Contenido Embebido */}
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-secondary-ink)', display: 'block', marginBottom: 4 }}>
                  Notas técnicas / Código o instrucciones de laboratorio:
                </label>
                <textarea
                  className="apple-input"
                  rows={4}
                  value={nuevoArchivoTexto}
                  onChange={(e) => setNuevoArchivoTexto(e.target.value)}
                  placeholder="Pega comandos, pasos de configuración o resumen técnico para los alumnos..."
                  style={{ width: '100%', resize: 'vertical', fontSize: 12, fontFamily: 'monospace' }}
                />
              </div>

              {/* Checkbox Oficial */}
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', userSelect: 'none' }}>
                <input
                  type="checkbox"
                  checked={nuevoArchivoEsOficial}
                  onChange={(e) => setNuevoArchivoEsOficial(e.target.checked)}
                  style={{ width: 18, height: 18, accentColor: '#D4AF37' }}
                />
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-ink)' }}>
                  Fijar como Material Oficial del Profesor (Destacado en el aula)
                </span>
              </label>

              {/* Acciones */}
              <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                <button
                  type="submit"
                  disabled={subiendoArchivo || !nuevoArchivoTitulo.trim()}
                  className="btn-primary"
                  style={{ flex: 1, minHeight: 42, fontSize: 14, fontWeight: 700 }}
                >
                  {subiendoArchivo ? 'Subiendo material...' : 'Publicar en el Aula'}
                </button>
                <button
                  type="button"
                  onClick={() => setMostrarModalSubirArchivo(false)}
                  className="btn-secondary"
                  style={{ minHeight: 42, fontSize: 14 }}
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DE PREVISUALIZACIÓN E INSPECCIÓN DE ARCHIVO */}
      {modalPreviewArchivo && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.55)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          zIndex: 3000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 20
        }}>
          <div className="card" style={{ maxWidth: 640, width: '100%', padding: '24px', textAlign: 'left', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                  <span className="apple-badge apple-badge-accent" style={{ fontSize: 11 }}>
                    {modalPreviewArchivo.materia}
                  </span>
                  {modalPreviewArchivo.oficial && (
                    <span style={{
                      fontSize: 10,
                      fontWeight: 800,
                      padding: '2px 8px',
                      borderRadius: 6,
                      backgroundColor: 'rgba(212, 175, 55, 0.15)',
                      color: '#D4AF37',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 3
                    }}>
                      <Pin size={10} />
                      <span>OFICIAL</span>
                    </span>
                  )}
                </div>
                <h3 className="apple-headline" style={{ fontSize: 18, marginTop: 4 }}>
                  {modalPreviewArchivo.titulo}
                </h3>
                <p className="apple-caption" style={{ marginTop: 2 }}>
                  {modalPreviewArchivo.file_name} · {formatearTamano(modalPreviewArchivo.file_size)} · Por {modalPreviewArchivo.autor_nombre}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setModalPreviewArchivo(null)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: 20,
                  color: 'var(--color-secondary-ink)',
                  cursor: 'pointer',
                  padding: 4
                }}
              >
                ✕
              </button>
            </div>

            {/* Contenido / Visor */}
            <div style={{
              flex: 1,
              overflowY: 'auto',
              backgroundColor: 'var(--color-surface-secondary)',
              borderRadius: 12,
              border: '1px solid var(--color-separator)',
              padding: '14px',
              marginBottom: 16,
              maxHeight: 380
            }}>
              {modalPreviewArchivo.texto ? (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-secondary-ink)', textTransform: 'uppercase' }}>
                      Contenido / Código Técnico:
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCopiarContenido(modalPreviewArchivo.texto)}
                      className="btn-secondary"
                      style={{ padding: '3px 8px', fontSize: 11, display: 'inline-flex', alignItems: 'center', gap: 4 }}
                    >
                      <Copy size={12} />
                      <span>{copiadoFeedback ? '¡Copiado!' : 'Copiar Texto'}</span>
                    </button>
                  </div>
                  <pre style={{
                    margin: 0,
                    fontFamily: 'monospace',
                    fontSize: 12,
                    lineHeight: 1.5,
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                    color: 'var(--color-ink)'
                  }}>
                    {modalPreviewArchivo.texto}
                  </pre>
                </div>
              ) : (
                <div style={{ padding: 24, textAlign: 'center' }}>
                  <FileText size={32} color="var(--color-accent)" style={{ margin: '0 auto 8px' }} />
                  <p style={{ fontSize: 13, color: 'var(--color-secondary-ink)' }}>
                    Archivo binario o PDF adjunto listo para descargar.
                  </p>
                </div>
              )}
            </div>

            {/* Botones de acción del visor */}
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
              {modalPreviewArchivo.file_url && (
                <button
                  type="button"
                  onClick={() => window.open(modalPreviewArchivo.file_url, '_blank')}
                  className="btn-secondary"
                  style={{ minHeight: 38, fontSize: 13, display: 'inline-flex', alignItems: 'center', gap: 6 }}
                >
                  <ExternalLink size={14} />
                  <span>Abrir Enlace Completo</span>
                </button>
              )}

              <button
                type="button"
                className="btn-primary"
                onClick={() => handleDescargarArchivo(modalPreviewArchivo)}
                style={{ minHeight: 38, padding: '0 18px', fontSize: 13, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 6 }}
              >
                <Download size={14} />
                <span>Descargar en el Ordenador</span>
              </button>

              <button
                type="button"
                className="btn-secondary"
                onClick={() => setModalPreviewArchivo(null)}
                style={{ minHeight: 38, fontSize: 13 }}
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL PARA EDITAR INFORMACIÓN DE ARCHIVO */}
      {modalEditarArchivo && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.55)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          zIndex: 3000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 20
        }}>
          <div className="card" style={{ maxWidth: 480, width: '100%', padding: '24px', textAlign: 'left' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
              <div style={{
                width: 38,
                height: 38,
                borderRadius: 10,
                backgroundColor: 'rgba(10, 132, 255, 0.12)',
                color: 'var(--color-accent)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Edit3 size={18} />
              </div>
              <div>
                <h3 className="apple-headline" style={{ fontSize: 17 }}>
                  Editar Información de Archivo
                </h3>
                <p className="apple-caption">{modalEditarArchivo.archivo.file_name}</p>
              </div>
            </div>

            <form onSubmit={handleGuardarEdicionArchivo} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-secondary-ink)', display: 'block', marginBottom: 4 }}>
                  Título del recurso *
                </label>
                <input
                  type="text"
                  className="apple-input"
                  value={modalEditarArchivo.titulo}
                  onChange={(e) => setModalEditarArchivo(p => ({ ...p, titulo: e.target.value }))}
                  style={{ width: '100%' }}
                  required
                />
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-secondary-ink)', display: 'block', marginBottom: 4 }}>
                  Materia *
                </label>
                <select
                  className="apple-input"
                  value={modalEditarArchivo.materia}
                  onChange={(e) => setModalEditarArchivo(p => ({ ...p, materia: e.target.value }))}
                  style={{ width: '100%' }}
                >
                  {MATERIAS_SMR2.map(m => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-secondary-ink)', display: 'block', marginBottom: 4 }}>
                  Texto / Código / Notas descriptivas:
                </label>
                <textarea
                  className="apple-input"
                  rows={4}
                  value={modalEditarArchivo.texto}
                  onChange={(e) => setModalEditarArchivo(p => ({ ...p, texto: e.target.value }))}
                  style={{ width: '100%', resize: 'vertical', fontSize: 12, fontFamily: 'monospace' }}
                />
              </div>

              <div style={{ display: 'flex', gap: 10, marginTop: 6 }}>
                <button
                  type="submit"
                  className="btn-primary"
                  style={{ flex: 1, minHeight: 42, fontSize: 14, fontWeight: 700 }}
                >
                  Guardar Cambios
                </button>
                <button
                  type="button"
                  onClick={() => setModalEditarArchivo(null)}
                  className="btn-secondary"
                  style={{ minHeight: 42, fontSize: 14 }}
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  )
}
