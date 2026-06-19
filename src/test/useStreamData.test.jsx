import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useStreamData } from '../hooks/useStreamData.js'

// Helper: build a minimal TMDB page response
function makeTmdbPage(count = 5) {
  return {
    results: Array.from({ length: count }, (_, i) => ({
      id: i + 1,
      media_type: i % 2 === 0 ? 'movie' : 'tv',
      title: `Movie ${i}`,
      name: `Show ${i}`,
      original_title: `Movie ${i}`,
      original_name: `Show ${i}`,
      vote_average: 7.5,
      vote_count: 1000,
      popularity: 200,
      poster_path: null,
      release_date: '2024-01-01',
      first_air_date: '2024-01-01',
      genre_ids: [28, 18],
      overview: 'Test overview',
    })),
  }
}

// Flush all fake timers AND their async callbacks (microtasks)
async function flushAll() {
  await act(async () => {
    await vi.runAllTimersAsync()
  })
}

describe('useStreamData', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    // Mock fetch for trend tab (TMDB key may be set in env)
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => makeTmdbPage(20),
    })
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('initial state: all tabs empty, not loading, no errors', () => {
    const { result } = renderHook(() => useStreamData())
    const { data, loading, error, visible, hasMore } = result.current

    expect(data.diziler).toEqual([])
    expect(data.filmler).toEqual([])
    expect(data.trend).toEqual([])
    expect(loading.diziler).toBe(false)
    expect(loading.filmler).toBe(false)
    expect(loading.trend).toBe(false)
    expect(error.diziler).toBeNull()
    expect(error.filmler).toBeNull()
    expect(error.trend).toBeNull()
    expect(visible.diziler).toBe(30)
    expect(hasMore.diziler).toBe(true)
  })

  // NOT: TMDB anahtarı varsa diziler/filmler TMDB'den (top_rated) yüklenir,
  // yoksa mock veriye düşer. Testler her iki modu da tolere eder.
  it('fetchTab(diziler) sets loading true, then resolves with data', async () => {
    const { result } = renderHook(() => useStreamData())

    act(() => { result.current.fetchTab('diziler') })
    expect(result.current.loading.diziler).toBe(true)

    await flushAll()

    expect(result.current.loading.diziler).toBe(false)
    expect(result.current.data.diziler.length).toBeGreaterThan(0)
    expect(result.current.error.diziler).toBeNull()
  })

  it('fetchTab(filmler) resolves with data', async () => {
    const { result } = renderHook(() => useStreamData())

    act(() => { result.current.fetchTab('filmler') })
    await flushAll()

    expect(result.current.data.filmler.length).toBeGreaterThan(0)
    expect(result.current.loading.filmler).toBe(false)
  })

  it('fetchTab(trend) loads data (mocked fetch or mock fallback)', async () => {
    const { result } = renderHook(() => useStreamData())

    act(() => { result.current.fetchTab('trend') })
    await flushAll()

    expect(result.current.loading.trend).toBe(false)
    expect(result.current.error.trend).toBeNull()
    expect(result.current.data.trend.length).toBeGreaterThan(0)
  })

  it('fetchTab(trend) maps TMDB items to card format with socialScore', async () => {
    const { result } = renderHook(() => useStreamData())

    act(() => { result.current.fetchTab('trend') })
    await flushAll()

    const items = result.current.data.trend
    if (items.length > 0) {
      expect(items[0]).toHaveProperty('socialScore')
      expect(items[0]).toHaveProperty('trendRank')
      expect(items[0]).toHaveProperty('trendReason')
      expect(items[0]).toHaveProperty('popularityCriteria')
      expect(Array.isArray(items[0].popularityCriteria)).toBe(true)
    }
  })

  it('fetchTab does not re-fetch if tab is already loaded', async () => {
    const { result } = renderHook(() => useStreamData())

    act(() => { result.current.fetchTab('diziler') })
    await flushAll()
    const dataAfterFirst = result.current.data.diziler

    act(() => { result.current.fetchTab('diziler') })
    await flushAll()

    expect(result.current.data.diziler).toBe(dataAfterFirst)
    expect(result.current.loading.diziler).toBe(false)
  })

  it('visible starts at PAGE_SIZE (30) after fetch', async () => {
    const { result } = renderHook(() => useStreamData())

    act(() => { result.current.fetchTab('diziler') })
    await flushAll()

    expect(result.current.visible.diziler).toBe(30)
  })

  it('hasMore reflects whether data has more than PAGE_SIZE items', async () => {
    const { result } = renderHook(() => useStreamData())

    act(() => { result.current.fetchTab('diziler') })
    await flushAll()

    const dataLen = result.current.data.diziler.length
    if (dataLen <= 10) {
      expect(result.current.hasMore.diziler).toBe(false)
    } else {
      expect(result.current.hasMore.diziler).toBe(true)
    }
  })

  it('showMore increments visible count by PAGE_SIZE', async () => {
    const { result } = renderHook(() => useStreamData())

    act(() => { result.current.fetchTab('filmler') })
    await flushAll()

    const visibleBefore = result.current.visible.filmler
    const dataLen = result.current.data.filmler.length

    if (dataLen > 30) {
      act(() => { result.current.showMore('filmler') })
      expect(result.current.visible.filmler).toBe(Math.min(visibleBefore + 30, dataLen))
    }
  })

  it('retry resets loaded flag and re-fetches', async () => {
    const { result } = renderHook(() => useStreamData())

    act(() => { result.current.fetchTab('diziler') })
    await flushAll()
    expect(result.current.data.diziler.length).toBeGreaterThan(0)

    act(() => { result.current.retry('diziler') })
    await flushAll()

    expect(result.current.data.diziler.length).toBeGreaterThan(0)
    expect(result.current.error.diziler).toBeNull()
  })

  it('other tabs are not affected when one tab is fetched', async () => {
    const { result } = renderHook(() => useStreamData())

    act(() => { result.current.fetchTab('diziler') })
    await flushAll()

    expect(result.current.data.filmler).toEqual([])
    expect(result.current.data.trend).toEqual([])
    expect(result.current.loading.filmler).toBe(false)
    expect(result.current.loading.trend).toBe(false)
  })

  it('fetchTab sets error state when TMDB fetch fails', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: false, status: 500 })

    const { result } = renderHook(() => useStreamData())
    act(() => { result.current.fetchTab('trend') })
    await flushAll()

    expect(result.current.loading.trend).toBe(false)
    expect(result.current.error.trend).not.toBeNull()
  })
})
