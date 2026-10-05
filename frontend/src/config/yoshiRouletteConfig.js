// frontend/src/config/yoshiRouletteConfig.js
/**
 * Configuración centralizada de la Ruleta de Yoshi, StevenEuros y la Banca.
 * Monedas de Yoshi: solo sirven para la ruleta.
 * StevenEuros (SE): moneda de aula con economía equilibrada y partida doble.
 */

export const YOSHI_ROULETTE_CONFIG = {
  // ─── BANCA DEL SISTEMA (Partida doble y banco central) ─────────────────────
  BANCA: {
    ID: '00000000-0000-4000-a000-000000000000',
    NOMBRE: 'BANCA SISTEMA',
    SALDO_INICIAL: 5000,
    RESERVA_MINIMA: 500, // Por debajo de 500 SE entra en austeridad (pausa de grifos)
    EMISION_DIARIA: 25,  // 25 SE/día inyectados a la Banca a las 00:00 Madrid
    MAX_AJUSTE_ADMIN_OPERACION: 1000,   // Tope por operación de admin (1000 SE)
    MAX_AJUSTE_ADMIN_USUARIO_DIA: 2000, // Tope por usuario al día (2000 SE)
    MAX_AJUSTE_ADMIN_TOTAL_DIA: 10000,  // Tope total de ajustes admin al día (10000 SE)
    UMBRAL_ALERTA_CONCENTRACION: 0.30  // Alerta si un alumno concentra > 30% del circulante
  },

  // ─── FRICCIÓN Y LÍMITES DE MONEDAS DE YOSHI ───────────────────────────────
  MAX_SALDO_GUARDADO: 1500,       // Límite de monedas acumuladas (permite Oro sin acumular semanas)
  MAX_MONEDAS_POR_PARTIDA: 250,   // Tope anti-cheat por partida individual
  MAX_MONEDAS_POR_HORA: 800,      // Tope anti-cheat por hora de juego
  MAX_MONEDAS_POR_SEGUNDO: 12,    // Tasa máxima creíble en juego
  DURACION_MINIMA_PARTIDA_MS: 1200, // Mínimo 1.2s para permitir partidas cortas normales
  SPIN_COOLDOWN_MS: 4000,         // Cooldown mínimo obligatorio entre tiradas (4s)

  // ─── RENDIMIENTOS DECRECIENTES DIARIOS EN RULETA ───────────────────────────
  // Zona horaria de referencia: Europe/Madrid
  TRAMOS_DIARIOS_SE: {
    TRAMO_1_MAX: 12,    // 0 a 12 SE -> 100% efectividad
    TRAMO_1_FACTOR: 1.0,
    TRAMO_2_MAX: 24,    // 12 a 24 SE -> 50% efectividad
    TRAMO_2_FACTOR: 0.5,
    TRAMO_3_MAX: 30,    // 24 a 30 SE -> 25% efectividad
    TRAMO_3_FACTOR: 0.25,
    TOPE_DURO: 30       // Tope duro: 30 SE máx al día de ruleta
  },

  // ─── BONUS DIARIO Y MISIONES ──────────────────────────────────────────────
  // Día 1: 0 SE, Días 2-4: 1 SE, Días 5-6: 2 SE, Día 7+: 3 SE (resetea si falta 1 día)
  BONUS_DIARIO_SE: [0, 1, 1, 1, 2, 2, 3],
  MISIONES_DIARIAS_SE: 1,

  // ─── COMISIONES Y RAKE DE APUESTAS (5% con mínimo 1 SE) ───────────────────
  COMISION_CASA_PORCENTAJE: 0.05,
  calcularComisionCasa: (bote) => Math.max(1, Math.floor(Number(bote || 0) * 0.05)),

  // ─── NIVELES DE LA RULETA DE YOSHI (Premios fijos en SE) ──────────────────
  NIVELES: {
    bronce: {
      id: 'bronce',
      nombre: 'Ruleta Bronce',
      costoMonedas: 20,
      minRacha: 0,
      minNivel: 0,
      descripcion: 'Entrada básica para todas las carreras. Apuesta fija: 20 🪙.',
      segmentos: [
        { id: 'b_0', premioSE: 0, label: '0 SE', prob: 0.50, color: '#EF4444', textoColor: '#FFF', icono: '💀', esJackpot: false },
        { id: 'b_1', premioSE: 1, label: '+1 SE', prob: 0.30, color: '#64748B', textoColor: '#FFF', icono: '🪙', esJackpot: false },
        { id: 'b_2', premioSE: 2, label: '+2 SE', prob: 0.12, color: '#0284C7', textoColor: '#FFF', icono: '⭐', esJackpot: false },
        { id: 'b_5', premioSE: 5, label: '+5 SE', prob: 0.06, color: '#16A34A', textoColor: '#FFF', icono: '🔥', esJackpot: false },
        { id: 'b_20', premioSE: 20, label: '+20 SE', prob: 0.019, color: '#EAB308', textoColor: '#000', icono: '💰', esJackpot: false },
        { id: 'b_100', premioSE: 100, label: '+100 JACKPOT', prob: 0.001, color: '#9333EA', textoColor: '#FFF', icono: '👑', esJackpot: true, degradaA: 20 }
      ]
    },
    plata: {
      id: 'plata',
      nombre: 'Ruleta Plata',
      costoMonedas: 60,
      minRacha: 3,
      minNivel: 2,
      descripcion: 'Para corredores habituales (Racha ≥ 3 o Nivel ≥ 2). Apuesta fija: 60 🪙.',
      segmentos: [
        { id: 'p_0', premioSE: 0, label: '0 SE', prob: 0.45, color: '#EF4444', textoColor: '#FFF', icono: '💀', esJackpot: false },
        { id: 'p_3', premioSE: 3, label: '+3 SE', prob: 0.30, color: '#64748B', textoColor: '#FFF', icono: '🪙', esJackpot: false },
        { id: 'p_6', premioSE: 6, label: '+6 SE', prob: 0.15, color: '#0284C7', textoColor: '#FFF', icono: '⭐', esJackpot: false },
        { id: 'p_15', premioSE: 15, label: '+15 SE', prob: 0.08, color: '#16A34A', textoColor: '#FFF', icono: '🔥', esJackpot: false },
        { id: 'p_60', premioSE: 60, label: '+60 SE', prob: 0.018, color: '#EAB308', textoColor: '#000', icono: '💰', esJackpot: false },
        { id: 'p_300', premioSE: 300, label: '+300 JACKPOT', prob: 0.002, color: '#9333EA', textoColor: '#FFF', icono: '👑', esJackpot: true, degradaA: 60 }
      ]
    },
    oro: {
      id: 'oro',
      nombre: 'Ruleta Oro',
      costoMonedas: 150,
      minRacha: 7,
      minNivel: 5,
      descripcion: 'Exclusiva de veteranos (Racha ≥ 7 o Nivel ≥ 5). Apuesta fija: 150 🪙.',
      segmentos: [
        { id: 'o_0', premioSE: 0, label: '0 SE', prob: 0.40, color: '#EF4444', textoColor: '#FFF', icono: '💀', esJackpot: false },
        { id: 'o_10', premioSE: 10, label: '+10 SE', prob: 0.32, color: '#64748B', textoColor: '#FFF', icono: '🪙', esJackpot: false },
        { id: 'o_20', premioSE: 20, label: '+20 SE', prob: 0.16, color: '#0284C7', textoColor: '#FFF', icono: '⭐', esJackpot: false },
        { id: 'o_50', premioSE: 50, label: '+50 SE', prob: 0.09, color: '#16A34A', textoColor: '#FFF', icono: '🔥', esJackpot: false },
        { id: 'o_200', premioSE: 200, label: '+200 SE', prob: 0.027, color: '#EAB308', textoColor: '#000', icono: '💰', esJackpot: false },
        { id: 'o_1000', premioSE: 1000, label: '+1000 JACKPOT', prob: 0.003, color: '#9333EA', textoColor: '#FFF', icono: '👑', esJackpot: true, degradaA: 200 }
      ]
    }
  }
}

/**
 * Cálculo MARGINAL de premio para premios pequeños respetando los tramos diarios
 */
export function calcularPremioMarginal(premioBruto, ganadosHoy = 0) {
  const tramos = YOSHI_ROULETTE_CONFIG.TRAMOS_DIARIOS_SE
  const topeDuro = tramos.TOPE_DURO
  if (ganadosHoy >= topeDuro) return 0

  const tramo1Max = tramos.TRAMO_1_MAX
  const tramo1Factor = tramos.TRAMO_1_FACTOR
  const tramo2Max = tramos.TRAMO_2_MAX
  const tramo2Factor = tramos.TRAMO_2_FACTOR
  const tramo3Max = tramos.TRAMO_3_MAX
  const tramo3Factor = tramos.TRAMO_3_FACTOR

  let premioAcreditado = 0
  let cursor = ganadosHoy
  let restante = premioBruto

  while (restante > 0 && cursor < topeDuro) {
    if (cursor < tramo1Max) {
      const capacidad = tramo1Max - cursor
      const porcion = Math.min(restante, capacidad)
      premioAcreditado += porcion * tramo1Factor
      cursor += porcion * tramo1Factor
      restante -= porcion
    } else if (cursor < tramo2Max) {
      const capacidad = (tramo2Max - cursor) / tramo2Factor
      const porcion = Math.min(restante, capacidad)
      premioAcreditado += porcion * tramo2Factor
      cursor += porcion * tramo2Factor
      restante -= porcion
    } else if (cursor < tramo3Max) {
      const capacidad = (tramo3Max - cursor) / tramo3Factor
      const porcion = Math.min(restante, capacidad)
      premioAcreditado += porcion * tramo3Factor
      cursor += porcion * tramo3Factor
      restante -= porcion
    } else {
      break
    }
  }

  const premioFinal = Math.floor(premioAcreditado)
  return Math.min(topeDuro - ganadosHoy, Math.max(0, premioFinal))
}
