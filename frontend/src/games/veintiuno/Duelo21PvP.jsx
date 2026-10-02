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
  // Función para limpiar campos ajenos a la tabla pvp_blackjack antes de enviar a Supabase
  const sanitizarParaSupabase = (obj) => {
    if (!obj) return {}
    const camposValidos = [
      'id', 'creador_id', 'creador_nombre', 'oponente_id', 'oponente_nombre',
      'apuesta', 'estado', 'turno', 'mano_creador', 'mano_oponente',
      'baraja_restante', 'ganador_id', 'desenlace_motivo', 'resolved_at'
    ]
    const limpio = {}
    camposValidos.forEach(k => {
      if (obj[k] !== undefined) limpio[k] = obj[k]
    })
    return limpio
  }

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
  const [repartiendo, setRepartiendo] = useState(false)
  const [rachaMesa, setRachaMesa] = useState(() => {
    return Number(localStorage.getItem('muudel_21_racha_' + perfil?.id) || 0)
  })

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

    // 1. Canal Realtime nativo de Supabase en Postgres
    const canalLive = supabase
      .channel('pvp-blackjack-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pvp_blackjack' }, (payload) => {
        fetchLobbiesPvp()
        if (payload?.new && partidaActivaPvp && payload.new.id === partidaActivaPvp.id) {
          setPartidaActivaPvp(payload.new)
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pvp_partidas' }, () => {
        fetchLobbiesPvp()
      })
      .subscribe()

    // 2. Hub de eventos de clase (Broadcast)
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
    const des5 = suscribirEvento('pvp_21_partida_iniciada', (payload) => {
      if (payload?.partida) {
        if (partidaActivaPvp?.id === payload.partidaId || payload.partida.creador_id === perfil?.id || payload.partida.oponente_id === perfil?.id) {
          setPartidaActivaPvp(payload.partida)
          sound.playCardDeal()
        }
        fetchLobbiesPvp()
      }
    })

    return () => {
      des1()
      des2()
      des3()
      des4()
      des5()
      supabase.removeChannel(canalLive)
    }
  }, [partidaActivaPvp?.id, perfil?.id])

  // =========================================================================
  // LÓGICA MESA CRUPIER (SOLO / PRÁCTICA)
  // =========================================================================

  const iniciarManoCrupier = async () => {
    if (!perfil || (perfil.puntos_total || 0) < apuestaCrupier || repartiendo) {
      sound.playPop()
      return
    }

    setRepartiendo(true)
    setCargandoCrupier(true)
    sound.playChipSound()

    // Deducir apuesta inicial en interfaz local (se liquida al finalizar mano con /api/ruleta/casino-liquidar)
    const saldoTrasApuesta = (perfil.puntos_total || 0) - apuestaCrupier
    const perfilActualizado = { ...perfil, puntos_total: saldoTrasApuesta }
    setPerfil(perfilActualizado)
    localStorage.setItem('racha_local_user', JSON.stringify(perfilActualizado))

    // Barajar 2 barajas para mayor aleatoriedad
    const nuevaBaraja = crearBarajaBarajada(2)

    // Repartir 2 cartas al jugador y 2 al crupier (la 2da del crupier boca abajo)
    const c1_j = nuevaBaraja.pop()
    const c1_d = nuevaBaraja.pop()
    const c2_j = nuevaBaraja.pop()
    const c2_d = { ...nuevaBaraja.pop(), oculta: true }

    setBarajaCrupier(nuevaBaraja)
    setManoJugadorCrupier([])
    setManoDealerCrupier([])
    setResultadoCrupier(null)
    setFaseCrupier('jugando')

    // Secuencia física de reparto realista de casino con audio y delays
    sound.playCardDeal()
    setManoJugadorCrupier([c1_j])

    setTimeout(() => {
      sound.playCardDeal()
      setManoDealerCrupier([c1_d])

      setTimeout(() => {
        sound.playCardDeal()
        setManoJugadorCrupier([c1_j, c2_j])

        setTimeout(() => {
          sound.playCardDeal()
          setManoDealerCrupier([c1_d, c2_d])
          setRepartiendo(false)
          setCargandoCrupier(false)

          // Comprobar Blackjack natural inmediato
          const scoreJ = calcularPuntuacionMano([c1_j, c2_j])
          if (scoreJ.esBlackjack) {
            setTimeout(() => {
              // Revelar carta oculta del crupier con giro 3D
              const dRevelada = { ...c2_d, oculta: false, fueRevelada: true }
              setManoDealerCrupier([c1_d, dRevelada])
              resolverFinCrupier([c1_j, c2_j], [c1_d, dRevelada], apuestaCrupier)
            }, 650)
          }
        }, 180)
      }, 180)
    }, 180)
  }

  const pedirCartaCrupier = () => {
    if (faseCrupier !== 'jugando' || repartiendo) return
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
      const manoDRev = manoDealerCrupier.map(c => ({ ...c, oculta: false, fueRevelada: true }))
      setManoDealerCrupier(manoDRev)
      resolverFinCrupier(nuevaManoJ, manoDRev, apuestaCrupier)
    }
  }

  const doblarApuestaCrupier = async () => {
    if (faseCrupier !== 'jugando' || manoJugadorCrupier.length !== 2 || repartiendo) return
    if ((perfil.puntos_total || 0) < apuestaCrupier) {
      sound.playPop()
      return
    }

    sound.playChipSound()
    // Deducir el monto adicional para doblar en interfaz local
    const saldoTrasDoblar = (perfil.puntos_total || 0) - apuestaCrupier
    const perfilActualizado = { ...perfil, puntos_total: saldoTrasDoblar }
    setPerfil(perfilActualizado)
    localStorage.setItem('racha_local_user', JSON.stringify(perfilActualizado))

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
    setRepartiendo(true)

    // 1. Revelar carta tapada del crupier con animación 3D
    let baraja = [...barajaActual]
    let manoD = manoDealerCrupier.map(c => ({ ...c, oculta: false, fueRevelada: true }))
    setManoDealerCrupier(manoD)

    // Si el jugador ya se pasó, no hace falta que el crupier pida más
    const scoreJ = calcularPuntuacionMano(manoJActual)
    if (scoreJ.sePaso) {
      setRepartiendo(false)
      resolverFinCrupier(manoJActual, manoD, betActual)
      return
    }

    // 2. Crupier pide secuencialmente hasta tener al menos 17 puntos
    let scoreD = calcularPuntuacionMano(manoD)

    const robarSiguiente = () => {
      if (scoreD.total < 17 && baraja.length > 0) {
        setTimeout(() => {
          const c = baraja.pop()
          manoD.push(c)
          sound.playCardDeal()
          scoreD = calcularPuntuacionMano(manoD)
          setBarajaCrupier([...baraja])
          setManoDealerCrupier([...manoD])
          robarSiguiente()
        }, 420)
      } else {
        setRepartiendo(false)
        resolverFinCrupier(manoJActual, manoD, betActual)
      }
    }

    setTimeout(() => {
      robarSiguiente()
    }, 380)
  }

  const resolverFinCrupier = async (manoJ, manoD, bet) => {
    setFaseCrupier('resuelto')
    const desenlace = determinarDesenlace(manoJ, manoD)
    setResultadoCrupier(desenlace)

    let gananciaNeta = 0
    let cobroTotal = 0
    let nuevaRacha = rachaMesa

    if (desenlace.ganador === 'j1') {
      // Ganó el jugador: racha cosmética en mesa (sin multiplicador inflacionario)
      nuevaRacha = rachaMesa + 1
      setRachaMesa(nuevaRacha)
      localStorage.setItem('muudel_21_racha_' + perfil?.id, String(nuevaRacha))

      // Regla de ventaja de la casa: 5% rake sobre ganancias netas (mínimo 1 SE)
      const gananciaBruta = Math.floor(bet * (desenlace.multiplicador - 1))
      const comision = gananciaBruta > 0 ? Math.max(1, Math.floor(gananciaBruta * 0.05)) : 0
      cobroTotal = bet + Math.max(0, gananciaBruta - comision)
      gananciaNeta = cobroTotal - bet

      sound.playWin()
      triggerConfetti()
    } else if (desenlace.ganador === 'empate') {
      // Empate: devolución de la apuesta sin romper racha cosmética
      cobroTotal = bet
      sound.playPop()
    } else {
      // Derrota: reinicio de racha cosmética en la mesa
      nuevaRacha = 0
      setRachaMesa(0)
      localStorage.setItem('muudel_21_racha_' + perfil?.id, '0')
      sound.playLose()
    }

    let saldoFinal = (perfil?.puntos_total || 0) + (cobroTotal - bet)

    // Liquidar partida en el servidor contra la Banca
    try {
      const headers = { 'Content-Type': 'application/json' }
      try {
        const { data: sData } = await supabase.auth.getSession()
        if (sData?.session?.access_token) headers['Authorization'] = `Bearer ${sData.session.access_token}`
      } catch (_) {}
      if (perfil?.id) headers['x-user-id'] = perfil.id

      const cResp = await fetch('/api/ruleta/casino-liquidar', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          apuesta: bet,
          premio: cobroTotal,
          juego: 'duelo21_crupier',
          detalles: { manoJ, manoD, desenlace: desenlace.ganador, racha: nuevaRacha },
          idempotency_key: `crupier21_${perfil?.id}_${Date.now()}`
        })
      })
      const cData = await cResp.json()
      if (cData?.nuevoSaldo !== undefined) {
        saldoFinal = cData.nuevoSaldo
      }
    } catch (_) {}

    const perfilActualizado = { ...perfil, puntos_total: saldoFinal }
    setPerfil(perfilActualizado)
    localStorage.setItem('racha_local_user', JSON.stringify(perfilActualizado))
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
      const headers = { 'Content-Type': 'application/json' }
      try {
        const { data: sData } = await supabase.auth.getSession()
        if (sData?.session?.access_token) headers['Authorization'] = `Bearer ${sData.session.access_token}`
      } catch (_) {}
      if (perfil?.id) headers['x-user-id'] = perfil.id

      await fetch('/api/ruleta/pvp-apostar', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          cantidad: apuestaPvp,
          partidaId: 'crear_' + Date.now(),
          juego: 'blackjack_21',
          idempotency_key: `stake_21_create_${perfil.id}_${Date.now()}`
        })
      })
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
        // Fallback a pvp_partidas en Supabase (siempre disponible)
        try {
          const { data: pData } = await supabase.from('pvp_partidas').insert([{
            creador_id: perfil.id,
            apuesta: apuestaPvp,
            estado: 'esperando',
            dado1_creador: 21,
            resultado_creador: calcularPuntuacionMano(manoCreador).total
          }]).select().single()

          if (pData) {
            setPartidaActivaPvp({ ...nuevoLobby, id: pData.id, creador: perfil })
          } else {
            const prev = JSON.parse(localStorage.getItem('muudel_pvp_21_lobbies') || '[]')
            localStorage.setItem('muudel_pvp_21_lobbies', JSON.stringify([nuevoLobby, ...prev]))
            setPartidaActivaPvp({ ...nuevoLobby, creador: perfil })
          }
        } catch (_) {
          const prev = JSON.parse(localStorage.getItem('muudel_pvp_21_lobbies') || '[]')
          localStorage.setItem('muudel_pvp_21_lobbies', JSON.stringify([nuevoLobby, ...prev]))
          setPartidaActivaPvp({ ...nuevoLobby, creador: perfil })
        }
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
      const headers = { 'Content-Type': 'application/json' }
      try {
        const { data: sData } = await supabase.auth.getSession()
        if (sData?.session?.access_token) headers['Authorization'] = `Bearer ${sData.session.access_token}`
      } catch (_) {}
      if (perfil?.id) headers['x-user-id'] = perfil.id

      await fetch('/api/ruleta/pvp-cancelar', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          cantidad: betAmt,
          partidaId,
          juego: 'blackjack_21',
          idempotency_key: `refund_21_${partidaId}_${perfil.id}`
        })
      })
      await supabase.from('pvp_blackjack').update({ estado: 'cancelado' }).eq('id', partidaId)
      await supabase.from('pvp_partidas').update({ estado: 'cancelado' }).eq('id', partidaId)
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
    if (!lobby) return

    if (!perfil) {
      sound.playPop()
      setAvisoPvp('Debes iniciar sesión para aceptar duelos de 21.')
      return
    }

    if (String(lobby.creador_id) === String(perfil?.id)) {
      sound.playPop()
      setAvisoPvp('Esta es tu propia mesa creada. Espera a que un compañero acepte o cancélala para recuperar tus monedas.')
      return
    }

    if ((perfil.puntos_total || 0) < lobby.apuesta) {
      sound.playPop()
      setAvisoPvp(`Saldo insuficiente: Esta mesa requiere ${lobby.apuesta} monedas pero solo tienes ${perfil.puntos_total || 0} monedas. ¡Gana monedas en Yoshi Runner o pide un aporte al profesor!`)
      return
    }

    setCargandoPvp(true)
    sound.playChipSound()

    // Deducir apuesta al oponente que entra
    const saldoTrasEntrar = Math.max(0, (perfil.puntos_total || 0) - lobby.apuesta)
    const perfilActualizado = { ...perfil, puntos_total: saldoTrasEntrar }
    setPerfil(perfilActualizado)
    localStorage.setItem('racha_local_user', JSON.stringify(perfilActualizado))

    try {
      const headers = { 'Content-Type': 'application/json' }
      try {
        const { data: sData } = await supabase.auth.getSession()
        if (sData?.session?.access_token) headers['Authorization'] = `Bearer ${sData.session.access_token}`
      } catch (_) {}
      if (perfil?.id) headers['x-user-id'] = perfil.id

      await fetch('/api/ruleta/pvp-apostar', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          cantidad: lobby.apuesta,
          partidaId: lobby.id,
          juego: 'blackjack_21',
          idempotency_key: `stake_21_join_${lobby.id}_${perfil.id}`
        })
      })
    } catch (_) {}

    // Normalizar mano del creador si vino como string
    let manoCreador = lobby.mano_creador
    if (typeof manoCreador === 'string') {
      try { manoCreador = JSON.parse(manoCreador) } catch (_) { manoCreador = [] }
    }
    if (!Array.isArray(manoCreador) || manoCreador.length === 0) {
      const bTemp = crearBarajaBarajada(2)
      manoCreador = [bTemp.pop(), bTemp.pop()]
    }

    // Tomar 2 cartas de la baraja existente para el oponente
    let baraja = lobby.baraja_restante
    if (typeof baraja === 'string') {
      try { baraja = JSON.parse(baraja) } catch (_) { baraja = [] }
    }
    if (!Array.isArray(baraja) || baraja.length < 4) {
      baraja = crearBarajaBarajada(2)
    }
    const o1 = baraja.pop()
    const o2 = baraja.pop()
    const manoOponente = [o1, o2]

    const partidaActualizada = {
      ...lobby,
      mano_creador: manoCreador,
      oponente_id: perfil.id,
      oponente_nombre: perfil.nombre || 'Contrincante',
      estado: 'jugando',
      turno: 'creador', // El creador juega su turno primero
      mano_oponente: manoOponente,
      baraja_restante: baraja
    }

    setPartidaActivaPvp(partidaActualizada)

    // Actualizar en localStorage
    try {
      const prev = JSON.parse(localStorage.getItem('muudel_pvp_21_lobbies') || '[]')
      const actualizados = prev.map(l => l.id === lobby.id ? partidaActualizada : l)
      localStorage.setItem('muudel_pvp_21_lobbies', JSON.stringify(actualizados))
    } catch (_) {}

    // Sanitizar objeto para Supabase pvp_blackjack sin propiedades extrañas
    const datosLimpios = sanitizarParaSupabase(partidaActualizada)
    try {
      await supabase.from('pvp_blackjack').update(datosLimpios).eq('id', lobby.id)
      await supabase.from('pvp_partidas').update({ oponente_id: perfil.id, estado: 'jugando' }).eq('id', lobby.id)
    } catch (_) {}

    transmitirEvento('pvp_21_jugada', { partidaId: lobby.id, partida: partidaActualizada })
    transmitirEvento('pvp_21_partida_iniciada', { partidaId: lobby.id, partida: partidaActualizada })
    sound.playCardDeal()
    setCargandoPvp(false)
  }

  // Acciones dentro de la partida 1v1 activa
  const pedirCartaPvp = async () => {
    if (!partidaActivaPvp || partidaActivaPvp.estado !== 'jugando') return

    const esCreador = String(perfil?.id) === String(partidaActivaPvp.creador_id)
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
      await supabase.from('pvp_blackjack').update(sanitizarParaSupabase(partidaActualizada)).eq('id', partidaActivaPvp.id)
    } catch (_) {}

    transmitirEvento('pvp_21_jugada', { partidaId: partidaActivaPvp.id, partida: partidaActualizada })
  }

  const plantarsePvp = async () => {
    if (!partidaActivaPvp || partidaActivaPvp.estado !== 'jugando') return

    const esCreador = String(perfil?.id) === String(partidaActivaPvp.creador_id)
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
        await supabase.from('pvp_blackjack').update(sanitizarParaSupabase(partidaActualizada)).eq('id', partidaActivaPvp.id)
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

    // Liquidar puntos mediante endpoint centralizado con rake del 5% a la Banca
    try {
      if (ganadorId && ganadorId !== 'empate') {
        const headers = { 'Content-Type': 'application/json' }
        try {
          const { data: sData } = await supabase.auth.getSession()
          if (sData?.session?.access_token) headers['Authorization'] = `Bearer ${sData.session.access_token}`
        } catch (_) {}
        if (perfil?.id) headers['x-user-id'] = perfil.id

        const pvpResp = await fetch('/api/admin/comision-pvp', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            ganadorId,
            bote: boteTotal,
            juego: 'blackjack_21',
            partidaId: partidaActivaPvp.id,
            idempotency_key: `pvp_21_${partidaActivaPvp.id}_${ganadorId}`
          })
        })
        const pvpData = await pvpResp.json()

        if (ganadorId === perfil?.id && pvpData?.nuevoSaldoGanador !== undefined) {
          const nuevoSaldo = pvpData.nuevoSaldoGanador
          setPerfil(p => ({ ...p, puntos_total: nuevoSaldo }))
          localStorage.setItem('racha_local_user', JSON.stringify({ ...perfil, puntos_total: nuevoSaldo }))
        }
      } else if (ganadorId === 'empate') {
        // Empate: devolución de la apuesta
        if (partidaActivaPvp.creador_id === perfil?.id || partidaActivaPvp.oponente_id === perfil?.id) {
          const nuevoSaldo = (perfil?.puntos_total || 0) + partidaActivaPvp.apuesta
          setPerfil(p => ({ ...p, puntos_total: nuevoSaldo }))
          localStorage.setItem('racha_local_user', JSON.stringify({ ...perfil, puntos_total: nuevoSaldo }))
        }
      }
    } catch (errPuntos) {
      console.warn('Aviso al liquidar puntos en BD 21:', errPuntos)
    }

    // Efectos y estado local para el usuario activo
    if (ganadorId === perfil?.id) {
      sound.playWin()
      triggerConfetti()
    } else if (ganadorId === 'empate') {
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
      await supabase.from('pvp_blackjack').update(sanitizarParaSupabase(partidaFinal)).eq('id', partidaId)
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

          <style>{`
            @keyframes pulsoFuego {
              0% { box-shadow: 0 0 8px rgba(245, 158, 11, 0.4); transform: scale(1); }
              100% { box-shadow: 0 0 18px rgba(245, 158, 11, 0.85); transform: scale(1.03); }
            }
            @keyframes brilloBlackjack {
              0% { text-shadow: 0 0 6px #F59E0B; }
              50% { text-shadow: 0 0 20px #FDE68A, 0 0 30px #F59E0B; }
              100% { text-shadow: 0 0 6px #F59E0B; }
            }
          `}</style>

          {/* BARRA SUPERIOR DE LA MESA: RACHA + REGLAS + ZAPATO DE CARTAS */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 16,
              flexWrap: 'wrap',
              gap: 10,
              paddingBottom: 10,
              borderBottom: '1px solid rgba(212, 175, 55, 0.2)'
            }}
          >
            {/* Racha de Victorias en Mesa */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              {rachaMesa > 0 ? (
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '4px 12px',
                    borderRadius: 20,
                    backgroundColor: 'rgba(245, 158, 11, 0.22)',
                    border: '1px solid rgba(245, 158, 11, 0.6)',
                    color: '#FDE68A',
                    fontSize: 12,
                    fontWeight: 800,
                    boxShadow: '0 0 12px rgba(245, 158, 11, 0.4)',
                    animation: 'pulsoFuego 1.2s infinite alternate'
                  }}
                >
                  <Flame size={15} color="#F59E0B" />
                  <span>Racha: {rachaMesa}x {rachaMesa >= 4 ? '(+50% BONUS)' : rachaMesa === 3 ? '(+25% BONUS)' : rachaMesa === 2 ? '(+10% BONUS)' : ''}</span>
                </span>
              ) : (
                <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', fontWeight: 600 }}>
                  Empieza tu racha ganando a la banca
                </span>
              )}
            </div>

            {/* Inscripción dorada de paño */}
            <div
              style={{
                fontSize: 11,
                fontWeight: 800,
                textTransform: 'uppercase',
                letterSpacing: 1.2,
                color: 'rgba(253, 230, 138, 0.8)',
                textAlign: 'center'
              }}
            >
              Mesa Oficial de 21 · Blackjack Paga 3:2
            </div>

            {/* Zapato de cartas físico */}
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '4px 10px',
                borderRadius: 8,
                backgroundColor: 'rgba(0,0,0,0.45)',
                border: '1px solid rgba(255,255,255,0.15)',
                color: '#D1D5DB',
                fontSize: 11,
                fontFamily: 'monospace'
              }}
              title="Zapato de cartas de casino"
            >
              <Layers size={13} color="#9CA3AF" />
              <span>{barajaCrupier.length > 0 ? barajaCrupier.length : 104} cartas</span>
            </div>
          </div>

          {/* MANO DEL CRUPIER */}
          <div style={{ marginBottom: 24, textAlign: 'center' }}>
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
                  <CartaPoker
                    key={c.id || i}
                    carta={c}
                    tamano="md"
                    animarEntrada={true}
                    delayAnimacion={i * 0.12}
                  />
                ))}
              </div>
            )}
          </div>

          {/* ÁREA CENTRAL: BOTE Y RESULTADO */}
          <div style={{ textAlign: 'center', margin: '16px 0', minHeight: 40 }}>
            {resultadoCrupier && (
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '9px 20px',
                  borderRadius: 20,
                  backgroundColor:
                    resultadoCrupier.ganador === 'j1'
                      ? 'rgba(47, 158, 68, 0.95)'
                      : resultadoCrupier.ganador === 'empate'
                      ? 'rgba(217, 119, 6, 0.95)'
                      : 'rgba(220, 38, 38, 0.95)',
                  color: '#FFFFFF',
                  boxShadow: '0 4px 20px rgba(0,0,0,0.45)',
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
                  padding: '5px 16px',
                  borderRadius: 14,
                  backgroundColor: 'rgba(0,0,0,0.5)',
                  border: '1px solid rgba(212, 175, 55, 0.45)',
                  color: '#FDE68A',
                  fontSize: 13,
                  fontWeight: 800
                }}
              >
                <Coins size={15} color="#F59E0B" />
                Apuesta en mesa: {apuestaCrupier} SE 💶
              </span>
            )}
          </div>

          {/* MANO DEL JUGADOR */}
          <div style={{ marginTop: 20, textAlign: 'center' }}>
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
                    border: '1px solid rgba(255,255,255,0.1)',
                    animation: scoreJugadorCrupier.esBlackjack ? 'brilloBlackjack 1.5s infinite' : 'none'
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
                  <CartaPoker
                    key={c.id || i}
                    carta={c}
                    tamano="md"
                    animarEntrada={true}
                    delayAnimacion={i * 0.12}
                    resaltar={scoreJugadorCrupier.esBlackjack || scoreJugadorCrupier.total === 21}
                  />
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
                  disabled={cargandoCrupier || repartiendo || (perfil?.puntos_total || 0) < apuestaCrupier}
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
                    gap: 8,
                    opacity: repartiendo ? 0.6 : 1
                  }}
                >
                  {cargandoCrupier || repartiendo ? <Loader2 size={18} className="spin" /> : <Sparkles size={18} />}
                  <span>{repartiendo ? 'Repartiendo...' : faseCrupier === 'resuelto' ? 'Jugar Otra Mano' : 'Repartir Cartas'}</span>
                </button>
              </div>
            ) : (
              /* Botones de Acción de Blackjack durante el juego */
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={pedirCartaCrupier}
                  disabled={repartiendo}
                  style={{
                    minHeight: 44,
                    padding: '8px 22px',
                    borderRadius: 10,
                    border: 'none',
                    backgroundColor: '#2563EB',
                    color: '#FFFFFF',
                    fontSize: 14,
                    fontWeight: 700,
                    cursor: repartiendo ? 'not-allowed' : 'pointer',
                    boxShadow: '0 3px 10px rgba(37, 99, 235, 0.4)',
                    opacity: repartiendo ? 0.5 : 1
                  }}
                >
                  Pedir Carta (+1)
                </button>

                <button
                  type="button"
                  onClick={() => plantarseCrupier()}
                  disabled={repartiendo}
                  style={{
                    minHeight: 44,
                    padding: '8px 22px',
                    borderRadius: 10,
                    border: 'none',
                    backgroundColor: '#16A34A',
                    color: '#FFFFFF',
                    fontSize: 14,
                    fontWeight: 700,
                    cursor: repartiendo ? 'not-allowed' : 'pointer',
                    boxShadow: '0 3px 10px rgba(22, 163, 74, 0.4)',
                    opacity: repartiendo ? 0.5 : 1
                  }}
                >
                  Plantarse (Stand)
                </button>

                {manoJugadorCrupier.length === 2 && (perfil?.puntos_total || 0) >= apuestaCrupier && (
                  <button
                    type="button"
                    onClick={doblarApuestaCrupier}
                    disabled={repartiendo}
                    style={{
                      minHeight: 44,
                      padding: '8px 20px',
                      borderRadius: 10,
                      border: '1px solid #F59E0B',
                      backgroundColor: 'rgba(245, 158, 11, 0.2)',
                      color: '#FDE68A',
                      fontSize: 13,
                      fontWeight: 700,
                      cursor: repartiendo ? 'not-allowed' : 'pointer',
                      opacity: repartiendo ? 0.5 : 1
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
                  Duelo 21 en Directo · Bote: {partidaActivaPvp.apuesta * 2} SE 💶
                </span>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    padding: '3px 8px',
                    borderRadius: 6,
                    backgroundColor: 'rgba(0,0,0,0.5)',
                    color: partidaActivaPvp.estado === 'esperando' ? '#FDE68A' : '#9CA3AF'
                  }}
                >
                  {partidaActivaPvp.estado === 'esperando'
                    ? 'Esperando Rival ⏳'
                    : partidaActivaPvp.estado === 'jugando'
                    ? `Turno: ${partidaActivaPvp.turno === 'creador' ? (partidaActivaPvp.creador_nombre || 'Creador') : (partidaActivaPvp.oponente_nombre || 'Oponente')}`
                    : 'Finalizado'}
                </span>
              </div>

              {/* CONTENIDO SEGÚN ESTADO DE LA PARTIDA */}
              {partidaActivaPvp.estado === 'esperando' ? (
                <div style={{ textAlign: 'center', padding: '24px 16px' }}>
                  <Loader2 size={36} color="#FDE68A" className="spin" style={{ margin: '0 auto 12px' }} />
                  <h4 style={{ margin: 0, fontSize: 16, color: '#FDE68A', fontWeight: 800 }}>
                    Mesa de Duelo Abierta
                  </h4>
                  <p style={{ margin: '6px 0 16px', fontSize: 13, color: '#D1D5DB' }}>
                    Bote acumulado: <strong>{partidaActivaPvp.apuesta * 2} SE 💶</strong>. Esperando a que un compañero de clase pulse &quot;Aceptar Duelo&quot;.
                  </p>
                  <button
                    type="button"
                    onClick={() => cancelarRetoPvp(partidaActivaPvp.id, partidaActivaPvp.apuesta)}
                    style={{
                      padding: '8px 18px',
                      borderRadius: 8,
                      border: '1px solid rgba(239, 68, 68, 0.5)',
                      backgroundColor: 'rgba(239, 68, 68, 0.15)',
                      color: '#EF4444',
                      fontWeight: 700,
                      fontSize: 12,
                      cursor: 'pointer'
                    }}
                  >
                    Cancelar Mesa y Recuperar {partidaActivaPvp.apuesta} SE 💶
                  </button>
                </div>
              ) : (
                <>
                  {/* RIVAL */}
                  <div style={{ marginBottom: 20, textAlign: 'center' }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#D1D5DB', marginBottom: 6 }}>
                      {String(perfil?.id) === String(partidaActivaPvp.creador_id)
                        ? partidaActivaPvp.oponente_nombre || 'Rival'
                        : partidaActivaPvp.creador_nombre}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'center', gap: 8, flexWrap: 'wrap' }}>
                      {(String(perfil?.id) === String(partidaActivaPvp.creador_id) ? partidaActivaPvp.mano_oponente : partidaActivaPvp.mano_creador)?.map((c, i) => (
                        <CartaPoker key={c?.id || i} carta={c} tamano="sm" />
                      ))}
                    </div>
                  </div>

                  {/* TU MANO */}
                  <div style={{ marginTop: 20, textAlign: 'center' }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#93C5FD', marginBottom: 6 }}>
                      Tu Mano ({perfil?.nombre || 'Tú'}) ·{' '}
                      {String(perfil?.id) === String(partidaActivaPvp.creador_id) ? scoreCreadorPvp?.texto : scoreOponentePvp?.texto}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'center', gap: 8, flexWrap: 'wrap' }}>
                      {(String(perfil?.id) === String(partidaActivaPvp.creador_id) ? partidaActivaPvp.mano_creador : partidaActivaPvp.mano_oponente)?.map((c, i) => (
                        <CartaPoker key={c?.id || i} carta={c} tamano="md" />
                      ))}
                    </div>
                  </div>

                  {/* CONTROLES */}
                  <div style={{ marginTop: 24, textAlign: 'center' }}>
                    {partidaActivaPvp.estado === 'jugando' ? (
                      ((String(perfil?.id) === String(partidaActivaPvp.creador_id) && partidaActivaPvp.turno === 'creador') ||
                       (String(perfil?.id) === String(partidaActivaPvp.oponente_id) && partidaActivaPvp.turno === 'oponente')) ? (
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
                </>
              )}
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
                        {v} SE
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
                              Apuesta: <strong style={{ color: '#D97706' }}>{lobby.apuesta} SE 💶</strong> · Bote: {lobby.apuesta * 2} SE 💶
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
                              disabled={cargandoPvp}
                              style={{
                                padding: '7px 16px',
                                borderRadius: 8,
                                border: 'none',
                                backgroundColor: (perfil?.puntos_total || 0) < lobby.apuesta ? 'rgba(217, 119, 6, 0.15)' : '#2F9E44',
                                color: (perfil?.puntos_total || 0) < lobby.apuesta ? '#D97706' : '#FFF',
                                fontSize: 12,
                                fontWeight: 700,
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 6,
                                transition: 'all 0.15s ease'
                              }}
                              title={(perfil?.puntos_total || 0) < lobby.apuesta ? `Requiere ${lobby.apuesta} StevenEuros` : `Entrar al duelo por ${lobby.apuesta} StevenEuros`}
                            >
                              {cargandoPvp ? (
                                <>
                                  <Loader2 size={13} className="spin" />
                                  <span>Entrando...</span>
                                </>
                              ) : (perfil?.puntos_total || 0) < lobby.apuesta ? (
                                <span>Requiere {lobby.apuesta} SE 💶</span>
                              ) : (
                                <span>Aceptar Duelo</span>
                              )}
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
