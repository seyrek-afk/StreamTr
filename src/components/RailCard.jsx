import { useState } from 'react'
import { Star } from 'lucide-react'
import PosterImg from './PosterImg.jsx'
import DetailOverlay from './DetailOverlay.jsx'
import SaveControls from './SaveControls.jsx'
import { fmtCount } from '../lib/cards.js'

// Raf kartı — ContentCard'ın dar, poster öncelikli kardeşi.
//
// Neden ayrı bir bileşen? ContentCard 320px minmax ızgara için tasarlanmıştır
// (açılır bölümler, oyuncu şeridi, kriter rozetleri). Yatay bir rafa sokulursa
// hem satır yüksekliği kontrolden çıkar hem de kaydırma sırasında açılır bölümler
// düzeni kırar. Raf kartı bilinçli olarak tek işe hizmet eder: tanı ve tıkla.
export default function RailCard({ item, cikiyor }) {
  const [open, setOpen] = useState(false)

  const score = item.imdbScore

  return (
    <>
      <div
        className={`rail-card${cikiyor ? ' cikiyor' : ''}`}
        role="button"
        tabIndex={0}
        onClick={() => setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setOpen(true) }
        }}
        aria-label={`${item.title} detaylarını aç`}
      >
        <div className="rail-poster">
          <PosterImg path={item.posterPath} title={item.title} />

          {score != null && (
            <span className="rail-score tnum">
              <Star size={11} fill="currentColor" aria-hidden="true" />
              {score}
            </span>
          )}
        </div>

        <div className="rail-meta">
          <span className="rail-title" title={item.title}>{item.title}</span>
          {/* Yıl · oy sayısı. İçerik türü ("Dizi"/"Film") bilinçli olarak YOK: bir raf
              tek türdendir, tekrar etmek gürültü olurdu. Oy sayısı ise sıralamayı
              okunur kılar — raflar Bayesian Yerli Skor'a göre dizilir, bu yüzden
              8.4 · 1.2k oy, 8.9 · 30 oy'un üstünde çıkabilir. Oy sayısı olmadan
              bu sıra göze rastgele görünür. */}
          <span className="rail-year tnum">
            {item.year || '—'}
            {item._voteCount ? ` · ${fmtCount(item._voteCount)} oy` : ''}
          </span>

          {/* Grup poster üstünde değil meta alanında — kartla aynı gerekçe. */}
          <SaveControls item={item} size={16} />
        </div>
      </div>

      {open && <DetailOverlay item={item} onClose={() => setOpen(false)} />}
    </>
  )
}
