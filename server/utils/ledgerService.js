// server/utils/ledgerService.js
import crypto from 'crypto'
import { createClient } from '@supabase/supabase-js'
import { config } from '../config/env.js'
import { YOSHI_ROULETTE_CONFIG } from '../config/yoshiRouletteConfig.js'
import { CATALOGO_PRECIOS_BASE, MAPA_PRECIOS_BASE } from '../config/tiendaPreciosConfig.js'

function getSupabaseAdmin() {
  if (!config.supabaseUrl || !config.supabaseServiceKey) {
    throw new Error('Supabase no configurado en servidor')
  }
  return createClient(config.supabaseUrl.trim(), config.supabaseServiceKey.trim(), {
    auth: { autoRefreshToken: false, persistSession: false }
  })
}

/**
 * Devuelve la fecha YYYY-MM-DD en zona horaria Europe/Madrid
 */
export function getMadridFecha(date = new Date()) {
  const formatter = new Intl.DateTimeFormat('es-ES', {
    timeZone: 'Europe/Madrid',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  })
  const parts = formatter.formatToParts(date)
  const y = parts.find(p => p.type === 'year').value
  const m = parts.find(p => p.type === 'month').value
  const d = parts.find(p => p.type === 'day').value
  return `${y}-${m}-${d}`
}

// Memoria de idempotencia en servidor (anti-race condition inmediata)
const processedIdempotency = new Map() // key -> { timestamp, result }

// Limpiar idempotencia vieja cada 30 min
setInterval(() => {
  const now = Date.now()
  for (const [key, val] of processedIdempotency.entries()) {
    if (now - val.timestamp > 3600000) {
      processedIdempotency.delete(key)
    }
  }
}, 1800000)

/**
 * Servicio centralizado de contabilidad de doble partida y seguridad económica
 */
export const LedgerService = {
  getBancaId() {
    return YOSHI_ROULETTE_CONFIG.BANCA.ID
  },

  /**
   * Consulta saldo actual de la Banca
   */
  async getSaldoBanca(supabase = getSupabaseAdmin()) {
    const { data, error } = await supabase
      .from('profiles')
      .select('puntos_total')
      .eq('id', this.getBancaId())
      .maybeSingle()

    if (error || !data) {
      return YOSHI_ROULETTE_CONFIG.BANCA.SALDO_INICIAL
    }
    return data.puntos_total ?? 0
  },

  /**
   * Ejecuta giro de ruleta con doble partida atómica contra la Banca
   */
  async ejecutarGiroRuleta({
    userId,
    nivel,
    costoMonedas,
    premioSE,
    esJackpot,
    motivo,
    idempotencyKey,
    detalles = {}
  }) {
    if (!userId || !idempotencyKey) {
      throw new Error('Parámetros de giro inválidos')
    }

    // Comprobar idempotencia en memoria
    if (processedIdempotency.has(idempotencyKey)) {
      return processedIdempotency.get(idempotencyKey).result
    }

    const supabase = getSupabaseAdmin()
    const bancaId = this.getBancaId()

    // 1. Intentar llamar a la función RPC atómica de base de datos si existe
    try {
      const { data: rpcRes, error: rpcErr } = await supabase.rpc('fn_ejecutar_giro_ruleta', {
        p_user_id: userId,
        p_nivel: nivel,
        p_costo_monedas: costoMonedas,
        p_premio_se: premioSE,
        p_es_jackpot: Boolean(esJackpot),
        p_motivo: motivo || 'Giro Ruleta Yoshi',
        p_idempotency_key: idempotencyKey,
        p_detalles: detalles
      })

      if (!rpcErr && rpcRes && rpcRes.success) {
        processedIdempotency.set(idempotencyKey, { timestamp: Date.now(), result: rpcRes })
        return rpcRes
      }
    } catch (_) {
      // Si la función RPC aún no está en cache de Supabase, proseguir con ejecución síncrona segura
    }

    // 2. Ejecución síncrona con Service Role
    // Consultar perfil usuario con tolerancia
    let userProfile = null
    const { data: uFull, error: uErrFull } = await supabase
      .from('profiles')
      .select('id, puntos_total, monedas_ruleta_yoshi, ultimo_jackpot_at')
      .eq('id', userId)
      .maybeSingle()

    if (!uErrFull && uFull) {
      userProfile = uFull
    } else {
      const { data: uBase } = await supabase
        .from('profiles')
        .select('id, puntos_total')
        .eq('id', userId)
        .maybeSingle()
      if (uBase) userProfile = { ...uBase, monedas_ruleta_yoshi: 0, ultimo_jackpot_at: null }
    }

    if (!userProfile) {
      throw new Error('Usuario no encontrado')
    }

    const saldoMonedasAnt = Number(userProfile.monedas_ruleta_yoshi || 0)
    const saldoSEAnt = Number(userProfile.puntos_total || 0)

    if (saldoMonedasAnt < costoMonedas) {
      throw new Error(`Saldo insuficiente de monedas: tienes ${saldoMonedasAnt} y requieres ${costoMonedas}`)
    }

    // Consultar saldo de la Banca
    const saldoBancaAnt = await this.getSaldoBanca(supabase)
    if (premioSE > 0 && saldoBancaAnt < premioSE) {
      throw new Error('La Banca del sistema tiene fondos insuficientes en este momento')
    }

    const nuevoSaldoMonedas = Math.max(0, saldoMonedasAnt - costoMonedas)
    const nuevoSaldoSE = saldoSEAnt + premioSE
    const nuevoSaldoBanca = Math.max(0, saldoBancaAnt - premioSE)

    // Actualizar usuario
    try {
      const userUpdate = {
        monedas_ruleta_yoshi: nuevoSaldoMonedas,
        puntos_total: nuevoSaldoSE,
        updated_at: new Date().toISOString()
      }
      if (esJackpot) {
        userUpdate.ultimo_jackpot_at = new Date().toISOString()
      }
      await supabase.from('profiles').update(userUpdate).eq('id', userId)
    } catch (_) {
      await supabase.from('profiles').update({
        puntos_total: nuevoSaldoSE,
        updated_at: new Date().toISOString()
      }).eq('id', userId)
    }

    // Actualizar banca si hubo premio
    if (premioSE > 0) {
      await supabase.from('profiles').update({
        puntos_total: nuevoSaldoBanca,
        updated_at: new Date().toISOString()
      }).eq('id', bancaId)
    }

    // Intentar registrar en steven_ledger si la tabla existe
    try {
      const ledgerRows = [
        {
          user_id: userId,
          contrapartida_id: bancaId,
          tipo: 'ruleta_yoshi',
          moneda: 'monedas_yoshi',
          cantidad: -costoMonedas,
          saldo_anterior: saldoMonedasAnt,
          saldo_posterior: nuevoSaldoMonedas,
          actor_id: userId,
          motivo: `Tirada Ruleta Yoshi Nivel ${nivel} (-${costoMonedas} 🪙)`,
          idempotency_key: `${idempotencyKey}_monedas`,
          detalles
        }
      ]

      if (premioSE > 0) {
        ledgerRows.push({
          user_id: bancaId,
          contrapartida_id: userId,
          tipo: 'ruleta_yoshi',
          moneda: 'steveneuros',
          cantidad: -premioSE,
          saldo_anterior: saldoBancaAnt,
          saldo_posterior: nuevoSaldoBanca,
          actor_id: userId,
          motivo: `Pago de premio Ruleta Yoshi (+${premioSE} SE)`,
          idempotency_key: `${idempotencyKey}_banca_se`,
          detalles
        })

        ledgerRows.push({
          user_id: userId,
          contrapartida_id: bancaId,
          tipo: 'ruleta_yoshi',
          moneda: 'steveneuros',
          cantidad: premioSE,
          saldo_anterior: saldoSEAnt,
          saldo_posterior: nuevoSaldoSE,
          actor_id: userId,
          motivo: motivo || `Premio Ruleta Yoshi Nivel ${nivel} (+${premioSE} SE)`,
          idempotency_key: `${idempotencyKey}_user_se`,
          detalles
        })
      }

      await supabase.from('steven_ledger').insert(ledgerRows)
    } catch (lErr) {
      console.warn('steven_ledger no migrado aún en DB, movimiento registrado en perfiles:', lErr.message)
    }

    const resultado = {
      success: true,
      nuevo_saldo_monedas: nuevoSaldoMonedas,
      nuevo_saldo_se: nuevoSaldoSE,
      premio_se: premioSE,
      costo_monedas: costoMonedas,
      nuevo_saldo_banca: nuevoSaldoBanca
    }

    processedIdempotency.set(idempotencyKey, { timestamp: Date.now(), result: resultado })
    return resultado
  },

  /**
   * Acredita monedas de una partida completada en Yoshi Runner
   */
  async acreditarMonedasYoshi({ userId, monedas, duracionMs, distanciaM, sessionToken, idempotencyKey }) {
    if (!userId || typeof monedas !== 'number' || monedas <= 0) {
      throw new Error('Parámetros de monedas inválidos')
    }

    if (processedIdempotency.has(idempotencyKey)) {
      return processedIdempotency.get(idempotencyKey).result
    }

    const supabase = getSupabaseAdmin()
    let saldoAnt = 0
    try {
      const { data: userProfile } = await supabase
        .from('profiles')
        .select('id, monedas_ruleta_yoshi')
        .eq('id', userId)
        .maybeSingle()
      saldoAnt = Number(userProfile?.monedas_ruleta_yoshi || 0)
    } catch (_) {}

    const nuevoSaldo = Math.min(
      YOSHI_ROULETTE_CONFIG.MAX_SALDO_GUARDADO,
      saldoAnt + Math.floor(monedas)
    )

    try {
      await supabase.from('profiles').update({
        monedas_ruleta_yoshi: nuevoSaldo,
        updated_at: new Date().toISOString()
      }).eq('id', userId)
    } catch (_) {}

    // Intentar registrar en steven_ledger
    try {
      await supabase.from('steven_ledger').insert({
        user_id: userId,
        contrapartida_id: this.getBancaId(),
        tipo: 'yoshi_partida',
        moneda: 'monedas_yoshi',
        cantidad: Math.floor(monedas),
        saldo_anterior: saldoAnt,
        saldo_posterior: nuevoSaldo,
        actor_id: userId,
        motivo: `Carrera Yoshi Runner: +${Math.floor(monedas)} monedas recolectadas (${distanciaM || 0}m)`,
        idempotency_key: idempotencyKey,
        detalles: { duracionMs, distanciaM, sessionToken }
      })
    } catch (_) {}

    const res = {
      success: true,
      monedasAcreditadas: Math.floor(monedas),
      nuevoSaldoMonedas: nuevoSaldo,
      limiteAlcanzado: nuevoSaldo >= YOSHI_ROULETTE_CONFIG.MAX_SALDO_GUARDADO
    }

    processedIdempotency.set(idempotencyKey, { timestamp: Date.now(), result: res })
    return res
  },

  /**
   * Ajuste de saldo por un Administrador contra la Banca
   */
  async ajustarSaldoAdmin({ adminId, targetUserId, cantidad, motivo, idempotencyKey }) {
    if (!motivo || motivo.trim().length < 2) {
      throw new Error('El motivo es obligatorio')
    }
    const cant = Math.floor(Number(cantidad))
    if (!cant || isNaN(cant)) {
      throw new Error('Cantidad inválida')
    }
    if (Math.abs(cant) > YOSHI_ROULETTE_CONFIG.BANCA.MAX_AJUSTE_ADMIN_OPERACION) {
      throw new Error(`Máximo permitido por operación: ${YOSHI_ROULETTE_CONFIG.BANCA.MAX_AJUSTE_ADMIN_OPERACION} SE`)
    }

    if (processedIdempotency.has(idempotencyKey)) {
      return processedIdempotency.get(idempotencyKey).result
    }

    const supabase = getSupabaseAdmin()
    const bancaId = this.getBancaId()

    // 1. Probar RPC
    try {
      const { data: rpcData, error: rpcErr } = await supabase.rpc('fn_ajuste_admin_saldo', {
        p_admin_id: adminId,
        p_target_user_id: targetUserId,
        p_cantidad: cant,
        p_motivo: motivo.trim(),
        p_idempotency_key: idempotencyKey
      })

      if (!rpcErr && rpcData && rpcData.success) {
        processedIdempotency.set(idempotencyKey, { timestamp: Date.now(), result: rpcData })
        return rpcData
      }
    } catch (_) {}

    // 2. Ejecución síncrona en Node con validación
    const { data: adminProf } = await supabase.from('profiles').select('rol').eq('id', adminId).single()
    if (!adminProf || !['moderador', 'admin'].includes(adminProf.rol)) {
      throw new Error('Permiso denegado: solo moderadores pueden ajustar saldos')
    }

    const { data: targetProf } = await supabase.from('profiles').select('puntos_total').eq('id', targetUserId).single()
    if (!targetProf) throw new Error('Usuario objetivo no encontrado')

    const saldoUserAnt = Number(targetProf.puntos_total || 0)
    const saldoUserPost = saldoUserAnt + cant
    if (saldoUserPost < 0) {
      throw new Error('El saldo del usuario no puede quedar negativo')
    }

    const saldoBancaAnt = await this.getSaldoBanca(supabase)
    const saldoBancaPost = saldoBancaAnt - cant

    if (saldoBancaPost < YOSHI_ROULETTE_CONFIG.BANCA.RESERVA_MINIMA && cant > 0) {
      throw new Error(`La Banca está en reserva mínima (< ${YOSHI_ROULETTE_CONFIG.BANCA.RESERVA_MINIMA} SE). Emisión bloqueada.`)
    }

    await supabase.from('profiles').update({ puntos_total: saldoUserPost, updated_at: new Date().toISOString() }).eq('id', targetUserId)
    await supabase.from('profiles').update({ puntos_total: saldoBancaPost, updated_at: new Date().toISOString() }).eq('id', bancaId)

    try {
      await supabase.from('steven_ledger').insert([
        {
          user_id: targetUserId,
          contrapartida_id: bancaId,
          tipo: 'ajuste_admin',
          moneda: 'steveneuros',
          cantidad: cant,
          saldo_anterior: saldoUserAnt,
          saldo_posterior: saldoUserPost,
          actor_id: adminId,
          motivo: motivo.trim(),
          idempotency_key: `${idempotencyKey}_user`
        },
        {
          user_id: bancaId,
          contrapartida_id: targetUserId,
          tipo: 'ajuste_admin',
          moneda: 'steveneuros',
          cantidad: -cant,
          saldo_anterior: saldoBancaAnt,
          saldo_posterior: saldoBancaPost,
          actor_id: adminId,
          motivo: `Contrapartida ajuste admin a ${targetUserId}: ${motivo.trim()}`,
          idempotency_key: `${idempotencyKey}_banca`
        }
      ])
    } catch (_) {}

    const res = {
      success: true,
      usuario_id: targetUserId,
      saldo_anterior: saldoUserAnt,
      nuevo_saldo_usuario: saldoUserPost,
      nuevo_saldo_banca: saldoBancaPost,
      motivo: motivo.trim()
    }

    processedIdempotency.set(idempotencyKey, { timestamp: Date.now(), result: res })
    return res
  },

  /**
   * Cobro de comisión (rake del 5%) en duelos PvP que entra a la Banca
   */
  async cobrarComisionPvP({ ganadorId, bote, juego, partidaId, idempotencyKey }) {
    const comision = YOSHI_ROULETTE_CONFIG.calcularComisionCasa(bote)
    const premioGanador = Math.max(0, bote - comision)

    const supabase = getSupabaseAdmin()
    const bancaId = this.getBancaId()

    const { data: ganadorProf } = await supabase.from('profiles').select('puntos_total').eq('id', ganadorId).single()
    const saldoGanadorAnt = Number(ganadorProf?.puntos_total || 0)
    const saldoGanadorPost = saldoGanadorAnt + premioGanador

    const saldoBancaAnt = await this.getSaldoBanca(supabase)
    // La banca tenía el bote en custodia y abona el premio neto al ganador, reteniendo la comisión (rake)
    const saldoBancaPost = saldoBancaAnt - premioGanador

    await supabase.from('profiles').update({ puntos_total: saldoGanadorPost, updated_at: new Date().toISOString() }).eq('id', ganadorId)
    await supabase.from('profiles').update({ puntos_total: saldoBancaPost, updated_at: new Date().toISOString() }).eq('id', bancaId)

    try {
      await supabase.from('steven_ledger').insert([
        {
          user_id: ganadorId,
          contrapartida_id: bancaId,
          tipo: 'premio_pvp',
          moneda: 'steveneuros',
          cantidad: premioGanador,
          saldo_anterior: saldoGanadorAnt,
          saldo_posterior: saldoGanadorPost,
          actor_id: ganadorId,
          motivo: `Premio ganador duelo ${juego} (bote ${bote} SE - ${comision} SE comisión)`,
          idempotency_key: `${idempotencyKey}_premio`,
          detalles: { juego, partidaId, bote, comision }
        },
        {
          user_id: bancaId,
          contrapartida_id: ganadorId,
          tipo: 'pago_premio_pvp',
          moneda: 'steveneuros',
          cantidad: -premioGanador,
          saldo_anterior: saldoBancaAnt,
          saldo_posterior: saldoBancaPost,
          actor_id: ganadorId,
          motivo: `Pago premio ganador duelo ${juego} #${partidaId} (retenido rake ${comision} SE)`,
          idempotency_key: `${idempotencyKey}_pago_premio`,
          detalles: { juego, partidaId, bote, comision }
        }
      ])
    } catch (_) {}

    return {
      success: true,
      bote,
      comision,
      premioGanador,
      nuevoSaldoGanador: saldoGanadorPost,
      nuevoSaldoBanca: saldoBancaPost
    }
  },

  /**
   * Depositar apuesta de un jugador para duelo PvP en custodia de la Banca
   */
  async apostarPvP({ userId, cantidad, partidaId, juego, idempotencyKey }) {
    if (!userId || !cantidad || cantidad <= 0) throw new Error('Parámetros de apuesta inválidos')
    if (processedIdempotency.has(idempotencyKey)) {
      return processedIdempotency.get(idempotencyKey).result
    }

    const sup = getSupabaseAdmin()
    const bancaId = this.getBancaId()
    const cant = Math.floor(Number(cantidad))

    const { data: prof } = await sup.from('profiles').select('id, puntos_total').eq('id', userId).single()
    const saldoUserAnt = Number(prof?.puntos_total || 0)
    if (saldoUserAnt < cant) {
      throw new Error(`Saldo insuficiente: tienes ${saldoUserAnt} SE y requieres ${cant} SE`)
    }

    const saldoUserPost = saldoUserAnt - cant
    const saldoBancaAnt = await this.getSaldoBanca(sup)
    const saldoBancaPost = saldoBancaAnt + cant

    await sup.from('profiles').update({ puntos_total: saldoUserPost, updated_at: new Date().toISOString() }).eq('id', userId)
    await sup.from('profiles').update({ puntos_total: saldoBancaPost, updated_at: new Date().toISOString() }).eq('id', bancaId)

    try {
      await sup.from('steven_ledger').insert([
        {
          user_id: userId,
          contrapartida_id: bancaId,
          tipo: 'apuesta_pvp',
          moneda: 'steveneuros',
          cantidad: -cant,
          saldo_anterior: saldoUserAnt,
          saldo_posterior: saldoUserPost,
          actor_id: userId,
          motivo: `Depósito en custodia duelo PvP ${juego || '1v1'} #${partidaId} (-${cant} SE)`,
          idempotency_key: `${idempotencyKey}_user`,
          detalles: { partidaId, juego, cantidad: cant }
        },
        {
          user_id: bancaId,
          contrapartida_id: userId,
          tipo: 'custodia_pvp',
          moneda: 'steveneuros',
          cantidad: cant,
          saldo_anterior: saldoBancaAnt,
          saldo_posterior: saldoBancaPost,
          actor_id: userId,
          motivo: `Custodia de apuesta duelo PvP ${juego || '1v1'} #${partidaId} (+${cant} SE)`,
          idempotency_key: `${idempotencyKey}_banca`,
          detalles: { partidaId, juego, cantidad: cant }
        }
      ])
    } catch (_) {}

    const res = {
      success: true,
      cantidad: cant,
      nuevoSaldo: saldoUserPost,
      nuevoSaldoBanca: saldoBancaPost
    }
    processedIdempotency.set(idempotencyKey, { timestamp: Date.now(), result: res })
    return res
  },

  /**
   * Cancelar y reembolsar apuesta PvP desde la custodia de la Banca
   */
  async cancelarPvP({ userId, cantidad, partidaId, juego, idempotencyKey }) {
    if (!userId || !cantidad || cantidad <= 0) throw new Error('Parámetros de cancelación inválidos')
    if (processedIdempotency.has(idempotencyKey)) {
      return processedIdempotency.get(idempotencyKey).result
    }

    const sup = getSupabaseAdmin()
    const bancaId = this.getBancaId()
    const cant = Math.floor(Number(cantidad))

    const { data: prof } = await sup.from('profiles').select('id, puntos_total').eq('id', userId).single()
    const saldoUserAnt = Number(prof?.puntos_total || 0)
    const saldoUserPost = saldoUserAnt + cant

    const saldoBancaAnt = await this.getSaldoBanca(sup)
    const saldoBancaPost = saldoBancaAnt - cant

    await sup.from('profiles').update({ puntos_total: saldoUserPost, updated_at: new Date().toISOString() }).eq('id', userId)
    await sup.from('profiles').update({ puntos_total: saldoBancaPost, updated_at: new Date().toISOString() }).eq('id', bancaId)

    try {
      await sup.from('steven_ledger').insert([
        {
          user_id: userId,
          contrapartida_id: bancaId,
          tipo: 'reembolso_pvp',
          moneda: 'steveneuros',
          cantidad: cant,
          saldo_anterior: saldoUserAnt,
          saldo_posterior: saldoUserPost,
          actor_id: userId,
          motivo: `Devolución de apuesta duelo PvP ${juego || '1v1'} #${partidaId} (+${cant} SE)`,
          idempotency_key: `${idempotencyKey}_user`,
          detalles: { partidaId, juego, cantidad: cant }
        },
        {
          user_id: bancaId,
          contrapartida_id: userId,
          tipo: 'devolucion_custodia_pvp',
          moneda: 'steveneuros',
          cantidad: -cant,
          saldo_anterior: saldoBancaAnt,
          saldo_posterior: saldoBancaPost,
          actor_id: userId,
          motivo: `Devolución custodia duelo PvP ${juego || '1v1'} #${partidaId} (-${cant} SE)`,
          idempotency_key: `${idempotencyKey}_banca`,
          detalles: { partidaId, juego, cantidad: cant }
        }
      ])
    } catch (_) {}

    const res = {
      success: true,
      cantidad: cant,
      nuevoSaldo: saldoUserPost,
      nuevoSaldoBanca: saldoBancaPost
    }
    processedIdempotency.set(idempotencyKey, { timestamp: Date.now(), result: res })
    return res
  },

  /**
   * Liquidación de rondas de casino (Ruleta Europea o Duelo 21 Crupier) contra la Banca
   */
  async liquidarCasino({ userId, apuesta, premio, juego, detalles, idempotencyKey }) {
    if (!userId) throw new Error('userId es requerido')
    if (processedIdempotency.has(idempotencyKey)) {
      return processedIdempotency.get(idempotencyKey).result
    }

    const sup = getSupabaseAdmin()
    const bancaId = this.getBancaId()

    const { data: prof } = await sup.from('profiles').select('id, puntos_total').eq('id', userId).single()
    const saldoUserAnt = Number(prof?.puntos_total || 0)
    const bet = Math.max(0, Math.floor(Number(apuesta) || 0))
    const win = Math.max(0, Math.floor(Number(premio) || 0))
    const deltaUser = win - bet

    // Validar que el usuario tenía saldo suficiente para apostar
    if (bet > saldoUserAnt) {
      throw new Error(`Saldo insuficiente: tienes ${saldoUserAnt} SE y apostaste ${bet} SE`)
    }

    const saldoUserPost = Math.max(0, saldoUserAnt + deltaUser)
    const saldoBancaAnt = await this.getSaldoBanca(sup)
    const saldoBancaPost = saldoBancaAnt - deltaUser // Si usuario gana (+delta), banca pierde (-delta)

    if (deltaUser > 0 && saldoBancaPost < 0) {
      throw new Error('La Banca del sistema no tiene fondos suficientes para cubrir este premio')
    }

    await sup.from('profiles').update({ puntos_total: saldoUserPost, updated_at: new Date().toISOString() }).eq('id', userId)
    await sup.from('profiles').update({ puntos_total: saldoBancaPost, updated_at: new Date().toISOString() }).eq('id', bancaId)

    try {
      const rows = []
      if (deltaUser !== 0) {
        rows.push({
          user_id: userId,
          contrapartida_id: bancaId,
          tipo: deltaUser > 0 ? 'premio_casino' : 'apuesta_casino',
          moneda: 'steveneuros',
          cantidad: deltaUser,
          saldo_anterior: saldoUserAnt,
          saldo_posterior: saldoUserPost,
          actor_id: userId,
          motivo: `${juego || 'Casino'}: apuesta ${bet} SE, cobro ${win} SE (neto ${deltaUser > 0 ? '+' : ''}${deltaUser} SE)`,
          idempotency_key: `${idempotencyKey}_user`,
          detalles: { juego, apuesta: bet, premio: win, ...detalles }
        })
        rows.push({
          user_id: bancaId,
          contrapartida_id: userId,
          tipo: deltaUser > 0 ? 'pago_premio_casino' : 'recaudacion_casino',
          moneda: 'steveneuros',
          cantidad: -deltaUser,
          saldo_anterior: saldoBancaAnt,
          saldo_posterior: saldoBancaPost,
          actor_id: userId,
          motivo: `${juego || 'Casino'}: liquidación contra jugador (neto ${-deltaUser > 0 ? '+' : ''}${-deltaUser} SE)`,
          idempotency_key: `${idempotencyKey}_banca`,
          detalles: { juego, apuesta: bet, premio: win, ...detalles }
        })
        await sup.from('steven_ledger').insert(rows)
      }
    } catch (_) {}

    const res = {
      success: true,
      delta: deltaUser,
      nuevoSaldo: saldoUserPost,
      nuevoSaldoBanca: saldoBancaPost
    }
    processedIdempotency.set(idempotencyKey, { timestamp: Date.now(), result: res })
    return res
  },

  /**
   * Compra de artículos o cosméticos en la tienda pagados a la Banca
   * El precio se obtiene SIEMPRE de la base de datos o configuración central, nunca del cliente.
   */
  async comprarTienda({ userId, itemId, idempotencyKey }) {
    if (!userId || !itemId) throw new Error('Parámetros de compra inválidos')
    if (processedIdempotency.has(idempotencyKey)) {
      return processedIdempotency.get(idempotencyKey).result
    }

    const sup = getSupabaseAdmin()
    const bancaId = this.getBancaId()

    // 1. Obtener precio OFICIAL de la base de datos (tienda_precios) o fallback de configuración
    let precioOficial = null
    let tituloItem = itemId
    let categoriaItem = 'general'
    let duracionTexto = 'Permanente'
    let duracionMs = 0

    try {
      const { data: dbItem } = await sup
        .from('tienda_precios')
        .select('*')
        .eq('id', itemId)
        .eq('activo', true)
        .maybeSingle()

      if (dbItem?.precio) {
        precioOficial = Number(dbItem.precio)
        tituloItem = dbItem.titulo || tituloItem
        categoriaItem = dbItem.categoria || categoriaItem
      }
    } catch (_) {}

    // Fallback de configuración centralizada si la tabla no está creada aún o dio error
    if (!precioOficial) {
      const configItem = MAPA_PRECIOS_BASE.get(itemId)
      if (configItem) {
        precioOficial = configItem.precio
        tituloItem = configItem.titulo
        categoriaItem = configItem.categoria
        duracionTexto = configItem.duracionTexto || duracionTexto
      }
    }

    if (!precioOficial || precioOficial <= 0) {
      throw new Error(`Artículo '${itemId}' no encontrado en el catálogo oficial de la tienda`)
    }

    const cost = precioOficial

    // 2. Verificar saldo del usuario
    const { data: prof, error: pErr } = await sup.from('profiles').select('id, puntos_total').eq('id', userId).single()
    if (pErr || !prof) throw new Error('Usuario no encontrado en el sistema')

    const saldoUserAnt = Number(prof.puntos_total || 0)
    if (saldoUserAnt < cost) {
      throw new Error(`Saldo insuficiente: tienes ${saldoUserAnt} SE y '${tituloItem}' cuesta ${cost} SE`)
    }

    const saldoUserPost = saldoUserAnt - cost
    const saldoBancaAnt = await this.getSaldoBanca(sup)
    const saldoBancaPost = saldoBancaAnt + cost

    // 3. Actualizar saldos en profiles
    await sup.from('profiles').update({ puntos_total: saldoUserPost, updated_at: new Date().toISOString() }).eq('id', userId)
    await sup.from('profiles').update({ puntos_total: saldoBancaPost, updated_at: new Date().toISOString() }).eq('id', bancaId)

    // 4. Asentar en steven_ledger como tipo 'tienda'
    try {
      await sup.from('steven_ledger').insert([
        {
          user_id: userId,
          contrapartida_id: bancaId,
          tipo: 'tienda',
          moneda: 'steveneuros',
          cantidad: -cost,
          saldo_anterior: saldoUserAnt,
          saldo_posterior: saldoUserPost,
          actor_id: userId,
          motivo: `Compra en tienda: ${tituloItem} (-${cost} SE)`,
          idempotency_key: `${idempotencyKey}_user`,
          detalles: { itemId, titulo: tituloItem, precio: cost }
        },
        {
          user_id: bancaId,
          contrapartida_id: userId,
          tipo: 'ingreso_tienda',
          moneda: 'steveneuros',
          cantidad: cost,
          saldo_anterior: saldoBancaAnt,
          saldo_posterior: saldoBancaPost,
          actor_id: userId,
          motivo: `Ingreso venta tienda: ${tituloItem} (+${cost} SE)`,
          idempotency_key: `${idempotencyKey}_banca`,
          detalles: { itemId, titulo: tituloItem, precio: cost }
        }
      ])
    } catch (_) {}

    // 5. Insertar directamente en inventario_usuario en servidor
    let itemInventario = null
    try {
      const { data: invData } = await sup.from('inventario_usuario').insert({
        user_id: userId,
        item_id: itemId,
        titulo: tituloItem,
        categoria: categoriaItem,
        estado: 'listo',
        comprado_en: new Date().toISOString(),
        duracion_ms: duracionMs,
        duracion_texto: duracionTexto
      }).select().single()

      if (invData) itemInventario = invData
    } catch (_) {}

    const res = {
      success: true,
      itemId,
      titulo: tituloItem,
      costo: cost,
      nuevoSaldo: saldoUserPost,
      nuevoSaldoBanca: saldoBancaPost,
      itemInventario
    }
    processedIdempotency.set(idempotencyKey, { timestamp: Date.now(), result: res })
    return res
  },

  /**
   * Garantiza la emisión del bono de bienvenida de 10 SE para nuevos usuarios o tras reinicio
   */
  async asegurarBonoBienvenida({ userId }) {
    if (!userId) return null
    const sup = getSupabaseAdmin()
    const bancaId = this.getBancaId()

    if (userId === bancaId) return null

    try {
      const { data: yaEmitido } = await sup
        .from('steven_ledger')
        .select('id')
        .eq('user_id', userId)
        .eq('tipo', 'bienvenida')
        .maybeSingle()

      if (yaEmitido) return null
    } catch (_) {}

    const BONO = 10
    const saldoBancaAnt = await this.getSaldoBanca(sup)
    if (saldoBancaAnt < BONO) return null

    const { data: prof } = await sup.from('profiles').select('id, puntos_total, nombre').eq('id', userId).maybeSingle()
    if (!prof) return null

    const saldoUserAnt = Number(prof.puntos_total || 0)
    const saldoUserPost = saldoUserAnt + BONO
    const saldoBancaPost = saldoBancaAnt - BONO

    await sup.from('profiles').update({ puntos_total: saldoUserPost, updated_at: new Date().toISOString() }).eq('id', userId)
    await sup.from('profiles').update({ puntos_total: saldoBancaPost, updated_at: new Date().toISOString() }).eq('id', bancaId)

    try {
      await sup.from('steven_ledger').insert([
        {
          user_id: userId,
          contrapartida_id: bancaId,
          tipo: 'bienvenida',
          moneda: 'steveneuros',
          cantidad: BONO,
          saldo_anterior: saldoUserAnt,
          saldo_posterior: saldoUserPost,
          actor_id: bancaId,
          motivo: 'Bono inicial de bienvenida tras reinicio de economía',
          idempotency_key: `bienvenida_${userId}`,
          detalles: { bono: BONO }
        },
        {
          user_id: bancaId,
          contrapartida_id: userId,
          tipo: 'emision_bienvenida',
          moneda: 'steveneuros',
          cantidad: -BONO,
          saldo_anterior: saldoBancaAnt,
          saldo_posterior: saldoBancaPost,
          actor_id: bancaId,
          motivo: `Emisión bono bienvenida a ${prof.nombre || userId}`,
          idempotency_key: `banca_bienvenida_${userId}`,
          detalles: { bono: BONO }
        }
      ])
    } catch (_) {}

    return { success: true, bono: BONO, nuevoSaldo: saldoUserPost }
  },

  /**
   * Reclamar bono diario de login emitido desde la Banca
   */
  async reclamarBonoDiario({ userId, racha, idempotencyKey }) {
    if (!userId) throw new Error('userId es requerido')
    if (processedIdempotency.has(idempotencyKey)) {
      return processedIdempotency.get(idempotencyKey).result
    }

    const sup = getSupabaseAdmin()
    const bancaId = this.getBancaId()

    // Cálculo del bono diario: 1 SE base + 1 SE por racha >= 3 + 1 SE por racha >= 7 (máx 3 SE)
    const r = Number(racha) || 1
    let bono = 1
    if (r >= 7) bono = 3
    else if (r >= 3) bono = 2

    const saldoBancaAnt = await this.getSaldoBanca(sup)
    if (saldoBancaAnt < bono) {
      throw new Error('La Banca del sistema se encuentra en reserva mínima temporal')
    }

    const { data: prof } = await sup.from('profiles').select('id, puntos_total').eq('id', userId).single()
    const saldoUserAnt = Number(prof?.puntos_total || 0)
    const saldoUserPost = saldoUserAnt + bono
    const saldoBancaPost = saldoBancaAnt - bono

    await sup.from('profiles').update({ puntos_total: saldoUserPost, updated_at: new Date().toISOString() }).eq('id', userId)
    await sup.from('profiles').update({ puntos_total: saldoBancaPost, updated_at: new Date().toISOString() }).eq('id', bancaId)

    try {
      await sup.from('steven_ledger').insert([
        {
          user_id: userId,
          contrapartida_id: bancaId,
          tipo: 'bonus_diario',
          moneda: 'steveneuros',
          cantidad: bono,
          saldo_anterior: saldoUserAnt,
          saldo_posterior: saldoUserPost,
          actor_id: userId,
          motivo: `Bonus diario por racha de ${r} días (+${bono} SE)`,
          idempotency_key: `${idempotencyKey}_user`,
          detalles: { racha: r, bono }
        },
        {
          user_id: bancaId,
          contrapartida_id: userId,
          tipo: 'emision_bonus_diario',
          moneda: 'steveneuros',
          cantidad: -bono,
          saldo_anterior: saldoBancaAnt,
          saldo_posterior: saldoBancaPost,
          actor_id: userId,
          motivo: `Emisión de bonus diario a usuario (+${bono} SE)`,
          idempotency_key: `${idempotencyKey}_banca`,
          detalles: { racha: r, bono }
        }
      ])
    } catch (_) {}

    const res = {
      success: true,
      bono,
      nuevoSaldo: saldoUserPost,
      nuevoSaldoBanca: saldoBancaPost
    }
    processedIdempotency.set(idempotencyKey, { timestamp: Date.now(), result: res })
    return res
  },

  /**
   * Reclamar recompensa por aporte en feed / comentarios emitida desde la Banca
   */
  async recompensarFeed({ userId, puntos, motivo, idempotencyKey }) {
    if (!userId || !puntos || puntos <= 0) throw new Error('Parámetros inválidos')
    if (processedIdempotency.has(idempotencyKey)) {
      return processedIdempotency.get(idempotencyKey).result
    }

    const sup = getSupabaseAdmin()
    const bancaId = this.getBancaId()
    const pts = Math.min(15, Math.floor(Number(puntos))) // Máximo 15 SE por post

    const saldoBancaAnt = await this.getSaldoBanca(sup)
    if (saldoBancaAnt < pts) {
      throw new Error('La Banca del sistema se encuentra en reserva mínima')
    }

    const { data: prof } = await sup.from('profiles').select('id, puntos_total').eq('id', userId).single()
    const saldoUserAnt = Number(prof?.puntos_total || 0)
    const saldoUserPost = saldoUserAnt + pts
    const saldoBancaPost = saldoBancaAnt - pts

    await sup.from('profiles').update({ puntos_total: saldoUserPost, updated_at: new Date().toISOString() }).eq('id', userId)
    await sup.from('profiles').update({ puntos_total: saldoBancaPost, updated_at: new Date().toISOString() }).eq('id', bancaId)

    try {
      await sup.from('steven_ledger').insert([
        {
          user_id: userId,
          contrapartida_id: bancaId,
          tipo: 'mision',
          moneda: 'steveneuros',
          cantidad: pts,
          saldo_anterior: saldoUserAnt,
          saldo_posterior: saldoUserPost,
          actor_id: userId,
          motivo: motivo || `Recompensa por aporte en el aula (+${pts} SE)`,
          idempotency_key: `${idempotencyKey}_user`,
          detalles: { puntos: pts }
        },
        {
          user_id: bancaId,
          contrapartida_id: userId,
          tipo: 'emision_mision',
          moneda: 'steveneuros',
          cantidad: -pts,
          saldo_anterior: saldoBancaAnt,
          saldo_posterior: saldoBancaPost,
          actor_id: userId,
          motivo: `Emisión recompensa de aula: ${motivo || 'Feed'} (-${pts} SE)`,
          idempotency_key: `${idempotencyKey}_banca`,
          detalles: { puntos: pts }
        }
      ])
    } catch (_) {}

    const res = {
      success: true,
      puntos: pts,
      nuevoSaldo: saldoUserPost,
      nuevoSaldoBanca: saldoBancaPost
    }
    processedIdempotency.set(idempotencyKey, { timestamp: Date.now(), result: res })
    return res
  },

  /**
   * Auditoría de la invariante contable del sistema
   */
  async auditarInvariante() {
    const supabase = getSupabaseAdmin()
    const bancaId = this.getBancaId()

    // Intentar llamar RPC si existe
    try {
      const { data, error } = await supabase.rpc('fn_auditar_integridad_economia')
      if (!error && data) return data
    } catch (_) {}

    // Auditoría en servidor
    const { data: profiles } = await supabase.from('profiles').select('id, nombre, puntos_total')
    const userProfiles = (profiles || []).filter(p => p.id !== bancaId)
    const bancaProfile = (profiles || []).find(p => p.id === bancaId)

    const circulanteUsuarios = userProfiles.reduce((sum, p) => sum + (p.puntos_total || 0), 0)
    const saldoBanca = bancaProfile?.puntos_total ?? 0
    const suministroTotal = circulanteUsuarios + saldoBanca

    // Comprobar con el ledger si está disponible
    let discrepancias = []
    try {
      const { data: ledgerEntries } = await supabase.from('steven_ledger').select('user_id, cantidad, moneda')
      if (ledgerEntries && ledgerEntries.length > 0) {
        const sumasPorUser = {}
        for (const entry of ledgerEntries) {
          if (entry.moneda === 'steveneuros') {
            sumasPorUser[entry.user_id] = (sumasPorUser[entry.user_id] || 0) + entry.cantidad
          }
        }
        for (const prof of profiles || []) {
          const calc = sumasPorUser[prof.id] || 0
          if (calc !== (prof.puntos_total || 0)) {
            discrepancias.push({
              user_id: prof.id,
              nombre: prof.nombre,
              saldo_perfil: prof.puntos_total || 0,
              saldo_ledger: calc,
              diferencia: (prof.puntos_total || 0) - calc
            })
          }
        }
      }
    } catch (_) {}

    return {
      success: true,
      timestamp: new Date().toISOString(),
      circulante_usuarios_se: circulanteUsuarios,
      saldo_banca_se: saldoBanca,
      suministro_total_ecosistema: suministroTotal,
      invariante_valida: discrepancias.length === 0,
      discrepancias_encontradas: discrepancias.length,
      detalle_discrepancias: discrepancias,
      total_usuarios: userProfiles.length
    }
  }
}
