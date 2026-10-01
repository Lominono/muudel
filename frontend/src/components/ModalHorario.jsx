// frontend/src/components/ModalHorario.jsx
import { useState, useEffect } from 'react'
import { X, ZoomIn, ZoomOut, Calendar, Clock, Sparkles } from 'lucide-react'
import { ASIGNATURAS, HORAS, HORARIO_SEMANAL, getEstadoHorarioCompleto } from '../utils/horarioData'
import { sound } from '../utils/haptics'

const DIAS = [
  { id: 1, nombre: 'Lunes', corto: 'Lun' },
  { id: 2, nombre: 'Martes', corto: 'Mar' },
  { id: 3, nombre: 'Miércoles', corto: 'Mié' },
  { id: 4, nombre: 'Jueves', corto: 'Jue' },
  { id: 5, nombre: 'Viernes', corto: 'Vie' }
]

export function ModalHorario({ abierto, onCerrar }) {
  const [zoom, setZoom] = useState(false)
  const [pestaña, setPestaña] = useState('semanal') // 'semanal' | 'foto' | 'profesores'
  const [estadoHorario, setEstadoHorario] = useState(() => getEstadoHorarioCompleto())
  const [diaSeleccionadoMobile, setDiaSeleccionadoMobile] = useState(() => {
    const d = new Date().getDay()
    return d >= 1 && d <= 5 ? d : 1
  })

  // Actualizar estado en tiempo real cada 15 segundos
  useEffect(() => {
    if (!abierto) return
    const actualizar = () => setEstadoHorario(getEstadoHorarioCompleto())
    actualizar()
    const timer = setInterval(actualizar, 15000)
    return () => clearInterval(timer)
  }, [abierto])

  if (!abierto) return null

  const diaActualNum = new Date().getDay()

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.7)',
      backdropFilter: 'blur(16px)',
      WebkitBackdropFilter: 'blur(16px)',
      zIndex: 4000,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '12px',
      animation: 'fadeIn 0.2s ease-out'
    }}>
      <div className="card" style={{
        maxWidth: 880,
        width: '100%',
        maxHeight: '94vh',
        display: 'flex',
        flexDirection: 'column',
        padding: 0,
        overflow: 'hidden',
        boxShadow: '0 24px 60px rgba(0, 0, 0, 0.3)',
        border: '1px solid var(--color-separator)'
      }}>
        {/* Cabecera */}
        <div style={{
          padding: '14px 18px',
          borderBottom: '1px solid var(--color-separator)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: 'var(--color-surface)',
          flexShrink: 0
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              backgroundColor: 'rgba(0, 122, 255, 0.12)',
              color: 'var(--color-accent)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Calendar size={19} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <h3 style={{ fontSize: 16, fontWeight: 800, margin: 0, color: 'var(--color-ink)' }}>
                  Horario SMR2 Tarde 26-27
                </h3>
                {estadoHorario.estado === 'en_clase' && (
                  <span style={{
                    fontSize: 10,
                    fontWeight: 800,
                    padding: '2px 7px',
                    borderRadius: 9999,
                    backgroundColor: 'rgba(52, 199, 89, 0.15)',
                    color: 'var(--color-positive)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4
                  }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: 'var(--color-positive)', display: 'inline-block' }} />
                    EN CLASE
                  </span>
                )}
                {estadoHorario.estado === 'en_descanso' && (
                  <span style={{
                    fontSize: 10,
                    fontWeight: 800,
                    padding: '2px 7px',
                    borderRadius: 9999,
                    backgroundColor: 'rgba(255, 149, 0, 0.15)',
                    color: 'var(--color-warning)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4
                  }}>
                    ☕ RECREO
                  </span>
                )}
              </div>
              <p style={{ fontSize: 12, color: 'var(--color-secondary-ink)', margin: '1px 0 0' }}>
                15:30 a 21:15 · Lunes a Viernes · IES SMR2
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {pestaña === 'foto' && (
              <button
                type="button"
                onClick={() => setZoom(!zoom)}
                title={zoom ? 'Reducir' : 'Ampliar foto'}
                style={{
                  padding: '6px 12px',
                  borderRadius: 8,
                  border: '1px solid var(--color-separator)',
                  backgroundColor: 'var(--color-surface-secondary)',
                  color: 'var(--color-ink)',
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4
                }}
              >
                {zoom ? <ZoomOut size={14} /> : <ZoomIn size={14} />}
                <span>{zoom ? 'Ajustar' : 'Zoom'}</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => { sound.playPop(); onCerrar() }}
              style={{
                width: 32,
                height: 32,
                borderRadius: '50%',
                border: 'none',
                backgroundColor: 'var(--color-fill-secondary)',
                color: 'var(--color-secondary-ink)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'background-color 0.15s ease'
              }}
            >
              <X size={17} />
            </button>
          </div>
        </div>

        {/* Banner de Estado en Vivo */}
        <div style={{
          padding: '10px 18px',
          borderBottom: '1px solid var(--color-separator)',
          backgroundColor: estadoHorario.estado === 'en_clase'
            ? 'rgba(52, 199, 89, 0.08)'
            : estadoHorario.estado === 'en_descanso'
            ? 'rgba(255, 149, 0, 0.08)'
            : 'var(--color-surface-secondary)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 10,
          flexShrink: 0
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
            <Clock size={16} color={
              estadoHorario.estado === 'en_clase' ? 'var(--color-positive)' :
              estadoHorario.estado === 'en_descanso' ? 'var(--color-warning)' :
              'var(--color-accent)'
            } />
            {estadoHorario.estado === 'en_clase' && estadoHorario.claseActual ? (
              <span>
                <strong>Ahora ({estadoHorario.claseActual.rango}):</strong>{' '}
                <span style={{ color: 'var(--color-positive)', fontWeight: 700 }}>
                  {estadoHorario.claseActual.codigo} - {estadoHorario.claseActual.nombre}
                </span>{' '}
                · {estadoHorario.claseActual.profesor} ({estadoHorario.claseActual.minutosRestantes}m restantes)
              </span>
            ) : estadoHorario.estado === 'en_descanso' ? (
              <span>
                <strong>Recreo oficial (18:10 - 18:35):</strong>{' '}
                <span style={{ color: 'var(--color-warning)', fontWeight: 700 }}>
                  Tiempo de descanso en el aula
                </span>{' '}
                ({estadoHorario.claseActual?.minutosRestantes}m restantes)
              </span>
            ) : estadoHorario.estado === 'antes_de_clase' ? (
              <span>
                <strong>Próxima clase hoy a las 15:30:</strong>{' '}
                {estadoHorario.proximaClase ? (
                  <span style={{ color: 'var(--color-accent)', fontWeight: 700 }}>
                    {estadoHorario.proximaClase.codigo} - {estadoHorario.proximaClase.nombre} ({estadoHorario.proximaClase.profesor})
                  </span>
                ) : 'Comienzo de jornada'}
              </span>
            ) : (
              <span style={{ color: 'var(--color-secondary-ink)' }}>
                {estadoHorario.mensaje}
              </span>
            )}
          </div>

          {estadoHorario.proximaClase && estadoHorario.estado === 'en_clase' && (
            <div style={{ fontSize: 11, color: 'var(--color-secondary-ink)' }}>
              Siguiente: <strong>{estadoHorario.proximaClase.codigo}</strong> ({estadoHorario.proximaClase.rango})
            </div>
          )}
        </div>

        {/* Pestañas de Vista */}
        <div style={{
          padding: '8px 16px',
          borderBottom: '1px solid var(--color-separator)',
          backgroundColor: 'var(--color-surface)',
          display: 'flex',
          gap: 8,
          flexShrink: 0
        }}>
          {[
            { id: 'semanal', label: 'Horario Semanal' },
            { id: 'foto', label: 'Foto Oficial' },
            { id: 'profesores', label: 'Módulos y Profesores' }
          ].map(p => {
            const activa = pestaña === p.id
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => { sound.playPop(); setPestaña(p.id) }}
                style={{
                  padding: '6px 14px',
                  borderRadius: 8,
                  border: 'none',
                  backgroundColor: activa ? 'var(--color-accent)' : 'var(--color-surface-secondary)',
                  color: activa ? '#FFFFFF' : 'var(--color-secondary-ink)',
                  fontWeight: activa ? 700 : 500,
                  fontSize: 12,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                {p.label}
              </button>
            )
          })}
        </div>

        {/* Selector de día para pantallas móviles */}
        {pestaña === 'semanal' && (
          <div className="flex md:hidden" style={{
            padding: '6px 16px',
            borderBottom: '1px solid var(--color-separator)',
            backgroundColor: 'var(--color-surface-secondary)',
            gap: 6,
            overflowX: 'auto',
            flexShrink: 0
          }}>
            {DIAS.map(d => {
              const sel = diaSeleccionadoMobile === d.id
              const esHoy = diaActualNum === d.id
              return (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => { sound.playPop(); setDiaSeleccionadoMobile(d.id) }}
                  style={{
                    padding: '4px 10px',
                    borderRadius: 9999,
                    fontSize: 12,
                    fontWeight: 700,
                    border: sel ? '1px solid var(--color-accent)' : '1px solid var(--color-separator)',
                    backgroundColor: sel ? 'var(--color-accent)' : 'var(--color-surface)',
                    color: sel ? '#FFFFFF' : (esHoy ? 'var(--color-accent)' : 'var(--color-secondary-ink)'),
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4
                  }}
                >
                  <span>{d.corto}</span>
                  {esHoy && <span style={{ fontSize: 9, opacity: sel ? 0.9 : 1 }}>• Hoy</span>}
                </button>
              )
            })}
          </div>
        )}

        {/* Contenido Principal */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          overflowX: pestaña === 'foto' && zoom ? 'auto' : 'hidden',
          padding: pestaña === 'semanal' ? 14 : 16,
          backgroundColor: 'var(--color-bg)'
        }}>
          {/* TAB 1: HORARIO SEMANAL */}
          {pestaña === 'semanal' && (
            <div>
              {/* VISTA DESKTOP / TABLET (GRID DE 5 DÍAS) */}
              <div className="hidden md:grid" style={{
                gridTemplateColumns: '80px repeat(5, 1fr)',
                gap: 8,
                alignItems: 'stretch'
              }}>
                {/* Cabecera esquina vacía */}
                <div style={{
                  padding: '8px 4px',
                  textAlign: 'center',
                  fontSize: 11,
                  fontWeight: 700,
                  color: 'var(--color-secondary-ink)'
                }}>
                  Hora
                </div>

                {/* Cabeceras de días */}
                {DIAS.map(d => {
                  const esHoy = diaActualNum === d.id
                  return (
                    <div
                      key={d.id}
                      style={{
                        padding: '8px 10px',
                        borderRadius: 8,
                        textAlign: 'center',
                        backgroundColor: esHoy ? 'rgba(0, 122, 255, 0.12)' : 'var(--color-surface)',
                        border: esHoy ? '1px solid var(--color-accent)' : '1px solid var(--color-separator)'
                      }}
                    >
                      <div style={{ fontSize: 13, fontWeight: 800, color: esHoy ? 'var(--color-accent)' : 'var(--color-ink)' }}>
                        {d.nombre}
                      </div>
                      {esHoy && (
                        <span style={{ fontSize: 10, fontWeight: 800, color: 'var(--color-accent)' }}>
                          HOY
                        </span>
                      )}
                    </div>
                  )
                })}

                {/* Filas por cada tramo horario */}
                {HORAS.map(h => {
                  const esDescanso = h.esDescanso
                  const tramoEsActivo = estadoHorario.tramoActualId === h.id

                  return (
                    <div key={h.id} style={{ display: 'contents' }}>
                      {/* Columna de hora */}
                      <div style={{
                        padding: '8px 4px',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'center',
                        alignItems: 'center',
                        fontSize: 10,
                        fontWeight: 700,
                        color: tramoEsActivo ? 'var(--color-accent)' : 'var(--color-secondary-ink)',
                        borderRadius: 6,
                        backgroundColor: tramoEsActivo ? 'rgba(0, 122, 255, 0.08)' : 'transparent',
                        border: tramoEsActivo ? '1px dashed var(--color-accent)' : 'none'
                      }}>
                        <span>{h.inicio}</span>
                        <span style={{ opacity: 0.5 }}>↓</span>
                        <span>{h.fin}</span>
                      </div>

                      {/* 5 Celdas para cada día */}
                      {DIAS.map(d => {
                        const esHoy = diaActualNum === d.id
                        const esCeldaActiva = esHoy && tramoEsActivo

                        if (esDescanso) {
                          return (
                            <div
                              key={d.id}
                              style={{
                                padding: '6px 8px',
                                borderRadius: 8,
                                backgroundColor: esCeldaActiva ? 'rgba(255, 149, 0, 0.2)' : 'rgba(255, 149, 0, 0.06)',
                                border: esCeldaActiva ? '2px solid var(--color-warning)' : '1px dashed rgba(255, 149, 0, 0.3)',
                                textAlign: 'center',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: 11,
                                fontWeight: 700,
                                color: 'var(--color-warning)'
                              }}
                            >
                              ☕ Recreo
                            </div>
                          )
                        }

                        const horarioDelDia = HORARIO_SEMANAL[d.id] || []
                        const item = horarioDelDia.find(it => it.horaId === h.id)
                        const asig = item && ASIGNATURAS[item.codigo] ? ASIGNATURAS[item.codigo] : null

                        if (!asig) {
                          return (
                            <div
                              key={d.id}
                              style={{
                                padding: '6px 8px',
                                borderRadius: 8,
                                backgroundColor: 'var(--color-surface-secondary)',
                                border: '1px solid var(--color-separator)',
                                opacity: 0.4
                              }}
                            />
                          )
                        }

                        return (
                          <div
                            key={d.id}
                            style={{
                              padding: '8px 10px',
                              borderRadius: 8,
                              backgroundColor: esCeldaActiva ? 'rgba(52, 199, 89, 0.12)' : 'var(--color-surface)',
                              border: esCeldaActiva
                                ? '2px solid var(--color-positive)'
                                : esHoy
                                ? '1px solid rgba(0, 122, 255, 0.25)'
                                : '1px solid var(--color-separator)',
                              boxShadow: esCeldaActiva ? '0 0 12px rgba(52, 199, 89, 0.3)' : 'none',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: 2,
                              transition: 'all 0.15s ease'
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 4 }}>
                              <span style={{
                                fontSize: 12,
                                fontWeight: 800,
                                color: asig.color
                              }}>
                                {asig.codigo}
                              </span>
                              {esCeldaActiva && (
                                <span style={{
                                  fontSize: 8,
                                  fontWeight: 800,
                                  padding: '1px 5px',
                                  borderRadius: 4,
                                  backgroundColor: 'var(--color-positive)',
                                  color: '#FFFFFF'
                                }}>
                                  AHORA
                                </span>
                              )}
                            </div>
                            <span style={{
                              fontSize: 11,
                              color: 'var(--color-ink)',
                              lineHeight: 1.2,
                              display: '-webkit-box',
                              WebkitLineClamp: 1,
                              WebkitBoxOrient: 'vertical',
                              overflow: 'hidden'
                            }}>
                              {asig.nombre}
                            </span>
                            <span style={{
                              fontSize: 9,
                              color: 'var(--color-secondary-ink)',
                              display: '-webkit-box',
                              WebkitLineClamp: 1,
                              WebkitBoxOrient: 'vertical',
                              overflow: 'hidden'
                            }}>
                              {asig.profesor.split(' ')[0]} {asig.profesor.split(' ')[1] || ''}
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  )
                })}
              </div>

              {/* VISTA MÓVIL (DÍA SELECCIONADO DETALLADO) */}
              <div className="flex md:hidden" style={{ flexDirection: 'column', gap: 8 }}>
                {HORAS.map(h => {
                  const esDescanso = h.esDescanso
                  const esHoy = diaActualNum === diaSeleccionadoMobile
                  const tramoEsActivo = esHoy && estadoHorario.tramoActualId === h.id

                  if (esDescanso) {
                    return (
                      <div
                        key={h.id}
                        style={{
                          padding: '10px 14px',
                          borderRadius: 10,
                          backgroundColor: tramoEsActivo ? 'rgba(255, 149, 0, 0.2)' : 'rgba(255, 149, 0, 0.08)',
                          border: tramoEsActivo ? '2px solid var(--color-warning)' : '1px dashed rgba(255, 149, 0, 0.35)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontSize: 16 }}>☕</span>
                          <div>
                            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-warning)' }}>
                              Descanso / Recreo
                            </div>
                            <div style={{ fontSize: 11, color: 'var(--color-secondary-ink)' }}>
                              25 minutos de pausa
                            </div>
                          </div>
                        </div>
                        <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-warning)' }}>
                          {h.rango}
                        </span>
                      </div>
                    )
                  }

                  const horarioDelDia = HORARIO_SEMANAL[diaSeleccionadoMobile] || []
                  const item = horarioDelDia.find(it => it.horaId === h.id)
                  const asig = item && ASIGNATURAS[item.codigo] ? ASIGNATURAS[item.codigo] : null

                  if (!asig) return null

                  return (
                    <div
                      key={h.id}
                      style={{
                        padding: '12px 14px',
                        borderRadius: 12,
                        backgroundColor: tramoEsActivo ? 'rgba(52, 199, 89, 0.12)' : 'var(--color-surface)',
                        border: tramoEsActivo ? '2px solid var(--color-positive)' : '1px solid var(--color-separator)',
                        boxShadow: tramoEsActivo ? '0 0 14px rgba(52, 199, 89, 0.25)' : 'none',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 12
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{
                          padding: '4px 8px',
                          borderRadius: 6,
                          backgroundColor: asig.colorBg,
                          color: asig.color,
                          fontWeight: 800,
                          fontSize: 12
                        }}>
                          {asig.codigo}
                        </span>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-ink)' }}>
                              {asig.nombre}
                            </span>
                            {tramoEsActivo && (
                              <span style={{
                                fontSize: 9,
                                fontWeight: 800,
                                padding: '1px 6px',
                                borderRadius: 4,
                                backgroundColor: 'var(--color-positive)',
                                color: '#FFFFFF'
                              }}>
                                EN CURSO
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: 11, color: 'var(--color-secondary-ink)', marginTop: 2 }}>
                            {asig.profesor}
                          </div>
                        </div>
                      </div>

                      <span className="tabular-nums" style={{
                        fontSize: 11,
                        fontWeight: 600,
                        color: tramoEsActivo ? 'var(--color-positive)' : 'var(--color-secondary-ink)',
                        flexShrink: 0
                      }}>
                        {h.rango}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* TAB 2: FOTO OFICIAL */}
          {pestaña === 'foto' && (
            <div
              style={{
                width: '100%',
                display: 'flex',
                justifyContent: 'center',
                cursor: zoom ? 'zoom-out' : 'zoom-in'
              }}
              onClick={() => setZoom(!zoom)}
            >
              <img
                src="/horario_smr2.png"
                alt="Horario SMR2 Tarde 26-27"
                style={{
                  width: zoom ? '140%' : '100%',
                  maxWidth: zoom ? 'none' : '100%',
                  borderRadius: 12,
                  boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
                  border: '1px solid var(--color-separator)',
                  backgroundColor: '#FFFFFF',
                  transition: 'width 0.2s ease',
                  userSelect: 'none'
                }}
              />
            </div>
          )}

          {/* TAB 3: MÓDULOS Y PROFESORES */}
          {pestaña === 'profesores' && (
            <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 10 }}>
              {Object.values(ASIGNATURAS).map((asig) => (
                <div
                  key={asig.codigo}
                  style={{
                    padding: '12px 14px',
                    borderRadius: 12,
                    backgroundColor: 'var(--color-surface)',
                    border: '1px solid var(--color-separator)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 12
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{
                      padding: '4px 10px',
                      borderRadius: 8,
                      backgroundColor: asig.colorBg,
                      color: asig.color,
                      fontWeight: 800,
                      fontSize: 13,
                      letterSpacing: 0.5
                    }}>
                      {asig.codigo}
                    </span>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--color-ink)' }}>
                        {asig.nombre}
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--color-secondary-ink)', marginTop: 1 }}>
                        {asig.profesor}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
