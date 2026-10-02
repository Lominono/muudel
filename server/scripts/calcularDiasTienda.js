// server/scripts/calcularDiasTienda.js
import { CATALOGO_PRECIOS_BASE } from '../config/tiendaPreciosConfig.js'

// Ingresos diarios de la simulación Monte Carlo
// Casual: 2.75 SE/día (bruto) | ~2.15 SE/día (neto con 1 apuesta pequeña de 2 SE c/ 2 días)
// Normal: 8.40 SE/día (bruto) | ~6.80 SE/día (neto con 1 apuesta de 5 SE/día)
// Muy Activo: 19.79 SE/día (bruto) | ~16.50 SE/día (neto con 2 apuestas de 10 SE/día)

const PERFILES = {
  CASUAL: { nombre: 'Casual (2 partidas/d)', sinApuestas: 2.75, conApuestas: 2.15 },
  NORMAL: { nombre: 'Normal (6 partidas/d)', sinApuestas: 8.40, conApuestas: 6.80 },
  ACTIVO: { nombre: 'Muy Activo (20 partidas/d)', sinApuestas: 19.79, conApuestas: 16.50 }
}

console.log('| Tramo | Artículo (`item_id`) | Nombre | Precio Ant. | **Nuevo Precio** | Casual (Sin/Con Apuestas) | Normal (Sin/Con Apuestas) | Activo (Sin/Con Apuestas) |')
console.log('| :--- | :--- | :--- | :---: | :---: | :---: | :---: | :---: |')

for (const item of CATALOGO_PRECIOS_BASE) {
  const dCasSin = (item.precio / PERFILES.CASUAL.sinApuestas).toFixed(1)
  const dCasCon = (item.precio / PERFILES.CASUAL.conApuestas).toFixed(1)
  const dNorSin = (item.precio / PERFILES.NORMAL.sinApuestas).toFixed(1)
  const dNorCon = (item.precio / PERFILES.NORMAL.conApuestas).toFixed(1)
  const dActSin = (item.precio / PERFILES.ACTIVO.sinApuestas).toFixed(1)
  const dActCon = (item.precio / PERFILES.ACTIVO.conApuestas).toFixed(1)

  const tramoCap = item.tramo.toUpperCase()
  console.log(`| **${tramoCap}** | \`${item.id}\` | ${item.titulo} | ${item.precioAnterior} SE | **${item.precio} SE** | ${dCasSin}d / ${dCasCon}d | ${dNorSin}d / ${dNorCon}d | ${dActSin}d / ${dActCon}d |`)
}
