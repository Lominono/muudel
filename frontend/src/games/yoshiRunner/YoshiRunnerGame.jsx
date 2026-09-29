// frontend/src/games/yoshiRunner/YoshiRunnerGame.jsx
import { useEffect, useRef, useState, useCallback } from 'react'
import { SPRITES_DATA_URI } from './yoshiAssets'
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
  Sparkles,
  Gamepad2,
  CheckCircle2,
  X,
  Zap,
  Flame,
  Star
} from 'lucide-react'

// ─── Audio retro 8-bit ────────────────────────────────────────────────────────
class RetroAudio {
  constructor() { this.ctx = null; this.muted = false }

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

  _play(setup) {
    if (this.muted) return
    try {
      this._init()
      if (!this.ctx) return
      setup(this.ctx)
    } catch (_) {}
  }

  playJump() {
    this._play(ctx => {
      const osc = ctx.createOscillator(), g = ctx.createGain()
      osc.type = 'square'
      osc.frequency.setValueAtTime(160, ctx.currentTime)
      osc.frequency.exponentialRampToValueAtTime(560, ctx.currentTime + 0.13)
      g.gain.setValueAtTime(0.12, ctx.currentTime)
      g.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.13)
      osc.connect(g); g.connect(ctx.destination)
      osc.start(); osc.stop(ctx.currentTime + 0.13)
    })
  }

  playFlutter() {
    this._play(ctx => {
      const osc = ctx.createOscillator(), g = ctx.createGain()
      osc.type = 'triangle'
      osc.frequency.setValueAtTime(360, ctx.currentTime)
      osc.frequency.setValueAtTime(440, ctx.currentTime + 0.03)
      g.gain.setValueAtTime(0.08, ctx.currentTime)
      g.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.06)
      osc.connect(g); g.connect(ctx.destination)
      osc.start(); osc.stop(ctx.currentTime + 0.06)
    })
  }

  playCoin() {
    this._play(ctx => {
      const osc = ctx.createOscillator(), g = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.setValueAtTime(987.77, ctx.currentTime)
      osc.frequency.setValueAtTime(1318.51, ctx.currentTime + 0.07)
      g.gain.setValueAtTime(0.14, ctx.currentTime)
      g.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.28)
      osc.connect(g); g.connect(ctx.destination)
      osc.start(); osc.stop(ctx.currentTime + 0.28)
    })
  }

  playEgg() {
    this._play(ctx => {
      const osc = ctx.createOscillator(), g = ctx.createGain()
      osc.type = 'triangle'
      osc.frequency.setValueAtTime(587.33, ctx.currentTime)
      osc.frequency.setValueAtTime(880.0, ctx.currentTime + 0.06)
      osc.frequency.setValueAtTime(1174.66, ctx.currentTime + 0.12)
      g.gain.setValueAtTime(0.18, ctx.currentTime)
      g.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35)
      osc.connect(g); g.connect(ctx.destination)
      osc.start(); osc.stop(ctx.currentTime + 0.35)
    })
  }

  playStomp() {
    this._play(ctx => {
      const osc = ctx.createOscillator(), g = ctx.createGain()
      osc.type = 'square'
      osc.frequency.setValueAtTime(320, ctx.currentTime)
      osc.frequency.exponentialRampToValueAtTime(80, ctx.currentTime + 0.12)
      g.gain.setValueAtTime(0.2, ctx.currentTime)
      g.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.12)
      osc.connect(g); g.connect(ctx.destination)
      osc.start(); osc.stop(ctx.currentTime + 0.12)
    })
  }

  playFever() {
    this._play(ctx => {
      [523.25, 659.25, 783.99, 1046.50].forEach((freq, idx) => {
        const osc = ctx.createOscillator(), g = ctx.createGain()
        osc.type = 'triangle'
        osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.08)
        g.gain.setValueAtTime(0.15, ctx.currentTime + idx * 0.08)
        g.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + idx * 0.08 + 0.2)
        osc.connect(g); g.connect(ctx.destination)
        osc.start(ctx.currentTime + idx * 0.08)
        osc.stop(ctx.currentTime + idx * 0.08 + 0.2)
      })
    })
  }

  playWarning() {
    this._play(ctx => {
      const osc = ctx.createOscillator(), g = ctx.createGain()
      osc.type = 'sawtooth'
      osc.frequency.setValueAtTime(880, ctx.currentTime)
      g.gain.setValueAtTime(0.12, ctx.currentTime)
      g.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.09)
      osc.connect(g); g.connect(ctx.destination)
      osc.start(); osc.stop(ctx.currentTime + 0.09)
    })
  }

  playPowerDown() {
    this._play(ctx => {
      const osc = ctx.createOscillator(), g = ctx.createGain()
      osc.type = 'sawtooth'
      osc.frequency.setValueAtTime(520, ctx.currentTime)
      osc.frequency.exponentialRampToValueAtTime(140, ctx.currentTime + 0.18)
      g.gain.setValueAtTime(0.16, ctx.currentTime)
      g.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.18)
      osc.connect(g); g.connect(ctx.destination)
      osc.start(); osc.stop(ctx.currentTime + 0.18)
    })
  }

  playGameOver() {
    this._play(ctx => {
      const osc = ctx.createOscillator(), g = ctx.createGain()
      osc.type = 'sawtooth'
      osc.frequency.setValueAtTime(320, ctx.currentTime)
      osc.frequency.linearRampToValueAtTime(80, ctx.currentTime + 0.4)
      g.gain.setValueAtTime(0.2, ctx.currentTime)
      g.gain.linearRampToValueAtTime(0.01, ctx.currentTime + 0.4)
      osc.connect(g); g.connect(ctx.destination)
      osc.start(); osc.stop(ctx.currentTime + 0.4)
    })
  }

  playVictory() {
    this._play(ctx => {
      [523, 659, 784, 1047, 784, 1047, 1319].forEach((freq, idx) => {
        const osc = ctx.createOscillator(), g = ctx.createGain()
        osc.type = 'square'
        osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.1)
        g.gain.setValueAtTime(0.1, ctx.currentTime + idx * 0.1)
        g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.1 + 0.18)
        osc.connect(g); g.connect(ctx.destination)
        osc.start(ctx.currentTime + idx * 0.1)
        osc.stop(ctx.currentTime + idx * 0.1 + 0.18)
      })
    })
  }

  playMeteor() {
    this._play(ctx => {
      const osc = ctx.createOscillator(), g = ctx.createGain()
      osc.type = 'sawtooth'
      osc.frequency.setValueAtTime(200, ctx.currentTime)
      osc.frequency.exponentialRampToValueAtTime(60, ctx.currentTime + 0.3)
      g.gain.setValueAtTime(0.15, ctx.currentTime)
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3)
      osc.connect(g); g.connect(ctx.destination)
      osc.start(); osc.stop(ctx.currentTime + 0.3)
    })
  }

  playOverdrive() {
    this._play(ctx => {
      [440, 554.37, 659.25, 880, 1108.73, 1318.51].forEach((freq, idx) => {
        const osc = ctx.createOscillator(), g = ctx.createGain()
        osc.type = 'sawtooth'
        osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.05)
        g.gain.setValueAtTime(0.18, ctx.currentTime + idx * 0.05)
        g.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + idx * 0.05 + 0.2)
        osc.connect(g); g.connect(ctx.destination)
        osc.start(ctx.currentTime + idx * 0.05)
        osc.stop(ctx.currentTime + idx * 0.05 + 0.2)
      })
    })
  }

  playNearMiss() {
    this._play(ctx => {
      const osc = ctx.createOscillator(), g = ctx.createGain()
      osc.type = 'square'
      osc.frequency.setValueAtTime(880, ctx.currentTime)
      osc.frequency.linearRampToValueAtTime(1760, ctx.currentTime + 0.09)
      g.gain.setValueAtTime(0.14, ctx.currentTime)
      g.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.09)
      osc.connect(g); g.connect(ctx.destination)
      osc.start(); osc.stop(ctx.currentTime + 0.09)
    })
  }
}

const retroAudio = new RetroAudio()

// ─── Constantes ──────────────────────────────────────────────────────────────
const CANVAS_W = 760
const CANVAS_H = 230
const GROUND_Y = 186
const GRAVITY = 0.65
const JUMP_FORCE = -11.8
const SPEED_INITIAL = 6.0
const SPEED_MAX = 18.0
// Duración base del juego en segundos (6 minutos = 360s). Se escala con victorias.
const BASE_DURATION_S = 360

// ─── Helpers ─────────────────────────────────────────────────────────────────
function getWins() {
  return Number(localStorage.getItem('muudel_yoshi_wins') || 0)
}
function addWin() {
  const w = getWins() + 1
  localStorage.setItem('muudel_yoshi_wins', String(w))
  return w
}

// ─── Componente principal ────────────────────────────────────────────────────
export function YoshiRunnerGame({ perfil, onMonedasGanadas, onRetoCompletado, retoActivo, onClose }) {
  const canvasRef = useRef(null)
  const animFrameRef = useRef(null)
  const isJumpPressedRef = useRef(false)

  // Estado reactivo UI
  const [juegoEstado, setJuegoEstado] = useState('inicio') // 'inicio'|'jugando'|'muerto'|'final'|'victoria'
  const [puntos, setPuntos] = useState(0)
  const [monedasPartida, setMonedasPartida] = useState(0)
  const [comboActual, setComboActual] = useState(1)
  const [feverActivo, setFeverActivo] = useState(false)
  const [tiempoRestante, setTiempoRestante] = useState(BASE_DURATION_S)
  const [wins, setWins] = useState(getWins)
  const [mejorPuntuacion, setMejorPuntuacion] = useState(() =>
    Number(localStorage.getItem('muudel_yoshi_highscore') || 0)
  )
  const [monedasHoyGanadas, setMonedasHoyGanadas] = useState(() => {
    const fecha = new Date().toISOString().split('T')[0]
    return Number(localStorage.getItem(`muudel_arcade_monedas_${fecha}_${perfil?.id}`) || 0)
  })
  const [sonidoActivo, setSonidoActivo] = useState(true)
  const [retoSuperadoEnPartida, setRetoSuperadoEnPartida] = useState(false)

  // Mutable refs usadas dentro del game loop (evitar closures stale)
  const retoSuperadoRef = useRef(false)
  const juegoEstadoRef = useRef('inicio')
  const onRetoCompletadoRef = useRef(onRetoCompletado)
  const perfilRef = useRef(perfil)
  const finalizarLlamadoRef = useRef(false)
  useEffect(() => { onRetoCompletadoRef.current = onRetoCompletado }, [onRetoCompletado])
  useEffect(() => { perfilRef.current = perfil }, [perfil])

  // Sprites
  const spritesRef = useRef({})
  const [spritesLoaded, setSpritesLoaded] = useState(false)

  // Estado mutable del juego (fuera de React state para evitar re-renders)
  const gameStateRef = useRef(null)

  function crearEstadoInicial(winsCount) {
    // La duración aumenta 90s por cada victoria (máx 900s = 15 min)
    const duracion = Math.min(BASE_DURATION_S + winsCount * 90, 900)

    const stars = []
    for (let i = 0; i < 35; i++) {
      stars.push({
        x: Math.random() * CANVAS_W,
        y: Math.random() * (GROUND_Y - 50),
        size: Math.random() * 1.8 + 0.6,
        twinkleSpeed: 0.04 + Math.random() * 0.06,
        phase: Math.random() * Math.PI * 2
      })
    }

    const serverRacks = [
      { x: 70, w: 26, h: 52, leds: [true, false, true] },
      { x: 260, w: 32, h: 64, leds: [true, true, false] },
      { x: 470, w: 24, h: 48, leds: [false, true, true] },
      { x: 670, w: 34, h: 58, leds: [true, false, true] }
    ]

    return {
      score: 0,
      speed: SPEED_INITIAL,
      distance: 0,
      coins: 0,
      combo: 1,
      comboTimer: 0,
      feverTime: 0,
      feverElapsed: 0,
      feverUnstable: false,
      adrenalina: 0, // 0 a 100
      overdriveTime: 0,
      screenShake: 0,
      ghostTrails: [],
      kineticLines: [],
      stars,
      serverRacks,
      lastSpeedTier: 0,
      frameCount: 0,
      duracionFrames: duracion * 60, // convertido a frames
      timerFrames: 0,
      fase: 'normal', // 'normal' | 'meteoros' | 'patata'
      meteoroTimer: 0,
      meteoros: [],
      patataSalvadora: null,
      patataMensaje: '',
      alerts: [],
      yoshi: {
        x: 64, y: GROUND_Y - 48,
        w: 48, h: 48,
        vy: 0,
        isGrounded: true,
        isDucking: false,
        isFluttering: false,
        flutterFramesLeft: 26,
        animTick: 0
      },
      particles: [],
      floatingTexts: [],
      obstacles: [],
      collectibles: [],
      clouds: [
        { x: 120, y: 35, speed: 0.5 },
        { x: 380, y: 25, speed: 0.4 },
        { x: 620, y: 45, speed: 0.6 }
      ],
      hills: [
        { x: 40, w: 160, h: 42 },
        { x: 340, w: 210, h: 60 },
        { x: 640, w: 180, h: 48 }
      ],
      groundOffset: 0,
      isRunning: false,
      winsCount
    }
  }

  // Cargar sprites una sola vez
  useEffect(() => {
    let loaded = 0
    const keys = Object.keys(SPRITES_DATA_URI)
    keys.forEach(key => {
      const img = new Image()
      img.src = SPRITES_DATA_URI[key]
      img.onload = img.onerror = () => {
        if (img.complete) spritesRef.current[key] = img
        if (++loaded === keys.length) setSpritesLoaded(true)
      }
    })
  }, [])

  // ─── Finalizar partida ────────────────────────────────────────────────────
  const finalizarPartida = useCallback(async (scoreFinal, coinsFinales, esVictoria = false) => {
    if (finalizarLlamadoRef.current) return
    finalizarLlamadoRef.current = true

    const p = perfilRef.current
    if (scoreFinal > mejorPuntuacion) {
      setMejorPuntuacion(scoreFinal)
      localStorage.setItem('muudel_yoshi_highscore', String(scoreFinal))
      transmitirEvento('arcade_record', { userId: p?.id, nombre: p?.nombre, puntos: scoreFinal, juego: 'yoshi_runner' })
    }

    if (esVictoria) {
      const totalWins = addWin()
      setWins(totalWins)
      triggerConfetti()
    }

    const fecha = new Date().toISOString().split('T')[0]
    const hoyActuales = Number(localStorage.getItem(`muudel_arcade_monedas_${fecha}_${p?.id}`) || 0)
    const LIMITE = 20 // Nerf económico: máximo 20 puntos diarios de recreo
    const margen = Math.max(0, LIMITE - hoyActuales)
    const bonus = esVictoria ? 5 : 0
    const monedasAcreditar = Math.min(Math.floor(coinsFinales / 3) + bonus, margen)

    if (monedasAcreditar > 0 && p) {
      const nuevoHoy = hoyActuales + monedasAcreditar
      localStorage.setItem(`muudel_arcade_monedas_${fecha}_${p.id}`, String(nuevoHoy))
      setMonedasHoyGanadas(nuevoHoy)

      const nuevosPuntos = (p.puntos_total || 0) + monedasAcreditar
      localStorage.setItem('racha_local_user', JSON.stringify({ ...p, puntos_total: nuevosPuntos }))

      try {
        await supabase.from('profiles').update({ puntos_total: nuevosPuntos }).eq('id', p.id)
        await supabase.from('juegos_puntuaciones').insert({
          user_id: p.id, juego: 'yoshi_runner',
          puntos: scoreFinal, monedas_ganadas: monedasAcreditar
        })
      } catch (_) {}

      transmitirEvento('puntos_actualizados', { userId: p.id, nuevosPuntos })
      onMonedasGanadas?.(monedasAcreditar)
    }
  }, [mejorPuntuacion, onMonedasGanadas])

  // ─── Iniciar partida ──────────────────────────────────────────────────────
  const iniciarPartida = useCallback(() => {
    retroAudio._init()
    finalizarLlamadoRef.current = false
    retoSuperadoRef.current = false
    setRetoSuperadoEnPartida(false)
    setFeverActivo(false)
    setPuntos(0)
    setMonedasPartida(0)
    setComboActual(1)

    const winsActuales = getWins()
    const estado = crearEstadoInicial(winsActuales)
    estado.isRunning = true
    gameStateRef.current = estado

    const durS = Math.min(BASE_DURATION_S + winsActuales * 90, 900)
    setTiempoRestante(durS)
    juegoEstadoRef.current = 'jugando'
    setJuegoEstado('jugando')
  }, [])

  // ─── Saltar ───────────────────────────────────────────────────────────────
  const saltar = useCallback(() => {
    const state = gameStateRef.current
    if (!state || !state.isRunning) {
      const est = juegoEstadoRef.current
      if (est === 'inicio' || est === 'muerto' || est === 'victoria') iniciarPartida()
      return
    }
    const { yoshi } = state
    if (yoshi.isGrounded && !yoshi.isDucking) {
      yoshi.vy = JUMP_FORCE
      yoshi.isGrounded = false
      yoshi.flutterFramesLeft = 26
      yoshi.isFluttering = false
      retroAudio.playJump()
      for (let i = 0; i < 4; i++) {
        state.particles.push({
          x: yoshi.x + 8 + Math.random() * 20, y: GROUND_Y - 2,
          vx: -2 - Math.random() * 2, vy: -Math.random() * 1.5,
          color: '#D1D5DB', size: 3 + Math.random() * 2, life: 14, maxLife: 14
        })
      }
    } else if (!yoshi.isGrounded && yoshi.flutterFramesLeft > 0 && yoshi.vy > -3) {
      yoshi.isFluttering = true
    }
  }, [iniciarPartida])

  // ─── Agacharse ────────────────────────────────────────────────────────────
  const setAgachado = useCallback((ducking) => {
    const state = gameStateRef.current
    if (!state || !state.isRunning) return
    state.yoshi.isDucking = ducking
    if (ducking && !state.yoshi.isGrounded) {
      state.yoshi.vy = Math.max(state.yoshi.vy, 6.5) // caída rápida más agresiva
      state.yoshi.isFluttering = false
      state.yoshi.flutterFramesLeft = 0
    }
  }, [])

  // ─── Teclado ──────────────────────────────────────────────────────────────
  useEffect(() => {
    const down = (e) => {
      if (e.code === 'Space' || e.code === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
        e.preventDefault(); isJumpPressedRef.current = true; saltar()
      } else if (e.code === 'ArrowDown' || e.key === 's' || e.key === 'S') {
        e.preventDefault(); setAgachado(true)
      }
    }
    const up = (e) => {
      if (e.code === 'Space' || e.code === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
        e.preventDefault()
        isJumpPressedRef.current = false
        const st = gameStateRef.current
        if (st?.yoshi) st.yoshi.isFluttering = false
      } else if (e.code === 'ArrowDown' || e.key === 's' || e.key === 'S') {
        e.preventDefault(); setAgachado(false)
      }
    }
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up) }
  }, [saltar, setAgachado])

  // ─── Game Loop ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!spritesLoaded) return
    const canvas = canvasRef.current
    if (!canvas) return

    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    canvas.width = CANVAS_W * dpr
    canvas.height = CANVAS_H * dpr
    const ctx = canvas.getContext('2d')
    ctx.scale(dpr, dpr)

    const FIXED_STEP_MS = 1000 / 60 // 16.6667ms = exactamente 60 ticks por segundo en cualquier monitor
    let lastTimestamp = performance.now()
    let accumulator = 0

    const updatePhysicsTick = (state) => {
      state.frameCount++
      const yoshi = state.yoshi // declarado UNA SOLA VEZ aquí arriba

        // ── Timer y detección de final ──────────────────────────────────
        state.timerFrames++
        const segundosTranscurridos = state.timerFrames / 60
        const durS = state.duracionFrames / 60
        const restante = Math.max(0, durS - segundosTranscurridos)
        if (state.frameCount % 60 === 0) setTiempoRestante(Math.ceil(restante))

        // Transición a fase meteoros (últimos 20 segundos = 1200 frames)
        if (state.fase === 'normal' && state.timerFrames >= state.duracionFrames - 1200) {
          state.fase = 'meteoros'
          state.obstacles = []
          state.collectibles = []
          state.alerts = []
          state.speed = Math.min(state.speed, 7) // bajar velocidad para la cinemática
        }

        // ── Física de score y velocidad frenética ─────────────────────────────────
        const enOverdrive = state.overdriveTime > 0
        const speedFactor = (state.feverTime > 0 ? 1.25 : 1.0) * (enOverdrive ? 1.45 : 1.0)

        if (state.fase === 'normal') {
          state.distance += (state.speed * speedFactor) / 10
          state.score = Math.floor(state.distance)
          setPuntos(state.score)

          // Aceleración continua más dinámica y desafiante
          if (state.speed < SPEED_MAX) {
            state.speed += 0.0032
          }

          // Aceleración por tramos de 50 metros con anuncio visual
          const tierActual = Math.floor(state.score / 50)
          if (tierActual > state.lastSpeedTier) {
            state.lastSpeedTier = tierActual
            state.screenShake = 6
            retroAudio.playWarning()
            state.floatingTexts.push({
              text: `⚡ ¡ACELERACIÓN! ${(state.speed * speedFactor).toFixed(1)}x`,
              x: CANVAS_W / 2,
              y: 55,
              vy: -1.2,
              color: '#FBBF24',
              opacity: 1.3
            })
          }
        }

        // ── OVERDRIVE / HIPER-FRENESÍ ──────────────────────────────────
        if (state.overdriveTime > 0) {
          state.overdriveTime--
          state.screenShake = Math.max(state.screenShake, 1.8)

          // Efecto Imán gravitacional: atraer monedas y coleccionables hacia Yoshi
          state.collectibles.forEach(item => {
            if (item.recogido) return
            const dx = (yoshi.x + yoshi.w / 2) - item.x
            const dy = (yoshi.y + yoshi.h / 2) - item.y
            const dist = Math.sqrt(dx * dx + dy * dy)
            if (dist < 280) {
              item.x += (dx / dist) * 9.5
              item.y += (dy / dist) * 9.5
            }
          })

          // Partículas continuas de overdrive
          if (state.frameCount % 2 === 0) {
            state.particles.push({
              x: yoshi.x + Math.random() * yoshi.w,
              y: yoshi.y + Math.random() * yoshi.h,
              vx: -state.speed * 0.5 - Math.random() * 4,
              vy: (Math.random() - 0.5) * 3,
              color: Math.random() > 0.5 ? '#38BDF8' : '#FBBF24',
              size: 4 + Math.random() * 2,
              life: 14,
              maxLife: 14
            })
          }

          if (state.overdriveTime === 0) {
            state.adrenalina = 0
            state.floatingTexts.push({
              text: '⚡ OVERDRIVE FINALIZADO',
              x: yoshi.x + 20,
              y: yoshi.y - 14,
              vy: -1.0,
              color: '#9CA3AF',
              opacity: 1
            })
          }
        } else {
          // Activar Overdrive automáticamente si la adrenalina llega a 100
          if (state.adrenalina >= 100) {
            state.overdriveTime = 480 // 8 segundos de frenesí absoluto
            state.screenShake = 9
            retroAudio.playOverdrive()
            triggerConfetti()
            state.floatingTexts.push({
              text: '🔥 ¡HIPER-OVERDRIVE! x3 🔥',
              x: CANVAS_W / 2,
              y: 70,
              vy: -1.4,
              color: '#38BDF8',
              opacity: 1.5
            })
          }
        }

        // ── Estela fantasma de Yoshi (Ghost Trail) ────────────────────
        if (state.speed > 8 || state.overdriveTime > 0 || state.feverTime > 0) {
          if (state.frameCount % 3 === 0) {
            const spr = spritesRef.current || {}
            let sprActual = spr.yoshiRun1
            if (yoshi.isFluttering) sprActual = spr.yoshiFlutter || spr.yoshiJump
            else if (!yoshi.isGrounded) sprActual = spr.yoshiJump || sprActual
            else if (yoshi.isDucking) sprActual = spr.yoshiDuck || sprActual
            else sprActual = Math.floor(yoshi.animTick / 6) % 2 === 0 ? spr.yoshiRun1 : spr.yoshiRun2

            state.ghostTrails.unshift({
              x: yoshi.x,
              y: yoshi.y,
              w: yoshi.w,
              h: yoshi.h,
              spr: sprActual,
              color: state.overdriveTime > 0 ? '#38BDF8' : state.feverTime > 0 ? '#F59E0B' : 'rgba(255,255,255,0.4)',
              life: 12,
              maxLife: 12
            })
            if (state.ghostTrails.length > 5) state.ghostTrails.pop()
          }
        }
        state.ghostTrails.forEach(g => { g.life-- })
        state.ghostTrails = state.ghostTrails.filter(g => g.life > 0)

        // ── Líneas cinéticas de velocidad horizontal ──────────────────
        if ((state.speed > 8.5 || state.overdriveTime > 0) && Math.random() < 0.35) {
          state.kineticLines.push({
            x: CANVAS_W + 20,
            y: 20 + Math.random() * (GROUND_Y - 30),
            length: 40 + Math.random() * 90,
            speed: (state.speed * speedFactor) * (1.3 + Math.random() * 0.4),
            color: state.overdriveTime > 0 ? 'rgba(56, 189, 248, 0.7)' : 'rgba(255, 255, 255, 0.5)'
          })
        }
        state.kineticLines.forEach(k => { k.x -= k.speed })
        state.kineticLines = state.kineticLines.filter(k => k.x + k.length > -20)

        // ── FIEBRE con desactivación aleatoria ──────────────────────────
        if (state.feverTime > 0) {
          state.feverElapsed++
          state.feverTime--

          if (state.feverElapsed >= 90) { // pasados 1.5s → inestable
            state.feverUnstable = true

            if (state.frameCount % 4 === 0 && state.fase === 'normal') {
              state.particles.push({
                x: yoshi.x + Math.random() * yoshi.w,
                y: yoshi.y + Math.random() * yoshi.h,
                vx: (Math.random() - 0.5) * 3, vy: -Math.random() * 2,
                color: Math.random() > 0.5 ? '#FF3B30' : '#FBBF24',
                size: 3, life: 12, maxLife: 12
              })
            }

            const progreso = (state.feverElapsed - 90) / (360 - 90)
            const chance = 0.005 + Math.pow(progreso, 1.8) * 0.06

            if (Math.random() < chance || state.feverTime <= 0) {
              state.feverTime = 0
              state.feverUnstable = false
              setFeverActivo(false)
              retroAudio.playPowerDown()
              state.floatingTexts.push({
                text: '⚡ ¡AURA AGOTADA!', x: yoshi.x + 20, y: yoshi.y - 14,
                vy: -1.3, color: '#EF4444', opacity: 1
              })
              for (let p = 0; p < 12; p++) {
                state.particles.push({
                  x: yoshi.x + yoshi.w / 2, y: yoshi.y + yoshi.h / 2,
                  vx: (Math.random() - 0.5) * 6, vy: (Math.random() - 0.5) * 6,
                  color: '#9CA3AF', size: 3.5, life: 16, maxLife: 16
                })
              }
            }
          }
        }

        // ── Combo ────────────────────────────────────────────────────────
        if (state.comboTimer > 0) {
          state.comboTimer--
          if (state.comboTimer === 0) { state.combo = 1; setComboActual(1) }
        }

        // ── FÍSICA DE YOSHI ─────────────────────────────────────────────
        yoshi.animTick++

        // Flutter jump: mantener espacio en el aire
        if (isJumpPressedRef.current && !yoshi.isGrounded && yoshi.flutterFramesLeft > 0 && yoshi.vy > -3) {
          yoshi.isFluttering = true
          yoshi.flutterFramesLeft--
          yoshi.vy = -1.2
          if (yoshi.animTick % 5 === 0) {
            retroAudio.playFlutter()
            state.particles.push({
              x: yoshi.x + 14 + Math.random() * 12, y: yoshi.y + yoshi.h - 4,
              vx: -1.5, vy: 1.2, color: '#FFFFFF', size: 3, life: 10, maxLife: 10
            })
          }
        } else {
          yoshi.isFluttering = false
        }

        if (!yoshi.isGrounded) {
          if (!yoshi.isFluttering) yoshi.vy += GRAVITY
          yoshi.y += yoshi.vy
          const groundedY = GROUND_Y - (yoshi.isDucking ? 28 : 48)
          if (yoshi.y >= groundedY) {
            yoshi.y = groundedY
            yoshi.vy = 0
            yoshi.isGrounded = true
            yoshi.isFluttering = false
            yoshi.flutterFramesLeft = 26
          }
        } else {
          yoshi.y = GROUND_Y - (yoshi.isDucking ? 28 : 48)
        }

        // Hitbox precisa
        yoshi.h = yoshi.isDucking ? 28 : 48
        yoshi.w = yoshi.isDucking ? 52 : 48

        // Partículas de carrera
        if (yoshi.isGrounded && state.frameCount % 6 === 0 && state.fase === 'normal') {
          state.particles.push({
            x: yoshi.x + 6, y: GROUND_Y - 2,
            vx: -state.speed * 0.4 - Math.random(), vy: -Math.random() * 1.5,
            color: state.overdriveTime > 0 ? '#38BDF8' : state.feverTime > 0 ? '#FBBF24' : '#E5E7EB',
            size: state.overdriveTime > 0 ? 4.5 : state.feverTime > 0 ? 4 : 2.5, life: 12, maxLife: 12
          })
        }

        // ── FASE METEOROS (cinemática de final) ─────────────────────────
        if (state.fase === 'meteoros') {
          state.meteoroTimer++

          // Spawn meteoros a ritmo creciente
          const ritmoPorFrame = Math.min(0.05 + state.meteoroTimer * 0.00015, 0.25)
          if (Math.random() < ritmoPorFrame) {
            state.meteoros.push({
              x: Math.random() * CANVAS_W,
              y: -20,
              vx: (Math.random() - 0.5) * 3,
              vy: 3 + Math.random() * 4,
              r: 6 + Math.random() * 14,
              color: Math.random() > 0.5 ? '#FF3B30' : '#FF9500',
              exploded: false
            })
          }

          // Mover meteoros y detectar impacto con Yoshi
          for (let i = state.meteoros.length - 1; i >= 0; i--) {
            const m = state.meteoros[i]
            m.x += m.vx; m.y += m.vy

            if (m.y > CANVAS_H + 20) { state.meteoros.splice(i, 1); continue }

            // Impacto con suelo → explosión visual
            if (m.y >= GROUND_Y - m.r && !m.exploded) {
              m.exploded = true
              retroAudio.playMeteor()
              state.screenShake = 3
              for (let p = 0; p < 8; p++) {
                state.particles.push({
                  x: m.x, y: GROUND_Y,
                  vx: (Math.random() - 0.5) * 8, vy: -Math.random() * 5,
                  color: m.color, size: 4 + Math.random() * 4, life: 20, maxLife: 20
                })
              }
            }
          }

          // Después de 15 segundos de meteoros → aparece la patata salvadora
          if (state.meteoroTimer >= 900 && !state.patataSalvadora) {
            state.patataSalvadora = { x: -80, y: GROUND_Y - 60, vx: 3, fase: 'entrando' }
            state.patataMensaje = '¡UNA PATATA SALVAJE APARECE!'
            retroAudio.playVictory()
          }

          // Animar la patata salvadora
          if (state.patataSalvadora) {
            const pat = state.patataSalvadora
            if (pat.fase === 'entrando') {
              pat.x += pat.vx
              if (pat.x >= CANVAS_W / 2 - 30) pat.fase = 'heroina'
            } else if (pat.fase === 'heroina') {
              // Patata destruye meteoros cercanos
              for (let i = state.meteoros.length - 1; i >= 0; i--) {
                const m = state.meteoros[i]
                const dx = m.x - pat.x, dy = m.y - (pat.y + 30)
                if (Math.sqrt(dx * dx + dy * dy) < 60) {
                  for (let p = 0; p < 6; p++) {
                    state.particles.push({
                      x: m.x, y: m.y,
                      vx: (Math.random() - 0.5) * 6, vy: (Math.random() - 0.5) * 6,
                      color: '#FFD700', size: 5, life: 16, maxLife: 16
                    })
                  }
                  state.meteoros.splice(i, 1)
                }
              }
              // Vibración de la patata
              pat.x += Math.sin(state.frameCount * 0.3) * 1.5

              // Tras 3 segundos → victoria
              if (!pat.timerVictoria) pat.timerVictoria = state.frameCount
              if (state.frameCount - pat.timerVictoria > 180) {
                state.isRunning = false
                state.fase = 'victoria'
                juegoEstadoRef.current = 'victoria'
                setJuegoEstado('victoria')
                finalizarPartida(state.score, state.coins, true)
              }
            }
          }
        }

        // ── OBSTÁCULOS (solo en fase normal) ────────────────────────────
        if (state.fase === 'normal') {
          // Gestión de alertas previas al spawn
          for (let a = state.alerts.length - 1; a >= 0; a--) {
            const alert = state.alerts[a]
            alert.timer--
            if (alert.timer <= 0) {
              if (alert.tipo === 'bomb') {
                state.obstacles.push({
                  tipo: 'bomb', x: CANVAS_W, y: GROUND_Y - 38,
                  w: 36, h: 38, sprite: 'bobOmb', speedMod: 1.15
                })
              } else if (alert.tipo === 'bulletBill') {
                state.obstacles.push({
                  tipo: 'bulletBill', x: CANVAS_W, y: alert.y,
                  w: 48, h: 28, sprite: 'bulletBill', speedMod: 1.75
                })
              } else if (alert.tipo === 'paratroopa') {
                state.obstacles.push({
                  tipo: 'paratroopa', x: CANVAS_W, y: GROUND_Y - 54,
                  w: 38, h: 32, sprite: 'paratroopa', speedMod: 1.05
                })
              } else if (alert.tipo === 'lowBill') {
                // Bullet Bill rasante → OBLIGATORIO agacharse
                state.obstacles.push({
                  tipo: 'lowBill', x: CANVAS_W, y: GROUND_Y - 30,
                  w: 52, h: 20, sprite: 'bulletBill', speedMod: 2.0
                })
              }
              state.alerts.splice(a, 1)
            }
          }

          // Spawn de nuevas alertas
          const hayAlerta = state.alerts.length > 0
          const ultimo = state.obstacles[state.obstacles.length - 1]
          const espacio = !ultimo || (CANVAS_W - ultimo.x > 220)

          if (!hayAlerta && espacio) {
            const r = Math.random()
            const spawnMult = 1 + (state.speed - SPEED_INITIAL) / (SPEED_MAX - SPEED_INITIAL) * 0.5

            if (state.score > 20 && r < 0.014 * spawnMult) {
              state.alerts.push({ tipo: 'bomb', timer: 38, maxTimer: 38, label: '¡BOMBA!', icon: '💣', color: '#FF3B30', y: GROUND_Y - 38 })
              retroAudio.playWarning()
            } else if (state.score > 55 && r < 0.026 * spawnMult) {
              const billY = Math.random() > 0.5 ? GROUND_Y - 48 : GROUND_Y - 72
              state.alerts.push({ tipo: 'bulletBill', timer: 42, maxTimer: 42, label: '¡MISIL!', icon: '⚡', color: '#EF4444', y: billY })
              retroAudio.playWarning()
            } else if (state.score > 35 && r < 0.036 * spawnMult) {
              state.alerts.push({ tipo: 'paratroopa', timer: 36, maxTimer: 36, label: '¡VOLADOR!', icon: '⚠️', color: '#F59E0B', y: GROUND_Y - 54 })
              retroAudio.playWarning()
            } else if (state.score > 80 && r < 0.018 * spawnMult) {
              // Obstáculo bajo donde obligatoriamente hay que agacharse
              state.alerts.push({ tipo: 'lowBill', timer: 44, maxTimer: 44, label: '¡AGÁCHATE!', icon: '⬇️', color: '#8B5CF6', y: GROUND_Y - 30 })
              retroAudio.playWarning()
            }
          }

          // Obstáculos base (tuberías / caparazones / paredes bajas)
          const minGap = 190 + Math.random() * 90 + state.speed * 6
          const canSpawn = !hayAlerta && (!ultimo || (CANVAS_W - ultimo.x > minGap))

          if (canSpawn && Math.random() < 0.04) {
            const rObs = Math.random()
            if (rObs < 0.33) {
              state.obstacles.push({ tipo: 'pipe', x: CANVAS_W, y: GROUND_Y - 48, w: 38, h: 48, sprite: 'piranhaPipe', speedMod: 1.0 })
            } else if (rObs < 0.66) {
              state.obstacles.push({ tipo: 'shell', x: CANVAS_W, y: GROUND_Y - 24, w: 34, h: 24, sprite: 'koopaShell', speedMod: 1.05 })
            } else {
              // Pared baja: hay que saltar Y agacharse según altura
              const altoBajo = Math.random() > 0.5
              if (altoBajo) {
                state.obstacles.push({ tipo: 'pipe', x: CANVAS_W, y: GROUND_Y - 72, w: 28, h: 72, sprite: 'piranhaPipe', speedMod: 1.0 })
              } else {
                state.obstacles.push({ tipo: 'lowWall', x: CANVAS_W, y: GROUND_Y - 26, w: 60, h: 26, sprite: 'koopaShell', speedMod: 1.0 })
              }
            }
          }

          // Detección de Roce Épico (Near Miss)
          state.obstacles.forEach(obs => {
            if (!obs.nearMissChecked && obs.x + obs.w < yoshi.x && obs.x + obs.w > yoshi.x - 36) {
              obs.nearMissChecked = true
              const distY = Math.abs((yoshi.y + yoshi.h) - obs.y)
              if (distY < 24) {
                retroAudio.playNearMiss()
                state.screenShake = 4
                state.score += 15
                state.coins += 2
                setMonedasPartida(state.coins)
                state.adrenalina = Math.min(100, state.adrenalina + 25)
                state.floatingTexts.push({
                  text: '⚡ ¡ROCE ÉPICO! +15',
                  x: yoshi.x + 20,
                  y: yoshi.y - 16,
                  vy: -1.3,
                  color: '#FBBF24',
                  opacity: 1
                })
                for (let p = 0; p < 8; p++) {
                  state.particles.push({
                    x: obs.x, y: obs.y,
                    vx: (Math.random() - 0.5) * 5, vy: -Math.random() * 4,
                    color: '#38BDF8', size: 3.5, life: 14, maxLife: 14
                  })
                }
              }
            }
          })

          // Mover obstáculos
          state.obstacles.forEach(obs => { obs.x -= state.speed * (obs.speedMod || 1) * speedFactor })
          state.obstacles = state.obstacles.filter(obs => obs.x + obs.w > -60)

          // ── COLECCIONABLES ────────────────────────────────────────────
          const lastC = state.collectibles[state.collectibles.length - 1]
          if ((!lastC || CANVAS_W - lastC.x > 160) && Math.random() < 0.04) {
            const r2 = Math.random()
            if (r2 < 0.08 && state.overdriveTime <= 0) {
              // Super Batería Turbo SMR (Llena Adrenalina al 100%)
              state.collectibles.push({ tipo: 'turboBattery', valor: 3, x: CANVAS_W, y: GROUND_Y - 72 - Math.random() * 20, w: 26, h: 26, sprite: 'superBerry', recogido: false })
            } else if (r2 < 0.18 && state.feverTime <= 0) {
              state.collectibles.push({ tipo: 'superBerry', valor: 2, x: CANVAS_W, y: GROUND_Y - 70 - Math.random() * 25, w: 26, h: 26, sprite: 'superBerry', recogido: false })
            } else if (r2 < 0.5) {
              state.collectibles.push({ tipo: 'egg', valor: 1, x: CANVAS_W, y: GROUND_Y - 65 - Math.random() * 25, w: 24, h: 28, sprite: 'yoshiEgg', recogido: false })
            } else {
              state.collectibles.push({ tipo: 'coin', valor: 1, x: CANVAS_W, y: GROUND_Y - 55 - Math.random() * 30, w: 22, h: 22, sprite: 'goldCoin', recogido: false })
            }
          }

          state.collectibles.forEach(item => { item.x -= state.speed * speedFactor })
          state.collectibles = state.collectibles.filter(item => item.x + item.w > -50 && !item.recogido)

          // ── COLISIÓN CON COLECCIONABLES ───────────────────────────────
          state.collectibles.forEach(item => {
            if (item.recogido) return
            if (yoshi.x < item.x + item.w && yoshi.x + yoshi.w > item.x &&
                yoshi.y < item.y + item.h && yoshi.y + yoshi.h > item.y) {
              item.recogido = true
              state.combo = Math.min(state.combo + 1, 6)
              state.comboTimer = 180
              setComboActual(state.combo)

              // Nerf: Las monedas son moderadas (sin multiplicadores desproporcionados)
              const comboBonus = state.combo >= 4 ? 1 : 0
              const pts = item.valor + comboBonus
              state.coins += pts
              setMonedasPartida(state.coins)

              // Subir barra de adrenalina
              state.adrenalina = Math.min(100, state.adrenalina + (item.tipo === 'superBerry' ? 35 : item.tipo === 'egg' ? 12 : 6))

              if (item.tipo === 'turboBattery') {
                state.adrenalina = 100
                state.overdriveTime = 480
                state.screenShake = 10
                retroAudio.playOverdrive()
                triggerConfetti()
                state.floatingTexts.push({ text: '⚡ ¡BATERÍA TURBO! OVERDRIVE', x: yoshi.x + 20, y: yoshi.y - 14, vy: -1.4, color: '#38BDF8', opacity: 1.5 })
              } else if (item.tipo === 'superBerry') {
                state.feverTime = 360; state.feverElapsed = 0; state.feverUnstable = false
                setFeverActivo(true)
                retroAudio.playFever()
                triggerConfetti()
                state.floatingTexts.push({ text: '★ ¡FIEBRE!', x: yoshi.x + 20, y: yoshi.y - 12, vy: -1.2, color: '#FF3B30', opacity: 1 })
              } else if (item.tipo === 'egg') {
                retroAudio.playEgg()
                state.floatingTexts.push({ text: `+${pts}`, x: item.x, y: item.y, vy: -1.0, color: '#30D158', opacity: 1 })
              } else {
                retroAudio.playCoin()
                state.floatingTexts.push({ text: `+${pts}`, x: item.x, y: item.y, vy: -1.0, color: '#FBBF24', opacity: 1 })
              }

              for (let i = 0; i < 6; i++) {
                state.particles.push({
                  x: item.x + item.w / 2, y: item.y + item.h / 2,
                  vx: (Math.random() - 0.5) * 4, vy: (Math.random() - 0.5) * 4,
                  color: item.tipo === 'turboBattery' ? '#38BDF8' : item.tipo === 'superBerry' ? '#FF3B30' : '#FBBF24',
                  size: 3.5, life: 14, maxLife: 14
                })
              }
            }
          })

          // ── COLISIÓN CON OBSTÁCULOS ───────────────────────────────────
          for (let i = state.obstacles.length - 1; i >= 0; i--) {
            const obs = state.obstacles[i]
            const mx = 8, my = 6
            const yBox = { l: yoshi.x + mx, r: yoshi.x + yoshi.w - mx, t: yoshi.y + my, b: yoshi.y + yoshi.h - 2 }
            const oBox = { l: obs.x + mx, r: obs.x + obs.w - mx, t: obs.y + my, b: obs.y + obs.h }

            if (yBox.l < oBox.r && yBox.r > oBox.l && yBox.t < oBox.b && yBox.b > oBox.t) {
              // Fiebre o Overdrive → destruye todo con impacto masivo
              if (state.feverTime > 0 || state.overdriveTime > 0) {
                retroAudio.playStomp()
                state.screenShake = 6
                state.score += 30
                state.floatingTexts.push({ text: '+30 ¡DESTRUIDO!', x: obs.x, y: obs.y, vy: -1.5, color: '#38BDF8', opacity: 1.2 })
                for (let p = 0; p < 12; p++) {
                  state.particles.push({
                    x: obs.x + obs.w / 2, y: obs.y + obs.h / 2,
                    vx: (Math.random() - 0.5) * 7, vy: (Math.random() - 0.5) * 7,
                    color: Math.random() > 0.5 ? '#38BDF8' : '#FF9500',
                    size: 4, life: 18, maxLife: 18
                  })
                }
                state.obstacles.splice(i, 1); continue
              }

              // Aplaste por arriba
              const aplastable = obs.tipo === 'shell' || obs.tipo === 'paratroopa' || obs.tipo === 'bomb'
              const cayendo = yoshi.vy > 0 && yBox.b <= oBox.t + 18 && aplastable

              if (cayendo) {
                retroAudio.playStomp()
                state.screenShake = 5
                state.adrenalina = Math.min(100, state.adrenalina + 20)
                yoshi.vy = -11.5; yoshi.flutterFramesLeft = 26
                const pts2 = obs.tipo === 'bomb' ? 30 * state.combo : 15 * state.combo
                state.score += pts2
                state.floatingTexts.push({
                  text: `+${pts2} ${obs.tipo === 'bomb' ? '¡BOMBA!' : '¡STOMP!'}`,
                  x: obs.x, y: obs.y - 12, vy: -1.2,
                  color: obs.tipo === 'bomb' ? '#FBBF24' : '#34C759', opacity: 1
                })
                for (let p = 0; p < 10; p++) {
                  state.particles.push({ x: obs.x + obs.w / 2, y: obs.y + obs.h / 2, vx: (Math.random() - 0.5) * 6, vy: -Math.random() * 5, color: obs.tipo === 'bomb' ? '#F59E0B' : '#22C55E', size: 3.5, life: 18, maxLife: 18 })
                }
                state.obstacles.splice(i, 1); continue
              }

              // Colisión lateral con obstáculo bajo → si está agachado, pasa por debajo
              if ((obs.tipo === 'lowBill' || obs.tipo === 'lowWall') && yoshi.isDucking) {
                continue // agachado pasa
              }

              // Colisión fatal
              state.isRunning = false
              state.screenShake = 12
              retroAudio.playGameOver()
              juegoEstadoRef.current = 'muerto'
              setJuegoEstado('muerto')
              finalizarPartida(state.score, state.coins, false)
              break
            }
          }

          // ── Reto activo ───────────────────────────────────────────────
          const objetivo = retoActivo?.objetivo_puntuacion || 100
          if (state.score >= objetivo && !retoSuperadoRef.current) {
            retoSuperadoRef.current = true
            setRetoSuperadoEnPartida(true)
            sound?.playStamp?.()
            triggerConfetti()
            onRetoCompletadoRef.current?.(state.score)
          }
        }

        // Mover nubes
        state.clouds.forEach(cloud => {
          cloud.x -= cloud.speed * (speedFactor * 0.9)
          if (cloud.x < -80) cloud.x = CANVAS_W + 40
        })
        state.groundOffset = (state.groundOffset + (state.speed * speedFactor)) % 24

        // Partículas y textos flotantes
        state.particles.forEach(p => { p.x += p.vx; p.y += p.vy; p.life-- })
        state.particles = state.particles.filter(p => p.life > 0)
        state.floatingTexts.forEach(t => { t.y += t.vy; t.opacity -= 0.018 })
        state.floatingTexts = state.floatingTexts.filter(t => t.opacity > 0)

        // Limitar arrays para evitar fugas de memoria y caídas de frames
        if (state.particles.length > 60) state.particles.splice(0, state.particles.length - 60)
        if (state.ghostTrails.length > 6) state.ghostTrails.length = 6
        if (state.floatingTexts.length > 10) state.floatingTexts.splice(0, state.floatingTexts.length - 10)
      } // fin updatePhysicsTick

      const loop = (currentTimestamp) => {
        if (!currentTimestamp) currentTimestamp = performance.now()
        const deltaMs = Math.min(currentTimestamp - lastTimestamp, 100) // cap a 100ms para prevenir espiral
        lastTimestamp = currentTimestamp
        accumulator += deltaMs

        const state = gameStateRef.current
        if (state && state.isRunning) {
          let updates = 0
          while (accumulator >= FIXED_STEP_MS && updates < 5) {
            try {
              updatePhysicsTick(state)
            } catch (err) {
              console.error('Error en física del juego:', err)
            }
            accumulator -= FIXED_STEP_MS
            updates++
          }
        } else {
          accumulator = 0
        }

        // ── RENDER ────────────────────────────────────────────────────────
        try {
          drawFrame(ctx, gameStateRef.current, spritesRef.current)
        } catch (err) {
          console.error('Error en renderizado:', err)
        }
        animFrameRef.current = requestAnimationFrame(loop)
      }

      animFrameRef.current = requestAnimationFrame(loop)
      return () => {
        if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
      }
    }, [spritesLoaded, finalizarPartida, retoActivo]) // sin retoSuperadoEnPartida para no reiniciar

  // ─── FUNCIÓN DE DIBUJADO (pura, sin closures) ─────────────────────────────
  function drawFrame(ctx, state, sprites) {
    if (!state) return
    ctx.clearRect(0, 0, CANVAS_W, CANVAS_H)

    // Screen Shake dinámico suave (sin marear la vista)
    let shakeX = 0, shakeY = 0
    if (state.screenShake > 0) {
      shakeX = (Math.random() - 0.5) * Math.min(2.5, state.screenShake * 0.4)
      shakeY = (Math.random() - 0.5) * Math.min(2.5, state.screenShake * 0.4)
      state.screenShake = Math.max(0, state.screenShake - 0.4)
    }

    ctx.save()
    ctx.translate(shakeX, shakeY)

    const dark = window.matchMedia?.('(prefers-color-scheme: dark)').matches
    const enFiebre = state.feverTime > 0
    const enOverdrive = state.overdriveTime > 0
    const enFinal = state.fase === 'meteoros' || state.fase === 'victoria'

    // Fondo suave y limpio Apple HIG
    const grad = ctx.createLinearGradient(0, 0, 0, CANVAS_H)
    if (enFinal) {
      grad.addColorStop(0, dark ? '#1E1B4B' : '#312E81')
      grad.addColorStop(1, dark ? '#0F172A' : '#1E293B')
    } else if (enOverdrive) {
      grad.addColorStop(0, dark ? '#0C4A6E' : '#E0F2FE')
      grad.addColorStop(1, dark ? '#0F172A' : '#F0F9FF')
    } else if (enFiebre) {
      grad.addColorStop(0, dark ? '#451A03' : '#FEF3C7')
      grad.addColorStop(1, dark ? '#0F172A' : '#FFFBEB')
    } else if (dark) {
      grad.addColorStop(0, '#0F172A')
      grad.addColorStop(1, '#1E293B')
    } else {
      grad.addColorStop(0, '#F1F5F9')
      grad.addColorStop(1, '#FFFFFF')
    }
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H)

    // Estrellas parpadeantes lejanas
    state.stars?.forEach(star => {
      const alpha = 0.25 + 0.55 * Math.sin(state.frameCount * star.twinkleSpeed + star.phase)
      ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`
      ctx.fillRect(star.x, star.y, star.size, star.size)
    })

    // Racks de servidores SMR en silueta con leds
    state.serverRacks?.forEach(rack => {
      ctx.fillStyle = dark ? 'rgba(30, 41, 59, 0.35)' : 'rgba(148, 163, 184, 0.25)'
      ctx.fillRect(rack.x, GROUND_Y - rack.h, rack.w, rack.h)
      rack.leds.forEach((on, idx) => {
        const blink = Math.floor(state.frameCount / 18 + idx) % 2 === 0
        ctx.fillStyle = (on && blink) ? '#34C759' : '#0A84FF'
        ctx.fillRect(rack.x + 4 + idx * 7, GROUND_Y - rack.h + 6, 3, 3)
      })
    })

    // Colinas
    ctx.fillStyle = enFinal ? 'rgba(80,0,120,0.3)' : enOverdrive ? 'rgba(56,189,248,0.18)' : enFiebre ? 'rgba(251,191,36,0.16)' : (dark ? 'rgba(48,209,88,0.08)' : 'rgba(52,199,89,0.12)')
    state.hills.forEach(h => {
      ctx.beginPath()
      ctx.ellipse(h.x, GROUND_Y, h.w / 2, h.h, 0, Math.PI, 0)
      ctx.fill()
    })

    // Nubes
    const cloudImg = sprites.cloud
    if (cloudImg) state.clouds.forEach(c => ctx.drawImage(cloudImg, c.x, c.y, 48, 22))

    // Líneas cinéticas de velocidad horizontal
    state.kineticLines?.forEach(k => {
      ctx.strokeStyle = k.color
      ctx.lineWidth = 1.5
      ctx.beginPath()
      ctx.moveTo(k.x, k.y)
      ctx.lineTo(k.x + k.length, k.y)
      ctx.stroke()
    })

    // Suelo con cuadrícula animada de alta velocidad
    ctx.strokeStyle = enOverdrive ? '#38BDF8' : enFiebre ? '#F59E0B' : (dark ? 'rgba(255,255,255,0.22)' : '#CBD5E1')
    ctx.lineWidth = 2
    ctx.beginPath(); ctx.moveTo(0, GROUND_Y); ctx.lineTo(CANVAS_W, GROUND_Y); ctx.stroke()
    ctx.fillStyle = enOverdrive ? 'rgba(56, 189, 248, 0.45)' : enFiebre ? '#D97706' : (dark ? 'rgba(255,255,255,0.15)' : '#94A3B8')
    for (let x = -state.groundOffset; x < CANVAS_W; x += 16) {
      ctx.fillRect(x, GROUND_Y + 4, 9, 2)
      ctx.fillRect(x + 7, GROUND_Y + 12, 7, 2)
    }

    // ── FASE METEOROS ─────────────────────────────────────────────────
    if (state.fase === 'meteoros' || state.fase === 'victoria') {
      state.meteoros.forEach(m => {
        if (m.exploded && m.y >= GROUND_Y - m.r) return
        ctx.save()
        ctx.fillStyle = m.color
        ctx.shadowColor = m.color
        ctx.shadowBlur = 16
        ctx.beginPath()
        ctx.arc(m.x, m.y, m.r, 0, Math.PI * 2)
        ctx.fill()
        ctx.strokeStyle = m.color
        ctx.lineWidth = m.r * 0.6
        ctx.globalAlpha = 0.4
        ctx.beginPath()
        ctx.moveTo(m.x, m.y)
        ctx.lineTo(m.x - m.vx * 8, m.y - m.vy * 8)
        ctx.stroke()
        ctx.globalAlpha = 1
        ctx.restore()
      })

      if (state.patataSalvadora) {
        const pat = state.patataSalvadora
        const bob = Math.sin(state.frameCount * 0.15) * 5

        ctx.save()
        ctx.shadowColor = '#FFD700'
        ctx.shadowBlur = 30 + Math.sin(state.frameCount * 0.1) * 10
        ctx.beginPath()
        ctx.arc(pat.x + 30, pat.y + 30 + bob, 40, 0, Math.PI * 2)
        ctx.fillStyle = 'rgba(255,215,0,0.15)'
        ctx.fill()
        ctx.restore()

        ctx.save()
        ctx.translate(pat.x, pat.y + bob)
        ctx.fillStyle = '#C8762A'
        ctx.shadowColor = '#FFD700'
        ctx.shadowBlur = 20
        ctx.beginPath()
        ctx.ellipse(30, 35, 28, 22, 0, 0, Math.PI * 2)
        ctx.fill()

        ctx.fillStyle = '#E8943A'
        ctx.beginPath()
        ctx.ellipse(28, 32, 20, 14, -0.2, 0, Math.PI * 2)
        ctx.fill()

        ctx.fillStyle = '#1C1C1E'
        ctx.beginPath(); ctx.arc(20, 28, 4, 0, Math.PI * 2); ctx.fill()
        ctx.beginPath(); ctx.arc(36, 26, 4, 0, Math.PI * 2); ctx.fill()

        ctx.fillStyle = '#FFF'
        ctx.beginPath(); ctx.arc(21.5, 26.5, 1.5, 0, Math.PI * 2); ctx.fill()
        ctx.beginPath(); ctx.arc(37.5, 24.5, 1.5, 0, Math.PI * 2); ctx.fill()

        ctx.fillStyle = '#DC2626'
        ctx.beginPath()
        ctx.moveTo(8, 30)
        ctx.lineTo(-10, 20)
        ctx.lineTo(-15, 50)
        ctx.lineTo(8, 52)
        ctx.closePath(); ctx.fill()

        ctx.fillStyle = '#FFD700'
        ctx.font = '12px sans-serif'
        ctx.fillText('★', -10, 42)
        ctx.restore()

        if (state.patataMensaje) {
          ctx.save()
          ctx.fillStyle = '#FFD700'
          ctx.shadowColor = '#FFD700'
          ctx.shadowBlur = 10
          ctx.font = '900 14px -apple-system, sans-serif'
          ctx.textAlign = 'center'
          ctx.fillText(state.patataMensaje, CANVAS_W / 2, CANVAS_H / 2 - 30)
          ctx.restore()
        }
      }

      if (!state.patataSalvadora) {
        const parpadeo = Math.floor(state.frameCount / 20) % 2 === 0
        if (parpadeo) {
          ctx.save()
          ctx.fillStyle = '#FF3B30'
          ctx.shadowColor = '#FF3B30'
          ctx.shadowBlur = 12
          ctx.font = '900 16px -apple-system, sans-serif'
          ctx.textAlign = 'center'
          ctx.fillText('☄️ ¡LLUVIA DE METEOROS! ☄️', CANVAS_W / 2, 40)
          ctx.restore()
        }
      }
    }

    // ── Coleccionables ────────────────────────────────────────────────
    state.collectibles.forEach(item => {
      const spr = sprites[item.sprite]
      if (spr) {
        const bob = Math.sin(state.frameCount * 0.12) * 3
        ctx.save()
        ctx.shadowColor = item.tipo === 'turboBattery' ? '#38BDF8' : item.tipo === 'superBerry' ? '#FF3B30' : item.tipo === 'egg' ? '#30D158' : '#F59E0B'
        ctx.shadowBlur = item.tipo === 'turboBattery' ? 16 : item.tipo === 'superBerry' ? 12 : 8
        ctx.drawImage(spr, item.x, item.y + bob, item.w, item.h)
        ctx.restore()
      }
    })

    // ── Alertas limpias y amigables ──────────────────────────────────
    if (state.alerts?.length > 0) {
      state.alerts.forEach(alert => {
        ctx.save()
        const aW = 96, aH = 24
        const aX = CANVAS_W - aW - 14
        const aY = Math.max(16, Math.min(CANVAS_H - 28, alert.y + 4))

        ctx.fillStyle = alert.color === '#8B5CF6' ? 'rgba(139,92,246,0.85)' :
          alert.color === '#FF3B30' ? 'rgba(255,59,48,0.85)' : 'rgba(245,158,11,0.85)'
        ctx.beginPath()
        ctx.roundRect ? ctx.roundRect(aX, aY - aH / 2, aW, aH, 8) : ctx.rect(aX, aY - aH / 2, aW, aH)
        ctx.fill()

        ctx.fillStyle = '#FFF'
        ctx.font = '700 11px -apple-system, sans-serif'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(`${alert.icon} ${alert.label}`, aX + aW / 2, aY)
        ctx.restore()
      })
    }

    // ── Obstáculos diferenciados ──────────────────────────────────────
    state.obstacles.forEach(obs => {
      const spr = sprites[obs.sprite]
      if (!spr) return
      ctx.save()
      const glowMap = { bomb: '#FF3B30', bulletBill: '#000', lowBill: '#8B5CF6', paratroopa: '#EF4444', lowWall: '#F59E0B', pipe: '#10B981', shell: '#60A5FA' }
      ctx.shadowColor = glowMap[obs.tipo] || '#888'
      ctx.shadowBlur = obs.tipo === 'lowBill' || obs.tipo === 'lowWall' ? 14 : 8

      if (obs.tipo === 'lowBill' || obs.tipo === 'lowWall') {
        ctx.fillStyle = 'rgba(139,92,246,0.25)'
        ctx.fillRect(obs.x - 2, obs.y - 4, obs.w + 4, obs.h + 6)
        ctx.strokeStyle = '#8B5CF6'
        ctx.lineWidth = 1.5
        ctx.setLineDash([4, 3])
        ctx.strokeRect(obs.x - 2, obs.y - 4, obs.w + 4, obs.h + 6)
        ctx.setLineDash([])
        ctx.fillStyle = '#8B5CF6'
        ctx.font = '700 12px sans-serif'
        ctx.textAlign = 'center'
        ctx.fillText('⬇', obs.x + obs.w / 2, obs.y - 8)
      }

      ctx.drawImage(spr, obs.x, obs.y, obs.w, obs.h)
      ctx.restore()
    })

    // ── Estelas fantasmas de Yoshi ──────────────────────────────────
    state.ghostTrails?.forEach(g => {
      if (g.spr) {
        ctx.save()
        ctx.globalAlpha = (g.life / g.maxLife) * 0.42
        ctx.shadowColor = g.color
        ctx.shadowBlur = 14
        ctx.drawImage(g.spr, g.x, g.y, g.w, g.h)
        ctx.restore()
      }
    })

    // ── Yoshi ─────────────────────────────────────────────────────────
    const yoshi = state.yoshi
    let spr = sprites.yoshiRun1
    if (yoshi.isFluttering) {
      spr = sprites.yoshiFlutter || sprites.yoshiJump
    } else if (!yoshi.isGrounded) {
      spr = sprites.yoshiJump || spr
    } else if (yoshi.isDucking) {
      spr = sprites.yoshiDuck || spr
    } else {
      spr = Math.floor(yoshi.animTick / 6) % 2 === 0 ? sprites.yoshiRun1 : sprites.yoshiRun2
    }

    if (enOverdrive && spr) {
      ctx.save()
      ctx.shadowColor = '#38BDF8'
      ctx.shadowBlur = 24
      ctx.drawImage(spr, yoshi.x, yoshi.y, yoshi.w, yoshi.h)
      ctx.restore()
    } else if (enFiebre && spr) {
      ctx.save()
      const parpadeo = state.feverUnstable && Math.floor(state.frameCount / 3) % 2 === 0
      ctx.shadowColor = parpadeo ? '#FF3B30' : '#FBBF24'
      ctx.shadowBlur = state.feverUnstable ? 20 : 14
      ctx.drawImage(spr, yoshi.x, yoshi.y, yoshi.w, yoshi.h)
      ctx.restore()
    } else if (spr) {
      ctx.drawImage(spr, yoshi.x, yoshi.y, yoshi.w, yoshi.h)
    }

    // ── Partículas ────────────────────────────────────────────────────
    state.particles.forEach(p => {
      ctx.fillStyle = p.color
      ctx.globalAlpha = p.life / p.maxLife
      ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill()
    })
    ctx.globalAlpha = 1

    // ── Textos flotantes ──────────────────────────────────────────────
    state.floatingTexts.forEach(t => {
      ctx.fillStyle = t.color
      ctx.globalAlpha = t.opacity
      ctx.font = '800 13px -apple-system, sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText(t.text, t.x, t.y)
    })
    ctx.globalAlpha = 1

    // ── HUD Limpio y Minimalista ─────────────────────────────────────
    ctx.fillStyle = dark ? 'rgba(255,255,255,0.92)' : '#0F172A'
    ctx.font = '700 14px -apple-system, BlinkMacSystemFont, sans-serif'
    ctx.textAlign = 'right'
    ctx.fillText(`${state.score}m`, CANVAS_W - 16, 26)
    if (state.coins > 0) {
      ctx.fillStyle = '#D97706'
      ctx.font = '600 12px -apple-system, BlinkMacSystemFont, sans-serif'
      ctx.fillText(`🪙 ${state.coins}`, CANVAS_W - 16, 44)
    }

    // Indicador sutil de energía / overdrive
    if (state.adrenalina > 0 || enOverdrive) {
      const adrW = 64, adrH = 5
      const adrX = 16, adrY = 16
      ctx.fillStyle = dark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)'
      ctx.beginPath()
      ctx.roundRect ? ctx.roundRect(adrX, adrY, adrW, adrH, 3) : ctx.rect(adrX, adrY, adrW, adrH)
      ctx.fill()

      const fillW = Math.max(0, Math.min(adrW, (state.adrenalina / 100) * adrW))
      if (fillW > 0) {
        ctx.fillStyle = enOverdrive ? '#38BDF8' : '#30D158'
        ctx.beginPath()
        ctx.roundRect ? ctx.roundRect(adrX, adrY, fillW, adrH, 3) : ctx.rect(adrX, adrY, fillW, adrH)
        ctx.fill()
      }
    }

    // Restaurar transformación de screen shake
    ctx.restore()
  }

  const toggleSonido = () => {
    retroAudio.muted = !sonidoActivo
    setSonidoActivo(s => !s)
  }

  // Calcular duración para mostrar en UI
  const duracionActual = Math.min(BASE_DURATION_S + wins * 90, 900)
  const minutos = Math.floor(duracionActual / 60)
  const segundosExtra = duracionActual % 60

  return (
    <div style={{
      position: 'relative',
      backgroundColor: 'var(--color-surface)',
      borderRadius: 20,
      overflow: 'hidden',
      border: '1px solid var(--color-separator)',
      boxShadow: '0 4px 16px rgba(0,0,0,0.04)'
    }}>
      {/* Cabecera limpia */}
      <div style={{
        padding: '10px 16px',
        borderBottom: '1px solid var(--color-separator)',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        backgroundColor: 'var(--color-surface-secondary)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 28, height: 28, borderRadius: 8, backgroundColor: 'rgba(52,199,89,0.12)', color: '#34C759', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Gamepad2 size={16} />
          </div>
          <div>
            <h3 className="apple-headline" style={{ fontSize: 15, margin: 0, lineHeight: 1.2 }}>Yoshi Runner</h3>
            <span className="apple-caption" style={{ fontSize: 11 }}>
              Récord: {mejorPuntuacion}m · Ronda #{wins + 1}
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {juegoEstado === 'jugando' && (
            <div className="tabular-nums" style={{ fontSize: 13, fontWeight: 800, color: 'var(--color-ink)' }}>
              {puntos}m
            </div>
          )}
          {juegoEstado === 'jugando' && monedasPartida > 0 && (
            <span style={{ fontSize: 12, fontWeight: 700, color: '#D97706' }}>
              +{monedasPartida}
            </span>
          )}
          <button type="button" onClick={toggleSonido} title={sonidoActivo ? 'Silenciar' : 'Activar sonido'} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--color-secondary-ink)', padding: 4 }}>
            {sonidoActivo ? <Volume2 size={16} /> : <VolumeX size={16} />}
          </button>
          {onClose && (
            <button type="button" onClick={onClose} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--color-tertiary-ink)', padding: 4 }}>
              <X size={18} />
            </button>
          )}
        </div>
      </div>

      {/* Canvas */}
      <div style={{ position: 'relative', width: '100%', height: CANVAS_H, overflow: 'hidden' }}>
        <canvas
          ref={canvasRef}
          onMouseDown={() => {
            if (juegoEstado === 'inicio' || juegoEstado === 'muerto' || juegoEstado === 'victoria') iniciarPartida()
            else { isJumpPressedRef.current = true; saltar() }
          }}
          onMouseUp={() => { isJumpPressedRef.current = false; if (gameStateRef.current?.yoshi) gameStateRef.current.yoshi.isFluttering = false }}
          onMouseLeave={() => { isJumpPressedRef.current = false; if (gameStateRef.current?.yoshi) gameStateRef.current.yoshi.isFluttering = false }}
          onTouchStart={e => { e.preventDefault(); if (juegoEstado === 'inicio' || juegoEstado === 'muerto' || juegoEstado === 'victoria') iniciarPartida(); else { isJumpPressedRef.current = true; saltar() } }}
          onTouchEnd={e => { e.preventDefault(); isJumpPressedRef.current = false; if (gameStateRef.current?.yoshi) gameStateRef.current.yoshi.isFluttering = false }}
          onTouchCancel={e => { e.preventDefault(); isJumpPressedRef.current = false; if (gameStateRef.current?.yoshi) gameStateRef.current.yoshi.isFluttering = false }}
          style={{ width: '100%', height: '100%', display: 'block', cursor: 'pointer', touchAction: 'none' }}
        />

        {/* Pantalla de inicio */}
        {juegoEstado === 'inicio' && (
          <div style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.35)', backdropFilter: 'blur(3px)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10, color: '#FFF' }}>
            <img src={SPRITES_DATA_URI.yoshiRun1} alt="Yoshi" style={{ width: 52, height: 52 }} />
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 18, fontWeight: 800 }}>Yoshi Runner</div>
              <div style={{ fontSize: 12, opacity: 0.8, maxWidth: 260, lineHeight: 1.4, marginTop: 4 }}>
                Espacio / ↑ Saltar · Mantener: Aletear · ↓ Agacharse
              </div>
            </div>
            <button type="button" className="btn-primary" onClick={iniciarPartida} style={{ gap: 8, backgroundColor: '#30D158', fontWeight: 700, fontSize: 14, padding: '10px 20px', borderRadius: 9999 }}>
              <Play size={16} fill="#FFF" /><span>Jugar</span>
            </button>
          </div>
        )}

        {/* Game Over */}
        {juegoEstado === 'muerto' && (
          <div style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, color: '#FFF' }}>
            <div style={{ fontSize: 20, fontWeight: 900, color: '#FF3B30' }}>FIN DE PARTIDA</div>
            <div style={{ display: 'flex', gap: 16, fontSize: 13 }}>
              <div>{puntos}m</div>
              <div style={{ color: '#FBBF24' }}>+{monedasPartida} pts</div>
            </div>
            {retoSuperadoEnPartida && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, backgroundColor: 'rgba(52,199,89,0.2)', border: '1px solid #34C759', padding: '3px 10px', borderRadius: 9999, fontSize: 11, fontWeight: 700, color: '#86EFAC' }}>
                <CheckCircle2 size={13} /><span>Reto completado</span>
              </div>
            )}
            <button type="button" className="btn-primary" onClick={iniciarPartida} style={{ marginTop: 4, gap: 6, backgroundColor: '#0A84FF', fontWeight: 700, fontSize: 13, padding: '8px 18px', borderRadius: 9999 }}>
              <RotateCcw size={14} /><span>Reintentar</span>
            </button>
          </div>
        )}

        {/* VICTORIA */}
        {juegoEstado === 'victoria' && (
          <div style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(5px)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, color: '#FFF' }}>
            <div style={{ fontSize: 28, fontWeight: 900, color: '#FFD700' }}>¡VICTORIA!</div>
            <div style={{ display: 'flex', gap: 16, fontSize: 13 }}>
              <div>{puntos}m</div>
              <div style={{ color: '#FBBF24' }}>+30 bonus</div>
            </div>
            <button type="button" className="btn-primary" onClick={iniciarPartida} style={{ marginTop: 6, gap: 6, backgroundColor: '#FFD700', color: '#000', fontWeight: 800, fontSize: 13, padding: '8px 20px', borderRadius: 9999 }}>
              <Star size={14} fill="#000" /><span>Siguiente ronda</span>
            </button>
          </div>
        )}
      </div>

      {/* Controles */}
      <div style={{ padding: '8px 16px', borderTop: '1px solid var(--color-separator)', backgroundColor: 'var(--color-surface)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span className="apple-caption" style={{ fontSize: 11 }}>
          Morado ⬇ agáchate · Rojo: salta
        </span>
        <div style={{ display: 'flex', gap: 6 }}>
          <button type="button" className="btn-secondary"
            onMouseDown={() => setAgachado(true)} onMouseUp={() => setAgachado(false)} onMouseLeave={() => setAgachado(false)}
            onTouchStart={e => { e.preventDefault(); setAgachado(true) }} onTouchEnd={e => { e.preventDefault(); setAgachado(false) }} onTouchCancel={e => { e.preventDefault(); setAgachado(false) }}
            style={{ minHeight: 34, padding: '4px 12px', fontSize: 12, gap: 4, borderRadius: 10 }}>
            <ArrowDown size={14} /><span>↓</span>
          </button>
          <button type="button" className="btn-primary"
            onMouseDown={() => { isJumpPressedRef.current = true; saltar() }}
            onMouseUp={() => { isJumpPressedRef.current = false; if (gameStateRef.current?.yoshi) gameStateRef.current.yoshi.isFluttering = false }}
            onMouseLeave={() => { isJumpPressedRef.current = false; if (gameStateRef.current?.yoshi) gameStateRef.current.yoshi.isFluttering = false }}
            onTouchStart={e => { e.preventDefault(); isJumpPressedRef.current = true; saltar() }}
            onTouchEnd={e => { e.preventDefault(); isJumpPressedRef.current = false; if (gameStateRef.current?.yoshi) gameStateRef.current.yoshi.isFluttering = false }}
            onTouchCancel={e => { e.preventDefault(); isJumpPressedRef.current = false; if (gameStateRef.current?.yoshi) gameStateRef.current.yoshi.isFluttering = false }}
            style={{ minHeight: 34, padding: '4px 14px', fontSize: 12, gap: 4, backgroundColor: '#30D158', borderRadius: 10 }}>
            <ArrowUp size={14} /><span>Saltar</span>
          </button>
        </div>
      </div>
    </div>
  )
}
