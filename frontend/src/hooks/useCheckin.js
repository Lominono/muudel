import { useState, useEffect } from 'react'
import { supabase } from '../utils/supabase'

export function useCheckin(userId) {
  const [hoy, setHoy] = useState(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!userId) return
    chequear()
  }, [userId])

  const chequear = async () => {
    setCargando(true)
    const hoyStr = new Date().toISOString().split('T')[0]
    const { data, error: err } = await supabase
      .from('checkins')
      .select('*')
      .eq('user_id', userId)
      .eq('fecha', hoyStr)
      .single()
    setHoy(data)
    setError(err || null)
    setCargando(false)
  }

  const hacerCheckin = async (esTarde) => {
    setError(null)
    const hoyStr = new Date().toISOString().split('T')[0]
    const puntos = esTarde ? 5 : 10
    const { data, error: err } = await supabase
      .from('checkins')
      .insert({ user_id: userId, fecha: hoyStr, hora: new Date().toLocaleTimeString(), es_tarde: esTarde, puntos_ganados: puntos })
      .select()
      .single()
    if (err) {
      setError(err.message)
      return { data: null, error: err }
    }
    await chequear()
    return { data, error: null }
  }

  return { hoy, cargando, hacerCheckin, chequear, error }
}
