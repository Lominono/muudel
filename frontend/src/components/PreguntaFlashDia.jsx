import { useState, useEffect } from 'react'
import { sound, triggerConfetti } from '../utils/haptics'
import { MessageCircleQuestion, Check, Clock, Flame } from 'lucide-react'

const PREGUNTAS_DEFAULT = [
  {
    id: 'flash-1',
    pregunta: '¿Qué tema de los que estamos dando os parece más difícil de entender?',
    opciones: [
      { id: 'a', texto: 'La parte teórica inicial' },
      { id: 'b', texto: 'Los ejercicios prácticos' },
      { id: 'c', texto: 'Se lleva bien estudiando un poco' },
      { id: 'd', texto: 'Necesito un repaso urgente en clase' }
    ]
  },
  {
    id: 'flash-2',
    pregunta: '¿A qué hora sois más productivos estudiando o haciendo las entregas?',
    opciones: [
      { id: 'a', texto: 'Por la mañana antes de venir a las 15:30' },
      { id: 'b', texto: 'Al salir de clase por la tarde' },
      { id: 'c', texto: 'Modo nocturno / Madrugada' },
      { id: 'd', texto: 'El fin de semana a tope' }
    ]
  },
  {
    id: 'flash-3',
    pregunta: '¿Hacemos quedada o repaso en grupo esta semana antes del control?',
    opciones: [
      { id: 'a', texto: 'Sí, biblioteca antes de las 15:30' },
      { id: 'b', texto: 'Por Discord / llamada online' },
      { id: 'c', texto: 'Prefiero estudiar por mi cuenta' },
      { id: 'd', texto: 'Si hay café y apuntes, me apunto' }
    ]
  }
]

export function PreguntaFlashDia({ userId, onSumarPuntos }) {
  const hoyStr = new Date().toISOString().split('T')[0]
  const claveStorage = 'muudel_flash_' + hoyStr

  const [preguntaActiva, setPreguntaActiva] = useState(null)
  const [votoUsuario, setVotoUsuario] = useState(null)
  const [conteoVotos, setConteoVotos] = useState({})
  const [votando, setVotando] = useState(false)

  useEffect(() => {
    // 1. Obtener pregunta guardada para hoy o rotar según el día
    let flash = null
    try {
      const guardada = localStorage.getItem('muudel_pregunta_custom_hoy')
      if (guardada) {
        flash = JSON.parse(guardada)
      }
    } catch (e) {}

    if (!flash) {
      // Elegir pregunta fija según día del año
      const diaNum = Math.floor(Date.now() / (1000 * 60 * 60 * 24))
      flash = PREGUNTAS_DEFAULT[diaNum % PREGUNTAS_DEFAULT.length]
    }

    setPreguntaActiva(flash)

    // 2. Cargar votos
    try {
      const datosVotos = JSON.parse(localStorage.getItem(claveStorage) || '{"votos": {}}')
      setConteoVotos(datosVotos.votos || {})
      if (userId && datosVotos.votos && datosVotos.votos[userId]) {
        setVotoUsuario(datosVotos.votos[userId])
      }
    } catch (e) {}
  }, [userId, claveStorage])

  if (!preguntaActiva) return null

  const totalVotos = Object.keys(conteoVotos).length
  const yaVoto = Boolean(votoUsuario)

  const manejarVoto = (opcionId) => {
    if (yaVoto || votando) return
    setVotando(true)
    sound.playPop()
    triggerConfetti()

    const nuevosVotos = { ...conteoVotos, [userId]: opcionId }
    setConteoVotos(nuevosVotos)
    setVotoUsuario(opcionId)

    try {
      localStorage.setItem(claveStorage, JSON.stringify({ votos: nuevosVotos }))
    } catch (e) {}

    // Sumar +5 pts de participación
    if (onSumarPuntos) {
      onSumarPuntos(5)
    }

    setVotando(false)
  }

  // Calcular porcentajes
  const frecuencias = {}
  preguntaActiva.opciones.forEach(op => {
    frecuencias[op.id] = 0
  })
  Object.values(conteoVotos).forEach(opId => {
    if (frecuencias[opId] !== undefined) {
      frecuencias[opId]++
    }
  })

  return (
    <div className="card" style={{
      padding: '18px 20px',
      marginBottom: 16,
      backgroundColor: 'var(--color-surface)',
      border: '1px solid var(--color-separator)'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            width: 32,
            height: 32,
            borderRadius: 10,
            backgroundColor: 'rgba(255, 149, 0, 0.12)',
            color: 'var(--color-warning)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <MessageCircleQuestion size={18} />
          </div>
          <div>
            <span className="apple-caption" style={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, color: 'var(--color-warning)' }}>
              Pregunta Flash del Día
            </span>
            <div style={{ fontSize: 11, color: 'var(--color-secondary-ink)' }}>
              Caduca hoy a medianoche · {totalVotos} han respondido
            </div>
          </div>
        </div>

        <span className="apple-badge apple-badge-accent" style={{ fontSize: 11, fontWeight: 700 }}>
          {yaVoto ? 'Respondida (+5 pts)' : '+5 pts al votar'}
        </span>
      </div>

      <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--color-ink)', marginBottom: 14, lineHeight: 1.35 }}>
        {preguntaActiva.pregunta}
      </h3>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {preguntaActiva.opciones.map((op) => {
          const votosOpcion = frecuencias[op.id] || 0
          const pct = totalVotos > 0 ? Math.round((votosOpcion / totalVotos) * 100) : 0
          const esMiVoto = votoUsuario === op.id

          if (yaVoto) {
            // Mostrar barras de resultados
            return (
              <div
                key={op.id}
                style={{
                  position: 'relative',
                  padding: '10px 14px',
                  borderRadius: 12,
                  border: esMiVoto ? '1.5px solid var(--color-accent)' : '1px solid var(--color-separator)',
                  backgroundColor: esMiVoto ? 'rgba(10, 132, 255, 0.08)' : 'var(--color-surface-secondary)',
                  overflow: 'hidden'
                }}
              >
                {/* Relleno porcentual */}
                <div style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  bottom: 0,
                  width: `${pct}%`,
                  backgroundColor: esMiVoto ? 'rgba(10, 132, 255, 0.15)' : 'rgba(120, 120, 128, 0.08)',
                  zIndex: 0,
                  transition: 'width 0.5s ease'
                }} />

                <div style={{ position: 'relative', zIndex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {esMiVoto && <Check size={14} color="var(--color-accent)" strokeWidth={2.5} />}
                    <span style={{ fontSize: 13, fontWeight: esMiVoto ? 700 : 500, color: 'var(--color-ink)' }}>
                      {op.texto}
                    </span>
                  </div>
                  <span className="tabular-nums" style={{ fontSize: 13, fontWeight: 700, color: esMiVoto ? 'var(--color-accent)' : 'var(--color-secondary-ink)' }}>
                    {pct}%
                  </span>
                </div>
              </div>
            )
          }

          // Si aún no ha votado, mostrar botones seleccionables
          return (
            <button
              key={op.id}
              onClick={() => manejarVoto(op.id)}
              disabled={votando}
              style={{
                width: '100%',
                textAlign: 'left',
                padding: '12px 14px',
                borderRadius: 12,
                border: '1px solid var(--color-separator)',
                backgroundColor: 'var(--color-surface-secondary)',
                color: 'var(--color-ink)',
                fontSize: 14,
                fontWeight: 500,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                transition: 'all 0.15s ease'
              }}
            >
              <span>{op.texto}</span>
              <span style={{ fontSize: 11, color: 'var(--color-tertiary-ink)' }}>Votar</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
