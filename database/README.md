# Schema Supabase - Muudel / Racha de Clase

### 🚀 Archivo Maestro Recomendado:
Para configurar o actualizar tu base de datos en Supabase en **un solo paso sin errores**:
👉 Abre tu proyecto en [Supabase](https://supabase.com) > **SQL Editor** > **New Query** > Pega y ejecuta el archivo:
### **`database/SETUP_DEFINITIVO_COMPLETO.sql`**

Este archivo es **100% idempotente y seguro**:
- Si la base de datos es nueva: crea todas las tablas, vistas, triggers y políticas RLS.
- Si ya tienes datos: añade las columnas que falten (`direct_messages`, `arcade_scores`, `pregunta_flash`, `skills`, `reacciones`) sin borrar ni sobreescribir tus datos existentes.

---

### Archivos modulares (históricos):

| Archivo | Contenido |
|---------|-----------|
| `SETUP_DEFINITIVO_COMPLETO.sql` | **Todo en uno: Tablas, RLS, Triggers, DMs, Vistas y Realtime** |
| `01_tables.sql` | Tablas iniciales + índices |
| `02_rls.sql` | Políticas RLS iniciales |
| `03_funciones_triggers.sql` | Funciones + triggers de rachas y perfiles |
| `04_vistas.sql` | ranking_diario, ranking_semanal |
| `05_feed_y_juegos.sql` | Tablas de feed escolar, likes y juegos arcade |
| `07_chat_mejoras.sql` | Menciones, fijados, anti-flood y canal de dudas |
| `08_skills_y_datos_reales.sql` | Pregunta flash, canjes, inventario, competencias técnicas (skills) |
| `09_direct_messages.sql` | Sistema de Mensajes Directos (DMs) privados 1 a 1 |

