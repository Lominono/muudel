import { useState, useEffect } from 'react'
import { Users, Flame, Award, ArrowUpRight } from 'lucide-react'

export function MetaAsistenciaAula({ totalAlumnos = 20, asistenciasConfirmadas = 0, onAbrirChat }) {
  const metaPorcentaje = 85
  const total = Math.max(totalAlumnos, 1)
  const porcentaje = Math.min(100, Math.round((asistenciasConfirmadas / total) * 100))
  const faltanParaMeta = Math.max(0, Math.ceil((metaPorcentaje / 100) * total) - asistenciasConfirmadas)
  const metaCumplida = porcentaje >= metaPorcentaje

  return (
    <div className="card" style={{
      padding: '16px 18px',
      marginBottom: 16,
      backgroundColor: metaCumplida ? 'rgba(52, 199, 89, 0.08)' : 'var(--color-surface)',
      border: metaCumplida ? '1.5px solid rgba(52, 199, 89, 0.35)' : '1px solid var(--color-separator)'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            width: 32,
            height: 32,
            borderRadius: 10,
            backgroundColor: metaCumplida ? 'rgba(52, 199, 89, 0.2)' : 'rgba(10, 132, 255, 0.12)',
            color: metaCumplida ? 'var(--color-positive)' : 'var(--color-accent)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Users size={17} />
          </div>
          <div>
            <h4 style={{ fontSize: 15, fontWeight: 700, color: 'var(--color-ink)' }}>
              ¿Cuántos estamos en clase hoy?
            </h4>
            <p style={{ fontSize: 12, color: 'var(--color-secondary-ink)' }}>
              {asistenciasConfirmadas} de {total} de la peña han fichado ({porcentaje}%)
            </p>
          </div>
        </div>

        <span className="tabular-nums" style={{
          fontSize: 13,
          fontWeight: 700,
          color: metaCumplida ? 'var(--color-positive)' : 'var(--color-accent)'
        }}>
          {porcentaje}%
        </span>
      </div>

      {/* Barra de progreso de asistencia grupal */}
      <div style={{
        height: 8,
        borderRadius: 9999,
        backgroundColor: 'var(--color-fill-secondary)',
        overflow: 'hidden',
        position: 'relative',
        marginBottom: 12
      }}>
        <div style={{
          height: '100%',
          width: `${porcentaje}%`,
          backgroundColor: metaCumplida ? 'var(--color-positive)' : 'var(--color-accent)',
          borderRadius: 9999,
          transition: 'width 0.4s ease'
        }} />
      </div>

      {/* Estado del reto cooperativo */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        fontSize: 12,
        color: 'var(--color-secondary-ink)',
        lineHeight: 1.3
      }}>
        {metaCumplida ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--color-positive)', fontWeight: 600 }}>
            <Award size={15} />
            <span>¡Meta del 85% alcanzada! +15 pts de bonus para toda la clase</span>
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Flame size={14} color="var(--color-warning)" />
            <span>
              {faltanParaMeta === 1
                ? '¡Falta solo 1 colega para el 85% y activar el bonus de +15 pts!'
                : `Faltan ${faltanParaMeta} personas para el bonus de grupo (+15 pts c/u)`}
            </span>
          </div>
        )}

        {onAbrirChat && !metaCumplida && (
          <button
            onClick={onAbrirChat}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--color-accent)',
              fontWeight: 600,
              fontSize: 12,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 2,
              padding: 0
            }}
          >
            <span>Avisar al chat</span>
            <ArrowUpRight size={13} />
          </button>
        )}
      </div>
    </div>
  )
}
