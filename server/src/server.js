import express from 'express'
import cors from 'cors'
import { config } from '../config/env.js'
import { apuntesRouter } from '../routes/apuntes.js'

const app = express()

app.use(cors({ origin: true }))
app.use(express.json())
app.use('/api/apuntes', apuntesRouter)

app.get('/api/health', (_req, res) => {
  res.json({ estado: 'ok' })
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
