import { useState } from 'react'
import { MOCK_DIZILER, MOCK_FILMLER, MOCK_TREND } from '../data/mockData.js'

const TMDB_BASE = 'https://api.themoviedb.org/3'
const TMDB_KEY  = import.meta.env.VITE_TMDB_KEY

const PAGE_SIZE = 10
const MAX_ITEMS = 100

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
    rottenTomatoesScore: null,
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
      `${TMDB_BASE}/trending/all/week?api_key=${TMDB_KEY}&language=tr-TR&page=${i + 1}`
    ).then(r => {
      if (!r.ok) throw new Error(`TMDB ${r.status}`)
      return r.json()
    })
  )

  const pages = await Promise.all(promises)
  const items = []
  for (const page of pages) {
    for (const r of (page.results || [])) {
      if (r.media_type === 'movie' || r.media_type === 'tv') items.push(r)
    }
  }
  return items.slice(0, MAX_ITEMS).map((item, i) => tmdbToTrendCard(item, i + 1))
}

// ── emptyTab yardımcısı ──────────────────────────────────────────────────────
function emptyTab(val) {
  return { diziler: val, filmler: val, trend: val }
}

const MOCK_SOURCE = {
  diziler: MOCK_DIZILER,
  filmler: MOCK_FILMLER,
}

// ── Hook ─────────────────────────────────────────────────────────────────────
export function useStreamData() {
  const [data,        setData]        = useState(emptyTab([]))
  const [loading,     setLoading]     = useState(emptyTab(false))
  const [loadingMore, setLoadingMore] = useState(emptyTab(false))
  const [error,       setError]       = useState(emptyTab(null))
  const [visible,     setVisible]     = useState(emptyTab(PAGE_SIZE))
  const [hasMore,     setHasMore]     = useState(emptyTab(true))
  const [loaded,      setLoaded]      = useState(emptyTab(false))

  const fetchTab = async (tab) => {
    if (loaded[tab]) return

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
      } else {
        // diziler / filmler: mock veri (kısa gecikme simülasyonu)
        await new Promise(r => setTimeout(r, 400))
        items = MOCK_SOURCE[tab] || []
      }

      setData(p    => ({ ...p, [tab]: items }))
      setVisible(p => ({ ...p, [tab]: PAGE_SIZE }))
      setHasMore(p => ({ ...p, [tab]: items.length > PAGE_SIZE }))
      setLoaded(p  => ({ ...p, [tab]: true }))
    } catch (e) {
      setError(p => ({ ...p, [tab]: e.message || 'Bilinmeyen hata' }))
    } finally {
      setLoading(p => ({ ...p, [tab]: false }))
    }
  }

  const showMore = (tab) => {
    const next   = visible[tab] + PAGE_SIZE
    const total  = data[tab].length
    const capped = Math.min(next, MAX_ITEMS, total)
    setVisible(p => ({ ...p, [tab]: capped }))
    if (capped >= total || capped >= MAX_ITEMS) {
      setHasMore(p => ({ ...p, [tab]: false }))
    }
  }

  const retry = (tab) => {
    setLoaded(p => ({ ...p, [tab]: false }))
    fetchTab(tab)
  }

  return { data, loading, loadingMore, error, visible, hasMore, fetchTab, showMore, retry }
}
