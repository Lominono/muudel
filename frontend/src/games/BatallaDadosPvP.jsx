// frontend/src/games/BatallaDadosPvP.jsx
import { useState, useEffect, useRef } from 'react'
import { supabase } from '../utils/supabase'
import { sound, triggerConfetti } from '../utils/haptics'
import { transmitirEvento, suscribirEvento } from '../utils/realtimeHub'
import { Swords, Plus, Shield, Trophy, Loader2, X, Coins, RotateCcw, History, AlertCircle, Dice5, User } from 'lucide-react'
import { useAuth } from '../App'

// Componente de dado físico de marfil con puntos grabados estilo artesanal de aula
function DadoFisico({ valor, rodando, esDorado = false }) {
  const puntosPosiciones = () => {
    const colorPunto = esDorado ? '#78350F' : '#1C1C1E'
    const punto = (key, style = {}) => (
      <div
        key={key}
        style={{
          width: 9,
          height: 9,
          borderRadius: '50%',
          backgroundColor: colorPunto,
          boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.6)',
          ...style
        }}
      />
    )

    switch (valor) {
      case 1:
        return (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%' }}>
            {punto('c', { width: 12, height: 12 })}
          </div>
        )
      case 2:
        return (
          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', width: '100%', height: '100%' }}>
            {punto('tl', { alignSelf: 'flex-start' })}
            {punto('br', { alignSelf: 'flex-end' })}
          </div>
        )
      case 3:
        return (
          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', width: '100%', height: '100%' }}>
            {punto('tl', { alignSelf: 'flex-start' })}
            {punto('c', { alignSelf: 'center' })}
            {punto('br', { alignSelf: 'flex-end' })}
          </div>
        )
      case 4:
        return (
          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', width: '100%', height: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              {punto('tl')}
              {punto('tr')}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              {punto('bl')}
              {punto('br')}
            </div>
          </div>
        )
      case 5:
        return (
          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', width: '100%', height: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              {punto('tl')}
              {punto('tr')}
            </div>
            {punto('c', { alignSelf: 'center' })}
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              {punto('bl')}
              {punto('br')}
            </div>
          </div>
        )
      case 6:
        return (
          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', width: '100%', height: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              {punto('tl')}
              {punto('tr')}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              {punto('ml')}
              {punto('mr')}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              {punto('bl')}
              {punto('br')}
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
        width: 54,
        height: 54,
        borderRadius: 12,
        backgroundColor: esDorado ? '#FDE68A' : '#F8F9FA',
        boxShadow: rodando
          ? '0 10px 20px rgba(0,0,0,0.4), inset 0 2px 3px rgba(255,255,255,0.9), inset 0 -3px 4px rgba(0,0,0,0.25)'
          : '0 4px 8px rgba(0,0,0,0.3), inset 0 2px 2px rgba(255,255,255,0.9), inset 0 -2px 3px rgba(0,0,0,0.2)',
        border: esDorado ? '1px solid #D97706' : '1px solid rgba(0,0,0,0.18)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 9,
        boxSizing: 'border-box',
        transform: rodando ? 'rotate(12deg) scale(1.05)' : 'none',
        transition: 'transform 0.12s ease',
        animation: rodando ? 'agitarDado 0.15s infinite alternate' : 'none'
      }}
    >
      {puntosPosiciones()}
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
  const [dadosMostrados, setDadosMostrados] = useState({ c1: 1, c2: 1, o1: 1, o2: 1 })
  const [rodandoDados, setRodandoDados] = useState(false)
  const [notificacion, setNotificacion] = useState('')

  const PRESETS_APUESTA = [5, 10, 25, 50, 100]

  useEffect(() => {
    fetchLobbies()
    fetchHistorial()

    // 1. Canal en tiempo real de clase (realtimeHub) para difusión inmediata con 0ms de retardo
    const desun1 = suscribirEvento('pvp_nuevo_reto', () => fetchLobbies())
    const desun2 = suscribirEvento('pvp_reto_cancelado', () => fetchLobbies())
    const desun3 = suscribirEvento('pvp_reto_resuelto', (payload) => {
      fetchLobbies()
      fetchHistorial()
      // Si el usuario era el creador y estaba esperando, lanzar la animación en vivo
      if (payload?.resultado?.creador_id === perfil?.id && !animacionBatalla) {
        iniciarAnimacionResolucion(payload.resultado)
      }
    })

    // 2. Suscripción secundaria de Postgres Changes de Supabase
    const canal = supabase
      .channel('pvp-batallas-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pvp_partidas' }, () => {
        fetchLobbies()
        fetchHistorial()
      })
      .subscribe()

    return () => {
      desun1()
      desun2()
      desun3()
      supabase.removeChannel(canal)
    }
  }, [perfil?.id, animacionBatalla])

  // Cargar salas esperando oponente de forma segura (sin fallos de PostgREST joins)
  const fetchLobbies = async () => {
    try {
      const { data: partidas, error } = await supabase
        .from('pvp_partidas')
        .select('*')
        .eq('estado', 'esperando')
        .order('created_at', { ascending: false })

      if (error) {
        // Fallback local silencioso si la tabla no está creada aún en Supabase
        return
      }

      if (!partidas || partidas.length === 0) {
        setLobbies([])
        return
      }

      // Mapear perfiles de creadores sin usar joins que causan error 400
      const creadorIds = [...new Set(partidas.map(p => p.creador_id).filter(Boolean))]
      let perfilesMap = {}

      if (creadorIds.length > 0) {
        const { data: perfilesData } = await supabase
          .from('profiles')
          .select('id, nombre, avatar_url, color_acento, digito_id')
          .in('id', creadorIds)

        if (perfilesData) {
          perfilesData.forEach(p => { perfilesMap[p.id] = p })
        }
      }

      const resultado = partidas.map(p => ({
        ...p,
        creador: perfilesMap[p.creador_id] || {
          id: p.creador_id,
          nombre: 'Compañero SMR2',
          color_acento: '#007AFF',
          digito_id: '#01'
        }
      }))

      setLobbies(resultado)
    } catch (_) {}
  }

  // Cargar historial de duelos de forma segura
  const fetchHistorial = async () => {
    try {
      const { data: partidas, error } = await supabase
        .from('pvp_partidas')
        .select('*')
        .eq('estado', 'finalizado')
        .order('resolved_at', { ascending: false })
        .limit(5)

      if (error || !partidas || partidas.length === 0) {
        setHistorial([])
        return
      }

      // Recoger IDs de creadores y oponentes
      const userIds = [
        ...new Set(partidas.flatMap(p => [p.creador_id, p.oponente_id]).filter(Boolean))
      ]

      let perfilesMap = {}
      if (userIds.length > 0) {
        const { data: perfilesData } = await supabase
          .from('profiles')
          .select('id, nombre, color_acento')
          .in('id', userIds)

        if (perfilesData) {
          perfilesData.forEach(p => { perfilesMap[p.id] = p })
        }
      }

      const resultado = partidas.map(p => ({
        ...p,
        creador: perfilesMap[p.creador_id] || { nombre: 'Alumno SMR2' },
        oponente: perfilesMap[p.oponente_id] || { nombre: 'Alumno SMR2' }
      }))

      setHistorial(resultado)
    } catch (_) {}
  }

  // Lanzar un nuevo desafío
  const handleCrearPartida = async () => {
    if (apuesta <= 0) {
      sound.playPop()
      avisar('La apuesta debe ser de al menos 1 punto.')
      return
    }

    if (!perfil || (perfil.puntos_total || 0) < apuesta) {
      sound.playPop()
      avisar('Saldo insuficiente en tu cartilla de puntos.')
      return
    }

    setCargando(true)
    try {
      const { data: partidaId, error } = await supabase.rpc('crear_partida_pvp', { p_apuesta: apuesta })
      if (error) throw error

      sound.playChipSound()

      // Actualizar puntos en local
      const nuevoSaldo = perfil.puntos_total - apuesta
      const perfilActualizado = { ...perfil, puntos_total: nuevoSaldo }
      setPerfil(perfilActualizado)
      localStorage.setItem('racha_local_user', JSON.stringify(perfilActualizado))

      // Emitir evento por el canal de clase para que todos lo vean al instante
      transmitirEvento('pvp_nuevo_reto', {
        partidaId,
        creador_id: perfil.id,
        nombre: perfil.nombre,
        apuesta
      })

      avisar('¡Desafío sellado en la pizarra! Esperando que un compañero acepte.')
      fetchLobbies()
    } catch (e) {
      avisar('Error al sellar el desafío: ' + (e.message || e))
    } finally {
      setCargando(false)
    }
  }

  // Cancelar y reembolsar puntos
  const handleCancelarPartida = async (partidaId, betAmt) => {
    setCargando(true)
    try {
      const { error } = await supabase.rpc('cancelar_partida_pvp', { p_partida_id: partidaId })
      if (error) throw error

      sound.playStamp()

      const nuevoSaldo = (perfil.puntos_total || 0) + betAmt
      const perfilActualizado = { ...perfil, puntos_total: nuevoSaldo }
      setPerfil(perfilActualizado)
      localStorage.setItem('racha_local_user', JSON.stringify(perfilActualizado))

      transmitirEvento('pvp_reto_cancelado', { partidaId })

      avisar('Desafío cancelado. Puntos devueltos a tu cuenta.')
      fetchLobbies()
    } catch (e) {
      avisar('No se pudo cancelar: ' + (e.message || e))
    } finally {
      setCargando(false)
    }
  }

  // Aceptar el reto de un compañero
  const handleAceptarDesafio = async (partidaId, betAmt) => {
    if (!perfil || (perfil.puntos_total || 0) < betAmt) {
      sound.playPop()
      avisar('No tienes suficientes puntos para cubrir la apuesta.')
      return
    }

    setCargando(true)
    try {
      const { data, error } = await supabase.rpc('unirse_partida_pvp', { p_partida_id: partidaId })
      if (error) throw error

      // Notificar a toda la clase y al creador
      transmitirEvento('pvp_reto_resuelto', {
        partidaId,
        resultado: data
      })

      iniciarAnimacionResolucion(data)
    } catch (e) {
      avisar('Error al entrar al duelo: ' + (e.message || e))
    } finally {
      setCargando(false)
    }
  }

  // Animación coreografiada de los dados
  const iniciarAnimacionResolucion = (data) => {
    setAnimacionBatalla(data)
    setRodandoDados(true)
    sound.playDiceShake()

    let giros = 0
    const intervalo = setInterval(() => {
      giros++
      setDadosMostrados({
        c1: Math.floor(Math.random() * 6) + 1,
        c2: Math.floor(Math.random() * 6) + 1,
        o1: Math.floor(Math.random() * 6) + 1,
        o2: Math.floor(Math.random() * 6) + 1
      })

      if (giros > 13) {
        clearInterval(intervalo)
        setDadosMostrados({
          c1: data.creador_dado1 || Math.ceil((data.creador_roll || 7) / 2),
          c2: data.creador_dado2 || Math.floor((data.creador_roll || 7) / 2),
          o1: data.oponente_dado1 || Math.ceil((data.oponente_roll || 7) / 2),
          o2: data.oponente_dado2 || Math.floor((data.oponente_roll || 7) / 2)
        })
        setRodandoDados(false)

        const esGanador = data.ganador_id === perfil?.id
        if (esGanador) {
          sound.playWin()
          triggerConfetti()
        } else {
          sound.playLose()
        }

        // Refrescar saldo
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
    }, 115)
  }

  const avisar = (msg) => {
    setNotificacion(msg)
    setTimeout(() => setNotificacion(''), 4000)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Animación física de sacudida de dados */}
      <style>{`
        @keyframes agitarDado {
          0% { transform: translate(1px, 1px) rotate(0deg); }
          25% { transform: translate(-2px, -1px) rotate(-10deg); }
          50% { transform: translate(-1px, 2px) rotate(10deg); }
          75% { transform: translate(2px, 1px) rotate(-5deg); }
          100% { transform: translate(1px, -2px) rotate(5deg); }
        }
      `}</style>

      {/* CABECERA ESTILO TABLERO DE AULA SMR2 (Sin degradados de IA) */}
      <section
        style={{
          backgroundColor: '#16191D',
          borderRadius: 14,
          border: '1px solid #2C3036',
          padding: '18px 20px',
          color: '#F4F5F7',
          boxShadow: '0 2px 6px rgba(0,0,0,0.2)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            {/* Sello físico con borde mecánico */}
            <div
              style={{
                width: 46,
                height: 46,
                borderRadius: 10,
                backgroundColor: 'rgba(217, 56, 41, 0.12)',
                border: '1.5px solid #D93829',
                color: '#D93829',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <Dice5 size={26} />
            </div>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, letterSpacing: -0.2 }}>
                  Duelo de Dados 1v1
                </h2>
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: 0.5,
                    padding: '2px 6px',
                    borderRadius: 4,
                    backgroundColor: 'rgba(52, 199, 89, 0.15)',
                    color: '#34C759',
                    fontFamily: 'monospace'
                  }}
                >
                  EN VIVO
                </span>
              </div>
              <p style={{ margin: '3px 0 0', fontSize: 13, color: '#9CA3AF' }}>
                Reto directo entre compañeros de clase. 2 dados por jugador (2-12). El mayor se lleva el bote doble.
              </p>
            </div>
          </div>

          {/* Marcador de Saldo estilo Display Técnico */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '6px 14px',
              borderRadius: 8,
              backgroundColor: '#0D0E10',
              border: '1px solid #262A30'
            }}
          >
            <span style={{ fontSize: 12, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 600 }}>
              Saldo disponible:
            </span>
            <strong style={{ fontSize: 15, color: '#FBBF24', fontFamily: 'monospace' }}>
              {perfil?.puntos_total || 0} pts
            </strong>
          </div>
        </div>

        {notificacion && (
          <div
            style={{
              marginTop: 12,
              padding: '8px 12px',
              borderRadius: 8,
              backgroundColor: 'rgba(0, 122, 255, 0.12)',
              border: '1px solid rgba(0, 122, 255, 0.3)',
              color: '#38BDF8',
              fontSize: 13,
              fontWeight: 500,
              display: 'flex',
              alignItems: 'center',
              gap: 8
            }}
          >
            <Shield size={15} />
            {notificacion}
          </div>
        )}
      </section>

      {/* PANEL: LANZAR RETO (Estilo Hoja de Desafío de Aula) */}
      <section
        style={{
          backgroundColor: '#1A1D21',
          borderRadius: 14,
          border: '1px solid #2C3036',
          padding: '18px 20px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <span style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.6, color: '#D97706' }}>
            ✦ Lanzar Nuevo Reto a la Clase
          </span>
          <span style={{ fontSize: 12, color: '#9CA3AF' }}>
            Bote en disputa: <strong style={{ color: '#FBBF24', fontFamily: 'monospace' }}>{apuesta * 2} pts</strong>
          </span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* Fichas rápidas de apuesta */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 12, color: '#9CA3AF', marginRight: 4 }}>Apuesta fija:</span>
            {PRESETS_APUESTA.map(val => (
              <button
                key={val}
                type="button"
                onClick={() => {
                  sound.playChipSound()
                  setApuesta(val)
                }}
                style={{
                  padding: '5px 12px',
                  borderRadius: 6,
                  border: apuesta === val ? '1.5px solid #007AFF' : '1px solid #374151',
                  backgroundColor: apuesta === val ? 'rgba(0, 122, 255, 0.15)' : '#111315',
                  color: apuesta === val ? '#60A5FA' : '#E5E7EB',
                  fontWeight: 600,
                  fontSize: 13,
                  cursor: 'pointer',
                  fontFamily: 'monospace'
                }}
              >
                {val} pts
              </button>
            ))}

            <button
              type="button"
              onClick={() => {
                sound.playChipSound()
                setApuesta(Math.max(1, perfil?.puntos_total || 10))
              }}
              style={{
                padding: '5px 10px',
                borderRadius: 6,
                border: '1px solid #D97706',
                backgroundColor: 'rgba(217, 119, 6, 0.12)',
                color: '#F59E0B',
                fontWeight: 700,
                fontSize: 12,
                cursor: 'pointer'
              }}
            >
              Todo al Ruedo
            </button>
          </div>

          {/* Formulario de entrada */}
          <div style={{ display: 'flex', gap: 10 }}>
            <input
              type="number"
              min="1"
              max={perfil?.puntos_total || 9999}
              value={apuesta}
              onChange={e => setApuesta(Math.max(1, Number(e.target.value)))}
              style={{
                flex: 1,
                height: 42,
                padding: '0 14px',
                borderRadius: 8,
                border: '1px solid #374151',
                backgroundColor: '#0F1113',
                color: '#FFF',
                fontSize: 15,
                fontWeight: 600,
                fontFamily: 'monospace'
              }}
            />

            <button
              type="button"
              onClick={handleCrearPartida}
              disabled={cargando || apuesta <= 0 || (perfil?.puntos_total || 0) < apuesta}
              style={{
                height: 42,
                padding: '0 20px',
                borderRadius: 8,
                border: 'none',
                backgroundColor: '#D93829',
                color: '#FFF',
                fontWeight: 700,
                fontSize: 14,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                opacity: (perfil?.puntos_total || 0) < apuesta ? 0.5 : 1
              }}
            >
              {cargando ? <Loader2 size={16} className="spin" /> : <Plus size={16} />}
              <span>Sellar Reto</span>
            </button>
          </div>
        </div>
      </section>

      {/* TABLERO DE RETOS EN ESPERA */}
      <section
        style={{
          backgroundColor: '#1A1D21',
          borderRadius: 14,
          border: '1px solid #2C3036',
          padding: '18px 20px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.6, color: '#9CA3AF' }}>
              Mesas Abiertas en Clase ({lobbies.length})
            </span>
          </div>

          <button
            type="button"
            onClick={() => {
              sound.playPop()
              fetchLobbies()
            }}
            style={{
              background: 'none',
              border: 'none',
              color: '#60A5FA',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            <RotateCcw size={12} />
            Actualizar
          </button>
        </div>

        {lobbies.length === 0 ? (
          <div
            style={{
              padding: '30px 16px',
              textAlign: 'center',
              borderRadius: 10,
              backgroundColor: '#121417',
              border: '1px dashed #2C3036'
            }}
          >
            <Dice5 size={28} color="#6B7280" style={{ margin: '0 auto 8px', display: 'block' }} />
            <p style={{ margin: '0 0 4px', fontSize: 14, fontWeight: 600, color: '#E5E7EB' }}>
              No hay retos abiertos en este momento
            </p>
            <p style={{ margin: 0, fontSize: 12, color: '#9CA3AF' }}>
              Sella un reto arriba para que cualquiera de tus compañeros de SMR2 acepte el duelo.
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
                    padding: '12px 16px',
                    borderRadius: 10,
                    backgroundColor: esMio ? 'rgba(217, 119, 6, 0.08)' : '#121417',
                    border: esMio ? '1px solid rgba(217, 119, 6, 0.35)' : '1px solid #262A30',
                    flexWrap: 'wrap',
                    gap: 12
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div
                      style={{
                        width: 38,
                        height: 38,
                        borderRadius: 8,
                        backgroundColor: lobby.creador?.color_acento || '#007AFF',
                        color: '#FFF',
                        fontWeight: 800,
                        fontSize: 15,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      {lobby.creador?.nombre ? lobby.creador.nombre.charAt(0).toUpperCase() : '?'}
                    </div>

                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontWeight: 700, fontSize: 14, color: '#F3F4F6' }}>
                          {lobby.creador?.nombre || 'Alumno SMR2'}
                        </span>
                        {esMio && (
                          <span
                            style={{
                              fontSize: 10,
                              fontWeight: 700,
                              textTransform: 'uppercase',
                              padding: '1px 6px',
                              borderRadius: 4,
                              backgroundColor: 'rgba(217, 119, 6, 0.2)',
                              color: '#F59E0B'
                            }}
                          >
                            Tu Reto
                          </span>
                        )}
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 2 }}>
                        <span style={{ fontSize: 12, color: '#9CA3AF' }}>
                          Apuesta: <strong style={{ color: '#E5E7EB', fontFamily: 'monospace' }}>{lobby.apuesta} pts</strong>
                        </span>
                        <span style={{ fontSize: 12, color: '#4B5563' }}>•</span>
                        <span style={{ fontSize: 12, color: '#34C759', fontWeight: 600 }}>
                          Bote: {lobby.apuesta * 2} pts
                        </span>
                      </div>
                    </div>
                  </div>

                  <div>
                    {esMio ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 12, color: '#F59E0B', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                          <Loader2 size={13} className="spin" />
                          Esperando rival...
                        </span>
                        <button
                          type="button"
                          onClick={() => handleCancelarPartida(lobby.id, lobby.apuesta)}
                          disabled={cargando}
                          style={{
                            padding: '5px 12px',
                            borderRadius: 6,
                            border: '1px solid rgba(239, 68, 68, 0.4)',
                            backgroundColor: 'rgba(239, 68, 68, 0.1)',
                            color: '#EF4444',
                            fontSize: 12,
                            fontWeight: 600,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 4
                          }}
                        >
                          <X size={13} />
                          Cancelar
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleAceptarDesafio(lobby.id, lobby.apuesta)}
                        disabled={cargando || (perfil?.puntos_total || 0) < lobby.apuesta}
                        style={{
                          padding: '7px 16px',
                          borderRadius: 8,
                          border: 'none',
                          backgroundColor: '#2F9E44',
                          color: '#FFF',
                          fontSize: 13,
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6,
                          opacity: (perfil?.puntos_total || 0) < lobby.apuesta ? 0.5 : 1
                        }}
                      >
                        <Swords size={15} />
                        Aceptar ({lobby.apuesta} pts)
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>

      {/* HISTORIAL DE DUELOS RECIENTES */}
      {historial.length > 0 && (
        <section
          style={{
            backgroundColor: '#1A1D21',
            borderRadius: 14,
            border: '1px solid #2C3036',
            padding: '16px 20px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <History size={15} color="#9CA3AF" />
            <span style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.6, color: '#9CA3AF' }}>
              Últimas Batallas de Dados Registradas
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
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
                    padding: '8px 12px',
                    borderRadius: 6,
                    backgroundColor: '#121417',
                    border: '1px solid #262A30',
                    fontSize: 12
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ color: '#FBBF24', fontWeight: 700 }}>🏆</span>
                    <span style={{ fontWeight: 600, color: '#E5E7EB' }}>
                      {ganador?.nombre || 'Alumno'} <span style={{ fontFamily: 'monospace', color: '#60A5FA' }}>({rollGanador})</span>
                    </span>
                    <span style={{ color: '#6B7280' }}>venció a</span>
                    <span style={{ color: '#9CA3AF' }}>
                      {perdedor?.nombre || 'Alumno'} <span style={{ fontFamily: 'monospace' }}>({rollPerdedor})</span>
                    </span>
                  </div>

                  <span style={{ fontWeight: 700, color: '#34C759', fontFamily: 'monospace' }}>
                    +{batalla.apuesta * 2} pts
                  </span>
                </div>
              )
            })}
          </div>
        </section>
      )}

      {/* MODAL MECÁNICO DE RESOLUCIÓN DE DADOS */}
      {animacionBatalla && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.88)',
            zIndex: 99999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16
          }}
        >
          <div
            style={{
              maxWidth: 460,
              width: '100%',
              backgroundColor: '#16191D',
              borderRadius: 16,
              border: '2px solid #374151',
              padding: '28px 24px',
              textAlign: 'center',
              boxShadow: '0 15px 40px rgba(0,0,0,0.8)',
              color: '#F4F5F7'
            }}
          >
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: 12,
                backgroundColor: 'rgba(217, 56, 41, 0.15)',
                border: '1px solid #D93829',
                color: '#D93829',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 12px'
              }}
            >
              <Dice5 size={26} />
            </div>

            <h2 style={{ fontSize: 20, fontWeight: 800, margin: '0 0 4px', letterSpacing: -0.3 }}>
              {rodandoDados ? '🎲 Tirada de Dados en Mesa' : 'Duelo Resuelto'}
            </h2>
            <p style={{ fontSize: 13, color: '#9CA3AF', margin: '0 0 24px' }}>
              Bote disputado: <strong style={{ color: '#FBBF24', fontFamily: 'monospace' }}>{animacionBatalla.premio} pts</strong>
            </p>

            {/* TABLERO DE LOS DOS JUGADORES */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr auto 1fr',
                alignItems: 'center',
                gap: 14,
                backgroundColor: '#0F1113',
                borderRadius: 12,
                padding: '18px 12px',
                border: '1px solid #262A30'
              }}
            >
              {/* CREADOR */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: '#E5E7EB' }}>
                  {animacionBatalla.creador_id === perfil?.id ? 'Tú (Retador)' : 'Rival'}
                </span>

                <div style={{ display: 'flex', gap: 6 }}>
                  <DadoFisico valor={dadosMostrados.c1} rodando={rodandoDados} />
                  <DadoFisico valor={dadosMostrados.c2} rodando={rodandoDados} />
                </div>

                <div style={{ fontSize: 20, fontWeight: 800, color: '#FBBF24', fontFamily: 'monospace' }}>
                  {rodandoDados ? '...' : dadosMostrados.c1 + dadosMostrados.c2}
                </div>
              </div>

              {/* VS */}
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 900,
                  color: '#6B7280',
                  padding: '4px 8px',
                  borderRadius: 4,
                  backgroundColor: '#1E2227',
                  fontFamily: 'monospace'
                }}
              >
                VS
              </div>

              {/* OPONENTE */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: '#E5E7EB' }}>
                  {animacionBatalla.oponente_id === perfil?.id ? 'Tú (Oponente)' : 'Rival'}
                </span>

                <div style={{ display: 'flex', gap: 6 }}>
                  <DadoFisico valor={dadosMostrados.o1} rodando={rodandoDados} />
                  <DadoFisico valor={dadosMostrados.o2} rodando={rodandoDados} />
                </div>

                <div style={{ fontSize: 20, fontWeight: 800, color: '#FBBF24', fontFamily: 'monospace' }}>
                  {rodandoDados ? '...' : dadosMostrados.o1 + dadosMostrados.o2}
                </div>
              </div>
            </div>

            {/* RESULTADO FINAL */}
            {!rodandoDados && (
              <div style={{ marginTop: 22 }}>
                {animacionBatalla.ganador_id === perfil?.id ? (
                  <div>
                    {/* Sello de Victoria */}
                    <div
                      style={{
                        display: 'inline-block',
                        padding: '6px 16px',
                        borderRadius: 6,
                        border: '2px solid #2F9E44',
                        color: '#2F9E44',
                        fontWeight: 800,
                        fontSize: 16,
                        letterSpacing: 0.5,
                        textTransform: 'uppercase',
                        marginBottom: 6
                      }}
                    >
                      ✓ VICTORIA SELLADA
                    </div>
                    <p style={{ fontSize: 14, color: '#D1D5DB', margin: 0 }}>
                      Cobraste el bote completo de <strong style={{ color: '#FBBF24', fontFamily: 'monospace' }}>+{animacionBatalla.premio} pts</strong>.
                    </p>
                  </div>
                ) : (
                  <div>
                    <div
                      style={{
                        display: 'inline-block',
                        padding: '6px 16px',
                        borderRadius: 6,
                        border: '2px solid #D93829',
                        color: '#D93829',
                        fontWeight: 800,
                        fontSize: 15,
                        letterSpacing: 0.5,
                        textTransform: 'uppercase',
                        marginBottom: 6
                      }}
                    >
                      ✗ DERROTA EN MESA
                    </div>
                    <p style={{ fontSize: 13, color: '#9CA3AF', margin: 0 }}>
                      Tu compañero obtuvo mayor puntuación en los dados.
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
                    marginTop: 20,
                    width: '100%',
                    height: 42,
                    borderRadius: 8,
                    border: 'none',
                    backgroundColor: animacionBatalla.ganador_id === perfil?.id ? '#2F9E44' : '#374151',
                    color: '#FFF',
                    fontSize: 14,
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  Volver al Aula
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
