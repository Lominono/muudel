import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const frontendDist = path.join(__dirname, 'dist')
const rootDist = path.resolve(__dirname, '../dist')

// Copy completely so both directories always have the latest build
if (fs.existsSync(rootDist)) {
  fs.cpSync(rootDist, frontendDist, { recursive: true, force: true })
} else if (fs.existsSync(frontendDist)) {
  fs.cpSync(frontendDist, rootDist, { recursive: true, force: true })
}

const content = `import app from '../../server/src/server.js'
export default app
`

for (const dir of [rootDist, frontendDist]) {
  if (fs.existsSync(dir)) {
    fs.writeFileSync(path.join(dir, 'server.js'), content)
    fs.writeFileSync(path.join(dir, 'index.js'), content)
  }
}

console.log('✓ Both dist directories (root dist/ and frontend/dist/) fully synchronized')
