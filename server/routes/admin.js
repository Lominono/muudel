// server/routes/admin.js
import { Router } from 'express'
import { createClient } from '@supabase/supabase-js'
import { config } from '../config/env.js'

export const adminRouter = Router()

function getSupabaseAdmin() {
  if (!config.supabaseUrl || !config.supabaseServiceKey) {
    throw new Error('SUPABASE_URL o SUPABASE_SERVICE_KEY no configuradas en el servidor')
  }
  return createClient(config.supabaseUrl.trim(), config.supabaseServiceKey.trim(), {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })
}

// 1. Modificar puntaje y racha de un alumno de forma garantizada (bypasseando RLS)
adminRouter.post('/modificar-puntaje', async (req, res) => {
  try {
    const { userId, puntos_total, racha_actual, motivo } = req.body

    if (!userId) {
      return res.status(400).json({ error: 'userId es obligatorio' })
    }

    const supabaseAdmin = getSupabaseAdmin()

    const updateData = {
      updated_at: new Date().toISOString()
    }

    if (puntos_total !== undefined && puntos_total !== null) {
      updateData.puntos_total = Math.max(0, Number(puntos_total))
    }

    if (racha_actual !== undefined && racha_actual !== null) {
      updateData.racha_actual = Math.max(0, Number(racha_actual))
    }

    const { data, error } = await supabaseAdmin
      .from('profiles')
      .update(updateData)
      .eq('id', userId)
      .select()
      .single()

    if (error) {
      console.error('Error al modificar puntaje en Supabase:', error)
      return res.status(500).json({ error: error.message || 'Error en base de datos' })
    }

    return res.json({
      success: true,
      mensaje: `Puntaje actualizado correctamente para ${data.nombre || userId}`,
      perfil: data
    })
  } catch (err) {
    console.error('Catch en /modificar-puntaje:', err)
    return res.status(500).json({ error: err.message || 'Error interno del servidor' })
  }
})

// 2. Eliminar usuario de forma permanente y en cascada (borrando dependencias primero)
adminRouter.post('/eliminar-usuario', async (req, res) => {
  try {
    const { userId } = req.body

    if (!userId) {
      return res.status(400).json({ error: 'userId es obligatorio' })
    }

    const supabaseAdmin = getSupabaseAdmin()

    // A. Eliminar en cascada de todas las tablas dependientes para evitar errores de Foreign Key
    const tablasDependientes = [
      { tabla: 'message_likes', col: 'user_id' },
      { tabla: 'messages', col: 'user_id' },
      { tabla: 'checkins', col: 'user_id' },
      { tabla: 'pvp_partidas', col: 'creador_id' },
      { tabla: 'pvp_partidas', col: 'oponente_id' },
      { tabla: 'pvp_blackjack', col: 'creador_id' },
      { tabla: 'pvp_blackjack', col: 'oponente_id' },
      { tabla: 'reto_completado', col: 'user_id' },
      { tabla: 'achievements', col: 'user_id' },
      { tabla: 'login_records', col: 'user_id' },
      { tabla: 'arcade_scores', col: 'user_id' },
      { tabla: 'juegos_puntuaciones', col: 'user_id' },
      { tabla: 'apuntes', col: 'user_id' }
    ]

    for (const dep of tablasDependientes) {
      try {
        await supabaseAdmin.from(dep.tabla).delete().eq(dep.col, userId)
      } catch (errDep) {
        // Continuar si la tabla no existe aún
      }
    }

    // B. Borrar perfil de la tabla profiles
    const { error: errorProfile } = await supabaseAdmin
      .from('profiles')
      .delete()
      .eq('id', userId)

    if (errorProfile) {
      console.error('Error al borrar perfil en Supabase:', errorProfile)
      return res.status(500).json({ error: errorProfile.message })
    }

    // C. Intentar borrar de auth.users si existe con los permisos de servicio
    try {
      if (supabaseAdmin.auth && supabaseAdmin.auth.admin) {
        await supabaseAdmin.auth.admin.deleteUser(userId)
      }
    } catch (errAuth) {
      console.warn('Aviso: No se pudo borrar de auth.users (posible usuario sin auth):', errAuth.message)
    }

    return res.json({
      success: true,
      mensaje: `Usuario ${userId} eliminado permanentemente de la base de datos.`
    })
  } catch (err) {
    console.error('Catch en /eliminar-usuario:', err)
    return res.status(500).json({ error: err.message || 'Error interno del servidor' })
  }
})
