import { obtenerIniciales, obtenerColorPorNombre } from '../utils/supabase'
import { ShieldCheck } from 'lucide-react'

export function AvatarUsuario({
  nombre = 'Alumno',
  color = null,
  rol = 'alumno',
  size = 36,
  fontSize = null,
  showRoleBadge = false,
  marco = null,
  className = '',
  style = {},
}) {
  const iniciales = obtenerIniciales(nombre)
  const bgColor = color || obtenerColorPorNombre(nombre)
  const calcFontSize = fontSize || Math.max(Math.round(size * 0.4), 11)
  const esModerador = rol === 'moderador'

  // Estilos de marco activo temporal o permanente
  const getMarcoEstilo = () => {
    switch (marco) {
      case 'oro':
        return {
          boxShadow: '0 0 0 2px var(--color-surface), 0 0 0 4.5px #D4AF37, 0 2px 10px rgba(212, 175, 55, 0.45)',
          transform: 'scale(0.96)',
        }
      case 'fuego':
        return {
          boxShadow: '0 0 0 2px var(--color-surface), 0 0 0 4.5px #FF9500, 0 2px 10px rgba(255, 149, 0, 0.45)',
          transform: 'scale(0.96)',
        }
      case 'cyber':
        return {
          boxShadow: '0 0 0 2px var(--color-surface), 0 0 0 4.5px #00F0FF, 0 2px 10px rgba(0, 240, 255, 0.45)',
          transform: 'scale(0.96)',
        }
      case 'tinta':
        return {
          boxShadow: '0 0 0 2px var(--color-surface), 0 0 0 4.5px #FF3B30, 0 2px 8px rgba(255, 59, 48, 0.4)',
          transform: 'scale(0.96)',
        }
      case 'esmeralda':
        return {
          boxShadow: '0 0 0 2px var(--color-surface), 0 0 0 4.5px #34C759, 0 2px 8px rgba(52, 199, 89, 0.4)',
          transform: 'scale(0.96)',
        }
      case 'obsidiana':
        return {
          boxShadow: '0 0 0 2px var(--color-surface), 0 0 0 4.5px #8E8E93, 0 2px 8px rgba(142, 142, 147, 0.4)',
          transform: 'scale(0.96)',
        }
      default:
        return {
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
        }
    }
  }

  return (
    <div
      className={className}
      style={{
        position: 'relative',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: size,
        height: size,
        borderRadius: 9999,
        backgroundColor: bgColor,
        color: '#FFFFFF',
        fontWeight: 700,
        fontSize: calcFontSize,
        letterSpacing: -0.2,
        userSelect: 'none',
        flexShrink: 0,
        transition: 'box-shadow 0.25s ease, transform 0.25s ease',
        ...getMarcoEstilo(),
        ...style,
      }}
      title={nombre}
    >
      <span>{iniciales}</span>
      {showRoleBadge && esModerador && (
        <span
          title="Moderador oficial"
          style={{
            position: 'absolute',
            bottom: -2,
            right: -2,
            width: Math.max(Math.round(size * 0.38), 16),
            height: Math.max(Math.round(size * 0.38), 16),
            borderRadius: 9999,
            backgroundColor: '#D4AF37',
            color: '#FFFFFF',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '2px solid var(--color-surface)',
            boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
          }}
        >
          <ShieldCheck size={Math.max(Math.round(size * 0.24), 10)} strokeWidth={2.6} />
        </span>
      )}
    </div>
  )
}
