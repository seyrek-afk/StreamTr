import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useSearch } from '../hooks/useSearch.js'

// Flush all fake timers AND microtasks from async callbacks
async function flushAll() {
  await act(async () => {
    await vi.runAllTimersAsync()
  })
}

const TMDB_SEARCH_RESULTS = [
  { id: 1, media_type: 'movie', title: 'Inception', release_date: '2010-07-16', poster_path: '/inc.jpg' },
  { id: 2, media_type: 'tv',    name: 'Inception Show', first_air_date: '2020-01-01', poster_path: null },
]

const TMDB_DETAIL_MOVIE = {
  id: 1, title: 'Inception', original_title: 'Inception',
  release_date: '2010-07-16', vote_average: 8.8, overview: 'A thief.',
  genres: [{ id: 878, name: 'Science Fiction' }],
  credits: { cast: [{ id: 10, name: 'Leo', character: 'Dom', profile_path: null }], crew: [] },
  reviews: { results: [] },
  videos: { results: [] },
  recommendations: { results: [] },
}

describe('useSearch', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('initial state is correct', () => {
    const { result } = renderHook(() => useSearch())
    expect(result.current.query).toBe('')
    expect(result.current.suggestions).toEqual([])
    expect(result.current.suggesting).toBe(false)
    expect(result.current.selectedItem).toBeNull()
    expect(result.current.detailLoading).toBe(false)
    expect(result.current.detailError).toBeNull()
  })

  it('noApiKey is a boolean', () => {
    const { result } = renderHook(() => useSearch())
    expect(typeof result.current.noApiKey).toBe('boolean')
  })

  it('clearSearch resets all state', () => {
    const { result } = renderHook(() => useSearch())

    act(() => { result.current.handleQueryChange('inception') })
    act(() => { result.current.clearSearch() })

    expect(result.current.query).toBe('')
    expect(result.current.suggestions).toEqual([])
    expect(result.current.selectedItem).toBeNull()
    expect(result.current.detailError).toBeNull()
  })

  it('handleQueryChange updates query state', () => {
    const { result } = renderHook(() => useSearch())
    act(() => { result.current.handleQueryChange('batman') })
    expect(result.current.query).toBe('batman')
  })

  it('handleQueryChange with empty string clears suggestions immediately', () => {
    const { result } = renderHook(() => useSearch())
    act(() => { result.current.handleQueryChange('') })
    expect(result.current.suggestions).toEqual([])
  })

  it('handleQueryChange with 1 character clears suggestions (min 2 required)', () => {
    const { result } = renderHook(() => useSearch())
    act(() => { result.current.handleQueryChange('a') })
    expect(result.current.suggestions).toEqual([])
  })

  it('handleQueryChange with whitespace-only clears suggestions', () => {
    const { result } = renderHook(() => useSearch())
    act(() => { result.current.handleQueryChange('   ') })
    expect(result.current.suggestions).toEqual([])
  })

  it('handleQueryChange calls TMDB search after 300ms debounce', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ results: TMDB_SEARCH_RESULTS }),
    })

    const { result } = renderHook(() => useSearch())
    act(() => { result.current.handleQueryChange('inception') })
    expect(result.current.query).toBe('inception')

    await flushAll()

    expect(global.fetch).toHaveBeenCalledTimes(1)
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('inception'),
      expect.any(Object)
    )
  })

  it('handleQueryChange debounce: only one fetch for rapid input changes', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ results: [] }),
    })

    const { result } = renderHook(() => useSearch())

    act(() => { result.current.handleQueryChange('ab') })
    act(() => { result.current.handleQueryChange('abc') })
    act(() => { result.current.handleQueryChange('abcd') })

    await flushAll()

    // Only the last query fires (previous are cancelled by debounce)
    expect(result.current.query).toBe('abcd')
    expect(global.fetch).toHaveBeenCalledTimes(1)
  })

  it('handleQueryChange populates suggestions from TMDB response', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ results: TMDB_SEARCH_RESULTS }),
    })

    const { result } = renderHook(() => useSearch())
    act(() => { result.current.handleQueryChange('inception') })
    await flushAll()

    expect(result.current.suggestions).toHaveLength(2)
    expect(result.current.suggestions[0].title).toBe('Inception')
    expect(result.current.suggestions[1].title).toBe('Inception Show')
    expect(result.current.suggesting).toBe(false)
  })

  it('handleQueryChange filters out person media_type from suggestions', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        results: [
          { id: 1, media_type: 'movie', title: 'Inception', release_date: '2010-07-16', poster_path: null },
          { id: 2, media_type: 'person', name: 'Some Actor', poster_path: null },
        ],
      }),
    })

    const { result } = renderHook(() => useSearch())
    act(() => { result.current.handleQueryChange('inception') })
    await flushAll()

    expect(result.current.suggestions).toHaveLength(1)
    expect(result.current.suggestions[0].mediaType).toBe('movie')
  })

  it('handleQueryChange limits suggestions to 8 items', async () => {
    const manyResults = Array.from({ length: 15 }, (_, i) => ({
      id: i + 1, media_type: 'movie', title: `Movie ${i}`, release_date: '2024-01-01', poster_path: null,
    }))
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ results: manyResults }),
    })

    const { result } = renderHook(() => useSearch())
    act(() => { result.current.handleQueryChange('movie') })
    await flushAll()

    expect(result.current.suggestions.length).toBeLessThanOrEqual(8)
  })

  it('selectSuggestion sets query and clears suggestions', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => TMDB_DETAIL_MOVIE,
    })

    const { result } = renderHook(() => useSearch())
    await act(async () => {
      result.current.selectSuggestion({ id: 1, mediaType: 'movie', title: 'Inception', year: '2010', posterPath: null })
      await vi.runAllTimersAsync()
    })

    expect(result.current.query).toBe('Inception')
    expect(result.current.suggestions).toEqual([])
  })

  it('selectSuggestion populates selectedItem on successful TMDB fetch', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => TMDB_DETAIL_MOVIE,
    })

    const { result } = renderHook(() => useSearch())
    await act(async () => {
      result.current.selectSuggestion({ id: 1, mediaType: 'movie', title: 'Inception', year: '2010', posterPath: null })
      await vi.runAllTimersAsync()
    })

    expect(result.current.selectedItem).not.toBeNull()
    expect(result.current.selectedItem.title).toBe('Inception')
    expect(result.current.selectedItem.imdbScore).toBe(8.8)
    expect(result.current.selectedItem.type).toBe('film')
    expect(result.current.detailLoading).toBe(false)
  })

  it('selectSuggestion for TV show sets type to dizi', async () => {
    const tvDetail = {
      id: 2, name: 'Breaking Bad', original_name: 'Breaking Bad',
      first_air_date: '2008-01-20', vote_average: 9.5, overview: 'A teacher.',
      genres: [{ id: 80, name: 'Crime' }],
      credits: { cast: [], crew: [] }, reviews: { results: [] },
      videos: { results: [] }, recommendations: { results: [] },
      created_by: [{ id: 1, name: 'Vince Gilligan' }],
    }
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => tvDetail,
    })

    const { result } = renderHook(() => useSearch())
    await act(async () => {
      result.current.selectSuggestion({ id: 2, mediaType: 'tv', title: 'Breaking Bad', year: '2008', posterPath: null })
      await vi.runAllTimersAsync()
    })

    expect(result.current.selectedItem).not.toBeNull()
    expect(result.current.selectedItem.type).toBe('dizi')
    expect(result.current.selectedItem.director).not.toBeNull()
    expect(result.current.selectedItem.director.name).toBe('Vince Gilligan')
  })

  it('selectSuggestion sets detailError on HTTP error', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: false, status: 404 })

    const { result } = renderHook(() => useSearch())
    await act(async () => {
      result.current.selectSuggestion({ id: 999, mediaType: 'movie', title: 'Missing', year: '2020', posterPath: null })
      await vi.runAllTimersAsync()
    })

    expect(result.current.detailError).not.toBeNull()
    expect(result.current.detailError).toContain('Missing')
    expect(result.current.detailLoading).toBe(false)
  })

  it('retryDetail re-triggers the last selectSuggestion', async () => {
    let callCount = 0
    global.fetch = vi.fn().mockImplementation(() => {
      callCount++
      return Promise.resolve({ ok: false, status: 500 })
    })

    const { result } = renderHook(() => useSearch())
    await act(async () => {
      result.current.selectSuggestion({ id: 42, mediaType: 'tv', title: 'Breaking Bad', year: '2008', posterPath: null })
      await vi.runAllTimersAsync()
    })
    const callsAfterFirst = callCount

    await act(async () => {
      result.current.retryDetail()
      await vi.runAllTimersAsync()
    })

    expect(callCount).toBeGreaterThan(callsAfterFirst)
  })

  it('tmdbToCard: cast is sliced to 8 members', async () => {
    const manyCast = Array.from({ length: 15 }, (_, i) => ({
      id: i, name: `Actor ${i}`, character: `Char ${i}`, profile_path: null,
    }))
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ ...TMDB_DETAIL_MOVIE, credits: { cast: manyCast, crew: [] } }),
    })

    const { result } = renderHook(() => useSearch())
    await act(async () => {
      result.current.selectSuggestion({ id: 1, mediaType: 'movie', title: 'Inception', year: '2010', posterPath: null })
      await vi.runAllTimersAsync()
    })

    expect(result.current.selectedItem.cast).toHaveLength(8)
  })

  it('tmdbToCard: review quotes are truncated at 220 chars', async () => {
    const longContent = 'A'.repeat(300)
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        ...TMDB_DETAIL_MOVIE,
        reviews: { results: [{ author: 'test', content: longContent }] },
      }),
    })

    const { result } = renderHook(() => useSearch())
    await act(async () => {
      result.current.selectSuggestion({ id: 1, mediaType: 'movie', title: 'Inception', year: '2010', posterPath: null })
      await vi.runAllTimersAsync()
    })

    expect(result.current.selectedItem.reviews[0].quote).toHaveLength(221) // 220 + '…'
    expect(result.current.selectedItem.reviews[0].quote.endsWith('…')).toBe(true)
  })
})
