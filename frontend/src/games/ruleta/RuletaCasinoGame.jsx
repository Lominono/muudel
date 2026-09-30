// frontend/src/games/ruleta/RuletaCasinoGame.jsx
import { useState, useEffect, useRef, useCallback } from 'react'
import { sound, triggerConfetti } from '../../utils/haptics'
import { supabase } from '../../utils/supabase'
import { transmitirEvento } from '../../utils/realtimeHub'
import {
  RotateCcw,
  Sparkles,
  Trophy,
  History,
  Coins,
  Trash2,
  Copy
} from 'lucide-react'

// Secuencia oficial de la Ruleta Europea (37 sectores)
const ROULETTE_NUMBERS = [
  0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26
]

const RED_NUMBERS = new Set([
  1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36
])

const BLACK_NUMBERS = new Set([
  2, 4, 6, 8, 10, 11, 13, 15, 17, 20, 22, 24, 26, 28, 29, 31, 33, 35
])

const FICHAS_DISPONIBLES = [
  { valor: 1, color: '#8E8E93', borde: '#636366', texto: '#FFF' },
  { valor: 2, color: '#30D158', borde: '#248A3D', texto: '#FFF' },
  { valor: 5, color: '#FF3B30', borde: '#D70015', texto: '#FFF' },
  { valor: 10, color: '#007AFF', borde: '#0051A8', texto: '#FFF' },
  { valor: 20, color: '#FF9500', borde: '#C97500', texto: '#FFF' },
]

export const APUESTA_MAXIMA_MESA = 25

const TOTAL_SECTORS = ROULETTE_NUMBERS.length
const ANGLE_PER_SECTOR = (Math.PI * 2) / TOTAL_SECTORS

function generateSecureRandomClient(max) {
  const array = new Uint32Array(1)
  crypto.getRandomValues(array)
  return array[0] % max
}

async function obtenerNumeroGanadorServidor(token) {
  try {
    const resp = await fetch('/api/ruleta/girar', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    })
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
    const data = await resp.json()
    return data.numeroGanador
  } catch (e) {
    return null
  }
}

// Helper: get color for a roulette number
function getNumColor(num) {
  if (num === 0) return '#34C759'
  if (RED_NUMBERS.has(num)) return '#FF3B30'
  return '#1C1C1E'
}

// Cubic ease-out for smooth deceleration
function easeOutCubic(t) {
  return 1 - Math.pow(1 - t, 3)
}

export function RuletaCasinoGame({ perfil, setPerfil }) {
  const canvasRef = useRef(null)
  const animFrameRef = useRef(null)

  // Estados del juego
  const [girando, setGirando] = useState(false)
  const [fichaSeleccionada, setFichaSeleccionada] = useState(1)
  const [apuestas, setApuestas] = useState({})
  const [ultimaApuesta, setUltimaApuesta] = useState(null)
  const [ultimoNumero, setUltimoNumero] = useState(null)
  const [historial, setHistorial] = useState(() => {
    try {
      const h = localStorage.getItem('muudel_ruleta_historial')
      return h ? JSON.parse(h) : [14, 31, 9, 22, 0, 7, 28]
    } catch (e) {
      return [14, 31, 9, 22, 0, 7, 28]
    }
  })
  const [resultadoGanancia, setResultadoGanancia] = useState(null)
  const [solicitandoBono, setSolicitandoBono] = useState(false)
  const fechaHoy = new Date().toISOString().slice(0, 10)
  const bonoStorageKey = `muudel_bono_ruleta_${fechaHoy}_${perfil?.id || 'anon'}`
  const [yaReclamoBonoHoy, setYaReclamoBonoHoy] = useState(() => {
    try {
      return !!localStorage.getItem(`muudel_bono_ruleta_${new Date().toISOString().slice(0, 10)}_${perfil?.id || 'anon'}`)
    } catch (e) {
      return false
    }
  })

  // Canvas sizing — responsive to container
  const [canvasSize, setCanvasSize] = useState(300)
  const containerRef = useRef(null)

  // Persistent wheel angle so the wheel stays where it stopped
  const wheelAngleRef = useRef(0)

  const totalApostado = Object.values(apuestas).reduce((acc, curr) => acc + curr, 0)
  const saldoActual = perfil?.puntos_total || 0

  // Responsive canvas sizing
  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        const w = containerRef.current.clientWidth
        const sz = Math.min(w - 24, 340) // max 340px, with 12px padding each side
        setCanvasSize(Math.max(220, sz))
      }
    }
    updateSize()
    window.addEventListener('resize', updateSize)
    return () => window.removeEventListener('resize', updateSize)
  }, [])

  // Draw function: pure, no side effects
  const drawRoulette = useCallback((ctx, wheelAngle, ballAngle, ballRadius, size) => {
    const cx = size / 2
    const cy = size / 2
    const scale = size / 340
    const outerR = 160 * scale
    const innerR = 100 * scale
    const hubR = 45 * scale

    ctx.clearRect(0, 0, size, size)

    // Shadow beneath wheel
    ctx.save()
    ctx.shadowColor = 'rgba(0, 0, 0, 0.18)'
    ctx.shadowBlur = 14 * scale
    ctx.shadowOffsetY = 3 * scale
    ctx.beginPath()
    ctx.arc(cx, cy, outerR, 0, Math.PI * 2)
    ctx.fillStyle = '#1C1C1E'
    ctx.fill()
    ctx.restore()

    // Outer chrome ring
    ctx.beginPath()
    ctx.arc(cx, cy, outerR, 0, Math.PI * 2)
    ctx.lineWidth = 6 * scale
    ctx.strokeStyle = '#3A3A3C'
    ctx.stroke()

    // Ball track
    ctx.beginPath()
    ctx.arc(cx, cy, outerR - 5 * scale, 0, Math.PI * 2)
    ctx.lineWidth = 12 * scale
    ctx.strokeStyle = '#2C2C2E'
    ctx.stroke()

    // Number sectors
    for (let i = 0; i < TOTAL_SECTORS; i++) {
      const num = ROULETTE_NUMBERS[i]
      const startA = wheelAngle + i * ANGLE_PER_SECTOR
      const endA = startA + ANGLE_PER_SECTOR

      ctx.beginPath()
      ctx.moveTo(cx, cy)
      ctx.arc(cx, cy, outerR - 12 * scale, startA, endA)
      ctx.closePath()

      ctx.fillStyle = getNumColor(num)
      ctx.fill()

      // Sector separator
      ctx.lineWidth = 0.8 * scale
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.22)'
      ctx.stroke()

      // Number label
      ctx.save()
      ctx.translate(cx, cy)
      ctx.rotate(startA + ANGLE_PER_SECTOR / 2)
      ctx.textAlign = 'right'
      ctx.textBaseline = 'middle'
      ctx.fillStyle = '#FFFFFF'
      ctx.font = `bold ${Math.round(10 * scale)}px -apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif`
      ctx.fillText(String(num), outerR - 18 * scale, 0)
      ctx.restore()
    }

    // Inner cone track
    ctx.beginPath()
    ctx.arc(cx, cy, innerR, 0, Math.PI * 2)
    ctx.fillStyle = '#2C2C2E'
    ctx.fill()
    ctx.lineWidth = 1.5 * scale
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)'
    ctx.stroke()

    // Hub
    ctx.beginPath()
    ctx.arc(cx, cy, hubR, 0, Math.PI * 2)
    ctx.fillStyle = '#48484A'
    ctx.fill()
    ctx.lineWidth = 1.5 * scale
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)'
    ctx.stroke()

    // 4 spokes rotating with wheel
    ctx.save()
    ctx.translate(cx, cy)
    ctx.rotate(wheelAngle)
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.65)'
    ctx.lineWidth = 2.5 * scale
    ctx.lineCap = 'round'
    for (let b = 0; b < 4; b++) {
      ctx.rotate(Math.PI / 2)
      ctx.beginPath()
      ctx.moveTo(0, 0)
      ctx.lineTo(hubR - 5 * scale, 0)
      ctx.stroke()
      ctx.beginPath()
      ctx.arc(hubR - 5 * scale, 0, 3.5 * scale, 0, Math.PI * 2)
      ctx.fillStyle = '#FFFFFF'
      ctx.fill()
    }
    ctx.restore()

    // Center dome
    ctx.beginPath()
    ctx.arc(cx, cy, 12 * scale, 0, Math.PI * 2)
    ctx.fillStyle = '#E5E5EA'
    ctx.fill()

    // BALL — draw at specified angle and radius
    const ballX = cx + Math.cos(ballAngle) * (ballRadius * scale)
    const ballY = cy + Math.sin(ballAngle) * (ballRadius * scale)

    ctx.save()
    ctx.shadowColor = 'rgba(0, 0, 0, 0.5)'
    ctx.shadowBlur = 5 * scale
    ctx.shadowOffsetY = 2 * scale
    ctx.beginPath()
    ctx.arc(ballX, ballY, 5 * scale, 0, Math.PI * 2)
    ctx.fillStyle = '#FFFFFF'
    ctx.fill()
    // Shine dot
    ctx.beginPath()
    ctx.arc(ballX - 1.5 * scale, ballY - 1.5 * scale, 1.5 * scale, 0, Math.PI * 2)
    ctx.fillStyle = 'rgba(255,255,255,0.6)'
    ctx.fill()
    ctx.restore()

    // POINTER / MARKER at top (12 o'clock) — drawn outside the wheel
    const pointerY = cy - outerR - 2 * scale
    ctx.save()
    ctx.translate(cx, pointerY)
    ctx.beginPath()
    ctx.moveTo(-7 * scale, -12 * scale)
    ctx.lineTo(7 * scale, -12 * scale)
    ctx.lineTo(0, 2 * scale)
    ctx.closePath()
    ctx.fillStyle = '#FFD60A'
    ctx.shadowColor = 'rgba(0,0,0,0.35)'
    ctx.shadowBlur = 4 * scale
    ctx.fill()
    ctx.restore()
  }, [])

  // Initial static draw
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const dpr = window.devicePixelRatio || 1
    const sz = canvasSize

    canvas.width = sz * dpr
    canvas.height = sz * dpr
    canvas.style.width = sz + 'px'
    canvas.style.height = sz + 'px'
    const ctx = canvas.getContext('2d')
    ctx.scale(dpr, dpr)

    // Draw static wheel at last known angle, ball resting in the stopped position
    drawRoulette(ctx, wheelAngleRef.current, -Math.PI / 2, 117, sz)

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
    }
  }, [canvasSize, drawRoulette])

  // ─── SPIN LOGIC ─────────────────────────────────────────────
  const girarRuleta = async () => {
    if (girando || totalApostado <= 0) return
    if (saldoActual < totalApostado) {
      sound.playPop()
      return
    }

    setGirando(true)
    setResultadoGanancia(null)
    setUltimaApuesta({ ...apuestas })

    // Deduct bet immediately
    const nuevoSaldoTrasApuesta = saldoActual - totalApostado
    const perfilActualizado = { ...perfil, puntos_total: nuevoSaldoTrasApuesta }
    setPerfil(perfilActualizado)
    localStorage.setItem('racha_local_user', JSON.stringify(perfilActualizado))

    try {
      await supabase.from('profiles').update({ puntos_total: nuevoSaldoTrasApuesta }).eq('id', perfil.id)
    } catch (e) {}

    // 1. Determine winning number (server-first, fallback to crypto client)
    const token = (await supabase.auth.getSession()).data.session?.access_token
    let numeroGanador = null

    if (token) {
      numeroGanador = await obtenerNumeroGanadorServidor(token)
    }

    if (numeroGanador === null) {
      const indexGanador = generateSecureRandomClient(TOTAL_SECTORS)
      numeroGanador = ROULETTE_NUMBERS[indexGanador]
    }

    // 2. Calculate final wheel angle so that the winning sector sits under the pointer (top, -PI/2)
    const targetIndex = ROULETTE_NUMBERS.indexOf(numeroGanador)
    // The pointer reads the sector at angle -PI/2 (top). We need:
    //   wheelAngle + targetIndex * ANGLE_PER_SECTOR + ANGLE_PER_SECTOR/2 = -PI/2 + 2*PI*k
    // Solve for wheelAngle:
    const sectorCenterAngle = targetIndex * ANGLE_PER_SECTOR + ANGLE_PER_SECTOR / 2
    const finalWheelAngle = -Math.PI / 2 - sectorCenterAngle

    // 3. Animate: wheel spins forward N full rotations and lands at finalWheelAngle
    //    Ball spins backward in the track, then drops into the pocket
    const startWheelAngle = wheelAngleRef.current
    // Guarantee at least 5 full rotations for visual effect
    const fullRotations = 5
    const totalWheelTravel = fullRotations * Math.PI * 2 + ((finalWheelAngle - startWheelAngle) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2)

    const DURATION = 5500 // ms
    const startTime = performance.now()

    // Ball starts at a random position on the outer track and spins opposite to the wheel
    const ballStartAngle = Math.random() * Math.PI * 2
    // Ball ends at the pointer position (-PI/2) in world space, which relative to wheel = -PI/2 - finalWheelAngle
    const ballFinalAngle = -Math.PI / 2
    // Total ball travel: spins in the opposite direction (negative) for several rotations
    const ballRotations = 7
    const ballTotalTravel = -(ballRotations * Math.PI * 2 + ((ballStartAngle - ballFinalAngle) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2))

    let lastClickSector = -1

    const animar = (currentTime) => {
      const elapsed = currentTime - startTime
      const t = Math.min(elapsed / DURATION, 1)

      // Eased progress — smooth deceleration
      const easedT = easeOutCubic(t)

      // Wheel position
      const currentWheelAngle = startWheelAngle + totalWheelTravel * easedT

      // Ball angle (world-space)
      const currentBallAngle = ballStartAngle + ballTotalTravel * easedT

      // Ball radius: stays on outer track, then drops into pocket in last 30%
      let ballR = 145
      if (t > 0.7) {
        const dropT = (t - 0.7) / 0.3
        ballR = 145 - 28 * easeOutCubic(dropT)
        // Small bounce near the end
        if (t > 0.88 && t < 0.97) {
          ballR += Math.sin((t - 0.88) * Math.PI * 10) * 2.5
        }
      }

      // Click sounds based on sector changes
      const relAngle = ((currentBallAngle - currentWheelAngle) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2)
      const currentSector = Math.floor(relAngle / ANGLE_PER_SECTOR)
      if (currentSector !== lastClickSector) {
        lastClickSector = currentSector
        if (t < 0.93) {
          try { sound.playRouletteClick() } catch (e) {}
        }
      }

      // Final frame: snap to exact positions
      if (t >= 1) {
        wheelAngleRef.current = finalWheelAngle
        const canvas = canvasRef.current
        if (canvas) {
          const dpr = window.devicePixelRatio || 1
          const sz = canvasSize
          const ctx = canvas.getContext('2d')
          ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
          drawRoulette(ctx, finalWheelAngle, ballFinalAngle, 117, sz)
        }
        finalizarGiro(numeroGanador, nuevoSaldoTrasApuesta)
        return
      }

      // Draw current frame
      const canvas = canvasRef.current
      if (canvas) {
        const dpr = window.devicePixelRatio || 1
        const sz = canvasSize
        const ctx = canvas.getContext('2d')
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
        drawRoulette(ctx, currentWheelAngle, currentBallAngle, ballR, sz)
      }

      animFrameRef.current = requestAnimationFrame(animar)
    }

    animFrameRef.current = requestAnimationFrame(animar)
  }

  // ─── PAYOUT LOGIC ──────────────────────────────────────────
  const finalizarGiro = async (numeroGanador, saldoBase) => {
    setGirando(false)
    setUltimoNumero(numeroGanador)

    const nuevoHistorial = [numeroGanador, ...historial.slice(0, 9)]
    setHistorial(nuevoHistorial)
    localStorage.setItem('muudel_ruleta_historial', JSON.stringify(nuevoHistorial))

    let gananciaTotal = 0
    let detallesGanadores = []

    const esRojo = RED_NUMBERS.has(numeroGanador)
    const esNegro = BLACK_NUMBERS.has(numeroGanador)
    const esPar = numeroGanador !== 0 && numeroGanador % 2 === 0
    const esImpar = numeroGanador !== 0 && numeroGanador % 2 !== 0
    const esPasa = numeroGanador >= 19 && numeroGanador <= 36
    const esFalta = numeroGanador >= 1 && numeroGanador <= 18
    const esDocena1 = numeroGanador >= 1 && numeroGanador <= 12
    const esDocena2 = numeroGanador >= 13 && numeroGanador <= 24
    const esDocena3 = numeroGanador >= 25 && numeroGanador <= 36
    const colIndex = numeroGanador === 0 ? -1 : (numeroGanador - 1) % 3

    if (apuestas[String(numeroGanador)]) {
      const pago = apuestas[String(numeroGanador)] * 36
      gananciaTotal += pago
      detallesGanadores.push(`Pleno ${numeroGanador} (+${pago})`)
    }
    if (esRojo && apuestas['rojo']) {
      const pago = apuestas['rojo'] * 2; gananciaTotal += pago
      detallesGanadores.push(`Rojo (+${pago})`)
    }
    if (esNegro && apuestas['negro']) {
      const pago = apuestas['negro'] * 2; gananciaTotal += pago
      detallesGanadores.push(`Negro (+${pago})`)
    }
    if (esPar && apuestas['par']) {
      const pago = apuestas['par'] * 2; gananciaTotal += pago
      detallesGanadores.push(`Par (+${pago})`)
    }
    if (esImpar && apuestas['impar']) {
      const pago = apuestas['impar'] * 2; gananciaTotal += pago
      detallesGanadores.push(`Impar (+${pago})`)
    }
    if (esFalta && apuestas['1-18']) {
      const pago = apuestas['1-18'] * 2; gananciaTotal += pago
      detallesGanadores.push(`1-18 (+${pago})`)
    }
    if (esPasa && apuestas['19-36']) {
      const pago = apuestas['19-36'] * 2; gananciaTotal += pago
      detallesGanadores.push(`19-36 (+${pago})`)
    }
    if (esDocena1 && apuestas['docena1']) {
      const pago = apuestas['docena1'] * 3; gananciaTotal += pago
      detallesGanadores.push(`1ª Doc (+${pago})`)
    }
    if (esDocena2 && apuestas['docena2']) {
      const pago = apuestas['docena2'] * 3; gananciaTotal += pago
      detallesGanadores.push(`2ª Doc (+${pago})`)
    }
    if (esDocena3 && apuestas['docena3']) {
      const pago = apuestas['docena3'] * 3; gananciaTotal += pago
      detallesGanadores.push(`3ª Doc (+${pago})`)
    }
    if (colIndex === 0 && apuestas['col1']) {
      const pago = apuestas['col1'] * 3; gananciaTotal += pago
      detallesGanadores.push(`Col 1 (+${pago})`)
    }
    if (colIndex === 1 && apuestas['col2']) {
      const pago = apuestas['col2'] * 3; gananciaTotal += pago
      detallesGanadores.push(`Col 2 (+${pago})`)
    }
    if (colIndex === 2 && apuestas['col3']) {
      const pago = apuestas['col3'] * 3; gananciaTotal += pago
      detallesGanadores.push(`Col 3 (+${pago})`)
    }

    const nuevoTotalFinal = saldoBase + gananciaTotal
    const perfilLiquidado = { ...perfil, puntos_total: nuevoTotalFinal }
    setPerfil(perfilLiquidado)
    localStorage.setItem('racha_local_user', JSON.stringify(perfilLiquidado))

    try {
      await supabase.from('profiles').update({ puntos_total: nuevoTotalFinal }).eq('id', perfil.id)
    } catch (e) {}

    setResultadoGanancia({
      ganancia: gananciaTotal,
      neto: gananciaTotal - totalApostado,
      detalles: detallesGanadores
    })

    if (gananciaTotal > 0) {
      sound.playWinFanfare()
      if (gananciaTotal >= 30 || detallesGanadores.some(d => d.includes('Pleno'))) {
        triggerConfetti()
        transmitirEvento('ruleta_gran_premio', {
          nombre: perfil?.nombre || 'Alumno SMR2',
          numero: numeroGanador,
          premio: gananciaTotal
        })
      }
    } else {
      sound.playStamp()
    }
  }

  // ─── BET HANDLERS ──────────────────────────────────────────
  const handleApostar = (tipo) => {
    if (girando) return
    if (totalApostado + fichaSeleccionada > APUESTA_MAXIMA_MESA) { sound.playPop(); return }
    if (saldoActual - totalApostado < fichaSeleccionada) { sound.playPop(); return }
    sound.playChipSound()
    setApuestas(prev => ({ ...prev, [tipo]: (prev[tipo] || 0) + fichaSeleccionada }))
  }

  const limpiarApuestas = () => {
    if (girando) return; sound.playPop(); setApuestas({}); setResultadoGanancia(null)
  }

  const doblarApuestas = () => {
    if (girando || totalApostado === 0) return
    if (totalApostado * 2 > APUESTA_MAXIMA_MESA) { sound.playPop(); return }
    if (saldoActual - totalApostado < totalApostado) { sound.playPop(); return }
    sound.playChipSound()
    const d = {}; for (const [k, v] of Object.entries(apuestas)) d[k] = v * 2; setApuestas(d)
  }

  const repetirUltima = () => {
    if (girando || !ultimaApuesta) return
    const req = Object.values(ultimaApuesta).reduce((a, b) => a + b, 0)
    if (req > APUESTA_MAXIMA_MESA || saldoActual < req) { sound.playPop(); return }
    sound.playChipSound(); setApuestas({ ...ultimaApuesta })
  }

  const solicitarBono = async () => {
    if (solicitandoBono || saldoActual > 0 || yaReclamoBonoHoy) return
    setSolicitandoBono(true); sound.playStamp()
    const nuevosPuntos = 5
    const actualizado = { ...perfil, puntos_total: nuevosPuntos }
    setPerfil(actualizado)
    try { localStorage.setItem('racha_local_user', JSON.stringify(actualizado)); localStorage.setItem(bonoStorageKey, '1') } catch (e) {}
    setYaReclamoBonoHoy(true)
    try { await supabase.from('profiles').update({ puntos_total: nuevosPuntos }).eq('id', perfil.id) } catch (e) {}
    triggerConfetti(); setSolicitandoBono(false)
  }

  // ─── REUSABLE CHIP BADGE ─────────────────────────────────
  const ChipBadge = ({ amount }) => amount ? (
    <span style={{
      backgroundColor: '#FFD60A', color: '#000', borderRadius: 8,
      padding: '1px 5px', fontSize: 9, fontWeight: 900, marginTop: 1
    }}>{amount}p</span>
  ) : null

  // ─── NUM BUTTON ──────────────────────────────────────────
  const NumBtn = ({ num }) => {
    const apostado = apuestas[String(num)]
    return (
      <button
        type="button"
        onClick={() => handleApostar(String(num))}
        style={{
          minHeight: 38, borderRadius: 7,
          backgroundColor: getNumColor(num),
          color: '#FFF',
          border: apostado ? '2px solid #FFD60A' : '1px solid rgba(255,255,255,0.08)',
          fontWeight: 800, fontSize: 13, cursor: 'pointer',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          padding: '3px 2px', lineHeight: 1.1
        }}
      >
        <span>{num}</span>
        <ChipBadge amount={apostado} />
      </button>
    )
  }

  // ─── OUTSIDE BET BUTTON ─────────────────────────────────
  const OutsideBtn = ({ id, label, bg, color: c, borderDefault }) => {
    const apostado = apuestas[id]
    return (
      <button
        type="button"
        onClick={() => handleApostar(id)}
        style={{
          minHeight: 40, borderRadius: 8,
          backgroundColor: bg || 'var(--color-surface-secondary)',
          border: apostado ? '2px solid #FFD60A' : (borderDefault || '1px solid var(--color-separator)'),
          color: c || 'var(--color-ink)',
          fontSize: 12, fontWeight: 800, cursor: 'pointer',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          padding: '4px 2px', gap: 1
        }}
      >
        <span>{label}</span>
        <ChipBadge amount={apostado} />
      </button>
    )
  }

  // ─── RENDER ────────────────────────────────────────────────
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* HEADER: saldo + apuesta */}
      <div className="card" style={{
        padding: '12px 16px', display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', flexWrap: 'wrap', gap: 10,
        border: '1px solid var(--color-separator)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 38, height: 38, borderRadius: 12,
            backgroundColor: 'rgba(255, 59, 48, 0.12)', color: '#FF3B30',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <Sparkles size={20} />
          </div>
          <div>
            <h2 style={{ fontSize: 16, fontWeight: 800, margin: 0, color: 'var(--color-ink)' }}>
              Ruleta SMR2
            </h2>
            <p style={{ fontSize: 11, color: 'var(--color-secondary-ink)', margin: 0 }}>
              Europea 0-36 · Hasta 36x
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ textAlign: 'right' }}>
            <span style={{ fontSize: 10, color: 'var(--color-secondary-ink)', display: 'block', textTransform: 'uppercase', fontWeight: 600 }}>
              Saldo
            </span>
            <strong style={{ fontSize: 16, color: 'var(--color-accent)', fontWeight: 800 }}>
              {saldoActual}
            </strong>
          </div>
          <div style={{ height: 28, width: 1, backgroundColor: 'var(--color-separator)' }} />
          <div style={{ textAlign: 'right' }}>
            <span style={{ fontSize: 10, color: 'var(--color-secondary-ink)', display: 'block', textTransform: 'uppercase', fontWeight: 600 }}>
              Mesa
            </span>
            <strong style={{ fontSize: 16, color: totalApostado > 0 ? '#FF9500' : 'var(--color-secondary-ink)', fontWeight: 800 }}>
              {totalApostado}<span style={{ fontSize: 10, fontWeight: 600 }}>/{APUESTA_MAXIMA_MESA}</span>
            </strong>
          </div>
        </div>
      </div>

      {/* WHEEL + RESULT — stacked on mobile */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {/* Canvas */}
        <div
          ref={containerRef}
          className="card"
          style={{
            padding: 12, display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            border: '1px solid var(--color-separator)', position: 'relative',
            overflow: 'hidden'
          }}
        >
          <canvas
            ref={canvasRef}
            style={{ width: canvasSize, height: canvasSize, maxWidth: '100%', userSelect: 'none' }}
          />
          {girando && (
            <div style={{
              position: 'absolute', bottom: 16,
              backgroundColor: 'rgba(0, 0, 0, 0.72)', color: '#FFF',
              padding: '5px 14px', borderRadius: 16, fontSize: 12, fontWeight: 700,
              display: 'flex', alignItems: 'center', gap: 6
            }}>
              <RotateCcw size={13} className="spin-slow" />
              <span>Girando...</span>
            </div>
          )}
        </div>

        {/* Last number + result + history */}
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {/* Last number */}
          <div className="card" style={{
            flex: '1 1 140px', padding: 14, border: '1px solid var(--color-separator)',
            textAlign: 'center', minWidth: 140
          }}>
            <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.4, color: 'var(--color-secondary-ink)' }}>
              Resultado
            </span>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, margin: '6px 0' }}>
              <div style={{
                width: 48, height: 48, borderRadius: 14,
                backgroundColor: ultimoNumero === null ? '#8E8E93' : getNumColor(ultimoNumero),
                color: '#FFF', display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 22, fontWeight: 900, boxShadow: '0 3px 10px rgba(0,0,0,0.15)'
              }}>
                {ultimoNumero !== null ? ultimoNumero : '-'}
              </div>
              {ultimoNumero !== null && (
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-ink)' }}>
                    {ultimoNumero === 0 ? 'Cero' : RED_NUMBERS.has(ultimoNumero) ? 'Rojo' : 'Negro'}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--color-secondary-ink)' }}>
                    {ultimoNumero === 0 ? 'Casa' : `${ultimoNumero % 2 === 0 ? 'Par' : 'Impar'} · ${ultimoNumero <= 18 ? '1-18' : '19-36'}`}
                  </div>
                </div>
              )}
            </div>

            {resultadoGanancia && (
              <div style={{
                marginTop: 6, padding: '6px 10px', borderRadius: 8,
                backgroundColor: resultadoGanancia.ganancia > 0 ? 'rgba(52, 199, 89, 0.12)' : 'rgba(255, 59, 48, 0.08)',
                color: resultadoGanancia.ganancia > 0 ? '#34C759' : '#FF3B30',
                fontSize: 12, fontWeight: 700
              }}>
                {resultadoGanancia.ganancia > 0
                  ? `+${resultadoGanancia.ganancia} pts (${resultadoGanancia.detalles.join(', ')})`
                  : `Sin aciertos (-${totalApostado} pts)`}
              </div>
            )}
          </div>

          {/* History */}
          <div className="card" style={{
            flex: '1 1 200px', padding: '12px 14px', border: '1px solid var(--color-separator)', minWidth: 200
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 6 }}>
              <History size={13} color="var(--color-secondary-ink)" />
              <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-secondary-ink)', textTransform: 'uppercase' }}>
                Historial
              </span>
            </div>
            <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
              {historial.map((num, idx) => (
                <div key={idx} style={{
                  width: 28, height: 28, borderRadius: 8,
                  backgroundColor: getNumColor(num), color: '#FFF',
                  fontSize: 11, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                  {num}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* SPIN BUTTON */}
      <button
        type="button"
        className="btn-primary"
        disabled={girando || totalApostado <= 0}
        onClick={girarRuleta}
        style={{
          minHeight: 48, fontSize: 15, fontWeight: 800, borderRadius: 14,
          backgroundColor: totalApostado > 0 && !girando ? 'var(--color-accent)' : undefined,
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          boxShadow: totalApostado > 0 ? '0 3px 12px rgba(0,122,255,0.25)' : 'none'
        }}
      >
        <RotateCcw size={16} className={girando ? 'spin-slow' : ''} />
        <span>{girando ? 'GIRANDO...' : `GIRAR (${totalApostado} pts)`}</span>
      </button>

      {/* Emergency bonus */}
      {saldoActual <= 0 && (
        <button
          type="button"
          onClick={solicitarBono}
          disabled={solicitandoBono || yaReclamoBonoHoy}
          style={{
            padding: '10px 14px', borderRadius: 12,
            border: yaReclamoBonoHoy ? '1px dashed var(--color-separator)' : '1px dashed #34C759',
            backgroundColor: yaReclamoBonoHoy ? 'rgba(142, 142, 147, 0.06)' : 'rgba(52, 199, 89, 0.06)',
            color: yaReclamoBonoHoy ? 'var(--color-secondary-ink)' : '#34C759',
            fontSize: 12, fontWeight: 700, cursor: yaReclamoBonoHoy ? 'not-allowed' : 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            opacity: yaReclamoBonoHoy ? 0.6 : 1
          }}
        >
          <Coins size={15} />
          <span>{yaReclamoBonoHoy ? 'Bono agotado hoy' : 'Bono emergencia (+5 pts, 1/día)'}</span>
        </button>
      )}

      {/* CHIP SELECTOR */}
      <div className="card" style={{
        padding: '10px 14px', border: '1px solid var(--color-separator)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexWrap: 'wrap', gap: 8
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-secondary-ink)' }}>Ficha:</span>
          <div style={{ display: 'flex', gap: 6 }}>
            {FICHAS_DISPONIBLES.map((f) => {
              const activa = fichaSeleccionada === f.valor
              return (
                <button
                  key={f.valor} type="button"
                  onClick={() => { sound.playChipSound(); setFichaSeleccionada(f.valor) }}
                  style={{
                    width: 38, height: 38, borderRadius: '50%',
                    backgroundColor: f.color, color: f.texto,
                    border: activa ? '3px solid #FFD60A' : `2px solid ${f.borde}`,
                    boxShadow: activa ? '0 0 8px rgba(255, 214, 10, 0.5)' : '0 1px 4px rgba(0,0,0,0.12)',
                    transform: activa ? 'scale(1.1)' : 'scale(1)',
                    transition: 'transform 0.12s ease',
                    cursor: 'pointer', fontSize: 12, fontWeight: 900,
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}
                >{f.valor}</button>
              )
            })}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 6 }}>
          <button type="button" className="btn-secondary" disabled={girando || !ultimaApuesta}
            onClick={repetirUltima}
            style={{ fontSize: 11, padding: '6px 10px', display: 'flex', alignItems: 'center', gap: 4 }}>
            <Copy size={12} /><span>Repetir</span>
          </button>
          <button type="button" className="btn-secondary" disabled={girando || totalApostado === 0}
            onClick={doblarApuestas}
            style={{ fontSize: 11, padding: '6px 10px' }}>
            2x
          </button>
          <button type="button" className="btn-secondary" disabled={girando || totalApostado === 0}
            onClick={limpiarApuestas}
            style={{ fontSize: 11, padding: '6px 10px', color: '#FF3B30', display: 'flex', alignItems: 'center', gap: 4 }}>
            <Trash2 size={12} /><span>Borrar</span>
          </button>
        </div>
      </div>

      {/* BETTING TABLE — mobile-responsive */}
      <div className="card" style={{
        padding: '14px', border: '1px solid var(--color-separator)',
        backgroundColor: 'var(--color-cell-bg)', overflowX: 'auto',
        WebkitOverflowScrolling: 'touch'
      }}>
        <div style={{ minWidth: 340, display: 'flex', flexDirection: 'column', gap: 6 }}>
          {/* Zero */}
          <button
            type="button"
            onClick={() => handleApostar('0')}
            style={{
              width: '100%', minHeight: 40, borderRadius: 8,
              backgroundColor: '#34C759', color: '#FFF',
              border: apuestas['0'] ? '2px solid #FFD60A' : 'none',
              fontWeight: 900, fontSize: 15, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8
            }}
          >
            <span>0</span>
            <ChipBadge amount={apuestas['0']} />
          </button>

          {/* Number grid: 3 rows × 12 cols + column bets */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr) 36px', gap: 4 }}>
            {/* Row 3: 3,6,9... */}
            {[3, 6, 9, 12, 15, 18, 21, 24, 27, 30, 33, 36].map(n => <NumBtn key={n} num={n} />)}
            <OutsideBtn id="col3" label="2:1" bg="rgba(0,122,255,0.1)" color="var(--color-accent)" />

            {/* Row 2: 2,5,8... */}
            {[2, 5, 8, 11, 14, 17, 20, 23, 26, 29, 32, 35].map(n => <NumBtn key={n} num={n} />)}
            <OutsideBtn id="col2" label="2:1" bg="rgba(0,122,255,0.1)" color="var(--color-accent)" />

            {/* Row 1: 1,4,7... */}
            {[1, 4, 7, 10, 13, 16, 19, 22, 25, 28, 31, 34].map(n => <NumBtn key={n} num={n} />)}
            <OutsideBtn id="col1" label="2:1" bg="rgba(0,122,255,0.1)" color="var(--color-accent)" />
          </div>

          {/* Dozens */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 4 }}>
            <OutsideBtn id="docena1" label="1ª Doc (1-12)" />
            <OutsideBtn id="docena2" label="2ª Doc (13-24)" />
            <OutsideBtn id="docena3" label="3ª Doc (25-36)" />
          </div>

          {/* Even chances */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 4 }}>
            <OutsideBtn id="1-18" label="1-18" />
            <OutsideBtn id="par" label="PAR" />
            <OutsideBtn id="rojo" label="ROJO" bg="#FF3B30" color="#FFF" borderDefault="none" />
            <OutsideBtn id="negro" label="NEGRO" bg="#1C1C1E" color="#FFF" borderDefault="none" />
            <OutsideBtn id="impar" label="IMPAR" />
            <OutsideBtn id="19-36" label="19-36" />
          </div>
        </div>
      </div>
    </div>
  )
}
