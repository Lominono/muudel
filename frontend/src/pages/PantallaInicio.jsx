import { useAuth } from '../App'

export function PantallaInicio() {
  const { inicioSesion } = useAuth()
  return (
    <div style={{ maxWidth: 400, margin: '100px auto', textAlign: 'center', padding: 32 }}>
      <div style={{ fontSize: 64, marginBottom: 16 }}>🔥</div>
      <h1 style={{ fontSize: 32, fontWeight: 700, marginBottom: 8 }}>Racha de Clase</h1>
      <p style={{ color: '#6B6B70', fontSize: 17, marginBottom: 40 }}>
        Ve a clase, sumá puntos, subí tu racha. Simple así.
      </p>
      <button className="btn-primary" onClick={inicioSesion} style={{ width: '100%' }}>
        Entrar con Google
      </button>
      <p style={{ marginTop: 16, fontSize: 13, color: '#98989D' }}>
        Pón tu código de clase cuando te pidan
      </p>
    </div>
  )
}
