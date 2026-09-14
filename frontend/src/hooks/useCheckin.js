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

    // Soporte para modo demo local
    if (userId === 'demo-user-1234') {
      const demoCheck = localStorage.getItem('racha_demo_checkin_' + hoyStr)
      if (demoCheck) {
        setHoy(JSON.parse(demoCheck))
      } else {
        setHoy(null)
      }
      setCargando(false)
      return
    }

    try {
      const { data, error: err } = await supabase
        .from('checkins')
        .select('*')
        .eq('user_id', userId)
        .eq('fecha', hoyStr)
        .maybeSingle()

      setHoy(data)
      setError(err || null)
    } catch (e) {
      setError(e)
    } finally {
      setCargando(false)
    }
  }

  const hacerCheckin = async (esTarde) => {
    setError(null)
    const hoyStr = new Date().toISOString().split('T')[0]
    const puntos = esTarde ? 5 : 10
    const horaActual = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

    if (userId === 'demo-user-1234') {
      const mockRecord = {
        id: 'demo-chk-' + Date.now(),
        user_id: userId,
        fecha: hoyStr,
        hora: horaActual,
        es_tarde: esTarde,
        puntos_ganados: puntos
      }
      localStorage.setItem('racha_demo_checkin_' + hoyStr, JSON.stringify(mockRecord))
      setHoy(mockRecord)
      return { data: mockRecord, error: null }
    }

    try {
      const { data, error: err } = await supabase
        .from('checkins')
        .insert({
          user_id: userId,
          fecha: hoyStr,
          hora: horaActual,
          es_tarde: esTarde,
          puntos_ganados: puntos
        })
        .select()
        .single()

      if (err) {
        setError(err.message)
        return { data: null, error: err }
      }
      await chequear()
      return { data, error: null }
    } catch (e) {
      setError(e.message)
      return { data: null, error: e }
    }
  }

  return { hoy, cargando, hacerCheckin, chequear, error }
}
