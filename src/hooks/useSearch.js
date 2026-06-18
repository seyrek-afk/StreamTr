import { useState, useRef, useCallback } from 'react'

const TMDB_BASE = 'https://api.themoviedb.org/3'
const API_KEY   = import.meta.env.VITE_TMDB_KEY

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
        const res = await fetch(
          `${TMDB_BASE}/search/multi?query=${encodeURIComponent(safeQuery)}&language=tr-TR&page=1&include_adult=false&api_key=${API_KEY}`,
          { signal: controller.signal }
        )
        if (!res.ok) throw new Error(`TMDB ${res.status}`)
        const json = await res.json()

        const items = (json.results || [])
          .filter(r => r.media_type === 'movie' || r.media_type === 'tv')
          .slice(0, 8)
          .map(r => ({
            id: r.id,
            mediaType: r.media_type,
            title: r.media_type === 'movie' ? r.title : r.name,
            year: ((r.media_type === 'movie' ? r.release_date : r.first_air_date) || '').slice(0, 4),
            posterPath: r.poster_path,
          }))

        setSuggestions(items)
      } catch (e) {
        if (e.name !== 'AbortError') setSuggestions([])
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
      const res = await fetch(
        `${TMDB_BASE}/${mediaType}/${id}?language=tr-TR&append_to_response=credits,reviews,videos,recommendations&api_key=${API_KEY}`,
        { signal: controller.signal }
      )
      if (!res.ok) throw new Error(`TMDB ${res.status}`)
      const json = await res.json()
      setSelectedItem(tmdbToCard(json, mediaType))
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
