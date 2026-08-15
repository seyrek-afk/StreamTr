import { useState, useEffect, useRef, useCallback } from 'react'
import { ChevronLeft, ChevronRight, Star } from 'lucide-react'
import DetailOverlay from './DetailOverlay.jsx'
import { LikeButton, WatchlistButton } from './SaveControls.jsx'

const DONUS_MS = 7000

// Sana Özel vitrini — önerilerin ilk N'i, geniş görselle.
//
// Otomatik dönüş üç durumda DURUR: fare üstündeyken, odak içerideyken ve
// kullanıcı azaltılmış hareket istediğinde. Sonuncusu bir tercih değil kural:
// kendi kendine hareket eden bir blok, vestibüler duyarlılığı olan kullanıcı
// için en rahatsız edici öğedir.
export default function HeroSlider({ items = [], count = 10 }) {
  const dilimler = items.slice(0, count)
  const [i, setI] = useState(0)
  const [acik, setAcik] = useState(null)
  const [durdur, setDurdur] = useState(false)
  const kokRef = useRef(null)

  const n = dilimler.length
  const git = useCallback((yon) => setI(p => (p + yon + n) % n), [n])

  // Liste kısalırsa (kayıt silindi) indeks aralık dışında kalmasın.
  useEffect(() => { if (i >= n && n > 0) setI(0) }, [n, i])

  useEffect(() => {
    if (n <= 1 || durdur) return
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return
    const t = setInterval(() => git(1), DONUS_MS)
    return () => clearInterval(t)
  }, [n, durdur, git])

  if (n === 0) return null
  const item = dilimler[i]
  // Geniş görsel tam genişlikte gösteriliyor: w780 masaüstünde büyütülüp
  // bulanıklaşıyordu. Poster yedeği dar olduğu için daha küçük boy yeterli.
  const gorsel = item.backdropPath
    ? `https://image.tmdb.org/t/p/w1280${item.backdropPath}`
    : item.posterPath
      ? `https://image.tmdb.org/t/p/w780${item.posterPath}`
      : null

  const kindWord   = item.type === 'film' ? 'Film' : 'Dizi'
  const meta = [kindWord, ...(item.genres || []).slice(0, 2), item.year].filter(Boolean).join(' · ')

  return (
    <section
      className="hslider"
      ref={kokRef}
      aria-roledescription="carousel"
      aria-label="Sana özel öneriler"
      onMouseEnter={() => setDurdur(true)}
      onMouseLeave={() => setDurdur(false)}
      onFocusCapture={() => setDurdur(true)}
      onBlurCapture={(e) => {
        if (!kokRef.current?.contains(e.relatedTarget)) setDurdur(false)
      }}
    >
      <div
        className="hslide"
        // Ekran okuyucuya "kaçıncı slayt" bilgisi; görsel karşılığı noktalar.
        aria-roledescription="slide"
        aria-label={`${i + 1} / ${n}: ${item.title}`}
      >
        {gorsel
          ? <img className="hslide-img" src={gorsel} alt="" loading="eager" decoding="async" />
          : <div className="hslide-img hslide-img-yok" />}
        <div className="hslide-scrim" />

        <div className="hslide-body">
          <p className="hslide-kick">
            Sana özel öneri
            <span className="tnum">{i + 1} / {n}</span>
          </p>
          <h2 className="hslide-title">{item.title}</h2>
          {item.description && <p className="hslide-desc">{item.description}</p>}
          <div className="hslide-row">
            <button className="btn" onClick={() => setAcik(item)} aria-label={`${item.title} detayına bak`}>
              Detaya bak
            </button>
            <LikeButton item={item} size={17} />
            <WatchlistButton item={item} size={17} />
            {item.imdbScore != null && (
              <span className="hslide-score tnum">
                <Star size={14} aria-hidden="true" />
                {item.imdbScore}<span className="hslide-score-max">/10</span>
              </span>
            )}
            <span className="hslide-meta">{meta}</span>
          </div>
        </div>

        {n > 1 && (
          <>
            <button className="hslide-arrow hslide-arrow-l" onClick={() => git(-1)} aria-label="Önceki öneri">
              <ChevronLeft size={20} aria-hidden="true" />
            </button>
            <button className="hslide-arrow hslide-arrow-r" onClick={() => git(1)} aria-label="Sonraki öneri">
              <ChevronRight size={20} aria-hidden="true" />
            </button>
          </>
        )}
      </div>

      {n > 1 && (
        <div className="hslide-dots" role="tablist" aria-label="Öneri seç">
          {dilimler.map((d, idx) => (
            <button
              key={d.key || d.title || idx}
              role="tab"
              aria-selected={idx === i}
              aria-label={`${idx + 1}. öneri: ${d.title}`}
              className={`hslide-dot${idx === i ? ' hslide-dot-on' : ''}`}
              onClick={() => setI(idx)}
            />
          ))}
        </div>
      )}

      {acik && <DetailOverlay item={acik} onClose={() => setAcik(null)} />}
    </section>
  )
}
