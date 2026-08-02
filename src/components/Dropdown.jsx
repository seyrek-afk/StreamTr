import { useState, useRef, useEffect } from 'react'
import { ChevronDown, Check } from 'lucide-react'

// Ortak açılır menü — filtre çubuğundaki tüm kontroller (tür, yıl, ülke,
// platform, sıralama) bunu kullanır.
//
// Neden çip satırı yerine açılır menü? Filtreler büyüdükçe (12 tür + 6 yıl +
// 31 ülke + 6 platform) çip satırları başlığı üç sıraya çıkarıp içeriği aşağı
// itiyordu. Menüye toplamak yatay kaydırmayı bitirir, başlığı sabit yükseklikte
// tutar ve seçili değeri tek bakışta okunur kılar.
//
// multi=true → çoklu seçim (tür, yıl). Menü seçimde kapanmaz.
export default function Dropdown({
  label, value, options, onChange, multi = false, align = 'left', minWidth = 150,
}) {
  const [open, setOpen] = useState(false)
  const wrapRef = useRef(null)

  useEffect(() => {
    if (!open) return
    const onDoc = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false)
    }
    const onEsc = (e) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onEsc)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('keydown', onEsc)
    }
  }, [open])

  const selected = multi ? (value || []) : value
  const active = multi ? selected.length > 0 : Boolean(value)

  // Tetikte gösterilecek özet: tek seçimde etiketin kendisi, çoklu seçimde
  // "Tür · 2" gibi sayı — uzun listeyi butona sığdırmaya çalışmak okunmaz olurdu.
  const summary = multi
    ? (selected.length === 0 ? label : `${label} · ${selected.length}`)
    : (value ? (options.find(o => o.value === value)?.label || label) : label)

  const toggle = (v) => {
    if (!multi) {
      onChange(v === value ? null : v)
      setOpen(false)
      return
    }
    const set = new Set(selected)
    if (set.has(v)) set.delete(v); else set.add(v)
    onChange([...set])
  }

  return (
    <div className="dd-wrap" ref={wrapRef}>
      <button
        className={`dd-trigger${active ? ' dd-active' : ''}`}
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
        aria-haspopup="listbox"
        style={{ minWidth }}
      >
        <span className="dd-summary">{summary}</span>
        <ChevronDown size={11} className="dd-chevron" style={{ transform: open ? 'rotate(180deg)' : 'none' }} />
      </button>

      {open && (
        <div className="dd-menu" role="listbox" style={{ [align]: 0 }}>
          {active && (
            <button className="dd-clear" onClick={() => { onChange(multi ? [] : null); if (!multi) setOpen(false) }}>
              Temizle
            </button>
          )}
          {options.map(o => {
            const isSel = multi ? selected.includes(o.value) : value === o.value
            return (
              <button
                key={o.value}
                role="option"
                aria-selected={isSel}
                className={`dd-option${isSel ? ' dd-option-sel' : ''}`}
                onClick={() => toggle(o.value)}
              >
                <span>{o.label}</span>
                {isSel && <Check size={11} />}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
