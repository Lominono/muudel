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
  Palette,
  Eye,
  Crown
} from 'lucide-react'

// CATÁLOGO DE PRODUCTOS 100% VIRTUALES, VISIBLES PARA TODOS Y ACTIVABLES CUANDO QUIERAS
export const CATALOGO_RECOMPENSAS = [
  // 1. TÍTULOS HONORÍFICOS (VISIBLES EN CHAT Y RANKINGS)
  {
    id: 'titulo_root',
    categoria: 'titulos',
    titulo: 'Título: 👑 Linux Root Master',
    desc: 'Luce el título de superusuario oficial debajo de tu nombre en cada mensaje del chat y podio.',
    costo: 320,
    icon: Crown,
    stockMax: 3, // Stock limitado: solo 3 alumnos pueden tenerlo
    duracionMs: 4 * 3600 * 1000,
    duracionTexto: '4 horas desde activación',
    tituloTexto: '👑 Linux Root Master',
    color: '#007AFF'
  },
  {
    id: 'titulo_mvp',
    categoria: 'titulos',
    titulo: 'Título: 🏆 MVP del Aula 15:30',
    desc: 'Insignia de honor exclusiva reservada para los más veloces y participativos.',
    costo: 380,
    icon: Award,
    stockMax: 2, // Stock limitado: solo 2 en el aula
    duracionMs: 4 * 3600 * 1000,
    duracionTexto: '4 horas desde activación',
    tituloTexto: '🏆 MVP Aula 15:30',
    color: '#D4AF37'
  },
  {
    id: 'titulo_vlan',
    categoria: 'titulos',
    titulo: 'Título: ⚡ Maestro de VLANs',
    desc: 'Título honorífico para los que configuran switches y routers sin mirar la chuleta.',
    costo: 220,
    icon: Zap,
    duracionMs: 4 * 3600 * 1000,
    duracionTexto: '4 horas desde activación',
    tituloTexto: '⚡ Maestro de VLANs',
    color: '#FF9500'
  },
  {
    id: 'titulo_yoshi',
    categoria: 'titulos',
    titulo: 'Título: 🐉 Domador de Yoshi',
    desc: 'Título especial para los expertos del recreo que dominan los saltos y bombas en el juego.',
    costo: 190,
    icon: Flame,
    duracionMs: 4 * 3600 * 1000,
    duracionTexto: '4 horas desde activación',
    tituloTexto: '🐉 Domador de Yoshi',
    color: '#34C759'
  },
  {
    id: 'titulo_centinela',
    categoria: 'titulos',
    titulo: 'Título: 🛡️ Centinela SMR2',
    desc: 'Título de guardián de sistemas para mantener la racha de puntualidad alta.',
    costo: 160,
    icon: Shield,
    duracionMs: 4 * 3600 * 1000,
    duracionTexto: '4 horas desde activación',
    tituloTexto: '🛡️ Centinela SMR2',
    color: '#007AFF'
  },
  {
    id: 'titulo_terminal',
    categoria: 'titulos',
    titulo: 'Título: 🐧 Hacker de Terminal',
    desc: 'Apodo para quienes resuelven todo desde Bash y PowerShell.',
    costo: 130,
    icon: Zap,
    duracionMs: 4 * 3600 * 1000,
    duracionTexto: '4 horas desde activación',
    tituloTexto: '🐧 Hacker de Terminal',
    color: '#8E8E93'
  },

  // 2. AURAS Y MARCOS DE AVATAR (VISIBLES EN CHAT, FEED Y RANKINGS)
  {
    id: 'marco_oro',
    categoria: 'marcos',
    titulo: 'Marco Dorado Imperial',
    desc: 'Doble anillo de oro bruñido y resplandor de prestigio alrededor de tu avatar en toda la web.',
    costo: 350,
    icon: Award,
    stockMax: 2, // Stock limitado: solo 2 en toda la clase
    duracionMs: 3 * 3600 * 1000,
    duracionTexto: '3 horas desde activación',
    marcoKey: 'oro',
    color: '#D4AF37'
  },
  {
    id: 'marco_fuego',
    categoria: 'marcos',
    titulo: 'Marco Flama de Racha',
    desc: 'Anillo ámbar ardiente que proyecta la llama de asistencia en tu foto de perfil.',
    costo: 210,
    icon: Flame,
    duracionMs: 3 * 3600 * 1000,
    duracionTexto: '3 horas desde activación',
    marcoKey: 'fuego',
    color: '#FF9500'
  },
  {
    id: 'marco_cyber',
    categoria: 'marcos',
    titulo: 'Marco Cyberpunk Neón',
    desc: 'Borde cian reactivo de alta tecnología para apasionados de redes y sistemas.',
    costo: 210,
    icon: Zap,
    duracionMs: 3 * 3600 * 1000,
    duracionTexto: '3 horas desde activación',
    marcoKey: 'cyber',
    color: '#00F0FF'
  },
  {
    id: 'marco_tinta',
    categoria: 'marcos',
    titulo: 'Marco Sello Carmín',
    desc: 'Borde de tinta oficial lacrada estilo sello de puntualidad [PRESENTE].',
    costo: 175,
    icon: Stamp,
    duracionMs: 3 * 3600 * 1000,
    duracionTexto: '3 horas desde activación',
    marcoKey: 'tinta',
    color: '#FF3B30'
  },
  {
    id: 'marco_esmeralda',
    categoria: 'marcos',
    titulo: 'Marco Esmeralda Matrix',
    desc: 'Aura verde fosforescente de terminal UNIX y consola de administración.',
    costo: 175,
    icon: Sparkles,
    duracionMs: 3 * 3600 * 1000,
    duracionTexto: '3 horas desde activación',
    marcoKey: 'esmeralda',
    color: '#34C759'
  },
  {
    id: 'marco_obsidiana',
    categoria: 'marcos',
    titulo: 'Marco Obsidiana Stealth',
    desc: 'Acabado minimalista de titanio negro satinado con reflejo pulido.',
    costo: 140,
    icon: Shield,
    duracionMs: 3 * 3600 * 1000,
    duracionTexto: '3 horas desde activación',
    marcoKey: 'obsidiana',
    color: '#8E8E93'
  },

  // 3. EFECTOS DE CHAT EN DIRECTO (SE ACTIVAN DESDE LA MOCHILA Y TODA LA CLASE LOS VE)
  {
    id: 'confeti_chat',
    categoria: 'efectos',
    titulo: 'Lluvia de Confeti en Aula',
    desc: 'Dispara una ráfaga de confeti de celebración en pantalla completa a todos los alumnos conectados.',
    costo: 50,
    icon: Sparkles,
    duracionMs: 5 * 60 * 1000,
    duracionTexto: 'Uso instantáneo (se activa cuando quieras)',
    efecto: 'confeti',
    color: '#FF9500'
  },
  {
    id: 'terremoto_chat',
    categoria: 'efectos',
    titulo: 'Sacudida Sísmica de Aula',
    desc: 'Hace temblar la pantalla del chat de todos los compañeros en vivo durante 3 segundos con aviso sonoro.',
    costo: 65,
    icon: Zap,
    duracionMs: 5 * 60 * 1000,
    duracionTexto: 'Uso instantáneo (se activa cuando quieras)',
    efecto: 'terremoto',
    color: '#FF3B30'
  },
  {
    id: 'megafono_chat',
    categoria: 'efectos',
    titulo: 'Aviso Fijado con Megáfono',
    desc: 'Fija un comunicado de texto en la cabecera del chat visible para toda la clase durante 30 minutos.',
    costo: 95,
    icon: Megaphone,
    duracionMs: 30 * 60 * 1000,
    duracionTexto: 'Fijado durante 30 minutos desde activación',
    efecto: 'megafono',
    color: '#007AFF'
  },
  {
    id: 'sirena_descanso',
    categoria: 'efectos',
    titulo: 'Silbato del Recreo (18:10)',
    desc: 'Suena el aviso acústico oficial recordando que empieza el descanso de la tarde.',
    costo: 50,
    icon: Clock,
    duracionMs: 15 * 60 * 1000,
    duracionTexto: 'Uso instantáneo (se activa cuando quieras)',
    efecto: 'descanso',
    color: '#34C759'
  },

  // 4. TEMAS DE BURBUJA DE CHAT (TUS MENSAJES DESTACAN PARA TODOS)
  {
    id: 'burbuja_carmin',
    categoria: 'burbujas',
    titulo: 'Burbuja Carmín VIP en Chat',
    desc: 'Tus mensajes en el chat aparecen con fondo carmín lacrado oficial para que destaquen sobre los demás.',
    costo: 240,
    icon: Palette,
    stockMax: 3, // Stock limitado: solo 3 plazas
    duracionMs: 3 * 3600 * 1000,
    duracionTexto: '3 horas desde activación',
    burbujaKey: 'carmin',
    color: '#FF3B30'
  },
  {
    id: 'burbuja_matrix',
    categoria: 'burbujas',
    titulo: 'Burbuja Matrix Consola',
    desc: 'Tus mensajes adquieren tono de terminal negra con borde verde fósforo visible por toda la clase.',
    costo: 210,
    icon: Palette,
    duracionMs: 3 * 3600 * 1000,
    duracionTexto: '3 horas desde activación',
    burbujaKey: 'matrix',
    color: '#30D158'
  },

  // 5. PINES Y CONDECORACIONES DE PERFIL
  {
    id: 'pin_oro_smr2',
    categoria: 'insignias',
    titulo: 'Pin de Oro SMR2 Coleccionista',
    desc: 'Condecoración de oro macizo digital. Se muestra con brillo estelar junto a tu nombre y en tu perfil.',
    costo: 500,
    icon: Crown,
    stockMax: 1, // ¡Pieza única en toda la clase!
    duracionMs: 24 * 3600 * 1000,
    duracionTexto: '24 horas de exclusividad',
    pinKey: 'pin_oro',
    color: '#D4AF37'
  },
  {
    id: 'pin_hacker',
    categoria: 'insignias',
    titulo: 'Insignia Hacker Ético SMR2',
    desc: 'Pin de certificación de seguridad en redes informáticas visible en tu ficha de alumno.',
    costo: 180,
    icon: Shield,
    duracionMs: 12 * 3600 * 1000,
    duracionTexto: '12 horas desde activación',
    pinKey: 'pin_hacker',
    color: '#007AFF'
  },
  {
    id: 'pin_arcade_master',
    categoria: 'insignias',
    titulo: 'Medalla Estrella Yoshi Runner',
    desc: 'Medalla deportiva escolar por reflejos y proezas en el Recreo Arcade.',
    costo: 160,
    icon: Award,
    duracionMs: 12 * 3600 * 1000,
    duracionTexto: '12 horas desde activación',
    pinKey: 'pin_arcade',
    color: '#34C759'
  },

  // 6. MEJORAS DE JUEGOS Y APUESTAS (RULETA)
  {
    id: 'ruleta_max_50',
    categoria: 'juegos',
    titulo: 'Licencia Casino Nivel 1',
    desc: 'Aumenta permanentemente tu límite de apuesta en la Ruleta a 50 pts por mesa.',
    costo: 300,
    icon: Ticket,
    duracionMs: 0,
    duracionTexto: 'Mejora Permanente',
    efecto: 'ruleta_limit_50',
    color: '#FF9500'
  },
  {
    id: 'ruleta_max_100',
    categoria: 'juegos',
    titulo: 'Licencia Casino Nivel 2',
    desc: 'Aumenta permanentemente tu límite de apuesta en la Ruleta a 100 pts por mesa.',
    costo: 800,
    icon: Ticket,
    duracionMs: 0,
    duracionTexto: 'Mejora Permanente',
    efecto: 'ruleta_limit_100',
    color: '#FF3B30'
  },
  {
    id: 'ruleta_max_500',
    categoria: 'juegos',
    titulo: 'Licencia Casino VIP (High Roller)',
    desc: 'Aumenta permanentemente tu límite de apuesta en la Ruleta a 500 pts por mesa.',
    costo: 2500,
    icon: Crown,
    stockMax: 2, // Solo 2 licencias VIP en la clase
    duracionMs: 0,
    duracionTexto: 'Mejora Permanente',
    efecto: 'ruleta_limit_500',
    color: '#D4AF37'
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

  // Sistema de Stock Limitado
  const [stockMap, setStockMap] = useState(() => {
    try {
      const s = localStorage.getItem('muudel_tienda_stock')
      return s ? JSON.parse(s) : {}
    } catch (e) {
      return {}
    }
  })

  // Escuchar actualización de stock en tiempo real
  useEffect(() => {
    const desuscribirStock = suscribirEvento('actualizar_stock_tienda', ({ itemId, nuevoStock }) => {
      setStockMap(prev => ({ ...prev, [itemId]: nuevoStock }))
    })
    return () => desuscribirStock()
  }, [])

  const obtenerStockRestante = (item) => {
    if (!item.stockMax) return null
    if (typeof stockMap[item.id] === 'number') {
      return stockMap[item.id]
    }
    return item.stockMax
  }

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

  const cargarInventario = async () => {
    // 1. Cargar desde Supabase tabla inventario_usuario
    if (perfil?.id) {
      try {
        const { data: dbInv } = await supabase
          .from('inventario_usuario')
          .select('*')
          .eq('user_id', perfil.id)

        if (dbInv && dbInv.length > 0) {
          const formateado = dbInv.map(i => ({
            id: i.id,
            catalogoId: i.item_id,
            titulo: i.titulo,
            categoria: i.categoria,
            estado: i.estado,
            duracionMs: Number(i.duracion_ms) || 0,
            duracionTexto: i.duracion_texto || '',
            compradoEn: new Date(i.comprado_en).getTime(),
            activadoEn: i.activado_en ? new Date(i.activado_en).getTime() : null,
            expiraEn: i.expira_en ? new Date(i.expira_en).getTime() : null
          }))
          setInventario(formateado)
          return
        }
      } catch (e) {}
    }

    // 2. Fallback local
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

  const cargarCanjes = async () => {
    // 1. Cargar pedidos desde Supabase tabla canjes_pedidos
    if (perfil?.id) {
      try {
        const { data: dbCanjes } = await supabase
          .from('canjes_pedidos')
          .select('*')
          .eq('user_id', perfil.id)
          .order('created_at', { ascending: false })

        if (dbCanjes && dbCanjes.length > 0) {
          setCanjes(dbCanjes.map(c => ({
            id: c.id,
            recompensaId: c.item_id,
            titulo: c.titulo,
            costo: c.costo,
            estado: c.estado,
            fecha: new Date(c.created_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }),
            hora: new Date(c.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          })))
          return
        }
      } catch (e) {}
    }

    // 2. Fallback local
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
    const stockRestante = obtenerStockRestante(item)
    if (item.stockMax && stockRestante !== null && stockRestante <= 0) {
      sound.playPop()
      avisar(`¡Este producto está agotado! Se han vendido todas las unidades de la clase.`, 'error')
      return
    }

    if (puntosActuales < item.costo) {
      sound.playPop()
      avisar(`Te faltan ${item.costo - puntosActuales} puntos para comprar este artículo.`, 'error')
      return
    }

    setComprandoId(item.id)
    const nuevosPuntos = puntosActuales - item.costo

    // Descontar stock si es limitado
    if (item.stockMax) {
      const nuevoStock = Math.max(0, (stockRestante ?? item.stockMax) - 1)
      const stockActualizado = { ...stockMap, [item.id]: nuevoStock }
      setStockMap(stockActualizado)
      try {
        localStorage.setItem('muudel_tienda_stock', JSON.stringify(stockActualizado))
      } catch (e) {}
      transmitirEvento('actualizar_stock_tienda', { itemId: item.id, nuevoStock })
    }

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
      pinKey: item.pinKey || null,
      burbujaKey: item.burbujaKey || null,
      efecto: item.efecto || null,
      color: item.color,
      estado: 'listo', // 'listo' | 'activo' | 'expirado'
      compradoEn: Date.now(),
      activadoEn: null,
      expiraEn: null,
    }

    const nuevoInventario = [nuevoItemInventario, ...inventario]
    guardarInventario(nuevoInventario)

    // Guardar en Supabase tabla inventario_usuario
    try {
      await supabase.from('inventario_usuario').insert({
        user_id: perfil.id,
        item_id: item.id,
        titulo: item.titulo,
        categoria: item.categoria,
        estado: 'listo',
        duracion_ms: item.duracionMs || 0,
        duracion_texto: item.duracionTexto || ''
      })
    } catch (e) {}

    // Si es una petición de aula (cafetería, altavoz, sitio), generar ticket y guardar en canjes_pedidos
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
        await supabase.from('canjes_pedidos').insert({
          user_id: perfil.id,
          item_id: item.id,
          titulo: item.titulo,
          costo: item.costo,
          categoria: item.categoria,
          estado: 'pendiente'
        })
      } catch (e) {}

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
    const expiraEn = invItem.duracionMs > 0 ? ahora + invItem.duracionMs : null

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
    if (invItem.pinKey) {
      perfilActualizado.insignia_activa = invItem.pinKey
    }
    if (invItem.burbujaKey) {
      perfilActualizado.burbuja_chat = invItem.burbujaKey
    }

    setPerfil(perfilActualizado)
    localStorage.setItem('racha_local_user', JSON.stringify(perfilActualizado))
    try {
      localStorage.setItem('muudel_user_meta_' + perfil.id, JSON.stringify(perfilActualizado))
      await supabase
        .from('profiles')
        .update({
          marco_avatar: perfilActualizado.marco_avatar,
          frase: perfilActualizado.frase,
        })
        .eq('id', perfil.id)
    } catch (e) {}

    // Transmitir cambio de perfil en tiempo real para que todos en el chat y rankings vean su nuevo título, marco o pin
    transmitirEvento('perfil_actualizado', {
      userId: perfil.id,
      perfil: perfilActualizado
    })

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

  const articulosActivos = inventario.filter(i => i.estado === 'activo' && (!i.expiraEn || i.expiraEn > Date.now()))
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
            Catálogo Virtual
          </button>
          <button
            type="button"
            className={`segmented-control-item ${pestaña === 'inventario' ? 'active' : ''}`}
            onClick={() => setPestaña('inventario')}
          >
            Mi Mochila ({articulosListos.length} listos · {articulosActivos.length} activos)
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
                { id: 'titulos', label: 'Títulos VIP' },
                { id: 'marcos', label: 'Auras & Marcos' },
                { id: 'efectos', label: 'Efectos en Vivo' },
                { id: 'burbujas', label: 'Burbujas Chat' },
                { id: 'insignias', label: 'Pines de Perfil' }
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
                const stockRestante = obtenerStockRestante(item)
                const estaAgotado = item.stockMax && stockRestante !== null && stockRestante <= 0
                const alcanzable = puntosActuales >= item.costo && !estaAgotado

                return (
                  <div
                    key={item.id}
                    style={{
                      padding: '14px 16px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      borderBottom: idx < itemsCatalogoFiltrados.length - 1 ? '0.5px solid var(--color-separator)' : 'none',
                      opacity: estaAgotado ? 0.5 : (alcanzable ? 1 : 0.65)
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
                        {item.stockMax && (
                          stockRestante > 0 ? (
                            <span className="apple-badge apple-badge-warning" style={{ fontSize: 10, fontWeight: 800 }}>
                              🔥 Solo {stockRestante} en el aula
                            </span>
                          ) : (
                            <span className="apple-badge apple-badge-negative" style={{ fontSize: 10, fontWeight: 800 }}>
                              🚫 AGOTADO
                            </span>
                          )
                        )}
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
                      disabled={!alcanzable || comprandoId === item.id || estaAgotado}
                      onClick={() => comprarProducto(item)}
                      style={{
                        flexShrink: 0,
                        minHeight: 34,
                        padding: '4px 14px',
                        fontSize: 13,
                        fontWeight: 700,
                        backgroundColor: estaAgotado ? 'var(--color-fill-secondary)' : (alcanzable ? item.color : 'var(--color-fill-secondary)'),
                        color: estaAgotado ? 'var(--color-tertiary-ink)' : (alcanzable ? '#FFFFFF' : 'var(--color-tertiary-ink)'),
                        boxShadow: 'none',
                        cursor: estaAgotado ? 'not-allowed' : 'pointer'
                      }}
                    >
                      {estaAgotado ? 'Agotado' : (comprandoId === item.id ? 'Comprando...' : `${item.costo} pts`)}
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
