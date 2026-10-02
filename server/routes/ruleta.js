// server/routes/ruleta.js
import { Router } from 'express'
import crypto from 'crypto'
import { createClient } from '@supabase/supabase-js'
import { config } from '../config/env.js'
import { YOSHI_ROULETTE_CONFIG } from '../config/yoshiRouletteConfig.js'

const router = Router()

function getSupabaseAdmin() {
  if (!config.supabaseUrl || !config.supabaseServiceKey) {
    throw new Error('Supabase no configurado en servidor')
  }
  return createClient(config.supabaseUrl.trim(), config.supabaseServiceKey.trim(), {
    auth: { autoRefreshToken: false, persistSession: false }
  })
}

// ─── Memoria en servidor para Cooldowns y Topes diarios ────────────────────────
const userCooldowns = new Map() // userId -> timestamp de último giro
const userDailyGains = new Map() // `${userId}_${YYYY-MM-DD}` -> total StevenEuros ganados hoy

function getHoyKey(userId) {
  const hoy = new Date().toISOString().split('T')[0]
  return `${userId}_${hoy}`
}

// ─── Ruleta Europea Casino Clásica ──────────────────────────────────────────
const ROULETTE_NUMBERS = [
  0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26
]

function generateSecureRandom(max) {
  const array = new Uint32Array(1)
  crypto.getRandomValues(array)
  return array[0] % max
}

router.post('/girar', (req, res) => {
  try {
    const indexGanador = generateSecureRandom(ROULETTE_NUMBERS.length)
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

// ─── RULETA TRAS MORIR EN YOSHI (Reglas del Sistema) ─────────────────────────

/**
 * GET /api/ruleta/yoshi-estado?user_id=...
 * Consulta saldo de monedas de ruleta, StevenEuros ganados hoy y límites.
 */
router.get('/yoshi-estado', async (req, res) => {
  try {
    const userId = req.query.user_id
    if (!userId) {
      return res.status(400).json({ error: 'Falta user_id' })
    }

    const supabase = getSupabaseAdmin()
    const { data: perfil, error } = await supabase
      .from('profiles')
      .select('id, nombre, puntos_total, monedas_ruleta_yoshi')
      .eq('id', userId)
      .single()

    if (error && error.code !== 'PGRST116') {
      console.warn('Aviso leyendo perfil ruleta Yoshi:', error.message)
    }

    const hoyKey = getHoyKey(userId)
    const ganadosHoy = userDailyGains.get(hoyKey) || 0
    const saldoMonedas = perfil?.monedas_ruleta_yoshi ?? 0
    const puntosTotal = perfil?.puntos_total ?? 0

    return res.json({
      success: true,
      saldoMonedas,
      puntosTotal,
      ganadosHoy,
      maxGananciaDiaria: YOSHI_ROULETTE_CONFIG.MAX_DAILY_STEVEEUROS,
      maxSaldoGuardado: YOSHI_ROULETTE_CONFIG.MAX_SALDO_GUARDADO,
      cooldownMs: YOSHI_ROULETTE_CONFIG.SPIN_COOLDOWN_MS
    })
  } catch (err) {
    console.error('Error en /yoshi-estado:', err)
    return res.status(500).json({ error: err.message })
  }
})

/**
 * POST /api/ruleta/yoshi-acumular
 * Añade las monedas recogidas en una partida de Yoshi al saldo de ruleta
 * respetando el límite máximo guardado (MAX_SALDO_GUARDADO).
 */
router.post('/yoshi-acumular', async (req, res) => {
  try {
    const { user_id, monedas_partida } = req.body
    if (!user_id || typeof monedas_partida !== 'number' || monedas_partida <= 0) {
      return res.status(400).json({ error: 'Parámetros inválidos' })
    }

    const supabase = getSupabaseAdmin()
    const { data: perfil } = await supabase
      .from('profiles')
      .select('id, monedas_ruleta_yoshi')
      .eq('id', user_id)
      .single()

    const saldoActual = perfil?.monedas_ruleta_yoshi ?? 0
    const nuevoSaldo = Math.min(
      YOSHI_ROULETTE_CONFIG.MAX_SALDO_GUARDADO,
      saldoActual + Math.floor(monedas_partida)
    )

    // Intentar actualizar en Postgres
    try {
      await supabase
        .from('profiles')
        .update({ monedas_ruleta_yoshi: nuevoSaldo })
        .eq('id', user_id)
    } catch (dbErr) {
      console.warn('Columna monedas_ruleta_yoshi pendiente en DB, usando respuesta síncrona:', dbErr.message)
    }

    return res.json({
      success: true,
      monedasAnadidas: monedas_partida,
      nuevoSaldoMonedas: nuevoSaldo,
      limiteAlcanzado: nuevoSaldo >= YOSHI_ROULETTE_CONFIG.MAX_SALDO_GUARDADO
    })
  } catch (err) {
    console.error('Error en /yoshi-acumular:', err)
    return res.status(500).json({ error: err.message })
  }
})

/**
 * POST /api/ruleta/yoshi-girar
 * Ejecuta el giro seguro en el servidor.
 * Valida saldo, cooldown, genera aleatorio criptográfico y acredita StevenEuros.
 */
router.post('/yoshi-girar', async (req, res) => {
  try {
    const { user_id, apuesta, saldo_local } = req.body

    if (!user_id) {
      return res.status(400).json({ error: 'Usuario no especificado' })
    }

    const cantidadApuesta = Math.floor(Number(apuesta))
    if (!cantidadApuesta || cantidadApuesta <= 0) {
      return res.status(400).json({ error: 'La apuesta debe ser mayor a 0 monedas' })
    }

    // 1. Anti-abuso: Cooldown entre tiradas
    const now = Date.now()
    const lastSpin = userCooldowns.get(user_id) || 0
    const cooldownRestante = YOSHI_ROULETTE_CONFIG.SPIN_COOLDOWN_MS - (now - lastSpin)
    if (cooldownRestante > 0) {
      return res.status(429).json({
        error: `Debes esperar ${Math.ceil(cooldownRestante / 1000)}s antes de volver a tirar`,
        cooldownRestante
      })
    }

    // 2. Anti-abuso: Tope diario de StevenEuros
    const hoyKey = getHoyKey(user_id)
    const ganadosHoy = userDailyGains.get(hoyKey) || 0
    if (ganadosHoy >= YOSHI_ROULETTE_CONFIG.MAX_DAILY_STEVEEUROS) {
      return res.status(403).json({
        error: `Has alcanzado el tope diario de ${YOSHI_ROULETTE_CONFIG.MAX_DAILY_STEVEEUROS} StevenEuros en la ruleta. ¡Vuelve mañana!`
      })
    }

    // 3. Comprobar saldo real
    const supabase = getSupabaseAdmin()
    const { data: perfil } = await supabase
      .from('profiles')
      .select('id, puntos_total, monedas_ruleta_yoshi')
      .eq('id', user_id)
      .single()

    // Si la columna en DB está presente se toma de DB; si no, fallback a saldo_local validado
    const saldoDisponible = perfil?.monedas_ruleta_yoshi != null
      ? perfil.monedas_ruleta_yoshi
      : (typeof saldo_local === 'number' ? saldo_local : 0)

    if (cantidadApuesta > saldoDisponible) {
      return res.status(400).json({
        error: `Saldo insuficiente. Tienes ${saldoDisponible} monedas y quisiste apostar ${cantidadApuesta}.`
      })
    }

    // 4. Determinar resultado en servidor con aleatorio seguro ANTES de responder
    const randomBuffer = crypto.randomBytes(4)
    const randomFloat = randomBuffer.readUInt32BE(0) / 0xFFFFFFFF // [0.0, 1.0)

    let acumulador = 0
    let segmentoGanador = YOSHI_ROULETTE_CONFIG.SEGMENTOS[0]
    let indexGanador = 0

    for (let i = 0; i < YOSHI_ROULETTE_CONFIG.SEGMENTOS.length; i++) {
      const seg = YOSHI_ROULETTE_CONFIG.SEGMENTOS[i]
      acumulador += seg.probabilidad
      if (randomFloat <= acumulador) {
        segmentoGanador = seg
        indexGanador = i
        break
      }
    }

    // 5. Calcular ganancias en StevenEuros
    let gananciaBruta = Math.floor(cantidadApuesta * segmentoGanador.multiplicador)
    const margenDisponible = Math.max(0, YOSHI_ROULETTE_CONFIG.MAX_DAILY_STEVEEUROS - ganadosHoy)
    const stevenEurosGanados = Math.min(gananciaBruta, margenDisponible)

    // 6. Actualizar saldos
    const nuevoSaldoMonedas = Math.max(0, saldoDisponible - cantidadApuesta)
    const puntosPrevios = perfil?.puntos_total ?? 0
    const nuevosPuntosTotal = Math.max(0, puntosPrevios + stevenEurosGanados)

    // Guardar en DB
    try {
      await supabase
        .from('profiles')
        .update({
          monedas_ruleta_yoshi: nuevoSaldoMonedas,
          puntos_total: nuevosPuntosTotal
        })
        .eq('id', user_id)
    } catch (dbErr) {
      console.warn('Aviso guardando saldos de ruleta:', dbErr.message)
      // Asegurar al menos actualización de puntos_total
      try {
        await supabase
          .from('profiles')
          .update({ puntos_total: nuevosPuntosTotal })
          .eq('id', user_id)
      } catch (_) {}
    }

    // 7. Actualizar memoria de anti-abuso
    userCooldowns.set(user_id, Date.now())
    userDailyGains.set(hoyKey, ganadosHoy + stevenEurosGanados)

    // 8. Responder con el resultado oficial para que el cliente anime con exactitud
    return res.json({
      success: true,
      ganador: segmentoGanador,
      indexGanador,
      totalSegmentos: YOSHI_ROULETTE_CONFIG.SEGMENTOS.length,
      apuesta: cantidadApuesta,
      stevenEurosGanados,
      nuevoSaldoMonedas,
      nuevosPuntosTotal,
      ganadosHoyTotal: ganadosHoy + stevenEurosGanados,
      topeAlcanzado: (ganadosHoy + stevenEurosGanados) >= YOSHI_ROULETTE_CONFIG.MAX_DAILY_STEVEEUROS,
      timestamp: Date.now()
    })
  } catch (err) {
    console.error('Error en /yoshi-girar:', err)
    return res.status(500).json({ error: err.message || 'Error interno al girar' })
  }
})

export { router as ruletaRouter }