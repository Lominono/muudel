import { useState, useEffect, useRef } from 'react'
import { supabase } from '../utils/supabase'
import { transmitirEvento, suscribirEvento } from '../utils/realtimeHub'

const generarUUID = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    try { return crypto.randomUUID() } catch (e) {}
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

export function useChat(canal, perfil = null) {
  const [mensajes, setMensajes] = useState([])
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState(null)
  const [usuariosEscribiendo, setUsuariosEscribiendo] = useState({})
  const suscripcion = useRef(null)
  const typingTimeouts = useRef({})

  useEffect(() => {
    if (!canal) return
    cargar()
    suscribirse()

    // 1. Escuchar mensajes entrantes en tiempo real por broadcast
    const desuscribirMsg = suscribirEvento('nuevo_mensaje_chat', (msg) => {
      if (msg && msg.canal === canal) {
        setMensajes(prev => {
          if (prev.some(m => m.id === msg.id || (m.texto === msg.texto && m.user_id === msg.user_id && Math.abs(new Date(m.created_at) - new Date(msg.created_at)) < 2000))) {
            return prev
          }
          const actualizados = [...prev, msg]
          try {
            localStorage.setItem('racha_chat_' + canal, JSON.stringify(actualizados.slice(-100)))
          } catch (e) {}
          return actualizados
        })
      }
    })

    // 2. Escuchar likes y unlikes en tiempo real con recuento exacto
    const desuscribirLikes = suscribirEvento('toggle_like_mensaje_chat', ({ messageId, canal: canalMsg, userId: uid, nombreUsuario, liked, newCount }) => {
      if (canalMsg === canal) {
        setMensajes(prev => {
          const actualizados = prev.map(m => {
            if (m.id !== messageId) return m
            const likersPrev = Array.isArray(m.likers) ? [...m.likers] : []
            let likersActualizados = []
            if (liked) {
              if (!likersPrev.includes(nombreUsuario)) {
                likersActualizados = [...likersPrev, nombreUsuario]
              } else {
                likersActualizados = likersPrev
              }
            } else {
              likersActualizados = likersPrev.filter(n => n !== nombreUsuario)
            }
            return {
              ...m,
              likes_count: typeof newCount === 'number' ? newCount : (liked ? (m.likes_count || 0) + 1 : Math.max(0, (m.likes_count || 0) - 1)),
              liked_by_me: uid === perfil?.id ? liked : m.liked_by_me,
              likers: likersActualizados
            }
          })
          try {
            localStorage.setItem('racha_chat_' + canal, JSON.stringify(actualizados.slice(-100)))
          } catch (e) {}
          return actualizados
        })
      }
    })

    // 3. Escuchar reacciones ricas con emoji en tiempo real
    const desuscribirReacciones = suscribirEvento('reaccion_mensaje_chat', ({ messageId, emoji, userId, canal: canalMsg }) => {
      if (canalMsg === canal) {
        setMensajes(prev => prev.map(m => {
          if (m.id !== messageId) return m
          const reaccionesPrev = { ...(m.reacciones || {}) }
          const listaUsers = Array.isArray(reaccionesPrev[emoji]) ? [...reaccionesPrev[emoji]] : []
          const idx = listaUsers.indexOf(userId)
          if (idx >= 0) {
            listaUsers.splice(idx, 1)
          } else {
            listaUsers.push(userId)
          }
          if (listaUsers.length === 0) {
            delete reaccionesPrev[emoji]
          } else {
            reaccionesPrev[emoji] = listaUsers
          }
          return { ...m, reacciones: reaccionesPrev }
        }))
      }
    })

    // 4. Escuchar fijado de mensaje en tiempo real
    const desuscribirFijado = suscribirEvento('mensaje_fijado', ({ messageId, fijado, canal: canalMsg, fijadoPor }) => {
      if (canalMsg === canal) {
        setMensajes(prev => prev.map(m => {
          if (m.id === messageId) {
            return { ...m, fijado, fijado_por_nombre: fijadoPor }
          }
          return fijado ? { ...m, fijado: false } : m
        }))
      }
    })

    // 5. Escuchar eliminación de mensaje en tiempo real
    const desuscribirEliminado = suscribirEvento('mensaje_eliminado', ({ messageId, canal: canalMsg }) => {
      if (canalMsg === canal) {
        setMensajes(prev => {
          const actualizados = prev.filter(m => m.id !== messageId)
          try {
            localStorage.setItem('racha_chat_' + canal, JSON.stringify(actualizados.slice(-100)))
          } catch (e) {}
          return actualizados
        })
      }
    })

    // 6. Escuchar presencia de escritura (typing indicator)
    const desuscribirTyping = suscribirEvento('typing_usuario', ({ userId, nombre, canal: canalMsg, typing }) => {
      if (canalMsg === canal) {
        if (typing) {
          setUsuariosEscribiendo(prev => ({ ...prev, [userId]: nombre }))
          if (typingTimeouts.current[userId]) {
            clearTimeout(typingTimeouts.current[userId])
          }
          typingTimeouts.current[userId] = setTimeout(() => {
            setUsuariosEscribiendo(prev => {
              const copy = { ...prev }
              delete copy[userId]
              return copy
            })
          }, 3500)
        } else {
          setUsuariosEscribiendo(prev => {
            const copy = { ...prev }
            delete copy[userId]
            return copy
          })
          if (typingTimeouts.current[userId]) {
            clearTimeout(typingTimeouts.current[userId])
          }
        }
      }
    })

    // 7. Escuchar limpieza de canal
    const desuscribirLimpieza = suscribirEvento('limpieza_canal', ({ canal: cLimpio }) => {
      if (cLimpio === canal) {
        setMensajes([])
        try { localStorage.removeItem('racha_chat_' + canal) } catch (e) {}
      }
    })

    return () => {
      desuscribirMsg()
      desuscribirLikes()
      desuscribirReacciones()
      desuscribirFijado()
      desuscribirEliminado()
      desuscribirTyping()
      desuscribirLimpieza()
      Object.values(typingTimeouts.current).forEach(t => clearTimeout(t))
      if (suscripcion.current) {
        try {
          supabase.removeChannel(suscripcion.current)
        } catch (e) {}
      }
    }
  }, [canal, perfil?.id])

  const cargar = async () => {
    setCargando(true)
    const currentUserId = perfil?.id || (() => {
      try {
        const u = localStorage.getItem('racha_local_user')
        return u ? JSON.parse(u).id : null
      } catch (e) { return null }
    })()

    // 1. Obtener set de likes del usuario actual
    const misLikesSet = new Set()
    if (currentUserId) {
      try {
        const localLikes = JSON.parse(localStorage.getItem(`muudel_likes_${currentUserId}`) || '{}')
        Object.keys(localLikes).forEach(id => misLikesSet.add(id))
      } catch (e) {}

      try {
        const { data: dbLikes } = await supabase
          .from('message_likes')
          .select('message_id')
          .eq('user_id', currentUserId)
        if (dbLikes && Array.isArray(dbLikes)) {
          dbLikes.forEach(l => misLikesSet.add(l.message_id))
          const cacheObj = {}
          misLikesSet.forEach(id => { cacheObj[id] = true })
          localStorage.setItem(`muudel_likes_${currentUserId}`, JSON.stringify(cacheObj))
        }
      } catch (e) {}
    }

    // 2. Obtener nombres de likers de la clase
    const likersMap = {}
    try {
      const { data: allLikes } = await supabase
        .from('message_likes')
        .select('message_id, profiles(nombre, username)')
      if (allLikes && Array.isArray(allLikes)) {
        allLikes.forEach(l => {
          const nom = l.profiles?.username ? `@${l.profiles.username}` : (l.profiles?.nombre?.split(' ')[0] || 'Compañero')
          if (!likersMap[l.message_id]) likersMap[l.message_id] = []
          if (!likersMap[l.message_id].includes(nom)) likersMap[l.message_id].push(nom)
        })
      }
    } catch (e) {}

    // 3. Cargar mensajes
    try {
      const { data, error: err } = await supabase
        .from('messages')
        .select('*, profiles(nombre, username, color_acento, rol, digito_id, frase)')
        .eq('canal', canal)
        .eq('soft_deleted', false)
        .order('created_at', { ascending: true })
        .limit(100)

      if (err) throw err

      if (data && data.length > 0) {
        // Enriquecer datos con perfiles y likes verificados
        const enriquecidos = data.map(m => {
          const listaLikers = likersMap[m.id] || []
          const countReal = Math.max(m.likes_count || 0, listaLikers.length)
          const yaLiked = misLikesSet.has(m.id)

          return {
            ...m,
            nombre: m.profiles?.nombre || m.nombre,
            username: m.profiles?.username || m.username,
            color_acento: m.profiles?.color_acento || m.color_acento,
            rol: m.profiles?.rol || m.rol,
            digito_id: m.profiles?.digito_id || m.digito_id,
            titulo_vip: m.profiles?.frase || m.titulo_vip,
            likes_count: countReal,
            liked_by_me: yaLiked,
            likers: listaLikers
          }
        })
        setMensajes(enriquecidos)
        try {
          localStorage.setItem('racha_chat_' + canal, JSON.stringify(enriquecidos.slice(-100)))
        } catch (e) {}
      } else {
        const local = localStorage.getItem('racha_chat_' + canal)
        if (local) {
          try {
            const parsed = JSON.parse(local)
            const sincronizados = parsed.map(m => ({
              ...m,
              liked_by_me: misLikesSet.has(m.id),
              likers: likersMap[m.id] || m.likers || []
            }))
            setMensajes(sincronizados)
          } catch (e) {
            setMensajes([])
          }
        } else {
          setMensajes([])
        }
      }
    } catch (e) {
      const local = localStorage.getItem('racha_chat_' + canal)
      if (local) {
        try {
          const parsed = JSON.parse(local)
          const sincronizados = parsed.map(m => ({
            ...m,
            liked_by_me: misLikesSet.has(m.id),
            likers: likersMap[m.id] || m.likers || []
          }))
          setMensajes(sincronizados)
        } catch (err) {
          setMensajes([])
        }
      } else {
        setMensajes([])
      }
    } finally {
      setCargando(false)
    }
  }

  const suscribirse = () => {
    try {
      suscripcion.current = supabase
        .channel(`chat-${canal}`)
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `canal=eq.${canal}`,
        }, (payload) => {
          setMensajes(prev => {
            if (prev.some(m => m.id === payload.new.id)) return prev
            return [...prev, payload.new]
          })
        })
        .subscribe()
    } catch (e) {}
  }

  const enviar = async (texto, userId, perfil = null, replyData = null) => {
    if (!texto.trim()) return { data: null, error: 'Escribe un mensaje' }

    const msgId = generarUUID()
    const nuevoMensaje = {
      id: msgId,
      canal,
      user_id: userId,
      texto: texto.trim(),
      nombre: perfil?.nombre || 'Usuario',
      username: perfil?.username || null,
      digito_id: perfil?.digito_id || null,
      color_acento: perfil?.color_acento,
      rol: perfil?.rol || 'alumno',
      titulo_vip: perfil?.frase || null,
      likes_count: 0,
      liked_by_me: false,
      likers: [],
      reacciones: {},
      fijado: false,
      reply_to: replyData?.id || null,
      reply_to_texto: replyData?.texto || '',
      reply_to_nombre: replyData?.nombre || '',
      created_at: new Date().toISOString()
    }

    // Persistir localmente para tener reactividad instantánea
    setMensajes(prev => {
      const actualizados = [...prev, nuevoMensaje]
      try {
        localStorage.setItem('racha_chat_' + canal, JSON.stringify(actualizados.slice(-100)))
      } catch (e) {}
      return actualizados
    })

    // Transmitir en tiempo real a toda la clase por broadcast
    transmitirEvento('nuevo_mensaje_chat', nuevoMensaje)

    try {
      const payloadInsert = {
        id: msgId,
        user_id: userId,
        canal,
        texto: texto.trim(),
        reply_to: replyData?.id || null
      }

      // Si la base de datos ya tiene las columnas reply_to_texto/nombre
      if (replyData?.texto) {
        payloadInsert.reply_to_texto = replyData.texto
        payloadInsert.reply_to_nombre = replyData.nombre
      }

      const { data, error: err } = await supabase
        .from('messages')
        .insert(payloadInsert)
        .select()
        .single()

      if (data) {
        setMensajes(prev => prev.map(m => m.id === msgId ? { ...m, ...data } : m))
      }

      return { data: data || nuevoMensaje, error: err || null }
    } catch (e) {
      return { data: nuevoMensaje, error: null }
    }
  }

  // Sistema de Likes Mejorado (Like / Unlike con persistencia de usuario y recuento exacto)
  const toggleLike = async (messageId, userId, nombreUsuario = 'Compañero') => {
    if (!userId) return false

    let estadoLikedFinal = false
    let countFinal = 0

    // Consultar likes locales del usuario
    let misLikes = {}
    try {
      misLikes = JSON.parse(localStorage.getItem(`muudel_likes_${userId}`) || '{}')
    } catch (e) {}

    const yaLeDiLike = Boolean(misLikes[messageId])
    estadoLikedFinal = !yaLeDiLike

    if (estadoLikedFinal) {
      misLikes[messageId] = true
    } else {
      delete misLikes[messageId]
    }

    try {
      localStorage.setItem(`muudel_likes_${userId}`, JSON.stringify(misLikes))
    } catch (e) {}

    setMensajes(prev => {
      const actualizados = prev.map(m => {
        if (m.id === messageId) {
          const actualCount = Math.max(0, (m.likes_count || 0) + (estadoLikedFinal ? 1 : -1))
          countFinal = actualCount
          const likersPrev = Array.isArray(m.likers) ? [...m.likers] : []
          let likersActualizados = []
          if (estadoLikedFinal) {
            if (!likersPrev.includes(nombreUsuario)) {
              likersActualizados = [...likersPrev, nombreUsuario]
            } else {
              likersActualizados = likersPrev
            }
          } else {
            likersActualizados = likersPrev.filter(n => n !== nombreUsuario)
          }

          return {
            ...m,
            likes_count: actualCount,
            liked_by_me: estadoLikedFinal,
            likers: likersActualizados
          }
        }
        return m
      })
      try {
        localStorage.setItem('racha_chat_' + canal, JSON.stringify(actualizados))
      } catch (e) {}
      return actualizados
    })

    // Transmitir like/unlike a toda la clase con información detallada
    transmitirEvento('toggle_like_mensaje_chat', {
      messageId,
      canal,
      userId,
      nombreUsuario,
      liked: estadoLikedFinal,
      newCount: countFinal
    })

    try {
      const { data } = await supabase.rpc('toggle_like_mensaje', {
        p_msg_id: messageId,
        p_user_id: userId
      })
      if (data && typeof data.count === 'number') {
        setMensajes(prev => prev.map(m => m.id === messageId ? { ...m, likes_count: data.count, liked_by_me: data.liked } : m))
      }
    } catch (e) {
      try {
        if (estadoLikedFinal) {
          await supabase.from('message_likes').insert({ message_id: messageId, user_id: userId })
          await supabase.rpc('increment_likes', { msg_id: messageId })
        } else {
          await supabase.from('message_likes').delete().eq('message_id', messageId).eq('user_id', userId)
          await supabase.from('messages').update({ likes_count: countFinal }).eq('id', messageId)
        }
      } catch (err) {}
    }

    return estadoLikedFinal
  }

  // Alternar reacción rica con emoji (❤️, 👍, 💡, 🔥, ❓)
  const toggleReaccion = async (messageId, emoji, userId) => {
    let nuevasReacciones = {}
    setMensajes(prev => {
      const actualizados = prev.map(m => {
        if (m.id !== messageId) return m
        const rCopy = { ...(m.reacciones || {}) }
        const users = Array.isArray(rCopy[emoji]) ? [...rCopy[emoji]] : []
        const idx = users.indexOf(userId)
        if (idx >= 0) {
          users.splice(idx, 1)
        } else {
          users.push(userId)
        }
        if (users.length === 0) {
          delete rCopy[emoji]
        } else {
          rCopy[emoji] = users
        }
        nuevasReacciones = rCopy
        return { ...m, reacciones: rCopy }
      })
      try {
        localStorage.setItem('racha_chat_' + canal, JSON.stringify(actualizados))
      } catch (e) {}
      return actualizados
    })

    transmitirEvento('reaccion_mensaje_chat', { messageId, emoji, userId, canal })

    try {
      await supabase
        .from('messages')
        .update({ reacciones: nuevasReacciones })
        .eq('id', messageId)
    } catch (e) {}
  }

  // Fijar / desfijar un mensaje en el canal
  const toggleFijado = async (messageId, perfilModerador) => {
    let nuevoEstadoFijado = false
    setMensajes(prev => {
      const actualizados = prev.map(m => {
        if (m.id === messageId) {
          nuevoEstadoFijado = !m.fijado
          return {
            ...m,
            fijado: nuevoEstadoFijado,
            fijado_por_nombre: nuevoEstadoFijado ? perfilModerador?.nombre : null
          }
        }
        // Desfijar otros en el mismo canal para tener uno solo fijado
        return nuevoEstadoFijado ? { ...m, fijado: false } : m
      })
      try {
        localStorage.setItem('racha_chat_' + canal, JSON.stringify(actualizados))
      } catch (e) {}
      return actualizados
    })

    transmitirEvento('mensaje_fijado', {
      messageId,
      fijado: nuevoEstadoFijado,
      canal,
      fijadoPor: perfilModerador?.nombre || 'Moderador'
    })

    try {
      await supabase
        .from('messages')
        .update({
          fijado: nuevoEstadoFijado,
          fijado_por: nuevoEstadoFijado ? perfilModerador?.id : null,
          fijado_en: nuevoEstadoFijado ? new Date().toISOString() : null
        })
        .eq('id', messageId)
    } catch (e) {}
  }

  // Eliminar mensaje (por autor dentro de tiempo o por moderador)
  const eliminarMensaje = async (messageId) => {
    setMensajes(prev => {
      const actualizados = prev.filter(m => m.id !== messageId)
      try {
        localStorage.setItem('racha_chat_' + canal, JSON.stringify(actualizados))
      } catch (e) {}
      return actualizados
    })

    transmitirEvento('mensaje_eliminado', { messageId, canal })

    try {
      await supabase
        .from('messages')
        .update({ soft_deleted: true })
        .eq('id', messageId)
    } catch (e) {}
  }

  // Transmitir typing indicator
  const emitirTyping = (perfil, typing = true) => {
    if (!perfil) return
    transmitirEvento('typing_usuario', {
      userId: perfil.id,
      nombre: perfil.username ? `@${perfil.username}` : (perfil.nombre?.split(' ')[0] || 'Compañero'),
      canal,
      typing
    })
  }

  return {
    mensajes,
    cargando,
    enviar,
    toggleLike,
    like: toggleLike,
    toggleReaccion,
    toggleFijado,
    eliminarMensaje,
    emitirTyping,
    usuariosEscribiendo,
    error
  }
}

