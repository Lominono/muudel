import { useState, useEffect } from 'react'
import { supabase } from '../utils/supabase'
import { AvatarUsuario } from './AvatarUsuario'
import { sound } from '../utils/haptics'
import { Check, Clock, X, Key, Copy, CheckCheck, Users, Megaphone, RotateCcw } from 'lucide-react'

export function PanelPaseLista() {
  const [alumnos, setAlumnos] = useState([])
  const [asistenciasHoy, setAsistenciasHoy] = useState({})
  const [cargando, setCargando] = useState(true)
  const [codigoPin, setCodigoPin] = useState(() => localStorage.getItem('racha_pin_hoy') || '')
  const [sesionAbierta, setSesionAbierta] = useState(() => localStorage.getItem('racha_sesion_activa') !== 'false')
  const [avisoClase, setAvisoClase] = useState(() => localStorage.getItem('racha_aviso_hoy') || '')
  const [editandoAviso, setEditandoAviso] = useState(false)
  const [avisoTemporal, setAvisoTemporal] = useState(avisoClase)
  const [copiado, setCopiado] = useState(false)
  const [mensajeEstado, setMensajeEstado] = useState('')

  const hoyStr = new Date().toISOString().split('T')[0]

  useEffect(() => {
    cargarDatos()
  }, [])

  const cargarDatos = () => {
    setCargando(true)
    Promise.all([
      supabase.from('profiles').select('*').eq('rol', 'alumno').order('nombre'),
      supabase.from('checkins').select('*').eq('fecha', hoyStr)
    ]).then(([resProfiles, resCheckins]) => {
      const listaAlumnos = resProfiles.data || []
      setAlumnos(listaAlumnos)

      const mapa = {}
      if (resCheckins.data) {
        resCheckins.data.forEach(chk => {
          mapa[chk.user_id] = chk
        })
      }

      // Combinar con asistencias locales si no hay en remoto
      const localCheckins = localStorage.getItem('racha_checkins_' + hoyStr)
      if (localCheckins) {
        try {
          const parsed = JSON.parse(localCheckins)
          Object.assign(mapa, parsed)
        } catch (e) {}
      }

      setAsistenciasHoy(mapa)
      setCargando(false)
    }).catch(() => {
      setCargando(false)
    })
  }

  // Generar nuevo PIN de 4 dígitos
  const generarPin = () => {
    const nuevoPin = Math.floor(1000 + Math.random() * 9000).toString()
    setCodigoPin(nuevoPin)
    localStorage.setItem('racha_pin_hoy', nuevoPin)
    localStorage.setItem('racha_sesion_activa', 'true')
    setSesionAbierta(true)
    sound.playPop()
  }

  const toggleSesion = () => {
    const nuevoEstado = !sesionAbierta
    setSesionAbierta(nuevoEstado)
    localStorage.setItem('racha_sesion_activa', nuevoEstado ? 'true' : 'false')
    sound.playPop()
  }

  const guardarAviso = () => {
    setAvisoClase(avisoTemporal.trim())
    localStorage.setItem('racha_aviso_hoy', avisoTemporal.trim())
    setEditandoAviso(false)
    sound.playPop()
  }

  // Marcar estado de un alumno
  const marcarEstado = async (alumnoId, tipo) => {
    sound.playPop()
    const horaActual = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

    if (tipo === 'ausente') {
      // Borrar o marcar falta
      const nuevoMapa = { ...asistenciasHoy }
      delete nuevoMapa[alumnoId]
      setAsistenciasHoy(nuevoMapa)
      localStorage.setItem('racha_checkins_' + hoyStr, JSON.stringify(nuevoMapa))

      try {
        await supabase.from('checkins').delete().eq('user_id', alumnoId).eq('fecha', hoyStr)
      } catch (e) {}
      return
    }

    const esTarde = tipo === 'tarde'
    const puntos = esTarde ? 5 : 10
    const record = {
      user_id: alumnoId,
      fecha: hoyStr,
      hora: horaActual,
      es_tarde: esTarde,
      puntos_ganados: puntos
    }

    const nuevoMapa = { ...asistenciasHoy, [alumnoId]: record }
    setAsistenciasHoy(nuevoMapa)
    localStorage.setItem('racha_checkins_' + hoyStr, JSON.stringify(nuevoMapa))

    try {
      await supabase.from('checkins').upsert(record, { onConflict: 'user_id, fecha' })
    } catch (e) {}
  }

  // Marcar a todos como presentes en 1 clic
  const marcarTodosPresentes = async () => {
    sound.playStamp()
    const horaActual = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    const nuevoMapa = { ...asistenciasHoy }
    const registros = []

    alumnos.forEach(al => {
      const rec = {
        user_id: al.id,
        fecha: hoyStr,
        hora: horaActual,
        es_tarde: false,
        puntos_ganados: 10
      }
      nuevoMapa[al.id] = rec
      registros.push(rec)
    })

    setAsistenciasHoy(nuevoMapa)
    localStorage.setItem('racha_checkins_' + hoyStr, JSON.stringify(nuevoMapa))

    try {
      await supabase.from('checkins').upsert(registros, { onConflict: 'user_id, fecha' })
    } catch (e) {}

    setMensajeEstado('Todos los alumnos han sido marcados como presentes.')
    setTimeout(() => setMensajeEstado(''), 3000)
  }

  // Copiar reporte para portapapeles
  const copiarReporte = () => {
    const presentes = alumnos.filter(a => asistenciasHoy[a.id] && !asistenciasHoy[a.id].es_tarde).length
    const tardes = alumnos.filter(a => asistenciasHoy[a.id] && asistenciasHoy[a.id].es_tarde).length
    const ausentes = alumnos.length - (presentes + tardes)

    let texto = `REPORTE DE ASISTENCIA — ${new Date().toLocaleDateString('es-ES')}\n`
    texto += `Total: ${alumnos.length} | Presentes: ${presentes} | Tarde: ${tardes} | Ausentes: ${ausentes}\n\n`

    alumnos.forEach(a => {
      const chk = asistenciasHoy[a.id]
      const estado = !chk ? 'AUSENTE' : chk.es_tarde ? `TARDE (${chk.hora})` : `PRESENTE (${chk.hora})`
      texto += `- ${a.nombre}: ${estado}\n`
    })

    navigator.clipboard.writeText(texto)
    setCopiado(true)
    setTimeout(() => setCopiado(false), 2500)
  }

  const presentesCount = alumnos.filter(a => asistenciasHoy[a.id] && !asistenciasHoy[a.id].es_tarde).length
  const tardesCount = alumnos.filter(a => asistenciasHoy[a.id] && asistenciasHoy[a.id].es_tarde).length
  const porcentaje = alumnos.length > 0 ? Math.round(((presentesCount + tardesCount) / alumnos.length) * 100) : 0

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Tarjeta de métricas del día */}
      <div className="card" style={{ padding: '20px 16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <div>
            <span className="apple-caption" style={{ textTransform: 'uppercase', letterSpacing: 0.8, fontWeight: 700 }}>
              Control de Asistencia
            </span>
            <h2 className="apple-headline" style={{ fontSize: 20 }}>
              Sesión de hoy
            </h2>
          </div>

          <div style={{ textAlign: 'right' }}>
            <span className="apple-badge apple-badge-positive" style={{ fontSize: 13 }}>
              {porcentaje}% presente
            </span>
          </div>
        </div>

        {/* Resumen numérico */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 16 }}>
          <div style={{
            backgroundColor: 'var(--color-surface-secondary)',
            padding: '10px 12px',
            borderRadius: 10,
            border: '1px solid var(--color-separator)',
            textAlign: 'center'
          }}>
            <span className="apple-caption">A tiempo</span>
            <div className="tabular-nums" style={{ fontSize: 20, fontWeight: 700, color: 'var(--color-positive)', marginTop: 2 }}>
              {presentesCount}
            </div>
          </div>

          <div style={{
            backgroundColor: 'var(--color-surface-secondary)',
            padding: '10px 12px',
            borderRadius: 10,
            border: '1px solid var(--color-separator)',
            textAlign: 'center'
          }}>
            <span className="apple-caption">Tarde</span>
            <div className="tabular-nums" style={{ fontSize: 20, fontWeight: 700, color: 'var(--color-warning)', marginTop: 2 }}>
              {tardesCount}
            </div>
          </div>

          <div style={{
            backgroundColor: 'var(--color-surface-secondary)',
            padding: '10px 12px',
            borderRadius: 10,
            border: '1px solid var(--color-separator)',
            textAlign: 'center'
          }}>
            <span className="apple-caption">Ausentes</span>
            <div className="tabular-nums" style={{ fontSize: 20, fontWeight: 700, color: 'var(--color-tertiary-ink)', marginTop: 2 }}>
              {alumnos.length - (presentesCount + tardesCount)}
            </div>
          </div>
        </div>

        {/* Acciones del Administrador */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button
            className="btn-primary btn-positive"
            onClick={marcarTodosPresentes}
            style={{ flex: 1, minHeight: 40, fontSize: 13, gap: 6 }}
          >
            <Check size={16} />
            <span>Todos presentes</span>
          </button>

          <button
            className="btn-secondary"
            onClick={copiarReporte}
            style={{ minHeight: 40, fontSize: 13, gap: 6 }}
          >
            {copiado ? <CheckCheck size={16} color="var(--color-positive)" /> : <Copy size={16} />}
            <span>{copiado ? '¡Copiado!' : 'Copiar acta'}</span>
          </button>
        </div>

        {mensajeEstado && (
          <p className="apple-caption" style={{ color: 'var(--color-positive)', marginTop: 10, textAlign: 'center', fontWeight: 600 }}>
            {mensajeEstado}
          </p>
        )}
      </div>

      {/* Código PIN y Apertura de Sesión para Alumnos */}
      <div className="card" style={{ padding: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Key size={18} color="var(--color-accent)" />
            <h3 className="apple-headline" style={{ fontSize: 15 }}>
              PIN de Validación en Aula
            </h3>
          </div>

          <button
            onClick={toggleSesion}
            style={{
              padding: '4px 10px',
              borderRadius: 9999,
              fontSize: 12,
              fontWeight: 600,
              border: 'none',
              cursor: 'pointer',
              backgroundColor: sesionAbierta ? 'var(--color-positive-bg)' : 'var(--color-fill-secondary)',
              color: sesionAbierta ? 'var(--color-positive)' : 'var(--color-secondary-ink)'
            }}
          >
            {sesionAbierta ? '● Sesión Abierta' : '○ Sesión Cerrada'}
          </button>
        </div>

        <p className="apple-subheadline" style={{ fontSize: 13, marginBottom: 12 }}>
          Proyecta este código en la pizarra para que los alumnos confirmen su presencia con su móvil:
        </p>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            flex: 1,
            backgroundColor: 'var(--color-surface-secondary)',
            border: '1px dashed var(--color-separator-opaque)',
            borderRadius: 12,
            padding: '10px 16px',
            textAlign: 'center',
            fontSize: 24,
            fontWeight: 800,
            letterSpacing: 6,
            color: 'var(--color-accent)',
            fontVariantNumeric: 'tabular-nums'
          }}>
            {codigoPin || '----'}
          </div>

          <button
            className="btn-secondary"
            onClick={generarPin}
            style={{ minHeight: 44, fontSize: 13, gap: 6 }}
          >
            <RotateCcw size={15} />
            <span>{codigoPin ? 'Nuevo PIN' : 'Generar PIN'}</span>
          </button>
        </div>
      </div>

      {/* Tablón de avisos del profesor */}
      <div className="card" style={{ padding: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Megaphone size={18} color="var(--color-warning)" />
            <h3 className="apple-headline" style={{ fontSize: 15 }}>
              Aviso para el grupo
            </h3>
          </div>

          {!editandoAviso && (
            <button
              onClick={() => setEditandoAviso(true)}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--color-accent)',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              {avisoClase ? 'Editar' : 'Añadir aviso'}
            </button>
          )}
        </div>

        {editandoAviso ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <input
              type="text"
              className="apple-input"
              placeholder="Ej: Mañana traer el material de dibujo..."
              value={avisoTemporal}
              onChange={(e) => setAvisoTemporal(e.target.value)}
              style={{ minHeight: 40, fontSize: 14 }}
            />
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button
                className="btn-secondary"
                onClick={() => setEditandoAviso(false)}
                style={{ minHeight: 34, fontSize: 12 }}
              >
                Cancelar
              </button>
              <button
                className="btn-primary"
                onClick={guardarAviso}
                style={{ minHeight: 34, fontSize: 12 }}
              >
                Publicar aviso
              </button>
            </div>
          </div>
        ) : (
          <p className="apple-subheadline" style={{ fontSize: 14, fontStyle: avisoClase ? 'normal' : 'italic' }}>
            {avisoClase || 'No hay ningún aviso publicado para la sesión de hoy.'}
          </p>
        )}
      </div>

      {/* Roster de Alumnos: Pase de Lista Nominal */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{
          padding: '12px 16px',
          borderBottom: '0.5px solid var(--color-separator)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <h3 className="apple-headline" style={{ fontSize: 15, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Users size={16} color="var(--color-accent)" />
            Alumnos inscritos ({alumnos.length})
          </h3>
        </div>

        {cargando ? (
          <div style={{ padding: 24, textAlign: 'center' }}>
            <p className="apple-caption">Cargando lista de clase...</p>
          </div>
        ) : alumnos.length === 0 ? (
          <div style={{ padding: 32, textAlign: 'center' }}>
            <p className="apple-subheadline" style={{ fontSize: 14, color: 'var(--color-secondary-ink)' }}>
              No hay alumnos registrados en el grupo todavía.
            </p>
            <p className="apple-caption" style={{ marginTop: 4 }}>
              Cuando los alumnos inicien sesión, aparecerán aquí para pasar lista.
            </p>
          </div>
        ) : (
          alumnos.map((al, idx) => {
            const chk = asistenciasHoy[al.id]
            const esPresente = chk && !chk.es_tarde
            const esTarde = chk && chk.es_tarde

            return (
              <div
                key={al.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 16px',
                  borderBottom: idx < alumnos.length - 1 ? '0.5px solid var(--color-separator)' : 'none',
                  backgroundColor: esPresente
                    ? 'rgba(52, 199, 89, 0.05)'
                    : esTarde
                    ? 'rgba(255, 149, 0, 0.05)'
                    : 'transparent',
                }}
              >
                {/* Info Alumno */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0, flex: 1, marginRight: 8 }}>
                  <AvatarUsuario nombre={al.nombre} size={34} color={al.color_acento} />
                  <div style={{ minWidth: 0 }}>
                    <div style={{
                      fontWeight: 600,
                      fontSize: 14,
                      color: 'var(--color-ink)',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }}>
                      {al.nombre}
                    </div>
                    <div className="apple-caption" style={{ fontSize: 11 }}>
                      Racha: <strong className="tabular-nums" style={{ color: 'var(--color-ink)' }}>{al.racha_actual || 0}</strong> días
                      {chk && ` · ${chk.hora}`}
                    </div>
                  </div>
                </div>

                {/* Botones de acción directa */}
                <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                  <button
                    onClick={() => marcarEstado(al.id, 'presente')}
                    title="A tiempo (+10 pts)"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: 34,
                      height: 34,
                      borderRadius: 8,
                      border: 'none',
                      cursor: 'pointer',
                      backgroundColor: esPresente ? 'var(--color-positive)' : 'var(--color-fill-secondary)',
                      color: esPresente ? '#FFFFFF' : 'var(--color-secondary-ink)',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <Check size={16} strokeWidth={2.5} />
                  </button>

                  <button
                    onClick={() => marcarEstado(al.id, 'tarde')}
                    title="Llegada tarde (+5 pts)"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: 34,
                      height: 34,
                      borderRadius: 8,
                      border: 'none',
                      cursor: 'pointer',
                      backgroundColor: esTarde ? 'var(--color-warning)' : 'var(--color-fill-secondary)',
                      color: esTarde ? '#FFFFFF' : 'var(--color-secondary-ink)',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <Clock size={16} strokeWidth={2} />
                  </button>

                  <button
                    onClick={() => marcarEstado(al.id, 'ausente')}
                    title="Marcar falta / Ausente"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: 34,
                      height: 34,
                      borderRadius: 8,
                      border: 'none',
                      cursor: 'pointer',
                      backgroundColor: !chk ? 'rgba(255, 59, 48, 0.12)' : 'var(--color-fill-secondary)',
                      color: !chk ? 'var(--color-negative)' : 'var(--color-tertiary-ink)',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <X size={16} strokeWidth={2} />
                  </button>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
