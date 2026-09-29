// frontend/src/utils/skillsData.js
// Catálogo y Motor de Competencias Técnicas SMR2 (Skills de Clase)
import { supabase } from './supabase'

export const CATALOGO_SKILLS = [
  {
    id: 'linux_bash',
    nombre: 'Terminal & Scripting Linux',
    desc: 'Dominio de comandos GNU/Linux, gestión de usuarios, permisos octales y scripts Bash.',
    icono: '🐧',
    color: '#0A84FF',
    nivelMax: 5,
    xpPorNivel: 100,
    etiquetas: ['Bash', 'chmod', 'systemctl', 'grep', 'cron'],
    hito: 'Capaz de automatizar tareas de aula y administrar servidores desde consola.'
  },
  {
    id: 'redes_vlans',
    nombre: 'Enrutamiento & VLANs Cisco',
    desc: 'Configuración de topologías de red, subredes IPv4/IPv6, switches y enlaces troncales 802.1Q.',
    icono: '🌐',
    color: '#FF9500',
    nivelMax: 5,
    xpPorNivel: 100,
    etiquetas: ['VLAN 10/20', 'Packet Tracer', 'Trunking', 'Subredes', 'Router on a Stick'],
    hito: 'Diseña y soluciona problemas en topologías de red complejas.'
  },
  {
    id: 'hardware_taller',
    nombre: 'Montaje & Taller Hardware',
    desc: 'Diagnóstico físico de placas base, memoria RAM, fuentes de alimentación y mantenimiento preventivo.',
    icono: '🛠️',
    color: '#34C759',
    nivelMax: 5,
    xpPorNivel: 100,
    etiquetas: ['Pasta térmica', 'BIOS/UEFI', 'Polímetro', 'Socket LGA/AM4', 'POST beeps'],
    hito: 'Ensambla y repara puestos informáticos sin errores en el laboratorio.'
  },
  {
    id: 'seguridad_red',
    nombre: 'Ciberseguridad & Cortafuegos',
    desc: 'Políticas de contraseñas, auditoría con Nmap, análisis de paquetes Wireshark y reglas de filtrado.',
    icono: '🛡️',
    color: '#FF3B30',
    nivelMax: 5,
    xpPorNivel: 100,
    etiquetas: ['iptables', 'Nmap', 'ACLs', 'Wireshark', 'SSH Keys'],
    hito: 'Asegura sistemas contra intrusiones no deseadas en la red local.'
  },
  {
    id: 'servicios_servidores',
    nombre: 'Servicios en Red & Servidores',
    desc: 'Despliegue y administración de servidores DHCP, resolución DNS, servidores web y compartición.',
    icono: '⚡',
    color: '#AF52DE',
    nivelMax: 5,
    xpPorNivel: 100,
    etiquetas: ['DHCP Server', 'DNS Bind9', 'Apache/Nginx', 'Samba', 'FTP'],
    hito: 'Pone en marcha servicios de red indispensables para el funcionamiento del aula.'
  },
  {
    id: 'autoria_tecnica',
    nombre: 'Documentación & Anti-IA',
    desc: 'Capacidad de redactar memorias técnicas propias, esquemas a mano y explicaciones sin texto sintético.',
    icono: '✍️',
    color: '#5856D6',
    nivelMax: 5,
    xpPorNivel: 100,
    etiquetas: ['Apuntes a mano', 'Esquema de red', 'Autoría propia', 'Explicación técnica'],
    hito: 'Comunica conceptos técnicos de forma humana, clara y verificada.'
  }
]

/**
 * Calcula nivel y porcentaje de progreso dentro del nivel actual
 */
export function calcularProgresoSkill(xpTotal = 0, xpPorNivel = 100) {
  const nivel = Math.min(5, Math.floor(xpTotal / xpPorNivel) + 1)
  const xpActualEnNivel = xpTotal % xpPorNivel
  const porcentaje = nivel >= 5 ? 100 : Math.round((xpActualEnNivel / xpPorNivel) * 100)
  return { nivel, xpActualEnNivel, porcentaje }
}

/**
 * Suma XP a una habilidad específica y la persiste en Supabase y localmente
 */
export async function sumarXpSkill(userId, skillId, cantidadXp = 15) {
  if (!userId || !skillId) return null

  try {
    // 1. Consultar estado actual
    const { data: existente } = await supabase
      .from('user_skills')
      .select('*')
      .eq('user_id', userId)
      .eq('skill_id', skillId)
      .maybeSingle()

    const xpPrevio = existente?.xp || 0
    const nuevoXp = xpPrevio + cantidadXp
    const nuevoNivel = Math.min(5, Math.floor(nuevoXp / 100) + 1)

    // 2. Upsert en user_skills
    await supabase.from('user_skills').upsert({
      user_id: userId,
      skill_id: skillId,
      nivel: nuevoNivel,
      xp: nuevoXp,
      ultimo_avance: new Date().toISOString()
    })

    // 3. Actualizar JSONB en profiles para lecturas rápidas
    const { data: prof } = await supabase.from('profiles').select('skills').eq('id', userId).single()
    const mapaActual = prof?.skills || {}
    mapaActual[skillId] = { nivel: nuevoNivel, xp: nuevoXp }

    await supabase.from('profiles').update({ skills: mapaActual }).eq('id', userId)

    return { skillId, nivel: nuevoNivel, xp: nuevoXp }
  } catch (e) {
    console.warn('Error al actualizar skill en Supabase:', e)
    return null
  }
}
