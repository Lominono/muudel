import { supabase } from './supabase'

// Canal global de Supabase Realtime para toda la clase SMR2 Tarde
const CANAL_NOMBRE = 'aula_smr2_en_vivo'
let canalRealtime = null
let listenersRegistrados = new Map()

/**
 * Inicializa y devuelve la suscripción al canal en tiempo real de la clase
 */
export function obtenerCanalRealtime() {
  if (canalRealtime) return canalRealtime

  try {
    canalRealtime = supabase.channel(CANAL_NOMBRE, {
      config: {
        broadcast: { self: false }, // Los eventos broadcast se reciben en todos los demás clientes
        presence: { key: 'alumno' }
      }
    })

    // Escuchador genérico de broadcast para despachar a los suscriptores registrados y a window
    canalRealtime.on('broadcast', { event: '*' }, (payload) => {
      const { event, payload: datos } = payload || {}
      if (!event) return

      // Despachar a callbacks registrados
      const callbacks = listenersRegistrados.get(event) || []
      callbacks.forEach((cb) => {
        try {
          cb(datos)
        } catch (e) {
          console.error(`Error en listener de ${event}:`, e)
        }
      })

      // Despachar también evento nativo en window para máxima interoperabilidad
      try {
        window.dispatchEvent(new CustomEvent(`muudel-rt-${event}`, { detail: datos }))
      } catch (e) {}
    })

    // Suscripción a cambios en tablas de Postgres si Supabase Realtime está habilitado
    canalRealtime
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, (payload) => {
        window.dispatchEvent(new CustomEvent('muudel-rt-postgres-messages', { detail: payload }))
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'checkins' }, (payload) => {
        window.dispatchEvent(new CustomEvent('muudel-rt-postgres-checkins', { detail: payload }))
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, (payload) => {
        window.dispatchEvent(new CustomEvent('muudel-rt-postgres-profiles', { detail: payload }))
      })

    canalRealtime.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        console.log('🟢 Conectado al canal en tiempo real de clase SMR2')
      }
    })
  } catch (err) {
    console.warn('No se pudo inicializar canal Realtime de Supabase:', err)
  }

  return canalRealtime
}

/**
 * Emite un evento en tiempo real para TODOS los alumnos y administradores conectados
 * @param {string} evento - Nombre del evento (ej: 'efecto_chat', 'solicitud_asistencia', 'megafono')
 * @param {object} datos - Carga útil de datos del evento
 */
export async function transmitirEvento(evento, datos = {}) {
  const canal = obtenerCanalRealtime()
  
  // 1. Despacho local inmediato en el cliente emisor
  try {
    window.dispatchEvent(new CustomEvent(`muudel-rt-${evento}`, { detail: datos }))
  } catch (e) {}

  // 2. Transmisión por WebSocket a todos los demás dispositivos en vivo
  if (canal) {
    try {
      await canal.send({
        type: 'broadcast',
        event: evento,
        payload: {
          ...datos,
          _emisor_timestamp: Date.now()
        }
      })
    } catch (e) {
      console.warn(`Fallo al transmitir evento Realtime ${evento}:`, e)
    }
  }
}

/**
 * Suscribe un componente a un evento en tiempo real
 * @param {string} evento - Nombre del evento a escuchar
 * @param {Function} callback - Función que recibe los datos
 * @returns {Function} Función para cancelar la suscripción
 */
export function suscribirEvento(evento, callback) {
  obtenerCanalRealtime()

  if (!listenersRegistrados.has(evento)) {
    listenersRegistrados.set(evento, new Set())
  }
  listenersRegistrados.get(evento).add(callback)

  // También escuchar en window por si viene del cliente emisor
  const windowHandler = (e) => {
    callback(e.detail)
  }
  window.addEventListener(`muudel-rt-${evento}`, windowHandler)

  return () => {
    const set = listenersRegistrados.get(evento)
    if (set) {
      set.delete(callback)
    }
    window.removeEventListener(`muudel-rt-${evento}`, windowHandler)
  }
}

// Inicializar de inmediato al importar
obtenerCanalRealtime()
