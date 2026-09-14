# Racha de Clase - Manual del proyecto

## Arquitectura

- Frontend: Vite + React + Tailwind (CDN) en `frontend/`
- Backend: Express en `server/` con Supabase + Pinecone
- DB principal: Supabase Postgres
- Schema: `database.sql` + `database/` (4 archivos separados)
- Diseño Apple: skill `apple-design` en `.opencode/skills/`
- Deploy: Vercel (frontend estático) + Express (API)

## Reglas de diseño

Antes de crear cualquier UI, cargar desde `.opencode/skills/apple-design/references/hig/`:
- Siempre: `accessibility.md`, `layout.md`, `typography.md`, `color.md`
- Si hay tabs: `tab-bars.md`
- Si hay listas: `lists-and-tables.md`
- Si hay dark mode: `dark-mode.md`
- Si hay barra flotante: `liquid-glass.md`

## Principios anti-IA

- No usar gradientes morados ni glassmorphism en contenido
- No usar Inter como tipografia principal
- No usar emojis 3D como decoracion
- Un solo elemento memorable (sello PRESENTE, llama de racha)
- Palabras planas: tinta, papel, rojo corrector, azul sistema
- Nada de "seamless", "leverage", "optimize" en el codigo

## Comandos utiles

- `npm run dev` desde `frontend/` o `server/` para levantar
- `node --watch src/server.js` desde `server/` para el API
- Frontend: `http://localhost:5173`
- API: `http://localhost:3001`
- Build producci\u00f3n: `cd frontend && node node_modules/vite/bin/vite.js build`

## Base de datos

Schema: `database.sql` incluye todos los archivos en orden.
4 archivos l\u00f3gicos en `database/`:
- `01_tables.sql` - todas las tablas + \u00edndices
- `02_rls.sql` - todas las políticas RLS
- `03_funciones_triggers.sql` - funciones + triggers
- `04_vistas.sql` - ranking_diario, ranking_semanal

Tablas: profiles, checkins, messages, message_likes, apuntes, retos, reto_completado, achievements
Trigger `on_auth_user_created` auto-crea perfil al hacer login
Función `increment_likes` para sumar likes
Trigger `trg_checkin_after_insert` actualiza racha automáticamente

## Auth

- Login via Google OAuth (Supabase Auth)
- Al hacer login se crea automáticamente el perfil en `profiles`
- No hay registro separado
- Código de clase para moderador: setear `rol = 'moderador'` en Supabase

## API endpoints

- `POST /api/apuntes/subir` - subir apunte con embedding (requiere Bearer token)
- `GET /api/apuntes/buscar?query=...` - busqueda semantica Pinecone
- Todos los datos del chat, check-in, ranking van por Supabase directo desde el frontend

## Vercel Deploy

1. Subir repo a GitHub
2. Conectar en Vercel
3. Agregar variables de entorno: VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, SUPABASE_SERVICE_KEY, PINECONE_API_KEY, OPENAI_API_KEY
4. `vercel.json` configura rutas: `/api/*` → server, todo lo demás → frontend/dist/index.html
5. Build: `cd frontend && npm install && npm run build`
6. El Express en Vercel exporta `app` desde `server/src/server.js`

## Notas

- Las credenciales van en `.env` (NO commitear)
- Pinecone solo se usa para embeddings de apuntes, no para puntos ni rachas
- Tailwind CSS usa CDN (`cdn.tailwindcss.com`), no build
- Node.js disponible en: `C:\Users\smrt210\AppData\Local\Temp\opencode\node\node-v24.19.0-win-x64\bin`
- El build de producción funciona correctamente
