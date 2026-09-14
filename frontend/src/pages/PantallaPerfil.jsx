import { useState } from 'react'
import { useAuth } from '../App'
import { NIVELES, EMOJIS_AVATAR, supabase } from '../utils/supabase'
import { LogOut, Flame, Award, Shield, CheckCircle2 } from 'lucide-react'

export function PantallaPerfil() {
  const { perfil, setPerfil, cerrarSesion } = useAuth()
  const [guardando, setGuardando] = useState(false)
  const [mostrarSelector, setMostrarSelector] = useState(false)

  if (!perfil) return null

  const nivel = NIVELES.filter(n => (perfil.puntos_total || 0) >= n.min).pop() || NIVELES[0]
  const siguiente = NIVELES.find(n => (perfil.puntos_total || 0) < n.min)
  const xpEnNivel = (perfil.puntos_total || 0) - nivel.min
  const xpNecesario = siguiente ? siguiente.min - nivel.min : 100
  const progresoPorcentaje = Math.min(Math.max((xpEnNivel / xpNecesario) * 100, 0), 100)

  const cambiarEmoji = async (emoji) => {
    setGuardando(true)
    const updated = { ...perfil, avatar_emoji: emoji }
    setPerfil(updated)
    setMostrarSelector(false)

    if (perfil.id === 'demo-user-1234') {
      localStorage.setItem('racha_demo_user', JSON.stringify(updated))
    } else {
      try {
        await supabase.from('profiles').update({ avatar_emoji: emoji }).eq('id', perfil.id)
      } catch (e) {}
    }
    setGuardando(false)
  }

  const logros = [
    { id: '1', emoji: '🔥', titulo: 'Primera Racha', desc: '3 días seguidos' },
    { id: '2', emoji: '⚡', titulo: 'Puntual', desc: 'Llegada a tiempo' },
    { id: '3', emoji: '💬', titulo: 'Participativo', desc: 'Mensajes en el chat' },
    { id: '4', emoji: '🏆', titulo: 'Constante', desc: '10 asistencias' },
  ]

  return (
    <main style={{ maxWidth: 520, margin: '0 auto', padding: '20px 16px 40px' }}>
      <header style={{ marginBottom: 18 }}>
        <h1 className="apple-large-title">
          Perfil
        </h1>
      </header>

      {/* Tarjeta de Identidad y Nivel */}
      <section className="card" style={{ textAlign: 'center', padding: '28px 20px' }}>
        <div style={{ position: 'relative', display: 'inline-block', marginBottom: 12 }}>
          <button
            onClick={() => setMostrarSelector(!mostrarSelector)}
            title="Cambiar avatar"
            style={{
              fontSize: 64,
              width: 96,
              height: 96,
              borderRadius: 9999,
              backgroundColor: 'var(--color-surface-secondary)',
              border: '2px solid var(--color-separator)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto',
              transition: 'transform 0.15s ease',
            }}
          >
            {perfil.avatar_emoji || '🧑‍🎓'}
          </button>
          <span className="apple-caption" style={{ display: 'block', marginTop: 4 }}>
            Toca para cambiar
          </span>
        </div>

        {mostrarSelector && (
          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 8,
            justifyContent: 'center',
            padding: 12,
            backgroundColor: 'var(--color-surface-secondary)',
            borderRadius: 14,
            marginBottom: 16,
            border: '1px solid var(--color-separator)'
          }}>
            {EMOJIS_AVATAR.slice(0, 12).map((emoji) => (
              <button
                key={emoji}
                onClick={() => cambiarEmoji(emoji)}
                style={{
                  fontSize: 24,
                  padding: 6,
                  borderRadius: 8,
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                {emoji}
              </button>
            ))}
          </div>
        )}

        <h2 className="apple-title-1" style={{ fontSize: 22, marginBottom: 4 }}>
          {perfil.nombre}
        </h2>

        {perfil.frase && (
          <p className="apple-subheadline" style={{ fontStyle: 'italic', marginBottom: 8 }}>
            “{perfil.frase}”
          </p>
        )}

        <div style={{ marginTop: 8 }}>
          <span className="apple-badge apple-badge-accent" style={{ fontSize: 13, padding: '5px 14px' }}>
            Nivel: {nivel.nombre}
          </span>
        </div>

        {/* Barra de Progreso XP estilo Apple Fitness */}
        <div style={{ marginTop: 20 }}>
          <div style={{
            height: 8,
            backgroundColor: 'var(--color-fill-secondary)',
            borderRadius: 9999,
            overflow: 'hidden',
          }}>
            <div style={{
              height: '100%',
              width: `${progresoPorcentaje}%`,
              backgroundColor: 'var(--color-accent)',
              borderRadius: 9999,
              transition: 'width 0.4s ease',
            }} />
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
            <span className="apple-caption tabular-nums">
              {xpEnNivel} XP en este nivel
            </span>
            <span className="apple-caption tabular-nums">
              {siguiente ? `${xpNecesario - xpEnNivel} XP para ${siguiente.nombre}` : '¡Nivel máximo!'}
            </span>
          </div>
        </div>
      </section>

      {/* Estadísticas en Inset Group */}
      <section className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '12px 16px', borderBottom: '0.5px solid var(--color-separator)' }}>
          <h3 className="apple-headline" style={{ fontSize: 15 }}>Estadísticas del alumno</h3>
        </div>

        {[
          { label: 'Puntos totales', valor: `${perfil.puntos_total || 0} pts`, color: 'var(--color-accent)' },
          { label: 'Racha actual', valor: `${perfil.racha_actual || 0} días`, color: 'var(--color-warning)' },
          { label: 'Mejor racha', valor: `${perfil.mejor_racha || 0} días`, color: 'var(--color-positive)' },
          { label: 'Rol en clase', valor: perfil.rol || 'alumno', color: 'var(--color-ink)' },
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

      {/* Logros */}
      <section className="card">
        <h3 className="apple-headline" style={{ fontSize: 15, marginBottom: 12 }}>
          Insignias obtenidas
        </h3>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
          {logros.map((l) => (
            <div
              key={l.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '10px 12px',
                borderRadius: 12,
                backgroundColor: 'var(--color-surface-secondary)',
                border: '1px solid var(--color-separator)'
              }}
            >
              <span style={{ fontSize: 24 }}>{l.emoji}</span>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{l.titulo}</div>
                <div className="apple-caption" style={{ fontSize: 11 }}>{l.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Botón de cerrar sesión */}
      <div style={{ marginTop: 24, textAlign: 'center' }}>
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
    </main>
  )
}
