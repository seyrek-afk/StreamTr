import { chipStyle } from './GenreFilter.jsx'

// Dizi/Film içerik-tipi filtresi — GenreFilter çipleriyle aynı görünüm (tema uyumlu).
// value: 'all' | 'dizi' | 'film'
const OPTIONS = [
  { value: 'all',  label: 'Tümü'    },
  { value: 'dizi', label: '📺 Dizi' },
  { value: 'film', label: '🎬 Film' },
]

export default function MediaTypeFilter({ value, onChange }) {
  return (
    <>
      <span style={{
        color: 'var(--text-faint)', fontSize: 9.5, fontWeight: 600,
        letterSpacing: '0.08em', flexShrink: 0,
      }}>İÇERİK</span>
      {OPTIONS.map(opt => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          aria-pressed={value === opt.value}
          style={chipStyle(value === opt.value)}
        >{opt.label}</button>
      ))}
    </>
  )
}
