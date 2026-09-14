import { Trophy } from 'lucide-react'

export function TopRanking({ lista = [] }) {
  const top = lista.slice(0, 3)

  if (top.length === 0) {
    return null
  }

  const medallas = [
    { label: '1.º', color: '#E5A00D', bg: 'rgba(229, 160, 13, 0.14)' },
    { label: '2.º', color: '#8E8E93', bg: 'rgba(142, 142, 147, 0.14)' },
    { label: '3.º', color: '#C9773B', bg: 'rgba(201, 119, 59, 0.14)' },
  ]

  return (
    <section className="card">
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 14
      }}>
        <h3 className="apple-headline" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          Líderes de la clase
          <Trophy size={17} color="var(--color-accent)" />
        </h3>
        <span className="apple-caption">Top 3</span>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: 10,
        textAlign: 'center'
      }}>
        {top.map((p, i) => {
          const medalla = medallas[i]
          return (
            <div
              key={p.id || i}
              style={{
                backgroundColor: 'var(--color-surface-secondary)',
                borderRadius: 12,
                padding: '12px 8px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 4,
                border: '1px solid var(--color-separator)'
              }}
            >
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: medalla.color,
                  backgroundColor: medalla.bg,
                  padding: '2px 8px',
                  borderRadius: 9999,
                }}
              >
                {medalla.label}
              </span>

              <div style={{ fontSize: 30, margin: '4px 0' }}>
                {p.avatar_emoji || '🧑‍🎓'}
              </div>

              <div
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: 'var(--color-ink)',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  maxWidth: '100%'
                }}
              >
                {p.nombre}
              </div>

              <div className="tabular-nums" style={{ fontSize: 12, color: 'var(--color-secondary-ink)', fontWeight: 600 }}>
                {p.puntos_total} pts
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
