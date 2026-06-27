import { X } from 'lucide-react'
import { GENRES } from '../constants/index.js'

export default function GenreFilter({ selectedGenres, onToggle, onClear, showClear, years = [], selectedYear = 'Tümü', onYearChange }) {
  const yearActive = selectedYear !== 'Tümü'
  return (
    <div style={{
      padding: '9px 20px',
      display: 'flex', gap: 5, overflowX: 'auto', alignItems: 'center',
      borderBottom: '1px solid rgba(255,255,255,0.038)',
    }}>
      {/* Yıl filtresi — satır kaysa da sabit kalır (flexShrink:0) */}
      {onYearChange && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0, marginRight: 6 }}>
          <span style={{
            color: 'var(--text-faint)', fontSize: 9.5, fontWeight: 600,
            letterSpacing: '0.08em',
          }}>YIL</span>
          <select
            value={selectedYear}
            onChange={(e) => onYearChange(e.target.value)}
            aria-label="Yıla göre filtrele"
            style={{
              background: yearActive ? 'rgba(var(--accent-rgb),0.12)' : 'rgba(255,255,255,0.035)',
              border: `1px solid ${yearActive ? 'rgba(var(--accent-rgb),0.45)' : 'var(--border)'}`,
              borderRadius: 16, padding: '3.5px 9px',
              color: yearActive ? 'var(--accent)' : 'var(--text-muted)',
              fontSize: 11, fontWeight: yearActive ? 700 : 400,
              cursor: 'pointer', fontFamily: 'inherit', outline: 'none',
            }}
          >
            <option value="Tümü">Tümü</option>
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
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
            style={{
              background: active
                ? 'rgba(var(--accent-rgb),0.12)'
                : 'rgba(255,255,255,0.035)',
              border: `1px solid ${active
                ? 'rgba(var(--accent-rgb),0.45)'
                : 'var(--border)'}`,
              borderRadius: 16, padding: '3.5px 11px',
              color: active ? 'var(--accent)' : 'var(--text-muted)',
              fontSize: 11, fontWeight: active ? 700 : 400,
              cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all 0.13s',
              fontFamily: 'inherit',
            }}
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
