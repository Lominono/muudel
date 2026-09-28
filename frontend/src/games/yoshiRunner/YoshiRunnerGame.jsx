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
  Flame
} from 'lucide-react'

// Sintetizador de audio retro 8-bit con Web Audio API
class RetroAudio {
  constructor() {
    this.ctx = null
    this.muted = false
  }

  init() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioContext = window.AudioContext || window.webkitAudioContext
      if (AudioContext) {
        this.ctx = new AudioContext()
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume()
    }
  }

  playJump() {
    if (this.muted) return
    this.init()
    if (!this.ctx) return
    try {
      const osc = this.ctx.createOscillator()
      const gain = this.ctx.createGain()
      osc.type = 'square'
      osc.frequency.setValueAtTime(160, this.ctx.currentTime)
      osc.frequency.exponentialRampToValueAtTime(560, this.ctx.currentTime + 0.13)
      gain.gain.setValueAtTime(0.12, this.ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.13)
      osc.connect(gain)
      gain.connect(this.ctx.destination)
      osc.start()
      osc.stop(this.ctx.currentTime + 0.13)
    } catch (e) {}
  }

  playFlutter() {
    if (this.muted) return
    this.init()
    if (!this.ctx) return
    try {
      const osc = this.ctx.createOscillator()
      const gain = this.ctx.createGain()
      osc.type = 'triangle'
      osc.frequency.setValueAtTime(360, this.ctx.currentTime)
      osc.frequency.setValueAtTime(440, this.ctx.currentTime + 0.03)
      gain.gain.setValueAtTime(0.08, this.ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.06)
      osc.connect(gain)
      gain.connect(this.ctx.destination)
      osc.start()
      osc.stop(this.ctx.currentTime + 0.06)
    } catch (e) {}
  }

  playCoin() {
    if (this.muted) return
    this.init()
    if (!this.ctx) return
    try {
      const osc = this.ctx.createOscillator()
      const gain = this.ctx.createGain()
      osc.type = 'sine'
      osc.frequency.setValueAtTime(987.77, this.ctx.currentTime) // B5
      osc.frequency.setValueAtTime(1318.51, this.ctx.currentTime + 0.07) // E6
      gain.gain.setValueAtTime(0.14, this.ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.28)
      osc.connect(gain)
      gain.connect(this.ctx.destination)
      osc.start()
      osc.stop(this.ctx.currentTime + 0.28)
    } catch (e) {}
  }

  playEgg() {
    if (this.muted) return
    this.init()
    if (!this.ctx) return
    try {
      const osc = this.ctx.createOscillator()
      const gain = this.ctx.createGain()
      osc.type = 'triangle'
      osc.frequency.setValueAtTime(587.33, this.ctx.currentTime) // D5
      osc.frequency.setValueAtTime(880.0, this.ctx.currentTime + 0.06) // A5
      osc.frequency.setValueAtTime(1174.66, this.ctx.currentTime + 0.12) // D6
      gain.gain.setValueAtTime(0.18, this.ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.35)
      osc.connect(gain)
      gain.connect(this.ctx.destination)
      osc.start()
      osc.stop(this.ctx.currentTime + 0.35)
    } catch (e) {}
  }

  playStomp() {
    if (this.muted) return
    this.init()
    if (!this.ctx) return
    try {
      const osc = this.ctx.createOscillator()
      const gain = this.ctx.createGain()
      osc.type = 'square'
      osc.frequency.setValueAtTime(320, this.ctx.currentTime)
      osc.frequency.exponentialRampToValueAtTime(80, this.ctx.currentTime + 0.12)
      gain.gain.setValueAtTime(0.2, this.ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.12)
      osc.connect(gain)
      gain.connect(this.ctx.destination)
      osc.start()
      osc.stop(this.ctx.currentTime + 0.12)
    } catch (e) {}
  }

  playFever() {
    if (this.muted) return
    this.init()
    if (!this.ctx) return
    try {
      const notes = [523.25, 659.25, 783.99, 1046.50]
      notes.forEach((freq, idx) => {
        const osc = this.ctx.createOscillator()
        const gain = this.ctx.createGain()
        osc.type = 'triangle'
        osc.frequency.setValueAtTime(freq, this.ctx.currentTime + idx * 0.08)
        gain.gain.setValueAtTime(0.15, this.ctx.currentTime + idx * 0.08)
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + idx * 0.08 + 0.2)
        osc.connect(gain)
        gain.connect(this.ctx.destination)
        osc.start(this.ctx.currentTime + idx * 0.08)
        osc.stop(this.ctx.currentTime + idx * 0.08 + 0.2)
      })
    } catch (e) {}
  }

  playWarning() {
    if (this.muted) return
    this.init()
    if (!this.ctx) return
    try {
      const osc = this.ctx.createOscillator()
      const gain = this.ctx.createGain()
      osc.type = 'sawtooth'
      osc.frequency.setValueAtTime(880, this.ctx.currentTime)
      gain.gain.setValueAtTime(0.12, this.ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.09)
      osc.connect(gain)
      gain.connect(this.ctx.destination)
      osc.start()
      osc.stop(this.ctx.currentTime + 0.09)
    } catch (e) {}
  }

  playGameOver() {
    if (this.muted) return
    this.init()
    if (!this.ctx) return
    try {
      const osc = this.ctx.createOscillator()
      const gain = this.ctx.createGain()
      osc.type = 'sawtooth'
      osc.frequency.setValueAtTime(320, this.ctx.currentTime)
      osc.frequency.linearRampToValueAtTime(80, this.ctx.currentTime + 0.4)
      gain.gain.setValueAtTime(0.2, this.ctx.currentTime)
      gain.gain.linearRampToValueAtTime(0.01, this.ctx.currentTime + 0.4)
      osc.connect(gain)
      gain.connect(this.ctx.destination)
      osc.start()
      osc.stop(this.ctx.currentTime + 0.4)
    } catch (e) {}
  }
}

const retroAudio = new RetroAudio()

const CANVAS_WIDTH = 760
const CANVAS_HEIGHT = 230
const GROUND_Y = 186
const GRAVITY = 0.65
const JUMP_FORCE = -11.8
const SPEED_INITIAL = 5.5
const SPEED_MAX = 12.0

export function YoshiRunnerGame({ perfil, onMonedasGanadas, onRetoCompletado, retoActivo, onClose }) {
  const canvasRef = useRef(null)
  const animFrameRef = useRef(null)

  // Estados reactivos UI
  const [juegoEstado, setJuegoEstado] = useState('inicio') // 'inicio' | 'jugando' | 'muerto'
  const [puntos, setPuntos] = useState(0)
  const [monedasPartida, setMonedasPartida] = useState(0)
  const [comboActual, setComboActual] = useState(1)
  const [feverActivo, setFeverActivo] = useState(false)
  const [mejorPuntuacion, setMejorPuntuacion] = useState(() => {
    return Number(localStorage.getItem('muudel_yoshi_highscore') || 0)
  })
  const [monedasHoyGanadas, setMonedasHoyGanadas] = useState(() => {
    const fecha = new Date().toISOString().split('T')[0]
    return Number(localStorage.getItem(`muudel_arcade_monedas_${fecha}_${perfil?.id}`) || 0)
  })
  const [sonidoActivo, setSonidoActivo] = useState(true)
  const [retoSuperadoEnPartida, setRetoSuperadoEnPartida] = useState(false)

  // Referencias mutables para el ciclo a 60 FPS
  const isJumpPressedRef = useRef(false)
  const gameStateRef = useRef({
    score: 0,
    speed: SPEED_INITIAL,
    distance: 0,
    coins: 0,
    combo: 1,
    comboTimer: 0,
    feverTime: 0,
    frameCount: 0,
    alerts: [], // [{ id, tipo, y, timer, maxTimer, icon, label, color }]
    yoshi: {
      x: 64,
      y: GROUND_Y - 48,
      w: 48,
      h: 48,
      vy: 0,
      isGrounded: true,
      isDucking: false,
      isFluttering: false,
      flutterFramesLeft: 0,
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
    isRunning: false
  })

  // Imágenes de sprites cargadas
  const spritesRef = useRef({})
  const [spritesLoaded, setSpritesLoaded] = useState(false)

  // Cargar sprites SVG en objetos Image
  useEffect(() => {
    let cargados = 0
    const keys = Object.keys(SPRITES_DATA_URI)
    const total = keys.length

    keys.forEach((key) => {
      const img = new Image()
      img.src = SPRITES_DATA_URI[key]
      img.onload = () => {
        spritesRef.current[key] = img
        cargados++
        if (cargados === total) {
          setSpritesLoaded(true)
        }
      }
      img.onerror = () => {
        cargados++
        if (cargados === total) setSpritesLoaded(true)
      }
    })
  }, [])

  // Iniciar partida
  const iniciarPartida = useCallback(() => {
    retroAudio.init()
    const state = gameStateRef.current
    state.score = 0
    state.distance = 0
    state.speed = SPEED_INITIAL
    state.coins = 0
    state.combo = 1
    state.comboTimer = 0
    state.feverTime = 0
    state.frameCount = 0
    state.alerts = []
    state.yoshi = {
      x: 64,
      y: GROUND_Y - 48,
      w: 48,
      h: 48,
      vy: 0,
      isGrounded: true,
      isDucking: false,
      isFluttering: false,
      flutterFramesLeft: 0,
      animTick: 0
    }
    state.obstacles = []
    state.collectibles = []
    state.particles = []
    state.floatingTexts = []
    state.groundOffset = 0
    state.isRunning = true

    setPuntos(0)
    setMonedasPartida(0)
    setComboActual(1)
    setFeverActivo(false)
    setRetoSuperadoEnPartida(false)
    setJuegoEstado('jugando')
  }, [])

  // Saltar / Iniciar Flutter
  const saltar = useCallback(() => {
    const { yoshi, isRunning } = gameStateRef.current
    if (!isRunning) {
      if (juegoEstado === 'inicio' || juegoEstado === 'muerto') {
        iniciarPartida()
      }
      return
    }

    if (yoshi.isGrounded && !yoshi.isDucking) {
      // Salto inicial con impulso
      yoshi.vy = JUMP_FORCE
      yoshi.isGrounded = false
      yoshi.flutterFramesLeft = 26
      yoshi.isFluttering = false
      retroAudio.playJump()

      // Partículas de polvo al despegar
      for (let i = 0; i < 4; i++) {
        gameStateRef.current.particles.push({
          x: yoshi.x + 8 + Math.random() * 20,
          y: GROUND_Y - 2,
          vx: -2 - Math.random() * 2,
          vy: -Math.random() * 1.5,
          color: '#D1D5DB',
          size: 3 + Math.random() * 2,
          life: 14,
          maxLife: 14
        })
      }
    } else if (!yoshi.isGrounded && yoshi.flutterFramesLeft > 0 && yoshi.vy > -3) {
      // Flutter Jump (Aleteo acrobático en el aire)
      yoshi.isFluttering = true
    }
  }, [iniciarPartida, juegoEstado])

  // Agacharse / Fast Fall
  const setAgachado = useCallback((ducking) => {
    const { yoshi, isRunning } = gameStateRef.current
    if (!isRunning) return
    yoshi.isDucking = ducking
    if (ducking && !yoshi.isGrounded) {
      // Caída rápida si está en el aire para agacharse de inmediato
      yoshi.vy = Math.max(yoshi.vy, 5.5)
      yoshi.isFluttering = false
      yoshi.flutterFramesLeft = 0
    }
  }, [])

  // Escuchar teclado con soporte de Flutter continuo al mantener espacio
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.code === 'Space' || e.code === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
        e.preventDefault()
        isJumpPressedRef.current = true
        saltar()
      } else if (e.code === 'ArrowDown' || e.key === 's' || e.key === 'S') {
        e.preventDefault()
        setAgachado(true)
      }
    }

    const handleKeyUp = (e) => {
      if (e.code === 'Space' || e.code === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
        e.preventDefault()
        isJumpPressedRef.current = false
        if (gameStateRef.current.yoshi) {
          gameStateRef.current.yoshi.isFluttering = false
        }
      } else if (e.code === 'ArrowDown' || e.key === 's' || e.key === 'S') {
        e.preventDefault()
        setAgachado(false)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [saltar, setAgachado])

  // Game Loop principal a 60 FPS
  useEffect(() => {
    if (!spritesLoaded) return
    const canvas = canvasRef.current
    if (!canvas) return

    // Soporte para pantalla Retina / High DPI sin pixelación
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    canvas.width = CANVAS_WIDTH * dpr
    canvas.height = CANVAS_HEIGHT * dpr
    const ctx = canvas.getContext('2d')
    ctx.scale(dpr, dpr)

    const loop = () => {
      const state = gameStateRef.current

      if (state.isRunning) {
        state.frameCount++
        const speedFactor = state.feverTime > 0 ? 1.3 : 1.0
        state.distance += (state.speed * speedFactor) / 10
        state.score = Math.floor(state.distance)
        setPuntos(state.score)

        // Aceleración gradual frenética
        if (state.speed < SPEED_MAX) {
          state.speed += 0.0016
        }

        // Gestión de Modo Fiebre (Fever Time)
        if (state.feverTime > 0) {
          state.feverTime--
          if (state.feverTime === 0) {
            setFeverActivo(false)
          }
        }

        // Gestión de Combo
        if (state.comboTimer > 0) {
          state.comboTimer--
          if (state.comboTimer === 0) {
            state.combo = 1
            setComboActual(1)
          }
        }

        // 1. FÍSICA DE YOSHI Y FLUTTER JUMP
        const yoshi = state.yoshi
        yoshi.animTick++

        // Si el jugador mantiene presionado el salto mientras está cayendo: FLUTTER JUMP
        if (isJumpPressedRef.current && !yoshi.isGrounded && yoshi.flutterFramesLeft > 0 && yoshi.vy > -3) {
          yoshi.isFluttering = true
          yoshi.flutterFramesLeft--
          yoshi.vy = -1.2 // Sustentación aérea

          if (yoshi.animTick % 5 === 0) {
            retroAudio.playFlutter()
            // Pequeña estela de viento bajo las patitas
            state.particles.push({
              x: yoshi.x + 14 + Math.random() * 12,
              y: yoshi.y + yoshi.h - 4,
              vx: -1.5,
              vy: 1.2,
              color: '#FFFFFF',
              size: 3,
              life: 10,
              maxLife: 10
            })
          }
        } else {
          yoshi.isFluttering = false
        }

        if (!yoshi.isGrounded) {
          if (!yoshi.isFluttering) {
            yoshi.vy += GRAVITY
          }
          yoshi.y += yoshi.vy

          if (yoshi.y >= GROUND_Y - (yoshi.isDucking ? 28 : 48)) {
            yoshi.y = GROUND_Y - (yoshi.isDucking ? 28 : 48)
            yoshi.vy = 0
            yoshi.isGrounded = true
            yoshi.isFluttering = false
            yoshi.flutterFramesLeft = 26
          }
        } else {
          yoshi.y = GROUND_Y - (yoshi.isDucking ? 28 : 48)
        }

        // Dimensiones precisas de hitbox
        yoshi.h = yoshi.isDucking ? 28 : 48
        yoshi.w = yoshi.isDucking ? 52 : 48

        // Partículas en carrera cuando está en el suelo
        if (yoshi.isGrounded && state.frameCount % 8 === 0) {
          state.particles.push({
            x: yoshi.x + 6,
            y: GROUND_Y - 2,
            vx: -state.speed * 0.4 - Math.random(),
            vy: -Math.random() * 1.5,
            color: state.feverTime > 0 ? '#FBBF24' : '#E5E7EB',
            size: state.feverTime > 0 ? 4 : 2.5,
            life: 12,
            maxLife: 12
          })
        }

        // 1.5 PROCESAR ALERTAS ACTIVAS Y GENERAR HAZARDS ANUNCIADOS
        for (let a = state.alerts.length - 1; a >= 0; a--) {
          const alert = state.alerts[a]
          alert.timer--
          if (alert.timer <= 0) {
            if (alert.tipo === 'bomb') {
              state.obstacles.push({
                tipo: 'bomb',
                x: CANVAS_WIDTH,
                y: alert.y,
                w: 36,
                h: 38,
                sprite: 'bobOmb',
                speedMod: 1.15
              })
            } else if (alert.tipo === 'bulletBill') {
              state.obstacles.push({
                tipo: 'bulletBill',
                x: CANVAS_WIDTH,
                y: alert.y,
                w: 48,
                h: 28,
                sprite: 'bulletBill',
                speedMod: 1.75
              })
            } else if (alert.tipo === 'paratroopa') {
              state.obstacles.push({
                tipo: 'paratroopa',
                x: CANVAS_WIDTH,
                y: alert.y,
                w: 38,
                h: 32,
                sprite: 'paratroopa',
                speedMod: 1.05
              })
            }
            state.alerts.splice(a, 1)
          }
        }

        // 2. DISPARAR ALERTAS DE AMENAZAS ENTRANTES (BOMBAS, BALAS Y VOLADORES)
        const hayAlertaActiva = state.alerts.length > 0
        const ultimoObstaculo = state.obstacles[state.obstacles.length - 1]
        const espacioSeguro = !ultimoObstaculo || (CANVAS_WIDTH - ultimoObstaculo.x > 210)

        if (!hayAlertaActiva && espacioSeguro) {
          const randAmenaza = Math.random()

          // A: Bomba Bob-omb (terrestre, con mecha encendida que camina hacia Yoshi)
          if (state.score > 20 && randAmenaza < 0.015) {
            state.alerts.push({
              id: 'alert-bomb-' + Date.now(),
              tipo: 'bomb',
              y: GROUND_Y - 38,
              timer: 38,
              maxTimer: 38,
              label: '¡BOMBA!',
              icon: '💣',
              color: '#FF3B30'
            })
            retroAudio.playWarning()
          }
          // B: Bala Bill (rasante supersónica)
          else if (state.score > 55 && randAmenaza < 0.026) {
            const billY = Math.random() > 0.5 ? GROUND_Y - 48 : GROUND_Y - 70
            state.alerts.push({
              id: 'alert-bill-' + Date.now(),
              tipo: 'bulletBill',
              y: billY,
              timer: 42,
              maxTimer: 42,
              label: '¡MISIL!',
              icon: '⚡',
              color: '#EF4444'
            })
            retroAudio.playWarning()
          }
          // C: Paratroopa volador
          else if (state.score > 35 && randAmenaza < 0.036) {
            state.alerts.push({
              id: 'alert-para-' + Date.now(),
              tipo: 'paratroopa',
              y: GROUND_Y - 54,
              timer: 36,
              maxTimer: 36,
              label: '¡VOLADOR!',
              icon: '⚠️',
              color: '#F59E0B'
            })
            retroAudio.playWarning()
          }
        }

        // 3. GENERACIÓN DE OBSTÁCULOS BASE (Tuberías y Caparazones)
        const minGap = 190 + Math.random() * 90 + (state.speed * 6)
        const canSpawnGround = !hayAlertaActiva && (!ultimoObstaculo || (CANVAS_WIDTH - ultimoObstaculo.x > minGap))

        if (canSpawnGround && Math.random() < 0.04) {
          if (Math.random() > 0.5) {
            // Tubería con Planta Piraña
            state.obstacles.push({
              tipo: 'pipe',
              x: CANVAS_WIDTH,
              y: GROUND_Y - 48,
              w: 38,
              h: 48,
              sprite: 'piranhaPipe',
              speedMod: 1.0
            })
          } else {
            // Caparazón Koopa Verde
            state.obstacles.push({
              tipo: 'shell',
              x: CANVAS_WIDTH,
              y: GROUND_Y - 24,
              w: 34,
              h: 24,
              sprite: 'koopaShell',
              speedMod: 1.05
            })
          }
        }

        // 4. GENERACIÓN DE COLECCIONABLES (Monedas, Huevos y Super Baya)
        const lastCollect = state.collectibles[state.collectibles.length - 1]
        if ((!lastCollect || CANVAS_WIDTH - lastCollect.x > 160) && Math.random() < 0.035) {
          const randItem = Math.random()
          if (randItem < 0.12 && state.feverTime <= 0) {
            // Super Baya de Fiebre (+Invencibilidad)
            state.collectibles.push({
              tipo: 'superBerry',
              valor: 10,
              x: CANVAS_WIDTH,
              y: GROUND_Y - 70 - Math.random() * 25,
              w: 26,
              h: 26,
              sprite: 'superBerry',
              recogido: false
            })
          } else if (randItem < 0.45) {
            // Huevo de Yoshi (+5 pts)
            state.collectibles.push({
              tipo: 'egg',
              valor: 5,
              x: CANVAS_WIDTH,
              y: GROUND_Y - 65 - Math.random() * 25,
              w: 24,
              h: 28,
              sprite: 'yoshiEgg',
              recogido: false
            })
          } else {
            // Moneda de Oro (+1 pt)
            state.collectibles.push({
              tipo: 'coin',
              valor: 1,
              x: CANVAS_WIDTH,
              y: GROUND_Y - 55 - Math.random() * 30,
              w: 22,
              h: 22,
              sprite: 'goldCoin',
              recogido: false
            })
          }
        }

        // Mover obstáculos
        state.obstacles.forEach((obs) => {
          obs.x -= state.speed * (obs.speedMod || 1.0) * speedFactor
        })
        state.obstacles = state.obstacles.filter((obs) => obs.x + obs.w > -50)

        // Mover coleccionables
        state.collectibles.forEach((item) => {
          item.x -= state.speed * speedFactor
        })
        state.collectibles = state.collectibles.filter((item) => item.x + item.w > -50 && !item.recogido)

        // Mover nubes y colinas con paralaje
        state.clouds.forEach((cloud) => {
          cloud.x -= cloud.speed * (speedFactor * 0.9)
          if (cloud.x < -80) cloud.x = CANVAS_WIDTH + 40
        })

        // Mover terreno
        state.groundOffset = (state.groundOffset + (state.speed * speedFactor)) % 24

        // 5. DETECCIÓN DE RECOGIDA DE COLECCIONABLES Y COMBOS
        state.collectibles.forEach((item) => {
          if (item.recogido) return
          if (
            yoshi.x < item.x + item.w &&
            yoshi.x + yoshi.w > item.x &&
            yoshi.y < item.y + item.h &&
            yoshi.y + yoshi.h > item.y
          ) {
            item.recogido = true

            // Aumento de Combo
            state.combo = Math.min(state.combo + 1, 5)
            state.comboTimer = 160
            setComboActual(state.combo)

            const ptsGanados = item.valor * state.combo
            state.coins += ptsGanados
            setMonedasPartida(state.coins)

            if (item.tipo === 'superBerry') {
              // Activar Modo Fiebre
              state.feverTime = 360 // 6 segundos
              setFeverActivo(true)
              retroAudio.playFever()
              triggerConfetti()
              state.floatingTexts.push({
                text: '★ ¡FIEBRE YOSHI! ★',
                x: yoshi.x + 20,
                y: yoshi.y - 12,
                vy: -1.2,
                color: '#FF3B30',
                opacity: 1
              })
            } else if (item.tipo === 'egg') {
              retroAudio.playEgg()
              state.floatingTexts.push({
                text: `+${ptsGanados} x${state.combo}`,
                x: item.x,
                y: item.y,
                vy: -1.0,
                color: '#30D158',
                opacity: 1
              })
            } else {
              retroAudio.playCoin()
              state.floatingTexts.push({
                text: `+${ptsGanados}`,
                x: item.x,
                y: item.y,
                vy: -1.0,
                color: '#FBBF24',
                opacity: 1
              })
            }

            // Partículas de brillo
            for (let i = 0; i < 6; i++) {
              state.particles.push({
                x: item.x + item.w / 2,
                y: item.y + item.h / 2,
                vx: (Math.random() - 0.5) * 4,
                vy: (Math.random() - 0.5) * 4,
                color: item.tipo === 'superBerry' ? '#FF3B30' : '#FBBF24',
                size: 3.5,
                life: 14,
                maxLife: 14
              })
            }
          }
        })

        // 6. DETECCIÓN DE COLISIONES CON OBSTÁCULOS (CON APLASTE / STOMP Y MODO FIEBRE)
        for (let i = state.obstacles.length - 1; i >= 0; i--) {
          const obs = state.obstacles[i]
          const marginX = 8
          const marginY = 6

          const yoshiBox = {
            left: yoshi.x + marginX,
            right: yoshi.x + yoshi.w - marginX,
            top: yoshi.y + marginY,
            bottom: yoshi.y + yoshi.h - 2
          }
          const obsBox = {
            left: obs.x + marginX,
            right: obs.x + obs.w - marginX,
            top: obs.y + marginY,
            bottom: obs.y + obs.h
          }

          if (
            yoshiBox.left < obsBox.right &&
            yoshiBox.right > obsBox.left &&
            yoshiBox.top < obsBox.bottom &&
            yoshiBox.bottom > obsBox.top
          ) {
            // CASO A: En Modo Fiebre Yoshi destruye todo obstáculo
            if (state.feverTime > 0) {
              retroAudio.playStomp()
              state.score += 20
              state.floatingTexts.push({
                text: '+20 ¡DESTRUIDO!',
                x: obs.x,
                y: obs.y,
                vy: -1.4,
                color: '#FF9500',
                opacity: 1
              })
              for (let p = 0; p < 10; p++) {
                state.particles.push({
                  x: obs.x + obs.w / 2,
                  y: obs.y + obs.h / 2,
                  vx: (Math.random() - 0.5) * 6,
                  vy: (Math.random() - 0.5) * 6,
                  color: '#FF3B30',
                  size: 4,
                  life: 18,
                  maxLife: 18
                })
              }
              state.obstacles.splice(i, 1)
              continue
            }

            // CASO B: Aplastado desde arriba (Stomp auténtico sobre caparazones, paratroopas o bombas)
            const esAplastable = obs.tipo === 'shell' || obs.tipo === 'paratroopa' || obs.tipo === 'bomb'
            const cayendoSobreObs = yoshi.vy > 0 && yoshiBox.bottom <= obsBox.top + 18 && esAplastable

            if (cayendoSobreObs) {
              retroAudio.playStomp()
              yoshi.vy = -11.5 // Rebote alto
              yoshi.flutterFramesLeft = 26

              if (obs.tipo === 'bomb') {
                const pts = 30 * state.combo
                state.score += pts
                state.floatingTexts.push({
                  text: `+${pts} ¡BOMBA DESACTIVADA!`,
                  x: obs.x,
                  y: obs.y - 12,
                  vy: -1.2,
                  color: '#FBBF24',
                  opacity: 1
                })
                for (let p = 0; p < 12; p++) {
                  state.particles.push({
                    x: obs.x + obs.w / 2,
                    y: obs.y + obs.h / 2,
                    vx: (Math.random() - 0.5) * 7,
                    vy: -Math.random() * 5,
                    color: '#F59E0B',
                    size: 3.5,
                    life: 18,
                    maxLife: 18
                  })
                }
              } else {
                const pts = 15 * state.combo
                state.score += pts
                state.floatingTexts.push({
                  text: `+${pts} ¡STOMP!`,
                  x: obs.x,
                  y: obs.y - 10,
                  vy: -1.2,
                  color: '#34C759',
                  opacity: 1
                })
                for (let p = 0; p < 8; p++) {
                  state.particles.push({
                    x: obs.x + obs.w / 2,
                    y: obs.y + obs.h / 2,
                    vx: (Math.random() - 0.5) * 5,
                    vy: -Math.random() * 4,
                    color: '#22C55E',
                    size: 3.5,
                    life: 16,
                    maxLife: 16
                  })
                }
              }
              state.obstacles.splice(i, 1)
              continue
            }

            // CASO C: Colisión fatal -> Game Over
            state.isRunning = false
            retroAudio.playGameOver()
            setJuegoEstado('muerto')
            finalizarPartida(state.score, state.coins)
            break
          }
        }

        // Comprobación de reto en tiempo real
        const objetivo = retoActivo?.objetivo_puntuacion || 100
        if (state.score >= objetivo && !retoSuperadoEnPartida) {
          setRetoSuperadoEnPartida(true)
          sound.playStamp()
          triggerConfetti()
          if (onRetoCompletado) {
            onRetoCompletado(state.score)
          }
        }

        // Actualizar partículas
        state.particles.forEach((p) => {
          p.x += p.vx
          p.y += p.vy
          p.life--
        })
        state.particles = state.particles.filter((p) => p.life > 0)

        // Actualizar textos flotantes
        state.floatingTexts.forEach((t) => {
          t.y += t.vy
          t.opacity -= 0.02
        })
        state.floatingTexts = state.floatingTexts.filter((t) => t.opacity > 0)
      }

      // 7. RENDERIZADO VISUAL
      dibujarCanvas(ctx, state)

      animFrameRef.current = requestAnimationFrame(loop)
    }

    animFrameRef.current = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(animFrameRef.current)
  }, [spritesLoaded, retoActivo, retoSuperadoEnPartida, onRetoCompletado])

  // Finalizar partida y guardar récord / recompensas
  const finalizarPartida = async (scoreFinal, coinsFinales) => {
    if (scoreFinal > mejorPuntuacion) {
      setMejorPuntuacion(scoreFinal)
      localStorage.setItem('muudel_yoshi_highscore', String(scoreFinal))
      transmitirEvento('arcade_record', {
        userId: perfil?.id,
        nombre: perfil?.nombre,
        puntos: scoreFinal,
        juego: 'yoshi_runner'
      })
    }

    const fecha = new Date().toISOString().split('T')[0]
    const hoyActuales = Number(localStorage.getItem(`muudel_arcade_monedas_${fecha}_${perfil?.id}`) || 0)
    const LIMITE_DIARIO = 60
    const margenDisponible = Math.max(0, LIMITE_DIARIO - hoyActuales)
    const monedasAcreditar = Math.min(coinsFinales, margenDisponible)

    if (monedasAcreditar > 0 && perfil) {
      const nuevoTotalHoy = hoyActuales + monedasAcreditar
      localStorage.setItem(`muudel_arcade_monedas_${fecha}_${perfil.id}`, String(nuevoTotalHoy))
      setMonedasHoyGanadas(nuevoTotalHoy)

      const nuevosPuntosPerfil = (perfil.puntos_total || 0) + monedasAcreditar
      const perfilActualizado = { ...perfil, puntos_total: nuevosPuntosPerfil }
      localStorage.setItem('racha_local_user', JSON.stringify(perfilActualizado))

      try {
        await supabase
          .from('profiles')
          .update({ puntos_total: nuevosPuntosPerfil })
          .eq('id', perfil.id)

        await supabase.from('juegos_puntuaciones').insert({
          user_id: perfil.id,
          juego: 'yoshi_runner',
          puntos: scoreFinal,
          monedas_ganadas: monedasAcreditar
        })
      } catch (e) {}

      transmitirEvento('puntos_actualizados', { userId: perfil.id, nuevosPuntos: nuevosPuntosPerfil })

      if (onMonedasGanadas) {
        onMonedasGanadas(monedasAcreditar)
      }
    }
  }

  // Dibujado del frame a 60 FPS
  const dibujarCanvas = (ctx, state) => {
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)

    const esModoOscuro = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches

    // Fondo degradado dinámico (Dorado si está en Modo Fiebre)
    const grad = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT)
    if (state.feverTime > 0) {
      grad.addColorStop(0, 'rgba(255, 149, 0, 0.25)')
      grad.addColorStop(1, 'rgba(255, 59, 48, 0.06)')
    } else if (esModoOscuro) {
      grad.addColorStop(0, 'rgba(10, 132, 255, 0.16)')
      grad.addColorStop(1, 'rgba(28, 28, 30, 0.02)')
    } else {
      grad.addColorStop(0, 'rgba(10, 132, 255, 0.08)')
      grad.addColorStop(1, 'rgba(255, 255, 255, 0)')
    }
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)

    // Colinas decorativas suaves al fondo
    ctx.fillStyle = state.feverTime > 0
      ? 'rgba(251, 191, 36, 0.16)'
      : (esModoOscuro ? 'rgba(48, 209, 88, 0.08)' : 'rgba(52, 199, 89, 0.12)')
    state.hills.forEach((h) => {
      ctx.beginPath()
      ctx.ellipse(h.x, GROUND_Y, h.w / 2, h.h, 0, Math.PI, 0)
      ctx.fill()
    })

    // Nubes flotantes
    const cloudImg = spritesRef.current.cloud
    if (cloudImg) {
      state.clouds.forEach((c) => {
        ctx.drawImage(cloudImg, c.x, c.y, 48, 22)
      })
    }

    // Suelo con trama nítida
    ctx.strokeStyle = state.feverTime > 0
      ? '#F59E0B'
      : (esModoOscuro ? 'rgba(255, 255, 255, 0.18)' : '#D1D5DB')
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(0, GROUND_Y)
    ctx.lineTo(CANVAS_WIDTH, GROUND_Y)
    ctx.stroke()

    // Bloques y guijarros en movimiento
    ctx.fillStyle = state.feverTime > 0
      ? '#D97706'
      : (esModoOscuro ? 'rgba(255, 255, 255, 0.12)' : '#9CA3AF')
    for (let x = -state.groundOffset; x < CANVAS_WIDTH; x += 18) {
      ctx.fillRect(x, GROUND_Y + 4, 8, 2)
      ctx.fillRect(x + 7, GROUND_Y + 12, 6, 2)
    }

    // Dibujar Coleccionables con halos de contraste
    state.collectibles.forEach((item) => {
      const spr = spritesRef.current[item.sprite]
      if (spr) {
        const bob = Math.sin(state.frameCount * 0.12) * 3
        ctx.save()
        if (item.tipo === 'superBerry') {
          ctx.shadowColor = '#FF3B30'
          ctx.shadowBlur = 12
        } else if (item.tipo === 'egg') {
          ctx.shadowColor = '#30D158'
          ctx.shadowBlur = 8
        } else {
          ctx.shadowColor = '#F59E0B'
          ctx.shadowBlur = 6
        }
        ctx.drawImage(spr, item.x, item.y + bob, item.w, item.h)
        ctx.restore()
      }
    })

    // DIBUJAR ALERTAS DE PELIGRO INMINENTE (BOMBAS, BALAS Y VOLADORES)
    if (state.alerts && state.alerts.length > 0) {
      state.alerts.forEach((alert) => {
        const blink = Math.floor(state.frameCount / 4) % 2 === 0
        if (blink) {
          ctx.save()
          const alertW = 104
          const alertH = 26
          const alertX = CANVAS_WIDTH - alertW - 10
          const alertY = Math.max(18, Math.min(CANVAS_HEIGHT - 32, alert.y + 4))

          ctx.fillStyle = alert.color === '#FF3B30' ? 'rgba(255, 59, 48, 0.92)' : 'rgba(245, 158, 11, 0.92)'
          ctx.shadowColor = alert.color || '#FF3B30'
          ctx.shadowBlur = 12
          ctx.beginPath()
          if (ctx.roundRect) {
            ctx.roundRect(alertX, alertY - alertH / 2, alertW, alertH, 13)
          } else {
            ctx.rect(alertX, alertY - alertH / 2, alertW, alertH)
          }
          ctx.fill()

          const slide = Math.sin(state.frameCount * 0.35) * 3
          ctx.fillStyle = '#FFFFFF'
          ctx.font = '900 12px -apple-system, BlinkMacSystemFont, "SF Pro", sans-serif'
          ctx.textAlign = 'center'
          ctx.textBaseline = 'middle'
          ctx.fillText(`${alert.icon} ${alert.label} ◀`, alertX + alertW / 2 - slide, alertY)
          ctx.restore()
        }
      })
    }

    // Dibujar Obstáculos con contraste diferenciado
    state.obstacles.forEach((obs) => {
      const spr = spritesRef.current[obs.sprite]
      if (spr) {
        ctx.save()
        if (obs.tipo === 'bomb') {
          ctx.shadowColor = '#FF3B30'
          ctx.shadowBlur = 8
        } else if (obs.tipo === 'bulletBill') {
          ctx.shadowColor = '#000000'
          ctx.shadowBlur = 8
        } else if (obs.tipo === 'paratroopa') {
          ctx.shadowColor = '#EF4444'
          ctx.shadowBlur = 6
        }
        ctx.drawImage(spr, obs.x, obs.y, obs.w, obs.h)
        ctx.restore()
      }
    })

    // Dibujar a Yoshi según postura (Correr, Saltar, Aleteo/Flutter, Agachado)
    const yoshi = state.yoshi
    let yoshiSprite = spritesRef.current.yoshiRun1

    if (yoshi.isFluttering) {
      yoshiSprite = spritesRef.current.yoshiFlutter || spritesRef.current.yoshiJump
    } else if (!yoshi.isGrounded) {
      yoshiSprite = spritesRef.current.yoshiJump || yoshiSprite
    } else if (yoshi.isDucking) {
      yoshiSprite = spritesRef.current.yoshiDuck || yoshiSprite
    } else {
      const step = Math.floor(yoshi.animTick / 6) % 2
      yoshiSprite = step === 0 ? spritesRef.current.yoshiRun1 : spritesRef.current.yoshiRun2
    }

    // Aura dorada si está en Modo Fiebre
    if (state.feverTime > 0) {
      ctx.save()
      ctx.shadowColor = '#FBBF24'
      ctx.shadowBlur = 14
      if (yoshiSprite) {
        ctx.drawImage(yoshiSprite, yoshi.x, yoshi.y, yoshi.w, yoshi.h)
      }
      ctx.restore()
    } else if (yoshiSprite) {
      ctx.drawImage(yoshiSprite, yoshi.x, yoshi.y, yoshi.w, yoshi.h)
    }

    // Partículas
    state.particles.forEach((p) => {
      ctx.fillStyle = p.color
      ctx.globalAlpha = p.life / p.maxLife
      ctx.beginPath()
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
      ctx.fill()
    })
    ctx.globalAlpha = 1.0

    // Textos flotantes
    state.floatingTexts.forEach((t) => {
      ctx.fillStyle = t.color
      ctx.globalAlpha = t.opacity
      ctx.font = '800 13px -apple-system, BlinkMacSystemFont, "SF Pro", sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText(t.text, t.x, t.y)
    })
    ctx.globalAlpha = 1.0

    // HUD dentro del Canvas
    ctx.fillStyle = esModoOscuro ? '#FFFFFF' : '#1C1C1E'
    ctx.font = '800 14px -apple-system, BlinkMacSystemFont, "SF Pro", sans-serif'
    ctx.textAlign = 'right'
    ctx.fillText(`${state.score.toString().padStart(5, '0')}m`, CANVAS_WIDTH - 16, 26)

    // Monedas HUD
    ctx.fillStyle = '#D97706'
    ctx.fillText(`🪙 ${state.coins}`, CANVAS_WIDTH - 16, 46)

    // Indicador Combo
    if (state.combo > 1) {
      ctx.fillStyle = '#FF9500'
      ctx.font = '900 13px -apple-system, BlinkMacSystemFont, "SF Pro", sans-serif'
      ctx.fillText(`x${state.combo} COMBO 🔥`, CANVAS_WIDTH - 16, 66)
    }

    // Indicador Modo Fiebre
    if (state.feverTime > 0) {
      const segs = Math.ceil(state.feverTime / 60)
      ctx.fillStyle = '#FF3B30'
      ctx.font = '900 13px -apple-system, BlinkMacSystemFont, "SF Pro", sans-serif'
      ctx.textAlign = 'left'
      ctx.fillText(`★ ¡FIEBRE! (${segs}s) ★`, 18, 26)
    }
  }

  const toggleSonido = () => {
    retroAudio.muted = !sonidoActivo
    setSonidoActivo(!sonidoActivo)
  }

  return (
    <div
      style={{
        position: 'relative',
        backgroundColor: 'var(--color-surface)',
        borderRadius: 20,
        overflow: 'hidden',
        border: '1px solid var(--color-separator)',
        boxShadow: '0 8px 30px rgba(0,0,0,0.06)'
      }}
    >
      {/* Cabecera del Juego */}
      <div
        style={{
          padding: '12px 16px',
          borderBottom: '1px solid var(--color-separator)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          backgroundColor: 'var(--color-surface-secondary)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: 8,
              backgroundColor: 'rgba(52, 199, 89, 0.15)',
              color: '#34C759',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <Gamepad2 size={16} />
          </div>
          <div>
            <h3 className="apple-headline" style={{ fontSize: 15, margin: 0, lineHeight: 1.2 }}>
              Yoshi Runner
            </h3>
            <span className="apple-caption" style={{ fontSize: 11 }}>
              Salto · Aleteo · Aplaste · Fiebre
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {/* Combo pill */}
          {comboActual > 1 && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 3,
              backgroundColor: 'rgba(255, 149, 0, 0.15)',
              color: 'var(--color-warning)',
              padding: '2px 8px',
              borderRadius: 9999,
              fontSize: 11,
              fontWeight: 800
            }}>
              <Flame size={12} />
              <span>x{comboActual}</span>
            </div>
          )}

          {/* Récord personal */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              fontSize: 12,
              fontWeight: 700,
              color: 'var(--color-secondary-ink)'
            }}
          >
            <Trophy size={13} color="#FF9500" />
            <span className="tabular-nums">Récord: {mejorPuntuacion}m</span>
          </div>

          {/* Monedas de hoy */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              fontSize: 12,
              fontWeight: 700,
              color: '#D97706',
              backgroundColor: 'rgba(245, 158, 11, 0.1)',
              padding: '2px 8px',
              borderRadius: 9999
            }}
          >
            <Coins size={13} />
            <span className="tabular-nums">+{monedasPartida} pts</span>
          </div>

          {/* Toggle de audio */}
          <button
            type="button"
            onClick={toggleSonido}
            title={sonidoActivo ? 'Silenciar' : 'Activar sonido'}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--color-secondary-ink)',
              padding: 4
            }}
          >
            {sonidoActivo ? <Volume2 size={16} /> : <VolumeX size={16} />}
          </button>

          {onClose && (
            <button
              type="button"
              onClick={onClose}
              style={{
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--color-tertiary-ink)',
                padding: 4
              }}
            >
              <X size={18} />
            </button>
          )}
        </div>
      </div>

      {/* Canvas Interactivo */}
      <div style={{ position: 'relative', width: '100%', height: CANVAS_HEIGHT, overflow: 'hidden' }}>
        <canvas
          ref={canvasRef}
          onMouseDown={() => {
            if (juegoEstado === 'inicio' || juegoEstado === 'muerto') {
              iniciarPartida()
            } else {
              isJumpPressedRef.current = true
              saltar()
            }
          }}
          onMouseUp={() => {
            isJumpPressedRef.current = false
            if (gameStateRef.current.yoshi) {
              gameStateRef.current.yoshi.isFluttering = false
            }
          }}
          onMouseLeave={() => {
            isJumpPressedRef.current = false
            if (gameStateRef.current.yoshi) {
              gameStateRef.current.yoshi.isFluttering = false
            }
          }}
          onTouchStart={(e) => {
            e.preventDefault()
            if (juegoEstado === 'inicio' || juegoEstado === 'muerto') {
              iniciarPartida()
            } else {
              isJumpPressedRef.current = true
              saltar()
            }
          }}
          onTouchEnd={(e) => {
            e.preventDefault()
            isJumpPressedRef.current = false
            if (gameStateRef.current.yoshi) {
              gameStateRef.current.yoshi.isFluttering = false
            }
          }}
          onTouchCancel={(e) => {
            e.preventDefault()
            isJumpPressedRef.current = false
            if (gameStateRef.current.yoshi) {
              gameStateRef.current.yoshi.isFluttering = false
            }
          }}
          style={{
            width: '100%',
            height: '100%',
            display: 'block',
            cursor: 'pointer',
            touchAction: 'none'
          }}
        />

        {/* Pantalla de Inicio / Espera */}
        {juegoEstado === 'inicio' && (
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0,0,0,0.3)',
              backdropFilter: 'blur(3px)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 12,
              color: '#FFFFFF'
            }}
          >
            <img src={SPRITES_DATA_URI.yoshiRun1} alt="Yoshi" style={{ width: 56, height: 56 }} />
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 20, fontWeight: 900 }}>Yoshi Runner</div>
              <div style={{ fontSize: 13, opacity: 0.9 }}>
                Espacio: Salto / Aleteo · Abajo: Agacharse / Aplastar
              </div>
            </div>
            <button
              type="button"
              className="btn-primary"
              onClick={iniciarPartida}
              style={{
                gap: 8,
                backgroundColor: '#30D158',
                fontWeight: 700,
                fontSize: 14,
                padding: '10px 20px',
                borderRadius: 9999
              }}
            >
              <Play size={16} fill="#FFFFFF" />
              <span>Jugar</span>
            </button>
          </div>
        )}

        {/* Pantalla de Fin de Partida (Game Over) */}
        {juegoEstado === 'muerto' && (
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0,0,0,0.55)',
              backdropFilter: 'blur(4px)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 10,
              color: '#FFFFFF'
            }}
          >
            <div style={{ fontSize: 22, fontWeight: 900, letterSpacing: -0.5, color: '#FF3B30' }}>
              FIN DE PARTIDA
            </div>

            <div style={{ display: 'flex', gap: 18, fontSize: 13 }}>
              <div>
                Distancia: <strong>{puntos}m</strong>
              </div>
              <div style={{ color: '#FBBF24' }}>
                Puntos: <strong>+{monedasPartida} pts</strong>
              </div>
            </div>

            {retoSuperadoEnPartida && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  backgroundColor: 'rgba(52, 199, 89, 0.25)',
                  border: '1px solid #34C759',
                  padding: '4px 12px',
                  borderRadius: 9999,
                  fontSize: 12,
                  fontWeight: 700,
                  color: '#86EFAC'
                }}
              >
                <CheckCircle2 size={14} />
                <span>¡Reto superado!</span>
              </div>
            )}

            <button
              type="button"
              className="btn-primary"
              onClick={iniciarPartida}
              style={{
                marginTop: 6,
                gap: 8,
                backgroundColor: '#0A84FF',
                fontWeight: 700,
                fontSize: 13,
                padding: '8px 18px',
                borderRadius: 9999
              }}
            >
              <RotateCcw size={15} />
              <span>Jugar de nuevo</span>
            </button>
          </div>
        )}
      </div>

      {/* Controles Táctiles para Móviles */}
      <div
        style={{
          padding: '10px 16px',
          borderTop: '1px solid var(--color-separator)',
          backgroundColor: 'var(--color-surface)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}
      >
        <span className="apple-caption" style={{ fontSize: 11 }}>
          💡 Atento a las alertas 💣 y ⚡ en el borde derecho. Cae sobre caparazones y bombas para aplastarlos.
        </span>

        {/* Botones de acción táctiles */}
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            type="button"
            className="btn-secondary"
            onMouseDown={() => setAgachado(true)}
            onMouseUp={() => setAgachado(false)}
            onMouseLeave={() => setAgachado(false)}
            onTouchStart={(e) => { e.preventDefault(); setAgachado(true) }}
            onTouchEnd={(e) => { e.preventDefault(); setAgachado(false) }}
            onTouchCancel={(e) => { e.preventDefault(); setAgachado(false) }}
            style={{ minHeight: 36, padding: '4px 14px', fontSize: 13, gap: 5, borderRadius: 10 }}
          >
            <ArrowDown size={15} />
            <span>Agacharse</span>
          </button>

          <button
            type="button"
            className="btn-primary"
            onMouseDown={() => {
              isJumpPressedRef.current = true
              saltar()
            }}
            onMouseUp={() => {
              isJumpPressedRef.current = false
              if (gameStateRef.current.yoshi) gameStateRef.current.yoshi.isFluttering = false
            }}
            onMouseLeave={() => {
              isJumpPressedRef.current = false
              if (gameStateRef.current.yoshi) gameStateRef.current.yoshi.isFluttering = false
            }}
            onTouchStart={(e) => {
              e.preventDefault()
              isJumpPressedRef.current = true
              saltar()
            }}
            onTouchEnd={(e) => {
              e.preventDefault()
              isJumpPressedRef.current = false
              if (gameStateRef.current.yoshi) gameStateRef.current.yoshi.isFluttering = false
            }}
            onTouchCancel={(e) => {
              e.preventDefault()
              isJumpPressedRef.current = false
              if (gameStateRef.current.yoshi) gameStateRef.current.yoshi.isFluttering = false
            }}
            style={{ minHeight: 36, padding: '4px 16px', fontSize: 13, gap: 5, backgroundColor: '#30D158', borderRadius: 10 }}
          >
            <ArrowUp size={15} />
            <span>Saltar / Aletear</span>
          </button>
        </div>
      </div>
    </div>
  )
}
