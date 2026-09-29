// frontend/src/components/ArbolCompetencias.jsx
// Árbol de Competencias y Habilidades Técnicas SMR2
import { useState, useEffect } from 'react'
import { CATALOGO_SKILLS, calcularProgresoSkill } from '../utils/skillsData'
import { supabase } from '../utils/supabase'
import { Sparkles, Award, Terminal, Cpu, Shield, Zap, ChevronRight, Check } from 'lucide-react'

export function ArbolCompetencias({ perfil, onSkillSeleccionada }) {
  const [skillsUsuario, setSkillsUsuario] = useState({})
  const [cargando, setCargando] = useState(true)
  const [skillAbierta, setSkillAbierta] = useState(null)

  useEffect(() => {
    if (!perfil?.id) return
    cargarSkills()
  }, [perfil?.id])

  const cargarSkills = async () => {
    setCargando(true)
    try {
      // 1. Intentar cargar desde tabla user_skills
      const { data, error } = await supabase
        .from('user_skills')
        .select('*')
        .eq('user_id', perfil.id)

      if (data && data.length > 0) {
        const mapa = {}
        data.forEach(s => {
          mapa[s.skill_id] = { nivel: s.nivel, xp: s.xp }
        })
        setSkillsUsuario(mapa)
        setCargando(false)
        return
      }

      // 2. Si perfil ya tiene JSONB de skills
      if (perfil.skills && typeof perfil.skills === 'object') {
        setSkillsUsuario(perfil.skills)
      } else {
        // Inicializar competencias básicas para el alumno
        setSkillsUsuario({
          linux_bash: { nivel: 1, xp: 25 },
          redes_vlans: { nivel: 1, xp: 15 },
          hardware_taller: { nivel: 1, xp: 20 },
          autoria_tecnica: { nivel: 1, xp: 30 }
        })
      }
    } catch (e) {
      console.warn('Cargando skills de perfil local:', e)
    } finally {
      setCargando(false)
    }
  }

  return (
    <section className="card" style={{ marginTop: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <div>
          <h3 className="apple-headline" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span>Competencias Técnicas SMR2</span>
            <span className="sello-tinta sello-tinta-azul" style={{ fontSize: 9, padding: '2px 6px' }}>
              OFICIAL
            </span>
          </h3>
          <p className="apple-subheadline" style={{ fontSize: 13, marginTop: 2 }}>
            Progreso real demostrado en prácticas, retos y resolución de dudas de clase.
          </p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
        {CATALOGO_SKILLS.map(skill => {
          const info = skillsUsuario[skill.id] || { nivel: 1, xp: 0 }
          const { nivel, xpActualEnNivel, porcentaje } = calcularProgresoSkill(info.xp || 0, skill.xpPorNivel)
          const esExpandida = skillAbierta === skill.id

          return (
            <div
              key={skill.id}
              onClick={() => setSkillAbierta(esExpandida ? null : skill.id)}
              style={{
                backgroundColor: 'var(--color-surface)',
                border: '1px solid var(--color-separator)',
                borderRadius: 14,
                padding: '14px 16px',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                position: 'relative',
                overflow: 'hidden'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 24 }}>{skill.icono}</span>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--color-ink)' }}>
                      {skill.nombre}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--color-secondary-ink)', fontWeight: 600 }}>
                      Nivel {nivel} · {info.xp || 0} XP acumulados
                    </div>
                  </div>
                </div>

                <div
                  style={{
                    backgroundColor: `${skill.color}15`,
                    color: skill.color,
                    padding: '3px 8px',
                    borderRadius: 8,
                    fontWeight: 800,
                    fontSize: 11
                  }}
                >
                  Rango {nivel}
                </div>
              </div>

              {/* Barra de Progreso del Nivel */}
              <div style={{ height: 6, backgroundColor: 'var(--color-surface-secondary)', borderRadius: 99, overflow: 'hidden', margin: '8px 0 10px' }}>
                <div
                  style={{
                    height: '100%',
                    width: `${porcentaje}%`,
                    backgroundColor: skill.color,
                    borderRadius: 99,
                    transition: 'width 0.4s ease'
                  }}
                />
              </div>

              <p style={{ fontSize: 12, color: 'var(--color-secondary-ink)', margin: 0, lineHeight: 1.4 }}>
                {skill.desc}
              </p>

              {esExpandida && (
                <div style={{ marginTop: 12, paddingTop: 10, borderTop: '1px dashed var(--color-separator)' }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-ink)', marginBottom: 6 }}>
                    Conceptos clave dominados:
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 8 }}>
                    {skill.etiquetas.map(tag => (
                      <span
                        key={tag}
                        style={{
                          fontSize: 10,
                          backgroundColor: 'var(--color-surface-secondary)',
                          color: 'var(--color-ink)',
                          padding: '2px 7px',
                          borderRadius: 6,
                          fontFamily: 'monospace'
                        }}
                      >
                        {tag}
                      </span>
                    ))}
                  </div>

                  <div style={{ fontSize: 11, fontStyle: 'italic', color: 'var(--color-secondary-ink)' }}>
                    🎯 Meta: {skill.hito}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </section>
  )
}
