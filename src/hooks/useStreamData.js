import { useState, useRef, useCallback } from 'react'
import { fetchTrPlatforms } from '../lib/tmdb.js'
import { providerCache } from '../lib/platforms.js'
import { tmdbToListCard, tmdbToTrendCard } from '../lib/cards.js'
import { discoverUrl, listParams, poolMean, weightedScore } from '../lib/discover.js'
import { isAnimation, withoutAnimation } from '../lib/listLogic.js'

const TMDB_BASE = 'https://api.themoviedb.org/3'
const TMDB_KEY  = import.meta.env.VITE_TMDB_KEY

// Platform önbelleği lib/platforms.js'te PAYLAŞILIR: aynı yapım hem burada
// hem favorilerde/önerilerde görünebilir, ikinci kez çekilmesin.

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
const TREND_PAGES = 5

async function fetchTrendPages(pages) {
  const promises = pages.map(page =>
    fetch(
      `${TMDB_BASE}/trending/all/week?language=tr-TR&page=${page}&api_key=${TMDB_KEY}`,
      { signal: AbortSignal.timeout(10_000) }
    ).then(r => {
      if (!r.ok) throw new Error(`TMDB ${r.status}`)
      return r.json()
    })
  )

  const results = await Promise.allSettled(promises)
  const items = []
  let totalPages = null
  let okCount = 0
  for (const result of results) {
    if (result.status === 'fulfilled') {
      okCount++
      if (result.value.total_pages) totalPages = result.value.total_pages
      for (const r of (result.value.results || [])) {
        if (r.media_type === 'movie' || r.media_type === 'tv') items.push(r)
      }
    } else {
      console.warn('TMDB trend sayfası alınamadı:', result.reason?.message || result.reason)
    }
  }
  return { items, totalPages, okCount }
}

async function loadTrendFromTMDB() {
  const pages = Array.from({ length: TREND_PAGES }, (_, i) => i + 1)
  const { items, totalPages } = await fetchTrendPages(pages)
  if (items.length === 0) throw new Error('TMDB trend verisi alınamadı')
  return {
    cards: items.slice(0, MAX_ITEMS).map((item, i) => tmdbToTrendCard(item, i + 1)),
    totalPages: totalPages ?? TREND_PAGES,
  }
}

// ── Ülke trendi → o ülke kökenli dizi + film, popülerliğe göre ──────────────
// trending/all/week küreseldir; yerel yapımlar oraya ancak istisnai olarak girer.
// Bu yüzden ülke trendi, discover'ın popülerlik sıralamasından türetilir.
// Dizi ve film ayrı uçlardan gelir (discover karışık tür döndürmez), birleştirilip
// popülerliğe göre yeniden sıralanır — sıra numarası ancak birleşimden sonra anlamlı.
const COUNTRY_TREND_PAGES = 3
const COUNTRY_TREND_MAX_PAGES = 7
const TREND_MEDIA = ['tv', 'movie']

async function fetchCountryTrendPages(country, pagesByType) {
  const jobs = []
  for (const mediaType of TREND_MEDIA) {
    for (const page of (pagesByType[mediaType] || [])) {
      jobs.push(
        fetch(
          discoverUrl(mediaType, { country, page, apiKey: TMDB_KEY, sort_by: 'popularity.desc' }),
          { signal: AbortSignal.timeout(10_000) }
        )
          .then(r => {
            if (!r.ok) throw new Error(`TMDB ${r.status}`)
            return r.json()
          })
          .then(j => ({
            mediaType,
            totalPages: j.total_pages || null,
            items: (j.results || []).map(r => ({ ...r, media_type: mediaType })),
          }))
      )
    }
  }

  const settled = await Promise.allSettled(jobs)
  const items = []
  const totals = {}
  let okCount = 0
  for (const s of settled) {
    if (s.status === 'fulfilled') {
      okCount++
      items.push(...s.value.items)
      if (s.value.totalPages) totals[s.value.mediaType] = s.value.totalPages
    } else {
      console.warn('TMDB ülke trend sayfası alınamadı:', s.reason?.message || s.reason)
    }
  }
  return { items, totals, okCount }
}

function rankCountryTrend(rawItems) {
  return [...rawItems]
    .sort((a, b) => (b.popularity || 0) - (a.popularity || 0))
    .slice(0, MAX_ITEMS)
    .map((item, i) => tmdbToTrendCard(item, i + 1))
}

async function loadCountryTrend(country) {
  const firstPages = Array.from({ length: COUNTRY_TREND_PAGES }, (_, i) => i + 1)
  const { items, totals } = await fetchCountryTrendPages(country, { tv: firstPages, movie: firstPages })
  if (items.length === 0) throw new Error('Ülke trend verisi alınamadı')
  const cursor = {}
  for (const mediaType of TREND_MEDIA) {
    cursor[mediaType] = { page: COUNTRY_TREND_PAGES, total: totals[mediaType] ?? COUNTRY_TREND_PAGES }
  }
  return { cards: rankCountryTrend(items), raw: items, cursor }
}

// ── Tek sayfa liste getir (dünya top_rated veya ülke discover) ─────────────
// poolC: havuz ortalaması; ağırlıklı puanı besler (ülkeye göre değişir).
async function loadListPage(key, page, poolC = null) {
  const { country, tab } = parseKey(key)
  const mediaType = TAB_MEDIA[tab]
  const url = country
    ? discoverUrl(mediaType, { country, page, apiKey: TMDB_KEY, ...listParams() })
    : `${TMDB_BASE}/${WORLD_PATH[tab]}?language=tr-TR&page=${page}&api_key=${TMDB_KEY}`

  // Erken başlatılmış istek varsa (bkz. src/erken.js: index.html'deki küçük
  // betik ana paket inmeden varsayılan görünümün sayfalarını ister) onu
  // kullan; yanıt çoktan yoldadır. Tek kullanımlık — havuzdan silinir ki
  // ikinci yükleme (yenile) taze istek atsın.
  const havuz = globalThis.__streamtrErken
  const bekleyen = havuz?.get(url)
  if (bekleyen) havuz.delete(url)
  const res = await (bekleyen || fetch(url, { signal: AbortSignal.timeout(10_000) }))
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

// Mock veri (TMDB anahtarı yokken) tembel iner: 47 KB'lık dosya üretimde hiç
// kullanılmaz, ana pakette taşınması ilk boyamayı geciktiriyordu.
const mockVeri = () => import('../data/mockData.js')

// İlk yüklemede diziler/filmler için kaç TMDB sayfası çekilsin (20 öğe/sayfa)
// 5 sayfa ≈ 100 içerik paralel yüklenir; gerisi "Daha Çok Göster" ile 250'ye kadar.
const INITIAL_PAGES = 5

// Animasyonlar gizliyken ilk görünüm animasyonsuz öğeyle bu sayıya tamamlanır.
const FILL_TARGET = 100
const FILL_MAX_PAGES = 15
const FILL_BATCH_MAX = 5
const FILL_MIN_RATIO = 0.05
const ITEMS_PER_PAGE = 20
const MAX_LIST_PAGES = 25
const ENRICH_TIMEOUT_MS = 10_000

const itemKey = (item) => `${item._mediaType}:${item._tmdbId}`

function appendUnique(current, fresh) {
  const base = current || []
  const seen = new Set(base.map(itemKey))
  const additions = []
  for (const item of fresh) {
    const k = itemKey(item)
    if (seen.has(k)) continue
    seen.add(k)
    additions.push(item)
  }
  return additions.length ? [...base, ...additions] : base
}

function keepPlatforms(current, next) {
  const known = new Map()
  for (const item of (current || [])) {
    if (item.platforms?.length > 0) known.set(itemKey(item), item.platforms)
  }
  return next.map(item => {
    const k = itemKey(item)
    const platforms = known.get(k) || providerCache.get(k)
    return platforms?.length > 0 ? { ...item, platforms } : item
  })
}

function pageRange(from, to) {
  const pages = []
  for (let p = from; p <= to; p++) pages.push(p)
  return pages
}

function fillBatchSize(count, rawCount) {
  const missing = FILL_TARGET - count
  const ratio = rawCount > 0 ? count / rawCount : 1
  const needed = Math.ceil(missing / (Math.max(ratio, FILL_MIN_RATIO) * ITEMS_PER_PAGE))
  return Math.min(FILL_BATCH_MAX, Math.max(1, needed))
}

// ── Hook ─────────────────────────────────────────────────────────────────────
export function useStreamData({ hideAnimation = false } = {}) {
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
  // Anahtarın son zenginleştirme turu (tamamlama turları bunun arkasına sıralanır)
  const enrichRunRef = useRef({})
  // Gizliyken zenginleştirilmeyen (görünmeyen) animasyonlu tamamlama kartları
  const skippedEnrichRef = useRef({})

  const hideRef = useRef(hideAnimation)
  hideRef.current = hideAnimation

  const genRef         = useRef({})
  const inflightRef    = useRef({})
  const busyRef        = useRef({})
  const poolCRef       = useRef({})
  const trendRawRef    = useRef({})
  const trendCursorRef = useRef({})

  const countOf = (items, hide = hideRef.current) =>
    hide ? withoutAnimation(items).length : (items || []).length

  // Bu tabdan ağ üzerinden DAHA fazla içerik çekilebilir mi?
  // Seyrek haritalarda imleçler henüz yoksa varsayılana düşülür (0 / Infinity),
  // aksi halde `undefined < undefined` false verip sayfalamayı sessizce kapatır.
  // Sayfa tavanı moddan bağımsızdır: gösterilirken 250 öğe ≈13 sayfa eder; tavan
  // yalnız boş/bozuk sayfa dönen yukarı akışta ardışık istek selini keser.
  const networkMore = (tab, total) => {
    if (!TMDB_KEY || !isListKey(tab)) return false
    const page  = pageRef.current[tab] ?? 0
    const total_ = totalPagesRef.current[tab] ?? Infinity
    return total < MAX_ITEMS && page < total_ && page < MAX_LIST_PAGES
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
        // İstek başına süre sınırı: yanıt vermeyen tek istek turu (ve arkasına
        // sıralanan tamamlama turlarını) kilitlemesin.
        const itemCtrl = new AbortController()
        const stop = () => itemCtrl.abort()
        signal.addEventListener('abort', stop)
        const timer = setTimeout(stop, ENRICH_TIMEOUT_MS)
        let platforms
        try {
          platforms = await fetchTrPlatforms(item._mediaType, item._tmdbId, itemCtrl.signal)
        } finally {
          clearTimeout(timer)
          signal.removeEventListener('abort', stop)
        }
        if (signal.aborted) return
        // Zaman aşımı "platform yok" demek değil: önbelleğe yazılmaz, sonraki tur yeniden dener.
        if (itemCtrl.signal.aborted) continue
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

  const isCurrent = (tab, gen) => (genRef.current[tab] ?? 0) === gen

  const enrichSignal = (tab) => {
    let ctrl = enrichAbortRef.current[tab]
    if (!ctrl || ctrl.signal.aborted) {
      ctrl = new AbortController()
      enrichAbortRef.current[tab] = ctrl
    }
    return ctrl.signal
  }

  // Tamamlama partilerinin zenginleştirmesi anahtarın önceki turunun ARKASINA
  // sıralanır. Her parti ayrı 7'lik tur açsaydı eşzamanlı watch/providers isteği
  // 7·(1+parti)'ye çıkardı (TMDB oran sınırı → 429 → boş platform önbelleği).
  const queueEnrich = (tab, items) => {
    const signal = enrichSignal(tab)
    const prev = enrichRunRef.current[tab] || Promise.resolve()
    enrichRunRef.current[tab] = prev
      .catch(e => console.warn('Platform zenginleştirme turu başarısız:', e?.message || e))
      .then(() => (signal.aborted ? undefined : enrichPlatforms(items, tab, signal)))
  }

  const fillListStep = async (tab, gen, wanted) => {
    const pageNow = pageRef.current[tab] ?? 0
    const limit = Math.min(FILL_MAX_PAGES, totalPagesRef.current[tab] ?? Infinity)
    const pages = pageRange(pageNow + 1, Math.min(pageNow + wanted, limit))
    if (pages.length === 0) return { status: 'exhausted' }
    const poolC = poolCRef.current[tab] ?? null
    const settled = await Promise.allSettled(pages.map(p => loadListPage(tab, p, poolC)))
    if (!isCurrent(tab, gen)) return { status: 'stale' }
    const cards = []
    let okCount = 0
    for (const s of settled) {
      if (s.status === 'fulfilled') {
        okCount++
        cards.push(...s.value.items)
        totalPagesRef.current[tab] = s.value.totalPages
      } else {
        console.warn('Liste tamamlama sayfası alınamadı:', s.reason?.message || s.reason)
      }
    }
    // Parti tümden düştüyse imleç ilerlemez: sonraki deneme (sekmeye dönüş,
    // "Daha fazla göster") aynı sayfalardan sürer, üst sıradaki sayfalar atlanmaz.
    if (okCount === 0) return { status: 'failed' }
    pageRef.current[tab] = pages[pages.length - 1]
    return { status: 'ok', cards }
  }

  const fillTrendStep = async (tab, gen, wanted, seen) => {
    const pageNow = pageRef.current[tab] ?? TREND_PAGES
    const limit = Math.min(FILL_MAX_PAGES, totalPagesRef.current[tab] ?? Infinity)
    const pages = pageRange(pageNow + 1, Math.min(pageNow + wanted, limit))
    if (pages.length === 0) return { status: 'exhausted' }
    const { items, totalPages, okCount } = await fetchTrendPages(pages)
    if (!isCurrent(tab, gen)) return { status: 'stale' }
    if (okCount === 0) return { status: 'failed' }
    pageRef.current[tab] = pages[pages.length - 1]
    if (totalPages) totalPagesRef.current[tab] = totalPages
    const batchSeen = new Set(seen)
    const fresh = []
    for (const item of items) {
      const k = `${item.media_type}:${item.id}`
      if (batchSeen.has(k)) continue
      batchSeen.add(k)
      fresh.push(item)
    }
    const rankBase = seen.size
    return { status: 'ok', cards: fresh.map((item, i) => tmdbToTrendCard(item, rankBase + i + 1)) }
  }

  const fillCountryTrendStep = async (tab, gen, wanted) => {
    const { country } = parseKey(tab)
    const cursor = trendCursorRef.current[tab]
    if (!cursor) return { status: 'exhausted' }
    const pairs = Math.min(2, Math.max(1, Math.ceil(wanted / 2)))
    const pagesByType = {}
    let requested = 0
    for (const mediaType of TREND_MEDIA) {
      const { page, total } = cursor[mediaType]
      const limit = Math.min(COUNTRY_TREND_MAX_PAGES, total)
      pagesByType[mediaType] = pageRange(page + 1, Math.min(page + pairs, limit))
      requested += pagesByType[mediaType].length
    }
    if (requested === 0) return { status: 'exhausted' }
    const { items, totals, okCount } = await fetchCountryTrendPages(country, pagesByType)
    if (!isCurrent(tab, gen)) return { status: 'stale' }
    if (okCount === 0) return { status: 'failed' }
    for (const mediaType of TREND_MEDIA) {
      const pages = pagesByType[mediaType]
      if (pages.length > 0) cursor[mediaType].page = pages[pages.length - 1]
      if (totals[mediaType]) cursor[mediaType].total = totals[mediaType]
    }
    const raw = [...(trendRawRef.current[tab] || [])]
    const known = new Set(raw.map(r => `${r.media_type}:${r.id}`))
    for (const item of items) {
      const k = `${item.media_type}:${item.id}`
      if (known.has(k)) continue
      known.add(k)
      raw.push(item)
    }
    trendRawRef.current[tab] = raw
    return { status: 'ok', cards: rankCountryTrend(raw), replace: true }
  }

  const fillStepFor = (tab) => {
    if (isListKey(tab)) return fillListStep
    const { country, tab: baseTab } = parseKey(tab)
    if (baseTab !== 'trend') return null
    return country ? fillCountryTrendStep : fillTrendStep
  }

  // Animasyonlar gizliyken görünür (animasyonsuz) öğe sayısı FILL_TARGET'a
  // ulaşana dek arka planda ek sayfa çeker; ilk boyamayı bloklamaz.
  const topUp = async (tab, baseItems) => {
    if (!TMDB_KEY || !hideRef.current || busyRef.current[tab]) return
    const step = fillStepFor(tab)
    if (!step) return
    const base = baseItems || []
    let count = countOf(base, true)
    if (count >= FILL_TARGET) return

    const gen = genRef.current[tab] ?? 0
    const token = {}
    busyRef.current[tab] = token
    setLoadingMore(p => ({ ...p, [tab]: true }))
    let seen = new Set(base.map(itemKey))
    let rawCount = base.length
    // Her başarılı tur imleci en az bir sayfa ilerletir; tur sınırı emniyet
    // kemeridir: bir adım imleci ilerletmeden 'ok' dönerse döngü TMDB'yi dövmesin.
    let rounds = 0
    try {
      while (count < FILL_TARGET && hideRef.current && isCurrent(tab, gen) && rounds++ < FILL_MAX_PAGES) {
        const result = await step(tab, gen, fillBatchSize(count, rawCount), seen)
        if (result.status !== 'ok') break

        let fresh
        if (result.replace) {
          const all = result.cards
          fresh = all.filter(c => !seen.has(itemKey(c)))
          seen = new Set(all.map(itemKey))
          rawCount = all.length
          count = countOf(all, true)
          setData(p => ({ ...p, [tab]: keepPlatforms(p[tab], all) }))
        } else {
          fresh = []
          for (const card of result.cards) {
            const k = itemKey(card)
            if (seen.has(k)) continue
            seen.add(k)
            fresh.push(card)
          }
          rawCount += fresh.length
          count += countOf(fresh, true)
          if (fresh.length > 0) setData(p => ({ ...p, [tab]: appendUnique(p[tab], fresh) }))
        }

        // Gizliyken animasyonlu kartlar görünmez; rozetleri yalnız "göster"e
        // geçişte (bkz. fetchTab) bir kez çekilir — mobil veri ve TMDB kotası.
        let toEnrich = fresh
        if (hideRef.current) {
          toEnrich = withoutAnimation(fresh)
          const atlanan = fresh.filter(isAnimation)
          if (atlanan.length > 0) {
            skippedEnrichRef.current[tab] = [...(skippedEnrichRef.current[tab] || []), ...atlanan]
          }
        }
        if (toEnrich.some(i => i._tmdbId && i._mediaType)) {
          queueEnrich(tab, toEnrich)
        }
      }
      if (isCurrent(tab, gen)) {
        const finalCount = count
        setHasMore(p => ({ ...p, [tab]: networkMore(tab, finalCount) || finalCount > PAGE_SIZE }))
      }
    } catch (e) {
      console.warn('Animasyonsuz tamamlama başarısız:', e?.message || e)
    } finally {
      if (busyRef.current[tab] === token) {
        busyRef.current[tab] = null
        setLoadingMore(p => ({ ...p, [tab]: false }))
      }
    }
  }

  const fetchTab = async (tab, force = false) => {
    if (!force && loaded[tab]) {
      if (hideRef.current) {
        topUp(tab, data[tab])
      } else if (skippedEnrichRef.current[tab]?.length) {
        // "Göster"e geçiş: liste yeniden istenmez; yalnız gizliyken atlanan
        // animasyon kartlarının platformu bir kez çekilir (önbellektekiler atlanır).
        queueEnrich(tab, skippedEnrichRef.current[tab])
        skippedEnrichRef.current[tab] = null
      }
      return
    }
    if (!force && inflightRef.current[tab]) return

    const gen = (genRef.current[tab] ?? 0) + 1
    genRef.current[tab] = gen
    inflightRef.current[tab] = gen
    skippedEnrichRef.current[tab] = null
    if (busyRef.current[tab]) {
      busyRef.current[tab] = null
      setLoadingMore(p => ({ ...p, [tab]: false }))
    }

    // Önceki enrichment turunu iptal et
    if (enrichAbortRef.current[tab]) {
      enrichAbortRef.current[tab].abort()
    }

    setLoading(p => ({ ...p, [tab]: true }))
    setError(p   => ({ ...p, [tab]: null }))

    try {
      let items
      let canTopUp = false

      const { country, tab: baseTab } = parseKey(tab)

      if (baseTab === 'trend') {
        if (TMDB_KEY) {
          if (country) {
            const result = await loadCountryTrend(country)
            if (!isCurrent(tab, gen)) return
            trendRawRef.current[tab] = result.raw
            trendCursorRef.current[tab] = result.cursor
            items = result.cards
          } else {
            const result = await loadTrendFromTMDB()
            if (!isCurrent(tab, gen)) return
            pageRef.current[tab] = TREND_PAGES
            totalPagesRef.current[tab] = result.totalPages
            items = result.cards
          }
          canTopUp = true
        } else {
          // TMDB anahtarı yoksa mock veriye dön
          await new Promise(r => setTimeout(r, 400))
          items = (await mockVeri()).MOCK_TREND
          if (!isCurrent(tab, gen)) return
        }
      } else if (isListKey(tab) && TMDB_KEY) {
        // diziler / filmler: ilk sayfaları PARALEL çek (hızlı, zengin ilk görünüm).
        // Bir sayfa hata verirse diğerleri yine de gösterilir.
        pageRef.current[tab]       = 0
        totalPagesRef.current[tab] = Infinity
        const settled = await Promise.allSettled(
          Array.from({ length: INITIAL_PAGES }, (_, i) => loadListPage(tab, i + 1))
        )
        if (!isCurrent(tab, gen)) return
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
        poolCRef.current[tab] = c && country ? c : null
        if (c && country) {
          const mediaType = TAB_MEDIA[baseTab]
          items = items.map(it => ({
            ...it,
            _weightedScore: weightedScore(it.imdbScore, it._voteCount, mediaType, c),
          }))
        }
        canTopUp = true
      } else {
        // TMDB anahtarı yoksa mock veriye dön
        await new Promise(r => setTimeout(r, 400))
        const mock = await mockVeri()
        if (!isCurrent(tab, gen)) return
        items = ({ diziler: mock.MOCK_DIZILER, filmler: mock.MOCK_FILMLER })[baseTab] || []
      }

      const shown = countOf(items)
      setData(p    => ({ ...p, [tab]: items }))
      setVisible(p => ({ ...p, [tab]: PAGE_SIZE }))
      setHasMore(p => ({ ...p, [tab]: networkMore(tab, shown) || shown > PAGE_SIZE }))
      setLoaded(p  => ({ ...p, [tab]: true }))

      // Arka planda platform zenginleştirme — ilk render'ı bloklama
      if (TMDB_KEY && items.some(i => i._tmdbId && i._mediaType)) {
        const ctrl = new AbortController()
        enrichAbortRef.current[tab] = ctrl
        enrichRunRef.current[tab] = enrichPlatforms(items, tab, ctrl.signal)
      }

      if (canTopUp && hideRef.current) topUp(tab, items)
    } catch (e) {
      if (isCurrent(tab, gen)) setError(p => ({ ...p, [tab]: e.message || 'Bilinmeyen hata' }))
    } finally {
      if (isCurrent(tab, gen)) {
        inflightRef.current[tab] = null
        setLoading(p => ({ ...p, [tab]: false }))
      }
    }
  }

  const showMore = async (tab) => {
    if (busyRef.current[tab]) return
    const hide = hideRef.current
    // Seyrek harita: henüz yüklenmemiş anahtarda varsayılana düş.
    const current = data[tab] || []
    const total   = countOf(current, hide)
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
    const gen = genRef.current[tab] ?? 0
    const token = {}
    busyRef.current[tab] = token
    setLoadingMore(p => ({ ...p, [tab]: true }))
    try {
      const fresh = []
      let reached = total
      try {
        while (reached < desired && reached < MAX_ITEMS &&
               (pageRef.current[tab] ?? 0) < (totalPagesRef.current[tab] ?? Infinity) &&
               (pageRef.current[tab] ?? 0) < MAX_LIST_PAGES) {
          const { items: pageItems, totalPages } = await loadListPage(tab, (pageRef.current[tab] ?? 0) + 1)
          if (!isCurrent(tab, gen)) return
          pageRef.current[tab]      += 1
          totalPagesRef.current[tab] = totalPages
          fresh.push(...pageItems)
          reached += countOf(pageItems, hide)
        }
      } catch (e) {
        // Gizliyken bir tıklama birkaç sayfa ister; ortada düşen sayfa, o ana dek
        // gelenleri silmesin (imleç onları geçti, bir daha istenmezlerdi).
        // Sonraki tıklama düşen sayfadan sürer.
        console.warn('Daha fazla içerik yüklenemedi; gelen sayfalar korunuyor:', e?.message || e)
      }
      if (fresh.length > 0) {
        setData(p => {
          const merged = [...(p[tab] || []), ...fresh]
          return { ...p, [tab]: hide ? merged : merged.slice(0, MAX_ITEMS) }
        })
      }
      setVisible(p => ({ ...p, [tab]: Math.min(desired, reached) }))
      setHasMore(p => ({ ...p, [tab]: networkMore(tab, reached) }))
    } finally {
      if (busyRef.current[tab] === token) {
        busyRef.current[tab] = null
        setLoadingMore(p => ({ ...p, [tab]: false }))
      }
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
