import { useState, useRef, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import {
  Mail,
  Lock,
  AlertCircle,
  CheckCircle2,
  KeyRound,
  X,
  ArrowRight,
  Calendar,
  Clock,
  ExternalLink,
  ChevronRight
} from 'lucide-react'
import { animarEscalonado } from '../utils/animations'
import { sound } from '../utils/haptics'
import { ModalHorario } from '../components/ModalHorario'
import { getClaseActual, HORARIO_SEMANAL, ASIGNATURAS } from '../utils/horarioData'

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
  const [mostrarModalHorario, setMostrarModalHorario] = useState(false)

  // Acceso secreto para lominoño mediante triple toque en el logo
  const [toquesLogo, setToquesLogo] = useState(0)
  const [ultimoToqueTiempo, setUltimoToqueTiempo] = useState(0)
  const [mostrarAccesoSecreto, setMostrarAccesoSecreto] = useState(false)
  const [pinSecreto, setPinSecreto] = useState('')
  const [errorPinSecreto, setErrorPinSecreto] = useState('')

  const cardRef = useRef(null)

  const fechaHoy = new Date()
  const diaSemana = fechaHoy.getDay() // 1: Lun, ... 5: Vie
  const claseAhora = getClaseActual(fechaHoy)
  const clasesDeHoy = HORARIO_SEMANAL[diaSemana] || null

  const diasNombres = ['', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']
  const nombreDiaHoy = diasNombres[diaSemana] || 'Fin de semana'

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
      maxWidth: 920,
      margin: '0 auto',
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      padding: '24px 16px',
    }}>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
        gap: 24,
        alignItems: 'stretch'
      }}>
        {/* COLUMNA 1: Tarjeta de Acceso */}
        <div
          ref={cardRef}
          className="card"
          style={{
            padding: '36px 28px',
            textAlign: 'center',
            boxShadow: '0 8px 30px rgba(0, 0, 0, 0.06)',
            border: '1px solid var(--color-separator)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center'
          }}
        >
          {/* Logo y Nombre */}
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            marginBottom: 14,
          }}>
            <img
              src="/logo.png"
              alt="muudel"
              onClick={handleLogoClick}
              title="muudel"
              style={{
                width: 68,
                height: 68,
                borderRadius: 18,
                objectFit: 'contain',
                border: '1px solid var(--color-separator)',
                boxShadow: '0 4px 14px rgba(0, 0, 0, 0.05)',
                cursor: 'pointer',
                userSelect: 'none'
              }}
            />
          </div>

          <h1 style={{
            fontSize: 30,
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
            Pase de lista a las 15:30 y comunidad de clase
          </p>

          {/* Avisos de autenticación */}
          {loginNotice && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              marginBottom: 16,
              padding: '10px 14px',
              borderRadius: 12,
              background: 'var(--color-positive-bg)',
              color: 'var(--color-positive)',
              fontSize: 13,
              fontWeight: 600,
              textAlign: 'left',
            }}>
              <CheckCircle2 size={16} style={{ flexShrink: 0 }} />
              <span>{loginNotice}</span>
            </div>
          )}

          {loginError && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              marginBottom: 16,
              padding: '10px 14px',
              borderRadius: 12,
              background: 'var(--color-negative-bg)',
              color: 'var(--color-negative)',
              fontSize: 13,
              fontWeight: 600,
              textAlign: 'left',
            }}>
              <AlertCircle size={16} style={{ flexShrink: 0 }} />
              <span style={{ lineHeight: 1.35 }}>{loginError}</span>
            </div>
          )}

          {/* Botón Oficial de Google */}
          <button
            type="button"
            onClick={inicioSesion}
            className="apple-google-btn"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
              <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"/>
              <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.34 24 12 24z"/>
              <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z"/>
              <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.34 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"/>
            </svg>
            <span>Continuar con Google</span>
          </button>

          {/* Separador sutil */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            margin: '20px 0 16px'
          }}>
            <div style={{ flex: 1, height: '0.5px', backgroundColor: 'var(--color-separator)' }} />
            <span style={{ fontSize: 12, color: 'var(--color-tertiary-ink)' }}>
              o con tu correo
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
                style={{ paddingLeft: 36, minHeight: 44, fontSize: 14 }}
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
                style={{ paddingLeft: 36, minHeight: 44, fontSize: 14 }}
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
                minHeight: 44,
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

          {/* Acceso invitado */}
          <div style={{ marginTop: 14 }}>
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
        </div>

        {/* COLUMNA 2: Horario de Clase SMR2 Tarde */}
        <div
          className="card"
          style={{
            padding: '24px',
            boxShadow: '0 8px 30px rgba(0, 0, 0, 0.05)',
            border: '1px solid var(--color-separator)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            gap: 16
          }}
        >
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Calendar size={18} color="var(--color-accent)" />
                <h2 style={{ fontSize: 17, fontWeight: 700, margin: 0, color: 'var(--color-ink)' }}>
                  Horario SMR2 Tarde 26-27
                </h2>
              </div>

              <span style={{
                fontSize: 11,
                fontWeight: 700,
                padding: '3px 8px',
                borderRadius: 9999,
                backgroundColor: 'rgba(10, 132, 255, 0.1)',
                color: 'var(--color-accent)'
              }}>
                15:30 - 21:15
              </span>
            </div>

            {/* Vista previa de la foto del Horario con clic para ampliar */}
            <div
              onClick={() => { sound.playPop(); setMostrarModalHorario(true) }}
              style={{
                position: 'relative',
                borderRadius: 14,
                overflow: 'hidden',
                border: '1px solid var(--color-separator)',
                cursor: 'pointer',
                backgroundColor: '#FFFFFF',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
                marginBottom: 14,
                group: 'hover'
              }}
            >
              <img
                src="/horario_smr2.png"
                alt="Horario SMR2 Tarde 26-27"
                style={{
                  width: '100%',
                  height: 190,
                  objectFit: 'cover',
                  objectPosition: 'top center',
                  display: 'block',
                  transition: 'transform 0.25s ease'
                }}
              />
              <div style={{
                position: 'absolute',
                inset: 0,
                backgroundColor: 'rgba(0, 0, 0, 0.25)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#FFFFFF',
                fontSize: 13,
                fontWeight: 600,
                gap: 6,
                backdropFilter: 'blur(2px)',
                WebkitBackdropFilter: 'blur(2px)'
              }}>
                <ExternalLink size={15} />
                <span>Pulsar para ver horario completo</span>
              </div>
            </div>

            {/* Widget: Estado de clase en tiempo real según reloj */}
            {claseAhora ? (
              <div style={{
                padding: '12px 14px',
                borderRadius: 12,
                backgroundColor: claseAhora.esDescanso ? 'rgba(255, 149, 0, 0.12)' : 'rgba(52, 199, 89, 0.12)',
                border: `1px solid ${claseAhora.esDescanso ? 'rgba(255, 149, 0, 0.25)' : 'rgba(52, 199, 89, 0.25)'}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 10
              }}>
                <div>
                  <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: claseAhora.esDescanso ? 'var(--color-warning)' : 'var(--color-positive)' }}>
                    {claseAhora.esDescanso ? 'Ahora: Descanso' : 'Clase en Curso'}
                  </span>
                  <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-ink)', marginTop: 1 }}>
                    {claseAhora.nombre}
                  </div>
                  {!claseAhora.esDescanso && (
                    <div style={{ fontSize: 12, color: 'var(--color-secondary-ink)' }}>
                      {claseAhora.profesor}
                    </div>
                  )}
                </div>
                <span className="tabular-nums" style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-secondary-ink)' }}>
                  {claseAhora.rango}
                </span>
              </div>
            ) : (
              <div style={{
                padding: '10px 12px',
                borderRadius: 10,
                backgroundColor: 'var(--color-surface-secondary)',
                border: '1px solid var(--color-separator)',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                marginBottom: 10
              }}>
                <Clock size={15} color="var(--color-secondary-ink)" />
                <span style={{ fontSize: 12, color: 'var(--color-secondary-ink)' }}>
                  {nombreDiaHoy !== 'Fin de semana' ? `Hoy ${nombreDiaHoy}: Las clases inician a las 15:30` : 'Fin de semana: Sin clases hoy'}
                </span>
              </div>
            )}

            {/* Módulos de hoy si es de lunes a viernes */}
            {clasesDeHoy && (
              <div style={{ marginTop: 8 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-secondary-ink)', marginBottom: 6 }}>
                  Materias de hoy ({nombreDiaHoy}):
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {Array.from(new Set(clasesDeHoy.filter(c => !c.esDescanso).map(c => c.codigo))).map(cod => {
                    const asig = ASIGNATURAS[cod]
                    if (!asig) return null
                    return (
                      <span
                        key={cod}
                        style={{
                          fontSize: 11,
                          fontWeight: 700,
                          padding: '3px 8px',
                          borderRadius: 6,
                          backgroundColor: asig.colorBg,
                          color: asig.color
                        }}
                      >
                        {cod} · {asig.nombre}
                      </span>
                    )
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Botón para abrir el visor completo del horario */}
          <button
            type="button"
            onClick={() => { sound.playPop(); setMostrarModalHorario(true) }}
            style={{
              width: '100%',
              padding: '10px 14px',
              borderRadius: 10,
              border: '1px solid var(--color-separator)',
              backgroundColor: 'var(--color-surface-secondary)',
              color: 'var(--color-accent)',
              fontSize: 13,
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6
            }}
          >
            <span>Consultar Módulos y Profesores</span>
            <ChevronRight size={15} />
          </button>
        </div>
      </div>

      {/* Modal interactivo con el horario oficial */}
      <ModalHorario
        abierto={mostrarModalHorario}
        onCerrar={() => setMostrarModalHorario(false)}
      />

      {/* Modal Secreto para lominoño */}
      {mostrarAccesoSecreto && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.45)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          zIndex: 5000,
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
