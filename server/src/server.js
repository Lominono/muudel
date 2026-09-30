import express from 'express'
import cors from 'cors'
import path from 'path'
import { fileURLToPath } from 'url'
import { config } from '../config/env.js'
import { apuntesRouter } from '../routes/apuntes.js'
import { ruletaRouter } from '../routes/ruleta.js'
import { adminRouter } from '../routes/admin.js'

const app = express()

app.use(cors({ origin: true }))
app.use(express.json())
app.use('/api/apuntes', apuntesRouter)
app.use('/api/ruleta', ruletaRouter)
app.use('/api/admin', adminRouter)

app.get('/api/health', (_req, res) => {
  res.json({ estado: 'ok' })
})

import fs from 'fs'

// Servir estáticos del frontend si existen
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootDistPath = path.resolve(__dirname, '../../dist')
const frontendDistPath = path.resolve(__dirname, '../../frontend/dist')
const distPath = fs.existsSync(rootDistPath) ? rootDistPath : frontendDistPath

app.use(express.static(distPath))

// Endpoint explícito para el Service Worker de OneSignal
app.get('/OneSignalSDKWorker.js', (_req, res) => {
  res.setHeader('Content-Type', 'application/javascript; charset=utf-8')
  res.setHeader('Service-Worker-Allowed', '/')
  res.setHeader('Cache-Control', 'public, max-age=0, must-revalidate')
  const workerFile = path.join(distPath, 'OneSignalSDKWorker.js')
  if (fs.existsSync(workerFile)) {
    res.sendFile(workerFile)
  } else {
    res.send('importScripts("https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.sw.js");')
  }
})

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

if (process.env.MODE !== 'vercel' && !process.env.VERCEL) {
  start()
}

export default app
