import { useState, useEffect, useRef, useCallback } from 'react'
import { ChevronLeft, ChevronRight, Star } from 'lucide-react'
import DetailOverlay from './DetailOverlay.jsx'
import SaveControls from './SaveControls.jsx'
import { useDevice } from '../contexts/DeviceContext.jsx'

const DONUS_MS = 7000

// Vitrin — bir listenin ilk N'i, geniş görselle. HER SEKMEDE aynı bileşen:
// Bana Özel'de öneriler, Diziler/Filmler'de listenin zirvesi, Trend'de
// haftanın en çok konuşulanları. Tek yapımlık ayrı bir 'spot ışığı' bileşeni
// vardı; aynı işi yaptığı için kaldırıldı.
//
// Otomatik dönüş üç durumda DURUR: fare üstündeyken, odak içerideyken ve
// kullanıcı azaltılmış hareket istediğinde. Sonuncusu bir tercih değil kural:
// kendi kendine hareket eden bir blok, vestibüler duyarlılığı olan kullanıcı
// için en rahatsız edici öğedir.
export default function HeroSlider({ items = [], count = 10, kicker = 'Listenin zirvesinde' }) {
  const dilimler = items.slice(0, count)
  const [i, setI] = useState(0)
  const [acik, setAcik] = useState(null)
  const [durdur, setDurdur] = useState(false)
  const kokRef = useRef(null)
  const dokunusX = useRef(null)

  // Dokunmatikte otomatik dönüş YOK: "fare üstündeyken dur" kuralının telefonda
  // karşılığı yoktur, kullanıcı okurken slayt değişiyordu. Parmakla kaydırma
  // (swipe) gezinmeyi devralır; oklar ve noktalar yine durur.
  const { isTouch } = useDevice()

  const n = dilimler.length
  const git = useCallback((yon) => setI(p => (p + yon + n) % n), [n])

  // Liste kısalırsa (kayıt silindi) indeks aralık dışında kalmasın.
  useEffect(() => { if (i >= n && n > 0) setI(0) }, [n, i])

  useEffect(() => {
    if (n <= 1 || durdur || isTouch) return
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return
    const t = setInterval(() => git(1), DONUS_MS)
    return () => clearInterval(t)
  }, [n, durdur, git, isTouch])

  // 40px eşik: dikey kaydırma sırasında yatay sapma slayt değiştirmesin.
  const dokunusBasla = (e) => { dokunusX.current = e.touches[0]?.clientX ?? null }
  const dokunusBitir = (e) => {
    if (dokunusX.current == null || n <= 1) return
    const dx = (e.changedTouches[0]?.clientX ?? dokunusX.current) - dokunusX.current
    dokunusX.current = null
    if (Math.abs(dx) > 40) git(dx < 0 ? 1 : -1)
  }

  if (n === 0) return null
  const item = dilimler[i]
  // Geniş görsel masaüstünde kabın %54'ünü (≈750px) doldurur; w780 orada
  // bulanıklaşıyordu, w1280 ise telefonda (≈360px) gereksiz ağırdı. srcset ile
  // tarayıcı seçer: dar ekranda w780, geniş ekranda w1280. `sizes` yerleşimi
  // birebir izler — 640px altında tek kolon (tam genişlik eksi oluk), üstünde
  // %54'lük kolon. Poster yedeği dar olduğu için tek boy yeterli.
  const TMDB_IMG = 'https://image.tmdb.org/t/p/'
  const gorsel = item.backdropPath
    ? `${TMDB_IMG}w1280${item.backdropPath}`
    : item.posterPath
      ? `${TMDB_IMG}w780${item.posterPath}`
      : null
  const gorselSet = item.backdropPath
    ? `${TMDB_IMG}w780${item.backdropPath} 780w, ${TMDB_IMG}w1280${item.backdropPath} 1280w`
    : undefined
  const gorselSizes = item.backdropPath ? '(max-width: 639px) calc(100vw - 32px), 54vw' : undefined

  const kindWord   = item.type === 'film' ? 'Film' : 'Dizi'
  const meta = [kindWord, ...(item.genres || []).slice(0, 2), item.year].filter(Boolean).join(' · ')

  return (
    <section
      className="hslider"
      ref={kokRef}
      aria-roledescription="carousel"
      aria-label={kicker}
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
        onTouchStart={dokunusBasla}
        onTouchEnd={dokunusBitir}
      >
        <div className="hslide-body">
          <p className="hslide-kick">
            {/* Öneri motoru gerekçe taşıyorsa ("Beğendiğin: Breaking Bad")
                genel etiketin yerini o alır: öneriye güveni gerekçe kurar. */}
            {item._reason || kicker}
            <span className="tnum">{i + 1} / {n}</span>
          </p>
          <h2 className="hslide-title">{item.title}</h2>
          {item.description && <p className="hslide-desc">{item.description}</p>}
          <div className="hslide-row">
            {/* Görünür metin erişilebilir adın BAŞINDA: sesli komut "Detaya bak'a
                dokun" eşleşsin (WCAG 2.5.3); başlık sonda bağlam verir. */}
            <button className="btn" onClick={() => setAcik(item)} aria-label={`Detaya bak: ${item.title}`}>
              Detaya bak
            </button>
            <SaveControls item={item} size={17} />
            {item.imdbScore != null && (
              <span className="hslide-score tnum">
                <Star size={14} aria-hidden="true" />
                {item.imdbScore}<span className="hslide-score-max">/10</span>
              </span>
            )}
            <span className="hslide-meta">{meta}</span>
          </div>
        </div>

        {/* Görsel kendi kolonunda ve kaynakla aynı oranda (16:9) — kırpma yok.
            Metin üstünde durmadığı için okunurluk perdesi de gerekmiyor. */}
        <div className="hslide-media">
          {gorsel
            ? <img className="hslide-img" src={gorsel} srcSet={gorselSet} sizes={gorselSizes} alt="" loading="eager" decoding="async" fetchpriority="high" />
            : <div className="hslide-img hslide-img-yok" />}
        </div>
      </div>

      {/* Oklar ve noktalar tek gezinme kümesinde: oklar görselin üstünde
          yüzerken hem metne biniyor hem kompozisyonu kapatıyorlardı. */}
      {n > 1 && (
        <div className="hslide-nav">
          <button className="hslide-arrow" onClick={() => git(-1)} aria-label="Önceki öneri">
            <ChevronLeft size={18} aria-hidden="true" />
          </button>

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

          <button className="hslide-arrow" onClick={() => git(1)} aria-label="Sonraki öneri">
            <ChevronRight size={18} aria-hidden="true" />
          </button>
        </div>
      )}

      {acik && <DetailOverlay item={acik} onClose={() => setAcik(null)} />}
    </section>
  )
}
