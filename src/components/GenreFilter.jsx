import { X } from 'lucide-react'
import { GENRES } from '../constants/index.js'

// Tek tip filtre çipi — tür ve yıl gruplarında ortak görünüm (tema değişkenleriyle).
function chipStyle(active) {
  return {
    background: active ? 'rgba(var(--accent-rgb),0.12)' : 'rgba(255,255,255,0.035)',
    border: `1px solid ${active ? 'rgba(var(--accent-rgb),0.45)' : 'var(--border)'}`,
    borderRadius: 16, padding: '3.5px 11px',
    color: active ? 'var(--accent)' : 'var(--text-muted)',
    fontSize: 11, fontWeight: active ? 700 : 400,
    cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all 0.13s',
    fontFamily: 'inherit', flexShrink: 0,
  }
}

export default function GenreFilter({ selectedGenres, onToggle, onClear, showClear, yearBuckets = [], selectedYears = [], onYearToggle, onYearClear }) {
  return (
    <div style={{
      padding: '9px 20px',
      display: 'flex', gap: 5, overflowX: 'auto', alignItems: 'center',
      borderBottom: '1px solid rgba(255,255,255,0.038)',
    }}>
      {/* Yıl filtresi — çoklu seçimli grup çipleri (native select yerine, tema uyumlu) */}
      {onYearToggle && yearBuckets.length > 0 && (
        <>
          <span style={{
            color: 'var(--text-faint)', fontSize: 9.5, fontWeight: 600,
            letterSpacing: '0.08em', flexShrink: 0,
          }}>YIL</span>
          <button
            onClick={onYearClear}
            aria-pressed={selectedYears.length === 0}
            style={chipStyle(selectedYears.length === 0)}
          >Tümü</button>
          {yearBuckets.map(b => {
            const active = selectedYears.includes(b.key)
            return (
              <button
                key={b.key}
                onClick={() => onYearToggle(b.key)}
                aria-pressed={active}
                style={chipStyle(active)}
              >{b.label}</button>
            )
          })}
          {/* Tür/Yıl ayıracı */}
          <span style={{
            width: 1, alignSelf: 'stretch', margin: '1px 4px',
            background: 'rgba(255,255,255,0.08)', flexShrink: 0,
          }} aria-hidden="true" />
        </>
      )}

      <span style={{
        color: 'var(--text-faint)', fontSize: 9.5, fontWeight: 600,
        letterSpacing: '0.08em', flexShrink: 0, marginRight: 2,
      }}>TÜR</span>

      {GENRES.map(g => {
        const active = selectedGenres.includes(g)
        return (
          <button
            key={g}
            onClick={() => onToggle(g)}
            style={chipStyle(active)}
          >{g}</button>
        )
      })}

      {showClear && (
        <button
          onClick={onClear}
          style={{
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 16, padding: '3.5px 10px',
            color: 'var(--text-faint)',
            fontSize: 10, cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 3,
            flexShrink: 0, fontFamily: 'inherit',
          }}
        >
          <X size={10} /> Temizle
        </button>
      )}
    </div>
  )
}
