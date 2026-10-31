import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { ArrowLeft } from 'lucide-react'
import { SearchField, SuggestionList } from '../SearchBar.jsx'
import { useHistoryLayer } from '../../hooks/useHistoryLayer.js'

// Tam ekran arama — telefonda arama kutusu başlıkta yaşamaz.
//
// Klavye açıkken ekranın yarısı gider; kutunun altına açılan 8 satırlık öneri
// listesi o yarıya sığmıyordu. Katman tüm ekranı alır: kutu üstte, öneriler
// kalan alanda kendi kayar listesinde. Geri tuşu/ok katmanı kapatır.
//
// Öneri listesi SearchField'ın menüsü DEĞİL (showMenu=false): aynı
// SuggestionList bileşeni burada statik bir listede çizilir. Böylece dış
// tıklama mantığı da devre dışı kalır — katmanda "dış" yoktur.
export default function SearchOverlay({ open, onClose, search }) {
  useHistoryLayer(open, onClose)
  const { query, suggestions, suggesting, correctedFrom, selectedItem, detailLoading, selectSuggestion } = search

  // Bir öneri seçilince sonuç içerik alanında çizilir; katmanın işi bitti.
  useEffect(() => {
    if (open && (selectedItem || detailLoading)) onClose()
  }, [open, selectedItem, detailLoading, onClose])

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

  let ipucu = null
  if (suggestions.length === 0) {
    if (!query) ipucu = 'Film veya dizi adı yaz; öneriler yazarken gelir.'
    else if (suggesting) ipucu = 'Aranıyor…'
    else ipucu = 'Eşleşen yapım bulunamadı.'
  }

  return createPortal(
    <div className="sov" role="dialog" aria-modal="true" aria-label="Film veya dizi ara">
      <div className="sov-head">
        <button className="icon-btn" onClick={onClose} aria-label="Geri">
          <ArrowLeft size={20} aria-hidden="true" />
        </button>
        <SearchField search={search} autoFocus showMenu={false} />
      </div>
      <div className="sov-body">
        {ipucu
          ? <p className="sov-hint">{ipucu}</p>
          : (
            <div className="sov-list" role="listbox">
              <SuggestionList
                suggestions={suggestions}
                correctedFrom={correctedFrom}
                query={query}
                onSelect={selectSuggestion}
              />
            </div>
          )}
      </div>
    </div>,
    document.body
  )
}
