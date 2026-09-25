// Horario oficial SMR2 Tarde 26-27
export const ASIGNATURAS = {
  DIG: { codigo: 'DIG', nombre: 'Digitalización', profesor: 'Raúl Calderón Macias', color: '#0A84FF', colorBg: 'rgba(10, 132, 255, 0.12)' },
  PI: { codigo: 'PI', nombre: 'Proyecto Intermodular', profesor: 'Raúl Calderón Macias', color: '#6E7781', colorBg: 'rgba(110, 119, 129, 0.14)' },
  SOR: { codigo: 'SOR', nombre: 'Sistemas Operativos en Red', profesor: 'Alfonso Pereda Rodríguez', color: '#5B86E5', colorBg: 'rgba(91, 134, 229, 0.14)' },
  SR: { codigo: 'SR', nombre: 'Servicios en Red', profesor: 'María Setien Taboga', color: '#30D158', colorBg: 'rgba(48, 209, 88, 0.14)' },
  IPE2: { codigo: 'IPE2', nombre: 'Itinerario Personal para la Empleabilidad 2', profesor: 'Nieves Berrazueta Jiménez', color: '#B8860B', colorBg: 'rgba(184, 134, 11, 0.14)' },
  SI1: { codigo: 'SI1', nombre: 'Seguridad Informática 1', profesor: 'José Iván Gómez Alvarado', color: '#FF9F0A', colorBg: 'rgba(255, 159, 10, 0.14)' },
  AW: { codigo: 'AW', nombre: 'Aplicaciones Web', profesor: 'David Gragera Iglesias', color: '#FFD60A', colorBg: 'rgba(255, 214, 10, 0.16)' },
  MEP: { codigo: 'MEP', nombre: 'Montaje y Mantenimiento de Equipos Portátiles', profesor: 'Ángel Dámaso Gómez Fernández', color: '#FF453A', colorBg: 'rgba(255, 69, 58, 0.14)' },
}

export const HORAS = [
  { id: 1, rango: '15:30 - 16:20', inicio: '15:30', fin: '16:20' },
  { id: 2, rango: '16:20 - 17:15', inicio: '16:20', fin: '17:15' },
  { id: 3, rango: '17:15 - 18:10', inicio: '17:15', fin: '18:10' },
  { id: 'descanso', rango: '18:10 - 18:35', inicio: '18:10', fin: '18:35', esDescanso: true },
  { id: 4, rango: '18:35 - 19:30', inicio: '18:35', fin: '19:30' },
  { id: 5, rango: '19:30 - 20:25', inicio: '19:30', fin: '20:25' },
  { id: 6, rango: '20:25 - 21:15', inicio: '20:25', fin: '21:15' },
]

export const HORARIO_SEMANAL = {
  // 1: Lunes
  1: [
    { horaId: 1, codigo: 'DIG' },
    { horaId: 2, codigo: 'PI' },
    { horaId: 3, codigo: 'SOR' },
    { horaId: 'descanso', esDescanso: true },
    { horaId: 4, codigo: 'SOR' },
    { horaId: 5, codigo: 'SR' },
    { horaId: 6, codigo: 'SR' },
  ],
  // 2: Martes
  2: [
    { horaId: 1, codigo: 'IPE2' },
    { horaId: 2, codigo: 'IPE2' },
    { horaId: 3, codigo: 'SI1' },
    { horaId: 'descanso', esDescanso: true },
    { horaId: 4, codigo: 'SI1' },
    { horaId: 5, codigo: 'SOR' },
    { horaId: 6, codigo: 'SOR' },
  ],
  // 3: Miércoles
  3: [
    { horaId: 1, codigo: 'IPE2' },
    { horaId: 2, codigo: 'SR' },
    { horaId: 3, codigo: 'SR' },
    { horaId: 'descanso', esDescanso: true },
    { horaId: 4, codigo: 'SOR' },
    { horaId: 5, codigo: 'SOR' },
    { horaId: 6, codigo: 'SOR' },
  ],
  // 4: Jueves
  4: [
    { horaId: 1, codigo: 'AW' },
    { horaId: 2, codigo: 'AW' },
    { horaId: 3, codigo: 'AW' },
    { horaId: 'descanso', esDescanso: true },
    { horaId: 4, codigo: 'SI1' },
    { horaId: 5, codigo: 'SI1' },
    { horaId: 6, codigo: 'SI1' },
  ],
  // 5: Viernes
  5: [
    { horaId: 1, codigo: 'AW' },
    { horaId: 2, codigo: 'AW' },
    { horaId: 3, codigo: 'MEP' },
    { horaId: 'descanso', esDescanso: true },
    { horaId: 4, codigo: 'MEP' },
    { horaId: 5, codigo: 'SR' },
    { horaId: 6, codigo: 'SR' },
  ]
}

export function getClaseActual(fecha = new Date()) {
  const dia = fecha.getDay() // 0: Dom, 1: Lun, ... 5: Vie, 6: Sab
  if (dia < 1 || dia > 5) return null

  const horas = fecha.getHours()
  const minutos = fecha.getMinutes()
  const minutosActuales = horas * 60 + minutos

  // Tramos en minutos
  const tramos = [
    { id: 1, inicio: 15 * 60 + 30, fin: 16 * 60 + 20 },
    { id: 2, inicio: 16 * 60 + 20, fin: 17 * 60 + 15 },
    { id: 3, inicio: 17 * 60 + 15, fin: 18 * 60 + 10 },
    { id: 'descanso', inicio: 18 * 60 + 10, fin: 18 * 60 + 35, esDescanso: true },
    { id: 4, inicio: 18 * 60 + 35, fin: 19 * 60 + 30 },
    { id: 5, inicio: 19 * 60 + 30, fin: 20 * 60 + 25 },
    { id: 6, inicio: 20 * 60 + 25, fin: 21 * 60 + 15 },
  ]

  const tramoActual = tramos.find(t => minutosActuales >= t.inicio && minutosActuales < t.fin)
  if (!tramoActual) return null

  if (tramoActual.esDescanso) {
    return { esDescanso: true, nombre: 'Descanso de clase', rango: '18:10 - 18:35' }
  }

  const horarioHoy = HORARIO_SEMANAL[dia] || []
  const item = horarioHoy.find(h => h.horaId === tramoActual.id)
  if (!item || !ASIGNATURAS[item.codigo]) return null

  const horaInfo = HORAS.find(h => h.id === tramoActual.id)
  return {
    ...ASIGNATURAS[item.codigo],
    rango: horaInfo?.rango || '',
    esDescanso: false
  }
}
