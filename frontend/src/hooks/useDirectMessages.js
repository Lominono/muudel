// frontend/src/hooks/useDirectMessages.js
import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '../utils/supabase'
import { transmitirEvento, suscribirEvento } from '../utils/realtimeHub'
import { sound } from '../utils/haptics'
import { analizarTextoAntiIA } from '../utils/antiAiDetector'
import { sumarXpSkill } from '../utils/skillsData'

export function useDirectMessages(perfil, destinatarioActivo = null) {
  const [mensajes, setMensajes] = useState([])
  const [conversaciones, setConversaciones] = useState([])
  const [contactosClase, setContactosClase] = useState([])
  const [cargando, setCargando] = useState(false)
  const [cargandoConversaciones, setCargandoConversaciones] = useState(false)
  const [escribiendoDestinatario, setEscribiendoDestinatario] = useState(false)
  const [totalNoLeidos, setTotalNoLeidos] = useState(0)

  const typingTimeoutRef = useRef(null)
  const destinatarioRef = useRef(destinatarioActivo)
  const perfilRef = useRef(perfil)

  // Mantener refs siempre actualizados
  useEffect(() => {
    destinatarioRef.current = destinatarioActivo
  }, [destinatarioActivo])

  useEffect(() => {
    perfilRef.current = perfil
  }, [perfil])

  // Cargar lista de compañeros de clase
  const cargarContactos = useCallback(async () => {
    if (!perfil?.id) return
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, nombre, username, rol, color_acento, avatar_emoji, digito_id, racha_actual')
        .neq('id', perfil.id)
        .order('nombre', { ascending: true })

      if (!error && data) {
        setContactosClase(data)
      }
    } catch (e) {
      console.warn('Error cargando contactos:', e)
    }
  }, [perfil?.id])

  // Cargar lista de conversaciones (último mensaje y no leídos)
  const cargarConversaciones = useCallback(async () => {
    if (!perfil?.id) return
    setCargandoConversaciones(true)
    try {
      const { data: dms, error } = await supabase
        .from('direct_messages')
        .select('*')
        .or(`sender_id.eq.${perfil.id},receiver_id.eq.${perfil.id}`)
        .order('created_at', { ascending: false })

      if (!error && dms) {
        const convMap = {}
        let noLeidosCount = 0

        dms.forEach(m => {
          const otroId = m.sender_id === perfil.id ? m.receiver_id : m.sender_id
          const esNoLeido = m.receiver_id === perfil.id && !m.leido
          if (esNoLeido) noLeidosCount++

          if (!convMap[otroId]) {
            convMap[otroId] = {
              otroId,
              ultimoMensaje: m.texto,
              fecha: m.created_at,
              noLeidos: esNoLeido ? 1 : 0,
              sello: m.sello
            }
          } else if (esNoLeido) {
            convMap[otroId].noLeidos += 1
          }
        })

        setTotalNoLeidos(noLeidosCount)
        setConversaciones(Object.values(convMap))
      }
    } catch (e) {
      console.warn('Error cargando conversaciones:', e)
    } finally {
      setCargandoConversaciones(false)
    }
  }, [perfil?.id])

  // Cargar mensajes de la conversación activa
  const cargarMensajes = useCallback(async () => {
    const userId = perfilRef.current?.id
    const destId = destinatarioRef.current?.id
    if (!userId || !destId) {
      setMensajes([])
      return
    }
    setCargando(true)
    try {
      const { data, error } = await supabase
        .from('direct_messages')
        .select('*')
        .or(
          `and(sender_id.eq.${userId},receiver_id.eq.${destId}),and(sender_id.eq.${destId},receiver_id.eq.${userId})`
        )
        .order('created_at', { ascending: true })
        .limit(200)

      if (!error && data) {
        setMensajes(data)
        marcarComoLeidos(destId)
      }
    } catch (e) {
      console.warn('Error cargando mensajes de DM:', e)
    } finally {
      setCargando(false)
    }
  }, [perfil?.id, destinatarioActivo?.id])

  // Marcar como leídos los mensajes recibidos
  const marcarComoLeidos = async (otroId) => {
    const userId = perfilRef.current?.id
    if (!userId || !otroId) return
    try {
      await supabase
        .from('direct_messages')
        .update({ leido: true })
        .eq('sender_id', otroId)
        .eq('receiver_id', userId)
        .eq('leido', false)

      setConversaciones(prev => prev.map(c => c.otroId === otroId ? { ...c, noLeidos: 0 } : c))
      setTotalNoLeidos(prev => {
        const conv = conversaciones.find(c => c.otroId === otroId)
        return Math.max(0, prev - (conv?.noLeidos || 0))
      })
      transmitirEvento('dm_leido', { readerId: userId, senderId: otroId })
    } catch (e) {}
  }

  // Enviar mensaje privado — acepta destinatario directo o de refs
  const enviarMensaje = async (texto, destinatarioOverride = null, replyTo = null, sello = null) => {
    const miPerfil = perfilRef.current
    const destActual = destinatarioOverride || destinatarioRef.current || destinatarioActivo
    if (!texto.trim() || !miPerfil?.id || !destActual?.id) {
      console.warn('DM: falta texto, perfil o destinatario', { texto: !!texto.trim(), perfil: !!miPerfil?.id, dest: !!destActual?.id })
      return null
    }

    const textoLimpio = texto.trim()
    const analisisAntiIa = analizarTextoAntiIA(textoLimpio)

    const payload = {
      sender_id: miPerfil.id,
      receiver_id: destActual.id,
      texto: textoLimpio,
      reply_to: replyTo?.id || null,
      sello: sello || null,
      leido: false,
      reacciones: {},
      created_at: new Date().toISOString()
    }

    // Actualización optimista de UI
    const tempId = 'temp_' + Date.now()
    const optimista = { ...payload, id: tempId }
    setMensajes(prev => [...prev, optimista])

    try { sound.playSend() } catch (e) {}

    try {
      let { data, error } = await supabase
        .from('direct_messages')
        .insert(payload)
        .select()
        .single()

      if (error) {
        console.warn('Fallo insert inicial DM, reintentando con payload básico:', error.message)
        const payloadMinimo = {
          sender_id: miPerfil.id,
          receiver_id: destActual.id,
          texto: textoLimpio
        }
        const resFallback = await supabase
          .from('direct_messages')
          .insert(payloadMinimo)
          .select()
          .single()

        if (!resFallback.error && resFallback.data) {
          data = resFallback.data
          error = null
        }
      }

      if (data) {
        // Reemplazar mensaje temporal con el confirmado por la BD
        setMensajes(prev => prev.map(m => (m.id === tempId || (m.sender_id === data.sender_id && m.texto === data.texto && m.id.startsWith('temp_'))) ? data : m))
        transmitirEvento('nuevo_mensaje_dm', data)

        // Otorgar XP de autoría técnica si el mensaje es genuino y extenso
        if (textoLimpio.length >= 40 && analisisAntiIa.esGenuino) {
          sumarXpSkill(miPerfil.id, 'autoria_tecnica', 5)
        }

        cargarConversaciones()
        return data
      }
    } catch (e) {
      console.warn('Error enviando mensaje privado:', e)
    }
    return optimista
  }

  // Reacción con emoji en DM
  const toggleReaccion = async (messageId, emoji) => {
    const userId = perfilRef.current?.id
    if (!userId || !messageId) return

    setMensajes(prev => prev.map(m => {
      if (m.id !== messageId) return m
      const reaccionesPrev = { ...(m.reacciones || {}) }
      const lista = Array.isArray(reaccionesPrev[emoji]) ? [...reaccionesPrev[emoji]] : []
      const idx = lista.indexOf(userId)
      if (idx >= 0) {
        lista.splice(idx, 1)
      } else {
        lista.push(userId)
      }

      if (lista.length === 0) delete reaccionesPrev[emoji]
      else reaccionesPrev[emoji] = lista

      const updated = { ...m, reacciones: reaccionesPrev }
      supabase
        .from('direct_messages')
        .update({ reacciones: reaccionesPrev })
        .eq('id', messageId)
        .then(() => {})

      transmitirEvento('reaccion_dm', { messageId, emoji, userId, reacciones: reaccionesPrev })
      return updated
    }))
  }

  // Typing indicator
  const emitirTyping = (estaEscribiendo) => {
    const userId = perfilRef.current?.id
    const destId = destinatarioRef.current?.id
    if (!userId || !destId) return
    transmitirEvento('typing_dm', {
      senderId: userId,
      receiverId: destId,
      nombre: perfilRef.current?.nombre,
      typing: estaEscribiendo
    })
  }

  // Suscripción Realtime y eventos
  useEffect(() => {
    cargarContactos()
    cargarConversaciones()
  }, [cargarContactos, cargarConversaciones])

  useEffect(() => {
    cargarMensajes()
  }, [cargarMensajes])

  useEffect(() => {
    if (!perfil?.id) return

    // Suscripción por Realtime Broadcast
    const desuscribirDm = suscribirEvento('nuevo_mensaje_dm', (nuevo) => {
      if (!nuevo) return
      const userId = perfilRef.current?.id
      const esParaMi = nuevo.receiver_id === userId
      const esMio = nuevo.sender_id === userId

      if (!esParaMi && !esMio) return

      const destinatario = destinatarioRef.current
      const esConversacionAbierta = destinatario && (
        (nuevo.sender_id === destinatario.id && nuevo.receiver_id === userId) ||
        (nuevo.sender_id === userId && nuevo.receiver_id === destinatario.id)
      )

      if (esConversacionAbierta) {
        setMensajes(prev => {
          if (prev.some(m => m.id === nuevo.id)) return prev
          // Si coincide con un mensaje optimista propio pendiente, reemplazarlo
          const tempIdx = prev.findIndex(m => m.id.startsWith('temp_') && m.sender_id === nuevo.sender_id && m.texto === nuevo.texto)
          if (tempIdx !== -1) {
            const copia = [...prev]
            copia[tempIdx] = nuevo
            return copia
          }
          return [...prev, nuevo]
        })
        if (esParaMi) {
          try { sound.playPop() } catch (e) {}
          marcarComoLeidos(destinatario.id)
        }
      } else if (esParaMi) {
        try { sound.playPop() } catch (e) {}
        setTotalNoLeidos(prev => prev + 1)
      }

      cargarConversaciones()
    })

    // Suscripción de lectura
    const desuscribirLeido = suscribirEvento('dm_leido', ({ readerId, senderId }) => {
      if (readerId === destinatarioRef.current?.id && senderId === perfilRef.current?.id) {
        setMensajes(prev => prev.map(m => m.sender_id === perfilRef.current?.id ? { ...m, leido: true } : m))
      }
    })

    // Suscripción de reacciones
    const desuscribirReaccion = suscribirEvento('reaccion_dm', ({ messageId, reacciones }) => {
      setMensajes(prev => prev.map(m => m.id === messageId ? { ...m, reacciones } : m))
    })

    // Suscripción de typing
    const desuscribirTyping = suscribirEvento('typing_dm', ({ senderId, receiverId, typing }) => {
      if (receiverId === perfilRef.current?.id && senderId === destinatarioRef.current?.id) {
        setEscribiendoDestinatario(Boolean(typing))
        if (typing) {
          if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)
          typingTimeoutRef.current = setTimeout(() => {
            setEscribiendoDestinatario(false)
          }, 3500)
        }
      }
    })

    // Suscripción directa de Supabase postgres_changes
    const canalSupabase = supabase
      .channel(`direct_messages_${perfil.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'direct_messages', filter: `receiver_id=eq.${perfil.id}` },
        (payload) => {
          if (payload.new) {
            const nuevo = payload.new
            const destinatario = destinatarioRef.current
            if (destinatario && nuevo.sender_id === destinatario.id) {
              setMensajes(prev => prev.some(m => m.id === nuevo.id) ? prev : [...prev, nuevo])
              marcarComoLeidos(destinatario.id)
            } else {
              setTotalNoLeidos(prev => prev + 1)
            }
            cargarConversaciones()
          }
        }
      )
      .subscribe()

    return () => {
      desuscribirDm()
      desuscribirLeido()
      desuscribirReaccion()
      desuscribirTyping()
      supabase.removeChannel(canalSupabase)
    }
  }, [perfil?.id, cargarConversaciones])

  return {
    mensajes,
    conversaciones,
    contactosClase,
    cargando,
    cargandoConversaciones,
    totalNoLeidos,
    escribiendoDestinatario,
    enviarMensaje,
    toggleReaccion,
    emitirTyping,
    recargarConversaciones: cargarConversaciones,
    recargarMensajes: cargarMensajes
  }
}
