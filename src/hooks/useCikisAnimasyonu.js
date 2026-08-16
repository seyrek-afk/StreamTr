import { useEffect, useRef, useState } from 'react'

// Çıkış animasyonu süresi — CSS'teki .cikiyor animasyonuyla AYNI olmalı.
// Biri değişirse kart ya animasyon bitmeden kaybolur ya da bittikten sonra
// donuk bekler.
export const CIKIS_MS = 640

// Listeden düşen öğeleri kısa bir süre daha çizmeye devam eder.
//
// SORUN: kayıt başka bir listeye geçince kart göz kırpar gibi kayboluyordu.
//
// NEDEN RENDER SIRASINDA: ayrılma tespiti önce useEffect'teydi ve sıra şuydu —
// React kartı ağaçtan çıkarır → tarayıcı O KAREYİ BOYAR (kart kaybolur) →
// efekt çalışır → kart geri eklenir → animasyon başlar. Kullanıcı "kayboldu,
// geri geldi, sonra soldu" görüyordu. Tespit render sırasında yapılınca kart
// ağaçtan hiç çıkmaz; tek ve kesintisiz bir sönme kalır.
//
// Ayrılan öğe KENDİ YERİNDE söner: ayrılma anındaki indeks saklanır ve görünen
// listede aynı yere geri konur.
export function useCikisAnimasyonu(items, anahtarla = (x) => x.key) {
  // Süre dolunca listeyi tazelemek için; değeri değil, değişmesi önemli.
  const [, tikla] = useState(0)

  const oncekiRef = useRef([])           // son görünen sıra (anahtarlar)
  const oncekiItemRef = useRef(new Map())// anahtar → öğe (ayrılanı çizebilmek için)
  const cikanRef = useRef(new Map())     // anahtar → { item, index }
  const zamanlayicilar = useRef(new Map())

  const liste = items || []
  const simdi = new Map(liste.map(i => [anahtarla(i), i]))

  // ── Ayrılanları yakala (render sırasında) ───────────────────────────────────
  oncekiRef.current.forEach((k, idx) => {
    if (simdi.has(k) || cikanRef.current.has(k)) return
    const item = oncekiItemRef.current.get(k)
    if (item) cikanRef.current.set(k, { item, index: idx })
  })

  // ── Geri gelenler ───────────────────────────────────────────────────────────
  // Öğe süre dolmadan geri dönerse (geri al) çıkış iptal edilir; yoksa hem
  // listede hem çıkanlarda görünüp iki kez çizilirdi.
  simdi.forEach((_, k) => {
    if (!cikanRef.current.has(k)) return
    cikanRef.current.delete(k)
    const t = zamanlayicilar.current.get(k)
    if (t) { clearTimeout(t); zamanlayicilar.current.delete(k) }
  })

  // ── Görünen liste ───────────────────────────────────────────────────────────
  const gorunen = [...liste]
  ;[...cikanRef.current.values()]
    .sort((a, b) => a.index - b.index)
    .forEach(({ item, index }) => {
      gorunen.splice(Math.min(index, gorunen.length), 0, item)
    })

  // Karşılaştırma tabanı KAYNAK listedir, görünen liste DEĞİL. Görünen listeyi
  // taban almak diriltme döngüsü yaratıyordu: süre dolup öğe bırakılınca bir
  // sonraki render onu yine "ayrılmış" sayıp geri ekliyor, kart opaklık 0'da
  // sonsuza dek ağaçta kalıyordu. Kaynak listede olmadığı için artık bir daha
  // yakalanmaz. İndeks de zaten kaynak sıradaki yeridir.
  oncekiRef.current = liste.map(anahtarla)
  oncekiItemRef.current = simdi

  // ── Süre dolunca bırak ──────────────────────────────────────────────────────
  useEffect(() => {
    cikanRef.current.forEach((_, k) => {
      if (zamanlayicilar.current.has(k)) return
      const t = setTimeout(() => {
        cikanRef.current.delete(k)
        zamanlayicilar.current.delete(k)
        tikla(n => n + 1)
      }, CIKIS_MS)
      zamanlayicilar.current.set(k, t)
    })
  })

  useEffect(() => () => {
    zamanlayicilar.current.forEach(clearTimeout)
    zamanlayicilar.current.clear()
  }, [])

  return { gorunen, cikanAnahtarlar: new Set(cikanRef.current.keys()) }
}
