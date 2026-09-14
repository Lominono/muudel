export function TopRanking({ lista }) {
  const top = lista.slice(0, 3)
  const medallas = ['🥇', '🥈', '🥉']

  return (
    <div className="card" style={{ marginBottom: 16 }}>
      <h3 style={{ fontSize: 17, fontWeight: 700, marginBottom: 12 }}>🏆 Top 3</h3>
      <div style={{ display: 'flex', justifyContent: 'space-around' }}>
        {top.map((p, i) => (
          <div key={p.id || i} style={{ textAlign: 'center', flex: 1 }}>
            <div style={{ fontSize: 36, marginBottom: 4 }}>{medallas[i]}</div>
            <div style={{ fontSize: 13, fontWeight: 600 }}>{p.nombre}</div>
            <div style={{ fontSize: 11, color: '#98989D', fontFamily: 'monospace' }}>
              {p.puntos_total} pts
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
