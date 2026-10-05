// frontend/src/pages/PantallaPerfil.jsx
import { useState, useEffect, useRef, useMemo } from 'react'
import { useAuth } from '../App'
import { NIVELES, COLORES_AVATAR, supabase } from '../utils/supabase'
import { CalendarioActividad } from '../components/CalendarioActividad'
import { AvatarUsuario } from '../components/AvatarUsuario'
import { ArbolCompetencias } from '../components/ArbolCompetencias'
import { TiendaRecompensas } from '../components/TiendaRecompensas'
import { RuletaYoshiModal } from '../games/yoshiRunner/RuletaYoshiModal'
import {
  LogOut,
  Sun,
  Moon,
  Monitor,
  Flame,
  Clock,
  MessageSquare,
  Award,
  Palette,
  Sparkles,
  Check,
  Sliders,
  Shield,
  Terminal,
  Grid,
  Cpu,
  Sunrise,
  FileText,
  Quote,
  Save,
  Tag,
  Lock,
  User,
  AtSign,
  AlertCircle,
  Bell,
  BellRing,
  ShoppingBag,
  Coins,
  History,
  TrendingUp,
  Package,
  Wallet,
  Receipt,
  RotateCcw,
  Zap,
  ChevronRight,
  ExternalLink,
  Crown,
  Stamp,
  Calendar,
  X
} from 'lucide-react'
import { sound, triggerConfetti } from '../utils/haptics'
import { animarEscalonado } from '../utils/animations'
import { transmitirEvento, suscribirEvento } from '../utils/realtimeHub'
import { solicitarPermisoNotificaciones, obtenerEstadoNotificaciones } from '../utils/oneSignal'
import gsap from 'gsap'

// Catálogo de Marcos disponibles en el sistema
const MARCOS_DISPONIBLES = [
  { id: 'ninguno', nombre: 'Clásico', desc: 'Sin borde decorativo', color: '#8E8E93' },
  { id: 'oro', nombre: 'Oro Imperial', desc: 'Doble anillo dorado pulido', color: '#D4AF37' },
  { id: 'fuego', nombre: 'Llama Ardiente', desc: 'Resplandor ámbar de racha', color: '#FF9500' },
  { id: 'cyber', nombre: 'Ciberpunk', desc: 'Neón cian de alta frecuencia', color: '#00F0FF' },
  { id: 'tinta', nombre: 'Sello Carmesí', desc: 'Borde de tinta oficial [PRESENTE]', color: '#FF3B30' },
  { id: 'esmeralda', nombre: 'Esmeralda', desc: 'Consola Matrix verde fosforescente', color: '#34C759' },
  { id: 'obsidiana', nombre: 'Obsidiana', desc: 'Titanio negro satinado mate', color: '#636366' },
]

// Estilos de Banner para la tarjeta de estudiante
const ESTILOS_BANNER = [
  { id: 'cuadricula', nombre: 'Cuaderno Cuadrícula', icon: Grid, desc: 'Trama milimetrada técnica de aula' },
  { id: 'terminal', nombre: 'Consola UNIX', icon: Terminal, desc: 'Línea de comandos bash de sistemas' },
  { id: 'carbon', nombre: 'Fibra de Carbono', icon: Shield, desc: 'Textura mate oscura resistente' },
  { id: 'circuito', nombre: 'Circuito Lógico', icon: Cpu, desc: 'Pistas electrónicas sutiles de hardware' },
  { id: 'amanecer', nombre: 'Amanecer Ámbar', icon: Sunrise, desc: 'Tonalidad cálida de asistencia 15:30' },
  { id: 'minimal', nombre: 'Estudio Minimal', icon: FileText, desc: 'Acabado limpio Apple neutro' },
]

// Títulos y etiquetas predefinidas sugeridas para alumnos
const TITULOS_PRESETS = [
  '⚡ Redes & Scripts God',
  '💻 Linux Root Master',
  '🏆 MVP Aula 15:30',
  '📖 Apuntes de Oro',
  '☕ Fan del Descanso 18:10',
  '🛡️ Pentester Novato',
  '🎯 Racha Imparable',
  '⌨️ Devorador de Terminales',
  '🐧 Gurú Debian & Proxmox'
]

// Frases y lemas predefinidos sugeridos
const FRASES_PRESETS = [
  'Sin miedo al examen de montaje de equipos.',
  'Configurando switches y routers en tiempo récord.',
  'La asistencia de las 15:30 no se negocia.',
  'Terminal abierta, café caliente y racha al día.',
  'Apuntes pulidos y compartidos con el aula.',
  'Permisos 755 memorizados, scripts listos.'
]

export function PantallaPerfil() {
  const { perfil, setPerfil, cerrarSesion } = useAuth()
  
  // Pestaña principal de navegación: 'credencial' | 'mochila' | 'movimientos' | 'skills' | 'personalizar' | 'ajustes'
  const [seccionActiva, setSeccionActiva] = useState('credencial')
  const [tema, setTema] = useState(() => localStorage.getItem('racha_tema') || 'auto')
  
  // Modales interactivos integrados
  const [mostrarTiendaModal, setMostrarTiendaModal] = useState(false)
  const [mostrarRuletaModal, setMostrarRuletaModal] = useState(false)

  // Sub-pestaña dentro del estudio de personalización
  const [pestañaCustom, setPestañaCustom] = useState('estilo') // 'estilo' | 'marcos' | 'titulo'

  // Estados locales editables para personalización
  const [colorAcento, setColorAcento] = useState(perfil?.color_acento || '#0A84FF')
  const [marcoSeleccionado, setMarcoSeleccionado] = useState(perfil?.marco_avatar || 'ninguno')
  const [bannerSeleccionado, setBannerSeleccionado] = useState(perfil?.banner_estilo || 'cuadricula')
  const [tituloPersonalizado, setTituloPersonalizado] = useState(perfil?.titulo_personalizado || perfil?.titulo_vip || '')
  const [fraseEstado, setFraseEstado] = useState(perfil?.frase || perfil?.frase_estado || '')
  const [username, setUsername] = useState(perfil?.username || '')
  const [usernameError, setUsernameError] = useState('')

  const [guardando, setGuardando] = useState(false)
  const [mensajeGuardado, setMensajeGuardado] = useState(false)

  // Mochila e Inventario de artículos
  const [inventario, setInventario] = useState([])
  const [cargandoInventario, setCargandoInventario] = useState(false)

  // Historial de Movimientos del Ledger
  const [movimientosLedger, setMovimientosLedger] = useState([])
  const [cargandoLedger, setCargandoLedger] = useState(false)

  const progressBarRef = useRef(null)
  const pageRef = useRef(null)

  // Estado para notificaciones push OneSignal
  const [pushState, setPushState] = useState({
    soportado: false,
    permiso: false,
    suscrito: false,
    cargando: true
  })

  // Consultar estado de notificaciones al montar
  useEffect(() => {
    obtenerEstadoNotificaciones((estado) => {
      setPushState(prev => ({ ...prev, ...estado, cargando: false }))
    })
  }, [])

  const alternarNotificaciones = async () => {
    if (pushState.suscrito) {
      console.log('Para desactivar, usa la configuración de notificaciones del navegador')
      return
    }
    sound.playPop()
    const concedido = await solicitarPermisoNotificaciones()
    if (concedido) {
      setPushState(prev => ({ ...prev, permiso: true, suscrito: true }))
    }
  }

  // Manejo de tema (Claro / Oscuro / Auto)
  useEffect(() => {
    if (tema === 'auto') {
      document.documentElement.removeAttribute('data-theme')
    } else {
      document.documentElement.setAttribute('data-theme', tema)
    }
    localStorage.setItem('racha_tema', tema)
  }, [tema])

  // Carga inicial y animación de entrada
  useEffect(() => {
    if (pageRef.current) {
      animarEscalonado(pageRef.current.children, { stagger: 0.04, duration: 0.3 })
    }
  }, [seccionActiva])

  // Sincronizar estados locales cuando cambie el perfil
  useEffect(() => {
    if (perfil) {
      setColorAcento(perfil.color_acento || '#0A84FF')
      setMarcoSeleccionado(perfil.marco_avatar || 'ninguno')
      setBannerSeleccionado(perfil.banner_estilo || 'cuadricula')
      setTituloPersonalizado(perfil.titulo_personalizado || perfil.titulo_vip || '')
      setFraseEstado(perfil.frase || perfil.frase_estado || '')
      setUsername(perfil.username || '')
      setUsernameError('')
    }
  }, [perfil?.id, perfil?.color_acento, perfil?.marco_avatar, perfil?.banner_estilo, perfil?.titulo_personalizado, perfil?.frase, perfil?.username])

  // Cargar inventario cuando se abre la pestaña de Mochila
  useEffect(() => {
    if (seccionActiva === 'mochila' && perfil?.id) {
      cargarMochilaUsuario()
    }
  }, [seccionActiva, perfil?.id])

  // Cargar movimientos del ledger cuando se abre la pestaña de Movimientos
  useEffect(() => {
    if (seccionActiva === 'movimientos' && perfil?.id) {
      cargarHistorialLedger()
    }
  }, [seccionActiva, perfil?.id])

  // Cargar Mochila / Inventario
  const cargarMochilaUsuario = async () => {
    if (!perfil?.id) return
    setCargandoInventario(true)
    try {
      const { data: dbInv } = await supabase
        .from('inventario_usuario')
        .select('*')
        .eq('user_id', perfil.id)
        .order('comprado_en', { ascending: false })

      if (dbInv && dbInv.length > 0) {
        setInventario(dbInv)
      } else {
        // Fallback local
        const raw = localStorage.getItem('muudel_inventario_' + perfil.id)
        if (raw) {
          setInventario(JSON.parse(raw))
        } else {
          setInventario([])
        }
      }
    } catch (_) {
      try {
        const raw = localStorage.getItem('muudel_inventario_' + perfil.id)
        setInventario(raw ? JSON.parse(raw) : [])
      } catch (e) {
        setInventario([])
      }
    } finally {
      setCargandoInventario(false)
    }
  }

  // Cargar Movimientos Contables (Transacciones StevenEuros & Monedas)
  const cargarHistorialLedger = async () => {
    if (!perfil?.id) return
    setCargandoLedger(true)
    try {
      const headers = { 'Content-Type': 'application/json', 'x-user-id': perfil.id }
      try {
        const { data: sData } = await supabase.auth.getSession()
        if (sData?.session?.access_token) headers['Authorization'] = `Bearer ${sData.session.access_token}`
      } catch (_) {}

      const res = await fetch('/api/ruleta/historial-ledger', { headers })
      const data = await res.json()
      if (data?.historial && Array.isArray(data.historial)) {
        setMovimientosLedger(data.historial)
      } else {
        setMovimientosLedger([])
      }
    } catch (err) {
      console.warn('Aviso cargando movimientos:', err)
      setMovimientosLedger([])
    } finally {
      setCargandoLedger(false)
    }
  }

  // Equipar o activar artículo de la mochila directamente
  const handleEquiparArticulo = async (item) => {
    sound.playStamp()
    let nuevoPerfil = { ...perfil }

    if (item.categoria === 'marcos' || item.item_id?.startsWith('marco_')) {
      const marcoKey = item.item_id.replace('marco_', '')
      nuevoPerfil.marco_avatar = nuevoPerfil.marco_avatar === marcoKey ? 'ninguno' : marcoKey
      setMarcoSeleccionado(nuevoPerfil.marco_avatar)
      try {
        await supabase.from('profiles').update({ marco_avatar: nuevoPerfil.marco_avatar }).eq('id', perfil.id)
      } catch (_) {}
    } else if (item.categoria === 'titulos' || item.item_id?.startsWith('titulo_')) {
      const tituloTexto = item.titulo || item.item_id
      nuevoPerfil.titulo_personalizado = nuevoPerfil.titulo_personalizado === tituloTexto ? '' : tituloTexto
      nuevoPerfil.titulo_vip = nuevoPerfil.titulo_personalizado
      setTituloPersonalizado(nuevoPerfil.titulo_personalizado)
      try {
        await supabase.from('profiles').update({ titulo_personalizado: nuevoPerfil.titulo_personalizado }).eq('id', perfil.id)
      } catch (_) {}
    }

    setPerfil(nuevoPerfil)
    localStorage.setItem('racha_local_user', JSON.stringify(nuevoPerfil))
    transmitirEvento('perfil_actualizado', nuevoPerfil)
    triggerConfetti()
  }

  if (!perfil) return null

  // Cálculo del nivel y progreso de XP
  const nivel = NIVELES.filter(n => (perfil.puntos_total || 0) >= n.min).pop() || NIVELES[0]
  const siguiente = NIVELES.find(n => (perfil.puntos_total || 0) < n.min)
  const xpEnNivel = (perfil.puntos_total || 0) - nivel.min
  const xpNecesario = siguiente ? siguiente.min - nivel.min : 100
  const progresoPorcentaje = Math.min(Math.max((xpEnNivel / xpNecesario) * 100, 0), 100)

  useEffect(() => {
    if (progressBarRef.current) {
      gsap.fromTo(
        progressBarRef.current,
        { width: '0%' },
        { width: `${progresoPorcentaje}%`, duration: 0.7, ease: 'power2.out', delay: 0.1 }
      )
    }
  }, [progresoPorcentaje, seccionActiva])

  // Obtener estilo visual del banner para la tarjeta de perfil
  const getBannerStyle = (tipo) => {
    switch (tipo) {
      case 'terminal':
        return {
          background: 'linear-gradient(180deg, #1C1C1E 0%, #121214 100%)',
          color: '#30D158',
          borderBottom: '1px solid #2C2C2E',
        }
      case 'carbon':
        return {
          backgroundImage: 'radial-gradient(#3A3A3C 1px, transparent 1px), radial-gradient(#3A3A3C 1px, #1C1C1E 1px)',
          backgroundSize: '16px 16px',
          backgroundPosition: '0 0, 8px 8px',
          backgroundColor: '#1C1C1E',
          borderBottom: '1px solid var(--color-separator)'
        }
      case 'circuito':
        return {
          backgroundImage: 'linear-gradient(to right, rgba(10, 132, 255, 0.08) 1px, transparent 1px), linear-gradient(to bottom, rgba(10, 132, 255, 0.08) 1px, transparent 1px)',
          backgroundSize: '20px 20px',
          backgroundColor: 'var(--color-surface)',
          borderBottom: '1px solid var(--color-separator)'
        }
      case 'amanecer':
        return {
          background: 'linear-gradient(135deg, rgba(255, 159, 10, 0.16) 0%, rgba(255, 69, 58, 0.10) 60%, rgba(191, 90, 242, 0.06) 100%)',
          borderBottom: '1px solid rgba(255, 159, 10, 0.25)'
        }
      case 'minimal':
        return {
          backgroundColor: 'var(--color-surface-secondary)',
          borderBottom: '1px solid var(--color-separator)'
        }
      case 'cuadricula':
      default:
        return {
          backgroundImage: 'radial-gradient(var(--color-separator) 1.2px, transparent 1.2px)',
          backgroundSize: '14px 14px',
          backgroundColor: 'var(--color-surface)',
          borderBottom: '1px solid var(--color-separator)'
        }
    }
  }

  // Guardar personalización del perfil
  const guardarPersonalizacion = async () => {
    setUsernameError('')
    const cleanUsername = username.trim().toLowerCase().replace(/[^a-z0-9_]/g, '')
    if (cleanUsername.length < 2 || cleanUsername.length > 20) {
      setUsernameError('El nombre de usuario debe tener entre 2 y 20 caracteres (solo letras, números y _).')
      return
    }

    setGuardando(true)
    sound.playStamp()

    const perfilActualizado = {
      ...perfil,
      username: cleanUsername,
      color_acento: colorAcento,
      marco_avatar: marcoSeleccionado,
      banner_estilo: bannerSeleccionado,
      titulo_personalizado: tituloPersonalizado.trim(),
      titulo_vip: tituloPersonalizado.trim(),
      frase: fraseEstado.trim(),
      frase_estado: fraseEstado.trim(),
    }

    setPerfil(perfilActualizado)
    localStorage.setItem('racha_local_user', JSON.stringify(perfilActualizado))
    try {
      localStorage.setItem('muudel_user_meta_' + perfil.id, JSON.stringify(perfilActualizado))
    } catch (e) {}

    transmitirEvento('perfil_actualizado', perfilActualizado)

    try {
      await supabase
        .from('profiles')
        .update({
          username: cleanUsername,
          color_acento: colorAcento,
          marco_avatar: marcoSeleccionado,
          banner_estilo: bannerSeleccionado,
          titulo_personalizado: tituloPersonalizado.trim(),
          frase: fraseEstado.trim(),
        })
        .eq('id', perfil.id)
    } catch (e) {
      console.warn('Aviso al guardar perfil en Supabase:', e)
    }

    setGuardando(false)
    setMensajeGuardado(true)
    setTimeout(() => setMensajeGuardado(false), 3000)
    triggerConfetti()
  }

  const insignias = [
    {
      id: '1',
      icon: Flame,
      titulo: 'Primera Racha',
      desc: '3 asistencias consecutivas',
      activo: (perfil.racha_actual || 0) >= 3 || (perfil.mejor_racha || 0) >= 3,
      color: 'var(--color-warning)'
    },
    {
      id: '2',
      icon: Clock,
      titulo: 'Puntualidad 15:30',
      desc: 'Presencia en hora oficial',
      activo: (perfil.puntos_total || 0) >= 10,
      color: 'var(--color-positive)'
    },
    {
      id: '3',
      icon: MessageSquare,
      titulo: 'Compañerismo',
      desc: 'Aportes y comandos en clase',
      activo: true,
      color: 'var(--color-accent)'
    },
    {
      id: '4',
      icon: Award,
      titulo: 'Veterano SMR2',
      desc: 'Constancia continuada en aula',
      activo: (perfil.puntos_total || 0) >= 50,
      color: '#AF52DE'
    },
  ]

  return (
    <main className="app-container" style={{ maxWidth: 760, paddingBottom: 100 }}>
      {/* CABECERA PRINCIPAL CON DATOS ESENCIALES */}
      <header style={{
        marginBottom: 16,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 12
      }}>
        <div>
          <h1 className="apple-large-title" style={{ margin: 0 }}>
            Mi Espacio
          </h1>
          <p className="apple-caption" style={{ margin: '2px 0 0', fontSize: 13, color: 'var(--color-secondary-ink)' }}>
            Expediente, billetera y credenciales de {perfil.nombre}
          </p>
        </div>

        {/* Resumen rápido de saldos en la cabecera */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {/* Chip de StevenEuros */}
          <button
            type="button"
            onClick={() => { sound.playPop(); setMostrarTiendaModal(true) }}
            title="Abrir tienda de recompensas"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
              padding: '6px 12px',
              borderRadius: 9999,
              backgroundColor: 'rgba(52, 199, 89, 0.12)',
              border: '1px solid rgba(52, 199, 89, 0.25)',
              color: 'var(--color-positive)',
              fontSize: 13,
              fontWeight: 800,
              cursor: 'pointer'
            }}
          >
            <Wallet size={14} />
            <span className="tabular-nums">{perfil.puntos_total || 0} SE 💶</span>
          </button>

          {/* Chip de Monedas Yoshi */}
          <button
            type="button"
            onClick={() => { sound.playPop(); setMostrarRuletaModal(true) }}
            title="Girar ruleta de Yoshi"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
              padding: '6px 12px',
              borderRadius: 9999,
              backgroundColor: 'rgba(251, 191, 36, 0.12)',
              border: '1px solid rgba(251, 191, 36, 0.25)',
              color: '#D97706',
              fontSize: 13,
              fontWeight: 800,
              cursor: 'pointer'
            }}
          >
            <Coins size={14} />
            <span className="tabular-nums">{perfil.monedas_ruleta_yoshi || 0} 🪙</span>
          </button>
        </div>
      </header>

      {/* CONTROL SEGMENTADO APPLE: PESTAÑAS DEL APARTADO DE USUARIO */}
      <nav
        aria-label="Pestañas de usuario"
        style={{
          display: 'flex',
          gap: 6,
          backgroundColor: 'var(--color-surface)',
          padding: 6,
          borderRadius: 14,
          border: '1px solid var(--color-separator)',
          marginBottom: 18,
          overflowX: 'auto',
          boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
        }}
      >
        {[
          { id: 'credencial', label: 'Credencial', icon: User },
          { id: 'mochila', label: 'Mochila', icon: Package, count: inventario.length },
          { id: 'movimientos', label: 'Movimientos', icon: Receipt },
          { id: 'skills', label: 'Habilidades', icon: Cpu },
          { id: 'personalizar', label: 'Estudio', icon: Sliders },
          { id: 'ajustes', label: 'Ajustes', icon: Sun },
        ].map((tab) => {
          const activa = seccionActiva === tab.id
          const IconComp = tab.icon
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => { sound.playPop(); setSeccionActiva(tab.id) }}
              style={{
                flex: 1,
                minWidth: 'fit-content',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                padding: '8px 12px',
                borderRadius: 10,
                border: 'none',
                backgroundColor: activa ? 'var(--color-surface-secondary)' : 'transparent',
                color: activa ? 'var(--color-accent)' : 'var(--color-secondary-ink)',
                fontSize: 13,
                fontWeight: activa ? 800 : 600,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                boxShadow: activa ? '0 1px 4px rgba(0,0,0,0.05)' : 'none'
              }}
            >
              <IconComp size={15} />
              <span>{tab.label}</span>
              {tab.count > 0 && (
                <span style={{
                  fontSize: 10,
                  fontWeight: 800,
                  padding: '1px 6px',
                  borderRadius: 9999,
                  backgroundColor: activa ? 'var(--color-accent)' : 'var(--color-fill-secondary)',
                  color: activa ? '#FFFFFF' : 'var(--color-secondary-ink)'
                }}>
                  {tab.count}
                </span>
              )}
            </button>
          )
        })}
      </nav>

      <div ref={pageRef} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

        {/* ========================================================================= */}
        {/* SECCIÓN 1: CREDENCIAL & EXPEDIENTE DE AULA                                */}
        {/* ========================================================================= */}
        {seccionActiva === 'credencial' && (
          <>
            {/* FICHA OFICIAL DE ESTUDIANTE SMR2 (ESTÉTICA ESCOLAR ANTI-IA) */}
            <section
              className="card"
              style={{
                padding: 0,
                overflow: 'hidden',
                boxShadow: '0 4px 20px rgba(0,0,0,0.06)',
                border: '1px solid var(--color-separator)',
                position: 'relative'
              }}
            >
              {/* Banner Temático Superior */}
              <div
                style={{
                  height: 90,
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0 20px',
                  transition: 'all 0.3s ease',
                  ...getBannerStyle(bannerSeleccionado)
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{
                    fontFamily: 'ui-monospace, monospace',
                    fontSize: 11,
                    fontWeight: 800,
                    letterSpacing: 1,
                    textTransform: 'uppercase',
                    padding: '2px 8px',
                    borderRadius: 4,
                    backgroundColor: 'rgba(0,0,0,0.1)',
                    border: '1px solid rgba(0,0,0,0.15)'
                  }}>
                    {perfil.rol === 'moderador' ? '✦ ADMINISTRACIÓN OFICIAL' : '✦ ALUMNO OFICIAL SMR2'}
                  </span>
                </div>

                {/* Sello mecánico de secretaría Anti-IA */}
                <div style={{
                  border: '1.5px solid #D93829',
                  backgroundColor: 'rgba(217, 56, 41, 0.08)',
                  color: '#D93829',
                  padding: '3px 8px',
                  borderRadius: 4,
                  fontSize: 10,
                  fontWeight: 900,
                  fontFamily: 'ui-monospace, monospace',
                  letterSpacing: '0.08em',
                  transform: 'rotate(-2deg)'
                }}>
                  [MATRICULADO · 15:30]
                </div>
              </div>

              {/* Cuerpo de la Credencial */}
              <div style={{ textAlign: 'center', padding: '0 20px 24px 20px', marginTop: -46 }}>
                {/* Avatar con Marco Activo */}
                <div style={{ position: 'relative', display: 'inline-block', marginBottom: 12 }}>
                  <AvatarUsuario
                    nombre={perfil.nombre}
                    color={colorAcento}
                    rol={perfil.rol}
                    size={92}
                    fontSize={34}
                    marco={marcoSeleccionado}
                    showRoleBadge={true}
                  />
                </div>

                {/* Nombre de Registro Inmutable y Dígito */}
                <h2 className="apple-title-1" style={{ fontSize: 24, marginBottom: 4, fontWeight: 900 }}>
                  {perfil.nombre}
                </h2>

                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                  {perfil.digito_id && (
                    <span className="apple-badge apple-badge-accent" style={{ fontSize: 12, fontWeight: 800 }}>
                      Dígito #{perfil.digito_id}
                    </span>
                  )}
                  {perfil.username && (
                    <span style={{ fontSize: 13, color: 'var(--color-secondary-ink)', fontWeight: 600 }}>
                      @{perfil.username}
                    </span>
                  )}
                  <span style={{ fontSize: 11, color: 'var(--color-tertiary-ink)' }}>· 2º SMR Tarde</span>
                </div>

                {/* Título VIP / Condecoración activa */}
                {tituloPersonalizado && (
                  <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 10 }}>
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        fontSize: 12,
                        fontWeight: 800,
                        padding: '4px 14px',
                        borderRadius: 9999,
                        backgroundColor: 'rgba(255, 149, 0, 0.12)',
                        color: '#D97706',
                        border: '1px solid rgba(255, 149, 0, 0.3)',
                        boxShadow: '0 2px 6px rgba(255, 149, 0, 0.08)'
                      }}
                    >
                      <Crown size={13} />
                      <span>{tituloPersonalizado}</span>
                    </span>
                  </div>
                )}

                {/* Frase / Lema Personal */}
                {fraseEstado && (
                  <p
                    style={{
                      fontSize: 13,
                      fontStyle: 'italic',
                      color: 'var(--color-secondary-ink)',
                      maxWidth: 420,
                      margin: '0 auto 14px auto',
                      lineHeight: 1.45
                    }}
                  >
                    "{fraseEstado}"
                  </p>
                )}

                {/* Rango y Barra de Nivel XP */}
                <div style={{
                  backgroundColor: 'var(--color-surface-secondary)',
                  borderRadius: 14,
                  padding: '12px 16px',
                  border: '1px solid var(--color-separator)',
                  marginTop: 8
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Award size={16} color="var(--color-accent)" />
                      <strong style={{ fontSize: 13, color: 'var(--color-ink)' }}>
                        Rango Escolar: {nivel.nombre}
                      </strong>
                    </div>
                    <span className="tabular-nums" style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-secondary-ink)' }}>
                      {perfil.puntos_total || 0} XP acumulados
                    </span>
                  </div>

                  <div style={{
                    height: 8,
                    backgroundColor: 'var(--color-fill-secondary)',
                    borderRadius: 9999,
                    overflow: 'hidden'
                  }}>
                    <div
                      ref={progressBarRef}
                      style={{
                        height: '100%',
                        width: '0%',
                        backgroundColor: colorAcento,
                        borderRadius: 9999,
                        transition: 'background-color 0.25s ease'
                      }}
                    />
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontSize: 11, color: 'var(--color-secondary-ink)' }}>
                    <span>Progreso: {Math.round(progresoPorcentaje)}%</span>
                    <span>{siguiente ? `${xpNecesario - xpEnNivel} SE para ascender a ${siguiente.nombre}` : 'Rango Máximo Alcanzado'}</span>
                  </div>
                </div>
              </div>
            </section>

            {/* BILLETERA DE AULA: STEVENEUROS Y MONEDAS DE YOSHI */}
            <section style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
              gap: 14
            }}>
              {/* Tarjeta StevenEuros */}
              <div className="card" style={{ padding: 18 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                  <div>
                    <span style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.5, color: 'var(--color-positive)' }}>
                      Moneda de Aula
                    </span>
                    <h3 style={{ margin: '2px 0 0', fontSize: 16, fontWeight: 900 }}>
                      StevenEuros (SE 💶)
                    </h3>
                  </div>
                  <div style={{
                    width: 36,
                    height: 36,
                    borderRadius: 10,
                    backgroundColor: 'rgba(52, 199, 89, 0.12)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--color-positive)'
                  }}>
                    <Wallet size={18} />
                  </div>
                </div>

                <div style={{ fontSize: 28, fontWeight: 900, color: 'var(--color-ink)', marginBottom: 12, fontVariantNumeric: 'tabular-nums' }}>
                  {perfil.puntos_total || 0} <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-secondary-ink)' }}>SE</span>
                </div>

                <button
                  type="button"
                  onClick={() => { sound.playPop(); setMostrarTiendaModal(true) }}
                  className="btn-primary"
                  style={{
                    width: '100%',
                    minHeight: 38,
                    fontSize: 13,
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6
                  }}
                >
                  <ShoppingBag size={15} />
                  <span>Abrir Tienda de Recompensas</span>
                </button>
              </div>

              {/* Tarjeta Monedas Yoshi */}
              <div className="card" style={{ padding: 18 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                  <div>
                    <span style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.5, color: '#D97706' }}>
                      Juego Yoshi Island
                    </span>
                    <h3 style={{ margin: '2px 0 0', fontSize: 16, fontWeight: 900 }}>
                      Monedas de Yoshi (🪙)
                    </h3>
                  </div>
                  <div style={{
                    width: 36,
                    height: 36,
                    borderRadius: 10,
                    backgroundColor: 'rgba(251, 191, 36, 0.12)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#D97706'
                  }}>
                    <Coins size={18} />
                  </div>
                </div>

                <div style={{ fontSize: 28, fontWeight: 900, color: 'var(--color-ink)', marginBottom: 12, fontVariantNumeric: 'tabular-nums' }}>
                  {perfil.monedas_ruleta_yoshi || 0} <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-secondary-ink)' }}>/ 1.500 máx</span>
                </div>

                <button
                  type="button"
                  onClick={() => { sound.playPop(); setMostrarRuletaModal(true) }}
                  className="btn-secondary"
                  style={{
                    width: '100%',
                    minHeight: 38,
                    fontSize: 13,
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                    borderColor: 'rgba(251, 191, 36, 0.3)'
                  }}
                >
                  <RotateCcw size={15} color="#D97706" />
                  <span>Girar Ruleta por StevenEuros</span>
                </button>
              </div>
            </section>

            {/* ESTADÍSTICAS OFICIALES DE ASISTENCIA Y RENDIMIENTO */}
            <section className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--color-separator)' }}>
                <h3 className="apple-headline" style={{ margin: 0, fontSize: 15, fontWeight: 800 }}>
                  Estadísticas de Asistencia y Aula
                </h3>
              </div>

              {[
                { label: 'Racha activa de asistencia', valor: `${perfil.racha_actual || 0} días`, icon: Flame, color: 'var(--color-negative)' },
                { label: 'Récord histórico personal', valor: `${perfil.mejor_racha || 0} días`, icon: Award, color: 'var(--color-warning)' },
                { label: 'Pase de lista a las 15:30', valor: perfil.ultimo_checkin ? 'Puntual' : 'Pendiente hoy', icon: Clock, color: 'var(--color-positive)' },
                { label: 'Artículos adquiridos', valor: `${inventario.length} en mochila`, icon: Package, color: 'var(--color-accent)' },
              ].map((item, index, arr) => {
                const IconComp = item.icon
                return (
                  <div
                    key={item.label}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '12px 18px',
                      borderBottom: index < arr.length - 1 ? '1px solid var(--color-separator)' : 'none',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <IconComp size={16} color={item.color} />
                      <span style={{ fontSize: 14, color: 'var(--color-secondary-ink)', fontWeight: 500 }}>
                        {item.label}
                      </span>
                    </div>
                    <span className="tabular-nums" style={{ fontSize: 14, fontWeight: 800, color: 'var(--color-ink)' }}>
                      {item.valor}
                    </span>
                  </div>
                )
              })}
            </section>

            {/* MAPA TÉRMICO DE ASISTENCIA DIARIA */}
            <CalendarioActividad userId={perfil.id} />

            {/* INSIGNIAS CONSEGUIDAS */}
            <section className="card" style={{ padding: 18 }}>
              <h3 className="apple-headline" style={{ margin: '0 0 12px', fontSize: 15, fontWeight: 800 }}>
                Insignias Académicas
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 10 }}>
                {insignias.map((l) => {
                  const IconComp = l.icon
                  return (
                    <div
                      key={l.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        padding: '10px 12px',
                        borderRadius: 12,
                        backgroundColor: 'var(--color-surface-secondary)',
                        border: '1px solid var(--color-separator)',
                        opacity: l.activo ? 1 : 0.45
                      }}
                    >
                      <div style={{
                        width: 34,
                        height: 34,
                        borderRadius: 8,
                        backgroundColor: 'var(--color-surface)',
                        border: '1px solid var(--color-separator)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: l.activo ? l.color : 'var(--color-tertiary-ink)',
                        flexShrink: 0
                      }}>
                        <IconComp size={18} />
                      </div>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-ink)' }}>{l.titulo}</div>
                        <div className="apple-caption" style={{ fontSize: 11 }}>{l.desc}</div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </section>
          </>
        )}

        {/* ========================================================================= */}
        {/* SECCIÓN 2: MOCHILA DIGITAL & ARTÍCULOS                                    */}
        {/* ========================================================================= */}
        {seccionActiva === 'mochila' && (
          <section className="card" style={{ padding: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div>
                <h3 className="apple-headline" style={{ margin: 0, fontSize: 17, fontWeight: 900 }}>
                  Mochila Digital de Aula
                </h3>
                <p className="apple-caption" style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--color-secondary-ink)' }}>
                  Cosméticos, marcos, títulos y poderes adquiridos en la tienda o ruleta.
                </p>
              </div>

              <button
                type="button"
                onClick={() => { sound.playPop(); setMostrarTiendaModal(true) }}
                className="btn-primary"
                style={{ fontSize: 12, padding: '6px 12px', display: 'inline-flex', alignItems: 'center', gap: 5 }}
              >
                <ShoppingBag size={13} />
                <span>Comprar Artículos</span>
              </button>
            </div>

            {cargandoInventario && (
              <div style={{ padding: '36px 0', textAlign: 'center', color: 'var(--color-secondary-ink)' }}>
                <Package size={28} style={{ opacity: 0.4, margin: '0 auto 8px', display: 'block' }} />
                <span>Cargando mochila de alumno...</span>
              </div>
            )}

            {!cargandoInventario && inventario.length === 0 && (
              <div style={{
                textAlign: 'center',
                padding: '40px 20px',
                backgroundColor: 'var(--color-surface-secondary)',
                borderRadius: 14,
                border: '1px dashed var(--color-separator)'
              }}>
                <Package size={36} color="var(--color-tertiary-ink)" style={{ margin: '0 auto 10px', display: 'block' }} />
                <h4 style={{ margin: '0 0 6px', fontSize: 15, fontWeight: 800 }}>Tu mochila está vacía</h4>
                <p style={{ margin: '0 0 16px', fontSize: 13, color: 'var(--color-secondary-ink)', maxWidth: 320, marginLeft: 'auto', marginRight: 'auto' }}>
                  Acumula StevenEuros con tu asistencia y girando la ruleta para equipar marcos dorados, apodos y ventajas de clase.
                </p>
                <button
                  type="button"
                  onClick={() => { sound.playPop(); setMostrarTiendaModal(true) }}
                  className="btn-primary"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 16px' }}
                >
                  <ShoppingBag size={14} />
                  <span>Explorar Tienda de Recompensas</span>
                </button>
              </div>
            )}

            {!cargandoInventario && inventario.length > 0 && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12 }}>
                {inventario.map((item) => {
                  const esMarco = item.categoria === 'marcos' || item.item_id?.startsWith('marco_')
                  const esTitulo = item.categoria === 'titulos' || item.item_id?.startsWith('titulo_')
                  const marcoKey = esMarco ? item.item_id.replace('marco_', '') : null
                  const estaEquipado = esMarco ? perfil.marco_avatar === marcoKey : (esTitulo && perfil.titulo_personalizado === item.titulo)

                  return (
                    <div
                      key={item.id}
                      style={{
                        padding: 14,
                        borderRadius: 14,
                        backgroundColor: 'var(--color-surface-secondary)',
                        border: estaEquipado ? '2px solid var(--color-accent)' : '1px solid var(--color-separator)',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        gap: 10
                      }}
                    >
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                          <span style={{
                            fontSize: 10,
                            fontWeight: 800,
                            textTransform: 'uppercase',
                            padding: '2px 7px',
                            borderRadius: 6,
                            backgroundColor: estaEquipado ? 'rgba(10, 132, 255, 0.15)' : 'var(--color-fill-secondary)',
                            color: estaEquipado ? 'var(--color-accent)' : 'var(--color-secondary-ink)'
                          }}>
                            {estaEquipado ? '✓ Equipado' : item.categoria || 'Objeto'}
                          </span>
                        </div>

                        <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--color-ink)', marginBottom: 2 }}>
                          {item.titulo || item.item_id}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--color-secondary-ink)', lineHeight: 1.35 }}>
                          {item.duracion_texto || 'Mejora de alumno'}
                        </div>
                      </div>

                      {(esMarco || esTitulo) && (
                        <button
                          type="button"
                          onClick={() => handleEquiparArticulo(item)}
                          className={estaEquipado ? 'btn-secondary' : 'btn-primary'}
                          style={{
                            width: '100%',
                            minHeight: 32,
                            fontSize: 12,
                            fontWeight: 700,
                            padding: '4px 10px'
                          }}
                        >
                          {estaEquipado ? 'Desequipar' : 'Equipar'}
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </section>
        )}

        {/* ========================================================================= */}
        {/* SECCIÓN 3: MOVIMIENTOS & HISTORIAL CONTABLE                               */}
        {/* ========================================================================= */}
        {seccionActiva === 'movimientos' && (
          <section className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--color-separator)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 className="apple-headline" style={{ margin: 0, fontSize: 16, fontWeight: 900 }}>
                  Libro Mayor Contable Personal
                </h3>
                <p className="apple-caption" style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--color-secondary-ink)' }}>
                  Registro auditado de StevenEuros y Monedas Yoshi
                </p>
              </div>
              <button
                type="button"
                onClick={cargarHistorialLedger}
                style={{ background: 'none', border: 'none', color: 'var(--color-accent)', cursor: 'pointer', fontSize: 12, fontWeight: 700 }}
              >
                Actualizar
              </button>
            </div>

            {cargandoLedger && (
              <div style={{ padding: '36px 0', textAlign: 'center', color: 'var(--color-secondary-ink)' }}>
                <Receipt size={28} style={{ opacity: 0.4, margin: '0 auto 8px', display: 'block' }} />
                <span>Consultando movimientos en la banca...</span>
              </div>
            )}

            {!cargandoLedger && movimientosLedger.length === 0 && (
              <div style={{ textAlign: 'center', padding: '36px 20px', color: 'var(--color-secondary-ink)' }}>
                <Receipt size={32} style={{ opacity: 0.4, margin: '0 auto 8px', display: 'block' }} />
                <h4 style={{ margin: '0 0 4px', fontSize: 14, fontWeight: 800 }}>Sin movimientos recientes</h4>
                <p style={{ margin: 0, fontSize: 12 }}>Tus tiradas de ruleta, asistencia y compras se registrarán aquí.</p>
              </div>
            )}

            {!cargandoLedger && movimientosLedger.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {movimientosLedger.map((mov, idx) => {
                  const esPositivo = Number(mov.cantidad) > 0
                  const fechaStr = new Date(mov.created_at).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })

                  return (
                    <div
                      key={mov.id || idx}
                      style={{
                        padding: '12px 20px',
                        borderBottom: idx < movimientosLedger.length - 1 ? '1px solid var(--color-separator)' : 'none',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 12
                      }}
                    >
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {mov.motivo || 'Movimiento contable'}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--color-secondary-ink)', marginTop: 2 }}>
                          {fechaStr} · Saldo: {mov.saldo_posterior} {mov.moneda === 'monedas_yoshi' ? '🪙' : 'SE'}
                        </div>
                      </div>

                      <div style={{
                        fontSize: 14,
                        fontWeight: 900,
                        fontVariantNumeric: 'tabular-nums',
                        color: esPositivo ? 'var(--color-positive)' : 'var(--color-ink)',
                        flexShrink: 0
                      }}>
                        {esPositivo ? `+${mov.cantidad}` : mov.cantidad} {mov.moneda === 'monedas_yoshi' ? '🪙' : 'SE 💶'}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </section>
        )}

        {/* ========================================================================= */}
        {/* SECCIÓN 4: ÁRBOL DE COMPETENCIAS TÉCNICAS SMR2                            */}
        {/* ========================================================================= */}
        {seccionActiva === 'skills' && (
          <ArbolCompetencias perfil={perfil} />
        )}

        {/* ========================================================================= */}
        {/* SECCIÓN 5: ESTUDIO DE PERSONALIZACIÓN                                     */}
        {/* ========================================================================= */}
        {seccionActiva === 'personalizar' && (
          <>
            {/* IDENTIDAD: NOMBRE OFICIAL BLOQUEADO Y USERNAME EDITABLE */}
            <section className="card" style={{ padding: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                <div style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  backgroundColor: 'rgba(10, 132, 255, 0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--color-accent)'
                }}>
                  <User size={16} />
                </div>
                <div>
                  <h3 className="apple-headline" style={{ margin: 0, fontSize: 16 }}>
                    Identidad y Alias Público
                  </h3>
                  <p className="apple-caption" style={{ margin: 0, fontSize: 12 }}>
                    Nombre oficial inmutable y @usuario editable para la clase.
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {/* 1. Nombre oficial bloqueado */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <label className="apple-caption" style={{ fontWeight: 600, color: 'var(--color-secondary-ink)' }}>
                      Nombre de Matrícula Oficial
                    </label>
                    <span style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                      fontSize: 11,
                      fontWeight: 700,
                      color: 'var(--color-secondary-ink)',
                      backgroundColor: 'var(--color-fill-secondary)',
                      padding: '2px 8px',
                      borderRadius: 6
                    }}>
                      <Lock size={11} />
                      <span>Protegido por Aula</span>
                    </span>
                  </div>
                  <input
                    type="text"
                    className="apple-input"
                    value={perfil.nombre}
                    disabled
                    readOnly
                    style={{
                      backgroundColor: 'var(--color-fill-secondary)',
                      color: 'var(--color-ink)',
                      fontWeight: 600,
                      cursor: 'not-allowed',
                      opacity: 0.85
                    }}
                  />
                  <p className="apple-caption" style={{ fontSize: 11, marginTop: 4, color: 'var(--color-tertiary-ink)' }}>
                    🔒 Asignado en tu matrícula oficial de clase para garantizar el pase de lista de las 15:30.
                  </p>
                </div>

                {/* 2. @Username editable */}
                <div>
                  <label className="apple-caption" style={{ display: 'block', marginBottom: 6, fontWeight: 600 }}>
                    Nombre de Usuario (@alias en chat, ranking y feed)
                  </label>
                  <div style={{ position: 'relative' }}>
                    <div style={{
                      position: 'absolute',
                      left: 12,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      color: 'var(--color-accent)',
                      fontWeight: 700,
                      fontSize: 14
                    }}>
                      @
                    </div>
                    <input
                      type="text"
                      className="apple-input"
                      value={username}
                      onChange={(e) => {
                        const val = e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '')
                        setUsername(val)
                        if (usernameError) setUsernameError('')
                      }}
                      placeholder="ej: juanito_smr"
                      maxLength={20}
                      style={{ paddingLeft: 30, fontSize: 14, fontWeight: 600 }}
                    />
                  </div>
                  {usernameError && (
                    <p style={{ fontSize: 12, color: 'var(--color-negative)', marginTop: 4, fontWeight: 600 }}>
                      {usernameError}
                    </p>
                  )}
                </div>
              </div>
            </section>

            {/* ESTUDIO DE PERSONALIZACIÓN: COLOR, MARCO, BANNER Y LEMA */}
            <section className="card" style={{ padding: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{
                    width: 32,
                    height: 32,
                    borderRadius: 8,
                    backgroundColor: 'rgba(10, 132, 255, 0.1)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--color-accent)'
                  }}>
                    <Sliders size={16} />
                  </div>
                  <div>
                    <h3 className="apple-headline" style={{ margin: 0, fontSize: 16 }}>
                      Aspecto Visual
                    </h3>
                    <p className="apple-caption" style={{ margin: 0, fontSize: 12 }}>
                      Personaliza tu presencia gráfica en toda la plataforma.
                    </p>
                  </div>
                </div>

                {mensajeGuardado && (
                  <span style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                    fontSize: 12,
                    fontWeight: 700,
                    color: 'var(--color-positive)',
                    backgroundColor: 'rgba(52, 199, 89, 0.12)',
                    padding: '4px 10px',
                    borderRadius: 9999
                  }}>
                    <Check size={13} />
                    <span>Guardado</span>
                  </span>
                )}
              </div>

              {/* Selector de Pestaña de Personalización */}
              <div className="segmented-control" style={{ marginBottom: 16 }}>
                <button
                  className={`segmented-control-item ${pestañaCustom === 'estilo' ? 'active' : ''}`}
                  onClick={() => { sound.playPop(); setPestañaCustom('estilo') }}
                  style={{ gap: 6 }}
                >
                  <Palette size={14} />
                  <span>Color Acento</span>
                </button>
                <button
                  className={`segmented-control-item ${pestañaCustom === 'marcos' ? 'active' : ''}`}
                  onClick={() => { sound.playPop(); setPestañaCustom('marcos') }}
                  style={{ gap: 6 }}
                >
                  <Sparkles size={14} />
                  <span>Marco & Banner</span>
                </button>
                <button
                  className={`segmented-control-item ${pestañaCustom === 'titulo' ? 'active' : ''}`}
                  onClick={() => { sound.playPop(); setPestañaCustom('titulo') }}
                  style={{ gap: 6 }}
                >
                  <Tag size={14} />
                  <span>Título & Lema</span>
                </button>
              </div>

              {/* PESTAÑA 1: COLOR DE ACENTO */}
              {pestañaCustom === 'estilo' && (
                <div>
                  <label className="apple-caption" style={{ display: 'block', marginBottom: 10, fontWeight: 600 }}>
                    Paleta del sistema para tu avatar, barra de nivel e insignias:
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
                    {COLORES_AVATAR.map((c) => {
                      const esActivo = colorAcento === c
                      return (
                        <button
                          key={c}
                          onClick={() => { sound.playPop(); setColorAcento(c) }}
                          style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: 6,
                            padding: '10px 6px',
                            borderRadius: 12,
                            backgroundColor: esActivo ? 'var(--color-surface-secondary)' : 'transparent',
                            border: esActivo ? `2px solid ${c}` : '1px solid var(--color-separator)',
                            cursor: 'pointer',
                            transition: 'all 0.15s ease'
                          }}
                        >
                          <div style={{
                            width: 32,
                            height: 32,
                            borderRadius: 9999,
                            backgroundColor: c,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#FFFFFF',
                            boxShadow: '0 2px 5px rgba(0,0,0,0.15)',
                            transform: esActivo ? 'scale(1.1)' : 'none'
                          }}>
                            {esActivo && <Check size={16} strokeWidth={3} />}
                          </div>
                          <span className="apple-caption" style={{ fontSize: 11, fontWeight: esActivo ? 700 : 500 }}>
                            {c}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* PESTAÑA 2: MARCO & BANNER */}
              {pestañaCustom === 'marcos' && (
                <div>
                  {/* Selector de Marcos */}
                  <div style={{ marginBottom: 18 }}>
                    <label className="apple-caption" style={{ display: 'block', marginBottom: 8, fontWeight: 600 }}>
                      Marco de avatar:
                    </label>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 8 }}>
                      {MARCOS_DISPONIBLES.map((m) => {
                        const seleccionado = marcoSeleccionado === m.id
                        return (
                          <button
                            key={m.id}
                            onClick={() => { sound.playPop(); setMarcoSeleccionado(m.id) }}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 10,
                              padding: '8px 10px',
                              borderRadius: 12,
                              border: seleccionado ? `2px solid ${m.color}` : '1px solid var(--color-separator)',
                              backgroundColor: seleccionado ? 'var(--color-surface-secondary)' : 'var(--color-surface)',
                              cursor: 'pointer',
                              textAlign: 'left',
                              transition: 'all 0.15s ease'
                            }}
                          >
                            <div style={{
                              width: 22,
                              height: 22,
                              borderRadius: 9999,
                              border: `3px solid ${m.color}`,
                              backgroundColor: 'var(--color-surface)',
                              flexShrink: 0
                            }} />
                            <div style={{ minWidth: 0 }}>
                              <div style={{ fontSize: 12, fontWeight: seleccionado ? 700 : 600 }}>{m.nombre}</div>
                              <div className="apple-caption" style={{ fontSize: 10, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {m.desc}
                              </div>
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  {/* Selector de Banner */}
                  <div>
                    <label className="apple-caption" style={{ display: 'block', marginBottom: 8, fontWeight: 600 }}>
                      Textura de cabecera de credencial escolar:
                    </label>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
                      {ESTILOS_BANNER.map((b) => {
                        const IconComp = b.icon
                        const seleccionado = bannerSeleccionado === b.id
                        return (
                          <button
                            key={b.id}
                            onClick={() => { sound.playPop(); setBannerSeleccionado(b.id) }}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 10,
                              padding: '10px 12px',
                              borderRadius: 12,
                              border: seleccionado ? '2px solid var(--color-accent)' : '1px solid var(--color-separator)',
                              backgroundColor: seleccionado ? 'var(--color-surface-secondary)' : 'var(--color-surface)',
                              cursor: 'pointer',
                              textAlign: 'left',
                              transition: 'all 0.15s ease'
                            }}
                          >
                            <div style={{
                              width: 32,
                              height: 32,
                              borderRadius: 8,
                              backgroundColor: 'var(--color-fill-secondary)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: seleccionado ? 'var(--color-accent)' : 'var(--color-ink)',
                              flexShrink: 0
                            }}>
                              <IconComp size={16} />
                            </div>
                            <div>
                              <div style={{ fontSize: 12, fontWeight: seleccionado ? 700 : 600 }}>{b.nombre}</div>
                              <div className="apple-caption" style={{ fontSize: 10 }}>{b.desc}</div>
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* PESTAÑA 3: TÍTULO & LEMA PERSONAL */}
              {pestañaCustom === 'titulo' && (
                <div>
                  <div style={{ marginBottom: 16 }}>
                    <label className="apple-caption" style={{ display: 'block', marginBottom: 6, fontWeight: 600 }}>
                      Título Honorífico o Apodo de Aula:
                    </label>
                    <input
                      type="text"
                      className="apple-input"
                      value={tituloPersonalizado}
                      onChange={(e) => setTituloPersonalizado(e.target.value)}
                      placeholder="Ej: ⚡ Redes & Scripts God"
                      maxLength={32}
                      style={{ fontSize: 14 }}
                    />
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                      {TITULOS_PRESETS.map((t) => (
                        <button
                          key={t}
                          onClick={() => { sound.playPop(); setTituloPersonalizado(t) }}
                          style={{
                            fontSize: 11,
                            fontWeight: 600,
                            padding: '3px 8px',
                            borderRadius: 6,
                            backgroundColor: 'var(--color-fill-secondary)',
                            color: 'var(--color-secondary-ink)',
                            border: '1px solid var(--color-separator)',
                            cursor: 'pointer'
                          }}
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="apple-caption" style={{ display: 'block', marginBottom: 6, fontWeight: 600 }}>
                      Frase de Estado o Lema de Pupitre:
                    </label>
                    <input
                      type="text"
                      className="apple-input"
                      value={fraseEstado}
                      onChange={(e) => setFraseEstado(e.target.value)}
                      placeholder="Ej: Configurando switches y routers en tiempo récord."
                      maxLength={80}
                      style={{ fontSize: 14 }}
                    />
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                      {FRASES_PRESETS.map((f) => (
                        <button
                          key={f}
                          onClick={() => { sound.playPop(); setFraseEstado(f) }}
                          style={{
                            fontSize: 11,
                            padding: '3px 8px',
                            borderRadius: 6,
                            backgroundColor: 'var(--color-fill-secondary)',
                            color: 'var(--color-secondary-ink)',
                            border: '1px solid var(--color-separator)',
                            cursor: 'pointer'
                          }}
                        >
                          "{f}"
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Botón de Guardar Cambios */}
              <div style={{ marginTop: 18, borderTop: '1px solid var(--color-separator)', paddingTop: 14 }}>
                <button
                  className="btn-primary"
                  onClick={guardarPersonalizacion}
                  disabled={guardando}
                  style={{
                    width: '100%',
                    backgroundColor: 'var(--color-accent)',
                    color: '#FFFFFF',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    padding: '12px 18px',
                    fontSize: 14,
                    fontWeight: 800,
                    borderRadius: 12
                  }}
                >
                  <Save size={16} />
                  <span>{guardando ? 'Guardando en la nube...' : 'Guardar Cambios de Perfil'}</span>
                </button>
              </div>
            </section>
          </>
        )}

        {/* ========================================================================= */}
        {/* SECCIÓN 6: AJUSTES, PREFERENCIAS Y SESIÓN                                 */}
        {/* ========================================================================= */}
        {seccionActiva === 'ajustes' && (
          <>
            {/* Selector de Apariencia */}
            <section className="card" style={{ padding: 18 }}>
              <h3 className="apple-headline" style={{ fontSize: 15, marginBottom: 12 }}>
                Tema y Apariencia
              </h3>
              <div className="segmented-control">
                <button
                  className={`segmented-control-item ${tema === 'light' ? 'active' : ''}`}
                  onClick={() => { sound.playPop(); setTema('light') }}
                  style={{ gap: 6 }}
                >
                  <Sun size={15} />
                  <span>Claro</span>
                </button>
                <button
                  className={`segmented-control-item ${tema === 'dark' ? 'active' : ''}`}
                  onClick={() => { sound.playPop(); setTema('dark') }}
                  style={{ gap: 6 }}
                >
                  <Moon size={15} />
                  <span>Oscuro</span>
                </button>
                <button
                  className={`segmented-control-item ${tema === 'auto' ? 'active' : ''}`}
                  onClick={() => { sound.playPop(); setTema('auto') }}
                  style={{ gap: 6 }}
                >
                  <Monitor size={15} />
                  <span>Automático</span>
                </button>
              </div>
            </section>

            {/* Notificaciones Push (OneSignal) */}
            <section className="card" style={{ padding: 18 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <div style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  backgroundColor: 'rgba(255, 149, 0, 0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#FF9500'
                }}>
                  {pushState.suscrito ? <BellRing size={16} /> : <Bell size={16} />}
                </div>
                <div>
                  <h3 className="apple-headline" style={{ margin: 0, fontSize: 15 }}>Notificaciones Push</h3>
                  <p className="apple-caption" style={{ margin: 0, fontSize: 12 }}>
                    Avisos de clase, retos y mensajes en segundo plano.
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{
                    width: 10,
                    height: 10,
                    borderRadius: '50%',
                    backgroundColor: pushState.suscrito ? 'var(--color-positive)' : 'var(--color-tertiary-ink)',
                    boxShadow: pushState.suscrito ? '0 0 8px var(--color-positive)' : 'none'
                  }} />
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700 }}>
                      {pushState.suscrito ? 'Activadas' : 'Desactivadas'}
                    </div>
                    <div className="apple-caption" style={{ fontSize: 11 }}>
                      {pushState.suscrito
                        ? 'Recibirás avisos incluso con la app cerrada'
                        : pushState.cargando
                          ? 'Comprobando estado...'
                          : pushState.soportado
                            ? 'Pulsa para activar en este navegador'
                            : 'No disponible en este navegador'}
                    </div>
                  </div>
                </div>

                {!pushState.suscrito && pushState.soportado && !pushState.cargando && (
                  <button
                    className="btn-primary"
                    onClick={alternarNotificaciones}
                    style={{ padding: '8px 16px', fontSize: 13, fontWeight: 700, borderRadius: 10 }}
                  >
                    Activar
                  </button>
                )}

                {pushState.suscrito && (
                  <span style={{
                    fontSize: 12,
                    fontWeight: 700,
                    color: 'var(--color-positive)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4
                  }}>
                    Conectado
                  </span>
                )}
              </div>
            </section>

            {/* Información Técnica de la Cuenta */}
            <section className="card" style={{ padding: 18 }}>
              <h3 className="apple-headline" style={{ margin: '0 0 10px', fontSize: 15, fontWeight: 800 }}>
                Datos de Registro del Alumno
              </h3>
              <div style={{ fontSize: 12, color: 'var(--color-secondary-ink)', display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div><strong>Identificador Único:</strong> <span className="tabular-nums" style={{ fontFamily: 'monospace' }}>{perfil.id}</span></div>
                <div><strong>Rol del Sistema:</strong> <span style={{ textTransform: 'capitalize' }}>{perfil.rol}</span></div>
                <div><strong>Fecha de Matrícula:</strong> {new Date(perfil.created_at || Date.now()).toLocaleDateString('es-ES')}</div>
              </div>
            </section>

            {/* Botón de Cerrar Sesión */}
            <div style={{ marginTop: 10, textAlign: 'center' }}>
              <button
                className="btn-secondary"
                onClick={cerrarSesion}
                style={{
                  width: '100%',
                  color: 'var(--color-negative)',
                  backgroundColor: 'var(--color-negative-bg)',
                  borderColor: 'rgba(255, 59, 48, 0.25)',
                  gap: 8,
                  padding: '12px 18px',
                  fontWeight: 700
                }}
              >
                <LogOut size={16} />
                <span>Cerrar sesión en este dispositivo</span>
              </button>
            </div>

            {/* Créditos de Aula */}
            <div style={{ textAlign: 'center', marginTop: 14, paddingBottom: 16 }}>
              <p className="apple-caption" style={{ fontSize: 12, color: 'var(--color-secondary-ink)', fontWeight: 700 }}>
                muudel · SMR2 Tarde
              </p>
              <p className="apple-caption" style={{ fontSize: 11, color: 'var(--color-tertiary-ink)', marginTop: 2 }}>
                Diseñado para la constancia y el trabajo técnico de clase
              </p>
            </div>
          </>
        )}

      </div>

      {/* MODAL INTEGRADO DE TIENDA DE RECOMPENSAS */}
      {mostrarTiendaModal && (
        <TiendaRecompensas onClose={() => {
          setMostrarTiendaModal(false)
          cargarMochilaUsuario()
        }} />
      )}

      {/* MODAL INTEGRADO DE RULETA DE YOSHI */}
      {mostrarRuletaModal && (
        <RuletaYoshiModal
          perfil={perfil}
          saldoMonedasRuleta={perfil.monedas_ruleta_yoshi || 0}
          onActualizarSaldoMonedas={(m) => {
            setPerfil(p => ({ ...p, monedas_ruleta_yoshi: m }))
          }}
          onActualizarStevenEuros={(se) => {
            setPerfil(p => ({ ...p, puntos_total: se }))
          }}
          onCerrar={() => setMostrarRuletaModal(false)}
        />
      )}
    </main>
  )
}
