import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../App'
import { CheckinCard } from '../components/CheckinCard'
import { RachaBar } from '../components/RachaBar'
import { RetoDelDia } from '../components/RetoDelDia'
import { TopRanking } from '../components/TopRanking'
import { PanelPaseLista } from '../components/PanelPaseLista'
import { AvatarUsuario } from '../components/AvatarUsuario'
import { ContadorCierreLista } from '../components/ContadorCierreLista'
import { MetaAsistenciaAula } from '../components/MetaAsistenciaAula'
import { PreguntaFlashDia } from '../components/PreguntaFlashDia'
import { TiendaRecompensas } from '../components/TiendaRecompensas'
import { supabase, NIVELES } from '../utils/supabase'
import { sound, triggerConfetti } from '../utils/haptics'
import {
  Award,
  TrendingUp,
  Megaphone,
  ClipboardList,
  LayoutDashboard,
  ShoppingBag,
  Flame,
  Zap
} from 'lucide-react'
import { animarEscalonado } from '../utils/animations'

export function PantallaHoy() {
  const { perfil, setPerfil } = useAuth()
  const navigate = useNavigate()
  const [ranking, setRanking] = useState([])
  const [vistaAdmin, setVistaAdmin] = useState(false)
  const [mostrarTienda, setMostrarTienda] = useState(false)
  const [avisoHoy, setAvisoHoy] = useState(() => localStorage.getItem('racha_aviso_hoy') || '')

  // Estado de asistencia 15:30
  const [solicitudPendiente, setSolicitudPendiente] = useState(null)
  const [asistenciaConfirmada, setAsistenciaConfirmada] = useState(null)
  const [totalAlumnosClase, setTotalAlumnosClase] = useState(20)
  const [asistenciasHoyCount, setAsistenciasHoyCount] = useState(0)

  const contentRef = useRef(null)
  const fechaHoy = new Date().toISOString().split('T')[0]

  useEffect(() => {
    // 1. Cargar aviso diario
    const avisoGuardado = localStorage.getItem('racha_aviso_hoy') || ''
    setAvisoHoy(avisoGuardado)

    // 2. Comprobar solicitud pendiente del alumno hoy
    try {
      const solicitudes = JSON.parse(localStorage.getItem('muudel_solicitudes_' + fechaHoy) || '[]')
      const miSol = solicitudes.find(s => s.userId === perfil?.id)
      if (miSol) setSolicitudPendiente(miSol)
    } catch (e) {}

    // 3. Comprobar asistencia confirmada del alumno hoy
    try {
      const localCheckins = JSON.parse(localStorage.getItem('racha_checkins_' + fechaHoy) || '{}')
      if (localCheckins[perfil?.id]) {
        setAsistenciaConfirmada(localCheckins[perfil?.id])
      }
    } catch (e) {}

    // 4. Cargar datos de la clase y ranking
    cargarDatosClase()
  }, [perfil, fechaHoy])

  useEffect(() => {
    if (contentRef.current) {
      animarEscalonado(contentRef.current.children, { stagger: 0.05, duration: 0.35 })
    }
  }, [vistaAdmin])

  const cargarDatosClase = async () => {
    try {
      // Conteo de alumnos
      const { data: alumnosData } = await supabase
        .from('profiles')
        .select('*')
        .eq('rol', 'alumno')
        .order('puntos_total', { ascending: false })

      if (alumnosData && alumnosData.length > 0) {
        setTotalAlumnosClase(alumnosData.length)
        setRanking(alumnosData.slice(0, 5))
      } else if (perfil && perfil.rol === 'alumno') {
        setRanking([perfil])
      }

      // Conteo de checkins hoy
      const { data: chkData } = await supabase
        .from('checkins')
        .select('user_id')
        .eq('fecha', fechaHoy)

      const confirmadosRemotos = chkData ? chkData.length : 0
      const localCheckins = JSON.parse(localStorage.getItem('racha_checkins_' + fechaHoy) || '{}')
      const totalHoy = Math.max(confirmadosRemotos, Object.keys(localCheckins).length)
      setAsistenciasHoyCount(totalHoy)

      // Comprobar si mi checkin está en Supabase
      if (perfil) {
        const { data: miChk } = await supabase
          .from('checkins')
          .select('*')
          .eq('user_id', perfil.id)
          .eq('fecha', fechaHoy)
          .maybeSingle()

        if (miChk) {
          setAsistenciaConfirmada(miChk)
          setSolicitudPendiente(null)
        }
      }
    } catch (e) {}
  }

  // Mandar solicitud de confirmación de presencia a las 15:30
  const handleMandarSolicitud = async (esTarde) => {
    if (!perfil) return
    const horaActual = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

    const nuevaSolicitud = {
      userId: perfil.id,
      nombre: perfil.nombre,
      hora: horaActual,
      fecha: fechaHoy,
      esTarde,
      puntos: esTarde ? 5 : 10
    }

    try {
      const guardadas = JSON.parse(localStorage.getItem('muudel_solicitudes_' + fechaHoy) || '[]')
      const filtradas = guardadas.filter(s => s.userId !== perfil.id)
      const actualizadas = [nuevaSolicitud, ...filtradas]
      localStorage.setItem('muudel_solicitudes_' + fechaHoy, JSON.stringify(actualizadas))
      setSolicitudPendiente(nuevaSolicitud)
    } catch (e) {}

    triggerConfetti()
    sound.playStamp()
  }

  const sumarPuntos = (puntosGanados) => {
    if (!perfil) return
    const nuevosPuntos = (perfil.puntos_total || 0) + puntosGanados
    const updated = { ...perfil, puntos_total: nuevosPuntos }
    setPerfil(updated)
    localStorage.setItem('racha_local_user', JSON.stringify(updated))

    try {
      supabase.from('profiles').update({ puntos_total: nuevosPuntos }).eq('id', perfil.id)
    } catch (e) {}
  }

  if (!perfil) return null

  const esModerador = perfil.rol === 'moderador'
  const nivelActual = NIVELES.filter(n => (perfil.puntos_total || 0) >= n.min).pop() || NIVELES[0]
  const fechaHoyTexto = new Date().toLocaleDateString('es-ES', {
    weekday: 'long',
    day: 'numeric',
    month: 'long'
  })

  // Calcular diferencia con el rival inmediato en el ranking para activar FOMO
  let rivalInmediato = null
  let puntosParaSuperar = 0
  if (ranking.length > 0 && perfil.rol === 'alumno') {
    const miIndice = ranking.findIndex(r => r.id === perfil.id)
    if (miIndice > 0) {
      // Hay alguien por encima de mí
      rivalInmediato = ranking[miIndice - 1]
      puntosParaSuperar = Math.max(1, (rivalInmediato.puntos_total || 0) - (perfil.puntos_total || 0) + 1)
    } else if (miIndice === -1 && ranking.length > 0) {
      // Estoy fuera del top 5, rival es el 5º o 3º
      rivalInmediato = ranking[Math.min(2, ranking.length - 1)]
      puntosParaSuperar = Math.max(1, (rivalInmediato.puntos_total || 0) - (perfil.puntos_total || 0) + 1)
    }
  }

  return (
    <main style={{ maxWidth: 520, margin: '0 auto', padding: '20px 16px 50px' }}>
      {/* Cabecera */}
      <header style={{ marginBottom: 18 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <p className="apple-caption" style={{ textTransform: 'capitalize', fontWeight: 600, letterSpacing: 0.2 }}>
              {fechaHoyTexto}
            </p>
            <h1 className="apple-large-title" style={{ marginTop: 1, fontSize: 32 }}>
              {esModerador && vistaAdmin ? 'Pase de Lista' : 'Hoy'}
            </h1>
          </div>

          {/* Botón de la Cantina de Recompensas */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button
              onClick={() => setMostrarTienda(true)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '7px 12px',
                borderRadius: 9999,
                backgroundColor: 'rgba(10, 132, 255, 0.1)',
                color: 'var(--color-accent)',
                border: '1px solid rgba(10, 132, 255, 0.25)',
                fontSize: 13,
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              <ShoppingBag size={15} />
              <span>Canjear Puntos</span>
            </button>

            <AvatarUsuario
              nombre={perfil.nombre}
              color={perfil.color_acento}
              rol={perfil.rol}
              size={36}
              showRoleBadge={true}
            />
          </div>
        </div>

        {/* Toggle para el profesor */}
        {esModerador && (
          <div className="segmented-control" style={{ marginTop: 14 }}>
            <button
              className={`segmented-control-item ${vistaAdmin ? 'active' : ''}`}
              onClick={() => setVistaAdmin(true)}
              style={{ gap: 6 }}
            >
              <ClipboardList size={15} />
              <span>Control de Asistencia (15:30)</span>
            </button>
            <button
              className={`segmented-control-item ${!vistaAdmin ? 'active' : ''}`}
              onClick={() => setVistaAdmin(false)}
              style={{ gap: 6 }}
            >
              <LayoutDashboard size={15} />
              <span>Vista de Colegas</span>
            </button>
          </div>
        )}
      </header>

      {/* Vista de Pase de Lista para el profesor */}
      {esModerador && vistaAdmin ? (
        <PanelPaseLista />
      ) : (
        <div ref={contentRef}>
          {/* Tablón de avisos del profesor */}
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
                  Aviso de lominoño
                </span>
                <p style={{ fontSize: 14, color: 'var(--color-ink)', marginTop: 2, fontWeight: 500 }}>
                  {avisoHoy}
                </p>
              </div>
            </div>
          )}

          {/* 1. CONTADOR REGRESIVO DE LAS 15:30 Y CONFIRMACIÓN DE ASISTENCIA */}
          <ContadorCierreLista
            userId={perfil.id}
            nombreUsuario={perfil.nombre}
            asistenciaConfirmada={asistenciaConfirmada}
            solicitudPendiente={solicitudPendiente}
            onMandarSolicitud={handleMandarSolicitud}
          />

          {/* Si ya está confirmada, mostrar el sello físico */}
          {asistenciaConfirmada && (
            <CheckinCard
              userId={perfil.id}
              rol={perfil.rol}
              onAbrirPanelAdmin={() => setVistaAdmin(true)}
            />
          )}

          {/* 2. TERMÓMETRO COLECTIVO DE LA PEÑA DE CLASE (FOMO GRUPAL) */}
          <MetaAsistenciaAula
            totalAlumnos={totalAlumnosClase}
            asistenciasConfirmadas={asistenciasHoyCount}
            onAbrirChat={() => navigate('/chat')}
          />

          {/* 3. ALERTA DE PERSECUCIÓN EN EL PODIO (FOMO INDIVIDUAL) */}
          {rivalInmediato && (
            <div className="card" style={{
              padding: '12px 16px',
              marginBottom: 16,
              backgroundColor: 'rgba(255, 149, 0, 0.08)',
              border: '1px solid rgba(255, 149, 0, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 10
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Zap size={18} color="var(--color-warning)" />
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-ink)' }}>
                  A tiro de piedra: estás a solo <strong>{puntosParaSuperar} pts</strong> de superar a <strong>{rivalInmediato.nombre}</strong>
                </span>
              </div>
              <span className="apple-badge apple-badge-warning" style={{ fontSize: 11, flexShrink: 0 }}>
                ¡A por el podio!
              </span>
            </div>
          )}

          {/* 4. PREGUNTA FLASH DEL DÍA (CADUCA HOY A MEDIANOCHE) */}
          <PreguntaFlashDia
            userId={perfil.id}
            onSumarPuntos={sumarPuntos}
          />

          {/* Barra de racha */}
          <RachaBar
            racha={perfil.racha_actual || 0}
            mejorRacha={perfil.mejor_racha || 0}
            congelada={perfil.racha_congelada}
          />

          {/* Reto diario */}
          <RetoDelDia perfil={perfil} onCompletado={sumarPuntos} />

          {/* Podio real de la clase */}
          {ranking.length > 0 && <TopRanking lista={ranking} />}

          {/* Marcador personal */}
          <section className="card" style={{ marginTop: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <h3 className="apple-headline" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                Tu marcador de clase
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
                  <span className="apple-caption">Puntos para canjear</span>
                </div>
                <div className="tabular-nums" style={{ fontSize: 22, fontWeight: 800, color: 'var(--color-accent)', marginTop: 2 }}>
                  {perfil.puntos_total || 0} <span style={{ fontSize: 13, fontWeight: 500 }}>pts</span>
                </div>
              </div>

              <div style={{
                backgroundColor: 'var(--color-surface-secondary)',
                padding: '12px 14px',
                borderRadius: 12,
                border: '1px solid var(--color-separator)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Flame size={14} color="var(--color-positive)" />
                  <span className="apple-caption">Récord personal</span>
                </div>
                <div className="tabular-nums" style={{ fontSize: 22, fontWeight: 800, color: 'var(--color-positive)', marginTop: 2 }}>
                  {perfil.mejor_racha || 0} <span style={{ fontSize: 13, fontWeight: 500 }}>días</span>
                </div>
              </div>
            </div>
          </section>
        </div>
      )}

      {/* MODAL DE LA CANTINA / TIENDA DE RECOMPENSAS */}
      {mostrarTienda && (
        <TiendaRecompensas onClose={() => setMostrarTienda(false)} />
      )}
    </main>
  )
}
