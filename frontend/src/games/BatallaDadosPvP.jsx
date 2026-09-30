// frontend/src/games/BatallaDadosPvP.jsx
import { useState, useEffect, useRef } from 'react'
import { supabase } from '../utils/supabase'
import { sound, triggerConfetti } from '../utils/haptics'
import { Swords, Plus, Shield, Trophy, Loader2, X, Coins, RotateCcw, History, AlertCircle } from 'lucide-react'
import { useAuth } from '../App'

// Componente visual para un dado físico de 6 caras estilo Apple (minimalista y táctil)
function CaraDado({ valor, rodando }) {
  // Posiciones de los puntos para cada número (1 al 6)
  const renderPuntos = () => {
    switch (valor) {
      case 1:
        return <div style={{ width: 12, height: 12, borderRadius: '50%', backgroundColor: '#1C1C1E', margin: 'auto' }} />
      case 2:
        return (
          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: '100%', width: '100%' }}>
            <div style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: '#1C1C1E', alignSelf: 'flex-start' }} />
            <div style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: '#1C1C1E', alignSelf: 'flex-end' }} />
          </div>
        )
      case 3:
        return (
          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: '100%', width: '100%' }}>
            <div style={{ width: 9, height: 9, borderRadius: '50%', backgroundColor: '#1C1C1E', alignSelf: 'flex-start' }} />
            <div style={{ width: 9, height: 9, borderRadius: '50%', backgroundColor: '#1C1C1E', alignSelf: 'center' }} />
            <div style={{ width: 9, height: 9, borderRadius: '50%', backgroundColor: '#1C1C1E', alignSelf: 'flex-end' }} />
          </div>
        )
      case 4:
        return (
          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: '100%', width: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <div style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: '#1C1C1E' }} />
              <div style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: '#1C1C1E' }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <div style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: '#1C1C1E' }} />
              <div style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: '#1C1C1E' }} />
            </div>
          </div>
        )
      case 5:
        return (
          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: '100%', width: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <div style={{ width: 9, height: 9, borderRadius: '50%', backgroundColor: '#1C1C1E' }} />
              <div style={{ width: 9, height: 9, borderRadius: '50%', backgroundColor: '#1C1C1E' }} />
            </div>
            <div style={{ width: 9, height: 9, borderRadius: '50%', backgroundColor: '#1C1C1E', alignSelf: 'center' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <div style={{ width: 9, height: 9, borderRadius: '50%', backgroundColor: '#1C1C1E' }} />
              <div style={{ width: 9, height: 9, borderRadius: '50%', backgroundColor: '#1C1C1E' }} />
            </div>
          </div>
        )
      case 6:
        return (
          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: '100%', width: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <div style={{ width: 9, height: 9, borderRadius: '50%', backgroundColor: '#1C1C1E' }} />
              <div style={{ width: 9, height: 9, borderRadius: '50%', backgroundColor: '#1C1C1E' }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <div style={{ width: 9, height: 9, borderRadius: '50%', backgroundColor: '#1C1C1E' }} />
              <div style={{ width: 9, height: 9, borderRadius: '50%', backgroundColor: '#1C1C1E' }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <div style={{ width: 9, height: 9, borderRadius: '50%', backgroundColor: '#1C1C1E' }} />
              <div style={{ width: 9, height: 9, borderRadius: '50%', backgroundColor: '#1C1C1E' }} />
            </div>
          </div>
        )
      default:
        return null
    }
  }

  return (
    <div
      style={{
        width: 58,
        height: 58,
        borderRadius: 14,
        backgroundColor: '#FFFFFF',
        boxShadow: rodando
          ? '0 12px 24px rgba(0,0,0,0.35), inset 0 2px 4px rgba(255,255,255,0.8), inset 0 -2px 4px rgba(0,0,0,0.2)'
          : '0 4px 10px rgba(0,0,0,0.25), inset 0 1px 2px rgba(255,255,255,0.9), inset 0 -2px 4px rgba(0,0,0,0.15)',
        border: '1px solid rgba(0,0,0,0.12)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 10,
        boxSizing: 'border-box',
        transform: rodando ? 'rotate(15deg) scale(1.08)' : 'none',
        transition: 'transform 0.15s ease',
        animation: rodando ? 'shakeDado 0.18s infinite alternate' : 'none'
      }}
    >
      {renderPuntos()}
    </div>
  )
}

export function BatallaDadosPvP() {
  const { perfil, setPerfil } = useAuth()
  const [lobbies, setLobbies] = useState([])
  const [historial, setHistorial] = useState([])
  const [apuesta, setApuesta] = useState(10)
  const [cargando, setCargando] = useState(false)
  const [animacionBatalla, setAnimacionBatalla] = useState(null)
  const [dadosMostrados, setDadosMostrados] = useState({
    c1: 1, c2: 1, o1: 1, o2: 1
  })
  const [rodandoDados, setRodandoDados] = useState(false)
  const [mensajeEstado, setMensajeEstado] = useState('')

  const PRESETS_APUESTA = [5, 10, 25, 50, 100]

  // Cargar salas y duelos recientes
  useEffect(() => {
    fetchLobbies()
    fetchHistorial()

    // Suscripción Realtime a pvp_partidas
    const canal = supabase
      .channel('pvp-batallas-live')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'pvp_partidas' },
        (payload) => {
          fetchLobbies()
          fetchHistorial()

          // Si una partida creada por el usuario actual fue resuelta por un oponente:
          if (
            payload.eventType === 'UPDATE' &&
            payload.new?.creador_id === perfil?.id &&
            payload.new?.estado === 'finalizado' &&
            !animacionBatalla
          ) {
            iniciarAnimacionResolucion({
              creador_id: payload.new.creador_id,
              oponente_id: payload.new.oponente_id,
              creador_dado1: payload.new.dado1_creador || Math.ceil(payload.new.resultado_creador / 2),
              creador_dado2: payload.new.dado2_creador || Math.floor(payload.new.resultado_creador / 2),
              creador_roll: payload.new.resultado_creador,
              oponente_dado1: payload.new.dado1_oponente || Math.ceil(payload.new.resultado_oponente / 2),
              oponente_dado2: payload.new.dado2_oponente || Math.floor(payload.new.resultado_oponente / 2),
              oponente_roll: payload.new.resultado_oponente,
              ganador_id: payload.new.ganador_id,
              premio: payload.new.apuesta * 2
            })
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(canal)
    }
  }, [perfil?.id, animacionBatalla])

  const fetchLobbies = async () => {
    try {
      const { data } = await supabase
        .from('pvp_partidas')
        .select(`
          id, apuesta, estado, creador_id, created_at,
          creador:profiles!pvp_partidas_creador_id_fkey(id, nombre, avatar_url, color_acento)
        `)
        .eq('estado', 'esperando')
        .order('created_at', { ascending: false })

      if (data) setLobbies(data)
    } catch (_) {}
  }

  const fetchHistorial = async () => {
    try {
      const { data } = await supabase
        .from('pvp_partidas')
        .select(`
          id, apuesta, resultado_creador, resultado_oponente, ganador_id, resolved_at,
          creador:profiles!pvp_partidas_creador_id_fkey(id, nombre, color_acento),
          oponente:profiles!pvp_partidas_oponente_id_fkey(id, nombre, color_acento)
        `)
        .eq('estado', 'finalizado')
        .order('resolved_at', { ascending: false })
        .limit(5)

      if (data) setHistorial(data)
    } catch (_) {}
  }

  // Crear partida (bloquea la apuesta en la BD)
  const handleCrearPartida = async () => {
    if (apuesta <= 0) {
      sound.playPop()
      alert('La apuesta debe ser mayor a 0 puntos.')
      return
    }

    if (!perfil || perfil.puntos_total < apuesta) {
      sound.playPop()
      alert('No tienes suficientes puntos para cubrir esta apuesta.')
      return
    }

    setCargando(true)
    try {
      const { data, error } = await supabase.rpc('crear_partida_pvp', { p_apuesta: apuesta })
      if (error) throw error

      sound.playChipSound()
      const nuevoSaldo = perfil.puntos_total - apuesta
      setPerfil({ ...perfil, puntos_total: nuevoSaldo })
      localStorage.setItem('racha_local_user', JSON.stringify({ ...perfil, puntos_total: nuevoSaldo }))

      setMensajeEstado('¡Desafío creado! Esperando que un compañero lo acepte...')
      setTimeout(() => setMensajeEstado(''), 4000)
      fetchLobbies()
    } catch (e) {
      alert('Error al crear desafío: ' + (e.message || e))
    } finally {
      setCargando(false)
    }
  }

  // Cancelar partida creada y reembolsar
  const handleCancelarPartida = async (partidaId, betAmt) => {
    setCargando(true)
    try {
      const { error } = await supabase.rpc('cancelar_partida_pvp', { p_partida_id: partidaId })
      if (error) throw error

      sound.playStamp()
      const nuevoSaldo = perfil.puntos_total + betAmt
      setPerfil({ ...perfil, puntos_total: nuevoSaldo })
      localStorage.setItem('racha_local_user', JSON.stringify({ ...perfil, puntos_total: nuevoSaldo }))

      setMensajeEstado('Desafío cancelado. Puntos reembolsados.')
      setTimeout(() => setMensajeEstado(''), 3000)
      fetchLobbies()
    } catch (e) {
      alert('Error al cancelar: ' + (e.message || e))
    } finally {
      setCargando(false)
    }
  }

  // Aceptar desafío (unirse y resolver atómicamente)
  const handleAceptarDesafio = async (partidaId, betAmt) => {
    if (!perfil || perfil.puntos_total < betAmt) {
      sound.playPop()
      alert('Saldo insuficiente para aceptar este desafío.')
      return
    }

    setCargando(true)
    try {
      const { data, error } = await supabase.rpc('unirse_partida_pvp', { p_partida_id: partidaId })
      if (error) throw error

      iniciarAnimacionResolucion(data)
    } catch (e) {
      alert('Error al aceptar desafío: ' + (e.message || e))
    } finally {
      setCargando(false)
    }
  }

  // Animación coreográfica de los dados
  const iniciarAnimacionResolucion = (data) => {
    setAnimacionBatalla(data)
    setRodandoDados(true)
    sound.playDiceShake()

    let contadorGiro = 0
    const intervalo = setInterval(() => {
      contadorGiro++
      setDadosMostrados({
        c1: Math.floor(Math.random() * 6) + 1,
        c2: Math.floor(Math.random() * 6) + 1,
        o1: Math.floor(Math.random() * 6) + 1,
        o2: Math.floor(Math.random() * 6) + 1
      })

      if (contadorGiro > 14) {
        clearInterval(intervalo)
        // Fijar resultados reales
        setDadosMostrados({
          c1: data.creador_dado1 || 3,
          c2: data.creador_dado2 || 4,
          o1: data.oponente_dado1 || 3,
          o2: data.oponente_dado2 || 5
        })
        setRodandoDados(false)

        const esGanador = data.ganador_id === perfil?.id
        if (esGanador) {
          sound.playWin()
          triggerConfetti()
        } else {
          sound.playLose()
        }

        // Refrescar saldo del perfil
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
      }
    }, 110)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Estilos de animación embebidos */}
      <style>{`
        @keyframes shakeDado {
          0% { transform: translate(1px, 1px) rotate(0deg); }
          25% { transform: translate(-2px, -1px) rotate(-8deg); }
          50% { transform: translate(-1px, 2px) rotate(8deg); }
          70% { transform: translate(2px, 1px) rotate(-4deg); }
          100% { transform: translate(1px, -2px) rotate(4deg); }
        }
      `}</style>

      {/* HEADER DE LA SECCIÓN */}
      <section
        className="card"
        style={{
          background: 'linear-gradient(135deg, rgba(28,28,30,0.92) 0%, rgba(44,44,46,0.85) 100%)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255,255,255,0.12)',
          padding: '20px',
          color: '#FFFFFF'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: 14,
                backgroundColor: 'rgba(255, 59, 48, 0.16)',
                color: '#FF3B30',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 12px rgba(255, 59, 48, 0.2)'
              }}
            >
              <Swords size={26} />
            </div>
            <div>
              <h2 className="apple-title-2" style={{ margin: 0, fontSize: 20, color: '#FFF' }}>
                Batalla de Dados PvP
              </h2>
              <p className="apple-subheadline" style={{ margin: '2px 0 0', fontSize: 13, color: 'rgba(255,255,255,0.7)' }}>
                Duelos 1 vs 1 en tiempo real. Tirada de 2 dados (2-12). ¡El mayor puntaje se lleva el bote doble!
              </p>
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '8px 16px',
              borderRadius: 9999,
              backgroundColor: 'rgba(255,255,255,0.08)',
              border: '1px solid rgba(255,255,255,0.15)'
            }}
          >
            <Coins size={18} color="#FFD60A" />
            <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.8)' }}>Tu Saldo:</span>
            <strong style={{ fontSize: 16, color: '#FFD60A' }}>{perfil?.puntos_total || 0} pts</strong>
          </div>
        </div>

        {mensajeEstado && (
          <div
            style={{
              marginTop: 14,
              padding: '10px 14px',
              borderRadius: 10,
              backgroundColor: 'rgba(52, 199, 89, 0.15)',
              border: '1px solid rgba(52, 199, 89, 0.3)',
              color: '#34C759',
              fontSize: 13,
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: 8
            }}
          >
            <Shield size={16} />
            {mensajeEstado}
          </div>
        )}
      </section>

      {/* PANEL: CREAR NUEVO DESAFÍO */}
      <section
        className="card"
        style={{
          padding: '20px',
          border: '1px solid var(--color-separator)'
        }}
      >
        <h3 className="apple-headline" style={{ fontSize: 15, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
          <Coins size={18} color="#FF9500" />
          Crear Nuevo Desafío en Clase
        </h3>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Presets rápidos */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span className="apple-caption" style={{ marginRight: 4 }}>Apuesta rápida:</span>
            {PRESETS_APUESTA.map(val => (
              <button
                key={val}
                type="button"
                onClick={() => {
                  sound.playChipSound()
                  setApuesta(val)
                }}
                style={{
                  padding: '6px 14px',
                  borderRadius: 9999,
                  border: apuesta === val ? '2px solid var(--color-accent)' : '1px solid var(--color-separator)',
                  backgroundColor: apuesta === val ? 'rgba(0, 122, 255, 0.12)' : 'var(--color-surface)',
                  color: apuesta === val ? 'var(--color-accent)' : 'var(--color-ink)',
                  fontWeight: 600,
                  fontSize: 13,
                  cursor: 'pointer'
                }}
              >
                {val} pts
              </button>
            ))}
            <button
              type="button"
              onClick={() => {
                sound.playChipSound()
                setApuesta(perfil?.puntos_total || 10)
              }}
              style={{
                padding: '6px 12px',
                borderRadius: 9999,
                border: '1px solid #FF9500',
                backgroundColor: 'rgba(255, 149, 0, 0.1)',
                color: '#FF9500',
                fontWeight: 700,
                fontSize: 12,
                cursor: 'pointer'
              }}
            >
              Todo al Ruedo
            </button>
          </div>

          {/* Formulario de creación */}
          <div style={{ display: 'flex', gap: 10, alignItems: 'stretch' }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <input
                type="number"
                min="1"
                max={perfil?.puntos_total || 9999}
                value={apuesta}
                onChange={e => setApuesta(Math.max(1, Number(e.target.value)))}
                placeholder="Puntos a apostar"
                style={{
                  width: '100%',
                  height: 44,
                  padding: '0 14px',
                  borderRadius: 12,
                  border: '1px solid var(--color-separator)',
                  backgroundColor: 'var(--color-surface-secondary)',
                  color: 'var(--color-ink)',
                  fontSize: 16,
                  fontWeight: 600,
                  boxSizing: 'border-box'
                }}
              />
              <span style={{ position: 'absolute', right: 14, top: 12, fontSize: 13, color: 'var(--color-tertiary-ink)' }}>
                Bote: {apuesta * 2} pts
              </span>
            </div>

            <button
              type="button"
              className="btn-primary"
              onClick={handleCrearPartida}
              disabled={cargando || apuesta <= 0 || (perfil?.puntos_total || 0) < apuesta}
              style={{
                height: 44,
                padding: '0 20px',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                backgroundColor: '#FF3B30',
                opacity: (perfil?.puntos_total || 0) < apuesta ? 0.6 : 1
              }}
            >
              {cargando ? <Loader2 size={18} className="spin" /> : <Plus size={18} />}
              <span>Lanzar Reto</span>
            </button>
          </div>
        </div>
      </section>

      {/* SECCIÓN 1: SALAS ESPERANDO RIVAL */}
      <section className="card" style={{ padding: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <h3 className="apple-headline" style={{ fontSize: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Swords size={18} color="#007AFF" />
            Salas Abiertas en Clase ({lobbies.length})
          </h3>
          <button
            type="button"
            onClick={() => {
              sound.playPop()
              fetchLobbies()
            }}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--color-accent)',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            <RotateCcw size={13} />
            Actualizar
          </button>
        </div>

        {lobbies.length === 0 ? (
          <div
            style={{
              padding: '36px 16px',
              textAlign: 'center',
              borderRadius: 14,
              backgroundColor: 'var(--color-surface-secondary)',
              border: '1px dashed var(--color-separator)'
            }}
          >
            <Shield size={32} color="var(--color-tertiary-ink)" style={{ margin: '0 auto 8px', display: 'block' }} />
            <p className="apple-headline" style={{ fontSize: 15, margin: '0 0 4px' }}>
              No hay retos activos en este momento
            </p>
            <p className="apple-caption" style={{ margin: 0 }}>
              Crea una sala arriba y desafía a cualquiera de tus compañeros de SMR2.
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {lobbies.map((lobby) => {
              const esMio = lobby.creador_id === perfil?.id
              return (
                <div
                  key={lobby.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '14px 16px',
                    borderRadius: 14,
                    backgroundColor: esMio ? 'rgba(255, 149, 0, 0.06)' : 'var(--color-surface-secondary)',
                    border: esMio ? '1px solid rgba(255, 149, 0, 0.3)' : '1px solid var(--color-separator)',
                    flexWrap: 'wrap',
                    gap: 12
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div
                      style={{
                        width: 42,
                        height: 42,
                        borderRadius: 12,
                        backgroundColor: lobby.creador?.color_acento || '#007AFF',
                        color: '#FFF',
                        fontWeight: 800,
                        fontSize: 17,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: '0 2px 6px rgba(0,0,0,0.15)'
                      }}
                    >
                      {lobby.creador?.nombre ? lobby.creador.nombre.charAt(0).toUpperCase() : '?'}
                    </div>

                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontWeight: 700, fontSize: 15, color: 'var(--color-ink)' }}>
                          {lobby.creador?.nombre || 'Alumno'}
                        </span>
                        {esMio && (
                          <span
                            style={{
                              fontSize: 10,
                              fontWeight: 700,
                              textTransform: 'uppercase',
                              padding: '2px 8px',
                              borderRadius: 6,
                              backgroundColor: 'rgba(255, 149, 0, 0.2)',
                              color: '#FF9500'
                            }}
                          >
                            Tu Reto
                          </span>
                        )}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 2 }}>
                        <span style={{ fontSize: 13, color: 'var(--color-secondary-ink)' }}>
                          Apuesta: <strong style={{ color: 'var(--color-ink)' }}>{lobby.apuesta} pts</strong>
                        </span>
                        <span style={{ fontSize: 12, color: 'var(--color-tertiary-ink)' }}>•</span>
                        <span style={{ fontSize: 13, color: '#34C759', fontWeight: 600 }}>
                          Bote: {lobby.apuesta * 2} pts
                        </span>
                      </div>
                    </div>
                  </div>

                  <div>
                    {esMio ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 12, color: '#FF9500', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                          <Loader2 size={13} className="spin" />
                          Esperando rival...
                        </span>
                        <button
                          type="button"
                          onClick={() => handleCancelarPartida(lobby.id, lobby.apuesta)}
                          disabled={cargando}
                          style={{
                            padding: '6px 12px',
                            borderRadius: 8,
                            border: '1px solid rgba(255, 59, 48, 0.4)',
                            backgroundColor: 'rgba(255, 59, 48, 0.08)',
                            color: '#FF3B30',
                            fontSize: 12,
                            fontWeight: 600,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 4
                          }}
                        >
                          <X size={14} />
                          Cancelar
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleAceptarDesafio(lobby.id, lobby.apuesta)}
                        disabled={cargando || (perfil?.puntos_total || 0) < lobby.apuesta}
                        style={{
                          padding: '8px 18px',
                          borderRadius: 20,
                          border: 'none',
                          backgroundColor: '#34C759',
                          color: '#FFF',
                          fontSize: 14,
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6,
                          boxShadow: '0 2px 8px rgba(52, 199, 89, 0.3)',
                          opacity: (perfil?.puntos_total || 0) < lobby.apuesta ? 0.5 : 1
                        }}
                      >
                        <Swords size={16} />
                        Luchar ({lobby.apuesta} pts)
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>

      {/* SECCIÓN 2: HISTORIAL DE DUELOS RECIENTES */}
      {historial.length > 0 && (
        <section className="card" style={{ padding: '20px' }}>
          <h3 className="apple-headline" style={{ fontSize: 15, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
            <History size={16} color="var(--color-secondary-ink)" />
            Últimas Batallas de Dados en Clase
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {historial.map((batalla) => {
              const ganador = batalla.ganador_id === batalla.creador?.id ? batalla.creador : batalla.oponente
              const perdedor = batalla.ganador_id === batalla.creador?.id ? batalla.oponente : batalla.creador
              const rollGanador = batalla.ganador_id === batalla.creador?.id ? batalla.resultado_creador : batalla.resultado_oponente
              const rollPerdedor = batalla.ganador_id === batalla.creador?.id ? batalla.resultado_oponente : batalla.resultado_creador

              return (
                <div
                  key={batalla.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 14px',
                    borderRadius: 10,
                    backgroundColor: 'var(--color-surface-secondary)',
                    border: '1px solid var(--color-separator)',
                    fontSize: 13
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Trophy size={15} color="#FFD60A" />
                    <span style={{ fontWeight: 700, color: 'var(--color-ink)' }}>
                      {ganador?.nombre || 'Alumno'} ({rollGanador})
                    </span>
                    <span style={{ color: 'var(--color-tertiary-ink)' }}>venció a</span>
                    <span style={{ color: 'var(--color-secondary-ink)' }}>
                      {perdedor?.nombre || 'Alumno'} ({rollPerdedor})
                    </span>
                  </div>

                  <span style={{ fontWeight: 700, color: '#34C759' }}>
                    +{batalla.apuesta * 2} pts
                  </span>
                </div>
              )
            })}
          </div>
        </section>
      )}

      {/* MODAL COREOGRÁFICO DE BATALLA DE DADOS */}
      {animacionBatalla && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.88)',
            backdropFilter: 'blur(16px)',
            zIndex: 99999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16
          }}
        >
          <div
            style={{
              maxWidth: 500,
              width: '100%',
              backgroundColor: '#1C1C1E',
              borderRadius: 24,
              border: '1px solid rgba(255,255,255,0.18)',
              padding: '32px 24px',
              textAlign: 'center',
              boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
              color: '#FFFFFF'
            }}
          >
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: 18,
                backgroundColor: 'rgba(255, 59, 48, 0.2)',
                color: '#FF3B30',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px'
              }}
            >
              <Swords size={30} />
            </div>

            <h2 style={{ fontSize: 24, fontWeight: 800, margin: '0 0 6px' }}>
              {rodandoDados ? '🎲 ¡Tirando los dados!...' : '¡Duelo Resuelto!'}
            </h2>
            <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.65)', margin: '0 0 28px' }}>
              Bote en disputa: <strong style={{ color: '#FFD60A' }}>{animacionBatalla.premio} puntos</strong>
            </p>

            {/* TABLERO DE LOS DOS JUGADORES */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr auto 1fr',
                alignItems: 'center',
                gap: 16,
                backgroundColor: 'rgba(255,255,255,0.04)',
                borderRadius: 18,
                padding: '20px 14px',
                border: '1px solid rgba(255,255,255,0.08)'
              }}
            >
              {/* JUGADOR 1 (CREADOR) */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.85)' }}>
                  {animacionBatalla.creador_id === perfil?.id ? 'Tú (Creador)' : 'Rival (Creador)'}
                </span>

                <div style={{ display: 'flex', gap: 8 }}>
                  <CaraDado valor={dadosMostrados.c1} rodando={rodandoDados} />
                  <CaraDado valor={dadosMostrados.c2} rodando={rodandoDados} />
                </div>

                <div style={{ fontSize: 22, fontWeight: 900, color: '#FFD60A' }}>
                  {rodandoDados ? '?' : dadosMostrados.c1 + dadosMostrados.c2}
                </div>
              </div>

              {/* VS */}
              <div
                style={{
                  fontSize: 16,
                  fontWeight: 900,
                  color: 'rgba(255,255,255,0.4)',
                  padding: '6px 10px',
                  borderRadius: 8,
                  backgroundColor: 'rgba(255,255,255,0.06)'
                }}
              >
                VS
              </div>

              {/* JUGADOR 2 (OPONENTE) */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.85)' }}>
                  {animacionBatalla.oponente_id === perfil?.id ? 'Tú (Rival)' : 'Rival (Oponente)'}
                </span>

                <div style={{ display: 'flex', gap: 8 }}>
                  <CaraDado valor={dadosMostrados.o1} rodando={rodandoDados} />
                  <CaraDado valor={dadosMostrados.o2} rodando={rodandoDados} />
                </div>

                <div style={{ fontSize: 22, fontWeight: 900, color: '#FFD60A' }}>
                  {rodandoDados ? '?' : dadosMostrados.o1 + dadosMostrados.o2}
                </div>
              </div>
            </div>

            {/* VEREDICTO FINAL TRAS RODAR */}
            {!rodandoDados && (
              <div style={{ marginTop: 24 }}>
                {animacionBatalla.ganador_id === perfil?.id ? (
                  <div style={{ animation: 'pop 0.3s ease' }}>
                    <div style={{ fontSize: 28, fontWeight: 900, color: '#34C759', marginBottom: 4 }}>
                      ¡VICTORIA! 🎉
                    </div>
                    <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.8)', margin: 0 }}>
                      Has ganado <strong style={{ color: '#FFD60A' }}>+{animacionBatalla.premio} pts</strong> para tu racha.
                    </p>
                  </div>
                ) : (
                  <div>
                    <div style={{ fontSize: 26, fontWeight: 800, color: '#FF3B30', marginBottom: 4 }}>
                      Has sido derrotado...
                    </div>
                    <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.65)', margin: 0 }}>
                      Tu rival ha sacado mejor puntuación en los dados.
                    </p>
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => {
                    sound.playPop()
                    setAnimacionBatalla(null)
                  }}
                  style={{
                    marginTop: 24,
                    width: '100%',
                    height: 46,
                    borderRadius: 14,
                    border: 'none',
                    backgroundColor: animacionBatalla.ganador_id === perfil?.id ? '#34C759' : 'rgba(255,255,255,0.15)',
                    color: '#FFF',
                    fontSize: 15,
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  Continuar
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
