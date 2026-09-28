// frontend/src/games/yoshiRunner/yoshiAssets.js
// Sprites SVG vectoriales de alta precisión para Yoshi Runner

const toDataUri = (svgStr) => `data:image/svg+xml;utf8,${encodeURIComponent(svgStr.trim())}`

// 1. Yoshi Corriendo - Cuadro 1 (Zancada izquierda)
export const SVG_YOSHI_RUN_1 = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64" shape-rendering="crispEdges">
  <!-- Cola y cresta trasera -->
  <path d="M12 36 h8 v6 h-8 z" fill="#30D158" />
  <path d="M10 38 h4 v4 h-4 z" fill="#248A3D" />
  <path d="M22 24 h6 v6 h-6 z" fill="#FF3B30" />
  <path d="M20 30 h6 v4 h-6 z" fill="#FF3B30" />
  <!-- Caparazón / Silla de montar roja -->
  <path d="M18 32 h10 v8 h-10 z" fill="#FF3B30" />
  <path d="M16 34 h4 v4 h-4 z" fill="#FFFFFF" />
  <!-- Cuerpo verde principal -->
  <path d="M24 28 h16 v18 h-16 z" fill="#30D158" />
  <path d="M26 30 h12 v14 h-12 z" fill="#34C759" />
  <!-- Panza blanca -->
  <path d="M34 32 h10 v12 h-10 z" fill="#FFFFFF" />
  <path d="M32 38 h6 v8 h-6 z" fill="#E5E5EA" />
  <!-- Cabeza y hocico grande redondeado -->
  <path d="M32 10 h16 v18 h-16 z" fill="#30D158" />
  <path d="M44 14 h14 v14 h-14 z" fill="#30D158" />
  <path d="M48 16 h8 v10 h-8 z" fill="#34C759" />
  <!-- Mejilla blanca -->
  <path d="M42 22 h10 v8 h-10 z" fill="#FFFFFF" />
  <!-- Ojo y pupila -->
  <path d="M36 6 h10 v12 h-10 z" fill="#FFFFFF" />
  <path d="M40 8 h4 v8 h-4 z" fill="#1C1C1E" />
  <path d="M40 9 h2 v3 h-2 z" fill="#FFFFFF" />
  <path d="M34 6 h4 v10 h-4 z" fill="#248A3D" />
  <!-- Fosa nasal -->
  <path d="M54 18 h2 v3 h-2 z" fill="#1C1C1E" />
  <!-- Brazos pequeños -->
  <path d="M38 34 h8 v5 h-8 z" fill="#FFFFFF" />
  <path d="M42 37 h4 v3 h-4 z" fill="#E5E5EA" />
  <!-- Piernas corriendo Cuadro 1 -->
  <!-- Pierna delantera extendida hacia adelante -->
  <path d="M36 46 h8 v6 h-8 z" fill="#30D158" />
  <path d="M38 52 h14 v8 h-14 z" fill="#FF9500" />
  <path d="M40 56 h10 v4 h-10 z" fill="#D97706" />
  <!-- Pierna trasera impulsando atrás -->
  <path d="M20 44 h8 v6 h-8 z" fill="#248A3D" />
  <path d="M14 48 h12 v8 h-12 z" fill="#FF9500" />
  <path d="M14 52 h10 v4 h-10 z" fill="#D97706" />
</svg>
`

// 2. Yoshi Corriendo - Cuadro 2 (Zancada contraria)
export const SVG_YOSHI_RUN_2 = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64" shape-rendering="crispEdges">
  <!-- Cola y cresta trasera -->
  <path d="M12 34 h8 v6 h-8 z" fill="#30D158" />
  <path d="M10 36 h4 v4 h-4 z" fill="#248A3D" />
  <path d="M22 22 h6 v6 h-6 z" fill="#FF3B30" />
  <path d="M20 28 h6 v4 h-6 z" fill="#FF3B30" />
  <!-- Caparazón / Silla de montar roja -->
  <path d="M18 30 h10 v8 h-10 z" fill="#FF3B30" />
  <path d="M16 32 h4 v4 h-4 z" fill="#FFFFFF" />
  <!-- Cuerpo verde principal -->
  <path d="M24 26 h16 v18 h-16 z" fill="#30D158" />
  <path d="M26 28 h12 v14 h-12 z" fill="#34C759" />
  <!-- Panza blanca -->
  <path d="M34 30 h10 v12 h-10 z" fill="#FFFFFF" />
  <path d="M32 36 h6 v8 h-6 z" fill="#E5E5EA" />
  <!-- Cabeza y hocico grande redondeado -->
  <path d="M32 8 h16 v18 h-16 z" fill="#30D158" />
  <path d="M44 12 h14 v14 h-14 z" fill="#30D158" />
  <path d="M48 14 h8 v10 h-8 z" fill="#34C759" />
  <!-- Mejilla blanca -->
  <path d="M42 20 h10 v8 h-10 z" fill="#FFFFFF" />
  <!-- Ojo y pupila -->
  <path d="M36 4 h10 v12 h-10 z" fill="#FFFFFF" />
  <path d="M40 6 h4 v8 h-4 z" fill="#1C1C1E" />
  <path d="M40 7 h2 v3 h-2 z" fill="#FFFFFF" />
  <path d="M34 4 h4 v10 h-4 z" fill="#248A3D" />
  <!-- Fosa nasal -->
  <path d="M54 16 h2 v3 h-2 z" fill="#1C1C1E" />
  <!-- Brazos pequeños -->
  <path d="M38 32 h8 v5 h-8 z" fill="#FFFFFF" />
  <!-- Piernas corriendo Cuadro 2 (pie delantero pisando plano, pie trasero levantado) -->
  <path d="M30 44 h8 v8 h-8 z" fill="#30D158" />
  <path d="M28 52 h14 v8 h-14 z" fill="#FF9500" />
  <path d="M28 56 h12 v4 h-12 z" fill="#D97706" />
  <!-- Pierna trasera replegada flexionada -->
  <path d="M18 42 h8 v6 h-8 z" fill="#248A3D" />
  <path d="M16 46 h10 v7 h-10 z" fill="#FF9500" />
</svg>
`

// 3. Yoshi Saltando (Brazos alzados, pies replegados en pose de salto de Super Mario World)
export const SVG_YOSHI_JUMP = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64" shape-rendering="crispEdges">
  <!-- Cola hacia arriba -->
  <path d="M10 32 h10 v6 h-10 z" fill="#30D158" />
  <path d="M8 30 h4 v4 h-4 z" fill="#248A3D" />
  <path d="M20 20 h6 v6 h-6 z" fill="#FF3B30" />
  <path d="M18 26 h6 v4 h-6 z" fill="#FF3B30" />
  <!-- Caparazón rojo -->
  <path d="M18 28 h10 v8 h-10 z" fill="#FF3B30" />
  <path d="M16 30 h4 v4 h-4 z" fill="#FFFFFF" />
  <!-- Cuerpo verde -->
  <path d="M24 24 h16 v16 h-16 z" fill="#30D158" />
  <!-- Panza blanca -->
  <path d="M34 26 h10 v12 h-10 z" fill="#FFFFFF" />
  <!-- Cabeza alegre mirando arriba -->
  <path d="M32 4 h16 v18 h-16 z" fill="#30D158" />
  <path d="M44 8 h14 v14 h-14 z" fill="#30D158" />
  <path d="M42 16 h10 v8 h-10 z" fill="#FFFFFF" />
  <!-- Ojo abierto entusiasmado -->
  <path d="M36 2 h10 v12 h-10 z" fill="#FFFFFF" />
  <path d="M42 4 h4 v6 h-4 z" fill="#1C1C1E" />
  <path d="M42 5 h2 v2 h-2 z" fill="#FFFFFF" />
  <!-- Brazos extendidos al aire -->
  <path d="M42 22 h8 v6 h-8 z" fill="#FFFFFF" />
  <!-- Pies recogidos en salto -->
  <path d="M24 40 h10 v8 h-10 z" fill="#FF9500" />
  <path d="M32 44 h12 v8 h-12 z" fill="#FF9500" />
</svg>
`

// 4. Yoshi Agachado (Pose Duck - perfil bajo para pasar por debajo de voladores)
export const SVG_YOSHI_DUCK = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64" shape-rendering="crispEdges">
  <!-- Cola pegada al suelo -->
  <path d="M6 46 h12 v6 h-12 z" fill="#30D158" />
  <!-- Caparazón rojo sobre espalda baja -->
  <path d="M16 38 h12 v8 h-12 z" fill="#FF3B30" />
  <path d="M14 40 h4 v4 h-4 z" fill="#FFFFFF" />
  <!-- Cuerpo agachado alargado horizontal -->
  <path d="M20 40 h24 v14 h-24 z" fill="#30D158" />
  <path d="M24 44 h18 v8 h-18 z" fill="#FFFFFF" />
  <!-- Cabeza inclinada hacia adelante y abajo -->
  <path d="M38 32 h18 v16 h-18 z" fill="#30D158" />
  <path d="M50 36 h12 v12 h-12 z" fill="#30D158" />
  <path d="M46 42 h10 v6 h-10 z" fill="#FFFFFF" />
  <!-- Ojo mirando atento -->
  <path d="M42 28 h8 v10 h-8 z" fill="#FFFFFF" />
  <path d="M46 30 h4 v6 h-4 z" fill="#1C1C1E" />
  <!-- Botas dobladas debajo -->
  <path d="M18 52 h16 v8 h-16 z" fill="#FF9500" />
  <path d="M36 52 h16 v8 h-16 z" fill="#FF9500" />
</svg>
`

// 5. Obstáculo: Tubería Verde con Planta Piraña
export const SVG_PIRANHA_PIPE = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 64" width="48" height="64" shape-rendering="crispEdges">
  <!-- Planta Piraña asomando -->
  <circle cx="24" cy="14" r="11" fill="#FF3B30" />
  <!-- Manchas blancas de la piraña -->
  <circle cx="19" cy="10" r="2.5" fill="#FFFFFF" />
  <circle cx="28" cy="11" r="2.5" fill="#FFFFFF" />
  <circle cx="24" cy="17" r="2" fill="#FFFFFF" />
  <!-- Dientes afilados -->
  <polygon points="17,14 21,14 19,19" fill="#FFFFFF" />
  <polygon points="27,14 31,14 29,19" fill="#FFFFFF" />
  <polygon points="21,18 27,18 24,14" fill="#FFFFFF" />
  <!-- Tallo verde -->
  <rect x="21" y="22" width="6" height="8" fill="#34C759" />
  <!-- Borde superior de la tubería -->
  <rect x="4" y="28" width="40" height="10" fill="#30D158" stroke="#1C1C1E" stroke-width="2" />
  <rect x="6" y="30" width="8" height="6" fill="#86EFAC" />
  <!-- Cuerpo de la tubería -->
  <rect x="8" y="38" width="32" height="26" fill="#22C55E" stroke="#1C1C1E" stroke-width="2" />
  <rect x="10" y="40" width="6" height="22" fill="#86EFAC" />
</svg>
`

// 6. Obstáculo: Caparazón Koopa Verde deslizándose
export const SVG_KOOPA_SHELL = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 36 28" width="36" height="28" shape-rendering="crispEdges">
  <!-- Borde exterior amarillo -->
  <rect x="2" y="18" width="32" height="8" rx="4" fill="#FBBF24" stroke="#1C1C1E" stroke-width="1.5" />
  <!-- Caparazón verde con hexágonos -->
  <path d="M4 18 C4 6, 32 6, 32 18 Z" fill="#22C55E" stroke="#1C1C1E" stroke-width="1.5" />
  <!-- Dibujo de hexágono del caparazón -->
  <polygon points="18,8 24,12 24,17 18,17 12,17 12,12" fill="#34D399" stroke="#15803D" stroke-width="1" />
  <polygon points="18,9 23,12 23,16 18,16 13,16 13,12" fill="#15803D" opacity="0.3" />
</svg>
`

// 7. Obstáculo Aéreo: Paratroopa Voladora (Obliga a agacharse o saltar alto)
export const SVG_PARATROOPA = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 44 40" width="44" height="40" shape-rendering="crispEdges">
  <!-- Ala izquierda blanca batiendo -->
  <path d="M6 6 C12 0, 22 4, 22 14 C16 14, 10 12, 6 6 Z" fill="#FFFFFF" stroke="#1C1C1E" stroke-width="1.5" />
  <!-- Caparazón rojo volador -->
  <ellipse cx="24" cy="22" rx="12" ry="10" fill="#EF4444" stroke="#1C1C1E" stroke-width="1.5" />
  <!-- Cabeza y ojos de Koopa -->
  <circle cx="34" cy="18" r="6" fill="#FBBF24" stroke="#1C1C1E" stroke-width="1.5" />
  <circle cx="36" cy="17" r="1.5" fill="#1C1C1E" />
  <!-- Pico de tortuga -->
  <path d="M38 18 h4 v4 h-4 z" fill="#F59E0B" />
  <!-- Patitas amarillas -->
  <rect x="18" y="30" width="6" height="5" fill="#FBBF24" />
  <rect x="26" y="30" width="6" height="5" fill="#FBBF24" />
</svg>
`

// 8. Coleccionable: Huevo de Yoshi (+5 monedas y puntos extra)
export const SVG_YOSHI_EGG = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 38" width="32" height="38">
  <defs>
    <radialGradient id="eggGrad" cx="35%" cy="35%" r="65%">
      <stop offset="0%" stop-color="#FFFFFF" />
      <stop offset="70%" stop-color="#F3F4F6" />
      <stop offset="100%" stop-color="#D1D5DB" />
    </radialGradient>
  </defs>
  <!-- Forma de huevo -->
  <ellipse cx="16" cy="20" rx="14" ry="17" fill="url(#eggGrad)" stroke="#1F2937" stroke-width="1.5" />
  <!-- Manchas verdes icónicas de Yoshi -->
  <ellipse cx="11" cy="14" rx="4" ry="5" fill="#30D158" />
  <ellipse cx="21" cy="16" rx="4.5" ry="5.5" fill="#30D158" />
  <ellipse cx="15" cy="28" rx="4" ry="4" fill="#30D158" />
  <circle cx="24" cy="27" r="2.5" fill="#30D158" />
</svg>
`

// 9. Coleccionable: Moneda de Oro de Aula (+1 moneda)
export const SVG_GOLD_COIN = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 28 28" width="28" height="28">
  <circle cx="14" cy="14" r="13" fill="#F59E0B" stroke="#B45309" stroke-width="1.5" />
  <circle cx="14" cy="14" r="10" fill="#FBBF24" />
  <!-- Rectángulo vertical central estilo Mario -->
  <rect x="12" y="7" width="4" height="14" rx="1" fill="#D97706" />
</svg>
`

// 10. Nube 8-bit decorativa
export const SVG_CLOUD = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 54 26" width="54" height="26">
  <path d="M12 20 h30 a8 8 0 0 0 0 -14 a10 10 0 0 0 -18 -2 a8 8 0 0 0 -12 16 z" fill="#FFFFFF" opacity="0.8" />
</svg>
`

// Exportar Data URIs listos para usar en Image() de HTML5 Canvas
export const SPRITES_DATA_URI = {
  yoshiRun1: toDataUri(SVG_YOSHI_RUN_1),
  yoshiRun2: toDataUri(SVG_YOSHI_RUN_2),
  yoshiJump: toDataUri(SVG_YOSHI_JUMP),
  yoshiDuck: toDataUri(SVG_YOSHI_DUCK),
  piranhaPipe: toDataUri(SVG_PIRANHA_PIPE),
  koopaShell: toDataUri(SVG_KOOPA_SHELL),
  paratroopa: toDataUri(SVG_PARATROOPA),
  yoshiEgg: toDataUri(SVG_YOSHI_EGG),
  goldCoin: toDataUri(SVG_GOLD_COIN),
  cloud: toDataUri(SVG_CLOUD),
}
