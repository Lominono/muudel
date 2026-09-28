import { useState, useEffect } from 'react'
import { useAuth } from '../App'
import { supabase } from '../utils/supabase'
import { sound, triggerConfetti } from '../utils/haptics'
import { transmitirEvento, suscribirEvento } from '../utils/realtimeHub'
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
  Award,
  Hourglass,
  Package,
  Play,
  RotateCcw,
  Sparkle,
  Radio,
  Flame,
  Palette
} from 'lucide-react'

// CATÁLOGO DE PRODUCTOS EXCLUSIVAMENTE CON TIEMPO DE ACTIVACIÓN
export const CATALOGO_RECOMPENSAS = [
  // 1. MARCOS DE AVATAR TEMPORALES
  {
    id: 'marco_oro',
    categoria: 'marcos',
    titulo: 'Marco Dorado Imperial',
    desc: 'Doble anillo de oro bruñido y resplandor de prestigio alrededor de tu avatar en chat y rankings.',
    costo: 40,
    icon: Award,
    duracionMs: 2 * 3600 * 1000,
    duracionTexto: '2 horas desde activación',
    marcoKey: 'oro',
    color: '#D4AF37'
  },
  {
    id: 'marco_fuego',
    categoria: 'marcos',
    titulo: 'Marco Flama de Racha',
    desc: 'Anillo ámbar ardiente que proyecta la llama de asistencia en tu foto de perfil.',
    costo: 35,
    icon: Flame,
    duracionMs: 2 * 3600 * 1000,
    duracionTexto: '2 horas desde activación',
    marcoKey: 'fuego',
    color: '#FF9500'
  },
  {
    id: 'marco_cyber',
    categoria: 'marcos',
    titulo: 'Marco Cyberpunk Neón',
    desc: 'Borde cian reactivo de alta tecnología para apasionados de redes y sistemas.',
    costo: 35,
    icon: Zap,
    duracionMs: 2 * 3600 * 1000,
    duracionTexto: '2 horas desde activación',
    marcoKey: 'cyber',
    color: '#00F0FF'
  },
  {
    id: 'marco_tinta',
    categoria: 'marcos',
    titulo: 'Marco Sello Carmín',
    desc: 'Borde de tinta oficial lacrada estilo sello de puntualidad [PRESENTE].',
    costo: 30,
    icon: Stamp,
    duracionMs: 2 * 3600 * 1000,
    duracionTexto: '2 horas desde activación',
    marcoKey: 'tinta',
    color: '#FF3B30'
  },
  {
    id: 'marco_esmeralda',
    categoria: 'marcos',
    titulo: 'Marco Esmeralda Matrix',
    desc: 'Aura verde fosforescente de terminal UNIX y consola de administración.',
    costo: 30,
    icon: Sparkles,
    duracionMs: 2 * 3600 * 1000,
    duracionTexto: '2 horas desde activación',
    marcoKey: 'esmeralda',
    color: '#34C759'
  },
  {
    id: 'marco_obsidiana',
    categoria: 'marcos',
    titulo: 'Marco Obsidiana Stealth',
    desc: 'Acabado minimalista de titanio negro satinado con reflejo pulido.',
    costo: 25,
    icon: Shield,
    duracionMs: 2 * 3600 * 1000,
    duracionTexto: '2 horas desde activación',
    marcoKey: 'obsidiana',
    color: '#8E8E93'
  },

  // 2. TÍTULOS Y APODOS VIP TEMPORALES
  {
    id: 'titulo_root',
    categoria: 'titulos',
    titulo: 'Título: 💻 Linux Root Master',
    desc: 'Luce el título de superusuario oficial debajo de tu nombre en cada mensaje del chat.',
    costo: 45,
    icon: Award,
    duracionMs: 4 * 3600 * 1000,
    duracionTexto: '4 horas desde activación',
    tituloTexto: '💻 Linux Root Master',
    color: '#007AFF'
  },
  {
    id: 'titulo_mvp',
    categoria: 'titulos',
    titulo: 'Título: 🏆 MVP del Aula 15:30',
    desc: 'Insignia de honor reservada para el alumno más puntual y participativo de la jornada.',
    costo: 50,
    icon: Award,
    duracionMs: 4 * 3600 * 1000,
    duracionTexto: '4 horas desde activación',
    tituloTexto: '🏆 MVP Aula 15:30',
    color: '#D4AF37'
  },
  {
    id: 'titulo_hacker',
    categoria: 'titulos',
    titulo: 'Título: ⚡ Redes & Scripts God',
    desc: 'Título honorífico para los que configuran switches y routers sin mirar la chuleta.',
    costo: 40,
    icon: Zap,
    duracionMs: 4 * 3600 * 1000,
    duracionTexto: '4 horas desde activación',
    tituloTexto: '⚡ Redes & Scripts God',
    color: '#FF9500'
  },
  {
    id: 'titulo_patrocinador',
    categoria: 'titulos',
    titulo: 'Título: ☕ Rey del Descanso 18:10',
    desc: 'Título oficial de cafetería para liderar la bajada en el descanso de la tarde.',
    costo: 35,
    icon: Coffee,
    duracionMs: 4 * 3600 * 1000,
    duracionTexto: '4 horas desde activación',
    tituloTexto: '☕ Rey del Descanso 18:10',
    color: '#34C759'
  },
  {
    id: 'titulo_cable',
    categoria: 'titulos',
    titulo: 'Título: 🔌 Cable RJ45 Humano',
    desc: 'Apodo clásico para el compañero que siempre tiene cable de red o adaptador a mano.',
    costo: 25,
    icon: HelpCircle,
    duracionMs: 4 * 3600 * 1000,
    duracionTexto: '4 horas desde activación',
    tituloTexto: '🔌 Cable RJ45 Humano',
    color: '#8E8E93'
  },

  // 3. VENTAJAS DE AULA TEMPORALES
  {
    id: 'congelar_racha',
    categoria: 'aula',
    titulo: 'Escudo Antirretraso de Asistencia',
    desc: 'Si un día tienes un retraso justificado después de las 15:30, tu racha de días se conserva intacta.',
    costo: 50,
    icon: Shield,
    duracionMs: 24 * 3600 * 1000,
    duracionTexto: '24 horas desde activación',
    color: '#007AFF'
  },
  {
    id: 'elegir_sitio',
    categoria: 'aula',
    titulo: 'Elegir Sitio en el Aula de Informática',
    desc: 'Derecho a elegir puesto de ordenador en el aula junto a tu compañero durante la jornada.',
    costo: 80,
    icon: MapPin,
    duracionMs: 24 * 3600 * 1000,
    duracionTexto: '24 horas lectivas desde activación',
    color: '#34C759'
  },
  {
    id: 'musica_descanso',
    categoria: 'aula',
    titulo: 'Conectar Altavoz en el Descanso',
    desc: 'Pones tú la música por Bluetooth en el aula durante los 30 minutos del descanso de las 18:10.',
    costo: 60,
    icon: Music,
    duracionMs: 45 * 60 * 1000,
    duracionTexto: '45 minutos desde activación',
    color: '#FF9500'
  },
  {
    id: 'pista_examen',
    categoria: 'aula',
    titulo: 'Pista Clave de Práctica / Control',
    desc: 'lominoño te facilita una pista orientativa sobre los comandos del próximo control de sistemas.',
    costo: 100,
    icon: HelpCircle,
    duracionMs: 48 * 3600 * 1000,
    duracionTexto: '48 horas desde activación',
    color: '#FF3B30'
  },
  {
    id: 'ticket_cafeteria',
    categoria: 'aula',
    titulo: 'Ticket de Cafetería / Máquina',
    desc: 'Un café, zumo o tentempié acordado para el descanso de las 18:10 con el profesor.',
    costo: 150,
    icon: Coffee,
    duracionMs: 72 * 3600 * 1000,
    duracionTexto: '72 horas para canjear en clase',
    color: '#8E8E93'
  },

  // 4. EFECTOS Y SELLOS EN TIEMPO REAL
  {
    id: 'sello_tinta_chat',
    categoria: 'efectos',
    titulo: 'Estampar Sello Oficial en Chat',
    desc: 'Estampa un sello físico oficial [PRESENTE], [VISTO], [DESCANSO] o [APROBADO].',
    costo: 15,
    icon: Stamp,
    duracionMs: 15 * 60 * 1000,
    duracionTexto: 'Uso durante 15 minutos',
    color: '#FF3B30'
  },
  {
    id: 'terremoto_chat',
    categoria: 'efectos',
    titulo: 'Sacudida Sísmica de Aula',
    desc: 'Hace temblar la pantalla del chat de todos los compañeros en vivo durante 3 segundos.',
    costo: 25,
    icon: Zap,
    duracionMs: 5 * 60 * 1000,
    duracionTexto: 'Recarga: 5 minutos',
    efecto: 'terremoto',
    color: '#FF3B30'
  },
  {
    id: 'confeti_chat',
    categoria: 'efectos',
    titulo: 'Lluvia de Papelitos de Confeti',
    desc: 'Dispara una ráfaga de confeti de celebración en el chat de todos los alumnos.',
    costo: 20,
    icon: Sparkles,
    duracionMs: 3 * 60 * 1000,
    duracionTexto: 'Recarga: 3 minutos',
    efecto: 'confeti',
    color: '#FF9500'
  },
  {
    id: 'megafono_chat',
    categoria: 'efectos',
    titulo: 'Aviso Fijado en Tablón de Clase',
    desc: 'Fija un comunicado de texto en la cabecera del chat visible para toda la clase durante 30 minutos.',
    costo: 35,
    icon: Megaphone,
    duracionMs: 30 * 60 * 1000,
    duracionTexto: 'Fijado durante 30 minutos desde activación',
    efecto: 'megafono',
    color: '#007AFF'
  },
  {
    id: 'sirena_descanso',
    categoria: 'efectos',
    titulo: 'Silbato del Descanso 18:10',
    desc: 'Suena el aviso acústico oficial recordando que empieza el descanso de la tarde.',
    costo: 20,
    icon: Clock,
    duracionMs: 15 * 60 * 1000,
    duracionTexto: 'Recarga: 15 minutos',
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

// Formateador de tiempo restante en vivo
export function formatearTiempoRestante(timestampExpiracion) {
  if (!timestampExpiracion) return null
  const diffMs = timestampExpiracion - Date.now()
  if (diffMs <= 0) return 'Caducado'

  const totalSegundos = Math.floor(diffMs / 1000)
  const dias = Math.floor(totalSegundos / (3600 * 24))
  const horas = Math.floor((totalSegundos % (3600 * 24)) / 3600)
  const minutos = Math.floor((totalSegundos % 3600) / 60)
  const segundos = totalSegundos % 60

  if (dias > 0) return `${dias}d ${horas}h restantes`
  if (horas > 0) return `${horas}h ${minutos}m restantes`
  if (minutos > 0) return `${minutos}m ${segundos}s restantes`
  return `${segundos}s restantes`
}

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

  const expiraEn = Date.now() + 30 * 60 * 1000

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
    const megafonoObj = {
      id: 'mega-' + Date.now(),
      autor: autorPerfil.nombre,
      texto: textoOpcional || 'Aviso para toda la clase',
      expiraEn: expiraEn,
      hora: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
    try {
      localStorage.setItem('muudel_megafono_activo', JSON.stringify(megafonoObj))
    } catch (e) {}
    transmitirEvento('megafono_activo', megafonoObj)
  }

  transmitirEvento('efecto_chat', {
    tipo: tipoEfecto,
    autor: autorPerfil.nombre,
    texto: textoOpcional,
    expiraEn,
    color: autorPerfil.color_acento || '#007AFF',
    timestamp: Date.now()
  })

  transmitirEvento('nuevo_mensaje_chat', nuevoMsg)

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
  const [pestaña, setPestaña] = useState('catalogo') // 'catalogo' | 'inventario' | 'tickets'
  const [categoriaCatalogo, setCategoriaCatalogo] = useState('todos') // 'todos' | 'marcos' | 'titulos' | 'aula' | 'efectos'
  const [inventario, setInventario] = useState([])
  const [canjes, setCanjes] = useState([])
  const [comprandoId, setComprandoId] = useState(null)
  const [relojTick, setRelojTick] = useState(0)

  // Selector de Sello
  const [mostrarSelectorSello, setMostrarSelectorSello] = useState(false)
  const [selloElegido, setSelloElegido] = useState('PRESENTE')

  // Megáfono
  const [mostrarModalMegafono, setMostrarModalMegafono] = useState(false)
  const [textoMegafono, setTextoMegafono] = useState('')

  // Notificación
  const [notificacion, setNotificacion] = useState(null)

  const puntosActuales = perfil?.puntos_total || 0

  // 1. Cargar inventario del usuario
  useEffect(() => {
    if (!perfil?.id) return
    cargarInventario()
    cargarCanjes()

    const desuscribir = suscribirEvento('estado_canje', ({ canjeId, estado }) => {
      setCanjes(prev => prev.map(c => c.id === canjeId ? { ...c, estado } : c))
    })
    return () => desuscribir()
  }, [perfil?.id])

  const cargarInventario = () => {
    try {
      const raw = localStorage.getItem('muudel_inventario_' + perfil?.id)
      if (raw) {
        setInventario(JSON.parse(raw))
      } else {
        setInventario([])
      }
    } catch (e) {
      setInventario([])
    }
  }

  const guardarInventario = (nuevoInv) => {
    setInventario(nuevoInv)
    try {
      localStorage.setItem('muudel_inventario_' + perfil?.id, JSON.stringify(nuevoInv))
    } catch (e) {}
  }

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
    setTimeout(() => setNotificacion(null), 3800)
  }

  // 2. Tick cada segundo para actualizar cronómetros y verificar expiraciones
  useEffect(() => {
    const timer = setInterval(() => {
      setRelojTick(prev => prev + 1)

      // Verificar si algún artículo activo ha caducado
      if (inventario.length > 0) {
        const ahora = Date.now()
        let huboCambios = false
        let perfilModificado = { ...perfil }

        const actualizados = inventario.map(item => {
          if (item.estado === 'activo' && item.expiraEn && item.expiraEn <= ahora) {
            huboCambios = true
            // Desequipar del perfil
            if (item.marcoKey && perfilModificado.marco_avatar === item.marcoKey) {
              perfilModificado.marco_avatar = 'ninguno'
            }
            if (item.tituloTexto && perfilModificado.titulo_vip === item.tituloTexto) {
              perfilModificado.titulo_vip = null
              perfilModificado.frase = ''
            }
            if (item.catalogoId === 'congelar_racha') {
              perfilModificado.racha_congelada = false
              perfilModificado.racha_congelada_hasta = null
            }
            return { ...item, estado: 'expirado' }
          }
          return item
        })

        if (huboCambios) {
          guardarInventario(actualizados)
          setPerfil(perfilModificado)
          localStorage.setItem('racha_local_user', JSON.stringify(perfilModificado))
          try {
            localStorage.setItem('muudel_user_meta_' + perfil.id, JSON.stringify(perfilModificado))
          } catch (e) {}
        }
      }
    }, 1000)

    return () => clearInterval(timer)
  }, [inventario, perfil])

  // 3. COMPRAR PRODUCTO: Va a la Mochila / Inventario (No se activa aún)
  const comprarProducto = async (item) => {
    if (puntosActuales < item.costo) {
      sound.playPop()
      avisar(`Te faltan ${item.costo - puntosActuales} puntos para comprar este artículo.`, 'error')
      return
    }

    setComprandoId(item.id)
    const nuevosPuntos = puntosActuales - item.costo

    // Descontar puntos
    const perfilActualizado = { ...perfil, puntos_total: nuevosPuntos }
    setPerfil(perfilActualizado)
    localStorage.setItem('racha_local_user', JSON.stringify(perfilActualizado))
    try {
      await supabase.from('profiles').update({ puntos_total: nuevosPuntos }).eq('id', perfil.id)
    } catch (e) {}

    // Crear artículo en inventario con estado "listo"
    const nuevoItemInventario = {
      id: 'inv-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
      catalogoId: item.id,
      titulo: item.titulo,
      desc: item.desc,
      categoria: item.categoria,
      costo: item.costo,
      duracionMs: item.duracionMs,
      duracionTexto: item.duracionTexto,
      marcoKey: item.marcoKey || null,
      tituloTexto: item.tituloTexto || null,
      efecto: item.efecto || null,
      color: item.color,
      estado: 'listo', // 'listo' | 'activo' | 'expirado'
      compradoEn: Date.now(),
      activadoEn: null,
      expiraEn: null,
    }

    const nuevoInventario = [nuevoItemInventario, ...inventario]
    guardarInventario(nuevoInventario)

    // Si es una petición de aula (cafetería, altavoz, sitio), generar ticket
    if (item.categoria === 'aula' && item.id !== 'congelar_racha') {
      const codigoTicket = `#SMR2-${Math.floor(100 + Math.random() * 900)}`
      const nuevoTicket = {
        id: 'canje-' + Date.now(),
        codigo: codigoTicket,
        userId: perfil.id,
        nombre: perfil.nombre,
        recompensaId: item.id,
        titulo: item.titulo,
        costo: item.costo,
        fecha: new Date().toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }),
        hora: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        expiraEn: Date.now() + item.duracionMs,
        tiempoTexto: item.duracionTexto,
        estado: 'pendiente'
      }

      try {
        const guardados = localStorage.getItem('muudel_canjes_pedidos')
        const todos = guardados ? JSON.parse(guardados) : []
        const actualizados = [nuevoTicket, ...todos]
        localStorage.setItem('muudel_canjes_pedidos', JSON.stringify(actualizados))
        setCanjes(actualizados.filter(c => c.userId === perfil?.id))
      } catch (e) {}

      transmitirEvento('nuevo_canje', nuevoTicket)
    }

    // Registro en auditoría
    try {
      const logs = JSON.parse(localStorage.getItem('muudel_audit_log') || '[]')
      logs.unshift({
        id: 'aud-' + Date.now(),
        fecha: new Date().toLocaleDateString('es-ES'),
        hora: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        autor: perfil.nombre,
        accion: 'Compra en Tienda',
        detalle: `Compró "${item.titulo}" por ${item.costo} pts (${item.duracionTexto})`
      })
      localStorage.setItem('muudel_audit_log', JSON.stringify(logs.slice(0, 80)))
    } catch (e) {}

    setComprandoId(null)
    sound.playStamp()
    triggerConfetti()
    avisar(`¡${item.titulo} añadido a tu Mochila! Puedes activarlo cuando tú decidas.`)
  }

  // 4. ACTIVAR PRODUCTO: El reloj empieza a contar en este instante
  const activarProducto = async (invItem, extraTexto = '') => {
    const ahora = Date.now()
    const expiraEn = ahora + invItem.duracionMs

    const itemActualizado = {
      ...invItem,
      estado: 'activo',
      activadoEn: ahora,
      expiraEn: expiraEn
    }

    const nuevoInv = inventario.map(i => i.id === invItem.id ? itemActualizado : i)
    guardarInventario(nuevoInv)

    // Aplicar al perfil de inmediato
    let perfilActualizado = { ...perfil }

    if (invItem.marcoKey) {
      perfilActualizado.marco_avatar = invItem.marcoKey
    }
    if (invItem.tituloTexto) {
      perfilActualizado.titulo_vip = invItem.tituloTexto
      perfilActualizado.frase = invItem.tituloTexto
    }
    if (invItem.catalogoId === 'congelar_racha') {
      perfilActualizado.racha_congelada = true
      perfilActualizado.racha_congelada_hasta = expiraEn
    }

    setPerfil(perfilActualizado)
    localStorage.setItem('racha_local_user', JSON.stringify(perfilActualizado))
    try {
      localStorage.setItem('muudel_user_meta_' + perfil.id, JSON.stringify(perfilActualizado))
    } catch (e) {}

    try {
      await supabase
        .from('profiles')
        .update({
          marco_avatar: perfilActualizado.marco_avatar,
          frase: perfilActualizado.frase,
        })
        .eq('id', perfil.id)
    } catch (e) {}

    // Si es efecto o sello de chat, disparar en vivo
    if (invItem.catalogoId === 'sello_tinta_chat') {
      await emitirEfectoChat('sello', perfil, selloElegido)
      setMostrarSelectorSello(false)
    } else if (invItem.efecto) {
      await emitirEfectoChat(invItem.efecto, perfil, extraTexto)
      if (invItem.efecto === 'confeti') triggerConfetti()
      setMostrarModalMegafono(false)
      setTextoMegafono('')
    }

    sound.playStamp()
    triggerConfetti()
    avisar(`¡"${invItem.titulo}" activado! El tiempo ya está corriendo (${invItem.duracionTexto}).`)
  }

  const itemsCatalogoFiltrados = CATALOGO_RECOMPENSAS.filter(item => {
    if (categoriaCatalogo === 'todos') return true
    return item.categoria === categoriaCatalogo
  })

  const articulosActivos = inventario.filter(i => i.estado === 'activo' && i.expiraEn && i.expiraEn > Date.now())
  const articulosListos = inventario.filter(i => i.estado === 'listo')
  const articulosExpirados = inventario.filter(i => i.estado === 'expirado' || (i.expiraEn && i.expiraEn <= Date.now()))

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
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
        maxWidth: 600,
        maxHeight: '92vh',
        overflowY: 'auto',
        borderBottomLeftRadius: 0,
        borderBottomRightRadius: 0,
        borderRadius: '24px 24px 0 0',
        padding: '24px 20px 40px',
        backgroundColor: 'var(--color-bg)',
        animation: 'slideUp 0.22s cubic-bezier(0.16, 1, 0.3, 1)',
        boxShadow: '0 -10px 40px rgba(0, 0, 0, 0.2)'
      }}>
        {/* Cabecera Apple */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <div>
            <h2 className="apple-large-title" style={{ fontSize: 22, margin: 0 }}>
              Tienda de Recompensas
            </h2>
            <p className="apple-caption" style={{ marginTop: 2 }}>
              Productos temporales: el tiempo cuenta <strong>desde que los activas</strong>
            </p>
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
            <X size={16} />
          </button>
        </div>

        {/* Marcador de Saldo y Resumen de Mochila */}
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
              Tus Puntos de Clase
            </span>
            <div className="tabular-nums" style={{ fontSize: 24, fontWeight: 800, color: 'var(--color-ink)', marginTop: 1 }}>
              {puntosActuales} <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-secondary-ink)' }}>pts</span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setPestaña('inventario')}
            style={{
              padding: '6px 12px',
              borderRadius: 9999,
              border: '1px solid var(--color-separator)',
              backgroundColor: pestaña === 'inventario' ? 'var(--color-accent)' : 'var(--color-surface-secondary)',
              color: pestaña === 'inventario' ? '#FFFFFF' : 'var(--color-ink)',
              fontSize: 12,
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              transition: 'all 0.15s ease'
            }}
          >
            <Package size={14} />
            <span>Mi Mochila ({articulosActivos.length + articulosListos.length})</span>
          </button>
        </div>

        {/* Notificación flotante */}
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

        {/* Selector de Pestañas Principal */}
        <div className="segmented-control" style={{ marginBottom: 16 }}>
          <button
            type="button"
            className={`segmented-control-item ${pestaña === 'catalogo' ? 'active' : ''}`}
            onClick={() => setPestaña('catalogo')}
          >
            Catálogo
          </button>
          <button
            type="button"
            className={`segmented-control-item ${pestaña === 'inventario' ? 'active' : ''}`}
            onClick={() => setPestaña('inventario')}
          >
            Mi Mochila ({articulosListos.length} listos · {articulosActivos.length} activos)
          </button>
          <button
            type="button"
            className={`segmented-control-item ${pestaña === 'tickets' ? 'active' : ''}`}
            onClick={() => setPestaña('tickets')}
          >
            Vales de Aula ({canjes.length})
          </button>
        </div>

        {/* ============================================================== */}
        {/* PESTAÑA 1: CATÁLOGO DE PRODUCTOS TEMPORALES                    */}
        {/* ============================================================== */}
        {pestaña === 'catalogo' && (
          <div>
            {/* Filtros por Categoría */}
            <div style={{
              display: 'flex',
              gap: 6,
              overflowX: 'auto',
              paddingBottom: 4,
              marginBottom: 14,
              scrollbarWidth: 'none'
            }}>
              {[
                { id: 'todos', label: 'Todos' },
                { id: 'marcos', label: 'Marcos Avatar' },
                { id: 'titulos', label: 'Títulos VIP' },
                { id: 'aula', label: 'Ventajas Aula' },
                { id: 'efectos', label: 'Efectos Chat' }
              ].map(cat => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setCategoriaCatalogo(cat.id)}
                  style={{
                    padding: '5px 12px',
                    borderRadius: 9999,
                    border: 'none',
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    backgroundColor: categoriaCatalogo === cat.id ? 'var(--color-ink)' : 'var(--color-fill-secondary)',
                    color: categoriaCatalogo === cat.id ? 'var(--color-surface)' : 'var(--color-secondary-ink)',
                    transition: 'all 0.15s ease'
                  }}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            {/* Listado de Productos */}
            <div style={{
              backgroundColor: 'var(--color-surface)',
              borderRadius: 16,
              border: '1px solid var(--color-separator)',
              overflow: 'hidden'
            }}>
              {itemsCatalogoFiltrados.map((item, idx) => {
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
                      borderBottom: idx < itemsCatalogoFiltrados.length - 1 ? '0.5px solid var(--color-separator)' : 'none',
                      opacity: alcanzable ? 1 : 0.65
                    }}
                  >
                    <div style={{
                      width: 40,
                      height: 40,
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
                        <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-ink)' }}>
                          {item.titulo}
                        </span>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
                        <Clock size={12} color="var(--color-accent)" />
                        <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-accent)' }}>
                          Duración: {item.duracionTexto}
                        </span>
                      </div>

                      <p style={{ fontSize: 12, color: 'var(--color-secondary-ink)', marginTop: 2, lineHeight: 1.35 }}>
                        {item.desc}
                      </p>
                    </div>

                    <button
                      type="button"
                      className="btn-primary"
                      disabled={!alcanzable || comprandoId === item.id}
                      onClick={() => comprarProducto(item)}
                      style={{
                        flexShrink: 0,
                        minHeight: 34,
                        padding: '4px 14px',
                        fontSize: 13,
                        fontWeight: 700,
                        backgroundColor: alcanzable ? item.color : 'var(--color-fill-secondary)',
                        color: alcanzable ? '#FFFFFF' : 'var(--color-tertiary-ink)',
                        boxShadow: 'none'
                      }}
                    >
                      {comprandoId === item.id ? 'Comprando...' : `${item.costo} pts`}
                    </button>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* PESTAÑA 2: MI MOCHILA E INVENTARIO CON ACTIVACIÓN POR TIEMPO   */}
        {/* ============================================================== */}
        {pestaña === 'inventario' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {/* 1. ARTÍCULOS EN USO / ACTIVOS */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: 'var(--color-positive)', animation: 'pulse 1.5s infinite' }} />
                <h3 className="apple-headline" style={{ fontSize: 15, color: 'var(--color-ink)' }}>
                  En Uso Actualmente ({articulosActivos.length})
                </h3>
              </div>

              {articulosActivos.length === 0 ? (
                <div style={{
                  padding: '16px',
                  borderRadius: 14,
                  backgroundColor: 'var(--color-surface)',
                  border: '1px solid var(--color-separator)',
                  textAlign: 'center'
                }}>
                  <p className="apple-caption" style={{ color: 'var(--color-secondary-ink)' }}>
                    No tienes ningún producto activo en este momento. ¡Activa uno de tu mochila para disfrutarlo!
                  </p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {articulosActivos.map(item => {
                    const restante = formatearTiempoRestante(item.expiraEn)
                    return (
                      <div
                        key={item.id}
                        style={{
                          padding: '12px 14px',
                          borderRadius: 14,
                          backgroundColor: 'var(--color-surface)',
                          border: '1.5px solid rgba(52, 199, 89, 0.3)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: 12
                        }}
                      >
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-ink)' }}>
                              {item.titulo}
                            </span>
                            <span style={{
                              fontSize: 10,
                              fontWeight: 800,
                              padding: '2px 6px',
                              borderRadius: 4,
                              backgroundColor: 'rgba(52, 199, 89, 0.12)',
                              color: 'var(--color-positive)',
                              textTransform: 'uppercase'
                            }}>
                              En uso
                            </span>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                            <Hourglass size={13} color="var(--color-warning)" />
                            <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--color-warning)' }}>
                              {restante}
                            </span>
                            <span className="apple-caption">
                              · activado {new Date(item.activadoEn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* 2. ARTÍCULOS EN MOCHILA (LISTOS PARA ACTIVAR) */}
            <div>
              <h3 className="apple-headline" style={{ fontSize: 15, marginBottom: 8, color: 'var(--color-ink)' }}>
                Listos para Activar en tu Mochila ({articulosListos.length})
              </h3>

              {articulosListos.length === 0 ? (
                <div style={{
                  padding: '20px 16px',
                  borderRadius: 14,
                  backgroundColor: 'var(--color-surface)',
                  border: '1px solid var(--color-separator)',
                  textAlign: 'center'
                }}>
                  <Package size={24} color="var(--color-tertiary-ink)" style={{ margin: '0 auto 6px' }} />
                  <p className="apple-caption" style={{ color: 'var(--color-secondary-ink)' }}>
                    Tu mochila está vacía. Compra objetos temporales en el catálogo para tenerlos guardados.
                  </p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {articulosListos.map(item => (
                    <div
                      key={item.id}
                      style={{
                        padding: '12px 14px',
                        borderRadius: 14,
                        backgroundColor: 'var(--color-surface)',
                        border: '1px solid var(--color-separator)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 12
                      }}
                    >
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-ink)' }}>
                          {item.titulo}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
                          <Clock size={12} color="var(--color-secondary-ink)" />
                          <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-secondary-ink)' }}>
                            Te durará: {item.duracionTexto}
                          </span>
                        </div>
                        <p style={{ fontSize: 12, color: 'var(--color-secondary-ink)', marginTop: 2 }}>
                          {item.desc}
                        </p>
                      </div>

                      <button
                        type="button"
                        className="btn-primary"
                        onClick={() => {
                          if (item.catalogoId === 'sello_tinta_chat') {
                            setMostrarSelectorSello(true)
                          } else if (item.catalogoId === 'megafono_chat') {
                            setMostrarModalMegafono(true)
                          } else {
                            activarProducto(item)
                          }
                        }}
                        style={{
                          flexShrink: 0,
                          minHeight: 34,
                          padding: '4px 14px',
                          fontSize: 13,
                          fontWeight: 700,
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6
                        }}
                      >
                        <Play size={13} fill="currentColor" />
                        <span>Activar</span>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 3. HISTORIAL DE CONSUMIDOS / EXPIRADOS */}
            {articulosExpirados.length > 0 && (
              <div>
                <h3 className="apple-headline" style={{ fontSize: 14, marginBottom: 8, color: 'var(--color-secondary-ink)' }}>
                  Historial de Expirados ({articulosExpirados.length})
                </h3>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, opacity: 0.7 }}>
                  {articulosExpirados.slice(0, 5).map(item => (
                    <div
                      key={item.id}
                      style={{
                        padding: '10px 12px',
                        borderRadius: 10,
                        backgroundColor: 'var(--color-surface-secondary)',
                        border: '1px solid var(--color-separator)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        fontSize: 12
                      }}
                    >
                      <span style={{ fontWeight: 600, color: 'var(--color-secondary-ink)' }}>
                        {item.titulo}
                      </span>
                      <span className="apple-badge apple-badge-neutral" style={{ fontSize: 10 }}>
                        Tiempo consumido
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ============================================================== */}
        {/* PESTAÑA 3: VALES Y TICKETS DE AULA                             */}
        {/* ============================================================== */}
        {pestaña === 'tickets' && (
          <div>
            {canjes.length === 0 ? (
              <div className="card" style={{ textAlign: 'center', padding: 32 }}>
                <Ticket size={28} color="var(--color-secondary-ink)" style={{ margin: '0 auto 8px' }} />
                <p className="apple-subheadline" style={{ fontSize: 14 }}>
                  No tienes vales o tickets pendientes.
                </p>
                <p className="apple-caption" style={{ marginTop: 2 }}>
                  Al canjear ventajas físicas (cafetería, sitio con colega), tu pase oficial aparecerá aquí.
                </p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {canjes.map((c) => {
                  const tiempoRestante = formatearTiempoRestante(c.expiraEn)
                  const yaCaducado = c.expiraEn && Date.now() >= c.expiraEn

                  return (
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

                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, margin: '4px 0 8px' }}>
                        <Hourglass size={13} color={yaCaducado ? 'var(--color-tertiary-ink)' : 'var(--color-warning)'} />
                        <span style={{
                          fontSize: 12,
                          fontWeight: 700,
                          color: yaCaducado ? 'var(--color-tertiary-ink)' : 'var(--color-warning)'
                        }}>
                          {tiempoRestante || c.tiempoTexto || 'Sin límite'}
                        </span>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
                        <span className="apple-caption">
                          Coste: <strong>{c.costo} pts</strong>
                        </span>

                        <span className={`sello-tinta ${yaCaducado ? 'sello-tinta-rojo' : c.estado === 'entregado' ? 'sello-tinta-verde' : 'sello-tinta-azul'}`} style={{ fontSize: 10, padding: '2px 8px' }}>
                          {yaCaducado ? 'TIEMPO AGOTADO' : c.estado === 'entregado' ? 'VALIDADO / ENTREGADO' : 'PENDIENTE CON EL PROFE'}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* Modal de Sello de Tinta */}
        {mostrarSelectorSello && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            zIndex: 2500,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20
          }}>
            <div className="card" style={{ maxWidth: 400, width: '100%', padding: '20px' }}>
              <h4 style={{ fontSize: 15, fontWeight: 700, margin: '0 0 4px', color: 'var(--color-ink)' }}>
                Elige el Sello Físico para el Chat:
              </h4>
              <p className="apple-caption" style={{ marginBottom: 14 }}>
                Se estampa inmediatamente en el chat con tu nombre.
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
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
                    <div className={`sello-tinta ${s.clase}`} style={{ fontSize: 12, marginBottom: 4 }}>
                      {s.etiqueta}
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--color-secondary-ink)' }}>
                      {s.desc}
                    </div>
                  </button>
                ))}
              </div>

              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  type="button"
                  className="btn-primary"
                  onClick={() => {
                    const item = inventario.find(i => i.catalogoId === 'sello_tinta_chat' && i.estado === 'listo')
                    if (item) activarProducto(item)
                  }}
                  style={{ flex: 1, minHeight: 38, fontSize: 13 }}
                >
                  Estampar Sello Ahora
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
          </div>
        )}

        {/* Modal de Aviso para el Megáfono */}
        {mostrarModalMegafono && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            zIndex: 2500,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20
          }}>
            <div className="card" style={{ maxWidth: 420, width: '100%', padding: '20px' }}>
              <h4 style={{ fontSize: 15, fontWeight: 700, margin: '0 0 4px', color: 'var(--color-ink)' }}>
                Escribe tu comunicado para el tablón:
              </h4>
              <p className="apple-caption" style={{ marginBottom: 12 }}>
                Quedará fijado en la cabecera de toda la clase durante 30 minutos desde la activación.
              </p>

              <textarea
                className="apple-input"
                value={textoMegafono}
                onChange={(e) => setTextoMegafono(e.target.value)}
                placeholder="Ej: ¿Alguien tiene los comandos de packet tracer para el ejercicio de hoy?"
                maxLength={120}
                rows={2}
                style={{ width: '100%', marginBottom: 12, fontSize: 14, padding: '10px 12px' }}
              />

              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  type="button"
                  className="btn-primary"
                  disabled={!textoMegafono.trim()}
                  onClick={() => {
                    const item = inventario.find(i => i.catalogoId === 'megafono_chat' && i.estado === 'listo')
                    if (item) activarProducto(item, textoMegafono.trim())
                  }}
                  style={{ flex: 1, minHeight: 38, fontSize: 13 }}
                >
                  Fijar Comunicado Ahora
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
          </div>
        )}
      </div>
    </div>
  )
}
