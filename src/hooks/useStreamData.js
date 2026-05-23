import { useState } from 'react'
import { MOCK_DIZILER, MOCK_FILMLER, MOCK_TREND } from '../data/mockData.js'

const PAGE_SIZE  = 10
const MAX_ITEMS  = 100

const SOURCE = {
  diziler: MOCK_DIZILER,
  filmler: MOCK_FILMLER,
  trend:   MOCK_TREND,
}

function emptyTab(val) {
  return { diziler: val, filmler: val, trend: val }
}

export function useStreamData() {
  const [data,        setData]        = useState(emptyTab([]))
  const [loading,     setLoading]     = useState(emptyTab(false))
  const [loadingMore, setLoadingMore] = useState(emptyTab(false))
  const [error,       setError]       = useState(emptyTab(null))
  const [visible,     setVisible]     = useState(emptyTab(PAGE_SIZE))
  const [hasMore,     setHasMore]     = useState(emptyTab(true))
  const [loaded,      setLoaded]      = useState(emptyTab(false))

  // ── İlk yükleme (mock veriden) ──────────────────────────────────────────────
  const fetchTab = (tab) => {
    if (loaded[tab]) return
    setLoading(p => ({ ...p, [tab]: true }))

    // Gerçek bir API gibi hissettirmek için kısa gecikme
    setTimeout(() => {
      const items = SOURCE[tab] || []
      setData(p    => ({ ...p, [tab]: items }))
      setVisible(p => ({ ...p, [tab]: PAGE_SIZE }))
      setHasMore(p => ({ ...p, [tab]: items.length > PAGE_SIZE }))
      setLoaded(p  => ({ ...p, [tab]: true }))
      setLoading(p => ({ ...p, [tab]: false }))
    }, 600)
  }

  // ── Daha Çok Göster ─────────────────────────────────────────────────────────
  const showMore = (tab) => {
    const next    = visible[tab] + PAGE_SIZE
    const total   = data[tab].length
    const capped  = Math.min(next, MAX_ITEMS, total)
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
