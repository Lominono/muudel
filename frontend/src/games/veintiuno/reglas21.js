// frontend/src/games/veintiuno/reglas21.js
// Reglas y utilidades matemáticas para Duelo 21 (Blackjack)

export const PALOS = [
  { id: 'picas', nombre: 'Picas', simbolo: '♠', color: '#1C1C1E', code: 'S' },
  { id: 'corazones', nombre: 'Corazones', simbolo: '♥', color: '#D70015', code: 'H' },
  { id: 'diamantes', nombre: 'Diamantes', simbolo: '♦', color: '#D70015', code: 'D' },
  { id: 'treboles', nombre: 'Tréboles', simbolo: '♣', color: '#1C1C1E', code: 'C' }
]

export const VALORES = [
  { id: 'A', label: 'As', valorBase: 11, code: 'A' },
  { id: '2', label: '2', valorBase: 2, code: '2' },
  { id: '3', label: '3', valorBase: 3, code: '3' },
  { id: '4', label: '4', valorBase: 4, code: '4' },
  { id: '5', label: '5', valorBase: 5, code: '5' },
  { id: '6', label: '6', valorBase: 6, code: '6' },
  { id: '7', label: '7', valorBase: 7, code: '7' },
  { id: '8', label: '8', valorBase: 8, code: '8' },
  { id: '9', label: '9', valorBase: 9, code: '9' },
  { id: '10', label: '10', valorBase: 10, code: '0' },
  { id: 'J', label: 'Jota', valorBase: 10, code: 'J' },
  { id: 'Q', label: 'Reina', valorBase: 10, code: 'Q' },
  { id: 'K', label: 'Rey', valorBase: 10, code: 'K' }
]

/**
 * Genera una baraja completa de 52 cartas barajada (Fisher-Yates)
 */
export function crearBarajaBarajada(numBarajas = 1) {
  const baraja = []
  for (let n = 0; n < numBarajas; n++) {
    for (const palo of PALOS) {
      for (const val of VALORES) {
        baraja.push({
          id: `${val.id}_${palo.id}_${n}_${Math.random().toString(36).substring(2, 6)}`,
          valor: val.id,
          label: val.label,
          palo: palo.id,
          simbolo: palo.simbolo,
          color: palo.color,
          codeImg: `${val.code}${palo.code}`,
          imgUrl: `https://deckofcardsapi.com/static/img/${val.code}${palo.code}.png`
        })
      }
    }
  }

  // Fisher-Yates shuffle
  for (let i = baraja.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[baraja[i], baraja[j]] = [baraja[j], baraja[i]]
  }

  return baraja
}

/**
 * Calcula la puntuación de una mano de Blackjack.
 * El As cuenta como 11, pero si la suma supera 21, se convierte en 1.
 */
export function calcularPuntuacionMano(cartas = []) {
  if (typeof cartas === 'string') {
    try { cartas = JSON.parse(cartas) } catch (_) { cartas = [] }
  }
  if (!Array.isArray(cartas) || cartas.length === 0) {
    return { total: 0, esBlackjack: false, sePaso: false, texto: '0 pts' }
  }

  let total = 0
  let ases = 0

  for (const carta of cartas) {
    if (carta.oculta) continue

    if (carta.valor === 'A') {
      ases += 1
      total += 11
    } else if (['K', 'Q', 'J', '10'].includes(carta.valor)) {
      total += 10
    } else {
      total += Number(carta.valor) || 0
    }
  }

  // Reducir Ases de 11 a 1 si el jugador se pasa de 21
  while (total > 21 && ases > 0) {
    total -= 10
    ases -= 1
  }

  const cartasVisibles = cartas.filter(c => !c.oculta)
  const esBlackjack = cartasVisibles.length === 2 && total === 21
  const sePaso = total > 21

  let texto = `${total} pts`
  if (esBlackjack) texto = '¡21 BLACKJACK!'
  else if (sePaso) texto = `${total} pts (¡Te has pasado!)`

  return { total, esBlackjack, sePaso, texto }
}

/**
 * Determina el desenlace entre Jugador 1 y Jugador 2 (o Crupier)
 * Retorna: { ganador: 'j1' | 'j2' | 'empate', motivo: string, multiplicador: number }
 */
export function determinarDesenlace(manoJ1, manoJ2) {
  const p1 = calcularPuntuacionMano(manoJ1)
  const p2 = calcularPuntuacionMano(manoJ2)

  // Caso 1: Ambos se pasaron de 21
  if (p1.sePaso && p2.sePaso) {
    if (p1.total === p2.total) {
      return { ganador: 'empate', motivo: 'Ambos se pasaron de 21 con el mismo valor. Empate y devolución.', multiplicador: 1 }
    }
    // Gana quien se pasó por menos (más cerca de 21)
    const dif1 = p1.total - 21
    const dif2 = p2.total - 21
    if (dif1 < dif2) {
      return { ganador: 'j1', motivo: `Ambos se pasaron, pero J1 estuvo más cerca (${p1.total} vs ${p2.total}).`, multiplicador: 2 }
    } else {
      return { ganador: 'j2', motivo: `Ambos se pasaron, pero J2 estuvo más cerca (${p2.total} vs ${p1.total}).`, multiplicador: 2 }
    }
  }

  // Caso 2: Solo uno se pasó
  if (p1.sePaso && !p2.sePaso) {
    return { ganador: 'j2', motivo: `J1 se pasó de 21 (${p1.total}). Victoria limpia de J2 (${p2.total} pts).`, multiplicador: 2 }
  }
  if (!p1.sePaso && p2.sePaso) {
    return { ganador: 'j1', motivo: `J2 se pasó de 21 (${p2.total}). Victoria limpia de J1 (${p1.total} pts).`, multiplicador: 2 }
  }

  // Caso 3: Blackjack natural (2 cartas sumando 21)
  if (p1.esBlackjack && !p2.esBlackjack) {
    return { ganador: 'j1', motivo: '¡Blackjack natural en mano inicial! Victoria con ratio 3:2.', multiplicador: 2.5 }
  }
  if (!p1.esBlackjack && p2.esBlackjack) {
    return { ganador: 'j2', motivo: '¡Rival obtuvo Blackjack natural en mano inicial! Victoria con ratio 3:2.', multiplicador: 2.5 }
  }
  if (p1.esBlackjack && p2.esBlackjack) {
    return { ganador: 'empate', motivo: '¡Ambos consiguieron Blackjack natural! Tablas y devolución de fichas.', multiplicador: 1 }
  }

  // Caso 4: Puntuaciones normales <= 21
  if (p1.total > p2.total) {
    return { ganador: 'j1', motivo: `Victoria por mayor puntuación: ${p1.total} pts vs ${p2.total} pts.`, multiplicador: 2 }
  } else if (p2.total > p1.total) {
    return { ganador: 'j2', motivo: `Victoria de J2 por mayor puntuación: ${p2.total} pts vs ${p1.total} pts.`, multiplicador: 2 }
  } else {
    return { ganador: 'empate', motivo: `Empate exacto a ${p1.total} puntos. Devolución íntegra de la apuesta.`, multiplicador: 1 }
  }
}
