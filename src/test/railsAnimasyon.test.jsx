import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import {
  railQueryParams, finalizeRailItems, railCacheKey, RAIL_MIN_ITEMS,
} from '../lib/rails.js'

describe('raf sorgu parametreleri (FR-5c)', () => {
  it('animasyon gizliyken without_genres=16 eklenir, açıkken eklenmez', () => {
    const base = { sort_by: 'vote_average.desc' }
    expect(railQueryParams(base, { hideAnimation: true })).toEqual({ ...base, without_genres: '16' })
    expect(railQueryParams(base, { hideAnimation: false })).toEqual(base)
    expect(railQueryParams(base)).not.toHaveProperty('without_genres')
  })

  it('mevcut without_genres korunur, 16 tekrarlanmaz', () => {
    expect(railQueryParams({ without_genres: '99' }, { hideAnimation: true }).without_genres).toBe('99,16')
    expect(railQueryParams({ without_genres: '16' }, { hideAnimation: true }).without_genres).toBe('16')
  })

  it('girdiyi değiştirmez', () => {
    const base = { with_genres: 35 }
    railQueryParams(base, { hideAnimation: true })
    expect(base).toEqual({ with_genres: 35 })
  })

  it('istemci süzgeci animasyonu çıkarır ve üst sınırı uygular', () => {
    const items = [
      { title: 'a', genres: ['Dram'] }, { title: 'b', genres: ['Animasyon'] },
      { title: 'c', genres: [] }, { title: 'd', genres: ['Komedi'] },
    ]
    expect(finalizeRailItems(items, { hideAnimation: true }).map(i => i.title)).toEqual(['a', 'c', 'd'])
    expect(finalizeRailItems(items, { hideAnimation: true, max: 2 }).map(i => i.title)).toEqual(['a', 'c'])
    expect(finalizeRailItems(items, { hideAnimation: false })).toHaveLength(4)
  })

  it('önbellek anahtarı tercihi içerir', () => {
    expect(railCacheKey('TR', 'diziler', { hideAnimation: true })).toBe('TR:diziler:anim0')
    expect(railCacheKey('TR', 'diziler', { hideAnimation: false })).toBe('TR:diziler:anim1')
  })
})

// ── Kanca: ağ taklidiyle uçtan uca (AC-7) ────────────────────────────────────
const dizi = (id, genreIds) => ({
  id, name: `Dizi ${id}`, original_name: `Dizi ${id}`, first_air_date: '2020-01-01',
  vote_average: 8, vote_count: 500, genre_ids: genreIds,
})

// Yüksek puanlı rafı: 3 animasyonsuz + 2 animasyon → süzgeçten sonra 3 < 4, çizilmez.
// Diğer raflar: 5 animasyonsuz + 1 animasyon → 5 öğe, çizilir.
function rafYaniti(url) {
  if (url.includes('vote_average.desc') && url.includes('first_air_date.lte')) {
    return [dizi(1, [18]), dizi(2, [80]), dizi(3, [18]), dizi(4, [16]), dizi(5, [16, 18])]
  }
  return [dizi(10, [18]), dizi(11, [35]), dizi(12, [16]), dizi(13, [18]), dizi(14, [80]), dizi(15, [9648])]
}

async function kancaYukle() {
  vi.stubEnv('VITE_TMDB_KEY', 'test-key')
  vi.resetModules()
  return (await import('../hooks/useCountryRails.js')).useCountryRails
}

describe('useCountryRails — animasyon tercihi (AC-7)', () => {
  beforeEach(() => {
    globalThis.fetch = vi.fn((url) => Promise.resolve({
      ok: true, json: () => Promise.resolve({ results: rafYaniti(url) }),
    }))
  })
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.resetModules()
  })

  it('gizliyken her raf URL\'si without_genres=16 taşır, raflarda animasyon olmaz', async () => {
    const useCountryRails = await kancaYukle()
    const { result } = renderHook(() => useCountryRails('diziler', 'TR', { hideAnimation: true }))
    await waitFor(() => expect(result.current.rails.length).toBeGreaterThan(0))

    const urls = globalThis.fetch.mock.calls.map(c => c[0])
    expect(urls.length).toBeGreaterThan(0)
    urls.forEach(u => expect(new URL(u).searchParams.get('without_genres')).toBe('16'))

    result.current.rails.forEach(r => {
      expect(r.items.some(i => i.genres.includes('Animasyon'))).toBe(false)
      expect(r.items.length).toBeGreaterThanOrEqual(RAIL_MIN_ITEMS)
    })
  })

  it('süzgeçten sonra 4\'ten az öğe kalan raf çizilmez', async () => {
    const useCountryRails = await kancaYukle()
    const { result } = renderHook(() => useCountryRails('diziler', 'TR', { hideAnimation: true }))
    await waitFor(() => expect(result.current.rails.length).toBeGreaterThan(0))
    expect(result.current.rails.map(r => r.key)).not.toContain('kult')
  })

  it('açıkken URL without_genres içermez ve animasyonlu öğe rafta kalır', async () => {
    const useCountryRails = await kancaYukle()
    const { result } = renderHook(() => useCountryRails('diziler', 'TR', { hideAnimation: false }))
    await waitFor(() => expect(result.current.rails.length).toBeGreaterThan(0))
    globalThis.fetch.mock.calls.forEach(c => expect(c[0]).not.toContain('without_genres'))
    expect(result.current.rails.map(r => r.key)).toContain('kult')
    expect(result.current.rails.some(r => r.items.some(i => i.genres.includes('Animasyon')))).toBe(true)
  })

  it('tercih değişince farklı önbellek girdisi kullanılır, geri dönüşte önbellekten gelir', async () => {
    const useCountryRails = await kancaYukle()
    const { result, rerender } = renderHook(
      ({ hide }) => useCountryRails('diziler', 'TR', { hideAnimation: hide }),
      { initialProps: { hide: true } },
    )
    await waitFor(() => expect(result.current.rails.length).toBeGreaterThan(0))
    const ilk = globalThis.fetch.mock.calls.length

    rerender({ hide: false })
    await waitFor(() => expect(globalThis.fetch.mock.calls.length).toBe(ilk * 2))
    await waitFor(() => expect(result.current.rails.map(r => r.key)).toContain('kult'))

    rerender({ hide: true })
    await waitFor(() => expect(result.current.rails.map(r => r.key)).not.toContain('kult'))
    expect(globalThis.fetch.mock.calls.length).toBe(ilk * 2)
  })
})
