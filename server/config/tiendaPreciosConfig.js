// server/config/tiendaPreciosConfig.js
/**
 * Configuración centralizada de precios de tienda y tramos económicos
 * Tramos:
 *  - Comun: 30 SE (Tickets, sellos, efectos y consumibles)
 *  - Raro: 100 SE (Títulos de honor, condecoraciones, ventajas de racha)
 *  - Epico: 200 SE (Marcos destacados, burbujas de chat, fénix de racha)
 *  - Legendario: 400 SE (Marcos y condecoraciones exclusivas, dados de oro VIP)
 */

export const TIENDA_TRAMOS = {
  COMUN: { id: 'comun', nombre: 'Común', precioBase: 5, color: '#8E8E93' },
  RARO: { id: 'raro', nombre: 'Raro', precioBase: 18, color: '#0A84FF' },
  EPICO: { id: 'epico', nombre: 'Épico', precioBase: 35, color: '#BF5AF2' },
  LEGENDARIO: { id: 'legendario', nombre: 'Legendario', precioBase: 70, color: '#FFD60A' }
}

export const CATALOGO_PRECIOS_BASE = [
  // ─── TRAMO COMÚN (3 - 12 SE) ──────────────────────────────────────────────
  {
    id: 'sello_tinta_chat',
    titulo: 'Sello de Tinta Lacrada en Chat',
    categoria: 'efectos',
    tramo: 'comun',
    precio: 3,
    precioAnterior: 30,
    duracionTexto: 'Uso instantáneo desde Mochila',
    consumible: true
  },
  {
    id: 'confeti_chat',
    titulo: 'Lluvia de Confeti en Aula',
    categoria: 'efectos',
    tramo: 'comun',
    precio: 4,
    precioAnterior: 30,
    duracionTexto: 'Uso instantáneo (se activa cuando quieras)',
    consumible: true
  },
  {
    id: 'yoshi_vida_extra',
    titulo: 'Batería Extra Yoshi Runner (+1 Vida)',
    categoria: 'juegos',
    tramo: 'comun',
    precio: 5,
    precioAnterior: 30,
    duracionTexto: '1 reanimación en carrera',
    consumible: true
  },
  {
    id: 'terremoto_chat',
    titulo: 'Sacudida Sísmica de Aula',
    categoria: 'efectos',
    tramo: 'comun',
    precio: 6,
    precioAnterior: 30,
    duracionTexto: 'Uso instantáneo (se activa cuando quieras)',
    consumible: true
  },
  {
    id: 'seguro_ruleta',
    titulo: 'Seguro de Ruleta (Reembolso 50%)',
    categoria: 'juegos',
    tramo: 'comun',
    precio: 7,
    precioAnterior: 30,
    duracionTexto: '1 uso en tu próxima tirada',
    consumible: true
  },
  {
    id: 'sirena_descanso',
    titulo: 'Silbato del Recreo (18:10)',
    categoria: 'efectos',
    tramo: 'comun',
    precio: 8,
    precioAnterior: 30,
    duracionTexto: 'Uso instantáneo (se activa cuando quieras)',
    consumible: true
  },
  {
    id: 'megafono_chat',
    titulo: 'Aviso Fijado con Megáfono',
    categoria: 'efectos',
    tramo: 'comun',
    precio: 10,
    precioAnterior: 30,
    duracionTexto: 'Fijado 30 minutos desde activación',
    consumible: true
  },
  {
    id: 'ruleta_max_50',
    titulo: 'Licencia Casino Nivel 1 (Tope 50)',
    categoria: 'juegos',
    tramo: 'comun',
    precio: 12,
    precioAnterior: 30,
    duracionTexto: 'Mejora Permanente',
    consumible: false
  },

  // ─── TRAMO RARO (15 - 25 SE) ──────────────────────────────────────────────
  {
    id: 'titulo_terminal',
    titulo: 'Título: Hacker de Terminal',
    categoria: 'titulos',
    tramo: 'raro',
    precio: 15,
    precioAnterior: 100,
    duracionTexto: '4 horas desde activación',
    consumible: false
  },
  {
    id: 'titulo_centinela',
    titulo: 'Título: Centinela SMR2',
    categoria: 'titulos',
    tramo: 'raro',
    precio: 15,
    precioAnterior: 100,
    duracionTexto: '4 horas desde activación',
    consumible: false
  },
  {
    id: 'titulo_yoshi',
    titulo: 'Título: Domador de Yoshi',
    categoria: 'titulos',
    tramo: 'raro',
    precio: 15,
    precioAnterior: 100,
    duracionTexto: '4 horas desde activación',
    consumible: false
  },
  {
    id: 'titulo_vlan',
    titulo: 'Título: Maestro de VLANs',
    categoria: 'titulos',
    tramo: 'raro',
    precio: 15,
    precioAnterior: 100,
    duracionTexto: '4 horas desde activación',
    consumible: false
  },
  {
    id: 'pin_arcade_master',
    titulo: 'Medalla Estrella Yoshi Runner',
    categoria: 'insignias',
    tramo: 'raro',
    precio: 18,
    precioAnterior: 100,
    duracionTexto: '12 horas desde activación',
    consumible: false
  },
  {
    id: 'pin_hacker',
    titulo: 'Insignia Hacker Ético SMR2',
    categoria: 'insignias',
    tramo: 'raro',
    precio: 18,
    precioAnterior: 100,
    duracionTexto: '12 horas desde activación',
    consumible: false
  },
  {
    id: 'racha_x2',
    titulo: 'Multiplicador x2 de Racha',
    categoria: 'racha',
    tramo: 'raro',
    precio: 20,
    precioAnterior: 100,
    duracionTexto: '24 horas desde activación',
    consumible: true
  },
  {
    id: 'marco_obsidiana',
    titulo: 'Marco Obsidiana Stealth',
    categoria: 'marcos',
    tramo: 'raro',
    precio: 20,
    precioAnterior: 100,
    duracionTexto: '3 horas desde activación',
    consumible: false
  },
  {
    id: 'marco_tinta',
    titulo: 'Marco Sello Carmín',
    categoria: 'marcos',
    tramo: 'raro',
    precio: 20,
    precioAnterior: 100,
    duracionTexto: '3 horas desde activación',
    consumible: false
  },
  {
    id: 'ruleta_max_100',
    titulo: 'Licencia Casino Nivel 2 (Tope 100)',
    categoria: 'juegos',
    tramo: 'raro',
    precio: 25,
    precioAnterior: 100,
    duracionTexto: 'Mejora Permanente',
    consumible: false
  },

  // ─── TRAMO ÉPICO (30 - 50 SE) ─────────────────────────────────────────────
  {
    id: 'titulo_root',
    titulo: 'Título: Linux Root Master',
    categoria: 'titulos',
    tramo: 'epico',
    precio: 30,
    precioAnterior: 200,
    stockMax: 3,
    duracionTexto: '4 horas desde activación',
    consumible: false
  },
  {
    id: 'titulo_mvp',
    titulo: 'Título: MVP del Aula 15:30',
    categoria: 'titulos',
    tramo: 'epico',
    precio: 30,
    precioAnterior: 200,
    stockMax: 2,
    duracionTexto: '4 horas desde activación',
    consumible: false
  },
  {
    id: 'marco_esmeralda',
    titulo: 'Marco Esmeralda Matrix',
    categoria: 'marcos',
    tramo: 'epico',
    precio: 35,
    precioAnterior: 200,
    duracionTexto: '3 horas desde activación',
    consumible: false
  },
  {
    id: 'marco_cyber',
    titulo: 'Marco Cyberpunk Neón',
    categoria: 'marcos',
    tramo: 'epico',
    precio: 35,
    precioAnterior: 200,
    duracionTexto: '3 horas desde activación',
    consumible: false
  },
  {
    id: 'marco_fuego',
    titulo: 'Marco Flama de Racha',
    categoria: 'marcos',
    tramo: 'epico',
    precio: 35,
    precioAnterior: 200,
    duracionTexto: '3 horas desde activación',
    consumible: false
  },
  {
    id: 'burbuja_matrix',
    titulo: 'Burbuja Matrix Consola',
    categoria: 'burbujas',
    tramo: 'epico',
    precio: 40,
    precioAnterior: 200,
    duracionTexto: '3 horas desde activación',
    consumible: false
  },
  {
    id: 'burbuja_carmin',
    titulo: 'Burbuja Carmín VIP en Chat',
    categoria: 'burbujas',
    tramo: 'epico',
    precio: 40,
    precioAnterior: 200,
    stockMax: 3,
    duracionTexto: '3 horas desde activación',
    consumible: false
  },
  {
    id: 'congelar_racha',
    titulo: 'Escudo Congela-Racha',
    categoria: 'racha',
    tramo: 'epico',
    precio: 40,
    precioAnterior: 200,
    duracionTexto: 'Protección permanente hasta su uso',
    consumible: true
  },
  {
    id: 'restaurar_racha',
    titulo: 'Fénix: Restaurador de Racha',
    categoria: 'racha',
    tramo: 'epico',
    precio: 50,
    precioAnterior: 200,
    duracionTexto: 'Restaura tu racha inmediatamente',
    consumible: true
  },

  // ─── TRAMO LEGENDARIO (60 - 100 SE) ───────────────────────────────────────
  {
    id: 'marco_oro',
    titulo: 'Marco Dorado Imperial',
    categoria: 'marcos',
    tramo: 'legendario',
    precio: 60,
    precioAnterior: 400,
    stockMax: 2,
    duracionTexto: '3 horas desde activación',
    consumible: false
  },
  {
    id: 'pin_oro_smr2',
    titulo: 'Pin de Oro SMR2 Coleccionista',
    categoria: 'insignias',
    tramo: 'legendario',
    precio: 60,
    precioAnterior: 400,
    stockMax: 1,
    duracionTexto: '24 horas de exclusividad',
    consumible: false
  },
  {
    id: 'dados_oro_pvp',
    titulo: 'Dados Dorados VIP (Duelos 1v1)',
    categoria: 'juegos',
    tramo: 'legendario',
    precio: 80,
    precioAnterior: 400,
    duracionTexto: 'Mejora Permanente',
    consumible: false
  },
  {
    id: 'ruleta_max_500',
    titulo: 'Licencia Casino VIP High Roller',
    categoria: 'juegos',
    tramo: 'legendario',
    precio: 100,
    precioAnterior: 400,
    stockMax: 2,
    duracionTexto: 'Mejora Permanente',
    consumible: false
  }
]

// Mapa rápido por ID
export const MAPA_PRECIOS_BASE = new Map(CATALOGO_PRECIOS_BASE.map(item => [item.id, item]))

export function obtenerPrecioItem(itemId) {
  return MAPA_PRECIOS_BASE.get(itemId)?.precio || null
}

export function obtenerItemConfig(itemId) {
  return MAPA_PRECIOS_BASE.get(itemId) || null
}
