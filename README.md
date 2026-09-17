# muudel

Web para tu clase: check-in diario, rachas, puntos, ranking y chat. Sin IA de por medio, diseño Apple.

## Stack

- Frontend: Vite + React + Tailwind
- Backend: Express + Supabase (Postgres, Auth, Realtime)
- IA solo para busqueda semantica de apuntes: Pinecone + OpenAI embeddings
- Diseño: Apple HIG (skill apple-design en .opencode/skills/)

## Instalar

```bash
cd frontend && npm install && npm run dev
cd server && npm install && npm run dev
```

## Archivos clave

- database.sql - Schema Supabase completo
- server/ - API Express + Pinecone
- frontend/src/ - App React
- .opencode/skills/apple-design - Skill de diseño Apple HIG

## Uso

1. Ejecutar database.sql en Supabase
2. Copiar .env.example a .env y poner claves
3. npm run dev
