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
  X,
  Zap,
  Sparkles,
  Megaphone,
  Flame,
  Radio,
  Send
} from 'lucide-react'

export const CATALOGO_RECOMPENSAS = [
  // 1. EFECTOS LOCOS PARA EL CHAT DE CLASE
  {
    id: 'terremoto_chat',
    categoria: 'chat',
    titulo: 'Terremoto en el Chat',
    desc: 'Hace temblar la pantalla de todos los que están en el chat con una sacudida sísmica.',
    costo: 30,
    icon: Zap,
    tipo: 'efecto_chat',
    efecto: 'terremoto',
    color: '#FF3B30'
  },
  {
    id: 'confeti_chat',
    categoria: 'chat',
    titulo: 'Lluvia de Confeti Colectiva',
    desc: 'Desata una tormenta de confeti festivo en las pantallas de todos los compañeros.',
    costo: 25,
    icon: Sparkles,
    tipo: 'efecto_chat',
    efecto: 'confeti',
    color: '#FF9500'
  },
  {
    id: 'megafono_chat',
    categoria: 'chat',
    titulo: 'Megáfono Fijado en el Chat',
    desc: 'Publica un anuncio dorado fijado en la cabecera del chat para que toda la clase lo lea.',
    costo: 40,
    icon: Megaphone,
    tipo: 'efecto_chat_texto',
    efecto: 'megafono',
    color: '#D4AF37'
  },
  {
    id: 'fiesta_chat',
    categoria: 'chat',
    titulo: 'Modo Fiesta / Luces Disco',
    desc: 'Activa un espectáculo de luces disco y resplandor festivo en el chat de la clase.',
    costo: 45,
    icon: Flame,
    tipo: 'efecto_chat',
    efecto: 'fiesta',
    color: '#AF52DE'
  },
  {
    id: 'sirena_descanso',
    categoria: 'chat',
    titulo: 'Sirena de Descanso 18:10',
    desc: 'Suena una alarma con alerta en el chat recordando que el descanso ya casi llega.',
    costo: 20,
    icon: Coffee,
    tipo: 'efecto_chat',
    efecto: 'descanso',
    color: '#0A84FF'
  },

  // 2. VENTAJAS DE AULA Y RACHA
  {
    id: 'congelar_racha',
    categoria: 'aula',
    titulo: 'Escudo de Racha (1 día)',
    desc: 'Si un día no puedes venir a las 15:30 o te retrasas, tu racha no se reinicia.',
    costo: 50,
    icon: Shield,
    tipo: 'inmediato',
    color: '#34C759'
  },
  {
    id: 'titulo_exclusivo',
    categoria: 'aula',
    titulo: 'Título VIP en el Chat',
    desc: 'Desbloquea una corona e insignia dorada junto a tu nombre para que todos lo vean en clase.',
    costo: 60,
    icon: Crown,
    tipo: 'seleccionable',
    opciones: ['👑 El Máquina', '⚡ Redes Boss', '🔥 Racha Dios', '💻 Linux Root', '😎 Delegado Oculto', '🚀 Hacker SMR2'],
    color: '#FF9500'
  },
  {
    id: 'elegir_musica',
    categoria: 'aula',
    titulo: 'Poner la música a las 15:20',
    desc: 'Eliges tú la playlist o los temazos del altavoz antes de que empiece la clase.',
    costo: 75,
    icon: Music,
    tipo: 'peticion',
    color: '#AF52DE'
  },
  {
    id: 'elegir_sitio',
    categoria: 'aula',
    titulo: 'Elegir sitio toda la semana',
    desc: 'Permiso oficial para sentarte en la mesa que quieras con tus colegas.',
    costo: 110,
    icon: Armchair,
    tipo: 'peticion',
    color: '#34C759'
  },
  {
    id: 'pista_reto',
    categoria: 'aula',
    titulo: 'Pista exclusiva de examen/reto',
    desc: 'lominoño te da una pista secreta sobre las preguntas del próximo reto o control.',
    costo: 130,
    icon: HelpCircle,
    tipo: 'peticion',
    color: '#FF3B30'
  },
  {
    id: 'bono_cafeteria',
    categoria: 'aula',
    titulo: 'Café o Zumo en el descanso',
    desc: 'Invitación oficial pactada para el descanso de las clases a las 18:10.',
    costo: 190,
    icon: Coffee,
    tipo: 'peticion',
    color: '#E5A00D'
  }
]

// Función global exportada para emitir efectos que sincronizan por Supabase y localmente
export async function emitirEfectoChat(tipoEfecto, autorPerfil, textoOpcional = '') {
  let mensajeTexto = ''
  if (tipoEfecto === 'terremoto') {
    mensajeTexto = `[EFECTO:terremoto] 🌋 ¡TERREMOTO EN CLASE! Desatado por ${autorPerfil.nombre}`
  } else if (tipoEfecto === 'confeti') {
    mensajeTexto = `[EFECTO:confeti] 🎉 ¡LLUVIA DE CONFETI COLECTIVA! Desatada por ${autorPerfil.nombre}`
  } else if (tipoEfecto === 'megafono') {
    mensajeTexto = `[EFECTO:megafono:${autorPerfil.nombre}] ${textoOpcional || '¡Atención a toda la clase!'}`
  } else if (tipoEfecto === 'fiesta') {
    mensajeTexto = `[EFECTO:fiesta] 🪩 ¡MODO FIESTA ACTIVADO POR ${autorPerfil.nombre}! ¡A bailar en SMR2!`
  } else if (tipoEfecto === 'descanso') {
    mensajeTexto = `[EFECTO:descanso] ☕ ¡SIRENA DE DESCANSO! ${autorPerfil.nombre} avisa: ¡A las 18:10 nos vemos en la cafetería!`
  }

  const nuevoMsg = {
    id: 'efecto-' + Date.now(),
    canal: 'general',
    user_id: autorPerfil.id,
    texto: mensajeTexto,
    nombre: autorPerfil.nombre,
    digito_id: autorPerfil.digito_id || null,
    username: autorPerfil.username || null,
    color_acento: autorPerfil.color_acento || '#0A84FF',
    rol: autorPerfil.rol || 'alumno',
    likes_count: 0,
    created_at: new Date().toISOString()
  }

  // 1. Guardar en chat local para inmediatez
  try {
    const canal = 'general'
    const prev = JSON.parse(localStorage.getItem('racha_chat_' + canal) || '[]')
    const actualizados = [...prev, nuevoMsg]
    localStorage.setItem('racha_chat_' + canal, JSON.stringify(actualizados.slice(-100)))
  } catch (e) {}

  // 2. Si es megáfono, fijar en el almacenamiento del chat
  if (tipoEfecto === 'megafono') {
    try {
      localStorage.setItem('muudel_megafono_activo', JSON.stringify({
        id: 'mega-' + Date.now(),
        autor: autorPerfil.nombre,
        texto: textoOpcional || '¡Atención a toda la clase!',
        hora: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }))
    } catch (e) {}
  }

  // 3. Enviar a Supabase para sincronizar con todos los alumnos en vivo
  try {
    await supabase.from('messages').insert({
      user_id: autorPerfil.id,
      canal: 'general',
      texto: mensajeTexto
    })
  } catch (e) {}

  // 4. Disparar evento para componentes en pantalla
  window.dispatchEvent(new CustomEvent('muudel-efecto-chat', {
    detail: { tipo: tipoEfecto, autor: autorPerfil.nombre, texto: textoOpcional }
  }))
}

export function TiendaRecompensas({ onClose }) {
  const { perfil, setPerfil } = useAuth()
  const [canjes, setCanjes] = useState([])
  const [canjeandoId, setCanjeandoId] = useState(null)
  const [categoriaFiltro, setCategoriaFiltro] = useState('todos') // 'todos' | 'chat' | 'aula'
  const [tituloSeleccionado, setTituloSeleccionado] = useState('👑 El Máquina')
  const [mostrarSelectorTitulo, setMostrarSelectorTitulo] = useState(false)
  
  // Modal de texto para megáfono
  const [mostrarModalMegafono, setMostrarModalMegafono] = useState(false)
  const [textoMegafono, setTextoMegafono] = useState('')
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
    setTimeout(() => setNotificacion(null), 3800)
  }

  const iniciarCanje = (recompensa) => {
    if (puntosActuales < recompensa.costo) {
      sound.playPop()
      mostrarMensaje(`Te faltan ${recompensa.costo - puntosActuales} puntos para este canje`, 'error')
      return
    }

    if (recompensa.id === 'titulo_exclusivo') {
      setMostrarSelectorTitulo(true)
      return
    }

    if (recompensa.id === 'megafono_chat') {
      setMostrarModalMegafono(true)
      return
    }

    ejecutarTransaccion(recompensa)
  }

  const ejecutarTransaccion = async (recompensa, textoExtra = '') => {
    setCanjeandoId(recompensa.id)
    const nuevosPuntos = puntosActuales - recompensa.costo

    // 1. Actualizar perfil local y remoto
    const perfilActualizado = {
      ...perfil,
      puntos_total: nuevosPuntos,
      ...(recompensa.id === 'congelar_racha' ? { racha_congelada: true } : {}),
      ...(recompensa.id === 'titulo_exclusivo' ? { frase: tituloSeleccionado, titulo_vip: tituloSeleccionado } : {})
    }

    setPerfil(perfilActualizado)
    localStorage.setItem('racha_local_user', JSON.stringify(perfilActualizado))
    if (recompensa.id === 'titulo_exclusivo') {
      try {
        const meta = JSON.parse(localStorage.getItem('muudel_user_meta_' + perfil.id) || '{}')
        localStorage.setItem('muudel_user_meta_' + perfil.id, JSON.stringify({ ...meta, titulo_vip: tituloSeleccionado, frase: tituloSeleccionado }))
      } catch (e) {}
    }

    try {
      await supabase
        .from('profiles')
        .update({
          puntos_total: nuevosPuntos,
          ...(recompensa.id === 'titulo_exclusivo' ? { frase: tituloSeleccionado } : {})
        })
        .eq('id', perfil.id)
    } catch (e) {}

    // 2. Si es efecto de chat, desatarlo de inmediato
    if (recompensa.tipo === 'efecto_chat' || recompensa.tipo === 'efecto_chat_texto') {
      await emitirEfectoChat(recompensa.efecto, perfil, textoExtra)
      sound.playStamp()
      triggerConfetti()
    }

    // 3. Registrar el ticket de canje
    const nuevoCanje = {
      id: 'canje-' + Date.now(),
      userId: perfil.id,
      nombre: perfil.nombre,
      recompensaId: recompensa.id,
      titulo: recompensa.titulo + (recompensa.id === 'titulo_exclusivo' ? ` (${tituloSeleccionado})` : '') + (textoExtra ? ` "${textoExtra}"` : ''),
      costo: recompensa.costo,
      fecha: new Date().toLocaleDateString('es-ES', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }),
      estado: recompensa.tipo === 'inmediato' || recompensa.tipo === 'seleccionable' || recompensa.tipo.startsWith('efecto') ? 'activado' : 'pendiente'
    }

    try {
      const guardados = localStorage.getItem('muudel_canjes_pedidos')
      const todos = guardados ? JSON.parse(guardados) : []
      const actualizados = [nuevoCanje, ...todos]
      localStorage.setItem('muudel_canjes_pedidos', JSON.stringify(actualizados))
      setCanjes(actualizados.filter(c => c.userId === perfil?.id))
    } catch (e) {}

    // 4. Registrar en auditoría
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
      localStorage.setItem('muudel_audit_log', JSON.stringify(logs.slice(0, 80)))
    } catch (e) {}

    sound.playPop()
    setMostrarSelectorTitulo(false)
    setMostrarModalMegafono(false)
    setTextoMegafono('')
    setCanjeandoId(null)

    if (recompensa.tipo.startsWith('efecto')) {
      mostrarMensaje(`¡${recompensa.titulo} desatado en el chat! Toda la clase lo está viendo.`)
    } else {
      mostrarMensaje(`¡Canjeado con éxito! Te quedan ${nuevosPuntos} pts.`)
    }
  }

  const itemsFiltrados = CATALOGO_RECOMPENSAS.filter(item => {
    if (categoriaFiltro === 'todos') return true
    return item.categoria === categoriaFiltro
  })

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.55)',
      backdropFilter: 'blur(10px)',
      WebkitBackdropFilter: 'blur(10px)',
      zIndex: 2000,
      display: 'flex',
      alignItems: 'flex-end',
      justifyContent: 'center',
      padding: '0'
    }}>
      <div className="card" style={{
        width: '100%',
        maxWidth: 580,
        maxHeight: '92vh',
        overflowY: 'auto',
        borderBottomLeftRadius: 0,
        borderBottomRightRadius: 0,
        borderRadius: '24px 24px 0 0',
        padding: '24px 20px 40px',
        animation: 'slideUp 0.25s ease-out',
        boxShadow: '0 -8px 40px rgba(0, 0, 0, 0.2)'
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
                Canjea tus puntos por efectos en el chat o ventajas en clase
              </p>
            </div>
          </div>

          <button
            type="button"
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
          padding: '12px 18px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 16
        }}>
          <span style={{ fontSize: 14, color: 'var(--color-secondary-ink)', fontWeight: 600 }}>
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
            backgroundColor: notificacion.tipo === 'error' ? 'rgba(255, 59, 48, 0.12)' : 'rgba(52, 199, 89, 0.12)',
            color: notificacion.tipo === 'error' ? 'var(--color-negative)' : 'var(--color-positive)',
            border: `1px solid ${notificacion.tipo === 'error' ? 'rgba(255, 59, 48, 0.3)' : 'rgba(52, 199, 89, 0.3)'}`
          }}>
            {notificacion.tipo === 'error' ? <AlertCircle size={16} /> : <Check size={16} />}
            <span>{notificacion.texto}</span>
          </div>
        )}

        {/* Filtro de Categorías */}
        <div style={{
          display: 'flex',
          gap: 6,
          marginBottom: 16,
          padding: '4px',
          backgroundColor: 'var(--color-fill-secondary)',
          borderRadius: 12
        }}>
          {[
            { id: 'todos', label: 'Todo el Catálogo' },
            { id: 'chat', label: '💥 Efectos de Chat' },
            { id: 'aula', label: '🏆 Ventajas de Clase' }
          ].map(f => (
            <button
              key={f.id}
              type="button"
              onClick={() => setCategoriaFiltro(f.id)}
              style={{
                flex: 1,
                padding: '6px 10px',
                borderRadius: 8,
                border: 'none',
                backgroundColor: categoriaFiltro === f.id ? 'var(--color-surface)' : 'transparent',
                color: categoriaFiltro === f.id ? 'var(--color-ink)' : 'var(--color-secondary-ink)',
                fontWeight: 600,
                fontSize: 12,
                cursor: 'pointer',
                boxShadow: categoriaFiltro === f.id ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                transition: 'all 0.15s ease'
              }}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Modal de selección de título si pulsa título VIP */}
        {mostrarSelectorTitulo && (
          <div style={{
            backgroundColor: 'var(--color-surface)',
            border: '1.5px solid var(--color-accent)',
            borderRadius: 16,
            padding: 16,
            marginBottom: 16,
            animation: 'fadeIn 0.2s ease'
          }}>
            <h4 style={{ fontSize: 14, fontWeight: 700, marginBottom: 8, color: 'var(--color-ink)' }}>
              Elige tu Título VIP para el Chat:
            </h4>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
              {CATALOGO_RECOMPENSAS.find(r => r.id === 'titulo_exclusivo')?.opciones.map((op) => (
                <button
                  key={op}
                  type="button"
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
                type="button"
                className="btn-primary"
                onClick={() => ejecutarTransaccion(CATALOGO_RECOMPENSAS.find(r => r.id === 'titulo_exclusivo'))}
                style={{ flex: 1, minHeight: 38, fontSize: 13 }}
              >
                Confirmar por 60 pts
              </button>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setMostrarSelectorTitulo(false)}
                style={{ minHeight: 38, fontSize: 13 }}
              >
                Cancelar
              </button>
            </div>
          </div>
        )}

        {/* Modal de texto para Megáfono de Clase */}
        {mostrarModalMegafono && (
          <div style={{
            backgroundColor: 'var(--color-surface)',
            border: '1.5px solid #D4AF37',
            borderRadius: 16,
            padding: 16,
            marginBottom: 16,
            animation: 'fadeIn 0.2s ease'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <Megaphone size={18} color="#D4AF37" />
              <h4 style={{ fontSize: 14, fontWeight: 700, margin: 0, color: 'var(--color-ink)' }}>
                Escribe tu anuncio de Megáfono (Fijado en el Chat):
              </h4>
            </div>
            <textarea
              className="apple-input"
              value={textoMegafono}
              onChange={(e) => setTextoMegafono(e.target.value)}
              placeholder="Ej: ¡A las 18:10 bajamos todos a la cafetería! / ¿Quién tiene los apuntes de SOR?"
              maxLength={140}
              rows={3}
              style={{ width: '100%', marginBottom: 10, fontSize: 14, padding: '10px 12px' }}
            />
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                type="button"
                className="btn-primary"
                disabled={!textoMegafono.trim()}
                onClick={() => ejecutarTransaccion(CATALOGO_RECOMPENSAS.find(r => r.id === 'megafono_chat'), textoMegafono.trim())}
                style={{ flex: 1, minHeight: 38, fontSize: 13, backgroundColor: '#D4AF37' }}
              >
                Publicar Anuncio por 40 pts
              </button>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => { setMostrarModalMegafono(false); setTextoMegafono('') }}
                style={{ minHeight: 38, fontSize: 13 }}
              >
                Cancelar
              </button>
            </div>
          </div>
        )}

        {/* Catálogo de Recompensas */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
          {itemsFiltrados.map((item) => {
            const Icono = item.icon
            const alcanzable = puntosActuales >= item.costo
            const esEfectoChat = item.categoria === 'chat'

            return (
              <div
                key={item.id}
                style={{
                  backgroundColor: 'var(--color-surface)',
                  border: esEfectoChat ? `1px solid ${item.color}35` : '1px solid var(--color-separator)',
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
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                    <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-ink)', margin: 0 }}>
                      {item.titulo}
                    </h3>
                    {esEfectoChat && (
                      <span style={{
                        fontSize: 10,
                        fontWeight: 800,
                        padding: '1px 6px',
                        borderRadius: 6,
                        backgroundColor: `${item.color}18`,
                        color: item.color
                      }}>
                        EN VIVO
                      </span>
                    )}
                  </div>
                  <p style={{ fontSize: 12, color: 'var(--color-secondary-ink)', marginTop: 2, lineHeight: 1.3 }}>
                    {item.desc}
                  </p>
                </div>

                <button
                  type="button"
                  className="btn-primary"
                  disabled={!alcanzable || canjeandoId === item.id}
                  onClick={() => iniciarCanje(item)}
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
                    {c.estado === 'activado' ? 'Listo' : 'Pendiente'}
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
