# Racha de Clase - Manual del proyecto

## Arquitectura

- Frontend: Vite + React + Tailwind en `frontend/`
- Backend: Express en `server/` con Supabase + Pinecone
- DB principal: Supabase Postgres
- Schema: `database.sql`
- Diseño Apple: skill `apple-design` en `.agents/skills/`

## Reglas de diseño

Antes de crear cualquier UI, cargar desde `.agents/skills/apple-design/references/hig/`:
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

## Base de datos

Ejecutar `database.sql` en Supabase SQL Editor. Las tablas:
- profiles, checkins, messages, message_likes, apuntes, retos, reto_completado, achievements
- RL habilitado, trigger de racha automatico

## Auth

- Login via Google OAuth (Supabase Auth)
- No hay registro separado: se crea perfil en profiles al primer checkin
- Código de clase para moderador: setear `rol = 'moderador'` en Supabase

## API endpoints

- `POST /api/apuntes/subir` - subir apunte con embedding
- `GET /api/apuntes/buscar?query=...` - busqueda semantica
- Todos los datos del chat, check-in, ranking van por Supabase directo desde el frontend

## Notas

- Node.js debe estar en PATH: `C:\Users\smrt210\AppData\Local\Temp\opencode\node\node-v24.19.0-win-x64\bin`
- Las credenciales van en `.env` (NO commitear)
- Pinecone solo se usa para embeddings de apuntes, no para puntos ni rachas
