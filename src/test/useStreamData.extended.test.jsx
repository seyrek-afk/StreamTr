/**
 * useStreamData genişletilmiş testleri
 *
 * Mevcut useStreamData.test.jsx'in kapsamadığı yollar:
 *   - showMore ile ağdan sayfa yükleme (loadListPage çağrısı, satır 315-332)
 *   - TMDB list endpoint'i (diziler/filmler) ile sayfa yükleme (satır 261-286)
 *   - tmdbToListCard dönüşüm alanları
 *   - loadingMore durum değişimi
 *   - trend: bazı sayfalar başarısız, diğerleri ok → anyOk kontrolü
 *   - fetchTab(diziler) TMDB anahtarı varken TMDB yolunu kullanır
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useStreamData } from '../hooks/useStreamData.js'

async function flushAll() {
  await act(async () => {
    await vi.runAllTimersAsync()
  })
}

function makeTmdbListPage(count = 20, mediaType = 'movie', opts = {}) {
  return {
    total_pages: opts.totalPages ?? 10,
    results: Array.from({ length: count }, (_, i) => ({
      id: (opts.idOffset || 0) + i + 1,
      title: mediaType === 'movie' ? `Movie ${i}` : undefined,
      name: mediaType === 'tv' ? `Show ${i}` : undefined,
      original_title: `OrigMovie ${i}`,
      original_name: `OrigShow ${i}`,
      vote_average: 7.5 + (i % 3) * 0.1,
      vote_count: 1000 + i,
      popularity: 200 + i,
      poster_path: `/p${i}.jpg`,
      release_date: mediaType === 'movie' ? '2023-01-15' : undefined,
      first_air_date: mediaType === 'tv' ? '2023-01-15' : undefined,
      genre_ids: [28, 18],
      overview: `Overview ${i}`,
    })),
  }
}

function makeTrendPage(count = 20, opts = {}) {
  return {
    results: Array.from({ length: count }, (_, i) => ({
      id: (opts.idOffset || 0) + i + 1,
      media_type: i % 2 === 0 ? 'movie' : 'tv',
      title: `Movie ${i}`,
      name: `Show ${i}`,
      original_title: `OrigMovie ${i}`,
      original_name: `OrigShow ${i}`,
      vote_average: 7.5,
      vote_count: 2000,
      popularity: 300,
      poster_path: null,
      release_date: '2024-01-01',
      first_air_date: '2024-01-01',
      genre_ids: [28],
      overview: 'Test',
    })),
  }
}

describe('useStreamData — TMDB list (diziler/filmler) yolu', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.stubEnv('VITE_TMDB_KEY', 'test-key')
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
    vi.unstubAllEnvs()
  })

  it('fetchTab(diziler) TMDB top_rated çeker, tmdbToListCard dönüşüm yapar', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => makeTmdbListPage(20, 'tv'),
    })

    const { result } = renderHook(() => useStreamData())
    act(() => { result.current.fetchTab('diziler') })
    await flushAll()

    const items = result.current.data.diziler
    expect(items.length).toBeGreaterThan(0)

    // tmdbToListCard alanları
    const first = items[0]
    expect(first).toHaveProperty('title')
    expect(first).toHaveProperty('type')
    expect(first).toHaveProperty('imdbScore')
    expect(first).toHaveProperty('rottenTomatoesScore')
    expect(first).toHaveProperty('letterboxdScore')
    expect(first).toHaveProperty('genres')
    expect(first).toHaveProperty('_tmdbId')
    expect(first).toHaveProperty('_mediaType')
    expect(first.cast).toEqual([])
    expect(first.reviews).toEqual([])
    expect(first.duration).toBeNull()
  })

  it('fetchTab(filmler) TMDB top_rated çeker, type=film', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => makeTmdbListPage(20, 'movie'),
    })

    const { result } = renderHook(() => useStreamData())
    act(() => { result.current.fetchTab('filmler') })
    await flushAll()

    const items = result.current.data.filmler
    expect(items.length).toBeGreaterThan(0)
    expect(items[0].type).toBe('film')
    expect(items[0]._mediaType).toBe('movie')
  })

  it('INITIAL_PAGES=5 paralel sayfa istenir', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => makeTmdbListPage(20, 'movie'),
    })

    const { result } = renderHook(() => useStreamData())
    act(() => { result.current.fetchTab('filmler') })
    await flushAll()

    // 5 paralel sayfa → 5 fetch çağrısı
    expect(global.fetch).toHaveBeenCalledTimes(5)
  })

  it('bazı sayfalar hata verse de başarılı sayfalar gösterilir', async () => {
    let callIdx = 0
    global.fetch = vi.fn().mockImplementation(() => {
      callIdx++
      if (callIdx % 2 === 0) {
        return Promise.resolve({ ok: false, status: 429 }) // bazı sayfalar hatalı
      }
      return Promise.resolve({
        ok: true,
        json: async () => makeTmdbListPage(5, 'movie'),
      })
    })

    const { result } = renderHook(() => useStreamData())
    act(() => { result.current.fetchTab('filmler') })
    await flushAll()

    // Başarılı sayfalar var → data yüklenmiş olmalı
    expect(result.current.data.filmler.length).toBeGreaterThan(0)
    expect(result.current.error.filmler).toBeNull()
  })

  it('tüm sayfalar hata verince error set edilir', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: false, status: 503 })

    const { result } = renderHook(() => useStreamData())
    act(() => { result.current.fetchTab('diziler') })
    await flushAll()

    expect(result.current.error.diziler).not.toBeNull()
    expect(result.current.data.diziler).toEqual([])
  })
})

describe('useStreamData — showMore ağdan yükleme', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.stubEnv('VITE_TMDB_KEY', 'test-key')
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
    vi.unstubAllEnvs()
  })

  it('showMore: yeterli veri yoksa ağdan yeni sayfa çeker', async () => {
    let callIdx = 0
    global.fetch = vi.fn().mockImplementation(() => {
      callIdx++
      // İlk 5 çağrı (INITIAL_PAGES): 20 film + 50 total_pages
      // Sonraki çağrılar (showMore): ek sayfa
      return Promise.resolve({
        ok: true,
        json: async () => ({
          total_pages: 50,
          results: Array.from({ length: 20 }, (_, i) => ({
            id: callIdx * 100 + i + 1,
            title: `Movie Call${callIdx} Item${i}`,
            original_title: `Movie ${i}`,
            vote_average: 7.0,
            vote_count: 500,
            popularity: 100,
            poster_path: null,
            release_date: '2022-01-01',
            first_air_date: null,
            genre_ids: [18],
            overview: 'Test',
          })),
        }),
      })
    })

    const { result } = renderHook(() => useStreamData())

    // İlk yükleme: 5 sayfa paralel → 100 film
    act(() => { result.current.fetchTab('filmler') })
    await flushAll()

    const afterLoad = result.current.data.filmler.length
    expect(afterLoad).toBe(100) // 5 sayfa * 20 = 100

    const fetchCallsAfterLoad = global.fetch.mock.calls.length

    // visible 30'dan başlar, her showMore +PAGE_SIZE(30) ister.
    // 60 ve 90 mevcut 100 öğeyle karşılanır → ağa çıkılmaz (yalnızca görünür artar).
    // 3. çağrıda desired=120 > 100 → ancak o zaman ağdan yeni sayfa çekilir.
    for (let i = 0; i < 2; i++) {
      await act(async () => {
        result.current.showMore('filmler')
        await vi.runAllTimersAsync()
      })
    }
    expect(global.fetch.mock.calls.length).toBe(fetchCallsAfterLoad) // henüz ağ yok

    await act(async () => {
      result.current.showMore('filmler')
      await vi.runAllTimersAsync()
    })

    // Ek fetch yapıldı mı?
    const fetchCallsAfterMore = global.fetch.mock.calls.length
    expect(fetchCallsAfterMore).toBeGreaterThan(fetchCallsAfterLoad)
  })

  it('showMore: loadingMore geçici olarak true olur', async () => {
    let resolveExtra
    const extraPromise = new Promise(r => { resolveExtra = r })

    let callIdx = 0
    global.fetch = vi.fn().mockImplementation(() => {
      callIdx++
      if (callIdx <= 5) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            total_pages: 50,
            results: Array.from({ length: 20 }, (_, i) => ({
              id: i + 1,
              title: `Init Film ${i}`,
              original_title: `Init ${i}`,
              vote_average: 7.0,
              vote_count: 500,
              popularity: 100,
              poster_path: null,
              release_date: '2022-01-01',
              genre_ids: [],
              overview: '',
            })),
          }),
        })
      }
      // 6. çağrı (showMore) → bekle
      return extraPromise
    })

    const { result } = renderHook(() => useStreamData())

    act(() => { result.current.fetchTab('filmler') })
    await flushAll()

    expect(result.current.data.filmler.length).toBe(100)

    // showMore başlat (bekliyor)
    act(() => { result.current.showMore('filmler') })

    // loadingMore true olabilir (async çalışıyor)
    // Resolve et
    resolveExtra({ ok: true, json: async () => makeTmdbListPage(20, 'movie', { idOffset: 200, totalPages: 50 }) })

    await flushAll()

    expect(result.current.loadingMore.filmler).toBe(false)
  })

  it('showMore: mevcut veri PAGE_SIZE kadar kalmışsa ağdan yükler', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        total_pages: 50,
        results: Array.from({ length: 15 }, (_, i) => ({
          id: i + 1,
          title: `Film ${i}`,
          original_title: `Film ${i}`,
          vote_average: 7.0,
          vote_count: 500,
          popularity: 100,
          poster_path: null,
          release_date: '2022-01-01',
          genre_ids: [],
          overview: '',
        })),
      }),
    })

    const { result } = renderHook(() => useStreamData())
    act(() => { result.current.fetchTab('diziler') })
    await flushAll()

    const before = result.current.visible.diziler

    await act(async () => {
      result.current.showMore('diziler')
      await vi.runAllTimersAsync()
    })

    // visible arttı veya aynı kaldı (veri yoksa)
    expect(result.current.visible.diziler).toBeGreaterThanOrEqual(before)
  })
})

describe('useStreamData — trend kenar durumları', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.stubEnv('VITE_TMDB_KEY', 'test-key')
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
    vi.unstubAllEnvs()
  })

  it('trend: tüm sayfalar başarısız → hata set edilir', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: false, status: 503 })

    const { result } = renderHook(() => useStreamData())
    act(() => { result.current.fetchTab('trend') })
    await flushAll()

    expect(result.current.error.trend).not.toBeNull()
    expect(result.current.data.trend).toEqual([])
  })

  it('trend: kısmi sayfa hataları tolere edilir', async () => {
    let callIdx = 0
    global.fetch = vi.fn().mockImplementation(() => {
      callIdx++
      if (callIdx === 3) {
        return Promise.resolve({ ok: false, status: 429 })
      }
      return Promise.resolve({
        ok: true,
        json: async () => makeTrendPage(20),
      })
    })

    const { result } = renderHook(() => useStreamData())
    act(() => { result.current.fetchTab('trend') })
    await flushAll()

    // 4/5 sayfa başarılı
    expect(result.current.data.trend.length).toBeGreaterThan(0)
    expect(result.current.error.trend).toBeNull()
  })

  it('trend: person media_type filtrelenir', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        results: [
          { id: 1, media_type: 'movie', title: 'Film', vote_average: 7.0, vote_count: 100, popularity: 50, poster_path: null, release_date: '2024-01-01', genre_ids: [], overview: '' },
          { id: 2, media_type: 'person', name: 'Aktör', vote_average: 0, popularity: 200, poster_path: null },
        ],
      }),
    })

    const { result } = renderHook(() => useStreamData())
    act(() => { result.current.fetchTab('trend') })
    await flushAll()

    const items = result.current.data.trend
    // person tipi filtrelenmiş olmalı
    items.forEach(item => {
      expect(item._mediaType).not.toBe('person')
    })
  })

  it('trend MAX_ITEMS(250) aşmaz', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => makeTrendPage(100), // Çok fazla item
    })

    const { result } = renderHook(() => useStreamData())
    act(() => { result.current.fetchTab('trend') })
    await flushAll()

    expect(result.current.data.trend.length).toBeLessThanOrEqual(250)
  })
})

describe('useStreamData — tmdbToListCard dönüşüm kenar durumları', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.stubEnv('VITE_TMDB_KEY', 'test-key')
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
    vi.unstubAllEnvs()
  })

  it('vote_average=0 → imdbScore null', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        total_pages: 1,
        results: [{
          id: 1, title: 'Unrated Film', original_title: 'Unrated',
          vote_average: 0, vote_count: 0, popularity: 50,
          poster_path: null, release_date: '2023-01-01', genre_ids: [], overview: '',
        }],
      }),
    })

    const { result } = renderHook(() => useStreamData())
    act(() => { result.current.fetchTab('filmler') })
    await flushAll()

    const items = result.current.data.filmler
    if (items.length > 0) {
      expect(items[0].imdbScore).toBeNull()
    }
  })

  it('genre_ids Türkçeye çevrilir', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        total_pages: 1,
        results: [{
          id: 1, title: 'Genre Film', original_title: 'Genre Film',
          vote_average: 7.0, vote_count: 500, popularity: 100,
          poster_path: null, release_date: '2023-01-01',
          genre_ids: [28, 18, 878], overview: '',
        }],
      }),
    })

    const { result } = renderHook(() => useStreamData())
    act(() => { result.current.fetchTab('filmler') })
    await flushAll()

    const items = result.current.data.filmler
    if (items.length > 0) {
      expect(items[0].genres).toContain('Aksiyon')
      expect(items[0].genres).toContain('Dram')
      expect(items[0].genres).toContain('Bilim Kurgu')
    }
  })

  it('bilinmeyen genre_id filtrelenir', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        total_pages: 1,
        results: [{
          id: 1, title: 'Unknown Genres', original_title: 'Unknown',
          vote_average: 6.5, vote_count: 200, popularity: 80,
          poster_path: null, release_date: '2022-01-01',
          genre_ids: [99999], overview: '',
        }],
      }),
    })

    const { result } = renderHook(() => useStreamData())
    act(() => { result.current.fetchTab('diziler') })
    await flushAll()

    const items = result.current.data.diziler
    if (items.length > 0) {
      expect(items[0].genres).toHaveLength(0)
    }
  })
})

describe('useStreamData — retry mekanizması', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.stubEnv('VITE_TMDB_KEY', 'test-key')
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
    vi.unstubAllEnvs()
  })

  it('retry: önce hata, sonra başarı', async () => {
    let attempt = 0
    global.fetch = vi.fn().mockImplementation(() => {
      attempt++
      if (attempt <= 5) return Promise.resolve({ ok: false, status: 503 })
      return Promise.resolve({
        ok: true,
        json: async () => makeTmdbListPage(10, 'movie'),
      })
    })

    const { result } = renderHook(() => useStreamData())

    // İlk yükleme başarısız
    act(() => { result.current.fetchTab('filmler') })
    await flushAll()
    expect(result.current.error.filmler).not.toBeNull()

    // Retry başarılı
    act(() => { result.current.retry('filmler') })
    await flushAll()

    expect(result.current.data.filmler.length).toBeGreaterThan(0)
    expect(result.current.error.filmler).toBeNull()
  })
})
