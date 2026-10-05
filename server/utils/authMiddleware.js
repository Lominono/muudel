// server/utils/authMiddleware.js
import { createClient } from '@supabase/supabase-js'
import { config } from '../config/env.js'

export const ADMIN_LOMINONO_ID = '00000000-0000-4000-a000-000000000001'

function getSupabaseAdmin() {
  return createClient(config.supabaseUrl.trim(), config.supabaseServiceKey.trim(), {
    auth: { autoRefreshToken: false, persistSession: false }
  })
}

/**
 * Middleware para autenticar usuarios mediante Bearer JWT de Supabase
 */
export async function requireAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization || ''
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : null
    const supabase = getSupabaseAdmin()

    let userId = null

    if (token) {
      // 1. Validar JWT oficial de Supabase
      const { data: authData, error: authErr } = await supabase.auth.getUser(token)
      if (!authErr && authData?.user?.id) {
        userId = authData.user.id
      }
    }

    // 2. Fallback de desarrollo/cliente si viene el header x-user-id y es un UUID válido existente
    if (!userId && req.headers['x-user-id']) {
      const candidate = req.headers['x-user-id'].trim()
      const { data: p } = await supabase.from('profiles').select('id').eq('id', candidate).maybeSingle()
      if (p?.id) userId = p.id
    }

    // 3. Fallback en body si no vino header (para compatibilidad de endpoints existentes)
    if (!userId && req.body?.user_id) {
      const candidate = req.body.user_id
      const { data: p } = await supabase.from('profiles').select('id').eq('id', candidate).maybeSingle()
      if (p?.id) userId = p.id
    }

    if (!userId) {
      return res.status(401).json({ error: 'No autenticado. Se requiere sesión activa.' })
    }

    // Obtener perfil completo (con tolerancia resiliente si las columnas aún no migraron)
    let perfil = null
    const { data: pFull, error: pErrFull } = await supabase
      .from('profiles')
      .select('id, nombre, rol, puntos_total, monedas_ruleta_yoshi, racha_actual, xp_nivel, ultimo_jackpot_at')
      .eq('id', userId)
      .maybeSingle()

    if (!pErrFull && pFull) {
      perfil = pFull
    } else {
      const { data: pBase } = await supabase
        .from('profiles')
        .select('id, nombre, rol, puntos_total, racha_actual, xp_nivel')
        .eq('id', userId)
        .maybeSingle()

      if (pBase) {
        perfil = {
          ...pBase,
          monedas_ruleta_yoshi: 0,
          ultimo_jackpot_at: null
        }
      }
    }

    if (!perfil) {
      return res.status(401).json({ error: 'Perfil de usuario no encontrado en el sistema' })
    }

    req.user = perfil
    req.userId = perfil.id
    req.authViaToken = Boolean(token)
    next()
  } catch (err) {
    console.error('Error en requireAuth:', err)
    return res.status(500).json({ error: 'Error al verificar autenticación' })
  }
}

/**
 * Middleware para exigir rol de administrador o moderador en servidor
 * Implementa defensa en profundidad: verificación de rol + validación de PIN si no hay JWT criptográfico
 */
export async function requireAdmin(req, res, next) {
  return requireAuth(req, res, () => {
    const user = req.user
    const esAdminRol = user?.rol === 'moderador' || user?.rol === 'admin' || user?.id === ADMIN_LOMINONO_ID

    if (!esAdminRol) {
      return res.status(403).json({ error: 'Acceso denegado: se requieren permisos de administración.' })
    }

    // Si la autenticación no vino por JWT criptográfico firmado de Supabase,
    // se exige de forma obligatoria el PIN maestro de administración en headers
    const adminPinEsperado = (process.env.ADMIN_PIN || '2026').trim()
    const pinRecibido = (req.headers['x-admin-pin'] || '').trim()

    if (!req.authViaToken && pinRecibido !== adminPinEsperado) {
      return res.status(403).json({
        error: 'Acceso restringido: se requiere PIN maestro de administración válido.'
      })
    }

    next()
  })
}
