// server/scripts/check_tables.js
import { createClient } from '@supabase/supabase-js'
import { config } from '../config/env.js'

async function checkTables() {
  const supabase = createClient(config.supabaseUrl, config.supabaseServiceKey)
  
  const { data: ledger, error: errLedger } = await supabase.from('steven_ledger').select('id').limit(1)
  const { data: sesiones, error: errSesiones } = await supabase.from('yoshi_sesiones').select('id').limit(1)
  const { data: colMonedas, error: errCol } = await supabase.from('profiles').select('monedas_ruleta_yoshi').limit(1)

  console.log('Resultados de comprobación de esquema en Supabase:')
  console.log('  - steven_ledger:', errLedger ? `Pendiente (${errLedger.message})` : '✅ Existe')
  console.log('  - yoshi_sesiones:', errSesiones ? `Pendiente (${errSesiones.message})` : '✅ Existe')
  console.log('  - profiles.monedas_ruleta_yoshi:', errCol ? `Pendiente (${errCol.message})` : '✅ Existe')
}

checkTables()
