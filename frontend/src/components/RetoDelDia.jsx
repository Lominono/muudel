// frontend/src/components/RetoDelDia.jsx
import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Target,
  CheckCircle2,
  Award,
  Send,
  Clock,
  AlertCircle,
  FileText,
  Gamepad2,
  ChevronDown,
  ChevronUp,
  Sparkles,
  ExternalLink
} from 'lucide-react'
import { sound, triggerConfetti } from '../utils/haptics'
import { supabase } from '../utils/supabase'
import { transmitirEvento, suscribirEvento } from '../utils/realtimeHub'
import gsap from 'gsap'

export function RetoDelDia({ perfil, onCompletado }) {
  const navigate = useNavigate()
  const [retos, setRetos] = useState([])
  const [retoSeleccionadoId, setRetoSeleccionadoId] = useState('reto-practica-1')
  
  // Estado de la entrega del reto actual
  const [mostrarFormulario, setMostrarFormulario] = useState(false)
  const [evidenciaTexto, setEvidenciaTexto] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [mensajeEstado, setMensajeEstado] = useState(null) // { tipo: 'exito' | 'error', texto }
  const [entregasUsuario, setEntregasUsuario] = useState({}) // { [retoId]: { estado: 'pendiente' | 'aprobado' | 'rechazado', evidencia, feedback } }

  const fechaHoy = new Date().toISOString().split('T')[0]
  const cardRef = useRef(null)

  // Cargar retos disponibles (de la BD o los retos por defecto del día)
  useEffect(() => {
    cargarRetos()
    cargarEntregas()

    // Escuchar validaciones en tiempo real
    const desuscribirValidado = suscribirEvento('reto_validado', (payload) => {
      if (payload && payload.userId === perfil?.id) {
        sound.playStamp()
        triggerConfetti()
        setEntregasUsuario(prev => ({
          ...prev,
          [payload.retoId]: {
            estado: 'aprobado',
            feedback: payload.feedback || '¡Verificado y aprobado por lominoño!'
          }
        }))
        if (onCompletado) {
          onCompletado(payload.puntos || 25)
        }
      }
    })

    const desuscribirRechazado = suscribirEvento('reto_rechazado', (payload) => {
      if (payload && payload.userId === perfil?.id) {
        sound.playPop()
        setEntregasUsuario(prev => ({
          ...prev,
          [payload.retoId]: {
            estado: 'rechazado',
            feedback: payload.feedback || 'Revisión denegada. Por favor, amplía tu explicación.'
          }
        }))
      }
    })

    return () => {
      desuscribirValidado()
      desuscribirRechazado()
    }
  }, [perfil?.id, fechaHoy])

  const cargarRetos = async () => {
    try {
      const { data } = await supabase
        .from('retos')
        .select('*')
        .eq('activo', true)
        .order('created_at', { ascending: false })
        .limit(5)

      if (data && data.length > 0) {
        setRetos(data)
        setRetoSeleccionadoId(data[0].id)
        return
      }
    } catch (e) {}

    // Retos por defecto del aula
    const retosDefecto = [
      {
        id: 'reto-practica-1',
        titulo: 'Topología VLAN & Subredes 15:30',
        descripcion: 'Explica los comandos Cisco para crear la VLAN 20 y asignarla a los puertos FastEthernet 0/1 al 0/5, o pega el enlace a tu captura de Packet Tracer.',
        puntos: 35,
        tipo: 'evidencia',
        requisito: 'Explica los comandos ejecutados o adjunta enlace con la evidencia'
      },
      {
        id: 'reto-arcade-yoshi',
        titulo: 'Desafío Yoshi: Supera 100m en el Recreo',
        descripcion: 'Juega a Yoshi Runner en el Recreo Arcade y esquiva las tuberías piraña. Se comprueba automáticamente en el juego.',
        puntos: 30,
        tipo: 'juego',
        objetivo_puntuacion: 100,
        requisito: 'Alcanzar 100 metros en Yoshi Runner (auto-validado)'
      }
    ]

    setRetos(retosDefecto)
    setRetoSeleccionadoId(retosDefecto[0].id)
  }

  const cargarEntregas = async () => {
    const misEntregas = {}

    // 1. Cargar desde Supabase tabla real reto_completado
    if (perfil?.id) {
      try {
        const { data: dbEntregas } = await supabase
          .from('reto_completado')
          .select('*')
          .eq('user_id', perfil.id)

        if (dbEntregas && dbEntregas.length > 0) {
          dbEntregas.forEach(ent => {
            misEntregas[ent.reto_id] = {
              estado: ent.estado || (ent.validado ? 'aprobado' : 'pendiente'),
              evidencia: ent.evidencia,
              feedback: ent.feedback_admin || ''
            }
          })
        }
      } catch (e) {}
    }

    // 2. Combinar con localStorage
    try {
      const todas = JSON.parse(localStorage.getItem('muudel_entregas_retos') || '[]')
      todas.forEach(ent => {
        if (ent.userId === perfil?.id && !misEntregas[ent.retoId]) {
          misEntregas[ent.retoId] = {
            estado: ent.estado,
            evidencia: ent.evidencia,
            feedback: ent.feedback || ''
          }
        }
      })

      // También comprobar si el reto de arcade ya fue auto-completado
      const arcadeKey = `muudel_reto_arcade_${perfil?.id}_${fechaHoy}`
      if (localStorage.getItem(arcadeKey)) {
        misEntregas['reto-arcade-yoshi'] = {
          estado: 'aprobado',
          evidencia: 'Auto-validado por el motor del juego',
          feedback: '¡Récord verificado en el sistema!'
        }
      }

      setEntregasUsuario(misEntregas)
    } catch (e) {
      setEntregasUsuario(misEntregas)
    }
  }

  const retoActual = retos.find(r => r.id === retoSeleccionadoId) || retos[0]
  const entregaActual = retoActual ? entregasUsuario[retoActual.id] : null

  // Enviar entrega de reto con prueba/evidencia para que el profesor la compruebe
  const handleEnviarEvidencia = async (e) => {
    e.preventDefault()
    if (!evidenciaTexto.trim() || enviando) return

    setEnviando(true)
    setMensajeEstado(null)

    const nuevaEntrega = {
      id: 'ent-' + Date.now(),
      retoId: retoActual.id,
      retoTitulo: retoActual.titulo,
      puntos: retoActual.puntos,
      userId: perfil?.id,
      nombre: perfil?.nombre || 'Alumno',
      username: perfil?.username || '',
      color: perfil?.color_acento || '#0A84FF',
      evidencia: evidenciaTexto.trim(),
      estado: 'pendiente',
      fecha: new Date().toLocaleDateString('es-ES'),
      hora: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }

    // 1. Guardar en localStorage de entregas (para panel de admin)
    try {
      const prevEntregas = JSON.parse(localStorage.getItem('muudel_entregas_retos') || '[]')
      const filtradas = prevEntregas.filter(e => !(e.userId === perfil?.id && e.retoId === retoActual.id))
      const actualizadas = [nuevaEntrega, ...filtradas]
      localStorage.setItem('muudel_entregas_retos', JSON.stringify(actualizadas))
    } catch (e) {}

    // 2. Guardar en Supabase si está disponible
    try {
      await supabase.from('reto_completado').upsert({
        reto_id: retoActual.id,
        user_id: perfil?.id,
        evidencia: evidenciaTexto.trim(),
        estado: 'pendiente',
        validado: false,
        fecha: new Date().toISOString()
      })
    } catch (e) {}

    // 3. Notificar al moderador en tiempo real
    transmitirEvento('nueva_entrega_reto', nuevaEntrega)

    // 4. Actualizar estado local
    setEntregasUsuario(prev => ({
      ...prev,
      [retoActual.id]: {
        estado: 'pendiente',
        evidencia: evidenciaTexto.trim(),
        feedback: ''
      }
    }))

    sound.playStamp()
    setEnviando(false)
    setMostrarFormulario(false)
    setEvidenciaTexto('')
    setMensajeEstado({
      tipo: 'exito',
      texto: '¡Solución enviada a lominoño! Tu entrega está en cola de comprobación.'
    })
  }

  if (!retoActual) return null

  return (
    <section ref={cardRef} className="card" style={{ position: 'relative', overflow: 'hidden' }}>
      {/* Selector de Retos si hay más de uno */}
      {retos.length > 1 && (
        <div style={{ display: 'flex', gap: 6, marginBottom: 12, overflowX: 'auto', paddingBottom: 2, scrollbarWidth: 'none' }}>
          {retos.map(r => {
            const ent = entregasUsuario[r.id]
            const seleccionado = r.id === retoActual.id
            return (
              <button
                key={r.id}
                type="button"
                onClick={() => {
                  sound.playPop()
                  setRetoSeleccionadoId(r.id)
                  setMostrarFormulario(false)
                  setMensajeEstado(null)
                }}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '5px 12px',
                  borderRadius: 9999,
                  border: 'none',
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                  backgroundColor: seleccionado ? 'var(--color-accent)' : 'var(--color-fill-secondary)',
                  color: seleccionado ? '#FFFFFF' : 'var(--color-secondary-ink)',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.15s ease'
                }}
              >
                {r.tipo === 'juego' ? <Gamepad2 size={13} /> : <Target size={13} />}
                <span>{r.titulo.slice(0, 24)}...</span>
                {ent?.estado === 'aprobado' && <CheckCircle2 size={12} color="#30D158" />}
                {ent?.estado === 'pendiente' && <Clock size={12} color="#FF9500" />}
              </button>
            )
          })}
        </div>
      )}

      {/* Cabecera del Reto Activo */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 34,
              height: 34,
              borderRadius: 10,
              backgroundColor: entregaActual?.estado === 'aprobado'
                ? 'var(--color-positive-bg)'
                : entregaActual?.estado === 'pendiente'
                ? 'rgba(255, 149, 0, 0.12)'
                : 'rgba(0, 122, 255, 0.12)',
              color: entregaActual?.estado === 'aprobado'
                ? 'var(--color-positive)'
                : entregaActual?.estado === 'pendiente'
                ? 'var(--color-warning)'
                : 'var(--color-accent)',
              flexShrink: 0
            }}
          >
            {entregaActual?.estado === 'aprobado' ? (
              <CheckCircle2 size={19} />
            ) : entregaActual?.estado === 'pendiente' ? (
              <Clock size={19} />
            ) : (
              <Target size={19} />
            )}
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span className="apple-caption" style={{ textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 700 }}>
                {retoActual.tipo === 'juego' ? 'Desafío Recreo Arcade' : 'Reto de Clase'}
              </span>
              {retoActual.tipo === 'juego' && (
                <span className="apple-badge apple-badge-neutral" style={{ fontSize: 10 }}>Auto-comprobado</span>
              )}
            </div>
            <h3 className="apple-headline" style={{ fontSize: 16 }}>
              {retoActual.titulo}
            </h3>
          </div>
        </div>

        <span className="apple-badge apple-badge-accent" style={{ fontSize: 12 }}>
          +{retoActual.puntos} XP
        </span>
      </div>

      <p className="apple-subheadline" style={{ fontSize: 13, marginBottom: 14, color: 'var(--color-secondary-ink)' }}>
        {retoActual.descripcion}
      </p>

      {/* Notificación de envío */}
      {mensajeEstado && (
        <div
          style={{
            padding: '10px 14px',
            borderRadius: 10,
            fontSize: 13,
            fontWeight: 600,
            marginBottom: 12,
            backgroundColor: mensajeEstado.tipo === 'error' ? 'var(--color-negative-bg)' : 'var(--color-positive-bg)',
            color: mensajeEstado.tipo === 'error' ? 'var(--color-negative)' : 'var(--color-positive)',
            display: 'flex',
            alignItems: 'center',
            gap: 8
          }}
        >
          {mensajeEstado.tipo === 'error' ? <AlertCircle size={15} /> : <CheckCircle2 size={15} />}
          <span>{mensajeEstado.texto}</span>
        </div>
      )}

      {/* ESTADO 1: RETO YA APROBADO */}
      {entregaActual?.estado === 'aprobado' ? (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 8,
            padding: '12px 16px',
            borderRadius: 12,
            backgroundColor: 'var(--color-positive-bg)',
            color: 'var(--color-positive)',
            fontSize: 13,
            fontWeight: 600
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <CheckCircle2 size={18} />
            <div>
              <div>¡Reto comprobado y superado!</div>
              <div style={{ fontSize: 11, fontWeight: 400, opacity: 0.9 }}>
                +{retoActual.puntos} puntos acreditados a tu cuenta de clase.
              </div>
            </div>
          </div>
          <span className="apple-badge apple-badge-positive" style={{ fontSize: 11 }}>
            Verificado
          </span>
        </div>
      ) : entregaActual?.estado === 'pendiente' ? (
        /* ESTADO 2: ENTREGA PENDIENTE DE REVISIÓN */
        <div
          style={{
            padding: '12px 14px',
            borderRadius: 12,
            backgroundColor: 'rgba(255, 149, 0, 0.08)',
            border: '1px solid rgba(255, 149, 0, 0.25)',
            display: 'flex',
            flexDirection: 'column',
            gap: 6
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--color-warning)', fontWeight: 700, fontSize: 13 }}>
              <Clock size={16} />
              <span>Solución entregada · Pendiente de comprobación</span>
            </div>
            <span className="apple-badge apple-badge-neutral" style={{ fontSize: 10, color: 'var(--color-warning)' }}>
              En revisión
            </span>
          </div>
          <p className="apple-caption" style={{ fontSize: 12, color: 'var(--color-secondary-ink)' }}>
            Lominoño comprobará tu explicación en el panel de moderación para validar que los comandos y conceptos son correctos.
          </p>
          {entregaActual.evidencia && (
            <div style={{
              fontSize: 11,
              fontFamily: 'monospace',
              padding: '6px 8px',
              borderRadius: 6,
              backgroundColor: 'var(--color-surface)',
              border: '1px solid var(--color-separator)',
              color: 'var(--color-secondary-ink)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap'
            }}>
              Tu prueba: {entregaActual.evidencia}
            </div>
          )}
        </div>
      ) : entregaActual?.estado === 'rechazado' ? (
        /* ESTADO 3: ENTREGA RECHAZADA CON FEEDBACK */
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div
            style={{
              padding: '12px 14px',
              borderRadius: 12,
              backgroundColor: 'var(--color-negative-bg)',
              color: 'var(--color-negative)',
              fontSize: 13
            }}
          >
            <div style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
              <AlertCircle size={15} />
              <span>Entrega no validada por el moderador</span>
            </div>
            <p style={{ fontSize: 12, marginTop: 4, opacity: 0.9 }}>
              Nota de lominoño: {entregaActual.feedback || 'La solución está incompleta o los comandos no son correctos.'}
            </p>
          </div>

          <button
            type="button"
            className="btn-primary"
            onClick={() => setMostrarFormulario(!mostrarFormulario)}
            style={{ minHeight: 38, fontSize: 13, gap: 6 }}
          >
            <Send size={14} />
            <span>Corregir y Reenviar Solución</span>
          </button>
        </div>
      ) : retoActual.tipo === 'juego' ? (
        /* ESTADO 4: RETO TIPO MINI-JUEGO (YOSHI RUNNER) */
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            type="button"
            className="btn-primary"
            onClick={() => navigate('/juegos')}
            style={{ flex: 1, minHeight: 40, fontSize: 13, fontWeight: 700, backgroundColor: '#30D158', gap: 6 }}
          >
            <Gamepad2 size={16} />
            <span>Jugar a Yoshi Runner para Superarlo</span>
          </button>
        </div>
      ) : (
        /* ESTADO 5: RETO DISPONIBLE PARA ENTREGAR */
        <div>
          {!mostrarFormulario ? (
            <button
              type="button"
              className="btn-primary"
              onClick={() => setMostrarFormulario(true)}
              style={{ width: '100%', minHeight: 40, fontSize: 13, fontWeight: 700, gap: 6 }}
            >
              <Award size={16} />
              <span>Entregar Solución y Comprobar Reto</span>
            </button>
          ) : (
            <form onSubmit={handleEnviarEvidencia} style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 4 }}>
              <div>
                <label className="apple-caption" style={{ display: 'block', marginBottom: 4, fontWeight: 600 }}>
                  Prueba de realización (Comandos usados, explicación o enlace):
                </label>
                <textarea
                  className="apple-input"
                  rows={3}
                  value={evidenciaTexto}
                  onChange={(e) => setEvidenciaTexto(e.target.value)}
                  placeholder="Ej: Ejecuté 'switchport mode trunk' y 'vlan 20'. También guardé la captura en https://drive... o https://github..."
                  required
                  style={{ fontSize: 13, lineHeight: 1.4 }}
                />
              </div>

              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setMostrarFormulario(false)}
                  style={{ minHeight: 36, fontSize: 13 }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={enviando || !evidenciaTexto.trim()}
                  className="btn-primary"
                  style={{ flex: 1, minHeight: 36, fontSize: 13, fontWeight: 700, gap: 6 }}
                >
                  <Send size={14} />
                  <span>{enviando ? 'Enviando...' : 'Enviar a Lominoño (+35 pts)'}</span>
                </button>
              </div>
            </form>
          )}
        </div>
      )}
    </section>
  )
}
