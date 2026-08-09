import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Palette, X, Check, ChevronDown } from 'lucide-react'
import { useTheme } from '../contexts/ThemeContext.jsx'

// Tema kartı — temanın kendi renklerinde küçük bir sahne. Emoji yok: önizlemenin
// kendisi zaten temanın ne olduğunu emojiden çok daha iyi anlatıyor.
function ThemeCard({ theme, isActive, onSelect }) {
  const [c1, c2, c3] = theme.preview

  return (
    <button
      className={`theme-card${isActive ? ' theme-card-on' : ''}`}
      onClick={() => onSelect(theme.id)}
      aria-pressed={isActive}
      style={{ '--tc-accent': c2 }}
    >
      {/* Önizlemedeki renkler bilinçli olarak tokenlardan DEĞİL, temanın kendi
          `preview` üçlüsünden gelir: burada gösterilen şey aktif tema değil,
          seçilebilecek başka bir tema. */}
      <span className="theme-preview" style={{ background: c1 }}>
        <span className="theme-mock" style={{
          background: theme.id === 'glass' ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.06)',
          borderColor: theme.css['--border'],
        }}>
          <i style={{ background: c1, opacity: 0.6, width: 18, height: 18, borderRadius: 3 }} />
          <i style={{ background: 'rgba(255,255,255,0.28)', height: 4, width: '46%' }} />
          <i style={{ background: c2, height: 4, width: '22%' }} />
        </span>
        <span className="theme-mock theme-mock-2">
          <i style={{ background: 'rgba(255,255,255,0.16)', height: 3, width: '55%' }} />
          <i style={{ background: c3, height: 3, width: '20%' }} />
        </span>
        {isActive && (
          <span className="theme-check" style={{ background: c2 }}>
            <Check size={12} color="#fff" strokeWidth={3} aria-hidden="true" />
          </span>
        )}
      </span>

      <span className="theme-name">{theme.label}</span>
      <span className="theme-desc">{theme.desc}</span>
    </button>
  )
}

// ── Ana ThemePicker ────────────────────────────────────────────────────────────
export default function ThemePicker() {
  const { themeId, setThemeId, themes } = useTheme()
  const [open, setOpen] = useState(false)

  // ESC ile kapanma her modalda aynı davranmalı (AuthModal ve DetailOverlay'de
  // zaten vardı, tema seçicide eksikti).
  useEffect(() => {
    if (!open) return
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open])

  return (
    <>
      {/* Tema kontrolü artık ortak kontrol dilini kullanıyor: aynı yükseklik,
          aynı yarıçap, aynı odak halkası. Eskiden 999px hap biçimindeydi ve
          başlıktaki tek yabancı biçimdi. */}
      <button
        className="ctl"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        title="Görünüm temasını değiştir"
      >
        <Palette size={15} style={{ color: 'var(--accent-ink)' }} aria-hidden="true" />
        <span className="hide-narrow">Tema</span>
        <ChevronDown size={14} className="dd-chevron" aria-hidden="true" />
      </button>

      {/* Modal portal ile body'e taşınır: yapışkan başlık kendi yığın bağlamını
          kurduğu için position:fixed'i kendine bağlar, modal ekranın üstüne taşardı. */}
      {open && createPortal((
        <div className="modal-scrim" onClick={() => setOpen(false)}>
          <div
            className="modal"
            role="dialog" aria-modal="true" aria-label="Tema seç"
            onClick={e => e.stopPropagation()}
          >
            <div className="modal-head">
              <div>
                <h2 className="modal-title">
                  <Palette size={18} style={{ color: 'var(--accent-ink)' }} aria-hidden="true" /> Tema seç
                </h2>
                <p className="modal-sub">Seçtiğin tema hemen uygulanır ve hatırlanır.</p>
              </div>
              <button className="icon-btn" onClick={() => setOpen(false)} aria-label="Kapat">
                <X size={18} aria-hidden="true" />
              </button>
            </div>

            <div className="theme-grid">
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
