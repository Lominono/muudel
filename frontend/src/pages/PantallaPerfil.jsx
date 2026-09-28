import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../App'
import { NIVELES, COLORES_AVATAR, supabase } from '../utils/supabase'
import { CalendarioActividad } from '../components/CalendarioActividad'
import { AvatarUsuario } from '../components/AvatarUsuario'
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
  Tag
} from 'lucide-react'
import { sound } from '../utils/haptics'
import { animarEscalonado } from '../utils/animations'
import { transmitirEvento } from '../utils/realtimeHub'
import gsap from 'gsap'

// Catálogo de Marcos disponibles
const MARCOS_DISPONIBLES = [
  { id: 'ninguno', nombre: 'Clásico', desc: 'Sin borde decorativo', color: '#8E8E93' },
  { id: 'oro', nombre: 'Oro Imperial', desc: 'Anillo pulido dorado', color: '#D4AF37' },
  { id: 'fuego', nombre: 'Llama Ardiente', desc: 'Resplandor naranja fuego', color: '#FF9500' },
  { id: 'cyber', nombre: 'Ciberpunk', desc: 'Neón cian de alta frecuencia', color: '#00F0FF' },
  { id: 'tinta', nombre: 'Tinta Roja', desc: 'Sello carmesí de examen', color: '#FF3B30' },
  { id: 'esmeralda', nombre: 'Esmeralda', desc: 'Joya verde radiante', color: '#34C759' },
  { id: 'obsidiana', nombre: 'Obsidiana', desc: 'Titanio negro satinado', color: '#636366' },
]

// Estilos de Banner para la tarjeta
const ESTILOS_BANNER = [
  { id: 'cuadricula', nombre: 'Cuaderno Cuadrícula', icon: Grid, desc: 'Trama milimetrada técnica' },
  { id: 'terminal', nombre: 'Consola UNIX', icon: Terminal, desc: 'Línea de comandos de sistemas' },
  { id: 'carbon', nombre: 'Fibra de Carbón', icon: Shield, desc: 'Textura mate oscura' },
  { id: 'circuito', nombre: 'Circuito Lógico', icon: Cpu, desc: 'Líneas electrónicas sutiles' },
  { id: 'amanecer', nombre: 'Amanecer Ámbar', icon: Sunrise, desc: 'Gradiente suave atardecer' },
  { id: 'minimal', nombre: 'Estudio Minimal', icon: FileText, desc: 'Acabado limpio Apple neutro' },
]

// Títulos y etiquetas predefinidas sugeridas
const TITULOS_PRESETS = [
  '⚡ Redes & Scripts God',
  '💻 Linux Root Master',
  '🏆 MVP Aula 15:30',
  '📖 Apuntes de Oro',
  '☕ Fan del Descanso',
  '🛡️ Pentester Novato',
  '🎯 Racha Imparable',
  '⌨️ Devorador de Terminales',
]

// Frases y lemas predefinidos sugeridos
const FRASES_PRESETS = [
  'Sin miedo al examen de montaje de equipos.',
  'Configurando switches y routers en tiempo récord.',
  'La asistencia de las 15:30 no se negocia.',
  'Terminal abierta, café caliente y racha al día.',
  'Apuntes pulidos y compartidos con el aula.',
]

export function PantallaPerfil() {
  const { perfil, setPerfil, cerrarSesion } = useAuth()
  const [tema, setTema] = useState(() => localStorage.getItem('racha_tema') || 'auto')
  const [pestañaCustom, setPestañaCustom] = useState('estilo') // 'estilo' | 'marcos' | 'titulo'
  
  // Estados locales editables para personalización
  const [colorAcento, setColorAcento] = useState(perfil?.color_acento || '#0A84FF')
  const [marcoSeleccionado, setMarcoSeleccionado] = useState(perfil?.marco_avatar || 'ninguno')
  const [bannerSeleccionado, setBannerSeleccionado] = useState(perfil?.banner_estilo || 'cuadricula')
  const [tituloPersonalizado, setTituloPersonalizado] = useState(perfil?.titulo_personalizado || perfil?.titulo_vip || '')
  const [fraseEstado, setFraseEstado] = useState(perfil?.frase || perfil?.frase_estado || '')
  
  const [guardando, setGuardando] = useState(false)
  const [mensajeGuardado, setMensajeGuardado] = useState(false)

  const progressBarRef = useRef(null)
  const pageRef = useRef(null)

  useEffect(() => {
    if (tema === 'auto') {
      document.documentElement.removeAttribute('data-theme')
    } else {
      document.documentElement.setAttribute('data-theme', tema)
    }
    localStorage.setItem('racha_tema', tema)
  }, [tema])

  useEffect(() => {
    if (pageRef.current) {
      animarEscalonado(pageRef.current.children, { stagger: 0.05, duration: 0.35 })
    }
  }, [])

  // Sincronizar estados locales cuando cambie el perfil
  useEffect(() => {
    if (perfil) {
      setColorAcento(perfil.color_acento || '#0A84FF')
      setMarcoSeleccionado(perfil.marco_avatar || 'ninguno')
      setBannerSeleccionado(perfil.banner_estilo || 'cuadricula')
      setTituloPersonalizado(perfil.titulo_personalizado || perfil.titulo_vip || '')
      setFraseEstado(perfil.frase || perfil.frase_estado || '')
    }
  }, [perfil?.id])

  if (!perfil) return null

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
  }, [progresoPorcentaje])

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

  // Guardar cambios de personalización
  const guardarPersonalizacion = async () => {
    setGuardando(true)
    sound.playStamp()

    const perfilActualizado = {
      ...perfil,
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

    // Transmitir en tiempo real a las demás pantallas y compañeros
    transmitirEvento('perfil_actualizado', perfilActualizado)

    try {
      await supabase
        .from('profiles')
        .update({
          color_acento: colorAcento,
          marco_avatar: marcoSeleccionado,
          banner_estilo: bannerSeleccionado,
          titulo_personalizado: tituloPersonalizado.trim(),
          frase: fraseEstado.trim(),
        })
        .eq('id', perfil.id)
    } catch (e) {
      console.warn('Error al guardar perfil en Supabase:', e)
    }

    setGuardando(false)
    setMensajeGuardado(true)
    setTimeout(() => setMensajeGuardado(false), 3000)
  }

  const insignias = [
    {
      id: '1',
      icon: Flame,
      titulo: 'Primera Racha',
      desc: '3 días seguidos',
      activo: (perfil.racha_actual || 0) >= 3 || (perfil.mejor_racha || 0) >= 3,
      color: 'var(--color-warning)'
    },
    {
      id: '2',
      icon: Clock,
      titulo: 'Puntualidad',
      desc: 'Llegada antes de hora',
      activo: (perfil.puntos_total || 0) >= 10,
      color: 'var(--color-positive)'
    },
    {
      id: '3',
      icon: MessageSquare,
      titulo: 'Participación',
      desc: 'Mensajes en el grupo',
      activo: true,
      color: 'var(--color-accent)'
    },
    {
      id: '4',
      icon: Award,
      titulo: 'Constancia',
      desc: '10 asistencias',
      activo: (perfil.puntos_total || 0) >= 100,
      color: '#AF52DE'
    },
  ]

  return (
    <main className="app-container">
      <header style={{ marginBottom: 18 }}>
        <h1 className="apple-large-title">
          Perfil
        </h1>
      </header>

      <div ref={pageRef}>
        {/* Tarjeta de Identidad y Nivel con Banner en Vivo */}
        <section
          className="card"
          style={{
            padding: 0,
            overflow: 'hidden',
            boxShadow: '0 4px 20px rgba(0,0,0,0.06)',
            position: 'relative'
          }}
        >
          {/* Banner Temático Superior */}
          <div
            style={{
              height: 76,
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '0 18px',
              transition: 'all 0.3s ease',
              ...getBannerStyle(bannerSeleccionado)
            }}
          >
            {bannerSeleccionado === 'terminal' ? (
              <span style={{ fontSize: 12, fontFamily: 'monospace', fontWeight: 600, opacity: 0.9 }}>
                smr2@aula:~$ whoami --status:active
              </span>
            ) : bannerSeleccionado === 'amanecer' ? (
              <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase', color: '#FF9500' }}>
                ✦ Racha de Tarde 15:30
              </span>
            ) : (
              <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-tertiary-ink)', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Credencial de Alumno
              </span>
            )}

            <span
              style={{
                fontSize: 11,
                padding: '2px 8px',
                borderRadius: 9999,
                backgroundColor: 'rgba(0,0,0,0.08)',
                color: 'var(--color-secondary-ink)',
                fontWeight: 600
              }}
            >
              Vista en vivo
            </span>
          </div>

          {/* Cuerpo de la Tarjeta */}
          <div style={{ textAlign: 'center', padding: '0 20px 24px 20px', marginTop: -40 }}>
            {/* Avatar con Marco Activo */}
            <div style={{ position: 'relative', display: 'inline-block', marginBottom: 10 }}>
              <AvatarUsuario
                nombre={perfil.nombre}
                color={colorAcento}
                rol={perfil.rol}
                size={88}
                fontSize={32}
                marco={marcoSeleccionado}
                showRoleBadge={true}
              />
            </div>

            {/* Nombre y Dígito */}
            <h2 className="apple-title-1" style={{ fontSize: 22, marginBottom: 3 }}>
              {perfil.nombre}
            </h2>

            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              {perfil.digito_id && (
                <span className="apple-badge apple-badge-accent" style={{ fontSize: 12, fontWeight: 700 }}>
                  Dígito #{perfil.digito_id}
                </span>
              )}
              {perfil.username && (
                <span style={{ fontSize: 13, color: 'var(--color-secondary-ink)', fontWeight: 500 }}>
                  @{perfil.username}
                </span>
              )}
            </div>

            {/* Título VIP / Apodo personalizado activo */}
            {tituloPersonalizado && (
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 10 }}>
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 5,
                    fontSize: 12,
                    fontWeight: 700,
                    padding: '3px 12px',
                    borderRadius: 9999,
                    backgroundColor: 'rgba(255, 149, 0, 0.12)',
                    color: '#FF9500',
                    border: '1px solid rgba(255, 149, 0, 0.3)',
                    boxShadow: '0 2px 6px rgba(255, 149, 0, 0.1)'
                  }}
                >
                  <Tag size={12} />
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
                  maxWidth: 380,
                  margin: '0 auto 12px auto',
                  lineHeight: 1.4
                }}
              >
                "{fraseEstado}"
              </p>
            )}

            <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginTop: 4 }}>
              <span className="apple-badge apple-badge-neutral" style={{ fontSize: 12, padding: '3px 10px' }}>
                Nivel: {nivel.nombre}
              </span>
            </div>

            {/* Barra de Progreso XP */}
            <div style={{ marginTop: 20 }}>
              <div style={{
                height: 8,
                backgroundColor: 'var(--color-fill-secondary)',
                borderRadius: 9999,
                overflow: 'hidden',
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

              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
                <span className="apple-caption tabular-nums">
                  {xpEnNivel} XP en este nivel
                </span>
                <span className="apple-caption tabular-nums">
                  {siguiente ? `${xpNecesario - xpEnNivel} XP para ${siguiente.nombre}` : 'Nivel máximo'}
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* ESTUDIO DE PERSONALIZACIÓN DEL PERFIL */}
        <section className="card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{
                width: 30,
                height: 30,
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
                <h3 className="apple-headline" style={{ fontSize: 16 }}>
                  Estudio de Personalización
                </h3>
                <p className="apple-caption" style={{ fontSize: 12 }}>
                  Personaliza tu presencia visual en el chat, ranking y aula.
                </p>
              </div>
            </div>

            {mensajeGuardado && (
              <span style={{
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                fontSize: 12,
                fontWeight: 600,
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
              <span>Color de Acento</span>
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

          {/* CONTENIDO PESTAÑA 1: COLOR DE ACENTO */}
          {pestañaCustom === 'estilo' && (
            <div>
              <label className="apple-caption" style={{ display: 'block', marginBottom: 10, fontWeight: 600 }}>
                Selecciona la tonalidad del sistema para tu avatar y barra de nivel:
              </label>

              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                gap: 10,
                marginBottom: 16
              }}>
                {COLORES_AVATAR.map((c) => {
                  const esActivo = colorAcento === c
                  return (
                    <button
                      key={c}
                      onClick={() => {
                        sound.playPop()
                        setColorAcento(c)
                      }}
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
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <div
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: 9999,
                          backgroundColor: c,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#FFFFFF',
                          boxShadow: '0 2px 5px rgba(0,0,0,0.15)',
                          transform: esActivo ? 'scale(1.1)' : 'none',
                        }}
                      >
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

          {/* CONTENIDO PESTAÑA 2: MARCO DE AVATAR & BANNER */}
          {pestañaCustom === 'marcos' && (
            <div>
              {/* Selector de Marcos */}
              <div style={{ marginBottom: 18 }}>
                <label className="apple-caption" style={{ display: 'block', marginBottom: 8, fontWeight: 600 }}>
                  Marco decorativo de avatar:
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 8 }}>
                  {MARCOS_DISPONIBLES.map((m) => {
                    const seleccionado = marcoSeleccionado === m.id
                    return (
                      <button
                        key={m.id}
                        onClick={() => {
                          sound.playPop()
                          setMarcoSeleccionado(m.id)
                        }}
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
                  Estilo de cabecera / banner de credencial:
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
                  {ESTILOS_BANNER.map((b) => {
                    const IconComp = b.icon
                    const seleccionado = bannerSeleccionado === b.id
                    return (
                      <button
                        key={b.id}
                        onClick={() => {
                          sound.playPop()
                          setBannerSeleccionado(b.id)
                        }}
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

          {/* CONTENIDO PESTAÑA 3: TÍTULO & LEMA PERSONAL */}
          {pestañaCustom === 'titulo' && (
            <div>
              {/* Input Título Personalizado */}
              <div style={{ marginBottom: 16 }}>
                <label className="apple-caption" style={{ display: 'block', marginBottom: 6, fontWeight: 600 }}>
                  Título Honorífico o Apodo de Clase:
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="text"
                    className="apple-input"
                    value={tituloPersonalizado}
                    onChange={(e) => setTituloPersonalizado(e.target.value)}
                    placeholder="Ej: ⚡ Redes & Scripts God"
                    maxLength={32}
                    style={{ fontSize: 14, paddingRight: 40 }}
                  />
                  {tituloPersonalizado && (
                    <button
                      onClick={() => setTituloPersonalizado('')}
                      style={{
                        position: 'absolute',
                        right: 10,
                        top: '50%',
                        transform: 'translateY(-50%)',
                        border: 'none',
                        background: 'transparent',
                        color: 'var(--color-tertiary-ink)',
                        cursor: 'pointer',
                        fontSize: 12
                      }}
                    >
                      ✕
                    </button>
                  )}
                </div>

                {/* Chips de sugerencias de títulos */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                  {TITULOS_PRESETS.map((t) => (
                    <button
                      key={t}
                      onClick={() => {
                        sound.playPop()
                        setTituloPersonalizado(t)
                      }}
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

              {/* Input Frase / Lema Personal */}
              <div style={{ marginBottom: 16 }}>
                <label className="apple-caption" style={{ display: 'block', marginBottom: 6, fontWeight: 600 }}>
                  Frase de Estado o Lema personal:
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="text"
                    className="apple-input"
                    value={fraseEstado}
                    onChange={(e) => setFraseEstado(e.target.value)}
                    placeholder="Ej: Configurando switches y routers en tiempo récord."
                    maxLength={80}
                    style={{ fontSize: 14 }}
                  />
                </div>

                {/* Chips de sugerencias de frases */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                  {FRASES_PRESETS.map((f) => (
                    <button
                      key={f}
                      onClick={() => {
                        sound.playPop()
                        setFraseEstado(f)
                      }}
                      style={{
                        fontSize: 11,
                        padding: '3px 8px',
                        borderRadius: 6,
                        backgroundColor: 'var(--color-fill-secondary)',
                        color: 'var(--color-secondary-ink)',
                        border: '1px solid var(--color-separator)',
                        cursor: 'pointer',
                        textAlign: 'left'
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
                fontWeight: 700,
                borderRadius: 12
              }}
            >
              <Save size={16} />
              <span>{guardando ? 'Guardando en la nube...' : 'Guardar Cambios de Perfil'}</span>
            </button>
          </div>
        </section>

        {/* Historial real de asistencia */}
        <CalendarioActividad userId={perfil.id} />

        {/* Estadísticas */}
        <section className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '12px 16px', borderBottom: '0.5px solid var(--color-separator)' }}>
            <h3 className="apple-headline" style={{ fontSize: 15 }}>Estadísticas personales</h3>
          </div>

          {[
            { label: 'Puntos acumulados', valor: `${perfil.puntos_total || 0} pts`, color: 'var(--color-accent)' },
            { label: 'Racha actual', valor: `${perfil.racha_actual || 0} días`, color: 'var(--color-warning)' },
            { label: 'Récord personal', valor: `${perfil.mejor_racha || 0} días`, color: 'var(--color-positive)' },
            { label: 'Estado', valor: 'Activo en clase', color: 'var(--color-positive)' },
          ].map((item, index, arr) => (
            <div
              key={item.label}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '12px 16px',
                borderBottom: index < arr.length - 1 ? '0.5px solid var(--color-separator)' : 'none',
              }}
            >
              <span style={{ fontSize: 15, color: 'var(--color-secondary-ink)' }}>{item.label}</span>
              <span className="tabular-nums" style={{ fontSize: 15, fontWeight: 600, color: item.color, textTransform: 'capitalize' }}>
                {item.valor}
              </span>
            </div>
          ))}
        </section>

        {/* Selector de Apariencia */}
        <section className="card">
          <h3 className="apple-headline" style={{ fontSize: 15, marginBottom: 12 }}>
            Apariencia
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

        {/* Insignias con Iconos Vectoriales (Cero Emojis) */}
        <section className="card">
          <h3 className="apple-headline" style={{ fontSize: 15, marginBottom: 12 }}>
            Insignias conseguidas
          </h3>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
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
                    opacity: l.activo ? 1 : 0.5
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
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{l.titulo}</div>
                    <div className="apple-caption" style={{ fontSize: 11 }}>{l.desc}</div>
                  </div>
                </div>
              )
            })}
          </div>
        </section>

        {/* Botón de cerrar sesión */}
        <div style={{ marginTop: 20, textAlign: 'center' }}>
          <button
            className="btn-secondary"
            onClick={cerrarSesion}
            style={{
              width: '100%',
              color: 'var(--color-negative)',
              backgroundColor: 'var(--color-negative-bg)',
              gap: 8,
            }}
          >
            <LogOut size={17} />
            <span>Cerrar sesión</span>
          </button>
        </div>

        {/* Créditos de JuanFe */}
        <div style={{ marginTop: 24, textAlign: 'center', paddingBottom: 16 }}>
          <p className="apple-caption" style={{ fontSize: 12, color: 'var(--color-secondary-ink)', fontWeight: 600 }}>
            muudel
          </p>
          <p className="apple-caption" style={{ fontSize: 11, color: 'var(--color-tertiary-ink)', marginTop: 2 }}>
            Diseñado y desarrollado por <strong style={{ color: 'var(--color-secondary-ink)', fontWeight: 600 }}>JuanFe</strong>
          </p>
        </div>
      </div>
    </main>
  )
}
