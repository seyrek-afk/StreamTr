import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { useHistoryLayer } from '../../hooks/useHistoryLayer.js'

// Alt sayfa (bottom sheet) — telefon kabuğunun tek katman dili.
//
// Masaüstündeki ortalanmış modal telefonda iki şekilde yanlış: başparmak
// ekranın üstüne uzanamaz ve "pencere" metaforu dokunmatikte yok. Alttan
// gelen sayfa kapatma kontrolünü ve içeriğin başını başparmak bölgesine koyar.
//
// Geri tuşu kapatır (useHistoryLayer), scrim dokunuşu kapatır, ESC kapatır
// (klavyeli tablet). Gövde kendi içinde kayar; overscroll-behavior arkadaki
// sayfanın birlikte kaymasını engeller.
export default function Sheet({ open, onClose, title, children, footer, full = false }) {
  useHistoryLayer(open, onClose)

  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const h = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', h)
    return () => {
      document.body.style.overflow = prev
      document.removeEventListener('keydown', h)
    }
  }, [open, onClose])

  if (!open) return null

  return createPortal(
    <div className="sheet-scrim" onClick={onClose}>
      <div
        className={`sheet${full ? ' sheet-full' : ''}`}
        role="dialog" aria-modal="true" aria-label={title}
        onClick={e => e.stopPropagation()}
      >
        <div className="sheet-grip" aria-hidden="true" />
        <div className="sheet-head">
          <h2 className="sheet-title">{title}</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Kapat">
            <X size={18} aria-hidden="true" />
          </button>
        </div>
        <div className="sheet-body">{children}</div>
        {footer && <div className="sheet-foot">{footer}</div>}
      </div>
    </div>,
    document.body
  )
}
