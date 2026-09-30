// frontend/src/utils/oneSignal.js
export const ONESIGNAL_APP_ID = 'f1fdca06-67de-4056-930c-8c2035ced092'

/**
 * Ejecuta una acción de forma segura cuando el SDK de OneSignal esté listo.
 * Utiliza window.OneSignalDeferred para garantizar que no dependa del orden de carga.
 */
export function conOneSignal(callback) {
  if (typeof window === 'undefined') return
  window.OneSignalDeferred = window.OneSignalDeferred || []
  window.OneSignalDeferred.push(async function (OneSignal) {
    try {
      await callback(OneSignal)
    } catch (err) {
      console.warn('[OneSignal] Error al ejecutar callback:', err)
    }
  })
}

/**
 * Identifica al usuario actual en OneSignal usando su ID de Supabase como externalId.
 * Configura etiquetas (rol, nombre, username) y correo si existe.
 */
export function identificarUsuarioOneSignal(perfil) {
  if (!perfil?.id) return
  conOneSignal(async (OneSignal) => {
    try {
      // 1. Iniciar sesión / asociar External ID con OneSignal
      if (typeof OneSignal.login === 'function') {
        await OneSignal.login(perfil.id)
      }

      // 2. Asignar etiquetas útiles para segmentar en el aula
      if (OneSignal.User && typeof OneSignal.User.addTags === 'function') {
        const tags = {
          rol: perfil.rol || 'alumno',
          nombre: perfil.nombre || 'Alumno SMR2',
          username: perfil.username || '',
          digito_id: perfil.digito_id ? String(perfil.digito_id) : '',
          clase: 'SMR2'
        }
        await OneSignal.User.addTags(tags)
      }

      // 3. Añadir correo electrónico si está presente
      if (perfil.email && OneSignal.User && typeof OneSignal.User.addEmail === 'function') {
        try {
          await OneSignal.User.addEmail(perfil.email)
        } catch (_) {}
      }

      console.log('🔔 [OneSignal] Usuario sincronizado con éxito:', perfil.nombre, `(${perfil.id})`)
    } catch (e) {
      console.warn('⚠️ [OneSignal] No se pudo sincronizar usuario:', e)
    }
  })
}

/**
 * Cierra la sesión del usuario en OneSignal al desconectarse de la app.
 */
export function cerrarSesionOneSignal() {
  conOneSignal(async (OneSignal) => {
    try {
      if (typeof OneSignal.logout === 'function') {
        await OneSignal.logout()
        console.log('🔕 [OneSignal] Sesión cerrada en OneSignal')
      }
    } catch (e) {
      console.warn('⚠️ [OneSignal] Error al cerrar sesión:', e)
    }
  })
}

/**
 * Solicita explícitamente permisos de notificaciones push al usuario.
 */
export async function solicitarPermisoNotificaciones() {
  return new Promise((resolve) => {
    conOneSignal(async (OneSignal) => {
      try {
        if (OneSignal.Notifications && typeof OneSignal.Notifications.requestPermission === 'function') {
          await OneSignal.Notifications.requestPermission()
          const permitido = OneSignal.Notifications.permission
          resolve(Boolean(permitido))
        } else {
          // Fallback nativo del navegador
          if (typeof Notification !== 'undefined' && Notification.requestPermission) {
            const res = await Notification.requestPermission()
            resolve(res === 'granted')
          } else {
            resolve(false)
          }
        }
      } catch (err) {
        console.warn('⚠️ [OneSignal] Error al solicitar permisos:', err)
        resolve(false)
      }
    })
  })
}

/**
 * Consulta el estado actual de los permisos de notificaciones.
 */
export function obtenerEstadoNotificaciones(callback) {
  conOneSignal((OneSignal) => {
    try {
      const permisoConcedido = OneSignal.Notifications?.permission ?? false
      const optado = OneSignal.User?.PushSubscription?.optedIn ?? false
      callback({
        soportado: true,
        permiso: permisoConcedido,
        suscrito: optado || permisoConcedido
      })
    } catch (e) {
      callback({ soportado: false, permiso: false, suscrito: false })
    }
  })
}
