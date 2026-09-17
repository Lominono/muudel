import { useState } from 'react'
import { useAuth } from '../App'
import { supabase } from '../utils/supabase'
import { InsigniaIniciales } from '../components/InsigniaIniciales'
import { sound, triggerConfetti } from '../utils/haptics'
import { User, Hash, Check, ArrowRight, ShieldCheck, AtSign, Palette } from 'lucide-react'

const COLORES_APPLE = [
  '#0A84FF', // Azul
  '#30D158', // Verde
  '#FF9F0A', // Ámbar
  '#FF375F', // Rosa
  '#BF5AF2', // Violeta
  '#64D2FF', // Celeste
  '#5E5CE6', // Índigo
  '#7D7C84', // Grafito
]

export function PantallaCompletarPerfil({ onCompletado }) {
  const { perfil, setPerfil, session, actualizarPerfilCompleto } = useAuth()

  // Extraer sugerencias del perfil o correo de Google
  const emailUsuario = session?.user?.email || perfil?.email || ''
  const nombreSugerido = perfil?.nombre && perfil.nombre !== 'Estudiante' && perfil.nombre !== 'Alumno'
    ? perfil.nombre
    : (session?.user?.user_metadata?.full_name || session?.user?.user_metadata?.name || '')

  const [nombreReal, setNombreReal] = useState(nombreSugerido)
  const [username, setUsername] = useState(
    emailUsuario ? emailUsuario.split('@')[0].replace(/[^a-zA-Z0-9_]/g, '').slice(0, 15) : ''
  )
  const [digitoId, setDigitoId] = useState(perfil?.digito_id ? perfil.digito_id.replace(/\D/g, '') : '')
  const [colorAcento, setColorAcento] = useState(perfil?.color_acento || '#0A84FF')
  const [frase, setFrase] = useState(perfil?.frase || 'Listo para clase a las 15:30')
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    const limpioNombre = nombreReal.trim()
    const limpioUsername = username.trim().toLowerCase().replace(/[^a-z0-9_]/g, '')
    const limpioDigito = digitoId.trim().replace(/[^0-9]/g, '')

    if (limpioNombre.length < 2 || limpioNombre.length > 35) {
      setError('Introduce tu nombre y al menos un apellido real (entre 2 y 35 letras).')
      return
    }

    if (limpioUsername.length < 2) {
      setError('El nombre de usuario debe tener al menos 2 caracteres.')
      return
    }

    if (!limpioDigito || Number(limpioDigito) <= 0 || Number(limpioDigito) > 999) {
      setError('Introduce tu número de lista o dígito de alumno (ej: del 1 al 99).')
      return
    }

    setGuardando(true)

    const digitoFormateado = `#${limpioDigito.padStart(2, '0')}`

    const perfilActualizado = {
      nombre: limpioNombre,
      username: limpioUsername,
      digito_id: digitoFormateado,
      color_acento: colorAcento,
      frase: frase.trim().slice(0, 70),
      onboarding_completado: true
    }

    if (actualizarPerfilCompleto) {
      await actualizarPerfilCompleto(perfilActualizado)
    } else {
      const merged = { ...perfil, ...perfilActualizado }
      localStorage.setItem('racha_local_user', JSON.stringify(merged))
      setPerfil(merged)
    }

    sound.playStamp()
    triggerConfetti()
    setGuardando(false)

    if (onCompletado) {
      onCompletado(perfilActualizado)
    }
  }

  return (
    <main style={{
      maxWidth: 480,
      margin: '0 auto',
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      padding: '28px 16px',
    }}>
      <div className="card" style={{ padding: '36px 24px', textAlign: 'center' }}>
        {/* Vista previa de la Insignia */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
          <InsigniaIniciales
            nombre={nombreReal || 'Tu Nombre'}
            color={colorAcento}
            size={72}
          />
        </div>

        <h1 className="apple-large-title" style={{ fontSize: 26, fontWeight: 800, marginBottom: 6 }}>
          Ficha de Alumno
        </h1>
        <p className="apple-subheadline" style={{ fontSize: 14, marginBottom: 22, lineHeight: 1.4 }}>
          Personaliza tu identidad de clase para que lominoño te identifique y evitar que nadie se haga el gracioso suplantándote.
        </p>

        {error && (
          <div style={{
            padding: '10px 14px',
            borderRadius: 12,
            backgroundColor: 'var(--color-negative-bg)',
            color: 'var(--color-negative)',
            fontSize: 13,
            fontWeight: 600,
            marginBottom: 16,
            textAlign: 'left'
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14, textAlign: 'left' }}>
          {/* Nombre y Apellidos Reales */}
          <div>
            <label className="apple-caption" style={{ display: 'block', marginBottom: 5, fontWeight: 600 }}>
              Nombre y Apellidos reales
            </label>
            <div style={{ position: 'relative' }}>
              <User size={17} style={{
                position: 'absolute',
                left: 14,
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--color-secondary-ink)'
              }} />
              <input
                type="text"
                className="apple-input"
                placeholder="Ej: Laura García Morales"
                value={nombreReal}
                onChange={(e) => setNombreReal(e.target.value)}
                style={{ paddingLeft: 40 }}
                required
              />
            </div>
            <span style={{ fontSize: 11, color: 'var(--color-tertiary-ink)', marginTop: 3, display: 'block' }}>
              El nombre con el que figuras en la lista de clase.
            </span>
          </div>

          {/* Nombre de Usuario / Nick y Dígito de Lista */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 10 }}>
            <div>
              <label className="apple-caption" style={{ display: 'block', marginBottom: 5, fontWeight: 600 }}>
                Usuario / Nick
              </label>
              <div style={{ position: 'relative' }}>
                <AtSign size={16} style={{
                  position: 'absolute',
                  left: 12,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--color-secondary-ink)'
                }} />
                <input
                  type="text"
                  className="apple-input"
                  placeholder="laura_g"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  style={{ paddingLeft: 34, fontSize: 14 }}
                  required
                />
              </div>
            </div>

            {/* Dígito identificador único */}
            <div>
              <label className="apple-caption" style={{ display: 'block', marginBottom: 5, fontWeight: 600 }}>
                Nº de Lista / Dígito
              </label>
              <div style={{ position: 'relative' }}>
                <Hash size={16} style={{
                  position: 'absolute',
                  left: 12,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--color-secondary-ink)'
                }} />
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={3}
                  className="apple-input"
                  placeholder="Ej: 14"
                  value={digitoId}
                  onChange={(e) => setDigitoId(e.target.value.replace(/\D/g, ''))}
                  style={{ paddingLeft: 34, fontWeight: 700, fontSize: 15 }}
                  required
                />
              </div>
            </div>
          </div>

          {/* Tarjeta explicativa de seguridad anti-suplantación */}
          <div style={{
            padding: '10px 12px',
            borderRadius: 12,
            backgroundColor: 'rgba(10, 132, 255, 0.08)',
            border: '1px solid rgba(10, 132, 255, 0.2)',
            display: 'flex',
            gap: 8,
            alignItems: 'flex-start'
          }}>
            <ShieldCheck size={16} color="var(--color-accent)" style={{ flexShrink: 0, marginTop: 2 }} />
            <p style={{ fontSize: 12, color: 'var(--color-ink)', lineHeight: 1.35, margin: 0 }}>
              Tu número de lista te diferencia ante lominoño. Si alguien se pone tu mismo nombre para gastar una broma, el sistema mostrará vuestro número y correo para que no haya confusiones.
            </p>
          </div>

          {/* Selector de Color de Insignia de Apple */}
          <div>
            <label className="apple-caption" style={{ display: 'block', marginBottom: 6, fontWeight: 600 }}>
              Color de tu insignia
            </label>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 6 }}>
              {COLORES_APPLE.map((c) => (
                <button
                  type="button"
                  key={c}
                  onClick={() => { sound.playPop(); setColorAcento(c) }}
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: 9999,
                    backgroundColor: c,
                    border: colorAcento === c ? '2.5px solid var(--color-ink)' : '2px solid transparent',
                    cursor: 'pointer',
                    transform: colorAcento === c ? 'scale(1.15)' : 'scale(1)',
                    transition: 'all 0.15s ease',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                  }}
                />
              ))}
            </div>
          </div>

          {/* Lema o frase de perfil */}
          <div>
            <label className="apple-caption" style={{ display: 'block', marginBottom: 5, fontWeight: 600 }}>
              Lema de clase (opcional)
            </label>
            <input
              type="text"
              className="apple-input"
              maxLength={70}
              placeholder="Ej: Puntual a las 15:30"
              value={frase}
              onChange={(e) => setFrase(e.target.value)}
            />
          </div>

          <button
            type="submit"
            className="btn-primary"
            disabled={guardando}
            style={{
              width: '100%',
              minHeight: 46,
              fontSize: 15,
              fontWeight: 700,
              marginTop: 10,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8
            }}
          >
            {guardando ? (
              <span>Guardando...</span>
            ) : (
              <>
                <span>Entrar a muudel</span>
                <ArrowRight size={17} />
              </>
            )}
          </button>
        </form>
      </div>
    </main>
  )
}
