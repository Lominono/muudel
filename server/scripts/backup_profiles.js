// server/scripts/backup_profiles.js
import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { config } from '../config/env.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

async function backup() {
  console.log('Iniciando copia de seguridad de perfiles...')
  const supabase = createClient(config.supabaseUrl, config.supabaseServiceKey)

  const { data: profiles, error } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: true })

  if (error) {
    console.error('Error al realizar backup:', error.message)
    process.exit(1)
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
  const backupDir = path.resolve(__dirname, '../../database/backups')
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true })
  }

  const jsonFile = path.join(backupDir, `profiles_backup_${timestamp}.json`)
  fs.writeFileSync(jsonFile, JSON.stringify(profiles, null, 2), 'utf8')

  // Generar script SQL de restauración reversible
  const sqlFile = path.join(backupDir, `profiles_restore_${timestamp}.sql`)
  let sqlContent = `-- Copia de seguridad generada automáticamente: ${new Date().toISOString()}\n`
  sqlContent += `BEGIN;\n`
  for (const p of profiles) {
    sqlContent += `UPDATE profiles SET puntos_total = ${p.puntos_total ?? 0}, updated_at = NOW() WHERE id = '${p.id}';\n`
  }
  sqlContent += `COMMIT;\n`
  fs.writeFileSync(sqlFile, sqlContent, 'utf8')

  console.log(`✅ Backup completado con éxito:`)
  console.log(`   - JSON: ${jsonFile} (${profiles.length} perfiles respaldados)`)
  console.log(`   - SQL Restauración: ${sqlFile}`)
  return profiles
}

backup()
