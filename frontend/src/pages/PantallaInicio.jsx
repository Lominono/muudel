import { useState, useRef, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import {
  Mail,
  Lock,
  User,
  LogIn,
  UserPlus,
  AlertCircle,
  CheckCircle2,
  GraduationCap,
  KeyRound,
  X
} from 'lucide-react'
import { animarEscalonado } from '../utils/animations'
import { sound } from '../utils/haptics'

export function PantallaInicio() {
  const {
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
  const [nombre, setNombre] = useState('')
  const [enviando, setEnviando] = useState(false)

  // Acceso secreto para lominoño mediante triple toque en el logo
  const [toquesLogo, setToquesLogo] = useState(0)
  const [ultimoToqueTiempo, setUltimoToqueTiempo] = useState(0)
  const [mostrarAccesoSecreto, setMostrarAccesoSecreto] = useState(false)
  const [pinSecreto, setPinSecreto] = useState('')
  const [errorPinSecreto, setErrorPinSecreto] = useState('')

  const cardRef = useRef(null)

  useEffect(() => {
    if (cardRef.current) {
      animarEscalonado(cardRef.current.children, { stagger: 0.05, duration: 0.4 })
    }
  }, [modo])

  const cambiarModo = (nuevoModo) => {
    limpiarErrores()
    setModo(nuevoModo)
  }

  // Manejar toques en el logo: 3 toques rápidos abren el acceso discreto
  const handleLogoClick = () => {
    const ahora = Date.now()
    if (ahora - ultimoToqueTiempo < 600) {
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
      setErrorPinSecreto('Clave no válida')
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (enviando) return

    setEnviando(true)
    if (modo === 'login') {
      await iniciarSesionConEmail(email, password)
    } else {
      await registrarseConEmail(email, password, nombre, 'alumno')
    }
    setEnviando(false)
  }

  return (
    <main style={{
      maxWidth: 440,
      margin: '0 auto',
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      padding: '28px 16px',
    }}>
      <div
        ref={cardRef}
        className="card"
        style={{
          padding: '36px 24px',
          textAlign: 'center',
        }}
      >
        {/* Logo de muudel (con disparador discreto para lominoño) */}
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          marginBottom: 16,
        }}>
          <img
            src="/logo.png"
            alt="muudel"
            onClick={handleLogoClick}
            style={{
              width: 76,
              height: 76,
              borderRadius: 18,
              objectFit: 'contain',
              border: '1px solid var(--color-separator)',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.06)',
              backgroundColor: 'var(--color-surface)',
              cursor: 'pointer',
              userSelect: 'none'
            }}
          />
        </div>

        <h1 className="apple-large-title" style={{ marginBottom: 4, fontSize: 32, fontWeight: 800, letterSpacing: -0.8 }}>
          muudel
        </h1>

        <p className="apple-subheadline" style={{ marginBottom: 20, fontSize: 14 }}>
          La app de los de clase · Asistencia a las 15:30, podio y canjes.
        </p>

        {/* Notificación de éxito o aviso */}
        {loginNotice && (
          <div style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: 10,
            marginBottom: 16,
            padding: '12px 14px',
            borderRadius: 12,
            background: 'var(--color-positive-bg)',
            color: 'var(--color-positive)',
            fontSize: 13,
            fontWeight: 600,
            textAlign: 'left',
          }}>
            <CheckCircle2 size={16} style={{ flexShrink: 0, marginTop: 2 }} />
            <span>{loginNotice}</span>
          </div>
        )}

        {/* Mensaje de error */}
        {loginError && (
          <div style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: 10,
            marginBottom: 16,
            padding: '12px 14px',
            borderRadius: 12,
            background: 'var(--color-negative-bg)',
            color: 'var(--color-negative)',
            fontSize: 13,
            fontWeight: 600,
            textAlign: 'left',
          }}>
            <AlertCircle size={16} style={{ flexShrink: 0, marginTop: 2 }} />
            <span style={{ lineHeight: 1.4 }}>{loginError}</span>
          </div>
        )}

        {/* Segmented Control: Iniciar Sesión / Crear Cuenta */}
        <div className="segmented-control" style={{ marginBottom: 18 }}>
          <button
            type="button"
            className={`segmented-control-item ${modo === 'login' ? 'active' : ''}`}
            onClick={() => cambiarModo('login')}
            style={{ fontWeight: 600 }}
          >
            Iniciar Sesión
          </button>
          <button
            type="button"
            className={`segmented-control-item ${modo === 'registro' ? 'active' : ''}`}
            onClick={() => cambiarModo('registro')}
            style={{ fontWeight: 600 }}
          >
            Crear Cuenta
          </button>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {modo === 'registro' && (
            <div style={{ textAlign: 'left' }}>
              <label className="apple-caption" style={{ display: 'block', marginBottom: 5, fontWeight: 600 }}>
                Tu nombre y apellidos en clase
              </label>
              <div style={{ position: 'relative' }}>
                <User size={17} style={{
                  position: 'absolute',
                  left: 14,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--color-secondary-ink)',
                }} />
                <input
                  type="text"
                  className="apple-input"
                  placeholder="Ej: Daniel Sánchez"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  style={{ paddingLeft: 40 }}
                  required
                />
              </div>
            </div>
          )}

          {/* Email / Usuario */}
          <div style={{ textAlign: 'left' }}>
            <label className="apple-caption" style={{ display: 'block', marginBottom: 5, fontWeight: 600 }}>
              {modo === 'login' ? 'Correo o Nombre' : 'Correo electrónico'}
            </label>
            <div style={{ position: 'relative' }}>
              <Mail size={17} style={{
                position: 'absolute',
                left: 14,
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--color-secondary-ink)',
              }} />
              <input
                type="text"
                className="apple-input"
                placeholder={modo === 'login' ? 'tu@correo.com o tu nombre' : 'tu@correo.com'}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{ paddingLeft: 40 }}
                required
              />
            </div>
          </div>

          {/* Contraseña */}
          <div style={{ textAlign: 'left' }}>
            <label className="apple-caption" style={{ display: 'block', marginBottom: 5, fontWeight: 600 }}>
              Contraseña
            </label>
            <div style={{ position: 'relative' }}>
              <Lock size={17} style={{
                position: 'absolute',
                left: 14,
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--color-secondary-ink)',
              }} />
              <input
                type="password"
                className="apple-input"
                placeholder="Mínimo 6 caracteres"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{ paddingLeft: 40 }}
                minLength={6}
                required
              />
            </div>
          </div>

          {/* Botón de Enviar */}
          <button
            type="submit"
            className="btn-primary"
            disabled={enviando}
            style={{
              width: '100%',
              minHeight: 46,
              fontSize: 15,
              fontWeight: 700,
              marginTop: 6,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
            }}
          >
            {enviando ? (
              <span>Conectando...</span>
            ) : modo === 'login' ? (
              <>
                <LogIn size={17} />
                <span>Entrar a mi clase</span>
              </>
            ) : (
              <>
                <UserPlus size={17} />
                <span>Crear mi cuenta de clase</span>
              </>
            )}
          </button>
        </form>

        {/* Separador sutil */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          margin: '18px 0 14px',
        }}>
          <div style={{ flex: 1, height: 1, backgroundColor: 'var(--color-separator)' }} />
          <span className="apple-caption" style={{ textTransform: 'uppercase', letterSpacing: 0.6, fontSize: 11 }}>
            o prueba directa
          </span>
          <div style={{ flex: 1, height: 1, backgroundColor: 'var(--color-separator)' }} />
        </div>

        {/* Botón de prueba rápida para alumnos */}
        <button
          type="button"
          onClick={() => entrarComoAlumno('Alumno de Clase')}
          style={{
            width: '100%',
            minHeight: 40,
            borderRadius: 12,
            border: '1px solid var(--color-separator)',
            backgroundColor: 'var(--color-surface-secondary)',
            color: 'var(--color-ink)',
            fontSize: 13,
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            cursor: 'pointer'
          }}
        >
          <GraduationCap size={16} />
          <span>Probar como Alumno sin registro</span>
        </button>

        {/* Créditos discretos */}
        <div style={{ marginTop: 22, paddingTop: 14, borderTop: '0.5px solid var(--color-separator)' }}>
          <p className="apple-caption" style={{ fontSize: 12, color: 'var(--color-tertiary-ink)' }}>
            muudel · Diseñado y desarrollado por <strong style={{ color: 'var(--color-secondary-ink)', fontWeight: 600 }}>JuanFe</strong>
          </p>
        </div>
      </div>

      {/* Modal Secreto de Autenticación Rápida para lominoño (disparado por triple toque en logo) */}
      {mostrarAccesoSecreto && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.55)',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
          zIndex: 3000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 20
        }}>
          <div className="card" style={{ maxWidth: 320, width: '100%', padding: '24px 20px', textAlign: 'center' }}>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 4 }}>
              <button
                onClick={() => setMostrarAccesoSecreto(false)}
                style={{ background: 'none', border: 'none', color: 'var(--color-secondary-ink)', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              backgroundColor: 'var(--color-fill-secondary)',
              color: 'var(--color-ink)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 10px'
            }}>
              <KeyRound size={22} />
            </div>

            <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>
              muudel vault
            </h3>
            <p className="apple-caption" style={{ marginBottom: 14 }}>
              Introduce el PIN de acceso:
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
                style={{ textAlign: 'center', fontSize: 24, letterSpacing: 8, fontWeight: 700, minHeight: 46 }}
                placeholder="••••"
              />

              {errorPinSecreto && (
                <span style={{ fontSize: 12, color: 'var(--color-negative)', fontWeight: 600 }}>
                  {errorPinSecreto}
                </span>
              )}

              <button type="submit" className="btn-primary" style={{ minHeight: 40, fontSize: 14 }}>
                Acceder
              </button>
            </form>
          </div>
        </div>
      )}
    </main>
  )
}
