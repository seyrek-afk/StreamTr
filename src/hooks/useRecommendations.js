import { useState, useEffect } from 'react'
import { ALL_CONTENT } from '../data/mockData.js'
import { favKey } from '../contexts/FavoritesContext.jsx'
import { isValidTmdbRef } from '../lib/tmdb.js'
import { genreIdsFor } from '../lib/genres.js'
import {
  MAX_RESULTS, seedProfile, excludedGenres, topGenres, rankRecommendations, titleKeys,
} from '../lib/recommend.js'

const TMDB_BASE = 'https://api.themoviedb.org/3'
const API_KEY   = import.meta.env.VITE_TMDB_KEY

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
    backdropPath: r.backdrop_path || null,
    description: r.overview || '',
    // Diğer sekmelerle aynı kart şeması — ContentCard tüm zengin bölümleri açabilsin
    platforms:  [],
    cast:       [],
    reviews:    [],
    duration:   null,
    _tmdbId:    r.id,
    _mediaType: mediaType,
    _voteAvg:   voteAvg,
    // Kalite tabanı oy sayısına bakar (bkz. lib/recommend.js); yoksa taban uygulanmaz.
    _voteCount: typeof r.vote_count === 'number' ? r.vote_count : undefined,
  }
}

// ── Yerel fallback: favorilerin tür frekansına göre ALL_CONTENT'i puanla ───────
function localRecommendations(favorites, excludeKeys = []) {
  const favKeys = new Set([...favorites.map(f => f.key), ...excludeKeys])

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

// ── TMDB tabanlı öneriler ─────────────────────────────────────────────────────
// Getirme burada, karar src/lib/recommend.js'te (kümeleme, profil, kalite,
// çeşitlilik — gerekçeleriyle birlikte orada).
// seeds : öneri ÜRETEN kayıtlar (Beğendim/Bayıldım). Her biri `_w` ağırlığı
//         taşır — Bayıldım daha güçlü bir sinyaldir.
// excludeKeys : sonuçtan ÇIKARILACAK kayıtlar. Tohum kümesinden farklıdır:
//         İzleyeceklerim öneri üretmez (henüz izlenmedi, beğeni sinyali değil)
//         ama zaten listede olduğu için öneri olarak da gösterilmemeli.
// excludeTitles : aynı kayıtların başlık+yıl anahtarları (lib/recommend titleKeys).
//         Mock veriden kaydedilen bir yapım başlıkla anahtarlanır (title:…);
//         TMDB'den aynı film gelince anahtar tutmaz ama başlık tutar
//         ("Dövüş Kulübü" ikinci kez önerilmesin).
async function tmdbRecommendations(seeds, signal, excludeKeys = [], excludeTitles = []) {
  const favorites = seeds

  // 1) Her favori için tmdbId/mediaType belirle (yoksa search/multi ile çöz)
  const resolvedRaw = await Promise.all(
    favorites.map(async (f) => {
      // Saklanan favoriden gelen tmdbId/mediaType doğrudan TMDB URL'sine girer →
      // path-injection'ı önlemek için katı doğrula. Geçersizse search/multi ile çöz.
      const base = { w: f._w || 1, title: f.title, genres: f.genres || [] }
      if (isValidTmdbRef(f.tmdbId, f.mediaType)) return { ...base, id: f.tmdbId, mediaType: f.mediaType }
      try {
        const res = await fetch(
          `${TMDB_BASE}/search/multi?query=${encodeURIComponent((f.title || '').slice(0, 200))}` +
          `&language=tr-TR&page=1&include_adult=false&api_key=${API_KEY}`,
          { signal }
        )
        if (!res.ok) return null
        const json = await res.json()
        const hit = (json.results || []).find(r => r.media_type === 'movie' || r.media_type === 'tv')
        return hit ? { ...base, id: hit.id, mediaType: hit.media_type } : null
      } catch {
        return null
      }
    })
  )

  // Aynı yapım listede iki kez olabilir (mock kaydı + TMDB kaydı; "Breaking
  // Bad" iki kez). Çözümlenmiş kimlikte birleştir, güçlü ağırlık kalsın —
  // yoksa çift kayıt sessizce çift oy olur.
  const byId = new Map()
  for (const r of resolvedRaw.filter(Boolean)) {
    const k = `tmdb:${r.mediaType}:${r.id}`
    const prev = byId.get(k)
    if (!prev || r.w > prev.w) byId.set(k, { ...r, key: k })
  }
  const resolved = [...byId.values()]

  // 2) Her tohum için recommendations getir
  const cardsByKey = new Map()
  const seedsWithRecs = await Promise.all(
    resolved.map(async (s) => {
      try {
        const res = await fetch(
          `${TMDB_BASE}/${s.mediaType}/${s.id}/recommendations?language=tr-TR&page=1&api_key=${API_KEY}`,
          { signal }
        )
        if (!res.ok) return { ...s, recKeys: [] }
        const json = await res.json()
        const recKeys = []
        ;(json.results || []).forEach(r => {
          const card = withKey(tmdbToRecCard(r))
          if (!cardsByKey.has(card.key)) cardsByKey.set(card.key, card)
          recKeys.push(card.key)
        })
        return { ...s, recKeys }
      } catch {
        /* tek favori başarısız olsa da diğerleri devam etsin */
        return { ...s, recKeys: [] }
      }
    })
  )

  // 3) Keşif: profildeki en güçlü türlerde, yüksek oylu ve yüksek puanlı
  //    yapımlar. Komşuluk grafiğinin göremediği iyi yapımları yakalar.
  const profile = seedProfile(seedsWithRecs)
  const discovered = await discoverByProfile(profile, signal)

  return rankRecommendations({
    seeds: seedsWithRecs,
    cardsByKey,
    discovered,
    profile,
    excludeKeys: new Set([...favorites.map(f => f.key), ...resolved.map(r => r.key), ...excludeKeys]),
    excludeTitles: new Set([...favorites.flatMap(titleKeys), ...excludeTitles]),
  })
}

function withKey(card) {
  return { ...card, key: favKey(card) }
}

// Keşif eşikleri: komşuluk sinyali olmadığı için tek güvence kalitedir.
const DISCOVER_FLOOR = {
  movie: { votes: 2000, avg: 7.4 },
  tv:    { votes: 400,  avg: 7.6 },
}

async function discoverByProfile(profile, signal) {
  const top = topGenres(profile, 2)
  if (!top.length) return []
  const without = [...excludedGenres(profile)]
  const calls = []
  for (const mediaType of ['movie', 'tv']) {
    const withoutIds = genreIdsFor(without, mediaType)
      .concat(without.includes('cocuk') && mediaType === 'tv' ? [10762] : [])
    for (const g of top) {
      const ids = genreIdsFor([g], mediaType)
      if (!ids.length) continue // korku/gerilim gibi türlerin dizi karşılığı yok
      const f = DISCOVER_FLOOR[mediaType]
      calls.push(
        fetch(
          `${TMDB_BASE}/discover/${mediaType}?with_genres=${ids.join('|')}` +
          (withoutIds.length ? `&without_genres=${withoutIds.join(',')}` : '') +
          `&vote_count.gte=${f.votes}&vote_average.gte=${f.avg}` +
          `&sort_by=popularity.desc&language=tr-TR&page=1&include_adult=false&api_key=${API_KEY}`,
          { signal }
        )
          .then(res => (res && res.ok ? res.json() : null))
          .then(json => (json?.results || []).map(r => withKey(tmdbToRecCard({ ...r, media_type: mediaType }))))
          .catch(() => [])
      )
    }
  }
  return (await Promise.all(calls)).flat()
}

export function useRecommendations(favorites, excludeKeys = [], excludeTitles = []) {
  const [recommendations, setRecommendations] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  // Yalnızca tohum kümesi (kayıt + ağırlık) veya hariç tutulanlar değişince
  // yeniden hesapla. Ağırlık imzaya dahil: Beğendim'i Bayıldım'a yükseltmek
  // öneri kümesini gerçekten değiştirmeli.
  const favSignature = favorites.map(f => `${f.key}:${f._w || 1}`).join('|') +
    '#' + [...excludeKeys].join('|')

  useEffect(() => {
    if (!favorites.length) {
      setRecommendations([])
      setError(null)
      setLoading(false)
      return
    }

    // API anahtarı yoksa doğrudan yerel öneriler
    if (!API_KEY) {
      setRecommendations(localRecommendations(favorites, excludeKeys))
      setLoading(false)
      setError(null)
      return
    }

    const controller = new AbortController()
    let cancelled = false

    setLoading(true)
    setError(null)

    tmdbRecommendations(favorites, controller.signal, excludeKeys, excludeTitles)
      .then(recs => {
        if (cancelled) return
        // TMDB hiç sonuç vermezse yerel fallback
        setRecommendations(recs.length ? recs : localRecommendations(favorites, excludeKeys))
      })
      .catch(e => {
        if (cancelled || e.name === 'AbortError') return
        setError('Öneriler yüklenemedi.')
        setRecommendations(localRecommendations(favorites, excludeKeys))
      })
      .finally(() => { if (!cancelled) setLoading(false) })

    return () => { cancelled = true; controller.abort() }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [favSignature])

  return { recommendations, loading, error }
}
