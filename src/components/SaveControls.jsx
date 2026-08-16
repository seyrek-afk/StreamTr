import { ThumbsUp, Heart, Bookmark } from 'lucide-react'
import {
  useFavorites,
  DURUM_YOK, DURUM_BEGENI, DURUM_BAYILMA, DURUM_IZLEME,
} from '../contexts/FavoritesContext.jsx'

// Kaydetme grubu — üç simge yan yana, her yerde aynı.
//
//   👍 Beğendim     ♥ Bayıldım     🔖 İzleyeceğim
//
// Üçü BİRBİRİNİ DIŞLAR: son seçim kazanır. Bir yapımın tek bir durumu olur.
// Gerekçe ve bedeli FavoritesContext'te yazılı (özet: puan vermek "izledim"
// demektir, kayıt izleme kuyruğundan düşmelidir).
//
// Aynı düğmeye tekrar basmak durumu kaldırır — yani üç düğme bir radyo grubu
// gibi ama "hiçbiri" de geçerli bir durum.
//
// KONUM: grup posterin üstünde değil kartın bilgi alanında. Ölçüldü — 3 × 44px
// hedef 132px ister, kart posteri masaüstünde 108px.

const SIMGELER = [
  {
    durum: DURUM_BEGENI, Icon: ThumbsUp, sinif: 'like1-btn',
    ad: 'Beğendim olarak işaretle', adAcik: 'Beğenimi kaldır', baslik: 'Beğendim',
  },
  {
    durum: DURUM_BAYILMA, Icon: Heart, sinif: 'like2-btn',
    ad: 'Bayıldım olarak işaretle', adAcik: 'Bayıldım işaretini kaldır', baslik: 'Bayıldım',
  },
  {
    durum: DURUM_IZLEME, Icon: Bookmark, sinif: 'watch-btn',
    ad: 'İzleyeceklerime ekle', adAcik: 'İzleyeceklerimden çıkar', baslik: 'İzleyeceğim',
  },
]

export default function SaveControls({ item, size = 16 }) {
  const { durum, setDurum } = useFavorites()
  const mevcut = durum(item)

  const dur = (e) => { e.preventDefault(); e.stopPropagation() }

  return (
    <div
      className="save-group"
      role="group"
      aria-label={`${item.title} — kaydetme`}
      onClick={dur}
      onKeyDown={(e) => e.stopPropagation()}
    >
      {SIMGELER.map(({ durum: d, Icon, sinif, ad, adAcik, baslik }) => {
        const acik = mevcut === d
        return (
          <button
            key={d}
            type="button"
            className={`save-btn ${sinif}${acik ? ' save-btn-on' : ''}`}
            style={{ width: size + 16, height: size + 16 }}
            aria-pressed={acik}
            title={acik ? `${baslik} — kaldır` : baslik}
            aria-label={acik ? adAcik : ad}
            onClick={(e) => { dur(e); setDurum(item, acik ? DURUM_YOK : d) }}
          >
            <Icon size={size} fill={acik ? 'currentColor' : 'none'} aria-hidden="true" />
          </button>
        )
      })}
    </div>
  )
}
