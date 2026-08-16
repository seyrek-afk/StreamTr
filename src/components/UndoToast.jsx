import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { RotateCcw, X } from 'lucide-react'
import {
  useFavorites,
  DURUM_YOK, DURUM_BEGENI, DURUM_BAYILMA, DURUM_IZLEME,
} from '../contexts/FavoritesContext.jsx'

// Bildirim, kartın çıkış animasyonundan UZUN yaşar: kart 420ms'de kayboluyor,
// kullanıcının "ne oldu?" deyip geri alması ise saniyeler sürer.
const SURE_MS = 6000

// Ekler ÜNLÜ UYUMUNA göre değişiyor ve üç ad da sabit olduğu için kural
// çalıştırmak yerine doğrudan yazıldı: "Bayıldıklarıma" (kalın ünlü) ama
// "Beğendiklerime" (ince ünlü). Kuralı kodla türetmek bu üç sözcük için
// gereksiz karmaşıklık, yanlış türetme riski ise gerçek.
const LISTE = {
  [DURUM_BEGENI]:  { cikis: 'Beğendiklerimden',  giris: 'Beğendiklerime'  },
  [DURUM_BAYILMA]: { cikis: 'Bayıldıklarımdan',  giris: 'Bayıldıklarıma'  },
  [DURUM_IZLEME]:  { cikis: 'İzleyeceklerimden', giris: 'İzleyeceklerime' },
}

// Mesaj, olan biteni SOMUT söyler: hangi listeye gitti, nereden çıktı.
// "Kaydedildi" gibi genel bir metin, dışlayıcı modelde en kritik bilgiyi —
// önceki durumun silindiğini — gizlerdi.
function mesaj({ onceki, yeni, item }) {
  const ad = item?.title ? `"${item.title}" ` : ''
  if (yeni === DURUM_YOK)   return `${ad}${LISTE[onceki].cikis} çıkarıldı`
  if (onceki === DURUM_YOK) return `${ad}${LISTE[yeni].giris} eklendi`
  return `${ad}${LISTE[onceki].cikis} ${LISTE[yeni].giris} taşındı`
}

export default function UndoToast() {
  const { sonIslem, geriAl, sonIslemiTemizle } = useFavorites()
  const [kapaniyor, setKapaniyor] = useState(false)

  useEffect(() => {
    if (!sonIslem) return
    setKapaniyor(false)
    // Çıkış animasyonu için önce işaretle, sonra kaldır.
    const cikis = setTimeout(() => setKapaniyor(true), SURE_MS - 200)
    const kapat = setTimeout(sonIslemiTemizle, SURE_MS)
    return () => { clearTimeout(cikis); clearTimeout(kapat) }
  }, [sonIslem, sonIslemiTemizle])

  if (!sonIslem) return null

  return createPortal(
    <div
      className={`undo-toast${kapaniyor ? ' undo-toast-kapaniyor' : ''}`}
      // role=status: odağı ÇALMADAN duyurur. Bildirim kullanıcının o anki
      // işini bölmemeli; geri alma isteğe bağlı bir çıkış yolu.
      role="status"
      aria-live="polite"
    >
      <span className="undo-toast-msg">{mesaj(sonIslem)}</span>
      <button className="undo-toast-btn" onClick={geriAl}>
        <RotateCcw size={14} aria-hidden="true" /> Geri al
      </button>
      <button className="undo-toast-x" onClick={sonIslemiTemizle} aria-label="Bildirimi kapat">
        <X size={15} aria-hidden="true" />
      </button>
    </div>,
    document.body
  )
}
