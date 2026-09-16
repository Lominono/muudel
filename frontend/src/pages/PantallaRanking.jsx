import { useState, useEffect, useRef } from 'react'
import { supabase } from '../utils/supabase'
import { useAuth } from '../App'
import { Flame, ArrowUp } from 'lucide-react'
import { animarEscalonado } from '../utils/animations'

export function PantallaRanking() {
  const { perfil } = useAuth()
  const [lista, setLista] = useState([])
  const [filtro, setFiltro] = useState('total')
  const [cargando, setCargando] = useState(true)
  const listaRef = useRef(null)

  useEffect(() => {
    const cargar = async () => {
      setCargando(true)
      try {
        const vista = filtro === 'semana' ? 'ranking_semanal' : 'ranking_diario'
        const { data, error } = await supabase.from(vista).select('*').limit(30)

        if (data && data.length > 0) {
          setLista(data)
        } else {
          const { data: profData } = await supabase.from('profiles').select('*').order('puntos_total', { ascending: false }).limit(20)
          if (profData && profData.length > 0) {
            setLista(profData)
          } else {
            setLista([
              { id: '1', nombre: 'Sofía Rodríguez', avatar_emoji: '👩‍🎓', puntos_total: 340, racha_actual: 12 },
              { id: '2', nombre: 'Martín Gómez', avatar_emoji: '🧑‍💻', puntos_total: 290, racha_actual: 9 },
              { id: '3', nombre: 'Lucas Pérez', avatar_emoji: '🧑‍🔬', puntos_total: 250, racha_actual: 7 },
              { id: '4', nombre: 'Ana Martínez', avatar_emoji: '👩‍🏫', puntos_total: 210, racha_actual: 5 },
              { id: '5', nombre: 'Carlos Ruiz', avatar_emoji: '🧑‍🎨', puntos_total: 180, racha_actual: 4 },
              { id: '6', nombre: 'Elena Vega', avatar_emoji: '🦸‍♀️', puntos_total: 160, racha_actual: 3 },
            ])
          }
        }
      } catch (e) {
        setLista([
          { id: '1', nombre: 'Sofía Rodríguez', avatar_emoji: '👩‍🎓', puntos_total: 340, racha_actual: 12 },
          { id: '2', nombre: 'Martín Gómez', avatar_emoji: '🧑‍💻', puntos_total: 290, racha_actual: 9 },
          { id: '3', nombre: 'Lucas Pérez', avatar_emoji: '🧑‍🔬', puntos_total: 250, racha_actual: 7 },
          { id: '4', nombre: 'Ana Martínez', avatar_emoji: '👩‍🏫', puntos_total: 210, racha_actual: 5 },
        ])
      } finally {
        setCargando(false)
      }
    }
    cargar()
  }, [filtro])

  useEffect(() => {
    if (!cargando && listaRef.current && lista.length > 0) {
      animarEscalonado(listaRef.current.children, { stagger: 0.035, duration: 0.3 })
    }
  }, [cargando, lista])

  // Calcular la posición del alumno actual
  const posicionPropia = perfil ? lista.findIndex((p) => p.id === perfil.id || p.nombre === perfil.nombre) + 1 : 0
  const puntosParaSubir = posicionPropia > 1 && lista[posicionPropia - 2]
    ? Math.max(lista[posicionPropia - 2].puntos_total - (perfil?.puntos_total || 0) + 5, 5)
    : 0

  return (
    <main style={{ maxWidth: 520, margin: '0 auto', padding: '20px 16px 40px' }}>
      <header style={{ marginBottom: 18 }}>
        <h1 className="apple-large-title">
          Ranking
        </h1>
        <p className="apple-subheadline" style={{ marginTop: 2 }}>
          Puntos acumulados por asistencia y constancia.
        </p>
      </header>

      {/* Segmented Control */}
      <div className="segmented-control" style={{ marginBottom: 14 }}>
        <button
          className={`segmented-control-item ${filtro === 'total' ? 'active' : ''}`}
          onClick={() => setFiltro('total')}
        >
          General
        </button>
        <button
          className={`segmented-control-item ${filtro === 'semana' ? 'active' : ''}`}
          onClick={() => setFiltro('semana')}
        >
          Esta semana
        </button>
      </div>

      {/* Tarjeta de posición propia */}
      {perfil && (
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '10px 16px',
          borderRadius: 12,
          backgroundColor: 'var(--color-surface)',
          border: '1px solid var(--color-separator)',
          marginBottom: 14,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 20 }}>{perfil.avatar_emoji || '🧑‍🎓'}</span>
            <div>
              <span className="apple-caption" style={{ fontWeight: 600 }}>Tu puesto</span>
              <div style={{ fontSize: 14, fontWeight: 700 }}>
                {posicionPropia > 0 ? `#${posicionPropia} en tu grupo` : 'En juego'}
              </div>
            </div>
          </div>

          {puntosParaSubir > 0 && (
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              fontSize: 12,
              fontWeight: 600,
              color: 'var(--color-accent)',
            }}>
              <ArrowUp size={14} />
              <span>+{puntosParaSubir} pts para el siguiente</span>
            </div>
          )}
        </div>
      )}

      {/* Lista del ranking */}
      <section className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {cargando ? (
          <div style={{ padding: 32, textAlign: 'center' }}>
            <p className="apple-caption">Cargando posiciones...</p>
          </div>
        ) : (
          <div ref={listaRef}>
            {lista.map((p, i) => {
              const esTop3 = i < 3
              const medallaColores = ['#E5A00D', '#7E868C', '#B35A25']
              const esElUsuario = perfil && (p.id === perfil.id || p.nombre === perfil.nombre)

              return (
                <div
                  key={p.id || i}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: '12px 16px',
                    borderBottom: i < lista.length - 1 ? '0.5px solid var(--color-separator)' : 'none',
                    backgroundColor: esElUsuario
                      ? 'rgba(0, 122, 255, 0.08)'
                      : esTop3
                      ? 'var(--color-surface-secondary)'
                      : 'transparent',
                  }}
                >
                  {/* Posición */}
                  <div style={{ width: 32, textAlign: 'center', marginRight: 10 }}>
                    {esTop3 ? (
                      <span style={{
                        fontWeight: 900,
                        fontSize: 14,
                        color: medallaColores[i],
                      }}>
                        #{i + 1}
                      </span>
                    ) : (
                      <span className="tabular-nums apple-caption" style={{ fontWeight: 600 }}>
                        {i + 1}
                      </span>
                    )}
                  </div>

                  {/* Avatar */}
                  <div style={{ fontSize: 26, marginRight: 12, lineHeight: 1 }}>
                    {p.avatar_emoji || '🧑‍🎓'}
                  </div>

                  {/* Info estudiante */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontWeight: esElUsuario ? 700 : 600,
                      fontSize: 15,
                      color: esElUsuario ? 'var(--color-accent)' : 'var(--color-ink)',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}>
                      {p.nombre} {esElUsuario && '(Tú)'}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 1 }}>
                      <Flame size={12} color="var(--color-warning)" fill="var(--color-warning)" />
                      <span className="apple-caption">
                        Racha: <strong className="tabular-nums" style={{ color: 'var(--color-ink)' }}>{p.racha_actual || 0}</strong> días
                      </span>
                    </div>
                  </div>

                  {/* Puntos tabulares */}
                  <div style={{ textAlign: 'right' }}>
                    <span className="tabular-nums" style={{ fontSize: 16, fontWeight: 700, color: 'var(--color-accent)' }}>
                      {p.puntos_total || 0}
                    </span>
                    <span className="apple-caption" style={{ marginLeft: 3 }}>
                      pts
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>
    </main>
  )
}
