import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useRecommendations } from '../hooks/useRecommendations.js'
import { favKey } from '../contexts/FavoritesContext.jsx'

// Network'ü reddet → her durumda deterministik yerel (tür-eşleşmeli) fallback'i zorla.
beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new Error('no network'))))
})
afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('useRecommendations', () => {
  it('returns no recommendations when there are no favorites', () => {
    const { result } = renderHook(() => useRecommendations([]))
    expect(result.current.recommendations).toEqual([])
    expect(result.current.loading).toBe(false)
  })

  it('recommends genre-matching content and excludes the favorite itself', async () => {
    // "Breaking Bad" benzeri bir Suç/Dram favorisi → aynı türden öneriler beklenir
    const fav = {
      key: 'title:Breaking Bad:2008',
      title: 'Breaking Bad', year: 2008,
      genres: ['Suç', 'Dram'],
    }

    const { result } = renderHook(() => useRecommendations([fav]))

    await waitFor(() => {
      expect(result.current.recommendations.length).toBeGreaterThan(0)
    })

    const recs = result.current.recommendations
    // Favorinin kendisi önerilerde olmamalı
    expect(recs.some(r => favKey(r) === fav.key)).toBe(false)
    // Tüm öneriler favori türlerinden en az biriyle örtüşmeli
    expect(
      recs.every(r => (r.genres || []).some(g => fav.genres.includes(g)))
    ).toBe(true)
  })

  it('returns empty when favorites have genres with no local matches', async () => {
    const fav = { key: 'title:Nope:2099', title: 'Nope', year: 2099, genres: ['__YokTür__'] }
    const { result } = renderHook(() => useRecommendations([fav]))

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })
    expect(result.current.recommendations).toEqual([])
  })
})
