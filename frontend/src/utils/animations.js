import gsap from 'gsap'

/**
 * Animación de impacto de sello físico sobre papel
 * Simula el golpe con rotación, rebote elástico de tinta y desaceleración real.
 */
export function animarSello(elemento) {
  if (!elemento) return
  gsap.fromTo(
    elemento,
    {
      scale: 2.3,
      opacity: 0,
      rotation: 14,
      filter: 'blur(2px)',
    },
    {
      scale: 1,
      opacity: 1,
      rotation: -3.5,
      filter: 'blur(0px)',
      duration: 0.42,
      ease: 'back.out(2)',
    }
  )
}

/**
 * Animación escalonada (stagger) para listas y colecciones de tarjetas
 */
export function animarEscalonado(elementos, opciones = {}) {
  if (!elementos || elementos.length === 0) return
  gsap.fromTo(
    elementos,
    {
      opacity: 0,
      y: 16,
    },
    {
      opacity: 1,
      y: 0,
      duration: 0.35,
      stagger: opciones.stagger || 0.05,
      ease: 'power2.out',
      clearProps: 'all',
      ...opciones,
    }
  )
}

/**
 * Animación de conteo numérico fluido para contadores de puntos y rachas
 */
export function animarNumero(elemento, valorFinal, duracion = 0.8) {
  if (!elemento) return
  const obj = { val: 0 }
  gsap.to(obj, {
    val: valorFinal,
    duration: duracion,
    ease: 'power2.out',
    onUpdate: () => {
      elemento.textContent = Math.round(obj.val).toLocaleString('es-ES')
    },
  })
}

/**
 * Animación elástica para entrada de burbujas de chat
 */
export function animarBurbuja(elemento, esPropio = false) {
  if (!elemento) return
  gsap.fromTo(
    elemento,
    {
      scale: 0.88,
      opacity: 0,
      x: esPropio ? 12 : -12,
    },
    {
      scale: 1,
      opacity: 1,
      x: 0,
      duration: 0.28,
      ease: 'back.out(1.5)',
      clearProps: 'transform,opacity',
    }
  )
}

/**
 * Animación suave de elevación para el podio
 */
export function animarPodio(elementos) {
  if (!elementos || elementos.length === 0) return
  gsap.fromTo(
    elementos,
    {
      y: 28,
      opacity: 0,
      scale: 0.94,
    },
    {
      y: 0,
      opacity: 1,
      scale: 1,
      duration: 0.5,
      stagger: 0.08,
      ease: 'power3.out',
      clearProps: 'opacity',
    }
  )
}

/**
 * Animación orgánica de llama
 */
export function animarLlama(elemento) {
  if (!elemento) return
  return gsap.to(elemento, {
    scale: 1.07,
    y: -2,
    duration: 1.4,
    repeat: -1,
    yoyo: true,
    ease: 'sine.inOut',
  })
}
