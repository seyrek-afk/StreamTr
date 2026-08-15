import { useEffect, useRef, useState } from 'react'
import { fillFromCache, loadPlatforms, platformKey } from '../lib/platforms.js'

// Verilen kart listesine platform rozetlerini doldurur.
//
// NEDEN AYRI BİR KATMAN: platform zenginleştirmesi useStreamData'nın içine
// gömülüydü ve yalnız sekme veri setleri (data[dk]) üzerinde çalışıyordu.
// Favoriler localStorage/Supabase'den, öneriler ayrı bir uçtan geliyor —
// ikisi de o yoldan geçmediği için "Sana Özel" sekmesindeki kartlarda platform
// rozetleri HİÇ görünmüyordu. Önbellek paylaşıldığı için aynı yapım başka bir
// sekmede zaten çekildiyse ek istek gitmez.
export function usePlatforms(items) {
  const [, tetikle] = useState(0)
  const iptalRef = useRef(null)

  // Hangi kartların çekilmesi gerektiği kimliklerine bağlıdır; dizi kimliği
  // her render'da değiştiği için bağımlılık olarak anahtar listesi kullanılır.
  const anahtarlar = (items || []).map(platformKey).join('|')

  useEffect(() => {
    iptalRef.current?.abort()
    const ac = new AbortController()
    iptalRef.current = ac

    loadPlatforms(items, ac.signal, () => {
      // Önbellek doldu; yeniden render tetiklenir ve aşağıdaki fillFromCache
      // güncel değeri okur. Kart başına state tutmak yerine tek bir tetik
      // yeterli: liste zaten her render'da önbellekten türetiliyor.
      if (!ac.signal.aborted) tetikle(n => n + 1)
    })

    return () => ac.abort()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [anahtarlar])

  return fillFromCache(items)
}
