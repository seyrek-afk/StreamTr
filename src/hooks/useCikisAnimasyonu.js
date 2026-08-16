import { useEffect, useRef, useState } from 'react'

// Çıkış animasyonu süresi — CSS'teki .cikiyor animasyonuyla AYNI olmalı.
export const CIKIS_MS = 420

// Listeden düşen öğeleri kısa bir süre daha çizmeye devam eder.
//
// SORUN: Bana Özel'de bir kartın durumunu değiştirince kayıt anında başka bir
// rafa geçiyordu; kart göz kırpar gibi kayboluyor, kullanıcı ne olduğunu
// göremiyordu. React düğümü senkron kaldırdığı için saf CSS ile çıkış
// animasyonu yapılamaz — ayrılan öğe bir süre daha listede TUTULMALI.
//
// Bu kanca listeyi alır, ondan düşenleri `cikanlar` kümesine yazar ve süre
// dolana kadar listede bırakır. Çağıran, kümedeki anahtarlara çıkış sınıfı
// verir.
//
// Not: yalnız DÜŞEN öğeler için çalışır. Eklenenler zaten girişte animasyonlu.
export function useCikisAnimasyonu(items, anahtarla = (x) => x.key) {
  const [cikanlar, setCikanlar] = useState(() => new Map())
  const oncekiRef = useRef(new Map())
  const zamanlayicilar = useRef(new Map())

  useEffect(() => {
    const simdi = new Map((items || []).map(i => [anahtarla(i), i]))
    const onceki = oncekiRef.current

    onceki.forEach((item, k) => {
      // Zaten çıkış animasyonundaysa yeniden başlatma.
      if (simdi.has(k) || zamanlayicilar.current.has(k)) return
      setCikanlar(prev => new Map(prev).set(k, item))
      const t = setTimeout(() => {
        setCikanlar(prev => { const n = new Map(prev); n.delete(k); return n })
        zamanlayicilar.current.delete(k)
      }, CIKIS_MS)
      zamanlayicilar.current.set(k, t)
    })

    // Geri alma: öğe süre dolmadan geri gelirse çıkış iptal edilir, aksi halde
    // hem listede hem "çıkanlar"da görünüp iki kez çizilirdi.
    simdi.forEach((_, k) => {
      const t = zamanlayicilar.current.get(k)
      if (t) {
        clearTimeout(t)
        zamanlayicilar.current.delete(k)
        setCikanlar(prev => { const n = new Map(prev); n.delete(k); return n })
      }
    })

    oncekiRef.current = simdi
  }, [items, anahtarla])

  useEffect(() => () => {
    zamanlayicilar.current.forEach(clearTimeout)
    zamanlayicilar.current.clear()
  }, [])

  // Çıkanlar listenin SONUNA eklenmez; kendi yerlerinde kalmaları için
  // çağıran sırayı korur. Basitlik adına sona ekleniyor — raf yatay kaydığı
  // için sıçrama görünmüyor, ızgarada ise son satırda kısa süre duruyor.
  const gorunen = [...(items || []), ...[...cikanlar.values()]]
  const cikanAnahtarlar = new Set(cikanlar.keys())
  return { gorunen, cikanAnahtarlar }
}
