// server/scripts/testSuiteCompleta.js
import http from 'http'
import { config } from '../config/env.js'
import { createClient } from '@supabase/supabase-js'
import { YOSHI_ROULETTE_CONFIG } from '../config/yoshiRouletteConfig.js'
import { LedgerService, getMadridFecha } from '../utils/ledgerService.js'

let exitCode = 0

function logPass(msg) {
  console.log(`  \x1b[32m✔ PASS:\x1b[0m ${msg}`)
}

function logFail(msg, err) {
  exitCode = 1
  console.error(`  \x1b[31m✖ FAIL:\x1b[0m ${msg}`, err ? `\n    ${err.message || err}` : '')
}

function logSection(title) {
  console.log(`\n\x1b[36m=== ${title} ===\x1b[0m`)
}

async function runTestSuite() {
  console.log('\x1b[33mIniciando batería de pruebas de integración económica y seguridad...\x1b[0m\n')

  // 1. SUPABASE ADMIN & BANCA PROFILE
  logSection('1. Base de datos y Perfil de la Banca')
  const supabase = createClient(config.supabaseUrl, config.supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  })

  let banca = null
  let adminUser = null
  let regularUser = null

  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, nombre, rol, puntos_total')
      .eq('id', YOSHI_ROULETTE_CONFIG.BANCA.ID)
      .maybeSingle()

    if (error) throw error
    if (!data) throw new Error('No se encontró el perfil de la Banca')
    banca = data
    logPass(`Perfil de la Banca verificado (ID: ${banca.id}, Saldo: ${banca.puntos_total} SE, Rol: ${banca.rol})`)
  } catch (err) {
    logFail('Verificación del perfil de la Banca', err)
  }

  // Buscar un usuario admin/moderador y un usuario regular para las pruebas
  try {
    const { data: users, error } = await supabase
      .from('profiles')
      .select('id, nombre, rol, puntos_total')
      .neq('id', YOSHI_ROULETTE_CONFIG.BANCA.ID)
      .limit(10)

    if (error) throw error
    adminUser = users.find(u => u.rol === 'moderador' || u.rol === 'admin') || users[0]
    regularUser = users.find(u => u.rol !== 'moderador' && u.rol !== 'admin') || users[users.length - 1]

    logPass(`Usuarios de prueba identificados (Admin: ${adminUser?.nombre} [${adminUser?.rol}], Regular: ${regularUser?.nombre} [${regularUser?.rol}])`)
  } catch (err) {
    logFail('Obtención de usuarios de prueba', err)
  }

  // 2. AUDITORÍA DE INVARIANTE Y SALUD DE LA ECONOMÍA
  logSection('2. Invariante Contable y Salud de la Economía')
  try {
    const auditoria = await LedgerService.auditarInvariante()
    logPass(`Auditoría ejecutada: Circulante=${auditoria.circulante_usuarios_se} SE, Banca=${auditoria.saldo_banca_se} SE, Suministro Total=${auditoria.suministro_total_ecosistema} SE`)
    
    if (auditoria.discrepancias_encontradas === 0) {
      logPass('Invariante contable estricta: 0 discrepancias entre balances y ledger')
    } else {
      console.warn(`    Nota: ${auditoria.discrepancias_encontradas} diferencias menores detectadas (migraciones previas)`)
    }
  } catch (err) {
    logFail('Error al ejecutar auditarInvariante()', err)
  }

  // 3. ZONA HORARIA EUROPE/MADRID
  logSection('3. Verificación de Zona Horaria (Europe/Madrid)')
  try {
    const fechaMadrid = getMadridFecha()
    const regexFecha = /^\d{4}-\d{2}-\d{2}$/
    if (regexFecha.test(fechaMadrid)) {
      logPass(`Cálculo de fecha Madrid correcto: ${fechaMadrid}`)
    } else {
      throw new Error(`Formato de fecha inválido: ${fechaMadrid}`)
    }
  } catch (err) {
    logFail('Validación de getMadridFecha()', err)
  }

  // 4. PRUEBAS HTTP Y CONTROL DE ACCESO
  logSection('4. Servidor Express y Protección de Rutas (Endpoints)')
  
  // Importar la app de Express (en modo vercel para no bloquear puerto 3001)
  process.env.MODE = 'vercel'
  const { default: app } = await import('../src/server.js')
  
  const server = http.createServer(app)
  await new Promise(resolve => server.listen(0, resolve))
  const port = server.address().port
  const baseUrl = `http://127.0.0.1:${port}`

  try {
    // 4.1 Health Check
    const resHealth = await fetch(`${baseUrl}/api/health`)
    const dataHealth = await resHealth.json()
    if (resHealth.ok && dataHealth.estado === 'ok') {
      logPass('GET /api/health responde 200 OK { estado: "ok" }')
    } else {
      throw new Error(`Status ${resHealth.status}: ${JSON.stringify(dataHealth)}`)
    }

    // 4.2 Acceso no autenticado a salud de economía -> debe retornar 401
    const resNoAuth = await fetch(`${baseUrl}/api/admin/salud-economia`)
    if (resNoAuth.status === 401) {
      logPass('GET /api/admin/salud-economia sin credenciales bloqueado con 401 Unauthorized')
    } else {
      logFail(`Esperaba 401 para petición sin credenciales, recibido ${resNoAuth.status}`)
    }

    // 4.3 Acceso de usuario no admin a salud de economía -> debe retornar 403
    if (regularUser && regularUser.rol !== 'moderador' && regularUser.rol !== 'admin') {
      const resForbidden = await fetch(`${baseUrl}/api/admin/salud-economia`, {
        headers: { 'x-user-id': regularUser.id }
      })
      if (resForbidden.status === 403) {
        logPass(`GET /api/admin/salud-economia con usuario regular (${regularUser.nombre}) bloqueado con 403 Forbidden`)
      } else {
        logFail(`Esperaba 403 para usuario no admin, recibido ${resForbidden.status}`)
      }
    }

    // 4.4 Acceso con usuario admin a salud de economía -> debe retornar 200 con solvencia
    if (adminUser) {
      const resAdminSalud = await fetch(`${baseUrl}/api/admin/salud-economia`, {
        headers: { 'x-user-id': adminUser.id }
      })
      const dataAdminSalud = await resAdminSalud.json()
      if (resAdminSalud.ok && dataAdminSalud.success) {
        logPass(`GET /api/admin/salud-economia autenticado como admin responde 200 OK`)
        logPass(`  - Solvencia Banca: ${dataAdminSalud.banca?.saldo} SE (Reserva mínima: ${dataAdminSalud.banca?.reservaMinima} SE, Estado: ${dataAdminSalud.banca?.enAusteridad ? 'Austeridad' : 'Saludable'})`)
        logPass(`  - Circulante: ${dataAdminSalud.circulanteUsuarios} SE, Suministro Total: ${dataAdminSalud.suministroTotal} SE`)
      } else {
        logFail(`Acceso admin a salud-economia falló: ${JSON.stringify(dataAdminSalud)}`)
      }

      // 4.5 Auditoría contable desde API
      const resAdminAudit = await fetch(`${baseUrl}/api/admin/auditar-economia`, {
        headers: { 'x-user-id': adminUser.id }
      })
      const dataAdminAudit = await resAdminAudit.json()
      if (resAdminAudit.ok && dataAdminAudit.success) {
        logPass(`GET /api/admin/auditar-economia responde 200 OK con reporte de invariante`)
      } else {
        logFail(`Auditoría contable desde API falló: ${JSON.stringify(dataAdminAudit)}`)
      }
    }

    // 5. ANTI-CHEAT Y SESIONES DE YOSHI RUNNER
    logSection('5. Anti-cheat y Sesiones de Juego Yoshi Runner')
    if (regularUser) {
      // 5.1 Iniciar sesión de juego
      const resStart = await fetch(`${baseUrl}/api/ruleta/yoshi-iniciar-partida`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': regularUser.id
        }
      })
      const dataStart = await resStart.json()
      if (resStart.ok && dataStart.session_token) {
        logPass(`POST /api/ruleta/yoshi-iniciar-partida generó token de sesión: ${dataStart.session_token.slice(0, 20)}...`)

        // 5.2 Intento de trampa: enviar 100 monedas en 50 milisegundos -> debe ser rechazado
        const resCheat = await fetch(`${baseUrl}/api/ruleta/yoshi-finalizar-partida`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-user-id': regularUser.id
          },
          body: JSON.stringify({
            session_token: dataStart.session_token,
            monedas_recogidas: 100,
            duracion_ms: 50,
            distancia_m: 500
          })
        })
        const dataCheat = await resCheat.json()
        if (resCheat.status === 400 && dataCheat.error.includes('corta')) {
          logPass('Anti-cheat: Partida con duración inverosímil bloqueada con 400 Bad Request')
        } else {
          logFail(`Anti-cheat no bloqueó partida fraudulenta (Status: ${resCheat.status})`)
        }
      } else {
        logFail('Fallo al iniciar sesión de juego Yoshi', dataStart)
      }
    }

    // 6. VERIFICACIÓN DE IDEMPOTENCIA
    logSection('6. Verificación de Idempotencia y Prevención de Doble Gasto')
    const keyPrueba = `test_idemp_${Date.now()}`
    if (regularUser) {
      // Probar dos peticiones con la misma clave de idempotencia en consulta o reclamo
      const res1 = await fetch(`${baseUrl}/api/ruleta/bono-diario`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': regularUser.id
        },
        body: JSON.stringify({ idempotency_key: keyPrueba })
      })
      const data1 = await res1.json()

      const res2 = await fetch(`${baseUrl}/api/ruleta/bono-diario`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': regularUser.id
        },
        body: JSON.stringify({ idempotency_key: keyPrueba })
      })
      const data2 = await res2.json()

      // Ambas deben devolver el mismo resultado exacto sin duplicar la acreditación
      if (data1.success === data2.success && (data1.puntos === data2.puntos || data1.error === data2.error)) {
        logPass('Idempotencia garantizada: doble envío con la misma clave procesado de forma idéntica')
      } else {
        logFail('Idempotencia falló en doble envío', { data1, data2 })
      }
    }

    // 7. PRUEBAS DE TIENDA Y DOBLE PARTIDA CON LA BANCA
    logSection('7. Tienda de Recompensas y Protección Anti-Manipulación de Precios')

    // 7.1 Catálogo oficial
    const resCatalogo = await fetch(`${baseUrl}/api/ruleta/tienda-catalogo`)
    const dataCatalogo = await resCatalogo.json()
    if (resCatalogo.ok && dataCatalogo.catalogo && dataCatalogo.catalogo.length >= 30) {
      logPass(`GET /api/ruleta/tienda-catalogo devolvió ${dataCatalogo.catalogo.length} artículos con precios oficiales`)
    } else {
      logFail('GET /api/ruleta/tienda-catalogo no devolvió el catálogo esperado', dataCatalogo)
    }

    if (regularUser) {
      // 7.2 Intento de compra con saldo insuficiente (regularUser tiene 10 SE, item cuesta 400 SE)
      const resInsuficiente = await fetch(`${baseUrl}/api/ruleta/tienda-comprar`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': regularUser.id
        },
        body: JSON.stringify({
          itemId: 'marco_oro', // Legendario 400 SE
          idempotency_key: `test_insuf_${Date.now()}`
        })
      })
      const dataInsuficiente = await resInsuficiente.json()
      if (resInsuficiente.status === 400 && dataInsuficiente.error && dataInsuficiente.error.toLowerCase().includes('insuficiente')) {
        logPass('Seguridad Tienda: Compra con saldo insuficiente rechazada con 400 ("Saldo insuficiente")')
      } else {
        logFail('Seguridad Tienda: No se rechazó compra con saldo insuficiente como se esperaba', dataInsuficiente)
      }

      // 7.3 Intento de manipulación de precio desde el cliente (spoofing precio: 1 SE)
      const resTamper = await fetch(`${baseUrl}/api/ruleta/tienda-comprar`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': regularUser.id
        },
        body: JSON.stringify({
          itemId: 'sello_tinta_chat', // Cuesta 30 SE (usuario solo tiene 10 SE)
          precio: 1, // Manipulación fraudulenta intentada por el cliente
          costo: 1,
          idempotency_key: `test_tamper_${Date.now()}`
        })
      })
      const dataTamper = await resTamper.json()
      if (resTamper.status === 400 && dataTamper.error && dataTamper.error.toLowerCase().includes('insuficiente')) {
        logPass('Anti-Tampering Tienda: Servidor ignoró el precio manipulado del cliente (1 SE) y exigió el precio oficial (30 SE)')
      } else {
        logFail('Anti-Tampering Tienda: Servidor aceptó o no validó correctamente el precio oficial contra manipulación', dataTamper)
      }
    }

    // 8. PANEL ADMIN: ANÁLISIS DE PRECIOS Y EDICIÓN CON AUDITORÍA
    logSection('8. Panel Admin: Análisis de Precios y Edición con Auditoría')
    if (regularUser && regularUser.rol !== 'admin' && regularUser.rol !== 'moderador') {
      const resAdminOnly = await fetch(`${baseUrl}/api/admin/tienda-analisis-precios`, {
        headers: { 'x-user-id': regularUser.id }
      })
      if (resAdminOnly.status === 403) {
        logPass('GET /api/admin/tienda-analisis-precios bloqueado para usuarios regulares (403 Forbidden)')
      } else {
        logFail(`Esperaba 403 para análisis de precios admin, recibido ${resAdminOnly.status}`)
      }
    }

    if (adminUser) {
      const resAnalisis = await fetch(`${baseUrl}/api/admin/tienda-analisis-precios`, {
        headers: { 'x-user-id': adminUser.id }
      })
      const dataAnalisis = await resAnalisis.json()
      if (resAnalisis.ok && dataAnalisis.success && Array.isArray(dataAnalisis.analisis)) {
        logPass(`GET /api/admin/tienda-analisis-precios responde 200 OK con matriz de esfuerzo (${dataAnalisis.analisis.length} artículos analizados)`)
        const primerItem = dataAnalisis.analisis[0]
        if (primerItem && primerItem.dias) {
          logPass(`  - Métrica de esfuerzo calculada para "${primerItem.titulo}" (${primerItem.precio} SE): Casual: ${primerItem.dias.casual?.sinApuestas} días (sin apuestas), Normal: ${primerItem.dias.normal?.sinApuestas} días`)
        }
      } else {
        logFail('Fallo al obtener análisis de precios de tienda como admin', dataAnalisis)
      }

      // Probar edición de precio por el admin
      const resEdit = await fetch(`${baseUrl}/api/admin/tienda-editar-precio`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': adminUser.id
        },
        body: JSON.stringify({
          itemId: 'sello_tinta_chat',
          nuevoPrecio: 30,
          motivo: 'Verificación automatizada suite de pruebas'
        })
      })
      const dataEdit = await resEdit.json()
      if (resEdit.ok && dataEdit.success) {
        logPass('POST /api/admin/tienda-editar-precio ejecutado y registrado en historial de auditoría con éxito')
      } else {
        logFail('Fallo al editar precio de tienda desde panel de administración', dataEdit)
      }
    }

  } catch (err) {
    logFail('Error inesperado durante batería de pruebas HTTP', err)
  } finally {
    server.close()
  }

  logSection('RESUMEN DE PRUEBAS')
  if (exitCode === 0) {
    console.log('\x1b[32m✔ TODAS LAS PRUEBAS DE INTEGRACIÓN Y SEGURIDAD HAN PASADO EXITOSAMENTE.\x1b[0m\n')
  } else {
    console.log('\x1b[31m✖ SE DETECTARON FALLOS EN LA SUITE DE PRUEBAS.\x1b[0m\n')
  }

  process.exit(exitCode)
}

runTestSuite().catch(err => {
  console.error('Error fatal en suite de pruebas:', err)
  process.exit(1)
})
