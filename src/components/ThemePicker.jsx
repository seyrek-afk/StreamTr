import { useState } from 'react'
import { createPortal } from 'react-dom'
import { Palette, X, Check, ChevronDown } from 'lucide-react'
import { useTheme } from '../contexts/ThemeContext.jsx'

// Tema kartı — Pinterest tarzı renkli önizleme
function ThemeCard({ theme, isActive, onSelect }) {
  const [hovered, setHovered] = useState(false)
  const [c1, c2, c3] = theme.preview

  return (
    <button
      onClick={() => onSelect(theme.id)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: 'none', border: 'none', padding: 0,
        cursor: 'pointer', borderRadius: 12, overflow: 'hidden',
        transform: hovered ? 'scale(1.04)' : 'scale(1)',
        transition: 'transform 0.18s, box-shadow 0.18s',
        boxShadow: isActive
          ? `0 0 0 2.5px ${c2}, 0 4px 20px rgba(0,0,0,0.5)`
          : hovered
            ? '0 4px 18px rgba(0,0,0,0.45)'
            : '0 2px 8px rgba(0,0,0,0.3)',
        width: '100%',
      }}
    >
      {/* Renk önizlemesi */}
      <div style={{ height: 80, background: c1, position: 'relative', overflow: 'hidden' }}>
        {/* Dekoratif simüle kart */}
        <div style={{
          position: 'absolute', top: 12, left: 10, right: 10,
          height: 28, borderRadius: 6,
          background: theme.id === 'glass'
            ? 'rgba(255,255,255,0.12)'
            : 'rgba(255,255,255,0.06)',
          backdropFilter: theme.id === 'glass' ? 'blur(6px)' : 'none',
          border: `1px solid ${theme.css['--border']}`,
          display: 'flex', alignItems: 'center', padding: '0 8px', gap: 6,
        }}>
          <div style={{ width: 18, height: 18, borderRadius: 3, background: c1, opacity: 0.6 }} />
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 3 }}>
            <div style={{ height: 4, width: '70%', borderRadius: 2, background: 'rgba(255,255,255,0.25)' }} />
            <div style={{ height: 3, width: '45%', borderRadius: 2, background: c2, opacity: 0.8 }} />
          </div>
        </div>
        {/* İkinci kart */}
        <div style={{
          position: 'absolute', top: 46, left: 10, right: 10,
          height: 22, borderRadius: 6,
          background: theme.id === 'glass'
            ? 'rgba(255,255,255,0.08)'
            : 'rgba(255,255,255,0.04)',
          border: `1px solid rgba(255,255,255,0.06)`,
          display: 'flex', alignItems: 'center', padding: '0 8px', gap: 5,
        }}>
          <div style={{ height: 3, width: '55%', borderRadius: 2, background: 'rgba(255,255,255,0.15)' }} />
          <div style={{ height: 3, width: '20%', borderRadius: 2, background: c3, opacity: 0.9 }} />
        </div>

        {/* Aktif checkmark */}
        {isActive && (
          <div style={{
            position: 'absolute', top: 6, right: 6,
            width: 20, height: 20, borderRadius: '50%',
            background: c2, display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Check size={11} color="#fff" strokeWidth={3} />
          </div>
        )}
      </div>

      {/* Açıklama */}
      <div style={{
        background: isActive ? `${c1}ee` : '#111118',
        padding: '8px 10px',
        display: 'flex', alignItems: 'center', gap: 6,
      }}>
        <span style={{ fontSize: 14 }}>{theme.emoji}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{
            color: isActive ? c2 : 'rgba(255,255,255,0.85)',
            fontSize: 11, fontWeight: 700, margin: 0, lineHeight: 1.2,
          }}>{theme.label}</p>
          <p style={{
            color: 'rgba(255,255,255,0.35)', fontSize: 9.5,
            margin: '2px 0 0', lineHeight: 1.2,
          }}>{theme.desc}</p>
        </div>
      </div>
    </button>
  )
}

// ── Ana ThemePicker ────────────────────────────────────────────────────────────
export default function ThemePicker() {
  const { themeId, setThemeId, theme, themes } = useTheme()
  const [open, setOpen] = useState(false)

  return (
    <>
      {/* Görünüm/tema kontrolü — yuvarlak, nötr; platform filtre düğmelerinden ayrışır */}
      <button
        onClick={() => setOpen(true)}
        title="Görünüm temasını değiştir"
        style={{
          background: 'rgba(255,255,255,0.05)',
          border: '1px solid rgba(255,255,255,0.12)',
          borderRadius: 999, padding: '6px 12px',
          color: 'var(--text-muted)', cursor: 'pointer',
          display: 'inline-flex', alignItems: 'center', gap: 6,
          fontSize: 11, fontWeight: 600, fontFamily: 'inherit',
          transition: 'all 0.15s', whiteSpace: 'nowrap',
        }}
        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.09)'; e.currentTarget.style.color = 'var(--text)' }}
        onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = 'var(--text-muted)' }}
      >
        <Palette size={13} style={{ color: 'var(--accent)' }} />
        <span>Tema</span>
        <ChevronDown size={12} style={{ opacity: 0.5 }} />
      </button>

      {/* Modal Overlay — portal ile body'e taşınır: header'ın backdrop-filter'i
          position:fixed'i kendine bağlamasın (yoksa popup ekranın üstüne taşardı) */}
      {open && createPortal((
        <div
          onClick={() => setOpen(false)}
          style={{
            position: 'fixed', inset: 0, zIndex: 200,
            background: 'rgba(0,0,0,0.72)',
            backdropFilter: 'blur(4px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 20,
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: '#13131f',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 16, padding: '20px 20px 24px',
              width: '100%', maxWidth: 520,
              maxHeight: '90vh', overflowY: 'auto',
            }}
          >
            {/* Başlık */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <div>
                <h2 style={{
                  color: '#fff', fontSize: 15, fontWeight: 700,
                  margin: 0, display: 'flex', alignItems: 'center', gap: 7,
                }}>
                  <Palette size={15} color="var(--accent)" /> Tasarım Teması Seç
                </h2>
                <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 10.5, margin: '3px 0 0' }}>
                  Seçtiğin tema hemen uygulanır ve hatırlanır
                </p>
              </div>
              <button
                onClick={() => setOpen(false)}
                style={{
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 6, padding: '5px 6px',
                  color: 'rgba(255,255,255,0.5)', cursor: 'pointer',
                }}
              >
                <X size={13} />
              </button>
            </div>

            {/* Tema Izgarası — Pinterest stili */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
              gap: 10,
            }}>
              {themes.map(t => (
                <ThemeCard
                  key={t.id}
                  theme={t}
                  isActive={themeId === t.id}
                  onSelect={(id) => { setThemeId(id); setOpen(false) }}
                />
              ))}
            </div>
          </div>
        </div>
      ), document.body)}
    </>
  )
}
