import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// Cargar explícitamente desde server/.env, .env en raíz y cwd
dotenv.config({ path: path.resolve(__dirname, '../.env') })
dotenv.config({ path: path.resolve(__dirname, '../../server/.env') })
dotenv.config({ path: path.resolve(__dirname, '../../.env') })
dotenv.config()

export const config = {
  port: process.env.PORT || 3001,
  supabaseUrl: process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || 'https://ehzekojovbxdkcmfbugc.supabase.co',
  supabaseServiceKey: process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_KEY || process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVoemVrb2pvdmJ4ZGtjbWZidWdjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4OTM4OTMxNCwiZXhwIjoyMTA0OTY1MzE0fQ.ujpjQYeH3hSScxF-duWme6SbxXz9CFsJsBadCyEoJaI',
  pineconeApiKey: process.env.PINECONE_API_KEY,
  pineconeIndexName: process.env.PINECONE_INDEX_NAME || 'clase-app',
  pineconeEnvironment: process.env.PINECONE_ENVIRONMENT || 'aws/us-east-1',
}
