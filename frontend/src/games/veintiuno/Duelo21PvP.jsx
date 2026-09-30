// frontend/src/games/veintiuno/Duelo21PvP.jsx
import { useState, useEffect, useRef } from 'react'
import { supabase } from '../../utils/supabase'
import { sound, triggerConfetti } from '../../utils/haptics'
import { transmitirEvento, suscribirEvento } from '../../utils/realtimeHub'
import { CartaPoker } from './CartaPoker'
import {
  crearBarajaBarajada,
  calcularPuntuacionMano,
  determinarDesenlace
} from './reglas21'
import {
  Crown,
  Swords,
  Plus,
  RotateCcw,
  Coins,
  ShieldAlert,
  ShieldCheck,
  Trophy,
  Loader2,
  X,
  User,
  Sparkles,
  Layers,
  Flame,
  AlertCircle
} from 'lucide-react'

export function Duelo21PvP({ perfil, setPerfil }) {
  // Pestaña activa dentro de 21: 'crupier' (Mesa Solitario) o 'pvp' (Duelo con la Clase)
  const [subModo, setSubModo] = useState('crupier')

  // --- ESTADO MESA CRUPIER (SOLITARIO / PRÁCTICA) ---
  const [apuestaCrupier, setApuestaCrupier] = useState(10)
  const [faseCrupier, setFaseCrupier] = useState('apostando') // 'apostando' | 'jugando' | 'resuelto'
  const [barajaCrupier, setBarajaCrupier] = useState([])
  const [manoJugadorCrupier, setManoJugadorCrupier] = useState([])
  const [manoDealerCrupier, setManoDealerCrupier] = useState([])
  const [resultadoCrupier, setResultadoCrupier] = useState(null)
  const [cargandoCrupier, setCargandoCrupier] = useState(false)

  // --- ESTADO DUELO 1V1 PVP ---
  const [lobbiesPvp, setLobbiesPvp] = useState([])
  const [apuestaPvp, setApuestaPvp] = useState(25)
  const [cargandoPvp, setCargandoPvp] = useState(false)
  const [partidaActivaPvp, setPartidaActivaPvp] = useState(null)
  const [avisoPvp, setAvisoPvp] = useState('')

  // Comprobar licencia de apuestas de la tienda
  const limiteApuesta = (() => {
    try {
      const invRaw = localStorage.getItem('muudel_inventario_' + perfil?.id)
      if (invRaw) {
        const inv = JSON.parse(invRaw)
        if (inv.some(i => i.catalogoId === 'ruleta_max_500')) return 500
        if (inv.some(i => i.catalogoId === 'ruleta_max_100')) return 100
        if (inv.some(i => i.catalogoId === 'ruleta_max_50')) return 50
      }
    } catch (_) {}
    return 50 // Límite base
  })()

  // Sincronización en tiempo real para el modo PvP
  useEffect(() => {
    fetchLobbiesPvp()

    const des1 = suscribirEvento('pvp_21_nuevo_reto', () => fetchLobbiesPvp())
    const des2 = suscribirEvento('pvp_21_reto_cancelado', () => fetchLobbiesPvp())
    const des3 = suscribirEvento('pvp_21_jugada', (payload) => {
      if (payload && partidaActivaPvp && payload.partidaId === partidaActivaPvp.id) {
        setPartidaActivaPvp(payload.partida)
        sound.playCardDeal()
      }
    })
    const des4 = suscribirEvento('pvp_21_resuelto', (payload) => {
      fetchLobbiesPvp()
      if (payload && partidaActivaPvp && payload.partidaId === partidaActivaPvp.id) {
        setPartidaActivaPvp(payload.partida)
        if (payload.partida.ganador_id === perfil?.id) {
          sound.playWin()
          triggerConfetti()
        } else if (payload.partida.ganador_id === 'empate') {
          sound.playPop()
        } else {
          sound.playLose()
        }
      }
    })

    return () => {
      des1()
      des2()
      des3()
      des4()
    }
  }, [partidaActivaPvp?.id, perfil?.id])

  // =========================================================================
  // LÓGICA MESA CRUPIER (SOLO / PRÁCTICA)
  // =========================================================================

  const iniciarManoCrupier = async () => {
    if (!perfil || (perfil.puntos_total || 0) < apuestaCrupier) {
      sound.playPop()
      return
    }

    setCargandoCrupier(true)
    sound.playChipSound()

    // Deducir apuesta inicial
    const saldoTrasApuesta = (perfil.puntos_total || 0) - apuestaCrupier
    const perfilActualizado = { ...perfil, puntos_total: saldoTrasApuesta }
    setPerfil(perfilActualizado)
    localStorage.setItem('racha_local_user', JSON.stringify(perfilActualizado))

    try {
      await supabase.from('profiles').update({ puntos_total: saldoTrasApuesta }).eq('id', perfil.id)
    } catch (_) {}

    // Barajar 2 barajas para mayor aleatoriedad
    const nuevaBaraja = crearBarajaBarajada(2)

    // Repartir 2 cartas al jugador y 2 al crupier (la 2da del crupier boca abajo)
    const c1_j = nuevaBaraja.pop()
    const c1_d = nuevaBaraja.pop()
    const c2_j = nuevaBaraja.pop()
    const c2_d = { ...nuevaBaraja.pop(), oculta: true }

    setBarajaCrupier(nuevaBaraja)
    setManoJugadorCrupier([c1_j, c2_j])
    setManoDealerCrupier([c1_d, c2_d])
    setResultadoCrupier(null)
    setFaseCrupier('jugando')

    sound.playCardDeal()
    setTimeout(() => sound.playCardDeal(), 160)

    // Comprobar Blackjack natural inmediato
    const scoreJ = calcularPuntuacionMano([c1_j, c2_j])
    if (scoreJ.esBlackjack) {
      setTimeout(() => {
        // Revelar carta oculta del crupier
        const dRevelada = { ...c2_d, oculta: false }
        const manoDRev = [c1_d, dRevelada]
        setManoDealerCrupier(manoDRev)
        resolverFinCrupier([c1_j, c2_j], manoDRev, apuestaCrupier)
      }, 700)
    }

    setCargandoCrupier(false)
  }

  const pedirCartaCrupier = () => {
    if (faseCrupier !== 'jugando') return
    sound.playCardDeal()

    const barajaAct = [...barajaCrupier]
    const nuevaCarta = barajaAct.pop()
    const nuevaManoJ = [...manoJugadorCrupier, nuevaCarta]

    setBarajaCrupier(barajaAct)
    setManoJugadorCrupier(nuevaManoJ)

    const score = calcularPuntuacionMano(nuevaManoJ)
    if (score.sePaso) {
      sound.playBustSound()
      // Revelar carta del crupier y resolver como derrota
      const manoDRev = manoDealerCrupier.map(c => ({ ...c, oculta: false }))
      setManoDealerCrupier(manoDRev)
      resolverFinCrupier(nuevaManoJ, manoDRev, apuestaCrupier)
    }
  }

  const doblarApuestaCrupier = async () => {
    if (faseCrupier !== 'jugando' || manoJugadorCrupier.length !== 2) return
    if ((perfil.puntos_total || 0) < apuestaCrupier) {
      sound.playPop()
      return
    }

    sound.playChipSound()
    // Deducir el monto adicional para doblar
    const saldoTrasDoblar = (perfil.puntos_total || 0) - apuestaCrupier
    const perfilActualizado = { ...perfil, puntos_total: saldoTrasDoblar }
    setPerfil(perfilActualizado)
    localStorage.setItem('racha_local_user', JSON.stringify(perfilActualizado))

    try {
      await supabase.from('profiles').update({ puntos_total: saldoTrasDoblar }).eq('id', perfil.id)
    } catch (_) {}

    const apuestaDoblada = apuestaCrupier * 2
    setApuestaCrupier(apuestaDoblada)

    // Se pide exactamente 1 carta y se planta
    sound.playCardDeal()
    const barajaAct = [...barajaCrupier]
    const cartaExtra = barajaAct.pop()
    const manoFinalJ = [...manoJugadorCrupier, cartaExtra]

    setBarajaCrupier(barajaAct)
    setManoJugadorCrupier(manoFinalJ)

    plantarseCrupier(manoFinalJ, barajaAct, apuestaDoblada)
  }

  const plantarseCrupier = (manoJActual = manoJugadorCrupier, barajaActual = barajaCrupier, betActual = apuestaCrupier) => {
    if (faseCrupier !== 'jugando' && !manoJActual) return

    sound.playPop()

    // 1. Revelar carta tapada del crupier
    let baraja = [...barajaActual]
    let manoD = manoDealerCrupier.map(c => ({ ...c, oculta: false }))
    setManoDealerCrupier(manoD)

    // Si el jugador ya se pasó, no hace falta que el crupier pida más
    const scoreJ = calcularPuntuacionMano(manoJActual)
    if (scoreJ.sePaso) {
      resolverFinCrupier(manoJActual, manoD, betActual)
      return
    }

    // 2. Crupier pide hasta tener al menos 17 puntos
    let scoreD = calcularPuntuacionMano(manoD)
    while (scoreD.total < 17 && baraja.length > 0) {
      const c = baraja.pop()
      manoD.push(c)
      scoreD = calcularPuntuacionMano(manoD)
    }

    setBarajaCrupier(baraja)
    setManoDealerCrupier([...manoD])
    resolverFinCrupier(manoJActual, manoD, betActual)
  }

  const resolverFinCrupier = async (manoJ, manoD, bet) => {
    setFaseCrupier('resuelto')
    const desenlace = determinarDesenlace(manoJ, manoD)
    setResultadoCrupier(desenlace)

    let gananciaNeta = 0
    let saldoFinal = perfil?.puntos_total || 0

    if (desenlace.ganador === 'j1') {
      // Ganó el jugador: recupera su apuesta + premio según ratio
      const cobro = Math.floor(bet * desenlace.multiplicador)
      gananciaNeta = cobro - bet
      saldoFinal += cobro
      sound.playWin()
      triggerConfetti()
    } else if (desenlace.ganador === 'empate') {
      // Empate: devolución de la apuesta
      saldoFinal += bet
      sound.playPop()
    } else {
      // Derrota: ya se había descontado al repartir
      sound.playLose()
    }

    const perfilActualizado = { ...perfil, puntos_total: saldoFinal }
    setPerfil(perfilActualizado)
    localStorage.setItem('racha_local_user', JSON.stringify(perfilActualizado))

    try {
      await supabase.from('profiles').update({ puntos_total: saldoFinal }).eq('id', perfil.id)
    } catch (_) {}
  }

  // =========================================================================
  // LÓGICA MESA 1V1 PVP ONLINE
  // =========================================================================

  const fetchLobbiesPvp = async () => {
    try {
      const { data, error } = await supabase
        .from('pvp_blackjack')
        .select('*')
        .eq('estado', 'esperando')
        .order('created_at', { ascending: false })

      if (error) {
        // Fallback desde localStorage si la tabla no está en Supabase
        const locales = JSON.parse(localStorage.getItem('muudel_pvp_21_lobbies') || '[]')
        setLobbiesPvp(locales.filter(l => l.estado === 'esperando'))
        return
      }

      if (data) {
        // Obtener nombres de creadores
        const cIds = [...new Set(data.map(p => p.creador_id).filter(Boolean))]
        let mapP = {}
        if (cIds.length > 0) {
          const { data: profs } = await supabase.from('profiles').select('id, nombre, color_acento, avatar_url').in('id', cIds)
          if (profs) profs.forEach(p => { mapP[p.id] = p })
        }
        const mapeados = data.map(p => ({
          ...p,
          creador: mapP[p.creador_id] || { nombre: 'Alumno SMR2', color_acento: '#007AFF' }
        }))
        setLobbiesPvp(mapeados)
      }
    } catch (_) {
      const locales = JSON.parse(localStorage.getItem('muudel_pvp_21_lobbies') || '[]')
      setLobbiesPvp(locales.filter(l => l.estado === 'esperando'))
    }
  }

  const crearRetoPvp = async () => {
    if (!perfil || (perfil.puntos_total || 0) < apuestaPvp) {
      sound.playPop()
      setAvisoPvp(`Saldo insuficiente. Tienes ${perfil?.puntos_total || 0} pts y la apuesta es de ${apuestaPvp} pts.`)
      return
    }

    setCargandoPvp(true)
    sound.playStamp()

    const nuevoSaldo = (perfil.puntos_total || 0) - apuestaPvp
    const perfilActualizado = { ...perfil, puntos_total: nuevoSaldo }
    setPerfil(perfilActualizado)
    localStorage.setItem('racha_local_user', JSON.stringify(perfilActualizado))

    try {
      await supabase.from('profiles').update({ puntos_total: nuevoSaldo }).eq('id', perfil.id)
    } catch (_) {}

    // Generar baraja y mano inicial para el creador
    const baraja = crearBarajaBarajada(2)
    const c1 = baraja.pop()
    const c2 = baraja.pop()
    const manoCreador = [c1, c2]

    const nuevoLobby = {
      id: '21_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      creador_id: perfil.id,
      creador_nombre: perfil.nombre || 'Desafiante SMR2',
      apuesta: apuestaPvp,
      estado: 'esperando',
      turno: 'creador', // Turno de jugar: 'creador' | 'oponente' | 'showdown'
      mano_creador: manoCreador,
      mano_oponente: [],
      baraja_restante: baraja,
      ganador_id: null,
      created_at: new Date().toISOString()
    }

    try {
      const { data, error } = await supabase.from('pvp_blackjack').insert([nuevoLobby]).select().single()
      if (!error && data) {
        setPartidaActivaPvp({ ...data, creador: perfil })
      } else {
        // Fallback local
        const prev = JSON.parse(localStorage.getItem('muudel_pvp_21_lobbies') || '[]')
        localStorage.setItem('muudel_pvp_21_lobbies', JSON.stringify([nuevoLobby, ...prev]))
        setPartidaActivaPvp({ ...nuevoLobby, creador: perfil })
      }
    } catch (_) {
      const prev = JSON.parse(localStorage.getItem('muudel_pvp_21_lobbies') || '[]')
      localStorage.setItem('muudel_pvp_21_lobbies', JSON.stringify([nuevoLobby, ...prev]))
      setPartidaActivaPvp({ ...nuevoLobby, creador: perfil })
    }

    transmitirEvento('pvp_21_nuevo_reto', { partida: nuevoLobby })
    fetchLobbiesPvp()
    setCargandoPvp(false)
  }

  const cancelarRetoPvp = async (partidaId, betAmt) => {
    setCargandoPvp(true)
    sound.playStamp()

    const saldoDevuelto = (perfil?.puntos_total || 0) + betAmt
    const perfilActualizado = { ...perfil, puntos_total: saldoDevuelto }
    setPerfil(perfilActualizado)
    localStorage.setItem('racha_local_user', JSON.stringify(perfilActualizado))

    try {
      await supabase.from('profiles').update({ puntos_total: saldoDevuelto }).eq('id', perfil.id)
      await supabase.from('pvp_blackjack').update({ estado: 'cancelado' }).eq('id', partidaId)
    } catch (_) {}

    // Remover de local storage
    const prev = JSON.parse(localStorage.getItem('muudel_pvp_21_lobbies') || '[]')
    localStorage.setItem('muudel_pvp_21_lobbies', JSON.stringify(prev.filter(l => l.id !== partidaId)))

    if (partidaActivaPvp?.id === partidaId) {
      setPartidaActivaPvp(null)
    }

    transmitirEvento('pvp_21_reto_cancelado', { partidaId })
    fetchLobbiesPvp()
    setCargandoPvp(false)
  }

  const aceptarRetoPvp = async (lobby) => {
    if (String(lobby.creador_id) === String(perfil?.id)) {
      setAvisoPvp('No puedes desafiarte a ti mismo. Puedes cancelar la mesa para recuperar tus puntos.')
      return
    }

    if (!perfil || (perfil.puntos_total || 0) < lobby.apuesta) {
      sound.playPop()
      setAvisoPvp(`Saldo insuficiente. Tienes ${perfil?.puntos_total || 0} pts y la mesa requiere ${lobby.apuesta} pts.`)
      return
    }

    setCargandoPvp(true)
    sound.playChipSound()

    // Deducir apuesta al oponente que entra
    const saldoTrasEntrar = (perfil.puntos_total || 0) - lobby.apuesta
    const perfilActualizado = { ...perfil, puntos_total: saldoTrasEntrar }
    setPerfil(perfilActualizado)
    localStorage.setItem('racha_local_user', JSON.stringify(perfilActualizado))

    try {
      await supabase.from('profiles').update({ puntos_total: saldoTrasEntrar }).eq('id', perfil.id)
    } catch (_) {}

    // Tomar 2 cartas de la baraja existente para el oponente
    let baraja = [...(lobby.baraja_restante || crearBarajaBarajada(2))]
    const o1 = baraja.pop()
    const o2 = baraja.pop()
    const manoOponente = [o1, o2]

    const partidaActualizada = {
      ...lobby,
      oponente_id: perfil.id,
      oponente_nombre: perfil.nombre || 'Contrincante',
      estado: 'jugando',
      turno: 'creador', // El creador juega su turno primero
      mano_oponente: manoOponente,
      baraja_restante: baraja
    }

    setPartidaActivaPvp(partidaActualizada)

    try {
      await supabase.from('pvp_blackjack').update(partidaActualizada).eq('id', lobby.id)
    } catch (_) {}

    transmitirEvento('pvp_21_jugada', { partidaId: lobby.id, partida: partidaActualizada })
    setCargandoPvp(false)
  }

  // Acciones dentro de la partida 1v1 activa
  const pedirCartaPvp = async () => {
    if (!partidaActivaPvp || partidaActivaPvp.estado !== 'jugando') return

    const esCreador = perfil?.id === partidaActivaPvp.creador_id
    const esMiTurno = (esCreador && partidaActivaPvp.turno === 'creador') || (!esCreador && partidaActivaPvp.turno === 'oponente')

    if (!esMiTurno) {
      sound.playPop()
      return
    }

    sound.playCardDeal()
    let baraja = [...partidaActivaPvp.baraja_restante]
    const nuevaCarta = baraja.pop()

    let manoC = [...partidaActivaPvp.mano_creador]
    let manoO = [...partidaActivaPvp.mano_oponente]
    let nuevoTurno = partidaActivaPvp.turno

    if (esCreador) {
      manoC.push(nuevaCarta)
      const score = calcularPuntuacionMano(manoC)
      if (score.sePaso) {
        sound.playBustSound()
        nuevoTurno = 'oponente' // Pasa el turno al oponente
      }
    } else {
      manoO.push(nuevaCarta)
      const score = calcularPuntuacionMano(manoO)
      if (score.sePaso) {
        sound.playBustSound()
        // Ambos terminaron, resolver partida
        finalizarPartidaPvp(partidaActivaPvp.id, manoC, manoO)
        return
      }
    }

    const partidaActualizada = {
      ...partidaActivaPvp,
      mano_creador: manoC,
      mano_oponente: manoO,
      baraja_restante: baraja,
      turno: nuevoTurno
    }

    setPartidaActivaPvp(partidaActualizada)
    try {
      await supabase.from('pvp_blackjack').update(partidaActualizada).eq('id', partidaActivaPvp.id)
    } catch (_) {}

    transmitirEvento('pvp_21_jugada', { partidaId: partidaActivaPvp.id, partida: partidaActualizada })
  }

  const plantarsePvp = async () => {
    if (!partidaActivaPvp || partidaActivaPvp.estado !== 'jugando') return

    const esCreador = perfil?.id === partidaActivaPvp.creador_id
    const esMiTurno = (esCreador && partidaActivaPvp.turno === 'creador') || (!esCreador && partidaActivaPvp.turno === 'oponente')

    if (!esMiTurno) return
    sound.playPop()

    if (esCreador) {
      // El creador se planta, pasa el turno al oponente
      const partidaActualizada = {
        ...partidaActivaPvp,
        turno: 'oponente'
      }
      setPartidaActivaPvp(partidaActualizada)
      try {
        await supabase.from('pvp_blackjack').update(partidaActualizada).eq('id', partidaActivaPvp.id)
      } catch (_) {}
      transmitirEvento('pvp_21_jugada', { partidaId: partidaActivaPvp.id, partida: partidaActualizada })
    } else {
      // El oponente se planta: ¡Showdown final!
      finalizarPartidaPvp(partidaActivaPvp.id, partidaActivaPvp.mano_creador, partidaActivaPvp.mano_oponente)
    }
  }

  const finalizarPartidaPvp = async (partidaId, manoC, manoO) => {
    const desenlace = determinarDesenlace(manoC, manoO)
    let ganadorId = null
    const boteTotal = partidaActivaPvp.apuesta * 2

    if (desenlace.ganador === 'j1') {
      ganadorId = partidaActivaPvp.creador_id
    } else if (desenlace.ganador === 'j2') {
      ganadorId = partidaActivaPvp.oponente_id
    } else {
      ganadorId = 'empate'
    }

    // Actualizar puntos de ganador / empate
    if (ganadorId === perfil?.id) {
      const nuevoSaldo = (perfil.puntos_total || 0) + boteTotal
      setPerfil(p => ({ ...p, puntos_total: nuevoSaldo }))
      localStorage.setItem('racha_local_user', JSON.stringify({ ...perfil, puntos_total: nuevoSaldo }))
      try {
        await supabase.from('profiles').update({ puntos_total: nuevoSaldo }).eq('id', perfil.id)
      } catch (_) {}
      sound.playWin()
      triggerConfetti()
    } else if (ganadorId === 'empate') {
      const nuevoSaldo = (perfil?.puntos_total || 0) + partidaActivaPvp.apuesta
      setPerfil(p => ({ ...p, puntos_total: nuevoSaldo }))
      localStorage.setItem('racha_local_user', JSON.stringify({ ...perfil, puntos_total: nuevoSaldo }))
      try {
        await supabase.from('profiles').update({ puntos_total: nuevoSaldo }).eq('id', perfil.id)
      } catch (_) {}
      sound.playPop()
    } else {
      sound.playLose()
    }

    const partidaFinal = {
      ...partidaActivaPvp,
      estado: 'finalizado',
      ganador_id: ganadorId,
      desenlace_motivo: desenlace.motivo,
      resolved_at: new Date().toISOString()
    }

    setPartidaActivaPvp(partidaFinal)

    try {
      await supabase.from('pvp_blackjack').update(partidaFinal).eq('id', partidaId)
    } catch (_) {}

    transmitirEvento('pvp_21_resuelto', {
      partidaId,
      partida: partidaFinal,
      resultado: {
        partida_id: partidaId,
        juego: 'blackjack_21',
        creador_id: partidaActivaPvp.creador_id,
        creador_nombre: partidaActivaPvp.creador_nombre,
        oponente_id: partidaActivaPvp.oponente_id,
        oponente_nombre: partidaActivaPvp.oponente_nombre,
        apuesta: partidaActivaPvp.apuesta,
        ganador_id: ganadorId,
        motivo: desenlace.motivo
      }
    })
  }

  // Puntuaciones calculadas en vivo
  const scoreJugadorCrupier = calcularPuntuacionMano(manoJugadorCrupier)
  const scoreDealerCrupier = calcularPuntuacionMano(manoDealerCrupier)

  const scoreCreadorPvp = partidaActivaPvp ? calcularPuntuacionMano(partidaActivaPvp.mano_creador) : null
  const scoreOponentePvp = partidaActivaPvp ? calcularPuntuacionMano(partidaActivaPvp.mano_oponente) : null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* SELECTOR DE MODALIDAD (Mesa Crupier vs Duelos de Clase) */}
      <div
        className="segmented-control"
        style={{
          width: '100%',
          maxWidth: 420,
          margin: '0 auto',
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          padding: 3,
          backgroundColor: 'var(--color-fill-secondary)',
          borderRadius: 12
        }}
      >
        <button
          type="button"
          className={`segmented-control-item ${subModo === 'crupier' ? 'active' : ''}`}
          onClick={() => {
            sound.playPop()
            setSubModo('crupier')
          }}
          style={{
            minHeight: 38,
            fontSize: 13,
            fontWeight: 700,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6
          }}
        >
          <Layers size={14} />
          <span>Mesa Crupier SMR2</span>
        </button>

        <button
          type="button"
          className={`segmented-control-item ${subModo === 'pvp' ? 'active' : ''}`}
          onClick={() => {
            sound.playPop()
            setSubModo('pvp')
          }}
          style={{
            minHeight: 38,
            fontSize: 13,
            fontWeight: 700,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6
          }}
        >
          <Swords size={14} />
          <span>Duelos 1v1 con Clase</span>
        </button>
      </div>

      {/* ===================================================================== */}
      {/* VISTA A: MESA CRUPIER (SOLO / PRÁCTICA)                                */}
      {/* ===================================================================== */}
      {subModo === 'crupier' && (
        <div
          style={{
            backgroundColor: '#0D381E',
            backgroundImage: 'radial-gradient(ellipse at center, #124B28 0%, #0A2D17 75%, #061F10 100%)',
            border: '8px solid #3F2312',
            borderRadius: 24,
            boxShadow: '0 12px 36px rgba(0,0,0,0.45), inset 0 2px 10px rgba(255,255,255,0.12)',
            padding: 'clamp(14px, 3vw, 24px)',
            color: '#FFFFFF',
            position: 'relative',
            overflow: 'hidden'
          }}
        >
          {/* Línea dorada de paño de casino */}
          <div
            style={{
              position: 'absolute',
              top: '50%',
              left: '5%',
              right: '5%',
              height: 1,
              backgroundColor: 'rgba(212, 175, 55, 0.25)',
              borderBottom: '1px dashed rgba(212, 175, 55, 0.4)'
            }}
          />

          <div
            style={{
              textAlign: 'center',
              marginBottom: 16,
              fontSize: 11,
              fontWeight: 800,
              textTransform: 'uppercase',
              letterSpacing: 1.5,
              color: 'rgba(253, 230, 138, 0.7)'
            }}
          >
            Mesa Oficial de 21 · El Crupier se planta en 17 · Blackjack paga 3:2
          </div>

          {/* MANO DEL CRUPIER */}
          <div style={{ marginBottom: 26, textAlign: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 10 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#E5E7EB', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Banca / Crupier SMR2
              </span>
              {faseCrupier !== 'apostando' && (
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 800,
                    padding: '2px 8px',
                    borderRadius: 6,
                    backgroundColor: scoreDealerCrupier.sePaso ? 'rgba(239, 68, 68, 0.3)' : 'rgba(0, 0, 0, 0.4)',
                    color: scoreDealerCrupier.sePaso ? '#FCA5A5' : '#FDE68A',
                    border: '1px solid rgba(255,255,255,0.1)'
                  }}
                >
                  {scoreDealerCrupier.texto}
                </span>
              )}
            </div>

            {manoDealerCrupier.length === 0 ? (
              <div
                style={{
                  height: 110,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '2px dashed rgba(255,255,255,0.15)',
                  borderRadius: 12,
                  maxWidth: 240,
                  margin: '0 auto',
                  color: 'rgba(255,255,255,0.4)',
                  fontSize: 13
                }}
              >
                Esperando apuesta...
              </div>
            ) : (
              <div style={{ display: 'flex', justifyContent: 'center', gap: 10, flexWrap: 'wrap' }}>
                {manoDealerCrupier.map((c, i) => (
                  <CartaPoker key={c.id || i} carta={c} tamano="md" />
                ))}
              </div>
            )}
          </div>

          {/* ÁREA CENTRAL: BOTE Y RESULTADO */}
          <div style={{ textAlign: 'center', margin: '20px 0', minHeight: 40 }}>
            {resultadoCrupier && (
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '8px 18px',
                  borderRadius: 20,
                  backgroundColor:
                    resultadoCrupier.ganador === 'j1'
                      ? 'rgba(47, 158, 68, 0.95)'
                      : resultadoCrupier.ganador === 'empate'
                      ? 'rgba(217, 119, 6, 0.95)'
                      : 'rgba(220, 38, 38, 0.95)',
                  color: '#FFFFFF',
                  boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
                  animation: 'aparecerEscala 0.25s ease'
                }}
              >
                {resultadoCrupier.ganador === 'j1' ? <Trophy size={18} /> : <AlertCircle size={18} />}
                <span style={{ fontSize: 13, fontWeight: 700 }}>
                  {resultadoCrupier.motivo}
                </span>
              </div>
            )}

            {faseCrupier === 'jugando' && (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '4px 14px',
                  borderRadius: 14,
                  backgroundColor: 'rgba(0,0,0,0.4)',
                  border: '1px solid rgba(212, 175, 55, 0.4)',
                  color: '#FDE68A',
                  fontSize: 12,
                  fontWeight: 700
                }}
              >
                <Coins size={14} color="#F59E0B" />
                Apuesta en mesa: {apuestaCrupier} pts
              </span>
            )}
          </div>

          {/* MANO DEL JUGADOR */}
          <div style={{ marginTop: 24, textAlign: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 10 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#E5E7EB', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Tu Mano ({perfil?.nombre || 'Tú'})
              </span>
              {faseCrupier !== 'apostando' && (
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 800,
                    padding: '2px 8px',
                    borderRadius: 6,
                    backgroundColor: scoreJugadorCrupier.sePaso
                      ? 'rgba(239, 68, 68, 0.3)'
                      : scoreJugadorCrupier.esBlackjack
                      ? 'rgba(217, 119, 6, 0.4)'
                      : 'rgba(52, 199, 89, 0.3)',
                    color: scoreJugadorCrupier.sePaso
                      ? '#FCA5A5'
                      : scoreJugadorCrupier.esBlackjack
                      ? '#FDE68A'
                      : '#86EFAC',
                    border: '1px solid rgba(255,255,255,0.1)'
                  }}
                >
                  {scoreJugadorCrupier.texto}
                </span>
              )}
            </div>

            {manoJugadorCrupier.length === 0 ? (
              <div
                style={{
                  height: 110,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '2px dashed rgba(255,255,255,0.15)',
                  borderRadius: 12,
                  maxWidth: 240,
                  margin: '0 auto',
                  color: 'rgba(255,255,255,0.4)',
                  fontSize: 13
                }}
              >
                Selecciona tu apuesta abajo
              </div>
            ) : (
              <div style={{ display: 'flex', justifyContent: 'center', gap: 10, flexWrap: 'wrap' }}>
                {manoJugadorCrupier.map((c, i) => (
                  <CartaPoker key={c.id || i} carta={c} tamano="md" />
                ))}
              </div>
            )}
          </div>

          {/* CONTROLES TÁCTILES DEL JUGADOR */}
          <div style={{ marginTop: 28, paddingTop: 18, borderTop: '1px solid rgba(255,255,255,0.12)' }}>
            {faseCrupier === 'apostando' || faseCrupier === 'resuelto' ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
                {/* Selector de Fichas */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
                  <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', fontWeight: 600 }}>
                    Elegir apuesta:
                  </span>
                  {[5, 10, 25, 50, 100].map(val => {
                    const permitida = val <= limiteApuesta
                    const seleccionada = apuestaCrupier === val
                    return (
                      <button
                        key={val}
                        type="button"
                        onClick={() => {
                          if (permitida) {
                            sound.playChipSound()
                            setApuestaCrupier(val)
                          }
                        }}
                        disabled={!permitida}
                        style={{
                          width: 44,
                          height: 44,
                          borderRadius: '50%',
                          border: seleccionada ? '2px solid #FDE68A' : '1px solid rgba(255,255,255,0.2)',
                          backgroundColor: seleccionada ? '#D97706' : '#1A2E20',
                          color: permitida ? '#FFFFFF' : 'rgba(255,255,255,0.3)',
                          fontSize: 12,
                          fontWeight: 800,
                          cursor: permitida ? 'pointer' : 'not-allowed',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          boxShadow: seleccionada ? '0 0 12px rgba(245, 158, 11, 0.6)' : 'none',
                          transform: seleccionada ? 'scale(1.08)' : 'none',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        {val}
                      </button>
                    )
                  })}
                </div>

                {/* Botón de Repartir */}
                <button
                  type="button"
                  onClick={iniciarManoCrupier}
                  disabled={cargandoCrupier || (perfil?.puntos_total || 0) < apuestaCrupier}
                  style={{
                    minHeight: 46,
                    padding: '0 28px',
                    borderRadius: 12,
                    border: 'none',
                    backgroundColor: '#D97706',
                    backgroundImage: 'linear-gradient(180deg, #F59E0B 0%, #D97706 100%)',
                    color: '#FFFFFF',
                    fontSize: 15,
                    fontWeight: 800,
                    cursor: 'pointer',
                    boxShadow: '0 4px 14px rgba(217, 119, 6, 0.4)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 8
                  }}
                >
                  {cargandoCrupier ? <Loader2 size={18} className="spin" /> : <Sparkles size={18} />}
                  <span>{faseCrupier === 'resuelto' ? 'Jugar Otra Mano' : 'Repartir Cartas'}</span>
                </button>
              </div>
            ) : (
              /* Botones de Acción de Blackjack durante el juego */
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={pedirCartaCrupier}
                  style={{
                    minHeight: 44,
                    padding: '8px 22px',
                    borderRadius: 10,
                    border: 'none',
                    backgroundColor: '#2563EB',
                    color: '#FFFFFF',
                    fontSize: 14,
                    fontWeight: 700,
                    cursor: 'pointer',
                    boxShadow: '0 3px 10px rgba(37, 99, 235, 0.4)'
                  }}
                >
                  Pedir Carta (+1)
                </button>

                <button
                  type="button"
                  onClick={() => plantarseCrupier()}
                  style={{
                    minHeight: 44,
                    padding: '8px 22px',
                    borderRadius: 10,
                    border: 'none',
                    backgroundColor: '#16A34A',
                    color: '#FFFFFF',
                    fontSize: 14,
                    fontWeight: 700,
                    cursor: 'pointer',
                    boxShadow: '0 3px 10px rgba(22, 163, 74, 0.4)'
                  }}
                >
                  Plantarse (Stand)
                </button>

                {manoJugadorCrupier.length === 2 && (perfil?.puntos_total || 0) >= apuestaCrupier && (
                  <button
                    type="button"
                    onClick={doblarApuestaCrupier}
                    style={{
                      minHeight: 44,
                      padding: '8px 20px',
                      borderRadius: 10,
                      border: '1px solid #F59E0B',
                      backgroundColor: 'rgba(245, 158, 11, 0.2)',
                      color: '#FDE68A',
                      fontSize: 13,
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    Doblar x2
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* VISTA B: DUELOS 1V1 EN TIEMPO REAL CON LA CLASE                        */}
      {/* ===================================================================== */}
      {subModo === 'pvp' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {avisoPvp && (
            <div
              style={{
                padding: '10px 14px',
                borderRadius: 10,
                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                color: '#EF4444',
                fontSize: 13,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 8
              }}
            >
              <span>{avisoPvp}</span>
              <button
                type="button"
                onClick={() => setAvisoPvp('')}
                style={{ background: 'none', border: 'none', color: '#EF4444', cursor: 'pointer' }}
              >
                <X size={15} />
              </button>
            </div>
          )}

          {/* SI HAY UNA PARTIDA 1v1 ACTIVA EN CURSO */}
          {partidaActivaPvp ? (
            <div
              style={{
                backgroundColor: '#0D381E',
                backgroundImage: 'radial-gradient(ellipse at center, #144B29 0%, #0B2B16 100%)',
                border: '6px solid #3F2312',
                borderRadius: 20,
                padding: 'clamp(14px, 3vw, 22px)',
                color: '#FFFFFF',
                boxShadow: '0 10px 30px rgba(0,0,0,0.4)'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <span style={{ fontSize: 13, fontWeight: 800, color: '#FDE68A', textTransform: 'uppercase', letterSpacing: 0.8 }}>
                  Duelo 21 en Directo · Bote: {partidaActivaPvp.apuesta * 2} pts
                </span>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    padding: '3px 8px',
                    borderRadius: 6,
                    backgroundColor: 'rgba(0,0,0,0.5)',
                    color: '#9CA3AF'
                  }}
                >
                  {partidaActivaPvp.estado === 'jugando' ? `Turno: ${partidaActivaPvp.turno}` : 'Finalizado'}
                </span>
              </div>

              {/* RIVAL */}
              <div style={{ marginBottom: 20, textAlign: 'center' }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#D1D5DB', marginBottom: 6 }}>
                  {perfil?.id === partidaActivaPvp.creador_id
                    ? partidaActivaPvp.oponente_nombre || 'Esperando oponente...'
                    : partidaActivaPvp.creador_nombre}
                </div>
                <div style={{ display: 'flex', justifyContent: 'center', gap: 8, flexWrap: 'wrap' }}>
                  {(perfil?.id === partidaActivaPvp.creador_id ? partidaActivaPvp.mano_oponente : partidaActivaPvp.mano_creador)?.map((c, i) => (
                    <CartaPoker key={c.id || i} carta={c} tamano="sm" />
                  ))}
                </div>
              </div>

              {/* TU MANO */}
              <div style={{ marginTop: 20, textAlign: 'center' }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#93C5FD', marginBottom: 6 }}>
                  Tu Mano ({perfil?.nombre || 'Tú'}) ·{' '}
                  {perfil?.id === partidaActivaPvp.creador_id ? scoreCreadorPvp?.texto : scoreOponentePvp?.texto}
                </div>
                <div style={{ display: 'flex', justifyContent: 'center', gap: 8, flexWrap: 'wrap' }}>
                  {(perfil?.id === partidaActivaPvp.creador_id ? partidaActivaPvp.mano_creador : partidaActivaPvp.mano_oponente)?.map((c, i) => (
                    <CartaPoker key={c.id || i} carta={c} tamano="md" />
                  ))}
                </div>
              </div>

              {/* CONTROLES SI ES MI TURNO */}
              <div style={{ marginTop: 24, textAlign: 'center' }}>
                {partidaActivaPvp.estado === 'jugando' ? (
                  ((perfil?.id === partidaActivaPvp.creador_id && partidaActivaPvp.turno === 'creador') ||
                   (perfil?.id === partidaActivaPvp.oponente_id && partidaActivaPvp.turno === 'oponente')) ? (
                    <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
                      <button
                        type="button"
                        onClick={pedirCartaPvp}
                        style={{
                          padding: '8px 18px',
                          borderRadius: 8,
                          backgroundColor: '#2563EB',
                          color: '#FFF',
                          border: 'none',
                          fontWeight: 700,
                          fontSize: 13,
                          cursor: 'pointer'
                        }}
                      >
                        Pedir Carta (+1)
                      </button>
                      <button
                        type="button"
                        onClick={plantarsePvp}
                        style={{
                          padding: '8px 18px',
                          borderRadius: 8,
                          backgroundColor: '#16A34A',
                          color: '#FFF',
                          border: 'none',
                          fontWeight: 700,
                          fontSize: 13,
                          cursor: 'pointer'
                        }}
                      >
                        Plantarse (Stand)
                      </button>
                    </div>
                  ) : (
                    <div style={{ fontSize: 13, color: '#FDE68A', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                      <Loader2 size={14} className="spin" />
                      <span>Esperando que el rival complete su jugada...</span>
                    </div>
                  )
                ) : (
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#FFFFFF', marginBottom: 10 }}>
                      {partidaActivaPvp.desenlace_motivo || 'Partida completada.'}
                    </div>
                    <button
                      type="button"
                      onClick={() => setPartidaActivaPvp(null)}
                      style={{
                        padding: '6px 16px',
                        borderRadius: 8,
                        backgroundColor: '#374151',
                        color: '#FFF',
                        border: 'none',
                        fontSize: 12,
                        cursor: 'pointer'
                      }}
                    >
                      Volver a la Sala
                    </button>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <>
              {/* CREAR NUEVO RETO 1v1 */}
              <div
                style={{
                  backgroundColor: 'var(--color-surface)',
                  borderRadius: 14,
                  border: '1px solid var(--color-separator)',
                  padding: '16px 20px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: 14
                }}
              >
                <div>
                  <h3 style={{ fontSize: 15, fontWeight: 700, margin: 0, color: 'var(--color-ink)' }}>
                    Abrir Mesa de Duelo 21
                  </h3>
                  <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--color-secondary-ink)' }}>
                    Crea un desafío de cartas para que cualquier compañero de clase juegue contra ti.
                  </p>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ display: 'flex', gap: 4 }}>
                    {[10, 25, 50, 100].map(v => (
                      <button
                        key={v}
                        type="button"
                        onClick={() => {
                          sound.playPop()
                          setApuestaPvp(v)
                        }}
                        style={{
                          padding: '6px 10px',
                          borderRadius: 6,
                          border: apuestaPvp === v ? '1px solid #D97706' : '1px solid var(--color-separator)',
                          backgroundColor: apuestaPvp === v ? 'rgba(217, 119, 6, 0.15)' : 'transparent',
                          color: apuestaPvp === v ? '#D97706' : 'var(--color-ink)',
                          fontSize: 12,
                          fontWeight: 700,
                          cursor: 'pointer'
                        }}
                      >
                        {v} pts
                      </button>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={crearRetoPvp}
                    disabled={cargandoPvp || (perfil?.puntos_total || 0) < apuestaPvp}
                    style={{
                      minHeight: 38,
                      padding: '0 16px',
                      borderRadius: 8,
                      border: 'none',
                      backgroundColor: '#D97706',
                      color: '#FFFFFF',
                      fontSize: 13,
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6
                    }}
                  >
                    {cargandoPvp ? <Loader2 size={14} className="spin" /> : <Plus size={14} />}
                    <span>Crear Mesa</span>
                  </button>
                </div>
              </div>

              {/* LOBBIES DISPONIBLES */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, color: 'var(--color-secondary-ink)' }}>
                    Mesas Disponibles en Directo ({lobbiesPvp.length})
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      sound.playPop()
                      fetchLobbiesPvp()
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#007AFF',
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4
                    }}
                  >
                    <RotateCcw size={12} />
                    Actualizar
                  </button>
                </div>

                {lobbiesPvp.length === 0 ? (
                  <div
                    style={{
                      padding: '28px 16px',
                      textAlign: 'center',
                      borderRadius: 12,
                      backgroundColor: 'var(--color-surface-secondary)',
                      border: '1px dashed var(--color-separator)',
                      color: 'var(--color-secondary-ink)',
                      fontSize: 13
                    }}
                  >
                    No hay mesas abiertas de 21. ¡Crea una arriba para retar a tus compañeros!
                  </div>
                ) : (
                  lobbiesPvp.map(lobby => {
                    const esMio = String(lobby.creador_id) === String(perfil?.id)
                    return (
                      <div
                        key={lobby.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '12px 16px',
                          borderRadius: 10,
                          backgroundColor: esMio ? 'rgba(217, 119, 6, 0.08)' : 'var(--color-surface)',
                          border: esMio ? '1px solid rgba(217, 119, 6, 0.35)' : '1px solid var(--color-separator)'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div
                            style={{
                              width: 36,
                              height: 36,
                              borderRadius: 8,
                              backgroundColor: lobby.creador?.color_acento || '#007AFF',
                              color: '#FFF',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontWeight: 800,
                              fontSize: 14
                            }}
                          >
                            {lobby.creador?.nombre ? lobby.creador.nombre.charAt(0).toUpperCase() : 'A'}
                          </div>
                          <div>
                            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-ink)' }}>
                              {lobby.creador?.nombre || lobby.creador_nombre || 'Alumno SMR2'}
                              {esMio && (
                                <span style={{ marginLeft: 6, fontSize: 10, color: '#D97706', fontWeight: 800 }}>
                                  (Tu Mesa)
                                </span>
                              )}
                            </div>
                            <div style={{ fontSize: 12, color: 'var(--color-secondary-ink)' }}>
                              Apuesta: <strong style={{ color: '#D97706' }}>{lobby.apuesta} pts</strong> · Bote: {lobby.apuesta * 2} pts
                            </div>
                          </div>
                        </div>

                        <div>
                          {esMio ? (
                            <button
                              type="button"
                              onClick={() => cancelarRetoPvp(lobby.id, lobby.apuesta)}
                              disabled={cargandoPvp}
                              style={{
                                padding: '6px 12px',
                                borderRadius: 6,
                                border: '1px solid rgba(239, 68, 68, 0.4)',
                                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                                color: '#EF4444',
                                fontSize: 12,
                                fontWeight: 600,
                                cursor: 'pointer'
                              }}
                            >
                              Cancelar
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => aceptarRetoPvp(lobby)}
                              disabled={cargandoPvp || (perfil?.puntos_total || 0) < lobby.apuesta}
                              style={{
                                padding: '6px 14px',
                                borderRadius: 6,
                                border: 'none',
                                backgroundColor: '#2F9E44',
                                color: '#FFF',
                                fontSize: 12,
                                fontWeight: 700,
                                cursor: 'pointer'
                              }}
                            >
                              Aceptar Duelo
                            </button>
                          )}
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
