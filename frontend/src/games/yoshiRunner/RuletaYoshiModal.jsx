// frontend/src/games/yoshiRunner/RuletaYoshiModal.jsx
import { useState, useEffect, useRef, useCallback } from 'react'
import { YOSHI_ROULETTE_CONFIG } from '../../config/yoshiRouletteConfig'
import { sound, triggerConfetti } from '../../utils/haptics'
import { transmitirEvento } from '../../utils/realtimeHub'
import {
  RotateCcw,
  Sparkles,
  Coins,
  X,
  Volume2,
  VolumeX,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Play,
  ArrowRight,
  Flame,
  Award
} from 'lucide-react'

// Sintetizador de audio mecánico para la ruleta (Web Audio API retro)
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
      osc.frequency.linearRampToValueAtTime(80, this.ctx.currentTime + 0.3)
      gain.gain.setValueAtTime(0.12, this.ctx.currentTime)
      gain.gain.linearRampToValueAtTime(0.001, this.ctx.currentTime + 0.3)
      osc.connect(gain)
      gain.connect(this.ctx.destination)
      osc.start()
      osc.stop(this.ctx.currentTime + 0.3)
    } catch (_) {}
  }
}

const rouletteAudio = new RouletteAudio()

export function RuletaYoshiModal({
  perfil,
  saldoMonedasRuleta = 0,
  monedasPartidaRecienGanadas = 0,
  esGameOver = false,
  onActualizarSaldoMonedas,
  onActualizarStevenEuros,
  onCerrar,
  onVolverAJugar
}) {
  const [saldo, setSaldo] = useState(() => {
    // Si viene monedas recién ganadas en la partida, sumarlas respetando tope de 500
    const base = Number(saldoMonedasRuleta || 0)
    const extra = Number(monedasPartidaRecienGanadas || 0)
    return Math.min(YOSHI_ROULETTE_CONFIG.MAX_SALDO_GUARDADO, base + extra)
  })

  const [apuesta, setApuesta] = useState(() => {
    const s = Math.min(YOSHI_ROULETTE_CONFIG.MAX_SALDO_GUARDADO, Number(saldoMonedasRuleta || 0) + Number(monedasPartidaRecienGanadas || 0))
    if (s <= 0) return 0
    return Math.max(1, Math.min(s, Math.floor(s / 2) || 1))
  })

  const [girando, setGirando] = useState(false)
  const [errorMsg, setErrorMsg] = useState(null)
  const [resultadoFinal, setResultadoFinal] = useState(null)
  const [sonidoActivo, setSonidoActivo] = useState(true)
  const [cooldownRestante, setCooldownRestante] = useState(0)

  // Referencias para la animación por Canvas
  const canvasRef = useRef(null)
  const animFrameRef = useRef(null)
  const rotacionActualRef = useRef(0) // Radianes

  const segmentos = YOSHI_ROULETTE_CONFIG.SEGMENTOS
  const totalSegmentos = segmentos.length
  const anguloPorSegmento = (Math.PI * 2) / totalSegmentos

  // Sincronizar sonido
  const toggleSonido = () => {
    rouletteAudio.muted = sonidoActivo
    setSonidoActivo(!sonidoActivo)
  }

  // Notificar al servidor sobre monedas de la partida terminada si aplica
  useEffect(() => {
    if (monedasPartidaRecienGanadas > 0 && perfil?.id) {
      fetch('/api/ruleta/yoshi-acumular', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: perfil.id,
          monedas_partida: monedasPartidaRecienGanadas
        })
      })
        .then(r => r.json())
        .then(d => {
          if (d.success && typeof d.nuevoSaldoMonedas === 'number') {
            setSaldo(d.nuevoSaldoMonedas)
            onActualizarSaldoMonedas?.(d.nuevoSaldoMonedas)
            localStorage.setItem(`muudel_yoshi_ruleta_saldo_${perfil.id}`, String(d.nuevoSaldoMonedas))
          }
        })
        .catch(() => {
          // Fallback local
          const local = Math.min(
            YOSHI_ROULETTE_CONFIG.MAX_SALDO_GUARDADO,
            (Number(saldoMonedasRuleta) || 0) + monedasPartidaRecienGanadas
          )
          setSaldo(local)
          onActualizarSaldoMonedas?.(local)
          localStorage.setItem(`muudel_yoshi_ruleta_saldo_${perfil.id}`, String(local))
        })
    }
  }, [monedasPartidaRecienGanadas, perfil?.id])

  // Ajustar apuesta si cambia el saldo
  useEffect(() => {
    if (saldo <= 0) {
      setApuesta(0)
    } else if (apuesta > saldo) {
      setApuesta(saldo)
    } else if (apuesta <= 0) {
      setApuesta(Math.max(1, Math.min(saldo, Math.floor(saldo / 2) || 1)))
    }
  }, [saldo])

  // Temporizador de cooldown
  useEffect(() => {
    if (cooldownRestante <= 0) return
    const timer = setInterval(() => {
      setCooldownRestante(prev => Math.max(0, prev - 1))
    }, 1000)
    return () => clearInterval(timer)
  }, [cooldownRestante])

  // Dibujar ruleta en el Canvas
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

    // Borde exterior mecánico (estilo rueda de física)
    ctx.save()
    ctx.translate(cx, cy)
    ctx.rotate(rotacion)

    // Dibujar cada segmento
    segmentos.forEach((seg, i) => {
      const inicioAngulo = i * anguloPorSegmento
      const finAngulo = inicioAngulo + anguloPorSegmento

      ctx.beginPath()
      ctx.moveTo(0, 0)
      ctx.arc(0, 0, radio, inicioAngulo, finAngulo)
      ctx.closePath()

      ctx.fillStyle = seg.color
      ctx.fill()

      // Borde del sector
      ctx.strokeStyle = 'rgba(255,255,255,0.25)'
      ctx.lineWidth = 2
      ctx.stroke()

      // Texto y etiqueta del sector
      ctx.save()
      const anguloMedio = inicioAngulo + anguloPorSegmento / 2
      ctx.rotate(anguloMedio)
      ctx.textAlign = 'right'
      ctx.fillStyle = seg.textoColor || '#FFFFFF'
      ctx.font = '800 13px -apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif'
      ctx.shadowColor = 'rgba(0,0,0,0.5)'
      ctx.shadowBlur = 4
      ctx.fillText(`${seg.icono} ${seg.label}`, radio - 16, 5)
      ctx.restore()
    })

    // Clavijas perimetrales
    for (let i = 0; i < totalSegmentos * 2; i++) {
      const a = (i * Math.PI) / totalSegmentos
      const px = Math.cos(a) * (radio - 4)
      const py = Math.sin(a) * (radio - 4)
      ctx.beginPath()
      ctx.arc(px, py, 3, 0, Math.PI * 2)
      ctx.fillStyle = '#FFFFFF'
      ctx.shadowColor = 'rgba(0,0,0,0.4)'
      ctx.shadowBlur = 3
      ctx.fill()
    }

    ctx.restore()

    // Núcleo central mecánico
    ctx.save()
    ctx.beginPath()
    ctx.arc(cx, cy, 32, 0, Math.PI * 2)
    ctx.fillStyle = '#1C1C1E'
    ctx.shadowColor = 'rgba(0,0,0,0.3)'
    ctx.shadowBlur = 8
    ctx.fill()
    ctx.strokeStyle = '#FBBF24'
    ctx.lineWidth = 3
    ctx.stroke()

    // Ícono central
    ctx.font = '20px sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('🪙', cx, cy)
    ctx.restore()

    // Puntero / Flecha fija arriba (apunta hacia abajo en -Math.PI / 2)
    ctx.save()
    ctx.fillStyle = '#FF3B30'
    ctx.shadowColor = 'rgba(0,0,0,0.35)'
    ctx.shadowBlur = 6
    ctx.beginPath()
    ctx.moveTo(cx, cy - radio + 14)
    ctx.lineTo(cx - 11, cy - radio - 10)
    ctx.lineTo(cx + 11, cy - radio - 10)
    ctx.closePath()
    ctx.fill()
    ctx.strokeStyle = '#FFFFFF'
    ctx.lineWidth = 2
    ctx.stroke()
    ctx.restore()
  }, [segmentos, anguloPorSegmento, totalSegmentos])

  // Dibujado inicial
  useEffect(() => {
    dibujarRuleta(rotacionActualRef.current)
  }, [dibujarRuleta])

  // ─── Girar la ruleta con aleatorio validado en servidor ─────────────────────
  const girarRuleta = async () => {
    if (girando || apuesta <= 0 || apuesta > saldo || cooldownRestante > 0) return

    setErrorMsg(null)
    setResultadoFinal(null)
    setGirando(true)
    rouletteAudio._init()
    sound.playPop()

    try {
      // 1. EL RESULTADO SE DECIDE EN SERVIDOR ANTES DE LA ANIMACIÓN
      const resp = await fetch('/api/ruleta/yoshi-girar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: perfil?.id,
          apuesta: apuesta,
          saldo_local: saldo
        })
      })

      const data = await resp.json()

      if (!resp.ok || !data.success) {
        throw new Error(data.error || 'No se pudo realizar el giro en el servidor')
      }

      // 2. Extraer datos seguros del servidor
      const { indexGanador, ganador, stevenEurosGanados, nuevoSaldoMonedas, nuevosPuntosTotal } = data

      // 3. Calcular ángulo exacto de llegada para que el puntero (arriba: -PI/2) apunte al centro del sector ganador
      // En rotación R, la posición del sector i bajo el puntero (-PI/2) cumple:
      // (anguloMedio + R) % (2PI) = 3PI/2 = -PI/2
      const anguloMedioSector = indexGanador * anguloPorSegmento + anguloPorSegmento / 2
      const anguloDestinoBase = (Math.PI * 1.5) - anguloMedioSector

      // Vueltas completas adicionales (entre 5 y 7 vueltas completas) para una animación visual emocionante
      const vueltasCompletas = 5 + Math.floor(Math.random() * 2)
      const dosPi = Math.PI * 2
      const rotActual = rotacionActualRef.current

      // Normalizar rotación actual
      const rotActualNormalizada = ((rotActual % dosPi) + dosPi) % dosPi
      let delta = (anguloDestinoBase - rotActualNormalizada)
      while (delta < 0) delta += dosPi

      const rotacionObjetivo = rotActual + (vueltasCompletas * dosPi) + delta

      // 4. Animar con deceleración suave (cubic-bezier ease-out de 3.6 segundos)
      const duracionMs = 3600
      const inicioTiempo = performance.now()
      const rotacionInicial = rotActual
      let ultimoTickSector = -1

      const frameAnim = (ahora) => {
        const transcurrido = ahora - inicioTiempo
        const p = Math.min(1, transcurrido / duracionMs)
        // Función cúbica de desaceleración: 1 - (1 - p)^3.2
        const easeOut = 1 - Math.pow(1 - p, 3.2)
        const rot = rotacionInicial + (rotacionObjetivo - rotacionInicial) * easeOut

        rotacionActualRef.current = rot
        dibujarRuleta(rot)

        // Reproducir sonido mecánico de clac a medida que pasa cada clavija
        const sectorActivo = Math.floor((rot % dosPi) / (anguloPorSegmento / 2))
        if (sectorActivo !== ultimoTickSector) {
          ultimoTickSector = sectorActivo
          rouletteAudio.playTick()
        }

        if (p < 1) {
          animFrameRef.current = requestAnimationFrame(frameAnim)
        } else {
          // 5. ATERRIZAJE EXACTO EN EL RESULTADO OFICIAL DEL SERVIDOR
          rotacionActualRef.current = rotacionObjetivo
          dibujarRuleta(rotacionObjetivo)
          setGirando(false)

          // Actualizar saldos del usuario
          setSaldo(nuevoSaldoMonedas)
          onActualizarSaldoMonedas?.(nuevoSaldoMonedas)
          localStorage.setItem(`muudel_yoshi_ruleta_saldo_${perfil?.id}`, String(nuevoSaldoMonedas))

          if (typeof nuevosPuntosTotal === 'number' && perfil?.id) {
            onActualizarStevenEuros?.(nuevosPuntosTotal)
            localStorage.setItem('racha_local_user', JSON.stringify({ ...perfil, puntos_total: nuevosPuntosTotal }))
            transmitirEvento('puntos_actualizados', { userId: perfil.id, nuevosPuntos: nuevosPuntosTotal })
          }

          // Establecer cooldown
          setCooldownRestante(Math.ceil(YOSHI_ROULETTE_CONFIG.SPIN_COOLDOWN_MS / 1000))

          // Resultado y celebración
          setResultadoFinal({
            ganador,
            apuesta,
            stevenEurosGanados,
            esVictoria: stevenEurosGanados > 0
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
      setErrorMsg(err.message || 'Error al conectar con la ruleta')
      sound.playBoing?.()
    }
  }

  // Cancelar animación en desmontaje
  useEffect(() => {
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
    }
  }, [])

  // Modificadores de apuesta
  const fijarApuestaTodo = () => setApuesta(saldo)
  const fijarApuestaMitad = () => setApuesta(Math.max(1, Math.floor(saldo / 2)))
  const fijarApuestaCuarto = () => setApuesta(Math.max(1, Math.floor(saldo / 4)))

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      backgroundColor: 'rgba(0,0,0,0.78)',
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
        backgroundColor: 'var(--color-surface)',
        borderRadius: 24,
        border: '1px solid var(--color-separator)',
        boxShadow: '0 20px 50px rgba(0,0,0,0.3)',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        maxHeight: '94vh'
      }}>
        {/* Cabecera modal */}
        <div style={{
          padding: '14px 18px',
          borderBottom: '1px solid var(--color-separator)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: 'var(--color-surface-secondary)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 34,
              height: 34,
              borderRadius: 10,
              backgroundColor: '#FBBF24',
              color: '#000',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 900,
              fontSize: 18
            }}>
              🎰
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <h3 className="apple-headline" style={{ fontSize: 16, margin: 0 }}>
                  Ruleta de Yoshi
                </h3>
                <span style={{
                  fontSize: 10,
                  fontWeight: 800,
                  padding: '2px 7px',
                  borderRadius: 9999,
                  backgroundColor: 'rgba(234, 179, 8, 0.15)',
                  color: '#D97706',
                  border: '1px solid rgba(234, 179, 8, 0.3)'
                }}>
                  Premios en StevenEuros 💶
                </span>
              </div>
              <p className="apple-caption" style={{ margin: 0, fontSize: 11 }}>
                Monedas exclusivas de partida · Máximo guardado {YOSHI_ROULETTE_CONFIG.MAX_SALDO_GUARDADO}
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <button
              type="button"
              onClick={toggleSonido}
              title={sonidoActivo ? 'Silenciar sonido' : 'Activar sonido'}
              style={{
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--color-secondary-ink)',
                padding: 6
              }}
            >
              {sonidoActivo ? <Volume2 size={18} /> : <VolumeX size={18} />}
            </button>
            {onCerrar && (
              <button
                type="button"
                onClick={onCerrar}
                title="Cerrar y guardar monedas"
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--color-secondary-ink)',
                  padding: 6
                }}
              >
                <X size={20} />
              </button>
            )}
          </div>
        </div>

        {/* Cuerpo con Scroll si es pantalla pequeña */}
        <div style={{
          padding: '16px 18px',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 14
        }}>
          {/* Banner de Saldo actual de monedas Yoshi */}
          <div style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: 'var(--color-fill-secondary)',
            padding: '10px 14px',
            borderRadius: 14,
            border: '1px solid var(--color-separator)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Coins size={20} color="#F59E0B" />
              <div>
                <span className="apple-caption" style={{ display: 'block', fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  Saldo de monedas Yoshi
                </span>
                <span className="tabular-nums" style={{ fontSize: 18, fontWeight: 900, color: 'var(--color-ink)' }}>
                  {saldo} <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-secondary-ink)' }}>/ {YOSHI_ROULETTE_CONFIG.MAX_SALDO_GUARDADO} máx</span>
                </span>
              </div>
            </div>

            {monedasPartidaRecienGanadas > 0 && (
              <div style={{
                fontSize: 11,
                fontWeight: 700,
                color: '#16A34A',
                backgroundColor: 'rgba(34, 197, 94, 0.12)',
                padding: '4px 8px',
                borderRadius: 8
              }}>
                +{monedasPartidaRecienGanadas} añadidas
              </div>
            )}
          </div>

          {/* Rueda de la Ruleta (Canvas) */}
          <div style={{
            position: 'relative',
            width: 270,
            height: 270,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '4px 0'
          }}>
            <canvas
              ref={canvasRef}
              width={270}
              height={270}
              style={{
                width: 270,
                height: 270,
                display: 'block',
                borderRadius: '50%'
              }}
            />
          </div>

          {/* Mensaje de Error */}
          {errorMsg && (
            <div style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '8px 12px',
              borderRadius: 10,
              backgroundColor: 'rgba(239, 68, 68, 0.12)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              color: '#EF4444',
              fontSize: 12,
              fontWeight: 600
            }}>
              <AlertCircle size={16} style={{ flexShrink: 0 }} />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Pantalla de Resultado Oficial de la Tirada */}
          {resultadoFinal && !girando && (
            <div style={{
              width: '100%',
              padding: '12px 14px',
              borderRadius: 16,
              backgroundColor: resultadoFinal.esVictoria ? 'rgba(34, 197, 94, 0.12)' : 'rgba(239, 68, 68, 0.12)',
              border: `1px solid ${resultadoFinal.esVictoria ? '#22C55E' : '#EF4444'}`,
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
              animation: 'fadeIn 0.2s ease',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: resultadoFinal.esVictoria ? '#16A34A' : '#DC2626' }}>
                {resultadoFinal.esVictoria
                  ? `¡${resultadoFinal.ganador.icono} ${resultadoFinal.ganador.label}! Ganaste StevenEuros`
                  : 'Has caído en x0 Pierde. ¡Suerte en la próxima!'}
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'center', fontSize: 12 }}>
                <div>
                  <span className="apple-caption" style={{ display: 'block' }}>Apostado</span>
                  <strong>{resultadoFinal.apuesta} monedas</strong>
                </div>
                <div>
                  <span className="apple-caption" style={{ display: 'block' }}>Multiplicador</span>
                  <strong>{resultadoFinal.ganador.label}</strong>
                </div>
                <div>
                  <span className="apple-caption" style={{ display: 'block' }}>StevenEuros Ganados</span>
                  <strong style={{ color: resultadoFinal.esVictoria ? '#16A34A' : 'var(--color-ink)', fontSize: 14 }}>
                    +{resultadoFinal.stevenEurosGanados} SE 💶
                  </strong>
                </div>
              </div>
            </div>
          )}

          {/* Selector de Apuesta */}
          <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span className="apple-headline" style={{ fontSize: 13 }}>
                Elige cuánto apostar:
              </span>
              <span className="apple-caption">
                Premio potencial: <strong style={{ color: 'var(--color-accent)' }}>hasta {Math.floor(apuesta * 10)} SE</strong>
              </span>
            </div>

            {/* Botones de porcentaje rápido */}
            <div style={{ display: 'flex', gap: 6 }}>
              {[
                { label: '1/4 (25%)', fn: fijarApuestaCuarto },
                { label: 'Mitad (50%)', fn: fijarApuestaMitad },
                { label: 'Todo (100%)', fn: fijarApuestaTodo }
              ].map((btn, idx) => (
                <button
                  key={idx}
                  type="button"
                  disabled={girando || saldo <= 0}
                  onClick={btn.fn}
                  style={{
                    flex: 1,
                    minHeight: 38,
                    borderRadius: 10,
                    border: '1px solid var(--color-separator)',
                    backgroundColor: 'var(--color-fill-secondary)',
                    color: 'var(--color-ink)',
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: saldo > 0 && !girando ? 'pointer' : 'not-allowed',
                    opacity: saldo > 0 && !girando ? 1 : 0.6,
                    transition: 'all 0.12s ease'
                  }}
                >
                  {btn.label}
                </button>
              ))}
            </div>

            {/* Input numérico personalizado */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <button
                type="button"
                disabled={girando || apuesta <= 1}
                onClick={() => setApuesta(p => Math.max(1, p - 1))}
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 12,
                  border: '1px solid var(--color-separator)',
                  backgroundColor: 'var(--color-fill-secondary)',
                  fontSize: 18,
                  fontWeight: 800,
                  cursor: apuesta > 1 && !girando ? 'pointer' : 'not-allowed',
                  color: 'var(--color-ink)'
                }}
              >
                -
              </button>

              <div style={{ flex: 1, position: 'relative' }}>
                <input
                  type="number"
                  min="1"
                  max={saldo || 1}
                  disabled={girando || saldo <= 0}
                  value={apuesta}
                  onChange={(e) => {
                    const v = parseInt(e.target.value, 10)
                    if (isNaN(v) || v <= 0) setApuesta(0)
                    else setApuesta(Math.min(saldo, v))
                  }}
                  className="apple-input"
                  style={{
                    textAlign: 'center',
                    minHeight: 44,
                    fontSize: 17,
                    fontWeight: 800,
                    padding: '8px'
                  }}
                />
              </div>

              <button
                type="button"
                disabled={girando || apuesta >= saldo}
                onClick={() => setApuesta(p => Math.min(saldo, p + 1))}
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 12,
                  border: '1px solid var(--color-separator)',
                  backgroundColor: 'var(--color-fill-secondary)',
                  fontSize: 18,
                  fontWeight: 800,
                  cursor: apuesta < saldo && !girando ? 'pointer' : 'not-allowed',
                  color: 'var(--color-ink)'
                }}
              >
                +
              </button>
            </div>
          </div>
        </div>

        {/* Barra de Acciones Inferior */}
        <div style={{
          padding: '14px 18px',
          borderTop: '1px solid var(--color-separator)',
          backgroundColor: 'var(--color-surface-secondary)',
          display: 'flex',
          flexDirection: 'column',
          gap: 10
        }}>
          <button
            type="button"
            className="btn-primary"
            disabled={girando || apuesta <= 0 || apuesta > saldo || cooldownRestante > 0}
            onClick={girarRuleta}
            style={{
              width: '100%',
              minHeight: 48,
              fontSize: 16,
              fontWeight: 800,
              backgroundColor: '#30D158',
              boxShadow: '0 4px 14px rgba(48, 209, 88, 0.35)',
              borderRadius: 14,
              cursor: saldo > 0 && !girando && cooldownRestante === 0 ? 'pointer' : 'not-allowed',
              opacity: saldo > 0 && !girando && cooldownRestante === 0 ? 1 : 0.6
            }}
          >
            {girando ? (
              <span>Girando ruleta...</span>
            ) : cooldownRestante > 0 ? (
              <span>Espera {cooldownRestante}s (Cooldown)</span>
            ) : saldo <= 0 ? (
              <span>Sin monedas de Yoshi para apostar</span>
            ) : (
              <span>¡Girar Ruleta ({apuesta} monedas)</span>
            )}
          </button>

          <div style={{ display: 'flex', gap: 8 }}>
            {onVolverAJugar && (
              <button
                type="button"
                className="btn-secondary"
                disabled={girando}
                onClick={onVolverAJugar}
                style={{
                  flex: 1,
                  minHeight: 44,
                  fontSize: 13,
                  fontWeight: 700,
                  borderRadius: 12,
                  gap: 6
                }}
              >
                <RotateCcw size={15} />
                <span>Volver a jugar Yoshi</span>
              </button>
            )}

            {onCerrar && (
              <button
                type="button"
                onClick={onCerrar}
                disabled={girando}
                style={{
                  flex: 1,
                  minHeight: 44,
                  fontSize: 13,
                  fontWeight: 600,
                  borderRadius: 12,
                  border: '1px solid var(--color-separator)',
                  backgroundColor: 'var(--color-surface)',
                  color: 'var(--color-ink)',
                  cursor: girando ? 'not-allowed' : 'pointer'
                }}
              >
                Guardar monedas para luego
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
