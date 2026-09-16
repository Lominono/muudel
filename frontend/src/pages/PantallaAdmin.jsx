import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../App'
import { supabase } from '../utils/supabase'
import { InsigniaIniciales } from '../components/InsigniaIniciales'
import {
  ShieldCheck,
  Calendar,
  Users,
  Target,
  Plus,
  Check,
  Clock,
  Flame,
  Award,
  Search,
  AlertCircle,
  Sparkles
} from 'lucide-react'

export function PantallaAdmin() {
  const { perfil } = useAuth()
  const navigate = useNavigate()

  const [tab, setTab] = useState('asistencia') // 'asistencia' | 'alumnos' | 'retos'
  const [cargando, setCargando] = useState(true)

  // Datos de asistencia de hoy
  const [checkinsHoy, setCheckinsHoy] = useState([])
  const [todosAlumnos, setTodosAlumnos] = useState([])

  // Registro manual
  const [alumnoManualId, setAlumnoManualId] = useState('')
  const [esTardeManual, setEsTardeManual] = useState(false)
  const [guardandoCheckin, setGuardandoCheckin] = useState(false)

  // Búsqueda de alumnos
  const [busqueda, setBusqueda] = useState('')
  const [accionEnCurso, setAccionEnCurso] = useState(null)
  const [notificacion, setNotificacion] = useState(null)

  // Nuevo Reto
  const [nuevoRetoTitulo, setNuevoRetoTitulo] = useState('')
  const [nuevoRetoDesc, setNuevoRetoDesc] = useState('')
  const [nuevoRetoPuntos, setNuevoRetoPuntos] = useState(25)
  const [retosActivos, setRetosActivos] = useState([])
  const [guardandoReto, setGuardandoReto] = useState(false)

  const fechaHoy = new Date().toISOString().split('T')[0]

  useEffect(() => {
    cargarDatos()
  }, [tab])

  const cargarDatos = async () => {
    setCargando(true)
    try {
      // 1. Cargar todos los alumnos
      const { data: alumnosData } = await supabase
        .from('profiles')
        .select('*')
        .order('nombre', { ascending: true })

      setTodosAlumnos(alumnosData || [])

      // 2. Cargar checkins de hoy con datos de perfil
      const { data: checkinsData } = await supabase
        .from('checkins')
        .select('*, profiles(nombre, color_acento)')
        .eq('fecha', fechaHoy)
        .order('hora', { ascending: true })

      setCheckinsHoy(checkinsData || [])

      // 3. Cargar retos
      const { data: retosData } = await supabase
        .from('retos')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20)

      setRetosActivos(retosData || [])
    } catch (err) {
      console.warn('Error al cargar datos administrativos:', err)
    } finally {
      setCargando(false)
    }
  }

  const avisar = (msg) => {
    setNotificacion(msg)
    setTimeout(() => setNotificacion(null), 3500)
  }

  // Marcar asistencia manual
  const handleRegistrarManual = async (e) => {
    e.preventDefault()
    if (!alumnoManualId) return
    setGuardandoCheckin(true)

    const horaActual = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    const puntos = esTardeManual ? 5 : 10

    try {
      const { error } = await supabase.from('checkins').insert({
        user_id: alumnoManualId,
        fecha: fechaHoy,
        hora: horaActual,
        es_tarde: esTardeManual,
        puntos_ganados: puntos,
      })

      if (error) {
        if (error.code === '23505') {
          avisar('Este alumno ya tiene asistencia registrada para hoy.')
        } else {
          avisar('Error al registrar: ' + error.message)
        }
      } else {
        avisar('Asistencia registrada correctamente.')
        setAlumnoManualId('')
        await cargarDatos()
      }
    } catch (err) {
      avisar('Error al guardar asistencia.')
    } finally {
      setGuardandoCheckin(false)
    }
  }

  // Bonificar puntos a un alumno
  const handleBonificarPuntos = async (alumnoId, puntosSumar) => {
    setAccionEnCurso(alumnoId)
    try {
      const alumno = todosAlumnos.find((a) => a.id === alumnoId)
      if (!alumno) return

      const nuevosPuntos = (alumno.puntos_total || 0) + puntosSumar
      const { error } = await supabase
        .from('profiles')
        .update({ puntos_total: nuevosPuntos, updated_at: new Date().toISOString() })
        .eq('id', alumnoId)

      if (!error) {
        avisar(`+${puntosSumar} puntos otorgados a ${alumno.nombre}.`)
        setTodosAlumnos((prev) =>
          prev.map((a) => (a.id === alumnoId ? { ...a, puntos_total: nuevosPuntos } : a))
        )
      } else {
        avisar('No se pudo asignar puntos.')
      }
    } catch (err) {
      avisar('Error al actualizar puntos.')
    } finally {
      setAccionEnCurso(null)
    }
  }

  // Cambiar rol
  const handleCambiarRol = async (alumnoId, nuevoRol) => {
    setAccionEnCurso(alumnoId)
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ rol: nuevoRol, updated_at: new Date().toISOString() })
        .eq('id', alumnoId)

      if (!error) {
        avisar(`Rol actualizado a ${nuevoRol}.`)
        setTodosAlumnos((prev) =>
          prev.map((a) => (a.id === alumnoId ? { ...a, rol: nuevoRol } : a))
        )
      }
    } catch (err) {
      avisar('Error al modificar rol.')
    } finally {
      setAccionEnCurso(null)
    }
  }

  // Crear Reto
  const handleCrearReto = async (e) => {
    e.preventDefault()
    if (!nuevoRetoTitulo.trim()) return
    setGuardandoReto(true)

    try {
      const { data, error } = await supabase.from('retos').insert({
        titulo: nuevoRetoTitulo.trim(),
        descripcion: nuevoRetoDesc.trim() || null,
        puntos: Number(nuevoRetoPuntos),
        creado_por: perfil?.id || null,
        activo: true,
      }).select().single()

      if (!error && data) {
        avisar('Nuevo reto publicado con éxito.')
        setRetosActivos((prev) => [data, ...prev])
        setNuevoRetoTitulo('')
        setNuevoRetoDesc('')
      } else {
        avisar(error?.message || 'Error al crear reto.')
      }
    } catch (err) {
      avisar('Error al conectar con la base de datos.')
    } finally {
      setGuardandoReto(false)
    }
  }

  // Restricción de acceso si no es moderador
  if (perfil && perfil.rol !== 'moderador') {
    return (
      <main style={{ maxWidth: 480, margin: '60px auto', padding: '24px', textAlign: 'center' }}>
        <div className="card" style={{ padding: '36px 24px' }}>
          <AlertCircle size={40} color="var(--color-warning)" style={{ margin: '0 auto 12px' }} />
          <h2 className="apple-title-1" style={{ fontSize: 20, marginBottom: 8 }}>
            Acceso Reservado
          </h2>
          <p className="apple-subheadline" style={{ marginBottom: 20 }}>
            Este panel de control está destinado exclusivamente a profesores y moderadores de la clase.
          </p>
          <button className="btn-primary" onClick={() => navigate('/')} style={{ width: '100%' }}>
            Volver a la vista principal
          </button>
        </div>
      </main>
    )
  }

  const alumnosFiltrados = todosAlumnos.filter((a) =>
    (a.nombre || '').toLowerCase().includes(busqueda.toLowerCase())
  )

  const aTiempoCount = checkinsHoy.filter((c) => !c.es_tarde).length
  const tardeCount = checkinsHoy.filter((c) => c.es_tarde).length

  return (
    <main style={{ maxWidth: 540, margin: '0 auto', padding: '20px 16px 40px' }}>
      {/* Cabecera del Panel */}
      <header style={{ marginBottom: 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
          <ShieldCheck size={26} color="var(--color-accent)" />
          <h1 className="apple-large-title" style={{ fontSize: 28 }}>
            Panel de Gestión
          </h1>
        </div>
        <p className="apple-subheadline">
          Control de asistencia diaria, alumnos y retos académicos.
        </p>
      </header>

      {/* Notificación flotante / aviso */}
      {notificacion && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '10px 14px',
          borderRadius: 12,
          backgroundColor: 'var(--color-surface)',
          border: '1px solid var(--color-separator)',
          boxShadow: 'var(--card-shadow)',
          marginBottom: 16,
          fontSize: 14,
          fontWeight: 500,
          color: 'var(--color-ink)',
        }}>
          <Check size={16} color="var(--color-positive)" />
          <span>{notificacion}</span>
        </div>
      )}

      {/* Selector de Sección (Segmented Control) */}
      <div className="segmented-control" style={{ marginBottom: 18 }}>
        <button
          type="button"
          className={`segmented-control-item ${tab === 'asistencia' ? 'active' : ''}`}
          onClick={() => setTab('asistencia')}
        >
          <Calendar size={15} style={{ marginRight: 6 }} />
          Asistencia Hoy
        </button>
        <button
          type="button"
          className={`segmented-control-item ${tab === 'alumnos' ? 'active' : ''}`}
          onClick={() => setTab('alumnos')}
        >
          <Users size={15} style={{ marginRight: 6 }} />
          Alumnos ({todosAlumnos.length})
        </button>
        <button
          type="button"
          className={`segmented-control-item ${tab === 'retos' ? 'active' : ''}`}
          onClick={() => setTab('retos')}
        >
          <Target size={15} style={{ marginRight: 6 }} />
          Retos
        </button>
      </div>

      {/* PESTAÑA 1: ASISTENCIA HOY */}
      {tab === 'asistencia' && (
        <div>
          {/* Métricas del día */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 16 }}>
            <div className="card" style={{ textAlign: 'center', padding: '14px 10px', margin: 0 }}>
              <span className="apple-caption" style={{ fontWeight: 600 }}>Presentes</span>
              <div className="tabular-nums" style={{ fontSize: 24, fontWeight: 700, color: 'var(--color-ink)', marginTop: 2 }}>
                {checkinsHoy.length}
              </div>
            </div>
            <div className="card" style={{ textAlign: 'center', padding: '14px 10px', margin: 0 }}>
              <span className="apple-caption" style={{ fontWeight: 600, color: 'var(--color-positive)' }}>A tiempo</span>
              <div className="tabular-nums" style={{ fontSize: 24, fontWeight: 700, color: 'var(--color-positive)', marginTop: 2 }}>
                {aTiempoCount}
              </div>
            </div>
            <div className="card" style={{ textAlign: 'center', padding: '14px 10px', margin: 0 }}>
              <span className="apple-caption" style={{ fontWeight: 600, color: 'var(--color-warning)' }}>Tarde</span>
              <div className="tabular-nums" style={{ fontSize: 24, fontWeight: 700, color: 'var(--color-warning)', marginTop: 2 }}>
                {tardeCount}
              </div>
            </div>
          </div>

          {/* Formulario de Asistencia Manual */}
          <section className="card" style={{ marginBottom: 16 }}>
            <h3 className="apple-headline" style={{ fontSize: 16, marginBottom: 10 }}>
              Registrar Asistencia Manual
            </h3>
            <form onSubmit={handleRegistrarManual} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <select
                className="apple-input"
                value={alumnoManualId}
                onChange={(e) => setAlumnoManualId(e.target.value)}
                required
                style={{ cursor: 'pointer' }}
              >
                <option value="">Selecciona un alumno...</option>
                {todosAlumnos.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.nombre} ({a.rol})
                  </option>
                ))}
              </select>

              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 14 }}>
                  <input
                    type="radio"
                    name="tipoLlegada"
                    checked={!esTardeManual}
                    onChange={() => setEsTardeManual(false)}
                  />
                  <span>A tiempo (+10 pts)</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 14 }}>
                  <input
                    type="radio"
                    name="tipoLlegada"
                    checked={esTardeManual}
                    onChange={() => setEsTardeManual(true)}
                  />
                  <span>Tarde (+5 pts)</span>
                </label>
              </div>

              <button
                type="submit"
                className="btn-primary"
                disabled={guardandoCheckin || !alumnoManualId}
                style={{ width: '100%', minHeight: 40, marginTop: 4 }}
              >
                {guardandoCheckin ? 'Guardando...' : 'Confirmar Registro'}
              </button>
            </form>
          </section>

          {/* Lista de Alumnos Presentes Hoy */}
          <section className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--color-separator)' }}>
              <h3 className="apple-headline" style={{ fontSize: 16 }}>
                Registro de Asistencia del Día ({checkinsHoy.length})
              </h3>
            </div>

            {checkinsHoy.length === 0 ? (
              <div style={{ padding: '36px 20px', textAlign: 'center' }}>
                <Clock size={28} color="var(--color-tertiary-ink)" style={{ margin: '0 auto 8px' }} />
                <p className="apple-subheadline" style={{ fontSize: 14 }}>
                  Aún ningún alumno ha marcado asistencia hoy.
                </p>
              </div>
            ) : (
              <div>
                {checkinsHoy.map((chk, i) => {
                  const nombreAlumno = chk.profiles?.nombre || 'Alumno'
                  const colorAlumno = chk.profiles?.color_acento || '#0A84FF'

                  return (
                    <div
                      key={chk.id || i}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '12px 16px',
                        borderBottom: i < checkinsHoy.length - 1 ? '0.5px solid var(--color-separator)' : 'none',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <InsigniaIniciales nombre={nombreAlumno} color={colorAlumno} size={36} fontSize={14} />
                        <div>
                          <div style={{ fontWeight: 600, fontSize: 15, color: 'var(--color-ink)' }}>
                            {nombreAlumno}
                          </div>
                          <span className="apple-caption tabular-nums">
                            Hora de registro: {chk.hora || '--:--'}
                          </span>
                        </div>
                      </div>

                      <span className={`apple-badge ${chk.es_tarde ? 'apple-badge-flame' : 'apple-badge-positive'}`}>
                        {chk.es_tarde ? 'Tarde (+5)' : 'A tiempo (+10)'}
                      </span>
                    </div>
                  )
                })}
              </div>
            )}
          </section>
        </div>
      )}

      {/* PESTAÑA 2: COMUNIDAD DE ALUMNOS */}
      {tab === 'alumnos' && (
        <div>
          {/* Buscador */}
          <div style={{ position: 'relative', marginBottom: 14 }}>
            <Search size={18} style={{
              position: 'absolute',
              left: 14,
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--color-tertiary-ink)',
            }} />
            <input
              type="text"
              className="apple-input"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar alumno por nombre..."
              style={{ paddingLeft: 42 }}
            />
          </div>

          <section className="card" style={{ padding: 0, overflow: 'hidden' }}>
            {alumnosFiltrados.length === 0 ? (
              <div style={{ padding: 36, textAlign: 'center' }}>
                <p className="apple-subheadline" style={{ fontSize: 14 }}>
                  No se encontraron alumnos con ese nombre.
                </p>
              </div>
            ) : (
              alumnosFiltrados.map((alumno, i) => (
                <div
                  key={alumno.id}
                  style={{
                    padding: '14px 16px',
                    borderBottom: i < alumnosFiltrados.length - 1 ? '0.5px solid var(--color-separator)' : 'none',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <InsigniaIniciales nombre={alumno.nombre} color={alumno.color_acento} size={40} fontSize={15} />
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 15 }}>
                          {alumno.nombre}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 2 }}>
                          <span className={`apple-badge ${alumno.rol === 'moderador' ? 'apple-badge-accent' : ''}`} style={{ fontSize: 11 }}>
                            {alumno.rol === 'moderador' ? 'Profesor' : 'Alumno'}
                          </span>
                          <span className="apple-caption" style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                            <Flame size={12} color="var(--color-warning)" />
                            Racha: {alumno.racha_actual || 0}d
                          </span>
                        </div>
                      </div>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <span className="tabular-nums" style={{ fontSize: 18, fontWeight: 700, color: 'var(--color-accent)' }}>
                        {alumno.puntos_total || 0}
                      </span>
                      <span className="apple-caption" style={{ marginLeft: 3 }}>pts</span>
                    </div>
                  </div>

                  {/* Acciones para profesores */}
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 10 }}>
                    <button
                      type="button"
                      className="btn-secondary"
                      disabled={accionEnCurso === alumno.id}
                      onClick={() => handleBonificarPuntos(alumno.id, 5)}
                      style={{ minHeight: 32, padding: '4px 10px', fontSize: 12 }}
                    >
                      +5 pts (Participación)
                    </button>
                    <button
                      type="button"
                      className="btn-secondary"
                      disabled={accionEnCurso === alumno.id}
                      onClick={() => handleBonificarPuntos(alumno.id, 10)}
                      style={{ minHeight: 32, padding: '4px 10px', fontSize: 12 }}
                    >
                      +10 pts (Aporte)
                    </button>
                    {alumno.rol !== 'moderador' ? (
                      <button
                        type="button"
                        className="btn-secondary"
                        disabled={accionEnCurso === alumno.id}
                        onClick={() => handleCambiarRol(alumno.id, 'moderador')}
                        style={{ minHeight: 32, padding: '4px 10px', fontSize: 12, color: 'var(--color-accent)' }}
                      >
                        Hacer Moderador
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="btn-secondary"
                        disabled={accionEnCurso === alumno.id}
                        onClick={() => handleCambiarRol(alumno.id, 'alumno')}
                        style={{ minHeight: 32, padding: '4px 10px', fontSize: 12, color: 'var(--color-secondary-ink)' }}
                      >
                        Cambiar a Alumno
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </section>
        </div>
      )}

      {/* PESTAÑA 3: RETOS DE CLASE */}
      {tab === 'retos' && (
        <div>
          {/* Formulario de Nuevo Reto */}
          <section className="card" style={{ marginBottom: 16 }}>
            <h3 className="apple-headline" style={{ fontSize: 16, marginBottom: 12 }}>
              Crear Nuevo Reto de Clase
            </h3>

            <form onSubmit={handleCrearReto} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label className="apple-caption" style={{ display: 'block', marginBottom: 4, fontWeight: 500 }}>
                  Título del reto (5 - 100 caracteres)
                </label>
                <input
                  type="text"
                  className="apple-input"
                  value={nuevoRetoTitulo}
                  onChange={(e) => setNuevoRetoTitulo(e.target.value)}
                  placeholder="Ej: Resolver problemas del tema 3 antes de las 18:00"
                  minLength={5}
                  maxLength={100}
                  required
                />
              </div>

              <div>
                <label className="apple-caption" style={{ display: 'block', marginBottom: 4, fontWeight: 500 }}>
                  Descripción o instrucciones
                </label>
                <textarea
                  className="apple-input"
                  value={nuevoRetoDesc}
                  onChange={(e) => setNuevoRetoDesc(e.target.value)}
                  placeholder="Explica detalladamente en qué consiste el reto..."
                  rows={3}
                  style={{ resize: 'vertical' }}
                />
              </div>

              <div>
                <label className="apple-caption" style={{ display: 'block', marginBottom: 4, fontWeight: 500 }}>
                  Puntos de recompensa XP
                </label>
                <select
                  className="apple-input"
                  value={nuevoRetoPuntos}
                  onChange={(e) => setNuevoRetoPuntos(Number(e.target.value))}
                  style={{ cursor: 'pointer' }}
                >
                  <option value={10}>10 puntos (Reto básico)</option>
                  <option value={25}>25 puntos (Reto estándar)</option>
                  <option value={50}>50 puntos (Reto avanzado)</option>
                  <option value={100}>100 puntos (Gran desafío)</option>
                </select>
              </div>

              <button
                type="submit"
                className="btn-primary"
                disabled={guardandoReto || !nuevoRetoTitulo.trim()}
                style={{ width: '100%', minHeight: 42, marginTop: 4 }}
              >
                {guardandoReto ? 'Publicando...' : 'Publicar Reto'}
              </button>
            </form>
          </section>

          {/* Listado de Retos Activos */}
          <section className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--color-separator)' }}>
              <h3 className="apple-headline" style={{ fontSize: 16 }}>
                Retos Publicados ({retosActivos.length})
              </h3>
            </div>

            {retosActivos.length === 0 ? (
              <div style={{ padding: 36, textAlign: 'center' }}>
                <p className="apple-subheadline" style={{ fontSize: 14 }}>
                  No hay retos activos. Publica el primer reto arriba.
                </p>
              </div>
            ) : (
              retosActivos.map((r, i) => (
                <div
                  key={r.id || i}
                  style={{
                    padding: '14px 16px',
                    borderBottom: i < retosActivos.length - 1 ? '0.5px solid var(--color-separator)' : 'none',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 4 }}>
                        {r.titulo}
                      </div>
                      {r.descripcion && (
                        <p className="apple-subheadline" style={{ fontSize: 13, marginBottom: 6 }}>
                          {r.descripcion}
                        </p>
                      )}
                    </div>
                    <span className="apple-badge apple-badge-accent" style={{ flexShrink: 0 }}>
                      +{r.puntos} XP
                    </span>
                  </div>
                </div>
              ))
            )}
          </section>
        </div>
      )}
    </main>
  )
}
