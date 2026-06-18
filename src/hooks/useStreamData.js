import { useState, useRef } from 'react'
import { MOCK_DIZILER, MOCK_FILMLER, MOCK_TREND } from '../data/mockData.js'

const TMDB_BASE = 'https://api.themoviedb.org/3'
const TMDB_KEY  = import.meta.env.VITE_TMDB_KEY

const PAGE_SIZE = 10
const MAX_ITEMS = 250

// diziler/filmler tabları için TMDB liste uç noktaları (en yüksek puanlılar)
const LIST_ENDPOINT = {
  diziler: { path: 'tv/top_rated',    mediaType: 'tv'    },
  filmler: { path: 'movie/top_rated', mediaType: 'movie' },
}

// ── Yardımcı: sayı formatla ──────────────────────────────────────────────────
function fmtCount(n) {
  if (!n) return '—'
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}k`
  return String(n)
}

// ── Tür ID → Türkçe ──────────────────────────────────────────────────────────
const GENRE_MAP = {
  28: 'Aksiyon',  12: 'Macera',    16: 'Animasyon', 35: 'Komedi',      80: 'Suç',
  99: 'Belgesel', 18: 'Dram',      10751: 'Aile',   14: 'Fantezi',     36: 'Tarih',
  27: 'Korku',    10402: 'Müzik',  9648: 'Gizem',   10749: 'Romantik', 878: 'Bilim Kurgu',
  53: 'Gerilim',  10752: 'Savaş',  37: 'Western',
  10759: 'Aksiyon & Macera', 10762: 'Çocuk',   10763: 'Haber',
  10764: 'Gerçeklik',        10765: 'Bilim Kurgu & Fantezi',
  10766: 'Pembe Dizi',       10767: 'Talk Show', 10768: 'Savaş & Politika',
}

// ── Skor tahmin yardımcıları ─────────────────────────────────────────────────
function estimateRT(avg) {
  if (!avg) return null
  return Math.min(99, Math.max(20, Math.round(avg * 9.8 + 1)))
}
function estimateLB(avg) {
  if (!avg) return null
  return Number((avg * 0.47 + 0.08).toFixed(2))
}

// ── Neden trend? → otomatik oluştur ──────────────────────────────────────────
function buildTrendReason(item, rank, isMovie) {
  const dateStr = isMovie ? item.release_date : item.first_air_date
  const parts   = []

  if (dateStr) {
    const days = (Date.now() - new Date(dateStr)) / 86_400_000
    if (days < 7)        parts.push('Bu hafta yayınlandı')
    else if (days < 30)  parts.push('Bu ay çıktı')
    else if (days < 90)  parts.push('Son 3 ayın gözde yapımı')
  }

  if      (rank <= 3)  parts.push('TMDB haftalık trendin zirvesi')
  else if (rank <= 10) parts.push('Bu haftanın top 10 yapımı')
  else if (rank <= 25) parts.push('Bu hafta yoğun ilgi gören yapım')

  if (item.vote_count  > 5_000) parts.push(`${fmtCount(item.vote_count)} oy topladı`)
  if (item.popularity  > 1_000) parts.push('Sosyal medyada viral')
  else if (item.popularity > 300) parts.push('Geniş kitlelere ulaştı')

  return parts.slice(0, 3).join(' · ') || `TMDB bu hafta #${rank} trend`
}

// ── TMDB trend öğesini kart formatına dönüştür ───────────────────────────────
function tmdbToTrendCard(item, rank) {
  const isMovie = item.media_type === 'movie'

  const rankScore      = Math.max(0, Math.round(100 - (rank - 1) * 1.2))
  const voteScore      = Math.round((item.vote_average || 0) * 10)
  const voteCountScore = Math.min(100, Math.round(Math.log10(Math.max(1, item.vote_count || 1)) * 28))
  const popScore       = Math.min(100, Math.round(Math.log10(Math.max(1, item.popularity || 1)) * 35))

  const socialScore = Math.round(
    rankScore      * 0.40 +
    voteScore      * 0.30 +
    popScore       * 0.20 +
    voteCountScore * 0.10
  )

  const dateStr   = isMovie ? item.release_date : item.first_air_date
  const daysOld   = dateStr ? (Date.now() - new Date(dateStr)) / 86_400_000 : 9999
  const isNew     = daysOld < 60   // son 2 ay

  return {
    title:         isMovie ? item.title : item.name,
    originalTitle: isMovie ? item.original_title : item.original_name,
    type:          isMovie ? 'film' : 'dizi',
    year:          dateStr?.slice(0, 4),
    imdbScore:     item.vote_average ? Number(item.vote_average.toFixed(1)) : null,
    rottenTomatoesScore: estimateRT(item.vote_average),
    letterboxdScore: estimateLB(item.vote_average),
    genres:        (item.genre_ids || []).map(id => GENRE_MAP[id]).filter(Boolean),
    platforms:     [],
    posterPath:    item.poster_path,
    description:   item.overview || '',
    cast:          [],
    reviews:       [],
    duration:      null,

    // trend-specific
    socialScore,
    trendRank:     rank,
    trendReason:   buildTrendReason(item, rank, isMovie),
    isNewRelease:  isNew,
    releaseDate:   dateStr,
    _tmdbId:       item.id,
    _mediaType:    item.media_type,

    popularityCriteria: [
      {
        label: 'Haftalık Sıra',
        value: `#${rank}`,
        source: 'TMDB Haftalık Trend',
        score: rankScore,
        icon: '🔥',
      },
      {
        label: 'Ortalama Puan',
        value: `${(item.vote_average || 0).toFixed(1)} / 10`,
        source: 'TMDB Kullanıcı Oyları',
        score: voteScore,
        icon: '⭐',
      },
      {
        label: 'Toplam Oy',
        value: fmtCount(item.vote_count),
        source: 'TMDB',
        score: voteCountScore,
        icon: '🗳',
      },
      {
        label: 'Popülerlik Endeksi',
        value: item.popularity ? item.popularity.toFixed(0) : '—',
        source: 'TMDB Algoritması',
        score: popScore,
        icon: '📊',
      },
    ],
  }
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

// ── TMDB liste öğesi (top_rated) → kart formatına dönüştür ───────────────────
function tmdbToListCard(item, mediaType) {
  const isMovie = mediaType === 'movie'
  const voteAvg = item.vote_average || 0
  const dateStr = isMovie ? item.release_date : item.first_air_date
  return {
    title:         isMovie ? item.title : item.name,
    originalTitle: isMovie ? item.original_title : item.original_name,
    type:          isMovie ? 'film' : 'dizi',
    year:          dateStr?.slice(0, 4),
    imdbScore:     voteAvg ? Number(voteAvg.toFixed(1)) : null,
    rottenTomatoesScore: estimateRT(voteAvg),
    letterboxdScore: estimateLB(voteAvg),
    genres:        (item.genre_ids || []).map(id => GENRE_MAP[id]).filter(Boolean),
    platforms:     [],
    posterPath:    item.poster_path,
    description:   item.overview || '',
    cast:          [],
    reviews:       [],
    duration:      null,
    _tmdbId:       item.id,
    _mediaType:    mediaType,
  }
}

// ── TMDB liste tabından (diziler/filmler) tek sayfa getir ────────────────────
async function loadListPage(tab, page) {
  const { path, mediaType } = LIST_ENDPOINT[tab]
  const res = await fetch(
    `${TMDB_BASE}/${path}?language=tr-TR&page=${page}&api_key=${TMDB_KEY}`,
    { signal: AbortSignal.timeout(10_000) }
  )
  if (!res.ok) throw new Error(`TMDB ${res.status}`)
  const json = await res.json()
  const items = (json.results || []).map(r => tmdbToListCard(r, mediaType))
  return { items, totalPages: json.total_pages || page }
}

// ── emptyTab yardımcısı ──────────────────────────────────────────────────────
function emptyTab(val) {
  return { diziler: val, filmler: val, trend: val }
}

const MOCK_SOURCE = {
  diziler: MOCK_DIZILER,
  filmler: MOCK_FILMLER,
}

// İlk yüklemede diziler/filmler için kaç TMDB sayfası çekilsin (20 öğe/sayfa)
const INITIAL_PAGES = 3

// ── Hook ─────────────────────────────────────────────────────────────────────
export function useStreamData() {
  const [data,        setData]        = useState(emptyTab([]))
  const [loading,     setLoading]     = useState(emptyTab(false))
  const [loadingMore, setLoadingMore] = useState(emptyTab(false))
  const [error,       setError]       = useState(emptyTab(null))
  const [visible,     setVisible]     = useState(emptyTab(PAGE_SIZE))
  const [hasMore,     setHasMore]     = useState(emptyTab(true))
  const [loaded,      setLoaded]      = useState(emptyTab(false))

  // TMDB liste tabları için sayfa imleci
  const pageRef       = useRef({ diziler: 0, filmler: 0 })
  const totalPagesRef = useRef({ diziler: Infinity, filmler: Infinity })

  // Bu tabdan ağ üzerinden DAHA fazla içerik çekilebilir mi?
  const networkMore = (tab, total) => {
    if (!TMDB_KEY || !LIST_ENDPOINT[tab]) return false
    return total < MAX_ITEMS && pageRef.current[tab] < totalPagesRef.current[tab]
  }

  const fetchTab = async (tab, force = false) => {
    if (!force && loaded[tab]) return

    setLoading(p => ({ ...p, [tab]: true }))
    setError(p   => ({ ...p, [tab]: null }))

    try {
      let items

      if (tab === 'trend') {
        if (TMDB_KEY) {
          items = await loadTrendFromTMDB()
        } else {
          // TMDB anahtarı yoksa mock veriye dön
          await new Promise(r => setTimeout(r, 400))
          items = MOCK_TREND
        }
      } else if (LIST_ENDPOINT[tab] && TMDB_KEY) {
        // diziler / filmler: TMDB en yüksek puanlılar — sayfalı (250'ye kadar)
        pageRef.current[tab]       = 0
        totalPagesRef.current[tab] = Infinity
        const acc = []
        for (let i = 0; i < INITIAL_PAGES && acc.length < MAX_ITEMS; i++) {
          if (pageRef.current[tab] >= totalPagesRef.current[tab]) break
          const { items: pageItems, totalPages } = await loadListPage(tab, pageRef.current[tab] + 1)
          pageRef.current[tab]      += 1
          totalPagesRef.current[tab] = totalPages
          acc.push(...pageItems)
        }
        items = acc.slice(0, MAX_ITEMS)
      } else {
        // TMDB anahtarı yoksa mock veriye dön
        await new Promise(r => setTimeout(r, 400))
        items = MOCK_SOURCE[tab] || []
      }

      setData(p    => ({ ...p, [tab]: items }))
      setVisible(p => ({ ...p, [tab]: PAGE_SIZE }))
      setHasMore(p => ({ ...p, [tab]: networkMore(tab, items.length) || items.length > PAGE_SIZE }))
      setLoaded(p  => ({ ...p, [tab]: true }))
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
    setLoaded(p => ({ ...p, [tab]: false }))
    fetchTab(tab, true)
  }

  return { data, loading, loadingMore, error, visible, hasMore, fetchTab, showMore, retry }
}
