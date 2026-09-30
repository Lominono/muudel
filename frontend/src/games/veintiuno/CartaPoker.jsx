// frontend/src/games/veintiuno/CartaPoker.jsx
import { useState, useEffect } from 'react'

/**
 * Componente visual de carta de póker con animación de reparto física realista.
 * Soporta imágenes reales de la web (Deck of Cards API) con respaldo garantizado
 * mediante gráficos vectoriales SVG artesanales de alta definición si falla la red.
 */
export function CartaPoker({
  carta,
  tamano = 'md',
  girar = false,
  animarEntrada = true,
  delayAnimacion = 0,
  resaltar = false,
  className = '',
  style = {}
}) {
  const [imgError, setImgError] = useState(false)
  const [volteando, setVolteando] = useState(false)

  // Detectar cuando una carta pasa de oculta a revelada para disparar giro 3D
  useEffect(() => {
    if (carta && !carta.oculta && carta.fueRevelada) {
      setVolteando(true)
      const t = setTimeout(() => setVolteando(false), 500)
      return () => clearTimeout(t)
    }
  }, [carta?.oculta, carta?.fueRevelada])

  if (!carta) return null

  // Dimensiones según tamaño
  const medidas = {
    sm: { w: 58, h: 84, fs: 11, iconSize: 10, radio: 6 },
    md: { w: 76, h: 110, fs: 13, iconSize: 13, radio: 8 },
    lg: { w: 96, h: 140, fs: 16, iconSize: 16, radio: 10 }
  }[tamano] || { w: 76, h: 110, fs: 13, iconSize: 13, radio: 8 }

  const esOculta = Boolean(carta.oculta)
  const esRojo = carta.palo === 'corazones' || carta.palo === 'diamantes'
  const colorTinta = esRojo ? '#D70015' : '#1C1C1E'

  // URL oficial de cartas de póker de la web
  const imgUrl = esOculta
    ? 'https://deckofcardsapi.com/static/img/back.png'
    : carta.imgUrl || `https://deckofcardsapi.com/static/img/${carta.codeImg || 'AS'}.png`

  return (
    <div
      className={`carta-poker-contenedor ${className}`}
      style={{
        width: medidas.w,
        height: medidas.h,
        perspective: '1000px',
        display: 'inline-block',
        position: 'relative',
        userSelect: 'none',
        animation: animarEntrada
          ? `dealCardSlide 0.38s cubic-bezier(0.18, 0.89, 0.32, 1.15) ${delayAnimacion}s both`
          : 'none',
        ...style
      }}
    >
      <style>{`
        @keyframes dealCardSlide {
          0% {
            opacity: 0;
            transform: translate(80px, -90px) scale(0.6) rotate(20deg);
            box-shadow: 0 20px 35px rgba(0, 0, 0, 0.6);
          }
          65% {
            opacity: 1;
            transform: translate(-3px, 3px) scale(1.04) rotate(-3deg);
          }
          100% {
            opacity: 1;
            transform: translate(0, 0) scale(1) rotate(0deg);
            box-shadow: 0 4px 12px rgba(0,0,0,0.22), 0 1px 3px rgba(0,0,0,0.12);
          }
        }
        @keyframes flipCard3D {
          0% {
            transform: rotateY(180deg) scale(0.95);
          }
          50% {
            transform: rotateY(90deg) scale(1.08);
          }
          100% {
            transform: rotateY(0deg) scale(1);
          }
        }
      `}</style>

      <div
        style={{
          width: '100%',
          height: '100%',
          borderRadius: medidas.radio,
          boxShadow: resaltar
            ? '0 0 18px rgba(245, 158, 11, 0.8), 0 4px 12px rgba(0,0,0,0.3)'
            : '0 4px 12px rgba(0,0,0,0.22), 0 1px 3px rgba(0,0,0,0.12)',
          border: resaltar ? '2px solid #FDE68A' : 'none',
          transition: 'transform 0.4s cubic-bezier(0.2, 0.8, 0.2, 1), box-shadow 0.2s ease',
          transform: volteando
            ? 'rotateY(0deg)'
            : girar
            ? 'rotateY(180deg)'
            : 'none',
          animation: volteando ? 'flipCard3D 0.45s ease-out' : 'none',
          transformStyle: 'preserve-3d',
          position: 'relative',
          backgroundColor: '#FFFFFF',
          overflow: 'hidden'
        }}
      >
        {/* Intento 1: Imagen real de póker de la web */}
        {!imgError ? (
          <img
            src={imgUrl}
            alt={esOculta ? 'Carta oculta' : `${carta.label || carta.valor} de ${carta.palo}`}
            loading="lazy"
            onError={() => setImgError(true)}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'contain',
              display: 'block',
              backgroundColor: '#FFFFFF'
            }}
          />
        ) : (
          /* Intento 2: Respaldo Vectorial SVG Artesanal (Inmune a adblockers/offline) */
          esOculta ? (
            <ReversoCartaSvg medidas={medidas} />
          ) : (
            <AnversoCartaSvg carta={carta} medidas={medidas} colorTinta={colorTinta} />
          )
        )}
      </div>
    </div>
  )
}

/**
 * Respaldo vectorial de reverso de carta de casino
 */
function ReversoCartaSvg({ medidas }) {
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        backgroundColor: '#7F1D1D',
        backgroundImage: `
          radial-gradient(#991B1B 15%, transparent 16%),
          radial-gradient(#991B1B 15%, transparent 16%)
        `,
        backgroundSize: '12px 12px',
        backgroundPosition: '0 0, 6px 6px',
        border: '3px solid #FFFFFF',
        borderRadius: medidas.radio,
        boxSizing: 'border-box',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative'
      }}
    >
      <div
        style={{
          width: '75%',
          height: '80%',
          border: '1px solid rgba(255,255,255,0.4)',
          borderRadius: 4,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'rgba(127, 29, 29, 0.7)'
        }}
      >
        <span
          style={{
            color: '#FDE68A',
            fontSize: medidas.fs - 1,
            fontWeight: 800,
            fontFamily: 'serif',
            letterSpacing: 1
          }}
        >
          SMR2
        </span>
      </div>
    </div>
  )
}

/**
 * Respaldo vectorial de anverso de carta con tipografía clásica e índices
 */
function AnversoCartaSvg({ carta, medidas, colorTinta }) {
  const esFigura = ['J', 'Q', 'K', 'A'].includes(carta.valor)

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        backgroundColor: '#FCFCFC',
        border: '1px solid rgba(0,0,0,0.14)',
        borderRadius: medidas.radio,
        boxSizing: 'border-box',
        padding: '4px 6px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        position: 'relative',
        color: colorTinta,
        fontFamily: 'Georgia, "Times New Roman", serif'
      }}
    >
      {/* Índice superior izquierdo */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', lineHeight: 1, width: 14 }}>
        <span style={{ fontSize: medidas.fs, fontWeight: 900 }}>{carta.valor}</span>
        <span style={{ fontSize: medidas.iconSize, marginTop: 1 }}>{carta.simbolo}</span>
      </div>

      {/* Motivo central */}
      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        {esFigura ? (
          <div style={{ textAlign: 'center' }}>
            <span style={{ fontSize: medidas.h * 0.32, display: 'block', lineHeight: 1 }}>
              {carta.simbolo}
            </span>
            <span
              style={{
                fontSize: medidas.fs - 2,
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: 0.5,
                opacity: 0.8
              }}
            >
              {carta.label || carta.valor}
            </span>
          </div>
        ) : (
          <span style={{ fontSize: medidas.h * 0.38, lineHeight: 1 }}>
            {carta.simbolo}
          </span>
        )}
      </div>

      {/* Índice inferior derecho invertido */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          lineHeight: 1,
          width: 14,
          alignSelf: 'flex-end',
          transform: 'rotate(180deg)'
        }}
      >
        <span style={{ fontSize: medidas.fs, fontWeight: 900 }}>{carta.valor}</span>
        <span style={{ fontSize: medidas.iconSize, marginTop: 1 }}>{carta.simbolo}</span>
      </div>
    </div>
  )
}
