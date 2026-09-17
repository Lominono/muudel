import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../App'
import { NIVELES, COLORES_AVATAR, supabase } from '../utils/supabase'
import { CalendarioActividad } from '../components/CalendarioActividad'
import { AvatarUsuario } from '../components/AvatarUsuario'
import { LogOut, Sun, Moon, Monitor, Flame, Clock, MessageSquare, Award, Palette } from 'lucide-react'
import { sound } from '../utils/haptics'
import { animarEscalonado } from '../utils/animations'
import gsap from 'gsap'

export function PantallaPerfil() {
  const { perfil, setPerfil, cerrarSesion } = useAuth()
  const [mostrarSelectorColor, setMostrarSelectorColor] = useState(false)
  const [tema, setTema] = useState(() => localStorage.getItem('racha_tema') || 'auto')
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

  const cambiarColor = async (color) => {
    sound.playPop()
    const updated = { ...perfil, color_acento: color }
    setPerfil(updated)
    setMostrarSelectorColor(false)

    localStorage.setItem('racha_local_user', JSON.stringify(updated))
    try {
      await supabase.from('profiles').update({ color_acento: color }).eq('id', perfil.id)
    } catch (e) {}
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
    <main style={{ maxWidth: 520, margin: '0 auto', padding: '20px 16px 40px' }}>
      <header style={{ marginBottom: 18 }}>
        <h1 className="apple-large-title">
          Perfil
        </h1>
      </header>

      <div ref={pageRef}>
        {/* Tarjeta de Identidad y Nivel */}
        <section className="card" style={{ textAlign: 'center', padding: '28px 20px' }}>
          <div style={{ position: 'relative', display: 'inline-block', marginBottom: 12 }}>
            <AvatarUsuario
              nombre={perfil.nombre}
              color={perfil.color_acento}
              rol={perfil.rol}
              size={88}
              fontSize={32}
              showRoleBadge={true}
            />

            <button
              onClick={() => setMostrarSelectorColor(!mostrarSelectorColor)}
              title="Cambiar color de perfil"
              style={{
                position: 'absolute',
                bottom: 0,
                right: -4,
                backgroundColor: 'var(--color-surface)',
                border: '1px solid var(--color-separator)',
                borderRadius: 9999,
                width: 28,
                height: 28,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: 'var(--color-ink)',
                boxShadow: '0 1px 3px rgba(0,0,0,0.12)'
              }}
            >
              <Palette size={14} />
            </button>
          </div>

          {mostrarSelectorColor && (
            <div style={{
              display: 'flex',
              gap: 8,
              justifyContent: 'center',
              padding: 12,
              backgroundColor: 'var(--color-surface-secondary)',
              borderRadius: 14,
              marginBottom: 16,
              border: '1px solid var(--color-separator)'
            }}>
              {COLORES_AVATAR.map((c) => (
                <button
                  key={c}
                  onClick={() => cambiarColor(c)}
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 9999,
                    backgroundColor: c,
                    border: perfil.color_acento === c ? '2px solid var(--color-ink)' : 'none',
                    cursor: 'pointer',
                    outline: 'none',
                    transform: perfil.color_acento === c ? 'scale(1.15)' : 'none',
                    transition: 'transform 0.15s ease'
                  }}
                />
              ))}
            </div>
          )}

          <h2 className="apple-title-1" style={{ fontSize: 22, marginBottom: 2 }}>
            {perfil.nombre}
          </h2>

          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            {perfil.digito_id && (
              <span className="apple-badge apple-badge-accent" style={{ fontSize: 12, fontWeight: 700 }}>
                {perfil.digito_id}
              </span>
            )}
            {perfil.username && (
              <span style={{ fontSize: 13, color: 'var(--color-secondary-ink)', fontWeight: 500 }}>
                @{perfil.username}
              </span>
            )}
          </div>

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
                  backgroundColor: 'var(--color-accent)',
                  borderRadius: 9999,
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
