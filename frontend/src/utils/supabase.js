import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export const NIVELES = [
  { nombre: 'Novato', min: 0 },
  { nombre: 'Presente', min: 100 },
  { nombre: 'Constante', min: 400 },
  { nombre: 'Imparable', min: 1000 },
  { nombre: 'Leyenda', min: 2500 },
]

export const EMOJIS_AVATAR = [
  '🧑','👩','🧔','👨','👧','👦','🧑‍🎓','🧑‍💻','🧑‍🔬','🧑‍🏫',
  '🦸','🦸‍♀️','🦸‍♂️','🧙','🧙‍♀️','🤸','🏃','🏃‍♀️','🧖','🧑‍🍳',
]

export const COLORES = [
  '#0A84FF','#30D158','#FF453A','#FF9500','#AF52DE',
  '#FF2D55','#5AC8FA','#4CD964','#FFCC00','#8E8E93',
]
