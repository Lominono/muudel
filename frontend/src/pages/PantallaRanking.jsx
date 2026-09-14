import { useState, useEffect } from 'react'
import { supabase } from '../utils/supabase'
import { TabBar } from '../components/TabBar'

export function PantallaRanking() {
  const [lista, setLista] = useState([])
  const [filtro, setFiltro] = useState('total')

  useEffect(() => {
    const cargar = async () => {
      const { data } = await supabase.from('profiles').select('*').order('puntos_total', { ascending: false })
      setLista(data || [])
    }
    cargar()
  }, [])

  return (
    <div style={{ maxWidth: 500, margin: '0 auto', padding: 24, paddingBottom: 80 }}>
      <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 16 }}>🏆 Ranking</h1>
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {['total', 'semana'].map(f => (
          <button key={f} onClick={() => setFiltro(f)} style={{
            padding: '10px 16px',
            borderRadius: 10,
            border: 'none',
            background: filtro === f ? '#0A84FF' : 'var(--color-surface)',
            color: filtro === f ? '#FFF' : '#000',
            fontWeight: 600,
            fontSize: 15,
            cursor: 'pointer',
            minHeight: 44,
          }}>
            {f === 'total' ? 'Total' : 'Semana'}
          </button>
        ))}
      </div>
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {lista.map((p, i) => (
          <div key={p.id} style={{
            display: 'flex',
            alignItems: 'center',
            padding: '14px 16px',
            borderBottom: i < lista.length - 1 ? '1px solid rgba(0,0,0,0.06)' : 'none',
            background: i < 3 ? 'rgba(255,215,0,0.06)' : 'transparent',
          }}>
            <span style={{ fontSize: 24, width: 40 }}>{i < 3 ? ['🥇','🥈','🥉'][i] : i + 1}</span>
            <span style={{ fontSize: 28, marginRight: 12 }}>{p.avatar_emoji}</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, fontSize: 16 }}>{p.nombre}</div>
              <div style={{ fontSize: 12, color: '#98989D' }}>Racha: {p.racha_actual}</div>
            </div>
            <div style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: 16 }}>{p.puntos_total}pts</div>
          </div>
        ))}
      </div>
      <TabBar />
    </div>
  )
}
