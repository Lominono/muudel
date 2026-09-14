import { useAuth } from '../App'
import { CheckinCard } from '../components/CheckinCard'
import { RachaBar } from '../components/RachaBar'
import { TopRanking } from '../components/TopRanking'
import { supabase } from '../utils/supabase'
import { useState, useEffect } from 'react'

export function PantallaHoy() {
  const { perfil } = useAuth()
  const [ranking, setRanking] = useState([])

  useEffect(() => {
    const cargar = async () => {
      const { data } = await supabase.from('profiles').select('*').order('puntos_total', { ascending: false }).limit(10)
      setRanking(data || [])
    }
    cargar()
  }, [])

  if (!perfil) return null

  return (
    <div style={{ maxWidth: 500, margin: '0 auto', padding: 24, paddingBottom: 80 }}>
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <h1 style={{ fontSize: 28, fontWeight: 800 }}>Hoy, {perfil.nombre}</h1>
        <p style={{ color: '#6B6B70', fontSize: 15 }}>
          Racha: {perfil.racha_actual} | Puntos: {perfil.puntos_total}
        </p>
      </div>

      <CheckinCard userId={perfil.id} />
      <RachaBar racha={perfil.racha_actual} mejorRacha={perfil.mejor_racha} />
      <TopRanking lista={ranking} />

      <div className="card">
        <h3 style={{ fontSize: 17, fontWeight: 700, marginBottom: 8 }}>📊 Tus stats</h3>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 15 }}>
          <div><span style={{ color: '#98989D' }}>Asistencias este mes: </span><strong>12</strong></div>
          <div><span style={{ color: '#98989D' }}>Nivel: </span><strong>Constante</strong></div>
        </div>
      </div>
    </div>
  )
}
