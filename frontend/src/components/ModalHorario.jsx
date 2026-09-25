import { useState } from 'react'
import { X, ZoomIn, ZoomOut, Calendar, Users, BookOpen } from 'lucide-react'
import { ASIGNATURAS } from '../utils/horarioData'
import { sound } from '../utils/haptics'

export function ModalHorario({ abierto, onCerrar }) {
  const [zoom, setZoom] = useState(false)
  const [pestaña, setPestaña] = useState('foto') // 'foto' | 'profesores'

  if (!abierto) return null

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.65)',
      backdropFilter: 'blur(12px)',
      WebkitBackdropFilter: 'blur(12px)',
      zIndex: 4000,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '16px',
      animation: 'fadeIn 0.2s ease-out'
    }}>
      <div className="card" style={{
        maxWidth: 780,
        width: '100%',
        maxHeight: '92vh',
        display: 'flex',
        flexDirection: 'column',
        padding: 0,
        overflow: 'hidden',
        boxShadow: '0 24px 60px rgba(0, 0, 0, 0.25)',
        border: '1px solid var(--color-separator)'
      }}>
        {/* Cabecera */}
        <div style={{
          padding: '14px 18px',
          borderBottom: '1px solid var(--color-separator)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: 'var(--color-surface)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              backgroundColor: 'rgba(10, 132, 255, 0.12)',
              color: 'var(--color-accent)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Calendar size={18} />
            </div>
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: 'var(--color-ink)' }}>
                Horario SMR2 Tarde 26-27
              </h3>
              <p style={{ fontSize: 12, color: 'var(--color-secondary-ink)', margin: 0 }}>
                15:30 a 21:15 · Lunes a Viernes
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
                  padding: '6px 10px',
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
                <span className="hidden sm:inline">{zoom ? 'Ajustar' : 'Zoom'}</span>
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
                justifyContent: 'center'
              }}
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Pestañas de Vista */}
        <div style={{
          padding: '8px 16px',
          borderBottom: '1px solid var(--color-separator)',
          backgroundColor: 'var(--color-surface-secondary)',
          display: 'flex',
          gap: 8
        }}>
          <button
            type="button"
            onClick={() => setPestaña('foto')}
            style={{
              padding: '6px 14px',
              borderRadius: 8,
              border: 'none',
              backgroundColor: pestaña === 'foto' ? 'var(--color-surface)' : 'transparent',
              color: pestaña === 'foto' ? 'var(--color-accent)' : 'var(--color-secondary-ink)',
              fontWeight: 600,
              fontSize: 13,
              cursor: 'pointer',
              boxShadow: pestaña === 'foto' ? '0 1px 3px rgba(0,0,0,0.06)' : 'none'
            }}
          >
            Foto Oficial
          </button>
          <button
            type="button"
            onClick={() => setPestaña('profesores')}
            style={{
              padding: '6px 14px',
              borderRadius: 8,
              border: 'none',
              backgroundColor: pestaña === 'profesores' ? 'var(--color-surface)' : 'transparent',
              color: pestaña === 'profesores' ? 'var(--color-accent)' : 'var(--color-secondary-ink)',
              fontWeight: 600,
              fontSize: 13,
              cursor: 'pointer',
              boxShadow: pestaña === 'profesores' ? '0 1px 3px rgba(0,0,0,0.06)' : 'none'
            }}
          >
            Módulos y Profesores
          </button>
        </div>

        {/* Contenido */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          overflowX: zoom ? 'auto' : 'hidden',
          padding: 16,
          backgroundColor: 'var(--color-bg)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'flex-start'
        }}>
          {pestaña === 'foto' ? (
            <div style={{
              width: '100%',
              display: 'flex',
              justifyContent: 'center',
              cursor: zoom ? 'zoom-out' : 'zoom-in'
            }} onClick={() => setZoom(!zoom)}>
              <img
                src="/horario_smr2.png"
                alt="Horario SMR2 Tarde 26-27"
                style={{
                  width: zoom ? '135%' : '100%',
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
          ) : (
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
