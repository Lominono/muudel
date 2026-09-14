import { Router } from 'express'
import { createClient } from '@supabase/supabase-js'
import { Pinecone } from '@pinecone-database/pinecone'
import { config } from '../config/env.js'

const router = Router()
const supabase = createClient(config.supabaseUrl, config.supabaseServiceKey)
const pc = new Pinecone({ apiKey: config.pineconeApiKey })
const index = pc.index(config.pineconeIndexName)

const embeddingModel = 'text-embedding-3-small'
const openaiKey = process.env.OPENAI_API_KEY

async function getEmbedding(text) {
  const resp = await fetch(`https://api.openai.com/v1/embeddings`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${openaiKey}`,
    },
    body: JSON.stringify({ model: embeddingModel, input: text }),
  })
  const data = await resp.json()
  return data.data[0].embedding
}

router.post('/subir', async (req, res) => {
  try {
    const { titulo, materia, texto, userId } = req.body
    const embedding = await getEmbedding(`${titulo} ${texto}`)

    const { data: apunte, error } = await supabase
      .from('apuntes')
      .insert({ titulo, materia, texto, user_id: userId })
      .select()
      .single()

    if (error) throw error

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
