import { ThumbsUp, Heart, Bookmark } from 'lucide-react'
import { useFavorites, LIKE_NONE, LIKE_YES, LIKE_LOVE } from '../contexts/FavoritesContext.jsx'

// Kaydetme grubu — üç simge yan yana, her yerde aynı.
//
// Önceki tasarım tek kalpti ve üç durumu DÖNGÜYLE geziyordu. İki sorunu vardı:
// bir sonraki durumu görmek için tıklamak gerekiyordu, ve "Beğendim" ile
// "Bayıldım" aynı simgenin iki tonuydu — ayrıştırıcı değildi. Artık:
//
//   👍 Beğendim     — başparmak
//   ♥  Bayıldım     — kalp
//   🔖 İzleyeceğim  — ayraç
//
// Üçü de DOĞRUDAN erişilir: hangi durumu istiyorsan ona basarsın, aradaki
// durumlardan geçmen gerekmez. Beğendim ile Bayıldım aynı eksenin iki değeri
// olduğu için birbirini dışlar (birine basmak diğerini bırakır); ayraç bağımsız.
// Aynı düğmeye tekrar basmak o durumu kaldırır.
//
// KONUM: grup posterin ÜSTÜNDE değil kartın bilgi alanında yaşar. Ölçüldü —
// 3 × 44px hedef 132px ister, kart posteri ise masaüstünde 108px. Postere
// sığdırmak ya hedefleri küçültmeyi ya da poster sanatının üçte ikisini
// kapatmayı gerektirirdi; ikisi de "posterler kahraman" tezine aykırı.

export default function SaveControls({ item, size = 16 }) {
  const { likeLevel, isWatchlisted, setLike, toggleWatchlist } = useFavorites()
  const seviye = likeLevel(item)
  const izlenecek = isWatchlisted(item)

  const dur = (e) => { e.preventDefault(); e.stopPropagation() }

  return (
    <div
      className="save-group"
      role="group"
      aria-label={`${item.title} — kaydetme`}
      onClick={dur}
      onKeyDown={(e) => e.stopPropagation()}
    >
      <button
        type="button"
        className={`save-btn like1-btn${seviye === LIKE_YES ? ' save-btn-on' : ''}`}
        style={{ width: size + 16, height: size + 16 }}
        aria-pressed={seviye === LIKE_YES}
        title={seviye === LIKE_YES ? 'Beğendim — kaldır' : 'Beğendim'}
        aria-label={seviye === LIKE_YES ? 'Beğenimi kaldır' : 'Beğendim olarak işaretle'}
        onClick={(e) => { dur(e); setLike(item, seviye === LIKE_YES ? LIKE_NONE : LIKE_YES) }}
      >
        <ThumbsUp size={size} fill={seviye === LIKE_YES ? 'currentColor' : 'none'} aria-hidden="true" />
      </button>

      <button
        type="button"
        className={`save-btn like2-btn${seviye === LIKE_LOVE ? ' save-btn-on' : ''}`}
        style={{ width: size + 16, height: size + 16 }}
        aria-pressed={seviye === LIKE_LOVE}
        title={seviye === LIKE_LOVE ? 'Bayıldım — kaldır' : 'Bayıldım'}
        aria-label={seviye === LIKE_LOVE ? 'Bayıldım işaretini kaldır' : 'Bayıldım olarak işaretle'}
        onClick={(e) => { dur(e); setLike(item, seviye === LIKE_LOVE ? LIKE_NONE : LIKE_LOVE) }}
      >
        <Heart size={size} fill={seviye === LIKE_LOVE ? 'currentColor' : 'none'} aria-hidden="true" />
      </button>

      <button
        type="button"
        className={`save-btn watch-btn${izlenecek ? ' save-btn-on' : ''}`}
        style={{ width: size + 16, height: size + 16 }}
        aria-pressed={izlenecek}
        title={izlenecek ? 'İzleyeceklerimden çıkar' : 'İzleyeceğim'}
        aria-label={izlenecek ? 'İzleyeceklerimden çıkar' : 'İzleyeceklerime ekle'}
        onClick={(e) => { dur(e); toggleWatchlist(item) }}
      >
        <Bookmark size={size} fill={izlenecek ? 'currentColor' : 'none'} aria-hidden="true" />
      </button>
    </div>
  )
}
