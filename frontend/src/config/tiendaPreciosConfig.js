// frontend/src/config/tiendaPreciosConfig.js
/**
 * Configuración de precios de tienda sincronizada con el backend
 */

export const TIENDA_TRAMOS = {
  COMUN: { id: 'comun', nombre: 'Común', precioBase: 30, color: '#8E8E93' },
  RARO: { id: 'raro', nombre: 'Raro', precioBase: 100, color: '#0A84FF' },
  EPICO: { id: 'epico', nombre: 'Épico', precioBase: 200, color: '#BF5AF2' },
  LEGENDARIO: { id: 'legendario', nombre: 'Legendario', precioBase: 400, color: '#FFD60A' }
}

export const PRECIOS_TIENDA_LOCAL = {
  // Común (30 SE)
  sello_tinta_chat: 30,
  confeti_chat: 30,
  terremoto_chat: 30,
  sirena_descanso: 30,
  megafono_chat: 30,
  seguro_ruleta: 30,
  yoshi_vida_extra: 30,
  ruleta_max_50: 30,

  // Raro (100 SE)
  titulo_terminal: 100,
  titulo_centinela: 100,
  titulo_yoshi: 100,
  titulo_vlan: 100,
  pin_arcade_master: 100,
  pin_hacker: 100,
  racha_x2: 100,
  marco_obsidiana: 100,
  marco_tinta: 100,
  ruleta_max_100: 100,

  // Épico (200 SE)
  titulo_root: 200,
  titulo_mvp: 200,
  marco_esmeralda: 200,
  marco_cyber: 200,
  marco_fuego: 200,
  burbuja_matrix: 200,
  burbuja_carmin: 200,
  congelar_racha: 200,
  restaurar_racha: 200,

  // Legendario (400 SE)
  marco_oro: 400,
  pin_oro_smr2: 400,
  dados_oro_pvp: 400,
  ruleta_max_500: 400
}

export function obtenerPrecioItem(itemId, fallback = 30) {
  return PRECIOS_TIENDA_LOCAL[itemId] || fallback
}
