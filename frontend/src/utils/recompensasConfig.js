// frontend/src/utils/recompensasConfig.js
import { supabase } from './supabase'
import { transmitirEvento, suscribirEvento } from './realtimeHub'

export const DEFAULT_RECOMPENSAS = {
  puntosCheckin: 10,
  puntosReto: 25,
  puntosPostFeed: 10,
  multiplicadorGlobal: 1.0, // 1.0x | 1.5x | 2.0x
  bonoRacha: 10
}

const STORAGE_KEY = 'muudel_config_recompensas'

// Obtiene la configuración actual de recompensas en memoria/local
export function obtenerConfigRecompensas() {
  try {
    const guardada = localStorage.getItem(STORAGE_KEY)
    if (guardada) {
      return { ...DEFAULT_RECOMPENSAS, ...JSON.parse(guardada) }
    }
  } catch (e) {}
  return { ...DEFAULT_RECOMPENSAS }
}

// Sincroniza con el endpoint del servidor o Supabase
export async function cargarConfigRecompensasDesdeServidor() {
  // 1. Consultar endpoint API del servidor express (garantizado sin 404)
  try {
    const res = await fetch('/api/admin/config-recompensas')
    if (res.ok) {
      const json = await res.json()
      if (json.config) {
        const cfg = { ...DEFAULT_RECOMPENSAS, ...json.config }
        localStorage.setItem(STORAGE_KEY, JSON.stringify(cfg))
        return cfg
      }
    }
  } catch (_) {}

  // 2. Si hay conexión directa a Supabase con la tabla creada
  try {
    const { data, error } = await supabase
      .from('config_clase')
      .select('valor')
      .eq('clave', 'recompensas_economia')
      .maybeSingle()

    if (!error && data?.valor) {
      const cfg = { ...DEFAULT_RECOMPENSAS, ...data.valor }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(cfg))
      return cfg
    }
  } catch (_) {}

  return obtenerConfigRecompensas()
}

// Guarda la configuración tanto en servidor como localmente y la difunde
export async function guardarConfigRecompensas(nuevaConfig) {
  const merged = { ...DEFAULT_RECOMPENSAS, ...nuevaConfig }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(merged))

  // Transmitir a todos los clientes abiertos en tiempo real
  transmitirEvento('recompensas_config_actualizada', merged)

  // Guardar en Supabase
  try {
    await supabase.from('config_clase').upsert({
      clave: 'recompensas_economia',
      valor: merged,
      updated_at: new Date().toISOString()
    }, { onConflict: 'clave' })
  } catch (_) {}

  // Guardar en API Express
  try {
    await fetch('/api/admin/config-recompensas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ config: merged })
    })
  } catch (_) {}

  return merged
}

// Calcula los puntos resultantes aplicando el multiplicador activo de la clase
export function calcularPuntosGanados(tipo) {
  const cfg = obtenerConfigRecompensas()
  const mult = Number(cfg.multiplicadorGlobal) || 1.0

  let base = 10
  if (tipo === 'checkin') base = Number(cfg.puntosCheckin) || 10
  else if (tipo === 'reto') base = Number(cfg.puntosReto) || 25
  else if (tipo === 'feed') base = Number(cfg.puntosPostFeed) || 10
  else if (tipo === 'racha') base = Number(cfg.bonoRacha) || 10

  return Math.max(1, Math.round(base * mult))
}
