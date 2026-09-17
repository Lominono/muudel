import { useState, useEffect } from 'react'
import { supabase } from '../utils/supabase'
import { useAuth } from '../App'
import { InsigniaIniciales } from '../components/InsigniaIniciales'
import { Flame, ArrowUp, Trophy, Users } from 'lucide-react'

export function PantallaRanking() {
  const { perfil } = useAuth()
  const [lista, setLista] = useState([])
  const [filtro, setFiltro] = useState('total') // 'total' | 'semana'
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    const cargar = async () => {
      setCargando(true)
      try {
        const vista = filtro === 'semana' ? 'ranking_semanal' : 'ranking_diario'
        const { data, error } = await supabase.from(vista).select('*').limit(30)

        let rankingFinal = []
        if (data && data.length > 0) {
          rankingFinal = data
        } else {
          // Fallback solo a la tabla real de perfiles si la vista estuviese vacía
          const { data: profData } = await supabase
            .from('profiles')
            .select('*')
            .gt('puntos_total', 0)
            .order('puntos_total', { ascending: false })
            .limit(30)

          rankingFinal = profData || []
        }

        // Enriquecer con metadatos locales de identidad (dígito)
        rankingFinal = rankingFinal.map(est => {
          try {
            const meta = localStorage.getItem('muudel_user_meta_' + est.id)
            if (meta) return { ...est, ...JSON.parse(meta) }
          } catch (e) {}
          if (perfil && est.id === perfil.id && perfil.digito_id) {
            return { ...est, digito_id: perfil.digito_id }
          }
          return est
        })

        setLista(rankingFinal)
      } catch (e) {
        console.warn('Error al cargar clasificación:', e)
        setLista([])
      } finally {
        setCargando(false)
      }
    }
    cargar()
  }, [filtro])

  // Calcular la posición del usuario actual (solo datos reales)
  const posicionPropia = perfil && lista.length > 0
    ? lista.findIndex((p) => p.id === perfil.id || p.nombre === perfil.nombre) + 1
    : 0

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
          Clasificación oficial por asistencia y constancia en clase.
        </p>
      </header>

      {/* Control Segmentado */}
      <div className="segmented-control" style={{ marginBottom: 14 }}>
        <button
          type="button"
          className={`segmented-control-item ${filtro === 'total' ? 'active' : ''}`}
          onClick={() => setFiltro('total')}
        >
          General
        </button>
        <button
          type="button"
          className={`segmented-control-item ${filtro === 'semana' ? 'active' : ''}`}
          onClick={() => setFiltro('semana')}
        >
          Esta semana
        </button>
      </div>

      {/* Tarjeta de Posición Propia */}
      {perfil && (
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '12px 16px',
          borderRadius: 14,
          backgroundColor: 'var(--color-surface)',
          border: '1px solid var(--color-separator)',
          marginBottom: 16,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <InsigniaIniciales
              nombre={perfil.nombre}
              color={perfil.color_acento || '#0A84FF'}
              size={40}
              fontSize={15}
            />
            <div>
              <span className="apple-caption" style={{ fontWeight: 600 }}>Tu posición</span>
              <div style={{ fontSize: 15, fontWeight: 700 }}>
                {posicionPropia > 0 ? `#${posicionPropia} en la clase` : 'Sin puntaje aún'}
              </div>
            </div>
          </div>

          <div style={{ textAlign: 'right' }}>
            <span className="tabular-nums" style={{ fontSize: 17, fontWeight: 700, color: 'var(--color-accent)' }}>
              {perfil.puntos_total || 0}
            </span>
            <span className="apple-caption" style={{ marginLeft: 3 }}>pts</span>
            {puntosParaSubir > 0 && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-end',
                gap: 2,
                fontSize: 11,
                fontWeight: 600,
                color: 'var(--color-positive)',
                marginTop: 2,
              }}>
                <ArrowUp size={12} />
                <span>+{puntosParaSubir} pts para ascender</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Listado de la Clasificación */}
      <section className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {cargando ? (
          <div style={{ padding: 40, textAlign: 'center' }}>
            <p className="apple-caption">Cargando clasificación...</p>
          </div>
        ) : lista.length === 0 ? (
          <div style={{ padding: '44px 24px', textAlign: 'center' }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
              <div style={{
                width: 54,
                height: 54,
                borderRadius: 16,
                backgroundColor: 'var(--color-fill-secondary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <Trophy size={28} color="var(--color-tertiary-ink)" />
              </div>
            </div>
            <h3 className="apple-headline" style={{ fontSize: 17, marginBottom: 6 }}>
              Sin registros en este período
            </h3>
            <p className="apple-subheadline" style={{ fontSize: 14, maxWidth: 320, margin: '0 auto' }}>
              La clasificación se actualizará automáticamente conforme los alumnos registren su asistencia.
            </p>
          </div>
        ) : (
          <div>
            {lista.map((estudiante, i) => {
              const esTop3 = i < 3
              const medallaColores = ['#E5A00D', '#7E868C', '#B35A25']
              const esElUsuario = perfil && (estudiante.id === perfil.id || estudiante.nombre === perfil.nombre)

              return (
                <div
                  key={estudiante.id || i}
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
                  {/* Número de posición */}
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

                  {/* Insignia tipográfica con iniciales */}
                  <div style={{ marginRight: 12 }}>
                    <InsigniaIniciales
                      nombre={estudiante.nombre}
                      color={estudiante.color_acento || medallaColores[i] || '#0A84FF'}
                      size={36}
                      fontSize={14}
                    />
                  </div>

                  {/* Información del alumno */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontWeight: esElUsuario ? 700 : 600,
                      fontSize: 15,
                      color: esElUsuario ? 'var(--color-accent)' : 'var(--color-ink)',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6
                    }}>
                      <span>{estudiante.nombre} {esElUsuario && '(Tú)'}</span>
                      {estudiante.digito_id && (
                        <span style={{
                          fontSize: 10,
                          fontWeight: 700,
                          padding: '1px 5px',
                          borderRadius: 4,
                          backgroundColor: 'var(--color-fill-secondary)',
                          color: 'var(--color-secondary-ink)',
                          fontVariantNumeric: 'tabular-nums'
                        }}>
                          {estudiante.digito_id}
                        </span>
                      )}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 1 }}>
                      <Flame size={12} color="var(--color-warning)" />
                      <span className="apple-caption">
                        Racha: <strong className="tabular-nums" style={{ color: 'var(--color-ink)' }}>{estudiante.racha_actual || 0}</strong> días
                      </span>
                    </div>
                  </div>

                  {/* Puntos reales */}
                  <div style={{ textAlign: 'right' }}>
                    <span className="tabular-nums" style={{ fontSize: 16, fontWeight: 700, color: 'var(--color-accent)' }}>
                      {estudiante.puntos_total || 0}
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
