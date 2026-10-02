// server/config/yoshiRouletteConfig.js
/**
 * Configuración centralizada de la Ruleta de Yoshi.
 * Las monedas de Yoshi se consiguen en el juego y SOLO sirven para apostar aquí.
 * Lo que se gana son StevenEuros (SE).
 *
 * Probabilidades calibradas para valor esperado E[X] < 1.0 (anti-inflación).
 */

export const YOSHI_ROULETTE_CONFIG = {
  // Límite máximo de monedas de Yoshi que un alumno puede acumular guardadas
  MAX_SALDO_GUARDADO: 500,

  // Cooldown mínimo obligatorio entre tiradas en milisegundos (anti-abuso)
  SPIN_COOLDOWN_MS: 3000,

  // Límite máximo diario de StevenEuros que se pueden ganar en la ruleta
  MAX_DAILY_STEVEEUROS: 350,

  // Definición de los segmentos de la ruleta (en orden en la rueda)
  // Total probabilidad = 100%
  // E[X] = (0 * 0.42) + (0.5 * 0.24) + (1.5 * 0.18) + (2.0 * 0.10) + (5.0 * 0.05) + (10.0 * 0.01)
  //      = 0 + 0.120 + 0.270 + 0.200 + 0.250 + 0.100 = 0.940 (< 1.0)
  SEGMENTOS: [
    {
      id: 'perder',
      multiplicador: 0,
      label: 'x0 Pierde',
      descripcion: 'La suerte no acompañó',
      probabilidad: 0.42,
      color: '#EF4444',       // Rojo corrector / fallo
      textoColor: '#FFFFFF',
      icono: '💀'
    },
    {
      id: 'mitad',
      multiplicador: 0.5,
      label: 'x0.5 Mitad',
      descripcion: 'Recuperas la mitad de lo apostado',
      probabilidad: 0.24,
      color: '#64748B',       // Gris pizarra sistema
      textoColor: '#FFFFFF',
      icono: '🛡️'
    },
    {
      id: 'moderado',
      multiplicador: 1.5,
      label: 'x1.5 Acierto',
      descripcion: 'Ganancia moderada (+50%)',
      probabilidad: 0.18,
      color: '#0284C7',       // Azul sistema
      textoColor: '#FFFFFF',
      icono: '⭐'
    },
    {
      id: 'doble',
      multiplicador: 2.0,
      label: 'x2 Doble',
      descripcion: '¡Duplicas tu apuesta!',
      probabilidad: 0.10,
      color: '#16A34A',       // Verde acierto
      textoColor: '#FFFFFF',
      icono: '🔥'
    },
    {
      id: 'gran_premio',
      multiplicador: 5.0,
      label: 'x5 ¡Premio!',
      descripcion: '¡Multiplicador x5 masivo!',
      probabilidad: 0.05,
      color: '#EAB308',       // Oro
      textoColor: '#000000',
      icono: '💰'
    },
    {
      id: 'jackpot',
      multiplicador: 10.0,
      label: 'x10 JACKPOT',
      descripcion: '¡Premio especial legendario x10!',
      probabilidad: 0.01,
      color: '#9333EA',       // Púrpura real / Corona
      textoColor: '#FFFFFF',
      icono: '👑'
    }
  ]
}
