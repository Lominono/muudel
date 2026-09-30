import { Router } from 'express'
import { createClient } from '@supabase/supabase-js'
import { Pinecone } from '@pinecone-database/pinecone'
import { config } from '../config/env.js'

const router = Router()

const embeddingModel = 'text-embedding-3-small'

function getSupabaseClient() {
  if (!config.supabaseUrl || !config.supabaseServiceKey) {
    throw new Error('SUPABASE_URL o SUPABASE_SERVICE_KEY no configuradas en el servidor')
  }
  return createClient(config.supabaseUrl.trim(), config.supabaseServiceKey.trim())
}

function getPineconeIndex() {
  if (!config.pineconeApiKey) {
    throw new Error('PINECONE_API_KEY no configurada en el servidor')
  }
  const pc = new Pinecone({ apiKey: config.pineconeApiKey.trim() })
  return pc.index(config.pineconeIndexName)
}

function checkAuth(req, res, next) {
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Sin autorización' })
  }
  next()
}

async function getEmbedding(text) {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY no configurada')
  }
  const resp = await fetch(`https://api.openai.com/v1/embeddings`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.OPENAI_API_KEY.trim()}`,
    },
    body: JSON.stringify({ model: embeddingModel, input: text }),
  })
  if (!resp.ok) throw new Error('Error creando embedding')
  const data = await resp.json()
  return data.data[0].embedding
}

router.get('/', async (_req, res) => {
  try {
    const supabase = getSupabaseClient()
    const { data: apuntes, error } = await supabase
      .from('apuntes')
      .select('*, profiles(id, nombre, color_acento, digito_id, username)')
      .order('created_at', { ascending: false })

    if (error) throw error
    res.json({ apuntes: apuntes || [] })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.post('/subir', checkAuth, async (req, res) => {
  try {
    const { titulo, materia, texto, userId, file_url, file_name, file_size, oficial } = req.body
    if (!titulo || !materia) {
      return res.status(400).json({ error: 'Faltan título y materia' })
    }

    const supabase = getSupabaseClient()
    const insertPayload = {
      titulo: titulo.trim(),
      materia: materia.trim(),
      texto: texto ? texto.trim() : null,
      user_id: userId,
      file_url: file_url || null
    }

    const { data: apunte, error: dbError } = await supabase
      .from('apuntes')
      .insert(insertPayload)
      .select('*, profiles(id, nombre, color_acento, digito_id, username)')
      .single()

    if (dbError) throw dbError

    // Si existen claves configuradas de Pinecone, sincronizar de fondo de forma opcional
    if (config.pineconeApiKey && process.env.OPENAI_API_KEY) {
      try {
        const index = getPineconeIndex()
        const embedding = await getEmbedding(`${titulo} ${texto || ''}`)
        await index.namespace('apuntes').upsert([
          {
            id: apunte.id,
            values: embedding,
            metadata: {
              supabase_apunte_id: apunte.id,
              materia,
              autor: userId,
              fecha: new Date().toISOString(),
            },
          },
        ])
      } catch (e) {
        console.warn('Índice secundario no disponible:', e.message)
      }
    }

    res.json(apunte)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.put('/:id', checkAuth, async (req, res) => {
  try {
    const { id } = req.params
    const { titulo, materia, texto, file_url } = req.body
    const supabase = getSupabaseClient()

    const updatePayload = {}
    if (titulo) updatePayload.titulo = titulo.trim()
    if (materia) updatePayload.materia = materia.trim()
    if (texto !== undefined) updatePayload.texto = texto
    if (file_url !== undefined) updatePayload.file_url = file_url

    const { data: actualizado, error } = await supabase
      .from('apuntes')
      .update(updatePayload)
      .eq('id', id)
      .select('*, profiles(id, nombre, color_acento, digito_id, username)')
      .single()

    if (error) throw error
    res.json(actualizado)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.delete('/:id', checkAuth, async (req, res) => {
  try {
    const { id } = req.params
    const supabase = getSupabaseClient()

    const { error } = await supabase
      .from('apuntes')
      .delete()
      .eq('id', id)

    if (error) throw error

    if (config.pineconeApiKey) {
      try {
        const index = getPineconeIndex()
        await index.namespace('apuntes').deleteOne(id)
      } catch (_) {}
    }

    res.json({ ok: true, id })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.get('/buscar', async (req, res) => {
  try {
    const { query } = req.query
    if (!query || query.length < 2) {
      return res.status(400).json({ error: 'Buscar al menos 2 caracteres' })
    }

    const supabase = getSupabaseClient()
    const { data: apuntes, error } = await supabase
      .from('apuntes')
      .select('*')
      .or(`titulo.ilike.%${query}%,texto.ilike.%${query}%,materia.ilike.%${query}%`)
      .order('created_at', { ascending: false })
      .limit(20)

    if (error) throw error

    res.json({ apuntes: apuntes || [] })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

export { router as apuntesRouter }
