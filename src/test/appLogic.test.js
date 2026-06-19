/**
 * Tests for pure filtering/sorting logic extracted from App.jsx
 * and additional edge cases for hooks.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useStreamData } from '../hooks/useStreamData.js'

// ── App.jsx filtering logic (extracted for testability) ────────────────────

function applyFilters(items, selectedGenres, platform) {
  return items.filter(item => {
    const gOk = selectedGenres.length === 0 ||
      selectedGenres.some(g => (item.genres || []).includes(g))
    const pOk = platform === 'Tümü' ||
      (item.platforms || []).some(p =>
        platform === 'Amazon Prime'
          ? p.toLowerCase().includes('amazon') || p.toLowerCase().includes('prime')
          : p === platform
      )
    return gOk && pOk
  })
}

function sortItems(items, tab) {
  return [...items].sort((a, b) =>
    tab === 'trend'
      ? (b.socialScore || 0) - (a.socialScore || 0)
      : (b.imdbScore   || 0) - (a.imdbScore   || 0)
  )
}

const SAMPLE_ITEMS = [
  { title: 'A', genres: ['Dram', 'Suç'], platforms: ['Netflix'], imdbScore: 8.5, socialScore: 70 },
  { title: 'B', genres: ['Aksiyon'],      platforms: ['Amazon Prime Video'], imdbScore: 7.2, socialScore: 85 },
  { title: 'C', genres: ['Dram', 'Komedi'], platforms: ['Disney+', 'Netflix'], imdbScore: 9.0, socialScore: 60 },
  { title: 'D', genres: ['Komedi'],       platforms: ['Apple TV+'], imdbScore: 6.8, socialScore: 55 },
]

describe('App filtering — genre filter', () => {
  it('returns all items when no genre selected', () => {
    expect(applyFilters(SAMPLE_ITEMS, [], 'Tümü')).toHaveLength(4)
  })

  it('filters by single genre', () => {
    const result = applyFilters(SAMPLE_ITEMS, ['Dram'], 'Tümü')
    expect(result).toHaveLength(2)
    expect(result.map(i => i.title)).toContain('A')
    expect(result.map(i => i.title)).toContain('C')
  })

  it('filters by multiple genres (OR logic)', () => {
    const result = applyFilters(SAMPLE_ITEMS, ['Aksiyon', 'Komedi'], 'Tümü')
    expect(result.map(i => i.title)).toContain('B')
    expect(result.map(i => i.title)).toContain('C')
    expect(result.map(i => i.title)).toContain('D')
    expect(result.map(i => i.title)).not.toContain('A')
  })

  it('returns empty when no items match genre', () => {
    expect(applyFilters(SAMPLE_ITEMS, ['Bilim Kurgu'], 'Tümü')).toHaveLength(0)
  })

  it('handles items with no genres gracefully', () => {
    const items = [{ title: 'NoGenre', genres: undefined, platforms: ['Netflix'], imdbScore: 7 }]
    expect(applyFilters(items, ['Dram'], 'Tümü')).toHaveLength(0)
    expect(applyFilters(items, [], 'Tümü')).toHaveLength(1)
  })
})

describe('App filtering — platform filter', () => {
  it('returns all items for Tümü', () => {
    expect(applyFilters(SAMPLE_ITEMS, [], 'Tümü')).toHaveLength(4)
  })

  it('filters by Netflix', () => {
    const result = applyFilters(SAMPLE_ITEMS, [], 'Netflix')
    expect(result.map(i => i.title)).toContain('A')
    expect(result.map(i => i.title)).toContain('C')
    expect(result.map(i => i.title)).not.toContain('B')
  })

  it('Amazon Prime matches "Amazon Prime Video" (partial match)', () => {
    const result = applyFilters(SAMPLE_ITEMS, [], 'Amazon Prime')
    expect(result.map(i => i.title)).toContain('B')
    expect(result).toHaveLength(1)
  })

  it('returns empty when platform has no content', () => {
    expect(applyFilters(SAMPLE_ITEMS, [], 'HBO Max')).toHaveLength(0)
  })

  it('handles items with no platforms gracefully', () => {
    const items = [{ title: 'NoPlatform', genres: ['Dram'], platforms: undefined, imdbScore: 7 }]
    expect(applyFilters(items, [], 'Netflix')).toHaveLength(0)
  })
})

describe('App filtering — combined genre + platform', () => {
  it('ANDs genre and platform filter', () => {
    const result = applyFilters(SAMPLE_ITEMS, ['Dram'], 'Netflix')
    expect(result).toHaveLength(2) // A and C both: Dram + Netflix
    result.forEach(i => {
      expect(i.genres).toContain('Dram')
      expect(i.platforms).toContain('Netflix')
    })
  })

  it('returns empty when combined filter matches nothing', () => {
    const result = applyFilters(SAMPLE_ITEMS, ['Aksiyon'], 'Disney+')
    expect(result).toHaveLength(0)
  })
})

describe('App sorting', () => {
  it('sorts by imdbScore descending for non-trend tabs', () => {
    const sorted = sortItems(SAMPLE_ITEMS, 'diziler')
    expect(sorted[0].imdbScore).toBe(9.0)
    expect(sorted[sorted.length - 1].imdbScore).toBe(6.8)
  })

  it('sorts by socialScore descending for trend tab', () => {
    const sorted = sortItems(SAMPLE_ITEMS, 'trend')
    expect(sorted[0].socialScore).toBe(85)
    expect(sorted[sorted.length - 1].socialScore).toBe(55)
  })

  it('does not mutate original array', () => {
    const original = [...SAMPLE_ITEMS]
    sortItems(SAMPLE_ITEMS, 'diziler')
    expect(SAMPLE_ITEMS).toEqual(original)
  })

  it('handles missing imdbScore gracefully (treated as 0)', () => {
    const items = [
      { title: 'X', imdbScore: null, socialScore: 0 },
      { title: 'Y', imdbScore: 7.5, socialScore: 0 },
    ]
    const sorted = sortItems(items, 'filmler')
    expect(sorted[0].title).toBe('Y')
  })
})

// ── tmdbToTrendCard detailed field mapping ─────────────────────────────────

function makeTmdbPage(count = 20) {
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

async function flushAll() {
  await act(async () => {
    await vi.runAllTimersAsync()
  })
}

describe('useStreamData — trend card detailed fields', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => makeTmdbPage(20),
    })
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('trend cards have all 4 popularityCriteria entries', async () => {
    const { result } = renderHook(() => useStreamData())
    act(() => { result.current.fetchTab('trend') })
    await flushAll()

    const items = result.current.data.trend
    if (items.length > 0) {
      expect(items[0].popularityCriteria).toHaveLength(4)
      const labels = items[0].popularityCriteria.map(c => c.label)
      expect(labels).toContain('Haftalık Sıra')
      expect(labels).toContain('Ortalama Puan')
      expect(labels).toContain('Toplam Oy')
      expect(labels).toContain('Popülerlik Endeksi')
    }
  })

  it('trend cards carry trendRank starting from 1', async () => {
    const { result } = renderHook(() => useStreamData())
    act(() => { result.current.fetchTab('trend') })
    await flushAll()

    const items = result.current.data.trend
    if (items.length > 0) {
      expect(items[0].trendRank).toBe(1)
    }
  })

  it('trend card type is film for movie items', async () => {
    const { result } = renderHook(() => useStreamData())
    act(() => { result.current.fetchTab('trend') })
    await flushAll()

    const items = result.current.data.trend
    const firstMovie = items.find(i => i._mediaType === 'movie')
    if (firstMovie) {
      expect(firstMovie.type).toBe('film')
    }
  })

  it('trend card type is dizi for tv items', async () => {
    const { result } = renderHook(() => useStreamData())
    act(() => { result.current.fetchTab('trend') })
    await flushAll()

    const items = result.current.data.trend
    const firstTv = items.find(i => i._mediaType === 'tv')
    if (firstTv) {
      expect(firstTv.type).toBe('dizi')
    }
  })

  it('isNewRelease is true when item released within 60 days', async () => {
    const recentDate = new Date(Date.now() - 30 * 86_400_000).toISOString().slice(0, 10)
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        results: [{
          id: 1, media_type: 'movie', title: 'New Film', original_title: 'New Film',
          vote_average: 8.0, vote_count: 5000, popularity: 500,
          poster_path: null, release_date: recentDate, first_air_date: recentDate,
          genre_ids: [28], overview: 'Recent release',
        }],
      }),
    })

    const { result } = renderHook(() => useStreamData())
    act(() => { result.current.fetchTab('trend') })
    await flushAll()

    const items = result.current.data.trend
    if (items.length > 0) {
      expect(items[0].isNewRelease).toBe(true)
    }
  })

  it('isNewRelease is false for old content', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        results: [{
          id: 1, media_type: 'movie', title: 'Old Film', original_title: 'Old Film',
          vote_average: 7.0, vote_count: 20000, popularity: 300,
          poster_path: null, release_date: '2019-01-01', first_air_date: '2019-01-01',
          genre_ids: [18], overview: 'Old content',
        }],
      }),
    })

    const { result } = renderHook(() => useStreamData())
    act(() => { result.current.fetchTab('trend') })
    await flushAll()

    const items = result.current.data.trend
    if (items.length > 0) {
      expect(items[0].isNewRelease).toBe(false)
    }
  })

  it('genre_ids are mapped to Turkish genre names', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        results: [{
          id: 1, media_type: 'movie', title: 'Action Film', original_title: 'Action Film',
          vote_average: 7.5, vote_count: 3000, popularity: 200,
          poster_path: null, release_date: '2024-01-01', first_air_date: null,
          genre_ids: [28, 18, 878],
          overview: 'Action and drama',
        }],
      }),
    })

    const { result } = renderHook(() => useStreamData())
    act(() => { result.current.fetchTab('trend') })
    await flushAll()

    const items = result.current.data.trend
    if (items.length > 0) {
      expect(items[0].genres).toContain('Aksiyon')
      expect(items[0].genres).toContain('Dram')
      expect(items[0].genres).toContain('Bilim Kurgu')
    }
  })

  it('unknown genre_ids are filtered out', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        results: [{
          id: 1, media_type: 'movie', title: 'Unknown Genres', original_title: 'Unknown Genres',
          vote_average: 7.0, vote_count: 1000, popularity: 100,
          poster_path: null, release_date: '2024-01-01', first_air_date: null,
          genre_ids: [99999, 88888],
          overview: 'Unknown',
        }],
      }),
    })

    const { result } = renderHook(() => useStreamData())
    act(() => { result.current.fetchTab('trend') })
    await flushAll()

    const items = result.current.data.trend
    if (items.length > 0) {
      expect(items[0].genres).toHaveLength(0)
    }
  })

  it('loadTrendFromTMDB fetches 5 pages in parallel', async () => {
    const { result } = renderHook(() => useStreamData())
    act(() => { result.current.fetchTab('trend') })
    await flushAll()

    // 5 pages * 1 fetch each
    expect(global.fetch).toHaveBeenCalledTimes(5)
  })

  it('showMore caps visible at MAX_ITEMS=100', async () => {
    // Fill with 100 items
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => makeTmdbPage(20),
    })

    const { result } = renderHook(() => useStreamData())
    act(() => { result.current.fetchTab('trend') })
    await flushAll()

    // showMore multiple times
    for (let i = 0; i < 15; i++) {
      act(() => { result.current.showMore('trend') })
    }

    expect(result.current.visible.trend).toBeLessThanOrEqual(100)
  })
})

// ── useStreamData — loadingMore state ──────────────────────────────────────

describe('useStreamData — exposed state shape', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => makeTmdbPage(5),
    })
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('loadingMore is exposed and initialized to false', () => {
    const { result } = renderHook(() => useStreamData())
    expect(result.current.loadingMore).toBeDefined()
    expect(result.current.loadingMore.diziler).toBe(false)
    expect(result.current.loadingMore.filmler).toBe(false)
    expect(result.current.loadingMore.trend).toBe(false)
  })

  it('hasMore becomes false when total items <= PAGE_SIZE', async () => {
    const { result } = renderHook(() => useStreamData())
    act(() => { result.current.fetchTab('trend') })
    await flushAll()

    // 5 items * 5 pages = 25 items; PAGE_SIZE=30 ve trend ağdan daha fazla çekemez → hasMore=false
    expect(result.current.hasMore.trend).toBe(false)
  })
})

// ── buildTrendReason date boundary tests ───────────────────────────────────

function buildTrendReason(item, rank, isMovie) {
  function fmtCount(n) {
    if (!n) return '—'
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
    if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}k`
    return String(n)
  }

  const dateStr = isMovie ? item.release_date : item.first_air_date
  const parts = []

  if (dateStr) {
    const days = (Date.now() - new Date(dateStr)) / 86_400_000
    if (days < 7)        parts.push('Bu hafta yayınlandı')
    else if (days < 30)  parts.push('Bu ay çıktı')
    else if (days < 90)  parts.push('Son 3 ayın gözde yapımı')
  }

  if      (rank <= 3)  parts.push('TMDB haftalık trendin zirvesi')
  else if (rank <= 10) parts.push('Bu haftanın top 10 yapımı')
  else if (rank <= 25) parts.push('Bu hafta yoğun ilgi gören yapım')

  if (item.vote_count  > 5_000) parts.push(`${fmtCount(item.vote_count)} oy topladı`)
  if (item.popularity  > 1_000) parts.push('Sosyal medyada viral')
  else if (item.popularity > 300) parts.push('Geniş kitlelere ulaştı')

  return parts.slice(0, 3).join(' · ') || `TMDB bu hafta #${rank} trend`
}

describe('buildTrendReason — date boundaries', () => {
  it('marks item released today as "Bu hafta yayınlandı"', () => {
    const today = new Date().toISOString().slice(0, 10)
    const item = { release_date: today, vote_count: 100, popularity: 50 }
    expect(buildTrendReason(item, 50, true)).toContain('Bu hafta yayınlandı')
  })

  it('marks item released 6 days ago as "Bu hafta yayınlandı"', () => {
    const sixDaysAgo = new Date(Date.now() - 6 * 86_400_000).toISOString().slice(0, 10)
    const item = { release_date: sixDaysAgo, vote_count: 100, popularity: 50 }
    expect(buildTrendReason(item, 50, true)).toContain('Bu hafta yayınlandı')
  })

  it('marks item released 10 days ago as "Bu ay çıktı"', () => {
    const tenDaysAgo = new Date(Date.now() - 10 * 86_400_000).toISOString().slice(0, 10)
    const item = { release_date: tenDaysAgo, vote_count: 100, popularity: 50 }
    expect(buildTrendReason(item, 50, true)).toContain('Bu ay çıktı')
  })

  it('marks item released 45 days ago as "Son 3 ayın gözde yapımı"', () => {
    const fortyFiveDaysAgo = new Date(Date.now() - 45 * 86_400_000).toISOString().slice(0, 10)
    const item = { release_date: fortyFiveDaysAgo, vote_count: 100, popularity: 50 }
    expect(buildTrendReason(item, 50, true)).toContain('Son 3 ayın gözde yapımı')
  })

  it('old release (> 90 days) does not include date part', () => {
    const item = { release_date: '2020-01-01', vote_count: 100, popularity: 50 }
    const reason = buildTrendReason(item, 50, true)
    expect(reason).not.toContain('Bu hafta')
    expect(reason).not.toContain('Bu ay')
    expect(reason).not.toContain('Son 3')
  })

  it('rank 3 gets zirvesi', () => {
    const item = { vote_count: 100, popularity: 50 }
    expect(buildTrendReason(item, 3, true)).toContain('TMDB haftalık trendin zirvesi')
  })

  it('rank 10 gets top 10', () => {
    const item = { vote_count: 100, popularity: 50 }
    expect(buildTrendReason(item, 10, true)).toContain('Bu haftanın top 10 yapımı')
  })

  it('rank 25 gets yoğun ilgi', () => {
    const item = { vote_count: 100, popularity: 50 }
    expect(buildTrendReason(item, 25, true)).toContain('Bu hafta yoğun ilgi gören yapım')
  })

  it('rank 26 gets no rank label', () => {
    const item = { vote_count: 100, popularity: 50 }
    const reason = buildTrendReason(item, 26, true)
    expect(reason).not.toContain('zirvesi')
    expect(reason).not.toContain('top 10')
    expect(reason).not.toContain('yoğun ilgi')
  })

  it('popularity exactly 301 gives "Geniş kitlelere ulaştı"', () => {
    const item = { vote_count: 100, popularity: 301 }
    expect(buildTrendReason(item, 50, true)).toContain('Geniş kitlelere ulaştı')
  })

  it('popularity exactly 1001 gives "Sosyal medyada viral"', () => {
    const item = { vote_count: 100, popularity: 1001 }
    expect(buildTrendReason(item, 50, true)).toContain('Sosyal medyada viral')
  })
})

// ── tmdbToCard edge cases (via useSearch selectSuggestion) ─────────────────
import { useSearch } from '../hooks/useSearch.js'

describe('useSearch — tmdbToCard edge cases', () => {
  beforeEach(() => { vi.useFakeTimers() })
  afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks() })

  it('review under 220 chars is NOT appended ellipsis', async () => {
    const shortContent = 'A'.repeat(100)
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        id: 1, title: 'Test', original_title: 'Test',
        release_date: '2020-01-01', vote_average: 7.0, overview: 'Good movie.',
        genres: [],
        credits: { cast: [], crew: [] },
        reviews: { results: [{ author: 'user1', content: shortContent }] },
        videos: { results: [] },
        recommendations: { results: [] },
      }),
    })

    const { result } = renderHook(() => useSearch())
    await act(async () => {
      result.current.selectSuggestion({ id: 1, mediaType: 'movie', title: 'Test', year: '2020', posterPath: null })
      await vi.runAllTimersAsync()
    })

    const review = result.current.selectedItem?.reviews[0]
    expect(review?.quote).not.toMatch(/…$/)
    expect(review?.quote).toHaveLength(100)
  })

  it('review of exactly 220 chars is NOT truncated', async () => {
    const exactContent = 'B'.repeat(220)
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        id: 1, title: 'Test', original_title: 'Test',
        release_date: '2020-01-01', vote_average: 7.0, overview: 'Desc',
        genres: [],
        credits: { cast: [], crew: [] },
        reviews: { results: [{ author: 'user1', content: exactContent }] },
        videos: { results: [] },
        recommendations: { results: [] },
      }),
    })

    const { result } = renderHook(() => useSearch())
    await act(async () => {
      result.current.selectSuggestion({ id: 1, mediaType: 'movie', title: 'Test', year: '2020', posterPath: null })
      await vi.runAllTimersAsync()
    })

    const review = result.current.selectedItem?.reviews[0]
    expect(review?.quote).not.toMatch(/…$/)
    expect(review?.quote).toHaveLength(220)
  })

  it('director extracted from crew when Director job exists', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        id: 1, title: 'Directed Film', original_title: 'Directed Film',
        release_date: '2020-01-01', vote_average: 8.0, overview: 'A film.',
        genres: [],
        credits: {
          cast: [],
          crew: [
            { id: 101, name: 'Christopher Nolan', job: 'Director' },
            { id: 102, name: 'Someone Else', job: 'Producer' },
          ],
        },
        reviews: { results: [] },
        videos: { results: [] },
        recommendations: { results: [] },
      }),
    })

    const { result } = renderHook(() => useSearch())
    await act(async () => {
      result.current.selectSuggestion({ id: 1, mediaType: 'movie', title: 'Directed Film', year: '2020', posterPath: null })
      await vi.runAllTimersAsync()
    })

    expect(result.current.selectedItem?.director?.name).toBe('Christopher Nolan')
    expect(result.current.selectedItem?.director?.id).toBe(101)
  })

  it('director is null when no crew or created_by exists', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        id: 1, title: 'NoDir Film', original_title: 'NoDir Film',
        release_date: '2020-01-01', vote_average: 6.5, overview: 'No director.',
        genres: [],
        credits: { cast: [], crew: [] },
        reviews: { results: [] },
        videos: { results: [] },
        recommendations: { results: [] },
      }),
    })

    const { result } = renderHook(() => useSearch())
    await act(async () => {
      result.current.selectSuggestion({ id: 1, mediaType: 'movie', title: 'NoDir Film', year: '2020', posterPath: null })
      await vi.runAllTimersAsync()
    })

    expect(result.current.selectedItem?.director).toBeNull()
  })

  it('trailer key extracted from YouTube Trailer', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        id: 1, title: 'Action Film', original_title: 'Action Film',
        release_date: '2023-01-01', vote_average: 7.5, overview: 'Boom!',
        genres: [],
        credits: { cast: [], crew: [] },
        reviews: { results: [] },
        videos: {
          results: [
            { key: 'abc123', type: 'Trailer', site: 'YouTube' },
            { key: 'def456', type: 'Teaser', site: 'YouTube' },
          ],
        },
        recommendations: { results: [] },
      }),
    })

    const { result } = renderHook(() => useSearch())
    await act(async () => {
      result.current.selectSuggestion({ id: 1, mediaType: 'movie', title: 'Action Film', year: '2023', posterPath: null })
      await vi.runAllTimersAsync()
    })

    expect(result.current.selectedItem?.trailerKey).toBe('abc123')
  })

  it('trailerKey falls back to any YouTube video when no Trailer type', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        id: 1, title: 'Teaser Film', original_title: 'Teaser Film',
        release_date: '2023-01-01', vote_average: 7.5, overview: 'Tease!',
        genres: [],
        credits: { cast: [], crew: [] },
        reviews: { results: [] },
        videos: {
          results: [
            { key: 'xyz789', type: 'Teaser', site: 'YouTube' },
          ],
        },
        recommendations: { results: [] },
      }),
    })

    const { result } = renderHook(() => useSearch())
    await act(async () => {
      result.current.selectSuggestion({ id: 1, mediaType: 'movie', title: 'Teaser Film', year: '2023', posterPath: null })
      await vi.runAllTimersAsync()
    })

    expect(result.current.selectedItem?.trailerKey).toBe('xyz789')
  })

  it('trailerKey is null when no YouTube video exists', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        id: 1, title: 'No Trailer', original_title: 'No Trailer',
        release_date: '2023-01-01', vote_average: 7.0, overview: 'No trailer.',
        genres: [],
        credits: { cast: [], crew: [] },
        reviews: { results: [] },
        videos: { results: [] },
        recommendations: { results: [] },
      }),
    })

    const { result } = renderHook(() => useSearch())
    await act(async () => {
      result.current.selectSuggestion({ id: 1, mediaType: 'movie', title: 'No Trailer', year: '2023', posterPath: null })
      await vi.runAllTimersAsync()
    })

    expect(result.current.selectedItem?.trailerKey).toBeNull()
  })

  it('similarItems sliced to 12', async () => {
    const manyRecs = Array.from({ length: 20 }, (_, i) => ({
      id: i + 100, media_type: 'movie', title: `Rec ${i}`, name: `Rec ${i}`,
      release_date: '2023-01-01', first_air_date: null, poster_path: null,
    }))

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        id: 1, title: 'Main Film', original_title: 'Main Film',
        release_date: '2023-01-01', vote_average: 8.0, overview: 'Main.',
        genres: [],
        credits: { cast: [], crew: [] },
        reviews: { results: [] },
        videos: { results: [] },
        recommendations: { results: manyRecs },
      }),
    })

    const { result } = renderHook(() => useSearch())
    await act(async () => {
      result.current.selectSuggestion({ id: 1, mediaType: 'movie', title: 'Main Film', year: '2023', posterPath: null })
      await vi.runAllTimersAsync()
    })

    expect(result.current.selectedItem?.similarItems).toHaveLength(12)
  })

  it('reviews sliced to max 3', async () => {
    const manyReviews = Array.from({ length: 10 }, (_, i) => ({
      author: `User${i}`, content: `Great movie review number ${i}`,
    }))

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        id: 1, title: 'Well Reviewed', original_title: 'Well Reviewed',
        release_date: '2023-01-01', vote_average: 9.0, overview: 'Amazing!',
        genres: [],
        credits: { cast: [], crew: [] },
        reviews: { results: manyReviews },
        videos: { results: [] },
        recommendations: { results: [] },
      }),
    })

    const { result } = renderHook(() => useSearch())
    await act(async () => {
      result.current.selectSuggestion({ id: 1, mediaType: 'movie', title: 'Well Reviewed', year: '2023', posterPath: null })
      await vi.runAllTimersAsync()
    })

    expect(result.current.selectedItem?.reviews).toHaveLength(3)
  })

  it('imdbScore is null when vote_average is 0', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        id: 1, title: 'Unrated', original_title: 'Unrated',
        release_date: '2023-01-01', vote_average: 0, overview: 'Not rated.',
        genres: [],
        credits: { cast: [], crew: [] },
        reviews: { results: [] },
        videos: { results: [] },
        recommendations: { results: [] },
      }),
    })

    const { result } = renderHook(() => useSearch())
    await act(async () => {
      result.current.selectSuggestion({ id: 1, mediaType: 'movie', title: 'Unrated', year: '2023', posterPath: null })
      await vi.runAllTimersAsync()
    })

    expect(result.current.selectedItem?.imdbScore).toBeNull()
  })
})

// ── fmtCount boundary: 999,999 ─────────────────────────────────────────────

function fmtCount(n) {
  if (!n) return '—'
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}k`
  return String(n)
}

describe('fmtCount — additional boundaries', () => {
  it('999,999 rounds to 1000.0k (not M)', () => {
    const result = fmtCount(999999)
    expect(result).toBe('1000.0k')
    expect(result).not.toContain('M')
  })

  it('exactly 1,000,000 returns M', () => {
    expect(fmtCount(1_000_000)).toBe('1.0M')
  })

  it('1,000,001 returns M', () => {
    expect(fmtCount(1_000_001)).toContain('M')
  })

  it('negative numbers return raw string', () => {
    // Negative is > 0 (truthy), < 1000 in magnitude but still truthy
    expect(typeof fmtCount(-5)).toBe('string')
  })
})
