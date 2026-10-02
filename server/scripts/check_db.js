// server/scripts/check_db.js
import { createClient } from '@supabase/supabase-js'
import { config } from '../config/env.js'

async function check() {
  const supabase = createClient(config.supabaseUrl, config.supabaseServiceKey)
  
  const { data: profiles, error } = await supabase
    .from('profiles')
    .select('id, nombre, rol, puntos_total')
  
  if (error) {
    console.error('Error querying profiles:', error.message)
    return
  }

  const totalUsuarios = profiles.length
  const totalSECirculacion = profiles.reduce((sum, p) => sum + (p.puntos_total || 0), 0)

  console.log('=== ESTADO ACTUAL DE LA BASE DE DATOS ===')
  console.log(`Total usuarios registrados: ${totalUsuarios}`)
  console.log(`Suministro total de StevenEuros en circulación: ${totalSECirculacion} SE`)
  console.log('\nTop 10 saldos de StevenEuros:')
  profiles
    .sort((a, b) => (b.puntos_total || 0) - (a.puntos_total || 0))
    .slice(0, 10)
    .forEach((p, idx) => {
      console.log(`  ${idx + 1}. ${p.nombre} (${p.rol}): ${p.puntos_total || 0} SE (ID: ${p.id})`)
    })
}

check()
