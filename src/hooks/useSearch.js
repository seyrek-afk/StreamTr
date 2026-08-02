import { useState, useRef, useCallback } from 'react'
import {
  mergeSearchResults, rankSearchResults, typoVariants,
} from '../lib/searchMatch.js'

const TMDB_BASE = 'https://api.themoviedb.org/3'
const API_KEY   = import.meta.env.VITE_TMDB_KEY

// Tek dilde ham arama sonucu döndürür. Hata/iptal durumunda boş dizi —
// bir dilin düşmesi diğerini engellemesin.
async function rawSearch(query, language, signal) {
  try {
    const res = await fetch(
      `${TMDB_BASE}/search/multi?query=${encodeURIComponent(query)}` +
      `&language=${language}&page=1&include_adult=false&api_key=${API_KEY}`,
      { signal }
    )
    if (!res.ok) return []
    const json = await res.json()
    return json.results || []
  } catch (e) {
    if (e.name === 'AbortError') throw e
    return []
  }
}

// İki dili paralel arar, birleştirir, alakaya göre sıralar.
// Sonuç boşsa ön-ek kırpma ile yazım hatası kurtarmayı dener (bkz. searchMatch.js).
async function smartSearch(query, signal) {
  const attempt = async (q) => {
    const [tr, en] = await Promise.all([
      rawSearch(q, 'tr-TR', signal),
      rawSearch(q, 'en-US', signal),
    ])
    return rankSearchResults(mergeSearchResults(tr, en), query)
  }

  let items = await attempt(query)
  if (items.length > 0) return { items, correctedFrom: null }

  for (const variant of typoVariants(query)) {
    const alt = await attempt(variant)
    if (alt.length > 0) return { items: alt, correctedFrom: variant }
  }
  return { items: [], correctedFrom: null }
}

function estimateRT(avg) {
  if (!avg) return null
  return Math.min(99, Math.max(20, Math.round(avg * 9.8 + 1)))
}
function estimateLB(avg) {
  if (!avg) return null
  return Number((avg * 0.47 + 0.08).toFixed(2))
}

const TMDB_GENRES = {
  28: 'Aksiyon', 12: 'Macera', 16: 'Animasyon', 35: 'Komedi', 80: 'Suç',
  99: 'Belgesel', 18: 'Dram', 10751: 'Aile', 14: 'Fantezi', 36: 'Tarih',
  27: 'Korku', 10402: 'Müzik', 9648: 'Gizem', 10749: 'Romantik',
  878: 'Bilim Kurgu', 53: 'Gerilim', 10752: 'Savaş', 37: 'Western',
  10759: 'Aksiyon & Macera', 10762: 'Çocuk', 10763: 'Haber',
  10764: 'Gerçeklik', 10765: 'Bilim Kurgu & Fantezi',
  10766: 'Pembe Dizi', 10767: 'Talk Show', 10768: 'Savaş & Politika',
}

function toMiniItem(r) {
  const isMovie = r.media_type === 'movie' || r.title !== undefined
  return {
    tmdbId: r.id,
    mediaType: isMovie ? 'movie' : 'tv',
    title: r.title || r.name,
    year: (r.release_date || r.first_air_date || '').slice(0, 4),
    posterPath: r.poster_path,
  }
}

function tmdbToCard(tmdb, mediaType) {
  const isMovie = mediaType === 'movie'
  const voteAvg = tmdb.vote_average || 0
  const trailer = (tmdb.videos?.results || []).find(
    v => v.type === 'Trailer' && v.site === 'YouTube'
  ) || (tmdb.videos?.results || []).find(v => v.site === 'YouTube')

  const dirEntry = (tmdb.credits?.crew || []).find(p => p.job === 'Director')
    || tmdb.created_by?.[0]
    || null

  return {
    title: isMovie ? tmdb.title : tmdb.name,
    originalTitle: isMovie ? tmdb.original_title : tmdb.original_name,
    year: (isMovie ? tmdb.release_date : tmdb.first_air_date)?.slice(0, 4),
    imdbScore: voteAvg ? Number(voteAvg.toFixed(1)) : null,
    rottenTomatoesScore: estimateRT(voteAvg),
    letterboxdScore: estimateLB(voteAvg),
    genres: (tmdb.genres || []).map(g => TMDB_GENRES[g.id] || g.name),
    platforms: [],
    posterPath: tmdb.poster_path,
    description: tmdb.overview,
    cast: (tmdb.credits?.cast || []).slice(0, 8).map(c => ({
      id: c.id,
      name: c.name,
      character: c.character,
      profilePath: c.profile_path,
    })),
    reviews: (tmdb.reviews?.results || []).slice(0, 3).map(r => ({
      source: 'TMDB',
      author: r.author,
      quote: (r.content || '').slice(0, 220) + ((r.content?.length || 0) > 220 ? '…' : ''),
    })),
    duration: isMovie ? tmdb.runtime : null,
    type: isMovie ? 'film' : 'dizi',
    _tmdbId: tmdb.id,
    _mediaType: mediaType,
    trailerKey: trailer?.key || null,
    director: dirEntry ? { id: dirEntry.id, name: dirEntry.name } : null,
    similarItems: (tmdb.recommendations?.results || []).slice(0, 12).map(toMiniItem),
  }
}

export function useSearch() {
  const [query,         setQuery]         = useState('')
  const [suggestions,   setSuggestions]   = useState([])
  const [suggesting,    setSuggesting]    = useState(false)
  const [selectedItem,  setSelectedItem]  = useState(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailError,   setDetailError]   = useState(null)
  // Yazım hatası kurtarma devreye girdiyse hangi kısaltılmış sorgunun sonuç
  // verdiğini tutar — kullanıcıya "şunu aradım" diye dürüstçe söylemek için.
  const [correctedFrom, setCorrectedFrom] = useState(null)

  const debounceRef    = useRef(null)
  const abortSearchRef = useRef(null)
  const abortDetailRef = useRef(null)
  const lastPickRef    = useRef(null)

  // ── Yazarken TMDB'den öneri getir ────────────────────────────────────────────
  const handleQueryChange = useCallback((val) => {
    setQuery(val)
    setSelectedItem(null)
    setDetailError(null)

    clearTimeout(debounceRef.current)
    abortSearchRef.current?.abort()

    setCorrectedFrom(null)

    if (!val.trim() || val.length < 2) {
      setSuggestions([])
      return
    }

    debounceRef.current = setTimeout(async () => {
      if (!API_KEY) {
        setSuggestions([])
        return
      }

      setSuggesting(true)
      const controller = new AbortController()
      abortSearchRef.current = controller

      try {
        const safeQuery = val.trim().slice(0, 200)
        const { items, correctedFrom } = await smartSearch(safeQuery, controller.signal)
        setSuggestions(items.slice(0, 8))
        setCorrectedFrom(correctedFrom)
      } catch (e) {
        if (e.name !== 'AbortError') { setSuggestions([]); setCorrectedFrom(null) }
      } finally {
        setSuggesting(false)
      }
    }, 300)
  }, [])

  // ── Öneri seçilince TMDB'den detay getir ─────────────────────────────────────
  const selectSuggestion = useCallback(async (suggestion) => {
    const title = suggestion.title
    lastPickRef.current = suggestion

    setQuery(title)
    setSuggestions([])
    setDetailLoading(true)
    setDetailError(null)
    setSelectedItem(null)

    abortDetailRef.current?.abort()

    if (!API_KEY) {
      setDetailError('TMDB API anahtarı eksik. .env dosyasına VITE_TMDB_KEY ekleyin.')
      setDetailLoading(false)
      return
    }

    const controller = new AbortController()
    abortDetailRef.current = controller

    try {
      const { id, mediaType } = suggestion
      // tr-TR: Türkçe özet + oyuncular + benzer yapımlar.
      // en-US: fragman ve yorumlar (TMDB'de tr-TR çoğunlukla boş döner).
      const [main, extra] = await Promise.all([
        fetch(
          `${TMDB_BASE}/${mediaType}/${id}?language=tr-TR&append_to_response=credits,recommendations&api_key=${API_KEY}`,
          { signal: controller.signal }
        ).then(r => { if (!r.ok) throw new Error(`TMDB ${r.status}`); return r.json() }),
        fetch(
          `${TMDB_BASE}/${mediaType}/${id}?language=en-US&append_to_response=videos,reviews&api_key=${API_KEY}`,
          { signal: controller.signal }
        ).then(r => (r.ok ? r.json() : {})).catch(() => ({})),
      ])
      const merged = { ...main, videos: extra.videos || main.videos, reviews: extra.reviews || main.reviews }
      setSelectedItem(tmdbToCard(merged, mediaType))
    } catch (e) {
      if (e.name !== 'AbortError') {
        setDetailError(`"${title}" için bilgi yüklenemedi. Lütfen tekrar deneyin.`)
      }
    } finally {
      setDetailLoading(false)
    }
  }, [])

  const retryDetail = useCallback(() => {
    if (lastPickRef.current) selectSuggestion(lastPickRef.current)
  }, [selectSuggestion])

  const clearSearch = useCallback(() => {
    setQuery('')
    setSuggestions([])
    setSelectedItem(null)
    setDetailError(null)
    setCorrectedFrom(null)
    lastPickRef.current = null
  }, [])

  const clearSuggestions = useCallback(() => {
    clearTimeout(debounceRef.current)
    abortSearchRef.current?.abort()
    setSuggestions([])
  }, [])

  return {
    query,
    suggestions,
    suggesting,
    correctedFrom,
    selectedItem,
    detailLoading,
    detailError,
    handleQueryChange,
    selectSuggestion,
    retryDetail,
    clearSearch,
    clearSuggestions,
    noApiKey: !API_KEY,
  }
}
