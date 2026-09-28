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
  X
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
      osc.frequency.setValueAtTime(150, this.ctx.currentTime)
      osc.frequency.exponentialRampToValueAtTime(520, this.ctx.currentTime + 0.14)
      gain.gain.setValueAtTime(0.12, this.ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.14)
      osc.connect(gain)
      gain.connect(this.ctx.destination)
      osc.start()
      osc.stop(this.ctx.currentTime + 0.14)
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
      osc.frequency.setValueAtTime(1318.51, this.ctx.currentTime + 0.08) // E6
      gain.gain.setValueAtTime(0.15, this.ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.3)
      osc.connect(gain)
      gain.connect(this.ctx.destination)
      osc.start()
      osc.stop(this.ctx.currentTime + 0.3)
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
      gain.gain.setValueAtTime(0.2, this.ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.35)
      osc.connect(gain)
      gain.connect(this.ctx.destination)
      osc.start()
      osc.stop(this.ctx.currentTime + 0.35)
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
const JUMP_FORCE = -11.5
const SPEED_INITIAL = 5.2
const SPEED_MAX = 10.5

export function YoshiRunnerGame({ perfil, onMonedasGanadas, onRetoCompletado, retoActivo, onClose }) {
  const canvasRef = useRef(null)
  const animFrameRef = useRef(null)

  // Estados reactivos UI
  const [juegoEstado, setJuegoEstado] = useState('inicio') // 'inicio' | 'jugando' | 'muerto'
  const [puntos, setPuntos] = useState(0)
  const [monedasPartida, setMonedasPartida] = useState(0)
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
  const gameStateRef = useRef({
    score: 0,
    speed: SPEED_INITIAL,
    distance: 0,
    coins: 0,
    frameCount: 0,
    yoshi: {
      x: 64,
      y: GROUND_Y - 48,
      w: 48,
      h: 48,
      vy: 0,
      isGrounded: true,
      isDucking: false,
      animTick: 0
    },
    obstacles: [],
    collectibles: [],
    clouds: [
      { x: 120, y: 35, speed: 0.5 },
      { x: 380, y: 25, speed: 0.4 },
      { x: 620, y: 45, speed: 0.6 }
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
    state.frameCount = 0
    state.yoshi = {
      x: 64,
      y: GROUND_Y - 48,
      w: 48,
      h: 48,
      vy: 0,
      isGrounded: true,
      isDucking: false,
      animTick: 0
    }
    state.obstacles = []
    state.collectibles = []
    state.groundOffset = 0
    state.isRunning = true

    setPuntos(0)
    setMonedasPartida(0)
    setRetoSuperadoEnPartida(false)
    setJuegoEstado('jugando')
  }, [])

  // Saltar
  const saltar = useCallback(() => {
    const { yoshi, isRunning } = gameStateRef.current
    if (!isRunning) {
      if (juegoEstado === 'inicio' || juegoEstado === 'muerto') {
        iniciarPartida()
      }
      return
    }

    if (yoshi.isGrounded && !yoshi.isDucking) {
      yoshi.vy = JUMP_FORCE
      yoshi.isGrounded = false
      retroAudio.playJump()
    }
  }, [iniciarPartida, juegoEstado])

  // Agacharse
  const setAgachado = useCallback((ducking) => {
    const { yoshi, isRunning } = gameStateRef.current
    if (!isRunning) return
    yoshi.isDucking = ducking
    if (ducking && !yoshi.isGrounded) {
      // Fast fall si está en el aire
      yoshi.vy += 4.5
    }
  }, [])

  // Escuchar teclado
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.code === 'Space' || e.code === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
        e.preventDefault()
        saltar()
      } else if (e.code === 'ArrowDown' || e.key === 's' || e.key === 'S') {
        e.preventDefault()
        setAgachado(true)
      }
    }

    const handleKeyUp = (e) => {
      if (e.code === 'ArrowDown' || e.key === 's' || e.key === 'S') {
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

  // Game Loop principal
  useEffect(() => {
    if (!spritesLoaded) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')

    const loop = () => {
      const state = gameStateRef.current

      if (state.isRunning) {
        state.frameCount++
        state.distance += state.speed / 10
        state.score = Math.floor(state.distance)
        setPuntos(state.score)

        // Aumentar velocidad paulatinamente con la distancia
        if (state.speed < SPEED_MAX) {
          state.speed += 0.0012
        }

        // 1. FÍSICA DE YOSHI
        const yoshi = state.yoshi
        yoshi.animTick++

        if (!yoshi.isGrounded) {
          yoshi.vy += GRAVITY
          yoshi.y += yoshi.vy

          if (yoshi.y >= GROUND_Y - (yoshi.isDucking ? 30 : 48)) {
            yoshi.y = GROUND_Y - (yoshi.isDucking ? 30 : 48)
            yoshi.vy = 0
            yoshi.isGrounded = true
          }
        } else {
          yoshi.y = GROUND_Y - (yoshi.isDucking ? 30 : 48)
        }

        // Dimensiones hitbox según postura
        yoshi.h = yoshi.isDucking ? 30 : 48
        yoshi.w = yoshi.isDucking ? 52 : 48

        // 2. GENERACIÓN DE OBSTÁCULOS
        const lastObstacle = state.obstacles[state.obstacles.length - 1]
        const minGap = 210 + Math.random() * 120 + (state.speed * 8)
        const canSpawn = !lastObstacle || (CANVAS_WIDTH - lastObstacle.x > minGap)

        if (canSpawn && Math.random() < 0.035) {
          const randType = Math.random()
          let nuevoObstaculo = null

          if (state.score > 70 && randType > 0.65) {
            // Paratroopa Aérea: vuela a la altura de la cabeza, obliga a agacharse
            nuevoObstaculo = {
              tipo: 'paratroopa',
              x: CANVAS_WIDTH,
              y: GROUND_Y - 56,
              w: 36,
              h: 32,
              sprite: 'paratroopa'
            }
          } else if (randType > 0.35) {
            // Tubería con Planta Piraña
            nuevoObstaculo = {
              tipo: 'pipe',
              x: CANVAS_WIDTH,
              y: GROUND_Y - 48,
              w: 38,
              h: 48,
              sprite: 'piranhaPipe'
            }
          } else {
            // Caparazón Koopa Verde
            nuevoObstaculo = {
              tipo: 'shell',
              x: CANVAS_WIDTH,
              y: GROUND_Y - 24,
              w: 32,
              h: 24,
              sprite: 'koopaShell'
            }
          }

          if (nuevoObstaculo) {
            state.obstacles.push(nuevoObstaculo)
          }
        }

        // 3. GENERACIÓN DE COLECCIONABLES (Huevos de Yoshi y Monedas)
        const lastCollect = state.collectibles[state.collectibles.length - 1]
        if ((!lastCollect || CANVAS_WIDTH - lastCollect.x > 180) && Math.random() < 0.025) {
          const esHuevo = Math.random() < 0.3
          const alt = GROUND_Y - (esHuevo ? 75 : 60) - Math.random() * 30
          state.collectibles.push({
            tipo: esHuevo ? 'egg' : 'coin',
            valor: esHuevo ? 5 : 1,
            x: CANVAS_WIDTH,
            y: alt,
            w: esHuevo ? 26 : 22,
            h: esHuevo ? 32 : 22,
            sprite: esHuevo ? 'yoshiEgg' : 'goldCoin',
            recogido: false
          })
        }

        // Mover obstáculos
        state.obstacles.forEach((obs) => {
          obs.x -= state.speed
        })
        state.obstacles = state.obstacles.filter((obs) => obs.x + obs.w > -50)

        // Mover coleccionables
        state.collectibles.forEach((item) => {
          item.x -= state.speed
        })
        state.collectibles = state.collectibles.filter((item) => item.x + item.w > -50 && !item.recogido)

        // Mover nubes
        state.clouds.forEach((cloud) => {
          cloud.x -= cloud.speed
          if (cloud.x < -80) cloud.x = CANVAS_WIDTH + 40
        })

        // Mover terreno
        state.groundOffset = (state.groundOffset + state.speed) % 20

        // 4. DETECCIÓN DE COLISIONES CON COLECCIONABLES
        state.collectibles.forEach((item) => {
          if (item.recogido) return
          if (
            yoshi.x < item.x + item.w &&
            yoshi.x + yoshi.w > item.x &&
            yoshi.y < item.y + item.h &&
            yoshi.y + yoshi.h > item.y
          ) {
            item.recogido = true
            state.coins += item.valor
            setMonedasPartida(state.coins)

            if (item.tipo === 'egg') {
              retroAudio.playEgg()
            } else {
              retroAudio.playCoin()
            }
          }
        })

        // 5. DETECCIÓN DE COLISIONES CON OBSTÁCULOS (HITBOX JUSTA CON MARGEN)
        for (const obs of state.obstacles) {
          const hitboxMarginX = 6
          const hitboxMarginY = 5
          const yoshiBox = {
            left: yoshi.x + hitboxMarginX,
            right: yoshi.x + yoshi.w - hitboxMarginX,
            top: yoshi.y + hitboxMarginY,
            bottom: yoshi.y + yoshi.h
          }
          const obsBox = {
            left: obs.x + hitboxMarginX,
            right: obs.x + obs.w - hitboxMarginX,
            top: obs.y + hitboxMarginY,
            bottom: obs.y + obs.h
          }

          if (
            yoshiBox.left < obsBox.right &&
            yoshiBox.right > obsBox.left &&
            yoshiBox.top < obsBox.bottom &&
            yoshiBox.bottom > obsBox.top
          ) {
            // ¡GAME OVER!
            state.isRunning = false
            retroAudio.playGameOver()
            setJuegoEstado('muerto')
            finalizarPartida(state.score, state.coins)
            break
          }
        }

        // Comprobación de reto en tiempo real (ej: alcanzar 100 puntos)
        const objetivo = retoActivo?.objetivo_puntuacion || 100
        if (state.score >= objetivo && !retoSuperadoEnPartida) {
          setRetoSuperadoEnPartida(true)
          sound.playStamp()
          triggerConfetti()
          if (onRetoCompletado) {
            onRetoCompletado(state.score)
          }
        }
      }

      // 6. RENDERIZADO VISUAL
      dibujarCanvas(ctx, state)

      animFrameRef.current = requestAnimationFrame(loop)
    }

    animFrameRef.current = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(animFrameRef.current)
  }, [spritesLoaded, retoActivo, retoSuperadoEnPartida, onRetoCompletado])

  // Finalizar partida y guardar récord / recompensas
  const finalizarPartida = async (scoreFinal, coinsFinales) => {
    // 1. Actualizar High Score
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

    // 2. Entregar monedas ganadas (con límite diario para juego limpio)
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

        // Registrar en tabla de puntuaciones si existe
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

  // Dibujado del frame
  const dibujarCanvas = (ctx, state) => {
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)

    // Cielo retro degradado sutil
    const grad = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT)
    grad.addColorStop(0, '#5AC8FA15')
    grad.addColorStop(1, '#FFFFFF00')
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)

    // Nubes flotantes
    const cloudImg = spritesRef.current.cloud
    if (cloudImg) {
      state.clouds.forEach((c) => {
        ctx.drawImage(cloudImg, c.x, c.y, 48, 22)
      })
    }

    // Suelo con trama de ladrillo/hierba
    ctx.strokeStyle = '#D1D5DB'
    ctx.lineWidth = 1.5
    ctx.beginPath()
    ctx.moveTo(0, GROUND_Y)
    ctx.lineTo(CANVAS_WIDTH, GROUND_Y)
    ctx.stroke()

    // Líneas de terreno en movimiento
    ctx.fillStyle = '#9CA3AF'
    for (let x = -state.groundOffset; x < CANVAS_WIDTH; x += 16) {
      ctx.fillRect(x, GROUND_Y + 4, 8, 2)
      ctx.fillRect(x + 6, GROUND_Y + 12, 6, 2)
    }

    // Dibujar Coleccionables
    state.collectibles.forEach((item) => {
      const spr = spritesRef.current[item.sprite]
      if (spr) {
        // Ligero rebote vertical
        const bob = Math.sin(state.frameCount * 0.1) * 3
        ctx.drawImage(spr, item.x, item.y + bob, item.w, item.h)
      }
    })

    // Dibujar Obstáculos
    state.obstacles.forEach((obs) => {
      const spr = spritesRef.current[obs.sprite]
      if (spr) {
        ctx.drawImage(spr, obs.x, obs.y, obs.w, obs.h)
      }
    })

    // Dibujar a Yoshi según postura
    const yoshi = state.yoshi
    let yoshiSprite = spritesRef.current.yoshiRun1

    if (!yoshi.isGrounded) {
      yoshiSprite = spritesRef.current.yoshiJump || yoshiSprite
    } else if (yoshi.isDucking) {
      yoshiSprite = spritesRef.current.yoshiDuck || yoshiSprite
    } else {
      const step = Math.floor(yoshi.animTick / 7) % 2
      yoshiSprite = step === 0 ? spritesRef.current.yoshiRun1 : spritesRef.current.yoshiRun2
    }

    if (yoshiSprite) {
      ctx.drawImage(yoshiSprite, yoshi.x, yoshi.y, yoshi.w, yoshi.h)
    }

    // Marcador en pantalla HUD dentro del Canvas
    ctx.fillStyle = 'var(--color-ink, #1C1C1E)'
    ctx.font = '700 13px system-ui, -apple-system, sans-serif'
    ctx.textAlign = 'right'
    ctx.fillText(`${state.score.toString().padStart(5, '0')}m`, CANVAS_WIDTH - 16, 26)

    // Monedas HUD
    ctx.fillStyle = '#D97706'
    ctx.fillText(`🪙 ${state.coins}`, CANVAS_WIDTH - 16, 44)
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
              Estilo Chrome Dino · Recreo del Aula
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
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
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          onClick={saltar}
          style={{
            width: '100%',
            height: '100%',
            display: 'block',
            cursor: 'pointer',
            imageRendering: 'pixelated'
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
            <img src={SPRITES_DATA_URI.yoshiRun1} alt="Yoshi" style={{ width: 56, height: 56, imageRendering: 'pixelated' }} />
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 18, fontWeight: 800 }}>¡Corre con Yoshi!</div>
              <div style={{ fontSize: 13, opacity: 0.9 }}>
                Espacio / Arriba: Saltar · Abajo: Agacharse
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
              <span>Empezar a Correr</span>
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
              backgroundColor: 'rgba(0,0,0,0.5)',
              backdropFilter: 'blur(4px)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 10,
              color: '#FFFFFF'
            }}
          >
            <div style={{ fontSize: 20, fontWeight: 900, letterSpacing: -0.5, color: '#FF3B30' }}>
              GAME OVER
            </div>

            <div style={{ display: 'flex', gap: 18, fontSize: 13 }}>
              <div>
                Distancia: <strong>{puntos}m</strong>
              </div>
              <div style={{ color: '#FBBF24' }}>
                Recompensa: <strong>+{monedasPartida} pts</strong>
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
                <span>¡Reto diario conseguido!</span>
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
              <span>Jugar de Nuevo</span>
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
          💡 Pista: Recoge los huevos de Yoshi (+5 pts) y esquiva las tuberías piraña.
        </span>

        {/* Botones de acción táctiles */}
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            type="button"
            className="btn-secondary"
            onMouseDown={() => setAgachado(true)}
            onMouseUp={() => setAgachado(false)}
            onTouchStart={() => setAgachado(true)}
            onTouchEnd={() => setAgachado(false)}
            style={{ minHeight: 34, padding: '4px 12px', fontSize: 12, gap: 4 }}
          >
            <ArrowDown size={14} />
            <span>Agacharse</span>
          </button>

          <button
            type="button"
            className="btn-primary"
            onClick={saltar}
            style={{ minHeight: 34, padding: '4px 14px', fontSize: 12, gap: 4, backgroundColor: '#30D158' }}
          >
            <ArrowUp size={14} />
            <span>Saltar</span>
          </button>
        </div>
      </div>
    </div>
  )
}
