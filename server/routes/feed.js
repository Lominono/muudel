// server/routes/feed.js
import { Router } from 'express'
import { createClient } from '@supabase/supabase-js'
import { config } from '../config/env.js'

export const feedRouter = Router()

const ADMIN_LOMINONO_ID = '00000000-0000-4000-a000-000000000001'

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

// 1. Obtener posts del feed con perfiles de alumnos y administración
feedRouter.get('/posts', async (req, res) => {
  try {
    const supabaseAdmin = getSupabaseAdmin()
    const { data: posts, error } = await supabaseAdmin
      .from('feed_posts')
      .select(`
        id, categoria, titulo, contenido, likes_count, created_at, es_admin, fijado,
        profiles (id, nombre, username, color_acento, rol, avatar_emoji)
      `)
      .eq('soft_deleted', false)
      .order('created_at', { ascending: false })
      .limit(60)

    if (error) {
      console.warn('Aviso al leer feed_posts en API, intentando fallback sin soft_deleted:', error.message)
      const { data: postsFallback, error: errFallback } = await supabaseAdmin
        .from('feed_posts')
        .select(`
          id, categoria, titulo, contenido, likes_count, created_at, es_admin,
          profiles (id, nombre, username, color_acento, rol, avatar_emoji)
        `)
        .order('created_at', { ascending: false })
        .limit(60)

      if (!errFallback && postsFallback) {
        return res.json({ success: true, posts: postsFallback })
      }
      return res.status(500).json({ error: error.message })
    }

    return res.json({ success: true, posts: posts || [] })
  } catch (err) {
    console.error('Catch en GET /api/feed/posts:', err)
    return res.status(500).json({ error: err.message || 'Error interno del servidor' })
  }
})

// 2. Publicar un nuevo post en el feed (estudiante o administración)
feedRouter.post('/publicar', async (req, res) => {
  try {
    const { user_id, categoria, titulo, contenido, es_admin } = req.body

    const contenidoLimpio = (contenido || '').trim()
    if (!contenidoLimpio) {
      return res.status(400).json({ error: 'El contenido del post no puede estar vacío' })
    }

    const supabaseAdmin = getSupabaseAdmin()

    // Si no viene user_id o es_admin, verificar o asignar admin ID
    let autorId = user_id
    if (!autorId || es_admin) {
      // Buscar perfil de moderador
      const { data: adminProf } = await supabaseAdmin
        .from('profiles')
        .select('id')
        .eq('rol', 'moderador')
        .limit(1)
        .maybeSingle()
      autorId = adminProf?.id || ADMIN_LOMINONO_ID
    }

    const categoriaFinal = categoria || 'General'
    const tituloFinal = (titulo || contenidoLimpio.split('\n')[0].substring(0, 70)).trim()

    const { data: nuevoPost, error } = await supabaseAdmin
      .from('feed_posts')
      .insert({
        user_id: autorId,
        categoria: categoriaFinal,
        titulo: tituloFinal,
        contenido: contenidoLimpio,
        es_admin: Boolean(es_admin)
      })
      .select(`
        id, categoria, titulo, contenido, likes_count, created_at, es_admin,
        profiles (id, nombre, username, color_acento, rol, avatar_emoji)
      `)
      .single()

    if (error) {
      console.error('Error insertando feed_post en API:', error)
      return res.status(500).json({ error: error.message })
    }

    return res.json({ success: true, post: nuevoPost })
  } catch (err) {
    console.error('Catch en POST /api/feed/publicar:', err)
    return res.status(500).json({ error: err.message || 'Error interno del servidor' })
  }
})

// 3. Eliminar post (por el moderador o el propio autor)
feedRouter.post('/eliminar', async (req, res) => {
  try {
    const { postId, userId } = req.body
    if (!postId) {
      return res.status(400).json({ error: 'postId es requerido' })
    }

    const supabaseAdmin = getSupabaseAdmin()

    // Marcar como soft_deleted o eliminar
    const { error } = await supabaseAdmin
      .from('feed_posts')
      .update({ soft_deleted: true })
      .eq('id', postId)

    if (error) {
      // Intentar borrado físico si soft_deleted no existe en el schema actual
      await supabaseAdmin.from('feed_posts').delete().eq('id', postId)
    }

    return res.json({ success: true, mensaje: 'Post eliminado correctamente' })
  } catch (err) {
    console.error('Catch en POST /api/feed/eliminar:', err)
    return res.status(500).json({ error: err.message || 'Error interno del servidor' })
  }
})

// 4. Toggle Like en post
feedRouter.post('/like', async (req, res) => {
  try {
    const { postId, userId, darLike } = req.body
    if (!postId || !userId) {
      return res.status(400).json({ error: 'postId y userId son requeridos' })
    }

    const supabaseAdmin = getSupabaseAdmin()

    if (darLike) {
      try {
        await supabaseAdmin
          .from('feed_post_likes')
          .upsert({ post_id: postId, user_id: userId })
      } catch (_) {}
    } else {
      try {
        await supabaseAdmin
          .from('feed_post_likes')
          .delete()
          .match({ post_id: postId, user_id: userId })
      } catch (_) {}
    }

    // Contar likes reales
    const { count } = await supabaseAdmin
      .from('feed_post_likes')
      .select('*', { count: 'exact', head: true })
      .eq('post_id', postId)

    const totalLikes = count ?? 0

    await supabaseAdmin
      .from('feed_posts')
      .update({ likes_count: totalLikes })
      .eq('id', postId)

    return res.json({ success: true, likes: totalLikes })
  } catch (err) {
    console.error('Catch en POST /api/feed/like:', err)
    return res.status(500).json({ error: err.message || 'Error interno del servidor' })
  }
})

// 5. Obtener comentarios de un post
feedRouter.get('/comentarios/:postId', async (req, res) => {
  try {
    const { postId } = req.params
    const supabaseAdmin = getSupabaseAdmin()

    const { data: comentarios, error } = await supabaseAdmin
      .from('feed_post_comments')
      .select(`
        id, post_id, contenido, created_at,
        profiles (id, nombre, username, color_acento, rol, avatar_emoji)
      `)
      .eq('post_id', postId)
      .eq('soft_deleted', false)
      .order('created_at', { ascending: true })

    if (error) {
      const { data: cFallback } = await supabaseAdmin
        .from('feed_post_comments')
        .select(`
          id, post_id, contenido, created_at,
          profiles (id, nombre, username, color_acento, rol, avatar_emoji)
        `)
        .eq('post_id', postId)
        .order('created_at', { ascending: true })

      return res.json({ success: true, comentarios: cFallback || [] })
    }

    return res.json({ success: true, comentarios: comentarios || [] })
  } catch (err) {
    return res.json({ success: true, comentarios: [] })
  }
})

// 6. Añadir comentario a un post
feedRouter.post('/comentar', async (req, res) => {
  try {
    const { postId, userId, contenido } = req.body
    const texto = (contenido || '').trim()

    if (!postId || !userId || !texto) {
      return res.status(400).json({ error: 'postId, userId y contenido son requeridos' })
    }

    const supabaseAdmin = getSupabaseAdmin()

    const { data: comentario, error } = await supabaseAdmin
      .from('feed_post_comments')
      .insert({
        post_id: postId,
        user_id: userId,
        contenido: texto
      })
      .select(`
        id, post_id, contenido, created_at,
        profiles (id, nombre, username, color_acento, rol, avatar_emoji)
      `)
      .single()

    if (error) {
      console.warn('Aviso al insertar comentario:', error.message)
      return res.status(500).json({ error: error.message })
    }

    return res.json({ success: true, comentario })
  } catch (err) {
    console.error('Catch en POST /api/feed/comentar:', err)
    return res.status(500).json({ error: err.message || 'Error interno' })
  }
})
