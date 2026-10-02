// frontend/src/components/PanelHistorialLedger.jsx
import { useState, useEffect } from 'react'
import { X, Clock, ArrowDownRight, ArrowUpRight, Shield, RefreshCw } from 'lucide-react'
import { sound } from '../utils/haptics'

export function PanelHistorialLedger({ perfil, abierto, onCerrar }) {
  const [historial, setHistorial] = useState([])
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (abierto) {
      cargarHistorial()
    }
  }, [abierto])

  const cargarHistorial = async () => {
    setCargando(true)
    setError(null)
    try {
      const headers = {
        'Content-Type': 'application/json'
      }
      if (perfil?.id) {
        headers['x-user-id'] = perfil.id
      }

      // Endpoint oficial: extrae el usuario de su sesión autenticada en el servidor
      const resp = await fetch('/api/ruleta/historial-ledger', { headers })
      const data = await resp.json()

      if (data.success) {
        setHistorial(data.historial || [])
      } else {
        setError(data.error || 'No se pudo cargar el historial')
      }
    } catch (err) {
      setError('Error al conectar con el servidor contable')
    } finally {
      setCargando(false)
    }
  }

  if (!abierto) return null

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.72)',
      backdropFilter: 'blur(6px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 10000,
      padding: '16px',
      animation: 'fadeIn 0.15s ease'
    }}>
      <div style={{
        width: '100%',
        maxWidth: 520,
        backgroundColor: '#1C1C1E',
        borderRadius: 20,
        border: '1px solid rgba(255, 255, 255, 0.14)',
        boxShadow: '0 24px 48px rgba(0, 0, 0, 0.6)',
        color: '#FFF',
        display: 'flex',
        flexDirection: 'column',
        maxHeight: '85vh',
        overflow: 'hidden'
      }}>
        {/* Encabezado */}
        <div style={{
          padding: '16px 20px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: '#242426'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 34,
              height: 34,
              borderRadius: 10,
              backgroundColor: 'rgba(10, 132, 255, 0.18)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#0A84FF'
            }}>
              <Shield size={18} />
            </div>
            <div>
              <div style={{ fontSize: 16, fontWeight: 800, letterSpacing: '-0.01em' }}>
                Registro Contable
              </div>
              <div style={{ fontSize: 11, color: 'rgba(255, 255, 255, 0.5)' }}>
                Ledger inmutable de StevenEuros y Monedas Yoshi
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button
              type="button"
              onClick={cargarHistorial}
              disabled={cargando}
              style={{
                background: 'none',
                border: 'none',
                color: 'rgba(255, 255, 255, 0.6)',
                cursor: 'pointer',
                padding: 6,
                borderRadius: 8
              }}
              title="Refrescar movimientos"
            >
              <RefreshCw size={16} className={cargando ? 'animate-spin' : ''} />
            </button>
            <button
              type="button"
              onClick={() => {
                sound.playPop()
                onCerrar()
              }}
              style={{
                background: 'rgba(255, 255, 255, 0.08)',
                border: 'none',
                color: '#FFF',
                cursor: 'pointer',
                width: 30,
                height: 30,
                borderRadius: 15,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Lista de movimientos */}
        <div style={{
          padding: '16px 20px',
          overflowY: 'auto',
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          gap: 8
        }}>
          {cargando && historial.length === 0 && (
            <div style={{ padding: '32px 0', textAlign: 'center', color: 'rgba(255, 255, 255, 0.4)', fontSize: 13 }}>
              Cargando movimientos contables...
            </div>
          )}

          {error && (
            <div style={{
              padding: '12px 14px',
              backgroundColor: 'rgba(239, 68, 68, 0.14)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: 12,
              color: '#F87171',
              fontSize: 12
            }}>
              {error}
            </div>
          )}

          {!cargando && historial.length === 0 && !error && (
            <div style={{ padding: '36px 0', textAlign: 'center', color: 'rgba(255, 255, 255, 0.45)', fontSize: 13 }}>
              No hay movimientos contables registrados todavía.
            </div>
          )}

          {historial.map((item) => {
            const esSE = item.moneda === 'steveneuros'
            const esPositivo = item.cantidad > 0
            const fechaStr = new Date(item.created_at).toLocaleString('es-ES', {
              timeZone: 'Europe/Madrid',
              day: '2-digit',
              month: '2-digit',
              hour: '2-digit',
              minute: '2-digit'
            })

            return (
              <div
                key={item.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 14px',
                  backgroundColor: 'rgba(255, 255, 255, 0.03)',
                  borderRadius: 12,
                  border: '1px solid rgba(255, 255, 255, 0.06)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{
                    width: 32,
                    height: 32,
                    borderRadius: 10,
                    backgroundColor: esPositivo ? 'rgba(48, 209, 88, 0.15)' : 'rgba(255, 69, 58, 0.15)',
                    color: esPositivo ? '#30D158' : '#FF453A',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    {esPositivo ? <ArrowUpRight size={17} /> : <ArrowDownRight size={17} />}
                  </div>

                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#FFF' }}>
                      {item.motivo || item.tipo}
                    </div>
                    <div style={{ fontSize: 11, color: 'rgba(255, 255, 255, 0.45)', display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
                      <Clock size={11} />
                      <span>{fechaStr}</span>
                      <span>·</span>
                      <span>Saldo: {item.saldo_posterior} {esSE ? 'SE' : '🪙'}</span>
                    </div>
                  </div>
                </div>

                <div style={{
                  fontSize: 14,
                  fontWeight: 800,
                  color: esPositivo ? '#30D158' : '#FF453A',
                  textAlign: 'right'
                }}>
                  {esPositivo ? `+${item.cantidad}` : item.cantidad} {esSE ? 'SE' : '🪙'}
                </div>
              </div>
            )
          })}
        </div>

        {/* Pie con información de auditoría */}
        <div style={{
          padding: '12px 20px',
          borderTop: '1px solid rgba(255, 255, 255, 0.08)',
          backgroundColor: '#242426',
          fontSize: 11,
          color: 'rgba(255, 255, 255, 0.4)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <span>Ledger respaldado por la Banca del Sistema</span>
          <span style={{ fontFamily: 'monospace' }}>Europe/Madrid</span>
        </div>
      </div>
    </div>
  )
}
