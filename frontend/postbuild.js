import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const distDir = path.join(__dirname, 'dist')
const serverFile = path.join(distDir, 'server.js')
const indexFile = path.join(distDir, 'index.js')

const content = `import app from '../../server/src/server.js'
export default app
`

if (fs.existsSync(distDir)) {
  fs.writeFileSync(serverFile, content)
  fs.writeFileSync(indexFile, content)
  console.log('✓ Server entrypoints (server.js & index.js) generated in dist/')
}
