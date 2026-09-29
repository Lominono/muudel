// frontend/src/games/ruleta/RuletaCasinoGame.jsx
import { useState, useEffect, useRef } from 'react'
import { sound, triggerConfetti } from '../../utils/haptics'
import { supabase } from '../../utils/supabase'
import { transmitirEvento } from '../../utils/realtimeHub'
import {
  RotateCcw,
  Sparkles,
  Trophy,
  History,
  Coins,
  ChevronRight,
  Volume2,
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
  { valor: 5, color: '#FF3B30', borde: '#D70015', texto: '#FFF' },
  { valor: 10, color: '#007AFF', borde: '#0051A8', texto: '#FFF' },
  { valor: 25, color: '#34C759', borde: '#248A3D', texto: '#FFF' },
  { valor: 50, color: '#FF9500', borde: '#C97500', texto: '#FFF' },
]

export function RuletaCasinoGame({ perfil, setPerfil }) {
  const canvasRef = useRef(null)
  const animFrameRef = useRef(null)

  // Estados del juego
  const [girando, setGirando] = useState(false)
  const [fichaSeleccionada, setFichaSeleccionada] = useState(5)
  const [apuestas, setApuestas] = useState({}) // { 'rojo': 10, '17': 5, 'par': 5 }
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

  // Referencias para la animación física en Canvas
  const physicsRef = useRef({
    wheelAngle: 0,
    ballAngle: 0,
    ballRadius: 110,
    wheelSpeed: 0,
    ballSpeed: 0,
    targetNumber: 0,
    isStopping: false,
    lastClickSector: -1,
  })

  const totalApostado = Object.values(apuestas).reduce((acc, curr) => acc + curr, 0)
  const saldoActual = perfil?.puntos_total || 0

  // Inicializar canvas y loop de render
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const dpr = window.devicePixelRatio || 1

    canvas.width = 340 * dpr
    canvas.height = 340 * dpr
    ctx.scale(dpr, dpr)

    drawRoulette(ctx, physicsRef.current.wheelAngle, physicsRef.current.ballAngle, physicsRef.current.ballRadius)

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
    }
  }, [])

  // Función para dibujar la Ruleta en Canvas estilo Apple HIG
  const drawRoulette = (ctx, wheelAngle, ballAngle, ballRadius) => {
    const centerX = 170
    const centerY = 170
    const outerRadius = 160
    const innerRadius = 100
    const hubRadius = 45

    ctx.clearRect(0, 0, 340, 340)

    // Sombra suave bajo la rueda
    ctx.save()
    ctx.shadowColor = 'rgba(0, 0, 0, 0.15)'
    ctx.shadowBlur = 16
    ctx.shadowOffsetY = 4
    ctx.beginPath()
    ctx.arc(centerX, centerY, outerRadius, 0, Math.PI * 2)
    ctx.fillStyle = '#1C1C1E'
    ctx.fill()
    ctx.restore()

    // Borde exterior de madera / bronce satinado
    ctx.beginPath()
    ctx.arc(centerX, centerY, outerRadius, 0, Math.PI * 2)
    ctx.lineWidth = 8
    ctx.strokeStyle = '#3A3A3C'
    ctx.stroke()

    // Pista de la bola
    ctx.beginPath()
    ctx.arc(centerX, centerY, outerRadius - 6, 0, Math.PI * 2)
    ctx.lineWidth = 14
    ctx.strokeStyle = '#2C2C2E'
    ctx.stroke()

    // Casillas de números
    const totalSectors = ROULETTE_NUMBERS.length
    const anglePerSector = (Math.PI * 2) / totalSectors

    for (let i = 0; i < totalSectors; i++) {
      const num = ROULETTE_NUMBERS[i]
      const startAngle = wheelAngle + i * anglePerSector
      const endAngle = startAngle + anglePerSector

      ctx.beginPath()
      ctx.moveTo(centerX, centerY)
      ctx.arc(centerX, centerY, outerRadius - 14, startAngle, endAngle)
      ctx.closePath()

      if (num === 0) {
        ctx.fillStyle = '#34C759' // Verde Apple
      } else if (RED_NUMBERS.has(num)) {
        ctx.fillStyle = '#FF3B30' // Rojo Apple
      } else {
        ctx.fillStyle = '#1C1C1E' // Negro mate
      }
      ctx.fill()

      // Separador dorado/plateado fino
      ctx.lineWidth = 1
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)'
      ctx.stroke()

      // Número
      ctx.save()
      ctx.translate(centerX, centerY)
      ctx.rotate(startAngle + anglePerSector / 2)
      ctx.textAlign = 'right'
      ctx.textBaseline = 'middle'
      ctx.fillStyle = '#FFFFFF'
      ctx.font = 'bold 11px -apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif'
      ctx.fillText(String(num), outerRadius - 20, 0)
      ctx.restore()
    }

    // Pista interior cónica
    ctx.beginPath()
    ctx.arc(centerX, centerY, innerRadius, 0, Math.PI * 2)
    ctx.fillStyle = '#2C2C2E'
    ctx.fill()
    ctx.lineWidth = 2
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)'
    ctx.stroke()

    // Torreta central (torreta de ruleta de 4 brazos)
    ctx.beginPath()
    ctx.arc(centerX, centerY, hubRadius, 0, Math.PI * 2)
    ctx.fillStyle = '#48484A'
    ctx.fill()
    ctx.lineWidth = 2
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)'
    ctx.stroke()

    // 4 brazos de la torreta girando con la rueda
    ctx.save()
    ctx.translate(centerX, centerY)
    ctx.rotate(wheelAngle)
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)'
    ctx.lineWidth = 3
    ctx.lineCap = 'round'
    for (let b = 0; b < 4; b++) {
      ctx.rotate(Math.PI / 2)
      ctx.beginPath()
      ctx.moveTo(0, 0)
      ctx.lineTo(hubRadius - 6, 0)
      ctx.stroke()
      ctx.beginPath()
      ctx.arc(hubRadius - 6, 0, 4, 0, Math.PI * 2)
      ctx.fillStyle = '#FFFFFF'
      ctx.fill()
    }
    ctx.restore()

    // Cúpula central
    ctx.beginPath()
    ctx.arc(centerX, centerY, 14, 0, Math.PI * 2)
    ctx.fillStyle = '#E5E5EA'
    ctx.fill()

    // DIBUJAR LA BOLA DE MARFIL
    const ballX = centerX + Math.cos(ballAngle) * ballRadius
    const ballY = centerY + Math.sin(ballAngle) * ballRadius

    ctx.save()
    ctx.shadowColor = 'rgba(0, 0, 0, 0.45)'
    ctx.shadowBlur = 6
    ctx.shadowOffsetY = 2
    ctx.beginPath()
    ctx.arc(ballX, ballY, 5.5, 0, Math.PI * 2)
    ctx.fillStyle = '#FFFFFF'
    ctx.fill()
    ctx.restore()
  }

  // Manejo de giro de la ruleta
  const girarRuleta = async () => {
    if (girando || totalApostado <= 0) return
    if (saldoActual < totalApostado) {
      sound.playPop()
      return
    }

    setGirando(true)
    setResultadoGanancia(null)
    setUltimaApuesta({ ...apuestas })

    // Descontar inmediatamente la apuesta del saldo
    const nuevoSaldoTrasApuesta = saldoActual - totalApostado
    const perfilActualizado = { ...perfil, puntos_total: nuevoSaldoTrasApuesta }
    setPerfil(perfilActualizado)
    localStorage.setItem('racha_local_user', JSON.stringify(perfilActualizado))

    try {
      await supabase.from('profiles').update({ puntos_total: nuevoSaldoTrasApuesta }).eq('id', perfil.id)
    } catch (e) {}

    // Elegir número ganador de forma justa (0 al 36)
    const indexGanador = Math.floor(Math.random() * ROULETTE_NUMBERS.length)
    const numeroGanador = ROULETTE_NUMBERS[indexGanador]

    const totalSectors = ROULETTE_NUMBERS.length
    const anglePerSector = (Math.PI * 2) / totalSectors

    // Configurar física de animación: rueda gira en un sentido, bola en el opuesto
    const physics = physicsRef.current
    physics.wheelSpeed = 0.18 + Math.random() * 0.05 // Velocidad rueda
    physics.ballSpeed = -(0.32 + Math.random() * 0.08) // Velocidad bola (inversa)
    physics.ballRadius = 145 // Pista exterior
    physics.targetNumber = numeroGanador
    physics.isStopping = false

    const startTime = performance.now()
    const DURATION = 6500 // 6.5 segundos de tensión realista

    const animar = (currentTime) => {
      const elapsed = currentTime - startTime
      const progress = Math.min(elapsed / DURATION, 1)

      // Desaceleración suave física (ease-out cúbico)
      const factorFrenado = Math.pow(1 - progress, 2.2)

      physics.wheelAngle = (physics.wheelAngle + physics.wheelSpeed * factorFrenado) % (Math.PI * 2)
      physics.ballAngle = (physics.ballAngle + physics.ballSpeed * factorFrenado) % (Math.PI * 2)

      // La bola cae hacia el centro al final de la tirada
      if (progress > 0.6) {
        const fallProgress = (progress - 0.6) / 0.4
        physics.ballRadius = 145 - 28 * Math.sin(fallProgress * Math.PI * 0.5)

        // Pequeño rebote al final
        if (progress > 0.88 && progress < 0.98) {
          physics.ballRadius += Math.sin((progress - 0.88) * Math.PI * 8) * 3
        }
      }

      // Sonido mecánico de casilla/aguja al pasar
      const currentSector = Math.floor((physics.ballAngle / (Math.PI * 2)) * totalSectors)
      if (currentSector !== physics.lastClickSector) {
        physics.lastClickSector = currentSector
        if (progress < 0.92) {
          sound.playRouletteClick()
        }
      }

      // Al terminar: forzar posición exacta de la casilla ganadora
      if (progress >= 1) {
        const targetIndex = ROULETTE_NUMBERS.indexOf(numeroGanador)
        const targetAngle = physics.wheelAngle + targetIndex * anglePerSector + anglePerSector / 2
        physics.ballAngle = targetAngle
        physics.ballRadius = 117 // Asentada en la casilla

        const canvas = canvasRef.current
        if (canvas) {
          const ctx = canvas.getContext('2d')
          drawRoulette(ctx, physics.wheelAngle, physics.ballAngle, physics.ballRadius)
        }

        finalizarGiro(numeroGanador, nuevoSaldoTrasApuesta)
        return
      }

      const canvas = canvasRef.current
      if (canvas) {
        const ctx = canvas.getContext('2d')
        drawRoulette(ctx, physics.wheelAngle, physics.ballAngle, physics.ballRadius)
      }

      animFrameRef.current = requestAnimationFrame(animar)
    }

    animFrameRef.current = requestAnimationFrame(animar)
  }

  // Evaluar premios y actualizar saldo del alumno
  const finalizarGiro = async (numeroGanador, saldoBase) => {
    setGirando(false)
    setUltimoNumero(numeroGanador)

    // Actualizar historial
    const nuevoHistorial = [numeroGanador, ...historial.slice(0, 9)]
    setHistorial(nuevoHistorial)
    localStorage.setItem('muudel_ruleta_historial', JSON.stringify(nuevoHistorial))

    // Calcular ganancias según la tabla oficial de ruleta europea
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
    const colIndex = numeroGanador === 0 ? -1 : (numeroGanador - 1) % 3 // 0: Col1, 1: Col2, 2: Col3

    // 1. Plenos a números (36x)
    if (apuestas[String(numeroGanador)]) {
      const monto = apuestas[String(numeroGanador)]
      const pago = monto * 36
      gananciaTotal += pago
      detallesGanadores.push(`Pleno al ${numeroGanador} (+${pago} pts)`)
    }

    // 2. Rojo / Negro (2x)
    if (esRojo && apuestas['rojo']) {
      const pago = apuestas['rojo'] * 2
      gananciaTotal += pago
      detallesGanadores.push(`Rojo (+${pago} pts)`)
    }
    if (esNegro && apuestas['negro']) {
      const pago = apuestas['negro'] * 2
      gananciaTotal += pago
      detallesGanadores.push(`Negro (+${pago} pts)`)
    }

    // 3. Par / Impar (2x)
    if (esPar && apuestas['par']) {
      const pago = apuestas['par'] * 2
      gananciaTotal += pago
      detallesGanadores.push(`Par (+${pago} pts)`)
    }
    if (esImpar && apuestas['impar']) {
      const pago = apuestas['impar'] * 2
      gananciaTotal += pago
      detallesGanadores.push(`Impar (+${pago} pts)`)
    }

    // 4. Falta (1-18) / Pasa (19-36) (2x)
    if (esFalta && apuestas['1-18']) {
      const pago = apuestas['1-18'] * 2
      gananciaTotal += pago
      detallesGanadores.push(`1-18 (+${pago} pts)`)
    }
    if (esPasa && apuestas['19-36']) {
      const pago = apuestas['19-36'] * 2
      gananciaTotal += pago
      detallesGanadores.push(`19-36 (+${pago} pts)`)
    }

    // 5. Docenas (3x)
    if (esDocena1 && apuestas['docena1']) {
      const pago = apuestas['docena1'] * 3
      gananciaTotal += pago
      detallesGanadores.push(`1ª Docena (+${pago} pts)`)
    }
    if (esDocena2 && apuestas['docena2']) {
      const pago = apuestas['docena2'] * 3
      gananciaTotal += pago
      detallesGanadores.push(`2ª Docena (+${pago} pts)`)
    }
    if (esDocena3 && apuestas['docena3']) {
      const pago = apuestas['docena3'] * 3
      gananciaTotal += pago
      detallesGanadores.push(`3ª Docena (+${pago} pts)`)
    }

    // 6. Columnas (3x)
    if (colIndex === 0 && apuestas['col1']) {
      const pago = apuestas['col1'] * 3
      gananciaTotal += pago
      detallesGanadores.push(`Columna 1 (+${pago} pts)`)
    }
    if (colIndex === 1 && apuestas['col2']) {
      const pago = apuestas['col2'] * 3
      gananciaTotal += pago
      detallesGanadores.push(`Columna 2 (+${pago} pts)`)
    }
    if (colIndex === 2 && apuestas['col3']) {
      const pago = apuestas['col3'] * 3
      gananciaTotal += pago
      detallesGanadores.push(`Columna 3 (+${pago} pts)`)
    }

    // Liquidar puntos finales
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
        // Transmitir gran premio a la clase
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

  // Añadir ficha a una casilla
  const handleApostar = (tipo) => {
    if (girando) return
    const apostadoActual = apuestas[tipo] || 0
    const disponibleParaApostar = saldoActual - totalApostado

    if (disponibleParaApostar < fichaSeleccionada) {
      sound.playPop()
      return
    }

    sound.playChipSound()
    setApuestas(prev => ({
      ...prev,
      [tipo]: (prev[tipo] || 0) + fichaSeleccionada
    }))
  }

  // Limpiar todas las apuestas
  const limpiarApuestas = () => {
    if (girando) return
    sound.playPop()
    setApuestas({})
    setResultadoGanancia(null)
  }

  // Doblar apuestas actuales
  const doblarApuestas = () => {
    if (girando || totalApostado === 0) return
    if (saldoActual - totalApostado < totalApostado) {
      sound.playPop()
      return
    }
    sound.playChipSound()
    const dobladas = {}
    for (const [k, v] of Object.entries(apuestas)) {
      dobladas[k] = v * 2
    }
    setApuestas(dobladas)
  }

  // Repetir última apuesta
  const repetirUltima = () => {
    if (girando || !ultimaApuesta) return
    const requeridos = Object.values(ultimaApuesta).reduce((a, b) => a + b, 0)
    if (saldoActual < requeridos) {
      sound.playPop()
      return
    }
    sound.playChipSound()
    setApuestas({ ...ultimaApuesta })
  }

  // Solicitar bono de cortesía si el alumno se quedó a 0 puntos
  const solicitarBono = async () => {
    if (solicitandoBono || saldoActual > 5) return
    setSolicitandoBono(true)
    sound.playStamp()

    const nuevosPuntos = saldoActual + 15
    const actualizado = { ...perfil, puntos_total: nuevosPuntos }
    setPerfil(actualizado)
    localStorage.setItem('racha_local_user', JSON.stringify(actualizado))

    try {
      await supabase.from('profiles').update({ puntos_total: nuevosPuntos }).eq('id', perfil.id)
    } catch (e) {}

    triggerConfetti()
    setSolicitandoBono(false)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      {/* CABECERA DE LA MESA Y SALDO */}
      <div
        className="card"
        style={{
          padding: '16px 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 12,
          border: '1px solid var(--color-separator)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 14,
              backgroundColor: 'rgba(255, 59, 48, 0.12)',
              color: '#FF3B30',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 2px 8px rgba(255, 59, 48, 0.15)'
            }}
          >
            <Sparkles size={24} />
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <h2 style={{ fontSize: 18, fontWeight: 800, margin: 0, color: 'var(--color-ink)' }}>
                Ruleta SMR2 Casino
              </h2>
              <span style={{
                fontSize: 10,
                fontWeight: 700,
                padding: '2px 8px',
                borderRadius: 9999,
                backgroundColor: 'rgba(52, 199, 89, 0.12)',
                color: '#34C759',
                textTransform: 'uppercase'
              }}>
                Europea 0-36
              </span>
            </div>
            <p style={{ fontSize: 12, color: 'var(--color-secondary-ink)', margin: '2px 0 0' }}>
              Apuesta tus puntos de clase con multiplicadores oficiales hasta 36x.
            </p>
          </div>
        </div>

        {/* Saldo y Apuesta actual */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ textAlign: 'right' }}>
            <span style={{ fontSize: 11, color: 'var(--color-secondary-ink)', display: 'block', textTransform: 'uppercase', fontWeight: 600 }}>
              Mis Puntos
            </span>
            <strong style={{ fontSize: 18, color: 'var(--color-accent)', fontWeight: 800 }}>
              {saldoActual} pts
            </strong>
          </div>

          <div style={{
            height: 32,
            width: 1,
            backgroundColor: 'var(--color-separator)'
          }} />

          <div style={{ textAlign: 'right' }}>
            <span style={{ fontSize: 11, color: 'var(--color-secondary-ink)', display: 'block', textTransform: 'uppercase', fontWeight: 600 }}>
              Apuesta Mesa
            </span>
            <strong style={{ fontSize: 18, color: totalApostado > 0 ? '#FF9500' : 'var(--color-secondary-ink)', fontWeight: 800 }}>
              {totalApostado} pts
            </strong>
          </div>
        </div>
      </div>

      {/* ÁREA PRINCIPAL: RUEDA CANVAS + PANEL DE RESULTADOS / HISTORIAL */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
        gap: 16,
        alignItems: 'center'
      }}>
        {/* Canvas de la Ruleta */}
        <div
          className="card"
          style={{
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            border: '1px solid var(--color-separator)',
            position: 'relative'
          }}
        >
          <canvas
            ref={canvasRef}
            style={{
              width: 320,
              height: 320,
              maxWidth: '100%',
              aspectRatio: '1/1',
              borderRadius: '50%',
              userSelect: 'none'
            }}
          />

          {/* Aguja / Marcador fijo superior */}
          <div
            style={{
              position: 'absolute',
              top: 26,
              left: '50%',
              transform: 'translateX(-50%)',
              width: 0,
              height: 0,
              borderLeft: '8px solid transparent',
              borderRight: '8px solid transparent',
              borderTop: '16px solid #FFD60A',
              filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.4))',
              zIndex: 2,
              pointerEvents: 'none'
            }}
          />

          {girando && (
            <div style={{
              position: 'absolute',
              bottom: 28,
              backgroundColor: 'rgba(0, 0, 0, 0.75)',
              color: '#FFF',
              padding: '6px 16px',
              borderRadius: 20,
              fontSize: 13,
              fontWeight: 700,
              backdropFilter: 'blur(8px)',
              display: 'flex',
              alignItems: 'center',
              gap: 8
            }}>
              <RotateCcw size={14} className="spin-slow" />
              <span>Girando ruleta...</span>
            </div>
          )}
        </div>

        {/* Panel lateral: Último resultado, Historial y Acciones */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Tarjeta del Último Número Salido */}
          <div
            className="card"
            style={{
              padding: '18px',
              border: '1px solid var(--color-separator)',
              textAlign: 'center',
              backgroundColor: ultimoNumero === null
                ? 'var(--color-cell-bg)'
                : ultimoNumero === 0
                ? 'rgba(52, 199, 89, 0.08)'
                : RED_NUMBERS.has(ultimoNumero)
                ? 'rgba(255, 59, 48, 0.08)'
                : 'rgba(28, 28, 30, 0.08)'
            }}
          >
            <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, color: 'var(--color-secondary-ink)' }}>
              Último Número
            </span>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14, margin: '8px 0' }}>
              <div
                style={{
                  width: 58,
                  height: 58,
                  borderRadius: 18,
                  backgroundColor: ultimoNumero === null
                    ? '#8E8E93'
                    : ultimoNumero === 0
                    ? '#34C759'
                    : RED_NUMBERS.has(ultimoNumero)
                    ? '#FF3B30'
                    : '#1C1C1E',
                  color: '#FFFFFF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 26,
                  fontWeight: 900,
                  boxShadow: '0 4px 14px rgba(0,0,0,0.18)'
                }}
              >
                {ultimoNumero !== null ? ultimoNumero : '-'}
              </div>

              {ultimoNumero !== null && (
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-ink)' }}>
                    {ultimoNumero === 0 ? 'Cero (Verde)' : RED_NUMBERS.has(ultimoNumero) ? 'Rojo' : 'Negro'}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--color-secondary-ink)' }}>
                    {ultimoNumero === 0
                      ? 'Casa'
                      : `${ultimoNumero % 2 === 0 ? 'Par' : 'Impar'} • ${ultimoNumero <= 18 ? 'Falta (1-18)' : 'Pasa (19-36)'}`}
                  </div>
                </div>
              )}
            </div>

            {/* Aviso de ganancia o pérdida */}
            {resultadoGanancia && (
              <div
                style={{
                  marginTop: 8,
                  padding: '8px 12px',
                  borderRadius: 10,
                  backgroundColor: resultadoGanancia.ganancia > 0 ? 'rgba(52, 199, 89, 0.15)' : 'rgba(255, 59, 48, 0.1)',
                  color: resultadoGanancia.ganancia > 0 ? '#34C759' : '#FF3B30',
                  fontSize: 13,
                  fontWeight: 700
                }}
              >
                {resultadoGanancia.ganancia > 0 ? (
                  <>🎉 ¡Ganaste +{resultadoGanancia.ganancia} pts! ({resultadoGanancia.detalles.join(', ')})</>
                ) : (
                  <>Sin aciertos en esta tirada (-{totalApostado} pts). ¡Prueba de nuevo!</>
                )}
              </div>
            )}
          </div>

          {/* Historial de últimos 7 números */}
          <div className="card" style={{ padding: '14px 16px', border: '1px solid var(--color-separator)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
              <History size={14} color="var(--color-secondary-ink)" />
              <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-secondary-ink)', textTransform: 'uppercase' }}>
                Historial de Tiradas
              </span>
            </div>

            <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 }}>
              {historial.map((num, idx) => (
                <div
                  key={idx}
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 10,
                    backgroundColor: num === 0 ? '#34C759' : RED_NUMBERS.has(num) ? '#FF3B30' : '#1C1C1E',
                    color: '#FFF',
                    fontSize: 12,
                    fontWeight: 800,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}
                >
                  {num}
                </div>
              ))}
            </div>
          </div>

          {/* Botón principal de Giro */}
          <button
            type="button"
            className="btn-primary"
            disabled={girando || totalApostado <= 0}
            onClick={girarRuleta}
            style={{
              minHeight: 52,
              fontSize: 16,
              fontWeight: 800,
              borderRadius: 16,
              backgroundColor: totalApostado > 0 && !girando ? 'var(--color-accent)' : undefined,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              boxShadow: totalApostado > 0 ? '0 4px 16px rgba(0,122,255,0.3)' : 'none'
            }}
          >
            <RotateCcw size={18} className={girando ? 'spin-slow' : ''} />
            <span>{girando ? 'GIRANDO...' : `GIRAR RULETA (${totalApostado} pts)`}</span>
          </button>

          {/* Si no tiene puntos suficientes, botón de auxilio */}
          {saldoActual < 5 && (
            <button
              type="button"
              onClick={solicitarBono}
              disabled={solicitandoBono}
              style={{
                padding: '10px 14px',
                borderRadius: 12,
                border: '1px dashed #34C759',
                backgroundColor: 'rgba(52, 199, 89, 0.08)',
                color: '#34C759',
                fontSize: 13,
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6
              }}
            >
              <Coins size={16} />
              <span>Bono de cortesía de clase (+15 pts)</span>
            </button>
          )}
        </div>
      </div>

      {/* SELECTOR DE FICHAS */}
      <div
        className="card"
        style={{
          padding: '14px 18px',
          border: '1px solid var(--color-separator)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 12
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-secondary-ink)' }}>
            Ficha activa:
          </span>
          <div style={{ display: 'flex', gap: 10 }}>
            {FICHAS_DISPONIBLES.map((f) => {
              const activa = fichaSeleccionada === f.valor
              return (
                <button
                  key={f.valor}
                  type="button"
                  onClick={() => {
                    sound.playChipSound()
                    setFichaSeleccionada(f.valor)
                  }}
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: '50%',
                    backgroundColor: f.color,
                    color: f.texto,
                    border: activa ? '3px solid #FFD60A' : `2px solid ${f.borde}`,
                    boxShadow: activa ? '0 0 10px rgba(255, 214, 10, 0.6)' : '0 2px 6px rgba(0,0,0,0.15)',
                    transform: activa ? 'scale(1.12)' : 'scale(1)',
                    transition: 'transform 0.15s ease, border-color 0.15s ease',
                    cursor: 'pointer',
                    fontSize: 13,
                    fontWeight: 900,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  {f.valor}
                </button>
              )
            })}
          </div>
        </div>

        {/* Acciones de tapete */}
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            type="button"
            className="btn-secondary"
            disabled={girando || !ultimaApuesta}
            onClick={repetirUltima}
            style={{ fontSize: 12, padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 5 }}
            title="Repetir última apuesta"
          >
            <Copy size={13} />
            <span>Repetir</span>
          </button>

          <button
            type="button"
            className="btn-secondary"
            disabled={girando || totalApostado === 0}
            onClick={doblarApuestas}
            style={{ fontSize: 12, padding: '8px 12px' }}
            title="Doblar apuesta"
          >
            2x Doblar
          </button>

          <button
            type="button"
            className="btn-secondary"
            disabled={girando || totalApostado === 0}
            onClick={limpiarApuestas}
            style={{ fontSize: 12, padding: '8px 12px', color: '#FF3B30', display: 'flex', alignItems: 'center', gap: 5 }}
            title="Limpiar tapete"
          >
            <Trash2 size={13} />
            <span>Limpiar</span>
          </button>
        </div>
      </div>

      {/* TAPETE DE APUESTAS ESTILO CASINO EUROPEO */}
      <div
        className="card"
        style={{
          padding: '18px',
          border: '1px solid var(--color-separator)',
          backgroundColor: 'var(--color-cell-bg)',
          overflowX: 'auto'
        }}
      >
        <div style={{ minWidth: 640, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {/* FILA 1: CASILLA DEL CERO (0) */}
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              type="button"
              onClick={() => handleApostar('0')}
              style={{
                flex: 1,
                minHeight: 46,
                borderRadius: 10,
                backgroundColor: '#34C759',
                color: '#FFF',
                border: apuestas['0'] ? '2px solid #FFD60A' : 'none',
                fontWeight: 900,
                fontSize: 16,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                position: 'relative'
              }}
            >
              <span>0 (Cero - Pago 36x)</span>
              {apuestas['0'] && (
                <span style={{
                  backgroundColor: '#FFD60A',
                  color: '#000',
                  borderRadius: 12,
                  padding: '2px 8px',
                  fontSize: 11,
                  fontWeight: 900
                }}>
                  {apuestas['0']} pts
                </span>
              )}
            </button>
          </div>

          {/* CUADRÍCULA DE NÚMEROS DEL 1 AL 36 (12 filas x 3 columnas) */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr) 50px', gap: 6 }}>
            {/* Fila 3: 3, 6, 9, 12, 15, 18, 21, 24, 27, 30, 33, 36 */}
            {[3, 6, 9, 12, 15, 18, 21, 24, 27, 30, 33, 36].map((num) => {
              const esRojo = RED_NUMBERS.has(num)
              const apostado = apuestas[String(num)]
              return (
                <button
                  key={num}
                  type="button"
                  onClick={() => handleApostar(String(num))}
                  style={{
                    minHeight: 42,
                    borderRadius: 8,
                    backgroundColor: esRojo ? '#FF3B30' : '#1C1C1E',
                    color: '#FFF',
                    border: apostado ? '2px solid #FFD60A' : 'none',
                    fontWeight: 800,
                    fontSize: 14,
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: 4
                  }}
                >
                  <span>{num}</span>
                  {apostado && (
                    <span style={{
                      backgroundColor: '#FFD60A',
                      color: '#000',
                      borderRadius: 8,
                      padding: '1px 4px',
                      fontSize: 9,
                      fontWeight: 900,
                      marginTop: 2
                    }}>
                      {apostado}
                    </span>
                  )}
                </button>
              )
            })}

            {/* Botón Columna 3 (3x) */}
            <button
              type="button"
              onClick={() => handleApostar('col3')}
              style={{
                borderRadius: 8,
                backgroundColor: 'rgba(0,122,255,0.12)',
                color: 'var(--color-accent)',
                border: apuestas['col3'] ? '2px solid #FFD60A' : '1px solid var(--color-separator)',
                fontSize: 11,
                fontWeight: 800,
                cursor: 'pointer'
              }}
            >
              2 a 1
              {apuestas['col3'] && <div style={{ fontSize: 9 }}>{apuestas['col3']}p</div>}
            </button>

            {/* Fila 2: 2, 5, 8, 11, 14, 17, 20, 23, 26, 29, 32, 35 */}
            {[2, 5, 8, 11, 14, 17, 20, 23, 26, 29, 32, 35].map((num) => {
              const esRojo = RED_NUMBERS.has(num)
              const apostado = apuestas[String(num)]
              return (
                <button
                  key={num}
                  type="button"
                  onClick={() => handleApostar(String(num))}
                  style={{
                    minHeight: 42,
                    borderRadius: 8,
                    backgroundColor: esRojo ? '#FF3B30' : '#1C1C1E',
                    color: '#FFF',
                    border: apostado ? '2px solid #FFD60A' : 'none',
                    fontWeight: 800,
                    fontSize: 14,
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: 4
                  }}
                >
                  <span>{num}</span>
                  {apostado && (
                    <span style={{
                      backgroundColor: '#FFD60A',
                      color: '#000',
                      borderRadius: 8,
                      padding: '1px 4px',
                      fontSize: 9,
                      fontWeight: 900,
                      marginTop: 2
                    }}>
                      {apostado}
                    </span>
                  )}
                </button>
              )
            })}

            {/* Botón Columna 2 (3x) */}
            <button
              type="button"
              onClick={() => handleApostar('col2')}
              style={{
                borderRadius: 8,
                backgroundColor: 'rgba(0,122,255,0.12)',
                color: 'var(--color-accent)',
                border: apuestas['col2'] ? '2px solid #FFD60A' : '1px solid var(--color-separator)',
                fontSize: 11,
                fontWeight: 800,
                cursor: 'pointer'
              }}
            >
              2 a 1
              {apuestas['col2'] && <div style={{ fontSize: 9 }}>{apuestas['col2']}p</div>}
            </button>

            {/* Fila 1: 1, 4, 7, 10, 13, 16, 19, 22, 25, 28, 31, 34 */}
            {[1, 4, 7, 10, 13, 16, 19, 22, 25, 28, 31, 34].map((num) => {
              const esRojo = RED_NUMBERS.has(num)
              const apostado = apuestas[String(num)]
              return (
                <button
                  key={num}
                  type="button"
                  onClick={() => handleApostar(String(num))}
                  style={{
                    minHeight: 42,
                    borderRadius: 8,
                    backgroundColor: esRojo ? '#FF3B30' : '#1C1C1E',
                    color: '#FFF',
                    border: apostado ? '2px solid #FFD60A' : 'none',
                    fontWeight: 800,
                    fontSize: 14,
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: 4
                  }}
                >
                  <span>{num}</span>
                  {apostado && (
                    <span style={{
                      backgroundColor: '#FFD60A',
                      color: '#000',
                      borderRadius: 8,
                      padding: '1px 4px',
                      fontSize: 9,
                      fontWeight: 900,
                      marginTop: 2
                    }}>
                      {apostado}
                    </span>
                  )}
                </button>
              )
            })}

            {/* Botón Columna 1 (3x) */}
            <button
              type="button"
              onClick={() => handleApostar('col1')}
              style={{
                borderRadius: 8,
                backgroundColor: 'rgba(0,122,255,0.12)',
                color: 'var(--color-accent)',
                border: apuestas['col1'] ? '2px solid #FFD60A' : '1px solid var(--color-separator)',
                fontSize: 11,
                fontWeight: 800,
                cursor: 'pointer'
              }}
            >
              2 a 1
              {apuestas['col1'] && <div style={{ fontSize: 9 }}>{apuestas['col1']}p</div>}
            </button>
          </div>

          {/* FILA DE DOCENAS (1-12, 13-24, 25-36) (Pago 3x) */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
            {[
              { id: 'docena1', label: '1ª DOCENA (1-12)', mult: '3x' },
              { id: 'docena2', label: '2ª DOCENA (13-24)', mult: '3x' },
              { id: 'docena3', label: '3ª DOCENA (25-36)', mult: '3x' }
            ].map(d => (
              <button
                key={d.id}
                type="button"
                onClick={() => handleApostar(d.id)}
                style={{
                  minHeight: 40,
                  borderRadius: 8,
                  backgroundColor: 'var(--color-fill-secondary, rgba(0,0,0,0.04))',
                  border: apuestas[d.id] ? '2px solid #FFD60A' : '1px solid var(--color-separator)',
                  color: 'var(--color-ink)',
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6
                }}
              >
                <span>{d.label}</span>
                {apuestas[d.id] && (
                  <span style={{ backgroundColor: '#FFD60A', color: '#000', borderRadius: 8, padding: '1px 6px', fontSize: 10, fontWeight: 900 }}>
                    {apuestas[d.id]}p
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* FILA DE SUERTES SENCILLAS: 1-18, PAR, ROJO, NEGRO, IMPAR, 19-36 (Pago 2x) */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 6 }}>
            {/* 1-18 */}
            <button
              type="button"
              onClick={() => handleApostar('1-18')}
              style={{
                minHeight: 42,
                borderRadius: 8,
                backgroundColor: 'var(--color-fill-secondary, rgba(0,0,0,0.04))',
                border: apuestas['1-18'] ? '2px solid #FFD60A' : '1px solid var(--color-separator)',
                color: 'var(--color-ink)',
                fontSize: 13,
                fontWeight: 800,
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <span>1 a 18</span>
              {apuestas['1-18'] && <span style={{ backgroundColor: '#FFD60A', color: '#000', borderRadius: 8, padding: '1px 6px', fontSize: 10, fontWeight: 900 }}>{apuestas['1-18']}p</span>}
            </button>

            {/* PAR */}
            <button
              type="button"
              onClick={() => handleApostar('par')}
              style={{
                minHeight: 42,
                borderRadius: 8,
                backgroundColor: 'var(--color-fill-secondary, rgba(0,0,0,0.04))',
                border: apuestas['par'] ? '2px solid #FFD60A' : '1px solid var(--color-separator)',
                color: 'var(--color-ink)',
                fontSize: 13,
                fontWeight: 800,
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <span>PAR</span>
              {apuestas['par'] && <span style={{ backgroundColor: '#FFD60A', color: '#000', borderRadius: 8, padding: '1px 6px', fontSize: 10, fontWeight: 900 }}>{apuestas['par']}p</span>}
            </button>

            {/* ROJO (Pago 2x) */}
            <button
              type="button"
              onClick={() => handleApostar('rojo')}
              style={{
                minHeight: 42,
                borderRadius: 8,
                backgroundColor: '#FF3B30',
                border: apuestas['rojo'] ? '2px solid #FFD60A' : 'none',
                color: '#FFF',
                fontSize: 13,
                fontWeight: 900,
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <span>ROJO</span>
              {apuestas['rojo'] && <span style={{ backgroundColor: '#FFD60A', color: '#000', borderRadius: 8, padding: '1px 6px', fontSize: 10, fontWeight: 900 }}>{apuestas['rojo']}p</span>}
            </button>

            {/* NEGRO (Pago 2x) */}
            <button
              type="button"
              onClick={() => handleApostar('negro')}
              style={{
                minHeight: 42,
                borderRadius: 8,
                backgroundColor: '#1C1C1E',
                border: apuestas['negro'] ? '2px solid #FFD60A' : 'none',
                color: '#FFF',
                fontSize: 13,
                fontWeight: 900,
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <span>NEGRO</span>
              {apuestas['negro'] && <span style={{ backgroundColor: '#FFD60A', color: '#000', borderRadius: 8, padding: '1px 6px', fontSize: 10, fontWeight: 900 }}>{apuestas['negro']}p</span>}
            </button>

            {/* IMPAR */}
            <button
              type="button"
              onClick={() => handleApostar('impar')}
              style={{
                minHeight: 42,
                borderRadius: 8,
                backgroundColor: 'var(--color-fill-secondary, rgba(0,0,0,0.04))',
                border: apuestas['impar'] ? '2px solid #FFD60A' : '1px solid var(--color-separator)',
                color: 'var(--color-ink)',
                fontSize: 13,
                fontWeight: 800,
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <span>IMPAR</span>
              {apuestas['impar'] && <span style={{ backgroundColor: '#FFD60A', color: '#000', borderRadius: 8, padding: '1px 6px', fontSize: 10, fontWeight: 900 }}>{apuestas['impar']}p</span>}
            </button>

            {/* 19-36 */}
            <button
              type="button"
              onClick={() => handleApostar('19-36')}
              style={{
                minHeight: 42,
                borderRadius: 8,
                backgroundColor: 'var(--color-fill-secondary, rgba(0,0,0,0.04))',
                border: apuestas['19-36'] ? '2px solid #FFD60A' : '1px solid var(--color-separator)',
                color: 'var(--color-ink)',
                fontSize: 13,
                fontWeight: 800,
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <span>19 a 36</span>
              {apuestas['19-36'] && <span style={{ backgroundColor: '#FFD60A', color: '#000', borderRadius: 8, padding: '1px 6px', fontSize: 10, fontWeight: 900 }}>{apuestas['19-36']}p</span>}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
