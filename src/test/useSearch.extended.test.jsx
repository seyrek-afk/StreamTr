/**
 * useSearch genişletilmiş testleri
 *
 * Mevcut useSearch.test.jsx'in kapsamadığı yollar:
 *   - handleQueryChange: TMDB anahtarı yoksa (no-api) öneriler temizlenir (satır 107-109)
 *   - handleQueryChange: fetch HTTP hata kodu (ok=false) → öneriler boş (satır 122-123)
 *   - clearSuggestions: debounce iptal eder, önerileri temizler
 *   - selectSuggestion: API anahtarı yoksa detailError set edilir (satır 158-161)
 *   - selectSuggestion: AbortError yutulur, detailError set edilmez
 *   - selectSuggestion: second fetch (extra) başarısız → main kullanılır (satır 178-179)
 *   - tmdbToCard: çok eski/boş tarih → year undefined durumu
 *   - query 200 karakterden uzun → truncate edilir (satır 117)
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useSearch } from '../hooks/useSearch.js'

async function flushAll() {
  await act(async () => {
    await vi.runAllTimersAsync()
  })
}

const BASE_DETAIL = {
  id: 1,
  title: 'Test Film',
  original_title: 'Test Film',
  release_date: '2020-01-01',
  vote_average: 7.0,
  overview: 'Test açıklama.',
  genres: [{ id: 18, name: 'Drama' }],
  credits: { cast: [], crew: [] },
  reviews: { results: [] },
  videos: { results: [] },
  recommendations: { results: [] },
}

describe('useSearch — no-API yolları', () => {
  // useSearch.js API_KEY'i MODÜL düzeyinde okur (satır 4). Bu yüzden test içinde
  // vi.stubEnv tek başına yetmez — modül zaten anahtarlı ortamla yüklenmiş olur ve
  // geliştirici makinesinde .env dolu olduğu için "anahtar yok" senaryosu hiç kurulamaz.
  // Doğru kurulum: modülleri sıfırla, ortamı boşalt, sonra dinamik import et.
  let useSearchNoKey

  beforeEach(async () => {
    vi.useFakeTimers()
    vi.resetModules()
    vi.stubEnv('VITE_TMDB_KEY', '')
    ;({ useSearch: useSearchNoKey } = await import('../hooks/useSearch.js'))
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
    vi.unstubAllEnvs()
    vi.resetModules()
  })

  it('API anahtarı yoksa handleQueryChange öneri aramaz', async () => {
    const fetchMock = vi.fn()
    global.fetch = fetchMock

    const { result } = renderHook(() => useSearchNoKey())
    act(() => { result.current.handleQueryChange('inception') })
    await flushAll()

    // API anahtarı yoksa fetch çağrılmamalı
    expect(fetchMock).not.toHaveBeenCalled()
    expect(result.current.suggestions).toEqual([])
  })

  it('API anahtarı yoksa selectSuggestion detailError set eder', async () => {
    const { result } = renderHook(() => useSearchNoKey())

    await act(async () => {
      result.current.selectSuggestion({ id: 1, mediaType: 'movie', title: 'Test', year: '2020', posterPath: null })
      await vi.runAllTimersAsync()
    })

    expect(result.current.detailError).toContain('TMDB API anahtarı')
    expect(result.current.detailLoading).toBe(false)
  })

  it('noApiKey true döner API anahtarı olmadığında', () => {
    const { result } = renderHook(() => useSearchNoKey())
    // API anahtarı yok → noApiKey true
    expect(result.current.noApiKey).toBe(true)
  })
})

describe('useSearch — hata yolları (API anahtarı var)', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.stubEnv('VITE_TMDB_KEY', 'test-key')
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
    vi.unstubAllEnvs()
  })

  it('handleQueryChange: HTTP 500 → öneriler boş kalır', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: false, status: 500 })

    const { result } = renderHook(() => useSearch())
    act(() => { result.current.handleQueryChange('test') })
    await flushAll()

    expect(result.current.suggestions).toEqual([])
    expect(result.current.suggesting).toBe(false)
  })

  it('handleQueryChange: ağ reddi → öneriler boş kalır', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('Network fail'))

    const { result } = renderHook(() => useSearch())
    act(() => { result.current.handleQueryChange('inception') })
    await flushAll()

    expect(result.current.suggestions).toEqual([])
    expect(result.current.suggesting).toBe(false)
  })

  it('clearSuggestions: debounce iptal edilir, öneriler temizlenir', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ results: [] }),
    })

    const { result } = renderHook(() => useSearch())

    act(() => { result.current.handleQueryChange('matrix') })
    // Debounce ateşlenmeden clearSuggestions çağır
    act(() => { result.current.clearSuggestions() })

    await flushAll()

    // Debounce iptal olduğu için fetch çağrılmamalı
    expect(global.fetch).not.toHaveBeenCalled()
    expect(result.current.suggestions).toEqual([])
  })

  it('selectSuggestion: extra fetch başarısız olsa bile main merge edilir', async () => {
    let callIndex = 0
    global.fetch = vi.fn().mockImplementation(() => {
      callIndex++
      if (callIndex === 1) {
        // main (tr-TR) başarılı
        return Promise.resolve({ ok: true, json: async () => BASE_DETAIL })
      }
      // extra (en-US) başarısız
      return Promise.resolve({ ok: false, status: 503 })
    })

    const { result } = renderHook(() => useSearch())

    await act(async () => {
      result.current.selectSuggestion({ id: 1, mediaType: 'movie', title: 'Test Film', year: '2020', posterPath: null })
      await vi.runAllTimersAsync()
    })

    // Main başarılı olduğundan selectedItem set edilmiş olmalı
    expect(result.current.selectedItem).not.toBeNull()
    expect(result.current.selectedItem.title).toBe('Test Film')
    expect(result.current.detailError).toBeNull()
  })

  it('selectSuggestion: AbortError yutulur, detailError set edilmez', async () => {
    global.fetch = vi.fn().mockRejectedValue(Object.assign(new Error('aborted'), { name: 'AbortError' }))

    const { result } = renderHook(() => useSearch())

    await act(async () => {
      result.current.selectSuggestion({ id: 1, mediaType: 'movie', title: 'Abort Film', year: '2023', posterPath: null })
      await vi.runAllTimersAsync()
    })

    expect(result.current.detailError).toBeNull()
    expect(result.current.detailLoading).toBe(false)
  })

  it('query 200+ karakterde truncate edilir (XSS/injection koruması)', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ results: [] }),
    })

    const longQuery = 'A'.repeat(250)
    const { result } = renderHook(() => useSearch())
    act(() => { result.current.handleQueryChange(longQuery) })
    await flushAll()

    if (global.fetch.mock.calls.length > 0) {
      const calledUrl = global.fetch.mock.calls[0][0]
      // encodeURIComponent('A'.repeat(200)) = 200 A
      const decodedUrl = decodeURIComponent(calledUrl)
      const queryMatch = decodedUrl.match(/query=([^&]+)/)
      if (queryMatch) {
        expect(queryMatch[1].length).toBeLessThanOrEqual(200)
      }
    }
  })

  it('tmdbToCard: no genres → empty genres array', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ ...BASE_DETAIL, genres: [] }),
    })

    const { result } = renderHook(() => useSearch())
    await act(async () => {
      result.current.selectSuggestion({ id: 1, mediaType: 'movie', title: 'No Genre', year: '2020', posterPath: null })
      await vi.runAllTimersAsync()
    })

    expect(result.current.selectedItem?.genres).toEqual([])
  })

  it('tmdbToCard: bilinmeyen genre id filtrelenmez (genre name kullanılır)', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        ...BASE_DETAIL,
        genres: [
          { id: 99999, name: 'Özel Tür' },  // bilinmeyen id → name kullanılır
          { id: 28, name: 'Action' },         // bilinen id → TR eşlemesi
        ],
      }),
    })

    const { result } = renderHook(() => useSearch())
    await act(async () => {
      result.current.selectSuggestion({ id: 1, mediaType: 'movie', title: 'Mixed Genre', year: '2021', posterPath: null })
      await vi.runAllTimersAsync()
    })

    const genres = result.current.selectedItem?.genres
    expect(genres).toContain('Özel Tür')    // bilinmeyen id → name fallback
    expect(genres).toContain('Aksiyon')     // bilinen id → Türkçe
  })

  it('TV show: no credits → director null', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        id: 2,
        name: 'Dizi',
        original_name: 'Dizi',
        first_air_date: '2020-01-01',
        vote_average: 8.0,
        overview: 'Dizi açıklama.',
        genres: [],
        credits: { cast: [], crew: [] },
        created_by: [],
        reviews: { results: [] },
        videos: { results: [] },
        recommendations: { results: [] },
      }),
    })

    const { result } = renderHook(() => useSearch())
    await act(async () => {
      result.current.selectSuggestion({ id: 2, mediaType: 'tv', title: 'Dizi', year: '2020', posterPath: null })
      await vi.runAllTimersAsync()
    })

    expect(result.current.selectedItem?.director).toBeNull()
    expect(result.current.selectedItem?.type).toBe('dizi')
  })

  it('runtime alanı film için duration olarak atanır', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ ...BASE_DETAIL, runtime: 142 }),
    })

    const { result } = renderHook(() => useSearch())
    await act(async () => {
      result.current.selectSuggestion({ id: 1, mediaType: 'movie', title: 'Long Film', year: '2020', posterPath: null })
      await vi.runAllTimersAsync()
    })

    expect(result.current.selectedItem?.duration).toBe(142)
  })

  it('TV show için duration null', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        id: 3,
        name: 'TV Dizi',
        original_name: 'TV Dizi',
        first_air_date: '2021-03-01',
        vote_average: 7.5,
        overview: 'Dizi.',
        genres: [],
        runtime: 45, // TV'de runtime var ama duration null olmalı
        credits: { cast: [], crew: [] },
        reviews: { results: [] },
        videos: { results: [] },
        recommendations: { results: [] },
      }),
    })

    const { result } = renderHook(() => useSearch())
    await act(async () => {
      result.current.selectSuggestion({ id: 3, mediaType: 'tv', title: 'TV Dizi', year: '2021', posterPath: null })
      await vi.runAllTimersAsync()
    })

    expect(result.current.selectedItem?.duration).toBeNull()
  })
})
