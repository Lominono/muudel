// server/scripts/ejecutarReinicioEconomia.js
import { config } from '../config/env.js'
import { createClient } from '@supabase/supabase-js'
import { YOSHI_ROULETTE_CONFIG } from '../config/yoshiRouletteConfig.js'

async function ejecutarReinicio() {
  console.log('--- INICIANDO REINICIO GENERAL DE ECONOMÍA STEVENEUROS ---')

  const supabase = createClient(config.supabaseUrl, config.supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  })

  const bancaId = YOSHI_ROULETTE_CONFIG.BANCA.ID
  const BONO_BIENVENIDA_ACTIVO = true
  const BONO_CANTIDAD = 10
  const SALDO_INICIAL_BANCA_BRUTO = 2000

  // 1. Obtener todos los perfiles de usuarios
  const { data: profiles, error: pErr } = await supabase.from('profiles').select('*')
  if (pErr) throw new Error('Error al leer perfiles: ' + pErr.message)

  const userProfiles = (profiles || []).filter(p => p.id !== bancaId)
  console.log(`Detectados ${userProfiles.length} usuarios para el reinicio.`)

  let gastoTotalBono = 0

  for (const user of userProfiles) {
    const saldoAntSE = Number(user.puntos_total || 0)
    const monedasAnt = Number(user.monedas_ruleta_yoshi || 0)
    console.log(`Procesando usuario ${user.nombre} (${user.id}): saldo ${saldoAntSE} SE, ${monedasAnt} monedas Yoshi...`)

    // Registrar en steven_ledger si la tabla existe
    try {
      if (saldoAntSE > 0) {
        await supabase.from('steven_ledger').insert({
          user_id: user.id,
          contrapartida_id: bancaId,
          tipo: 'reset_economia',
          moneda: 'steveneuros',
          cantidad: -saldoAntSE,
          saldo_anterior: saldoAntSE,
          saldo_posterior: 0,
          actor_id: bancaId,
          motivo: 'reinicio de economía',
          idempotency_key: `reset_se_${user.id}_${Date.now()}`,
          detalles: { saldo_reseteado: saldoAntSE, nombre: user.nombre }
        })
      }

      if (monedasAnt > 0) {
        await supabase.from('steven_ledger').insert({
          user_id: user.id,
          contrapartida_id: bancaId,
          tipo: 'reset_economia',
          moneda: 'monedas_yoshi',
          cantidad: -monedasAnt,
          saldo_anterior: monedasAnt,
          saldo_posterior: 0,
          actor_id: bancaId,
          motivo: 'reinicio de economía',
          idempotency_key: `reset_yoshi_${user.id}_${Date.now()}`,
          detalles: { monedas_reseteadas: monedasAnt, nombre: user.nombre }
        })
      }
    } catch (e) {
      console.warn('  Nota ledger reset:', e.message)
    }

    // Nuevo saldo (0 SE base, o 10 SE si hay bono)
    const saldoFinal = BONO_BIENVENIDA_ACTIVO ? BONO_CANTIDAD : 0
    if (BONO_BIENVENIDA_ACTIVO) gastoTotalBono += BONO_CANTIDAD

    // Actualizar usuario en DB
    await supabase.from('profiles').update({
      puntos_total: saldoFinal,
      monedas_ruleta_yoshi: 0,
      updated_at: new Date().toISOString()
    }).eq('id', user.id)

    // Si hubo bono de bienvenida, registrar en ledger
    if (BONO_BIENVENIDA_ACTIVO) {
      try {
        await supabase.from('steven_ledger').insert({
          user_id: user.id,
          contrapartida_id: bancaId,
          tipo: 'bienvenida',
          moneda: 'steveneuros',
          cantidad: BONO_CANTIDAD,
          saldo_anterior: 0,
          saldo_posterior: saldoFinal,
          actor_id: bancaId,
          motivo: 'Bono de bienvenida tras reinicio de economía',
          idempotency_key: `bienvenida_${user.id}_${Date.now()}`,
          detalles: { bono: BONO_CANTIDAD }
        })
      } catch (_) {}
    }
  }

  // 2. Establecer el saldo de la Banca
  const saldoFinalBanca = SALDO_INICIAL_BANCA_BRUTO - gastoTotalBono
  console.log(`Actualizando Banca (${bancaId}): Inicial ${SALDO_INICIAL_BANCA_BRUTO} SE - Bonos ${gastoTotalBono} SE = ${saldoFinalBanca} SE...`)

  await supabase.from('profiles').update({
    puntos_total: saldoFinalBanca,
    monedas_ruleta_yoshi: 0,
    updated_at: new Date().toISOString()
  }).eq('id', bancaId)

  try {
    await supabase.from('steven_ledger').insert({
      user_id: bancaId,
      contrapartida_id: bancaId,
      tipo: 'emision_banca',
      moneda: 'steveneuros',
      cantidad: saldoFinalBanca,
      saldo_anterior: 0,
      saldo_posterior: saldoFinalBanca,
      actor_id: bancaId,
      motivo: 'Saldo inicial de la Banca tras reinicio general de economía',
      idempotency_key: `banca_reset_${Date.now()}`,
      detalles: { saldo_inicial_bruto: SALDO_INICIAL_BANCA_BRUTO, bonos_emitidos: gastoTotalBono }
    })
  } catch (_) {}

  // 3. Verificar que los artículos del inventario siguen ahí
  const { data: inv } = await supabase.from('inventario_usuario').select('id, user_id, titulo')
  console.log(`Artículos en inventario_usuario preservados: ${inv?.length || 0}`)

  console.log('✓ REINICIO GENERAL COMPLETADO EXITOSAMENTE.')
  console.log(`  - Saldo de cada alumno: ${BONO_BIENVENIDA_ACTIVO ? BONO_CANTIDAD : 0} SE`)
  console.log(`  - Monedas Yoshi de cada alumno: 0`)
  console.log(`  - Saldo Banca del sistema: ${saldoFinalBanca} SE`)
  console.log(`  - Invariante: Circulante (${userProfiles.length * (BONO_BIENVENIDA_ACTIVO ? BONO_CANTIDAD : 0)} SE) + Banca (${saldoFinalBanca} SE) = Suministro Total (${SALDO_INICIAL_BANCA_BRUTO} SE)`)
}

ejecutarReinicio().catch(err => {
  console.error('Error durante el reinicio:', err)
  process.exit(1)
})
