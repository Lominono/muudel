import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../App'
import { CheckinCard } from '../components/CheckinCard'
import { RachaBar } from '../components/RachaBar'
import { RetoDelDia } from '../components/RetoDelDia'
import { TopRanking } from '../components/TopRanking'
import { PanelPaseLista } from '../components/PanelPaseLista'
import { AvatarUsuario } from '../components/AvatarUsuario'
import { supabase, NIVELES } from '../utils/supabase'
import { Award, TrendingUp, Megaphone, ClipboardList, LayoutDashboard } from 'lucide-react'
import { animarEscalonado } from '../utils/animations'

export function PantallaHoy() {
  const { perfil, setPerfil } = useAuth()
  const [ranking, setRanking] = useState([])
  const [vistaAdmin, setVistaAdmin] = useState(false)
  const [avisoHoy, setAvisoHoy] = useState(() => localStorage.getItem('racha_aviso_hoy') || '')
  const contentRef = useRef(null)

  useEffect(() => {
    // Cargar aviso diario
    const avisoGuardado = localStorage.getItem('racha_aviso_hoy') || ''
    setAvisoHoy(avisoGuardado)

    const cargar = async () => {
      try {
        const { data } = await supabase
          .from('profiles')
          .select('*')
          .eq('rol', 'alumno')
          .order('puntos_total', { ascending: false })
          .limit(5)

        if (data && data.length > 0) {
          setRanking(data)
        } else {
          // Si no hay datos en Supabase, usar lista vacía real o propio perfil si es alumno
          if (perfil && perfil.rol === 'alumno') {
            setRanking([perfil])
          } else {
            setRanking([])
          }
        }
      } catch (e) {
        if (perfil && perfil.rol === 'alumno') {
          setRanking([perfil])
        } else {
          setRanking([])
        }
      }
    }
    cargar()
  }, [perfil])

  useEffect(() => {
    if (contentRef.current) {
      animarEscalonado(contentRef.current.children, { stagger: 0.05, duration: 0.35 })
    }
  }, [vistaAdmin])

  const sumarPuntosReto = (puntosGanados) => {
    if (!perfil) return
    const nuevosPuntos = (perfil.puntos_total || 0) + puntosGanados
    const updated = { ...perfil, puntos_total: nuevosPuntos }
    setPerfil(updated)
    localStorage.setItem('racha_local_user', JSON.stringify(updated))
  }

  if (!perfil) return null

  const esModerador = perfil.rol === 'moderador'
  const nivelActual = NIVELES.filter(n => (perfil.puntos_total || 0) >= n.min).pop() || NIVELES[0]
  const fechaHoy = new Date().toLocaleDateString('es-ES', {
    weekday: 'long',
    day: 'numeric',
    month: 'long'
  })

  return (
    <main style={{ maxWidth: 520, margin: '0 auto', padding: '20px 16px 40px' }}>
      {/* Cabecera */}
      <header style={{ marginBottom: 18 }}>
        <p className="apple-caption" style={{ textTransform: 'capitalize', fontWeight: 600, letterSpacing: 0.2 }}>
          {fechaHoy}
        </p>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 2 }}>
          <h1 className="apple-large-title">
            {esModerador && vistaAdmin ? 'Pase de Lista' : 'Hoy'}
          </h1>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <AvatarUsuario
              nombre={perfil.nombre}
              color={perfil.color_acento}
              rol={perfil.rol}
              size={34}
              showRoleBadge={true}
            />
            <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-ink)' }}>
              {perfil.nombre}
            </span>
          </div>
        </div>

        {/* Toggle para el profesor entre Pase de Lista y Vista General */}
        {esModerador && (
          <div className="segmented-control" style={{ marginTop: 14 }}>
            <button
              className={`segmented-control-item ${vistaAdmin ? 'active' : ''}`}
              onClick={() => setVistaAdmin(true)}
              style={{ gap: 6 }}
            >
              <ClipboardList size={15} />
              <span>Control de Asistencia</span>
            </button>
            <button
              className={`segmented-control-item ${!vistaAdmin ? 'active' : ''}`}
              onClick={() => setVistaAdmin(false)}
              style={{ gap: 6 }}
            >
              <LayoutDashboard size={15} />
              <span>Vista de Clase</span>
            </button>
          </div>
        )}
      </header>

      {/* Si el profesor activó la vista de Pase de Lista */}
      {esModerador && vistaAdmin ? (
        <PanelPaseLista />
      ) : (
        <div ref={contentRef}>
          {/* Tablón de avisos del profesor para los alumnos */}
          {avisoHoy && (
            <div className="card" style={{
              backgroundColor: 'rgba(255, 149, 0, 0.08)',
              border: '1px solid rgba(255, 149, 0, 0.3)',
              padding: '14px 16px',
              display: 'flex',
              gap: 12,
              alignItems: 'flex-start',
              marginBottom: 16
            }}>
              <Megaphone size={20} color="var(--color-warning)" style={{ flexShrink: 0, marginTop: 2 }} />
              <div>
                <span className="apple-caption" style={{ fontWeight: 700, color: 'var(--color-warning)', letterSpacing: 0.5, textTransform: 'uppercase' }}>
                  Aviso del profesor
                </span>
                <p style={{ fontSize: 14, color: 'var(--color-ink)', marginTop: 2, fontWeight: 500 }}>
                  {avisoHoy}
                </p>
              </div>
            </div>
          )}

          {/* Tarjeta de Asistencia subordinada al profesor */}
          <CheckinCard
            userId={perfil.id}
            rol={perfil.rol}
            onAbrirPanelAdmin={() => setVistaAdmin(true)}
          />

          {/* Barra de racha */}
          <RachaBar racha={perfil.racha_actual || 0} mejorRacha={perfil.mejor_racha || 0} />

          {/* Reto diario */}
          <RetoDelDia perfil={perfil} onCompletado={sumarPuntosReto} />

          {/* Podio real */}
          {ranking.length > 0 && <TopRanking lista={ranking} />}

          {/* Marcador personal */}
          <section className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <h3 className="apple-headline" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                Tu marcador
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
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <TrendingUp size={14} color="var(--color-accent)" />
                  <span className="apple-caption">Puntos totales</span>
                </div>
                <div className="tabular-nums" style={{ fontSize: 22, fontWeight: 700, color: 'var(--color-accent)', marginTop: 2 }}>
                  {perfil.puntos_total || 0} <span style={{ fontSize: 13, fontWeight: 500 }}>pts</span>
                </div>
              </div>

              <div style={{
                backgroundColor: 'var(--color-surface-secondary)',
                padding: '12px 14px',
                borderRadius: 12,
                border: '1px solid var(--color-separator)'
              }}>
                <span className="apple-caption">Récord personal</span>
                <div className="tabular-nums" style={{ fontSize: 22, fontWeight: 700, color: 'var(--color-positive)', marginTop: 2 }}>
                  {perfil.mejor_racha || 0} <span style={{ fontSize: 13, fontWeight: 500 }}>días</span>
                </div>
              </div>
            </div>
          </section>
        </div>
      )}
    </main>
  )
}
