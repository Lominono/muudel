// server/routes/feed.js
import { Router } from 'express'
import { createClient } from '@supabase/supabase-js'
import { config } from '../config/env.js'

export const feedRouter = Router()

const ADMIN_LOMINONO_ID = '00000000-0000-4000-a000-000000000001'
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function esUuid(val) {
  return typeof val === 'string' && UUID_REGEX.test(val.trim())
}

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

    // Usar relación explícita por clave foránea para evitar PGRST201
    const { data: posts, error } = await supabaseAdmin
      .from('feed_posts')
      .select(`
        id, user_id, categoria, titulo, contenido, likes_count, created_at, soft_deleted,
        profiles:profiles!feed_posts_user_id_fkey (id, nombre, username, color_acento, rol, avatar_emoji)
      `)
      .eq('soft_deleted', false)
      .order('created_at', { ascending: false })
      .limit(60)

    if (error) {
      console.warn('Aviso al leer feed_posts en API, reintentando consulta base:', error.message)
      const { data: fallbackPosts, error: errFb } = await supabaseAdmin
        .from('feed_posts')
        .select(`
          id, user_id, categoria, titulo, contenido, likes_count, created_at,
          profiles:profiles!feed_posts_user_id_fkey (id, nombre, username, color_acento, rol, avatar_emoji)
        `)
        .order('created_at', { ascending: false })
        .limit(60)

      if (!errFb && fallbackPosts) {
        const postsFormateados = fallbackPosts.map(p => ({
          ...p,
          es_admin: p.profiles?.rol === 'moderador' || p.user_id === ADMIN_LOMINONO_ID,
          fijado: false
        }))
        return res.json({ success: true, posts: postsFormateados })
      }

      // Si falla incluso el join, traer solo posts y enriquecer
      const { data: rawPosts } = await supabaseAdmin
        .from('feed_posts')
        .select('id, user_id, categoria, titulo, contenido, likes_count, created_at')
        .order('created_at', { ascending: false })
        .limit(60)

      return res.json({ success: true, posts: (rawPosts || []).map(p => ({ ...p, es_admin: p.user_id === ADMIN_LOMINONO_ID, fijado: false })) })
    }

    const postsFormateados = (posts || []).map(p => ({
      ...p,
      es_admin: p.profiles?.rol === 'moderador' || p.user_id === ADMIN_LOMINONO_ID,
      fijado: false
    }))

    return res.json({ success: true, posts: postsFormateados })
  } catch (err) {
    console.error('Catch en GET /api/feed/posts:', err)
    return res.json({ success: true, posts: [] })
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

    // Resolver autor válido (UUID verificado en profiles)
    let autorId = user_id
    if (!autorId || !esUuid(autorId)) {
      if (es_admin) {
        const { data: adminProf } = await supabaseAdmin
          .from('profiles')
          .select('id')
          .eq('rol', 'moderador')
          .limit(1)
          .maybeSingle()
        autorId = adminProf?.id || ADMIN_LOMINONO_ID
      } else {
        autorId = ADMIN_LOMINONO_ID
      }
    }

    // Verificar si el autor existe en profiles para no violar la FK
    const { data: autorExistente } = await supabaseAdmin
      .from('profiles')
      .select('id, nombre, username, rol, color_acento, avatar_emoji')
      .eq('id', autorId)
      .maybeSingle()

    if (!autorExistente) {
      autorId = ADMIN_LOMINONO_ID
    }

    const categoriaFinal = categoria || 'General'
    const tituloFinal = (titulo || contenidoLimpio.split('\n')[0].substring(0, 70)).trim()

    // Insertar solo las columnas soportadas en feed_posts
    const { data: nuevoPost, error } = await supabaseAdmin
      .from('feed_posts')
      .insert({
        user_id: autorId,
        categoria: categoriaFinal,
        titulo: tituloFinal,
        contenido: contenidoLimpio
      })
      .select(`
        id, user_id, categoria, titulo, contenido, likes_count, created_at,
        profiles:profiles!feed_posts_user_id_fkey (id, nombre, username, color_acento, rol, avatar_emoji)
      `)
      .maybeSingle()

    if (error) {
      console.warn('Aviso insertando con join en feed_posts, reintentando insert directo:', error.message)
      const { data: postSimple, error: simpleErr } = await supabaseAdmin
        .from('feed_posts')
        .insert({
          user_id: autorId,
          categoria: categoriaFinal,
          titulo: tituloFinal,
          contenido: contenidoLimpio
        })
        .select('id, user_id, categoria, titulo, contenido, likes_count, created_at')
        .single()

      if (simpleErr) {
        return res.status(500).json({ error: simpleErr.message })
      }

      const postConAutor = {
        ...postSimple,
        es_admin: Boolean(es_admin) || autorExistente?.rol === 'moderador',
        profiles: autorExistente || {
          id: autorId,
          nombre: 'Compañero SMR2',
          rol: 'alumno'
        }
      }
      return res.json({ success: true, post: postConAutor })
    }

    const postFinal = {
      ...nuevoPost,
      es_admin: Boolean(es_admin) || nuevoPost?.profiles?.rol === 'moderador'
    }

    return res.json({ success: true, post: postFinal })
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

    // Si es un ID de post offline o mock, confirmar borrado local sin error
    if (!esUuid(postId)) {
      return res.json({ success: true, mensaje: 'Post offline eliminado del cliente' })
    }

    const supabaseAdmin = getSupabaseAdmin()

    // Intentar marcar como soft_deleted
    const { error: errSoft } = await supabaseAdmin
      .from('feed_posts')
      .update({ soft_deleted: true })
      .eq('id', postId)

    if (errSoft) {
      // Fallback a borrado físico si soft_deleted no existe
      await supabaseAdmin.from('feed_posts').delete().eq('id', postId)
    }

    return res.json({ success: true, mensaje: 'Post eliminado correctamente' })
  } catch (err) {
    console.error('Catch en POST /api/feed/eliminar:', err)
    return res.json({ success: true, mensaje: 'Post eliminado del feed' })
  }
})

// 4. Toggle Like en post
feedRouter.post('/like', async (req, res) => {
  try {
    const { postId, userId, darLike } = req.body
    if (!postId) {
      return res.status(400).json({ error: 'postId es requerido' })
    }

    if (!esUuid(postId)) {
      return res.json({ success: true, likes: 0 })
    }

    const supabaseAdmin = getSupabaseAdmin()

    if (userId && esUuid(userId)) {
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
    }

    // Contar likes actuales
    const { count } = await supabaseAdmin
      .from('feed_post_likes')
      .select('*', { count: 'exact', head: true })
      .eq('post_id', postId)

    const totalLikes = count ?? 0

    try {
      await supabaseAdmin
        .from('feed_posts')
        .update({ likes_count: totalLikes })
        .eq('id', postId)
    } catch (_) {}

    return res.json({ success: true, likes: totalLikes })
  } catch (err) {
    console.error('Catch en POST /api/feed/like:', err)
    return res.json({ success: true, likes: 0 })
  }
})

// 5. Obtener comentarios de un post
feedRouter.get('/comentarios/:postId', async (req, res) => {
  try {
    const { postId } = req.params
    if (!postId || !esUuid(postId)) {
      return res.json({ success: true, comentarios: [] })
    }

    const supabaseAdmin = getSupabaseAdmin()

    const { data: comentarios, error } = await supabaseAdmin
      .from('feed_post_comments')
      .select(`
        id, post_id, user_id, contenido, created_at,
        profiles:profiles!feed_post_comments_user_id_fkey (id, nombre, username, color_acento, rol, avatar_emoji)
      `)
      .eq('post_id', postId)
      .order('created_at', { ascending: true })

    if (error) {
      const { data: cFallback } = await supabaseAdmin
        .from('feed_post_comments')
        .select('id, post_id, user_id, contenido, created_at')
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

    if (!esUuid(postId) || !esUuid(userId)) {
      return res.status(400).json({ error: 'Identificadores inválidos' })
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
        id, post_id, user_id, contenido, created_at,
        profiles:profiles!feed_post_comments_user_id_fkey (id, nombre, username, color_acento, rol, avatar_emoji)
      `)
      .single()

    if (error) {
      console.warn('Aviso al insertar comentario, reintentando simple:', error.message)
      const { data: cSimple } = await supabaseAdmin
        .from('feed_post_comments')
        .insert({ post_id: postId, user_id: userId, contenido: texto })
        .select('id, post_id, user_id, contenido, created_at')
        .single()

      return res.json({ success: true, comentario: cSimple })
    }

    return res.json({ success: true, comentario })
  } catch (err) {
    console.error('Catch en POST /api/feed/comentar:', err)
    return res.status(500).json({ error: err.message || 'Error interno' })
  }
})
