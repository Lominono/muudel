// frontend/src/utils/antiAiDetector.js
// Sistema de Detección Heurística y Garantía de Autoría Humana Anti-IA

const PATRONES_SINTETICOS = [
  { regex: /\b(en resumen|a modo de resumen|en conclusión)\b/i, peso: 25, nombre: 'Conector de resumen genérico' },
  { regex: /\b(es importante destacar|es crucial (entender|mencionar)|cabe (destacar|señalar|mencionar))\b/i, peso: 30, nombre: 'Muletilla sintética formal' },
  { regex: /\b(como modelo de lenguaje|no tengo acceso a información en tiempo real)\b/i, peso: 90, nombre: 'Firma explícita de IA' },
  { regex: /\b(a continuación se (presentan|detallan|describen)|los siguientes puntos son esenciales)\b/i, peso: 25, nombre: 'Listado robótico' },
  { regex: /\b(sin lugar a dudas|un aspecto clave a considerar|es fundamental recordar)\b/i, peso: 25, nombre: 'Relleno de cortesía artificial' },
  { regex: /\b(desentrañar|sumergirse en|un tapiz de|revolucionar|aprovechar al máximo)\b/i, peso: 20, nombre: 'Traducción forzada de buzzwords' },
  { regex: /\b(en el vertiginoso mundo|en última instancia|no obstante lo anterior)\b/i, peso: 25, nombre: 'Prosa artificial' }
]

/**
 * Analiza un texto para evaluar si proviene de redacción propia directa o de un generador sintético
 * @param {string} texto 
 * @returns {{ esIaProbable: boolean, puntuacionIa: number, patronDetectado: string|null, esHumanoVerificado: boolean }}
 */
export function analizarTextoAntiIA(texto) {
  if (!texto || typeof texto !== 'string') {
    return { esIaProbable: false, puntuacionIa: 0, patronDetectado: null, esHumanoVerificado: true }
  }

  const limpio = texto.trim()
  if (limpio.length < 20) {
    // Textos muy breves (mensajes rápidos de chat) son humanos por naturaleza
    return { esIaProbable: false, puntuacionIa: 0, patronDetectado: null, esHumanoVerificado: true }
  }

  let puntuacionIa = 0
  let patronEncontrado = null

  for (const patron of PATRONES_SINTETICOS) {
    if (patron.regex.test(limpio)) {
      puntuacionIa += patron.peso
      if (!patronEncontrado) {
        patronEncontrado = patron.nombre
      }
    }
  }

  // Detectar formato típico de listas estructuradas con viñetas sintéticas repetitivas
  const lineasConPuntos = limpio.split('\n').filter(l => l.trim().startsWith('-') || l.trim().startsWith('*') || /^\d+\./.test(l.trim()))
  if (lineasConPuntos.length >= 4 && limpio.length > 250) {
    puntuacionIa += 20
    if (!patronEncontrado) patronEncontrado = 'Estructura excesivamente algorítmica'
  }

  const esIaProbable = puntuacionIa >= 45
  const esHumanoVerificado = !esIaProbable && limpio.length >= 25

  return {
    esIaProbable,
    puntuacionIa,
    patronDetectado: patronEncontrado,
    esHumanoVerificado
  }
}
