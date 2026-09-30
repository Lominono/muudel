import { Router } from 'express'

const router = Router()

const ROULETTE_NUMBERS = [
  0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26
]

function checkAuth(req, res, next) {
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Sin autorización' })
  }
  next()
}

function generateSecureRandom(max) {
  const array = new Uint32Array(1)
  crypto.getRandomValues(array)
  return array[0] % max
}

router.post('/girar', checkAuth, (req, res) => {
  try {
    const indexGanador = generateSecureRandom(ROULETTE_NUMBERS.length)
    const numeroGanador = ROULETTE_NUMBERS[indexGanador]

    const esRojo = [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36].includes(numeroGanador)
    const esNegro = [2, 4, 6, 8, 10, 11, 13, 15, 17, 20, 22, 24, 26, 28, 29, 31, 33, 35].includes(numeroGanador)
    const esPar = numeroGanador !== 0 && numeroGanador % 2 === 0
    const esImpar = numeroGanador !== 0 && numeroGanador % 2 !== 0
    const esPasa = numeroGanador >= 19 && numeroGanador <= 36
    const esFalta = numeroGanador >= 1 && numeroGanador <= 18
    const esDocena1 = numeroGanador >= 1 && numeroGanador <= 12
    const esDocena2 = numeroGanador >= 13 && numeroGanador <= 24
    const esDocena3 = numeroGanador >= 25 && numeroGanador <= 36
    const colIndex = numeroGanador === 0 ? -1 : (numeroGanador - 1) % 3

    res.json({
      numeroGanador,
      indexGanador,
      metadata: {
        color: numeroGanador === 0 ? 'verde' : esRojo ? 'rojo' : 'negro',
        paridad: numeroGanador === 0 ? 'cero' : esPar ? 'par' : 'impar',
        rango: numeroGanador === 0 ? 'cero' : esFalta ? 'falta' : 'pasa',
        docena: esDocena1 ? 1 : esDocena2 ? 2 : esDocena3 ? 3 : 0,
        columna: colIndex + 1
      },
      timestamp: Date.now()
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

export { router as ruletaRouter }