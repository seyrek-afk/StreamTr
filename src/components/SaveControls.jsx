import { Heart, Bookmark } from 'lucide-react'
import { useFavorites, LIKE_NONE, LIKE_YES, LIKE_LOVE } from '../contexts/FavoritesContext.jsx'

// Kaydetme kontrolleri — poster üzerinde yaşar, bu yüzden kendi koyu diskleri
// var: posterin rengi ne olursa olsun okunur kalmalı.
//
// Yıldız emekli oldu: tek simge iki ayrı niyeti taşıyordu ("sevdim" ile
// "izleyeceğim") ve kullanıcı hangisini işaretlediğini karıştırıyordu. Yerine
// iki bağımsız kontrol:
//
//   KALP  → üç durum döngüsü: yok → Beğendim → Bayıldım → yok
//   AYRAÇ → iki durum: İzleyeceklerim'de / değil
//
// Döngü, karta üçüncü bir düğme eklemekten yeğdir: poster üstünde 44px'lik
// hedefler yan yana zor sığıyor. Döngünün kabul edilebilir olması için iki şart
// var, ikisi de sağlanıyor — durumlar tek bakışta ayrılıyor (çizgi / dolu /
// dolu-altın) ve erişilebilir ad HER ZAMAN bir sonraki eylemi söylüyor.

const SONRAKI_AD = {
  [LIKE_NONE]: 'Beğendim olarak işaretle',
  [LIKE_YES]:  'Bayıldım olarak yükselt',
  [LIKE_LOVE]: 'Beğeniyi kaldır',
}
const DURUM_AD = {
  [LIKE_NONE]: 'Beğenilmedi',
  [LIKE_YES]:  'Beğendim',
  [LIKE_LOVE]: 'Bayıldım',
}

export function LikeButton({ item, size = 15 }) {
  const { likeLevel, cycleLike } = useFavorites()
  const seviye = likeLevel(item)

  const handleClick = (e) => {
    e.preventDefault()
    e.stopPropagation()   // kartı açma / overlay'i kapatma tetiklenmesin
    cycleLike(item)
  }

  return (
    <button
      onClick={handleClick}
      className={`save-btn like-btn${seviye ? ' like-btn-on' : ''}${seviye === LIKE_LOVE ? ' like-btn-love' : ''}`}
      style={{ width: size + 16, height: size + 16 }}
      title={`${DURUM_AD[seviye]} — ${SONRAKI_AD[seviye]}`}
      aria-label={SONRAKI_AD[seviye]}
      aria-pressed={seviye !== LIKE_NONE}
    >
      <Heart size={size} fill={seviye ? 'currentColor' : 'none'} aria-hidden="true" />
    </button>
  )
}

export function WatchlistButton({ item, size = 15 }) {
  const { isWatchlisted, toggleWatchlist } = useFavorites()
  const acik = isWatchlisted(item)

  const handleClick = (e) => {
    e.preventDefault()
    e.stopPropagation()
    toggleWatchlist(item)
  }

  return (
    <button
      onClick={handleClick}
      className={`save-btn watch-btn${acik ? ' watch-btn-on' : ''}`}
      style={{ width: size + 16, height: size + 16 }}
      title={acik ? 'İzleyeceklerimden çıkar' : 'İzleyeceklerime ekle'}
      aria-label={acik ? 'İzleyeceklerimden çıkar' : 'İzleyeceklerime ekle'}
      aria-pressed={acik}
    >
      <Bookmark size={size} fill={acik ? 'currentColor' : 'none'} aria-hidden="true" />
    </button>
  )
}

// İkisi bir arada — kart köşesinde dikey istif.
export default function SaveControls({ item, size = 15 }) {
  return (
    <span className="save-stack">
      <LikeButton item={item} size={size} />
      <WatchlistButton item={item} size={size} />
    </span>
  )
}
