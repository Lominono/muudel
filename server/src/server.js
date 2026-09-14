import express from 'express'
import cors from 'cors'
import { config } from '../config/env.js'
import { apuntesRouter } from '../routes/apuntes.js'

const app = express()

app.use(cors({ origin: 'http://localhost:5173' }))
app.use(express.json())
app.use('/api/apuntes', apuntesRouter)

app.get('/api/health', (_req, res) => {
  res.json({ estado: 'ok' })
})

app.listen(config.port, () => {
  console.log(`Servidor corriendo en puerto ${config.port}`)
})
