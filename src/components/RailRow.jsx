import { useRef, useState, useEffect, useCallback } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import RailCard from './RailCard.jsx'

// Yatay kaydırmalı editoryal raf.
//
// Oklar yalnız gerçek işaretçili cihazlarda (hover: hover) görünür — dokunmatikte
// zaten doğal kaydırma vardır, ok koymak ekranı boş yere kalabalıklaştırır.
// Kenardayken ilgili ok gizlenir: tıklanamaz bir kontrol göstermek yerine hiç
// göstermemek daha sakin bir arayüz verir.
export default function RailRow({ title, items, onShowAll }) {
  const scrollerRef = useRef(null)
  const [atStart, setAtStart] = useState(true)
  const [atEnd,   setAtEnd]   = useState(false)

  const syncEdges = useCallback(() => {
    const el = scrollerRef.current
    if (!el) return
    // 2px tolerans: alt piksel kaydırmada kenar hiç yakalanmayabiliyor.
    setAtStart(el.scrollLeft <= 2)
    setAtEnd(el.scrollLeft + el.clientWidth >= el.scrollWidth - 2)
  }, [])

  useEffect(() => {
    syncEdges()
    const el = scrollerRef.current
    if (!el) return
    el.addEventListener('scroll', syncEdges, { passive: true })
    window.addEventListener('resize', syncEdges)
    return () => {
      el.removeEventListener('scroll', syncEdges)
      window.removeEventListener('resize', syncEdges)
    }
  }, [syncEdges, items])

  const scrollBy = (dir) => {
    const el = scrollerRef.current
    if (!el) return
    // Görünür genişliğin %80'i kadar kaydır — bir sonraki "sayfa" hissi verirken
    // kullanıcının hangi kartta kaldığını kaybetmemesi için biraz örtüşme bırakır.
    el.scrollBy({ left: Math.round(el.clientWidth * 0.8) * dir, behavior: 'smooth' })
  }

  if (!items || items.length === 0) return null

  return (
    <section className="rail-section">
      <div className="rail-header">
        <h3 className="rail-heading">{title}</h3>
        {onShowAll && (
          <button className="link-btn" onClick={onShowAll}>
            Tümü <ChevronRight size={14} aria-hidden="true" />
          </button>
        )}
      </div>

      <div className="rail-viewport">
        {!atStart && (
          <button
            className="rail-arrow rail-arrow-left"
            onClick={() => scrollBy(-1)}
            aria-label="Geri kaydır"
            tabIndex={-1}
          >
            <ChevronLeft size={16} />
          </button>
        )}

        <div className="rail-scroller" ref={scrollerRef}>
          {items.map((item, i) => (
            <RailCard key={`${item._mediaType}-${item._tmdbId || item.title}-${i}`} item={item} />
          ))}
        </div>

        {!atEnd && (
          <button
            className="rail-arrow rail-arrow-right"
            onClick={() => scrollBy(1)}
            aria-label="İleri kaydır"
            tabIndex={-1}
          >
            <ChevronRight size={16} />
          </button>
        )}
      </div>
    </section>
  )
}
