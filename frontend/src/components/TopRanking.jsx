import { TrofeoPodio } from './icons/TrofeoPodio'

export function TopRanking({ lista = [] }) {
  const top = lista.slice(0, 3)

  if (top.length === 0) {
    return null
  }

  // Orden visual del podio: 2º lugar a la izquierda, 1º en el centro elevado, 3º a la derecha
  const podioOrden = [
    { rank: 2, item: top[1] },
    { rank: 1, item: top[0] },
    { rank: 3, item: top[2] },
  ]

  return (
    <section className="card">
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16
      }}>
        <div>
          <h3 className="apple-headline">
            Podio de Honor
          </h3>
          <p className="apple-subheadline" style={{ fontSize: 13 }}>
            Líderes de la clase en asistencia y puntos
          </p>
        </div>
        <span className="apple-badge apple-badge-accent">
          Top 3
        </span>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: 10,
        alignItems: 'flex-end',
        textAlign: 'center',
        paddingTop: 10,
      }}>
        {podioOrden.map(({ rank, item }) => {
          if (!item) return <div key={rank} />
          const esPrimero = rank === 1

          return (
            <div
              key={item.id || rank}
              style={{
                backgroundColor: esPrimero ? 'var(--color-surface)' : 'var(--color-surface-secondary)',
                borderRadius: 14,
                padding: esPrimero ? '16px 8px 14px' : '12px 8px 10px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 4,
                border: esPrimero ? '2px solid rgba(229, 160, 13, 0.45)' : '1px solid var(--color-separator)',
                boxShadow: esPrimero ? '0 4px 14px rgba(229, 160, 13, 0.12)' : 'none',
                transform: esPrimero ? 'translateY(-6px)' : 'none',
                transition: 'transform 0.2s ease',
              }}
            >
              <TrofeoPodio rank={rank} size={esPrimero ? 38 : 32} />

              <div style={{ fontSize: esPrimero ? 32 : 26, margin: '2px 0' }}>
                {item.avatar_emoji || '🧑‍🎓'}
              </div>

              <div
                style={{
                  fontSize: esPrimero ? 14 : 13,
                  fontWeight: 700,
                  color: 'var(--color-ink)',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  maxWidth: '100%',
                }}
              >
                {item.nombre}
              </div>

              <div className="tabular-nums" style={{
                fontSize: esPrimero ? 13 : 12,
                color: esPrimero ? '#E5A00D' : 'var(--color-secondary-ink)',
                fontWeight: 700,
              }}>
                {item.puntos_total} pts
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
