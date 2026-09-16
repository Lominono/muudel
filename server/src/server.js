import express from 'express'
import cors from 'cors'
import path from 'path'
import { fileURLToPath } from 'url'
import { config } from '../config/env.js'
import { apuntesRouter } from '../routes/apuntes.js'

const app = express()

app.use(cors({ origin: true }))
app.use(express.json())
app.use('/api/apuntes', apuntesRouter)

app.get('/api/health', (_req, res) => {
  res.json({ estado: 'ok' })
})

// Servir estáticos del frontend si existen
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const distPath = path.resolve(__dirname, '../../frontend/dist')

app.use(express.static(distPath))

app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) return next()
  res.sendFile(path.join(distPath, 'index.html'), (err) => {
    if (err) next()
  })
})

const start = () => {
  app.listen(config.port, () => {
    console.log(`Servidor corriendo en puerto ${config.port}`)
  })
}

if (process.env.MODE !== 'vercel') {
  start()
}

export default app
