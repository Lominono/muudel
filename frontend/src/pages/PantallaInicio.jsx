import { useAuth } from '../context/AuthContext'
import { EmblemaRacha } from '../components/icons'

export function PantallaInicio() {
  const { inicioSesion, loginError, entrarModoDemo } = useAuth()

  return (
    <main className="page-enter" style={{
      maxWidth: 440,
      margin: '0 auto',
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      padding: '24px 20px',
    }}>
      <div className="card" style={{
        padding: '40px 28px',
        textAlign: 'center',
      }}>
        <div className="flame-animada" style={{
          display: 'flex',
          justifyContent: 'center',
          marginBottom: 20,
        }}>
          <EmblemaRacha size={74} />
        </div>

        <h1 className="apple-large-title" style={{ marginBottom: 8, fontSize: 32 }}>
          Racha de Clase
        </h1>

        <p className="apple-subheadline" style={{ marginBottom: 32, fontSize: 16 }}>
          Asiste a clase, acumula puntos y mantén tu racha activa todos los días.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <button
            className="btn-primary"
            onClick={inicioSesion}
            style={{ width: '100%' }}
          >
            Continuar con Google
          </button>

          <button
            className="btn-secondary"
            onClick={() => entrarModoDemo()}
            style={{ width: '100%' }}
          >
            Probar Modo Demostración
          </button>
        </div>

        {loginError && (
          <div style={{
            marginTop: 16,
            padding: '10px 14px',
            borderRadius: 10,
            background: 'var(--color-negative-bg)',
            color: 'var(--color-negative)',
            fontSize: 14,
            fontWeight: 500,
            textAlign: 'center'
          }}>
            {loginError}
          </div>
        )}

        <div style={{ marginTop: 28, paddingTop: 20, borderTop: '1px solid var(--color-separator)' }}>
          <p className="apple-caption">
            Diseño artesanal basado en Apple Human Interface Guidelines
          </p>
        </div>
      </div>
    </main>
  )
}
