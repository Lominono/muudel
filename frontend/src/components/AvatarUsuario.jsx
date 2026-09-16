import { obtenerIniciales, obtenerColorPorNombre } from '../utils/supabase'
import { ShieldCheck } from 'lucide-react'

export function AvatarUsuario({
  nombre = 'Alumno',
  color = null,
  rol = 'alumno',
  size = 36,
  fontSize = null,
  showRoleBadge = false,
  className = '',
}) {
  const iniciales = obtenerIniciales(nombre)
  const bgColor = color || obtenerColorPorNombre(nombre)
  const calcFontSize = fontSize || Math.max(Math.round(size * 0.4), 11)
  const esModerador = rol === 'moderador'

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
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
      }}
      title={`${nombre} ${esModerador ? '(Profesor/Admin)' : ''}`}
    >
      <span>{iniciales}</span>

      {showRoleBadge && esModerador && (
        <span
          style={{
            position: 'absolute',
            bottom: -2,
            right: -2,
            backgroundColor: 'var(--color-surface)',
            color: 'var(--color-accent)',
            borderRadius: 9999,
            padding: 2,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 1px 2px rgba(0,0,0,0.15)',
          }}
        >
          <ShieldCheck size={Math.max(Math.round(size * 0.38), 12)} />
        </span>
      )}
    </div>
  )
}
