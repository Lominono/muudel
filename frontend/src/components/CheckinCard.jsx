import { useCheckin } from '../hooks/useCheckin'

export function CheckinCard({ userId }) {
  const { hoy, cargando, hacerCheckin } = useCheckin(userId)

  const manejarCheckin = async (esTarde) => {
    await hacerCheckin(esTarde)
  }

  if (cargando) {
    return <div style={{ padding: 32, textAlign: 'center' }}>⏳</div>
  }

  const yaFuiste = !!hoy
  const puntos = yaFuiste ? hoy.puntos_ganados : 10

  return (
    <div className="card" style={{ textAlign: 'center', marginBottom: 16 }}>
      <div style={{ fontSize: 48, marginBottom: 8 }}>🔥</div>
      <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>
        {yaFuiste ? 'Ya fuiste 😎' : '¿Hoy veniste?'}
      </h2>
      <p style={{ color: '#6B6B70', fontSize: 15, marginBottom: 20 }}>
        {yaFuiste
          ? `Ganaste ${puntos} pts ${hoy.es_tarde ? '(llegaste tarde)' : ''}`
          : 'Sumá puntos y mantené tu racha'}
      </p>
      {!yaFuiste && (
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
          <button className="btn-primary" onClick={() => manejarCheckin(false)}>
            ✅ Estuve a tiempo (+{puntos})
          </button>
          <button className="btn-primary" onClick={() => manejarCheckin(true)} style={{ background: '#FF9500' }}>
            ⏰ Llegué tarde (+5)
          </button>
        </div>
      )}
    </div>
  )
}
