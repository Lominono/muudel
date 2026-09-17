# muudel

Web para tu clase: asistencia a las 15:30, rachas, canjes de recompensas, podio y chat entre colegas. Diseño sobrio Apple.

## Stack

- Frontend: Vite + React + Tailwind
- Backend: Express + Supabase (Postgres, Auth, Realtime)
- Cuaderno de apuntes: Base de datos Postgres en Supabase
- Diseño: Apple HIG (skill apple-design en .opencode/skills/)

## Instalar

```bash
cd frontend && npm install && npm run dev
cd server && npm install && npm run dev
```

## Archivos clave

- database.sql - Schema Supabase completo
- server/ - API Express
- frontend/src/ - App React
- .opencode/skills/apple-design - Skill de diseño Apple HIG

## Uso

1. Ejecutar database.sql en Supabase
2. Copiar .env.example a .env y poner claves
3. npm run dev
