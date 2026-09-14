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
        .select('*, profiles(nombre, avatar_emoji)')
        .eq('canal', canal)
        .order('created_at', { ascending: true })
        .limit(100)

      if (err) throw err

      if (data && data.length > 0) {
        setMensajes(data)
      } else {
        // Mensajes de bienvenida o demostración
        setMensajes([
          {
            id: 'demo-msg-1',
            canal,
            user_id: 'profesor-1',
            texto: `¡Bienvenidos al canal #${canal}! Recuerden registrar su asistencia todos los días.`,
            nombre: 'Profesor Carlos',
            avatar_emoji: '👨‍🏫',
            likes_count: 3,
            created_at: new Date(Date.now() - 3600000).toISOString()
          },
          {
            id: 'demo-msg-2',
            canal,
            user_id: 'estudiante-2',
            texto: '¡Hoy llegué a tiempo! Racha al día 🔥',
            nombre: 'Sofía R.',
            avatar_emoji: '👩‍🎓',
            likes_count: 2,
            created_at: new Date(Date.now() - 1800000).toISOString()
          }
        ])
      }
    } catch (e) {
      setMensajes([
        {
          id: 'demo-msg-1',
          canal,
          user_id: 'profesor-1',
          texto: `¡Bienvenidos al canal #${canal}!`,
          nombre: 'Profesor Carlos',
          avatar_emoji: '👨‍🏫',
          likes_count: 1,
          created_at: new Date().toISOString()
        }
      ])
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

    // Si es demo o falla Supabase
    if (userId === 'demo-user-1234') {
      const nuevoMensaje = {
        id: 'msg-' + Date.now(),
        canal,
        user_id: userId,
        texto: texto.trim(),
        nombre: perfil?.nombre || 'Tú',
        avatar_emoji: perfil?.avatar_emoji || '🧑‍🎓',
        likes_count: 0,
        created_at: new Date().toISOString()
      }
      setMensajes(prev => [...prev, nuevoMensaje])
      return { data: nuevoMensaje, error: null }
    }

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

      if (err) {
        // Fallback local
        const nuevoMensaje = {
          id: 'msg-' + Date.now(),
          canal,
          user_id: userId,
          texto: texto.trim(),
          nombre: perfil?.nombre || 'Tú',
          avatar_emoji: perfil?.avatar_emoji || '🧑‍🎓',
          likes_count: 0,
          created_at: new Date().toISOString()
        }
        setMensajes(prev => [...prev, nuevoMensaje])
        return { data: nuevoMensaje, error: null }
      }

      return { data, error: null }
    } catch (e) {
      return { data: null, error: e }
    }
  }

  const like = async (messageId, userId) => {
    setMensajes(prev => prev.map(m => {
      if (m.id === messageId) {
        return { ...m, likes_count: (m.likes_count || 0) + 1 }
      }
      return m
    }))
    return true
  }

  return { mensajes, cargando, enviar, like, error }
}
