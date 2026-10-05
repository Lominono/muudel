import { useState, useEffect } from 'react'
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import { AuthProvider, useAuth, ADMIN_LOMINONO_ID } from './context/AuthContext'
import { TabBar } from './components/TabBar'
import { PantallaInicio } from './pages/PantallaInicio'
import { PantallaHoy } from './pages/PantallaHoy'
import { PantallaRanking } from './pages/PantallaRanking'
import { PantallaJuegos } from './pages/PantallaJuegos'
import { PantallaChat } from './pages/PantallaChat'
import { PantallaPerfil } from './pages/PantallaPerfil'
import { PantallaAdmin } from './pages/PantallaAdmin'
import { PantallaCompletarPerfil } from './pages/PantallaCompletarPerfil'
import { EmblemaRacha } from './components/icons/EmblemaRacha'
import { suscribirEvento } from './utils/realtimeHub'
import { sound } from './utils/haptics'
import { supabase } from './utils/supabase'
import { Bell, AlertTriangle, X, Trophy, ShieldAlert, RotateCcw, ArrowRight } from 'lucide-react'

export { useAuth }

function ContenidoApp() {
  const navigate = useNavigate()
  const { session, perfil, setPerfil, cargando, cerrarSesion } = useAuth()
  const [alertaClase, setAlertaClase] = useState(null)
  const [pvpPopup, setPvpPopup] = useState(null)
  const [mostrarAvisoReinicio, setMostrarAvisoReinicio] = useState(false)
  const [bonoBienvenida, setBonoBienvenida] = useState(0)

  // Aviso de reinicio de economía y asignación del bono de bienvenida
  useEffect(() => {
    if (!perfil?.id) return
    const storageKey = `muudel_aviso_reinicio_aula_v3_${perfil.id}`
    const yaVisto = localStorage.getItem(storageKey)
    if (!yaVisto) {
      fetch('/api/ruleta/verificar-bienvenida', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': perfil.id
        }
      })
        .then(r => r.json())
        .then(data => {
          if (data?.bonoOtorgado) {
            setBonoBienvenida(data.bono)
            setPerfil(prev => ({ ...prev, puntos_total: data.nuevoSaldo }))
          }
        })
        .catch(() => {})
        .finally(() => {
          setMostrarAvisoReinicio(true)
        })
    }
  }, [perfil?.id])

  // Escuchar notificaciones y comunicados globales de clase en vivo
  useEffect(() => {
    const desuscribirNotif = suscribirEvento('notificacion_push_clase', (data) => {
      if (data) {
        sound.playPop()
        setAlertaClase(data)
        setTimeout(() => {
          setAlertaClase(prev => (prev?.id === data.id ? null : prev))
        }, 9000)
      }
    })

    const desuscribirAviso = suscribirEvento('aviso_admin', (data) => {
      if (data?.texto) {
        sound.playPop()
        setAlertaClase({
          id: 'aviso-' + Date.now(),
          titulo: 'Comunicado de Moderación',
          mensaje: data.texto,
          nivel: 'general',
          hora: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        })
      }
    })

    // Escuchar resolución de desafíos de dados PvP
    const desuscribirDados = suscribirEvento('pvp_reto_resuelto', (data) => {
      if (!data?.resultado || !perfil?.id) return
      const res = data.resultado
      const soyCreador = String(res.creador_id) === String(perfil.id)
      const soyOponente = String(res.oponente_id) === String(perfil.id)

      if (!soyCreador && !soyOponente) return

      // Si el usuario no estaba en la pantalla de animación activa de dados
      const enPantallaEsperando = Boolean(window.__muudel_dados_activo)
      if (!enPantallaEsperando) {
        const gane = String(res.ganador_id) === String(perfil.id)
        const empate = res.ganador_id === 'empate' || res.ganador_id === null
        const betAmt = res.apuesta || 0
        const rivalNombre = soyCreador ? (res.oponente_nombre || 'Compañero') : (res.creador_nombre || 'Compañero')
        const misPuntos = soyCreador ? res.creador_roll : res.oponente_roll
        const rivalPuntos = soyCreador ? res.oponente_roll : res.creador_roll

        if (gane) {
          sound.playWin()
        } else if (!empate) {
          sound.playLose()
        }

        setPvpPopup({
          id: 'dados-' + Date.now(),
          juego: 'dados',
          titulo: gane ? '¡Victoria en Dados!' : (empate ? 'Empate en Dados' : 'Derrota en Dados'),
          gane,
          empate,
          apuesta: betAmt,
          rivalNombre,
          misPuntos,
          rivalPuntos,
          hora: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        })

        setTimeout(() => {
          setPvpPopup(prev => (prev?.id?.startsWith('dados-') ? null : prev))
        }, 9000)
      }

      // Sincronizar saldo de puntos en vivo
      supabase
        .from('profiles')
        .select('puntos_total')
        .eq('id', perfil.id)
        .single()
        .then(({ data: pData }) => {
          if (pData) {
            setPerfil(prev => ({ ...prev, puntos_total: pData.puntos_total }))
            localStorage.setItem('racha_local_user', JSON.stringify({ ...perfil, puntos_total: pData.puntos_total }))
          }
        })
    })

    // Escuchar resolución de Duelo 21 (Blackjack PvP)
    const desuscribir21 = suscribirEvento('pvp_21_resuelto', (data) => {
      if (!data?.resultado || !perfil?.id) return
      const res = data.resultado
      const soyCreador = String(res.creador_id) === String(perfil.id)
      const soyOponente = String(res.oponente_id) === String(perfil.id)

      if (!soyCreador && !soyOponente) return

      const gane = String(res.ganador_id) === String(perfil.id)
      const empate = res.ganador_id === 'empate'
      const betAmt = res.apuesta || 0
      const rivalNombre = soyCreador ? (res.oponente_nombre || 'Compañero') : (res.creador_nombre || 'Compañero')

      if (gane) {
        sound.playWin()
      } else if (!empate) {
        sound.playLose()
      }

      setPvpPopup({
        id: '21-' + Date.now(),
        juego: 'veintiuno',
        titulo: gane ? '¡Victoria en Duelo 21!' : (empate ? 'Empate en Duelo 21' : 'Derrota en Duelo 21'),
        gane,
        empate,
        apuesta: betAmt,
        rivalNombre,
        motivo: res.motivo || '',
        hora: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      })

      setTimeout(() => {
        setPvpPopup(prev => (prev?.id?.startsWith('21-') ? null : prev))
      }, 9000)

      supabase
        .from('profiles')
        .select('puntos_total')
        .eq('id', perfil.id)
        .single()
        .then(({ data: pData }) => {
          if (pData) {
            setPerfil(prev => ({ ...prev, puntos_total: pData.puntos_total }))
            localStorage.setItem('racha_local_user', JSON.stringify({ ...perfil, puntos_total: pData.puntos_total }))
          }
        })
    })

    // Sincronizar inmediatamente cuando el panel de administración o cualquier componente modifique StevenEuros
    const sincronizarPerfilSaldo = async (nuevoSaldo) => {
      if (!perfil?.id) return
      if (nuevoSaldo != null) {
        setPerfil(prev => prev ? { ...prev, puntos_total: nuevoSaldo } : prev)
        const localUser = localStorage.getItem('racha_local_user')
        if (localUser) {
          try {
            const parsed = JSON.parse(localUser)
            localStorage.setItem('racha_local_user', JSON.stringify({ ...parsed, puntos_total: nuevoSaldo }))
          } catch (e) {}
        }
      } else {
        const { data: pData } = await supabase
          .from('profiles')
          .select('puntos_total, racha_actual')
          .eq('id', perfil.id)
          .single()
        if (pData) {
          setPerfil(prev => prev ? { ...prev, puntos_total: pData.puntos_total, racha_actual: pData.racha_actual ?? prev.racha_actual } : prev)
          const localUser = localStorage.getItem('racha_local_user')
          if (localUser) {
            try {
              const parsed = JSON.parse(localUser)
              localStorage.setItem('racha_local_user', JSON.stringify({ ...parsed, puntos_total: pData.puntos_total, racha_actual: pData.racha_actual ?? parsed.racha_actual }))
            } catch (e) {}
          }
        }
      }
    }

    const handleSyncStevenEuros = (e) => {
      const { puntos, nuevosPuntos, userId, alumnoId } = e.detail || {}
      const targetId = userId || alumnoId
      const pts = nuevosPuntos ?? puntos
      if (!targetId || String(targetId) === String(perfil?.id)) {
        sincronizarPerfilSaldo(pts)
      }
    }
    window.addEventListener('steveneuros_actualizados', handleSyncStevenEuros)

    // Escuchador de cambios en la tabla Postgres profiles de Supabase
    const handleRtPostgresProfiles = (e) => {
      const payload = e.detail
      if (payload?.new && String(payload.new.id) === String(perfil?.id)) {
        sincronizarPerfilSaldo(payload.new.puntos_total)
      }
    }
    window.addEventListener('muudel-rt-postgres-profiles', handleRtPostgresProfiles)

    // Escuchar broadcast de ajuste masivo de monedas de la administración
    const desuscribirMasivo = suscribirEvento('ajuste_masivo_puntos', (data) => {
      sound.playWin()
      triggerConfetti()
      sincronizarPerfilSaldo(null)
    })

    const desuscribirStevenEuros = suscribirEvento('steveneuros_actualizados', (data) => {
      const { alumnoId, userId, nuevosPuntos } = data || {}
      const targetId = userId || alumnoId
      if (!targetId || String(targetId) === String(perfil?.id)) {
        sincronizarPerfilSaldo(nuevosPuntos)
      }
    })

    const desuscribirPuntos = suscribirEvento('puntos_actualizados', (data) => {
      const { alumnoId, userId, nuevosPuntos } = data || {}
      const targetId = userId || alumnoId
      if (!targetId || String(targetId) === String(perfil?.id)) {
        sincronizarPerfilSaldo(nuevosPuntos)
      }
    })

    return () => {
      desuscribirNotif()
      desuscribirAviso()
      desuscribirDados()
      desuscribir21()
      desuscribirMasivo()
      desuscribirStevenEuros()
      desuscribirPuntos()
      window.removeEventListener('steveneuros_actualizados', handleSyncStevenEuros)
      window.removeEventListener('muudel-rt-postgres-profiles', handleRtPostgresProfiles)
    }
  }, [perfil?.id])

  if (cargando) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        gap: 14,
        backgroundColor: 'var(--color-bg)',
      }}>
        <EmblemaRacha size={46} className="flame-animada" />
        <p className="apple-caption" style={{ fontWeight: 500, letterSpacing: 0.2 }}>
          Cargando muudel...
        </p>
      </div>
    )
  }

  // Si el usuario está baneado por el moderador
  if (session && perfil?.baneado) {
    return (
      <main style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px 16px',
        backgroundColor: 'var(--color-bg)'
      }}>
        <div className="card" style={{
          maxWidth: 420,
          width: '100%',
          padding: '36px 24px',
          textAlign: 'center',
          boxShadow: '0 8px 32px rgba(255, 59, 48, 0.08)',
          border: '1px solid rgba(255, 59, 48, 0.25)'
        }}>
          <div style={{
            width: 64,
            height: 64,
            borderRadius: 20,
            backgroundColor: 'rgba(255, 59, 48, 0.12)',
            color: 'var(--color-negative)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px'
          }}>
            <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10"/>
              <path d="m14.5 9-5 5"/>
              <path d="m9.5 9 5 5"/>
            </svg>
          </div>

          <h1 className="apple-title-1" style={{ fontSize: 24, marginBottom: 6, color: 'var(--color-ink)' }}>
            Acceso al Aula Suspendido
          </h1>

          <p className="apple-subheadline" style={{ fontSize: 14, color: 'var(--color-secondary-ink)', marginBottom: 20 }}>
            Tu cuenta ha sido restringida por el moderador de clase debido a una infracción de normas.
          </p>

          <div style={{
            padding: '14px 16px',
            borderRadius: 14,
            backgroundColor: 'var(--color-surface-secondary)',
            border: '1px solid var(--color-separator)',
            textAlign: 'left',
            marginBottom: 24
          }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-negative)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>
              Motivo de la sanción
            </div>
            <div style={{ fontSize: 13, color: 'var(--color-ink)', fontWeight: 500, lineHeight: 1.4 }}>
              {perfil.motivo_ban || 'Incumplimiento de las normas de convivencia del aula o del chat.'}
            </div>
            <div style={{ fontSize: 11, color: 'var(--color-tertiary-ink)', marginTop: 8 }}>
              Usuario: <strong>{perfil.nombre}</strong> {perfil.email ? `(${perfil.email})` : ''}
            </div>
          </div>

          <button
            type="button"
            className="btn-secondary"
            onClick={cerrarSesion}
            style={{
              width: '100%',
              minHeight: 44,
              fontSize: 14,
              fontWeight: 600,
              color: 'var(--color-negative)',
              backgroundColor: 'rgba(255, 59, 48, 0.08)'
            }}
          >
            Cerrar sesión
          </button>
        </div>
      </main>
    )
  }

  // Si el alumno ha iniciado sesión pero aún no ha completado su nombre real y dígito
  const necesitaCompletarFicha = Boolean(
    session &&
    perfil &&
    perfil.rol !== 'moderador' &&
    !perfil.onboarding_completado &&
    !perfil.digito_id
  )

  if (necesitaCompletarFicha) {
    return <PantallaCompletarPerfil />
  }

  return (
    <div style={{ minHeight: '100vh', paddingBottom: session ? 84 : 0 }}>
      {/* Banner flotante de Notificación / Alerta de Clase */}
      {alertaClase && (
        <aside
          role="alert"
          style={{
            position: 'fixed',
            top: 14,
            left: '50%',
            transform: 'translateX(-50%)',
            width: 'calc(100% - 28px)',
            maxWidth: 520,
            zIndex: 9999,
            backgroundColor: alertaClase.nivel === 'urgente' ? 'rgba(217, 56, 41, 0.95)' : 'rgba(26, 29, 33, 0.95)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            color: '#FFFFFF',
            borderRadius: 16,
            padding: '12px 16px',
            boxShadow: '0 8px 30px rgba(0, 0, 0, 0.35)',
            border: alertaClase.nivel === 'urgente' ? '1px solid rgba(255, 255, 255, 0.3)' : '1px solid rgba(255, 255, 255, 0.15)',
            display: 'flex',
            alignItems: 'flex-start',
            gap: 12
          }}
        >
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              backgroundColor: alertaClase.nivel === 'urgente' ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 122, 255, 0.25)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}
          >
            {alertaClase.nivel === 'urgente' ? (
              <AlertTriangle size={20} color="#FFFFFF" />
            ) : (
              <Bell size={20} color="#60A5FA" />
            )}
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
              <strong style={{ fontSize: 14, fontWeight: 700, letterSpacing: -0.2 }}>
                {alertaClase.titulo || 'Aviso de Clase SMR2'}
              </strong>
              {alertaClase.hora && (
                <span style={{ fontSize: 11, opacity: 0.7, fontFamily: 'monospace' }}>
                  {alertaClase.hora}
                </span>
              )}
            </div>
            <p style={{ margin: '3px 0 0', fontSize: 13, lineHeight: 1.35, opacity: 0.92, wordBreak: 'break-word' }}>
              {alertaClase.mensaje}
            </p>
          </div>

          <button
            type="button"
            onClick={() => setAlertaClase(null)}
            style={{
              background: 'none',
              border: 'none',
              color: '#FFFFFF',
              opacity: 0.7,
              cursor: 'pointer',
              padding: 4,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            title="Cerrar notificación"
          >
            <X size={16} />
          </button>
        </aside>
      )}

      {/* Mini Pop-Up de Resultado PvP (Dados y Duelo 21) si no estabas en la pantalla de espera */}
      {pvpPopup && (
        <aside
          role="status"
          style={{
            position: 'fixed',
            bottom: session ? 92 : 24,
            left: '50%',
            transform: 'translateX(-50%)',
            width: 'calc(100% - 32px)',
            maxWidth: 460,
            zIndex: 10000,
            backgroundColor: pvpPopup.gane
              ? 'rgba(16, 42, 22, 0.97)'
              : pvpPopup.empate
              ? 'rgba(38, 30, 15, 0.97)'
              : 'rgba(38, 18, 18, 0.97)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            color: '#FFFFFF',
            borderRadius: 16,
            padding: '13px 16px',
            boxShadow: '0 12px 36px rgba(0, 0, 0, 0.5)',
            border: pvpPopup.gane
              ? '1px solid rgba(52, 199, 89, 0.5)'
              : pvpPopup.empate
              ? '1px solid rgba(245, 158, 11, 0.5)'
              : '1px solid rgba(239, 68, 68, 0.5)',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            animation: 'aparecerEscala 0.25s cubic-bezier(0.16, 1, 0.3, 1)'
          }}
        >
          {/* Icono de estado */}
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 12,
              backgroundColor: pvpPopup.gane
                ? 'rgba(52, 199, 89, 0.2)'
                : pvpPopup.empate
                ? 'rgba(245, 158, 11, 0.2)'
                : 'rgba(239, 68, 68, 0.2)',
              color: pvpPopup.gane ? '#34C759' : pvpPopup.empate ? '#F59E0B' : '#EF4444',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}
          >
            {pvpPopup.gane ? (
              <Trophy size={20} />
            ) : pvpPopup.empate ? (
              <RotateCcw size={18} />
            ) : (
              <ShieldAlert size={20} />
            )}
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
              <span style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.5, color: pvpPopup.gane ? '#34C759' : pvpPopup.empate ? '#F59E0B' : '#EF4444' }}>
                {pvpPopup.titulo}
              </span>
              <span
                style={{
                  fontSize: 12,
                  fontFamily: 'monospace',
                  fontWeight: 800,
                  padding: '1px 6px',
                  borderRadius: 6,
                  backgroundColor: pvpPopup.gane
                    ? 'rgba(52, 199, 89, 0.25)'
                    : pvpPopup.empate
                    ? 'rgba(245, 158, 11, 0.25)'
                    : 'rgba(239, 68, 68, 0.25)',
                  color: pvpPopup.gane ? '#4ADE80' : pvpPopup.empate ? '#FDE68A' : '#FCA5A5'
                }}
              >
                {pvpPopup.gane
                  ? `+${pvpPopup.apuesta} SE 💶`
                  : pvpPopup.empate
                  ? `0 SE`
                  : `-${pvpPopup.apuesta} SE 💶`}
              </span>
            </div>

            <div style={{ fontSize: 13, fontWeight: 700, margin: '2px 0 0', color: '#FFFFFF', lineHeight: 1.3 }}>
              {pvpPopup.gane
                ? `¡Has ganado el duelo contra ${pvpPopup.rivalNombre}!`
                : pvpPopup.empate
                ? `Empate con ${pvpPopup.rivalNombre} (StevenEuros devueltos)`
                : `Has perdido contra ${pvpPopup.rivalNombre}`}
            </div>

            <div style={{ fontSize: 11, opacity: 0.85, marginTop: 2, color: '#D1D5DB' }}>
              {pvpPopup.juego === 'dados'
                ? `Sacaste ${pvpPopup.misPuntos} pts vs ${pvpPopup.rivalPuntos} pts de ${pvpPopup.rivalNombre}`
                : pvpPopup.motivo || 'Partida de 21 finalizada'}
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-end' }}>
            <button
              type="button"
              onClick={() => setPvpPopup(null)}
              style={{
                background: 'none',
                border: 'none',
                color: '#9CA3AF',
                cursor: 'pointer',
                padding: 4
              }}
              title="Cerrar aviso"
            >
              <X size={15} />
            </button>
            <button
              type="button"
              onClick={() => {
                setPvpPopup(null)
                navigate('/juegos')
              }}
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: '#60A5FA',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 2,
                padding: '2px 4px'
              }}
            >
              <span>Ver</span>
              <ArrowRight size={11} />
            </button>
          </div>
        </aside>
      )}

      <Routes>
        {!session ? (
          <Route path="*" element={<PantallaInicio />} />
        ) : (
          <>
            <Route path="/" element={<PantallaHoy />} />
            <Route path="/ranking" element={<PantallaRanking />} />
            <Route path="/juegos" element={<PantallaJuegos />} />
            <Route path="/chat" element={<PantallaChat />} />
            <Route path="/perfil" element={<PantallaPerfil />} />
            {(perfil?.rol === 'moderador' || perfil?.rol === 'admin' || perfil?.id === ADMIN_LOMINONO_ID) && (
              <Route path="/admin" element={<PantallaAdmin />} />
            )}
            <Route path="*" element={<Navigate to="/" />} />
          </>
        )}
      </Routes>
      {/* COMUNICADO OFICIAL: REINICIO DEL AULA (DISEÑO ANTI-IA · ARTESANÍA ESCOLAR) */}
      {mostrarAvisoReinicio && (
        <div style={{
          position: 'fixed',
          inset: 0,
          zIndex: 99999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 16,
          backgroundColor: 'rgba(0, 0, 0, 0.76)',
          backdropFilter: 'blur(6px)'
        }}>
          <div style={{
            maxWidth: 440,
            width: '100%',
            backgroundColor: 'var(--color-surface, #1C1C1E)',
            borderRadius: 20,
            border: '1px solid var(--color-separator, rgba(255, 255, 255, 0.15))',
            boxShadow: '0 20px 40px rgba(0, 0, 0, 0.5)',
            padding: '24px 20px',
            display: 'flex',
            flexDirection: 'column',
            gap: 16,
            textAlign: 'center',
            color: 'var(--color-ink, #FFFFFF)'
          }}>
            {/* Sello mecánico tampón Anti-IA */}
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '4px 12px',
                borderRadius: 4,
                border: '1.5px solid #D93829',
                backgroundColor: 'rgba(217, 56, 41, 0.08)',
                color: '#D93829',
                fontFamily: 'monospace',
                fontSize: 11,
                fontWeight: 900,
                letterSpacing: '0.08em',
                textTransform: 'uppercase'
              }}>
                ✦ COMUNICADO OFICIAL · SMR2
              </span>
            </div>

            <div>
              <h3 style={{ fontSize: 19, fontWeight: 800, margin: '0 0 6px', letterSpacing: -0.3 }}>
                Pizarra Limpia en el Aula
              </h3>
              <p style={{ fontSize: 13, lineHeight: 1.5, margin: 0, color: 'var(--color-secondary-ink, rgba(255, 255, 255, 0.75))' }}>
                Se ha completado el reinicio de curso para igualar condiciones. Saldos, compras, chat y clasificaciones se han restablecido.
              </p>
            </div>

            {/* Ficha técnica escolar */}
            <div style={{
              backgroundColor: 'var(--color-fill-secondary, rgba(255, 255, 255, 0.05))',
              borderRadius: 14,
              padding: '14px 16px',
              textAlign: 'left',
              fontSize: 12,
              lineHeight: 1.5,
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
              border: '1px solid var(--color-separator, rgba(255, 255, 255, 0.08))'
            }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                <span style={{ fontSize: 16, lineHeight: 1 }}>💶</span>
                <div>
                  <strong style={{ color: '#30D158' }}>Bono inicial de 10 SE:</strong>
                  <div style={{ color: 'var(--color-secondary-ink, rgba(255,255,255,0.7))', marginTop: 1 }}>
                    Acreditados en tu cuenta para empezar desde el pupitre.
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                <span style={{ fontSize: 16, lineHeight: 1 }}>🪙</span>
                <div>
                  <strong style={{ color: '#FBBF24' }}>Monedas Yoshi exclusivas:</strong>
                  <div style={{ color: 'var(--color-secondary-ink, rgba(255,255,255,0.7))', marginTop: 1 }}>
                    Yoshi Island otorga únicamente monedas para girar la ruleta, sin mezclar StevenEuros.
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                <span style={{ fontSize: 16, lineHeight: 1 }}>💬</span>
                <div>
                  <strong style={{ color: 'var(--color-accent, #0A84FF)' }}>Chat y dudas despejados:</strong>
                  <div style={{ color: 'var(--color-secondary-ink, rgba(255,255,255,0.7))', marginTop: 1 }}>
                    Canales listos para resolver ejercicios de Linux y redes.
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                <span style={{ fontSize: 16, lineHeight: 1 }}>⏱️</span>
                <div>
                  <strong style={{ color: 'var(--color-ink, #FFFFFF)' }}>Pase de lista a las 15:30:</strong>
                  <div style={{ color: 'var(--color-secondary-ink, rgba(255,255,255,0.7))', marginTop: 1 }}>
                    Marca tu asistencia diaria para construir tu racha de clase.
                  </div>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                if (perfil?.id) localStorage.setItem(`muudel_aviso_reinicio_aula_v3_${perfil.id}`, 'true')
                setMostrarAvisoReinicio(false)
                sound.playPop()
              }}
              style={{
                width: '100%',
                padding: '12px 16px',
                borderRadius: 12,
                border: 'none',
                backgroundColor: 'var(--color-accent, #0A84FF)',
                color: '#FFFFFF',
                fontSize: 14,
                fontWeight: 800,
                cursor: 'pointer',
                letterSpacing: 0.2
              }}
            >
              Entendido · Entrar al Aula
            </button>
          </div>
        </div>
      )}

      {session && <TabBar />}
    </div>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <ContenidoApp />
    </AuthProvider>
  )
}
