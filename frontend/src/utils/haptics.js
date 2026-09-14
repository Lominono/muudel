// Utilidades hápticas y de celebración ligeras (sin dependencias externas)

class SoundEngine {
  constructor() {
    this.ctx = null
  }

  init() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || window.webkitAudioContext
      if (AudioCtx) {
        this.ctx = new AudioCtx()
      }
    }
  }

  // Sonido suave de sello o tap táctil
  playStamp() {
    try {
      this.init()
      if (!this.ctx) return
      if (this.ctx.state === 'suspended') this.ctx.resume()

      const osc = this.ctx.createOscillator()
      const gain = this.ctx.createGain()
      osc.type = 'triangle'
      osc.frequency.setValueAtTime(140, this.ctx.currentTime)
      osc.frequency.exponentialRampToValueAtTime(40, this.ctx.currentTime + 0.12)

      gain.gain.setValueAtTime(0.18, this.ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.12)

      osc.connect(gain)
      gain.connect(this.ctx.destination)
      osc.start()
      osc.stop(this.ctx.currentTime + 0.12)
    } catch (e) {}
  }

  // Sonido de éxito o like
  playPop() {
    try {
      this.init()
      if (!this.ctx) return
      if (this.ctx.state === 'suspended') this.ctx.resume()

      const osc = this.ctx.createOscillator()
      const gain = this.ctx.createGain()
      osc.type = 'sine'
      osc.frequency.setValueAtTime(320, this.ctx.currentTime)
      osc.frequency.exponentialRampToValueAtTime(580, this.ctx.currentTime + 0.08)

      gain.gain.setValueAtTime(0.12, this.ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.08)

      osc.connect(gain)
      gain.connect(this.ctx.destination)
      osc.start()
      osc.stop(this.ctx.currentTime + 0.08)
    } catch (e) {}
  }
}

export const sound = new SoundEngine()

// Disparador de confeti ligero de tinta sobre canvas
export function triggerConfetti() {
  if (typeof document === 'undefined') return

  const canvas = document.createElement('canvas')
  canvas.style.position = 'fixed'
  canvas.style.top = '0'
  canvas.style.left = '0'
  canvas.style.width = '100vw'
  canvas.style.height = '100vh'
  canvas.style.pointerEvents = 'none'
  canvas.style.zIndex = '9999'
  document.body.appendChild(canvas)

  const ctx = canvas.getContext('2d')
  const width = (canvas.width = window.innerWidth)
  const height = (canvas.height = window.innerHeight)

  const colors = ['#007AFF', '#34C759', '#FF9500', '#FF3B30', '#5856D6']
  const pieces = Array.from({ length: 45 }, () => ({
    x: width / 2,
    y: height / 2 + 50,
    w: Math.random() * 8 + 4,
    h: Math.random() * 8 + 4,
    vx: (Math.random() - 0.5) * 14,
    vy: -(Math.random() * 12 + 6),
    color: colors[Math.floor(Math.random() * colors.length)],
    rot: Math.random() * 360,
    rotSpeed: (Math.random() - 0.5) * 10,
    alpha: 1,
  }))

  let start = null
  function render(time) {
    if (!start) start = time
    ctx.clearRect(0, 0, width, height)

    let alive = 0
    pieces.forEach((p) => {
      p.x += p.vx
      p.y += p.vy
      p.vy += 0.35 // Gravedad
      p.rot += p.rotSpeed
      p.alpha -= 0.012

      if (p.alpha > 0) {
        alive++
        ctx.save()
        ctx.translate(p.x, p.y)
        ctx.rotate((p.rot * Math.PI) / 180)
        ctx.fillStyle = p.color
        ctx.globalAlpha = Math.max(p.alpha, 0)
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h)
        ctx.restore()
      }
    })

    if (alive > 0) {
      requestAnimationFrame(render)
    } else {
      canvas.remove()
    }
  }

  requestAnimationFrame(render)
}
