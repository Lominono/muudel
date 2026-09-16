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

router.post('/subir', checkAuth, async (req, res) => {
  try {
    const { titulo, materia, texto, userId } = req.body
    if (!titulo || !materia) {
      return res.status(400).json({ error: 'Faltan título y materia' })
    }

    const supabase = getSupabaseClient()
    const index = getPineconeIndex()
    const embedding = await getEmbedding(`${titulo} ${texto || ''}`)

    const { data: apunte, error: dbError } = await supabase
      .from('apuntes')
      .insert({ titulo, materia, texto, user_id: userId })
      .select()
      .single()

    if (dbError) throw dbError

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

    res.json(apunte)
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
    const index = getPineconeIndex()
    const embedding = await getEmbedding(query)

    const results = await index.namespace('apuntes').query({
      vector: embedding,
      topK: 5,
      includeMetadata: true,
    })

    const apuntes = await supabase
      .from('apuntes')
      .select('*')
      .in('id', results.matches.map(m => m.id))

    res.json({ resultados: results.matches, apuntes: apuntes.data })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

export { router as apuntesRouter }
