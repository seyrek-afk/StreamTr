import { useState, useRef, useCallback } from 'react'
import { ALL_CONTENT } from '../data/mockData.js'

export function useSearch() {
  const [query,         setQuery]         = useState('')
  const [suggestions,   setSuggestions]   = useState([])
  const [suggesting,    setSuggesting]    = useState(false)
  const [selectedItem,  setSelectedItem]  = useState(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailError,   setDetailError]   = useState(null)

  const debounceRef = useRef(null)

  // ── Yazarken öneri listesi (mock veriden filtrele) ───────────────────────────
  const handleQueryChange = useCallback((val) => {
    setQuery(val)
    setSelectedItem(null)
    setDetailError(null)

    clearTimeout(debounceRef.current)

    if (!val.trim() || val.length < 2) {
      setSuggestions([])
      return
    }

    debounceRef.current = setTimeout(() => {
      setSuggesting(true)
      const q = val.toLowerCase()
      const matches = ALL_CONTENT
        .filter(item =>
          item.title.toLowerCase().includes(q) ||
          (item.originalTitle || '').toLowerCase().includes(q)
        )
        .slice(0, 8)
        .map(item => item.title)

      setSuggestions(matches)
      setSuggesting(false)
    }, 200)
  }, [])

  // ── Öneri seçilince detayı göster (mock veriden bul) ────────────────────────
  const selectSuggestion = useCallback((title) => {
    setQuery(title)
    setSuggestions([])
    setDetailLoading(true)
    setDetailError(null)
    setSelectedItem(null)

    setTimeout(() => {
      const q    = title.toLowerCase()
      const item = ALL_CONTENT.find(
        d => d.title.toLowerCase() === q || (d.originalTitle || '').toLowerCase() === q
      ) || ALL_CONTENT.find(
        d => d.title.toLowerCase().includes(q)
      )

      if (item) {
        setSelectedItem(item)
      } else {
        setDetailError(`"${title}" için sonuç bulunamadı.`)
      }
      setDetailLoading(false)
    }, 300)
  }, [])

  const clearSearch = useCallback(() => {
    setQuery('')
    setSuggestions([])
    setSelectedItem(null)
    setDetailError(null)
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
    clearSearch,
  }
}
