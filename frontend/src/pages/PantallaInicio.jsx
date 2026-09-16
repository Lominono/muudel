import { useState, useRef, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { Mail, Lock, User, LogIn, UserPlus, Compass, AlertCircle, CheckCircle2 } from 'lucide-react'
import { animarEscalonado } from '../utils/animations'

export function PantallaInicio() {
  const {
    inicioSesion,
    iniciarSesionConEmail,
    registrarseConEmail,
    loginError,
    loginNotice,
    entrarModoDemo,
    limpiarErrores,
  } = useAuth()

  const [modo, setModo] = useState('login') // 'login' | 'registro'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [nombre, setNombre] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [mostrarDemo, setMostrarDemo] = useState(false)

  const cardRef = useRef(null)

  useEffect(() => {
    if (cardRef.current) {
      animarEscalonado(cardRef.current.children, { stagger: 0.05, duration: 0.4 })
    }
  }, [])

  const cambiarModo = (nuevoModo) => {
    limpiarErrores()
    setModo(nuevoModo)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (enviando) return

    setEnviando(true)
    if (modo === 'login') {
      await iniciarSesionConEmail(email, password)
    } else {
      await registrarseConEmail(email, password, nombre)
    }
    setEnviando(false)
  }

  return (
    <main style={{
      maxWidth: 460,
      margin: '0 auto',
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      padding: '28px 20px',
    }}>
      <div
        ref={cardRef}
        className="card"
        style={{
          padding: '36px 28px',
          textAlign: 'center',
        }}
      >
        {/* Logo de la aplicación */}
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          marginBottom: 16,
        }}>
          <img
            src="/logo.png"
            alt="Racha de Clase"
            style={{
              width: 84,
              height: 84,
              borderRadius: 20,
              objectFit: 'contain',
              border: '1px solid var(--color-separator)',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.06)',
              backgroundColor: 'var(--color-surface)',
            }}
          />
        </div>

        <h1 className="apple-large-title" style={{ marginBottom: 6, fontSize: 30 }}>
          Racha de Clase
        </h1>

        <p className="apple-subheadline" style={{ marginBottom: 24, fontSize: 15 }}>
          Pasa lista, mantén viva tu racha y compite con tu grupo cada semana.
        </p>

        {/* Notificación de éxito o información */}
        {loginNotice && (
          <div style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: 10,
            marginBottom: 20,
            padding: '12px 14px',
            borderRadius: 12,
            background: 'var(--color-positive-bg)',
            color: 'var(--color-positive)',
            fontSize: 14,
            fontWeight: 500,
            textAlign: 'left',
          }}>
            <CheckCircle2 size={18} style={{ flexShrink: 0, marginTop: 2 }} />
            <span>{loginNotice}</span>
          </div>
        )}

        {/* Mensaje de error amigable */}
        {loginError && (
          <div style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: 10,
            marginBottom: 20,
            padding: '12px 14px',
            borderRadius: 12,
            background: 'var(--color-negative-bg)',
            color: 'var(--color-negative)',
            fontSize: 14,
            fontWeight: 500,
            textAlign: 'left',
          }}>
            <AlertCircle size={18} style={{ flexShrink: 0, marginTop: 2 }} />
            <span style={{ lineHeight: 1.4 }}>{loginError}</span>
          </div>
        )}

        {/* Botón principal de Google */}
        <button
          type="button"
          className="btn-primary"
          onClick={inicioSesion}
          style={{
            width: '100%',
            marginBottom: 20,
            backgroundColor: 'var(--color-surface-elevated)',
            color: 'var(--color-ink)',
            border: '1px solid var(--color-separator)',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.06)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 12,
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
            />
          </svg>
          <span>Continuar con Google</span>
        </button>

        {/* Separador */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          margin: '20px 0',
        }}>
          <div style={{ flex: 1, height: 1, backgroundColor: 'var(--color-separator)' }} />
          <span className="apple-caption" style={{ textTransform: 'uppercase', letterSpacing: 0.8, fontSize: 11 }}>
            o con tu correo
          </span>
          <div style={{ flex: 1, height: 1, backgroundColor: 'var(--color-separator)' }} />
        </div>

        {/* Selector de modo */}
        <div className="segmented-control" style={{ marginBottom: 20 }}>
          <button
            type="button"
            className={`segmented-control-item ${modo === 'login' ? 'active' : ''}`}
            onClick={() => cambiarModo('login')}
          >
            Iniciar Sesión
          </button>
          <button
            type="button"
            className={`segmented-control-item ${modo === 'registro' ? 'active' : ''}`}
            onClick={() => cambiarModo('registro')}
          >
            Crear Cuenta
          </button>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {modo === 'registro' && (
            <div style={{ textAlign: 'left' }}>
              <label className="apple-caption" style={{ display: 'block', marginBottom: 6, fontWeight: 500 }}>
                Nombre y apellido
              </label>
              <div style={{ position: 'relative' }}>
                <User size={18} style={{
                  position: 'absolute',
                  left: 14,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--color-tertiary-ink)',
                }} />
                <input
                  type="text"
                  className="apple-input"
                  placeholder="Tu nombre en clase"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  style={{ paddingLeft: 42 }}
                  required
                />
              </div>
            </div>
          )}

          <div style={{ textAlign: 'left' }}>
            <label className="apple-caption" style={{ display: 'block', marginBottom: 6, fontWeight: 500 }}>
              Correo electrónico
            </label>
            <div style={{ position: 'relative' }}>
              <Mail size={18} style={{
                position: 'absolute',
                left: 14,
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--color-tertiary-ink)',
              }} />
              <input
                type="email"
                autoComplete="email"
                autoCapitalize="none"
                className="apple-input"
                placeholder="alumno@instituto.es"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{ paddingLeft: 42 }}
                required
              />
            </div>
          </div>

          <div style={{ textAlign: 'left' }}>
            <label className="apple-caption" style={{ display: 'block', marginBottom: 6, fontWeight: 500 }}>
              Contraseña
            </label>
            <div style={{ position: 'relative' }}>
              <Lock size={18} style={{
                position: 'absolute',
                left: 14,
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--color-tertiary-ink)',
              }} />
              <input
                type="password"
                autoComplete={modo === 'login' ? 'current-password' : 'new-password'}
                className="apple-input"
                placeholder={modo === 'login' ? '••••••••' : 'Mínimo 6 caracteres'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{ paddingLeft: 42 }}
                required
                minLength={6}
              />
            </div>
          </div>

          <button
            type="submit"
            className="btn-primary"
            disabled={enviando}
            style={{
              width: '100%',
              marginTop: 6,
              opacity: enviando ? 0.7 : 1,
              cursor: enviando ? 'not-allowed' : 'pointer',
            }}
          >
            {enviando ? (
              <span>Entrando...</span>
            ) : modo === 'login' ? (
              <>
                <LogIn size={18} />
                <span>Entrar a mi clase</span>
              </>
            ) : (
              <>
                <UserPlus size={18} />
                <span>Registrarme</span>
              </>
            )}
          </button>
        </form>

        {/* Modo de prueba rápida */}
        <div style={{ marginTop: 26, paddingTop: 20, borderTop: '1px solid var(--color-separator)' }}>
          {!mostrarDemo ? (
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setMostrarDemo(true)}
              style={{
                width: '100%',
                fontSize: 14,
                minHeight: 40,
                color: 'var(--color-secondary-ink)',
                gap: 8,
              }}
            >
              <Compass size={16} />
              <span>Entrar sin registro · Modo Demo</span>
            </button>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <p className="apple-caption" style={{ fontWeight: 600 }}>
                Elige un perfil de prueba:
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => entrarModoDemo('alumno')}
                  style={{ fontSize: 13, minHeight: 42, padding: '6px 10px' }}
                >
                  🧑‍🎓 Como Alumno
                </button>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => entrarModoDemo('moderador')}
                  style={{ fontSize: 13, minHeight: 42, padding: '6px 10px' }}
                >
                  👨‍🏫 Como Profesor
                </button>
              </div>
            </div>
          )}

          {/* Créditos JuanFe */}
          <div style={{ marginTop: 22, paddingTop: 14, borderTop: '0.5px solid var(--color-separator)' }}>
            <p className="apple-caption" style={{ fontSize: 12, color: 'var(--color-tertiary-ink)' }}>
              Racha de Clase · Diseñado y desarrollado por <strong style={{ color: 'var(--color-secondary-ink)', fontWeight: 600 }}>JuanFe</strong>
            </p>
          </div>
        </div>
      </div>
    </main>
  )
}
