# Schema Supabase - Racha de Clase

Archivos modulares para ejecutar en el SQL Editor de Supabase:

| Archivo | Contenido |
|---------|-----------|
| `01_tables.sql` | Todas las tablas iniciales + índices |
| `02_rls.sql` | Todas las políticas RLS iniciales |
| `03_funciones_triggers.sql` | Funciones + triggers de rachas y perfiles |
| `04_vistas.sql` | ranking_diario, ranking_semanal |
| `05_feed_y_juegos.sql` | Tablas de feed escolar, likes y juegos arcade |
| `07_chat_mejoras.sql` | Menciones, fijados, anti-flood y canal de dudas |
| `08_skills_y_datos_reales.sql` | Pregunta flash, canjes, inventario, competencias técnicas (skills), soluciones de dudas y puntuaciones reales |

Para actualizar una base existente con todas las mejoras de datos reales, ejecutar `08_skills_y_datos_reales.sql`.
