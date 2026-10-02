// server/scripts/test_rpc.js
import { createClient } from '@supabase/supabase-js'
import { config } from '../config/env.js'

async function test() {
  const supabase = createClient(config.supabaseUrl, config.supabaseServiceKey)
  const { data, error } = await supabase.rpc('exec_sql', { sql: 'SELECT 1;' })
  console.log('RPC exec_sql result:', { data, error })
}
test()
