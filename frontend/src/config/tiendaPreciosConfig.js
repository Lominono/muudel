// frontend/src/config/tiendaPreciosConfig.js
/**
 * Configuración de precios de tienda sincronizada con el backend
 */

export const TIENDA_TRAMOS = {
  COMUN: { id: 'comun', nombre: 'Común', precioBase: 5, color: '#8E8E93' },
  RARO: { id: 'raro', nombre: 'Raro', precioBase: 18, color: '#0A84FF' },
  EPICO: { id: 'epico', nombre: 'Épico', precioBase: 35, color: '#BF5AF2' },
  LEGENDARIO: { id: 'legendario', nombre: 'Legendario', precioBase: 70, color: '#FFD60A' }
}

export const PRECIOS_TIENDA_LOCAL = {
  // Común (3 - 12 SE) - Accesible de inicio con el bono de 10 SE
  sello_tinta_chat: 3,
  confeti_chat: 4,
  yoshi_vida_extra: 5,
  terremoto_chat: 6,
  seguro_ruleta: 7,
  sirena_descanso: 8,
  megafono_chat: 10,
  ruleta_max_50: 12,

  // Raro (15 - 25 SE)
  titulo_terminal: 15,
  titulo_centinela: 15,
  titulo_yoshi: 15,
  titulo_vlan: 15,
  pin_arcade_master: 18,
  pin_hacker: 18,
  racha_x2: 20,
  marco_obsidiana: 20,
  marco_tinta: 20,
  ruleta_max_100: 25,

  // Épico (30 - 50 SE)
  titulo_root: 30,
  titulo_mvp: 30,
  marco_esmeralda: 35,
  marco_cyber: 35,
  marco_fuego: 35,
  burbuja_matrix: 40,
  burbuja_carmin: 40,
  congelar_racha: 40,
  restaurar_racha: 50,

  // Legendario (60 - 100 SE)
  marco_oro: 60,
  pin_oro_smr2: 60,
  dados_oro_pvp: 80,
  ruleta_max_500: 100
}

export function obtenerPrecioItem(itemId, fallback = 5) {
  return PRECIOS_TIENDA_LOCAL[itemId] || fallback
}

