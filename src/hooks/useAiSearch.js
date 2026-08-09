import { useState, useCallback, useRef } from 'react'
import { resolveQuery } from '../lib/aiQuery.js'
import { tmdbToListCard } from '../lib/cards.js'
import { poolMean } from '../lib/discover.js'
import { genreIdsFor, genresUnsupportedFor } from '../lib/genres.js'

const TMDB_BASE = 'https://api.themoviedb.org/3'
const TMDB_KEY  = import.meta.env.VITE_TMDB_KEY

// Çözülmüş anahtar kelime id'leri (terim → id). Aynı tema tekrar aranınca
// fazladan ağ turu olmasın diye oturum boyunca saklanır.
const keywordCache = new Map()

// İngilizce tema terimini TMDB anahtar kelime id'sine çevirir.
// ID'ler sabit kodlanmaz: tahmini id'ler yanlış çıkıyor ve yanlış id hata
// vermeden yanlış sonuç veriyor (bkz. lib/aiQuery.js'teki not).
async function resolveKeywordIds(terms, signal) {
  const ids = []
  for (const term of terms) {
    if (keywordCache.has(term)) {
      const cached = keywordCache.get(term)
      if (cached) ids.push(cached)
      continue
    }
    try {
      const res = await fetch(
        `${TMDB_BASE}/search/keyword?query=${encodeURIComponent(term)}&api_key=${TMDB_KEY}`,
        { signal }
      )
      if (!res.ok) { keywordCache.set(term, null); continue }
      const json = await res.json()
      // İlk sonuç en alakalısıdır ("religion" → 11001 religion).
      const id = json.results?.[0]?.id ?? null
      keywordCache.set(term, id)
      if (id) ids.push(id)
    } catch (e) {
      if (e.name === 'AbortError') throw e
      keywordCache.set(term, null)
    }
  }
  return ids
}

// Medya türüne özgü TMDB parametrelerini kurar. Çözümleyici (LLM ya da yerel
// ayrıştırıcı) türden bağımsız bir niyet üretir; uca özgü farklar burada çözülür:
//   • tarih alanı adı: film → primary_release_date, dizi → first_air_date
//   • tür id'leri: film ve dizide FARKLIDIR (bkz. lib/genres.js)
//   • süre filtresi yalnız filmde anlamlıdır (dizide bölüm süresi, çoğu kayıtta boş)
function paramsFor(params, genreKeys, mediaType) {
  const out = {}
  const field = mediaType === 'movie' ? 'primary_release_date' : 'first_air_date'
  for (const [k, v] of Object.entries(params)) {
    if (k === '_date.gte')      out[`${field}.gte`] = v
    else if (k === '_date.lte') out[`${field}.lte`] = v
    else if (k.startsWith('with_runtime') && mediaType !== 'movie') continue
    else out[k] = v
  }
  const ids = genreIdsFor(genreKeys, mediaType)
  if (ids.length) out.with_genres = ids.join(',')
  // Sıralama alanı da uca özgü: dizide primary_release_date yoktur.
  if (mediaType !== 'movie' && out.sort_by === 'primary_release_date.desc') {
    out.sort_by = 'first_air_date.desc'
  }
  return out
}

function buildUrl(mediaType, params) {
  const qs = new URLSearchParams({ language: 'tr-TR', page: '1', include_adult: 'false' })
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== '') qs.set(k, String(v))
  }
  qs.set('api_key', TMDB_KEY)
  return `${TMDB_BASE}/discover/${mediaType}?${qs.toString()}`
}

export function useAiSearch() {
  const [prompt,   setPrompt]   = useState('')
  const [results,  setResults]  = useState([])
  const [explain,  setExplain]  = useState([])
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState(null)
  const [searched, setSearched] = useState(false)
  // Hangi katman çözdü ('ai' | 'local') ve yedeğe düşüldüyse sebebi.
  const [source,   setSource]   = useState(null)
  const [notice,   setNotice]   = useState(null)

  const abortRef = useRef(null)

  const run = useCallback(async (text) => {
    const q = (text ?? '').trim()
    if (!q) return

    abortRef.current?.abort()
    const ctrl = new AbortController()
    abortRef.current = ctrl

    setLoading(true)
    setError(null)
    setSearched(true)

    try {
      if (!TMDB_KEY) throw new Error('TMDB API anahtarı eksik.')

      const parsed = await resolveQuery(q, ctrl.signal)
      if (ctrl.signal.aborted) return
      setExplain(parsed.explain || [])
      setSource(parsed.source || 'local')
      setNotice(parsed.notice || null)

      if (parsed.empty) {
        setResults([])
        setError('İsteğini tam çözemedim. Tür, ülke, dönem veya "yüksek puanlı" gibi bir ipucu eklemeyi dene.')
        return
      }

      // Tema id'lerini çöz (varsa) ve parametrelere ekle.
      const kwIds = parsed.keywordTerms?.length
        ? await resolveKeywordIds(parsed.keywordTerms, ctrl.signal)
        : []
      const baseParams = kwIds.length
        ? { ...parsed.params, with_keywords: kwIds.join('|') }
        : parsed.params

      // Tür istendi ama bu uçta karşılığı yoksa (ör. TMDB'de "korku dizisi" türü
      // yok) o uç HİÇ sorgulanmaz. Filtreyi sessizce düşürüp alakasız sonuç
      // göstermek, kullanıcının istediğini vermemenin gizlenmiş hâli olurdu.
      const targets = parsed.mediaTypes.filter(
        mt => !genresUnsupportedFor(parsed.genreKeys, mt)
      )
      if (targets.length === 0) {
        setResults([])
        setError('Bu tür bu içerik türünde aranamıyor (TMDB\'de karşılığı yok). Tür veya film/dizi tercihini değiştirmeyi dene.')
        return
      }

      // Film ve dizi ayrı uçlardan gelir; istenen türler paralel çekilip birleşir.
      const settled = await Promise.allSettled(
        targets.map(async (mt) => {
          const res = await fetch(buildUrl(mt, paramsFor(baseParams, parsed.genreKeys, mt)), { signal: ctrl.signal })
          if (!res.ok) throw new Error(`TMDB ${res.status}`)
          const json = await res.json()
          const raw = json.results || []
          const c = poolMean(raw)
          return raw.map(r => tmdbToListCard(r, mt, parsed.params.with_origin_country || null, c))
        })
      )

      const merged = settled
        .filter(s => s.status === 'fulfilled')
        .flatMap(s => s.value)

      if (merged.length === 0) {
        setResults([])
        setError('Bu kriterlere uyan yapım bulunamadı. Filtreleri biraz gevşetmeyi dene.')
        return
      }

      // Sunucu sıralaması tür başına ayrı geldiği için birleşimde yeniden dizilir.
      const sorted = baseParams.sort_by === 'vote_average.desc'
        ? merged.sort((a, b) => (b._weightedScore || 0) - (a._weightedScore || 0))
        : merged.sort((a, b) => (b._voteCount || 0) - (a._voteCount || 0))

      setResults(sorted.slice(0, 40))
    } catch (e) {
      if (e.name === 'AbortError') return
      setResults([])
      setError(e.message || 'Arama başarısız oldu.')
    } finally {
      setLoading(false)
    }
  }, [])

  const clear = useCallback(() => {
    abortRef.current?.abort()
    setPrompt('')
    setResults([])
    setExplain([])
    setError(null)
    setSearched(false)
    setLoading(false)
    setSource(null)
    setNotice(null)
  }, [])

  return { prompt, setPrompt, results, explain, loading, error, searched, source, notice, run, clear }
}
