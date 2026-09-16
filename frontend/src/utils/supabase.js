import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://placeholder.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder'

if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
  console.warn('Configura VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY en tu entorno.')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export const NIVELES = [
  { nombre: 'Novato', min: 0 },
  { nombre: 'Constante', min: 80 },
  { nombre: 'Avanzado', min: 250 },
  { nombre: 'Destacado', min: 600 },
  { nombre: 'Referente', min: 1500 },
]

export const COLORES_AVATAR = [
  '#0A84FF', // Azul sistema
  '#30D158', // Verde
  '#FF9F0A', // Ámbar
  '#FF375F', // Rosa
  '#BF5AF2', // Violeta
  '#64D2FF', // Celeste
  '#5E5CE6', // Índigo
  '#7D7C84', // Grafito
]

export function obtenerIniciales(nombre) {
  if (!nombre || typeof nombre !== 'string') return 'AL'
  const partes = nombre.trim().split(/\s+/)
  if (partes.length === 1) {
    return partes[0].slice(0, 2).toUpperCase()
  }
  return (partes[0][0] + partes[1][0]).toUpperCase()
}

export function obtenerColorPorNombre(nombre) {
  if (!nombre) return COLORES_AVATAR[0]
  let hash = 0
  for (let i = 0; i < nombre.length; i++) {
    hash = nombre.charCodeAt(i) + ((hash << 5) - hash)
  }
  const index = Math.abs(hash) % COLORES_AVATAR.length
  return COLORES_AVATAR[index]
}
