import { useState } from 'react'
import { Star } from 'lucide-react'
import PosterImg from './PosterImg.jsx'
import SaveControls from './SaveControls.jsx'
import DetailOverlay from './DetailOverlay.jsx'

// Spot ışığı: bulunulan sekmenin listesinin başındaki yapım.
//
// Izgara "hepsi eşit" der; bu blok "önce şuna bak" der. Sinema dilinde perde
// açıldığında tek bir film oynar — üst blok o rolü üstlenir, ızgara ise salonun
// geri kalanıdır.
//
// Konuyu ve kicker'ı çağıran verir: hangi listenin başı olduğu ve o listenin
// nasıl adlandırıldığı sekmeye bağlıdır, bileşenin bilmesi gereken bir şey
// değildir.
//
// Poster fare için tıklanabilir ama klavye/ekran okuyucu için GİZLİ: aynı eylemi
// açıkça adlandıran bir düğme zaten var, iki durak koymanın faydası yok.
export default function HeroSpotlight({ item, kicker = 'Listenin zirvesinde' }) {
  const [open, setOpen] = useState(false)
  if (!item) return null

  const genreWords = (item.genres || []).slice(0, 2)
  const kindWord   = item.type === 'film' ? 'Film' : 'Dizi'
  const meta       = [kindWord, ...genreWords, item.year].filter(Boolean).join(' · ')

  return (
    <section className="hero" aria-labelledby="hero-title">
      {/* Favori yıldızı posterin üstünde durur — kartlardaki `.cc-fav` ile aynı
          yer. Eylem satırında dursaydı dar ekranda tek başına alt satıra düşüp
          öksüz kalıyordu; üstelik kullanıcı yıldızı zaten posterde arıyor. */}
      <div className="hero-poster">
        <button
          type="button"
          className="hero-poster-hit"
          onClick={() => setOpen(true)}
          tabIndex={-1}
          aria-hidden="true"
        >
          <PosterImg path={item.posterPath} title={item.title} />
        </button>
        <span className="hero-fav"><SaveControls item={item} size={15} /></span>
      </div>

      <div className="hero-body">
        <p className="hero-kicker">{kicker}</p>

        <h2 className="hero-title" id="hero-title">{item.title}</h2>

        {item.description && <p className="hero-desc">{item.description}</p>}

        <div className="hero-row">
          {/* Görünen etiket kısa, erişilebilir ad tam: ekran okuyucu düğmeyi
              bağlamsız duyduğunda "Detaya bak" hangi yapım belli olmaz. */}
          <button
            type="button"
            className="btn"
            onClick={() => setOpen(true)}
            aria-label={`${item.title} detayına bak`}
          >
            Detaya bak
          </button>

          {item.imdbScore != null && (
            <span className="hero-score tnum">
              <Star size={14} aria-hidden="true" />
              {item.imdbScore}<span className="hero-score-max">/10</span>
            </span>
          )}

          <span className="hero-meta">{meta}</span>
        </div>
      </div>

      {open && <DetailOverlay item={item} onClose={() => setOpen(false)} />}
    </section>
  )
}
