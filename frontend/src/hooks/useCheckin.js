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

    // Comprobar si hay registro en almacenamiento local del pase de lista
    const localCheckins = localStorage.getItem('racha_checkins_' + hoyStr)
    if (localCheckins) {
      try {
        const parsed = JSON.parse(localCheckins)
        if (parsed[userId]) {
          setHoy(parsed[userId])
          setCargando(false)
          return
        }
      } catch (e) {}
    }

    try {
      const { data, error: err } = await supabase
        .from('checkins')
        .select('*')
        .eq('user_id', userId)
        .eq('fecha', hoyStr)
        .maybeSingle()

      if (data) {
        setHoy(data)
      } else {
        setHoy(null)
      }
      setError(err || null)
    } catch (e) {
      setError(e)
    } finally {
      setCargando(false)
    }
  }

  const hacerCheckin = async (esTarde = false) => {
    setError(null)
    const hoyStr = new Date().toISOString().split('T')[0]
    const puntos = esTarde ? 5 : 10
    const horaActual = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

    const nuevoRecord = {
      user_id: userId,
      fecha: hoyStr,
      hora: horaActual,
      es_tarde: esTarde,
      puntos_ganados: puntos
    }

    // Guardar en almacenamiento local de checkins del día
    try {
      const localCheckins = localStorage.getItem('racha_checkins_' + hoyStr)
      const mapa = localCheckins ? JSON.parse(localCheckins) : {}
      mapa[userId] = nuevoRecord
      localStorage.setItem('racha_checkins_' + hoyStr, JSON.stringify(mapa))
    } catch (e) {}

    setHoy(nuevoRecord)

    // Sincronizar en Supabase
    try {
      const { data, error: err } = await supabase
        .from('checkins')
        .upsert(nuevoRecord, { onConflict: 'user_id, fecha' })
        .select()
        .single()

      if (err) {
        setError(err.message)
        return { data: nuevoRecord, error: null }
      }
      return { data, error: null }
    } catch (e) {
      return { data: nuevoRecord, error: null }
    }
  }

  return { hoy, cargando, hacerCheckin, chequear, error }
}
