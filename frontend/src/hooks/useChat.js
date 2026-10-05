import { useState, useEffect, useRef } from 'react'
import { supabase } from '../utils/supabase'
import { transmitirEvento, suscribirEvento } from '../utils/realtimeHub'
import { analizarTextoAntiIA } from '../utils/antiAiDetector'
import { sumarXpSkill } from '../utils/skillsData'

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
  const [mensajes, setMensajes] = useState(() => {
    try {
      const cached = localStorage.getItem('racha_chat_' + canal)
      return cached ? JSON.parse(cached) : []
    } catch (e) {
      return []
    }
  })
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState(null)
  const [usuariosEscribiendo, setUsuariosEscribiendo] = useState({})
  const suscripcion = useRef(null)
  const typingTimeouts = useRef({})

  useEffect(() => {
    if (!canal) return
    try {
      const cached = localStorage.getItem('racha_chat_' + canal)
      if (cached) setMensajes(JSON.parse(cached))
    } catch (e) {}
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

    // 8. Escuchar solución marcada en canal dudas
    const desuscribirSolucion = suscribirEvento('solucion_marcada', ({ messageId, canal: canalMsg, esSolucion }) => {
      if (canalMsg === canal) {
        setMensajes(prev => prev.map(m => m.id === messageId ? { ...m, es_solucion: esSolucion } : m))
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
      desuscribirSolucion()
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

    // 3. Cargar mensajes: intentar primero API del servidor
    try {
      let mensajesCargados = null
      try {
        const resp = await fetch(`/api/chat/mensajes?canal=${canal}&limit=100`)
        const json = await resp.json()
        if (json?.success && Array.isArray(json?.mensajes) && json.mensajes.length > 0) {
          mensajesCargados = json.mensajes.map(m => {
            const listaLikers = likersMap[m.id] || []
            const countReal = Math.max(m.likes_count || 0, listaLikers.length)
            return {
              ...m,
              likes_count: countReal,
              liked_by_me: misLikesSet.has(m.id),
              likers: listaLikers
            }
          })
        }
      } catch (_) {}

      if (mensajesCargados && mensajesCargados.length > 0) {
        setMensajes(mensajesCargados)
        try { localStorage.setItem('racha_chat_' + canal, JSON.stringify(mensajesCargados.slice(-100))) } catch (e) {}
        setCargando(false)
        return
      }

      // Fallback a Supabase directo con clave foránea explícita
      let res = await supabase
        .from('messages')
        .select(`
          *,
          profiles:profiles!messages_user_id_fkey(id, nombre, username, color_acento, rol, digito_id, frase)
        `)
        .eq('canal', canal)
        .eq('soft_deleted', false)
        .order('created_at', { ascending: true })
        .limit(100)

      if (res.error) {
        // Fallback si la columna soft_deleted o relación falla
        res = await supabase
          .from('messages')
          .select('*')
          .eq('canal', canal)
          .order('created_at', { ascending: true })
          .limit(100)
      }

      const data = res.data
      const err = res.error
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
        .channel(`chat-realtime-${canal}`)
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `canal=eq.${canal}`,
        }, async (payload) => {
          if (payload.new) {
            const raw = payload.new
            setMensajes(prev => {
              const coincide = prev.find(m => m.id === raw.id || (m.texto === raw.texto && m.user_id === raw.user_id && Math.abs(new Date(m.created_at) - new Date(raw.created_at)) < 3000))
              if (coincide) {
                return prev.map(m => m.id === coincide.id ? { ...m, ...raw, nombre: m.nombre || raw.nombre } : m)
              }
              return [...prev, raw]
            })

            // Si el mensaje nuevo no tiene nombre de autor, consultarlo en segundo plano
            if (!raw.nombre && raw.user_id) {
              try {
                const { data: p } = await supabase
                  .from('profiles')
                  .select('nombre, username, color_acento, rol, digito_id, frase')
                  .eq('id', raw.user_id)
                  .maybeSingle()
                if (p) {
                  setMensajes(prev => prev.map(m => m.id === raw.id ? {
                    ...m,
                    nombre: p.nombre,
                    username: p.username,
                    color_acento: p.color_acento,
                    rol: p.rol,
                    digito_id: p.digito_id,
                    titulo_vip: p.frase
                  } : m))
                }
              } catch (_) {}
            }
          }
        })
        .on('postgres_changes', {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
          filter: `canal=eq.${canal}`,
        }, (payload) => {
          if (payload.new) {
            setMensajes(prev => prev.map(m => m.id === payload.new.id ? { ...m, ...payload.new } : m))
          }
        })
        .on('postgres_changes', {
          event: 'DELETE',
          schema: 'public',
          table: 'messages',
          filter: `canal=eq.${canal}`,
        }, (payload) => {
          if (payload.old) {
            setMensajes(prev => prev.filter(m => m.id !== payload.old.id))
          }
        })
        .subscribe()
    } catch (e) {}
  }

  const enviar = async (texto, userId, perfil = null, replyData = null) => {
    if (!texto.trim()) return { data: null, error: 'Escribe un mensaje' }

    const validUuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    const validUserId = (userId && validUuidRegex.test(userId))
      ? userId
      : (perfil?.id && validUuidRegex.test(perfil.id))
      ? perfil.id
      : '00000000-0000-4000-a000-000000000001'

    const msgId = generarUUID()
    const analisis = analizarTextoAntiIA(texto.trim())
    const nuevoMensaje = {
      id: msgId,
      canal,
      user_id: validUserId,
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
      es_solucion: false,
      es_autoria_humana: analisis.esHumanoVerificado,
      es_ia_probable: analisis.esIaProbable,
      reply_to: replyData?.id || null,
      reply_to_texto: replyData?.texto || '',
      reply_to_nombre: replyData?.nombre || '',
      created_at: new Date().toISOString()
    }

    // 1. Persistencia local inmediata (UI 0ms)
    setMensajes(prev => {
      const actualizados = [...prev, nuevoMensaje]
      try {
        localStorage.setItem('racha_chat_' + canal, JSON.stringify(actualizados.slice(-100)))
      } catch (e) {}
      return actualizados
    })

    // 2. Transmisión broadcast en tiempo real a compañeros
    transmitirEvento('nuevo_mensaje_chat', nuevoMensaje)

    // Premiar autoría técnica y humana con XP de skills
    if (analisis.esHumanoVerificado && validUserId) {
      if (canal === 'apuntes') {
        sumarXpSkill(validUserId, 'autoria_tecnica', 10)
      } else if (canal === 'dudas') {
        sumarXpSkill(validUserId, 'linux_bash', 5)
      }
    }

    try {
      let confirmado = null

      // 3. Envío al Servidor con Service Role (previene 409 y bypasses RLS)
      try {
        const resp = await fetch('/api/chat/enviar', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            canal,
            texto: texto.trim(),
            userId: validUserId,
            nombre: perfil?.nombre,
            replyData,
            es_autoria_humana: analisis.esHumanoVerificado
          })
        })
        const resJson = await resp.json()
        if (resJson?.success && resJson?.message) {
          confirmado = resJson.message
        }
      } catch (_) {}

      // 4. Fallback directo a Supabase con protección estricta contra 409
      if (!confirmado) {
        // Comprobar que reply_to sea un UUID seguro
        let replyIdSeguro = null
        if (replyData?.id && validUuidRegex.test(replyData.id)) {
          try {
            const { data: ex } = await supabase.from('messages').select('id').eq('id', replyData.id).maybeSingle()
            if (ex) replyIdSeguro = replyData.id
          } catch (_) {}
        }

        const payloadSupabase = {
          user_id: validUserId,
          canal,
          texto: texto.trim(),
          reply_to: replyIdSeguro,
          reply_to_texto: replyData?.texto || '',
          reply_to_nombre: replyData?.nombre || '',
          es_autoria_humana: analisis.esHumanoVerificado
        }

        const { data: dbData, error: dbErr } = await supabase
          .from('messages')
          .insert(payloadSupabase)
          .select()
          .maybeSingle()

        if (!dbErr && dbData) {
          confirmado = dbData
        } else if (dbErr) {
          // Último recurso: insert elemental sin reply_to para nunca fallar con 409
          try {
            const { data: minData } = await supabase
              .from('messages')
              .insert({
                user_id: validUserId,
                canal,
                texto: texto.trim()
              })
              .select()
              .maybeSingle()
            if (minData) confirmado = minData
          } catch (_) {}
        }
      }

      if (confirmado) {
        setMensajes(prev => prev.map(m => m.id === msgId ? {
          ...m,
          ...confirmado,
          id: confirmado.id || msgId,
          nombre: m.nombre || confirmado.nombre,
          username: m.username || confirmado.username,
          color_acento: m.color_acento || confirmado.color_acento,
          rol: m.rol || confirmado.rol
        } : m))
      }

      return { data: confirmado || nuevoMensaje, error: null }
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

  // Marcar o desmarcar un mensaje como solución oficial en canal 'dudas'
  const marcarSolucion = async (messageId, autorId, marcadorId) => {
    let nuevoEstado = false
    setMensajes(prev => {
      const actualizados = prev.map(m => {
        if (m.id === messageId) {
          nuevoEstado = !m.es_solucion
          return { ...m, es_solucion: nuevoEstado }
        }
        return m
      })
      try {
        localStorage.setItem('racha_chat_' + canal, JSON.stringify(actualizados))
      } catch (e) {}
      return actualizados
    })

    transmitirEvento('solucion_marcada', { messageId, canal, esSolucion: nuevoEstado, autorId })

    try {
      await supabase.from('messages').update({
        es_solucion: nuevoEstado,
        solucion_marcada_por: nuevoEstado ? marcadorId : null
      }).eq('id', messageId)

      if (nuevoEstado && autorId) {
        let nuevosPts = 0
        try {
          const headers = { 'Content-Type': 'application/json' }
          try {
            const { data: sData } = await supabase.auth.getSession()
            if (sData?.session?.access_token) headers['Authorization'] = `Bearer ${sData.session.access_token}`
          } catch (_) {}
          if (marcadorId) headers['x-user-id'] = marcadorId

          const sResp = await fetch('/api/ruleta/feed-recompensa', {
            method: 'POST',
            headers,
            body: JSON.stringify({
              userId: autorId,
              puntos: 10,
              motivo: 'Solución destacada en Chat',
              idempotency_key: `chat_solucion_${messageId}_${autorId}`
            })
          })
          const sData = await sResp.json()
          if (sData?.nuevoSaldo !== undefined) {
            nuevosPts = sData.nuevoSaldo
          }
        } catch (_) {}

        if (nuevosPts > 0) {
          transmitirEvento('puntos_actualizados', { userId: autorId, nuevosPuntos: nuevosPts })
          transmitirEvento('steveneuros_actualizados', { userId: autorId, nuevosPuntos: nuevosPts })
          window.dispatchEvent(new CustomEvent('steveneuros_actualizados', { detail: { userId: autorId, nuevosPuntos: nuevosPts } }))
        }
        await sumarXpSkill(autorId, 'redes_vlans', 20)
        await sumarXpSkill(autorId, 'autoria_tecnica', 15)
      }
    } catch (e) {}

    return nuevoEstado
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
    marcarSolucion,
    emitirTyping,
    usuariosEscribiendo,
    error
  }
}

