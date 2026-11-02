import { useState, useEffect, useMemo } from 'react'
import { railsFor, RAIL_MIN_ITEMS, railQueryParams, finalizeRailItems, railCacheKey } from '../lib/rails.js'
import { discoverUrl, sortByWeightedScore, poolMean } from '../lib/discover.js'
import { tmdbToListCard } from '../lib/cards.js'

const TMDB_KEY = import.meta.env.VITE_TMDB_KEY

// Raf başına en fazla kaç kart gösterilsin (discover zaten sayfa başı 20 döndürür).
const RAIL_MAX_ITEMS = 20

// Raf isteklerinin (gövde okuma dahil) toplam süre sınırı — useStreamData ile
// aynı 10 sn. Yanıt vermeyen TMDB "Raflar hazırlanıyor…"u sonsuza dek tutmasın.
export const RAIL_TIMEOUT_MS = 10_000

// Modül düzeyi önbellek: "ülke:sekme:animN" → raf dizisi. Mercek/sekme arasında gidip
// gelirken aynı rafları tekrar tekrar çekmeyi önler (oturum boyunca korunur).
const railCache = new Map()

// Bir ülke merceğinin editoryal raflarını getirir.
// country boşsa (Dünya merceği) hiç ağ isteği yapılmaz — orada raf yoktur.
export function useCountryRails(tab, country, { hideAnimation = false } = {}) {
  const [rails, setRails]     = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    // Erken dönüşlerde yükleme bayrağı burada kapanır: iptal edilen önceki
    // istek (cancelled) kendi finally'sinde kapatamaz.
    if (!country || !TMDB_KEY) {
      setRails([])
      setLoading(false)
      return
    }

    const defs = railsFor(tab, country)
    if (defs.length === 0) {
      setRails([])
      setLoading(false)
      return
    }

    const cacheKey = railCacheKey(country, tab, { hideAnimation })
    if (railCache.has(cacheKey)) {
      setRails(railCache.get(cacheKey))
      setLoading(false)
      return
    }

    const ctrl = new AbortController()
    let cancelled = false
    const timer = setTimeout(() => ctrl.abort(), RAIL_TIMEOUT_MS)
    setLoading(true)

    Promise.allSettled(
      defs.map(async (d) => {
        const res = await fetch(
          discoverUrl(d.mediaType, { country, page: 1, apiKey: TMDB_KEY, ...railQueryParams(d.params, { hideAnimation }) }),
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
        return { ...d, items: finalizeRailItems(items, { hideAnimation, max: RAIL_MAX_ITEMS }) }
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
        // Yalnız eksiksiz sonuç önbelleğe girer: geçici bir TMDB hatası ya da
        // süre aşımı rafı oturum boyunca silmesin, merceğe dönünce yeniden denensin.
        if (settled.every(s => s.status === 'fulfilled')) railCache.set(cacheKey, ok)
        setRails(ok)
      })
      .finally(() => {
        clearTimeout(timer)
        if (!cancelled) setLoading(false)
      })

    return () => { cancelled = true; clearTimeout(timer); ctrl.abort() }
  }, [tab, country, hideAnimation])

  // Tercih gizliye dönünce yeni raflar gelene kadar ekrandaki raflar önceki
  // (animasyonlu) sorgudandır; tercih burada da uygulanır ki bir an bile sızmasın.
  const visibleRails = useMemo(() => {
    if (!hideAnimation) return rails
    return rails
      .map(r => ({ ...r, items: finalizeRailItems(r.items, { hideAnimation: true }) }))
      .filter(r => r.items.length >= RAIL_MIN_ITEMS)
  }, [rails, hideAnimation])

  return { rails: visibleRails, loading }
}
