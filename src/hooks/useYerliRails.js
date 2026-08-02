import { useState, useEffect } from 'react'
import { railsFor, RAIL_MIN_ITEMS } from '../lib/rails.js'
import { discoverUrl, sortByYerliScore } from '../lib/yerli.js'
import { tmdbToListCard } from '../lib/cards.js'

const TMDB_KEY = import.meta.env.VITE_TMDB_KEY

// Raf başına en fazla kaç kart gösterilsin (discover zaten sayfa başı 20 döndürür).
const RAIL_MAX_ITEMS = 20

// Modül düzeyi önbellek: sekme → raf dizisi. Mercek/sekme arasında gidip gelirken
// aynı rafları tekrar tekrar çekmeyi önler (oturum boyunca korunur).
const railCache = new Map()

// Yerli merceğinin editoryal raflarını getirir.
// active=false iken hiç ağ isteği yapılmaz — Dünya merceğinde raf yoktur.
export function useYerliRails(tab, active) {
  const [rails, setRails]     = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!active || !TMDB_KEY) {
      setRails([])
      return
    }

    const defs = railsFor(tab)
    if (defs.length === 0) {
      setRails([])
      return
    }

    if (railCache.has(tab)) {
      setRails(railCache.get(tab))
      return
    }

    const ctrl = new AbortController()
    let cancelled = false
    setLoading(true)

    Promise.allSettled(
      defs.map(async (d) => {
        const res = await fetch(
          discoverUrl(d.mediaType, { page: 1, apiKey: TMDB_KEY, ...d.params }),
          { signal: ctrl.signal }
        )
        if (!res.ok) throw new Error(`TMDB ${res.status}`)
        const json = await res.json()
        let items = (json.results || []).map(r => tmdbToListCard(r, d.mediaType, true))
        // TMDB ham ortalamaya göre sıralar; Bayesian ağırlık istemcide uygulanır.
        if (d.sortByYerli) items = sortByYerliScore(items)
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
        railCache.set(tab, ok)
        setRails(ok)
      })
      .finally(() => { if (!cancelled) setLoading(false) })

    return () => { cancelled = true; ctrl.abort() }
  }, [tab, active])

  return { rails, loading }
}
