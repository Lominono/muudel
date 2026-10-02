// server/routes/ruleta.js
import { Router } from 'express'
import crypto from 'crypto'
import { createClient } from '@supabase/supabase-js'
import { config } from '../config/env.js'
import { YOSHI_ROULETTE_CONFIG } from '../config/yoshiRouletteConfig.js'
import { LedgerService, getMadridFecha } from '../utils/ledgerService.js'
import { requireAuth } from '../utils/authMiddleware.js'
import { CATALOGO_PRECIOS_BASE } from '../config/tiendaPreciosConfig.js'

const router = Router()

function getSupabaseAdmin() {
  if (!config.supabaseUrl || !config.supabaseServiceKey) {
    throw new Error('Supabase no configurado en servidor')
  }
  return createClient(config.supabaseUrl.trim(), config.supabaseServiceKey.trim(), {
    auth: { autoRefreshToken: false, persistSession: false }
  })
}

// ─── Memoria en servidor de Cooldowns, Sesiones y Topes diarios ────────────────
const userCooldowns = new Map() // userId -> timestamp último giro
const userDailyGains = new Map() // `${userId}_${YYYY-MM-DD}` -> total SE ganados hoy en ruleta
const userHourlyCoins = new Map() // `${userId}_${YYYY-MM-DD_HH}` -> monedas ganadas esta hora
const activeGameSessions = new Map() // sessionToken -> { userId, startedAt, token }

// Interruptor de emergencia (controlado desde panel de administración)
export let INTERRUPTOR_EMERGENCIA = {
  ruletaPausada: false,
  apuestasPausadas: false,
  grifosPausados: false,
  motivo: ''
}

export function setInterruptorEmergencia(nuevoEstado) {
  INTERRUPTOR_EMERGENCIA = { ...INTERRUPTOR_EMERGENCIA, ...nuevoEstado }
}

function getHoyMadridKey(userId) {
  const hoyMadrid = getMadridFecha()
  return `${userId}_${hoyMadrid}`
}

function getHoraMadridKey(userId) {
  const formatter = new Intl.DateTimeFormat('es-ES', {
    timeZone: 'Europe/Madrid',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit'
  })
  const parts = formatter.formatToParts(new Date())
  const y = parts.find(p => p.type === 'year').value
  const m = parts.find(p => p.type === 'month').value
  const d = parts.find(p => p.type === 'day').value
  const h = parts.find(p => p.type === 'hour').value
  return `${userId}_${y}-${m}-${d}_${h}`
}

/**
 * Genera un número aleatorio seguro criptográfico entre [0, max)
 */
function secureRandomInt(max) {
  return crypto.randomInt(0, max)
}

// ─── Ruleta Europea Casino Clásica (Mesa de 37 casillas) ─────────────────────
const ROULETTE_NUMBERS = [
  0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26
]

router.post('/girar', (req, res) => {
  if (INTERRUPTOR_EMERGENCIA.apuestasPausadas) {
    return res.status(503).json({ error: 'Mesa de casino temporalmente en pausa por administración.' })
  }
  try {
    const indexGanador = secureRandomInt(ROULETTE_NUMBERS.length)
    const numeroGanador = ROULETTE_NUMBERS[indexGanador]

    const esRojo = [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36].includes(numeroGanador)
    const esNegro = [2, 4, 6, 8, 10, 11, 13, 15, 17, 20, 22, 24, 26, 28, 29, 31, 33, 35].includes(numeroGanador)
    const esPar = numeroGanador !== 0 && numeroGanador % 2 === 0
    const esImpar = numeroGanador !== 0 && numeroGanador % 2 !== 0
    const esPasa = numeroGanador >= 19 && numeroGanador <= 36
    const esFalta = numeroGanador >= 1 && numeroGanador <= 18
    const esDocena1 = numeroGanador >= 1 && numeroGanador <= 12
    const esDocena2 = numeroGanador >= 13 && numeroGanador <= 24
    const esDocena3 = numeroGanador >= 25 && numeroGanador <= 36
    const colIndex = numeroGanador === 0 ? -1 : (numeroGanador - 1) % 3

    res.json({
      numeroGanador,
      indexGanador,
      metadata: {
        color: numeroGanador === 0 ? 'verde' : esRojo ? 'rojo' : 'negro',
        paridad: numeroGanador === 0 ? 'cero' : esPar ? 'par' : 'impar',
        rango: numeroGanador === 0 ? 'cero' : esFalta ? 'falta' : 'pasa',
        docena: esDocena1 ? 1 : esDocena2 ? 2 : esDocena3 ? 3 : 0,
        columna: colIndex + 1
      },
      timestamp: Date.now()
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ─── SESIONES DE YOSHI RUNNER (ANTI-CHEAT & TIMESTAMPS SERVIDOR) ─────────────

/**
 * POST /api/ruleta/yoshi-iniciar-partida
 * Genera un token seguro y registra el inicio de la partida en el servidor
 */
router.post('/yoshi-iniciar-partida', requireAuth, async (req, res) => {
  try {
    const userId = req.userId
    const sessionToken = `yoshi_${userId.slice(0, 8)}_${crypto.randomBytes(16).toString('hex')}`
    const startedAt = Date.now()

    activeGameSessions.set(sessionToken, {
      userId,
      startedAt,
      sessionToken
    })

    const supabase = getSupabaseAdmin()
    try {
      await supabase.from('yoshi_sesiones').insert({
        user_id: userId,
        session_token: sessionToken,
        started_at: new Date(startedAt).toISOString(),
        expires_at: new Date(startedAt + 15 * 60 * 1000).toISOString(),
        estado: 'activa'
      })
    } catch (_) {}

    return res.json({
      success: true,
      session_token: sessionToken,
      started_at: startedAt
    })
  } catch (err) {
    console.error('Error en /yoshi-iniciar-partida:', err)
    return res.status(500).json({ error: 'Error al iniciar sesión de juego' })
  }
})

/**
 * POST /api/ruleta/yoshi-finalizar-partida
 * Valida la partida con timestamps de servidor y tasa de monedas/segundo
 */
router.post('/yoshi-finalizar-partida', requireAuth, async (req, res) => {
  try {
    const userId = req.userId
    const { session_token, monedas_recogidas, duracion_ms, distancia_m, idempotency_key } = req.body

    if (!session_token) {
      return res.status(400).json({ error: 'Falta session_token de la partida' })
    }

    const session = activeGameSessions.get(session_token)
    const now = Date.now()
    let duracionRealMs = duracion_ms

    if (session) {
      duracionRealMs = Math.max(100, now - session.startedAt)
      if (session.userId !== userId) {
        return res.status(403).json({ error: 'Token de sesión no corresponde al usuario autenticado' })
      }
    }

    const monedas = Math.max(0, Math.floor(Number(monedas_recogidas || 0)))

    // 1. Anti-cheat: Si recogió monedas, duración mínima
    if (monedas > 0 && duracionRealMs < YOSHI_ROULETTE_CONFIG.DURACION_MINIMA_PARTIDA_MS) {
      return res.status(400).json({
        error: 'Partida sospechosamente corta para las monedas recogidas (duración mínima no cumplida).'
      })
    }

    // 2. Anti-cheat: Tasa creíble de monedas por segundo
    if (monedas > 0) {
      const segundos = Math.max(1, duracionRealMs / 1000)
      const tasaMonedasSeg = monedas / segundos
      if (tasaMonedasSeg > YOSHI_ROULETTE_CONFIG.MAX_MONEDAS_POR_SEGUNDO) {
        return res.status(400).json({
          error: `Tasa anormal de recolección (${tasaMonedasSeg.toFixed(1)} monedas/seg). Partida invalidada por anti-trampas.`
        })
      }
    }

    // 3. Anti-cheat: Tope por partida
    const monedasValidadas = Math.min(YOSHI_ROULETTE_CONFIG.MAX_MONEDAS_POR_PARTIDA, monedas)

    // 4. Anti-cheat: Tope horario
    const horaKey = getHoraMadridKey(userId)
    const acumuladasHora = userHourlyCoins.get(horaKey) || 0
    if (acumuladasHora + monedasValidadas > YOSHI_ROULETTE_CONFIG.MAX_MONEDAS_POR_HORA) {
      return res.status(429).json({
        error: `Has alcanzado el límite horario de ${YOSHI_ROULETTE_CONFIG.MAX_MONEDAS_POR_HORA} monedas de Yoshi por hora. Tómate un descanso.`
      })
    }

    // Consumir sesión (un solo uso)
    activeGameSessions.delete(session_token)
    const supabase = getSupabaseAdmin()
    try {
      await supabase.from('yoshi_sesiones').update({
        estado: 'finalizada',
        monedas_recogidas: monedasValidadas,
        duracion_ms: duracionRealMs,
        distancia_m: Math.floor(distancia_m || 0),
        finalizada_at: new Date().toISOString()
      }).eq('session_token', session_token)
    } catch (_) {}

    // Acreditar monedas mediante LedgerService
    const idempKey = idempotency_key || `partida_${session_token}`
    const resultado = await LedgerService.acreditarMonedasYoshi({
      userId,
      monedas: monedasValidadas,
      duracionMs: duracionRealMs,
      distanciaM: Math.floor(distancia_m || 0),
      sessionToken: session_token,
      idempotencyKey: idempKey
    })

    userHourlyCoins.set(horaKey, acumuladasHora + monedasValidadas)

    return res.json({
      success: true,
      monedasAcreditadas: monedasValidadas,
      nuevoSaldoMonedas: resultado.nuevoSaldoMonedas,
      limiteAlcanzado: resultado.limiteAlcanzado
    })
  } catch (err) {
    console.error('Error en /yoshi-finalizar-partida:', err)
    return res.status(500).json({ error: err.message || 'Error al finalizar partida' })
  }
})

// ─── CONSULTA DE ESTADO Y LÍMITES DE RULETA ─────────────────────────────────

/**
 * GET /api/ruleta/yoshi-estado
 * Consulta saldo de monedas, StevenEuros ganados hoy (Madrid) y estado de jackpots
 */
router.get('/yoshi-estado', requireAuth, async (req, res) => {
  try {
    const user = req.user
    const userId = user.id
    const hoyKey = getHoyMadridKey(userId)
    const ganadosHoyRuleta = userDailyGains.get(hoyKey) || 0
    const saldoMonedas = user.monedas_ruleta_yoshi || 0
    const puntosTotal = user.puntos_total || 0

    // Consultar saldo de la Banca
    const saldoBanca = await LedgerService.getSaldoBanca()

    // Comprobar disponibilidad de Jackpot semanal
    const diasDesdeUltimoJackpot = user.ultimo_jackpot_at
      ? (Date.now() - new Date(user.ultimo_jackpot_at).getTime()) / (1000 * 3600 * 24)
      : 999

    const jackpotSemanalDisponible = diasDesdeUltimoJackpot >= 7

    // Preparar estado de cada nivel
    const nivelesInfo = {}
    for (const [key, nConfig] of Object.entries(YOSHI_ROULETTE_CONFIG.NIVELES)) {
      const jackpotSegment = nConfig.segmentos.find(s => s.esJackpot)
      const jackpotPremio = jackpotSegment ? jackpotSegment.premioSE : 0
      const bancaTieneFondosParaJackpot = saldoBanca >= jackpotPremio

      nivelesInfo[key] = {
        id: nConfig.id,
        nombre: nConfig.nombre,
        costoMonedas: nConfig.costoMonedas,
        minRacha: nConfig.minRacha,
        minNivel: nConfig.minNivel,
        desbloqueado: (user.racha_actual >= nConfig.minRacha || (user.xp_nivel || 0) >= nConfig.minNivel),
        jackpotDisponible: jackpotSemanalDisponible && bancaTieneFondosParaJackpot,
        jackpotDegradadoMotivo: !jackpotSemanalDisponible
          ? 'Límite de 1 jackpot por semana ya utilizado'
          : !bancaTieneFondosParaJackpot
            ? 'La Banca del sistema se encuentra en reserva'
            : null
      }
    }

    return res.json({
      success: true,
      saldoMonedas,
      puntosTotal,
      ganadosHoyRuleta,
      maxGananciaDiariaRuleta: YOSHI_ROULETTE_CONFIG.TRAMOS_DIARIOS_SE.TOPE_DURO,
      tramos: YOSHI_ROULETTE_CONFIG.TRAMOS_DIARIOS_SE,
      maxSaldoGuardado: YOSHI_ROULETTE_CONFIG.MAX_SALDO_GUARDADO,
      cooldownMs: YOSHI_ROULETTE_CONFIG.SPIN_COOLDOWN_MS,
      saldoBanca,
      bancaEnAusteridad: saldoBanca < YOSHI_ROULETTE_CONFIG.BANCA.RESERVA_MINIMA,
      niveles: nivelesInfo,
      ruletaPausada: INTERRUPTOR_EMERGENCIA.ruletaPausada
    })
  } catch (err) {
    console.error('Error en /yoshi-estado:', err)
    return res.status(500).json({ error: err.message || 'Error consultando estado' })
  }
})

// ─── GIRO OFICIAL CON CRYPTO RNG Y TRAMOS MARGINALES ────────────────────────

/**
 * POST /api/ruleta/yoshi-girar
 * Ejecuta el giro seguro en el servidor.
 * Valida saldo, cooldown, genera aleatorio criptográfico y ejecuta doble partida.
 */
router.post('/yoshi-girar', requireAuth, async (req, res) => {
  if (INTERRUPTOR_EMERGENCIA.ruletaPausada) {
    return res.status(503).json({ error: 'La Ruleta de Yoshi está en pausa temporal por la administración.' })
  }

  try {
    const user = req.user
    const userId = user.id
    const { nivel = 'bronce', idempotency_key } = req.body

    const configNivel = YOSHI_ROULETTE_CONFIG.NIVELES[nivel]
    if (!configNivel) {
      return res.status(400).json({ error: 'Nivel de ruleta no válido (debe ser bronce, plata u oro)' })
    }

    // 1. Validar requisitos de desbloqueo
    const racha = user.racha_actual || 0
    const xpNivel = user.xp_nivel || 0
    if (racha < configNivel.minRacha && xpNivel < configNivel.minNivel) {
      return res.status(403).json({
        error: `Este nivel requiere al menos Racha ${configNivel.minRacha} días o Nivel ${configNivel.minNivel}.`
      })
    }

    // 2. Cooldown anti-ráfaga (4s)
    const now = Date.now()
    const lastSpin = userCooldowns.get(userId) || 0
    const cooldownRestante = YOSHI_ROULETTE_CONFIG.SPIN_COOLDOWN_MS - (now - lastSpin)
    if (cooldownRestante > 0) {
      return res.status(429).json({
        error: `Debes esperar ${Math.ceil(cooldownRestante / 1000)}s antes de volver a girar`,
        cooldownRestante
      })
    }

    // 3. Tope diario duro de ruleta (30 SE en Europe/Madrid)
    const hoyKey = getHoyMadridKey(userId)
    const ganadosHoy = userDailyGains.get(hoyKey) || 0
    if (ganadosHoy >= YOSHI_ROULETTE_CONFIG.TRAMOS_DIARIOS_SE.TOPE_DURO) {
      return res.status(403).json({
        error: `Has alcanzado el tope diario de ${YOSHI_ROULETTE_CONFIG.TRAMOS_DIARIOS_SE.TOPE_DURO} StevenEuros en la ruleta. Vuelve mañana a las 00:00h.`
      })
    }

    // 4. Saldo suficiente de monedas de Yoshi
    const saldoMonedas = user.monedas_ruleta_yoshi || 0
    if (saldoMonedas < configNivel.costoMonedas) {
      return res.status(400).json({
        error: `Saldo insuficiente. Tienes ${saldoMonedas} monedas y este nivel requiere ${configNivel.costoMonedas} monedas.`
      })
    }

    // 5. Determinar resultado con Aleatorio Criptográfico Seguro
    // Usamos 1.000.000 de particiones
    const randomMillion = secureRandomInt(1000000)
    let acumulador = 0
    let indexGanador = 0
    let segmentoGanador = configNivel.segmentos[0]

    for (let i = 0; i < configNivel.segmentos.length; i++) {
      const seg = configNivel.segmentos[i]
      acumulador += Math.round(seg.prob * 1000000)
      if (randomMillion < acumulador) {
        segmentoGanador = seg
        indexGanador = i
        break
      }
    }

    // 6. Aplicar reglas de Jackpot vs Tramos Decrecientes Marginales
    let premioFinalAcreditar = 0
    let esJackpotEfectivo = false
    let fueDegradado = false
    let motivoDegradacion = ''

    if (segmentoGanador.esJackpot) {
      const saldoBanca = await LedgerService.getSaldoBanca()
      const diasDesdeUltimoJackpot = user.ultimo_jackpot_at
        ? (Date.now() - new Date(user.ultimo_jackpot_at).getTime()) / (1000 * 3600 * 24)
        : 999

      if (diasDesdeUltimoJackpot < 7) {
        fueDegradado = true
        motivoDegradacion = 'Límite de 1 jackpot semanal por usuario ya alcanzado'
      } else if (saldoBanca < segmentoGanador.premioSE) {
        fueDegradado = true
        motivoDegradacion = 'La Banca del sistema se encuentra en reserva mínima'
      }

      if (fueDegradado) {
        // Degradar al premio inmediatamente inferior y aplicar tramos marginales
        const premioDegradadoBruto = segmentoGanador.degradaA || 20
        premioFinalAcreditar = calcularPremioMarginal(premioDegradadoBruto, ganadosHoy)
      } else {
        // Jackpot íntegro exento de rendimientos decrecientes
        premioFinalAcreditar = segmentoGanador.premioSE
        esJackpotEfectivo = true
      }
    } else {
      // Premio ordinario: aplicar rendimientos decrecientes marginales
      premioFinalAcreditar = calcularPremioMarginal(segmentoGanador.premioSE, ganadosHoy)
    }

    // 7. Ejecutar transferencia atómica de doble partida con la Banca
    const idempKey = idempotency_key || `giro_${userId}_${now}_${randomMillion}`
    const txResult = await LedgerService.ejecutarGiroRuleta({
      userId,
      nivel: configNivel.id,
      costoMonedas: configNivel.costoMonedas,
      premioSE: premioFinalAcreditar,
      esJackpot: esJackpotEfectivo,
      motivo: `Giro Ruleta Yoshi ${configNivel.nombre}: sector ${segmentoGanador.label}`,
      idempotencyKey: idempKey,
      detalles: {
        nivel: configNivel.id,
        indexGanador,
        segmentoOriginal: segmentoGanador.id,
        fueDegradado,
        motivoDegradacion
      }
    })

    // Actualizar cooldown y contador diario
    userCooldowns.set(userId, now)
    const nuevoGanadosHoy = ganadosHoy + premioFinalAcreditar
    userDailyGains.set(hoyKey, nuevoGanadosHoy)

    return res.json({
      success: true,
      ganador: {
        ...segmentoGanador,
        premioRealAcreditado: premioFinalAcreditar,
        fueDegradado,
        motivoDegradacion
      },
      indexGanador,
      totalSegmentos: configNivel.segmentos.length,
      nivelSeleccionado: configNivel.id,
      costoMonedas: configNivel.costoMonedas,
      stevenEurosGanados: premioFinalAcreditar,
      nuevoSaldoMonedas: txResult.nuevo_saldo_monedas,
      nuevosPuntosTotal: txResult.nuevo_saldo_se,
      ganadosHoyTotal: nuevoGanadosHoy,
      topeAlcanzado: nuevoGanadosHoy >= YOSHI_ROULETTE_CONFIG.TRAMOS_DIARIOS_SE.TOPE_DURO,
      timestamp: now
    })
  } catch (err) {
    console.error('Error en /yoshi-girar:', err)
    return res.status(500).json({ error: err.message || 'Error al ejecutar giro' })
  }
})

// ─── HISTORIAL CONTABLE DEL JUGADOR (SIN PARÁMETRO user_id) ─────────────────

/**
 * GET /api/ruleta/historial-ledger
 * Devuelve el historial contable del usuario autenticado (extraído de su sesión).
 */
router.get('/historial-ledger', requireAuth, async (req, res) => {
  try {
    const userId = req.userId
    const supabase = getSupabaseAdmin()

    const { data: historial, error } = await supabase
      .from('steven_ledger')
      .select('id, tipo, moneda, cantidad, saldo_anterior, saldo_posterior, motivo, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50)

    if (error) {
      return res.json({
        success: true,
        historial: [],
        mensaje: 'Registro contable en preparación'
      })
    }

    return res.json({
      success: true,
      historial: historial || []
    })
  } catch (err) {
    console.error('Error en /historial-ledger:', err)
    return res.status(500).json({ error: 'Error al consultar historial contable' })
  }
})

// ─── LIQUIDACIÓN DE CASINO / CRUPIER CONTRA LA BANCA (DOBLE PARTIDA) ────────

/**
 * POST /api/ruleta/casino-liquidar
 * Liquida apuestas de Ruleta de Casino o Duelo 21 Crupier directamente contra la Banca
 */
router.post('/casino-liquidar', requireAuth, async (req, res) => {
  try {
    if (INTERRUPTOR_EMERGENCIA.apuestasPausadas) {
      return res.status(503).json({ error: 'Apuestas de casino en pausa preventiva por administración.' })
    }

    const { apuesta, premio, juego, detalles, idempotency_key } = req.body
    const userId = req.userId

    const idempKey = idempotency_key || `casino_${juego}_${userId}_${Date.now()}`
    const resultado = await LedgerService.liquidarCasino({
      userId,
      apuesta: Number(apuesta) || 0,
      premio: Number(premio) || 0,
      juego: juego || 'casino',
      detalles: detalles || {},
      idempotencyKey: idempKey
    })

    return res.json(resultado)
  } catch (err) {
    console.error('Error en /casino-liquidar:', err)
    return res.status(400).json({ error: err.message || 'Error al liquidar apuesta de casino' })
  }
})

// ─── COMPRA EN TIENDA CONTRA LA BANCA ───────────────────────────────────────

/**
 * GET /api/ruleta/tienda-catalogo
 * Devuelve el catálogo completo con los precios oficiales vigentes en la base de datos
 */
router.get('/tienda-catalogo', async (_req, res) => {
  try {
    const supabase = getSupabaseAdmin()
    let catalogo = []

    try {
      const { data: dbItems, error } = await supabase
        .from('tienda_precios')
        .select('*')
        .eq('activo', true)
        .order('precio', { ascending: true })

      if (!error && dbItems && dbItems.length > 0) {
        catalogo = dbItems
      }
    } catch (_) {}

    if (catalogo.length === 0) {
      catalogo = CATALOGO_PRECIOS_BASE
    }

    return res.json({ success: true, catalogo })
  } catch (err) {
    return res.json({ success: true, catalogo: CATALOGO_PRECIOS_BASE })
  }
})

/**
 * POST /api/ruleta/tienda-comprar
 * Compra de artículos o cosméticos debitando del alumno y acreditando a la Banca.
 * El precio es calculado y verificado estrictamente en servidor.
 */
router.post('/tienda-comprar', requireAuth, async (req, res) => {
  try {
    const { itemId, idempotency_key } = req.body
    const userId = req.userId

    if (!itemId) {
      return res.status(400).json({ error: 'itemId es requerido para realizar la compra' })
    }

    const idempKey = idempotency_key || `tienda_${userId}_${itemId}_${Date.now()}`
    const resultado = await LedgerService.comprarTienda({
      userId,
      itemId,
      idempotencyKey: idempKey
    })

    return res.json(resultado)
  } catch (err) {
    console.error('Error en /tienda-comprar:', err)
    return res.status(400).json({ error: err.message || 'Error al procesar compra en tienda' })
  }
})

/**
 * POST /api/ruleta/verificar-bienvenida
 * Comprueba si el usuario tiene pendiente el bono de bienvenida de 10 SE tras el reinicio
 */
router.post('/verificar-bienvenida', requireAuth, async (req, res) => {
  try {
    const userId = req.userId
    const bonoResultado = await LedgerService.asegurarBonoBienvenida({ userId })
    return res.json({
      success: true,
      bonoOtorgado: Boolean(bonoResultado),
      bono: bonoResultado?.bono || 0,
      nuevoSaldo: bonoResultado?.nuevoSaldo || req.user?.puntos_total || 0,
      mensajeReinicio: 'Hemos reiniciado la economía de StevenEuros. Tus artículos se mantienen.'
    })
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
})

// ─── BONO DIARIO DE LOGIN (EMITIDO POR LA BANCA) ────────────────────────────

/**
 * POST /api/ruleta/bono-diario
 * Reclama el micro-bono diario con racha desde la Banca
 */
router.post('/bono-diario', requireAuth, async (req, res) => {
  try {
    if (INTERRUPTOR_EMERGENCIA.grifosPausados) {
      return res.status(503).json({ error: 'Grifos de monedas temporalmente pausados por administración.' })
    }

    const userId = req.userId
    const racha = req.user?.racha_actual || 1
    const fechaMadrid = getMadridFecha()
    const idempKey = req.body?.idempotency_key || `bono_diario_${userId}_${fechaMadrid}`

    const resultado = await LedgerService.reclamarBonoDiario({
      userId,
      racha,
      idempotencyKey: idempKey
    })

    return res.json(resultado)
  } catch (err) {
    console.error('Error en /bono-diario:', err)
    return res.status(400).json({ error: err.message || 'Error al reclamar bono diario' })
  }
})

// ─── RECOMPENSA POR POST/FEED (EMITIDO POR LA BANCA) ────────────────────────

/**
 * POST /api/ruleta/feed-recompensa
 * Recompensa micro-aportes en el aula desde la Banca
 */
router.post('/feed-recompensa', requireAuth, async (req, res) => {
  try {
    if (INTERRUPTOR_EMERGENCIA.grifosPausados) {
      return res.status(503).json({ error: 'Grifos de monedas temporalmente pausados.' })
    }

    const { puntos, motivo, idempotency_key } = req.body
    const userId = req.userId

    const idempKey = idempotency_key || `feed_${userId}_${Date.now()}`
    const resultado = await LedgerService.recompensarFeed({
      userId,
      puntos: Number(puntos),
      motivo: motivo || 'Aporte en el aula',
      idempotencyKey: idempKey
    })

    return res.json(resultado)
  } catch (err) {
    console.error('Error en /feed-recompensa:', err)
    return res.status(400).json({ error: err.message || 'Error al procesar recompensa' })
  }
})

// ─── APUESTAS PvP EN CUSTODIA DE LA BANCA ───────────────────────────────────

/**
 * POST /api/ruleta/pvp-apostar
 * Retiene la apuesta de un jugador para un duelo PvP y la coloca en custodia de la Banca
 */
router.post('/pvp-apostar', requireAuth, async (req, res) => {
  try {
    if (INTERRUPTOR_EMERGENCIA.apuestasPausadas) {
      return res.status(503).json({ error: 'Apuestas temporalmente en pausa preventiva.' })
    }

    const { cantidad, partidaId, juego, idempotency_key } = req.body
    const userId = req.userId

    const idempKey = idempotency_key || `pvp_stake_${partidaId}_${userId}`
    const resultado = await LedgerService.apostarPvP({
      userId,
      cantidad: Number(cantidad),
      partidaId,
      juego: juego || 'pvp',
      idempotencyKey: idempKey
    })

    return res.json(resultado)
  } catch (err) {
    console.error('Error en /pvp-apostar:', err)
    return res.status(400).json({ error: err.message || 'Error al apostar en duelo' })
  }
})

/**
 * POST /api/ruleta/pvp-cancelar
 * Devuelve la apuesta retenida de un duelo PvP cancelado o empatado
 */
router.post('/pvp-cancelar', requireAuth, async (req, res) => {
  try {
    const { cantidad, partidaId, juego, idempotency_key } = req.body
    const userId = req.userId

    const idempKey = idempotency_key || `pvp_refund_${partidaId}_${userId}`
    const resultado = await LedgerService.cancelarPvP({
      userId,
      cantidad: Number(cantidad),
      partidaId,
      juego: juego || 'pvp',
      idempotencyKey: idempKey
    })

    return res.json(resultado)
  } catch (err) {
    console.error('Error en /pvp-cancelar:', err)
    return res.status(400).json({ error: err.message || 'Error al reembolsar apuesta' })
  }
})

export { router as ruletaRouter }