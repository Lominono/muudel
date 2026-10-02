// frontend/src/components/PanelSaludEconomicaBanca.jsx
import { useState, useEffect } from 'react'
import {
  Shield,
  Coins,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Search,
  Activity,
  History,
  Lock,
  Unlock,
  AlertCircle,
  FileCheck,
  RotateCcw,
  Sliders,
  DollarSign,
  ArrowRight,
  Eye,
  Info
} from 'lucide-react'
import { sound, triggerConfetti } from '../utils/haptics'
import { InsigniaIniciales } from './InsigniaIniciales'

export function PanelSaludEconomicaBanca({ perfilAdmin, todosAlumnos = [], onActualizarAlumno }) {
  const [datosSalud, setDatosSalud] = useState(null)
  const [cargandoSalud, setCargandoSalud] = useState(true)
  const [resultadoAuditoria, setResultadoAuditoria] = useState(null)
  const [auditando, setAuditando] = useState(false)
  const [mostrarModalAuditoria, setMostrarModalAuditoria] = useState(false)

  // Estado para el modal de ajuste contable con confirmación
  const [alumnoAjuste, setAlumnoAjuste] = useState(null)
  const [cantidadAjuste, setCantidadAjuste] = useState(10)
  const [motivoAjuste, setMotivoAjuste] = useState('')
  const [enviandoAjuste, setEnviandoAjuste] = useState(false)
  const [errorAjuste, setErrorAjuste] = useState(null)

  // Estado para ver historial contable de un alumno específico
  const [alumnoHistorial, setAlumnoHistorial] = useState(null)
  const [historialCargado, setHistorialCargado] = useState([])
  const [cargandoHistorial, setCargandoHistorial] = useState(false)

  const [busquedaAlumno, setBusquedaAlumno] = useState('')

  // Estado para gestión y análisis de precios de tienda
  const [analisisTienda, setAnalisisTienda] = useState([])
  const [historialPrecios, setHistorialPrecios] = useState([])
  const [cargandoTiendaPrecios, setCargandoTiendaPrecios] = useState(false)
  const [itemEditando, setItemEditando] = useState(null)
  const [nuevoPrecioEdit, setNuevoPrecioEdit] = useState(30)
  const [motivoPrecioEdit, setMotivoPrecioEdit] = useState('')
  const [guardandoPrecio, setGuardandoPrecio] = useState(false)
  const [errorPrecioEdit, setErrorPrecioEdit] = useState(null)
  const [filtroTramo, setFiltroTramo] = useState('todos')

  useEffect(() => {
    cargarSaludEconomica()
    cargarAnalisisTienda()
  }, [])

  const cargarAnalisisTienda = async () => {
    setCargandoTiendaPrecios(true)
    try {
      const headers = { 'Content-Type': 'application/json' }
      if (perfilAdmin?.id) headers['x-user-id'] = perfilAdmin.id
      const res = await fetch('/api/admin/tienda-analisis-precios', { headers })
      const data = await res.json()
      if (data.success) {
        setAnalisisTienda(data.analisis || [])
        setHistorialPrecios(data.historial || [])
      }
    } catch (_) {}
    finally {
      setCargandoTiendaPrecios(false)
    }
  }

  const handleGuardarPrecio = async () => {
    if (!itemEditando) return
    const precio = Number(nuevoPrecioEdit)
    if (isNaN(precio) || precio <= 0) {
      setErrorPrecioEdit('Introduce un precio válido en StevenEuros.')
      return
    }
    setGuardandoPrecio(true)
    setErrorPrecioEdit(null)
    try {
      const headers = { 'Content-Type': 'application/json' }
      if (perfilAdmin?.id) headers['x-user-id'] = perfilAdmin.id
      const res = await fetch('/api/admin/tienda-editar-precio', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          itemId: itemEditando.id,
          nuevoPrecio: precio,
          motivo: motivoPrecioEdit || 'Ajuste de equilibrio de aula'
        })
      })
      const data = await res.json()
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Error al guardar precio')
      }
      sound.playWin()
      setItemEditando(null)
      cargarAnalisisTienda()
    } catch (e) {
      setErrorPrecioEdit(e.message)
    } finally {
      setGuardandoPrecio(false)
    }
  }

  const cargarSaludEconomica = async () => {
    setCargandoSalud(true)
    try {
      const headers = { 'Content-Type': 'application/json' }
      if (perfilAdmin?.id) headers['x-user-id'] = perfilAdmin.id

      const res = await fetch('/api/admin/salud-economia', { headers })
      const data = await res.json()
      if (data.success) {
        setDatosSalud(data)
      }
    } catch (e) {
      console.error('Error cargando salud económica:', e)
    } finally {
      setCargandoSalud(false)
    }
  }

  const handleEjecutarAuditoria = async () => {
    setAuditando(true)
    try {
      sound.playPop()
      const headers = { 'Content-Type': 'application/json' }
      if (perfilAdmin?.id) headers['x-user-id'] = perfilAdmin.id

      const res = await fetch('/api/admin/auditar-economia', {
        method: 'POST',
        headers
      })
      const data = await res.json()
      if (data.success) {
        setResultadoAuditoria(data.auditoria)
        setMostrarModalAuditoria(true)
        if (data.auditoria.invariante_valida) sound.playWin()
      }
    } catch (e) {
      alert('Error al ejecutar auditoría contable')
    } finally {
      setAuditando(false)
    }
  }

  const handleToggleEmergencia = async (clave, valorActual) => {
    try {
      sound.playPop()
      const nuevoEstado = {
        [clave]: !valorActual,
        motivo: `Modificado por ${perfilAdmin?.nombre || 'Administrador'}`
      }
      const headers = { 'Content-Type': 'application/json' }
      if (perfilAdmin?.id) headers['x-user-id'] = perfilAdmin.id

      const res = await fetch('/api/admin/interruptor-emergencia', {
        method: 'POST',
        headers,
        body: JSON.stringify(nuevoEstado)
      })
      const data = await res.json()
      if (data.success) {
        cargarSaludEconomica()
      }
    } catch (_) {}
  }

  const handleConfirmarAjuste = async () => {
    if (!alumnoAjuste) return
    if (!motivoAjuste || motivoAjuste.trim().length < 4) {
      setErrorAjuste('El motivo debe tener al menos 4 caracteres explicativos.')
      return
    }
    if (Math.abs(cantidadAjuste) > 50) {
      setErrorAjuste('El límite por operación es de ±50 SE.')
      return
    }

    setEnviandoAjuste(true)
    setErrorAjuste(null)
    try {
      const headers = { 'Content-Type': 'application/json' }
      if (perfilAdmin?.id) headers['x-user-id'] = perfilAdmin.id

      const idempKey = `admin_${perfilAdmin.id}_${alumnoAjuste.id}_${Date.now()}`
      const res = await fetch('/api/admin/ajustar-saldo', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          targetUserId: alumnoAjuste.id,
          cantidad: Number(cantidadAjuste),
          motivo: motivoAjuste.trim(),
          idempotency_key: idempKey
        })
      })

      const data = await res.json()
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Error al aplicar ajuste contable')
      }

      sound.playWin()
      triggerConfetti()
      onActualizarAlumno?.(alumnoAjuste.id, data.resultado.nuevo_saldo_usuario)
      setAlumnoAjuste(null)
      setMotivoAjuste('')
      cargarSaludEconomica()
    } catch (err) {
      setErrorAjuste(err.message)
    } finally {
      setEnviandoAjuste(false)
    }
  }

  const handleVerHistorialAlumno = async (alumno) => {
    setAlumnoHistorial(alumno)
    setCargandoHistorial(true)
    setHistorialCargado([])
    try {
      const headers = { 'Content-Type': 'application/json' }
      if (perfilAdmin?.id) headers['x-user-id'] = perfilAdmin.id

      const res = await fetch(`/api/admin/usuario-historial?user_id=${alumno.id}`, { headers })
      const data = await res.json()
      if (data.success) {
        setHistorialCargado(data.historial || [])
      }
    } catch (_) {}
    finally {
      setCargandoHistorial(false)
    }
  }

  const handleRevertirMovimiento = async (item) => {
    if (!confirm(`¿Deseas revertir este movimiento de ${item.cantidad > 0 ? '+' : ''}${item.cantidad} SE?`)) return
    try {
      const headers = { 'Content-Type': 'application/json' }
      if (perfilAdmin?.id) headers['x-user-id'] = perfilAdmin.id

      const res = await fetch('/api/admin/revertir-ajuste', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          targetUserId: alumnoHistorial.id,
          cantidadOriginal: item.cantidad,
          motivoOriginal: item.motivo
        })
      })
      const data = await res.json()
      if (data.success) {
        sound.playPop()
        alert('Movimiento revertido correctamente con contrapartida bancaria.')
        handleVerHistorialAlumno(alumnoHistorial)
        cargarSaludEconomica()
      } else {
        alert(data.error || 'Error al revertir')
      }
    } catch (e) {
      alert('Error al conectar con servidor')
    }
  }

  const saldoBanca = datosSalud?.banca?.saldo ?? 5000
  const reservaMinima = datosSalud?.banca?.reservaMinima ?? 500
  const enAusteridad = datosSalud?.banca?.enAusteridad
  const circulante = datosSalud?.circulanteUsuarios ?? 0
  const suministro = datosSalud?.suministroTotal ?? (saldoBanca + circulante)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* 1. CABECERA Y BOTÓN DE AUDITORÍA */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 12,
        padding: '16px 18px',
        borderRadius: 16,
        backgroundColor: 'var(--color-surface-secondary)',
        border: '1px solid var(--color-separator)'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Shield size={20} color="var(--color-accent)" />
            <h3 style={{ fontSize: 17, fontWeight: 800, margin: 0 }}>
              Banca del Sistema & Control Económico
            </h3>
          </div>
          <p style={{ fontSize: 12, color: 'var(--color-secondary-ink)', margin: '4px 0 0 0' }}>
            Partida doble, reserva mínima de liquidez e invariante contable en tiempo real.
          </p>
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <button
            type="button"
            onClick={cargarSaludEconomica}
            disabled={cargandoSalud}
            className="btn-secondary"
            style={{ padding: '7px 12px', fontSize: 12, fontWeight: 700 }}
          >
            <RefreshCw size={14} className={cargandoSalud ? 'animate-spin' : ''} />
            <span>Refrescar</span>
          </button>

          <button
            type="button"
            onClick={handleEjecutarAuditoria}
            disabled={auditando}
            className="btn-primary"
            style={{
              padding: '7px 16px',
              fontSize: 12,
              fontWeight: 800,
              backgroundColor: '#0A84FF',
              color: '#FFF'
            }}
          >
            <FileCheck size={14} />
            <span>{auditando ? 'Auditando...' : 'Auditar Contabilidad'}</span>
          </button>
        </div>
      </div>

      {/* 2. TARJETAS DE SALUD ECONÓMICA DE LA BANCA */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: 12
      }}>
        {/* Saldo de la Banca */}
        <div className="card" style={{ padding: '14px 16px', position: 'relative' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--color-secondary-ink)', fontSize: 12, fontWeight: 700 }}>
            <span style={{ fontSize: 16 }}>🏛️</span>
            <span>Saldo de la Banca</span>
          </div>
          <div style={{ fontSize: 24, fontWeight: 900, marginTop: 6, color: enAusteridad ? '#EF4444' : '#FBBF24' }}>
            {saldoBanca.toLocaleString()} SE 💶
          </div>
          <div style={{ fontSize: 11, color: 'var(--color-secondary-ink)', marginTop: 2 }}>
            {enAusteridad ? '⚠️ En reserva mínima (< 500 SE)' : `Reserva mínima: ${reservaMinima} SE`}
          </div>
        </div>

        {/* Circulante de los Estudiantes */}
        <div className="card" style={{ padding: '14px 16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--color-secondary-ink)', fontSize: 12, fontWeight: 700 }}>
            <Coins size={16} color="var(--color-warning)" />
            <span>Circulante de Estudiantes</span>
          </div>
          <div style={{ fontSize: 24, fontWeight: 900, marginTop: 6, color: 'var(--color-ink)' }}>
            {circulante.toLocaleString()} SE 💶
          </div>
          <div style={{ fontSize: 11, color: 'var(--color-secondary-ink)', marginTop: 2 }}>
            Total en manos de los alumnos
          </div>
        </div>

        {/* Suministro Total del Ecosistema */}
        <div className="card" style={{ padding: '14px 16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--color-secondary-ink)', fontSize: 12, fontWeight: 700 }}>
            <Activity size={16} color="var(--color-accent)" />
            <span>Suministro Total</span>
          </div>
          <div style={{ fontSize: 24, fontWeight: 900, marginTop: 6, color: 'var(--color-accent)' }}>
            {suministro.toLocaleString()} SE 💶
          </div>
          <div style={{ fontSize: 11, color: 'var(--color-secondary-ink)', marginTop: 2 }}>
            Invariante: Alumnos + Banca
          </div>
        </div>

        {/* Emisión Diaria Configurada */}
        <div className="card" style={{ padding: '14px 16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--color-secondary-ink)', fontSize: 12, fontWeight: 700 }}>
            <TrendingUp size={16} color="var(--color-positive)" />
            <span>Inyección a Banca</span>
          </div>
          <div style={{ fontSize: 24, fontWeight: 900, marginTop: 6, color: 'var(--color-positive)' }}>
            +{datosSalud?.banca?.emisionDiaria || 25} SE / día
          </div>
          <div style={{ fontSize: 11, color: 'var(--color-secondary-ink)', marginTop: 2 }}>
            A las 00:00h (Europe/Madrid)
          </div>
        </div>
      </div>

      {/* 3. ALERTAS DE CONCENTRACIÓN DE RIQUEZA (SI APLICA) */}
      {datosSalud?.alertasConcentracion && datosSalud.alertasConcentracion.length > 0 && (
        <div style={{
          padding: '12px 16px',
          borderRadius: 14,
          backgroundColor: 'rgba(234, 179, 8, 0.12)',
          border: '1px solid rgba(234, 179, 8, 0.35)',
          display: 'flex',
          flexDirection: 'column',
          gap: 6
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#D97706', fontSize: 13, fontWeight: 800 }}>
            <AlertTriangle size={16} />
            <span>Alerta de Concentración de StevenEuros (&gt; 30% del circulante)</span>
          </div>
          {datosSalud.alertasConcentracion.map((alerta, i) => (
            <div key={i} style={{ fontSize: 12, color: 'var(--color-ink)', paddingLeft: 24 }}>
              • {alerta}
            </div>
          ))}
        </div>
      )}

      {/* 4. INTERRUPTORES DE EMERGENCIA */}
      <section className="card">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <AlertCircle size={18} color="#FF9500" />
          <h3 className="apple-headline" style={{ fontSize: 16 }}>
            Interruptor de Emergencia Escolar
          </h3>
        </div>
        <p className="apple-caption" style={{ marginBottom: 14 }}>
          Pausa temporalmente las salidas de StevenEuros ante mantenimiento o comportamientos sospechosos.
        </p>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
          gap: 12
        }}>
          <div style={{
            padding: '12px 14px',
            borderRadius: 12,
            border: '1px solid var(--color-separator)',
            backgroundColor: 'var(--color-surface-secondary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 800 }}>Ruleta de Yoshi</div>
              <div style={{ fontSize: 11, color: 'var(--color-secondary-ink)' }}>
                {datosSalud?.interruptorEmergencia?.ruletaPausada ? 'Pausada' : 'Activa'}
              </div>
            </div>
            <button
              type="button"
              onClick={() => handleToggleEmergencia('ruletaPausada', datosSalud?.interruptorEmergencia?.ruletaPausada)}
              className={datosSalud?.interruptorEmergencia?.ruletaPausada ? 'btn-primary' : 'btn-secondary'}
              style={{
                fontSize: 11,
                padding: '5px 12px',
                backgroundColor: datosSalud?.interruptorEmergencia?.ruletaPausada ? '#EF4444' : undefined
              }}
            >
              {datosSalud?.interruptorEmergencia?.ruletaPausada ? 'Reanudar' : 'Pausar'}
            </button>
          </div>

          <div style={{
            padding: '12px 14px',
            borderRadius: 12,
            border: '1px solid var(--color-separator)',
            backgroundColor: 'var(--color-surface-secondary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 800 }}>Mesas de Apuestas</div>
              <div style={{ fontSize: 11, color: 'var(--color-secondary-ink)' }}>
                {datosSalud?.interruptorEmergencia?.apuestasPausadas ? 'Pausadas' : 'Activas'}
              </div>
            </div>
            <button
              type="button"
              onClick={() => handleToggleEmergencia('apuestasPausadas', datosSalud?.interruptorEmergencia?.apuestasPausadas)}
              className={datosSalud?.interruptorEmergencia?.apuestasPausadas ? 'btn-primary' : 'btn-secondary'}
              style={{
                fontSize: 11,
                padding: '5px 12px',
                backgroundColor: datosSalud?.interruptorEmergencia?.apuestasPausadas ? '#EF4444' : undefined
              }}
            >
              {datosSalud?.interruptorEmergencia?.apuestasPausadas ? 'Reanudar' : 'Pausar'}
            </button>
          </div>

          <div style={{
            padding: '12px 14px',
            borderRadius: 12,
            border: '1px solid var(--color-separator)',
            backgroundColor: 'var(--color-surface-secondary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 800 }}>Grifos y Misiones</div>
              <div style={{ fontSize: 11, color: 'var(--color-secondary-ink)' }}>
                {datosSalud?.interruptorEmergencia?.grifosPausados ? 'Pausados' : 'Activos'}
              </div>
            </div>
            <button
              type="button"
              onClick={() => handleToggleEmergencia('grifosPausados', datosSalud?.interruptorEmergencia?.grifosPausados)}
              className={datosSalud?.interruptorEmergencia?.grifosPausados ? 'btn-primary' : 'btn-secondary'}
              style={{
                fontSize: 11,
                padding: '5px 12px',
                backgroundColor: datosSalud?.interruptorEmergencia?.grifosPausados ? '#EF4444' : undefined
              }}
            >
              {datosSalud?.interruptorEmergencia?.grifosPausados ? 'Reanudar' : 'Pausar'}
            </button>
          </div>
        </div>
      </section>

      {/* 5. GESTOR DE AJUSTES CONTABLES DE ALUMNOS (CONTRA LA BANCA) */}
      <section className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{
          padding: '14px 18px',
          borderBottom: '1px solid var(--color-separator)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 10
        }}>
          <div>
            <h3 className="apple-headline" style={{ fontSize: 16 }}>
              Ajustes Contables Oficiales (Contra la Banca)
            </h3>
            <p className="apple-caption" style={{ marginTop: 2 }}>
              Toda modificación queda registrada en el ledger. Límite máximo: ±50 SE por operación.
            </p>
          </div>

          <div style={{ position: 'relative', width: 220 }}>
            <input
              type="text"
              className="apple-input"
              placeholder="Buscar estudiante..."
              value={busquedaAlumno}
              onChange={(e) => setBusquedaAlumno(e.target.value)}
              style={{ width: '100%', paddingLeft: 30, fontSize: 12, height: 32 }}
            />
            <Search size={14} style={{ position: 'absolute', left: 9, top: 9, color: 'var(--color-secondary-ink)' }} />
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {todosAlumnos
            .filter(a => a.id !== '00000000-0000-4000-a000-000000000000')
            .filter(a => {
              if (!busquedaAlumno.trim()) return true
              const q = busquedaAlumno.toLowerCase()
              return (a.nombre || '').toLowerCase().includes(q) || (a.username || '').toLowerCase().includes(q)
            })
            .map((alumno, idx, arr) => {
              const esElMismoAdmin = alumno.id === perfilAdmin?.id
              return (
                <div
                  key={alumno.id}
                  style={{
                    padding: '12px 18px',
                    borderBottom: idx < arr.length - 1 ? '1px solid var(--color-separator)' : 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: 12
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <InsigniaIniciales nombre={alumno.nombre} color={alumno.color_acento || '#0A84FF'} size={34} />
                    <div>
                      <div style={{ fontWeight: 800, fontSize: 14 }}>
                        {alumno.nombre} {esElMismoAdmin && <span style={{ fontSize: 11, color: '#3B82F6' }}>(Tú)</span>}
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--color-secondary-ink)' }}>
                        <strong style={{ color: 'var(--color-warning)' }}>{alumno.puntos_total || 0} SE 💶</strong>
                        <span> · {alumno.monedas_ruleta_yoshi || 0} 🪙 Yoshi</span>
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <button
                      type="button"
                      onClick={() => handleVerHistorialAlumno(alumno)}
                      className="btn-secondary"
                      style={{ padding: '6px 12px', fontSize: 11, fontWeight: 700 }}
                    >
                      <Eye size={13} />
                      <span>Ledger</span>
                    </button>

                    <button
                      type="button"
                      disabled={esElMismoAdmin}
                      onClick={() => {
                        sound.playPop()
                        setAlumnoAjuste(alumno)
                        setCantidadAjuste(10)
                        setMotivoAjuste('')
                        setErrorAjuste(null)
                      }}
                      className="btn-primary"
                      style={{
                        padding: '6px 14px',
                        fontSize: 11,
                        fontWeight: 800,
                        backgroundColor: esElMismoAdmin ? '#4B5563' : '#0A84FF',
                        cursor: esElMismoAdmin ? 'not-allowed' : 'pointer'
                      }}
                    >
                      <span>Ajustar Saldo</span>
                    </button>
                  </div>
                </div>
              )
            })}
        </div>
      </section>

      {/* 6. GESTIÓN Y AUDITORÍA DE PRECIOS DE TIENDA */}
      <section className="card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, marginBottom: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <DollarSign size={18} color="#10B981" />
            <h3 className="apple-headline" style={{ fontSize: 16 }}>
              Precios de Tienda y Días de Ahorro
            </h3>
          </div>
          <button
            type="button"
            onClick={cargarAnalisisTienda}
            disabled={cargandoTiendaPrecios}
            className="btn-secondary"
            style={{ fontSize: 11, padding: '4px 10px', display: 'flex', alignItems: 'center', gap: 4 }}
          >
            <RefreshCw size={12} className={cargandoTiendaPrecios ? 'animate-spin' : ''} />
            <span>Actualizar Precios</span>
          </button>
        </div>

        <p className="apple-caption" style={{ marginBottom: 12 }}>
          Tabla de esfuerzo para adquirir cada artículo según el perfil de alumno. Los precios se leen y validan en servidor.
        </p>

        {/* Filtros de tramo */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
          {['todos', 'comun', 'raro', 'epico', 'legendario'].map(tramo => (
            <button
              key={tramo}
              type="button"
              onClick={() => setFiltroTramo(tramo)}
              style={{
                fontSize: 11,
                fontWeight: 700,
                padding: '4px 10px',
                borderRadius: 9999,
                border: '1px solid var(--color-separator)',
                backgroundColor: filtroTramo === tramo ? 'var(--color-accent)' : 'var(--color-surface-secondary)',
                color: filtroTramo === tramo ? '#FFF' : 'var(--color-secondary-ink)',
                cursor: 'pointer'
              }}
            >
              {tramo.toUpperCase()}
            </button>
          ))}
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--color-separator)', textAlign: 'left', color: 'var(--color-secondary-ink)' }}>
                <th style={{ padding: '8px 6px' }}>Artículo</th>
                <th style={{ padding: '8px 6px' }}>Tramo</th>
                <th style={{ padding: '8px 6px' }}>Precio</th>
                <th style={{ padding: '8px 6px' }}>Casual (2 p/d)</th>
                <th style={{ padding: '8px 6px' }}>Normal (6 p/d)</th>
                <th style={{ padding: '8px 6px' }}>Activo (20 p/d)</th>
                <th style={{ padding: '8px 6px', textAlign: 'right' }}>Acción</th>
              </tr>
            </thead>
            <tbody>
              {analisisTienda
                .filter(i => filtroTramo === 'todos' || i.tramo === filtroTramo)
                .map(item => {
                  const colorTramo = item.tramo === 'legendario' ? '#FBBF24' : item.tramo === 'epico' ? '#BF5AF2' : item.tramo === 'raro' ? '#0A84FF' : '#8E8E93'
                  return (
                    <tr key={item.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                      <td style={{ padding: '8px 6px', fontWeight: 700, color: 'var(--color-ink)' }}>
                        {item.titulo}
                      </td>
                      <td style={{ padding: '8px 6px' }}>
                        <span style={{
                          fontSize: 10,
                          fontWeight: 800,
                          padding: '2px 6px',
                          borderRadius: 6,
                          backgroundColor: `${colorTramo}22`,
                          color: colorTramo
                        }}>
                          {item.tramo?.toUpperCase()}
                        </span>
                      </td>
                      <td style={{ padding: '8px 6px', fontWeight: 800, color: 'var(--color-ink)' }}>
                        {item.precio} SE
                      </td>
                      <td style={{ padding: '8px 6px', color: 'var(--color-secondary-ink)' }}>
                        ~{item.dias?.casual?.conApuestas || 0}d
                      </td>
                      <td style={{ padding: '8px 6px', color: 'var(--color-secondary-ink)' }}>
                        ~{item.dias?.normal?.conApuestas || 0}d
                      </td>
                      <td style={{ padding: '8px 6px', color: 'var(--color-secondary-ink)' }}>
                        ~{item.dias?.activo?.conApuestas || 0}d
                      </td>
                      <td style={{ padding: '8px 6px', textAlign: 'right' }}>
                        <button
                          type="button"
                          onClick={() => {
                            sound.playPop()
                            setItemEditando(item)
                            setNuevoPrecioEdit(item.precio)
                            setMotivoPrecioEdit('')
                            setErrorPrecioEdit(null)
                          }}
                          className="btn-secondary"
                          style={{ fontSize: 11, padding: '3px 8px' }}
                        >
                          Editar
                        </button>
                      </td>
                    </tr>
                  )
                })}
            </tbody>
          </table>
        </div>

        {/* Historial reciente de cambios de precios */}
        {historialPrecios.length > 0 && (
          <div style={{ marginTop: 14, paddingTop: 10, borderTop: '1px solid var(--color-separator)' }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-secondary-ink)', marginBottom: 6 }}>
              Historial de Modificaciones de Precios:
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 120, overflowY: 'auto' }}>
              {historialPrecios.slice(0, 5).map(h => (
                <div key={h.id} style={{ fontSize: 11, color: 'var(--color-secondary-ink)', display: 'flex', justifyContent: 'space-between' }}>
                  <span>• <strong>{h.item_id}</strong>: {h.precio_anterior} SE → {h.precio_nuevo} SE ({h.motivo})</span>
                  <span>{new Date(h.created_at).toLocaleDateString()}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* 7. DOCUMENTACIÓN FASE 2: EDITOR DE PROBABILIDADES */}
      <section className="card" style={{ backgroundColor: 'rgba(255, 255, 255, 0.02)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
          <Sliders size={18} color="var(--color-accent)" />
          <h3 className="apple-headline" style={{ fontSize: 15 }}>
            Fase 2: Editor Dinámico de Probabilidades (Documentación)
          </h3>
        </div>
        <p className="apple-caption" style={{ marginBottom: 10 }}>
          Especificación de control para la próxima actualización de balance económico:
        </p>
        <div style={{ fontSize: 12, color: 'var(--color-secondary-ink)', display: 'flex', flexDirection: 'column', gap: 6, lineHeight: 1.5 }}>
          <div><strong>1. Validación de Invariante Probabilística:</strong> La suma de los pesos de probabilidad debe ser exactamente 100.0% ($\sum p_i = 1.0$).</div>
          <div><strong>2. Techo de Valor Esperado (EV):</strong> El EV por tirada no podrá exceder de 1.5 SE en Bronce, 5.0 SE en Plata ni 22.0 SE en Oro para evitar descapitalización de la Banca.</div>
          <div><strong>3. Simulación Previa Obligatoria:</strong> Antes de guardar cambios, el servidor ejecutará una simulación Monte Carlo de 5.000 iteraciones en segundo plano para verificar solvencia.</div>
          <div><strong>4. Historial Inmutable:</strong> Toda versión de probabilidades quedará firmada y versionada cronológicamente.</div>
        </div>
      </section>

      {/* MODAL DE CONFIRMACIÓN DE AJUSTE CONTABLE */}
      {alumnoAjuste && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0,0,0,0.76)',
          backdropFilter: 'blur(6px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10001,
          padding: 16
        }}>
          <div style={{
            width: '100%',
            maxWidth: 440,
            backgroundColor: '#1C1C1E',
            borderRadius: 20,
            border: '1px solid rgba(255,255,255,0.15)',
            boxShadow: '0 24px 48px rgba(0,0,0,0.7)',
            padding: 20,
            color: '#FFF'
          }}>
            <h3 style={{ fontSize: 17, fontWeight: 800, margin: '0 0 12px 0' }}>
              Confirmar Ajuste Contable contra la Banca
            </h3>

            <div style={{
              padding: '12px 14px',
              borderRadius: 12,
              backgroundColor: 'rgba(255,255,255,0.05)',
              fontSize: 12,
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
              marginBottom: 14
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'rgba(255,255,255,0.6)' }}>Alumno receptor:</span>
                <strong>{alumnoAjuste.nombre}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'rgba(255,255,255,0.6)' }}>Saldo actual del alumno:</span>
                <span>{alumnoAjuste.puntos_total || 0} SE</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'rgba(255,255,255,0.6)' }}>Saldo tras la acción:</span>
                <strong style={{ color: Number(cantidadAjuste) >= 0 ? '#34C759' : '#EF4444' }}>
                  {Math.max(0, (alumnoAjuste.puntos_total || 0) + Number(cantidadAjuste))} SE
                </strong>
              </div>
              <div style={{ height: 1, backgroundColor: 'rgba(255,255,255,0.1)', margin: '2px 0' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'rgba(255,255,255,0.6)' }}>Contrapartida (Banca):</span>
                <span>{saldoBanca} SE → <strong>{saldoBanca - Number(cantidadAjuste)} SE</strong></span>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 14 }}>
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, marginBottom: 4 }}>
                  Cantidad a transferir (-50 a +50 SE)
                </label>
                <input
                  type="number"
                  min="-50"
                  max="50"
                  value={cantidadAjuste}
                  onChange={(e) => setCantidadAjuste(Number(e.target.value) || 0)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: 10,
                    backgroundColor: '#2C2C2E',
                    border: '1px solid rgba(255,255,255,0.2)',
                    color: '#FFF',
                    fontSize: 14,
                    fontWeight: 800
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, marginBottom: 4 }}>
                  Motivo obligatorio de auditoría (mínimo 4 caracteres)
                </label>
                <input
                  type="text"
                  placeholder="Ej: Corrección práctica, premio torneo..."
                  value={motivoAjuste}
                  onChange={(e) => setMotivoAjuste(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: 10,
                    backgroundColor: '#2C2C2E',
                    border: '1px solid rgba(255,255,255,0.2)',
                    color: '#FFF',
                    fontSize: 13
                  }}
                />
              </div>
            </div>

            {errorAjuste && (
              <div style={{
                padding: '8px 12px',
                borderRadius: 8,
                backgroundColor: 'rgba(239, 68, 68, 0.2)',
                border: '1px solid #EF4444',
                color: '#F87171',
                fontSize: 11,
                marginBottom: 12
              }}>
                {errorAjuste}
              </div>
            )}

            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setAlumnoAjuste(null)}
                className="btn-secondary"
                disabled={enviandoAjuste}
                style={{ padding: '8px 14px', fontSize: 12 }}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmarAjuste}
                disabled={enviandoAjuste || !motivoAjuste.trim()}
                className="btn-primary"
                style={{
                  padding: '8px 18px',
                  fontSize: 12,
                  fontWeight: 800,
                  backgroundColor: '#30D158',
                  color: '#FFF'
                }}
              >
                {enviandoAjuste ? 'Aplicando en Ledger...' : 'Confirmar y Aplicar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE EDICIÓN DE PRECIO DE TIENDA */}
      {itemEditando && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0,0,0,0.76)',
          backdropFilter: 'blur(6px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10001,
          padding: 16
        }}>
          <div style={{
            width: '100%',
            maxWidth: 420,
            backgroundColor: '#1C1C1E',
            borderRadius: 20,
            border: '1px solid rgba(255,255,255,0.15)',
            boxShadow: '0 24px 48px rgba(0,0,0,0.7)',
            padding: 20,
            color: '#FFF'
          }}>
            <h3 style={{ fontSize: 17, fontWeight: 800, margin: '0 0 12px 0' }}>
              Editar Precio Oficial: {itemEditando.titulo}
            </h3>

            <div style={{
              padding: '12px 14px',
              borderRadius: 12,
              backgroundColor: 'rgba(255,255,255,0.05)',
              fontSize: 12,
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
              marginBottom: 14
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'rgba(255,255,255,0.6)' }}>Tramo actual:</span>
                <span style={{ textTransform: 'uppercase', fontWeight: 800 }}>{itemEditando.tramo}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'rgba(255,255,255,0.6)' }}>Precio vigente:</span>
                <strong>{itemEditando.precio} SE</strong>
              </div>
            </div>

            <div style={{ marginBottom: 12 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 4, color: 'rgba(255,255,255,0.8)' }}>
                Nuevo Precio (StevenEuros):
              </label>
              <input
                type="number"
                min="1"
                max="5000"
                value={nuevoPrecioEdit}
                onChange={e => setNuevoPrecioEdit(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: 10,
                  backgroundColor: 'rgba(255,255,255,0.08)',
                  border: '1px solid rgba(255,255,255,0.2)',
                  color: '#FFF',
                  fontSize: 14,
                  fontWeight: 700
                }}
              />
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 4, color: 'rgba(255,255,255,0.8)' }}>
                Motivo del cambio (obligatorio):
              </label>
              <input
                type="text"
                placeholder="Ej. Rebalanceo por inflación / Evento"
                value={motivoPrecioEdit}
                onChange={e => setMotivoPrecioEdit(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: 10,
                  backgroundColor: 'rgba(255,255,255,0.08)',
                  border: '1px solid rgba(255,255,255,0.2)',
                  color: '#FFF',
                  fontSize: 13
                }}
              />
            </div>

            {errorPrecioEdit && (
              <div style={{ color: '#EF4444', fontSize: 12, marginBottom: 12 }}>
                {errorPrecioEdit}
              </div>
            )}

            <div style={{ display: 'flex', gap: 10 }}>
              <button
                type="button"
                onClick={() => setItemEditando(null)}
                style={{
                  flex: 1,
                  padding: '10px 14px',
                  borderRadius: 10,
                  backgroundColor: 'rgba(255,255,255,0.1)',
                  border: 'none',
                  color: '#FFF',
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleGuardarPrecio}
                disabled={guardandoPrecio}
                style={{
                  flex: 1,
                  padding: '10px 14px',
                  borderRadius: 10,
                  backgroundColor: '#0A84FF',
                  border: 'none',
                  color: '#FFF',
                  fontSize: 13,
                  fontWeight: 800,
                  cursor: guardandoPrecio ? 'not-allowed' : 'pointer'
                }}
              >
                {guardandoPrecio ? 'Guardando...' : 'Guardar Precio'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE RESULTADO DE AUDITORÍA */}
      {mostrarModalAuditoria && resultadoAuditoria && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0,0,0,0.76)',
          backdropFilter: 'blur(6px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10002,
          padding: 16
        }}>
          <div style={{
            width: '100%',
            maxWidth: 480,
            backgroundColor: '#1C1C1E',
            borderRadius: 20,
            border: '1px solid rgba(255,255,255,0.15)',
            boxShadow: '0 24px 48px rgba(0,0,0,0.7)',
            padding: 20,
            color: '#FFF'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              {resultadoAuditoria.invariante_valida ? (
                <CheckCircle2 size={24} color="#30D158" />
              ) : (
                <AlertTriangle size={24} color="#EF4444" />
              )}
              <h3 style={{ fontSize: 17, fontWeight: 800, margin: 0 }}>
                {resultadoAuditoria.invariante_valida ? 'Invariante Contable Válida' : 'Discrepancias Encontradas'}
              </h3>
            </div>

            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', lineHeight: 1.6, marginBottom: 14 }}>
              <div>• Suministro Total: <strong>{resultadoAuditoria.suministro_total_ecosistema} SE</strong></div>
              <div>• Saldo en Banca: <strong>{resultadoAuditoria.saldo_banca_se} SE</strong></div>
              <div>• Circulante en Alumnos: <strong>{resultadoAuditoria.circulante_usuarios_se} SE</strong></div>
              <div>• Discrepancias: <strong>{resultadoAuditoria.discrepancias_encontradas}</strong></div>
            </div>

            {resultadoAuditoria.discrepancias_encontradas > 0 && (
              <div style={{
                maxHeight: 180,
                overflowY: 'auto',
                backgroundColor: 'rgba(239, 68, 68, 0.12)',
                border: '1px solid #EF4444',
                borderRadius: 10,
                padding: 10,
                marginBottom: 14,
                fontSize: 11
              }}>
                {resultadoAuditoria.detalle_discrepancias.map((d, i) => (
                  <div key={i} style={{ marginBottom: 4 }}>
                    • {d.nombre}: Perfil={d.saldo_perfil} SE vs Ledger={d.saldo_ledger} SE (Dif: {d.diferencia})
                  </div>
                ))}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setMostrarModalAuditoria(false)}
                className="btn-primary"
                style={{ padding: '8px 18px', fontSize: 12 }}
              >
                Cerrar Informe
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE HISTORIAL CONTABLE DE ALUMNO Y REVERSIÓN */}
      {alumnoHistorial && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0,0,0,0.76)',
          backdropFilter: 'blur(6px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10003,
          padding: 16
        }}>
          <div style={{
            width: '100%',
            maxWidth: 540,
            backgroundColor: '#1C1C1E',
            borderRadius: 20,
            border: '1px solid rgba(255,255,255,0.15)',
            boxShadow: '0 24px 48px rgba(0,0,0,0.7)',
            padding: 20,
            color: '#FFF',
            maxHeight: '85vh',
            display: 'flex',
            flexDirection: 'column'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div>
                <h3 style={{ fontSize: 16, fontWeight: 800, margin: 0 }}>
                  Ledger de {alumnoHistorial.nombre}
                </h3>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>
                  Historial inmutable con opción de reversión por contrapartida
                </div>
              </div>
              <button
                type="button"
                onClick={() => setAlumnoHistorial(null)}
                style={{ background: 'none', border: 'none', color: '#FFF', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8, paddingRight: 4 }}>
              {cargandoHistorial && (
                <div style={{ textAlign: 'center', padding: 24, fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>
                  Cargando ledger...
                </div>
              )}
              {!cargandoHistorial && historialCargado.length === 0 && (
                <div style={{ textAlign: 'center', padding: 24, fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>
                  No hay movimientos registrados para este usuario.
                </div>
              )}
              {historialCargado.map((item) => (
                <div
                  key={item.id}
                  style={{
                    padding: '10px 12px',
                    borderRadius: 10,
                    backgroundColor: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.06)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 10
                  }}
                >
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 700 }}>{item.motivo}</div>
                    <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.45)', marginTop: 2 }}>
                      {new Date(item.created_at).toLocaleString('es-ES', { timeZone: 'Europe/Madrid' })} · Saldo: {item.saldo_posterior}
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{
                      fontWeight: 800,
                      fontSize: 13,
                      color: item.cantidad >= 0 ? '#30D158' : '#EF4444'
                    }}>
                      {item.cantidad >= 0 ? `+${item.cantidad}` : item.cantidad} {item.moneda === 'steveneuros' ? 'SE' : '🪙'}
                    </div>

                    {item.tipo === 'ajuste_admin' && (
                      <button
                        type="button"
                        onClick={() => handleRevertirMovimiento(item)}
                        style={{
                          backgroundColor: 'rgba(239, 68, 68, 0.15)',
                          border: '1px solid #EF4444',
                          color: '#F87171',
                          borderRadius: 6,
                          padding: '3px 7px',
                          fontSize: 10,
                          fontWeight: 700,
                          cursor: 'pointer'
                        }}
                        title="Revertir movimiento en el ledger"
                      >
                        Revertir
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 14 }}>
              <button
                type="button"
                onClick={() => setAlumnoHistorial(null)}
                className="btn-secondary"
                style={{ padding: '6px 16px', fontSize: 12 }}
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
