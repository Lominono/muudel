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
  destinatarioRef.current = destinatarioActivo

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
        // Agrupar por el otro usuario
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
    if (!perfil?.id || !destinatarioActivo?.id) {
      setMensajes([])
      return
    }
    setCargando(true)
    try {
      const { data, error } = await supabase
        .from('direct_messages')
        .select('*')
        .or(
          `and(sender_id.eq.${perfil.id},receiver_id.eq.${destinatarioActivo.id}),and(sender_id.eq.${destinatarioActivo.id},receiver_id.eq.${perfil.id})`
        )
        .order('created_at', { ascending: true })

      if (!error && data) {
        setMensajes(data)
        // Marcar como leídos los mensajes del otro usuario
        marcarComoLeidos(destinatarioActivo.id)
      }
    } catch (e) {
      console.warn('Error cargando mensajes de DM:', e)
    } finally {
      setCargando(false)
    }
  }, [perfil?.id, destinatarioActivo?.id])

  // Marcar como leídos los mensajes recibidos
  const marcarComoLeidos = async (otroId) => {
    if (!perfil?.id || !otroId) return
    try {
      await supabase
        .from('direct_messages')
        .update({ leido: true })
        .eq('sender_id', otroId)
        .eq('receiver_id', perfil.id)
        .eq('leido', false)

      // Actualizar contador local
      setConversaciones(prev => prev.map(c => c.otroId === otroId ? { ...c, noLeidos: 0 } : c))
      setTotalNoLeidos(prev => Math.max(0, prev - 1))
      transmitirEvento('dm_leido', { readerId: perfil.id, senderId: otroId })
    } catch (e) {}
  }

  // Enviar mensaje privado
  const enviarMensaje = async (texto, replyTo = null, sello = null) => {
    if (!texto.trim() || !perfil?.id || !destinatarioActivo?.id) return null

    const textoLimpio = texto.trim()
    const analisisAntiIa = analizarTextoAntiIA(textoLimpio)

    const payload = {
      sender_id: perfil.id,
      receiver_id: destinatarioActivo.id,
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
    sound.playSend()

    try {
      const { data, error } = await supabase
        .from('direct_messages')
        .insert(payload)
        .select()
        .single()

      if (!error && data) {
        setMensajes(prev => prev.map(m => m.id === tempId ? data : m))
        transmitirEvento('nuevo_mensaje_dm', data)

        // Otorgar XP de autoría técnica si el mensaje es genuino y extenso
        if (textoLimpio.length >= 40 && analisisAntiIa.esGenuino) {
          sumarXpSkill(perfil.id, 'autoria_tecnica', 5)
        }

        // Actualizar lista de conversaciones
        cargarConversaciones()
        return data
      }
    } catch (e) {
      console.warn('Error enviando mensaje privado:', e)
    }
    return null
  }

  // Reacción con emoji en DM
  const toggleReaccion = async (messageId, emoji) => {
    if (!perfil?.id || !messageId) return

    setMensajes(prev => prev.map(m => {
      if (m.id !== messageId) return m
      const reaccionesPrev = { ...(m.reacciones || {}) }
      const lista = Array.isArray(reaccionesPrev[emoji]) ? [...reaccionesPrev[emoji]] : []
      const idx = lista.indexOf(perfil.id)
      if (idx >= 0) {
        lista.splice(idx, 1)
      } else {
        lista.push(perfil.id)
      }

      if (lista.length === 0) delete reaccionesPrev[emoji]
      else reaccionesPrev[emoji] = lista

      const updated = { ...m, reacciones: reaccionesPrev }
      supabase
        .from('direct_messages')
        .update({ reacciones: reaccionesPrev })
        .eq('id', messageId)
        .then(() => {})

      transmitirEvento('reaccion_dm', { messageId, emoji, userId: perfil.id, reacciones: reaccionesPrev })
      return updated
    }))
  }

  // Typing indicator
  const emitirTyping = (estaEscribiendo) => {
    if (!perfil?.id || !destinatarioActivo?.id) return
    transmitirEvento('typing_dm', {
      senderId: perfil.id,
      receiverId: destinatarioActivo.id,
      nombre: perfil.nombre,
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
      const esParaMi = nuevo.receiver_id === perfil.id
      const esMio = nuevo.sender_id === perfil.id

      if (!esParaMi && !esMio) return

      const destinatario = destinatarioRef.current
      const esConversacionAbierta = destinatario && (
        (nuevo.sender_id === destinatario.id && nuevo.receiver_id === perfil.id) ||
        (nuevo.sender_id === perfil.id && nuevo.receiver_id === destinatario.id)
      )

      if (esConversacionAbierta) {
        setMensajes(prev => {
          if (prev.some(m => m.id === nuevo.id)) return prev
          return [...prev, nuevo]
        })
        if (esParaMi) {
          sound.playPop()
          marcarComoLeidos(destinatario.id)
        }
      } else if (esParaMi) {
        sound.playPop()
        setTotalNoLeidos(prev => prev + 1)
      }

      cargarConversaciones()
    })

    // Suscripción de lectura
    const desuscribirLeido = suscribirEvento('dm_leido', ({ readerId, senderId }) => {
      if (readerId === destinatarioRef.current?.id && senderId === perfil.id) {
        setMensajes(prev => prev.map(m => m.sender_id === perfil.id ? { ...m, leido: true } : m))
      }
    })

    // Suscripción de reacciones
    const desuscribirReaccion = suscribirEvento('reaccion_dm', ({ messageId, reacciones }) => {
      setMensajes(prev => prev.map(m => m.id === messageId ? { ...m, reacciones } : m))
    })

    // Suscripción de typing
    const desuscribirTyping = suscribirEvento('typing_dm', ({ senderId, receiverId, typing }) => {
      if (receiverId === perfil.id && senderId === destinatarioRef.current?.id) {
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
