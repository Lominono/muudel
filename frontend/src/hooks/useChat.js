import { useState, useEffect, useRef } from 'react'
import { supabase } from '../utils/supabase'

export function useChat(canal) {
  const [mensajes, setMensajes] = useState([])
  const [cargando, setCargando] = useState(false)
  const suscripcion = useRef(null)

  useEffect(() => {
    if (!canal) return
    cargar()
    suscribirse()
    return () => { if (suscripcion.current) suscripcion.current.unsubscribe() }
  }, [canal])

  const cargar = async () => {
    setCargando(true)
    const { data } = await supabase
      .from('messages')
      .select('*')
      .eq('canal', canal)
      .order('created_at', { ascending: true })
      .limit(100)
    setMensajes(data || [])
    setCargando(false)
  }

  const suscribirse = () => {
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
  }

  const enviar = async (texto, userId, replyTo = null) => {
    const { data, error } = await supabase
      .from('messages')
      .insert({ user_id: userId, canal, texto, reply_to: replyTo })
      .select()
      .single()
    return { data, error }
  }

  const like = async (messageId, userId) => {
    const { error } = await supabase
      .from('message_likes')
      .insert({ message_id: messageId, user_id: userId })
    if (!error) {
      await supabase.from('messages').update({ likes_count: supabase.rpc('increment_likes', { msg_id: messageId }) }).eq('id', messageId)
    }
  }

  return { mensajes, cargando, enviar, like }
}
