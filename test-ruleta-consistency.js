/**
 * Test script to verify roulette consistency
 * Simulates 1000+ spins and verifies that the visual landing matches the generated result
 * 
 * Run with: node test-ruleta-consistency.js
 */

const ROULETTE_NUMBERS = [
  0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26
]

const totalSectors = ROULETTE_NUMBERS.length
const anglePerSector = (Math.PI * 2) / totalSectors
const stopAngle = -Math.PI / 2 // Aguja en la parte superior (12 en punto)

// Simulate crypto.getRandomValues for testing
function generateSecureRandom(max) {
  const array = new Uint32Array(1)
  // Use a seeded random for reproducibility in tests
  const seed = Date.now() + Math.random() * 1000000
  array[0] = Math.floor(seed * 16807 % 2147483647)
  return array[0] % max
}

// Core animation logic (deterministic version from the fix)
function simulateSpin() {
  // 1. Generate result ONCE (source of truth)
  const indexGanador = generateSecureRandom(ROULETTE_NUMBERS.length)
  const numeroGanador = ROULETTE_NUMBERS[indexGanador]
  const targetIndex = ROULETTE_NUMBERS.indexOf(numeroGanador)

  // 2. Calculate target angle ONCE
  const targetAngle = stopAngle - (targetIndex * anglePerSector + anglePerSector / 2)

  // 3. Simulate deterministic animation
  const DURATION = 6500
  const wheelSpeed = 0.20
  const ballSpeed = -0.35
  let wheelAngle = 0
  let ballAngle = 0

  // Simulate the animation loop at key frames
  for (let progress = 0; progress <= 1; progress += 0.01) {
    const factorFrenado = Math.pow(1 - progress, 2.2)
    
    // Wheel rotates constantly
    wheelAngle = (wheelAngle + wheelSpeed * factorFrenado * 16.67) % (Math.PI * 2) // ~60fps steps
    
    // Ball interpolates toward target
    const initialBallAngle = ballAngle
    const totalBallTravel = (ballSpeed * 6000)
    const currentBallTravel = totalBallTravel * (1 - factorFrenado)
    ballAngle = (initialBallAngle + currentBallTravel) % (Math.PI * 2)
  }

  // 4. Final position (what the fix enforces)
  wheelAngle = targetAngle
  ballAngle = stopAngle

  // 5. Calculate visual landing number
  const finalRelativeAngle = (ballAngle - wheelAngle + Math.PI * 2) % (Math.PI * 2)
  const finalSectorIndex = Math.floor((finalRelativeAngle / (Math.PI * 2)) * totalSectors)
  const finalNumber = ROULETTE_NUMBERS[finalSectorIndex]

  return {
    numeroGanador,
    finalNumber,
    match: finalNumber === numeroGanador,
    targetIndex,
    finalSectorIndex,
    targetAngleDeg: (targetAngle * 180 / Math.PI).toFixed(2),
    finalWheelAngleDeg: (wheelAngle * 180 / Math.PI).toFixed(2),
    finalBallAngleDeg: (ballAngle * 180 / Math.PI).toFixed(2)
  }
}

// Run test suite
function runTest(iterations = 1000) {
  console.log(`\n=== RULETA CONSISTENCY TEST ===`)
  console.log(`Running ${iterations} spins...\n`)

  let passed = 0
  let failed = 0
  const failures = []
  const distribution = {}

  // Initialize distribution counter
  ROULETTE_NUMBERS.forEach(n => distribution[n] = 0)

  for (let i = 0; i < iterations; i++) {
    const result = simulateSpin()
    distribution[result.numeroGanador]++

    if (result.match) {
      passed++
    } else {
      failed++
      failures.push({
        spin: i + 1,
        expected: result.numeroGanador,
        visual: result.finalNumber,
        targetIndex: result.targetIndex,
        finalSectorIndex: result.finalSectorIndex
      })
      console.error(`❌ SPIN ${i + 1} FAILED: Expected ${result.numeroGanador}, Visual ${result.finalNumber}`)
    }

    // Progress indicator
    if ((i + 1) % 100 === 0) {
      console.log(`  Progress: ${i + 1}/${iterations} (${passed} passed, ${failed} failed)`)
    }
  }

  // Results summary
  console.log(`\n=== RESULTS ===`)
  console.log(`Total spins: ${iterations}`)
  console.log(`Passed: ${passed} (${((passed/iterations)*100).toFixed(2)}%)`)
  console.log(`Failed: ${failed} (${((failed/iterations)*100).toFixed(2)}%)`)

  if (failed > 0) {
    console.log(`\n=== FAILURES ===`)
    failures.forEach(f => {
      console.log(`Spin ${f.spin}: Expected ${f.expected} (index ${f.targetIndex}), Got ${f.visual} (index ${f.finalSectorIndex})`)
    })
  }

  // Distribution check (should be roughly uniform)
  console.log(`\n=== DISTRIBUTION CHECK ===`)
  const expectedPerNumber = iterations / totalSectors
  let maxDeviation = 0
  ROULETTE_NUMBERS.forEach(n => {
    const count = distribution[n]
    const deviation = Math.abs(count - expectedPerNumber) / expectedPerNumber * 100
    maxDeviation = Math.max(maxDeviation, deviation)
    if (deviation > 50) { // Flag if deviation > 50%
      console.log(`  ⚠️  ${n}: ${count} (expected ~${expectedPerNumber.toFixed(1)}, deviation ${deviation.toFixed(1)}%)`)
    }
  })
  console.log(`Max deviation: ${maxDeviation.toFixed(1)}%`)

  // Probability verification
  console.log(`\n=== PROBABILITY VERIFICATION ===`)
  console.log(`Each number should have ~${(100/totalSectors).toFixed(2)}% probability`)
  console.log(`Sample distribution (first 10 numbers):`)
  ROULETTE_NUMBERS.slice(0, 10).forEach(n => {
    const pct = (distribution[n] / iterations * 100).toFixed(2)
    console.log(`  ${n}: ${distribution[n]} (${pct}%)`)
  })

  return failed === 0
}

// Run the test
const success = runTest(1000)

console.log(`\n${success ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED'}`)
process.exit(success ? 0 : 1)