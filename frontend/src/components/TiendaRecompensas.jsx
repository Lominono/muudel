import { useState, useEffect } from 'react'
import { useAuth } from '../App'
import { supabase } from '../utils/supabase'
import { sound, triggerConfetti } from '../utils/haptics'
import {
  Shield,
  Coffee,
  Music,
  MapPin,
  HelpCircle,
  Zap,
  Sparkles,
  Megaphone,
  Clock,
  Ticket,
  Check,
  AlertCircle,
  X,
  ChevronRight,
  Stamp,
  Award
} from 'lucide-react'

// CATÁLOGO ANTI-IA: Objetos y ventajas tangibles de clase SMR2
export const CATALOGO_RECOMPENSAS = [
  // 1. VENTAJAS DE AULA REALES
  {
    id: 'congelar_racha',
    categoria: 'aula',
    titulo: 'Escudo de Racha de Asistencia',
    desc: 'Si un día tienes un retraso justificado después de las 15:30, tu racha de días se conserva intacta.',
    costo: 45,
    icon: Shield,
    tipo: 'inmediato',
    color: '#007AFF'
  },
  {
    id: 'elegir_sitio',
    categoria: 'aula',
    titulo: 'Elegir Sitio en el Aula (1 semana)',
    desc: 'Derecho a elegir puesto y ordenador en el aula de informática junto a tu colega.',
    costo: 80,
    icon: MapPin,
    tipo: 'peticion',
    color: '#34C759'
  },
  {
    id: 'musica_descanso',
    categoria: 'aula',
    titulo: 'Conectar Altavoz en el Descanso',
    desc: 'Pones tú la música por Bluetooth en el aula durante los 25 minutos del descanso (18:10).',
    costo: 60,
    icon: Music,
    tipo: 'peticion',
    color: '#FF9500'
  },
  {
    id: 'pista_examen',
    categoria: 'aula',
    titulo: 'Pista Secreta de Control / Práctica',
    desc: 'lominoño te da una pista clave sobre las preguntas o comandos del próximo control de redes o sistemas.',
    costo: 100,
    icon: HelpCircle,
    tipo: 'peticion',
    color: '#FF3B30'
  },
  {
    id: 'ticket_cafeteria',
    categoria: 'aula',
    titulo: 'Ticket de Cafetería / Máquina',
    desc: 'Un café, zumo o tentempié acordado para el descanso de las 18:10.',
    costo: 150,
    icon: Coffee,
    tipo: 'peticion',
    color: '#8E8E93'
  },
  {
    id: 'apodo_lista',
    categoria: 'aula',
    titulo: 'Apodo Oficial en la Lista de Clase',
    desc: 'Añade tu apodo de clase en el ranking y en cada mensaje del chat.',
    costo: 50,
    icon: Award,
    tipo: 'seleccionable',
    opciones: [
      'Puntual 15:30',
      'El del Fondo',
      'Admin en la Sombra',
      'Linux Root',
      'Cable de Red',
      'El Máquina',
      'Ping 127.0.0.1'
    ],
    color: '#FF9500'
  },

  // 2. EFECTOS Y SELLOS FÍSICOS DE CHAT
  {
    id: 'sello_tinta_chat',
    categoria: 'chat',
    titulo: 'Estampar Sello de Tinta en el Chat',
    desc: 'Estampa un sello físico oficial con tampón de tinta [PRESENTE], [VISTO], [DESCANSO] o [APROBADO].',
    costo: 15,
    icon: Stamp,
    tipo: 'selector_sello',
    color: '#FF3B30'
  },
  {
    id: 'terremoto_chat',
    categoria: 'chat',
    titulo: 'Sacudida Sísmica de Aula',
    desc: 'Hace temblar la pantalla del chat de todos los compañeros durante 3 segundos con sonido seco.',
    costo: 25,
    icon: Zap,
    tipo: 'efecto_chat',
    efecto: 'terremoto',
    color: '#FF3B30'
  },
  {
    id: 'confeti_chat',
    categoria: 'chat',
    titulo: 'Lluvia de Papelitos de Confeti',
    desc: 'Dispara una ráfaga de confeti de celebración en el chat de todos los alumnos.',
    costo: 20,
    icon: Sparkles,
    tipo: 'efecto_chat',
    efecto: 'confeti',
    color: '#FF9500'
  },
  {
    id: 'megafono_chat',
    categoria: 'chat',
    titulo: 'Aviso Fijado en Tablón de Clase',
    desc: 'Fija un comunicado en texto plano en la cabecera del chat para que toda la clase lo lea.',
    costo: 35,
    icon: Megaphone,
    tipo: 'efecto_chat_texto',
    efecto: 'megafono',
    color: '#007AFF'
  },
  {
    id: 'sirena_descanso',
    categoria: 'chat',
    titulo: 'Silbato del Descanso 18:10',
    desc: 'Suena el aviso oficial recordando que empieza el descanso de la tarde.',
    costo: 20,
    icon: Clock,
    tipo: 'efecto_chat',
    efecto: 'descanso',
    color: '#34C759'
  }
]

export const SELLOS_OFICIALES = [
  { id: 'PRESENTE', etiqueta: 'PRESENTE · 15:30', clase: 'sello-tinta-rojo', desc: 'Confirmación puntual de llegada' },
  { id: 'VISTO', etiqueta: 'VISTO EN CLASE', clase: 'sello-tinta-azul', desc: 'Leído y anotado en el cuaderno' },
  { id: 'DESCANSO', etiqueta: 'DESCANSO · 18:10', clase: 'sello-tinta-verde', desc: 'Llamada oficial a la cafetería' },
  { id: 'APROBADO', etiqueta: 'APROBADO SMR2', clase: 'sello-tinta-verde', desc: 'Práctica o reto completado' }
]

// Emisor de efectos y sellos de chat para sincronización en Supabase y local
export async function emitirEfectoChat(tipoEfecto, autorPerfil, textoOpcional = '') {
  let mensajeTexto = ''
  if (tipoEfecto === 'terremoto') {
    mensajeTexto = `[EFECTO:terremoto] 🌋 Sacudida sísmica desatada por ${autorPerfil.nombre}`
  } else if (tipoEfecto === 'confeti') {
    mensajeTexto = `[EFECTO:confeti] 🎉 Lluvia de confeti de ${autorPerfil.nombre}`
  } else if (tipoEfecto === 'megafono') {
    mensajeTexto = `[EFECTO:megafono:${autorPerfil.nombre}] ${textoOpcional || 'Aviso para toda la clase'}`
  } else if (tipoEfecto === 'descanso') {
    mensajeTexto = `[EFECTO:descanso] ☕ Silbato de descanso (18:10) tocado por ${autorPerfil.nombre}`
  } else if (tipoEfecto === 'sello') {
    mensajeTexto = `[SELLO:${textoOpcional || 'PRESENTE'}]`
  }

  const nuevoMsg = {
    id: 'efecto-' + Date.now(),
    canal: 'general',
    user_id: autorPerfil.id,
    texto: mensajeTexto,
    nombre: autorPerfil.nombre,
    digito_id: autorPerfil.digito_id || null,
    username: autorPerfil.username || null,
    color_acento: autorPerfil.color_acento || '#007AFF',
    rol: autorPerfil.rol || 'alumno',
    likes_count: 0,
    created_at: new Date().toISOString()
  }

  try {
    const prev = JSON.parse(localStorage.getItem('racha_chat_general') || '[]')
    localStorage.setItem('racha_chat_general', JSON.stringify([...prev, nuevoMsg].slice(-100)))
  } catch (e) {}

  if (tipoEfecto === 'megafono') {
    try {
      localStorage.setItem('muudel_megafono_activo', JSON.stringify({
        id: 'mega-' + Date.now(),
        autor: autorPerfil.nombre,
        texto: textoOpcional || 'Aviso para toda la clase',
        hora: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }))
    } catch (e) {}
  }

  try {
    await supabase.from('messages').insert({
      user_id: autorPerfil.id,
      canal: 'general',
      texto: mensajeTexto
    })
  } catch (e) {}

  window.dispatchEvent(new CustomEvent('muudel-efecto-chat', {
    detail: { tipo: tipoEfecto, autor: autorPerfil.nombre, texto: textoOpcional }
  }))
}

export function TiendaRecompensas({ onClose }) {
  const { perfil, setPerfil } = useAuth()
  const [canjes, setCanjes] = useState([])
  const [pestaña, setPestaña] = useState('aula') // 'aula' | 'chat' | 'tickets'
  const [canjeandoId, setCanjeandoId] = useState(null)
  
  // Selector de apodo
  const [mostrarSelectorApodo, setMostrarSelectorApodo] = useState(false)
  const [apodoElegido, setApodoElegido] = useState('El Máquina')

  // Selector de Sello
  const [mostrarSelectorSello, setMostrarSelectorSello] = useState(false)
  const [selloElegido, setSelloElegido] = useState('PRESENTE')

  // Megáfono
  const [mostrarModalMegafono, setMostrarModalMegafono] = useState(false)
  const [textoMegafono, setTextoMegafono] = useState('')

  // Ticket expandido
  const [ticketActivo, setTicketActivo] = useState(null)
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

  const avisar = (texto, tipo = 'exito') => {
    setNotificacion({ texto, tipo })
    setTimeout(() => setNotificacion(null), 3600)
  }

  const iniciarCanje = (item) => {
    if (puntosActuales < item.costo) {
      sound.playPop()
      avisar(`Te faltan ${item.costo - puntosActuales} puntos para este canje.`, 'error')
      return
    }

    if (item.id === 'apodo_lista') {
      setMostrarSelectorApodo(true)
      return
    }

    if (item.id === 'sello_tinta_chat') {
      setMostrarSelectorSello(true)
      return
    }

    if (item.id === 'megafono_chat') {
      setMostrarModalMegafono(true)
      return
    }

    ejecutarTransaccion(item)
  }

  const ejecutarTransaccion = async (item, textoExtra = '') => {
    setCanjeandoId(item.id)
    const nuevosPuntos = puntosActuales - item.costo
    const codigoTicket = `#SMR2-${Math.floor(100 + Math.random() * 900)}`

    // 1. Actualizar perfil
    const perfilActualizado = {
      ...perfil,
      puntos_total: nuevosPuntos,
      ...(item.id === 'congelar_racha' ? { racha_congelada: true } : {}),
      ...(item.id === 'apodo_lista' ? { frase: apodoElegido, titulo_vip: apodoElegido } : {})
    }

    setPerfil(perfilActualizado)
    localStorage.setItem('racha_local_user', JSON.stringify(perfilActualizado))
    if (item.id === 'apodo_lista') {
      try {
        const meta = JSON.parse(localStorage.getItem('muudel_user_meta_' + perfil.id) || '{}')
        localStorage.setItem('muudel_user_meta_' + perfil.id, JSON.stringify({ ...meta, titulo_vip: apodoElegido, frase: apodoElegido }))
      } catch (e) {}
    }

    try {
      await supabase
        .from('profiles')
        .update({
          puntos_total: nuevosPuntos,
          ...(item.id === 'apodo_lista' ? { frase: apodoElegido } : {})
        })
        .eq('id', perfil.id)
    } catch (e) {}

    // 2. Si es efecto o sello de chat, disparar
    if (item.id === 'sello_tinta_chat') {
      await emitirEfectoChat('sello', perfil, selloElegido)
      sound.playStamp()
    } else if (item.tipo === 'efecto_chat' || item.tipo === 'efecto_chat_texto') {
      await emitirEfectoChat(item.efecto, perfil, textoExtra)
      sound.playStamp()
      if (item.efecto === 'confeti') triggerConfetti()
    }

    // 3. Crear Ticket de Canje (Recibo físico)
    const nuevoTicket = {
      id: 'canje-' + Date.now(),
      codigo: codigoTicket,
      userId: perfil.id,
      nombre: perfil.nombre,
      recompensaId: item.id,
      titulo: item.titulo + (item.id === 'apodo_lista' ? ` (${apodoElegido})` : '') + (textoExtra ? ` "${textoExtra}"` : ''),
      costo: item.costo,
      fecha: new Date().toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }),
      hora: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      estado: item.tipo === 'peticion' ? 'pendiente' : 'listo'
    }

    try {
      const guardados = localStorage.getItem('muudel_canjes_pedidos')
      const todos = guardados ? JSON.parse(guardados) : []
      const actualizados = [nuevoTicket, ...todos]
      localStorage.setItem('muudel_canjes_pedidos', JSON.stringify(actualizados))
      setCanjes(actualizados.filter(c => c.userId === perfil?.id))
    } catch (e) {}

    // 4. Registro de auditoría
    try {
      const logs = JSON.parse(localStorage.getItem('muudel_audit_log') || '[]')
      logs.unshift({
        id: 'aud-' + Date.now(),
        fecha: new Date().toLocaleDateString('es-ES'),
        hora: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        autor: perfil.nombre,
        accion: 'Canje de Puntos',
        detalle: `${codigoTicket}: Canjeó ${item.costo} pts por "${item.titulo}"`
      })
      localStorage.setItem('muudel_audit_log', JSON.stringify(logs.slice(0, 80)))
    } catch (e) {}

    setMostrarSelectorApodo(false)
    setMostrarSelectorSello(false)
    setMostrarModalMegafono(false)
    setTextoMegafono('')
    setCanjeandoId(null)
    setTicketActivo(nuevoTicket)

    sound.playStamp()
    avisar(`¡Canje completado! Tienes tu ticket ${codigoTicket} disponible.`)
  }

  const itemsFiltrados = CATALOGO_RECOMPENSAS.filter(item => item.categoria === pestaña)

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.45)',
      backdropFilter: 'blur(8px)',
      WebkitBackdropFilter: 'blur(8px)',
      zIndex: 2000,
      display: 'flex',
      alignItems: 'flex-end',
      justifyContent: 'center',
      padding: 0
    }}>
      <div className="card" style={{
        width: '100%',
        maxWidth: 580,
        maxHeight: '90vh',
        overflowY: 'auto',
        borderBottomLeftRadius: 0,
        borderBottomRightRadius: 0,
        borderRadius: '24px 24px 0 0',
        padding: '24px 20px 40px',
        backgroundColor: 'var(--color-bg)',
        animation: 'slideUp 0.22s cubic-bezier(0.16, 1, 0.3, 1)',
        boxShadow: '0 -10px 40px rgba(0, 0, 0, 0.15)'
      }}>
        {/* Cabecera Apple pura */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <div>
            <h2 className="apple-large-title" style={{ fontSize: 22, margin: 0 }}>
              La Cantina de SMR2
            </h2>
            <p className="apple-caption" style={{ marginTop: 2 }}>
              Ventajas de aula, comodines y sellos de clase
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'var(--color-fill-secondary)',
              border: 'none',
              borderRadius: '50%',
              width: 30,
              height: 30,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: 'var(--color-secondary-ink)'
            }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Marcador de Saldo en Papel */}
        <div style={{
          backgroundColor: 'var(--color-surface)',
          border: '1px solid var(--color-separator)',
          borderRadius: 14,
          padding: '12px 16px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 14
        }}>
          <div>
            <span className="apple-caption" style={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>
              Saldo disponible de clase
            </span>
            <div className="tabular-nums" style={{ fontSize: 24, fontWeight: 800, color: 'var(--color-ink)', marginTop: 1 }}>
              {puntosActuales} <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-secondary-ink)' }}>puntos</span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setPestaña('tickets')}
            style={{
              padding: '6px 12px',
              borderRadius: 8,
              border: '1px solid var(--color-separator)',
              backgroundColor: pestaña === 'tickets' ? 'var(--color-fill-secondary)' : 'transparent',
              fontSize: 12,
              fontWeight: 600,
              color: 'var(--color-ink)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 5
            }}
          >
            <Ticket size={14} />
            <span>Mis Tickets ({canjes.length})</span>
          </button>
        </div>

        {/* Notificación de estado */}
        {notificacion && (
          <div style={{
            padding: '10px 14px',
            borderRadius: 10,
            marginBottom: 14,
            fontSize: 13,
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            backgroundColor: notificacion.tipo === 'error' ? 'var(--color-negative-bg)' : 'var(--color-positive-bg)',
            color: notificacion.tipo === 'error' ? 'var(--color-negative)' : 'var(--color-positive)',
            border: `1px solid ${notificacion.tipo === 'error' ? 'rgba(255, 59, 48, 0.3)' : 'rgba(52, 199, 89, 0.3)'}`
          }}>
            {notificacion.tipo === 'error' ? <AlertCircle size={15} /> : <Check size={15} />}
            <span>{notificacion.texto}</span>
          </div>
        )}

        {/* Control Segmentado Apple */}
        <div className="segmented-control" style={{ marginBottom: 16 }}>
          <button
            type="button"
            className={`segmented-control-item ${pestaña === 'aula' ? 'active' : ''}`}
            onClick={() => setPestaña('aula')}
          >
            Ventajas de Aula
          </button>
          <button
            type="button"
            className={`segmented-control-item ${pestaña === 'chat' ? 'active' : ''}`}
            onClick={() => setPestaña('chat')}
          >
            Sellos & Efectos Chat
          </button>
          <button
            type="button"
            className={`segmented-control-item ${pestaña === 'tickets' ? 'active' : ''}`}
            onClick={() => setPestaña('tickets')}
          >
            Historial
          </button>
        </div>

        {/* Modal de Selector de Apodo Oficial */}
        {mostrarSelectorApodo && (
          <div style={{
            backgroundColor: 'var(--color-surface)',
            border: '1px solid var(--color-separator)',
            borderRadius: 14,
            padding: 16,
            marginBottom: 16,
            animation: 'fadeIn 0.2s ease'
          }}>
            <h4 style={{ fontSize: 14, fontWeight: 700, margin: '0 0 8px', color: 'var(--color-ink)' }}>
              Elige tu Apodo Oficial en la Lista:
            </h4>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
              {CATALOGO_RECOMPENSAS.find(r => r.id === 'apodo_lista')?.opciones.map((ap) => (
                <button
                  key={ap}
                  type="button"
                  onClick={() => setApodoElegido(ap)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: 8,
                    border: apodoElegido === ap ? '1.5px solid var(--color-accent)' : '1px solid var(--color-separator)',
                    backgroundColor: apodoElegido === ap ? 'rgba(0, 122, 255, 0.1)' : 'var(--color-fill-secondary)',
                    color: apodoElegido === ap ? 'var(--color-accent)' : 'var(--color-ink)',
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  {ap}
                </button>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                type="button"
                className="btn-primary"
                onClick={() => ejecutarTransaccion(CATALOGO_RECOMPENSAS.find(r => r.id === 'apodo_lista'))}
                style={{ flex: 1, minHeight: 38, fontSize: 13 }}
              >
                Confirmar Apodo (50 pts)
              </button>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setMostrarSelectorApodo(false)}
                style={{ minHeight: 38, fontSize: 13 }}
              >
                Cancelar
              </button>
            </div>
          </div>
        )}

        {/* Selector de Sello de Tinta */}
        {mostrarSelectorSello && (
          <div style={{
            backgroundColor: 'var(--color-surface)',
            border: '1px solid var(--color-separator)',
            borderRadius: 14,
            padding: 16,
            marginBottom: 16,
            animation: 'fadeIn 0.2s ease'
          }}>
            <h4 style={{ fontSize: 14, fontWeight: 700, margin: '0 0 4px', color: 'var(--color-ink)' }}>
              Elige el Sello Físico para el Chat:
            </h4>
            <p className="apple-caption" style={{ marginBottom: 12 }}>
              Se estampará como sello de tinta visible para todos los que estén en el chat.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
              {SELLOS_OFICIALES.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setSelloElegido(s.id)}
                  style={{
                    padding: '12px 10px',
                    borderRadius: 10,
                    border: selloElegido === s.id ? '2px solid var(--color-ink)' : '1px solid var(--color-separator)',
                    backgroundColor: 'var(--color-surface-secondary)',
                    textAlign: 'center',
                    cursor: 'pointer'
                  }}
                >
                  <div className={`sello-tinta ${s.clase}`} style={{ fontSize: 13, marginBottom: 6 }}>
                    {s.etiqueta}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--color-secondary-ink)' }}>
                    {s.desc}
                  </div>
                </button>
              ))}
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              <button
                type="button"
                className="btn-primary"
                onClick={() => ejecutarTransaccion(CATALOGO_RECOMPENSAS.find(r => r.id === 'sello_tinta_chat'))}
                style={{ flex: 1, minHeight: 38, fontSize: 13 }}
              >
                Estampar en el Chat (15 pts)
              </button>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setMostrarSelectorSello(false)}
                style={{ minHeight: 38, fontSize: 13 }}
              >
                Cancelar
              </button>
            </div>
          </div>
        )}

        {/* Modal de Aviso para el Megáfono */}
        {mostrarModalMegafono && (
          <div style={{
            backgroundColor: 'var(--color-surface)',
            border: '1px solid var(--color-separator)',
            borderRadius: 14,
            padding: 16,
            marginBottom: 16,
            animation: 'fadeIn 0.2s ease'
          }}>
            <h4 style={{ fontSize: 14, fontWeight: 700, margin: '0 0 6px', color: 'var(--color-ink)' }}>
              Escribe el comunicado para el tablón fijado:
            </h4>
            <textarea
              className="apple-input"
              value={textoMegafono}
              onChange={(e) => setTextoMegafono(e.target.value)}
              placeholder="Ej: ¿Alguien tiene los comandos de packet tracer para el ejercicio de hoy?"
              maxLength={120}
              rows={2}
              style={{ width: '100%', marginBottom: 10, fontSize: 14, padding: '10px 12px' }}
            />
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                type="button"
                className="btn-primary"
                disabled={!textoMegafono.trim()}
                onClick={() => ejecutarTransaccion(CATALOGO_RECOMPENSAS.find(r => r.id === 'megafono_chat'), textoMegafono.trim())}
                style={{ flex: 1, minHeight: 38, fontSize: 13 }}
              >
                Fijar Comunicado (35 pts)
              </button>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setMostrarModalMegafono(false)}
                style={{ minHeight: 38, fontSize: 13 }}
              >
                Cancelar
              </button>
            </div>
          </div>
        )}

        {/* Detalle de Ticket Recibo si se ha generado uno */}
        {ticketActivo && (
          <div className="ticket-canje" style={{ marginBottom: 16, animation: 'fadeIn 0.2s ease' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--color-accent)', letterSpacing: 1 }}>
                {ticketActivo.codigo}
              </span>
              <span className="apple-caption">
                {ticketActivo.fecha} · {ticketActivo.hora}
              </span>
            </div>

            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--color-ink)', marginBottom: 2 }}>
              {ticketActivo.titulo}
            </div>

            <p style={{ fontSize: 12, color: 'var(--color-secondary-ink)', margin: '0 0 10px' }}>
              Alumno: <strong>{ticketActivo.nombre}</strong> · Coste: {ticketActivo.costo} pts
            </p>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div className="sello-tinta sello-tinta-azul" style={{ fontSize: 11, padding: '3px 8px' }}>
                {ticketActivo.estado === 'pendiente' ? 'PENDIENTE VALIDAR LOMINOÑO' : 'CANJE EMITIDO'}
              </div>

              <button
                type="button"
                onClick={() => setTicketActivo(null)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: 12,
                  color: 'var(--color-secondary-ink)',
                  cursor: 'pointer',
                  fontWeight: 600
                }}
              >
                Cerrar Recibo
              </button>
            </div>
          </div>
        )}

        {/* LISTADO DE ITEMS DEL CATÁLOGO (ESTILO INSET GROUPED LIST APPLE) */}
        {pestaña !== 'tickets' ? (
          <div style={{
            backgroundColor: 'var(--color-surface)',
            borderRadius: 16,
            border: '1px solid var(--color-separator)',
            overflow: 'hidden'
          }}>
            {itemsFiltrados.map((item, idx) => {
              const Icono = item.icon
              const alcanzable = puntosActuales >= item.costo

              return (
                <div
                  key={item.id}
                  style={{
                    padding: '14px 16px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    borderBottom: idx < itemsFiltrados.length - 1 ? '0.5px solid var(--color-separator)' : 'none',
                    opacity: alcanzable ? 1 : 0.6
                  }}
                >
                  <div style={{
                    width: 38,
                    height: 38,
                    borderRadius: 10,
                    backgroundColor: `${item.color}15`,
                    color: item.color,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}>
                    <Icono size={20} />
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-ink)' }}>
                      {item.titulo}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--color-secondary-ink)', marginTop: 1, lineHeight: 1.3 }}>
                      {item.desc}
                    </div>
                  </div>

                  <button
                    type="button"
                    className="btn-primary"
                    disabled={!alcanzable || canjeandoId === item.id}
                    onClick={() => iniciarCanje(item)}
                    style={{
                      flexShrink: 0,
                      minHeight: 34,
                      padding: '4px 12px',
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
        ) : (
          /* HISTORIAL DE TICKETS DE CANJE */
          <div>
            {canjes.length === 0 ? (
              <div className="card" style={{ textAlign: 'center', padding: 32 }}>
                <Ticket size={28} color="var(--color-secondary-ink)" style={{ margin: '0 auto 8px' }} />
                <p className="apple-subheadline" style={{ fontSize: 14 }}>
                  No tienes canjes realizados aún.
                </p>
                <p className="apple-caption" style={{ marginTop: 2 }}>
                  Tus puntos de asistencia se pueden canjear en la pestaña Ventajas.
                </p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {canjes.map((c) => (
                  <div key={c.id} className="ticket-canje">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                      <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--color-accent)', letterSpacing: 0.5 }}>
                        {c.codigo || '#SMR2-TICKET'}
                      </span>
                      <span className="apple-caption">
                        {c.fecha} · {c.hora || ''}
                      </span>
                    </div>

                    <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-ink)', marginBottom: 2 }}>
                      {c.titulo}
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
                      <span className="apple-caption">
                        Coste: <strong>{c.costo} pts</strong>
                      </span>

                      <span className={`sello-tinta ${c.estado === 'entregado' || c.estado === 'listo' ? 'sello-tinta-verde' : c.estado === 'rechazado' ? 'sello-tinta-rojo' : 'sello-tinta-azul'}`} style={{ fontSize: 10, padding: '2px 8px' }}>
                        {c.estado === 'entregado' ? 'VALIDADO LOMINOÑO' : c.estado === 'rechazado' ? 'RECHAZADO' : 'PENDIENTE VALIDAR'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
