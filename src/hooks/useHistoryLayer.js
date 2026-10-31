import { useEffect, useRef } from 'react'

let sayac = 0
// Şu an açık katmanların jetonları. Geçmişin tepesinde kimsenin sahiplenmediği
// bir katman girişi varsa (StrictMode'un çift kurulumu, sayfa yenileme) yeni
// katman onu üstüne yazmakla yetinir — geçmişte "ölü" giriş birikmez.
const canli = new Set()

// Açık bir katman (alt sayfa, detay penceresi, tam ekran arama) tarayıcı
// geçmişine BİR giriş yazar. Telefonda geri tuşu/jesti o girişi geri alır ve
// katman kapanır — site değil. Geçmiş kullanılmadığında geri tuşu kullanıcıyı
// sitenin dışına atıyordu; telefon kullanıcısının en sık yaptığı hareket bu.
//
// Katmanlar yığılabilir (detay içinden detay): her örnek kendi jetonunu yazar;
// popstate'te yalnız jetonu geçmişten çıkan katman kapanır.
//
// Katman geri tuşu DIŞINDA kapanırsa (X, scrim, seçim) girişi kendimiz geri
// alırız; yoksa bir sonraki geri basışı görünürde hiçbir şey yapmazdı.
// Bu geri alma bir tık ertelenir: React StrictMode geliştirmede efekti
// söküp yeniden kurar; anında back() ikinci kurulumun girişini de yutuyordu.
export function useHistoryLayer(enabled, onClose) {
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  useEffect(() => {
    if (!enabled || typeof window === 'undefined' || !window.history?.pushState) return
    const token = `katman-${++sayac}`
    const hist = window.history
    const ustteki = hist.state?.streamtrLayer
    if (ustteki && !canli.has(ustteki)) hist.replaceState({ streamtrLayer: token }, '')
    else hist.pushState({ streamtrLayer: token }, '')
    canli.add(token)

    let kapandi = false
    const onPop = () => {
      if (hist.state?.streamtrLayer === token) return
      kapandi = true
      onCloseRef.current?.()
    }
    window.addEventListener('popstate', onPop)

    return () => {
      window.removeEventListener('popstate', onPop)
      canli.delete(token)
      if (kapandi) return
      setTimeout(() => {
        if (hist.state?.streamtrLayer === token) hist.back()
      }, 0)
    }
  }, [enabled])
}
