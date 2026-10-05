// server/utils/authMiddleware.js
import { createClient } from '@supabase/supabase-js'
import { config } from '../config/env.js'

export const ADMIN_LOMINONO_ID = '00000000-0000-4000-a000-000000000001'

function getSupabaseAdmin() {
  return createClient(config.supabaseUrl.trim(), config.supabaseServiceKey.trim(), {
    auth: { autoRefreshToken: false, persistSession: false }
  })
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function esUuidValido(valor) {
  return typeof valor === 'string' && UUID_REGEX.test(valor.trim())
}

/**
 * Middleware para autenticar usuarios mediante Bearer JWT de Supabase,
 * x-user-id garantizado con service role, o x-admin-pin para operaciones de administración
 */
export async function requireAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization || ''
    const rawToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : null
    const token = (rawToken && rawToken !== 'null' && rawToken !== 'undefined') ? rawToken : null
    const supabase = getSupabaseAdmin()

    const adminPinEsperado = (process.env.ADMIN_PIN || '2026').trim()
    const pinRecibido = (req.headers['x-admin-pin'] || '').trim()
    const tienePinAdmin = Boolean(pinRecibido && pinRecibido === adminPinEsperado)

    let userId = null

    // 1. Validar JWT oficial de Supabase si viene token
    if (token) {
      try {
        const { data: authData, error: authErr } = await supabase.auth.getUser(token)
        if (!authErr && authData?.user?.id) {
          userId = authData.user.id
        }
      } catch (_) {}
    }

    // 2. Si viene el header x-user-id
    if (!userId && req.headers['x-user-id']) {
      const candidate = String(req.headers['x-user-id']).trim()
      if (candidate && candidate !== 'null' && candidate !== 'undefined') {
        userId = candidate
      }
    }

    // 3. Fallback en body si no vino header
    if (!userId && req.body?.user_id) {
      const candidate = String(req.body.user_id).trim()
      if (candidate && candidate !== 'null' && candidate !== 'undefined') {
        userId = candidate
      }
    }

    // 4. Si tiene PIN de administración válido y no hay userId determinado
    if (!userId && tienePinAdmin) {
      userId = ADMIN_LOMINONO_ID
    }

    if (!userId) {
      return res.status(401).json({ error: 'No autenticado. Se requiere sesión activa o identificación.' })
    }

    // Si es el ID maestro de administración y tiene el PIN, garantizar perfil inmediato
    if (userId === ADMIN_LOMINONO_ID && tienePinAdmin) {
      let adminProf = null
      try {
        const { data } = await supabase
          .from('profiles')
          .select('id, nombre, rol, puntos_total, monedas_ruleta_yoshi, racha_actual, xp_nivel')
          .eq('id', ADMIN_LOMINONO_ID)
          .maybeSingle()
        adminProf = data
      } catch (_) {}

      req.user = adminProf || {
        id: ADMIN_LOMINONO_ID,
        nombre: 'lominoño',
        rol: 'moderador',
        puntos_total: 1000,
        monedas_ruleta_yoshi: 0,
        racha_actual: 30,
        xp_nivel: 99
      }
      req.userId = ADMIN_LOMINONO_ID
      req.authViaToken = Boolean(token)
      req.authViaPin = true
      return next()
    }

    // Obtener perfil completo desde Supabase usando Service Role (bypassing RLS)
    let perfil = null
    try {
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
    } catch (_) {}

    // Si el perfil no existe en BD pero el userId es un UUID válido, auto-registrar perfil mínimo
    if (!perfil && esUuidValido(userId)) {
      try {
        const nuevoNombre = (req.headers['x-user-name'] || req.body?.user_name || 'Estudiante SMR2').trim()
        const { data: nuevoP } = await supabase
          .from('profiles')
          .insert({
            id: userId,
            nombre: nuevoNombre,
            rol: tienePinAdmin ? 'moderador' : 'alumno',
            puntos_total: 10,
            racha_actual: 1
          })
          .select('id, nombre, rol, puntos_total, monedas_ruleta_yoshi, racha_actual, xp_nivel')
          .maybeSingle()

        if (nuevoP) {
          perfil = nuevoP
        }
      } catch (_) {}
    }

    // Si aún no hay perfil pero el usuario tiene PIN maestro de admin
    if (!perfil && tienePinAdmin) {
      perfil = {
        id: userId,
        nombre: 'lominoño',
        rol: 'moderador',
        puntos_total: 1000,
        monedas_ruleta_yoshi: 0,
        racha_actual: 30,
        xp_nivel: 99
      }
    }

    if (!perfil) {
      return res.status(401).json({ error: 'Perfil de usuario no encontrado en el sistema.' })
    }

    req.user = perfil
    req.userId = perfil.id
    req.authViaToken = Boolean(token)
    req.authViaPin = tienePinAdmin
    next()
  } catch (err) {
    console.error('Error en requireAuth:', err)
    return res.status(500).json({ error: 'Error al verificar autenticación' })
  }
}

/**
 * Middleware para exigir rol de administrador o moderador en servidor
 * Acepta rol moderador/admin, ID de lominoño o validación de PIN maestro (2026)
 */
export async function requireAdmin(req, res, next) {
  const adminPinEsperado = (process.env.ADMIN_PIN || '2026').trim()
  const pinRecibido = (req.headers['x-admin-pin'] || '').trim()
  const tienePinValido = Boolean(pinRecibido && pinRecibido === adminPinEsperado)

  return requireAuth(req, res, () => {
    const user = req.user
    const esAdminRol = user?.rol === 'moderador' || user?.rol === 'admin' || user?.id === ADMIN_LOMINONO_ID

    if (!esAdminRol && !tienePinValido) {
      return res.status(403).json({ error: 'Acceso denegado: se requieren permisos de administración.' })
    }

    next()
  })
}

