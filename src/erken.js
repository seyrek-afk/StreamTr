// Erken veri — index.html'den ana paketten BAĞIMSIZ, küçük bir giriş betiği.
//
// Ölçüm (Lighthouse mobil, simüle 4G): vitrin görseline (LCP) giden zincir
// HTML → ana JS (≈105 KB gzip) → React mount → 5 top_rated isteği → görsel.
// Her halka bir gidiş-dönüş; ana JS inip çalışana kadar TMDB'ye tek bayt
// gitmiyordu. Bu betik 1 KB'dır, HTML ayrıştırılır ayrıştırılmaz çalışır,
// varsayılan görünümün (Diziler · Dünya · ilk 5 sayfa) isteklerini başlatır
// ve bekleyen yanıtları globalThis.__streamtrErken'e bırakır; useStreamData
// aynı URL'yi isteyince bekleyen yanıtı alır (bkz. loadListPage). Sayfalar
// gelince vitrinde ilk çıkacak yapımın görselini de <link rel=preload> ile
// ister: görsel, React henüz çizmemişken yola çıkar.
//
// Bilinçli olarak hiçbir modül import etmez: paylaşılan bir parça olsaydı
// Vite onu ayrı dosyaya ayırır, bu betik de bir gidiş-dönüş daha beklerdi.
// Sıralama kuralı App.jsx'teki varsayılanın kopyasıdır (imdbScore azalan,
// eşitlikte sayfa sırası); orası değişirse burası da değişmeli — yanlış
// aday yalnız boşa 50 KB indirir, görünüm bozulmaz.
const BASE = 'https://api.themoviedb.org/3'
const IMG = 'https://image.tmdb.org/t/p/'
const SAYFA = 5
const SIZES = '(max-width: 639px) calc(100vw - 32px), 54vw' // HeroSlider ile birebir

export function listeUrl(key, page) {
  return `${BASE}/tv/top_rated?language=tr-TR&page=${page}&api_key=${key}`
}

// Vitrinin ilk slaydı: tüm sayfalarda en yüksek (1 ondalığa yuvarlanmış)
// vote_average; eşitlikte sayfa/sıra önceliği (kararlı sıralama gibi).
export function vitrinAdayi(sayfalar) {
  let aday = null
  let enIyi = -Infinity
  for (const sayfa of sayfalar) {
    for (const r of (sayfa?.results || [])) {
      const puan = r.vote_average ? Number(r.vote_average.toFixed(1)) : 0
      if (puan > enIyi) { enIyi = puan; aday = r }
    }
  }
  return aday?.backdrop_path || null
}

export function gorseliOnYukle(path, doc = document) {
  if (!path || doc.querySelector('link[data-erken-vitrin]')) return null
  const l = doc.createElement('link')
  l.rel = 'preload'
  l.as = 'image'
  l.href = `${IMG}w780${path}`
  l.imageSrcset = `${IMG}w780${path} 780w, ${IMG}w1280${path} 1280w`
  l.imageSizes = SIZES
  l.fetchPriority = 'high'
  l.dataset.erkenVitrin = '1'
  doc.head.appendChild(l)
  return l
}

export function baslat({ key, fetcher = fetch, doc = document } = {}) {
  if (!key) return null
  const havuz = (globalThis.__streamtrErken ||= new Map())
  const istekler = []
  for (let p = 1; p <= SAYFA; p++) {
    const url = listeUrl(key, p)
    const istek = fetcher(url, { signal: AbortSignal.timeout(10_000) })
    havuz.set(url, istek)
    // Gövde iki kez okunamaz: uygulama orijinali tüketir, aday seçimi kopyayı.
    istekler.push(istek.then(r => (r.ok ? r.clone().json() : null)).catch(() => null))
  }
  Promise.all(istekler).then(sayfalar => gorseliOnYukle(vitrinAdayi(sayfalar), doc)).catch(() => {})
  return havuz
}

// Test ortamında (vitest, MODE=test) yan etki yok; tarayıcıda hemen başlar.
if (import.meta.env.MODE !== 'test' && typeof document !== 'undefined') {
  baslat({ key: import.meta.env.VITE_TMDB_KEY })
}
