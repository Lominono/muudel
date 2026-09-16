import { useState, useEffect, useRef } from 'react'
import { supabase } from '../utils/supabase'

export function useChat(canal) {
  const [mensajes, setMensajes] = useState([])
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState(null)
  const suscripcion = useRef(null)

  useEffect(() => {
    if (!canal) return
    cargar()
    suscribirse()
    return () => {
      if (suscripcion.current) {
        try {
          supabase.removeChannel(suscripcion.current)
        } catch (e) {}
      }
    }
  }, [canal])

  const cargar = async () => {
    setCargando(true)
    try {
      const { data, error: err } = await supabase
        .from('messages')
        .select('*, profiles(nombre, color_acento, rol)')
        .eq('canal', canal)
        .order('created_at', { ascending: true })
        .limit(100)

      if (err) throw err

      if (data && data.length > 0) {
        setMensajes(data)
      } else {
        // Cargar mensajes locales guardados del canal si existen
        const local = localStorage.getItem('racha_chat_' + canal)
        if (local) {
          try {
            setMensajes(JSON.parse(local))
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
          setMensajes(JSON.parse(local))
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
          setMensajes(prev => [...prev, payload.new])
        })
        .subscribe()
    } catch (e) {}
  }

  const enviar = async (texto, userId, perfil = null, replyTo = null) => {
    if (!texto.trim()) return { data: null, error: 'Escribe un mensaje' }

    const nuevoMensaje = {
      id: 'msg-' + Date.now(),
      canal,
      user_id: userId,
      texto: texto.trim(),
      nombre: perfil?.nombre || 'Usuario',
      color_acento: perfil?.color_acento,
      rol: perfil?.rol || 'alumno',
      likes_count: 0,
      created_at: new Date().toISOString()
    }

    // Persistir localmente para tener reactividad inmediata
    setMensajes(prev => {
      const actualizados = [...prev, nuevoMensaje]
      localStorage.setItem('racha_chat_' + canal, JSON.stringify(actualizados.slice(-100)))
      return actualizados
    })

    try {
      const { data, error: err } = await supabase
        .from('messages')
        .insert({
          user_id: userId,
          canal,
          texto: texto.trim(),
          reply_to: replyTo
        })
        .select()
        .single()

      return { data: data || nuevoMensaje, error: err || null }
    } catch (e) {
      return { data: nuevoMensaje, error: null }
    }
  }

  const like = async (messageId) => {
    setMensajes(prev => {
      const actualizados = prev.map(m => {
        if (m.id === messageId) {
          return { ...m, likes_count: (m.likes_count || 0) + 1 }
        }
        return m
      })
      localStorage.setItem('racha_chat_' + canal, JSON.stringify(actualizados))
      return actualizados
    })

    try {
      await supabase.rpc('increment_likes', { msg_id: messageId })
    } catch (e) {}
    return true
  }

  return { mensajes, cargando, enviar, like, error }
}
