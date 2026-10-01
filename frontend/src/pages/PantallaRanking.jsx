// frontend/src/pages/PantallaRanking.jsx
import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../utils/supabase'
import { useAuth } from '../App'
import { InsigniaIniciales } from '../components/InsigniaIniciales'
import { AvatarUsuario } from '../components/AvatarUsuario'
import { sound } from '../utils/haptics'
import {
  Flame,
  ArrowUp,
  Trophy,
  Crown,
  Medal,
  Sparkles,
  TrendingUp,
  Target,
  Calendar,
  Zap,
  ShieldCheck
} from 'lucide-react'
import { suscribirEvento } from '../utils/realtimeHub'

export function PantallaRanking() {
  const { perfil } = useAuth()
  const [lista, setLista] = useState([])
  const [filtro, setFiltro] = useState('total') // 'total' | 'semana' | 'hoy'
  const [cargando, setCargando] = useState(true)

  const cargarRanking = useCallback(async () => {
    setCargando(true)
    try {
      let rankingFinal = []

      if (filtro === 'total') {
        // Ranking general por puntos totales con desempate por racha y nombre
        const { data, error } = await supabase
          .from('profiles')
          .select('id, nombre, username, avatar_emoji, color_acento, puntos_total, racha_actual, mejor_racha, marco_avatar, rol, titulo_vip, titulo_personalizado, digito_id')
          .order('puntos_total', { ascending: false })
          .order('racha_actual', { ascending: false })
          .order('nombre', { ascending: true })
          .limit(50)

        if (!error && data) rankingFinal = data
      } else if (filtro === 'semana') {
        // Vista semanal o fallback con cálculo de últimos 7 días
        const { data: vistaData, error: vistaErr } = await supabase
          .from('ranking_semanal')
          .select('*')
          .limit(50)

        if (!vistaErr && vistaData && vistaData.length > 0) {
          rankingFinal = vistaData
        } else {
          // Fallback dinámico ordenado por checkins y puntos
          const sieteDiasAtras = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
          const { data: chkData } = await supabase
            .from('checkins')
            .select('user_id')
            .gte('fecha', sieteDiasAtras)

          const conteoChk = {}
          chkData?.forEach(c => {
            conteoChk[c.user_id] = (conteoChk[c.user_id] || 0) + 1
          })

          const { data: profs } = await supabase
            .from('profiles')
            .select('id, nombre, username, avatar_emoji, color_acento, puntos_total, racha_actual, mejor_racha, marco_avatar, rol, titulo_vip, titulo_personalizado, digito_id')
            .limit(50)

          rankingFinal = (profs || []).map(p => ({
            ...p,
            checkins_semana: conteoChk[p.id] || 0,
            puntos_semana: (conteoChk[p.id] || 0) * 10
          })).sort((a, b) => {
            if (b.checkins_semana !== a.checkins_semana) return b.checkins_semana - a.checkins_semana
            return (b.puntos_total || 0) - (a.puntos_total || 0)
          })
        }
      } else if (filtro === 'hoy') {
        // Asistencia de hoy
        const hoy = new Date().toISOString().split('T')[0]
        const { data: chkHoy } = await supabase
          .from('checkins')
          .select('user_id, hora, profiles(id, nombre, username, avatar_emoji, color_acento, puntos_total, racha_actual, marco_avatar, rol, titulo_vip, digito_id)')
          .eq('fecha', hoy)
          .order('hora', { ascending: true })

        if (chkHoy && chkHoy.length > 0) {
          rankingFinal = chkHoy.map(c => ({
            ...c.profiles,
            hora_checkin: c.hora,
            puntos_hoy: 10
          }))
        } else {
          // Si no hay checkins aún, mostrar perfiles ordenados por racha
          const { data: profs } = await supabase
            .from('profiles')
            .select('id, nombre, username, avatar_emoji, color_acento, puntos_total, racha_actual, mejor_racha, marco_avatar, rol, titulo_vip, titulo_personalizado, digito_id')
            .order('racha_actual', { ascending: false })
            .limit(30)
          rankingFinal = profs || []
        }
      }

      // Enriquecer con metadatos locales si existen
      rankingFinal = rankingFinal.map(est => {
        try {
          const meta = localStorage.getItem('muudel_user_meta_' + est.id)
          if (meta) return { ...est, ...JSON.parse(meta) }
        } catch (e) {}
        if (perfil && est.id === perfil.id && perfil.digito_id) {
          return { ...est, digito_id: perfil.digito_id }
        }
        return est
      })

      setLista(rankingFinal)
    } catch (e) {
      console.warn('Error al cargar clasificación:', e)
    } finally {
      setCargando(false)
    }
  }, [filtro, perfil])

  // Carga inicial y suscripciones en tiempo real
  useEffect(() => {
    cargarRanking()

    // Suscripción en tiempo real a cambios en perfiles o checkins
    const canalRanking = supabase
      .channel('ranking-live-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => {
        cargarRanking()
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'checkins' }, () => {
        cargarRanking()
      })
      .subscribe()

    // Suscripciones de eventos de hub
    const desPuntos = suscribirEvento('puntos_actualizados', () => cargarRanking())
    const desAsistencia = suscribirEvento('asistencia_confirmada', () => cargarRanking())

    return () => {
      supabase.removeChannel(canalRanking)
      desPuntos()
      desAsistencia()
    }
  }, [cargarRanking])

  // Posición del usuario actual
  const posicionPropia = perfil && lista.length > 0
    ? lista.findIndex(p => p.id === perfil.id || p.nombre === perfil.nombre) + 1
    : 0

  const alumnoDirectamenteArriba = posicionPropia > 1 ? lista[posicionPropia - 2] : null
  const puntosParaSubir = alumnoDirectamenteArriba
    ? Math.max((alumnoDirectamenteArriba.puntos_total || 0) - (perfil?.puntos_total || 0) + 1, 1)
    : 0

  // Asignación de División / Liga según puntuación
  const obtenerLiga = (pts = 0) => {
    if (pts >= 300) return { nombre: 'Liga Diamante', icono: '💎', color: '#00C7BE', bg: 'rgba(0, 199, 190, 0.12)' }
    if (pts >= 150) return { nombre: 'Liga Oro', icono: '🥇', color: '#FFD60A', bg: 'rgba(255, 214, 10, 0.12)' }
    if (pts >= 60) return { nombre: 'Liga Plata', icono: '🥈', color: '#8E8E93', bg: 'rgba(142, 142, 147, 0.12)' }
    return { nombre: 'Liga Bronce', icono: '🥉', color: '#A2845E', bg: 'rgba(162, 132, 94, 0.12)' }
  }

  // Top 3 del podio
  const top1 = lista[0]
  const top2 = lista[1]
  const top3 = lista[2]
  const restoLista = lista.slice(3)

  return (
    <main className="app-container" style={{ paddingBottom: 90 }}>
      {/* Cabecera Apple HIG */}
      <header style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h1 className="apple-large-title" style={{ letterSpacing: -0.5 }}>
              Ranking
            </h1>
            <p className="apple-subheadline" style={{ marginTop: 2 }}>
              Clasificación en tiempo real por constancia, aportes y retos.
            </p>
          </div>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '5px 11px',
            borderRadius: 9999,
            backgroundColor: 'rgba(52, 199, 89, 0.12)',
            color: 'var(--color-positive)',
            fontSize: 12,
            fontWeight: 700
          }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: '#34C759', animation: 'pulse 1.5s infinite' }} />
            <span>En vivo</span>
          </div>
        </div>
      </header>

      {/* Control Segmentado de Período */}
      <div className="segmented-control" style={{ marginBottom: 16 }}>
        <button
          type="button"
          className={`segmented-control-item ${filtro === 'total' ? 'active' : ''}`}
          onClick={() => { sound.playPop(); setFiltro('total') }}
        >
          General (Histórico)
        </button>
        <button
          type="button"
          className={`segmented-control-item ${filtro === 'semana' ? 'active' : ''}`}
          onClick={() => { sound.playPop(); setFiltro('semana') }}
        >
          Esta semana
        </button>
        <button
          type="button"
          className={`segmented-control-item ${filtro === 'hoy' ? 'active' : ''}`}
          onClick={() => { sound.playPop(); setFiltro('hoy') }}
        >
          Hoy (Asistencia)
        </button>
      </div>

      {/* Tarjeta de Posición Propia */}
      {perfil && (
        <section style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '14px 18px',
          borderRadius: 16,
          backgroundColor: 'var(--color-surface)',
          border: '1px solid var(--color-separator)',
          boxShadow: 'var(--card-shadow)',
          marginBottom: 18,
          gap: 12
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
            <AvatarUsuario
              nombre={perfil.nombre}
              color={perfil.color_acento || '#0A84FF'}
              rol={perfil.rol || 'alumno'}
              size={42}
              fontSize={15}
              marco={perfil.marco_avatar}
            />
            <div style={{ minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span className="apple-caption" style={{ fontWeight: 700, color: 'var(--color-secondary-ink)' }}>
                  Tu clasificación
                </span>
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 800,
                    padding: '1px 6px',
                    borderRadius: 9999,
                    backgroundColor: obtenerLiga(perfil.puntos_total).bg,
                    color: obtenerLiga(perfil.puntos_total).color
                  }}
                >
                  {obtenerLiga(perfil.puntos_total).icono} {obtenerLiga(perfil.puntos_total).nombre}
                </span>
              </div>
              <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--color-ink)' }}>
                {posicionPropia > 0 ? `#${posicionPropia} en la clase` : 'Sin puntaje registrado'}
              </div>
            </div>
          </div>

          <div style={{ textAlign: 'right', flexShrink: 0 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'flex-end', gap: 3 }}>
              <span className="tabular-nums" style={{ fontSize: 20, fontWeight: 900, color: 'var(--color-accent)' }}>
                {perfil.puntos_total || 0}
              </span>
              <span className="apple-caption" style={{ fontWeight: 700 }}>pts</span>
            </div>

            {puntosParaSubir > 0 && alumnoDirectamenteArriba && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-end',
                gap: 3,
                fontSize: 11,
                fontWeight: 700,
                color: 'var(--color-positive)',
                marginTop: 2
              }}>
                <ArrowUp size={12} />
                <span>+{puntosParaSubir} pts para superar a {alumnoDirectamenteArriba.nombre.split(' ')[0]}</span>
              </div>
            )}
          </div>
        </section>
      )}

      {/* ─── PODIO DE HONOR DE LOS 3 PRIMEROS (HIGH CRAFT) ─── */}
      {!cargando && lista.length >= 3 && (
        <section style={{
          backgroundColor: 'var(--color-surface)',
          borderRadius: 20,
          border: '1px solid var(--color-separator)',
          padding: '24px 16px 16px',
          marginBottom: 18,
          boxShadow: 'var(--card-shadow)',
          position: 'relative',
          overflow: 'hidden'
        }}>
          <div style={{ textAlign: 'center', marginBottom: 18 }}>
            <span style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.8, color: 'var(--color-secondary-ink)' }}>
              Mesa de Honor · Top 3
            </span>
          </div>

          <div style={{
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'center',
            gap: 12,
            paddingTop: 10
          }}>
            {/* 2º LUGAR - PLATA */}
            {top2 && (
              <div style={{ flex: 1, maxWidth: 140, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div style={{ position: 'relative', marginBottom: 8 }}>
                  <AvatarUsuario
                    nombre={top2.nombre}
                    color={top2.color_acento || '#94A3B8'}
                    size={48}
                    fontSize={16}
                    marco={top2.marco_avatar}
                  />
                  <div style={{
                    position: 'absolute',
                    bottom: -6,
                    right: -4,
                    width: 20,
                    height: 20,
                    borderRadius: '50%',
                    backgroundColor: '#94A3B8',
                    color: '#FFF',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 11,
                    fontWeight: 900,
                    boxShadow: '0 2px 6px rgba(0,0,0,0.2)'
                  }}>
                    2
                  </div>
                </div>

                <div style={{ textAlign: 'center', width: '100%', marginBottom: 8 }}>
                  <div style={{ fontWeight: 800, fontSize: 13, color: 'var(--color-ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {top2.nombre.split(' ')[0]}
                  </div>
                  <div className="tabular-nums" style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-secondary-ink)' }}>
                    {top2.puntos_total || top2.puntos_semana || 0} pts
                  </div>
                </div>

                {/* Pedestal 2 */}
                <div style={{
                  width: '100%',
                  height: 75,
                  borderRadius: '12px 12px 4px 4px',
                  backgroundColor: 'var(--color-fill-secondary)',
                  border: '1px solid var(--color-separator)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 2
                }}>
                  <Medal size={20} color="#94A3B8" />
                  <span style={{ fontSize: 11, fontWeight: 800, color: '#94A3B8' }}>PLATA</span>
                </div>
              </div>
            )}

            {/* 1º LUGAR - ORO (CENTRO, MÁS ELEVADO) */}
            {top1 && (
              <div style={{ flex: 1.15, maxWidth: 155, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                {/* Corona de campeón */}
                <div style={{ marginBottom: 2, animation: 'bounce 2s infinite' }}>
                  <Crown size={24} fill="#FFD700" color="#F59E0B" />
                </div>

                <div style={{ position: 'relative', marginBottom: 8 }}>
                  <AvatarUsuario
                    nombre={top1.nombre}
                    color={top1.color_acento || '#F59E0B'}
                    size={58}
                    fontSize={18}
                    marco={top1.marco_avatar}
                  />
                  <div style={{
                    position: 'absolute',
                    bottom: -6,
                    right: -4,
                    width: 24,
                    height: 24,
                    borderRadius: '50%',
                    backgroundColor: '#F59E0B',
                    color: '#FFF',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 13,
                    fontWeight: 900,
                    boxShadow: '0 2px 8px rgba(245, 158, 11, 0.4)'
                  }}>
                    1
                  </div>
                </div>

                <div style={{ textAlign: 'center', width: '100%', marginBottom: 8 }}>
                  <div style={{ fontWeight: 900, fontSize: 14, color: 'var(--color-ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {top1.nombre.split(' ')[0]}
                  </div>
                  <div className="tabular-nums" style={{ fontSize: 15, fontWeight: 900, color: '#D97706' }}>
                    {top1.puntos_total || top1.puntos_semana || 0} pts
                  </div>
                </div>

                {/* Pedestal 1 */}
                <div style={{
                  width: '100%',
                  height: 105,
                  borderRadius: '14px 14px 4px 4px',
                  backgroundColor: 'rgba(255, 214, 10, 0.15)',
                  border: '1.5px solid rgba(245, 158, 11, 0.35)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 3,
                  boxShadow: '0 4px 16px rgba(245, 158, 11, 0.15)'
                }}>
                  <Trophy size={24} color="#D97706" />
                  <span style={{ fontSize: 12, fontWeight: 900, color: '#D97706', letterSpacing: 0.5 }}>LÍDER</span>
                </div>
              </div>
            )}

            {/* 3º LUGAR - BRONCE */}
            {top3 && (
              <div style={{ flex: 1, maxWidth: 140, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div style={{ position: 'relative', marginBottom: 8 }}>
                  <AvatarUsuario
                    nombre={top3.nombre}
                    color={top3.color_acento || '#B45309'}
                    size={46}
                    fontSize={15}
                    marco={top3.marco_avatar}
                  />
                  <div style={{
                    position: 'absolute',
                    bottom: -6,
                    right: -4,
                    width: 20,
                    height: 20,
                    borderRadius: '50%',
                    backgroundColor: '#B45309',
                    color: '#FFF',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 11,
                    fontWeight: 900,
                    boxShadow: '0 2px 6px rgba(0,0,0,0.2)'
                  }}>
                    3
                  </div>
                </div>

                <div style={{ textAlign: 'center', width: '100%', marginBottom: 8 }}>
                  <div style={{ fontWeight: 800, fontSize: 13, color: 'var(--color-ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {top3.nombre.split(' ')[0]}
                  </div>
                  <div className="tabular-nums" style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-secondary-ink)' }}>
                    {top3.puntos_total || top3.puntos_semana || 0} pts
                  </div>
                </div>

                {/* Pedestal 3 */}
                <div style={{
                  width: '100%',
                  height: 60,
                  borderRadius: '12px 12px 4px 4px',
                  backgroundColor: 'var(--color-fill-secondary)',
                  border: '1px solid var(--color-separator)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 2
                }}>
                  <Medal size={18} color="#B45309" />
                  <span style={{ fontSize: 11, fontWeight: 800, color: '#B45309' }}>BRONCE</span>
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {/* ─── TABLA COMPLETA DE CLASIFICACIÓN ─── */}
      <section className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{
          padding: '14px 18px',
          borderBottom: '1px solid var(--color-separator)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          backgroundColor: 'var(--color-surface-secondary)'
        }}>
          <h3 className="apple-headline" style={{ fontSize: 15, margin: 0 }}>
            {filtro === 'total' ? 'Todos los Alumnos' : filtro === 'semana' ? 'Rendimiento Semanal' : 'Asistencia de Hoy'} ({lista.length})
          </h3>
          <span className="apple-caption">
            Ordenado por puntos y racha
          </span>
        </div>

        {cargando ? (
          <div style={{ padding: 48, textAlign: 'center' }}>
            <Sparkles size={28} color="var(--color-accent)" style={{ margin: '0 auto 8px', opacity: 0.6 }} />
            <p className="apple-caption">Sincronizando clasificación con la base de datos...</p>
          </div>
        ) : lista.length === 0 ? (
          <div style={{ padding: '48px 24px', textAlign: 'center' }}>
            <Trophy size={32} color="var(--color-tertiary-ink)" style={{ margin: '0 auto 10px' }} />
            <h3 className="apple-headline" style={{ fontSize: 16 }}>Sin registros disponibles</h3>
            <p className="apple-subheadline" style={{ fontSize: 13, marginTop: 4 }}>
              Los alumnos aparecerán aquí conforme ganen puntos en clase o juegos.
            </p>
          </div>
        ) : (
          <div>
            {lista.map((estudiante, i) => {
              const esElUsuario = perfil && (estudiante.id === perfil.id || estudiante.nombre === perfil.nombre)
              const liga = obtenerLiga(estudiante.puntos_total)

              return (
                <div
                  key={estudiante.id || i}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: '12px 16px',
                    borderBottom: i < lista.length - 1 ? '1px solid var(--color-separator)' : 'none',
                    backgroundColor: esElUsuario
                      ? 'rgba(0, 122, 255, 0.08)'
                      : 'transparent',
                    transition: 'background-color 0.12s ease'
                  }}
                  onMouseEnter={(e) => {
                    if (!esElUsuario) e.currentTarget.style.backgroundColor = 'var(--color-fill-tertiary)'
                  }}
                  onMouseLeave={(e) => {
                    if (!esElUsuario) e.currentTarget.style.backgroundColor = 'transparent'
                  }}
                >
                  {/* Posición # */}
                  <div style={{ width: 34, textAlign: 'center', marginRight: 10 }}>
                    {i === 0 ? (
                      <span style={{ fontSize: 16 }}>🥇</span>
                    ) : i === 1 ? (
                      <span style={{ fontSize: 16 }}>🥈</span>
                    ) : i === 2 ? (
                      <span style={{ fontSize: 16 }}>🥉</span>
                    ) : (
                      <span className="tabular-nums apple-caption" style={{ fontWeight: 700, fontSize: 13 }}>
                        #{i + 1}
                      </span>
                    )}
                  </div>

                  {/* Avatar con marco desbloqueado */}
                  <div style={{ marginRight: 12 }}>
                    <AvatarUsuario
                      nombre={estudiante.nombre}
                      color={estudiante.color_acento || '#0A84FF'}
                      size={38}
                      fontSize={14}
                      marco={estudiante.marco_avatar}
                    />
                  </div>

                  {/* Datos del alumno */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontWeight: esElUsuario ? 800 : 700,
                      fontSize: 14,
                      color: esElUsuario ? 'var(--color-accent)' : 'var(--color-ink)',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6
                    }}>
                      <span>{estudiante.nombre} {esElUsuario && '(Tú)'}</span>

                      {estudiante.digito_id && (
                        <span style={{
                          fontSize: 10,
                          fontWeight: 700,
                          padding: '1px 5px',
                          borderRadius: 4,
                          backgroundColor: 'var(--color-fill-secondary)',
                          color: 'var(--color-secondary-ink)',
                          fontVariantNumeric: 'tabular-nums'
                        }}>
                          {estudiante.digito_id}
                        </span>
                      )}

                      {(estudiante.titulo_personalizado || estudiante.titulo_vip) && (
                        <span style={{
                          fontSize: 10,
                          fontWeight: 700,
                          padding: '1px 6px',
                          borderRadius: 6,
                          backgroundColor: 'rgba(255, 149, 0, 0.12)',
                          color: '#FF9500',
                          border: '1px solid rgba(255, 149, 0, 0.25)'
                        }}>
                          {estudiante.titulo_personalizado || estudiante.titulo_vip}
                        </span>
                      )}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 2, flexWrap: 'wrap' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                        <Flame size={12} color="#FF9500" />
                        <span className="apple-caption">
                          <strong className="tabular-nums" style={{ color: 'var(--color-ink)' }}>{estudiante.racha_actual || 0}d</strong> racha
                        </span>
                      </div>

                      <span style={{ color: 'var(--color-secondary-ink)', fontSize: 10 }}>•</span>

                      <span style={{ fontSize: 10, fontWeight: 700, color: liga.color }}>
                        {liga.icono} {liga.nombre}
                      </span>

                      {estudiante.hora_checkin && (
                        <>
                          <span style={{ color: 'var(--color-secondary-ink)', fontSize: 10 }}>•</span>
                          <span className="apple-caption">Asistió: {estudiante.hora_checkin}</span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Puntuación */}
                  <div style={{ textAlign: 'right', marginLeft: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'flex-end', gap: 3 }}>
                      <span className="tabular-nums" style={{ fontSize: 16, fontWeight: 800, color: 'var(--color-accent)' }}>
                        {estudiante.puntos_total || estudiante.puntos_semana || 0}
                      </span>
                      <span className="apple-caption" style={{ fontWeight: 600 }}>pts</span>
                    </div>

                    {filtro === 'semana' && estudiante.checkins_semana !== undefined && (
                      <span className="apple-caption" style={{ fontSize: 10, color: 'var(--color-secondary-ink)' }}>
                        {estudiante.checkins_semana} check-ins
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>
    </main>
  )
}
