import { useState, useRef, useCallback } from 'react'
import { MOCK_DIZILER, MOCK_FILMLER, MOCK_TREND } from '../data/mockData.js'
import { fetchTrPlatforms } from '../lib/tmdb.js'
import { tmdbToListCard, tmdbToTrendCard } from '../lib/cards.js'
import { discoverUrl, listParams, poolMean, weightedScore } from '../lib/discover.js'

const TMDB_BASE = 'https://api.themoviedb.org/3'
const TMDB_KEY  = import.meta.env.VITE_TMDB_KEY

// Modül düzeyi önbellek: "mediaType:id" → string[] (oturum boyunca korunur)
const providerCache = new Map()

const PAGE_SIZE = 30
const MAX_ITEMS = 250

// ── Veri anahtarları ─────────────────────────────────────────────────────────
// Durum, sekme değil (ülke, sekme) İKİLİSİ ile anahtarlanır: "diziler" (dünya),
// "TR:diziler", "KR:filmler"… Aksi halde mercek değiştirince aynı gözde farklı
// veri kümesi tutulur ve geri dönüşte yeniden çekmek gerekirdi; bu anahtarlama
// sayesinde her mercek kendi önbelleğini korur.
//
// Ülke kümesi çalışma anında seçildiği için anahtarlar önceden üretilemez;
// durum haritaları seyrek tutulur ve okuma tarafında varsayılana düşülür.
export function dataKey(country, tab) {
  return country ? `${country}:${tab}` : tab
}

// Anahtarı (ülke, sekme) ikilisine ayırır.
export function parseKey(key) {
  const i = key.indexOf(':')
  return i === -1
    ? { country: null, tab: key }
    : { country: key.slice(0, i), tab: key.slice(i + 1) }
}

// Sekme → medya türü. Dünya modunda top_rated yolu da buradan türetilir.
const TAB_MEDIA = { diziler: 'tv', filmler: 'movie' }
const WORLD_PATH = { diziler: 'tv/top_rated', filmler: 'movie/top_rated' }

// Bu anahtar sayfalanabilir bir liste mi (trend değil)?
function isListKey(key) {
  return Boolean(TAB_MEDIA[parseKey(key).tab])
}

// ── TMDB haftalık trend → 5 sayfa ≈ 100 içerik ──────────────────────────────
async function loadTrendFromTMDB() {
  const PAGES = 5
  const promises = Array.from({ length: PAGES }, (_, i) =>
    fetch(
      `${TMDB_BASE}/trending/all/week?language=tr-TR&page=${i + 1}&api_key=${TMDB_KEY}`,
      { signal: AbortSignal.timeout(10_000) }
    ).then(r => {
      if (!r.ok) throw new Error(`TMDB ${r.status}`)
      return r.json()
    })
  )

  const results = await Promise.allSettled(promises)
  const items = []
  for (const result of results) {
    if (result.status === 'fulfilled') {
      for (const r of (result.value.results || [])) {
        if (r.media_type === 'movie' || r.media_type === 'tv') items.push(r)
      }
    }
  }
  if (items.length === 0) throw new Error('TMDB trend verisi alınamadı')
  return items.slice(0, MAX_ITEMS).map((item, i) => tmdbToTrendCard(item, i + 1))
}

// ── Ülke trendi → o ülke kökenli dizi + film, popülerliğe göre ──────────────
// trending/all/week küreseldir; yerel yapımlar oraya ancak istisnai olarak girer.
// Bu yüzden ülke trendi, discover'ın popülerlik sıralamasından türetilir.
// Dizi ve film ayrı uçlardan gelir (discover karışık tür döndürmez), birleştirilip
// popülerliğe göre yeniden sıralanır — sıra numarası ancak birleşimden sonra anlamlı.
async function loadCountryTrend(country) {
  const PAGES = 3
  const jobs = []
  for (const mediaType of ['tv', 'movie']) {
    for (let p = 1; p <= PAGES; p++) {
      jobs.push(
        fetch(
          discoverUrl(mediaType, { country, page: p, apiKey: TMDB_KEY, sort_by: 'popularity.desc' }),
          { signal: AbortSignal.timeout(10_000) }
        )
          .then(r => {
            if (!r.ok) throw new Error(`TMDB ${r.status}`)
            return r.json()
          })
          .then(j => (j.results || []).map(r => ({ ...r, media_type: mediaType })))
      )
    }
  }

  const settled = await Promise.allSettled(jobs)
  const items = []
  for (const s of settled) {
    if (s.status === 'fulfilled') items.push(...s.value)
  }
  if (items.length === 0) throw new Error('Ülke trend verisi alınamadı')

  items.sort((a, b) => (b.popularity || 0) - (a.popularity || 0))
  return items.slice(0, MAX_ITEMS).map((item, i) => tmdbToTrendCard(item, i + 1))
}

// ── Tek sayfa liste getir (dünya top_rated veya ülke discover) ─────────────
// poolC: havuz ortalaması; ağırlıklı puanı besler (ülkeye göre değişir).
async function loadListPage(key, page, poolC = null) {
  const { country, tab } = parseKey(key)
  const mediaType = TAB_MEDIA[tab]
  const url = country
    ? discoverUrl(mediaType, { country, page, apiKey: TMDB_KEY, ...listParams() })
    : `${TMDB_BASE}/${WORLD_PATH[tab]}?language=tr-TR&page=${page}&api_key=${TMDB_KEY}`

  const res = await fetch(url, { signal: AbortSignal.timeout(10_000) })
  if (!res.ok) throw new Error(`TMDB ${res.status}`)
  const json = await res.json()
  const raw = json.results || []
  // Havuz ortalaması dışarıdan gelmediyse bu sayfadan tahmin et; yeterli örnek
  // yoksa poolMean null döner ve ağırlıklı puan yedek sabite düşer.
  const c = poolC ?? poolMean(raw)
  const items = raw.map(r => tmdbToListCard(r, mediaType, country, c))
  return { items, totalPages: json.total_pages || page }
}

// ── Seyrek durum haritaları ─────────────────────────────────────────────────
// Ülke kümesi çalışma anında büyüdüğü için anahtarlar önceden üretilemez.
// Okuma tarafı varsayılana düşer (bkz. withDefault).
function emptyTab() {
  return {}
}

// Seyrek haritayı "her bilinmeyen anahtar için varsayılan" davranışına sarar.
// Böylece App `data['KR:diziler']` gibi henüz hiç yüklenmemiş bir anahtarı
// okuduğunda undefined yerine boş dizi görür ve `.length` patlamaz.
function withDefault(obj, dflt) {
  return new Proxy(obj, {
    get: (t, k) => (k in t ? t[k] : dflt),
  })
}

const MOCK_SOURCE = {
  diziler: MOCK_DIZILER,
  filmler: MOCK_FILMLER,
}

// İlk yüklemede diziler/filmler için kaç TMDB sayfası çekilsin (20 öğe/sayfa)
// 5 sayfa ≈ 100 içerik paralel yüklenir; gerisi "Daha Çok Göster" ile 250'ye kadar.
const INITIAL_PAGES = 5

// ── Hook ─────────────────────────────────────────────────────────────────────
export function useStreamData() {
  const [data,        setData]        = useState(emptyTab([]))
  const [loading,     setLoading]     = useState(emptyTab(false))
  const [loadingMore, setLoadingMore] = useState(emptyTab(false))
  const [error,       setError]       = useState(emptyTab(null))
  const [visible,     setVisible]     = useState(emptyTab(PAGE_SIZE))
  const [hasMore,     setHasMore]     = useState(emptyTab(true))
  const [loaded,      setLoaded]      = useState(emptyTab(false))
  const [enriching,   setEnriching]   = useState(emptyTab(false))

  // TMDB liste tabları için sayfa imleci
  const pageRef       = useRef(emptyTab(0))
  const totalPagesRef = useRef(emptyTab(Infinity))

  // Her enrichment turu için AbortController — sekme değişince iptal edilir
  const enrichAbortRef = useRef(emptyTab(null))

  // Bu tabdan ağ üzerinden DAHA fazla içerik çekilebilir mi?
  // Seyrek haritalarda imleçler henüz yoksa varsayılana düşülür (0 / Infinity),
  // aksi halde `undefined < undefined` false verip sayfalamayı sessizce kapatır.
  const networkMore = (tab, total) => {
    if (!TMDB_KEY || !isListKey(tab)) return false
    const page  = pageRef.current[tab] ?? 0
    const total_ = totalPagesRef.current[tab] ?? Infinity
    return total < MAX_ITEMS && page < total_
  }

  // Arka planda kartların platforms alanını doldurur.
  // items: tmdbToTrendCard/tmdbToListCard ile üretilmiş kart dizisi
  // tab: hangi sekme (iptal takibi için)
  // signal: AbortController.signal
  const enrichPlatforms = useCallback(async (items, tab, signal) => {
    if (!TMDB_KEY) return

    const needsEnrich = items.filter(
      item => item._tmdbId && item._mediaType &&
        !providerCache.has(`${item._mediaType}:${item._tmdbId}`)
    )
    if (needsEnrich.length === 0) {
      // Önbellekten in-place güncelle
      setData(prev => {
        const current = prev[tab]
        if (!current || current.length === 0) return prev
        let changed = false
        const next = current.map(item => {
          const key = `${item._mediaType}:${item._tmdbId}`
          if (item._tmdbId && providerCache.has(key) && item.platforms.length === 0) {
            changed = true
            return { ...item, platforms: providerCache.get(key) }
          }
          return item
        })
        return changed ? { ...prev, [tab]: next } : prev
      })
      return
    }

    setEnriching(prev => ({ ...prev, [tab]: true }))

    const CONCURRENCY = 7
    let idx = 0

    const worker = async () => {
      while (idx < needsEnrich.length) {
        if (signal.aborted) return
        const item = needsEnrich[idx++]
        const cacheKey = `${item._mediaType}:${item._tmdbId}`
        if (providerCache.has(cacheKey)) {
          // Zaten başka worker çekti
          continue
        }
        const platforms = await fetchTrPlatforms(item._mediaType, item._tmdbId, signal)
        if (signal.aborted) return
        providerCache.set(cacheKey, platforms)

        // In-place güncelle — yalnızca bu kartın platforms alanını değiştir
        setData(prev => {
          const current = prev[tab]
          if (!current) return prev
          const next = current.map(c =>
            c._tmdbId === item._tmdbId && c._mediaType === item._mediaType
              ? { ...c, platforms }
              : c
          )
          return { ...prev, [tab]: next }
        })
      }
    }

    const workers = Array.from({ length: Math.min(CONCURRENCY, needsEnrich.length) }, worker)
    await Promise.allSettled(workers)

    if (!signal.aborted) {
      // Önbellekte olan ama henüz state'e yazılmamış olanları da temizle
      setData(prev => {
        const current = prev[tab]
        if (!current) return prev
        let changed = false
        const next = current.map(item => {
          const key = `${item._mediaType}:${item._tmdbId}`
          if (item._tmdbId && providerCache.has(key) && item.platforms.length === 0) {
            const cached = providerCache.get(key)
            if (cached.length > 0) {
              changed = true
              return { ...item, platforms: cached }
            }
          }
          return item
        })
        return changed ? { ...prev, [tab]: next } : prev
      })
      setEnriching(prev => ({ ...prev, [tab]: false }))
    }
  }, [])

  const fetchTab = async (tab, force = false) => {
    if (!force && loaded[tab]) return

    // Önceki enrichment turunu iptal et
    if (enrichAbortRef.current[tab]) {
      enrichAbortRef.current[tab].abort()
    }

    setLoading(p => ({ ...p, [tab]: true }))
    setError(p   => ({ ...p, [tab]: null }))

    try {
      let items

      const { country, tab: baseTab } = parseKey(tab)

      if (baseTab === 'trend') {
        if (TMDB_KEY) {
          items = country ? await loadCountryTrend(country) : await loadTrendFromTMDB()
        } else {
          // TMDB anahtarı yoksa mock veriye dön
          await new Promise(r => setTimeout(r, 400))
          items = MOCK_TREND
        }
      } else if (isListKey(tab) && TMDB_KEY) {
        // diziler / filmler: ilk sayfaları PARALEL çek (hızlı, zengin ilk görünüm).
        // Bir sayfa hata verirse diğerleri yine de gösterilir.
        pageRef.current[tab]       = 0
        totalPagesRef.current[tab] = Infinity
        const settled = await Promise.allSettled(
          Array.from({ length: INITIAL_PAGES }, (_, i) => loadListPage(tab, i + 1))
        )
        const acc = []
        let tp = Infinity
        let anyOk = false
        for (const s of settled) {
          if (s.status === 'fulfilled') {
            anyOk = true
            acc.push(...s.value.items)
            tp = s.value.totalPages
          }
        }
        if (!anyOk) throw new Error('TMDB listesi yüklenemedi')
        pageRef.current[tab]       = Math.min(INITIAL_PAGES, tp)
        totalPagesRef.current[tab] = tp
        items = acc.slice(0, MAX_ITEMS)

        // Havuz ortalaması ancak tüm sayfalar geldikten sonra güvenilir olur;
        // sayfa başına hesaplanan ortalama 20 örnekle gürültülüdür. Ülke havuzları
        // birbirinden farklı (TR dizi 7.61 / film 6.25) olduğu için ağırlıklı
        // puanlar burada TAM küme ortalamasıyla yeniden hesaplanır.
        const c = poolMean(items, 40)
        if (c && country) {
          const mediaType = TAB_MEDIA[baseTab]
          items = items.map(it => ({
            ...it,
            _weightedScore: weightedScore(it.imdbScore, it._voteCount, mediaType, c),
          }))
        }
      } else {
        // TMDB anahtarı yoksa mock veriye dön
        await new Promise(r => setTimeout(r, 400))
        items = MOCK_SOURCE[baseTab] || []
      }

      setData(p    => ({ ...p, [tab]: items }))
      setVisible(p => ({ ...p, [tab]: PAGE_SIZE }))
      setHasMore(p => ({ ...p, [tab]: networkMore(tab, items.length) || items.length > PAGE_SIZE }))
      setLoaded(p  => ({ ...p, [tab]: true }))

      // Arka planda platform zenginleştirme — ilk render'ı bloklama
      if (TMDB_KEY && items.some(i => i._tmdbId && i._mediaType)) {
        const ctrl = new AbortController()
        enrichAbortRef.current[tab] = ctrl
        enrichPlatforms(items, tab, ctrl.signal)
      }
    } catch (e) {
      setError(p => ({ ...p, [tab]: e.message || 'Bilinmeyen hata' }))
    } finally {
      setLoading(p => ({ ...p, [tab]: false }))
    }
  }

  const showMore = async (tab) => {
    // Seyrek harita: henüz yüklenmemiş anahtarda varsayılana düş.
    const current = data[tab] || []
    const total   = current.length
    const desired = Math.min((visible[tab] ?? PAGE_SIZE) + PAGE_SIZE, MAX_ITEMS)

    // Yeterli yüklü veri var veya ağdan çekilemiyor → sadece görünürü artır
    if (desired <= total || !networkMore(tab, total)) {
      const capped = Math.min(desired, total)
      setVisible(p => ({ ...p, [tab]: capped }))
      if (capped >= total && !networkMore(tab, total)) {
        setHasMore(p => ({ ...p, [tab]: false }))
      }
      return
    }

    // Ağdan daha fazla içerik getir (250 sınırına kadar)
    setLoadingMore(p => ({ ...p, [tab]: true }))
    try {
      let acc = current.slice()
      while (acc.length < desired && acc.length < MAX_ITEMS &&
             (pageRef.current[tab] ?? 0) < (totalPagesRef.current[tab] ?? Infinity)) {
        const { items: pageItems, totalPages } = await loadListPage(tab, (pageRef.current[tab] ?? 0) + 1)
        pageRef.current[tab]      += 1
        totalPagesRef.current[tab] = totalPages
        acc.push(...pageItems)
      }
      acc = acc.slice(0, MAX_ITEMS)
      setData(p    => ({ ...p, [tab]: acc }))
      setVisible(p => ({ ...p, [tab]: Math.min(desired, acc.length) }))
      setHasMore(p => ({ ...p, [tab]: networkMore(tab, acc.length) }))
    } catch {
      // sessizce bırak; mevcut veri korunur
    } finally {
      setLoadingMore(p => ({ ...p, [tab]: false }))
    }
  }

  const retry = (tab) => {
    if (enrichAbortRef.current[tab]) {
      enrichAbortRef.current[tab].abort()
      enrichAbortRef.current[tab] = null
    }
    setLoaded(p => ({ ...p, [tab]: false }))
    fetchTab(tab, true)
  }

  return {
    data:        withDefault(data,        []),
    loading:     withDefault(loading,     false),
    loadingMore: withDefault(loadingMore, false),
    error:       withDefault(error,       null),
    visible:     withDefault(visible,     PAGE_SIZE),
    hasMore:     withDefault(hasMore,     true),
    enriching:   withDefault(enriching,   false),
    fetchTab, showMore, retry,
  }
}
