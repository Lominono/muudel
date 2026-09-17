import { useState, useRef, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import {
  Mail,
  Lock,
  AlertCircle,
  CheckCircle2,
  KeyRound,
  X,
  ArrowRight
} from 'lucide-react'
import { animarEscalonado } from '../utils/animations'
import { sound } from '../utils/haptics'

export function PantallaInicio() {
  const {
    inicioSesion,
    iniciarSesionConEmail,
    registrarseConEmail,
    entrarComoAdminLominono,
    entrarComoAlumno,
    loginError,
    loginNotice,
    limpiarErrores,
  } = useAuth()

  const [modo, setModo] = useState('login') // 'login' | 'registro'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [enviando, setEnviando] = useState(false)

  // Acceso discreto para lominoño mediante triple toque en el logo
  const [toquesLogo, setToquesLogo] = useState(0)
  const [ultimoToqueTiempo, setUltimoToqueTiempo] = useState(0)
  const [mostrarAccesoSecreto, setMostrarAccesoSecreto] = useState(false)
  const [pinSecreto, setPinSecreto] = useState('')
  const [errorPinSecreto, setErrorPinSecreto] = useState('')

  const cardRef = useRef(null)

  useEffect(() => {
    if (cardRef.current) {
      animarEscalonado(cardRef.current.children, { stagger: 0.04, duration: 0.3 })
    }
  }, [modo])

  const cambiarModo = (nuevoModo) => {
    limpiarErrores()
    setModo(nuevoModo)
  }

  // 3 toques rápidos en el logo abren el vault de lominoño
  const handleLogoClick = () => {
    const ahora = Date.now()
    if (ahora - ultimoToqueTiempo < 500) {
      const nuevoConteo = toquesLogo + 1
      setToquesLogo(nuevoConteo)
      if (nuevoConteo >= 3) {
        sound.playPop()
        setMostrarAccesoSecreto(true)
        setToquesLogo(0)
      }
    } else {
      setToquesLogo(1)
    }
    setUltimoToqueTiempo(ahora)
  }

  const validarPinSecreto = (e) => {
    e.preventDefault()
    if (pinSecreto === '2026') {
      sound.playStamp()
      setMostrarAccesoSecreto(false)
      entrarComoAdminLominono()
    } else {
      sound.playPop()
      setErrorPinSecreto('PIN incorrecto')
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (enviando) return

    setEnviando(true)
    if (modo === 'login') {
      await iniciarSesionConEmail(email, password)
    } else {
      await registrarseConEmail(email, password, '', 'alumno')
    }
    setEnviando(false)
  }

  return (
    <main style={{
      maxWidth: 400,
      margin: '0 auto',
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      padding: '24px 16px',
    }}>
      <div
        ref={cardRef}
        className="card"
        style={{
          padding: '32px 24px',
          textAlign: 'center',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.05)',
          border: '1px solid var(--color-separator)'
        }}
      >
        {/* Logo */}
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          marginBottom: 14,
        }}>
          <img
            src="/logo.png"
            alt="muudel"
            onClick={handleLogoClick}
            style={{
              width: 64,
              height: 64,
              borderRadius: 16,
              objectFit: 'contain',
              border: '1px solid var(--color-separator)',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
              cursor: 'pointer',
              userSelect: 'none'
            }}
          />
        </div>

        {/* Marca y Subtítulo natural */}
        <h1 style={{
          fontSize: 28,
          fontWeight: 800,
          letterSpacing: '-0.03em',
          color: 'var(--color-ink)',
          marginBottom: 2
        }}>
          muudel
        </h1>

        <p style={{
          fontSize: 14,
          color: 'var(--color-secondary-ink)',
          marginBottom: 22
        }}>
          Pase de lista y rachas de clase
        </p>

        {/* Avisos */}
        {loginNotice && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            marginBottom: 16,
            padding: '10px 12px',
            borderRadius: 10,
            background: 'var(--color-positive-bg)',
            color: 'var(--color-positive)',
            fontSize: 13,
            fontWeight: 600,
            textAlign: 'left',
          }}>
            <CheckCircle2 size={15} style={{ flexShrink: 0 }} />
            <span>{loginNotice}</span>
          </div>
        )}

        {loginError && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            marginBottom: 16,
            padding: '10px 12px',
            borderRadius: 10,
            background: 'var(--color-negative-bg)',
            color: 'var(--color-negative)',
            fontSize: 13,
            fontWeight: 600,
            textAlign: 'left',
          }}>
            <AlertCircle size={15} style={{ flexShrink: 0 }} />
            <span style={{ lineHeight: 1.35 }}>{loginError}</span>
          </div>
        )}

        {/* Botón de Google */}
        <button
          type="button"
          onClick={inicioSesion}
          style={{
            width: '100%',
            minHeight: 44,
            borderRadius: 12,
            border: '1px solid var(--color-separator)',
            backgroundColor: 'var(--color-surface)',
            color: 'var(--color-ink)',
            fontSize: 14,
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 10,
            cursor: 'pointer',
            transition: 'background-color 0.15s ease',
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
          </svg>
          <span>Continuar con Google</span>
        </button>

        {/* Separador limpio */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          margin: '20px 0 16px'
        }}>
          <div style={{ flex: 1, height: '0.5px', backgroundColor: 'var(--color-separator)' }} />
          <span style={{ fontSize: 12, color: 'var(--color-tertiary-ink)' }}>
            o con correo
          </span>
          <div style={{ flex: 1, height: '0.5px', backgroundColor: 'var(--color-separator)' }} />
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {/* Correo */}
          <div style={{ position: 'relative', textAlign: 'left' }}>
            <Mail size={16} style={{
              position: 'absolute',
              left: 12,
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--color-secondary-ink)',
            }} />
            <input
              type="text"
              autoComplete="email"
              className="apple-input"
              placeholder={modo === 'login' ? 'Correo o usuario' : 'Correo electrónico'}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{ paddingLeft: 36, minHeight: 42, fontSize: 14 }}
              required
            />
          </div>

          {/* Contraseña */}
          <div style={{ position: 'relative', textAlign: 'left' }}>
            <Lock size={16} style={{
              position: 'absolute',
              left: 12,
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--color-secondary-ink)',
            }} />
            <input
              type="password"
              autoComplete={modo === 'login' ? 'current-password' : 'new-password'}
              className="apple-input"
              placeholder="Contraseña"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{ paddingLeft: 36, minHeight: 42, fontSize: 14 }}
              minLength={6}
              required
            />
          </div>

          {/* Botón principal */}
          <button
            type="submit"
            className="btn-primary"
            disabled={enviando}
            style={{
              width: '100%',
              minHeight: 42,
              fontSize: 14,
              fontWeight: 700,
              marginTop: 4,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6
            }}
          >
            {enviando ? (
              <span>Un momento...</span>
            ) : modo === 'login' ? (
              <>
                <span>Entrar</span>
                <ArrowRight size={15} />
              </>
            ) : (
              <>
                <span>Crear cuenta</span>
                <ArrowRight size={15} />
              </>
            )}
          </button>
        </form>

        {/* Alternar modo Login / Registro */}
        <div style={{ marginTop: 18, fontSize: 13, color: 'var(--color-secondary-ink)' }}>
          {modo === 'login' ? (
            <>
              ¿No tienes cuenta?{' '}
              <button
                type="button"
                onClick={() => cambiarModo('registro')}
                style={{
                  background: 'none',
                  border: 'none',
                  padding: 0,
                  color: 'var(--color-accent)',
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontSize: 13
                }}
              >
                Crear cuenta
              </button>
            </>
          ) : (
            <>
              ¿Ya tienes cuenta?{' '}
              <button
                type="button"
                onClick={() => cambiarModo('login')}
                style={{
                  background: 'none',
                  border: 'none',
                  padding: 0,
                  color: 'var(--color-accent)',
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontSize: 13
                }}
              >
                Iniciar sesión
              </button>
            </>
          )}
        </div>
      </div>

      {/* Acceso directo como invitado */}
      <div style={{ marginTop: 18, textAlign: 'center' }}>
        <button
          type="button"
          onClick={() => entrarComoAlumno('Alumno de Clase')}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--color-tertiary-ink)',
            fontSize: 12,
            cursor: 'pointer',
            padding: '4px 8px'
          }}
        >
          Entrar como invitado
        </button>
      </div>

      {/* Modal Secreto para lominoño */}
      {mostrarAccesoSecreto && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.45)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          zIndex: 3000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 20
        }}>
          <div className="card" style={{ maxWidth: 300, width: '100%', padding: '22px 18px', textAlign: 'center' }}>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 2 }}>
              <button
                onClick={() => setMostrarAccesoSecreto(false)}
                style={{ background: 'none', border: 'none', color: 'var(--color-secondary-ink)', cursor: 'pointer' }}
              >
                <X size={16} />
              </button>
            </div>

            <div style={{
              width: 40,
              height: 40,
              borderRadius: 12,
              backgroundColor: 'var(--color-fill-secondary)',
              color: 'var(--color-ink)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 8px'
            }}>
              <KeyRound size={20} />
            </div>

            <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 2 }}>
              muudel vault
            </h3>
            <p className="apple-caption" style={{ marginBottom: 12 }}>
              PIN maestro:
            </p>

            <form onSubmit={validarPinSecreto} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <input
                type="password"
                inputMode="numeric"
                maxLength={4}
                autoFocus
                value={pinSecreto}
                onChange={(e) => {
                  setErrorPinSecreto('')
                  setPinSecreto(e.target.value.replace(/\D/g, ''))
                }}
                className="apple-input"
                style={{ textAlign: 'center', fontSize: 22, letterSpacing: 8, fontWeight: 700, minHeight: 44 }}
                placeholder="••••"
              />

              {errorPinSecreto && (
                <span style={{ fontSize: 12, color: 'var(--color-negative)', fontWeight: 600 }}>
                  {errorPinSecreto}
                </span>
              )}

              <button type="submit" className="btn-primary" style={{ minHeight: 38, fontSize: 13, fontWeight: 700 }}>
                Acceder
              </button>
            </form>
          </div>
        </div>
      )}
    </main>
  )
}
