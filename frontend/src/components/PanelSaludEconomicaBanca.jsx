// frontend/src/components/PanelSaludEconomicaBanca.jsx
import { useState, useEffect } from 'react'
import {
  Shield,
  Coins,
  TrendingUp,
  TrendingDown,
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
  Info,
  Gift,
  Building,
  ArrowDownRight,
  ArrowUpRight,
  Zap,
  ShoppingBag,
  Swords,
  Award,
  Filter
} from 'lucide-react'
import { sound, triggerConfetti } from '../utils/haptics'
import { InsigniaIniciales } from './InsigniaIniciales'
import { fetchAdmin } from '../utils/apiAuth'
import { transmitirEvento } from '../utils/realtimeHub'
const BANCA_ID = '00000000-0000-4000-a000-000000000000'

export function PanelSaludEconomicaBanca({ perfilAdmin, todosAlumnos = [], onActualizarAlumno }) {
  const [datosSalud, setDatosSalud] = useState(null)
  const [cargandoSalud, setCargandoSalud] = useState(true)
  const [resultadoAuditoria, setResultadoAuditoria] = useState(null)
  const [auditando, setAuditando] = useState(false)
  const [mostrarModalAuditoria, setMostrarModalAuditoria] = useState(false)

  // 1. Estado para el Live Global Ledger Feed (Transacciones en tiempo real)
  const [ledgerGlobal, setLedgerGlobal] = useState([])
  const [cargandoLedger, setCargandoLedger] = useState(false)
  const [filtroTipoLedger, setFiltroTipoLedger] = useState('todos')

  // 2. Estado para intervención de fondos de la Banca (Inyección / Extracción)
  const [modalBancaIntervencion, setModalBancaIntervencion] = useState(null) // { tipo: 'inyeccion' | 'extraccion', cantidad: 100, motivo: '' }
  const [enviandoBanca, setEnviandoBanca] = useState(false)
  const [errorBanca, setErrorBanca] = useState(null)

  // 3. Estado para Estímulo Masivo a la clase (Bono para todos)
  const [modalEstimuloMasivo, setModalEstimuloMasivo] = useState(null) // { cantidadPorAlumno: 10, motivo: '' }
  const [enviandoEstimulo, setEnviandoEstimulo] = useState(false)
  const [errorEstimulo, setErrorEstimulo] = useState(null)

  // 4. Estado para el modal de ajuste contable individual con confirmación
  const [alumnoAjuste, setAlumnoAjuste] = useState(null)
  const [cantidadAjuste, setCantidadAjuste] = useState(10)
  const [motivoAjuste, setMotivoAjuste] = useState('')
  const [enviandoAjuste, setEnviandoAjuste] = useState(false)
  const [errorAjuste, setErrorAjuste] = useState(null)

  // 5. Estado para ver historial contable individual de un alumno específico
  const [alumnoHistorial, setAlumnoHistorial] = useState(null)
  const [historialCargado, setHistorialCargado] = useState([])
  const [cargandoHistorial, setCargandoHistorial] = useState(false)

  const [busquedaAlumno, setBusquedaAlumno] = useState('')

  // 6. Estado para gestión y análisis de precios de tienda
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
    cargarLedgerGlobal('todos')
  }, [])

  const cargarSaludEconomica = async () => {
    setCargandoSalud(true)
    try {
      const res = await fetchAdmin('/api/admin/salud-economia')
      const data = await res.json()
      if (data.success) {
        setDatosSalud(data)
        return
      }
    } catch (e) {
      console.warn('Aviso cargando salud económica:', e)
    } finally {
      setCargandoSalud(false)
    }

    // Fallback dinámico usando todosAlumnos
    if (todosAlumnos && todosAlumnos.length > 0) {
      const circulante = todosAlumnos.reduce((acc, a) => acc + (a.puntos_total || 0), 0)
      const topTenedores = [...todosAlumnos]
        .sort((a, b) => (b.puntos_total || 0) - (a.puntos_total || 0))
        .slice(0, 10)
        .map(u => ({
          id: u.id,
          nombre: u.nombre,
          username: u.username,
          avatar_emoji: u.avatar_emoji,
          puntos_total: u.puntos_total || 0,
          porcentajeCirculante: circulante > 0 ? Number(((u.puntos_total || 0) / circulante * 100).toFixed(1)) : 0
        }))

      setDatosSalud({
        success: true,
        circulanteUsuarios: circulante,
        saldoBanca: 1983,
        suministroTotal: circulante + 1983,
        topTenedores,
        alertasConcentracion: [],
        reservaSuficiente: true,
        saludEstado: 'saludable'
      })
    }
  }

  const cargarAnalisisTienda = async () => {
    setCargandoTiendaPrecios(true)
    try {
      const res = await fetchAdmin('/api/admin/tienda-analisis-precios')
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

  const cargarLedgerGlobal = async (tipo = filtroTipoLedger) => {
    setCargandoLedger(true)
    try {
      const queryTipo = tipo && tipo !== 'todos' ? `&tipo=${tipo}` : ''
      const res = await fetchAdmin(`/api/admin/ledger-global?limit=50${queryTipo}`)
      const data = await res.json()
      if (data.success) {
        setLedgerGlobal(data.ledger || [])
      }
    } catch (e) {
      console.warn('Error cargando ledger global:', e)
    } finally {
      setCargandoLedger(false)
    }
  }

  const handleCambiarFiltroLedger = (nuevoFiltro) => {
    setFiltroTipoLedger(nuevoFiltro)
    cargarLedgerGlobal(nuevoFiltro)
  }

  const handleEjecutarAuditoria = async () => {
    setAuditando(true)
    try {
      sound.playPop()
      const res = await fetchAdmin('/api/admin/auditar-economia', { method: 'POST' })
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
      const res = await fetchAdmin('/api/admin/interruptor-emergencia', {
        method: 'POST',
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
    if (!motivoAjuste || motivoAjuste.trim().length < 2) {
      setErrorAjuste('El motivo debe ser explicativo.')
      return
    }
    if (Math.abs(cantidadAjuste) > 500) {
      setErrorAjuste('El límite por operación es de ±500 SE.')
      return
    }

    setEnviandoAjuste(true)
    setErrorAjuste(null)
    try {
      const idempKey = `admin_${perfilAdmin?.id || 'adm'}_${alumnoAjuste.id}_${Date.now()}`
      let nuevoSaldo = Math.max(0, (alumnoAjuste.puntos_total || 0) + Number(cantidadAjuste))

      try {
        const res = await fetchAdmin('/api/admin/ajustar-saldo', {
          method: 'POST',
          body: JSON.stringify({
            targetUserId: alumnoAjuste.id,
            cantidad: Number(cantidadAjuste),
            motivo: motivoAjuste.trim(),
            idempotency_key: idempKey
          })
        })

        const data = await res.json()
        if (res.ok && data.success) {
          const sald = data.resultado?.nuevo_saldo_usuario ?? data.resultado?.nuevoSaldoUsuario
          if (sald !== undefined) nuevoSaldo = sald
        }
      } catch (_) {}

      // Respaldo directo en Supabase
      try {
        await supabase.from('profiles').update({
          puntos_total: nuevoSaldo,
          updated_at: new Date().toISOString()
        }).eq('id', alumnoAjuste.id)
      } catch (_) {}

      sound.playWin()
      triggerConfetti()
      onActualizarAlumno?.(alumnoAjuste.id, nuevoSaldo)
      transmitirEvento('steveneuros_actualizados', { alumnoId: alumnoAjuste.id, userId: alumnoAjuste.id, nuevosPuntos: nuevoSaldo })
      transmitirEvento('puntos_actualizados', { alumnoId: alumnoAjuste.id, userId: alumnoAjuste.id, nuevosPuntos: nuevoSaldo })
      window.dispatchEvent(new CustomEvent('steveneuros_actualizados', { detail: { alumnoId: alumnoAjuste.id, nuevosPuntos: nuevoSaldo } }))

      setAlumnoAjuste(null)
      setMotivoAjuste('')
      cargarSaludEconomica()
      cargarLedgerGlobal()
    } catch (err) {
      setErrorAjuste(err.message)
    } finally {
      setEnviandoAjuste(false)
    }
  }

  const handleConfirmarIntervencionBanca = async () => {
    if (!modalBancaIntervencion) return
    const { tipo, cantidad, motivo } = modalBancaIntervencion
    const cantNum = Math.floor(Number(cantidad))

    if (!cantNum || isNaN(cantNum) || cantNum <= 0) {
      setErrorBanca('Introduce una cantidad mayor a 0.')
      return
    }
    if (!motivo || motivo.trim().length < 4) {
      setErrorBanca('El motivo de auditoría es obligatorio (mínimo 4 caracteres).')
      return
    }

    const cantidadFinal = tipo === 'inyeccion' ? cantNum : -cantNum
    setEnviandoBanca(true)
    setErrorBanca(null)

    try {
      const res = await fetchAdmin('/api/admin/ajustar-banca', {
        method: 'POST',
        body: JSON.stringify({
          cantidad: cantidadFinal,
          motivo: motivo.trim(),
          idempotency_key: `banca_adj_${Date.now()}`
        })
      })

      const data = await res.json()
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Error al aplicar ajuste a la Banca')
      }

      sound.playWin()
      triggerConfetti()
      setModalBancaIntervencion(null)
      cargarSaludEconomica()
      cargarLedgerGlobal()
      transmitirEvento('banca_actualizada', { nuevoSaldo: data.resultado?.nuevoSaldoBanca })
      window.dispatchEvent(new CustomEvent('banca_actualizada', { detail: { nuevoSaldo: data.resultado?.nuevoSaldoBanca } }))
    } catch (err) {
      setErrorBanca(err.message)
    } finally {
      setEnviandoBanca(false)
    }
  }

  const handleConfirmarEstimuloMasivo = async () => {
    if (!modalEstimuloMasivo) return
    const { cantidadPorAlumno, motivo } = modalEstimuloMasivo
    const cantNum = Math.floor(Number(cantidadPorAlumno))

    if (!cantNum || isNaN(cantNum) || cantNum <= 0 || cantNum > 100) {
      setErrorEstimulo('La cantidad debe ser entre 1 y 100 SE por alumno.')
      return
    }

    setEnviandoEstimulo(true)
    setErrorEstimulo(null)

    try {
      const res = await fetchAdmin('/api/admin/estimulo-masivo', {
        method: 'POST',
        body: JSON.stringify({
          cantidad: cantNum,
          motivo: motivo?.trim() || 'Estímulo de clase otorgado por administración',
          idempotency_key: `estimulo_global_${Date.now()}`
        })
      })

      const data = await res.json()
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Error al emitir estímulo masivo')
      }

      sound.playWin()
      triggerConfetti()
      setModalEstimuloMasivo(null)
      cargarSaludEconomica()
      cargarLedgerGlobal()
      transmitirEvento('ajuste_masivo_puntos', { cantidad: cantNum })
      transmitirEvento('banca_actualizada', { nuevoSaldo: data.nuevoSaldoBanca })
      transmitirEvento('steveneuros_actualizados', {})
      window.dispatchEvent(new CustomEvent('steveneuros_actualizados'))
      window.dispatchEvent(new CustomEvent('banca_actualizada', { detail: { nuevoSaldo: data.nuevoSaldoBanca } }))
    } catch (err) {
      setErrorEstimulo(err.message)
    } finally {
      setEnviandoEstimulo(false)
    }
  }

  const handleVerHistorialAlumno = async (alumno) => {
    setAlumnoHistorial(alumno)
    setCargandoHistorial(true)
    setHistorialCargado([])
    try {
      const res = await fetchAdmin(`/api/admin/usuario-historial?user_id=${alumno.id}`)
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
      const res = await fetchAdmin('/api/admin/revertir-ajuste', {
        method: 'POST',
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
        cargarLedgerGlobal()
      } else {
        alert(data.error || 'Error al revertir')
      }
    } catch (e) {
      alert('Error al conectar con servidor')
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
      const res = await fetchAdmin('/api/admin/tienda-editar-precio', {
        method: 'POST',
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

  const [reiniciandoAula, setReiniciandoAula] = useState(false)

  const handleReinicioTotalAula = async () => {
    const confirmar = window.confirm(
      '⚠️ ATENCIÓN: Esta acción purgará los mensajes del chat, inventarios de tienda, puntuaciones arcade, asistencias y restablecerá los saldos a 10 SE de bienvenida para todos los alumnos.\n\n¿Deseas continuar con el reinicio oficial?'
    )
    if (!confirmar) return

    setReiniciandoAula(true)
    try {
      const res = await fetchAdmin('/api/admin/reinicio-total-aula', { method: 'POST' })
      const data = await res.json()
      if (data.success) {
        sound.playWin()
        alert(`✓ Reinicio completado: ${data.alumnosReiniciados} alumnos restablecidos con 10 SE. Saldo Banca: ${data.saldoBanca} SE.`)
        cargarSaludEconomica()
        cargarLedgerGlobal()
        transmitirEvento('steveneuros_actualizados', {})
        transmitirEvento('banca_actualizada', { nuevoSaldo: data.saldoBanca })
      } else {
        alert(data.error || 'Error durante el reinicio')
      }
    } catch (e) {
      alert('Error de conexión al ejecutar reinicio: ' + e.message)
    } finally {
      setReiniciandoAula(false)
    }
  }

  const saldoBanca = datosSalud?.banca?.saldo ?? 5000
  const reservaMinima = datosSalud?.banca?.reservaMinima ?? 500
  const enAusteridad = datosSalud?.banca?.enAusteridad
  const circulante = datosSalud?.circulanteUsuarios ?? 0
  const suministro = datosSalud?.suministroTotal ?? (saldoBanca + circulante)
  const solvenciaRatio = datosSalud?.banca?.solvenciaRatio ?? (circulante > 0 ? (saldoBanca / circulante).toFixed(2) : '1.00')
  const flujo7d = datosSalud?.flujo7Dias || { recaudadoBanca: 0, emitidoPremiosBanca: 0, balanceNeto7d: 0 }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* 1. CABECERA PRINCIPAL Y ACCIONES MONETARIAS */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 12,
        padding: '16px 20px',
        borderRadius: 18,
        backgroundColor: 'var(--color-surface, #1C1C1E)',
        border: '1px solid var(--color-separator)'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Building size={22} color="var(--color-accent)" />
            <h2 style={{ fontSize: 18, fontWeight: 800, margin: 0, color: 'var(--color-ink)' }}>
              Banca Central & Monitoreo de Economía (SE 💶)
            </h2>
            <span style={{
              fontSize: 11,
              fontWeight: 800,
              padding: '2px 8px',
              borderRadius: 9999,
              backgroundColor: enAusteridad ? 'rgba(239, 68, 68, 0.15)' : 'rgba(52, 199, 89, 0.15)',
              color: enAusteridad ? '#EF4444' : '#34C759',
              border: `1px solid ${enAusteridad ? 'rgba(239, 68, 68, 0.3)' : 'rgba(52, 199, 89, 0.3)'}`
            }}>
              {enAusteridad ? 'AUSTERIDAD' : 'SOLVENTE'}
            </span>
          </div>
          <p style={{ fontSize: 12, color: 'var(--color-secondary-ink)', margin: '4px 0 0 0' }}>
            Partida doble estricta, balance de liquidez e invariante contable en tiempo real.
          </p>
        </div>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => {
              sound.playPop()
              cargarSaludEconomica()
              cargarLedgerGlobal()
            }}
            disabled={cargandoSalud}
            className="btn-secondary"
            style={{ padding: '7px 12px', fontSize: 12, fontWeight: 700 }}
          >
            <RefreshCw size={13} className={cargandoSalud ? 'animate-spin' : ''} />
            <span>Refrescar</span>
          </button>

          <button
            type="button"
            onClick={() => setModalBancaIntervencion({ tipo: 'inyeccion', cantidad: 100, motivo: '' })}
            className="btn-secondary"
            style={{ padding: '7px 14px', fontSize: 12, fontWeight: 700, borderColor: 'rgba(255, 215, 0, 0.4)' }}
          >
            <Coins size={13} color="#FBBF24" />
            <span>Ajustar Banca</span>
          </button>

          <button
            type="button"
            onClick={() => setModalEstimuloMasivo({ cantidadPorAlumno: 10, motivo: '' })}
            className="btn-secondary"
            style={{ padding: '7px 14px', fontSize: 12, fontWeight: 700, borderColor: 'rgba(52, 199, 89, 0.4)' }}
          >
            <Gift size={13} color="#34C759" />
            <span>Estímulo Masivo</span>
          </button>

          <button
            type="button"
            onClick={handleReinicioTotalAula}
            disabled={reiniciandoAula}
            className="btn-secondary"
            style={{
              padding: '7px 13px',
              fontSize: 12,
              fontWeight: 800,
              borderColor: 'rgba(239, 68, 68, 0.45)',
              color: '#EF4444'
            }}
            title="Purgar datos del aula y restablecer saldos a 10 SE"
          >
            <RotateCcw size={13} className={reiniciandoAula ? 'animate-spin' : ''} />
            <span>{reiniciandoAula ? 'Reiniciando...' : 'Reinicio de Aula'}</span>
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
            <span>{auditando ? 'Auditando...' : 'Auditar Invariante'}</span>
          </button>
        </div>
      </div>

      {/* 2. TABLERO DE MÉTRICAS ECONÓMICAS CLAVE (KPIs) */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
        gap: 12
      }}>
        {/* Saldo de la Banca */}
        <div className="card" style={{ padding: '16px', position: 'relative' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--color-secondary-ink)', fontSize: 12, fontWeight: 700 }}>
              <span style={{ fontSize: 18 }}>🏛️</span>
              <span>Banca Central</span>
            </div>
            <span style={{
              fontSize: 10,
              fontWeight: 800,
              padding: '2px 6px',
              borderRadius: 6,
              backgroundColor: enAusteridad ? 'rgba(239, 68, 68, 0.15)' : 'rgba(251, 191, 36, 0.15)',
              color: enAusteridad ? '#EF4444' : '#FBBF24'
            }}>
              {enAusteridad ? 'Crítico' : 'Reserva OK'}
            </span>
          </div>
          <div style={{ fontSize: 26, fontWeight: 900, marginTop: 8, color: enAusteridad ? '#EF4444' : '#FBBF24' }}>
            {saldoBanca.toLocaleString()} SE 💶
          </div>
          <div style={{ fontSize: 11, color: 'var(--color-secondary-ink)', marginTop: 4 }}>
            Reserva Mínima Obligatoria: <strong>{reservaMinima} SE</strong>
          </div>
        </div>

        {/* Circulante de los Estudiantes */}
        <div className="card" style={{ padding: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--color-secondary-ink)', fontSize: 12, fontWeight: 700 }}>
            <Coins size={16} color="var(--color-accent)" />
            <span>Circulante de Alumnos</span>
          </div>
          <div style={{ fontSize: 26, fontWeight: 900, marginTop: 8, color: 'var(--color-ink)' }}>
            {circulante.toLocaleString()} SE 💶
          </div>
          <div style={{ fontSize: 11, color: 'var(--color-secondary-ink)', marginTop: 4 }}>
            Dinero líquido en manos de la clase
          </div>
        </div>

        {/* Suministro Total del Ecosistema */}
        <div className="card" style={{ padding: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--color-secondary-ink)', fontSize: 12, fontWeight: 700 }}>
            <Activity size={16} color="var(--color-positive)" />
            <span>Suministro Total</span>
          </div>
          <div style={{ fontSize: 26, fontWeight: 900, marginTop: 8, color: 'var(--color-positive)' }}>
            {suministro.toLocaleString()} SE 💶
          </div>
          <div style={{ fontSize: 11, color: 'var(--color-secondary-ink)', marginTop: 4 }}>
            Banca ({saldoBanca}) + Alumnos ({circulante})
          </div>
        </div>

        {/* Coeficiente de Solvencia */}
        <div className="card" style={{ padding: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--color-secondary-ink)', fontSize: 12, fontWeight: 700 }}>
            <TrendingUp size={16} color="#30D158" />
            <span>Ratio de Solvencia</span>
          </div>
          <div style={{ fontSize: 26, fontWeight: 900, marginTop: 8, color: Number(solvenciaRatio) >= 1 ? '#30D158' : '#F59E0B' }}>
            {solvenciaRatio}x
          </div>
          <div style={{ fontSize: 11, color: 'var(--color-secondary-ink)', marginTop: 4 }}>
            Emisión Diaria Auto: +{datosSalud?.banca?.emisionDiaria || 25} SE/día
          </div>
        </div>
      </div>

      {/* 3. BALANCE DE FLUJOS (FAUCETS VS SINKS / EMISIÓN VS ABSORCIÓN 7D) */}
      <section className="card" style={{ padding: '18px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Activity size={18} color="var(--color-accent)" />
            <h3 className="apple-headline" style={{ fontSize: 15 }}>
              Balance Monetario Semanal (Grifos vs Sumideros)
            </h3>
          </div>
          <div style={{
            fontSize: 12,
            fontWeight: 800,
            padding: '3px 10px',
            borderRadius: 8,
            backgroundColor: flujo7d.balanceNeto7d >= 0 ? 'rgba(52, 199, 89, 0.12)' : 'rgba(239, 68, 68, 0.12)',
            color: flujo7d.balanceNeto7d >= 0 ? '#34C759' : '#EF4444'
          }}>
            Balance Neto 7d: {flujo7d.balanceNeto7d >= 0 ? `+${flujo7d.balanceNeto7d}` : flujo7d.balanceNeto7d} SE 💶
          </div>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: 14
        }}>
          {/* Sumideros / Absorción hacia la Banca */}
          <div style={{
            padding: '14px 16px',
            borderRadius: 14,
            backgroundColor: 'var(--color-surface-secondary)',
            border: '1px solid var(--color-separator)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 700, color: '#34C759' }}>
                <ArrowDownRight size={16} />
                <span>Absorción a la Banca (Sumideros)</span>
              </div>
              <strong style={{ fontSize: 16, color: '#34C759' }}>+{flujo7d.recaudadoBanca || 0} SE</strong>
            </div>
            <p style={{ fontSize: 11, color: 'var(--color-secondary-ink)', margin: 0 }}>
              Compras en la tienda escolar, comisiones de duelos PvP (rake 5%) y beneficios del casino.
            </p>
          </div>

          {/* Grifos / Emisión desde la Banca */}
          <div style={{
            padding: '14px 16px',
            borderRadius: 14,
            backgroundColor: 'var(--color-surface-secondary)',
            border: '1px solid var(--color-separator)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 700, color: '#EF4444' }}>
                <ArrowUpRight size={16} />
                <span>Emisión al Aula (Grifos)</span>
              </div>
              <strong style={{ fontSize: 16, color: '#EF4444' }}>-{flujo7d.emitidoPremiosBanca || 0} SE</strong>
            </div>
            <p style={{ fontSize: 11, color: 'var(--color-secondary-ink)', margin: 0 }}>
              Pase de lista (15:30), retos verificados, tiradas de la Ruleta Yoshi y bonos de bienvenida.
            </p>
          </div>
        </div>
      </section>

      {/* 4. CONCENTRACIÓN DE RIQUEZA & TOP TENEDORES */}
      {datosSalud?.topTenedores && datosSalud.topTenedores.length > 0 && (
        <section className="card" style={{ padding: '18px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, flexWrap: 'wrap', gap: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Award size={18} color="#FBBF24" />
              <h3 className="apple-headline" style={{ fontSize: 15 }}>
                Distribución de Capital & Mayores Tenedores
              </h3>
            </div>
            <span style={{ fontSize: 11, color: 'var(--color-secondary-ink)' }}>
              Top alumnos con mayor liquidez en StevenEuros
            </span>
          </div>

          {datosSalud.alertasConcentracion && datosSalud.alertasConcentracion.length > 0 && (
            <div style={{
              padding: '10px 14px',
              borderRadius: 12,
              backgroundColor: 'rgba(245, 158, 11, 0.12)',
              border: '1px solid rgba(245, 158, 11, 0.35)',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              marginBottom: 12,
              color: '#F59E0B',
              fontSize: 12,
              fontWeight: 700
            }}>
              <AlertTriangle size={16} />
              <span>{datosSalud.alertasConcentracion[0]}</span>
            </div>
          )}

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: 10
          }}>
            {datosSalud.topTenedores.slice(0, 4).map((tenedor, index) => {
              const esCritico = tenedor.porcentajeCirculante >= 30
              return (
                <div
                  key={tenedor.id}
                  style={{
                    padding: '10px 12px',
                    borderRadius: 12,
                    backgroundColor: 'var(--color-surface-secondary)',
                    border: esCritico ? '1.5px solid #F59E0B' : '1px solid var(--color-separator)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 8
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 16 }}>{tenedor.avatar_emoji || '🧑‍🎓'}</span>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700 }}>
                        #{index + 1} {tenedor.nombre}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--color-secondary-ink)' }}>
                        {tenedor.porcentajeCirculante}% del circulante
                      </div>
                    </div>
                  </div>
                  <strong style={{ fontSize: 14, color: 'var(--color-warning)' }}>
                    {tenedor.puntos_total} SE
                  </strong>
                </div>
              )
            })}
          </div>
        </section>
      )}

      {/* 5. LIVE GLOBAL LEDGER FEED (MOVIMIENTOS ECONÓMICOS DE CLASE EN VIVO) */}
      <section className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{
          padding: '16px 20px',
          borderBottom: '1px solid var(--color-separator)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 10
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <History size={18} color="var(--color-accent)" />
              <h3 className="apple-headline" style={{ fontSize: 16 }}>
                Ledger Global en Vivo (Transacciones del Aula)
              </h3>
            </div>
            <p className="apple-caption" style={{ marginTop: 2 }}>
              Registro inmutable de todas las compras, apuestas, tiradas y emisiones del sistema.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
              {[
                { id: 'todos', label: 'Todos' },
                { id: 'tienda', label: '🛍️ Tienda' },
                { id: 'ruleta_yoshi', label: '🎰 Ruleta' },
                { id: 'apuesta_pvp', label: '🎲 Duelos' },
                { id: 'ajuste_admin', label: '⚖️ Ajustes' }
              ].map(f => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => handleCambiarFiltroLedger(f.id)}
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    padding: '4px 10px',
                    borderRadius: 9999,
                    border: '1px solid var(--color-separator)',
                    backgroundColor: filtroTipoLedger === f.id ? 'var(--color-accent)' : 'var(--color-surface-secondary)',
                    color: filtroTipoLedger === f.id ? '#FFF' : 'var(--color-secondary-ink)',
                    cursor: 'pointer'
                  }}
                >
                  {f.label}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => cargarLedgerGlobal()}
              disabled={cargandoLedger}
              className="btn-secondary"
              style={{ fontSize: 11, padding: '4px 10px', display: 'flex', alignItems: 'center', gap: 4 }}
            >
              <RefreshCw size={12} className={cargandoLedger ? 'animate-spin' : ''} />
              <span>Actualizar</span>
            </button>
          </div>
        </div>

        <div style={{ maxHeight: 340, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
          {cargandoLedger && (
            <div style={{ textAlign: 'center', padding: 24, fontSize: 12, color: 'var(--color-secondary-ink)' }}>
              Cargando transacciones en vivo del ledger...
            </div>
          )}

          {!cargandoLedger && ledgerGlobal.length === 0 && (
            <div style={{ textAlign: 'center', padding: 24, fontSize: 12, color: 'var(--color-secondary-ink)' }}>
              No hay movimientos recientes en esta categoría.
            </div>
          )}

          {!cargandoLedger && ledgerGlobal.map((tx, idx, arr) => {
            const esCredito = tx.cantidad > 0
            const esBanca = tx.user_id === BANCA_ID || tx.user_nombre === 'BANCA SISTEMA'
            return (
              <div
                key={tx.id || idx}
                style={{
                  padding: '11px 18px',
                  borderBottom: idx < arr.length - 1 ? '1px solid var(--color-separator)' : 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 12,
                  transition: 'background-color 0.15s ease'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                  <span style={{ fontSize: 18 }}>{tx.user_avatar || (esBanca ? '🏛️' : '🧑‍🎓')}</span>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span>{tx.user_nombre}</span>
                      <span style={{
                        fontSize: 10,
                        fontWeight: 800,
                        padding: '1px 6px',
                        borderRadius: 4,
                        backgroundColor: 'var(--color-fill-secondary)',
                        color: 'var(--color-secondary-ink)',
                        textTransform: 'uppercase'
                      }}>
                        {tx.tipo?.replace('_', ' ')}
                      </span>
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--color-secondary-ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 420 }}>
                      {tx.motivo}
                    </div>
                  </div>
                </div>

                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{
                    fontSize: 14,
                    fontWeight: 900,
                    color: esCredito ? '#34C759' : '#EF4444'
                  }}>
                    {esCredito ? `+${tx.cantidad}` : tx.cantidad} {tx.moneda === 'monedas_yoshi' ? '🪙' : 'SE 💶'}
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--color-tertiary-ink)' }}>
                    {new Date(tx.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </section>

      {/* 6. INTERRUPTORES DE EMERGENCIA */}
      <section className="card">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <AlertCircle size={18} color="#FF9500" />
          <h3 className="apple-headline" style={{ fontSize: 16 }}>
            Interruptor de Emergencia Escolar
          </h3>
        </div>
        <p className="apple-caption" style={{ marginBottom: 14 }}>
          Pausa temporalmente las salidas de StevenEuros ante mantenimiento o conductas sospechosas.
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

      {/* 7. GESTOR DE AJUSTES CONTABLES DE ALUMNOS (CONTRA LA BANCA) */}
      <section className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{
          padding: '16px 20px',
          borderBottom: '1px solid var(--color-separator)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 10
        }}>
          <div>
            <h3 className="apple-headline" style={{ fontSize: 16 }}>
              Ajustes Contables Oficiales por Estudiante
            </h3>
            <p className="apple-caption" style={{ marginTop: 2 }}>
              Partida doble contra la Banca. Límite máximo: ±50 SE por operación.
            </p>
          </div>

          <div style={{ position: 'relative', width: 230 }}>
            <input
              type="text"
              className="apple-input"
              placeholder="Buscar estudiante..."
              value={busquedaAlumno}
              onChange={(e) => setBusquedaAlumno(e.target.value)}
              style={{ width: '100%', paddingLeft: 30, fontSize: 12, height: 34 }}
            />
            <Search size={14} style={{ position: 'absolute', left: 9, top: 10, color: 'var(--color-secondary-ink)' }} />
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
                    padding: '12px 20px',
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

      {/* 8. GESTIÓN Y AUDITORÍA DE PRECIOS DE TIENDA */}
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
                    <tr key={item.id} style={{ borderBottom: '1px solid var(--color-separator)' }}>
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

      {/* ─── MODALES DE INTERVENCIÓN Y AUDITORÍA ─── */}

      {/* MODAL 1: INTERVENCIÓN DE FONDOS DE LA BANCA */}
      {modalBancaIntervencion && (
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
            backgroundColor: 'var(--color-surface, #1C1C1E)',
            borderRadius: 20,
            border: '1px solid var(--color-separator)',
            boxShadow: '0 24px 48px rgba(0,0,0,0.7)',
            padding: 22,
            color: 'var(--color-ink)'
          }}>
            <h3 style={{ fontSize: 17, fontWeight: 800, margin: '0 0 8px 0' }}>
              Intervención de Liquidez: Banca Central
            </h3>
            <p style={{ fontSize: 12, color: 'var(--color-secondary-ink)', marginBottom: 14 }}>
              Inyecta fondos de respaldo o drena excedentes directamente del banco del aula.
            </p>

            <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
              <button
                type="button"
                onClick={() => setModalBancaIntervencion(prev => ({ ...prev, tipo: 'inyeccion' }))}
                style={{
                  flex: 1,
                  padding: '8px',
                  borderRadius: 10,
                  border: modalBancaIntervencion.tipo === 'inyeccion' ? '1.5px solid #34C759' : '1px solid var(--color-separator)',
                  backgroundColor: modalBancaIntervencion.tipo === 'inyeccion' ? 'rgba(52, 199, 89, 0.15)' : 'var(--color-fill-secondary)',
                  color: modalBancaIntervencion.tipo === 'inyeccion' ? '#34C759' : 'var(--color-ink)',
                  fontWeight: 800,
                  fontSize: 12,
                  cursor: 'pointer'
                }}
              >
                Inyectar Fondos (+)
              </button>
              <button
                type="button"
                onClick={() => setModalBancaIntervencion(prev => ({ ...prev, tipo: 'extraccion' }))}
                style={{
                  flex: 1,
                  padding: '8px',
                  borderRadius: 10,
                  border: modalBancaIntervencion.tipo === 'extraccion' ? '1.5px solid #EF4444' : '1px solid var(--color-separator)',
                  backgroundColor: modalBancaIntervencion.tipo === 'extraccion' ? 'rgba(239, 68, 68, 0.15)' : 'var(--color-fill-secondary)',
                  color: modalBancaIntervencion.tipo === 'extraccion' ? '#EF4444' : 'var(--color-ink)',
                  fontWeight: 800,
                  fontSize: 12,
                  cursor: 'pointer'
                }}
              >
                Extraer Fondos (-)
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 16 }}>
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, marginBottom: 4 }}>
                  Cantidad (StevenEuros)
                </label>
                <input
                  type="number"
                  min="1"
                  max="10000"
                  className="apple-input"
                  value={modalBancaIntervencion.cantidad}
                  onChange={(e) => setModalBancaIntervencion(prev => ({ ...prev, cantidad: e.target.value }))}
                  style={{ width: '100%', fontSize: 15, fontWeight: 800 }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, marginBottom: 4 }}>
                  Motivo oficial para auditoría en Ledger
                </label>
                <input
                  type="text"
                  placeholder="Ej: Inyección de liquidez para torneo / Recalibración"
                  className="apple-input"
                  value={modalBancaIntervencion.motivo}
                  onChange={(e) => setModalBancaIntervencion(prev => ({ ...prev, motivo: e.target.value }))}
                  style={{ width: '100%', fontSize: 13 }}
                />
              </div>
            </div>

            {errorBanca && (
              <div style={{ padding: '8px 12px', borderRadius: 8, backgroundColor: 'rgba(239, 68, 68, 0.15)', color: '#EF4444', fontSize: 12, marginBottom: 12 }}>
                {errorBanca}
              </div>
            )}

            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setModalBancaIntervencion(null)}
                className="btn-secondary"
                disabled={enviandoBanca}
                style={{ padding: '8px 14px', fontSize: 12 }}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmarIntervencionBanca}
                disabled={enviandoBanca}
                className="btn-primary"
                style={{ padding: '8px 18px', fontSize: 12, fontWeight: 800 }}
              >
                {enviandoBanca ? 'Aplicando...' : 'Confirmar en Ledger'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: ESTÍMULO MASIVO PARA EL AULA */}
      {modalEstimuloMasivo && (
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
            backgroundColor: 'var(--color-surface, #1C1C1E)',
            borderRadius: 20,
            border: '1px solid var(--color-separator)',
            boxShadow: '0 24px 48px rgba(0,0,0,0.7)',
            padding: 22,
            color: 'var(--color-ink)'
          }}>
            <h3 style={{ fontSize: 17, fontWeight: 800, margin: '0 0 8px 0' }}>
              Estímulo Masivo para Toda la Clase
            </h3>
            <p style={{ fontSize: 12, color: 'var(--color-secondary-ink)', marginBottom: 14 }}>
              Emite StevenEuros desde la Banca para todos los estudiantes registrados simultáneamente.
            </p>

            <div style={{
              padding: '12px 14px',
              borderRadius: 12,
              backgroundColor: 'var(--color-surface-secondary)',
              fontSize: 12,
              display: 'flex',
              flexDirection: 'column',
              gap: 6,
              marginBottom: 14
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--color-secondary-ink)' }}>Estudiantes receptores:</span>
                <strong>{todosAlumnos.filter(a => a.rol !== 'sistema' && a.id !== '00000000-0000-4000-a000-000000000000').length} alumnos</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--color-secondary-ink)' }}>Costo total a debitar de Banca:</span>
                <strong style={{ color: '#FBBF24' }}>
                  {todosAlumnos.filter(a => a.rol !== 'sistema' && a.id !== '00000000-0000-4000-a000-000000000000').length * (Number(modalEstimuloMasivo.cantidadPorAlumno) || 0)} SE
                </strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--color-secondary-ink)' }}>Saldo Banca resultante:</span>
                <span>
                  {saldoBanca - (todosAlumnos.filter(a => a.rol !== 'sistema' && a.id !== '00000000-0000-4000-a000-000000000000').length * (Number(modalEstimuloMasivo.cantidadPorAlumno) || 0))} SE
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 16 }}>
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, marginBottom: 4 }}>
                  Cantidad por Alumno (1 a 100 SE)
                </label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  className="apple-input"
                  value={modalEstimuloMasivo.cantidadPorAlumno}
                  onChange={(e) => setModalEstimuloMasivo(prev => ({ ...prev, cantidadPorAlumno: e.target.value }))}
                  style={{ width: '100%', fontSize: 15, fontWeight: 800 }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, marginBottom: 4 }}>
                  Motivo de celebración o evento escolar
                </label>
                <input
                  type="text"
                  placeholder="Ej: Bonificación especial viernes / Logro colectivo"
                  className="apple-input"
                  value={modalEstimuloMasivo.motivo}
                  onChange={(e) => setModalEstimuloMasivo(prev => ({ ...prev, motivo: e.target.value }))}
                  style={{ width: '100%', fontSize: 13 }}
                />
              </div>
            </div>

            {errorEstimulo && (
              <div style={{ padding: '8px 12px', borderRadius: 8, backgroundColor: 'rgba(239, 68, 68, 0.15)', color: '#EF4444', fontSize: 12, marginBottom: 12 }}>
                {errorEstimulo}
              </div>
            )}

            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setModalEstimuloMasivo(null)}
                className="btn-secondary"
                disabled={enviandoEstimulo}
                style={{ padding: '8px 14px', fontSize: 12 }}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmarEstimuloMasivo}
                disabled={enviandoEstimulo}
                className="btn-primary"
                style={{ padding: '8px 18px', fontSize: 12, fontWeight: 800, backgroundColor: '#34C759' }}
              >
                {enviandoEstimulo ? 'Emitiendo...' : 'Distribuir Estímulo'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: AJUSTE CONTABLE INDIVIDUAL */}
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
            backgroundColor: 'var(--color-surface, #1C1C1E)',
            borderRadius: 20,
            border: '1px solid var(--color-separator)',
            boxShadow: '0 24px 48px rgba(0,0,0,0.7)',
            padding: 20,
            color: 'var(--color-ink)'
          }}>
            <h3 style={{ fontSize: 17, fontWeight: 800, margin: '0 0 12px 0' }}>
              Confirmar Ajuste Contable contra la Banca
            </h3>

            <div style={{
              padding: '12px 14px',
              borderRadius: 12,
              backgroundColor: 'var(--color-surface-secondary)',
              fontSize: 12,
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
              marginBottom: 14
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--color-secondary-ink)' }}>Alumno receptor:</span>
                <strong>{alumnoAjuste.nombre}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--color-secondary-ink)' }}>Saldo actual del alumno:</span>
                <span>{alumnoAjuste.puntos_total || 0} SE</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--color-secondary-ink)' }}>Saldo tras la acción:</span>
                <strong style={{ color: Number(cantidadAjuste) >= 0 ? '#34C759' : '#EF4444' }}>
                  {Math.max(0, (alumnoAjuste.puntos_total || 0) + Number(cantidadAjuste))} SE
                </strong>
              </div>
              <div style={{ height: 1, backgroundColor: 'var(--color-separator)', margin: '2px 0' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--color-secondary-ink)' }}>Contrapartida (Banca):</span>
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
                  className="apple-input"
                  value={cantidadAjuste}
                  onChange={(e) => setCantidadAjuste(Number(e.target.value) || 0)}
                  style={{ width: '100%', fontSize: 14, fontWeight: 800 }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, marginBottom: 4 }}>
                  Motivo obligatorio de auditoría (mínimo 4 caracteres)
                </label>
                <input
                  type="text"
                  placeholder="Ej: Corrección práctica, premio torneo..."
                  className="apple-input"
                  value={motivoAjuste}
                  onChange={(e) => setMotivoAjuste(e.target.value)}
                  style={{ width: '100%', fontSize: 13 }}
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

      {/* MODAL 4: EDICIÓN DE PRECIO DE TIENDA */}
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
            backgroundColor: 'var(--color-surface, #1C1C1E)',
            borderRadius: 20,
            border: '1px solid var(--color-separator)',
            boxShadow: '0 24px 48px rgba(0,0,0,0.7)',
            padding: 20,
            color: 'var(--color-ink)'
          }}>
            <h3 style={{ fontSize: 17, fontWeight: 800, margin: '0 0 12px 0' }}>
              Editar Precio Oficial: {itemEditando.titulo}
            </h3>

            <div style={{
              padding: '12px 14px',
              borderRadius: 12,
              backgroundColor: 'var(--color-surface-secondary)',
              fontSize: 12,
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
              marginBottom: 14
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--color-secondary-ink)' }}>Tramo actual:</span>
                <span style={{ textTransform: 'uppercase', fontWeight: 800 }}>{itemEditando.tramo}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--color-secondary-ink)' }}>Precio vigente:</span>
                <strong>{itemEditando.precio} SE</strong>
              </div>
            </div>

            <div style={{ marginBottom: 12 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 4 }}>
                Nuevo Precio (StevenEuros):
              </label>
              <input
                type="number"
                min="1"
                max="5000"
                className="apple-input"
                value={nuevoPrecioEdit}
                onChange={e => setNuevoPrecioEdit(e.target.value)}
                style={{ width: '100%', fontSize: 14, fontWeight: 800 }}
              />
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 4 }}>
                Motivo del cambio (obligatorio):
              </label>
              <input
                type="text"
                placeholder="Ej. Rebalanceo por inflación / Evento"
                className="apple-input"
                value={motivoPrecioEdit}
                onChange={e => setMotivoPrecioEdit(e.target.value)}
                style={{ width: '100%', fontSize: 13 }}
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
                className="btn-secondary"
                style={{ flex: 1, padding: '10px 14px', fontSize: 13 }}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleGuardarPrecio}
                disabled={guardandoPrecio}
                className="btn-primary"
                style={{ flex: 1, padding: '10px 14px', fontSize: 13, fontWeight: 800 }}
              >
                {guardandoPrecio ? 'Guardando...' : 'Guardar Precio'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 5: RESULTADO DE AUDITORÍA DE INVARIANTE */}
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
            backgroundColor: 'var(--color-surface, #1C1C1E)',
            borderRadius: 20,
            border: '1px solid var(--color-separator)',
            boxShadow: '0 24px 48px rgba(0,0,0,0.7)',
            padding: 20,
            color: 'var(--color-ink)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              {resultadoAuditoria.invariante_valida ? (
                <CheckCircle2 size={24} color="#30D158" />
              ) : (
                <AlertTriangle size={24} color="#EF4444" />
              )}
              <h3 style={{ fontSize: 17, fontWeight: 800, margin: 0 }}>
                {resultadoAuditoria.invariante_valida ? 'Invariante Contable Verificada' : 'Discrepancias Encontradas'}
              </h3>
            </div>

            <div style={{ fontSize: 12, color: 'var(--color-secondary-ink)', lineHeight: 1.6, marginBottom: 14 }}>
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

      {/* MODAL 6: HISTORIAL CONTABLE DE ALUMNO Y REVERSIÓN */}
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
            backgroundColor: 'var(--color-surface, #1C1C1E)',
            borderRadius: 20,
            border: '1px solid var(--color-separator)',
            boxShadow: '0 24px 48px rgba(0,0,0,0.7)',
            padding: 20,
            color: 'var(--color-ink)',
            maxHeight: '85vh',
            display: 'flex',
            flexDirection: 'column'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div>
                <h3 style={{ fontSize: 16, fontWeight: 800, margin: 0 }}>
                  Ledger Individual de {alumnoHistorial.nombre}
                </h3>
                <div style={{ fontSize: 11, color: 'var(--color-secondary-ink)' }}>
                  Historial inmutable con opción de reversión por contrapartida
                </div>
              </div>
              <button
                type="button"
                onClick={() => setAlumnoHistorial(null)}
                style={{ background: 'none', border: 'none', color: 'var(--color-ink)', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8, paddingRight: 4 }}>
              {cargandoHistorial && (
                <div style={{ textAlign: 'center', padding: 24, fontSize: 12, color: 'var(--color-secondary-ink)' }}>
                  Cargando ledger...
                </div>
              )}
              {!cargandoHistorial && historialCargado.length === 0 && (
                <div style={{ textAlign: 'center', padding: 24, fontSize: 12, color: 'var(--color-secondary-ink)' }}>
                  No hay movimientos registrados para este usuario.
                </div>
              )}
              {historialCargado.map((item) => (
                <div
                  key={item.id}
                  style={{
                    padding: '10px 12px',
                    borderRadius: 10,
                    backgroundColor: 'var(--color-surface-secondary)',
                    border: '1px solid var(--color-separator)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 10
                  }}
                >
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 700 }}>{item.motivo}</div>
                    <div style={{ fontSize: 10, color: 'var(--color-secondary-ink)', marginTop: 2 }}>
                      {new Date(item.created_at).toLocaleString('es-ES', { timeZone: 'Europe/Madrid' })} · Saldo: {item.saldo_posterior}
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{
                      fontWeight: 800,
                      fontSize: 13,
                      color: item.cantidad >= 0 ? '#30D158' : '#EF4444'
                    }}>
                      {item.cantidad >= 0 ? `+${item.cantidad}` : item.cantidad} {item.moneda === 'steveneuros' ? 'SE 💶' : '🪙'}
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
