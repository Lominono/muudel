// frontend/src/games/dustRacing/DustRacingGame.jsx
import { useEffect, useRef, useState, useCallback } from 'react'
import { sound, triggerConfetti } from '../../utils/haptics'
import { supabase } from '../../utils/supabase'
import { transmitirEvento } from '../../utils/realtimeHub'
import {
  Trophy,
  Play,
  RotateCcw,
  Volume2,
  VolumeX,
  Coins,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  Flame,
  Zap,
  Timer,
  CheckCircle2,
  Flag,
  Gauge
} from 'lucide-react'

// ─── Síntesis de Audio Retro 8-bit para Carreras ──────────────────────────────
class RacingAudio {
  constructor() {
    this.ctx = null
    this.muted = false
    this.engineOsc = null
    this.engineGain = null
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

  _play(fn) {
    if (this.muted) return
    try {
      this._init()
      if (!this.ctx) return
      fn(this.ctx)
    } catch (_) {}
  }

  startEngine() {
    if (this.muted || this.engineOsc) return
    this._play(ctx => {
      try {
        this.engineOsc = ctx.createOscillator()
        this.engineGain = ctx.createGain()
        this.engineOsc.type = 'sawtooth'
        this.engineOsc.frequency.setValueAtTime(55, ctx.currentTime)
        this.engineGain.gain.setValueAtTime(0.04, ctx.currentTime)
        this.engineOsc.connect(this.engineGain)
        this.engineGain.connect(ctx.destination)
        this.engineOsc.start()
      } catch (_) {}
    })
  }

  updateEngine(rpmRatio) {
    if (this.muted || !this.engineOsc || !this.ctx) return
    try {
      const targetFreq = 50 + rpmRatio * 180
      this.engineOsc.frequency.setTargetAtTime(targetFreq, this.ctx.currentTime, 0.05)
      this.engineGain.gain.setTargetAtTime(0.03 + rpmRatio * 0.05, this.ctx.currentTime, 0.05)
    } catch (_) {}
  }

  stopEngine() {
    try {
      if (this.engineOsc) {
        this.engineOsc.stop()
        this.engineOsc.disconnect()
        this.engineOsc = null
      }
    } catch (_) {}
  }

  playSkid() {
    this._play(ctx => {
      const osc = ctx.createOscillator(), g = ctx.createGain()
      osc.type = 'triangle'
      osc.frequency.setValueAtTime(800 + Math.random() * 300, ctx.currentTime)
      osc.frequency.exponentialRampToValueAtTime(300, ctx.currentTime + 0.12)
      g.gain.setValueAtTime(0.08, ctx.currentTime)
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12)
      osc.connect(g); g.connect(ctx.destination)
      osc.start(); osc.stop(ctx.currentTime + 0.12)
    })
  }

  playTurbo() {
    this._play(ctx => {
      [320, 480, 640, 960].forEach((f, i) => {
        const osc = ctx.createOscillator(), g = ctx.createGain()
        osc.type = 'sawtooth'
        osc.frequency.setValueAtTime(f, ctx.currentTime + i * 0.04)
        g.gain.setValueAtTime(0.12, ctx.currentTime + i * 0.04)
        g.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + i * 0.04 + 0.18)
        osc.connect(g); g.connect(ctx.destination)
        osc.start(ctx.currentTime + i * 0.04); osc.stop(ctx.currentTime + i * 0.04 + 0.18)
      })
    })
  }

  playCoin() {
    this._play(ctx => {
      const osc = ctx.createOscillator(), g = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.setValueAtTime(987.77, ctx.currentTime)
      osc.frequency.setValueAtTime(1318.51, ctx.currentTime + 0.07)
      g.gain.setValueAtTime(0.15, ctx.currentTime)
      g.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25)
      osc.connect(g); g.connect(ctx.destination)
      osc.start(); osc.stop(ctx.currentTime + 0.25)
    })
  }

  playCheckpoint() {
    this._play(ctx => {
      const osc = ctx.createOscillator(), g = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.setValueAtTime(659.25, ctx.currentTime)
      osc.frequency.setValueAtTime(880.0, ctx.currentTime + 0.08)
      g.gain.setValueAtTime(0.12, ctx.currentTime)
      g.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2)
      osc.connect(g); g.connect(ctx.destination)
      osc.start(); osc.stop(ctx.currentTime + 0.2)
    })
  }

  playCrash() {
    this._play(ctx => {
      const osc = ctx.createOscillator(), g = ctx.createGain()
      osc.type = 'square'
      osc.frequency.setValueAtTime(140, ctx.currentTime)
      osc.frequency.exponentialRampToValueAtTime(40, ctx.currentTime + 0.18)
      g.gain.setValueAtTime(0.2, ctx.currentTime)
      g.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.18)
      osc.connect(g); g.connect(ctx.destination)
      osc.start(); osc.stop(ctx.currentTime + 0.18)
    })
  }

  playVictory() {
    this._play(ctx => {
      [523.25, 659.25, 783.99, 1046.50, 1318.51].forEach((freq, idx) => {
        const osc = ctx.createOscillator(), g = ctx.createGain()
        osc.type = 'triangle'
        osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.09)
        g.gain.setValueAtTime(0.18, ctx.currentTime + idx * 0.09)
        g.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + idx * 0.09 + 0.28)
        osc.connect(g); g.connect(ctx.destination)
        osc.start(ctx.currentTime + idx * 0.09)
        osc.stop(ctx.currentTime + idx * 0.09 + 0.28)
      })
    })
  }
}

const audioRacing = new RacingAudio()

// ─── Constantes del Circuito y Física ─────────────────────────────────────────
const CANVAS_W = 760
const CANVAS_H = 430
const TOTAL_VUELTAS = 3

// Nodos centrales de la pista (Waypoints del circuito cerrado)
const CIRCUIT_POINTS = [
  { x: 120, y: 340, w: 90 }, // Meta / Salida
  { x: 260, y: 340, w: 90 }, // Recta principal
  { x: 440, y: 340, w: 90 },
  { x: 620, y: 320, w: 85 }, // Curva 1
  { x: 680, y: 230, w: 80 },
  { x: 640, y: 130, w: 80 }, // Curva 2
  { x: 520, y: 90,  w: 85 },
  { x: 420, y: 150, w: 80 }, // Chicane central
  { x: 340, y: 190, w: 80 },
  { x: 260, y: 110, w: 80 }, // Horquilla norte
  { x: 140, y: 100, w: 85 },
  { x: 80,  y: 190, w: 85 }, // Curva entrada a meta
  { x: 90,  y: 280, w: 85 },
]

export function DustRacingGame({ perfil, onMonedasGanadas, onRetoCompletado, onClose }) {
  const canvasRef = useRef(null)
  const animFrameRef = useRef(null)
  const keysRef = useRef({})

  const [estadoJuego, setEstadoJuego] = useState('inicio') // 'inicio' | 'carrera' | 'final'
  const [vueltaActual, setVueltaActual] = useState(1)
  const [posicionCarrera, setPosicionCarrera] = useState(1)
  const [tiempoVuelta, setTiempoVuelta] = useState('00:00.0')
  const [mejorVuelta, setMejorVuelta] = useState(() => localStorage.getItem('muudel_dust_best_lap') || '--:--.-')
  const [puntosPartida, setPuntosPartida] = useState(0)
  const [monedasPartida, setMonedasPartida] = useState(0)
  const [sonido, setSonido] = useState(true)

  const estadoMutableRef = useRef(null)

  function crearEstadoInicial() {
    return {
      isRunning: false,
      lap: 1,
      maxLaps: TOTAL_VUELTAS,
      raceTime: 0,
      currentLapTime: 0,
      bestLapTime: Infinity,
      score: 0,
      coins: 0,
      driftScore: 0,
      screenShake: 0,
      particles: [],
      skidMarks: [],
      boostPads: [
        { x: 300, y: 340, w: 36, h: 22, rot: 0 },
        { x: 500, y: 95, w: 36, h: 22, rot: Math.PI }
      ],
      coinsItems: [
        { x: 200, y: 340, active: true },
        { x: 630, y: 220, active: true },
        { x: 420, y: 150, active: true },
        { x: 200, y: 105, active: true },
        { x: 85,  y: 240, active: true }
      ],
      nextCheckpoint: 1,
      // Coche del jugador (Amarillo deportivo SMR2)
      player: {
        x: 120,
        y: 340,
        angle: 0,
        speed: 0,
        maxSpeed: 7.2,
        accel: 0.14,
        brake: 0.22,
        turnSpeed: 0.052,
        friction: 0.965,
        turbo: 0,
        drifting: false,
        lap: 1,
        lapProgress: 0,
        color: '#FBBF24'
      },
      // Rivales IA (Rojo Router y Azul Switch)
      rivals: [
        {
          id: 'rival_1',
          name: 'Router Red',
          x: 95,
          y: 325,
          angle: 0,
          speed: 0,
          maxSpeed: 6.2,
          targetNode: 1,
          color: '#EF4444',
          lap: 1,
          lapProgress: 0
        },
        {
          id: 'rival_2',
          name: 'Switch Blue',
          x: 95,
          y: 355,
          angle: 0,
          speed: 0,
          maxSpeed: 5.9,
          targetNode: 1,
          color: '#3B82F6',
          lap: 1,
          lapProgress: 0
        }
      ]
    }
  }

  const iniciarCarrera = () => {
    audioRacing._init()
    audioRacing.startEngine()
    const st = crearEstadoInicial()
    st.isRunning = true
    estadoMutableRef.current = st
    setEstadoJuego('carrera')
    setVueltaActual(1)
    setPuntosPartida(0)
    setMonedasPartida(0)
  }

  // Teclado
  useEffect(() => {
    const handleDown = (e) => {
      keysRef.current[e.key] = true
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
        e.preventDefault()
      }
    }
    const handleUp = (e) => {
      keysRef.current[e.key] = false
    }
    window.addEventListener('keydown', handleDown)
    window.addEventListener('keyup', handleUp)
    return () => {
      window.removeEventListener('keydown', handleDown)
      window.removeEventListener('keyup', handleUp)
      audioRacing.stopEngine()
    }
  }, [])

  // Finalizar carrera y registrar ganancias
  const finalizarCarrera = useCallback(async (tiempoFinalS, scoreFinal, monedasGanadas, posicion) => {
    audioRacing.stopEngine()
    audioRacing.playVictory()
    triggerConfetti()
    sound.playStamp()

    setEstadoJuego('final')
    setPuntosPartida(scoreFinal)
    setMonedasPartida(monedasGanadas)

    if (onMonedasGanadas) onMonedasGanadas(monedasGanadas)
    if (onRetoCompletado && scoreFinal >= 150) onRetoCompletado(scoreFinal)

    // Guardar en Supabase arcade_scores y juegos_puntuaciones
    if (perfil?.id) {
      try {
        await supabase.from('arcade_scores').insert({
          user_id: perfil.id,
          juego: 'dust_racing',
          puntuacion: scoreFinal,
          monedas: monedasGanadas,
          fecha: new Date().toISOString().split('T')[0]
        })
      } catch (_) {}

      try {
        await supabase.from('juegos_puntuaciones').insert({
          user_id: perfil.id,
          juego: 'dust_racing',
          puntos: scoreFinal,
          monedas_ganadas: monedasGanadas
        })
      } catch (_) {}
    }

    transmitirEvento('arcade_record', {
      juego: 'dust_racing',
      usuario: perfil?.nombre || 'Piloto SMR2',
      puntuacion: scoreFinal,
      posicion
    })
  }, [perfil, onMonedasGanadas, onRetoCompletado])

  // ─── Game Loop a 60 Hz exactos (Fixed Timestep) ───────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    canvas.width = CANVAS_W * dpr
    canvas.height = CANVAS_H * dpr
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.scale(dpr, dpr)

    const FIXED_STEP_MS = 1000 / 60
    let lastTime = performance.now()
    let accumulator = 0

    // Física por tick (60 ticks por segundo garantizados)
    const updatePhysics = (st) => {
      st.raceTime += 1 / 60
      st.currentLapTime += 1 / 60

      const p = st.player
      const keys = keysRef.current

      // Aceleración y Freno
      const pressingUp = keys['ArrowUp'] || keys['w'] || keys['W']
      const pressingDown = keys['ArrowDown'] || keys['s'] || keys['S']
      const pressingLeft = keys['ArrowLeft'] || keys['a'] || keys['A']
      const pressingRight = keys['ArrowRight'] || keys['d'] || keys['D']

      if (pressingUp) {
        p.speed = Math.min(p.speed + p.accel, p.maxSpeed + (p.turbo > 0 ? 3.5 : 0))
      } else if (pressingDown) {
        p.speed = Math.max(p.speed - p.brake, -2.5)
      } else {
        p.speed *= p.friction
      }

      // Dirección
      if (Math.abs(p.speed) > 0.3) {
        const dir = p.speed > 0 ? 1 : -1
        if (pressingLeft) p.angle -= p.turnSpeed * dir
        if (pressingRight) p.angle += p.turnSpeed * dir
      }

      // Detección de superficie (Asfalto vs Hierba / Fuera de pista)
      let minDistToCircuit = Infinity
      for (let i = 0; i < CIRCUIT_POINTS.length; i++) {
        const pt = CIRCUIT_POINTS[i]
        const d = Math.hypot(p.x - pt.x, p.y - pt.y)
        if (d < minDistToCircuit) minDistToCircuit = d
      }

      const enPasto = minDistToCircuit > 55
      if (enPasto) {
        p.speed *= 0.92 // Fricción en hierba
        if (Math.abs(p.speed) > 1.5 && Math.random() > 0.4) {
          st.particles.push({
            x: p.x, y: p.y,
            vx: (Math.random() - 0.5) * 2, vy: (Math.random() - 0.5) * 2,
            color: '#166534', size: 3.5, life: 12
          })
        }
      }

      // Derrape y Marcas de Neumáticos (Skid Marks)
      const turning = pressingLeft || pressingRight
      p.drifting = turning && p.speed > 4.5 && !enPasto
      if (p.drifting) {
        st.driftScore += 1
        st.score += 1
        audioRacing.playSkid()
        // Crear marcas
        const cos = Math.cos(p.angle), sin = Math.sin(p.angle)
        st.skidMarks.push({
          x1: p.x - sin * 6, y1: p.y + cos * 6,
          x2: p.x + sin * 6, y2: p.y - cos * 6,
          alpha: 0.4
        })
        if (st.skidMarks.length > 250) st.skidMarks.shift()
      }

      // Turbo pads
      if (p.turbo > 0) p.turbo--
      st.boostPads.forEach(pad => {
        if (Math.hypot(p.x - pad.x, p.y - pad.y) < 24) {
          if (p.turbo <= 0) {
            p.turbo = 45 // 0.75s de boost
            audioRacing.playTurbo()
            st.screenShake = 6
          }
        }
      })

      // Monedas
      st.coinsItems.forEach(c => {
        if (c.active && Math.hypot(p.x - c.x, p.y - c.y) < 20) {
          c.active = false
          st.coins += 2
          st.score += 25
          audioRacing.playCoin()
          st.particles.push({ x: c.x, y: c.y, vx: 0, vy: -1.5, color: '#FBBF24', size: 5, life: 16 })
        }
      })

      // Actualizar posición del coche
      p.x += Math.cos(p.angle) * p.speed
      p.y += Math.sin(p.angle) * p.speed

      // Rebote en bordes de pantalla
      if (p.x < 15 || p.x > CANVAS_W - 15 || p.y < 15 || p.y > CANVAS_H - 15) {
        p.speed *= -0.5
        p.x = Math.max(16, Math.min(CANVAS_W - 16, p.x))
        p.y = Math.max(16, Math.min(CANVAS_H - 16, p.y))
        audioRacing.playCrash()
        st.screenShake = 5
      }

      // Checkpoints y Vueltas
      const targetCp = CIRCUIT_POINTS[st.nextCheckpoint]
      if (targetCp && Math.hypot(p.x - targetCp.x, p.y - targetCp.y) < targetCp.w * 0.7) {
        st.nextCheckpoint = (st.nextCheckpoint + 1) % CIRCUIT_POINTS.length
        audioRacing.playCheckpoint()

        // Si pasó el checkpoint 0 (Meta) tras recorrer todo el circuito
        if (st.nextCheckpoint === 1) {
          if (st.currentLapTime < st.bestLapTime) {
            st.bestLapTime = st.currentLapTime
            const min = Math.floor(st.bestLapTime / 60)
            const seg = (st.bestLapTime % 60).toFixed(1)
            const fmt = `${String(min).padStart(2, '0')}:${seg.padStart(4, '0')}`
            setMejorVuelta(fmt)
            localStorage.setItem('muudel_dust_best_lap', fmt)
          }

          st.score += 100 // Bonus vuelta completada
          st.currentLapTime = 0
          st.lap++
          p.lap = st.lap
          setVueltaActual(Math.min(st.lap, st.maxLaps))

          if (st.lap > st.maxLaps) {
            // Carrera completada
            st.isRunning = false
            const monedasTotal = Math.min(30, 10 + st.coins + Math.floor(st.score / 60))
            finalizarCarrera(st.raceTime, st.score, monedasTotal, 1)
          }
        }
      }

      // IA de los Rivales
      st.rivals.forEach(r => {
        const node = CIRCUIT_POINTS[r.targetNode]
        if (!node) return
        const targetAngle = Math.atan2(node.y - r.y, node.x - r.x)
        let diffAngle = targetAngle - r.angle
        while (diffAngle < -Math.PI) diffAngle += Math.PI * 2
        while (diffAngle > Math.PI) diffAngle -= Math.PI * 2
        r.angle += Math.sign(diffAngle) * Math.min(Math.abs(diffAngle), 0.045)
        r.speed = Math.min(r.speed + 0.1, r.maxSpeed)
        r.x += Math.cos(r.angle) * r.speed
        r.y += Math.sin(r.angle) * r.speed

        if (Math.hypot(r.x - node.x, r.y - node.y) < 65) {
          r.targetNode = (r.targetNode + 1) % CIRCUIT_POINTS.length
          if (r.targetNode === 1) r.lap++
        }

        // Colisión entre jugador y rival
        if (Math.hypot(p.x - r.x, p.y - r.y) < 22) {
          p.speed *= 0.8
          r.speed *= 0.8
          audioRacing.playCrash()
          st.screenShake = 4
        }
      })

      // Audio motor dinámico
      audioRacing.updateEngine(Math.abs(p.speed) / p.maxSpeed)

      // UI timers
      const m = Math.floor(st.currentLapTime / 60)
      const s = (st.currentLapTime % 60).toFixed(1)
      setTiempoVuelta(`${String(m).padStart(2, '0')}:${s.padStart(4, '0')}`)
      setPuntosPartida(st.score)
      setMonedasPartida(st.coins)

      // Partículas
      st.particles.forEach(pt => { pt.x += pt.vx; pt.y += pt.vy; pt.life-- })
      st.particles = st.particles.filter(pt => pt.life > 0)
    }

    // Render Frame
    const draw = (st) => {
      ctx.clearRect(0, 0, CANVAS_W, CANVAS_H)
      if (!st) return

      let shakeX = 0, shakeY = 0
      if (st.screenShake > 0) {
        shakeX = (Math.random() - 0.5) * st.screenShake
        shakeY = (Math.random() - 0.5) * st.screenShake
        st.screenShake = Math.max(0, st.screenShake - 0.4)
      }

      ctx.save()
      ctx.translate(shakeX, shakeY)

      // 1. Infield / Hierba
      ctx.fillStyle = '#14532D' // Verde césped de carreras
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H)

      // 2. Trazado de Asfalto (Pista continua)
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'

      // Pista exterior de tierra / arcén
      ctx.lineWidth = 104
      ctx.strokeStyle = '#78350F'
      ctx.beginPath()
      CIRCUIT_POINTS.forEach((pt, i) => {
        if (i === 0) ctx.moveTo(pt.x, pt.y)
        else ctx.lineTo(pt.x, pt.y)
      })
      ctx.closePath(); ctx.stroke()

      // Bordes de carrera rojos y blancos (Kerbs)
      ctx.lineWidth = 94
      ctx.strokeStyle = '#DC2626'
      ctx.stroke()

      // Asfalto gris oscuro
      ctx.lineWidth = 82
      ctx.strokeStyle = '#1F2937'
      ctx.stroke()

      // Línea central discontinua
      ctx.lineWidth = 2
      ctx.setLineDash([12, 14])
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)'
      ctx.stroke()
      ctx.setLineDash([])

      // 3. Línea de Meta (Ajedrezada)
      ctx.save()
      ctx.translate(120, 340)
      ctx.rotate(Math.PI / 2)
      for (let r = -40; r < 40; r += 8) {
        for (let c = -6; c < 6; c += 6) {
          ctx.fillStyle = (Math.floor(r / 8) + Math.floor(c / 6)) % 2 === 0 ? '#FFFFFF' : '#111827'
          ctx.fillRect(c, r, 6, 8)
        }
      }
      ctx.restore()

      // 4. Marcas de neumáticos (Skid Marks)
      st.skidMarks.forEach(sm => {
        ctx.strokeStyle = `rgba(17, 24, 39, ${sm.alpha})`
        ctx.lineWidth = 2.5
        ctx.beginPath()
        ctx.moveTo(sm.x1, sm.y1); ctx.lineTo(sm.x2, sm.y2)
        ctx.stroke()
      })

      // 5. Turbo Pads
      st.boostPads.forEach(pad => {
        ctx.save()
        ctx.translate(pad.x, pad.y)
        ctx.rotate(pad.rot)
        ctx.fillStyle = '#0284C7'
        ctx.fillRect(-pad.w / 2, -pad.h / 2, pad.w, pad.h)
        ctx.fillStyle = '#38BDF8'
        ctx.beginPath()
        ctx.moveTo(-10, -6); ctx.lineTo(8, 0); ctx.lineTo(-10, 6)
        ctx.fill()
        ctx.restore()
      })

      // 6. Monedas coleccionables
      st.coinsItems.forEach(c => {
        if (!c.active) return
        ctx.save()
        ctx.translate(c.x, c.y)
        ctx.fillStyle = '#F59E0B'
        ctx.beginPath(); ctx.arc(0, 0, 7, 0, Math.PI * 2); ctx.fill()
        ctx.fillStyle = '#FEF3C7'
        ctx.font = 'bold 9px -apple-system, sans-serif'
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
        ctx.fillText('$', 0, 0)
        ctx.restore()
      })

      // 7. Dibujar Rivales IA
      st.rivals.forEach(r => {
        ctx.save()
        ctx.translate(r.x, r.y)
        ctx.rotate(r.angle)
        // Chasis
        ctx.fillStyle = r.color
        ctx.fillRect(-12, -7, 24, 14)
        // Ruedas
        ctx.fillStyle = '#111827'
        ctx.fillRect(-10, -9, 6, 3); ctx.fillRect(4, -9, 6, 3)
        ctx.fillRect(-10, 6, 6, 3); ctx.fillRect(4, 6, 6, 3)
        // Cabina
        ctx.fillStyle = '#9CA3AF'
        ctx.fillRect(-4, -4, 8, 8)
        ctx.restore()
      })

      // 8. Dibujar Coche del Jugador
      const p = st.player
      ctx.save()
      ctx.translate(p.x, p.y)
      ctx.rotate(p.angle)

      // Sombra
      ctx.fillStyle = 'rgba(0,0,0,0.3)'
      ctx.fillRect(-11, -5, 24, 14)

      // Chasis deportivo
      ctx.fillStyle = p.turbo > 0 ? '#38BDF8' : p.color
      ctx.fillRect(-13, -7.5, 26, 15)

      // Alerón trasero
      ctx.fillStyle = '#1E293B'
      ctx.fillRect(-14, -8, 3, 16)

      // Ruedas
      ctx.fillStyle = '#0F172A'
      ctx.fillRect(-10, -9.5, 6, 3.5); ctx.fillRect(4, -9.5, 6, 3.5)
      ctx.fillRect(-10, 6, 6, 3.5); ctx.fillRect(4, 6, 6, 3.5)

      // Parabrisas / Cabina
      ctx.fillStyle = '#0F172A'
      ctx.fillRect(-4, -4.5, 9, 9)
      ctx.fillStyle = '#38BDF8'
      ctx.fillRect(-1, -3, 5, 6)

      // Fuego de escape si hay turbo
      if (p.turbo > 0) {
        ctx.fillStyle = '#F97316'
        ctx.beginPath()
        ctx.moveTo(-14, -3); ctx.lineTo(-22, 0); ctx.lineTo(-14, 3)
        ctx.fill()
      }

      ctx.restore()

      // 9. Partículas de polvo
      st.particles.forEach(pt => {
        ctx.fillStyle = pt.color
        ctx.beginPath(); ctx.arc(pt.x, pt.y, pt.size, 0, Math.PI * 2); ctx.fill()
      })

      ctx.restore()
    }

    // Bucle principal de animación a 60 FPS fijos
    const loop = (timestamp) => {
      if (!timestamp) timestamp = performance.now()
      const deltaMs = Math.min(timestamp - lastTime, 100)
      lastTime = timestamp
      accumulator += deltaMs

      const st = estadoMutableRef.current
      if (st && st.isRunning) {
        let updates = 0
        while (accumulator >= FIXED_STEP_MS && updates < 5) {
          try {
            updatePhysics(st)
          } catch (_) {}
          accumulator -= FIXED_STEP_MS
          updates++
        }
      } else {
        accumulator = 0
      }

      try {
        draw(estadoMutableRef.current)
      } catch (_) {}

      animFrameRef.current = requestAnimationFrame(loop)
    }

    animFrameRef.current = requestAnimationFrame(loop)
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
    }
  }, [finalizarCarrera])

  return (
    <div
      className="card"
      style={{
        padding: 0,
        overflow: 'hidden',
        border: '1px solid var(--color-separator)',
        backgroundColor: 'var(--color-surface)',
        borderRadius: 18,
        boxShadow: '0 4px 20px rgba(0,0,0,0.06)'
      }}
    >
      {/* Barra Superior estilo Apple HIG & Telemetría Racing */}
      <div
        style={{
          padding: '12px 18px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid var(--color-separator)',
          backgroundColor: 'var(--color-fill-tertiary)',
          flexWrap: 'wrap',
          gap: 10
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div
            style={{
              padding: '4px 8px',
              borderRadius: 6,
              backgroundColor: '#EF4444',
              color: '#FFFFFF',
              fontWeight: 900,
              fontSize: 11,
              letterSpacing: 0.5
            }}
          >
            DUST RACING 2D
          </div>
          <span className="apple-caption" style={{ fontWeight: 700, color: 'var(--color-ink)' }}>
            Circuito Gran Premio SMR2
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          {/* Vuelta */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <Flag size={15} color="var(--color-accent)" />
            <span className="apple-caption" style={{ fontWeight: 800, color: 'var(--color-ink)' }}>
              Vuelta {vueltaActual} / {TOTAL_VUELTAS}
            </span>
          </div>

          {/* Tiempo Vuelta Actual */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <Timer size={15} color="var(--color-secondary-ink)" />
            <span style={{ fontSize: 13, fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: 'var(--color-ink)' }}>
              {tiempoVuelta}
            </span>
          </div>

          {/* Mejor Vuelta */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <Trophy size={15} color="#F59E0B" />
            <span className="apple-caption" style={{ fontWeight: 700, color: '#D97706' }}>
              Récord: {mejorVuelta}
            </span>
          </div>

          {/* Monedas */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <Coins size={15} color="#F59E0B" />
            <strong style={{ fontSize: 13, color: '#D97706' }}>+{monedasPartida}p</strong>
          </div>

          {/* Botón Silencio */}
          <button
            type="button"
            onClick={() => {
              const nuevo = !sonido
              setSonido(nuevo)
              audioRacing.muted = !nuevo
            }}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-secondary-ink)' }}
          >
            {sonido ? <Volume2 size={16} /> : <VolumeX size={16} />}
          </button>
        </div>
      </div>

      {/* Canvas del Circuito de Carreras */}
      <div style={{ position: 'relative', width: '100%', height: CANVAS_H, backgroundColor: '#14532D' }}>
        <canvas
          ref={canvasRef}
          style={{
            width: '100%',
            height: '100%',
            display: 'block'
          }}
        />

        {/* Overlay de Inicio */}
        {estadoJuego === 'inicio' && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              backgroundColor: 'rgba(15, 23, 42, 0.78)',
              backdropFilter: 'blur(4px)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 14,
              color: '#FFFFFF'
            }}
          >
            <div style={{ textAlign: 'center' }}>
              <div className="sello-tinta sello-tinta-rojo" style={{ display: 'inline-block', marginBottom: 8, fontSize: 12 }}>
                GRAN PREMIO SMR2 · DUST RACING
              </div>
              <h2 style={{ fontSize: 26, fontWeight: 900, margin: '4px 0' }}>
                Dust Racing 2D
              </h2>
              <p style={{ fontSize: 13, color: '#94A3B8', maxWidth: 420 }}>
                Acelera con <strong>W / Flecha Arriba</strong>, gira derrapando sobre el asfalto y evita salirte al pasto. Completa 3 vueltas para registrar tus puntos en la clase.
              </p>
            </div>

            <button
              type="button"
              onClick={iniciarCarrera}
              className="apple-button apple-button-primary"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                padding: '12px 28px',
                fontSize: 15,
                fontWeight: 800,
                borderRadius: 9999,
                boxShadow: '0 4px 14px rgba(10, 132, 255, 0.4)'
              }}
            >
              <Play size={18} fill="currentColor" />
              <span>Empezar Carrera</span>
            </button>
          </div>
        )}

        {/* Overlay de Final de Carrera con Puntos y Monedas */}
        {estadoJuego === 'final' && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              backgroundColor: 'rgba(15, 23, 42, 0.85)',
              backdropFilter: 'blur(5px)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 14,
              color: '#FFFFFF',
              animation: 'fadeIn 0.25s ease'
            }}
          >
            <div className="sello-tinta sello-tinta-verde" style={{ fontSize: 14 }}>
              ★ META ALCANZADA · 3 VUELTAS COMPLETAS ★
            </div>

            <h2 style={{ fontSize: 28, fontWeight: 900, margin: 0 }}>
              ¡Carrera Terminada!
            </h2>

            <div style={{ display: 'flex', gap: 16, margin: '8px 0' }}>
              <div style={{ padding: '10px 18px', borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.08)', textAlign: 'center' }}>
                <span style={{ fontSize: 11, color: '#94A3B8', display: 'block' }}>PUNTUACIÓN</span>
                <strong style={{ fontSize: 22, color: '#38BDF8' }}>{puntosPartida} pts</strong>
              </div>
              <div style={{ padding: '10px 18px', borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.08)', textAlign: 'center' }}>
                <span style={{ fontSize: 11, color: '#94A3B8', display: 'block' }}>BOLSA MONEDAS</span>
                <strong style={{ fontSize: 22, color: '#FBBF24' }}>+{monedasPartida} pts</strong>
              </div>
            </div>

            <button
              type="button"
              onClick={iniciarCarrera}
              className="apple-button apple-button-primary"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                padding: '12px 26px',
                fontSize: 14,
                fontWeight: 700,
                borderRadius: 9999
              }}
            >
              <RotateCcw size={16} />
              <span>Correr otra vez</span>
            </button>
          </div>
        )}
      </div>

      {/* Controles en Pantalla Táctil / Teclas Guía */}
      <div
        style={{
          padding: '10px 18px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderTop: '1px solid var(--color-separator)',
          backgroundColor: 'var(--color-surface-secondary)',
          flexWrap: 'wrap',
          gap: 8
        }}
      >
        <span className="apple-caption" style={{ color: 'var(--color-secondary-ink)' }}>
          🎮 <strong>Controles:</strong> Flechas de dirección o <strong>W A S D</strong>. Derrapa en curvas para sumar puntos extra y recoge turbos.
        </span>

        {/* Botones táctiles para móvil */}
        <div style={{ display: 'flex', gap: 6 }}>
          <button
            type="button"
            onPointerDown={() => { keysRef.current['ArrowLeft'] = true }}
            onPointerUp={() => { keysRef.current['ArrowLeft'] = false }}
            style={{ padding: '8px 14px', borderRadius: 8, border: '1px solid var(--color-separator)', background: 'var(--color-surface)', cursor: 'pointer' }}
          >
            <ArrowLeft size={16} />
          </button>
          <button
            type="button"
            onPointerDown={() => { keysRef.current['ArrowUp'] = true }}
            onPointerUp={() => { keysRef.current['ArrowUp'] = false }}
            style={{ padding: '8px 14px', borderRadius: 8, border: '1px solid var(--color-separator)', background: 'var(--color-surface)', cursor: 'pointer' }}
          >
            <ArrowUp size={16} />
          </button>
          <button
            type="button"
            onPointerDown={() => { keysRef.current['ArrowDown'] = true }}
            onPointerUp={() => { keysRef.current['ArrowDown'] = false }}
            style={{ padding: '8px 14px', borderRadius: 8, border: '1px solid var(--color-separator)', background: 'var(--color-surface)', cursor: 'pointer' }}
          >
            <ArrowDown size={16} />
          </button>
          <button
            type="button"
            onPointerDown={() => { keysRef.current['ArrowRight'] = true }}
            onPointerUp={() => { keysRef.current['ArrowRight'] = false }}
            style={{ padding: '8px 14px', borderRadius: 8, border: '1px solid var(--color-separator)', background: 'var(--color-surface)', cursor: 'pointer' }}
          >
            <ArrowRight size={16} />
          </button>
        </div>
      </div>
    </div>
  )
}
