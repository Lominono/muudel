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
  ShieldCheck,
  GraduationCap,
  ArrowRight
} from 'lucide-react'
import { animarEscalonado } from '../utils/animations'

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
  const [nombre, setNombre] = useState('')
  const [rol, setRol] = useState('alumno') // 'alumno' | 'moderador'
  const [codigoAdmin, setCodigoAdmin] = useState('')
  const [enviando, setEnviando] = useState(false)

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

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (enviando) return

    setEnviando(true)
    if (modo === 'login') {
      await iniciarSesionConEmail(email, password)
    } else {
      await registrarseConEmail(email, password, nombre, rol, codigoAdmin)
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
        {/* Logo de la aplicación */}
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          marginBottom: 16,
        }}>
          <img
            src="/logo.png"
            alt="muudel"
            style={{
              width: 76,
              height: 76,
              borderRadius: 18,
              objectFit: 'contain',
              border: '1px solid var(--color-separator)',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.06)',
              backgroundColor: 'var(--color-surface)',
            }}
          />
        </div>

        <h1 className="apple-large-title" style={{ marginBottom: 4, fontSize: 32, fontWeight: 800, letterSpacing: -0.8 }}>
          muudel
        </h1>

        <p className="apple-subheadline" style={{ marginBottom: 18, fontSize: 14 }}>
          La app de los de clase · Asistencia a las 15:30, podio y canjes.
        </p>

        {/* Acceso fácil y directo para el Administrador lominoño */}
        <button
          type="button"
          className="btn-primary"
          onClick={entrarComoAdminLominono}
          style={{
            width: '100%',
            minHeight: 44,
            marginBottom: 12,
            gap: 8,
            backgroundColor: 'rgba(10, 132, 255, 0.1)',
            color: 'var(--color-accent)',
            border: '1.5px solid rgba(10, 132, 255, 0.35)',
            boxShadow: 'none',
            fontWeight: 700,
            fontSize: 14,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <ShieldCheck size={18} />
          <span>Acceso Administrador (lominoño)</span>
        </button>

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
            <>
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

              {/* Selector Alumno / Profesor */}
              <div style={{ textAlign: 'left' }}>
                <label className="apple-caption" style={{ display: 'block', marginBottom: 5, fontWeight: 600 }}>
                  Tipo de cuenta
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <button
                    type="button"
                    onClick={() => setRol('alumno')}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 6,
                      padding: '8px 10px',
                      borderRadius: 10,
                      border: rol === 'alumno' ? '2px solid var(--color-accent)' : '1px solid var(--color-separator)',
                      backgroundColor: rol === 'alumno' ? 'rgba(10, 132, 255, 0.08)' : 'var(--color-surface)',
                      color: rol === 'alumno' ? 'var(--color-accent)' : 'var(--color-ink)',
                      fontWeight: 600,
                      fontSize: 13,
                      cursor: 'pointer'
                    }}
                  >
                    <GraduationCap size={15} />
                    <span>Alumno</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setRol('moderador')}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 6,
                      padding: '8px 10px',
                      borderRadius: 10,
                      border: rol === 'moderador' ? '2px solid var(--color-accent)' : '1px solid var(--color-separator)',
                      backgroundColor: rol === 'moderador' ? 'rgba(10, 132, 255, 0.08)' : 'var(--color-surface)',
                      color: rol === 'moderador' ? 'var(--color-accent)' : 'var(--color-ink)',
                      fontWeight: 600,
                      fontSize: 13,
                      cursor: 'pointer'
                    }}
                  >
                    <ShieldCheck size={15} />
                    <span>Moderador</span>
                  </button>
                </div>
              </div>

              {rol === 'moderador' && (
                <div style={{ textAlign: 'left' }}>
                  <label className="apple-caption" style={{ display: 'block', marginBottom: 5, fontWeight: 500 }}>
                    Código de Moderador (opcional: PROFE2026)
                  </label>
                  <input
                    type="text"
                    className="apple-input"
                    placeholder="Código de autorización"
                    value={codigoAdmin}
                    onChange={(e) => setCodigoAdmin(e.target.value)}
                  />
                </div>
              )}
            </>
          )}

          {/* Email / Usuario */}
          <div style={{ textAlign: 'left' }}>
            <label className="apple-caption" style={{ display: 'block', marginBottom: 5, fontWeight: 600 }}>
              {modo === 'login' ? 'Correo o Usuario' : 'Correo electrónico'}
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
                placeholder={modo === 'login' ? 'Ej: tu@correo.com o lominoño' : 'tu@correo.com'}
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
                <span>Crear mi cuenta</span>
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
            o acceso rápido
          </span>
          <div style={{ flex: 1, height: 1, backgroundColor: 'var(--color-separator)' }} />
        </div>

        {/* Botón para entrar como Alumno directo de prueba */}
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

        {/* Créditos */}
        <div style={{ marginTop: 22, paddingTop: 14, borderTop: '0.5px solid var(--color-separator)' }}>
          <p className="apple-caption" style={{ fontSize: 12, color: 'var(--color-tertiary-ink)' }}>
            muudel · Diseñado y desarrollado por <strong style={{ color: 'var(--color-secondary-ink)', fontWeight: 600 }}>JuanFe</strong>
          </p>
        </div>
      </div>
    </main>
  )
}
