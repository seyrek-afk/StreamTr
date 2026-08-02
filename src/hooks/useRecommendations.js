import { useState, useEffect } from 'react'
import { ALL_CONTENT } from '../data/mockData.js'
import { favKey } from '../contexts/FavoritesContext.jsx'
import { isValidTmdbRef } from '../lib/tmdb.js'

const TMDB_BASE = 'https://api.themoviedb.org/3'
const API_KEY   = import.meta.env.VITE_TMDB_KEY

const MAX_RESULTS = 20

// Skor tahmini — diğer hook'larla (useStreamData/useSearch) birebir aynı formül,
// böylece öneriler de IMDB + Rotten Tomatoes + Letterboxd üçlüsünü gösterir.
function estimateRT(avg) {
  if (!avg) return null
  return Math.min(99, Math.max(20, Math.round(avg * 9.8 + 1)))
}
function estimateLB(avg) {
  if (!avg) return null
  return Number((avg * 0.47 + 0.08).toFixed(2))
}

// TMDB tür id → Türkçe (diğer hook'larla aynı eşleme)
const TMDB_GENRES = {
  28: 'Aksiyon', 12: 'Macera', 16: 'Animasyon', 35: 'Komedi', 80: 'Suç',
  99: 'Belgesel', 18: 'Dram', 10751: 'Aile', 14: 'Fantezi', 36: 'Tarih',
  27: 'Korku', 10402: 'Müzik', 9648: 'Gizem', 10749: 'Romantik',
  878: 'Bilim Kurgu', 53: 'Gerilim', 10752: 'Savaş', 37: 'Western',
  10759: 'Aksiyon & Macera', 10762: 'Çocuk', 10763: 'Haber',
  10764: 'Gerçeklik', 10765: 'Bilim Kurgu & Fantezi',
  10766: 'Pembe Dizi', 10767: 'Talk Show', 10768: 'Savaş & Politika',
}

// TMDB ham sonucu → kart-uyumlu şekil (ContentCard ile render edilip genişletilebilir)
function tmdbToRecCard(r) {
  const isMovie = r.media_type === 'movie' || (r.media_type !== 'tv' && r.title !== undefined)
  const mediaType = isMovie ? 'movie' : 'tv'
  const voteAvg = r.vote_average || 0
  return {
    title:      r.title || r.name,
    originalTitle: isMovie ? r.original_title : r.original_name,
    year:       (r.release_date || r.first_air_date || '').slice(0, 4),
    type:       isMovie ? 'film' : 'dizi',
    genres:     (r.genre_ids || []).map(id => TMDB_GENRES[id]).filter(Boolean),
    imdbScore:  voteAvg ? Number(voteAvg.toFixed(1)) : null,
    rottenTomatoesScore: estimateRT(voteAvg),
    letterboxdScore:     estimateLB(voteAvg),
    posterPath: r.poster_path,
    description: r.overview || '',
    // Diğer sekmelerle aynı kart şeması — ContentCard tüm zengin bölümleri açabilsin
    platforms:  [],
    cast:       [],
    reviews:    [],
    duration:   null,
    _tmdbId:    r.id,
    _mediaType: mediaType,
    _voteAvg:   voteAvg,
  }
}

// ── Yerel fallback: favorilerin tür frekansına göre ALL_CONTENT'i puanla ───────
function localRecommendations(favorites) {
  const favKeys = new Set(favorites.map(f => f.key))

  // Favorilerin tür ağırlıkları
  const genreWeight = {}
  favorites.forEach(f => {
    (f.genres || []).forEach(g => { genreWeight[g] = (genreWeight[g] || 0) + 1 })
  })
  if (Object.keys(genreWeight).length === 0) return []

  return ALL_CONTENT
    .filter(item => !favKeys.has(favKey(item)))
    .map(item => {
      const score = (item.genres || []).reduce((s, g) => s + (genreWeight[g] || 0), 0)
      return { item, score }
    })
    .filter(x => x.score > 0)
    .sort((a, b) =>
      b.score - a.score || (b.item.imdbScore || 0) - (a.item.imdbScore || 0)
    )
    .slice(0, MAX_RESULTS)
    .map(x => x.item)
}

// ── TMDB tabanlı öneriler: favorilerin "recommendations" sonuçlarını topla ─────
async function tmdbRecommendations(favorites, signal) {
  const favKeys = new Set(favorites.map(f => f.key))

  // 1) Her favori için tmdbId/mediaType belirle (yoksa search/multi ile çöz)
  const resolved = await Promise.all(
    favorites.map(async (f) => {
      // Saklanan favoriden gelen tmdbId/mediaType doğrudan TMDB URL'sine girer →
      // path-injection'ı önlemek için katı doğrula. Geçersizse search/multi ile çöz.
      if (isValidTmdbRef(f.tmdbId, f.mediaType)) return { id: f.tmdbId, mediaType: f.mediaType }
      try {
        const res = await fetch(
          `${TMDB_BASE}/search/multi?query=${encodeURIComponent((f.title || '').slice(0, 200))}` +
          `&language=tr-TR&page=1&include_adult=false&api_key=${API_KEY}`,
          { signal }
        )
        if (!res.ok) return null
        const json = await res.json()
        const hit = (json.results || []).find(r => r.media_type === 'movie' || r.media_type === 'tv')
        return hit ? { id: hit.id, mediaType: hit.media_type } : null
      } catch {
        return null
      }
    })
  )

  // 2) Her favori için recommendations getir, frekansla birleştir
  const acc = new Map() // key → { card, freq }
  await Promise.all(
    resolved.filter(Boolean).map(async ({ id, mediaType }) => {
      try {
        const res = await fetch(
          `${TMDB_BASE}/${mediaType}/${id}/recommendations?language=tr-TR&page=1&api_key=${API_KEY}`,
          { signal }
        )
        if (!res.ok) return
        const json = await res.json()
        ;(json.results || []).forEach(r => {
          const card = tmdbToRecCard(r)
          const k = favKey(card)
          if (favKeys.has(k)) return // zaten favori
          const prev = acc.get(k)
          if (prev) prev.freq += 1
          else acc.set(k, { card, freq: 1 })
        })
      } catch {
        /* tek favori başarısız olsa da diğerleri devam etsin */
      }
    })
  )

  // 3) Sıklık → puan sırala, ilk N
  return [...acc.values()]
    .sort((a, b) => b.freq - a.freq || (b.card._voteAvg || 0) - (a.card._voteAvg || 0))
    .slice(0, MAX_RESULTS)
    .map(x => x.card)
}

export function useRecommendations(favorites) {
  const [recommendations, setRecommendations] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  // Yalnızca favori kümesi değişince yeniden hesapla
  const favSignature = favorites.map(f => f.key).join('|')

  useEffect(() => {
    if (!favorites.length) {
      setRecommendations([])
      setError(null)
      setLoading(false)
      return
    }

    // API anahtarı yoksa doğrudan yerel öneriler
    if (!API_KEY) {
      setRecommendations(localRecommendations(favorites))
      setLoading(false)
      setError(null)
      return
    }

    const controller = new AbortController()
    let cancelled = false

    setLoading(true)
    setError(null)

    tmdbRecommendations(favorites, controller.signal)
      .then(recs => {
        if (cancelled) return
        // TMDB hiç sonuç vermezse yerel fallback
        setRecommendations(recs.length ? recs : localRecommendations(favorites))
      })
      .catch(e => {
        if (cancelled || e.name === 'AbortError') return
        setError('Öneriler yüklenemedi.')
        setRecommendations(localRecommendations(favorites))
      })
      .finally(() => { if (!cancelled) setLoading(false) })

    return () => { cancelled = true; controller.abort() }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [favSignature])

  return { recommendations, loading, error }
}
