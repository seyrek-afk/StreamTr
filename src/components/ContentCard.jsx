import { useState } from 'react'
import { ChevronDown, ChevronUp, ChevronRight } from 'lucide-react'
import PosterImg from './PosterImg.jsx'
import DetailOverlay from './DetailOverlay.jsx'
import DetailBody, { ScoreLine } from './DetailBody.jsx'
import SaveControls from './SaveControls.jsx'
import { ALL_PLATFORMS } from '../constants/index.js'
import { badgeInk } from '../lib/cards.js'
import { useDevice } from '../contexts/DeviceContext.jsx'

// Rozet çözümlemesi küresel + yerli tüm sağlayıcıları kapsar; aksi halde
// puhutv/TOD gibi yerli platformlar gri "PUH" fallback'ine düşerdi.
const PLAT_MAP = Object.fromEntries(ALL_PLATFORMS.map(p => [p.id, p]))

// ── Ana Bileşen ───────────────────────────────────────────────────────────────
// showKind=false → "Dizi/Film" sözcüğü yazılmaz. Diziler ve Filmler sekmelerinde
// zaten hepsi aynı türden; her kartta tekrarlamak 20 kez aynı şeyi söylemekti.
export default function ContentCard({ item, isTrend, showKind = true }) {
  const [open, setOpen] = useState(false)

  // Detay içeriği (TMDB çekimleri dahil) DetailBody'de — vitrin ve raf
  // overlay'leri de aynısını gösterir.
  const [overlayItem, setOverlayItem] = useState(null)

  // Telefonda kart İÇİNDE açılmaz, alt sayfaya gider: tek kolonda açılan kart
  // ekranı 1500px aşağı itiyor ve kullanıcı "nerede kaldım"ı kaybediyordu.
  // Alt sayfa kapanınca liste olduğu yerde durur. Masaüstünde yerinde açılma
  // korunur — orada komşu kartlar bağlam verir.
  const { isPhone } = useDevice()
  const ac = () => { if (isPhone) setOverlayItem(item); else setOpen(o => !o) }

  // Tür + içerik tipi tek satırda düz metin: "Dizi · Dram · Suç". Önce her biri
  // ayrı çerçeveli etiketti; üç kutu bir cümlelik bilgiyi taşıyordu.
  // Tür sayısı 2 ile sınırlı: üçüncüsü satırı sarmalıyor ve kart ritmini bozuyordu.
  const kindWord = (showKind && item.type) ? (item.type === 'film' ? 'Film' : 'Dizi') : null
  const genreWords = (item.genres || []).slice(0, 2)

  return (
    <>
      <div
        className={`cc${isTrend ? ' cc-trend' : ''}`}
        role="button"
        tabIndex={0}
        aria-expanded={isPhone ? undefined : open}
        aria-haspopup={isPhone ? 'dialog' : undefined}
        aria-label={isPhone
          ? `${item.title} — detayına bak`
          : `${item.title} — detayları ${open ? 'kapat' : 'aç'}`}
        onClick={ac}
        onKeyDown={e => {
          if (e.target !== e.currentTarget) return
          if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); ac() }
        }}
      >
        {isTrend && <div className="cc-trendbar" />}

        <div className="cc-head">
          <div className="cc-poster">
            <PosterImg path={item.posterPath} title={item.title} />

            {item.trendRank && (
              <div className={`cc-rank tnum${item.trendRank <= 3 ? ' cc-rank-top' : ''}`}>
                {item.trendRank}
              </div>
            )}

            {item.isNewRelease && <div className="cc-new">YENİ</div>}
          </div>

          <div className="cc-body">
            <div className="cc-title-row">
              <span className="cc-title" title={item.title}>{item.title}</span>
              <span className="cc-year tnum">{item.year}</span>
            </div>


            <ScoreLine imdb={item.imdbScore} rt={item.rottenTomatoesScore} lb={item.letterboxdScore} />

            {(kindWord || genreWords.length > 0) && (
              <p className="cc-meta">
                {kindWord && <span className="cc-kind">{kindWord}{genreWords.length > 0 ? ' · ' : ''}</span>}
                {genreWords.join(' · ')}
              </p>
            )}

            {item.socialScore != null && (
              <div className="cc-social">
                <div className="cc-bar"><i style={{ width: `${item.socialScore}%` }} /></div>
                <span className="cc-social-n tnum">{item.socialScore}</span>
              </div>
            )}

            <div className="cc-tags">
              {/* Yerli yapım etiketi platform rozetlerinden ÖNCE gelir: köken
                  yapımın kalıcı özelliğidir, platform ise değişebilir. */}
              {item.isYerli && <span className="tr-tag">TR YAPIMI</span>}
              {(item.platforms || []).map(p => {
                const plat = PLAT_MAP[p]
                return (
                  // Platform rengi MARKA verisidir (PLATFORMS), tema tokenı
                  // değil — bu yüzden satır içi gelir. Mürekkep marka renginin
                  // parlaklığından hesaplanır. Bilinmeyen sağlayıcı CSS'teki
                  // nötr yedeğe düşer.
                  <span
                    key={p}
                    className="cc-plat"
                    style={plat?.color ? { background: plat.color, color: badgeInk(plat.color) } : undefined}
                  >
                    {plat?.badge || p.substring(0, 3).toUpperCase()}
                  </span>
                )
              })}
              {item.duration && <span className="cc-dur tnum">{item.duration} dk</span>}
              <span className="cc-chevron" aria-hidden="true">
                {isPhone ? <ChevronRight size={16} /> : open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </span>
            </div>

            {/* Kaydetme grubu bilgiden SONRA gelir: başlık → puan → tür →
                platform sırası "bu ne" sorusunu yanıtlar, eylem en sonda durur.
                Araya girdiğinde okuma akışını kesiyordu.

                Poster üzerinde DEĞİL: ölçüldü, 3×44px hedef 132px ister ve kart
                posteri masaüstünde 108px. Böylece poster sanatı da açıkta kalır. */}
            <SaveControls item={item} size={16} />
          </div>
        </div>

        {/* ── Genişletilmiş Detay ──────────────────────────────────────────── */}
        {!isPhone && <DetailBody item={item} open={open} onMiniClick={setOverlayItem} />}
      </div>

      {/* Detail Overlay (portal) */}
      {overlayItem && (
        <DetailOverlay item={overlayItem} onClose={() => setOverlayItem(null)} />
      )}
    </>
  )
}
