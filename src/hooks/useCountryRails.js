import { useState, useEffect } from 'react'
import { railsFor, RAIL_MIN_ITEMS } from '../lib/rails.js'
import { discoverUrl, sortByWeightedScore, poolMean } from '../lib/discover.js'
import { tmdbToListCard } from '../lib/cards.js'

const TMDB_KEY = import.meta.env.VITE_TMDB_KEY

// Raf başına en fazla kaç kart gösterilsin (discover zaten sayfa başı 20 döndürür).
const RAIL_MAX_ITEMS = 20

// Modül düzeyi önbellek: "ülke:sekme" → raf dizisi. Mercek/sekme arasında gidip
// gelirken aynı rafları tekrar tekrar çekmeyi önler (oturum boyunca korunur).
const railCache = new Map()

// Bir ülke merceğinin editoryal raflarını getirir.
// country boşsa (Dünya merceği) hiç ağ isteği yapılmaz — orada raf yoktur.
export function useCountryRails(tab, country) {
  const [rails, setRails]     = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!country || !TMDB_KEY) {
      setRails([])
      return
    }

    const defs = railsFor(tab, country)
    if (defs.length === 0) {
      setRails([])
      return
    }

    const cacheKey = `${country}:${tab}`
    if (railCache.has(cacheKey)) {
      setRails(railCache.get(cacheKey))
      return
    }

    const ctrl = new AbortController()
    let cancelled = false
    setLoading(true)

    Promise.allSettled(
      defs.map(async (d) => {
        const res = await fetch(
          discoverUrl(d.mediaType, { country, page: 1, apiKey: TMDB_KEY, ...d.params }),
          { signal: ctrl.signal }
        )
        if (!res.ok) throw new Error(`TMDB ${res.status}`)
        const json = await res.json()
        const raw = json.results || []
        // Havuz ortalaması bu raftan tahmin edilir; yetersiz örnekte yedek sabite düşer.
        const c = poolMean(raw)
        let items = raw.map(r => tmdbToListCard(r, d.mediaType, country, c))
        // TMDB ham ortalamaya göre sıralar; Bayesian ağırlık istemcide uygulanır.
        if (d.sortByWeighted) items = sortByWeightedScore(items)
        return { ...d, items: items.slice(0, RAIL_MAX_ITEMS) }
      })
    )
      .then(settled => {
        if (cancelled) return
        const ok = settled
          .filter(s => s.status === 'fulfilled')
          .map(s => s.value)
          // Yarım raf amatör durur: eşiğin altındaki raf hiç gösterilmez.
          // Boş sağlayıcıların rafı da bu kuralla kendiliğinden doğmaz.
          .filter(r => r.items.length >= RAIL_MIN_ITEMS)
        railCache.set(cacheKey, ok)
        setRails(ok)
      })
      .finally(() => { if (!cancelled) setLoading(false) })

    return () => { cancelled = true; ctrl.abort() }
  }, [tab, country])

  return { rails, loading }
}
