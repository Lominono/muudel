import { useState, useEffect } from 'react'
import { supabase } from '../utils/supabase'
import { Trophy, Flame } from 'lucide-react'

export function PantallaRanking() {
  const [lista, setLista] = useState([])
  const [filtro, setFiltro] = useState('total')
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    const cargar = async () => {
      setCargando(true)
      try {
        const vista = filtro === 'semana' ? 'ranking_semanal' : 'ranking_diario'
        const { data, error } = await supabase.from(vista).select('*').limit(30)

        if (data && data.length > 0) {
          setLista(data)
        } else {
          // Si las vistas están vacías o en modo demo, consultar profiles
          const { data: profData } = await supabase.from('profiles').select('*').order('puntos_total', { ascending: false }).limit(20)
          if (profData && profData.length > 0) {
            setLista(profData)
          } else {
            // Datos representativos para previsualización
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

  return (
    <main style={{ maxWidth: 520, margin: '0 auto', padding: '20px 16px 40px' }}>
      <header style={{ marginBottom: 18 }}>
        <h1 className="apple-large-title">
          Ranking
        </h1>
        <p className="apple-subheadline" style={{ marginTop: 2 }}>
          Clasificación general por asistencia y participación.
        </p>
      </header>

      {/* Segmented Control nativo iOS */}
      <div className="segmented-control" style={{ marginBottom: 16 }}>
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

      {/* Lista estilo Inset Grouped */}
      <section className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {cargando ? (
          <div style={{ padding: 32, textAlign: 'center' }}>
            <p className="apple-caption">Cargando clasificación...</p>
          </div>
        ) : (
          lista.map((p, i) => {
            const esTop3 = i < 3
            const medallaColores = ['#E5A00D', '#8E8E93', '#C9773B']
            return (
              <div
                key={p.id || i}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '12px 16px',
                  borderBottom: i < lista.length - 1 ? '0.5px solid var(--color-separator)' : 'none',
                  backgroundColor: esTop3 ? 'var(--color-surface-secondary)' : 'transparent',
                }}
              >
                {/* Posición */}
                <div style={{ width: 32, textAlign: 'center', marginRight: 10 }}>
                  {esTop3 ? (
                    <span style={{
                      fontWeight: 800,
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
                  <div style={{ fontWeight: 600, fontSize: 15, color: 'var(--color-ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {p.nombre}
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
          })
        )}
      </section>
    </main>
  )
}
