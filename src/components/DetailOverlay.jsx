import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { X, ChevronLeft } from 'lucide-react'
import DetailBody from './DetailBody.jsx'
import { useDevice } from '../contexts/DeviceContext.jsx'
import { useHistoryLayer } from '../hooks/useHistoryLayer.js'

// Yapım detayı penceresi — vitrin ("Detaya bak"), raf kartı ve kart içindeki
// mini kartlar açar. İçerik açık kartla birebir aynıdır (DetailBody).
//
// Pencere içinden bir benzer yapıma/filmografi öğesine tıklamak İKİNCİ bir
// pencere açmaz; içerik değişir ve "Geri" ile önceki yapıma dönülür. Üst üste
// portallar ESC'de hepsini birden kapatıyor, kaydırma kilidini erken bırakıyordu.
export default function DetailOverlay({ item, onClose }) {
  const [yigin, setYigin] = useState([item])
  const kaydirmaRef = useRef(null)
  const guncel = yigin[yigin.length - 1]
  const onceki = yigin.length > 1 ? yigin[yigin.length - 2] : null

  // Telefonda pencere alt sayfa olarak çizilir (CSS: [data-ff="phone"]) ve geri
  // tuşu onu kapatır. İç yığın (benzer yapıma geçiş) "Geri" düğmesinde kalır;
  // geri tuşu her zaman pencerenin tamamını kapatır — öngörülebilir tek kural.
  const { isPhone } = useDevice()
  useHistoryLayer(isPhone, onClose)

  // Body scroll kilidi — önceki değere döner (fragman oynatıcısıyla aynı desen)
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [])

  // ESC ile kapat
  useEffect(() => {
    const h = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', h)
    return () => document.removeEventListener('keydown', h)
  }, [onClose])

  // Yapım değişince yeni içeriği baştan göster
  useEffect(() => { kaydirmaRef.current?.scrollTo?.(0, 0) }, [yigin.length])

  const overlay = (
    <div className="modal-scrim modal-scrim-top" onClick={onClose} ref={kaydirmaRef}>
      <div
        className="modal modal-detail"
        role="dialog" aria-modal="true" aria-label={guncel?.title || 'Detay'}
        onClick={e => e.stopPropagation()}
      >
        <button className="icon-btn modal-close" onClick={onClose} aria-label="Kapat">
          <X size={18} aria-hidden="true" />
        </button>

        {onceki && (
          <button
            className="btn btn-quiet btn-compact modal-back"
            onClick={() => setYigin(s => s.slice(0, -1))}
            aria-label={`Geri: ${onceki.title}`}
          >
            <ChevronLeft size={16} aria-hidden="true" />
            <span>{onceki.title}</span>
          </button>
        )}

        {/* key: yapım değişince durum sıfırlanır, eski yapımın verisi sızmaz */}
        <DetailBody
          key={yigin.length}
          item={guncel}
          variant="overlay"
          onMiniClick={(mini) => setYigin(s => [...s, mini])}
        />
      </div>
    </div>
  )

  return createPortal(overlay, document.body)
}
