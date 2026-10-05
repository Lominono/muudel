// server/routes/chat.js
import { Router } from 'express'
import { createClient } from '@supabase/supabase-js'
import { config } from '../config/env.js'

export const chatRouter = Router()

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

/**
 * 1. GET /api/chat/mensajes?canal=general&limit=100
 * Retorna el historial de mensajes de un canal con perfiles vinculados
 */
chatRouter.get('/mensajes', async (req, res) => {
  try {
    const canal = (req.query.canal || 'general').trim().toLowerCase()
    const limit = Math.min(150, Math.max(1, Number(req.query.limit) || 100))
    const supabaseAdmin = getSupabaseAdmin()

    // Usar relación foránea explícita para evitar PGRST201
    const { data: mensajes, error } = await supabaseAdmin
      .from('messages')
      .select(`
        id, user_id, canal, texto, reply_to, reply_to_texto, reply_to_nombre,
        likes_count, es_solucion, fijado, soft_deleted, created_at,
        profiles:profiles!messages_user_id_fkey (id, nombre, username, color_acento, rol, digito_id, frase, avatar_emoji)
      `)
      .eq('canal', canal)
      .eq('soft_deleted', false)
      .order('created_at', { ascending: true })
      .limit(limit)

    if (error) {
      console.warn('Aviso cargando messages con join, fallback a select simple:', error.message)
      const { data: rawMsgs, error: rawErr } = await supabaseAdmin
        .from('messages')
        .select('*')
        .eq('canal', canal)
        .order('created_at', { ascending: true })
        .limit(limit)

      if (rawErr) {
        return res.json({ success: true, mensajes: [] })
      }
      return res.json({ success: true, mensajes: rawMsgs || [] })
    }

    const enriquecidos = (mensajes || []).map(m => ({
      ...m,
      nombre: m.profiles?.nombre || 'Compañero',
      username: m.profiles?.username || null,
      color_acento: m.profiles?.color_acento || '#0A84FF',
      rol: m.profiles?.rol || 'alumno',
      digito_id: m.profiles?.digito_id || null,
      titulo_vip: m.profiles?.frase || null
    }))

    return res.json({ success: true, mensajes: enriquecidos })
  } catch (err) {
    console.error('Catch en GET /api/chat/mensajes:', err)
    return res.json({ success: true, mensajes: [] })
  }
})

/**
 * 2. POST /api/chat/enviar
 * Envía un mensaje en el aula garantizando integridad y previniendo errores 409
 */
chatRouter.post('/enviar', async (req, res) => {
  try {
    const {
      canal,
      texto,
      userId,
      user_id,
      nombre,
      replyData,
      reply_to,
      es_autoria_humana
    } = req.body

    const textoLimpio = (texto || '').trim()
    if (!textoLimpio) {
      return res.status(400).json({ error: 'El texto del mensaje no puede estar vacío' })
    }

    const canalLimpio = (canal || 'general').trim().toLowerCase()
    const supabaseAdmin = getSupabaseAdmin()

    // 1. Resolver autor garantizado en profiles (evita 409 messages_user_id_fkey)
    let autorId = userId || user_id
    let autorPerfil = null

    if (autorId && esUuid(autorId)) {
      const { data: prof } = await supabaseAdmin
        .from('profiles')
        .select('id, nombre, username, color_acento, rol, digito_id, frase, avatar_emoji')
        .eq('id', autorId)
        .maybeSingle()
      autorPerfil = prof
    }

    if (!autorPerfil) {
      // Si el autorId no existía en profiles, provisionarlo de inmediato
      const targetId = (autorId && esUuid(autorId)) ? autorId : ADMIN_LOMINONO_ID
      const nomFinal = (nombre || 'Compañero SMR2').trim().slice(0, 30)

      try {
        const { data: nuevoProf } = await supabaseAdmin
          .from('profiles')
          .upsert({
            id: targetId,
            nombre: nomFinal,
            rol: targetId === ADMIN_LOMINONO_ID ? 'moderador' : 'alumno'
          })
          .select('id, nombre, username, color_acento, rol, digito_id, frase, avatar_emoji')
          .maybeSingle()
        autorPerfil = nuevoProf
        autorId = targetId
      } catch (_) {
        autorId = ADMIN_LOMINONO_ID
      }
    }

    // 2. Resolver reply_to seguro (evita 409 messages_reply_to_fkey)
    let replyIdValido = null
    const replyTargetId = replyData?.id || reply_to

    if (replyTargetId && esUuid(replyTargetId)) {
      // Verificar si realmente existe en messages antes de vincular FK
      const { data: existeMsg } = await supabaseAdmin
        .from('messages')
        .select('id')
        .eq('id', replyTargetId)
        .maybeSingle()

      if (existeMsg) {
        replyIdValido = replyTargetId
      }
    }

    // 3. Insertar el mensaje de forma segura con Service Role
    const payloadInsert = {
      user_id: autorId,
      canal: canalLimpio,
      texto: textoLimpio,
      reply_to: replyIdValido,
      reply_to_texto: replyData?.texto || '',
      reply_to_nombre: replyData?.nombre || '',
      es_autoria_humana: es_autoria_humana !== false
    }

    const { data: mensajeCreado, error: errInsert } = await supabaseAdmin
      .from('messages')
      .insert(payloadInsert)
      .select(`
        id, user_id, canal, texto, reply_to, reply_to_texto, reply_to_nombre,
        likes_count, es_solucion, fijado, soft_deleted, created_at,
        profiles:profiles!messages_user_id_fkey (id, nombre, username, color_acento, rol, digito_id, frase, avatar_emoji)
      `)
      .maybeSingle()

    if (errInsert) {
      console.warn('Aviso insertando mensaje con join, aplicando insert resiliente:', errInsert.message)

      // Fallback sin reply_to por si hubiese algún conflicto residual
      const { data: simpleMsg, error: errSimple } = await supabaseAdmin
        .from('messages')
        .insert({
          user_id: autorId,
          canal: canalLimpio,
          texto: textoLimpio,
          reply_to: null,
          es_autoria_humana: true
        })
        .select('*')
        .single()

      if (errSimple) {
        console.error('Error final en insert messages:', errSimple)
        return res.status(500).json({ error: errSimple.message })
      }

      const mensajeFormateado = {
        ...simpleMsg,
        nombre: autorPerfil?.nombre || 'Compañero',
        username: autorPerfil?.username || null,
        color_acento: autorPerfil?.color_acento || '#0A84FF',
        rol: autorPerfil?.rol || 'alumno',
        digito_id: autorPerfil?.digito_id || null,
        titulo_vip: autorPerfil?.frase || null
      }

      return res.json({ success: true, message: mensajeFormateado })
    }

    const mensajeFormateado = {
      ...mensajeCreado,
      nombre: mensajeCreado?.profiles?.nombre || autorPerfil?.nombre || 'Compañero',
      username: mensajeCreado?.profiles?.username || autorPerfil?.username || null,
      color_acento: mensajeCreado?.profiles?.color_acento || autorPerfil?.color_acento || '#0A84FF',
      rol: mensajeCreado?.profiles?.rol || autorPerfil?.rol || 'alumno',
      digito_id: mensajeCreado?.profiles?.digito_id || autorPerfil?.digito_id || null,
      titulo_vip: mensajeCreado?.profiles?.frase || autorPerfil?.frase || null
    }

    return res.json({ success: true, message: mensajeFormateado })
  } catch (err) {
    console.error('Catch en POST /api/chat/enviar:', err)
    return res.status(500).json({ error: err.message || 'Error interno al enviar mensaje' })
  }
})

/**
 * 3. POST /api/chat/eliminar
 * Elimina un mensaje del chat (borrado lógico)
 */
chatRouter.post('/eliminar', async (req, res) => {
  try {
    const { messageId, userId } = req.body
    if (!messageId || !esUuid(messageId)) {
      return res.status(400).json({ error: 'messageId inválido' })
    }

    const supabaseAdmin = getSupabaseAdmin()
    const { error: errSoft } = await supabaseAdmin
      .from('messages')
      .update({ soft_deleted: true })
      .eq('id', messageId)

    if (errSoft) {
      await supabaseAdmin.from('messages').delete().eq('id', messageId)
    }

    return res.json({ success: true, mensaje: 'Mensaje eliminado correctamente' })
  } catch (err) {
    return res.json({ success: true, mensaje: 'Mensaje procesado' })
  }
})
