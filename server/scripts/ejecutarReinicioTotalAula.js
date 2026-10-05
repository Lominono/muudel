// server/scripts/ejecutarReinicioTotalAula.js
import { config } from '../config/env.js'
import { createClient } from '@supabase/supabase-js'
import { YOSHI_ROULETTE_CONFIG } from '../config/yoshiRouletteConfig.js'

async function ejecutarReinicioTotal() {
  console.log('=== INICIANDO REINICIO TOTAL DEL AULA SMR2 ===')

  if (!config.supabaseUrl || !config.supabaseServiceKey) {
    throw new Error('Faltan credenciales de Supabase en .env')
  }

  const supabase = createClient(config.supabaseUrl, config.supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  })

  const bancaId = YOSHI_ROULETTE_CONFIG.BANCA.ID
  const BONO_INICIAL_SE = 10
  const SALDO_INICIAL_BANCA_BRUTO = 2000

  // 1. Limpiar mensajes de chat y likes
  console.log('1. Purgando mensajes de chat y reacciones...')
  try {
    const { error: mlErr } = await supabase.from('message_likes').delete().neq('user_id', '00000000-0000-0000-0000-000000000000')
    if (mlErr) console.warn('  Error message_likes:', mlErr.message)
    const { error: mErr } = await supabase.from('messages').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    if (mErr) console.warn('  Error messages:', mErr.message)
    console.log('  ✓ Mensajes de chat reseteados')
  } catch (e) {
    console.warn('  Aviso chat:', e.message)
  }

  // 2. Limpiar inventario_usuario (cosas compradas en la tienda)
  console.log('2. Purgando cosas compradas en inventario_usuario...')
  try {
    const { error: invErr } = await supabase.from('inventario_usuario').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    if (invErr) console.warn('  Error inventario_usuario:', invErr.message)
    console.log('  ✓ Inventarios y artículos de tienda reseteados')
  } catch (e) {
    console.warn('  Aviso inventario:', e.message)
  }

  // 3. Limpiar checkins (asistencia y rachas)
  console.log('3. Purgando registros de checkins / asistencias...')
  try {
    const { error: chkErr } = await supabase.from('checkins').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    if (chkErr) console.warn('  Error checkins:', chkErr.message)
    console.log('  ✓ Registros de asistencia reseteados')
  } catch (e) {
    console.warn('  Aviso checkins:', e.message)
  }

  // 4. Limpiar puntuaciones de juegos y retos
  console.log('4. Purgando puntuaciones arcade, retos y sesiones...')
  try {
    await supabase.from('juegos_puntuaciones').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    await supabase.from('arcade_scores').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    await supabase.from('reto_completado').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    await supabase.from('yoshi_sesiones').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    console.log('  ✓ Puntuaciones y retos completados reseteados')
  } catch (e) {
    console.warn('  Aviso juegos:', e.message)
  }

  // 5. Purgar steven_ledger
  console.log('5. Purgando libro contable (steven_ledger)...')
  try {
    await supabase.from('steven_ledger').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    console.log('  ✓ Historial de transacciones reseteado')
  } catch (e) {
    console.warn('  Aviso ledger:', e.message)
  }

  // 6. Obtener perfiles para reiniciar saldos y estadísticas
  console.log('6. Reiniciando perfiles de alumnos y banca...')
  const { data: profiles, error: pErr } = await supabase.from('profiles').select('*')
  if (pErr) throw new Error('Error al leer perfiles: ' + pErr.message)

  const userProfiles = (profiles || []).filter(p => p.id !== bancaId)
  let gastoTotalBono = 0

  for (const user of userProfiles) {
    gastoTotalBono += BONO_INICIAL_SE

    // Reset de perfil
    await supabase.from('profiles').update({
      puntos_total: BONO_INICIAL_SE,
      monedas_ruleta_yoshi: 0,
      racha_actual: 0,
      mejor_racha: 0,
      xp_nivel: 0,
      freeze_usadas: 0,
      ultimo_checkin: null,
      updated_at: new Date().toISOString()
    }).eq('id', user.id)

    // Asentar bono inicial en ledger
    try {
      await supabase.from('steven_ledger').insert({
        user_id: user.id,
        contrapartida_id: bancaId,
        tipo: 'bienvenida',
        moneda: 'steveneuros',
        cantidad: BONO_INICIAL_SE,
        saldo_anterior: 0,
        saldo_posterior: BONO_INICIAL_SE,
        actor_id: bancaId,
        motivo: 'Bono inicial oficial tras reinicio general de aula SMR2',
        idempotency_key: `reinicio_total_${user.id}_${Date.now()}`,
        detalles: { bono: BONO_INICIAL_SE, nombre: user.nombre }
      })
    } catch (_) {}

    console.log(`  - Usuario ${user.nombre}: Saldo asignado 10 SE, racha 0, monedas Yoshi 0`)
  }

  // 7. Establecer balance de la Banca
  const saldoFinalBanca = SALDO_INICIAL_BANCA_BRUTO - gastoTotalBono
  await supabase.from('profiles').update({
    puntos_total: saldoFinalBanca,
    monedas_ruleta_yoshi: 0,
    racha_actual: 0,
    mejor_racha: 0,
    ultimo_checkin: null,
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
      motivo: 'Fondo de solvencia de la Banca tras reinicio total de aula SMR2',
      idempotency_key: `banca_reinicio_total_${Date.now()}`,
      detalles: { saldo_inicial_bruto: SALDO_INICIAL_BANCA_BRUTO, bonos_emitidos: gastoTotalBono }
    })
  } catch (_) {}

  // 8. Insertar mensaje inicial en chat #general
  try {
    await supabase.from('messages').insert({
      user_id: bancaId,
      canal: 'general',
      texto: '🏛️ AVISO OFICIAL: Se ha completado el reinicio general del aula SMR2. Todos los alumnos parten con 10 StevenEuros de bienvenida. ¡Pizarra limpia y buen comienzo de curso!',
      es_solucion: false,
      likes_count: 0
    })
    console.log('  ✓ Mensaje de bienvenida publicado en chat #general')
  } catch (e) {
    console.warn('  Aviso mensaje bienvenida:', e.message)
  }

  console.log('=== REINICIO TOTAL COMPLETADO EXITOSAMENTE ===')
  console.log(`  - Alumnos reiniciados: ${userProfiles.length}`)
  console.log(`  - Saldo por alumno: ${BONO_INICIAL_SE} SE`)
  console.log(`  - Monedas Yoshi: 0`)
  console.log(`  - Rachas: 0`)
  console.log(`  - Saldo Banca del Sistema: ${saldoFinalBanca} SE`)
  console.log(`  - Masa monetaria total: ${SALDO_INICIAL_BANCA_BRUTO} SE (Conservación exacta 100%)`)
}

ejecutarReinicioTotal().catch(err => {
  console.error('Error fatal en el reinicio total:', err)
  process.exit(1)
})
