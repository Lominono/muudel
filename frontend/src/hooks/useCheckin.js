import { useState, useEffect } from 'react'
import { supabase } from '../utils/supabase'

export function useCheckin(userId) {
  const [hoy, setHoy] = useState(null)
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    if (!userId) return
    chequear()
  }, [userId])

  const chequear = async () => {
    setCargando(true)
    const hoyStr = new Date().toISOString().split('T')[0]
    const { data } = await supabase
      .from('checkins')
      .select('*')
      .eq('user_id', userId)
      .eq('fecha', hoyStr)
      .single()
    setHoy(data)
    setCargando(false)
  }

  const hacerCheckin = async (esTarde) => {
    const hoyStr = new Date().toISOString().split('T')[0]
    const puntos = esTarde ? 5 : 10
    const { data, error } = await supabase
      .from('checkins')
      .insert({ user_id: userId, fecha: hoyStr, hora: new Date().toLocaleTimeString(), es_tarde: esTarde, puntos_ganados: puntos })
      .select()
      .single()
    if (!error) {
      await chequear()
    }
    return { data, error }
  }

  return { hoy, cargando, hacerCheckin, chequear }
}
