import { useState, useRef, useEffect, useLayoutEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { ChevronDown, Check } from 'lucide-react'

// Ortak açılır menü — filtre çubuğundaki tüm kontroller (tür, yıl, ülke,
// platform, sıralama) bunu kullanır.
//
// Neden çip satırı yerine açılır menü? Filtreler büyüdükçe (12 tür + 6 yıl +
// 31 ülke + 6 platform) çip satırları başlığı üç sıraya çıkarıp içeriği aşağı
// itiyordu. Menüye toplamak yatay kaydırmayı bitirir, başlığı sabit yükseklikte
// tutar ve seçili değeri tek bakışta okunur kılar.
//
// NEDEN PORTAL (üretimde yakalandı): menü `position:absolute` iken KIRPILIYORDU.
// Ülke menüsünün iki kırpma atası vardı — mercek segmenti (köşeleri yuvarlamak
// için `overflow:hidden`) ve dar ekranda yatay kaydırılan gezinme satırı. Menü
// açılıyor ama görünmüyordu; kullanıcıya "hiçbir şey listelemiyor" gibi görünür.
// `overflow` değerlerini gevşetmek segment görünümünü ve dar ekran kaydırmasını
// bozardı; doğru çözüm menüyü DOM ağacından çıkarmak. Portal + `position:fixed`
// ile menü artık HİÇBİR atanın overflow'una tabi değil — bu kırpma sınıfı hata
// bir daha üretilemez. (Görsel dil v2'de filtre rayı yeniden düzenlendi ama
// kırpan atalar hâlâ var: mercek ve dar ekran filtre şeridi.)
//
// multi=true → çoklu seçim (tür, yıl). Menü seçimde kapanmaz.

const GAP = 6        // tetik ile menü arası
const EDGE = 8       // viewport kenarına asgari pay
const MAX_H = 320
const MIN_H = 140    // bunun altına düşecekse yukarı çevir

export default function Dropdown({
  label, value, options, onChange, multi = false, align = 'left', minWidth = 150,
}) {
  const [open, setOpen] = useState(false)
  const [pos, setPos]   = useState(null)
  const wrapRef = useRef(null)
  const menuRef = useRef(null)

  // Menüyü tetiğe göre viewport koordinatlarında konumlandırır.
  // Aşağıda yer yoksa yukarı çevirir, kenarları taşırmaz — 31 ülkelik uzun
  // liste dar ekranda ve sayfa sonunda da tamamen görünür kalsın.
  const place = useCallback(() => {
    const el = wrapRef.current
    if (!el) return
    const r  = el.getBoundingClientRect()
    const vw = window.innerWidth
    const vh = window.innerHeight

    const below = vh - r.bottom - GAP - EDGE
    const above = r.top - GAP - EDGE
    const flip  = below < MIN_H && above > below
    const maxHeight = Math.max(MIN_H, Math.min(MAX_H, flip ? above : below))

    const next = { minWidth: Math.max(r.width, minWidth), maxHeight }
    if (flip) next.bottom = vh - r.top + GAP
    else      next.top    = r.bottom + GAP

    if (align === 'right') {
      const right = Math.max(EDGE, vw - r.right)
      next.right = right
      next.maxWidth = vw - right - EDGE
    } else {
      const left = Math.min(Math.max(EDGE, r.left), vw - EDGE - next.minWidth)
      next.left = Math.max(EDGE, left)
      next.maxWidth = vw - next.left - EDGE
    }
    // Köken farkındalık: menü tetiğinin bulunduğu köşeden büyür. Ortadan
    // ölçeklenen bir menü hangi düğmeye ait olduğunu anlatmaz.
    next.transformOrigin = `${flip ? 'bottom' : 'top'} ${align === 'right' ? 'right' : 'left'}`
    setPos(next)
  }, [align, minWidth])

  // Konumu boyamadan önce hesapla — menü yanlış yerde bir kare görünmesin.
  useLayoutEffect(() => { if (open) place() }, [open, place])

  useEffect(() => {
    if (!open) return
    // Dış tıklama menüyü de hesaba katmalı: portal sonrası menü artık
    // wrapRef'in içinde DEĞİL, ayrıca kontrol edilir.
    const onDoc = (e) => {
      if (wrapRef.current?.contains(e.target)) return
      if (menuRef.current?.contains(e.target)) return
      setOpen(false)
    }
    const onEsc = (e) => { if (e.key === 'Escape') setOpen(false) }
    // Sayfa kayarsa menü tetikten kopmasın (capture: iç kaydırıcılar da yakalanır).
    const onScroll = () => place()
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onEsc)
    window.addEventListener('scroll', onScroll, true)
    window.addEventListener('resize', onScroll)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('keydown', onEsc)
      window.removeEventListener('scroll', onScroll, true)
      window.removeEventListener('resize', onScroll)
    }
  }, [open, place])

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

  const menu = (
    <div ref={menuRef} className="dd-menu" role="listbox" style={pos || { visibility: 'hidden' }}>
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
            {isSel && <Check size={14} aria-hidden="true" />}
          </button>
        )
      })}
    </div>
  )

  return (
    <div className="dd-wrap" ref={wrapRef}>
      <button
        className={`ctl${active ? ' ctl-on' : ''}`}
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
        aria-haspopup="listbox"
        style={{ minWidth }}
      >
        <span className="dd-summary">{summary}</span>
        <ChevronDown size={14} className="dd-chevron" aria-hidden="true" />
      </button>

      {open && typeof document !== 'undefined' && createPortal(menu, document.body)}
    </div>
  )
}
