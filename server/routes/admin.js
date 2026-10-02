// server/routes/admin.js
import { Router } from 'express'
import { createClient } from '@supabase/supabase-js'
import { config } from '../config/env.js'
import { YOSHI_ROULETTE_CONFIG } from '../config/yoshiRouletteConfig.js'
import { LedgerService, getMadridFecha } from '../utils/ledgerService.js'
import { requireAdmin, requireAuth } from '../utils/authMiddleware.js'
import { INTERRUPTOR_EMERGENCIA, setInterruptorEmergencia } from './ruleta.js'
import { CATALOGO_PRECIOS_BASE, MAPA_PRECIOS_BASE, TIENDA_TRAMOS } from '../config/tiendaPreciosConfig.js'

export const adminRouter = Router()

function getSupabaseAdmin() {
  if (!config.supabaseUrl || !config.supabaseServiceKey) {
    throw new Error('SUPABASE_URL o SUPABASE_SERVICE_KEY no configuradas en el servidor')
  }
  return createClient(config.supabaseUrl.trim(), config.supabaseServiceKey.trim(), {
    auth: { autoRefreshToken: false, persistSession: false }
  })
}

// Memoria de control de límites diarios de ajustes por admin (Europe/Madrid)
const adminDailyAdjustments = new Map() // `${fecha}_total` -> cantidad acumulada
const adminUserDailyAdjustments = new Map() // `${fecha}_${userId}` -> cantidad acumulada

// ─── 1. SALUD DE LA ECONOMÍA Y AUDITORÍA CONTABLE ───────────────────────────

/**
 * GET /api/admin/salud-economia
 * Métricas de solvencia de la Banca, circulante, entradas/salidas y alerta de concentración
 */
adminRouter.get('/salud-economia', requireAdmin, async (_req, res) => {
  try {
    const supabase = getSupabaseAdmin()
    const bancaId = LedgerService.getBancaId()

    // 1. Obtener todos los perfiles (con fallback si monedas_ruleta_yoshi no migró aún)
    let profiles = null
    const { data: pFull, error: pErrFull } = await supabase
      .from('profiles')
      .select('id, nombre, username, rol, puntos_total, monedas_ruleta_yoshi, avatar_emoji')

    if (!pErrFull && pFull) {
      profiles = pFull
    } else {
      const { data: pBase, error: pErrBase } = await supabase
        .from('profiles')
        .select('id, nombre, username, rol, puntos_total, avatar_emoji')

      if (pErrBase) throw new Error(pErrBase.message)
      profiles = (pBase || []).map(p => ({ ...p, monedas_ruleta_yoshi: 0 }))
    }

    const userProfiles = (profiles || []).filter(p => p.id !== bancaId)
    const bancaProfile = (profiles || []).find(p => p.id === bancaId)

    const circulanteUsuarios = userProfiles.reduce((acc, p) => acc + (p.puntos_total || 0), 0)
    const saldoBanca = bancaProfile?.puntos_total ?? YOSHI_ROULETTE_CONFIG.BANCA.SALDO_INICIAL
    const suministroTotal = circulanteUsuarios + saldoBanca

    // 2. Mayores tenedores y detección de concentración excesiva
    const topTenedores = [...userProfiles]
      .sort((a, b) => (b.puntos_total || 0) - (a.puntos_total || 0))
      .slice(0, 10)
      .map(u => ({
        id: u.id,
        nombre: u.nombre,
        username: u.username,
        avatar_emoji: u.avatar_emoji,
        puntos_total: u.puntos_total || 0,
        porcentajeCirculante: circulanteUsuarios > 0
          ? Number(((u.puntos_total || 0) / circulanteUsuarios * 100).toFixed(1))
          : 0
      }))

    const alertasConcentracion = topTenedores
      .filter(t => t.porcentajeCirculante >= (YOSHI_ROULETTE_CONFIG.BANCA.UMBRAL_ALERTA_CONCENTRACION * 100))
      .map(t => `El alumno ${t.nombre} concentra el ${t.porcentajeCirculante}% de todo el circulante de StevenEuros.`)

    // 3. Flujos de entradas y salidas de los últimos 7 días
    let totalEntradas7d = 0
    let totalSalidas7d = 0
    try {
      const hace7d = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString()
      const { data: ledger7d } = await supabase
        .from('steven_ledger')
        .select('cantidad, tipo, user_id')
        .gte('created_at', hace7d)

      if (ledger7d) {
        for (const row of ledger7d) {
          if (row.user_id === bancaId) {
            // Perspectiva de la banca: cantidad negativa = emisión, cantidad positiva = recaudación
            if (row.cantidad < 0) totalSalidas7d += Math.abs(row.cantidad)
            else totalEntradas7d += row.cantidad
          }
        }
      }
    } catch (_) {}

    return res.json({
      success: true,
      timestamp: new Date().toISOString(),
      banca: {
        id: bancaId,
        saldo: saldoBanca,
        reservaMinima: YOSHI_ROULETTE_CONFIG.BANCA.RESERVA_MINIMA,
        enAusteridad: saldoBanca < YOSHI_ROULETTE_CONFIG.BANCA.RESERVA_MINIMA,
        emisionDiaria: YOSHI_ROULETTE_CONFIG.BANCA.EMISION_DIARIA
      },
      circulanteUsuarios,
      suministroTotal,
      invarianteSuministro: `${circulanteUsuarios} SE (alumnos) + ${saldoBanca} SE (banca) = ${suministroTotal} SE`,
      flujo7Dias: {
        recaudadoBanca: totalEntradas7d,
        emitidoPremiosBanca: totalSalidas7d,
        balanceNeto7d: totalEntradas7d - totalSalidas7d
      },
      topTenedores,
      alertasConcentracion,
      interruptorEmergencia: INTERRUPTOR_EMERGENCIA
    })
  } catch (err) {
    console.error('Error en /salud-economia:', err)
    return res.status(500).json({ error: err.message || 'Error al obtener salud de la economía' })
  }
})

/**
 * POST /api/admin/auditar-economia
 * Ejecuta la verificación exhaustiva de la invariante contable contra el ledger
 */
adminRouter.get('/auditar-economia', requireAdmin, async (_req, res) => {
  try {
    const auditoria = await LedgerService.auditarInvariante()
    return res.json({ success: true, auditoria })
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Error al auditar economía' })
  }
})

adminRouter.post('/auditar-economia', requireAdmin, async (_req, res) => {
  try {
    const auditoria = await LedgerService.auditarInvariante()
    return res.json({
      success: true,
      auditoria
    })
  } catch (err) {
    console.error('Error en /auditar-economia:', err)
    return res.status(500).json({ error: err.message || 'Error al auditar economía' })
  }
})

/**
 * POST /api/admin/interruptor-emergencia
 * Activa o desactiva la pausa preventiva de juegos y grifos
 */
adminRouter.post('/interruptor-emergencia', requireAdmin, (req, res) => {
  try {
    const { ruletaPausada, apuestasPausadas, grifosPausados, motivo } = req.body
    setInterruptorEmergencia({
      ruletaPausada: Boolean(ruletaPausada),
      apuestasPausadas: Boolean(apuestasPausadas),
      grifosPausados: Boolean(grifosPausados),
      motivo: motivo || 'Intervención de mantenimiento escolar'
    })

    return res.json({
      success: true,
      mensaje: 'Estado del interruptor de emergencia actualizado correctamente',
      estado: INTERRUPTOR_EMERGENCIA
    })
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
})

// ─── 2. AJUSTES CONTABLES DE ADMINISTRACIÓN (CONTRA LA BANCA) ───────────────

/**
 * POST /api/admin/ajustar-saldo
 * Ajusta el saldo de un usuario con doble partida obligatoria contra la Banca
 */
adminRouter.post('/ajustar-saldo', requireAdmin, async (req, res) => {
  try {
    const adminUser = req.user
    const adminId = adminUser.id
    const { targetUserId, cantidad, motivo, idempotency_key } = req.body

    if (!targetUserId) {
      return res.status(400).json({ error: 'targetUserId es obligatorio' })
    }
    if (adminId === targetUserId) {
      return res.status(400).json({ error: 'El administrador no puede ajustar su propio saldo.' })
    }
    if (!motivo || motivo.trim().length < 4) {
      return res.status(400).json({ error: 'El motivo es obligatorio (mínimo 4 caracteres explicativos).' })
    }

    const cant = Math.floor(Number(cantidad))
    if (!cant || isNaN(cant)) {
      return res.status(400).json({ error: 'La cantidad debe ser un número entero distinto de 0.' })
    }

    // 1. Validar límite por operación individual (máx 50 SE)
    if (Math.abs(cant) > YOSHI_ROULETTE_CONFIG.BANCA.MAX_AJUSTE_ADMIN_OPERACION) {
      return res.status(400).json({
        error: `Límite por operación excedido: máximo ${YOSHI_ROULETTE_CONFIG.BANCA.MAX_AJUSTE_ADMIN_OPERACION} SE.`
      })
    }

    // 2. Validar límites diarios del admin (Europe/Madrid)
    const fechaMadrid = getMadridFecha()
    const keyTotalDia = `${fechaMadrid}_total`
    const keyUserDia = `${fechaMadrid}_${targetUserId}`

    const acumuladoTotalDia = adminDailyAdjustments.get(keyTotalDia) || 0
    const acumuladoUserDia = adminUserDailyAdjustments.get(keyUserDia) || 0

    if (acumuladoTotalDia + Math.abs(cant) > YOSHI_ROULETTE_CONFIG.BANCA.MAX_AJUSTE_ADMIN_TOTAL_DIA) {
      return res.status(429).json({
        error: `Límite diario total de ajustes superado (${YOSHI_ROULETTE_CONFIG.BANCA.MAX_AJUSTE_ADMIN_TOTAL_DIA} SE/día).`
      })
    }

    if (acumuladoUserDia + Math.abs(cant) > YOSHI_ROULETTE_CONFIG.BANCA.MAX_AJUSTE_ADMIN_USUARIO_DIA) {
      return res.status(429).json({
        error: `Límite diario para este usuario superado (${YOSHI_ROULETTE_CONFIG.BANCA.MAX_AJUSTE_ADMIN_USUARIO_DIA} SE/usuario/día).`
      })
    }

    // 3. Ejecutar transferencia mediante LedgerService
    const idempKey = idempotency_key || `admin_adj_${adminId}_${targetUserId}_${Date.now()}`
    const resultado = await LedgerService.ajustarSaldoAdmin({
      adminId,
      targetUserId,
      cantidad: cant,
      motivo: motivo.trim(),
      idempotencyKey: idempKey
    })

    // Actualizar contadores diarios de admin
    adminDailyAdjustments.set(keyTotalDia, acumuladoTotalDia + Math.abs(cant))
    adminUserDailyAdjustments.set(keyUserDia, acumuladoUserDia + Math.abs(cant))

    return res.json({
      success: true,
      mensaje: `Ajuste contable aplicado con éxito: ${cant > 0 ? '+' : ''}${cant} SE`,
      resultado
    })
  } catch (err) {
    console.error('Error en /ajustar-saldo:', err)
    return res.status(400).json({ error: err.message || 'Error al aplicar ajuste' })
  }
})

/**
 * POST /api/admin/revertir-ajuste
 * Aplica un movimiento inverso en el ledger contra la Banca (nunca borra filas)
 */
adminRouter.post('/revertir-ajuste', requireAdmin, async (req, res) => {
  try {
    const adminId = req.userId
    const { targetUserId, cantidadOriginal, motivoOriginal, idempotency_key } = req.body

    if (!targetUserId || !cantidadOriginal) {
      return res.status(400).json({ error: 'targetUserId y cantidadOriginal son requeridos' })
    }

    const cantidadInversa = -Number(cantidadOriginal)
    const motivoReversion = `[REVERSIÓN] Deshacer ajuste previo: ${motivoOriginal || 'Ajuste revertido'}`

    const idempKey = idempotency_key || `revert_${adminId}_${targetUserId}_${Date.now()}`
    const resultado = await LedgerService.ajustarSaldoAdmin({
      adminId,
      targetUserId,
      cantidad: cantidadInversa,
      motivo: motivoReversion,
      idempotencyKey: idempKey
    })

    return res.json({
      success: true,
      mensaje: 'Movimiento revertido correctamente en el ledger con contrapartida bancaria',
      resultado
    })
  } catch (err) {
    return res.status(400).json({ error: err.message || 'Error al revertir ajuste' })
  }
})

/**
 * GET /api/admin/usuario-historial?user_id=...
 * Endpoint exclusivo para administradores para auditar el historial de cualquier alumno
 */
adminRouter.get('/usuario-historial', requireAdmin, async (req, res) => {
  try {
    const targetUserId = req.query.user_id
    if (!targetUserId) {
      return res.status(400).json({ error: 'user_id es requerido' })
    }

    const supabase = getSupabaseAdmin()
    const { data: historial, error } = await supabase
      .from('steven_ledger')
      .select('id, tipo, moneda, cantidad, saldo_anterior, saldo_posterior, actor_id, motivo, created_at')
      .eq('user_id', targetUserId)
      .order('created_at', { ascending: false })
      .limit(100)

    if (error) {
      return res.json({ success: true, historial: [] })
    }

    return res.json({
      success: true,
      user_id: targetUserId,
      historial: historial || []
    })
  } catch (err) {
    return res.status(500).json({ error: 'Error al consultar historial de usuario' })
  }
})

// ─── 3. ENDPOINT CENTRALIZADO DE COMISIÓN PvP (5% RAKE A LA BANCA) ──────────

/**
 * POST /api/admin/comision-pvp
 * Procesa la victoria de un duelo PvP, retiene el 5% para la Banca y acredita el resto
 */
adminRouter.post('/comision-pvp', requireAuth, async (req, res) => {
  try {
    const { ganadorId, bote, juego, partidaId, idempotency_key } = req.body
    if (!ganadorId || !bote) {
      return res.status(400).json({ error: 'ganadorId y bote son obligatorios' })
    }

    const idempKey = idempotency_key || `pvp_${juego}_${partidaId}_${ganadorId}`
    const resultado = await LedgerService.cobrarComisionPvP({
      ganadorId,
      bote: Number(bote),
      juego: juego || 'pvp',
      partidaId: partidaId || 'sala',
      idempotencyKey: idempKey
    })

    return res.json(resultado)
  } catch (err) {
    console.error('Error en /comision-pvp:', err)
    return res.status(500).json({ error: err.message || 'Error al procesar comisión' })
  }
})

// ─── 4. ENDPOINTS EXISTENTES (MANTENIDOS PARA COMPATIBILIDAD) ────────────────

adminRouter.post('/modificar-puntaje', requireAdmin, async (req, res) => {
  try {
    const { userId, puntos_total, racha_actual, motivo } = req.body
    if (!userId) return res.status(400).json({ error: 'userId es obligatorio' })

    const supabaseAdmin = getSupabaseAdmin()
    const updateData = { updated_at: new Date().toISOString() }

    if (puntos_total !== undefined && puntos_total !== null) {
      updateData.puntos_total = Math.max(0, Math.round(Number(puntos_total) || 0))
    }
    if (racha_actual !== undefined && racha_actual !== null) {
      updateData.racha_actual = Math.max(0, Math.round(Number(racha_actual) || 0))
    }

    const { data, error } = await supabaseAdmin.from('profiles').update(updateData).eq('id', userId).select()
    if (error) return res.status(500).json({ error: error.message })

    return res.json({
      success: true,
      mensaje: `StevenEuros actualizados correctamente para ${data?.[0]?.nombre || userId}`,
      perfil: data?.[0]
    })
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
})

adminRouter.post('/eliminar-usuario', requireAdmin, async (req, res) => {
  try {
    const { userId } = req.body
    if (!userId) return res.status(400).json({ error: 'userId es obligatorio' })
    const supabaseAdmin = getSupabaseAdmin()

    const tablasDependientes = [
      { tabla: 'message_likes', col: 'user_id' },
      { tabla: 'messages', col: 'user_id' },
      { tabla: 'checkins', col: 'user_id' },
      { tabla: 'pvp_partidas', col: 'creador_id' },
      { tabla: 'pvp_partidas', col: 'oponente_id' },
      { tabla: 'pvp_blackjack', col: 'creador_id' },
      { tabla: 'pvp_blackjack', col: 'oponente_id' },
      { tabla: 'reto_completado', col: 'user_id' },
      { tabla: 'achievements', col: 'user_id' },
      { tabla: 'login_records', col: 'user_id' },
      { tabla: 'arcade_scores', col: 'user_id' },
      { tabla: 'juegos_puntuaciones', col: 'user_id' },
      { tabla: 'apuntes', col: 'user_id' },
      { tabla: 'steven_ledger', col: 'user_id' },
      { tabla: 'yoshi_sesiones', col: 'user_id' }
    ]

    for (const dep of tablasDependientes) {
      try { await supabaseAdmin.from(dep.tabla).delete().eq(dep.col, userId) } catch (_) {}
    }

    const { error: errorProfile } = await supabaseAdmin.from('profiles').delete().eq('id', userId)
    if (errorProfile) return res.status(500).json({ error: errorProfile.message })

    try {
      if (supabaseAdmin.auth && supabaseAdmin.auth.admin) {
        await supabaseAdmin.auth.admin.deleteUser(userId)
      }
    } catch (_) {}

    return res.json({ success: true, mensaje: `Usuario ${userId} eliminado permanentemente.` })
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
})

adminRouter.get('/config-recompensas', async (_req, res) => {
  try {
    const supabaseAdmin = getSupabaseAdmin()
    const { data } = await supabaseAdmin.from('config_clase').select('valor').eq('clave', 'recompensas_economia').maybeSingle()
    return res.json({
      success: true,
      config: data?.valor || { puntosCheckin: 10, puntosReto: 25, multiplicadorGlobal: 1.0, bonoRacha: 10 }
    })
  } catch (_) {
    return res.json({
      success: true,
      config: { puntosCheckin: 10, puntosReto: 25, multiplicadorGlobal: 1.0, bonoRacha: 10 }
    })
  }
})

adminRouter.post('/config-recompensas', requireAdmin, async (req, res) => {
  try {
    const { config: nuevaConfig } = req.body
    if (!nuevaConfig) return res.status(400).json({ error: 'config es requerida' })

    const supabaseAdmin = getSupabaseAdmin()
    const { data, error } = await supabaseAdmin.from('config_clase').upsert({
      clave: 'recompensas_economia',
      valor: nuevaConfig,
      updated_at: new Date().toISOString()
    }, { onConflict: 'clave' }).select().single()

    if (error) return res.status(500).json({ error: error.message })
    return res.json({ success: true, mensaje: 'Configuración actualizada', config: data.valor })
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
})

// ─── 4. GESTIÓN Y AUDITORÍA DE PRECIOS DE TIENDA ─────────────────────────────

/**
 * GET /api/admin/tienda-analisis-precios
 * Devuelve el análisis de días necesarios para comprar cada artículo según perfil e historial
 */
adminRouter.get('/tienda-analisis-precios', requireAdmin, async (_req, res) => {
  try {
    const supabase = getSupabaseAdmin()
    let items = []

    try {
      const { data: dbItems, error } = await supabase
        .from('tienda_precios')
        .select('*')
        .order('precio', { ascending: true })
      if (!error && dbItems && dbItems.length > 0) items = dbItems
    } catch (_) {}

    if (items.length === 0) items = CATALOGO_PRECIOS_BASE

    const perfiles = {
      casual: { nombre: 'Casual (2 partidas/d)', sinApuestas: 2.75, conApuestas: 2.15 },
      normal: { nombre: 'Normal (6 partidas/d)', sinApuestas: 8.40, conApuestas: 6.80 },
      activo: { nombre: 'Muy Activo (20 partidas/d)', sinApuestas: 19.79, conApuestas: 16.50 }
    }

    const analisis = items.map(item => {
      const precio = Number(item.precio)
      return {
        id: item.id,
        titulo: item.titulo,
        categoria: item.categoria,
        tramo: item.tramo,
        precio,
        stock_max: item.stock_max,
        activo: item.activo,
        dias: {
          casual: {
            sinApuestas: Number((precio / perfiles.casual.sinApuestas).toFixed(1)),
            conApuestas: Number((precio / perfiles.casual.conApuestas).toFixed(1))
          },
          normal: {
            sinApuestas: Number((precio / perfiles.normal.sinApuestas).toFixed(1)),
            conApuestas: Number((precio / perfiles.normal.conApuestas).toFixed(1))
          },
          activo: {
            sinApuestas: Number((precio / perfiles.activo.sinApuestas).toFixed(1)),
            conApuestas: Number((precio / perfiles.activo.conApuestas).toFixed(1))
          }
        }
      }
    })

    let historial = []
    try {
      const { data: hData } = await supabase
        .from('tienda_precios_historial')
        .select('id, item_id, precio_anterior, precio_nuevo, motivo, actor_id, created_at')
        .order('created_at', { ascending: false })
        .limit(25)
      if (hData) historial = hData
    } catch (_) {}

    return res.json({
      success: true,
      perfiles,
      analisis,
      historial,
      tramos: TIENDA_TRAMOS
    })
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
})

/**
 * POST /api/admin/tienda-editar-precio
 * Modifica el precio oficial de un artículo en tienda_precios y asienta en el historial
 */
adminRouter.post('/tienda-editar-precio', requireAdmin, async (req, res) => {
  try {
    const { itemId, nuevoPrecio, motivo } = req.body
    const adminUser = req.user
    const precio = Math.round(Number(nuevoPrecio))

    if (!itemId || isNaN(precio) || precio <= 0) {
      return res.status(400).json({ error: 'Parámetros inválidos. El precio debe ser un número entero positivo.' })
    }

    const motivoTexto = (motivo || 'Ajuste de equilibrio de aula').trim()
    const supabase = getSupabaseAdmin()

    // 1. Obtener precio actual
    let precioAnterior = 30
    try {
      const { data: curr } = await supabase.from('tienda_precios').select('precio').eq('id', itemId).maybeSingle()
      if (curr?.precio) precioAnterior = curr.precio
    } catch (_) {
      const fallback = MAPA_PRECIOS_BASE.get(itemId)
      if (fallback?.precio) precioAnterior = fallback.precio
    }

    // 2. Actualizar tienda_precios
    try {
      await supabase.from('tienda_precios').upsert({
        id: itemId,
        precio,
        updated_at: new Date().toISOString()
      }, { onConflict: 'id' })
    } catch (_) {}

    // 3. Registrar en tienda_precios_historial
    try {
      await supabase.from('tienda_precios_historial').insert({
        item_id: itemId,
        precio_anterior: precioAnterior,
        precio_nuevo: precio,
        motivo: motivoTexto,
        actor_id: adminUser?.id
      })
    } catch (_) {}

    // 4. Actualizar mapa local en memoria
    const itemMem = MAPA_PRECIOS_BASE.get(itemId)
    if (itemMem) itemMem.precio = precio

    return res.json({
      success: true,
      itemId,
      precioAnterior,
      precioNuevo: precio,
      motivo: motivoTexto,
      mensaje: `Precio de '${itemId}' actualizado a ${precio} SE.`
    })
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
})

