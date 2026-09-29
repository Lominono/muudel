// frontend/src/components/PreguntaFlashDia.jsx
import { useState, useEffect } from 'react'
import { sound, triggerConfetti } from '../utils/haptics'
import { MessageCircleQuestion, Check, Clock, Flame, Sparkles } from 'lucide-react'
import { supabase } from '../utils/supabase'
import { transmitirEvento, suscribirEvento } from '../utils/realtimeHub'
import { sumarXpSkill } from '../utils/skillsData'

const PREGUNTAS_DEFAULT = [
  {
    id: 'flash-1',
    pregunta: '¿Qué bloque temático de SMR2 requiere mayor tiempo de laboratorio?',
    opciones: [
      { id: 'a', texto: 'Configuración de switches y VLANs Cisco' },
      { id: 'b', texto: 'Administración de usuarios y permisos en Linux' },
      { id: 'c', texto: 'Montaje y diagnóstico físico de hardware' },
      { id: 'd', texto: 'Servidores DNS, DHCP y Cortafuegos' }
    ]
  },
  {
    id: 'flash-2',
    pregunta: '¿Cuál es el mejor momento para entregar las prácticas de clase?',
    opciones: [
      { id: 'a', texto: 'Antes del pase de lista de las 15:30' },
      { id: 'b', texto: 'Justo al terminar el laboratorio en el taller' },
      { id: 'c', texto: 'Durante el descanso de las 18:10' },
      { id: 'd', texto: 'En casa repasando los apuntes compartidos' }
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
    cargarPreguntaYVotos()

    // Escuchar votos en tiempo real de otros compañeros
    const desuscribir = suscribirEvento('nuevo_voto_flash', (payload) => {
      if (payload && payload.preguntaId === preguntaActiva?.id) {
        setConteoVotos(prev => ({
          ...prev,
          [payload.userId]: payload.opcionId
        }))
      }
    })

    return () => desuscribir()
  }, [userId, preguntaActiva?.id])

  const cargarPreguntaYVotos = async () => {
    let flash = null

    // 1. Cargar pregunta del día desde Supabase
    try {
      const { data: dbPregunta } = await supabase
        .from('pregunta_flash')
        .select('*')
        .eq('activo', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (dbPregunta && dbPregunta.pregunta && Array.isArray(dbPregunta.opciones)) {
        flash = dbPregunta
      }
    } catch (e) {}

    // 2. Si no hay en BD, rotar según el día
    if (!flash) {
      const diaNum = Math.floor(Date.now() / (1000 * 60 * 60 * 24))
      flash = PREGUNTAS_DEFAULT[diaNum % PREGUNTAS_DEFAULT.length]
    }

    setPreguntaActiva(flash)

    // 3. Cargar votos de la base de datos Supabase
    const mapaVotos = {}
    let miVoto = null

    try {
      const { data: votosDb } = await supabase
        .from('pregunta_flash_votos')
        .select('*')
        .eq('pregunta_id', flash.id)

      if (votosDb && Array.isArray(votosDb)) {
        votosDb.forEach(v => {
          mapaVotos[v.user_id] = v.opcion_id
          if (userId && v.user_id === userId) {
            miVoto = v.opcion_id
          }
        })
      }
    } catch (e) {}

    // Si aún no tenemos votos de BD, consultar caché local
    if (Object.keys(mapaVotos).length === 0) {
      try {
        const datosVotos = JSON.parse(localStorage.getItem(claveStorage) || '{"votos": {}}')
        Object.assign(mapaVotos, datosVotos.votos || {})
        if (userId && datosVotos.votos && datosVotos.votos[userId]) {
          miVoto = datosVotos.votos[userId]
        }
      } catch (e) {}
    }

    setConteoVotos(mapaVotos)
    setVotoUsuario(miVoto)
  }

  if (!preguntaActiva) return null

  const totalVotos = Object.keys(conteoVotos).length
  const yaVoto = Boolean(votoUsuario)

  const manejarVoto = async (opcionId) => {
    if (yaVoto || votando || !userId) return
    setVotando(true)
    sound.playPop()
    triggerConfetti()

    const nuevosVotos = { ...conteoVotos, [userId]: opcionId }
    setConteoVotos(nuevosVotos)
    setVotoUsuario(opcionId)

    // Guardar en Supabase tabla real pregunta_flash_votos
    try {
      await supabase.from('pregunta_flash_votos').upsert({
        pregunta_id: preguntaActiva.id,
        user_id: userId,
        opcion_id: opcionId,
        created_at: new Date().toISOString()
      })
    } catch (e) {}

    // Backup en localStorage
    try {
      localStorage.setItem(claveStorage, JSON.stringify({ votos: nuevosVotos }))
    } catch (e) {}

    // Transmitir en vivo a toda la clase
    transmitirEvento('nuevo_voto_flash', {
      preguntaId: preguntaActiva.id,
      userId,
      opcionId
    })

    // Sumar +5 pts al alumno y +10 XP a su competencia técnica
    if (onSumarPuntos) {
      onSumarPuntos(5)
    }
    await sumarXpSkill(userId, 'autoria_tecnica', 10)

    setVotando(false)
  }

  // Calcular frecuencias reales
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
    <div
      className="card"
      style={{
        padding: '18px 20px',
        marginBottom: 16,
        backgroundColor: 'var(--color-surface)',
        border: '1px solid var(--color-separator)'
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 10,
              backgroundColor: 'rgba(255, 149, 0, 0.12)',
              color: 'var(--color-warning)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <MessageCircleQuestion size={18} />
          </div>
          <div>
            <span
              className="apple-caption"
              style={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, color: 'var(--color-warning)' }}
            >
              Pregunta Flash del Día
            </span>
            <div style={{ fontSize: 11, color: 'var(--color-secondary-ink)' }}>
              Base de datos en vivo · {totalVotos} {totalVotos === 1 ? 'compañero ha' : 'compañeros han'} votado
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          {yaVoto ? (
            <span className="sello-tinta sello-tinta-verde" style={{ fontSize: 9, padding: '2px 8px' }}>
              ✓ VOTO REGISTRADO
            </span>
          ) : (
            <span className="sello-tinta sello-tinta-azul" style={{ fontSize: 9, padding: '2px 8px' }}>
              +5 PTS
            </span>
          )}
        </div>
      </div>

      <h3
        style={{
          fontSize: 15,
          fontWeight: 700,
          color: 'var(--color-ink)',
          marginBottom: 14,
          lineHeight: 1.35
        }}
      >
        {preguntaActiva.pregunta}
      </h3>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {preguntaActiva.opciones.map(opcion => {
          const esMiVoto = votoUsuario === opcion.id
          const votosEste = frecuencias[opcion.id] || 0
          const pct = totalVotos > 0 ? Math.round((votosEste / totalVotos) * 100) : 0

          return (
            <button
              key={opcion.id}
              type="button"
              disabled={yaVoto || votando}
              onClick={() => manejarVoto(opcion.id)}
              style={{
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 14px',
                borderRadius: 10,
                border: esMiVoto
                  ? '2px solid var(--color-accent)'
                  : '1px solid var(--color-separator)',
                backgroundColor: esMiVoto
                  ? 'rgba(0, 122, 255, 0.08)'
                  : 'var(--color-surface-secondary)',
                color: 'var(--color-ink)',
                cursor: yaVoto ? 'default' : 'pointer',
                overflow: 'hidden',
                textAlign: 'left',
                transition: 'all 0.2s ease'
              }}
            >
              {/* Barra de Porcentaje en vivo si ya votó */}
              {yaVoto && (
                <div
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    bottom: 0,
                    width: `${pct}%`,
                    backgroundColor: esMiVoto ? 'rgba(0, 122, 255, 0.18)' : 'rgba(0, 0, 0, 0.04)',
                    transition: 'width 0.5s ease',
                    zIndex: 0
                  }}
                />
              )}

              <span
                style={{
                  position: 'relative',
                  zIndex: 1,
                  fontSize: 13,
                  fontWeight: esMiVoto ? 700 : 500,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8
                }}
              >
                {esMiVoto && <Check size={16} color="var(--color-accent)" strokeWidth={3} />}
                {opcion.texto}
              </span>

              {yaVoto && (
                <span
                  style={{
                    position: 'relative',
                    zIndex: 1,
                    fontSize: 12,
                    fontWeight: 700,
                    color: esMiVoto ? 'var(--color-accent)' : 'var(--color-secondary-ink)',
                    marginLeft: 10
                  }}
                >
                  {pct}%
                </span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
