import { useState, useEffect } from 'react'
import { useAuth } from '../App'
import { CheckinCard } from '../components/CheckinCard'
import { RachaBar } from '../components/RachaBar'
import { TopRanking } from '../components/TopRanking'
import { supabase, NIVELES } from '../utils/supabase'
import { Zap, Award } from 'lucide-react'

export function PantallaHoy() {
  const { perfil } = useAuth()
  const [ranking, setRanking] = useState([])

  useEffect(() => {
    const cargar = async () => {
      try {
        const { data } = await supabase
          .from('profiles')
          .select('*')
          .order('puntos_total', { ascending: false })
          .limit(5)

        if (data && data.length > 0) {
          setRanking(data)
        } else {
          // Fallback en demo o base vacía
          setRanking([
            { id: '1', nombre: 'Sofía R.', avatar_emoji: '👩‍🎓', puntos_total: 320 },
            { id: '2', nombre: 'Martín G.', avatar_emoji: '🧑‍💻', puntos_total: 280 },
            { id: '3', nombre: 'Lucas P.', avatar_emoji: '🧑‍🔬', puntos_total: 240 },
          ])
        }
      } catch (e) {
        setRanking([
          { id: '1', nombre: 'Sofía R.', avatar_emoji: '👩‍🎓', puntos_total: 320 },
          { id: '2', nombre: 'Martín G.', avatar_emoji: '🧑‍💻', puntos_total: 280 },
          { id: '3', nombre: 'Lucas P.', avatar_emoji: '🧑‍🔬', puntos_total: 240 },
        ])
      }
    }
    cargar()
  }, [])

  if (!perfil) return null

  const nivelActual = NIVELES.filter(n => (perfil.puntos_total || 0) >= n.min).pop() || NIVELES[0]
  const fechaHoy = new Date().toLocaleDateString('es-ES', {
    weekday: 'long',
    day: 'numeric',
    month: 'long'
  })

  return (
    <main style={{ maxWidth: 520, margin: '0 auto', padding: '20px 16px 40px' }}>
      {/* Apple Navigation Header */}
      <header style={{ marginBottom: 20 }}>
        <p className="apple-caption" style={{ textTransform: 'capitalize', fontWeight: 600, letterSpacing: 0.2 }}>
          {fechaHoy}
        </p>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 2 }}>
          <h1 className="apple-large-title">
            Hoy
          </h1>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            backgroundColor: 'var(--color-fill-tertiary)',
            padding: '5px 12px',
            borderRadius: 9999,
          }}>
            <span style={{ fontSize: 18 }}>{perfil.avatar_emoji || '🧑‍🎓'}</span>
            <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-ink)' }}>{perfil.nombre}</span>
          </div>
        </div>
      </header>

      {/* Checkin del día */}
      <CheckinCard userId={perfil.id} />

      {/* Barra de racha */}
      <RachaBar racha={perfil.racha_actual || 0} mejorRacha={perfil.mejor_racha || 0} />

      {/* Top 3 Líderes */}
      <TopRanking lista={ranking} />

      {/* Resumen del estudiante */}
      <section className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <h3 className="apple-headline" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            Tu progreso
            <Award size={17} color="var(--color-accent)" />
          </h3>
          <span className="apple-badge apple-badge-accent">
            {nivelActual.nombre}
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div style={{
            backgroundColor: 'var(--color-surface-secondary)',
            padding: '12px 14px',
            borderRadius: 12,
            border: '1px solid var(--color-separator)'
          }}>
            <span className="apple-caption">Puntos totales</span>
            <div className="tabular-nums" style={{ fontSize: 22, fontWeight: 700, color: 'var(--color-accent)', marginTop: 2 }}>
              {perfil.puntos_total || 0}
            </div>
          </div>

          <div style={{
            backgroundColor: 'var(--color-surface-secondary)',
            padding: '12px 14px',
            borderRadius: 12,
            border: '1px solid var(--color-separator)'
          }}>
            <span className="apple-caption">Mejor racha</span>
            <div className="tabular-nums" style={{ fontSize: 22, fontWeight: 700, color: 'var(--color-positive)', marginTop: 2 }}>
              {perfil.mejor_racha || 0} <span style={{ fontSize: 13, fontWeight: 500 }}>días</span>
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}
