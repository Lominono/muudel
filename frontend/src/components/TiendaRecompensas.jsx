import { useState, useEffect } from 'react'
import { useAuth } from '../App'
import { supabase } from '../utils/supabase'
import { sound, triggerConfetti } from '../utils/haptics'
import {
  ShoppingBag,
  Shield,
  Crown,
  Music,
  Coffee,
  HelpCircle,
  Armchair,
  Check,
  AlertCircle,
  Clock,
  ChevronRight,
  X
} from 'lucide-react'

export const CATALOGO_RECOMPENSAS = [
  {
    id: 'congelar_racha',
    titulo: 'Escudo de Racha (1 día)',
    desc: 'Si un día no puedes venir a las 15:30 o te retrasas, tu racha no se reinicia.',
    costo: 50,
    icon: Shield,
    tipo: 'inmediato',
    color: '#0A84FF'
  },
  {
    id: 'titulo_exclusivo',
    titulo: 'Título VIP en el Chat',
    desc: 'Desbloquea un apodo exclusivo junto a tu nombre para que todos lo vean en clase.',
    costo: 60,
    icon: Crown,
    tipo: 'seleccionable',
    opciones: ['El Máquina', 'El Delegado en la Sombra', 'Leyenda del Fondo', 'El Puntual Supremo', 'El Fénix'],
    color: '#FF9500'
  },
  {
    id: 'elegir_musica',
    titulo: 'Poner la música a las 15:20',
    desc: 'Eliges tú la playlist o los temazos del altavoz antes de que empiece la clase.',
    costo: 75,
    icon: Music,
    tipo: 'peticion',
    color: '#AF52DE'
  },
  {
    id: 'elegir_sitio',
    titulo: 'Elegir sitio toda la semana',
    desc: 'Permiso oficial para sentarte en la mesa que quieras con tus colegas.',
    costo: 110,
    icon: Armchair,
    tipo: 'peticion',
    color: '#34C759'
  },
  {
    id: 'pista_reto',
    titulo: 'Pista exclusiva de examen/reto',
    desc: 'lominoño te da una pista secreta sobre las preguntas del próximo reto o control.',
    costo: 130,
    icon: HelpCircle,
    tipo: 'peticion',
    color: '#FF3B30'
  },
  {
    id: 'bono_cafeteria',
    titulo: 'Café o Zumo en el descanso',
    desc: 'Invitación oficial pactada para el descanso de las clases.',
    costo: 190,
    icon: Coffee,
    tipo: 'peticion',
    color: '#E5A00D'
  }
]

export function TiendaRecompensas({ onClose }) {
  const { perfil, setPerfil } = useAuth()
  const [canjes, setCanjes] = useState([])
  const [canjeandoId, setCanjeandoId] = useState(null)
  const [tituloSeleccionado, setTituloSeleccionado] = useState('El Máquina')
  const [mostrarSelectorTitulo, setMostrarSelectorTitulo] = useState(false)
  const [notificacion, setNotificacion] = useState(null)

  const puntosActuales = perfil?.puntos_total || 0

  useEffect(() => {
    cargarCanjes()
  }, [])

  const cargarCanjes = () => {
    try {
      const guardados = localStorage.getItem('muudel_canjes_pedidos')
      if (guardados) {
        const todos = JSON.parse(guardados)
        setCanjes(todos.filter(c => c.userId === perfil?.id))
      }
    } catch (e) {}
  }

  const mostrarMensaje = (texto, tipo = 'exito') => {
    setNotificacion({ texto, tipo })
    setTimeout(() => setNotificacion(null), 3500)
  }

  const realizarCanje = async (recompensa) => {
    if (puntosActuales < recompensa.costo) {
      sound.playPop()
      mostrarMensaje(`Te faltan ${recompensa.costo - puntosActuales} puntos para este canje`, 'error')
      return
    }

    if (recompensa.id === 'titulo_exclusivo' && !mostrarSelectorTitulo) {
      setMostrarSelectorTitulo(true)
      return
    }

    setCanjeandoId(recompensa.id)
    const nuevosPuntos = puntosActuales - recompensa.costo

    // 1. Descontar puntos en perfil
    const perfilActualizado = {
      ...perfil,
      puntos_total: nuevosPuntos,
      ...(recompensa.id === 'congelar_racha' ? { racha_congelada: true } : {}),
      ...(recompensa.id === 'titulo_exclusivo' ? { frase: `👑 ${tituloSeleccionado}` } : {})
    }

    setPerfil(perfilActualizado)
    localStorage.setItem('racha_local_user', JSON.stringify(perfilActualizado))

    try {
      await supabase
        .from('profiles')
        .update({
          puntos_total: nuevosPuntos,
          ...(recompensa.id === 'titulo_exclusivo' ? { frase: `👑 ${tituloSeleccionado}` } : {})
        })
        .eq('id', perfil.id)
    } catch (e) {}

    // 2. Registrar el ticket de canje
    const nuevoCanje = {
      id: 'canje-' + Date.now(),
      userId: perfil.id,
      nombre: perfil.nombre,
      recompensaId: recompensa.id,
      titulo: recompensa.titulo + (recompensa.id === 'titulo_exclusivo' ? ` (${tituloSeleccionado})` : ''),
      costo: recompensa.costo,
      fecha: new Date().toLocaleDateString('es-ES', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }),
      estado: recompensa.tipo === 'inmediato' || recompensa.tipo === 'seleccionable' ? 'activado' : 'pendiente'
    }

    try {
      const guardados = localStorage.getItem('muudel_canjes_pedidos')
      const todos = guardados ? JSON.parse(guardados) : []
      const actualizados = [nuevoCanje, ...todos]
      localStorage.setItem('muudel_canjes_pedidos', JSON.stringify(actualizados))
      setCanjes(actualizados.filter(c => c.userId === perfil?.id))
    } catch (e) {}

    // Registrar en auditoría de clase
    try {
      const logs = JSON.parse(localStorage.getItem('muudel_audit_log') || '[]')
      logs.unshift({
        id: 'aud-' + Date.now(),
        fecha: new Date().toLocaleDateString('es-ES'),
        hora: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        autor: perfil.nombre,
        accion: 'Canje de Puntos',
        detalle: `Canjeó ${recompensa.costo} pts por: ${recompensa.titulo}`
      })
      localStorage.setItem('muudel_audit_log', JSON.stringify(logs.slice(0, 50)))
    } catch (e) {}

    sound.playStamp()
    triggerConfetti()
    setMostrarSelectorTitulo(false)
    setCanjeandoId(null)
    mostrarMensaje(`¡Canjeado con éxito! Tienes ${nuevosPuntos} pts restantes`)
  }

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.45)',
      backdropFilter: 'blur(10px)',
      WebkitBackdropFilter: 'blur(10px)',
      zIndex: 1000,
      display: 'flex',
      alignItems: 'flex-end',
      justifyContent: 'center',
      padding: '0'
    }}>
      <div className="card" style={{
        width: '100%',
        maxWidth: 540,
        maxHeight: '90vh',
        overflowY: 'auto',
        borderBottomLeftRadius: 0,
        borderBottomRightRadius: 0,
        borderRadius: '24px 24px 0 0',
        padding: '24px 20px 40px',
        animation: 'slideUp 0.25s ease-out'
      }}>
        {/* Cabecera */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 38,
              height: 38,
              borderRadius: 12,
              backgroundColor: 'rgba(10, 132, 255, 0.12)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--color-accent)'
            }}>
              <ShoppingBag size={20} />
            </div>
            <div>
              <h2 className="apple-headline" style={{ fontSize: 19 }}>
                La Cantina de Recompensas
              </h2>
              <p className="apple-caption">
                Canjea tus puntos ganados en clase por ventajas reales
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            style={{
              background: 'var(--color-fill-secondary)',
              border: 'none',
              borderRadius: '50%',
              width: 32,
              height: 32,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: 'var(--color-secondary-ink)'
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Marcador de puntos del alumno */}
        <div style={{
          backgroundColor: 'var(--color-surface-secondary)',
          border: '1px solid var(--color-separator)',
          borderRadius: 16,
          padding: '14px 18px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 20
        }}>
          <span style={{ fontSize: 14, color: 'var(--color-secondary-ink)', fontWeight: 500 }}>
            Tus puntos disponibles:
          </span>
          <span className="tabular-nums" style={{ fontSize: 22, fontWeight: 800, color: 'var(--color-accent)' }}>
            {puntosActuales} <span style={{ fontSize: 13, fontWeight: 600 }}>pts</span>
          </span>
        </div>

        {/* Mensaje de alerta / feedback */}
        {notificacion && (
          <div style={{
            padding: '10px 14px',
            borderRadius: 12,
            marginBottom: 16,
            fontSize: 13,
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            backgroundColor: notificacion.tipo === 'error' ? 'rgba(255, 59, 48, 0.12)' : 'rgba(48, 209, 88, 0.12)',
            color: notificacion.tipo === 'error' ? 'var(--color-negative)' : 'var(--color-positive)',
            border: `1px solid ${notificacion.tipo === 'error' ? 'rgba(255, 59, 48, 0.3)' : 'rgba(48, 209, 88, 0.3)'}`
          }}>
            {notificacion.tipo === 'error' ? <AlertCircle size={16} /> : <Check size={16} />}
            <span>{notificacion.texto}</span>
          </div>
        )}

        {/* Modal de selección de título si pulsa título VIP */}
        {mostrarSelectorTitulo && (
          <div style={{
            backgroundColor: 'var(--color-surface)',
            border: '1.5px solid var(--color-accent)',
            borderRadius: 16,
            padding: 16,
            marginBottom: 16
          }}>
            <h4 style={{ fontSize: 14, fontWeight: 700, marginBottom: 8, color: 'var(--color-ink)' }}>
              Elige tu Título VIP para el Chat y Perfil:
            </h4>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
              {CATALOGO_RECOMPENSAS.find(r => r.id === 'titulo_exclusivo')?.opciones.map((op) => (
                <button
                  key={op}
                  onClick={() => setTituloSeleccionado(op)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: 9999,
                    border: tituloSeleccionado === op ? '1.5px solid var(--color-accent)' : '1px solid var(--color-separator)',
                    backgroundColor: tituloSeleccionado === op ? 'rgba(10, 132, 255, 0.12)' : 'var(--color-fill-secondary)',
                    color: tituloSeleccionado === op ? 'var(--color-accent)' : 'var(--color-ink)',
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  {op}
                </button>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                className="btn-primary"
                onClick={() => realizarCanje(CATALOGO_RECOMPENSAS.find(r => r.id === 'titulo_exclusivo'))}
                style={{ flex: 1, minHeight: 38, fontSize: 13 }}
              >
                Confirmar por 60 pts
              </button>
              <button
                className="btn-secondary"
                onClick={() => setMostrarSelectorTitulo(false)}
                style={{ minHeight: 38, fontSize: 13 }}
              >
                Cancelar
              </button>
            </div>
          </div>
        )}

        {/* Catálogo de Recompensas */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 24 }}>
          {CATALOGO_RECOMPENSAS.map((item) => {
            const Icono = item.icon
            const alcanzable = puntosActuales >= item.costo
            return (
              <div
                key={item.id}
                style={{
                  backgroundColor: 'var(--color-surface)',
                  border: '1px solid var(--color-separator)',
                  borderRadius: 16,
                  padding: '14px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 14,
                  opacity: alcanzable ? 1 : 0.65,
                  transition: 'all 0.15s ease'
                }}
              >
                <div style={{
                  width: 44,
                  height: 44,
                  borderRadius: 12,
                  backgroundColor: `${item.color}15`,
                  color: item.color,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  <Icono size={22} />
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--color-ink)' }}>
                      {item.titulo}
                    </h3>
                  </div>
                  <p style={{ fontSize: 12, color: 'var(--color-secondary-ink)', marginTop: 2, lineHeight: 1.3 }}>
                    {item.desc}
                  </p>
                </div>

                <button
                  className="btn-primary"
                  disabled={!alcanzable || canjeandoId === item.id}
                  onClick={() => realizarCanje(item)}
                  style={{
                    flexShrink: 0,
                    minHeight: 36,
                    padding: '6px 12px',
                    fontSize: 13,
                    fontWeight: 700,
                    backgroundColor: alcanzable ? item.color : 'var(--color-fill-secondary)',
                    color: alcanzable ? '#FFFFFF' : 'var(--color-tertiary-ink)',
                    boxShadow: 'none'
                  }}
                >
                  {item.costo} pts
                </button>
              </div>
            )
          })}
        </div>

        {/* Historial de Canjes Pedidos */}
        {canjes.length > 0 && (
          <div>
            <h4 className="apple-caption" style={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 }}>
              Tus canjes recientes
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {canjes.slice(0, 4).map((c) => (
                <div
                  key={c.id}
                  style={{
                    padding: '10px 14px',
                    borderRadius: 12,
                    backgroundColor: 'var(--color-surface-secondary)',
                    border: '1px solid var(--color-separator)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    fontSize: 13
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 600, color: 'var(--color-ink)' }}>{c.titulo}</div>
                    <div style={{ fontSize: 11, color: 'var(--color-tertiary-ink)' }}>{c.fecha}</div>
                  </div>
                  <span style={{
                    fontSize: 12,
                    fontWeight: 600,
                    padding: '3px 8px',
                    borderRadius: 6,
                    backgroundColor: c.estado === 'activado' ? 'rgba(48, 209, 88, 0.15)' : 'rgba(255, 149, 0, 0.15)',
                    color: c.estado === 'activado' ? 'var(--color-positive)' : 'var(--color-warning)'
                  }}>
                    {c.estado === 'activado' ? 'Listo' : 'Pendiente lominoño'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
