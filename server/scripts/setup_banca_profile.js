// server/scripts/setup_banca_profile.js
import { createClient } from '@supabase/supabase-js'
import { config } from '../config/env.js'

async function setupBanca() {
  const supabase = createClient(config.supabaseUrl, config.supabaseServiceKey)
  
  const bancaId = '00000000-0000-4000-a000-000000000000'
  const { data: existing } = await supabase.from('profiles').select('id, nombre, puntos_total').eq('id', bancaId).maybeSingle()
  
  if (existing) {
    console.log('✅ Perfil de BANCA SISTEMA ya existe:', existing)
    return
  }

  const { data, error } = await supabase.from('profiles').insert({
    id: bancaId,
    nombre: 'BANCA SISTEMA',
    username: 'banca_sistema',
    avatar_emoji: '🏛️',
    color_acento: '#FFD700',
    rol: 'moderador', // Cumple el constraint existente mientras no se amplíe el check
    puntos_total: 5000,
    onboarding_completado: true,
    frase: 'Banco Central y Reserva de Liquidez de SMR2'
  }).select().single()

  if (error) {
    console.error('Error creando perfil Banca:', error.message)
  } else {
    console.log('✅ Perfil de BANCA SISTEMA creado exitosamente:', data)
  }
}

setupBanca()
