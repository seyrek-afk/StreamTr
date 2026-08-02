import { useState, useRef, useCallback } from 'react'
import { MOCK_DIZILER, MOCK_FILMLER, MOCK_TREND } from '../data/mockData.js'
import { fetchTrPlatforms } from '../lib/tmdb.js'
import { tmdbToListCard, tmdbToTrendCard } from '../lib/cards.js'
import { discoverUrl, yerliListParams } from '../lib/yerli.js'

const TMDB_BASE = 'https://api.themoviedb.org/3'
const TMDB_KEY  = import.meta.env.VITE_TMDB_KEY

// Modül düzeyi önbellek: "mediaType:id" → string[] (oturum boyunca korunur)
const providerCache = new Map()

const PAGE_SIZE = 30
const MAX_ITEMS = 250

// ── Veri anahtarları ─────────────────────────────────────────────────────────
// Durum, sekme değil (mercek, sekme) İKİLİSİ ile anahtarlanır. Aksi halde mercek
// değiştirince aynı gözde farklı veri kümesi tutulur ve geri dönüşte yeniden
// çekmek gerekirdi; bu anahtarlama sayesinde iki mercek de kendi önbelleğini korur.
export const DATA_KEYS = [
  'diziler', 'filmler', 'trend',
  'yerli:diziler', 'yerli:filmler', 'yerli:trend',
]

// Mercek + sekme → veri anahtarı. App bu fonksiyonu kullanır.
export function dataKey(lens, tab) {
  return lens === 'yerli' ? `yerli:${tab}` : tab
}

// diziler/filmler için liste uç noktaları.
// Dünya: TMDB top_rated (Bayesian eşikli, küresel).
// Yerli: /discover + with_origin_country=TR (bkz. lib/yerli.js gerekçesi).
const LIST_ENDPOINT = {
  'diziler':       { path: 'tv/top_rated',    mediaType: 'tv'    },
  'filmler':       { path: 'movie/top_rated', mediaType: 'movie' },
  'yerli:diziler': { mediaType: 'tv',    yerli: true },
  'yerli:filmler': { mediaType: 'movie', yerli: true },
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

// ── Yerli trend → TR kökenli dizi + film, popülerliğe göre ──────────────────
// trending/all/week küreseldir; Türk yapımları oraya ancak istisnai olarak girer.
// Bu yüzden yerli trend, discover'ın popülerlik sıralamasından türetilir.
// Dizi ve film ayrı uçlardan gelir (discover karışık tür döndürmez), birleştirilip
// popülerliğe göre yeniden sıralanır — sıra numarası ancak birleşimden sonra anlamlı.
async function loadYerliTrend() {
  const PAGES = 3
  const jobs = []
  for (const mediaType of ['tv', 'movie']) {
    for (let p = 1; p <= PAGES; p++) {
      jobs.push(
        fetch(
          discoverUrl(mediaType, { page: p, apiKey: TMDB_KEY, sort_by: 'popularity.desc' }),
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
  if (items.length === 0) throw new Error('Yerli trend verisi alınamadı')

  items.sort((a, b) => (b.popularity || 0) - (a.popularity || 0))
  return items.slice(0, MAX_ITEMS).map((item, i) => tmdbToTrendCard(item, i + 1))
}

// ── Tek sayfa liste getir (dünya top_rated veya yerli discover) ─────────────
async function loadListPage(key, page) {
  const ep = LIST_ENDPOINT[key]
  const url = ep.yerli
    ? discoverUrl(ep.mediaType, { page, apiKey: TMDB_KEY, ...yerliListParams() })
    : `${TMDB_BASE}/${ep.path}?language=tr-TR&page=${page}&api_key=${TMDB_KEY}`

  const res = await fetch(url, { signal: AbortSignal.timeout(10_000) })
  if (!res.ok) throw new Error(`TMDB ${res.status}`)
  const json = await res.json()
  const items = (json.results || []).map(r => tmdbToListCard(r, ep.mediaType, Boolean(ep.yerli)))
  return { items, totalPages: json.total_pages || page }
}

// ── Tüm veri anahtarları için başlangıç durumu ──────────────────────────────
function emptyTab(val) {
  const out = {}
  for (const k of DATA_KEYS) out[k] = val
  return out
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
  const networkMore = (tab, total) => {
    if (!TMDB_KEY || !LIST_ENDPOINT[tab]) return false
    return total < MAX_ITEMS && pageRef.current[tab] < totalPagesRef.current[tab]
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

      if (tab === 'trend' || tab === 'yerli:trend') {
        if (TMDB_KEY) {
          items = tab === 'trend' ? await loadTrendFromTMDB() : await loadYerliTrend()
        } else {
          // TMDB anahtarı yoksa mock veriye dön
          await new Promise(r => setTimeout(r, 400))
          items = MOCK_TREND
        }
      } else if (LIST_ENDPOINT[tab] && TMDB_KEY) {
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
      } else {
        // TMDB anahtarı yoksa mock veriye dön
        await new Promise(r => setTimeout(r, 400))
        items = MOCK_SOURCE[tab] || MOCK_SOURCE[tab.replace('yerli:', '')] || []
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
    const total   = data[tab].length
    const desired = Math.min(visible[tab] + PAGE_SIZE, MAX_ITEMS)

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
      let acc = data[tab].slice()
      while (acc.length < desired && acc.length < MAX_ITEMS &&
             pageRef.current[tab] < totalPagesRef.current[tab]) {
        const { items: pageItems, totalPages } = await loadListPage(tab, pageRef.current[tab] + 1)
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

  return { data, loading, loadingMore, error, visible, hasMore, enriching, fetchTab, showMore, retry }
}
