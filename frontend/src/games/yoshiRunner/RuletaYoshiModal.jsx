// frontend/src/games/yoshiRunner/RuletaYoshiModal.jsx
import { useState, useEffect, useRef, useCallback } from 'react'
import { YOSHI_ROULETTE_CONFIG } from '../../config/yoshiRouletteConfig'
import { sound, triggerConfetti } from '../../utils/haptics'
import { PanelHistorialLedger } from '../../components/PanelHistorialLedger'
import {
  X,
  Volume2,
  VolumeX,
  Coins,
  Shield,
  RotateCcw,
  Sparkles,
  Lock,
  History,
  AlertCircle,
  CheckCircle2,
  Zap,
  Info
} from 'lucide-react'

// Sintetizador de audio retro mecánico para los clacs perimetrales
class RouletteAudio {
  constructor() {
    this.ctx = null
    this.muted = false
  }

  _init() {
    try {
      if (!this.ctx && typeof window !== 'undefined') {
        const AC = window.AudioContext || window.webkitAudioContext
        if (AC) this.ctx = new AC()
      }
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {})
      }
    } catch (_) {}
  }

  playTick() {
    if (this.muted) return
    try {
      this._init()
      if (!this.ctx) return
      const osc = this.ctx.createOscillator()
      const gain = this.ctx.createGain()
      osc.type = 'triangle'
      osc.frequency.setValueAtTime(680, this.ctx.currentTime)
      osc.frequency.exponentialRampToValueAtTime(140, this.ctx.currentTime + 0.035)
      gain.gain.setValueAtTime(0.08, this.ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.035)
      osc.connect(gain)
      gain.connect(this.ctx.destination)
      osc.start()
      osc.stop(this.ctx.currentTime + 0.035)
    } catch (_) {}
  }

  playWin() {
    if (this.muted) return
    try {
      this._init()
      if (!this.ctx) return
      const freqs = [523.25, 659.25, 783.99, 1046.50]
      freqs.forEach((f, idx) => {
        const osc = this.ctx.createOscillator()
        const gain = this.ctx.createGain()
        osc.type = 'square'
        osc.frequency.setValueAtTime(f, this.ctx.currentTime + idx * 0.09)
        gain.gain.setValueAtTime(0.12, this.ctx.currentTime + idx * 0.09)
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + idx * 0.09 + 0.22)
        osc.connect(gain)
        gain.connect(this.ctx.destination)
        osc.start(this.ctx.currentTime + idx * 0.09)
        osc.stop(this.ctx.currentTime + idx * 0.09 + 0.22)
      })
    } catch (_) {}
  }

  playLose() {
    if (this.muted) return
    try {
      this._init()
      if (!this.ctx) return
      const osc = this.ctx.createOscillator()
      const gain = this.ctx.createGain()
      osc.type = 'sawtooth'
      osc.frequency.setValueAtTime(240, this.ctx.currentTime)
      osc.frequency.linearRampToValueAtTime(80, this.ctx.currentTime + 0.28)
      gain.gain.setValueAtTime(0.1, this.ctx.currentTime)
      gain.gain.linearRampToValueAtTime(0.001, this.ctx.currentTime + 0.28)
      osc.connect(gain)
      gain.connect(this.ctx.destination)
      osc.start()
      osc.stop(this.ctx.currentTime + 0.28)
    } catch (_) {}
  }
}

const rouletteAudio = new RouletteAudio()

export function RuletaYoshiModal({
  perfil,
  saldoMonedasRuleta = 0,
  esGameOver = false,
  onActualizarSaldoMonedas,
  onActualizarStevenEuros,
  onCerrar,
  onVolverAJugar
}) {
  const [nivelSeleccionado, setNivelSeleccionado] = useState('bronce')
  const [saldoMonedas, setSaldoMonedas] = useState(saldoMonedasRuleta)
  const [saldoSE, setSaldoSE] = useState(perfil?.puntos_total || 0)
  const [ganadosHoyRuleta, setGanadosHoyRuleta] = useState(0)
  const [infoNiveles, setInfoNiveles] = useState({})
  const [ruletaPausada, setRuletaPausada] = useState(false)
  const [bancaEnAusteridad, setBancaEnAusteridad] = useState(false)

  const [girando, setGirando] = useState(false)
  const [errorMsg, setErrorMsg] = useState(null)
  const [resultadoFinal, setResultadoFinal] = useState(null)
  const [sonidoActivo, setSonidoActivo] = useState(true)
  const [cooldownRestante, setCooldownRestante] = useState(0)
  const [mostrarHistorial, setMostrarHistorial] = useState(false)

  const canvasRef = useRef(null)
  const animFrameRef = useRef(null)
  const rotacionActualRef = useRef(0)

  // Obtener segmentos del nivel actual (filtrados si el jackpot está degradado para nunca mentir al usuario)
  const configNivel = YOSHI_ROULETTE_CONFIG.NIVELES[nivelSeleccionado] || YOSHI_ROULETTE_CONFIG.NIVELES.bronce
  const nivelServerInfo = infoNiveles[nivelSeleccionado]
  const jackpotDisponible = nivelServerInfo ? nivelServerInfo.jackpotDisponible : true

  const segmentos = configNivel.segmentos.map(s => {
    if (s.esJackpot && !jackpotDisponible) {
      return {
        ...s,
        label: `+${s.degradaA || 20} SE (Degradado)`,
        premioSE: s.degradaA || 20,
        color: '#6B7280'
      }
    }
    return s
  })

  const totalSegmentos = segmentos.length
  const anguloPorSegmento = (Math.PI * 2) / totalSegmentos

  // Sincronizar estado con el servidor al abrir
  useEffect(() => {
    sincronizarEstadoServidor()
  }, [perfil?.id])

  const sincronizarEstadoServidor = async () => {
    if (!perfil?.id) return
    try {
      const headers = { 'Content-Type': 'application/json', 'x-user-id': perfil.id }
      const res = await fetch('/api/ruleta/yoshi-estado', { headers })
      const data = await res.json()
      if (data.success) {
        if (typeof data.saldoMonedas === 'number') {
          setSaldoMonedas(data.saldoMonedas)
          onActualizarSaldoMonedas?.(data.saldoMonedas)
        }
        if (typeof data.puntosTotal === 'number') {
          setSaldoSE(data.puntosTotal)
          onActualizarStevenEuros?.(data.puntosTotal)
        }
        setGanadosHoyRuleta(data.ganadosHoyRuleta || 0)
        setInfoNiveles(data.niveles || {})
        setRuletaPausada(Boolean(data.ruletaPausada))
        setBancaEnAusteridad(Boolean(data.bancaEnAusteridad))
      }
    } catch (_) {}
  }

  // Temporizador de cooldown
  useEffect(() => {
    if (cooldownRestante <= 0) return
    const timer = setInterval(() => {
      setCooldownRestante(prev => Math.max(0, prev - 1))
    }, 1000)
    return () => clearInterval(timer)
  }, [cooldownRestante])

  const toggleSonido = () => {
    rouletteAudio.muted = sonidoActivo
    setSonidoActivo(!sonidoActivo)
  }

  // Dibujado de la ruleta en el canvas
  const dibujarRuleta = useCallback((rotacion) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const w = canvas.width
    const h = canvas.height
    const cx = w / 2
    const cy = h / 2
    const radio = Math.min(cx, cy) - 10

    ctx.clearRect(0, 0, w, h)

    ctx.save()
    ctx.translate(cx, cy)
    ctx.rotate(rotacion)

    // Sectores
    segmentos.forEach((seg, i) => {
      const inicioAngulo = i * anguloPorSegmento
      const finAngulo = inicioAngulo + anguloPorSegmento

      ctx.beginPath()
      ctx.moveTo(0, 0)
      ctx.arc(0, 0, radio, inicioAngulo, finAngulo)
      ctx.closePath()

      ctx.fillStyle = seg.color
      ctx.fill()

      ctx.strokeStyle = 'rgba(255, 255, 255, 0.22)'
      ctx.lineWidth = 2
      ctx.stroke()

      // Texto de premio
      ctx.save()
      const anguloMedio = inicioAngulo + anguloPorSegmento / 2
      ctx.rotate(anguloMedio)
      ctx.textAlign = 'right'
      ctx.fillStyle = seg.textoColor || '#FFFFFF'
      ctx.font = '800 12px -apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif'
      ctx.shadowColor = 'rgba(0,0,0,0.45)'
      ctx.shadowBlur = 3
      ctx.fillText(`${seg.icono} ${seg.label}`, radio - 14, 5)
      ctx.restore()
    })

    // Clavijas perimetrales mecánicas
    for (let i = 0; i < totalSegmentos * 2; i++) {
      const a = (i * Math.PI) / totalSegmentos
      const px = Math.cos(a) * (radio - 4)
      const py = Math.sin(a) * (radio - 4)
      ctx.beginPath()
      ctx.arc(px, py, 2.5, 0, Math.PI * 2)
      ctx.fillStyle = '#FFFFFF'
      ctx.shadowColor = 'rgba(0,0,0,0.3)'
      ctx.shadowBlur = 2
      ctx.fill()
    }

    ctx.restore()

    // Núcleo central
    ctx.save()
    ctx.beginPath()
    ctx.arc(cx, cy, 30, 0, Math.PI * 2)
    ctx.fillStyle = '#1C1C1E'
    ctx.shadowColor = 'rgba(0,0,0,0.35)'
    ctx.shadowBlur = 6
    ctx.fill()
    ctx.strokeStyle = '#FBBF24'
    ctx.lineWidth = 3
    ctx.stroke()

    ctx.font = '18px sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('🪙', cx, cy)
    ctx.restore()

    // Aguja / Puntero fijo arriba (apunta en 3PI/2 = -PI/2)
    ctx.save()
    ctx.fillStyle = '#FF3B30'
    ctx.shadowColor = 'rgba(0,0,0,0.35)'
    ctx.shadowBlur = 5
    ctx.beginPath()
    ctx.moveTo(cx, cy - radio + 14)
    ctx.lineTo(cx - 10, cy - radio - 8)
    ctx.lineTo(cx + 10, cy - radio - 8)
    ctx.closePath()
    ctx.fill()
    ctx.strokeStyle = '#FFFFFF'
    ctx.lineWidth = 2
    ctx.stroke()
    ctx.restore()
  }, [segmentos, anguloPorSegmento, totalSegmentos])

  useEffect(() => {
    dibujarRuleta(rotacionActualRef.current)
  }, [dibujarRuleta, nivelSeleccionado])

  // Girar la ruleta con validación en servidor
  const girarRuleta = async () => {
    if (girando || cooldownRestante > 0 || ruletaPausada) return
    if (saldoMonedas < configNivel.costoMonedas) {
      setErrorMsg(`Necesitas ${configNivel.costoMonedas} monedas para la Ruleta ${configNivel.nombre}.`)
      return
    }

    setErrorMsg(null)
    setResultadoFinal(null)
    setGirando(true)
    rouletteAudio._init()
    sound.playPop()

    try {
      const idempKey = `giro_${perfil?.id}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
      const resp = await fetch('/api/ruleta/yoshi-girar', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': perfil?.id || ''
        },
        body: JSON.stringify({
          nivel: nivelSeleccionado,
          idempotency_key: idempKey
        })
      })

      const data = await resp.json()

      if (!resp.ok || !data.success) {
        throw new Error(data.error || 'No se pudo realizar el giro en el servidor')
      }

      // Extraer datos calculados por el servidor
      const { indexGanador, ganador, stevenEurosGanados, nuevoSaldoMonedas, nuevosPuntosTotal, ganadosHoyTotal } = data

      // Calcular ángulo de llegada hacia el centro del sector indexGanador
      const anguloMedioSector = indexGanador * anguloPorSegmento + anguloPorSegmento / 2
      const anguloDestinoBase = (Math.PI * 1.5) - anguloMedioSector

      const vueltasCompletas = 5 + Math.floor(Math.random() * 2)
      const dosPi = Math.PI * 2
      const rotActual = rotacionActualRef.current
      const rotActualNormalizada = ((rotActual % dosPi) + dosPi) % dosPi

      let delta = (anguloDestinoBase - rotActualNormalizada)
      while (delta < 0) delta += dosPi

      const rotacionObjetivo = rotActual + (vueltasCompletas * dosPi) + delta

      // Animación física con deceleración suave (3.6s)
      const duracionMs = 3600
      const inicioTiempo = performance.now()
      const rotacionInicial = rotActual
      let ultimoTickSector = -1

      const frameAnim = (ahora) => {
        const transcurrido = ahora - inicioTiempo
        const p = Math.min(1, transcurrido / duracionMs)
        const easeOut = 1 - Math.pow(1 - p, 3.2)
        const rot = rotacionInicial + (rotacionObjetivo - rotacionInicial) * easeOut

        rotacionActualRef.current = rot
        dibujarRuleta(rot)

        const sectorActivo = Math.floor((rot % dosPi) / (anguloPorSegmento / 2))
        if (sectorActivo !== ultimoTickSector) {
          ultimoTickSector = sectorActivo
          rouletteAudio.playTick()
        }

        if (p < 1) {
          animFrameRef.current = requestAnimationFrame(frameAnim)
        } else {
          rotacionActualRef.current = rotacionObjetivo
          dibujarRuleta(rotacionObjetivo)
          setGirando(false)

          // Actualizar saldos definitivos
          setSaldoMonedas(nuevoSaldoMonedas)
          setSaldoSE(nuevosPuntosTotal)
          setGanadosHoyRuleta(ganadosHoyTotal)
          onActualizarSaldoMonedas?.(nuevoSaldoMonedas)
          onActualizarStevenEuros?.(nuevosPuntosTotal)

          try {
            localStorage.setItem(`muudel_yoshi_ruleta_saldo_${perfil?.id}`, String(nuevoSaldoMonedas))
            window.dispatchEvent(new CustomEvent('monedas_yoshi_actualizadas', {
              detail: { monedas: nuevoSaldoMonedas, userId: perfil?.id }
            }))
            window.dispatchEvent(new CustomEvent('steveneuros_actualizados', {
              detail: { puntos: nuevosPuntosTotal, userId: perfil?.id }
            }))
          } catch (_) {}

          setCooldownRestante(Math.ceil(YOSHI_ROULETTE_CONFIG.SPIN_COOLDOWN_MS / 1000))

          setResultadoFinal({
            ganador,
            stevenEurosGanados,
            esVictoria: stevenEurosGanados > 0,
            fueDegradado: ganador.fueDegradado,
            motivoDegradacion: ganador.motivoDegradacion
          })

          if (stevenEurosGanados > 0) {
            rouletteAudio.playWin()
            triggerConfetti()
          } else {
            rouletteAudio.playLose()
          }
        }
      }

      animFrameRef.current = requestAnimationFrame(frameAnim)
    } catch (err) {
      setGirando(false)
      setErrorMsg(err.message || 'Error en el servidor contable')
      sound.playBoing?.()
    }
  }

  useEffect(() => {
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
    }
  }, [])

  // Calcular progreso en la barra de tope diario
  const topeDuro = YOSHI_ROULETTE_CONFIG.TRAMOS_DIARIOS_SE.TOPE_DURO
  const porcProgreso = Math.min(100, Math.round((ganadosHoyRuleta / topeDuro) * 100))

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      backgroundColor: 'rgba(0,0,0,0.80)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      padding: '16px',
      animation: 'fadeIn 0.2s ease'
    }}>
      <div style={{
        width: '100%',
        maxWidth: 480,
        backgroundColor: '#1C1C1E',
        borderRadius: 22,
        border: '1px solid rgba(255,255,255,0.16)',
        boxShadow: '0 28px 56px rgba(0,0,0,0.65)',
        color: '#FFF',
        display: 'flex',
        flexDirection: 'column',
        maxHeight: '94vh',
        overflowY: 'auto'
      }}>
        {/* Encabezado */}
        <div style={{
          padding: '14px 18px',
          borderBottom: '1px solid rgba(255,255,255,0.09)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: '#242426'
        }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 900, display: 'flex', alignItems: 'center', gap: 6 }}>
              <span>🎰 Ruleta de Yoshi</span>
              <span style={{ fontSize: 11, padding: '2px 7px', borderRadius: 6, backgroundColor: 'rgba(255,255,255,0.1)', color: '#FBBF24', fontWeight: 700 }}>
                {configNivel.nombre}
              </span>
            </div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>
              Apuesta monedas y gana StevenEuros para el aula
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <button
              type="button"
              onClick={() => setMostrarHistorial(true)}
              style={{
                background: 'rgba(255,255,255,0.08)',
                border: 'none',
                color: '#FFF',
                cursor: 'pointer',
                padding: '6px 9px',
                borderRadius: 8,
                fontSize: 11,
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: 4
              }}
              title="Historial contable"
            >
              <History size={13} />
              <span>Historial</span>
            </button>

            <button
              type="button"
              onClick={toggleSonido}
              style={{
                background: 'rgba(255,255,255,0.08)',
                border: 'none',
                color: '#FFF',
                cursor: 'pointer',
                padding: 6,
                borderRadius: 8
              }}
            >
              {sonidoActivo ? <Volume2 size={15} /> : <VolumeX size={15} />}
            </button>

            <button
              type="button"
              onClick={onCerrar}
              disabled={girando}
              style={{
                background: 'rgba(255,255,255,0.08)',
                border: 'none',
                color: '#FFF',
                cursor: 'pointer',
                width: 28,
                height: 28,
                borderRadius: 14,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <X size={15} />
            </button>
          </div>
        </div>

        {/* Panel de Saldos */}
        <div style={{
          padding: '12px 18px',
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 10,
          backgroundColor: 'rgba(255,255,255,0.02)'
        }}>
          <div style={{
            backgroundColor: 'rgba(251, 191, 36, 0.08)',
            border: '1px solid rgba(251, 191, 36, 0.22)',
            borderRadius: 12,
            padding: '8px 12px'
          }}>
            <div style={{ fontSize: 11, color: '#FBBF24', fontWeight: 700 }}>Monedas Yoshi</div>
            <div style={{ fontSize: 18, fontWeight: 900, color: '#FFF' }}>
              {saldoMonedas} <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>/ 1.500 máx</span>
            </div>
          </div>

          <div style={{
            backgroundColor: 'rgba(52, 199, 89, 0.08)',
            border: '1px solid rgba(52, 199, 89, 0.22)',
            borderRadius: 12,
            padding: '8px 12px'
          }}>
            <div style={{ fontSize: 11, color: '#34C759', fontWeight: 700 }}>StevenEuros (SE)</div>
            <div style={{ fontSize: 18, fontWeight: 900, color: '#FFF' }}>
              {saldoSE} <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>SE 💶</span>
            </div>
          </div>
        </div>

        {/* Barra de Progreso del Tope Diario (30 SE) y Tramos Marginales */}
        <div style={{ padding: '0 18px 8px 18px' }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: 11,
            color: 'rgba(255,255,255,0.7)',
            marginBottom: 4
          }}>
            <span>Progreso diario en ruleta: <strong>{ganadosHoyRuleta} / {topeDuro} SE</strong></span>
            <span>
              {ganadosHoyRuleta < 12 ? 'Tramo 1 (100%)' : ganadosHoyRuleta < 24 ? 'Tramo 2 (50%)' : ganadosHoyRuleta < 30 ? 'Tramo 3 (25%)' : 'Tope diario alcanzado'}
            </span>
          </div>
          <div style={{
            width: '100%',
            height: 7,
            backgroundColor: 'rgba(255,255,255,0.1)',
            borderRadius: 4,
            overflow: 'hidden'
          }}>
            <div style={{
              width: `${porcProgreso}%`,
              height: '100%',
              backgroundColor: ganadosHoyRuleta >= topeDuro ? '#EF4444' : ganadosHoyRuleta >= 24 ? '#F59E0B' : '#10B981',
              transition: 'width 0.3s ease'
            }} />
          </div>
        </div>

        {/* Selector de Nivel (Bronce 100, Plata 300, Oro 1000) */}
        <div style={{ padding: '4px 18px 10px 18px' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.6)', marginBottom: 6 }}>
            Elige el nivel de ruleta:
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
            {Object.values(YOSHI_ROULETTE_CONFIG.NIVELES).map((n) => {
              const seleccionado = nivelSeleccionado === n.id
              const racha = perfil?.racha_actual || 0
              const xp = perfil?.xp_nivel || 0
              const desbloqueado = n.minRacha === 0 || (racha >= n.minRacha || xp >= n.minNivel)
              const puedeCostear = saldoMonedas >= n.costoMonedas

              return (
                <button
                  key={n.id}
                  type="button"
                  disabled={girando || !desbloqueado}
                  onClick={() => {
                    sound.playPop()
                    setNivelSeleccionado(n.id)
                    setResultadoFinal(null)
                    setErrorMsg(null)
                  }}
                  style={{
                    backgroundColor: seleccionado ? 'rgba(10, 132, 255, 0.22)' : 'rgba(255,255,255,0.04)',
                    border: seleccionado ? '2px solid #0A84FF' : '1px solid rgba(255,255,255,0.1)',
                    borderRadius: 12,
                    padding: '8px 6px',
                    color: '#FFF',
                    cursor: desbloqueado ? 'pointer' : 'not-allowed',
                    opacity: !desbloqueado ? 0.45 : !puedeCostear ? 0.75 : 1,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 3,
                    position: 'relative'
                  }}
                >
                  {!desbloqueado && (
                    <div style={{ position: 'absolute', top: 4, right: 4, color: '#EF4444' }}>
                      <Lock size={12} />
                    </div>
                  )}
                  <div style={{ fontSize: 12, fontWeight: 800 }}>{n.nombre.replace('Ruleta ', '')}</div>
                  <div style={{ fontSize: 11, color: '#FBBF24', fontWeight: 700 }}>{n.costoMonedas} 🪙</div>
                  {!desbloqueado && (
                    <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.5)' }}>
                      Racha ≥ {n.minRacha}
                    </div>
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {/* Canvas de la Ruleta */}
        <div style={{
          position: 'relative',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          padding: '6px 0'
        }}>
          <canvas
            ref={canvasRef}
            width={340}
            height={340}
            style={{
              width: '100%',
              maxWidth: 290,
              height: 'auto',
              aspectRatio: '1 / 1',
              borderRadius: '50%',
              display: 'block'
            }}
          />
        </div>

        {/* Mensaje de Resultado o Error */}
        {errorMsg && (
          <div style={{
            margin: '6px 18px',
            padding: '8px 12px',
            backgroundColor: 'rgba(239, 68, 68, 0.15)',
            border: '1px solid #EF4444',
            borderRadius: 10,
            color: '#FCA5A5',
            fontSize: 12,
            textAlign: 'center'
          }}>
            {errorMsg}
          </div>
        )}

        {resultadoFinal && (
          <div style={{
            margin: '6px 18px',
            padding: '10px 14px',
            backgroundColor: resultadoFinal.esVictoria ? 'rgba(52, 199, 89, 0.15)' : 'rgba(255,255,255,0.06)',
            border: `1px solid ${resultadoFinal.esVictoria ? '#34C759' : 'rgba(255,255,255,0.15)'}`,
            borderRadius: 12,
            textAlign: 'center'
          }}>
            <div style={{ fontSize: 15, fontWeight: 800, color: resultadoFinal.esVictoria ? '#86EFAC' : '#D1D5DB' }}>
              {resultadoFinal.esVictoria ? `¡+${resultadoFinal.stevenEurosGanados} StevenEuros acreditados!` : 'Sin premio en esta tirada'}
            </div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', marginTop: 2 }}>
              Sector: {resultadoFinal.ganador.label}
              {resultadoFinal.fueDegradado && (
                <div style={{ color: '#FBBF24', fontSize: 10, marginTop: 2 }}>
                  ⚠️ {resultadoFinal.motivoDegradacion}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Botón de Tirada */}
        <div style={{ padding: '12px 18px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <button
            type="button"
            onClick={girarRuleta}
            disabled={
              girando ||
              cooldownRestante > 0 ||
              saldoMonedas < configNivel.costoMonedas ||
              ganadosHoyRuleta >= topeDuro ||
              ruletaPausada
            }
            style={{
              backgroundColor: saldoMonedas >= configNivel.costoMonedas && ganadosHoyRuleta < topeDuro ? '#30D158' : '#3A3A3C',
              color: '#FFF',
              border: 'none',
              borderRadius: 14,
              padding: '13px 20px',
              fontSize: 15,
              fontWeight: 800,
              cursor: saldoMonedas >= configNivel.costoMonedas && ganadosHoyRuleta < topeDuro && !girando ? 'pointer' : 'not-allowed',
              boxShadow: saldoMonedas >= configNivel.costoMonedas ? '0 4px 14px rgba(48, 209, 88, 0.35)' : 'none',
              opacity: girando ? 0.7 : 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8
            }}
          >
            {girando ? (
              <span>Girando ruleta oficial...</span>
            ) : cooldownRestante > 0 ? (
              <span>Espera {cooldownRestante}s...</span>
            ) : ganadosHoyRuleta >= topeDuro ? (
              <span>Tope diario alcanzado ({topeDuro} SE)</span>
            ) : saldoMonedas < configNivel.costoMonedas ? (
              <span>Faltan monedas ({saldoMonedas}/{configNivel.costoMonedas} 🪙)</span>
            ) : ruletaPausada ? (
              <span>Ruleta en pausa administrativa</span>
            ) : (
              <span>Girar {configNivel.nombre} (-{configNivel.costoMonedas} 🪙)</span>
            )}
          </button>

          {esGameOver && onVolverAJugar && (
            <button
              type="button"
              onClick={onVolverAJugar}
              disabled={girando}
              style={{
                background: 'none',
                border: '1px solid rgba(255,255,255,0.15)',
                color: 'rgba(255,255,255,0.8)',
                borderRadius: 12,
                padding: '9px 16px',
                fontSize: 12,
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              Volver a Correr en Yoshi Runner
            </button>
          )}
        </div>
      </div>

      {/* Modal de Historial Ledger */}
      <PanelHistorialLedger
        perfil={perfil}
        abierto={mostrarHistorial}
        onCerrar={() => setMostrarHistorial(false)}
      />
    </div>
  )
}
