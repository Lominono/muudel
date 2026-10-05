// frontend/src/utils/apiAuth.js
import { supabase } from './supabase'
import { obtenerPinAdmin } from '../pages/PantallaAdmin'

/**
 * Realiza peticiones autenticadas y seguras a los endpoints de administración del backend
 * Envía Bearer token de Supabase, header x-user-id y header x-admin-pin
 */
export async function fetchAdmin(url, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  }

  // 1. Obtener token de sesión activo de Supabase si existe
  try {
    const { data: sessionData } = await supabase.auth.getSession()
    const token = sessionData?.session?.access_token
    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }
  } catch (_) {}

  // 2. Obtener perfil local o usuario
  let localUserId = null
  try {
    const localUser = localStorage.getItem('racha_local_user')
    if (localUser) {
      const parsed = JSON.parse(localUser)
      localUserId = parsed?.id
    }
  } catch (_) {}

  if (localUserId && !headers['x-user-id']) {
    headers['x-user-id'] = localUserId
  }

  // 3. Adjuntar PIN maestro de administración
  const pin = obtenerPinAdmin()
  if (pin && !headers['x-admin-pin']) {
    headers['x-admin-pin'] = pin
  }

  const response = await fetch(url, {
    ...options,
    headers
  })

  return response
}
